import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { apiCommand } from '@/api/client';
import type { Brand } from '@/core/pilot/types';
import {
  Banner,
  Button,
  Card,
  CollapsibleSection,
  Screen,
  ScreenHeader,
  TextField,
  styles,
} from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { accessMessages } from './messages';
import { offerMessages } from '../offers/messages';
import {
  AccessGate,
  ErrorNotice,
  RemoteState,
  SignOut,
  useRemote,
  useTask,
} from './shared';

const load = () => apiCommand('me', undefined);
function BrandForm({ brand }: { brand: Brand }) {
  const { t } = useT(accessMessages);
  const [form, setForm] = useState(brand);
  const [saved, setSaved] = useState(false);
  const task = useTask();
  return (
    <CollapsibleSection
      title={t('brand')}
      summary={saved ? form.displayName : brand.displayName}
    >
      {(
        ['displayName', 'logoUrl', 'primary', 'background', 'text'] as const
      ).map((key) => (
        <TextField
          key={key}
          label={t(key === 'logoUrl' ? 'logo' : key)}
          value={form[key] ?? ''}
          editable={!task.busy}
          onChangeText={(value) => {
            setSaved(false);
            setForm({
              ...form,
              [key]: key === 'logoUrl' ? value || null : value,
            });
          }}
        />
      ))}
      <Button
        label={t(task.busy ? 'working' : 'save')}
        variant="primary"
        disabled={task.busy}
        onPress={() =>
          void task.run(async () => {
            await apiCommand('updateBrand', { brand: form });
            setSaved(true);
          })
        }
      />
      <ErrorNotice code={task.error} />
      {saved ? <Banner>{t('saved')}</Banner> : null}
    </CollapsibleSection>
  );
}
function StaffHome() {
  const { t } = useT(accessMessages);
  const offers = useT(offerMessages);
  const remote = useRemote(load);
  const data = remote.data;
  return (
    <Screen>
      <ScreenHeader title={data?.tenant.name ?? t('venue')} />
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      {data ? (
        <>
          <Card>
            <Text style={styles.subheading}>{data.staff.name}</Text>
            <Text style={styles.text}>{t(data.staff.role)}</Text>
            <SignOut />
          </Card>
          {data.staff.role === 'owner' ? (
            <BrandForm brand={data.tenant.brand} />
          ) : null}
          {data.staff.role !== 'server' ? (
            <Button
              label={offers.t('offers')}
              onPress={() => router.push('/staff/offers' as never)}
            />
          ) : null}
          <Card>
            <Text style={styles.heading}>{t('branches')}</Text>
            {data.branches.map((branch) => (
              <Button
                key={branch.id}
                label={`${t('openVenue')} · ${branch.name}`}
                onPress={() => router.push(`/v/${branch.slug}` as never)}
              />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
export default function StaffScreen() {
  return (
    <AccessGate kind="staff">
      <StaffHome />
    </AccessGate>
  );
}
