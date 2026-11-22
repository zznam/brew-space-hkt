/** Order-scoped bearer tokens survive a gateway round-trip in this browser tab only.
 * Never put them in URLs, localStorage, analytics, or staff credential storage. */
export interface GuestOrder {
  id: string;
  token: string;
  expiresAt: number;
}
const key = (branchId: string) => `brewspace:guest-order:${branchId}`;
function storage() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
export function readGuestOrder(branchId: string): GuestOrder | null {
  try {
    const value = JSON.parse(
      storage()?.getItem(key(branchId)) ?? 'null',
    ) as GuestOrder | null;
    if (
      value &&
      typeof value.id === 'string' &&
      /^[a-f0-9]{64}$/.test(value.token) &&
      Number.isSafeInteger(value.expiresAt) &&
      value.expiresAt > Date.now()
    )
      return value;
    storage()?.removeItem(key(branchId));
  } catch {
    /* Private browsing may disable storage. The in-memory flow still works. */
  }
  return null;
}
export function rememberGuestOrder(branchId: string, order: GuestOrder) {
  try {
    storage()?.setItem(key(branchId), JSON.stringify(order));
  } catch {
    /* Keep the current page usable. */
  }
}
export function forgetGuestOrder(branchId: string) {
  try {
    storage()?.removeItem(key(branchId));
  } catch {
    /* Storage may be unavailable. */
  }
}
