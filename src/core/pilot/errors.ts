/** Published error codes (PRD §6.2, F294). Clients show a message per code. */
export const ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION',
  'THROTTLED',
  'TENANT_SUSPENDED',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_CONFLICT',
  'QUOTE_EXPIRED',
  'SEAT_UNAVAILABLE',
  'OUTSIDE_HOURS',
  'ITEM_UNAVAILABLE',
  'PROMOTION_CONFLICT',
  'PROMOTION_ENDED',
  'VOUCHER_UNKNOWN',
  'VOUCHER_EXPIRED',
  'VOUCHER_EXHAUSTED',
  'POINTS_INSUFFICIENT',
  'POINTS_BLOCKED',
  'ORDER_STATE',
  'PAYMENT_PENDING',
  'PAYMENT_REJECTED',
  'PROVIDER_UNAVAILABLE',
  'NO_OPEN_SHIFT',
  'SHIFT_STATE',
  'TOO_EARLY',
  'CHECKIN_CLOSED',
  'BOOKING_STATE',
  'EXTENSION_CONFLICT',
  'TIER_MISMATCH',
  'OTP_INVALID',
  'GUARDRAIL',
  'RULE_OVERLAP',
  'LAYOUT_INVALID',
  'VERSION_CONFLICT',
  'ASSET_REJECTED',
  'REFUND_STATE',
  'REFUND_EXCEEDS',
  'SUGGESTION_EXPIRED',
  'TICKET_STATE',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export class PilotError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
  }
}
export function fail(
  code: ErrorCode,
  message?: string,
  details?: unknown,
): never {
  throw new PilotError(code, message, details);
}
/** Narrowing helper: refuses with `code` when `value` is missing. */
export function must<T>(
  value: T | null | undefined,
  code: ErrorCode = 'NOT_FOUND',
  message?: string,
): T {
  if (value === null || value === undefined) fail(code, message);
  return value as T;
}
