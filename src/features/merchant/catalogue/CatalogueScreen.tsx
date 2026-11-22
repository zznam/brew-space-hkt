import { getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { catalogueStore, useCatalogue } from '@/core/catalogue/useCatalogue';
import { CatalogueView } from '../../catalogue/CatalogueView';

export function CatalogueScreen() {
  const venueId = useAppStore((s) => s.venueId);
  const items = useCatalogue((s) => s.items).filter(
    (i) => i.tenantId === venueId && !i.archived,
  );
  const categories = useCatalogue((s) => s.categories)
    .filter((c) => c.tenantId === venueId)
    .sort((a, b) => a.sort - b.sort);
  const issue = useCatalogue((s) => s.storageIssue);
  return (
    <CatalogueView
      key={venueId}
      venueName={getVenue(venueId).name}
      items={items}
      categories={categories}
      issue={issue}
      actions={{
        saveItem: (input) => catalogueStore.getState().saveItem(venueId, input),
        saveCategory: (input) =>
          catalogueStore.getState().saveCategory(venueId, input),
        archiveItem: (id) => catalogueStore.getState().archiveItem(venueId, id),
        setSoldOut: (id, soldOut) =>
          catalogueStore.getState().setSoldOut(venueId, id, soldOut),
      }}
    />
  );
}
