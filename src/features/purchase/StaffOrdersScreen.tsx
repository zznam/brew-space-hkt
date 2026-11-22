import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { apiCommand, getPublicVenue, requestKey } from '@/api/client';
import type { Output } from '@/core/pilot/engine';
import type { Shift } from '@/core/pilot/types';
import { formatMoney } from '@/core/billing';
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
  RemoteState,
  useRemote,
  useTask,
} from '@/features/access/shared';
import { CustomerCheckout } from './CustomerCheckout';
import { purchaseMessages } from './messages';
import { PurchaseError, useRefresh } from './shared';

const loadProfile = () => apiCommand('me', undefined);
type Branch = Output<'me'>['branches'][number];
type Order = Output<'listOrders'>[number];
const validMoney = (text: string) =>
  /^\d+$/.test(text) && Number.isSafeInteger(Number(text));

function ShiftPanel({
  branchId,
  shift,
  previous,
  changed,
}: {
  branchId: string;
  shift?: Shift;
  previous?: Shift;
  changed: () => void;
}) {
  const { t } = useT(purchaseMessages);
  const task = useTask();
  const [amount, setAmount] = useState('');
  const [key] = useState(requestKey);
  return (
    <CollapsibleSection
      title={t('shifts')}
      summary={t(shift ? 'closeShift' : 'openShift')}
      defaultOpen={!shift}
    >
      {previous ? (
        <>
          <Text style={styles.text}>
            {t('expected')} · {formatMoney(previous.expectedCash ?? 0)}
          </Text>
          <Text style={styles.text}>
            {t('variance')} · {formatMoney(previous.variance ?? 0)}
          </Text>
        </>
      ) : null}
      <TextField
        label={t(shift ? 'counted' : 'opening')}
        numeric
        value={amount}
        onChangeText={setAmount}
        editable={!task.busy}
      />
      <Button
        label={t(shift ? 'closeShift' : 'openShift')}
        disabled={task.busy || !validMoney(amount)}
        onPress={() =>
          void task.run(async () => {
            if (shift)
              await apiCommand('closeShift', {
                shiftId: shift.id,
                countedCash: Number(amount),
                idempotencyKey: key,
              });
            else
              await apiCommand('openShift', {
                branchId,
                openingFloat: Number(amount),
                idempotencyKey: key,
              });
            changed();
          })
        }
      />
      <PurchaseError code={task.error} />
    </CollapsibleSection>
  );
}
function CashOrder({
  order,
  shift,
  changed,
}: {
  order: Order;
  shift?: Shift;
  changed: () => void;
}) {
  const { t } = useT(purchaseMessages);
  const task = useTask();
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<Output<'confirmCash'> | null>(null);
  const [key] = useState(requestKey);
  return (
    <Card>
      <Heading>{t('order', { code: order.code })}</Heading>
      <Banner>{t(order.status)}</Banner>
      {order.lines.map((line) => (
        <Text key={line.id} style={styles.text}>
          {line.quantity} × {line.name}
          {line.sizeName ? ` · ${line.sizeName}` : ''} ·{' '}
          {formatMoney(line.lineTotal)}
        </Text>
      ))}
      {order.fees.map((fee) => (
        <Text key={fee.feeId} style={styles.text}>
          {fee.name} · {formatMoney(fee.amount)}
        </Text>
      ))}
      {order.promotion ? (
        <Text style={styles.text}>
          {order.promotion.label} · −{formatMoney(order.discount)}
        </Text>
      ) : null}
      <Text style={styles.textStrong}>
        {t('total')} · {formatMoney(order.total)}
      </Text>
      {order.paymentPending ? <Banner>{t('pending')}</Banner> : null}
      {order.status === 'awaiting_payment' && !order.paymentPending ? (
        <>
          {!shift ? (
            <Banner>{t('noShift')}</Banner>
          ) : (
            <>
              <TextField
                label={t('tendered')}
                value={amount}
                numeric
                onChangeText={setAmount}
                editable={!task.busy}
              />
              <Button
                label={t('confirm')}
                variant="primary"
                disabled={task.busy || !validMoney(amount)}
                onPress={() =>
                  void task.run(async () => {
                    const paid = await apiCommand('confirmCash', {
                      orderId: order.id,
                      shiftId: shift.id,
                      tendered: Number(amount),
                      idempotencyKey: key,
                    });
                    setResult(paid);
                    changed();
                  })
                }
              />
            </>
          )}
        </>
      ) : null}
      {result ? (
        <Banner>
          {t('cashSaved')} {t('change')} · {formatMoney(result.change)}
        </Banner>
      ) : null}
      <PurchaseError code={task.error} />
      <Button
        label={t('recheck')}
        disabled={task.busy}
        onPress={() =>
          void task.run(async () => {
            await apiCommand('recheckPayment', { orderId: order.id });
            changed();
          })
        }
      />
    </Card>
  );
}
function CounterOrder({
  branch,
  created,
}: {
  branch: Branch;
  created: (id: string) => void;
}) {
  const load = useCallback(() => getPublicVenue(branch.slug), [branch.slug]);
  const remote = useRemote(load);
  return (
    <>
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      {remote.data ? (
        <CustomerCheckout
          menu={remote.data}
          category={null}
          onCounterOrder={created}
        />
      ) : null}
    </>
  );
}
function BranchOrders({
  branch,
  staffId,
  manager,
}: {
  branch: Branch;
  staffId: string;
  manager: boolean;
}) {
  const { t } = useT(purchaseMessages);
  const load = useCallback(async () => {
    const [orders, shifts, exceptions] = await Promise.all([
      apiCommand('listOrders', { branchId: branch.id }),
      apiCommand('listShifts', { branchId: branch.id }),
      manager
        ? apiCommand('listPaymentExceptions', { branchId: branch.id })
        : Promise.resolve([]),
    ]);
    return { orders, shifts, exceptions };
  }, [branch.id, manager]);
  const remote = useRemote(load);
  useRefresh(remote.reload);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const data = remote.data;
  const ownShifts = data?.shifts.filter((s) => s.cashierId === staffId) ?? [];
  const shift = ownShifts.find((s) => s.status === 'open');
  const previous = ownShifts.filter((s) => s.status === 'closed').at(-1);
  const order = data?.orders.find((o) => o.id === selected);
  return (
    <>
      <RemoteState
        loading={!data && remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      {data ? (
        <>
          {creating ? (
            <>
              <Button
                label={t('backOrders')}
                onPress={() => setCreating(false)}
              />
              <CounterOrder
                branch={branch}
                created={(id) => {
                  setCreating(false);
                  setSelected(id);
                  remote.reload();
                }}
              />
            </>
          ) : (
            <>
              <ShiftPanel
                key={shift?.id ?? `new-${ownShifts.length}`}
                branchId={branch.id}
                shift={shift}
                previous={previous}
                changed={remote.reload}
              />
              {order ? (
                <>
                  <Button
                    label={t('backOrders')}
                    onPress={() => setSelected(null)}
                  />
                  <CashOrder
                    key={order.id}
                    order={order}
                    shift={shift}
                    changed={remote.reload}
                  />
                </>
              ) : (
                <>
                  <Button
                    label={t('newOrder')}
                    variant="primary"
                    onPress={() => setCreating(true)}
                  />
                  {data.exceptions.length ? (
                    <CollapsibleSection
                      title={t('paymentExceptions')}
                      summary={String(data.exceptions.length)}
                    >
                      {data.exceptions.map((e) => (
                        <Card key={e.id}>
                          <Text style={styles.textStrong}>
                            {t(
                              e.kind === 'excess_payment'
                                ? 'extraPayment'
                                : 'latePayment',
                            )}{' '}
                            · {formatMoney(e.amount)}
                          </Text>
                          <Text style={styles.caption}>
                            {t('refundQueued')}
                          </Text>
                          {e.orderId ? (
                            <Button
                              label={t('openOrder', {
                                code:
                                  data.orders.find((o) => o.id === e.orderId)
                                    ?.code ?? e.orderId,
                              })}
                              onPress={() => setSelected(e.orderId)}
                            />
                          ) : null}
                        </Card>
                      ))}
                    </CollapsibleSection>
                  ) : null}
                  {!data.orders.length ? (
                    <EmptyState
                      title={t('noOrders')}
                      message={t('noOrdersBody')}
                    />
                  ) : (
                    data.orders
                      .slice()
                      .reverse()
                      .map((o) => (
                        <Card key={o.id}>
                          <Heading level={2}>
                            {t('order', { code: o.code })}
                          </Heading>
                          <Text style={styles.text}>
                            {t(o.status)} · {formatMoney(o.total)}
                          </Text>
                          <Button
                            label={t('openOrder', { code: o.code })}
                            onPress={() => setSelected(o.id)}
                          />
                        </Card>
                      ))
                  )}
                </>
              )}
            </>
          )}
        </>
      ) : null}
    </>
  );
}
function Orders() {
  const { t } = useT(purchaseMessages);
  const remote = useRemote(loadProfile);
  const [branchId, setBranchId] = useState('');
  const branch =
    remote.data?.branches.find((b) => b.id === branchId) ??
    remote.data?.branches[0];
  return (
    <Screen>
      <ScreenHeader title={t('orders')} />
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
                selected={b.id === branch.id}
                onPress={() => setBranchId(b.id)}
              />
            ))}
          </View>
          <BranchOrders
            key={branch.id}
            branch={branch}
            staffId={remote.data.staff.id}
            manager={['owner', 'manager'].includes(remote.data.staff.role)}
          />
        </>
      ) : null}
    </Screen>
  );
}
export default function StaffOrdersScreen() {
  return (
    <AccessGate kind="staff">
      <Orders />
    </AccessGate>
  );
}
