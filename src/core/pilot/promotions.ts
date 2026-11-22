import { z } from 'zod';
import { calculatePromotionDiscount } from '../billing';
import {
  activeTenant,
  audit,
  branchById,
  owned,
  requireStaff,
  staffActor,
  staffOf,
} from './access';
import { fail, must } from './errors';
import type {
  AppliedPromotion,
  FlashSale,
  OrderLine,
  Tx,
  Voucher,
} from './types';
import { nextId } from './util';

const id = z.string().min(1).max(100);
const amount = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const timestamp = z.number().int().min(0).max(8_640_000_000_000_000);
export const promotionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('voucher'),
      code: z.string().trim().min(1).max(40),
    })
    .strict(),
  z.object({ kind: z.literal('flash_sale'), id }).strict(),
]);
export const voucherSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[a-zA-Z0-9-]+$/),
    kind: z.enum(['fixed', 'percent']),
    value: amount,
    cap: amount,
    validFrom: timestamp,
    validTo: timestamp,
    usageLimit: z.number().int().min(1).max(100000),
  })
  .strict();
export const saleSchema = z
  .object({
    branchId: id,
    name: z.string().trim().min(1).max(60),
    appliesTo: z.enum(['items', 'seat', 'all']),
    tierIds: z.array(id).min(1).max(50).nullable(),
    startAt: timestamp,
    endAt: timestamp,
    discountPercent: z.number().int().min(1).max(100),
    discountCap: amount,
    quota: z.number().int().min(1).max(100000),
  })
  .strict();
