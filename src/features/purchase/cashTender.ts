/** Counter cash entry (F215): what the cashier typed, checked against the order total. */
export type TenderState =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'short'; short: number }
  | { kind: 'ok'; tendered: number; change: number };

/** Amounts are whole VND, as typed into a numeric field. */
export function tenderState(total: number, text: string): TenderState {
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'empty' };
  if (!/^\d+$/.test(trimmed)) return { kind: 'invalid' };
  const tendered = Number(trimmed);
  if (!Number.isSafeInteger(tendered)) return { kind: 'invalid' };
  if (tendered < total) return { kind: 'short', short: total - tendered };
  return { kind: 'ok', tendered, change: tendered - total };
}

/** Vietnamese banknotes customers commonly hand over, smallest first. */
const NOTES = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000];
const MAX_SUGGESTIONS = 4;

/**
 * One-tap amounts: the exact total, then the smallest single-note or
 * round amounts at or above it. Duplicates are removed.
 */
export function tenderSuggestions(total: number): number[] {
  if (!Number.isSafeInteger(total) || total <= 0) return [];
  const amounts = new Set<number>([total]);
  for (const note of NOTES) {
    const rounded = Math.ceil(total / note) * note;
    if (Number.isSafeInteger(rounded)) amounts.add(rounded);
  }
  return [...amounts].sort((a, b) => a - b).slice(0, MAX_SUGGESTIONS);
}
