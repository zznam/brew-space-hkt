import { z } from 'zod';
import {
  audit,
  owned,
  platformOf,
  requireStaff,
  staffActor,
  validateBrand,
} from './access';
import { hashPassword } from './credentials';
import { fail, must } from './errors';
import { defaultTenantSettings } from './fixtures';
import { syncQr } from './layout';
import type { Branch, LayoutDoc, Tx } from './types';
import { nextId } from './util';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const text = z.string().trim().min(1).max(100);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const hours = z
  .array(
    z
      .object({ open: time, close: z.union([time, z.literal('24:00')]) })
      .strict()
      .refine((value) => value.open < value.close)
      .nullable(),
  )
  .length(7);
export const branchFields = z
  .object({
    name: text,
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    address: z.string().trim().max(300),
    // Pilot is Vietnam-only. Reject zones the booking clock cannot yet support.
    timezone: z.literal('Asia/Ho_Chi_Minh'),
    hours,
  })
  .strict();
export const createTenantSchema = z
  .object({
    name: text,
    currency: z.literal('VND'),
    branch: branchFields,
    owner: z
      .object({
        name: text,
        email: z.email().max(254),
        password: z.string().min(12).max(100),
      })
      .strict(),
    brand: z.unknown().optional(),
    templateBranchId: z.string().min(1).max(100).optional(),
    isTemplate: z.boolean().optional(),
  })
  .strict();
