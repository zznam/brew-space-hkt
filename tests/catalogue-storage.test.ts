import { beforeEach, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: storage,
}));
beforeEach(() => {
  vi.resetModules();
  storage.getItem.mockReset();
  storage.setItem.mockReset().mockResolvedValue(undefined);
});
it('hydrates only once and serializes catalogue writes in order', async () => {
  storage.getItem.mockResolvedValue(null);
  const { catalogueStore, initializeCatalogue } =
    await import('../src/core/catalogue/useCatalogue');
  await Promise.all([initializeCatalogue(), initializeCatalogue()]);
  expect(storage.getItem).toHaveBeenCalledTimes(1);
  let finish: () => void = () => {};
  storage.setItem.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const id = catalogueStore.getState().items[0]!.id;
  catalogueStore.getState().setSoldOut('grind', id, true);
  catalogueStore.getState().setSoldOut('grind', id, false);
  await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
  finish();
  await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(2));
  expect(
    JSON.parse(storage.setItem.mock.calls[1]![1]).items.find(
      (i: { id: string }) => i.id === id,
    ).soldOut,
  ).toBe(false);
});
it('recovers malformed data and reports write failures without losing live changes', async () => {
  storage.getItem.mockResolvedValue('{broken');
  storage.setItem.mockRejectedValue(new Error('storage denied'));
  const { catalogueStore, initializeCatalogue } =
    await import('../src/core/catalogue/useCatalogue');
  await initializeCatalogue();
  expect(catalogueStore.getState().storageIssue).toBe('load');
  const id = catalogueStore.getState().items[0]!.id;
  catalogueStore.getState().setSoldOut('grind', id, true);
  await vi.waitFor(() =>
    expect(catalogueStore.getState().storageIssue).toBe('save'),
  );
  expect(
    catalogueStore.getState().items.find((i) => i.id === id)?.soldOut,
  ).toBe(true);
  storage.setItem.mockResolvedValue(undefined);
  catalogueStore.getState().setSoldOut('grind', id, false);
  await vi.waitFor(() =>
    expect(catalogueStore.getState().storageIssue).toBeNull(),
  );
});