export const saleDecisionSchema = z
  .object({ saleId: id, reason: z.string().trim().min(1).max(200) })
  .strict();
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) fail('VALIDATION');
  return result.data;
}
export function createVoucher(tx: Tx, value: z.infer<typeof voucherSchema>) {
  const staff = requireStaff(tx, 'tenant.config');
  const input = parse(voucherSchema, value);
  const tenant = activeTenant(tx.db, staff.tenantId);
  if (
    input.validTo <= Math.max(tx.now, input.validFrom) ||
    (input.kind === 'percent' &&
      input.value > tenant.settings.maxDiscountPercent)
  )
    fail('GUARDRAIL');
  const code = input.code.toUpperCase();
  if (
    tx.db.vouchers.some((v) => v.tenantId === staff.tenantId && v.code === code)
  )
    fail('VALIDATION');
  const voucher: Voucher = {
    ...input,
    id: nextId(tx.db, 'vch'),
    tenantId: staff.tenantId,
    code,
    held: 0,
    used: 0,
  };
  tx.db.vouchers.push(voucher);
  audit(tx, staffActor(staff), 'voucher.create', voucher.id, {
    tenantId: staff.tenantId,
  });
  return voucher;
}
export function proposeSale(tx: Tx, value: z.infer<typeof saleSchema>) {
  const input = parse(saleSchema, value);
  const staff = requireStaff(tx, 'pricing.propose', input.branchId);
  const branch = branchById(tx.db, input.branchId);
  const tenant = activeTenant(tx.db, staff.tenantId);
  if (
    input.endAt <= Math.max(tx.now, input.startAt) ||
    input.discountPercent > tenant.settings.maxDiscountPercent ||
    input.tierIds?.some((tier) => !branch.tiers.some((t) => t.id === tier))
  )
    fail('GUARDRAIL');
  const sale: FlashSale = {
    ...input,
    id: nextId(tx.db, 'sale'),
    tenantId: staff.tenantId,
    held: 0,
    used: 0,
    status: 'proposed',
    proposedBy: staff.id,
    approval: null,
    suggestionId: null,
  };
  tx.db.sales.push(sale);
  audit(tx, staffActor(staff), 'sale.propose', sale.id, {
    tenantId: staff.tenantId,
    branchId: branch.id,
  });
  return sale;
}
export function approveSale(tx: Tx, value: z.infer<typeof saleDecisionSchema>) {
  const input = parse(saleDecisionSchema, value);
  const staff = staffOf(tx);
  const sale = owned(tx.db.sales, input.saleId, staff.tenantId);
  requireStaff(tx, 'pricing.approve', sale.branchId);
  const tenant = activeTenant(tx.db, staff.tenantId);
  if (
    sale.status !== 'proposed' ||
    sale.endAt <= tx.now ||
    sale.discountPercent > tenant.settings.maxDiscountPercent
  )
    fail('GUARDRAIL');
  sale.status = 'approved';
  sale.approval = {
    by: staff.id,
    reason: input.reason,
    version: 1,
    at: tx.now,
    validFrom: sale.startAt,
    validTo: sale.endAt,
  };
  audit(tx, staffActor(staff), 'sale.approve', sale.id, {
    tenantId: staff.tenantId,
    branchId: sale.branchId,
    meta: { reason: input.reason },
  });
  return sale;
}
export function stopSale(tx: Tx, value: z.infer<typeof saleDecisionSchema>) {
  const input = parse(saleDecisionSchema, value);
  const staff = staffOf(tx);
  const sale = owned(tx.db.sales, input.saleId, staff.tenantId);
  requireStaff(tx, 'pricing.approve', sale.branchId);
  sale.status = 'stopped';
  audit(tx, staffActor(staff), 'sale.stop', sale.id, {
    tenantId: staff.tenantId,
    branchId: sale.branchId,
    meta: { reason: input.reason },
  });
  return sale;
}
export function listOffers(tx: Tx, input: { branchId: string }) {
  const staff = requireStaff(tx, 'pricing.propose', input.branchId);
  return {
    vouchers: tx.db.vouchers.filter((v) => v.tenantId === staff.tenantId),
    sales: tx.db.sales.filter((s) => s.branchId === input.branchId),
    maxDiscountPercent: activeTenant(tx.db, staff.tenantId).settings
      .maxDiscountPercent,
  };
}
export function publicSales(tx: Tx, branchId: string) {
  return tx.db.sales
    .filter(
      (s) =>
        s.branchId === branchId &&
        s.status === 'approved' &&
        s.startAt <= tx.now &&
        s.endAt > tx.now &&
        s.held + s.used < s.quota,
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      discountPercent: s.discountPercent,
      discountCap: s.discountCap,
      endAt: s.endAt,
      appliesTo: s.appliesTo,
    }));
}
export function resolvePromotion(
  tx: Tx,
  branchId: string,
  lines: OrderLine[],
  selection?: z.infer<typeof promotionSchema>,
) {
  if (!selection) return null;
  const branch = branchById(tx.db, branchId);
  const tenant = activeTenant(tx.db, branch.tenantId);
  let promotion: AppliedPromotion;
  let expiresAt: number;
  if (selection.kind === 'voucher') {
    const voucher = must(
      tx.db.vouchers.find(
        (v) =>
          v.tenantId === tenant.id &&
          v.code === selection.code.trim().toUpperCase(),
      ),
      'VOUCHER_UNKNOWN',
    );
    if (voucher.validFrom > tx.now || voucher.validTo <= tx.now)
      fail('VOUCHER_EXPIRED');
    if (voucher.held + voucher.used >= voucher.usageLimit)
      fail('VOUCHER_EXHAUSTED');
    promotion = {
      kind: 'voucher',
      refId: voucher.id,
      label: voucher.code,
      amount: calculatePromotionDiscount(
        lines,
        voucher,
        tenant.settings.maxDiscountPercent,
      ),
    };
    expiresAt = voucher.validTo;
  } else {
    const sale = must(
      tx.db.sales.find((s) => s.id === selection.id && s.branchId === branchId),
      'PROMOTION_ENDED',
    );
    if (
      sale.status !== 'approved' ||
      sale.startAt > tx.now ||
      sale.endAt <= tx.now ||
      sale.held + sale.used >= sale.quota
    )
      fail('PROMOTION_ENDED');
    const eligible = lines.filter(
      (l) =>
        (sale.appliesTo === 'all' ||
          (sale.appliesTo === 'items'
            ? l.kind === 'item'
            : l.kind !== 'item')) &&
        (!sale.tierIds ||
          (l.tierId !== undefined && sale.tierIds.includes(l.tierId))),
    );
    promotion = {
      kind: 'flash_sale',
      refId: sale.id,
      label: sale.name,
      amount: calculatePromotionDiscount(
        eligible,
        { kind: 'percent', value: sale.discountPercent, cap: sale.discountCap },
        tenant.settings.maxDiscountPercent,
      ),
    };
    expiresAt = sale.endAt;
  }
  if (promotion.amount === 0) fail('PROMOTION_ENDED');
  return { promotion, expiresAt };
}
export function holdPromotion(
  tx: Tx,
  branchId: string,
  promotion: AppliedPromotion | null,
) {
  if (!promotion) return;
  const branch = branchById(tx.db, branchId);
  if (promotion.kind === 'voucher') {
    const v = owned(tx.db.vouchers, promotion.refId, branch.tenantId);
    if (v.validFrom > tx.now || v.validTo <= tx.now) fail('VOUCHER_EXPIRED');
    if (v.used + v.held >= v.usageLimit) fail('VOUCHER_EXHAUSTED');
    v.held++;
  } else if (promotion.kind === 'flash_sale') {
    const s = owned(tx.db.sales, promotion.refId, branch.tenantId);
    if (
      s.branchId !== branchId ||
      s.status !== 'approved' ||
      s.startAt > tx.now ||
      s.endAt <= tx.now ||
      s.used + s.held >= s.quota
    )
      fail('PROMOTION_ENDED');
    s.held++;
  } else fail('PROMOTION_CONFLICT');
}
/** Called once on transition out of awaiting_payment; retries cannot consume twice. */
export function finishPromotion(
  tx: Tx,
  promotion: AppliedPromotion | null,
  paid: boolean,
) {
  if (!promotion || promotion.kind === 'points') return;
  const row =
    promotion.kind === 'voucher'
      ? tx.db.vouchers.find((v) => v.id === promotion.refId)
      : tx.db.sales.find((s) => s.id === promotion.refId);
  if (!row) fail('INTERNAL');
  row.held = Math.max(0, row.held - 1);
  if (paid) row.used++;
}
