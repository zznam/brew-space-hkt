import { Pressable, Text, View } from 'react-native';
import { formatMoney, type MenuItem, type Venue } from '@/core';
import {
  Badge,
  Button,
  colors,
  EmptyState,
  Icon,
  layout,
  motion,
  space,
  styles,
  useResponsive,
} from '@/components/ui';

export interface MenuGridProps {
  venue: Venue;
  soldOutItemIds: string[];
  onAdd: (item: MenuItem) => void;
  onToggleSoldOut: (menuItemId: string) => void;
}

/** One row per item: tap the item to add it; the stock toggle sits beside it. */
export function MenuGrid({
  venue,
  soldOutItemIds,
  onAdd,
  onToggleSoldOut,
}: MenuGridProps) {
  const { isWide } = useResponsive();
  if (venue.menu.length === 0) {
    return <EmptyState message="No menu items yet." />;
  }
  return (
    <View
      style={{
        flexDirection: isWide ? 'row' : 'column',
        flexWrap: isWide ? 'wrap' : 'nowrap',
        gap: space.sm,
      }}
    >
      {venue.menu.map((item) => {
        const soldOut = soldOutItemIds.includes(item.id);
        return (
          <View
            key={item.id}
            style={[
              styles.inset,
              styles.insetRow,
              {
                width: isWide ? 300 : '100%',
                flexGrow: isWide ? 1 : 0,
                flexWrap: 'nowrap',
                gap: space.sm,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${formatMoney(item.price)}${soldOut ? ', Sold out' : ''}`}
              accessibilityState={{ disabled: soldOut }}
              disabled={soldOut}
              onPress={() => onAdd(item)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: layout.touchTarget,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                opacity: soldOut
                  ? motion.disabledOpacity
                  : pressed
                    ? motion.pressedOpacity
                    : 1,
              })}
            >
              <Icon name="order" color={colors.green} />
              <View style={{ flex: 1, gap: space.xxs }}>
                <Text style={styles.textStrong} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.caption}>{formatMoney(item.price)}</Text>
              </View>
            </Pressable>
            <View style={{ alignItems: 'flex-end', gap: space.xs }}>
              {soldOut ? <Badge label="Sold out" tone="danger" /> : null}
              <Button
                size="sm"
                variant="ghost"
                label={soldOut ? 'Lift sold out' : 'Mark sold out'}
                onPress={() => onToggleSoldOut(item.id)}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
