/** F279: sale time left by server time, independent of the device clock. */

/** Difference between the server clock and this device, measured when the menu loaded. */
export function clockOffset(serverNow: number, deviceNow: number): number {
  return Number.isFinite(serverNow) ? serverNow - deviceNow : 0;
}

/** Milliseconds until `endAt` on the server clock (never negative). */
export function saleTimeLeft(
  endAt: number,
  deviceNow: number,
  offset: number,
): number {
  return Math.max(0, endAt - (deviceNow + offset));
}

/** "1 h 05 min" for an hour or more, otherwise "mm:ss". */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
