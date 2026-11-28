import type { Session } from './domain';
import type { FeeConfig, OrderLine, Item } from './pilot/types';

/** Demo policy: bundles discount seat time 15%; overtime has a 10 minute grace.
 * Once grace is exceeded, only minutes beyond grace are charged in 15 minute blocks.
 * Backend must own authoritative quotes/payment totals before pilot use.
 */
/** Prepaid seat minutes included in a billing mode (metered sessions include none). */
export function includedMinutes(mode: Session['mode']): number {
  return mode === 'BUNDLE_2H' ? 120 : mode === 'BUNDLE_4H' ? 240 : 0;
}

/** Prepaid bundle minutes not yet used; ending now forfeits them (F248). */
export function unusedPrepaidMinutes(
  session: Pick<Session, 'mode' | 'elapsedMinutes'>,
): number {
  return Math.max(
    0,
    includedMinutes(session.mode) - Math.max(0, session.elapsedMinutes),
  );
}

export function calculateBill(session: Session) {
  const { elapsedMinutes, lockedHourlyRate, mode } = session;
  if (
    !Number.isSafeInteger(elapsedMinutes) ||
    elapsedMinutes < 0 ||
    !Number.isSafeInteger(lockedHourlyRate) ||
    lockedHourlyRate < 0
  ) {
    throw new Error('Invalid billing inputs');
  }
  const included = includedMinutes(mode);
  const base = Math.round((included / 60) * lockedHourlyRate * 0.85);
  const meteredMinutes = included
    ? Math.max(0, elapsedMinutes - included - 10)
    : elapsedMinutes;
  const time =
    base + Math.round((Math.ceil(meteredMinutes / 15) * lockedHourlyRate) / 4);
  const items = session.orders.reduce((sum, order) => {
    if (
      !Number.isSafeInteger(order.unitPrice) ||
      order.unitPrice < 0 ||
      !Number.isSafeInteger(order.quantity) ||
      order.quantity < 1
    )
      throw new Error('Invalid order');
    return sum + order.unitPrice * order.quantity;
  }, 0);
  return { time, items, total: time + items };
}
export const formatMoney = (amount: number) =>
  `${amount.toLocaleString('vi-VN')} ₫`;

/** Integer catalogue arithmetic shared by pilot line previews. */
export function calculateLineTotal(
  base: number,
  additions: number[],
  quantity: number,
): number {
  if (
    ![base, ...additions].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1
  )
    throw new Error('Invalid line inputs');
  const unit = additions.reduce((total, n) => total + n, base);
  const total = unit * quantity;
  if (!Number.isSafeInteger(unit) || !Number.isSafeInteger(total))
    throw new Error('Line total exceeds safe integer range');
  return total;
}

/** Authoritative item quote arithmetic. Percent fees use basis points and round
 * half up once per fee line. BigInt intermediates prevent precision loss. */
export function calculateQuoteTotal(
  lines: Pick<OrderLine, 'kind' | 'lineTotal'>[],
  configs: FeeConfig[],
  discount = 0,
) {
  const safe = (amount: bigint) => {
    if (amount < 0n || amount > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error('Invalid quote amount');
    return Number(amount);
  };
  if (lines.some((l) => !Number.isSafeInteger(l.lineTotal) || l.lineTotal < 0))
    throw new Error('Invalid quote line');
  const subtotal = safe(
    lines.reduce((n, line) => n + BigInt(line.lineTotal), 0n),
  );
  if (!Number.isSafeInteger(discount) || discount < 0 || discount > subtotal)
    throw new Error('Invalid discount');
  const fees = configs.flatMap((fee) => {
    if (!Number.isSafeInteger(fee.value) || fee.value < 0)
      throw new Error('Invalid fee');
    const eligible = lines.filter(
      (line) =>
        fee.appliesTo === 'all' ||
        (fee.appliesTo === 'items'
          ? line.kind === 'item'
          : line.kind !== 'item'),
    );
    if (!eligible.length) return [];
    const base = eligible.reduce((n, line) => n + BigInt(line.lineTotal), 0n);
    const amount =
      fee.kind === 'fixed'
        ? fee.value
        : safe((base * BigInt(fee.value) + 5000n) / 10000n);
    return [{ feeId: fee.id, name: fee.name, amount }];
  });
  return {
    subtotal,
    discount,
    fees,
    total: safe(
      fees.reduce(
        (n, fee) => n + BigInt(fee.amount),
        BigInt(subtotal - discount),
      ),
    ),
  };
}

/** One promotion, capped to eligible lines and the owner's maximum discount.
 * Percent values use whole percentages; round down so a cap is never exceeded. */
export function calculatePromotionDiscount(
  lines: Pick<OrderLine, 'lineTotal'>[],
  offer: { kind: 'percent' | 'fixed'; value: number; cap: number },
  maxPercent: number,
) {
  if (
    ![offer.value, offer.cap, maxPercent].every(
      (v) => Number.isSafeInteger(v) && v >= 0,
    ) ||
    maxPercent > 100 ||
    (offer.kind === 'percent' && offer.value > 100) ||
    lines.some((l) => !Number.isSafeInteger(l.lineTotal) || l.lineTotal < 0)
  )
    throw new Error('Invalid promotion');
  const eligible = lines.reduce((total, l) => total + BigInt(l.lineTotal), 0n);
  const amount =
    offer.kind === 'fixed'
      ? BigInt(offer.value)
      : (eligible * BigInt(offer.value)) / 100n;
  const maximum = (eligible * BigInt(maxPercent)) / 100n;
  const capped = [amount, BigInt(offer.cap), eligible, maximum].reduce(
    (a, b) => (a < b ? a : b),
  );
  if (capped > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Promotion amount is too large');
  return Number(capped);
}

/** Prepaid seat segments are priced proportionally and rounded once per line. */
export function calculateSeatTimeTotal(
  segments: { from: number; to: number; hourlyRate: number }[],
): number {
  let numerator = 0n;
  for (const segment of segments) {
    if (
      ![segment.from, segment.to, segment.hourlyRate].every(
        Number.isSafeInteger,
      ) ||
      segment.to <= segment.from ||
      segment.hourlyRate < 0
    )
      throw new Error('Invalid seat price segment');
    numerator += BigInt(segment.to - segment.from) * BigInt(segment.hourlyRate);
  }
  const total = (numerator + 1_800_000n) / 3_600_000n;
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Seat price is too large');
  return Number(total);
}

/** Non-binding catalogue estimate. The server quote always decides the price. */
export function estimateCatalogueCart(
  items: Item[],
  cart: {
    itemId: string;
    quantity: number;
    sizeId?: string;
    modifiers?: { groupId: string; optionId: string }[];
  }[],
): number | null {
  try {
    const lines = cart.map((line) => {
      const item = items.find((i) => i.id === line.itemId);
      if (!item) throw new Error('Item unavailable');
      const base = line.sizeId
        ? item.sizes.find((s) => s.id === line.sizeId)?.price
        : item.price;
      if (base === undefined) throw new Error('Size unavailable');
      const additions = (line.modifiers ?? []).map((m) => {
        const price = item.modifierGroups
          .find((g) => g.id === m.groupId)
          ?.options.find((o) => o.id === m.optionId)?.priceDelta;
        if (price === undefined) throw new Error('Modifier unavailable');
        return price;
      });
      return {
        kind: 'item' as const,
        lineTotal: calculateLineTotal(base, additions, line.quantity),
      };
    });
    return calculateQuoteTotal(lines, []).total;
  } catch {
    return null;
  }
}
