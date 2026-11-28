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
import { useT } from '@/i18n/useLanguage';
import { merchantMessages } from '../messages';
import { favouritesFirst } from './posStore';

export interface MenuGridProps {
  venue: Venue;
  soldOutItemIds: string[];
  pinnedItemIds?: string[];
  onAdd: (item: MenuItem) => void;
  onToggleSoldOut: (menuItemId: string) => void;
  onTogglePinned?: (menuItemId: string) => void;
}

/** One row per item: tap the item to add it; the stock toggle sits beside it. */
export function MenuGrid({
  venue,
  soldOutItemIds,
  pinnedItemIds = [],
  onAdd,
  onToggleSoldOut,
  onTogglePinned,
}: MenuGridProps) {
  const { isWide } = useResponsive();
  const { t } = useT(merchantMessages);
  if (venue.menu.length === 0) {
    return <EmptyState message={t('noMenu')} />;
  }
  return (
    <View
      style={{
        flexDirection: isWide ? 'row' : 'column',
        flexWrap: isWide ? 'wrap' : 'nowrap',
        gap: space.sm,
      }}
    >
      {favouritesFirst(venue.menu, pinnedItemIds).map((item) => {
        const soldOut = soldOutItemIds.includes(item.id);
        const pinned = pinnedItemIds.includes(item.id);
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
              accessibilityLabel={t(soldOut ? 'itemA11ySoldOut' : 'itemA11y', {
                name: item.name,
                price: formatMoney(item.price),
              })}
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
              {pinned ? <Badge label={`★ ${t('pinned')}`} tone="info" /> : null}
              {soldOut ? <Badge label={t('soldOut')} tone="danger" /> : null}
              <Button
                size="sm"
                variant="ghost"
                label={soldOut ? t('liftSoldOut') : t('markSoldOut')}
                onPress={() => onToggleSoldOut(item.id)}
              />
              {onTogglePinned ? (
                <Button
                  size="sm"
                  variant="ghost"
                  label={pinned ? t('unpin') : t('pin')}
                  accessibilityLabel={`${pinned ? t('unpin') : t('pin')}: ${item.name}`}
                  onPress={() => onTogglePinned(item.id)}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
