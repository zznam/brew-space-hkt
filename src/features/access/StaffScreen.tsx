import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
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
import { checkBrandColours, formatRatio } from './brandPreview';
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
  const check = checkBrandColours(form);
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
      {/* F265: preview the draft colours before saving; refuse unreadable pairs. */}
      <Text style={styles.textStrong}>{t('brandPreview')}</Text>
      {check.kind === 'invalid' ? (
        <Banner tone="warning">
          {t('colourInvalid', {
            fields: check.fields.map((field) => t(field)).join(', '),
          })}
        </Banner>
      ) : (
        <>
          <View
            accessibilityLabel={t('brandPreview')}
            style={{
              backgroundColor: form.background,
              borderColor: form.primary,
              borderWidth: 2,
              borderRadius: 12,
              padding: 12,
              gap: 8,
            }}
          >
            <Text style={{ color: form.text, fontWeight: '700', fontSize: 16 }}>
              {form.displayName}
            </Text>
            <Text style={{ color: form.text }}>{t('brandSample')}</Text>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: form.primary,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: form.background, fontWeight: '600' }}>
                {t('brandOrder')}
              </Text>
            </View>
          </View>
          <Banner tone={check.kind === 'ok' ? 'success' : 'warning'}>
            {t(check.kind === 'ok' ? 'contrastOk' : 'contrastLow', {
              ratio: formatRatio(check.ratio),
            })}
          </Banner>
        </>
      )}
      <Button
        label={t(task.busy ? 'working' : 'save')}
        variant="primary"
        disabled={task.busy || check.kind !== 'ok'}
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
