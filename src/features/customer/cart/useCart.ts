import { useStore } from 'zustand';
import { appStore } from '@/core/useAppStore';
import { currentMenu } from '@/core/catalogue/useCatalogue';
import { getPreferences, isMember } from '../loyalty/loyaltyModel';
import { loyaltyStore } from '../loyalty/useLoyalty';
import { supportStore } from '../support/useSupport';
import { createCartStore, type CartStore } from './cartStore';

/** Singleton bound to the app's core store. Cart and order log are in-memory
 * only: they are not persisted and are lost on reload (the core bill remains).
 * Loyalty is read-only here (saved preferences for members); the allergy
 * request goes through the support store. */
export const cartStore = createCartStore(appStore, {
  getMenu: currentMenu,
  getSavedPreferences: (venueId) => {
    const loyalty = loyaltyStore.getState();
    return isMember(loyalty, venueId) ? getPreferences(loyalty, venueId) : null;
  },
  notifyStaff: (ctx, text) => supportStore.getState().submitNote(ctx, text),
});
export const useCart = <T>(selector: (state: CartStore) => T) =>
  useStore(cartStore, selector);
