import { createStore } from 'zustand/vanilla';
import type {
  ActionResult,
  BillingMode,
  DemoState,
  Role,
  Scenario,
} from './domain';
import {
  DEMO_CUSTOMER_ID,
  getVenue,
  initialState,
  scenarioSessions,
  venues,
} from './fixtures';

export interface AppStore extends DemoState {
  setRole: (role: Role) => void;
  setVenue: (id: string) => void;
  selectSeat: (id: string) => void;
  setScenario: (scenario: Scenario) => void;
  advanceTime: () => void;
  startSession: (mode: BillingMode) => ActionResult;
  addItem: (sessionId: string, itemId: string) => ActionResult;
  endSession: (sessionId: string) => ActionResult;
  reset: () => void;
}
/** Factory isolates tests and leaves persistence/native concerns outside domain actions. */
export function createAppStore() {
  return createStore<AppStore>()((set, get) => ({
    ...initialState(),
    setRole: (role) => set({ role }),
    setVenue: (venueId) => {
      getVenue(venueId);
      set({ venueId, selectedSeatId: null });
    },
    selectSeat: (id) => {
      if (getVenue(get().venueId).seats.some((seat) => seat.id === id))
        set({ selectedSeatId: id });
    },
    setScenario: (scenario) =>
      set((state) => ({
        scenario,
        selectedSeatId: null,
        sessions: [
          ...state.sessions.filter(
            (session) => session.venueId !== state.venueId,
          ),
          ...scenarioSessions(getVenue(state.venueId), scenario),
        ],
      })),
    advanceTime: () =>
      set((state) => ({
        sessions: state.sessions.map((session) => ({
          ...session,
          elapsedMinutes: session.elapsedMinutes + 30,
        })),
      })),
    startSession: (mode) => {
      const state = get();
      const seat = getVenue(state.venueId).seats.find(
        (item) => item.id === state.selectedSeatId,
      );
      if (!seat) return { ok: false, message: 'Select a seat first.' };
      if (state.sessions.some((session) => session.seatId === seat.id))
        return { ok: false, message: 'This seat is already occupied.' };
      if (
        state.sessions.some(
          (session) =>
            session.venueId === state.venueId &&
            session.customerId === DEMO_CUSTOMER_ID,
        )
      )
        return {
          ok: false,
          message: 'Finish your current demo session first.',
        };
      let nextSessionId = state.nextSessionId;
      while (
        state.sessions.some((entry) => entry.id === `demo-${nextSessionId}`)
      )
        nextSessionId++;
      set({
        nextSessionId: nextSessionId + 1,
        sessions: [
          ...state.sessions,
          {
            id: `demo-${nextSessionId}`,
            venueId: state.venueId,
            seatId: seat.id,
            customerId: DEMO_CUSTOMER_ID,
            mode,
            elapsedMinutes: 0,
            lockedHourlyRate: seat.hourlyRate,
            orders: [],
          },
        ],
      });
      return { ok: true };
    },
    addItem: (sessionId, itemId) => {
      const state = get();
      const item = getVenue(state.venueId).menu.find(
        (entry) => entry.id === itemId,
      );
      const session = state.sessions.find(
        (entry) =>
          entry.id === sessionId &&
          entry.venueId === state.venueId &&
          entry.customerId === DEMO_CUSTOMER_ID,
      );
      if (!item || !session)
        return {
          ok: false,
          message: 'Item or session unavailable in this venue.',
        };
      set({
        sessions: state.sessions.map((entry) =>
          entry.id !== sessionId
            ? entry
            : {
                ...entry,
                orders: [
                  ...entry.orders,
                  {
                    menuItemId: item.id,
                    name: item.name,
                    unitPrice: item.price,
                    quantity: 1,
                  },
                ],
              },
        ),
      });
      return { ok: true };
    },
    endSession: (sessionId) => {
      const state = get();
      const session = state.sessions.find(
        (entry) =>
          entry.id === sessionId &&
          entry.venueId === state.venueId &&
          entry.customerId === DEMO_CUSTOMER_ID,
      );
      if (!session) return { ok: false, message: 'Demo session unavailable.' };
      set({
        sessions: state.sessions.filter((entry) => entry.id !== sessionId),
      });
      return { ok: true };
    },
    reset: () => set(initialState()),
  }));
}

/** Validate persisted snapshots before merging them into the live store. */
export function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== 'object') return false;
  const state = value as DemoState;
  return (
    (state.role === 'merchant' || state.role === 'customer') &&
    venues.some((venue) => venue.id === state.venueId) &&
    (state.scenario === 'morning' || state.scenario === 'afternoon') &&
    (state.selectedSeatId === null ||
      getVenue(state.venueId).seats.some(
        (seat) => seat.id === state.selectedSeatId,
      )) &&
    Number.isSafeInteger(state.nextSessionId) &&
    state.nextSessionId > 0 &&
    Array.isArray(state.sessions) &&
    new Set(state.sessions.map((session) => session?.id)).size ===
      state.sessions.length &&
    new Set(state.sessions.map((session) => session?.seatId)).size ===
      state.sessions.length &&
    state.sessions.every(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.customerId === 'string' &&
        venues.some(
          (venue) =>
            venue.id === s.venueId &&
            venue.seats.some((seat) => seat.id === s.seatId),
        ) &&
        ['METERED_OPEN', 'BUNDLE_2H', 'BUNDLE_4H'].includes(s.mode) &&
        Number.isSafeInteger(s.elapsedMinutes) &&
        s.elapsedMinutes >= 0 &&
        Number.isSafeInteger(s.lockedHourlyRate) &&
        s.lockedHourlyRate >= 0 &&
        Array.isArray(s.orders) &&
        s.orders.every(
          (order) =>
            order &&
            typeof order.menuItemId === 'string' &&
            typeof order.name === 'string' &&
            Number.isSafeInteger(order.unitPrice) &&
            order.unitPrice >= 0 &&
            Number.isSafeInteger(order.quantity) &&
            order.quantity > 0,
        ),
    )
  );
}
