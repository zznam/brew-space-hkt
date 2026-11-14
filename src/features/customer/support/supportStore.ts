import { createStore } from 'zustand/vanilla';
import { getAllVenues } from '../../../core/fixtures';
import type { VisitSnapshot } from '../shared/visit';
import {
  MAX_NOTE_LENGTH,
  classifyNote,
  classifySeatChange,
  classifySeatIssue,
  findSeatIssuePreset,
  isSeatPreference,
  validateNote,
  validateOptionalReason,
  type NoteClassification,
  type SeatPreference,
  type SupportErrorCode,
  type SupportRequest,
} from './supportModel';
import {
  openRefundForSession,
  validateRefundReason,
  type RefundRequest,
} from './refundModel';

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

/** Failures carry an English message plus a code the UI translates. */
export type Failure = { ok: false; message: string; code?: SupportErrorCode };
export type SupportActionResult = { ok: true } | Failure;

export type SubmitResult = { ok: true; request: SupportRequest } | Failure;

/** The parts of a finished visit a refund request needs (a VisitSnapshot fits). */
export type RefundVisit = Pick<
  VisitSnapshot,
  'sessionId' | 'venueId' | 'seatId' | 'total' | 'minutes'
>;

export type RefundResult = { ok: true; refund: RefundRequest } | Failure;

const REFUND_CLASSIFICATION: NoteClassification = {
  category: 'payment',
  needsStaff: true,
  priority: 'normal',
  reasonCode: 'REFUND_REQUEST',
  confidence: 1,
};

export interface SupportStore {
  requests: SupportRequest[];
  refunds: RefundRequest[];
  nextRefundId: number;
  lastReceipt: VisitSnapshot | null;
  ratings: Rating[];
  nextRequestId: number;
  /** Always creates a request; never depends on a classifier. */
  callStaff: (ctx: SupportContext) => SubmitResult;
  /** Classifies the note, but only labels it: orders and prices are untouched. */
  submitNote: (ctx: SupportContext, text: string) => SubmitResult;
  reportSeatIssue: (ctx: SupportContext, presetId: string) => SubmitResult;
  /** Asks staff to move the guest. Staff carry out any move; nothing changes here. */
  requestSeatChange: (
    ctx: SupportContext,
    input: { preferredKind?: SeatPreference; reason?: string },
  ) => SubmitResult;
  /** Asks a manager to review a visit. One open request per session. Moves no money. */
  requestRefund: (visit: RefundVisit, reason: string) => RefundResult;
  withdrawRefund: (refundId: string) => SupportActionResult;
  markResolved: (requestId: string) => SupportActionResult;
  setLastReceipt: (receipt: VisitSnapshot | null) => void;
  rate: (rating: Rating) => SupportActionResult;
  reset: () => void;
}

const fail = (message: string, code: SupportErrorCode) => ({
  ok: false as const,
  message,
  code,
});

