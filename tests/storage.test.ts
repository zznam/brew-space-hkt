import { beforeEach, expect, it, vi } from 'vitest';
import { initialState } from '../src/core/fixtures';
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
  storage.setItem.mockClear();
});
it('restores data without overwriting store actions from storage', async () => {
  storage.getItem.mockResolvedValue(
    JSON.stringify({
      ...initialState(),
      role: 'customer',
      reset: 'corrupt method',
    }),
  );
  const { appStore, initializeStore } = await import('../src/core/useAppStore');
  expect(await initializeStore()).toBeNull();
  expect(appStore.getState().role).toBe('customer');
  expect(typeof appStore.getState().reset).toBe('function');
});
it('recovers from malformed JSON and subscribes only once', async () => {
  storage.getItem.mockResolvedValue('{broken');
  const { appStore, initializeStore } = await import('../src/core/useAppStore');
  expect(await initializeStore()).toContain('could not be loaded');
  await initializeStore();
  expect(storage.getItem).toHaveBeenCalledTimes(1);
  appStore.getState().advanceTime();
  await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
});
it('recovers when storage is unavailable', async () => {
  storage.getItem.mockRejectedValue(new Error('storage denied'));
  const { appStore, initializeStore } = await import('../src/core/useAppStore');
  expect(await initializeStore()).toContain('could not be loaded');
  expect(appStore.getState().sessions).toEqual(initialState().sessions);
});