export const createBranchSchema = branchFields;
export const updateBranchSchema = branchFields.extend({
  branchId: z.string().min(1).max(100),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    fail('VALIDATION', 'Check venue, hours and owner details.');
  return parsed.data;
}
function uniqueSlug(tx: Tx, slug: string, except?: string) {
  if (tx.db.branches.some((b) => b.slug === slug && b.id !== except))
    fail('VALIDATION', 'That venue address is already in use.');
}
function addBranch(
  tx: Tx,
  tenantId: string,
  input: z.infer<typeof branchFields>,
  template?: Branch,
): Branch {
  uniqueSlug(tx, input.slug);
  const branch: Branch = {
    id: nextId(tx.db, 'brn'),
    tenantId,
    ...input,
    utcOffsetMinutes: 420,
    closures: [],
    bufferMinutes: 10,
    checkInWindowMinutes: 15,
    policy: { version: 1, text: 'Prepaid seat time. Ask staff for help.' },
    tiers: (
      template?.tiers ?? [
        { id: 'standard', name: 'Standard', baseHourlyRate: 40000 },
      ]
    ).map((tier) => ({ ...tier, id: nextId(tx.db, 'tier') })),
  };
  tx.db.branches.push(branch);
  const source = template
    ? tx.db.layouts.find((l) => l.branchId === template.id)
    : undefined;
  const doc: LayoutDoc = source?.published
    ? copy(source.published)
    : {
        version: 1,
        placements: [],
        seats: [],
        zones: [],
        updatedAt: tx.now,
        updatedBy: null,
      };
  const tierMap = new Map(
    template?.tiers.map((tier, i) => [tier.id, branch.tiers[i]!.id]),
  );
  const placements = new Map(
    doc.placements.map((p) => [p.id, nextId(tx.db, 'plc')]),
  );
  const zones = new Map(
    doc.zones.map((zone) => [zone.id, nextId(tx.db, 'zone')]),
  );
  const assetMap = new Map<string, string>();
  for (const placement of doc.placements) {
    const asset = must(
      tx.db.assets.find(
        (a) =>
          a.id === placement.assetId &&
          (a.tenantId === null || a.tenantId === template?.tenantId),
      ),
    );
    if (asset.tenantId !== null && !assetMap.has(asset.id)) {
      const cloned = { ...asset, id: nextId(tx.db, 'asset'), tenantId };
      tx.db.assets.push(cloned);
      assetMap.set(asset.id, cloned.id);
    }
    placement.id = placements.get(placement.id)!;
    placement.assetId = assetMap.get(placement.assetId) ?? placement.assetId;
  }
  doc.zones = doc.zones.map((zone) => ({
    ...zone,
    id: zones.get(zone.id)!,
    tierId: tierMap.get(zone.tierId)!,
  }));
  doc.seats = doc.seats.map((seat) => ({
    ...seat,
    id: nextId(tx.db, 'seat'),
    placementId: placements.get(seat.placementId)!,
    zoneId: zones.get(seat.zoneId)!,
    tierId: tierMap.get(seat.tierId)!,
  }));
  doc.version = 1;
  doc.updatedAt = tx.now;
  doc.updatedBy = null;
  const layout = {
    tenantId,
    branchId: branch.id,
    floor: source ? { ...source.floor } : { width: 10, depth: 10, grid: 0.5 },
    draft: copy(doc),
    published: copy(doc),
    history: [copy(doc)],
  };
  tx.db.layouts.push(layout);
  syncQr(tx.db, layout);
  return branch;
}

/** Creates only configuration: no staff credentials, bookings or money are copied. */
export function createTenant(
  tx: Tx,
  value: z.infer<typeof createTenantSchema>,
) {
  const admin = platformOf(tx);
  const input = parse(createTenantSchema, value);
  const email = input.owner.email.trim().toLowerCase();
  if (tx.db.staff.some((s) => s.email === email))
    fail('VALIDATION', 'That email is already in use.');
  const template = input.templateBranchId
    ? must(
        tx.db.branches.find(
          (b) =>
            b.id === input.templateBranchId &&
            tx.db.tenants.some(
              (t) =>
                t.id === b.tenantId && t.isTemplate && t.status === 'active',
            ),
        ),
      )
    : undefined;
  const source = template
    ? must(tx.db.tenants.find((t) => t.id === template.tenantId))
    : undefined;
  const tenant = {
    id: nextId(tx.db, 'tnt'),
    name: input.name,
    currency: input.currency,
    status: 'active' as const,
    isTemplate: input.isTemplate ?? false,
    createdAt: tx.now,
    brand: validateBrand(
      input.brand ?? {
        displayName: input.name,
        logoUrl: null,
        primary: '#245c45',
        background: '#ffffff',
        text: '#111111',
      },
    ),
    settings: source ? copy(source.settings) : defaultTenantSettings(),
  };
  // Budgets and consumption are operational data, not template configuration.
  tenant.settings.aiSpent = 0;
  tx.db.tenants.push(tenant);
  const branch = addBranch(tx, tenant.id, input.branch, template);
  if (source) {
    const categories = new Map<string, string>();
    for (const category of tx.db.categories.filter(
      (c) => c.tenantId === source.id,
    )) {
      const clone = {
        ...category,
        id: nextId(tx.db, 'cat'),
        tenantId: tenant.id,
      };
      categories.set(category.id, clone.id);
      tx.db.categories.push(clone);
    }
    for (const item of tx.db.items.filter(
      (i) => i.tenantId === source.id && !i.archived,
    ))
      tx.db.items.push({
        ...copy(item),
        id: nextId(tx.db, 'itm'),
        tenantId: tenant.id,
        categoryId: must(categories.get(item.categoryId)),
        soldOut: false,
      });
  }
  const owner = {
    id: nextId(tx.db, 'stf'),
    tenantId: tenant.id,
    name: input.owner.name,
    email,
    passwordHash: hashPassword(tx, email, input.owner.password),
    role: 'owner' as const,
    branchIds: [branch.id],
    status: 'active' as const,
    epoch: 1,
  };
  tx.db.staff.push(owner);
  audit(tx, { kind: 'platform', id: admin.id }, 'tenant.create', tenant.id, {
    tenantId: tenant.id,
    meta: { templateBranchId: template?.id ?? '' },
  });
  return {
    tenant,
    branch,
    owner: { id: owner.id, name: owner.name, email, role: owner.role },
  };
}

export function createBranch(
  tx: Tx,
  value: z.infer<typeof createBranchSchema>,
) {
  const owner = requireStaff(tx, 'tenant.config');
  const branch = addBranch(
    tx,
    owner.tenantId,
    parse(createBranchSchema, value),
  );
  audit(tx, staffActor(owner), 'branch.create', branch.id, {
    tenantId: owner.tenantId,
    branchId: branch.id,
  });
  return branch;
}
export function updateBranch(
  tx: Tx,
  value: z.infer<typeof updateBranchSchema>,
) {
  const owner = requireStaff(tx, 'tenant.config');
  const input = parse(updateBranchSchema, value);
  const branch = owned(tx.db.branches, input.branchId, owner.tenantId);
  uniqueSlug(tx, input.slug, branch.id);
  const { branchId: _id, ...fields } = input;
  Object.assign(branch, fields);
  audit(tx, staffActor(owner), 'branch.update', branch.id, {
    tenantId: owner.tenantId,
    branchId: branch.id,
  });
  return branch;
}
