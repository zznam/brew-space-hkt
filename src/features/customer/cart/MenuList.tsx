import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { formatMoney, getVenue } from '@/core';
import { Button, colors, Heading, styles } from '@/components/ui';
import { searchMenu } from './cartModel';
import { useCart } from './useCart';

export function MenuList({ venueId }: { venueId: string }) {
  const addItem = useCart((state) => state.addItem);
  const [query, setQuery] = useState('');
  const menu = getVenue(venueId).menu;
  const shown = searchMenu(menu, query);
  return (
    <View style={{ gap: 10 }}>
      <Heading>Menu</Heading>
      {menu.length === 0 && (
        <Text style={styles.text}>No menu items at this venue yet.</Text>
      )}
      {menu.length > 0 && (
        <TextInput
          accessibilityLabel="Search menu"
          placeholder="Search the menu"
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
          No items match
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
          <Button label={`Add ${item.name}`} onPress={() => addItem(item)} />
        </View>
      ))}
    </View>
  );
}
