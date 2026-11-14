import { describe, expect, it } from 'vitest';
import {
  calculateBill,
  createAppStore,
  initialState,
  isDemoState,
  type Session,
} from '../src/core';
const session: Session = {
  id: 'test',
  venueId: 'grind',
  seatId: 'grind-seat-8',
  customerId: 'guest',
  mode: 'METERED_OPEN',
  elapsedMinutes: 0,
  lockedHourlyRate: 30000,
  orders: [],
};
describe('demo billing policy', () => {
  it.each([
    [0, 0],
    [1, 7500],
    [15, 7500],
    [16, 15000],
    [60, 30000],
  ])('meters %i minutes as %i VND', (elapsedMinutes, total) => {
    expect(calculateBill({ ...session, elapsedMinutes }).total).toBe(total);
  });
  it.each([
    [120, 51000],
    [130, 51000],
    [131, 58500],
    [145, 58500],
    [146, 66000],
  ])('handles bundle grace at %i minutes', (elapsedMinutes, total) => {
    expect(
      calculateBill({ ...session, mode: 'BUNDLE_2H', elapsedMinutes }).total,
    ).toBe(total);
  });
  it('adds menu totals to the locked rate', () => {
    expect(
      calculateBill({
        ...session,
        elapsedMinutes: 60,
        orders: [
          {
            menuItemId: 'drink',
            name: 'Coffee',
            unitPrice: 45000,
            quantity: 2,
          },
        ],
      }).total,
    ).toBe(120000);
  });
  it('rejects invalid time', () =>
    expect(() => calculateBill({ ...session, elapsedMinutes: -1 })).toThrow());
});
describe('shared demo state', () => {
  it('prevents double occupation and preserves session when switching roles', () => {
    const store = createAppStore();
    store.getState().selectSeat('grind-seat-8');
    expect(store.getState().startSession('METERED_OPEN').ok).toBe(true);
    store.getState().setRole('customer');
    expect(store.getState().selectedSeatId).toBe('grind-seat-8');
    expect(store.getState().startSession('METERED_OPEN').ok).toBe(false);
  });
  it('isolates selection and menu/session mutations between venues', () => {
    const store = createAppStore();
    store.getState().selectSeat('grind-seat-8');
    store.getState().startSession('BUNDLE_2H');
    store.getState().setVenue('matcha');
    expect(store.getState().selectedSeatId).toBeNull();
    store.getState().selectSeat('grind-seat-7');
    expect(store.getState().selectedSeatId).toBeNull();
    expect(store.getState().addItem('demo-1', 'matcha-drink').ok).toBe(false);
    expect(store.getState().endSession('demo-1').ok).toBe(false);
    store.getState().setVenue('grind');
    expect(store.getState().addItem('demo-1', 'grind-drink').ok).toBe(true);
    store.getState().advanceTime();
    expect(
      store.getState().sessions.find((s) => s.id === 'demo-1')?.elapsedMinutes,
    ).toBe(30);
    expect(store.getState().endSession('demo-1').ok).toBe(true);
    store.getState().selectSeat('grind-seat-8');
    expect(store.getState().startSession('METERED_OPEN').ok).toBe(true);
  });
  it('replaces only the active venue for a scenario and resets all data', () => {
    const store = createAppStore();
    const others = store
      .getState()
      .sessions.filter((s) => s.venueId !== 'grind');
    store.getState().setScenario('morning');
    expect(
      store.getState().sessions.filter((s) => s.venueId === 'grind'),
    ).toHaveLength(7);
    expect(
      store.getState().sessions.filter((s) => s.venueId !== 'grind'),
    ).toEqual(others);
    store.getState().reset();
    expect(store.getState().sessions).toEqual(initialState().sessions);
  });
  it('validates snapshots and rejects corrupt/duplicate/cross-tenant seats', () => {
    expect(isDemoState(initialState())).toBe(true);
    expect(isDemoState(null)).toBe(false);
    expect(isDemoState({ ...initialState(), sessions: [null] })).toBe(false);
    expect(isDemoState({ ...initialState(), venueId: 'missing' })).toBe(false);
    const state = initialState();
    expect(
      isDemoState({
        ...state,
        sessions: [...state.sessions, state.sessions[0]],
      }),
    ).toBe(false);
    expect(
      isDemoState({ ...state, sessions: [{ ...session, venueId: 'matcha' }] }),
    ).toBe(false);
  });
});
