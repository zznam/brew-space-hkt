import {
  audit,
  owned,
  platformOf,
  requireStaff,
  staffActor,
  staffOf,
  tenantById,
} from './access';
import { fail, must } from './errors';
import type {
  AssetDef,
  Db,
  Layout,
  LayoutDoc,
  Placement,
  SeatDef,
  Tx,
} from './types';
import { isText, nextId, shortCode } from './util';

/** Budget for the shared library; a tenant's own library uses its settings (F165). */
export const SHARED_ASSET_BUDGET = {
  maxBytes: 2_000_000,
  maxTriangles: 60_000,
};
const OPEN_BOOKING = ['held', 'confirmed', 'checked_in'];

export const layoutOf = (db: Db, branchId: string): Layout =>
  must(db.layouts.find((layout) => layout.branchId === branchId));
export const publishedSeats = (db: Db, branchId: string): SeatDef[] =>
  db.layouts.find((layout) => layout.branchId === branchId)?.published?.seats ??
  [];
export function seatOf(db: Db, branchId: string, seatId: string): SeatDef {
  return must(
    publishedSeats(db, branchId).find((seat) => seat.id === seatId),
    'NOT_FOUND',
    'That seat is not on the published layout.',
  );
}
const usableAssets = (db: Db, tenantId: string) =>
  db.assets.filter(
    (asset) =>
      asset.approved &&
      (asset.tenantId === null || asset.tenantId === tenantId),
  );

// ── Pure editor operations (F047, F048). The editor UI and the tests share them. ──

export const snap = (value: number, grid: number) =>
  Math.round(value / grid) * grid;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
/** Footprint after rotation: a quarter turn swaps width and depth. */
export function footprint(
  asset: Pick<AssetDef, 'width' | 'depth'>,
  rotation: number,
) {
  const turned = Math.abs(rotation / 90) % 2 === 1;
  return turned
    ? { width: asset.depth, depth: asset.width }
    : { width: asset.width, depth: asset.depth };
}
export function isOnFloor(
  floor: Layout['floor'],
  asset: Pick<AssetDef, 'width' | 'depth'>,
  placement: Pick<Placement, 'x' | 'z' | 'rotation'>,
) {
  const size = footprint(asset, placement.rotation);
  return (
    placement.x - size.width / 2 >= 0 &&
    placement.z - size.depth / 2 >= 0 &&
    placement.x + size.width / 2 <= floor.width &&
    placement.z + size.depth / 2 <= floor.depth
  );
}
export function placeAsset(
  doc: LayoutDoc,
  floor: Layout['floor'],
  assetId: string,
  at: { id: string; x: number; z: number },
): LayoutDoc {
  const next = clone(doc);
  next.placements.push({
    id: at.id,
    assetId,
    x: snap(at.x, floor.grid),
    z: snap(at.z, floor.grid),
    rotation: 0,
  });
  return next;
}
/** Moving an asset never touches its seats, so seat IDs and bookings survive (F039). */
export function moveAsset(
  doc: LayoutDoc,
  floor: Layout['floor'],
  placementId: string,
  x: number,
  z: number,
): LayoutDoc {
  const next = clone(doc);
  const placement = next.placements.find((row) => row.id === placementId);
  if (placement) {
    placement.x = snap(x, floor.grid);
    placement.z = snap(z, floor.grid);
  }
  return next;
}
export function rotateAsset(doc: LayoutDoc, placementId: string): LayoutDoc {
  const next = clone(doc);
  const placement = next.placements.find((row) => row.id === placementId);
  if (placement) placement.rotation = (placement.rotation + 90) % 360;
  return next;
}
export function removeAsset(doc: LayoutDoc, placementId: string): LayoutDoc {
  const next = clone(doc);
  next.placements = next.placements.filter((row) => row.id !== placementId);
  next.seats = next.seats.filter((seat) => seat.placementId !== placementId);
  return next;
}
export function bindSeat(doc: LayoutDoc, seat: SeatDef): LayoutDoc {
  const next = clone(doc);
  next.seats = [...next.seats.filter((row) => row.id !== seat.id), { ...seat }];
  return next;
}
export function unbindSeat(doc: LayoutDoc, seatId: string): LayoutDoc {
  const next = clone(doc);
  next.seats = next.seats.filter((seat) => seat.id !== seatId);
  return next;
}
/** Next free label in a zone, e.g. `W3` after `W1` and `W2` (F268). */
export function nextSeatLabel(doc: LayoutDoc, zoneId: string): string {
  const zone = doc.zones.find((row) => row.id === zoneId);
  const prefix = (zone?.name ?? 'S').trim().charAt(0).toUpperCase() || 'S';
  const used = new Set(doc.seats.map((seat) => seat.label));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** Where a seat sits: its asset's position, spread along the asset's width. */
export function seatPosition(
  doc: LayoutDoc,
  assets: AssetDef[],
  seat: SeatDef,
) {
  const placement = doc.placements.find((row) => row.id === seat.placementId);
  if (!placement) return { x: 0, z: 0 };
  const asset = assets.find((row) => row.id === placement.assetId);
  const siblings = doc.seats.filter((row) => row.placementId === placement.id);
  const index = siblings.findIndex((row) => row.id === seat.id);
  const size = footprint(asset ?? { width: 1, depth: 1 }, placement.rotation);
  const step = size.width / (siblings.length + 1);
  return {
    x: placement.x - size.width / 2 + step * (index + 1),
    z: placement.z,
  };
}

/** Two placed assets whose footprints overlap (F267). Shared edges are not an overlap. */
export interface LayoutOverlap {
  placementIds: [string, string];
}

/**
 * Overlapping placements, as warnings: they never block saving or publishing (F267).
 * Unknown assets are skipped here because layoutProblems already reports them.
 */
export function layoutOverlaps(
  doc: Pick<LayoutDoc, 'placements'>,
  assets: readonly Pick<AssetDef, 'id' | 'width' | 'depth'>[],
): LayoutOverlap[] {
  const boxes = doc.placements.flatMap((placement) => {
    const asset = assets.find((row) => row.id === placement.assetId);
    if (!asset) return [];
    const size = footprint(asset, placement.rotation);
    return [
      {
        id: placement.id,
        left: placement.x - size.width / 2,
        right: placement.x + size.width / 2,
        top: placement.z - size.depth / 2,
        bottom: placement.z + size.depth / 2,
      },
    ];
  });
  const overlaps: LayoutOverlap[] = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (
        a.left < b.right &&
        b.left < a.right &&
        a.top < b.bottom &&
        b.top < a.bottom
      )
        overlaps.push({ placementIds: [a.id, b.id] });
    }
  return overlaps;
}

