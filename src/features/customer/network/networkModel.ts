/** Pure offline policy. No React, no platform imports: safe to import from tests. */
export const OFFLINE_MESSAGE =
  "You're offline. Ordering and ending your session are paused until you reconnect.";

/** Returns the message to show when an action whose result the app cannot
 * learn must be blocked, or null when the action may go ahead. */
export function blockWhenOffline(online: boolean): string | null {
  return online ? null : OFFLINE_MESSAGE;
}
