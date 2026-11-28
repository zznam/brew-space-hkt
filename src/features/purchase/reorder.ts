/** F120: rebuild a cart from a previous order against today's menu. */
export type ReorderLine = {
  itemId: string;
  quantity: number;
  sizeId?: string;
  modifiers?: { groupId: string; optionId: string }[];
  note?: string;
};

type PastLine = {
  kind: string;
  name: string;
  quantity: number;
  itemId?: string;
  sizeId?: string;
  modifiers?: { groupId: string; optionId: string }[];
  note?: string;
};

type MenuItemLike = {
  id: string;
  sizes: { id: string }[];
  modifierGroups: { id: string; options: { id: string }[] }[];
};

/**
 * Lines are re-quoted later, so prices are always current. Items no longer on the menu (sold
 * out or archived) or whose size is gone are skipped and named so the customer can be told;
 * a removed modifier option is dropped from its line.
 */
export function rebuildCart(
  lines: readonly PastLine[],
  menu: readonly MenuItemLike[],
): { lines: ReorderLine[]; skipped: string[] } {
  const rebuilt: ReorderLine[] = [];
  const skipped: string[] = [];
  for (const line of lines) {
    if (line.kind !== 'item' || !line.itemId) continue;
    const item = menu.find((candidate) => candidate.id === line.itemId);
    if (
      !item ||
      (line.sizeId && !item.sizes.some((size) => size.id === line.sizeId))
    ) {
      skipped.push(line.name);
      continue;
    }
    const modifiers = (line.modifiers ?? [])
      .filter((m) =>
        item.modifierGroups.some(
          (g) =>
            g.id === m.groupId && g.options.some((o) => o.id === m.optionId),
        ),
      )
      .map(({ groupId, optionId }) => ({ groupId, optionId }));
    rebuilt.push({
      itemId: item.id,
      quantity: Math.min(99, Math.max(1, Math.floor(line.quantity))),
      ...(line.sizeId ? { sizeId: line.sizeId } : {}),
      ...(modifiers.length ? { modifiers } : {}),
      ...(line.note ? { note: line.note.slice(0, 200) } : {}),
    });
  }
  return { lines: rebuilt.slice(0, 50), skipped };
}
