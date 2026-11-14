import { Text, View } from 'react-native';
import { formatMoney, getVenue } from '@/core';
import { Button, colors, Heading, styles } from '@/components/ui';
import { useCart } from './useCart';

export function MenuList({ venueId }: { venueId: string }) {
  const addItem = useCart((state) => state.addItem);
  const menu = getVenue(venueId).menu;
  return (
    <View style={{ gap: 10 }}>
      <Heading>Menu</Heading>
      {menu.length === 0 && (
        <Text style={styles.text}>No menu items at this venue yet.</Text>
      )}
      {menu.map((item) => (
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