function validateContext(ctx: SupportContext) {
  const venue = getAllVenues().find((entry) => entry.id === ctx?.venueId);
  if (!venue) return fail('Unknown venue.', 'UNKNOWN_VENUE');
  if (!venue.seats.some((seat) => seat.id === ctx.seatId))
    return fail('Unknown seat for this venue.', 'UNKNOWN_SEAT');
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
      fields: Pick<SupportRequest, 'kind' | 'text' | 'classification'> &
        Partial<Pick<SupportRequest, 'preferredKind'>>,
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
      refunds: [],
      nextRefundId: 1,
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
        if (!preset)
          return fail(
            'Choose one of the listed seat issues.',
            'BAD_SEAT_ISSUE',
          );
        return add(ctx, {
          kind: 'seat_issue',
          text: preset.label,
          classification: classifySeatIssue(preset),
        });
      },
      requestSeatChange: (ctx, input) => {
        const preferred = input?.preferredKind ?? 'any';
        if (!isSeatPreference(preferred))
          return fail(
            'Choose desk, pod, booth or any seat.',
            'BAD_SEAT_PREFERENCE',
          );
        const reason = validateOptionalReason(input?.reason);
        if (!reason.ok) return reason;
        if (!ctx?.sessionId)
          return fail(
            'Start a session before asking to move seats.',
            'NEED_SESSION',
          );
        return add(ctx, {
          kind: 'seat_change',
          text: reason.text
            ? `Move seats (${preferred}): ${reason.text}`
            : `Move seats (${preferred})`,
          classification: classifySeatChange(),
          preferredKind: preferred,
        });
      },
      requestRefund: (visit, reasonText) => {
        const reason = validateRefundReason(reasonText);
        if (!reason.ok) return reason;
        if (!visit || typeof visit.sessionId !== 'string' || !visit.sessionId)
          return fail(
            'Missing visit for this refund request.',
            'REFUND_NO_VISIT',
          );
        if (!Number.isSafeInteger(visit.total) || visit.total < 0)
          return fail('This visit has an invalid total.', 'REFUND_BAD_TOTAL');
        if (visit.total === 0)
          return fail(
            'Nothing was charged for this visit, so there is nothing to refund.',
            'REFUND_ZERO',
          );
        if (openRefundForSession(get().refunds, visit.sessionId))
          return fail(
            'You already have a refund request waiting for review.',
            'REFUND_DUPLICATE',
          );
        const added = add(
          {
            venueId: visit.venueId,
            seatId: visit.seatId,
            sessionId: visit.sessionId,
            minute: visit.minutes,
          },
          {
            kind: 'refund',
            text: `Refund request: ${reason.text}`,
            classification: REFUND_CLASSIFICATION,
          },
        );
        if (!added.ok) return added;
        const state = get();
        const refund: RefundRequest = {
          id: `refund-${state.nextRefundId}`,
          sessionId: visit.sessionId,
          venueId: visit.venueId,
          seatId: visit.seatId,
          amount: visit.total,
          reason: reason.text,
          status: 'requested',
          supportRequestId: added.request.id,
        };
        set({
          refunds: [...state.refunds, refund],
          nextRefundId: state.nextRefundId + 1,
        });
        return { ok: true, refund };
      },
      withdrawRefund: (refundId) => {
        const refund = get().refunds.find((entry) => entry.id === refundId);
        if (!refund)
          return fail('Refund request not found.', 'REFUND_NOT_FOUND');
        if (refund.status !== 'requested')
          return fail(
            'This request is no longer waiting for review.',
            'REFUND_NOT_OPEN',
          );
        set({
          refunds: get().refunds.map((entry) =>
            entry.id === refundId
              ? { ...entry, status: 'withdrawn' as const }
              : entry,
          ),
          requests: get().requests.map((entry) =>
            entry.id === refund.supportRequestId
              ? { ...entry, status: 'resolved' as const }
              : entry,
          ),
        });
        return { ok: true };
      },
      markResolved: (requestId) => {
        const request = get().requests.find((entry) => entry.id === requestId);
        if (!request) return fail('Request not found.', 'REQUEST_NOT_FOUND');
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
          return fail('Missing session for this rating.', 'RATING_NO_SESSION');
        if (
          !isRating(rating.seat) ||
          !isRating(rating.drinks) ||
          !isRating(rating.service)
        )
          return fail(
            'Each rating must be a whole number from 1 to 5.',
            'RATING_RANGE',
          );
        const comment =
          typeof rating.comment === 'string' ? rating.comment.trim() : '';
        if (comment.length > MAX_NOTE_LENGTH)
          return fail(
            `Comments can be at most ${MAX_NOTE_LENGTH} characters.`,
            'RATING_COMMENT_TOO_LONG',
          );
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
          refunds: [],
          nextRefundId: 1,
          lastReceipt: null,
          ratings: [],
          nextRequestId: 1,
        }),
    };
  });
}
