import { Pressable, Text, View } from 'react-native';
import { formatMoney, type MenuItem, type Venue } from '@/core';
import { Badge, Button, colors, styles } from '@/components/ui';

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
    <View style={styles.grid}>
      {venue.menu.map((item) => {
        const soldOut = soldOutItemIds.includes(item.id);
        return (
          <View
            key={item.id}
            style={{
              width: 240,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: soldOut ? colors.dangerBorder : colors.border,
              backgroundColor: soldOut
                ? colors.dangerSurface
                : colors.surfaceSubtle,
              gap: 10,
            }}
          >
            <View style={styles.rowBetween}>
              <Badge
                label={soldOut ? 'Sold out' : 'Available'}
                tone={soldOut ? 'danger' : 'success'}
              />
              <Text
                style={{
                  fontWeight: '700',
                  color: colors.ink,
                  fontSize: 14,
                }}
              >
                {formatMoney(item.price)}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${formatMoney(item.price)}${soldOut ? ', Sold out' : ''}`}
              accessibilityState={{ disabled: soldOut }}
              disabled={soldOut}
              onPress={() => onAdd(item)}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: soldOut ? colors.paperAlt : colors.green,
                  borderColor: soldOut ? colors.border : colors.green,
                  opacity: soldOut ? 0.45 : pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: '700',
                  color: soldOut ? colors.ink : '#ffffff',
                }}
              >
                {item.name} · {formatMoney(item.price)}
              </Text>
            </Pressable>

            <Button
              size="sm"
              variant={soldOut ? 'default' : 'ghost'}
              label={soldOut ? 'Lift sold out' : 'Mark sold out'}
              onPress={() => onToggleSoldOut(item.id)}
            />
          </View>
        );
      })}
    </View>
  );
}