// ── Validation and publishing ───────────────────────────────────────────────

export interface LayoutProblem {
  code:
    | 'DUPLICATE_SEAT_ID'
    | 'DUPLICATE_PLACEMENT_ID'
    | 'OFF_FLOOR'
    | 'UNKNOWN_ASSET'
    | 'SEAT_WITHOUT_ASSET'
    | 'TOO_MANY_SEATS'
    | 'UNKNOWN_ZONE'
    | 'SEAT_HAS_BOOKINGS';
  ref: string;
}
export function layoutProblems(
  db: Db,
  layout: Layout,
  doc: LayoutDoc,
): LayoutProblem[] {
  const problems: LayoutProblem[] = [];
  const assets = usableAssets(db, layout.tenantId);
  const branch = must(db.branches.find((row) => row.id === layout.branchId));
  const seen = new Set<string>();
  for (const seat of doc.seats) {
    if (seen.has(seat.id))
      problems.push({ code: 'DUPLICATE_SEAT_ID', ref: seat.id });
    seen.add(seat.id);
    const zone = doc.zones.find((row) => row.id === seat.zoneId);
    if (!zone || !branch.tiers.some((tier) => tier.id === seat.tierId))
      problems.push({ code: 'UNKNOWN_ZONE', ref: seat.id });
    if (!doc.placements.some((row) => row.id === seat.placementId))
      problems.push({ code: 'SEAT_WITHOUT_ASSET', ref: seat.id });
  }
  const placementIds = new Set<string>();
  for (const placement of doc.placements) {
    if (placementIds.has(placement.id))
      problems.push({ code: 'DUPLICATE_PLACEMENT_ID', ref: placement.id });
    placementIds.add(placement.id);
    const asset = assets.find((row) => row.id === placement.assetId);
    if (!asset) {
      problems.push({ code: 'UNKNOWN_ASSET', ref: placement.id });
      continue;
    }
    if (!isOnFloor(layout.floor, asset, placement))
      problems.push({ code: 'OFF_FLOOR', ref: placement.id });
    const bound = doc.seats.filter((seat) => seat.placementId === placement.id);
    if (bound.length > asset.seatSlots)
      problems.push({ code: 'TOO_MANY_SEATS', ref: placement.id });
  }
  for (const reservation of db.reservations)
    if (
      reservation.branchId === layout.branchId &&
      OPEN_BOOKING.includes(reservation.status) &&
      !seen.has(reservation.seatId)
    )
      problems.push({ code: 'SEAT_HAS_BOOKINGS', ref: reservation.seatId });
  return problems;
}

