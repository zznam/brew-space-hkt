import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { formatMoney, getVenue, type MenuItem } from '@/core';
import { catalogueMenu } from '@/core/catalogue/store';
import { currentMenu, useCatalogue } from '@/core/catalogue/useCatalogue';
import type { Item } from '@/core/pilot/types';
import {
  Badge,
  Banner,
  Button,
  Card,
  colors,
  Heading,
  styles,
  space,
} from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
import { catalogueMessages } from '../../catalogue/messages';
import { searchMenu } from './cartModel';
import { cartMessages } from './messages';
import { useCart } from './useCart';

function MenuItemRow({
  item,
  venueId,
  onAdd,
}: {
  item: Item;
  venueId: string;
  onAdd: (item: MenuItem) => void;
}) {
  const { t } = useT(catalogueMessages);
  const { t: cartT } = useT(cartMessages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const options = catalogueMenu({ items: [item] }, getVenue(venueId));
  const selected = options.find((o) => o.id === selectedId) ?? options[0];
  return (
    <View style={[styles.inset, { gap: space.sm }]}>
      <Text style={styles.textStrong}>{item.name}</Text>
      {item.sizes.length > 0 && (
        <>
          <Text style={styles.captionStrong}>
            {t('chooseSize', { name: item.name })}
          </Text>
          <View style={styles.row}>
            {options.map((option, n) => (
              <Button
                key={option.id}
                label={`${item.sizes[n]?.name} · ${formatMoney(option.price)}`}
                selected={selected?.id === option.id}
                onPress={() => setSelectedId(option.id)}
              />
            ))}
          </View>
        </>
      )}
      {selected && (
        <View style={styles.rowBetween}>
          <Text style={styles.text}>{formatMoney(selected.price)}</Text>
          <Button
            variant="secondary"
            label={cartT('addItem', { name: selected.name })}
            onPress={() => onAdd(selected)}
          />
        </View>
      )}
    </View>
  );
}

export function MenuList({ venueId }: { venueId: string }) {
  const { t } = useT(cartMessages);
  const { t: ct } = useT(catalogueMessages);
  const addItem = useCart((state) => state.addItem);
  const items = useCatalogue((s) => s.items);
  const categories = useCatalogue((s) => s.categories)
    .filter((c) => c.tenantId === venueId)
    .sort((a, b) => a.sort - b.sort);
  const issue = useCatalogue((s) => s.storageIssue);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ name: string; ok: boolean } | null>(
    null,
  );
  const menu = items.filter(
    (i) => i.tenantId === venueId && !i.soldOut && !i.archived,
  );
  const shown = searchMenu(
    menu.filter((i) => !category || category === i.categoryId),
    query,
  );
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Heading level={2}>{t('menuTitle')}</Heading>
        <Badge label={ct('count', { n: menu.length })} tone="neutral" />
      </View>
      {issue && (
        <Banner tone="warning" role="alert">
          {ct(issue === 'load' ? 'loadError' : 'saveError')}
        </Banner>
      )}
      {notice && (
        <Banner
          tone={notice.ok ? 'success' : 'warning'}
          role={notice.ok ? undefined : 'alert'}
        >
          {notice.ok ? ct('added', { name: notice.name }) : ct('unavailable')}
        </Banner>
      )}
      {menu.length === 0 && <Text style={styles.text}>{t('menuEmpty')}</Text>}
      {menu.length > 0 && (
        <>
          <TextInput
            placeholderTextColor={colors.subtle}
            accessibilityLabel={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { backgroundColor: colors.surface }]}
          />
          <Text style={styles.captionStrong}>{ct('filter')}</Text>
          <View style={styles.row}>
            <Button
              label={ct('all')}
              selected={!category}
              onPress={() => setCategory(null)}
            />
            {categories.map((c) => (
              <Button
                key={c.id}
                label={c.name}
                selected={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </View>
        </>
      )}
      {menu.length > 0 && shown.length === 0 && (
        <Text accessibilityRole="alert" style={styles.text}>
          {t('noMatch')}
        </Text>
      )}
      <View style={{ gap: space.sm }}>
        {shown.map((item) => (
          <MenuItemRow
            key={item.id}
            item={item}
            venueId={venueId}
            onAdd={(selection) => {
              const live = currentMenu(venueId).find(
                (m) => m.id === selection.id,
              );
              if (live) addItem(live);
              setNotice({ name: selection.name, ok: Boolean(live) });
            }}
          />
        ))}
      </View>
    </Card>
  );
}
