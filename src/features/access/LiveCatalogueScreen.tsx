import { ApiError, apiCommand } from '@/api/client';
import type { CatalogueResult } from '@/core/catalogue/store';
import { CatalogueView } from '@/features/catalogue/CatalogueView';
import { AccessGate, RemoteState, useRemote } from './shared';

const load = async () => {
  const [profile, catalogue] = await Promise.all([
    apiCommand('me', undefined),
    apiCommand('getCatalogue', undefined),
  ]);
  return { profile, catalogue };
};
function LiveCatalogue() {
  const remote = useRemote(load);
  const data = remote.data;
  const write = async (
    request: () => Promise<unknown>,
  ): Promise<CatalogueResult> => {
    try {
      await request();
      remote.reload();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        code: error instanceof ApiError ? error.code : 'INTERNAL',
      };
    }
  };
  return (
    <>
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      {data ? (
        <CatalogueView
          key={data.profile.tenant.id}
          venueName={data.profile.tenant.name}
          live
          items={data.catalogue.items.filter((i) => !i.archived)}
          categories={data.catalogue.categories}
          canEdit={data.profile.perms.includes('menu.edit')}
          actions={{
            saveItem: (input) => write(() => apiCommand('saveItem', input)),
            saveCategory: (input) =>
              write(() => apiCommand('saveCategory', input)),
            archiveItem: (itemId) =>
              write(() => apiCommand('archiveItem', { itemId })),
            setSoldOut: (itemId, soldOut) =>
              write(() => apiCommand('setSoldOut', { itemId, soldOut })),
          }}
        />
      ) : null}
    </>
  );
}
export default function LiveCatalogueScreen() {
  return (
    <AccessGate kind="staff">
      <LiveCatalogue />
    </AccessGate>
  );
}
