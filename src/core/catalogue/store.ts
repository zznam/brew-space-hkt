import { createStore } from 'zustand/vanilla';
import type { MenuItem, Venue } from '../domain';
import { venues } from '../fixtures';
import { createPilotEngine } from '../pilot/engine';
import { createPilotWorld } from '../pilot/fixtures';
import type { ItemInput } from '../pilot/catalogue';
import type { Category, Item, World } from '../pilot/types';
import { isText } from '../pilot/util';

export type CatalogueResult = { ok: true } | { ok: false; code: string };
export interface CatalogueSnapshot {
  version: 1;
  seq: number;
  categories: Category[];
  items: Item[];
}
export interface CatalogueState extends CatalogueSnapshot {
  storageIssue: 'load' | 'save' | null;
  ensureVenues: (sources: readonly Venue[]) => void;
  saveCategory: (
    venueId: string,
    input: { id?: string; name: string; sort: number },
  ) => CatalogueResult;
  saveItem: (venueId: string, input: ItemInput) => CatalogueResult;
  archiveItem: (venueId: string, itemId: string) => CatalogueResult;
  setSoldOut: (
    venueId: string,
    itemId: string,
    soldOut: boolean,
  ) => CatalogueResult;
  restore: (value: unknown) => boolean;
  reset: () => void;
}

/** Size identity and label are captured in the existing session-line ID/name.
 * Unsized fixture IDs stay compatible with saved tabs and drink preferences. */
export function catalogueMenu(
  state: Pick<CatalogueState, 'items'>,
  venue: Venue,
): MenuItem[] {
  return state.items
    .filter((i) => i.tenantId === venue.id && !i.archived && !i.soldOut)
    .flatMap((item) => {
      const legacy = venue.menu.find((m) => `${venue.id}-${m.id}` === item.id);
      const baseId = legacy?.id ?? item.id;
      if (!item.sizes.length)
        return [{ id: baseId, name: item.name, price: item.price }];
      return item.sizes.map((size) => ({
        id: `catalogue:${JSON.stringify([item.id, size.id])}${baseId.endsWith('-drink') ? '-drink' : ''}`,
        name: `${item.name} · ${size.name}`,
        price: size.price,
      }));
    });
}
export function catalogueSnapshot(state: CatalogueState): CatalogueSnapshot {
  return JSON.parse(
    JSON.stringify({
      version: 1,
      seq: state.seq,
      categories: state.categories,
      items: state.items,
    }),
  ) as CatalogueSnapshot;
}
const view = (world: World): CatalogueSnapshot => ({
  version: 1,
  seq: world.db.seq,
  categories: world.db.categories,
  items: world.db.items,
});

/** Replay validation into an isolated engine; storage never supplies credentials,
 * commands or functions. Invalid snapshots are rejected as a whole. */
function validatedSnapshot(value: unknown, base: World): World | null {
  try {
    const s = value as CatalogueSnapshot;
    if (
      !s ||
      s.version !== 1 ||
      !Number.isSafeInteger(s.seq) ||
      s.seq < 0 ||
      !Array.isArray(s.categories) ||
      !Array.isArray(s.items)
    )
      return null;
    const world = JSON.parse(JSON.stringify(base)) as World;
    const tenants = new Set(world.db.tenants.map((t) => t.id));
    const ids = new Set<string>();
    world.db.categories = s.categories.map((c) => {
      if (
        !c ||
        !isText(c.id, 200) ||
        ids.has(c.id) ||
        !tenants.has(c.tenantId) ||
        !isText(c.name, 60) ||
        !Number.isSafeInteger(c.sort) ||
        c.sort < 0
      )
        throw new Error('Invalid category');
      ids.add(c.id);
      return {
        id: c.id,
        tenantId: c.tenantId,
        name: c.name.trim(),
        sort: c.sort,
      };
    });
    const validator = createPilotEngine(world);
    const normalized: Item[] = [];
    const tokens = new Map<string, string>();
    ids.clear();
    for (const item of s.items) {
      if (
        !item ||
        !isText(item.id, 200) ||
        ids.has(item.id) ||
        !tenants.has(item.tenantId) ||
        typeof item.soldOut !== 'boolean' ||
        typeof item.archived !== 'boolean'
      )
        return null;
      ids.add(item.id);
      if (!tokens.has(item.tenantId)) {
        const login = validator.execute('staffSignIn', {
          email: `manager@${item.tenantId}.demo.test`,
          password: 'demo-password',
        });
        if (!login.ok) return null;
        tokens.set(item.tenantId, login.data.token);
      }
      const saved = validator.execute(
        'saveItem',
        { ...item, id: undefined },
        { staffToken: tokens.get(item.tenantId) },
      );
      if (!saved.ok) return null;
      normalized.push({
        ...saved.data,
        id: item.id,
        soldOut: item.soldOut,
        archived: item.archived,
      });
    }
    world.db.items = normalized;
    const sequenceIds = [...world.db.categories, ...normalized]
      .map((row) => /^(?:cat|itm)_([0-9a-z]+)$/.exec(row.id)?.[1])
      .filter((id): id is string => Boolean(id))
      .map((id) => parseInt(id, 36));
    if (
      sequenceIds.some(
        (n) => !Number.isSafeInteger(n) || n >= Number.MAX_SAFE_INTEGER,
      )
    )
      return null;
    world.db.seq = Math.max(s.seq, validator.snapshot().db.seq, ...sequenceIds);
    return world;
  } catch {
    return null;
  }
}

