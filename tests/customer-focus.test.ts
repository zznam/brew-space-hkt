import { describe, expect, it } from 'vitest';
import {
  announcement,
  breakSuggestion,
  focusReducer,
  formatClock,
  initialFocusState,
  type FocusAction,
  type FocusState,
} from '../src/features/customer/focus/focusModel';

const MIN = 60000;
const T0 = 1_000_000;
const run = (actions: FocusAction[], state = initialFocusState()) =>
  actions.reduce<FocusState>(focusReducer, state);

describe('focus timer', () => {
  it('starts idle with a full work block and ignores ticks', () => {
    const state = initialFocusState();
    expect(state).toMatchObject({ phase: 'idle', running: false, cycles: 0 });
    expect(state.remainingMs).toBe(25 * MIN);
    expect(focusReducer(state, { type: 'tick', nowMs: T0 })).toBe(state);
  });
  it('counts down from wall-clock time', () => {
    const state = run([
      { type: 'start', nowMs: T0 },
      { type: 'tick', nowMs: T0 + 5 * MIN },
    ]);
    expect(state).toMatchObject({ phase: 'work', running: true });
    expect(state.remainingMs).toBe(20 * MIN);
  });
  it('moves from work to break and counts the cycle', () => {
    const state = run([
      { type: 'start', nowMs: T0 },
      { type: 'tick', nowMs: T0 + 25 * MIN },
    ]);
    expect(state).toMatchObject({
      phase: 'break',
      cycles: 1,
      lastChange: 'break',
    });
    expect(state.remainingMs).toBe(5 * MIN);
    expect(announcement(state)).toContain('Break time');
  });
  it('carries overflow into the next phase and goes back to work', () => {
    const state = run([
      { type: 'start', nowMs: T0 },
      { type: 'tick', nowMs: T0 + 31 * MIN },
    ]);
    expect(state).toMatchObject({
      phase: 'work',
      cycles: 1,
      lastChange: 'work',
    });
    expect(state.remainingMs).toBe(24 * MIN);
  });
  it('handles a long gap spanning several cycles', () => {
    const state = run([
      { type: 'start', nowMs: T0 },
      { type: 'tick', nowMs: T0 + 3 * 30 * MIN + 27 * MIN },
    ]);
    expect(state.cycles).toBe(4);
    expect(state.phase).toBe('break');
    expect(state.remainingMs).toBe(3 * MIN);
  });
  it('pauses and resumes without losing or gaining time', () => {
    let state = run([
      { type: 'start', nowMs: T0 },
      { type: 'pause', nowMs: T0 + 10 * MIN },
    ]);
    expect(state).toMatchObject({
      running: false,
      phase: 'work',
      lastTickMs: null,
    });
    expect(state.remainingMs).toBe(15 * MIN);
    // Time passing while paused does nothing.
    state = focusReducer(state, { type: 'tick', nowMs: T0 + 99 * MIN });
    expect(state.remainingMs).toBe(15 * MIN);
    state = run(
      [
        { type: 'start', nowMs: T0 + 100 * MIN },
        { type: 'tick', nowMs: T0 + 105 * MIN },
      ],
      state,
    );
    expect(state.remainingMs).toBe(10 * MIN);
    expect(state.lastChange).toBe('resumed');
  });
  it('pause past a phase boundary settles the phase first', () => {
    const state = run([
      { type: 'start', nowMs: T0 },
      { type: 'pause', nowMs: T0 + 26 * MIN },
    ]);
    expect(state).toMatchObject({ phase: 'break', cycles: 1, running: false });
    expect(state.remainingMs).toBe(4 * MIN);
  });
  it('ignores a clock that moves backwards', () => {
    const state = run([
      { type: 'start', nowMs: T0 },
      { type: 'tick', nowMs: T0 - 10 * MIN },
    ]);
    expect(state.remainingMs).toBe(25 * MIN);
  });
  it('resets to idle, keeping the chosen preset', () => {
    const state = run([
      { type: 'preset', presetId: '50-10' },
      { type: 'start', nowMs: T0 },
      { type: 'tick', nowMs: T0 + 60 * MIN },
      { type: 'reset' },
    ]);
    expect(state).toMatchObject({
      phase: 'idle',
      running: false,
      cycles: 0,
      presetId: '50-10',
      lastChange: 'reset',
    });
    expect(state.remainingMs).toBe(50 * MIN);
  });
  it('supports the 50/10 preset only while idle', () => {
    const idle = focusReducer(initialFocusState(), {
      type: 'preset',
      presetId: '50-10',
    });
    expect(idle.remainingMs).toBe(50 * MIN);
    const state = run(
      [
        { type: 'start', nowMs: T0 },
        { type: 'tick', nowMs: T0 + 50 * MIN },
      ],
      idle,
    );
    expect(state).toMatchObject({ phase: 'break', cycles: 1 });
    expect(state.remainingMs).toBe(10 * MIN);
    expect(
      focusReducer(state, { type: 'preset', presetId: '25-5' }).presetId,
    ).toBe('50-10');
  });
  it('start while running is a no-op', () => {
    const state = run([{ type: 'start', nowMs: T0 }]);
    expect(focusReducer(state, { type: 'start', nowMs: T0 + MIN })).toBe(state);
  });
  it('formats the clock rounding up', () => {
    expect(formatClock(25 * MIN)).toBe('25:00');
    expect(formatClock(1)).toBe('00:01');
    expect(formatClock(61000)).toBe('01:01');
    expect(formatClock(-5)).toBe('00:00');
  });
  it('suggests a break using the saved drink preference, if any', () => {
    expect(breakSuggestion(null)).not.toContain('preference');
    const text = breakSuggestion({ milk: 'oat', sweetness: 30 });
    expect(text).toContain('oat milk');
    expect(text).toContain('30%');
    expect(breakSuggestion({ milk: 'none', sweetness: 0 })).toContain(
      'no milk',
    );
  });
});
