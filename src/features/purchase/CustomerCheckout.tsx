import { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import {
  apiCommand,
  customerCommand,
  requestKey,
  type PublicMenu,
} from '@/api/client';
import type { Input, Output } from '@/core/pilot/engine';
import { estimateCatalogueCart, formatMoney } from '@/core/billing';
import {
  Banner,
  Button,
  Card,
  CollapsibleSection,
  Chip,
  EmptyState,
  Heading,
  TextField,
  space,
  styles,
} from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { useRemote, useTask } from '@/features/access/shared';
import { purchaseMessages } from './messages';
import { PurchaseError, useRefresh } from './shared';
import {
  forgetGuestOrder,
  readGuestOrder,
  rememberGuestOrder,
  type GuestOrder,
} from './guestCheckout';

type Menu = PublicMenu;
type CartLine = Input<'createQuote'>['lines'][number];
function MenuItem({
  item,
  add,
}: {
  item: Menu['items'][number];
  add: (line: CartLine) => void;
}) {
  const { t } = useT(purchaseMessages);
  const [size, setSize] = useState(item.sizes[0]?.id);
  const [modifiers, setModifiers] = useState<CartLine['modifiers']>([]);
  return (
    <Card>
      <Heading level={2}>{item.name}</Heading>
      {item.limited ? <Text style={styles.caption}>{t('limited')}</Text> : null}
      {item.sizes.length ? (
        <View style={styles.row}>
          {item.sizes.map((s) => (
            <Chip
              key={s.id}
              label={`${s.name} · ${formatMoney(s.price)}`}
              selected={size === s.id}
              onPress={() => setSize(s.id)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.text}>{formatMoney(item.price)}</Text>
      )}
      {item.modifierGroups.map((group) => (
        <View key={group.id} style={{ gap: space.sm }}>
          <Text style={styles.captionStrong}>{group.name}</Text>
          <View style={styles.row}>
            {group.options.map((option) => (
              <Chip
                key={option.id}
                label={`${option.name} · +${formatMoney(option.priceDelta)}`}
                selected={modifiers?.some(
                  (m) => m.groupId === group.id && m.optionId === option.id,
                )}
                onPress={() =>
                  setModifiers((current) => [
                    ...(current ?? []).filter((m) => m.groupId !== group.id),
                    ...((current ?? []).some(
                      (m) => m.groupId === group.id && m.optionId === option.id,
                    )
                      ? []
                      : [{ groupId: group.id, optionId: option.id }]),
                  ])
                }
              />
            ))}
          </View>
        </View>
      ))}
      <Button
        label={t('add', { name: item.name })}
        onPress={() =>
          add({
            itemId: item.id,
            sizeId: size,
            modifiers,
            quantity: 1,
            note: '',
          })
        }
      />
    </Card>
  );
}
function OrderProgress({
  orderId,
  token,
  menu,
  restart,
}: {
  orderId: string;
  token: string;
  menu: Menu;
  restart: () => void;
}) {
  const { t } = useT(purchaseMessages);
  const load = useCallback(
    () => customerCommand('getOrder', { orderId }, token),
    [orderId, token],
  );
  const remote = useRemote(load);
  useRefresh(remote.reload);
  const task = useTask();
  const [reason, setReason] = useState('');
  const [key] = useState(requestKey);
  const order = remote.data?.order;
  const pending = remote.data?.payments.some((p) =>
    ['initiated', 'pending'].includes(p.status),
  );
  const latest = remote.data?.payments.at(-1);
  const canRedirect = readGuestOrder(menu.branch.id)?.id === orderId;
  return (
    <Card>
      {order ? (
        <>
          <Heading>{t('order', { code: order.code })}</Heading>
          <Banner>{t(order.status)}</Banner>
          <Text style={styles.text}>{t('orderKeep')}</Text>
          {order.status === 'awaiting_payment' && !pending ? (
            <Text style={styles.text}>{t('payHint')}</Text>
          ) : null}
          {pending ? <Banner>{t('verifying')}</Banner> : null}
          {order.notices.some((n) =>
            ['late_payment', 'excess_payment'].includes(n),
          ) ? (
            <Banner>{t('refundQueued')}</Banner>
          ) : null}
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
          {remote.data?.tickets.map((ticket, i) => (
            <Banner key={i}>{t(ticket.status)}</Banner>
          ))}
          {order.status === 'awaiting_payment' &&
          menu.onlinePaymentAvailable ? (
            <>
              {!canRedirect ? <Banner>{t('storageRequired')}</Banner> : null}
              <Button
                label={t(pending ? 'continuePayment' : 'payOnline')}
                variant="primary"
                disabled={task.busy || !canRedirect}
                onPress={() =>
                  void task.run(async () => {
                    const result = pending
                      ? await customerCommand(
                          'resumeOnlinePayment',
                          { orderId },
                          token,
                        )
                      : await customerCommand(
                          'startOnlinePayment',
                          {
                            orderId,
                            idempotencyKey: `online-${orderId}-${latest?.id ?? 'first'}`,
                          },
                          token,
                        );
                    remote.reload();
                    if (result.checkoutUrl) {
                      if (typeof window !== 'undefined')
                        window.location.assign(result.checkoutUrl);
                      else await Linking.openURL(result.checkoutUrl);
                    }
                  })
                }
              />
            </>
          ) : null}
          {order.status === 'awaiting_payment' && !pending ? (
            <>
              <TextField
                label={t('cancelReason')}
                value={reason}
                onChangeText={setReason}
                editable={!task.busy}
              />
              <Button
                label={t('cancel')}
                disabled={task.busy || !reason.trim()}
                onPress={() =>
                  void task.run(async () => {
                    await customerCommand(
                      'cancelOrder',
                      { orderId, reason, idempotencyKey: key },
                      token,
                    );
                    remote.reload();
                  })
                }
              />
            </>
          ) : null}
          {['completed', 'cancelled'].includes(order.status) ? (
            <Button label={t('newOrder')} onPress={restart} />
          ) : null}
        </>
      ) : null}
      <PurchaseError code={remote.error ?? task.error} />
      <Button
        label={t('recheck')}
        disabled={remote.loading}
        onPress={() =>
          void task.run(async () => {
            await customerCommand('recheckPayment', { orderId }, token);
            remote.reload();
          })
        }
      />
    </Card>
  );
}
export function CustomerCheckout({
  menu,
  category,
  onCounterOrder,
}: {
  menu: Menu;
  category: string | null;
  onCounterOrder?: (id: string) => void;
}) {
  const { t } = useT(purchaseMessages);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [voucher, setVoucher] = useState('');
  const [saleId, setSaleId] = useState<string | null>(null);
  const [quoted, setQuoted] = useState<{
    result: Output<'createQuote'>;
    key: string;
  } | null>(null);
  const [order, setOrder] = useState<GuestOrder | null>(() =>
    onCounterOrder ? null : readGuestOrder(menu.branch.id),
  );
  const task = useTask();
  const estimate = estimateCatalogueCart(menu.items, cart);
  const quote = () =>
    task.run(async () => {
      const promotion: Input<'createQuote'>['promotion'] = saleId
        ? { kind: 'flash_sale', id: saleId }
        : voucher.trim()
          ? { kind: 'voucher', code: voucher.trim() }
          : undefined;
      const input = { branchId: menu.branch.id, lines: cart, promotion };
      const result = onCounterOrder
        ? await apiCommand('createQuote', input)
        : await customerCommand('createQuote', input);
      setQuoted({ result, key: requestKey() });
    });
  if (order)
    return (
      <OrderProgress
        orderId={order.id}
        token={order.token}
        menu={menu}
        restart={() => {
          forgetGuestOrder(menu.branch.id);
          setOrder(null);
          setQuoted(null);
          setCart([]);
        }}
      />
    );
  if (!quoted && !cart.length && !menu.items.length) return null;
  if (quoted)
    return (
      <Card>
        <Heading>{t('quote')}</Heading>
        {quoted.result.quote.lines.map((line) => (
          <Text key={line.id} style={styles.text}>
            {line.quantity} × {line.name}
            {line.sizeName ? ` · ${line.sizeName}` : ''} ·{' '}
            {formatMoney(line.lineTotal)}
          </Text>
        ))}
        {quoted.result.quote.fees.map((fee) => (
          <Text key={fee.feeId} style={styles.text}>
            {fee.name} · {formatMoney(fee.amount)}
          </Text>
        ))}
        {quoted.result.quote.promotion ? (
          <Text style={styles.text}>
            {quoted.result.quote.promotion.label} · −
            {formatMoney(quoted.result.quote.discount)}
          </Text>
        ) : null}
        <Text style={styles.textStrong}>
          {t('total')} · {formatMoney(quoted.result.quote.total)}
        </Text>
        <Text style={styles.caption}>{t('expires')}</Text>
        <Text style={styles.caption}>{t('quoteSafe')}</Text>
        <Button
          label={t(onCounterOrder ? 'createOrder' : 'accept')}
          variant="primary"
          disabled={task.busy}
          onPress={() =>
            void task.run(async () => {
              const input = {
                quoteId: quoted.result.quote.id,
                idempotencyKey: quoted.key,
              };
              const result = onCounterOrder
                ? await apiCommand('createOrder', input)
                : await customerCommand(
                    'createOrder',
                    input,
                    quoted.result.quoteToken!,
                  );
              if (onCounterOrder) onCounterOrder(result.id);
              else {
                const saved = {
                  id: result.id,
                  token: quoted.result.quoteToken!,
                  expiresAt: result.accessExpiresAt,
                };
                rememberGuestOrder(menu.branch.id, saved);
                setOrder(saved);
              }
            })
          }
        />
        <PurchaseError code={task.error} />
        <Button
          label={t('refresh')}
          disabled={task.busy}
          onPress={() => void quote()}
        />
        <Button
          label={t('back')}
          disabled={task.busy}
          onPress={() => setQuoted(null)}
        />
      </Card>
    );
  const items = menu.items.filter(
    (i) => category === null || i.categoryId === category,
  );
  return (
    <>
      {items.map((item) => (
        <MenuItem
          key={item.id}
          item={item}
          add={(line) => setCart((lines) => [...lines, line])}
        />
      ))}
      <Card>
        <Heading>{t('cart')}</Heading>
        {cart.length ? (
          <CollapsibleSection title={t('offer')} summary={t('oneOffer')}>
            <TextField
              label={t('voucher')}
              value={voucher}
              onChangeText={(value) => {
                setVoucher(value);
                setSaleId(null);
              }}
            />
            <View style={styles.row}>
              <Chip
                label={t('noOffer')}
                selected={!saleId && !voucher}
                onPress={() => {
                  setSaleId(null);
                  setVoucher('');
                }}
              />
              {menu.sales.map((sale) => (
                <Chip
                  key={sale.id}
                  label={`${sale.name} · ${sale.discountPercent}%`}
                  selected={saleId === sale.id}
                  onPress={() => {
                    setSaleId(sale.id);
                    setVoucher('');
                  }}
                />
              ))}
            </View>
          </CollapsibleSection>
        ) : null}
        {!cart.length ? (
          <EmptyState message={t('empty')} />
        ) : (
          cart.map((line, index) => {
            const item = menu.items.find((i) => i.id === line.itemId);
            const name = `${item?.name ?? t('unavailableItem')}${line.sizeId && item ? ` · ${item.sizes.find((s) => s.id === line.sizeId)?.name ?? ''}` : ''}`;
            return (
              <View key={index} style={[styles.inset, { gap: space.sm }]}>
                <Text style={styles.textStrong}>{name}</Text>
                <TextField
                  label={t('quantity', { name })}
                  numeric
                  value={String(line.quantity)}
                  onChangeText={(value) =>
                    setCart((lines) =>
                      lines.map((l, i) =>
                        i === index
                          ? {
                              ...l,
                              quantity: /^\d+$/.test(value) ? Number(value) : 0,
                            }
                          : l,
                      ),
                    )
                  }
                />
                <TextField
                  label={t('note', { name })}
                  value={line.note ?? ''}
                  onChangeText={(note) =>
                    setCart((lines) =>
                      lines.map((l, i) => (i === index ? { ...l, note } : l)),
                    )
                  }
                />
                <Button
                  label={t('remove', { name })}
                  onPress={() =>
                    setCart((lines) => lines.filter((_, i) => i !== index))
                  }
                />
              </View>
            );
          })
        )}
        {cart.length && estimate !== null ? (
          <Text style={styles.textStrong}>
            {t('estimated')} · {formatMoney(estimate)}
          </Text>
        ) : null}
        <Button
          label={t('review')}
          variant="primary"
          disabled={task.busy || !cart.length || estimate === null}
          onPress={() => void quote()}
        />
        <PurchaseError code={task.error} />
      </Card>
    </>
  );
}
