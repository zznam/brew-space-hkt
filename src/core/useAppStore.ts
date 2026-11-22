import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from 'zustand';
import { getAllVenues, setActiveCustomVenues } from './fixtures';
import { catalogueMenu } from './catalogue/store';
import { catalogueStore } from './catalogue/useCatalogue';
import { createAppStore, isDemoState, type AppStore } from './store';

export const appStore = createAppStore((venue) =>
  catalogueMenu(catalogueStore.getState(), venue),
);
appStore.subscribe((state, previous) => {
  if (state.customVenues !== previous.customVenues)
    catalogueStore.getState().ensureVenues(getAllVenues(state.customVenues));
});
export const useAppStore = <T>(selector: (state: AppStore) => T) =>
  useStore(appStore, selector);
const STORAGE_KEY = 'vibing-hkt:demo:v1';
let initialization: Promise<string | null> | undefined;

/** Hydrate before rendering interactive routes. Writes are serialized to prevent stale saves. */
export function initializeStore(): Promise<string | null> {
  return (initialization ??= (async () => {
    let warning: string | null = null;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (isDemoState(data)) {
          const {
            role,
            venueId,
            scenario,
            selectedSeatId,
            sessions,
            nextSessionId,
            customVenues,
          } = data;
          setActiveCustomVenues(customVenues ?? []);
          appStore.setState({
            role,
            venueId,
            scenario,
            selectedSeatId,
            sessions,
            nextSessionId,
            ...(customVenues !== undefined ? { customVenues } : {}),
          });
        } else
          warning = 'Saved demo was incompatible. Fresh sample data loaded.';
      }
    } catch {
      warning = 'Saved demo could not be loaded. Using sample data.';
    }
    let writes = Promise.resolve();
    appStore.subscribe((state) => {
      // Functions are omitted by JSON.stringify; never persist credentials here.
      const snapshot = JSON.stringify(state);
      writes = writes
        .then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot))
        .catch(() => {
          console.warn(
            'Demo could not be saved locally. Changes remain available for this run.',
          );
        });
    });
    return warning;
  })());
}
