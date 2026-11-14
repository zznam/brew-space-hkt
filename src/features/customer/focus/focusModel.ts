/**
 * Pure Pomodoro state machine. It is a client-only aid: it reads the device
 * wall clock through explicit `nowMs` values passed by the caller and never
 * touches billing or the demo session time. No timers or React in here.
 */
import { translate, type Lang, type Params } from '../i18n/i18n';
import { focusMessages } from './messages';

export const FOCUS_PRESETS = [
  { id: '25-5', label: '25 / 5', workMinutes: 25, breakMinutes: 5 },
  { id: '50-10', label: '50 / 10', workMinutes: 50, breakMinutes: 10 },
] as const;
export type FocusPresetId = (typeof FOCUS_PRESETS)[number]['id'];
export type FocusPhase = 'idle' | 'work' | 'break';
export type FocusChange =
  'started' | 'resumed' | 'paused' | 'break' | 'work' | 'reset';

export interface FocusState {
  presetId: FocusPresetId;
  phase: FocusPhase;
  running: boolean;
  /** Time left in the current phase as of `lastTickMs` (or paused/idle). */
  remainingMs: number;
  /** Wall-clock time of the last accounted tick; null unless running. */
  lastTickMs: number | null;
  /** Completed work blocks since the last reset. */
  cycles: number;
  /** Most recent change, for announcements; null before any action. */
  lastChange: FocusChange | null;
}
export type FocusAction =
  | { type: 'start'; nowMs: number }
  | { type: 'pause'; nowMs: number }
  | { type: 'tick'; nowMs: number }
  | { type: 'reset' }
  | { type: 'preset'; presetId: FocusPresetId };

export const getPreset = (id: FocusPresetId) =>
  FOCUS_PRESETS.find((preset) => preset.id === id) ?? FOCUS_PRESETS[0];
const workMs = (id: FocusPresetId) => getPreset(id).workMinutes * 60000;
const breakMs = (id: FocusPresetId) => getPreset(id).breakMinutes * 60000;

export const initialFocusState = (
  presetId: FocusPresetId = '25-5',
): FocusState => ({
  presetId,
  phase: 'idle',
  running: false,
  remainingMs: workMs(presetId),
  lastTickMs: null,
  cycles: 0,
  lastChange: null,
});

/** Accounts wall-clock time up to `nowMs`, crossing phases (and whole cycles
 * when the tab slept for a long time) while keeping any overflow. */
function advance(state: FocusState, nowMs: number): FocusState {
  if (!state.running || state.lastTickMs === null) return state;
  // A clock that moved backwards adds no time.
  const elapsed = Math.max(0, nowMs - state.lastTickMs);
  let remaining = state.remainingMs - elapsed;
  let { phase, cycles, lastChange } = state;
  if (remaining <= 0) {
    const cycleMs = workMs(state.presetId) + breakMs(state.presetId);
    const skipped = Math.floor(-remaining / cycleMs);
    remaining += skipped * cycleMs;
    cycles += skipped;
    while (remaining <= 0) {
      if (phase === 'work') {
        cycles += 1;
        phase = 'break';
        remaining += breakMs(state.presetId);
        lastChange = 'break';
      } else {
        phase = 'work';
        remaining += workMs(state.presetId);
        lastChange = 'work';
      }
    }
  }
  return {
    ...state,
    phase,
    cycles,
    lastChange,
    remainingMs: remaining,
    lastTickMs: Math.max(nowMs, state.lastTickMs),
  };
}

export function focusReducer(
  state: FocusState,
  action: FocusAction,
): FocusState {
  switch (action.type) {
    case 'tick':
      return advance(state, action.nowMs);
    case 'start':
      if (state.running) return state;
      if (state.phase === 'idle')
        return {
          ...state,
          phase: 'work',
          running: true,
          remainingMs: workMs(state.presetId),
          lastTickMs: action.nowMs,
          lastChange: 'started',
        };
      return {
        ...state,
        running: true,
        lastTickMs: action.nowMs,
        lastChange: 'resumed',
      };
    case 'pause': {
      if (!state.running) return state;
      const settled = advance(state, action.nowMs);
      return {
        ...settled,
        running: false,
        lastTickMs: null,
        lastChange: 'paused',
      };
    }
    case 'reset':
      return {
        ...initialFocusState(state.presetId),
        lastChange: state.phase === 'idle' ? null : 'reset',
      };
    case 'preset':
      // Only while idle: changing length mid-block would be confusing.
      return state.phase === 'idle' && state.presetId !== action.presetId
        ? initialFocusState(action.presetId)
        : state;
  }
}

/** mm:ss, rounding up so the display never shows 00:00 while time is left. */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const phaseLabel = (phase: FocusPhase, lang: Lang = 'en') =>
  translate(
    focusMessages,
    lang,
    phase === 'work'
      ? 'phaseWork'
      : phase === 'break'
        ? 'phaseBreak'
        : 'phaseIdle',
  );

const MILK_KEY = {
  dairy: 'milkDairy',
  oat: 'milkOat',
  almond: 'milkAlmond',
  none: 'milkNone',
} as const;
/** Gentle break idea. `prefs` is the member's saved drink preference (read
 * only) or null for guests; the allergy note is never repeated here. */
export function breakSuggestion(
  prefs: { milk: keyof typeof MILK_KEY; sweetness: number } | null,
  lang: Lang = 'en',
) {
  const base = translate(focusMessages, lang, 'breakBase');
  return prefs
    ? translate(focusMessages, lang, 'breakDrink', {
        base,
        milk: translate(focusMessages, lang, MILK_KEY[prefs.milk]),
        sweetness: prefs.sweetness,
      })
    : base;
}

/** Text for the polite live region after a change. */
export function announcement(state: FocusState, lang: Lang = 'en'): string {
  const preset = getPreset(state.presetId);
  const say = (key: keyof typeof focusMessages.en, params?: Params) =>
    translate(focusMessages, lang, key, params);
  switch (state.lastChange) {
    case 'started':
    case 'work':
      return say('announceStarted', { minutes: preset.workMinutes });
    case 'resumed':
      return say('announceResumed', { phase: phaseLabel(state.phase, lang) });
    case 'paused':
      return say('announcePaused');
    case 'break':
      return say('announceBreak', {
        minutes: preset.breakMinutes,
        cycles: state.cycles,
        plural: state.cycles === 1 ? '' : 's',
      });
    case 'reset':
      return say('announceReset');
    default:
      return '';
  }
}
