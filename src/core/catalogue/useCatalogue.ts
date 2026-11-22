import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from 'zustand';
import { getAllVenues, getVenue } from '../fixtures';
import {
  catalogueMenu,
  catalogueSnapshot,
  createCatalogueStore,
  type CatalogueState,
} from './store';

export const catalogueStore = createCatalogueStore();
export const useCatalogue = <T>(selector: (state: CatalogueState) => T) =>
  useStore(catalogueStore, selector);
export const currentMenu = (venueId: string) =>
  catalogueMenu(catalogueStore.getState(), getVenue(venueId));
export const CATALOGUE_STORAGE_KEY = 'brewspace:catalogue:v1';
let initialization: Promise<void> | undefined;

/** Called after core hydration so custom venue records exist before validation. */
export function initializeCatalogue(): Promise<void> {
  return (initialization ??= (async () => {
    catalogueStore.getState().ensureVenues(getAllVenues());
    try {
      const raw = await AsyncStorage.getItem(CATALOGUE_STORAGE_KEY);
      if (raw) catalogueStore.getState().restore(JSON.parse(raw));
    } catch {
      catalogueStore.setState({ storageIssue: 'load' });
    }
    let writes = Promise.resolve();
    catalogueStore.subscribe((state, previous) => {
      if (
        state.items === previous.items &&
        state.categories === previous.categories
      )
        return;
      const snapshot = JSON.stringify(catalogueSnapshot(state));
      writes = writes
        .then(() => AsyncStorage.setItem(CATALOGUE_STORAGE_KEY, snapshot))
        .then(() => {
          if (catalogueStore.getState().storageIssue === 'save')
            catalogueStore.setState({ storageIssue: null });
        })
        .catch(() => catalogueStore.setState({ storageIssue: 'save' }));
    });
  })());
}