export function createCatalogueStore(sources: readonly Venue[] = venues) {
  let allSources = [...sources];
  let engine = createPilotEngine(
    createPilotWorld(undefined, undefined, sources),
  );
  const tokens = new Map<string, string>();
  const signIn = (venueId: string) => {
    const login = engine.execute('staffSignIn', {
      email: `manager@${venueId}.demo.test`,
      password: 'demo-password',
    });
    if (login.ok) {
      tokens.set(venueId, login.data.token);
      return login.data.token;
    }
    return undefined;
  };
  return createStore<CatalogueState>()((set) => {
    function run(
      venueId: string,
      command: 'saveCategory' | 'saveItem' | 'archiveItem' | 'setSoldOut',
      input: unknown,
    ): CatalogueResult {
      const staffToken = tokens.get(venueId) ?? signIn(venueId);
      // Each wrapper fixes the command/input pair; the engine validates runtime inputs.
      let result = engine.execute(command, input as never, { staffToken });
      if (!result.ok && result.error.code === 'UNAUTHENTICATED') {
        result = engine.execute(command, input as never, {
          staffToken: signIn(venueId),
        });
      }
      if (!result.ok) return { ok: false, code: result.error.code };
      set(view(engine.snapshot()));
      return { ok: true };
    }
    return {
      ...view(engine.snapshot()),
      storageIssue: null,
      saveCategory: (venueId, input) => run(venueId, 'saveCategory', input),
      saveItem: (venueId, input) => run(venueId, 'saveItem', input),
      archiveItem: (venueId, itemId) => run(venueId, 'archiveItem', { itemId }),
      setSoldOut: (venueId, itemId, soldOut) =>
        run(venueId, 'setSoldOut', { itemId, soldOut }),
      ensureVenues: (next) => {
        const missing = next.filter(
          (v) => !allSources.some((s) => s.id === v.id),
        );
        if (!missing.length) return;
        allSources = [...allSources, ...missing];
        const world = engine.snapshot();
        const additions = createPilotWorld(undefined, undefined, missing).db;
        world.db.tenants.push(...additions.tenants);
        world.db.branches.push(...additions.branches);
        world.db.staff.push(...additions.staff);
        world.db.categories.push(...additions.categories);
        world.db.items.push(...additions.items);
        world.db.layouts.push(...additions.layouts);
        world.db.qr.push(...additions.qr);
        engine = createPilotEngine(world);
        tokens.clear();
        set(view(engine.snapshot()));
      },
      restore: (value) => {
        const world = validatedSnapshot(
          value,
          createPilotWorld(undefined, undefined, allSources),
        );
        if (!world) {
          set({ storageIssue: 'load' });
          return false;
        }
        engine = createPilotEngine(world);
        tokens.clear();
        set({ ...view(world), storageIssue: null });
        return true;
      },
      reset: () => {
        allSources = [...sources];
        engine = createPilotEngine(
          createPilotWorld(undefined, undefined, allSources),
        );
        tokens.clear();
        set({ ...view(engine.snapshot()), storageIssue: null });
      },
    };
  });
}

/** Read-only menu adapter for the isolated POS mock; no order state is shared. */
export function posCatalogueMenu(
  state: Pick<CatalogueState, 'items'>,
  venue: Venue,
) {
  return state.items
    .filter((i) => i.tenantId === venue.id && !i.archived)
    .flatMap((item) =>
      catalogueMenu({ items: [{ ...item, soldOut: false }] }, venue).map(
        (m) => ({ ...m, soldOut: item.soldOut }),
      ),
    );
}
export function catalogueItemForMenuId(
  state: Pick<CatalogueState, 'items'>,
  venue: Venue,
  id: string,
): Item | undefined {
  return state.items.find(
    (i) =>
      i.tenantId === venue.id &&
      catalogueMenu(
        { items: [{ ...i, soldOut: false, archived: false }] },
        venue,
      ).some((m) => m.id === id),
  );
}
