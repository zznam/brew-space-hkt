import { Pressable, Text, View } from 'react-native';
import { formatMoney, type MenuItem, type Venue } from '@/core';
import { Button, styles } from '@/components/ui';

export interface MenuGridProps {
  venue: Venue;
  soldOutItemIds: string[];
  onAdd: (item: MenuItem) => void;
  onToggleSoldOut: (menuItemId: string) => void;
}

export function MenuGrid({
  venue,
  soldOutItemIds,
  onAdd,
  onToggleSoldOut,
}: MenuGridProps) {
  if (venue.menu.length === 0) {
    return <Text style={styles.text}>No menu items yet.</Text>;
  }
  return (
    <View style={styles.row}>
      {venue.menu.map((item) => {
        const soldOut = soldOutItemIds.includes(item.id);
        return (
          <View key={item.id} style={{ gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${formatMoney(item.price)}${soldOut ? ', Sold out' : ''}`}
              accessibilityState={{ disabled: soldOut }}
              disabled={soldOut}
              onPress={() => onAdd(item)}
              style={({ pressed }) => [
                styles.button,
                { opacity: soldOut ? 0.45 : pressed ? 0.65 : 1 },
              ]}
            >
              <Text style={{ fontWeight: '600' }}>
                {item.name} · {formatMoney(item.price)}
              </Text>
            </Pressable>
            <Button
              label={soldOut ? 'Lift sold out' : 'Mark sold out'}
              onPress={() => onToggleSoldOut(item.id)}
            />
          </View>
        );
      })}
    </View>
  );
}
