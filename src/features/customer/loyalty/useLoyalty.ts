import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from 'zustand';
import type { VisitSnapshot } from '../shared/visit';
import {
  createLoyaltyStore,
  isLoyaltyState,
  type LoyaltyStore,
} from './loyaltyStore';

export const loyaltyStore = createLoyaltyStore();
export const useLoyalty = <T>(selector: (state: LoyaltyStore) => T) =>
  useStore(loyaltyStore, selector);
const STORAGE_KEY = 'vibing-hkt:customer:v1';
let initialization: Promise<string | null> | undefined;

/** Hydrate before use. Writes are serialized so a stale save never wins. */
export function initializeLoyalty(): Promise<string | null> {
  return (initialization ??= (async () => {
    let warning: string | null = null;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (isLoyaltyState(data)) {
          const { memberships, ledger, visits, preferences, favourites } = data;
          loyaltyStore.setState({
            memberships,
            ledger,
            visits,
            preferences,
            favourites,
          });
        } else warning = 'Saved member data was incompatible. Starting fresh.';
      }
    } catch {
      warning = 'Saved member data could not be loaded. Starting fresh.';
    }
    let writes = Promise.resolve();
    loyaltyStore.subscribe((state) => {
      // Functions are omitted by JSON.stringify.
      const snapshot = JSON.stringify(state);
      writes = writes
        .then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot))
        .catch(() => {
          console.warn(
            'Member data could not be saved locally. Changes remain available for this run.',
          );
        });
    });
    return warning;
  })());
}

/** Waits for restore first so a visit recorded early is never overwritten. */
export async function recordCompletedVisit(
  snapshot: VisitSnapshot,
): Promise<void> {
  await initializeLoyalty();
  loyaltyStore.getState().recordVisit(snapshot);
}

/** Screens call this and render a loading state until `ready`. */
export function useLoyaltyReady() {
  const [state, setState] = useState<{
    ready: boolean;
    warning: string | null;
  }>({ ready: false, warning: null });
  useEffect(() => {
    let active = true;
    void initializeLoyalty().then((warning) => {
      if (active) setState({ ready: true, warning });
    });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
