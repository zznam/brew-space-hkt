import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { apiCommand } from '@/api/client';
import {
  Banner,
  Button,
  Card,
  Chip,
  EmptyState,
  Heading,
  Screen,
  ScreenHeader,
  styles,
} from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import {
  AccessGate,
  RemoteState,
  useRemote,
  useTask,
} from '@/features/access/shared';
import { purchaseMessages } from './messages';
import { PurchaseError, useRefresh } from './shared';
import { sortTicketsByAge, ticketAge } from './ticketAge';
import { arrivedTickets, playChime } from './newTickets';

const loadProfile = () => apiCommand('me', undefined);
/** Current time, refreshed on an interval so ticket ages advance between reloads. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
function BranchTickets({ branchId }: { branchId: string }) {
  const { t } = useT(purchaseMessages);
  const load = useCallback(
    () => apiCommand('listTickets', { branchId }),
    [branchId],
  );
  const remote = useRemote(load);
  useRefresh(remote.reload);
  const task = useTask();
  const now = useNow(30_000);
  const tickets = sortTicketsByAge(
    remote.data?.filter(
      (ticket) => !['served', 'cancelled'].includes(ticket.status),
    ) ?? [],
    now,
  );
  // F161: announce tickets that arrive while the screen is open; sound is opt-in.
  const seen = useRef<Set<string> | null>(null);
  const [arrived, setArrived] = useState<string[]>([]);
  const [sound, setSound] = useState(false);
  useEffect(() => {
    if (!remote.data) return;
    const fresh = arrivedTickets(seen.current, remote.data);
    seen.current = new Set(remote.data.map((ticket) => ticket.id));
    if (!fresh.length) return;
    setArrived((current) => [
      ...current,
      ...fresh.map((ticket) => ticket.orderCode),
    ]);
    if (sound) playChime();
  }, [remote.data, sound]);
  return (
    <>
      <RemoteState
        loading={!remote.data && remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      <PurchaseError code={task.error} />
      <Chip
        label={sound ? `✓ ${t('soundAlerts')}` : t('soundAlerts')}
        selected={sound}
        onPress={() => setSound((on) => !on)}
      />
      {arrived.length ? (
        <>
          <Banner tone="info" role="alert">
            {t('newTickets', { codes: arrived.join(', ') })}
          </Banner>
          <Button label={t('gotIt')} onPress={() => setArrived([])} />
        </>
      ) : null}
      {!tickets.length && remote.data ? (
        <EmptyState title={t('noTickets')} message={t('noTicketsBody')} />
      ) : (
        tickets.map((ticket) => {
          const next =
            ticket.status === 'queued'
              ? 'preparing'
              : ticket.status === 'preparing'
                ? 'ready'
                : 'served';
          const age = ticketAge(ticket.createdAt, now);
          return (
            <Card key={ticket.id}>
              <Heading>{t('order', { code: ticket.orderCode })}</Heading>
              <Banner>{t(ticket.status)}</Banner>
              {age.overdue ? (
                <Banner tone="warning">
                  {t('overdue', { minutes: age.minutes })}
                </Banner>
              ) : (
                <Text style={styles.caption}>
                  {t('waiting', { minutes: age.minutes })}
                </Text>
              )}
              <Text style={styles.caption}>
                {ticket.destination === 'Counter'
                  ? t('counter')
                  : ticket.destination}
              </Text>
              {ticket.lines.map((line, i) => (
                <View key={i}>
                  <Text style={styles.textStrong}>
                    {line.quantity} × {line.name}
                  </Text>
                  {line.detail ? (
                    <Text style={styles.text}>{line.detail}</Text>
                  ) : null}
                  {line.note ? (
                    <Text style={styles.text}>{line.note}</Text>
                  ) : null}
                  {line.limited && !line.confirmed ? (
                    <Button
                      label={t('confirmService', { name: line.name })}
                      disabled={task.busy}
                      onPress={() =>
                        void task.run(async () => {
                          await apiCommand('confirmService', {
                            ticketId: ticket.id,
                            lineIndex: i,
                          });
                          remote.reload();
                        })
                      }
                    />
                  ) : null}
                </View>
              ))}
              <Button
                label={t(
                  next === 'preparing'
                    ? 'prepare'
                    : next === 'ready'
                      ? 'markReady'
                      : 'markServed',
                )}
                disabled={
                  task.busy ||
                  ticket.lines.some((l) => l.limited && !l.confirmed)
                }
                onPress={() =>
                  void task.run(async () => {
                    await apiCommand('advanceTicket', {
                      ticketId: ticket.id,
                      status: next,
                    });
                    remote.reload();
                  })
                }
              />
            </Card>
          );
        })
      )}
      <Button label={t('recheck')} onPress={remote.reload} />
    </>
  );
}
function Tickets() {
  const { t } = useT(purchaseMessages);
  const remote = useRemote(loadProfile);
  const [branchId, setBranchId] = useState('');
  const branch =
    remote.data?.branches.find((b) => b.id === branchId) ??
    remote.data?.branches[0];
  return (
    <Screen>
      <ScreenHeader title={t('tickets')} />
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
          <BranchTickets key={branch.id} branchId={branch.id} />
        </>
      ) : null}
    </Screen>
  );
}
export default function StaffTicketsScreen() {
  return (
    <AccessGate kind="staff">
      <Tickets />
    </AccessGate>
  );
}
