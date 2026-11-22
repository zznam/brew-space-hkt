import { useState } from 'react';
import { Text } from 'react-native';
import { apiCommand } from '@/api/client';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  TextField,
  styles,
} from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { accessMessages } from './messages';
import {
  AccessGate,
  ErrorNotice,
  RemoteState,
  SignOut,
  useRemote,
  useTask,
} from './shared';

const load = () => apiCommand('listTenants', undefined);
function PlatformHome() {
  const { t } = useT(accessMessages);
  const remote = useRemote(load);
  const task = useTask();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [form, setForm] = useState({
    venueName: '',
    slug: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    open: '07:00',
    close: '22:00',
  });
  return (
    <Screen>
      <ScreenHeader title={t('venues')} />
      <SignOut />
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      {created ? <Banner>{t('created')}</Banner> : null}
      {creating ? (
        <Card>
          <Text style={styles.heading}>{t('createVenue')}</Text>
          {(Object.keys(form) as (keyof typeof form)[]).map((key) => (
            <TextField
              key={key}
              label={t(key)}
              value={form[key]}
              onChangeText={(value) => setForm({ ...form, [key]: value })}
              editable={!task.busy}
              secureTextEntry={key === 'ownerPassword'}
              autoCapitalize={
                ['slug', 'ownerEmail'].includes(key) ? 'none' : undefined
              }
              autoComplete={
                key === 'ownerPassword'
                  ? 'new-password'
                  : key === 'ownerEmail'
                    ? 'email'
                    : undefined
              }
            />
          ))}
          <Text style={styles.caption}>{t('hoursHint')}</Text>
          <Button
            label={t(task.busy ? 'working' : 'createVenue')}
            variant="primary"
            disabled={task.busy || form.ownerPassword.length < 12}
            onPress={() =>
              void task.run(async () => {
                await apiCommand('createTenant', {
                  name: form.venueName,
                  currency: 'VND',
                  branch: {
                    name: form.venueName,
                    slug: form.slug,
                    address: form.address,
                    timezone: 'Asia/Ho_Chi_Minh',
                    hours: Array.from({ length: 7 }, () => ({
                      open: form.open,
                      close: form.close,
                    })),
                  },
                  owner: {
                    name: form.ownerName,
                    email: form.ownerEmail,
                    password: form.ownerPassword,
                  },
                });
                setForm({ ...form, ownerPassword: '' });
                setCreating(false);
                setCreated(true);
                remote.reload();
              })
            }
          />
          <ErrorNotice code={task.error} />
          <Button
            label={t('cancel')}
            disabled={task.busy}
            onPress={() => {
              setCreating(false);
              setForm({ ...form, ownerPassword: '' });
            }}
          />
        </Card>
      ) : (
        <Button
          label={t('createVenue')}
          variant="primary"
          onPress={() => {
            setCreated(false);
            setCreating(true);
          }}
        />
      )}
      {!creating && remote.data ? (
        remote.data.length ? (
          remote.data.map((tenant) => (
            <Card key={tenant.id}>
              <Text style={styles.subheading}>{tenant.name}</Text>
              <Text style={styles.caption}>
                {t(tenant.status === 'active' ? 'active' : 'suspended')}
              </Text>
            </Card>
          ))
        ) : (
          <EmptyState title={t('noVenues')} message={t('noVenuesBody')} />
        )
      ) : null}
    </Screen>
  );
}
export default function PlatformScreen() {
  return (
    <AccessGate kind="platform">
      <PlatformHome />
    </AccessGate>
  );
}
