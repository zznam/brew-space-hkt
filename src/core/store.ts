import { createStore } from 'zustand/vanilla';
import type {
  ActionResult,
  BillingMode,
  DemoState,
  Role,
  Scenario,
  Venue,
} from './domain';
import {
  DEMO_CUSTOMER_ID,
  getAllVenues,
  getVenue,
  initialState,
  scenarioSessions,
  setActiveCustomVenues,
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
  upsertVenue: (venue: Venue) => ActionResult;
  reset: () => void;
}

export function isValidVenue(value: unknown): value is Venue {
  if (!value || typeof value !== 'object') return false;
  const v = value as Venue;
  if (
    typeof v.id !== 'string' ||
    !v.id.trim() ||
    typeof v.name !== 'string' ||
    !v.name.trim() ||
    typeof v.accent !== 'string' ||
    !v.accent.trim() ||
    typeof v.description !== 'string' ||
    !Array.isArray(v.seats) ||
    v.seats.length === 0 ||
    !Array.isArray(v.menu) ||
    v.menu.length === 0
  )
    return false;
  const seatIds = new Set(v.seats.map((s) => s?.id));
  if (seatIds.size !== v.seats.length) return false;
  const seatsValid = v.seats.every(
    (seat) =>
      seat &&
      typeof seat.id === 'string' &&
      seat.id.trim().length > 0 &&
      seat.venueId === v.id &&
      typeof seat.label === 'string' &&
      seat.label.trim().length > 0 &&
      ['desk', 'booth', 'pod'].includes(seat.kind) &&
      typeof seat.x === 'number' &&
      Number.isFinite(seat.x) &&
      typeof seat.z === 'number' &&
      Number.isFinite(seat.z) &&
      Number.isSafeInteger(seat.hourlyRate) &&
      seat.hourlyRate >= 0,
  );
  if (!seatsValid) return false;
  const menuIds = new Set(v.menu.map((m) => m?.id));
  if (menuIds.size !== v.menu.length) return false;
  const menuValid = v.menu.every(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      item.id.trim().length > 0 &&
      typeof item.name === 'string' &&
      item.name.trim().length > 0 &&
      Number.isSafeInteger(item.price) &&
      item.price >= 0,
  );
  if (!menuValid) return false;
  if (v.scene3d !== undefined) {
    const s = v.scene3d;
    if (
      !s ||
      typeof s !== 'object' ||
      typeof s.roomWidth !== 'number' ||
      s.roomWidth < 4 ||
      typeof s.roomDepth !== 'number' ||
      s.roomDepth < 4 ||
      typeof s.wallColor !== 'string' ||
      typeof s.floorColor !== 'string' ||
      !['industrial', 'botanical', 'cyber', 'warm-minimal'].includes(s.theme) ||
      !['warm-daylight', 'cozy-amber', 'neon-night', 'bright-studio'].includes(
        s.lighting,
      ) ||
      !Array.isArray(s.fixtures)
    )
      return false;
  }
  return true;
}

/** Factory isolates tests and leaves persistence/native concerns outside domain actions. */
export function createAppStore() {
  setActiveCustomVenues([]);
  return createStore<AppStore>()((set, get) => ({
    ...initialState(),
    setRole: (role) => set({ role }),
    setVenue: (venueId) => {
      getVenue(venueId, get().customVenues);
      set({ venueId, selectedSeatId: null });
    },
    selectSeat: (id) => {
      const state = get();
      if (
        getVenue(state.venueId, state.customVenues).seats.some(
          (seat) => seat.id === id,
        )
      )
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
          ...scenarioSessions(
            getVenue(state.venueId, state.customVenues),
            scenario,
          ),
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
      const seat = getVenue(state.venueId, state.customVenues).seats.find(
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
      const item = getVenue(state.venueId, state.customVenues).menu.find(
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
    upsertVenue: (venue) => {
      if (!isValidVenue(venue)) {
        return {
          ok: false,
          message:
            'Venue must have a valid name, at least one seat, and at least one menu item with integer VND prices.',
        };
      }
      const state = get();
      const existingCustom = state.customVenues ?? [];
      const nextCustom = existingCustom.some((item) => item.id === venue.id)
        ? existingCustom.map((item) => (item.id === venue.id ? venue : item))
        : [...existingCustom, venue];
      setActiveCustomVenues(nextCustom);
      const validSeatIds = new Set(venue.seats.map((seat) => seat.id));
      const keptSessions = state.sessions.filter(
        (s) => s.venueId !== venue.id || validSeatIds.has(s.seatId),
      );
      const hasVenueSessions = keptSessions.some((s) => s.venueId === venue.id);
      const nextSessions = hasVenueSessions
        ? keptSessions
        : [...keptSessions, ...scenarioSessions(venue, state.scenario)];
      set({
        customVenues: nextCustom,
        venueId: venue.id,
        selectedSeatId: null,
        sessions: nextSessions,
      });
      return { ok: true };
    },
    reset: () => {
      setActiveCustomVenues([]);
      set({ ...initialState(), customVenues: undefined });
    },
  }));
}

/** Validate persisted snapshots before merging them into the live store. */
export function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== 'object') return false;
  const state = value as DemoState;
  if (
    state.customVenues !== undefined &&
    (!Array.isArray(state.customVenues) ||
      !state.customVenues.every(isValidVenue))
  ) {
    return false;
  }
  const allVenues = getAllVenues(state.customVenues ?? []);
  return (
    (state.role === 'merchant' || state.role === 'customer') &&
    allVenues.some((venue) => venue.id === state.venueId) &&
    (state.scenario === 'morning' || state.scenario === 'afternoon') &&
    (state.selectedSeatId === null ||
      getVenue(state.venueId, state.customVenues ?? []).seats.some(
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
        allVenues.some(
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
