import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { apiCommand, ApiError } from '@/api/client';
import type { Output } from '@/core/pilot/engine';
import type { FlashSale, Role } from '@/core/pilot/types';
import { formatMoney } from '@/core/billing';
import { formatLocalInput, parseLocalInput } from '@/core/pilot/dateInput';
import {
  Banner,
  Button,
  Card,
  Chip,
  CollapsibleSection,
  EmptyState,
  Heading,
  Screen,
  ScreenHeader,
  TextField,
  styles,
} from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import {
  AccessGate,
  ErrorNotice,
  RemoteState,
  useRemote,
  useTask,
} from '@/features/access/shared';
import { offerMessages } from './messages';
const loadProfile = () => apiCommand('me', undefined);
type Branch = Output<'me'>['branches'][number];
function CreateOffer({
  branch,
  owner,
  done,
}: {
  branch: Branch;
  owner: boolean;
  done: () => void;
}) {
  const { t } = useT(offerMessages);
  const task = useTask();
  const [type, setType] = useState<'voucher' | 'sale'>(
    owner ? 'voucher' : 'sale',
  );
  const [kind, setKind] = useState<'percent' | 'fixed'>('percent');
  const [name, setName] = useState('');
  const [value, setValue] = useState('10');
  const [cap, setCap] = useState('20000');
  const [quota, setQuota] = useState('20');
  const [start, setStart] = useState(() => formatLocalInput(Date.now()));
  const [end, setEnd] = useState(() => formatLocalInput(Date.now() + 86400000));
  return (
    <Card>
      <Heading>{t('newOffer')}</Heading>
      <View style={styles.row}>
        {owner ? (
          <Chip
            label={t('voucher')}
            selected={type === 'voucher'}
            onPress={() => setType('voucher')}
          />
        ) : null}
        <Chip
          label={t('sale')}
          selected={type === 'sale'}
          onPress={() => {
            setType('sale');
            setKind('percent');
          }}
        />
      </View>
      <TextField
        label={t(type === 'voucher' ? 'code' : 'name')}
        value={name}
        onChangeText={setName}
        editable={!task.busy}
      />
      {type === 'voucher' ? (
        <View style={styles.row}>
          {(['percent', 'fixed'] as const).map((k) => (
            <Chip
              key={k}
              label={t(k)}
              selected={kind === k}
              onPress={() => setKind(k)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.caption}>{t('itemScope')}</Text>
      )}
      <TextField
        label={t('value')}
        value={value}
        onChangeText={setValue}
        numeric
        editable={!task.busy}
      />
      <TextField
        label={t('cap')}
        value={cap}
        onChangeText={setCap}
        numeric
        editable={!task.busy}
      />
      <TextField
        label={t('quota')}
        value={quota}
        onChangeText={setQuota}
        numeric
        editable={!task.busy}
      />
      <TextField
        label={t('start')}
        value={start}
        onChangeText={setStart}
        editable={!task.busy}
      />
      <TextField
        label={t('end')}
        value={end}
        onChangeText={setEnd}
        editable={!task.busy}
      />
      <Button
        label={t(type === 'voucher' ? 'create' : 'propose')}
        variant="primary"
        disabled={task.busy}
        onPress={() =>
          void task.run(async () => {
            const from = parseLocalInput(start),
              to = parseLocalInput(end);
            if (
              from === null ||
              to === null ||
              ![value, cap, quota].every((v) => /^\d+$/.test(v))
            )
              throw new ApiError('VALIDATION');
            if (type === 'voucher')
              await apiCommand('createVoucher', {
                code: name,
                kind,
                value: Number(value),
                cap: Number(cap),
                usageLimit: Number(quota),
                validFrom: from,
                validTo: to,
              });
            else
              await apiCommand('proposeSale', {
                branchId: branch.id,
                name,
                appliesTo: 'items',
                tierIds: null,
                discountPercent: Number(value),
                discountCap: Number(cap),
                quota: Number(quota),
                startAt: from,
                endAt: to,
              });
            done();
          })
        }
      />
      {task.error === 'GUARDRAIL' || task.error === 'VALIDATION' ? (
        <Banner tone="danger">{t('invalid')}</Banner>
      ) : (
        <ErrorNotice code={task.error} />
      )}
    </Card>
  );
}
function SaleDecision({
  sale,
  changed,
}: {
  sale: FlashSale;
  changed: () => void;
}) {
  const { t } = useT(offerMessages);
  const task = useTask();
  const [reason, setReason] = useState('');
  return (
    <CollapsibleSection
      title={t(sale.status === 'proposed' ? 'approve' : 'stop')}
      summary={sale.name}
    >
      <TextField
        label={t('reason')}
        value={reason}
        onChangeText={setReason}
        editable={!task.busy}
      />
      <Button
        label={t(sale.status === 'proposed' ? 'approve' : 'stop')}
        disabled={!reason.trim() || task.busy}
        onPress={() =>
          void task.run(async () => {
            await apiCommand(
              sale.status === 'proposed' ? 'approveSale' : 'stopSale',
              { saleId: sale.id, reason },
            );
            changed();
          })
        }
      />
      {task.error === 'GUARDRAIL' ? (
        <Banner tone="danger">{t('invalid')}</Banner>
      ) : (
        <ErrorNotice code={task.error} />
      )}
    </CollapsibleSection>
  );
}
function BranchOffers({ branch, role }: { branch: Branch; role: Role }) {
  const { t } = useT(offerMessages);
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState(false);
  const load = useCallback(
    () => apiCommand('listOffers', { branchId: branch.id }),
    [branch.id],
  );
  const remote = useRemote(load);
  const data = remote.data;
  return (
    <>
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      {data ? (
        <Text style={styles.caption}>
          {t('guard', { percent: data.maxDiscountPercent })}
        </Text>
      ) : null}
      {creating ? (
        <>
          <Button label={t('back')} onPress={() => setCreating(false)} />
          <CreateOffer
            branch={branch}
            owner={role === 'owner'}
            done={() => {
              setCreating(false);
              setSaved(true);
              remote.reload();
            }}
          />
        </>
      ) : (
        <>
          {saved ? <Banner>{t('saved')}</Banner> : null}
          <Button
            label={t('newOffer')}
            variant="primary"
            onPress={() => {
              setSaved(false);
              setCreating(true);
            }}
          />
          {data && !data.sales.length && !data.vouchers.length ? (
            <EmptyState title={t('empty')} message={t('emptyBody')} />
          ) : null}
          {data?.vouchers.map((v) => (
            <Card key={v.id}>
              <Heading level={2}>{v.code}</Heading>
              <Text style={styles.text}>
                {v.kind === 'percent' ? `${v.value}%` : formatMoney(v.value)} ·{' '}
                {t('cap')}: {formatMoney(v.cap)}
              </Text>
              <Text style={styles.caption}>
                {t('window', {
                  start: formatLocalInput(v.validFrom),
                  end: formatLocalInput(v.validTo),
                })}
              </Text>
              <Text style={styles.caption}>
                {t('usage', {
                  used: v.used,
                  held: v.held,
                  limit: v.usageLimit,
                })}
              </Text>
            </Card>
          ))}
          {data?.sales.map((s) => (
            <Card key={s.id}>
              <Heading level={2}>
                {s.name} · {s.discountPercent}%
              </Heading>
              <Text style={styles.text}>
                {t(s.status)} · {t('cap')}: {formatMoney(s.discountCap)}
              </Text>
              <Text style={styles.caption}>
                {t('window', {
                  start: formatLocalInput(s.startAt),
                  end: formatLocalInput(s.endAt),
                })}
              </Text>
              <Text style={styles.caption}>
                {t('usage', { used: s.used, held: s.held, limit: s.quota })}
              </Text>
              {['owner', 'manager'].includes(role) && s.status !== 'stopped' ? (
                <SaleDecision sale={s} changed={remote.reload} />
              ) : null}
            </Card>
          ))}
        </>
      )}
    </>
  );
}
function Offers() {
  const { t } = useT(offerMessages);
  const remote = useRemote(loadProfile);
  const [branchId, setBranchId] = useState('');
  const branch =
    remote.data?.branches.find((b) => b.id === branchId) ??
    remote.data?.branches[0];
  return (
    <Screen>
      <ScreenHeader title={t('offers')} />
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      {remote.data && branch ? (
        <>
          <View style={styles.row}>
            {remote.data.branches.map((b) => (
              <Chip
                key={b.id}
                label={b.name}
                selected={branch.id === b.id}
                onPress={() => setBranchId(b.id)}
              />
            ))}
          </View>
          <BranchOffers
            key={branch.id}
            branch={branch}
            role={remote.data.staff.role}
          />
        </>
      ) : null}
    </Screen>
  );
}
export default function OffersScreen() {
  return (
    <AccessGate kind="staff">
      <Offers />
    </AccessGate>
  );
}
