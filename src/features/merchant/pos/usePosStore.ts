import { useStore } from 'zustand';
import { getAllVenues, getVenue } from '@/core/fixtures';
import { catalogueStore } from '@/core/catalogue/useCatalogue';
import {
  posCatalogueMenu,
  catalogueItemForMenuId,
} from '@/core/catalogue/store';
import { createPosStore, type PosStore } from './posStore';

export const posStore = createPosStore({
  getMenu: (venueId) =>
    posCatalogueMenu(catalogueStore.getState(), getVenue(venueId)),
  toggleSoldOut: (id) => {
    for (const venue of getAllVenues()) {
      const item = catalogueItemForMenuId(catalogueStore.getState(), venue, id);
      if (item) {
        catalogueStore.getState().setSoldOut(venue.id, item.id, !item.soldOut);
        return;
      }
    }
  },
});
export const usePosStore = <T>(selector: (state: PosStore) => T) =>
  useStore(posStore, selector);
