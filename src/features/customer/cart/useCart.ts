import { useStore } from 'zustand';
import { appStore } from '@/core/useAppStore';
import { createCartStore, type CartStore } from './cartStore';

/** Singleton bound to the app's core store. Cart and order log are in-memory
 * only: they are not persisted and are lost on reload (the core bill remains). */
export const cartStore = createCartStore(appStore);
export const useCart = <T>(selector: (state: CartStore) => T) =>
  useStore(cartStore, selector);