function checkDocShape(
  doc: unknown,
): asserts doc is Pick<LayoutDoc, 'placements' | 'seats' | 'zones'> {
  const value = doc as LayoutDoc;
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  const ok =
    value &&
    Array.isArray(value.placements) &&
    Array.isArray(value.seats) &&
    Array.isArray(value.zones) &&
    value.placements.every(
      (p) =>
        p &&
        isText(p.id, 60) &&
        isText(p.assetId, 60) &&
        finite(p.x) &&
        finite(p.z) &&
        Number.isInteger(p.rotation) &&
        p.rotation % 90 === 0,
    ) &&
    value.seats.every(
      (s) =>
        s &&
        isText(s.id, 60) &&
        isText(s.label, 20) &&
        !/[<>]/.test(s.label) &&
        isText(s.zoneId, 60) &&
        isText(s.tierId, 60) &&
        isText(s.placementId, 60) &&
        Array.isArray(s.amenities) &&
        s.amenities.every((a) => isText(a, 30)),
    ) &&
    value.zones.every(
      (z) =>
        z && isText(z.id, 60) && isText(z.name, 40) && isText(z.tierId, 60),
    );
  if (!ok) fail('VALIDATION', 'The layout is not in the expected shape.');
}

export function getLayout(tx: Tx, input: { branchId: string }) {
  const staff = requireStaff(tx, 'layout.edit', input.branchId);
  const layout = layoutOf(tx.db, input.branchId);
  return {
    floor: layout.floor,
    draft: layout.draft,
    publishedVersion: layout.published?.version ?? null,
    history: layout.history.map((doc) => ({
      version: doc.version,
      updatedAt: doc.updatedAt,
      seats: doc.seats.length,
    })),
    problems: layoutProblems(tx.db, layout, layout.draft),
    warnings: layoutOverlaps(layout.draft, usableAssets(tx.db, staff.tenantId)),
    assets: usableAssets(tx.db, staff.tenantId),
  };
}
/** The second of two managers saving the same draft gets a conflict (F050). */
export function saveLayoutDraft(
  tx: Tx,
  input: { branchId: string; baseVersion: number; doc: unknown },
) {
  const staff = requireStaff(tx, 'layout.edit', input.branchId);
  const layout = layoutOf(tx.db, input.branchId);
  if (layout.draft.version !== input.baseVersion)
    fail(
      'VERSION_CONFLICT',
      'Someone else saved this layout. Reload it first.',
      {
        currentVersion: layout.draft.version,
      },
    );
  checkDocShape(input.doc);
  const assets = usableAssets(tx.db, staff.tenantId);
  for (const placement of input.doc.placements)
    if (!assets.some((asset) => asset.id === placement.assetId))
      fail('ASSET_REJECTED', 'Only approved library assets can be placed.');
  layout.draft = {
    version: layout.draft.version + 1,
    placements: input.doc.placements.map((p) => ({
      id: p.id,
      assetId: p.assetId,
      x: snap(p.x, layout.floor.grid),
      z: snap(p.z, layout.floor.grid),
      rotation: ((p.rotation % 360) + 360) % 360,
    })),
    seats: input.doc.seats.map((s) => ({
      id: s.id,
      label: s.label.trim(),
      zoneId: s.zoneId,
      tierId: s.tierId,
      amenities: [...s.amenities],
      placementId: s.placementId,
    })),
    zones: input.doc.zones.map((z) => ({
      id: z.id,
      name: z.name.trim(),
      tierId: z.tierId,
    })),
    updatedBy: staff.id,
    updatedAt: tx.now,
  };
  return {
    version: layout.draft.version,
    problems: layoutProblems(tx.db, layout, layout.draft),
    warnings: layoutOverlaps(layout.draft, assets),
  };
}

