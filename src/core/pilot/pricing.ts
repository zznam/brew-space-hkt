import { z } from 'zod';
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
import type { Branch, PriceRule, PriceSegment, Tx } from './types';
import { DAY, hm, local, localToUtc, nextId, overlaps } from './util';

const id = z.string().min(1).max(100);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const ms = Date.parse(`${v}T00:00:00Z`);
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === v;
  });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const priceRuleSchema = z
  .object({
    id: id.optional(),
    branchId: id.nullable(),
    tierId: id.nullable(),
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .refine((d) => new Set(d).size === d.length)
      .nullable(),
    from: time,
    to: z.union([time, z.literal('24:00')]),
    validFrom: date.nullable(),
    validTo: date.nullable(),
    hourlyRate: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    priority: z.number().int().min(0).max(100),
  })
  .strict();
export const publishPriceSchema = z
  .object({ ruleId: id, replaceId: id.optional() })
  .strict();
export const archivePriceSchema = z.object({ ruleId: id }).strict();
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) fail('VALIDATION');
  return result.data;
}
function authorizeScope(tx: Tx, branchId: string | null) {
  if (branchId) return requireStaff(tx, 'pricing.approve', branchId);
  return requireStaff(tx, 'tenant.config');
}
export function savePriceRule(tx: Tx, value: z.infer<typeof priceRuleSchema>) {
  const input = parse(priceRuleSchema, value);
  const staff = authorizeScope(tx, input.branchId);
  const tenant = activeTenant(tx.db, staff.tenantId);
  if (
    hm(input.from) >= hm(input.to) ||
    (input.validFrom && input.validTo && input.validFrom > input.validTo) ||
    input.hourlyRate < tenant.settings.floorHourlyRate
  )
    fail('GUARDRAIL');
  if (
    input.tierId &&
    (!input.branchId ||
      !branchById(tx.db, input.branchId).tiers.some(
        (t) => t.id === input.tierId,
      ))
  )
    fail('VALIDATION');
  const existing = input.id
    ? owned(tx.db.priceRules, input.id, staff.tenantId)
    : null;
  if (existing) {
    authorizeScope(tx, existing.branchId);
    if (existing.status !== 'draft') fail('VALIDATION');
  }
  const rule: PriceRule = {
    ...input,
    id: existing?.id ?? nextId(tx.db, 'price'),
    tenantId: staff.tenantId,
    status: 'draft',
    version: (existing?.version ?? 0) + 1,
  };
  if (existing) Object.assign(existing, rule);
  else tx.db.priceRules.push(rule);
  audit(tx, staffActor(staff), 'price.save', rule.id, {
    tenantId: staff.tenantId,
    branchId: rule.branchId,
  });
  return rule;
}
const specificity = (rule: PriceRule) =>
  Number(rule.branchId !== null) * 2 + Number(rule.tierId !== null);
