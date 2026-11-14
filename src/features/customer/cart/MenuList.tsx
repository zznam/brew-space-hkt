import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { formatMoney, getVenue } from '@/core';
import { Badge, Button, Card, colors, Heading, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { searchMenu } from './cartModel';
import { cartMessages } from './messages';
import { useCart } from './useCart';

export function MenuList({ venueId }: { venueId: string }) {
  const { t } = useT(cartMessages);
  const addItem = useCart((state) => state.addItem);
  const [query, setQuery] = useState('');
  const menu = getVenue(venueId).menu;
  const shown = searchMenu(menu, query);
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Heading level={2}>{t('menuTitle')}</Heading>
        <Badge label={`${menu.length} items`} tone="neutral" />
      </View>

      {menu.length === 0 && <Text style={styles.text}>{t('menuEmpty')}</Text>}

      {menu.length > 0 && (
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
      )}

      {menu.length > 0 && shown.length === 0 && (
        <Text accessibilityRole="alert" style={styles.text}>
          {t('noMatch')}
        </Text>
      )}

      <View style={{ gap: 8 }}>
        {shown.map((item) => (
          <View key={item.id} style={[styles.inset, styles.insetRow]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.textStrong}>{item.name}</Text>
              <Text style={styles.text}>{formatMoney(item.price)}</Text>
            </View>
            <Button
              size="sm"
              variant="secondary"
              label={t('addItem', { name: item.name })}
              onPress={() => addItem(item)}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}
