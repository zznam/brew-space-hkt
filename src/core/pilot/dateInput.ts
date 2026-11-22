/** Form boundary for branches with a fixed UTC offset (Vietnam in this MVP). */
export function formatLocalInput(ms: number, offsetMinutes = 420): string {
  return new Date(ms + offsetMinutes * 60000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
}
export function parseLocalInput(
  value: string,
  offsetMinutes = 420,
): number | null {
  if (
    !/^\d{4}-\d{2}-\d{2} [0-2]\d:[0-5]\d$/.test(value) ||
    !Number.isInteger(offsetMinutes) ||
    Math.abs(offsetMinutes) > 840
  )
    return null;
  const time =
    Date.parse(`${value.replace(' ', 'T')}:00Z`) - offsetMinutes * 60000;
  if (!Number.isFinite(time) || formatLocalInput(time, offsetMinutes) !== value)
    return null;
  return time;
}