function changeCount(from: LayoutDoc | null, to: LayoutDoc): number {
  if (!from) return to.placements.length + to.seats.length;
  const key = (doc: LayoutDoc) =>
    new Map<string, string>([
      ...doc.placements.map((p): [string, string] => [
        `p:${p.id}`,
        JSON.stringify(p),
      ]),
      ...doc.seats.map((s): [string, string] => [
        `s:${s.id}`,
        JSON.stringify(s),
      ]),
    ]);
  const [a, b] = [key(from), key(to)];
  let changes = 0;
  for (const [id, value] of b) if (a.get(id) !== value) changes += 1;
  for (const id of a.keys()) if (!b.has(id)) changes += 1;
  return changes;
}
function syncQr(db: Db, layout: Layout) {
  const seats = layout.published?.seats ?? [];
  db.qr = db.qr.filter(
    (row) =>
      row.branchId !== layout.branchId ||
      seats.some((seat) => seat.id === row.seatId),
  );
  for (const seat of seats)
    if (
      !db.qr.some(
        (row) => row.branchId === layout.branchId && row.seatId === seat.id,
      )
    )
      db.qr.push({
        code: shortCode(db, 12),
        tenantId: layout.tenantId,
        branchId: layout.branchId,
        seatId: seat.id,
      });
}
function publishDoc(tx: Tx, layout: Layout, doc: LayoutDoc, staffId: string) {
  const problems = layoutProblems(tx.db, layout, doc);
  if (problems.length > 0)
    fail('LAYOUT_INVALID', 'Fix the layout before publishing.', { problems });
  const tenant = tenantById(tx.db, layout.tenantId);
  const changes = changeCount(layout.published, doc);
  let backupId: string | null = null;
  if (changes >= tenant.settings.largePublishChanges) {
    // A large publish takes a backup of the state before it (F298).
    backupId = nextId(tx.db, 'bak');
    tx.backups.push({
      id: backupId,
      at: tx.now,
      reason: 'layout.publish',
      snapshot: JSON.stringify(tx.db),
    });
  }
  layout.published = { ...clone(doc), updatedBy: staffId, updatedAt: tx.now };
  layout.history.push(clone(layout.published));
  syncQr(tx.db, layout);
  return { version: layout.published.version, changes, backupId };
}
export function publishLayout(
  tx: Tx,
  input: { branchId: string; baseVersion: number },
) {
  const staff = requireStaff(tx, 'layout.edit', input.branchId);
  const layout = layoutOf(tx.db, input.branchId);
  if (layout.draft.version !== input.baseVersion)
    fail(
      'VERSION_CONFLICT',
      'Someone else saved this layout. Reload it first.',
      {
        currentVersion: layout.draft.version,
      },
    );
  const result = publishDoc(tx, layout, layout.draft, staff.id);
  audit(tx, staffActor(staff), 'layout.publish', layout.branchId, {
    tenantId: layout.tenantId,
    branchId: layout.branchId,
    meta: { version: result.version, changes: result.changes },
  });
  return result;
}
/** Republishes an earlier version through the same validation (F170). */
export function rollbackLayout(
  tx: Tx,
  input: { branchId: string; version: number },
) {
  const staff = requireStaff(tx, 'layout.edit', input.branchId);
  const layout = layoutOf(tx.db, input.branchId);
  const old = must(layout.history.find((doc) => doc.version === input.version));
  const doc = { ...clone(old), version: layout.draft.version + 1 };
  const result = publishDoc(tx, layout, doc, staff.id);
  layout.draft = clone(must(layout.published));
  audit(tx, staffActor(staff), 'layout.rollback', layout.branchId, {
    tenantId: layout.tenantId,
    branchId: layout.branchId,
    meta: { version: result.version, from: input.version },
  });
  return result;
}

