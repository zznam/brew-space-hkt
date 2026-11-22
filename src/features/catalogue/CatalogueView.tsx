import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { formatMoney } from '@/core';
import {
  formInput,
  itemForm,
  nextSizeId,
  type ItemForm,
} from '@/core/catalogue/form';
import type { CatalogueResult } from '@/core/catalogue/store';
import {
  Banner,
  Badge,
  Button,
  Card,
  EmptyState,
  Heading,
  Screen,
  ScreenHeader,
  SegmentedControl,
  space,
  styles,
  TextField as Field,
} from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { catalogueMessages } from './messages';
import type { Category, Item } from '@/core/pilot/types';
import type { ItemInput } from '@/core/pilot/catalogue';

type Result = CatalogueResult | Promise<CatalogueResult>;
export interface CatalogueActions {
  saveItem: (input: ItemInput) => Result;
  saveCategory: (input: { id?: string; name: string; sort: number }) => Result;
  archiveItem: (itemId: string) => Result;
  setSoldOut: (itemId: string, soldOut: boolean) => Result;
}
export function CatalogueView({
  venueName,
  items,
  categories,
  issue = null,
  actions,
  canEdit = true,
  live = false,
}: {
  venueName: string;
  items: Item[];
  categories: Category[];
  issue?: 'load' | 'save' | null;
  actions: CatalogueActions;
  canEdit?: boolean;
  live?: boolean;
}) {
  const { t } = useT(catalogueMessages);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [form, setForm] = useState<ItemForm | null>(null);
  const [categoryMode, setCategoryMode] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [categoryName, setCategoryName] = useState('');
  const [notice, setNotice] = useState<
    keyof typeof catalogueMessages.en | null
  >(null);
  const [failed, setFailed] = useState(false);
  const result = async (
    action: () => Result,
    success: 'saved' | 'updated' | 'archived',
  ) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    try {
      const r = await action();
      setFailed(!r.ok);
      setNotice(
        r.ok
          ? success
          : r.code === 'VALIDATION' || r.code === 'NOT_FOUND'
            ? 'invalid'
            : r.code === 'FORBIDDEN'
              ? 'denied'
              : r.code === 'NETWORK'
                ? 'network'
                : 'failed',
      );
      return r.ok;
    } catch {
      setFailed(true);
      setNotice('failed');
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const patch = (values: Partial<ItemForm>) =>
    setForm((f) => (f ? { ...f, ...values } : null));
  return (
    <Screen>
      <ScreenHeader
        title={t('title')}
        overline={venueName}
        subtitle={t(live ? 'liveSubtitle' : 'subtitle')}
      />
      {issue && (
        <Banner tone="warning" role="alert">
          {t(issue === 'load' ? 'loadError' : 'saveError')}
        </Banner>
      )}
      {notice && (
        <Banner
          tone={failed ? 'danger' : 'success'}
          role={failed ? 'alert' : undefined}
        >
          {t(notice)}
        </Banner>
      )}
      {form ? (
        <Card>
          <Heading>{t(form.id ? 'editTitle' : 'createTitle')}</Heading>
          <Field
            editable={!busy}
            label={t('name')}
            value={form.name}
            onChangeText={(name) => patch({ name })}
          />
          <Text style={styles.captionStrong}>{t('category')}</Text>
          <View style={styles.row}>
            {categories.map((c) => (
              <Button
                disabled={busy}
                key={c.id}
                label={c.name}
                selected={form.categoryId === c.id}
                onPress={() => patch({ categoryId: c.id })}
              />
            ))}
          </View>
          {!categories.length && <EmptyState message={t('noCategory')} />}
          <Field
            editable={!busy}
            label={t('price')}
            value={form.price}
            numeric
            onChangeText={(price) => patch({ price })}
          />
          <Text style={styles.captionStrong}>{t('type')}</Text>
          <SegmentedControl
            value={form.kind}
            options={[
              { value: 'food_drink', label: t('foodDrink') },
              { value: 'service', label: t('service') },
            ]}
            onChange={(kind) => patch({ kind })}
          />
          {form.kind === 'service' && (
            <Button
              disabled={busy}
              label={t('limited')}
              selected={form.limited}
              onPress={() => patch({ limited: !form.limited })}
            />
          )}
          <Heading level={2}>{t('sizes')}</Heading>
          {form.sizes.map((s, n) => (
            <View key={s.id} style={[styles.inset, { gap: space.sm }]}>
              <Field
                editable={!busy}
                label={t('sizeName', { n: n + 1 })}
                value={s.name}
                onChangeText={(name) =>
                  patch({
                    sizes: form.sizes.map((row) =>
                      row.id === s.id ? { ...row, name } : row,
                    ),
                  })
                }
              />
              <Field
                editable={!busy}
                label={t('sizePrice', { n: n + 1 })}
                value={s.price}
                numeric
                onChangeText={(price) =>
                  patch({
                    sizes: form.sizes.map((row) =>
                      row.id === s.id ? { ...row, price } : row,
                    ),
                  })
                }
              />
              <Button
                disabled={busy}
                label={t('removeSize', { n: n + 1 })}
                variant="ghost"
                onPress={() =>
                  patch({ sizes: form.sizes.filter((row) => row.id !== s.id) })
                }
              />
            </View>
          ))}
          <Button
            disabled={busy}
            label={t('addSize')}
            onPress={() =>
              patch({
                sizes: [
                  ...form.sizes,
                  { id: nextSizeId(form.sizes), name: '', price: '' },
                ],
              })
            }
          />
          <Button
            label={t('save')}
            variant="primary"
            disabled={busy || !categories.length}
            onPress={async () => {
              if (
                await result(() => actions.saveItem(formInput(form)), 'saved')
              )
                setForm(null);
            }}
          />
          <Button
            disabled={busy}
            label={t('cancel')}
            variant="ghost"
            onPress={() => {
              setForm(null);
              setNotice(null);
            }}
          />
        </Card>
      ) : categoryMode ? (
        <Card>
          <Heading>{t('categoryTitle')}</Heading>
          {!categories.length && <EmptyState message={t('emptyCategories')} />}
          {categories.map((c) => (
            <Button
              disabled={busy}
              key={c.id}
              label={t('editCategory', { name: c.name })}
              onPress={() => {
                setCategoryId(c.id);
                setCategoryName(c.name);
                setNotice(null);
              }}
            />
          ))}
          <Button
            disabled={busy}
            label={t('newCategory')}
            onPress={() => {
              setCategoryId(undefined);
              setCategoryName('');
            }}
          />
          <Field
            editable={!busy}
            label={t('categoryName')}
            value={categoryName}
            onChangeText={setCategoryName}
          />
          <Button
            disabled={busy}
            label={t('saveCategory')}
            variant="primary"
            onPress={async () => {
              const sort =
                categories.find((c) => c.id === categoryId)?.sort ??
                categories.length;
              if (
                await result(
                  () =>
                    actions.saveCategory({
                      id: categoryId,
                      name: categoryName,
                      sort,
                    }),
                  'saved',
                )
              ) {
                setCategoryId(undefined);
                setCategoryName('');
              }
            }}
          />
          <Button
            disabled={busy}
            label={t('back')}
            variant="ghost"
            onPress={() => {
              setCategoryMode(false);
              setNotice(null);
            }}
          />
        </Card>
      ) : (
        <>
          {canEdit ? (
            <>
              <Button
                disabled={busy}
                label={t('newItem')}
                variant="primary"
                onPress={() => {
                  setForm(itemForm(undefined, categories[0]?.id));
                  setNotice(null);
                }}
              />
              <Button
                disabled={busy}
                label={t('categories')}
                onPress={() => {
                  setCategoryMode(true);
                  setNotice(null);
                }}
              />
            </>
          ) : null}
          {!items.length && <EmptyState message={t('empty')} />}
          {items.map((item) => (
            <Card key={item.id}>
              <View style={styles.rowBetween}>
                <Heading level={2}>{item.name}</Heading>
                <Badge
                  label={t(item.soldOut ? 'soldOut' : 'available')}
                  tone={item.soldOut ? 'danger' : 'success'}
                />
              </View>
              <Text style={styles.caption}>
                {categories.find((c) => c.id === item.categoryId)?.name}
              </Text>
              <Text style={styles.text}>
                {item.sizes.length
                  ? item.sizes
                      .map((s) => `${s.name} · ${formatMoney(s.price)}`)
                      .join('\n')
                  : formatMoney(item.price)}
              </Text>
              {canEdit ? (
                <Button
                  disabled={busy}
                  label={t('editItem', { name: item.name })}
                  onPress={() => {
                    setForm(itemForm(item));
                    setNotice(null);
                  }}
                />
              ) : null}
              <Button
                disabled={busy}
                label={t(item.soldOut ? 'restore' : 'markSoldOut', {
                  name: item.name,
                })}
                onPress={() =>
                  result(
                    () => actions.setSoldOut(item.id, !item.soldOut),
                    'updated',
                  )
                }
              />
              {canEdit ? (
                <Button
                  disabled={busy}
                  label={t('archive', { name: item.name })}
                  variant="ghost"
                  onPress={() =>
                    result(() => actions.archiveItem(item.id), 'archived')
                  }
                />
              ) : null}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
