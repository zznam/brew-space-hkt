/** Lower-case, accent-free text so "cà phê" matches "ca phe" and "Đá" matches "da". */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

/**
 * F116: with a query, matching items from every category (the category filter is ignored);
 * without one, the selected category as before. Every query word must appear in the name.
 */
export function visibleMenuItems<
  T extends { name: string; categoryId: string },
>(items: readonly T[], category: string | null, query: string): T[] {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (!words.length)
    return items.filter(
      (item) => category === null || item.categoryId === category,
    );
  return items.filter((item) => {
    const name = foldText(item.name);
    return words.every((word) => name.includes(word));
  });
}
