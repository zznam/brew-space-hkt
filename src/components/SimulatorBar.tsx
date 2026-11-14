import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { getAllVenues } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { useT } from '@/i18n/useLanguage';
import { shellMessages } from './messages';
import { Chip, colors, radius, SegmentedControl, space, styles } from './ui';

/**
 * Demo controls, kept to one horizontally scrolling strip so the product
 * screens own the viewport: role, venue, scenario, time and reset.
 */
export function SimulatorBar() {
  const store = useAppStore((state) => state);
  const { t } = useT(shellMessages);
  const allVenues = getAllVenues(store.customVenues);

  return (
    <View
      style={{
        backgroundColor: colors.paperAlt,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          alignItems: 'center',
          gap: space.sm,
          paddingHorizontal: space.lg,
          paddingVertical: space.sm,
        }}
      >
        <Text style={styles.sectionLabel}>{t('demo')}</Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
          }}
        >
          <SegmentedControl
            size="sm"
            value={store.role}
            options={[
              { value: 'merchant', label: t('merchant') },
              { value: 'customer', label: t('customer') },
            ]}
            onChange={(role) => {
              store.setRole(role);
              router.replace(
                role === 'merchant'
                  ? '/merchant/live-floor'
                  : '/customer/explore',
              );
            }}
          />
        </View>
        {allVenues.map((venue) => (
          <Chip
            key={venue.id}
            label={venue.name}
            selected={store.venueId === venue.id}
            onPress={() => store.setVenue(venue.id)}
          />
        ))}
        <Chip
          label={t('morning')}
          selected={store.scenario === 'morning'}
          onPress={() => store.setScenario('morning')}
        />
        <Chip
          label={t('afternoon')}
          selected={store.scenario === 'afternoon'}
          onPress={() => store.setScenario('afternoon')}
        />
        <Chip label={t('advance')} onPress={store.advanceTime} />
        <Chip
          label={t('reset')}
          onPress={() => {
            store.reset();
            router.replace('/merchant/live-floor');
          }}
        />
      </ScrollView>
    </View>
  );
}
