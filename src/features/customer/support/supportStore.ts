import { createStore } from 'zustand/vanilla';
import type { ActionResult } from '../../../core/domain';
import { getAllVenues } from '../../../core/fixtures';
import type { VisitSnapshot } from '../shared/visit';
import {
  MAX_NOTE_LENGTH,
  classifyNote,
  classifySeatIssue,
  findSeatIssuePreset,
  validateNote,
  type SupportRequest,
} from './supportModel';

/** Where the customer is when asking for help. `minute` is the session's
 * elapsed minutes (the demo clock). */
export interface SupportContext {
  venueId: string;
  seatId: string;
  sessionId: string | null;
  minute: number;
}

export interface Rating {
  sessionId: string;
  seat: number;
  drinks: number;
  service: number;
  comment: string;
}

export type SubmitResult =
  { ok: true; request: SupportRequest } | { ok: false; message: string };

export interface SupportStore {
  requests: SupportRequest[];
  lastReceipt: VisitSnapshot | null;
  ratings: Rating[];
  nextRequestId: number;
  /** Always creates a request; never depends on a classifier. */
  callStaff: (ctx: SupportContext) => SubmitResult;
  /** Classifies the note, but only labels it: orders and prices are untouched. */
  submitNote: (ctx: SupportContext, text: string) => SubmitResult;
  reportSeatIssue: (ctx: SupportContext, presetId: string) => SubmitResult;
  markResolved: (requestId: string) => ActionResult;
  setLastReceipt: (receipt: VisitSnapshot | null) => void;
  rate: (rating: Rating) => ActionResult;
  reset: () => void;
}

const fail = (message: string) => ({ ok: false as const, message });

function validateContext(ctx: SupportContext) {
  const venue = getAllVenues().find((entry) => entry.id === ctx?.venueId);
  if (!venue) return fail('Unknown venue.');
  if (!venue.seats.some((seat) => seat.id === ctx.seatId))
    return fail('Unknown seat for this venue.');
  return null;
}

const isRating = (value: unknown) =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 5;

/** Fresh store per call keeps tests isolated (same pattern as core/store). */
export function createSupportStore() {
  return createStore<SupportStore>()((set, get) => {
    function add(
      ctx: SupportContext,
      fields: Pick<SupportRequest, 'kind' | 'text' | 'classification'>,
    ): SubmitResult {
      const invalid = validateContext(ctx);
      if (invalid) return invalid;
      const state = get();
      const request: SupportRequest = {
        id: `support-${state.nextRequestId}`,
        venueId: ctx.venueId,
        seatId: ctx.seatId,
        sessionId: ctx.sessionId,
        createdAtMinute:
          Number.isSafeInteger(ctx.minute) && ctx.minute >= 0 ? ctx.minute : 0,
        status: 'open',
        ...fields,
      };
      set({
        requests: [...state.requests, request],
        nextRequestId: state.nextRequestId + 1,
      });
      return { ok: true, request };
    }
    return {
      requests: [],
      lastReceipt: null,
      ratings: [],
      nextRequestId: 1,
      callStaff: (ctx) =>
        add(ctx, {
          kind: 'call_staff',
          text: 'Call staff',
          classification: null,
        }),
      submitNote: (ctx, text) => {
        const checked = validateNote(text);
        if (!checked.ok) return checked;
        return add(ctx, {
          kind: 'note',
          text: checked.text,
          classification: classifyNote(checked.text),
        });
      },
      reportSeatIssue: (ctx, presetId) => {
        const preset = findSeatIssuePreset(presetId);
        if (!preset) return fail('Choose one of the listed seat issues.');
        return add(ctx, {
          kind: 'seat_issue',
          text: preset.label,
          classification: classifySeatIssue(preset),
        });
      },
      markResolved: (requestId) => {
        const request = get().requests.find((entry) => entry.id === requestId);
        if (!request) return fail('Request not found.');
        set({
          requests: get().requests.map((entry) =>
            entry.id === requestId
              ? { ...entry, status: 'resolved' as const }
              : entry,
          ),
        });
        return { ok: true };
      },
      setLastReceipt: (lastReceipt) => set({ lastReceipt }),
      rate: (rating) => {
        if (
          !rating ||
          typeof rating.sessionId !== 'string' ||
          !rating.sessionId
        )
          return fail('Missing session for this rating.');
        if (
          !isRating(rating.seat) ||
          !isRating(rating.drinks) ||
          !isRating(rating.service)
        )
          return fail('Each rating must be a whole number from 1 to 5.');
        const comment =
          typeof rating.comment === 'string' ? rating.comment.trim() : '';
        if (comment.length > MAX_NOTE_LENGTH)
          return fail(`Comments can be at most ${MAX_NOTE_LENGTH} characters.`);
        const clean: Rating = {
          sessionId: rating.sessionId,
          seat: rating.seat,
          drinks: rating.drinks,
          service: rating.service,
          comment,
        };
        // One rating per session: re-submitting replaces the earlier one.
        set({
          ratings: [
            ...get().ratings.filter(
              (entry) => entry.sessionId !== clean.sessionId,
            ),
            clean,
          ],
        });
        return { ok: true };
      },
      reset: () =>
        set({
          requests: [],
          lastReceipt: null,
          ratings: [],
          nextRequestId: 1,
        }),
    };
  });
}
