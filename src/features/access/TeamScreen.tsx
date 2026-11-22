import { useState } from 'react';
import { Text, View } from 'react-native';
import { apiCommand } from '@/api/client';
import type { Output } from '@/core/pilot/engine';
import type { Role } from '@/core/pilot/types';
import {
  Banner,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  ScreenHeader,
  TextField,
  space,
  styles,
} from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { accessMessages } from './messages';
import {
  AccessGate,
  ErrorNotice,
  RemoteState,
  useRemote,
  useTask,
} from './shared';

const load = async () => {
  const profile = await apiCommand('me', undefined);
  const staff =
    profile.staff.role === 'owner'
      ? await apiCommand('listStaff', undefined)
      : [];
  return { profile, staff };
};
type Person = Output<'listStaff'>[number];
type Branches = Output<'me'>['branches'];
function StaffForm({
  person,
  branches,
  close,
  saved,
}: {
  person: Person | null;
  branches: Branches;
  close: () => void;
  saved: () => void;
}) {
  const { t } = useT(accessMessages);
  const [name, setName] = useState(person?.name ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(person?.role ?? 'server');
  const [branchIds, setBranchIds] = useState(
    person?.branchIds ?? branches.slice(0, 1).map((b) => b.id),
  );
  const task = useTask();
  return (
    <Card>
      <Text style={styles.heading}>{t(person ? 'editStaff' : 'addStaff')}</Text>
      {person ? (
        <Text style={styles.textStrong}>
          {person.name} · {person.email}
        </Text>
      ) : (
        <>
          <TextField
            label={t('name')}
            value={name}
            onChangeText={setName}
            editable={!task.busy}
          />
          <TextField
            label={t('email')}
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
            autoCapitalize="none"
            editable={!task.busy}
          />
          <TextField
            label={t('newPassword')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={!task.busy}
          />
        </>
      )}
      <Text style={styles.captionStrong}>{t('chooseRole')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {(['owner', 'manager', 'cashier', 'server'] as const).map((value) => (
          <Chip
            key={value}
            label={t(value)}
            selected={role === value}
            disabled={task.busy}
            onPress={() => setRole(value)}
          />
        ))}
      </View>
      {role !== 'owner' ? (
        <>
          <Text style={styles.captionStrong}>{t('assignBranches')}</Text>
          <View style={{ gap: space.sm }}>
            {branches.map((branch) => (
              <Chip
                key={branch.id}
                label={branch.name}
                selected={branchIds.includes(branch.id)}
                disabled={task.busy}
                onPress={() =>
                  setBranchIds((ids) =>
                    ids.includes(branch.id)
                      ? ids.filter((id) => id !== branch.id)
                      : [...ids, branch.id],
                  )
                }
              />
            ))}
          </View>
        </>
      ) : null}
      <Button
        label={t(task.busy ? 'working' : person ? 'save' : 'addStaff')}
        variant="primary"
        disabled={
          task.busy ||
          (role !== 'owner' && branchIds.length === 0) ||
          (!person && (!name || !email || password.length < 12))
        }
        onPress={() =>
          void task.run(async () => {
            if (person)
              await apiCommand('updateStaff', {
                staffId: person.id,
                role,
                branchIds,
              });
            else
              await apiCommand('inviteStaff', {
                name,
                email,
                password,
                role,
                branchIds,
              });
            setPassword('');
            saved();
          })
        }
      />
      <ErrorNotice code={task.error} />
      <Button label={t('cancel')} disabled={task.busy} onPress={close} />
    </Card>
  );
}
function ResetPassword({
  person,
  close,
  saved,
}: {
  person: Person;
  close: () => void;
  saved: () => void;
}) {
  const { t } = useT(accessMessages);
  const task = useTask();
  const [password, setPassword] = useState('');
  return (
    <Card>
      <Text style={styles.heading}>
        {t('passwordReset')} · {person.name}
      </Text>
      <TextField
        label={t('resetPassword')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        editable={!task.busy}
      />
      <Button
        label={t('passwordReset')}
        variant="primary"
        disabled={task.busy || password.length < 12}
        onPress={() =>
          void task.run(async () => {
            await apiCommand('resetStaffPassword', {
              staffId: person.id,
              password,
            });
            setPassword('');
            saved();
          })
        }
      />
      <ErrorNotice code={task.error} />
      <Button label={t('cancel')} disabled={task.busy} onPress={close} />
    </Card>
  );
}
function Team() {
  const { t } = useT(accessMessages);
  const remote = useRemote(load);
  const [editing, setEditing] = useState<Person | 'new' | null>(null);
  const [revoking, setRevoking] = useState<Person | null>(null);
  const [resetting, setResetting] = useState<Person | null>(null);
  const [notice, setNotice] = useState<
    'saved' | 'invited' | 'resetDone' | null
  >(null);
  const task = useTask();
  const data = remote.data;
  const saved = (notice: 'saved' | 'invited' | 'resetDone') => {
    setEditing(null);
    setRevoking(null);
    setResetting(null);
    setNotice(notice);
    remote.reload();
  };
  return (
    <Screen>
      <ScreenHeader title={t('team')} />
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      {notice ? <Banner>{t(notice)}</Banner> : null}
      <ErrorNotice code={task.error} />
      {data?.profile.staff.role !== 'owner' ? (
        data ? (
          <Banner>{t('noAccess')}</Banner>
        ) : null
      ) : editing ? (
        <StaffForm
          key={editing === 'new' ? 'new' : editing.id}
          person={editing === 'new' ? null : editing}
          branches={data.profile.branches}
          close={() => setEditing(null)}
          saved={() => saved(editing === 'new' ? 'invited' : 'saved')}
        />
      ) : resetting ? (
        <ResetPassword
          person={resetting}
          close={() => setResetting(null)}
          saved={() => saved('resetDone')}
        />
      ) : revoking ? (
        <Card>
          <Text style={styles.heading}>{revoking.name}</Text>
          <Text style={styles.text}>{t('revokeHint')}</Text>
          <Button
            label={t('revokeConfirm')}
            variant="danger"
            disabled={task.busy}
            onPress={() =>
              void task.run(async () => {
                await apiCommand('revokeStaff', { staffId: revoking.id });
                saved('saved');
              })
            }
          />
          <Button
            label={t('cancel')}
            disabled={task.busy}
            onPress={() => setRevoking(null)}
          />
        </Card>
      ) : (
        <>
          <Button
            label={t('addStaff')}
            variant="primary"
            onPress={() => {
              setNotice(null);
              setEditing('new');
            }}
          />
          {data.staff.length === 0 ? (
            <EmptyState title={t('noStaff')} message={t('noStaffBody')} />
          ) : (
            data.staff.map((person) => (
              <Card key={person.id}>
                <Text style={styles.subheading}>{person.name}</Text>
                <Text style={styles.text}>{person.email}</Text>
                <Text style={styles.caption}>
                  {t(person.role)} ·{' '}
                  {t(person.status === 'active' ? 'active' : 'revoked')}
                </Text>
                {person.status === 'active' ? (
                  <View style={{ gap: space.sm }}>
                    <Button
                      label={t('edit')}
                      accessibilityLabel={`${t('edit')} ${person.name}`}
                      onPress={() => {
                        setNotice(null);
                        setEditing(person);
                      }}
                    />
                    <Button
                      label={t('passwordReset')}
                      accessibilityLabel={`${t('passwordReset')} ${person.name}`}
                      onPress={() => {
                        setNotice(null);
                        setResetting(person);
                      }}
                    />
                    {person.id !== data.profile.staff.id ? (
                      <Button
                        label={t('revoke')}
                        accessibilityLabel={`${t('revoke')} ${person.name}`}
                        onPress={() => setRevoking(person)}
                      />
                    ) : null}
                  </View>
                ) : null}
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
export default function TeamScreen() {
  return (
    <AccessGate kind="staff">
      <Team />
    </AccessGate>
  );
}