function sharesDate(a: PriceRule, b: PriceRule) {
  const start = [
    a.validFrom ?? '0001-01-01',
    b.validFrom ?? '0001-01-01',
  ].sort()[1]!;
  const end = [a.validTo ?? '9999-12-31', b.validTo ?? '9999-12-31'].sort()[0]!;
  if (start > end) return false;
  const first = Date.parse(`${start}T00:00:00Z`),
    last = Date.parse(`${end}T00:00:00Z`);
  for (let day = first; day <= Math.min(first + 6 * DAY, last); day += DAY) {
    const dow = new Date(day).getUTCDay();
    if ((!a.days || a.days.includes(dow)) && (!b.days || b.days.includes(dow)))
      return true;
  }
  return false;
}
function conflict(a: PriceRule, b: PriceRule) {
  return (
    a.priority === b.priority &&
    specificity(a) === specificity(b) &&
    (!a.branchId || !b.branchId || a.branchId === b.branchId) &&
    (!a.tierId || !b.tierId || a.tierId === b.tierId) &&
    sharesDate(a, b) &&
    overlaps(hm(a.from), hm(a.to), hm(b.from), hm(b.to))
  );
}
export function publishPriceRule(
  tx: Tx,
  value: z.infer<typeof publishPriceSchema>,
) {
  const input = parse(publishPriceSchema, value);
  const staff = staffOf(tx);
  const rule = owned(tx.db.priceRules, input.ruleId, staff.tenantId);
  authorizeScope(tx, rule.branchId);
  if (
    rule.status !== 'draft' ||
    rule.hourlyRate <
      activeTenant(tx.db, staff.tenantId).settings.floorHourlyRate
  )
    fail('GUARDRAIL');
  const replace = input.replaceId
    ? owned(tx.db.priceRules, input.replaceId, staff.tenantId)
    : null;
  if (replace) {
    authorizeScope(tx, replace.branchId);
    if (replace.status !== 'published' || replace.id === rule.id)
      fail('VALIDATION');
  }
  if (
    tx.db.priceRules.some(
      (other) =>
        other.id !== replace?.id &&
        other.status === 'published' &&
        other.tenantId === rule.tenantId &&
        conflict(rule, other),
    )
  )
    fail('RULE_OVERLAP');
  if (replace) replace.status = 'archived';
  rule.status = 'published';
  audit(tx, staffActor(staff), 'price.publish', rule.id, {
    tenantId: staff.tenantId,
    branchId: rule.branchId,
    meta: { version: rule.version, replaces: replace?.id ?? null },
  });
  return rule;
}
export function archivePriceRule(
  tx: Tx,
  value: z.infer<typeof archivePriceSchema>,
) {
  const input = parse(archivePriceSchema, value);
  const staff = staffOf(tx);
  const rule = owned(tx.db.priceRules, input.ruleId, staff.tenantId);
  authorizeScope(tx, rule.branchId);
  rule.status = 'archived';
  audit(tx, staffActor(staff), 'price.archive', rule.id, {
    tenantId: staff.tenantId,
    branchId: rule.branchId,
  });
  return rule;
}
export function listPriceRules(tx: Tx, input: { branchId: string }) {
  const staff = requireStaff(tx, 'pricing.propose', input.branchId);
  return tx.db.priceRules.filter(
    (r) =>
      r.tenantId === staff.tenantId &&
      (r.branchId === null || r.branchId === input.branchId),
  );
}
/** One selection policy: narrower scope first, then explicit priority. */
export function seatPriceSegments(
  tx: Tx,
  branch: Branch,
  tierId: string,
  from: number,
  to: number,
): PriceSegment[] {
  const tier = must(branch.tiers.find((t) => t.id === tierId));
  if (
    !Number.isSafeInteger(from) ||
    !Number.isSafeInteger(to) ||
    to <= from ||
    to - from > DAY
  )
    fail('VALIDATION');
  const rules = tx.db.priceRules
    .filter(
      (r) =>
        r.status === 'published' &&
        r.tenantId === branch.tenantId &&
        (!r.branchId || r.branchId === branch.id) &&
        (!r.tierId || r.tierId === tierId),
    )
    .sort((a, b) => specificity(b) - specificity(a) || b.priority - a.priority);
  const boundaries = new Set([from, to]);
  const startDay = localToUtc(
    local(from, branch.utcOffsetMinutes).date,
    0,
    branch.utcOffsetMinutes,
  );
  for (let day = startDay; day <= to; day += DAY) {
    for (const point of [
      day,
      day + DAY,
      ...rules.flatMap((r) => [
        day + hm(r.from) * 60000,
        day + hm(r.to) * 60000,
      ]),
    ])
      if (point > from && point < to) boundaries.add(point);
  }
  const points = [...boundaries].sort((a, b) => a - b);
  const segments: PriceSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const begin = points[i]!,
      end = points[i + 1]!;
    const parts = local(begin, branch.utcOffsetMinutes);
    const rule = rules.find(
      (r) =>
        (!r.validFrom || r.validFrom <= parts.date) &&
        (!r.validTo || r.validTo >= parts.date) &&
        (!r.days || r.days.includes(parts.dow)) &&
        hm(r.from) <= parts.minutes &&
        hm(r.to) > parts.minutes,
    );
    const rate = rule?.hourlyRate ?? tier.baseHourlyRate;
    const last = segments.at(-1);
    if (
      last &&
      last.ruleId === (rule?.id ?? null) &&
      last.hourlyRate === rate
    ) {
      last.to = end;
      last.minutes = (end - last.from) / 60000;
    } else
      segments.push({
        from: begin,
        to: end,
        minutes: (end - begin) / 60000,
        hourlyRate: rate,
        ruleId: rule?.id ?? null,
      });
  }
  return segments;
}