/** What anyone may see of a floor: geometry and seats, never occupants (F045). */
export function publicLayout(tx: Tx, input: { branchId: string }) {
  const layout = layoutOf(tx.db, input.branchId);
  const doc = layout.published;
  if (!doc)
    return {
      floor: layout.floor,
      version: null,
      placements: [],
      seats: [],
      zones: [],
    };
  const assets = tx.db.assets;
  return {
    floor: layout.floor,
    version: doc.version,
    zones: doc.zones,
    placements: doc.placements.map((placement) => {
      const asset = assets.find((row) => row.id === placement.assetId);
      return {
        ...placement,
        kind: asset?.kind ?? 'decor',
        ...footprint(asset ?? { width: 1, depth: 1 }, placement.rotation),
      };
    }),
    seats: doc.seats.map((seat) => ({
      ...seat,
      zoneName: doc.zones.find((zone) => zone.id === seat.zoneId)?.name ?? '',
      ...seatPosition(doc, assets, seat),
    })),
  };
}

// ── Asset library ───────────────────────────────────────────────────────────

/** Only a platform admin adds to the library; venues cannot upload (F046). An
 * asset over the size or triangle budget is refused (F165). */
export function approveAsset(
  tx: Tx,
  input: Omit<AssetDef, 'id' | 'approved' | 'version'>,
) {
  platformOf(tx);
  const budget =
    input.tenantId === null
      ? SHARED_ASSET_BUDGET
      : tenantById(tx.db, input.tenantId).settings.assetBudget;
  if (
    !isText(input.name, 60) ||
    !['table', 'desk', 'booth', 'pod', 'decor'].includes(input.kind) ||
    !(input.width > 0 && input.depth > 0) ||
    !Number.isInteger(input.seatSlots) ||
    input.seatSlots < 0
  )
    fail('VALIDATION', 'The asset description is incomplete.');
  if (
    input.sizeBytes > budget.maxBytes ||
    input.triangles > budget.maxTriangles
  )
    fail(
      'ASSET_REJECTED',
      'The asset is over the size or triangle budget.',
      budget,
    );
  const asset: AssetDef = {
    ...input,
    id: nextId(tx.db, 'ast'),
    approved: true,
    version: 1,
  };
  tx.db.assets.push(asset);
  return asset;
}
/** A tenant's private asset is refused for another tenant and for a caller
 * with no session (F296). */
export function getAsset(tx: Tx, input: { assetId: string }) {
  const staff = staffOf(tx);
  const asset = must(
    tx.db.assets.find(
      (row) =>
        row.id === input.assetId &&
        (row.tenantId === null || row.tenantId === staff.tenantId),
    ),
  );
  return {
    ...asset,
    url: `asset://${asset.tenantId ?? 'shared'}/${asset.id}?v=${asset.version}`,
  };
}

// ── Seat QR codes ───────────────────────────────────────────────────────────

/** A QR only locates a venue and seat. It is not a credential (F067). */
export function resolveQr(tx: Tx, input: { code: string }) {
  const row = must(tx.db.qr.find((entry) => entry.code === input.code));
  const branch = must(tx.db.branches.find((b) => b.id === row.branchId));
  const seat = seatOf(tx.db, row.branchId, row.seatId);
  return {
    branchId: branch.id,
    slug: branch.slug,
    venueName: tenantById(tx.db, row.tenantId).brand.displayName,
    seatId: seat.id,
    seatLabel: seat.label,
  };
}
export function qrSheet(tx: Tx, input: { branchId: string }) {
  requireStaff(tx, 'layout.edit', input.branchId);
  const branch = owned(tx.db.branches, input.branchId, staffOf(tx).tenantId);
  return publishedSeats(tx.db, input.branchId).map((seat) => {
    const code = must(
      tx.db.qr.find(
        (row) => row.branchId === input.branchId && row.seatId === seat.id,
      ),
    ).code;
    return {
      seatId: seat.id,
      label: seat.label,
      code,
      path: `/v/${branch.slug}?qr=${code}`,
    };
  });
}
/** Regenerating a code makes the old one stop resolving (F164). */
export function rotateQr(tx: Tx, input: { branchId: string; seatId: string }) {
  const staff = requireStaff(tx, 'layout.edit', input.branchId);
  const row = must(
    tx.db.qr.find(
      (entry) =>
        entry.branchId === input.branchId && entry.seatId === input.seatId,
    ),
  );
  row.code = shortCode(tx.db, 12);
  audit(tx, staffActor(staff), 'qr.rotate', input.seatId, {
    tenantId: staff.tenantId,
    branchId: input.branchId,
  });
  return { seatId: input.seatId, code: row.code };
}
export { syncQr };
