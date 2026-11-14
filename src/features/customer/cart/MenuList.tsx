import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { formatMoney, getVenue } from '@/core';
import { Button, colors, Heading, styles } from '@/components/ui';
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
    <View style={{ gap: 10 }}>
      <Heading>{t('menuTitle')}</Heading>
      {menu.length === 0 && <Text style={styles.text}>{t('menuEmpty')}</Text>}
      {menu.length > 0 && (
        <TextInput
          accessibilityLabel={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.ink,
          }}
        />
      )}
      {menu.length > 0 && shown.length === 0 && (
        <Text accessibilityRole="alert" style={styles.text}>
          {t('noMatch')}
        </Text>
      )}
      {shown.map((item) => (
        <View
          key={item.id}
          style={[
            styles.row,
            { justifyContent: 'space-between', flexWrap: 'nowrap' },
          ]}
        >
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color: colors.ink, fontWeight: '600' }}>
              {item.name}
            </Text>
            <Text style={styles.text}>{formatMoney(item.price)}</Text>
          </View>
          <Button
            label={t('addItem', { name: item.name })}
            onPress={() => addItem(item)}
          />
        </View>
      ))}
    </View>
  );
}
