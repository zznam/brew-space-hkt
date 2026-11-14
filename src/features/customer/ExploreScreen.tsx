import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { formatMoney, getVenue, type BillingMode, type Seat } from '@/core';
import { appStore, useAppStore } from '@/core/useAppStore';
import { SeatMap } from '@/components/SeatMap';
import { Button, Card, Heading, styles } from '@/components/ui';
import {
  describeOccupancy,
  filterSeats,
  hasActiveFilters,
  modeLabel,
  noFilters,
  occupancySummary,
  usualSuggestion,
  type SeatFilters,
} from './explore/exploreModel';
import { useT } from './i18n/useLanguage';
import { favouriteSeatIds } from './loyalty/loyaltyModel';
import { loyaltyWarningText } from './loyalty/messages';
import { useLoyalty, useLoyaltyReady } from './loyalty/useLoyalty';
import { CustomerNav } from './shared/CustomerNav';
import {
  descriptionText,
  exploreMessages,
  startErrorText,
} from './explore/messages';
import { parseSeatLink } from './venue/deepLink';
import { kindName, kindWord, seatLabelText } from './venue/messages';
import { AMENITIES, amenityLabel, type Amenity } from './venue/seatAmenities';
import { SeatDetailCard } from './venue/SeatDetailCard';
import { VenuePage } from './venue/VenuePage';

const KINDS: Seat['kind'][] = ['desk', 'pod', 'booth'];
const EMPTY_VISITS: never[] = [];

export function ExploreScreen() {
  const { t, lang } = useT(exploreMessages);
  const seatText = (label: string) => seatLabelText(label, lang);
  const store = useAppStore((state) => state);
  const { ready, warning } = useLoyaltyReady();
  const loyalty = useLoyalty((state) => state);
  const venue = getVenue(store.venueId);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<SeatFilters>(noFilters());
  const [linkNotice, setLinkNotice] = useState('');
  const params = useLocalSearchParams<{ venue?: string; seat?: string }>();
  const appliedLink = useRef('');

  // F137: apply a shared seat link once per distinct set of params. The
  // notice is frozen at that moment (state adjusted during render); the store
  // calls run in an effect.
  const linkKey = `${String(params.venue ?? '')}|${String(params.seat ?? '')}`;
  const [seenLink, setSeenLink] = useState('');
  if (seenLink !== linkKey) {
    setSeenLink(linkKey);
    setLinkNotice(parseSeatLink(params, store.venueId, lang).notice ?? '');
  }
  useEffect(() => {
    if (appliedLink.current === linkKey) return;
    appliedLink.current = linkKey;
    const link = parseSeatLink(params, appStore.getState().venueId);
    if (link.venueId) appStore.getState().setVenue(link.venueId);
    if (link.seatId) appStore.getState().selectSeat(link.seatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run per link only
  }, [linkKey]);

  function start(mode: BillingMode) {
    const result = store.startSession(mode);
    if (!result.ok) setError(startErrorText(result.message, lang));
    else {
      setError('');
      router.push('/customer/active-session');
    }
  }
  function toggleAmenity(amenity: Amenity) {
    const current = filters.amenities ?? [];
    setFilters({
      ...filters,
      amenities: current.includes(amenity)
        ? current.filter((entry) => entry !== amenity)
        : [...current, amenity],
    });
  }
  function choose(id: string) {
    setError('');
    store.selectSeat(id);
  }

  if (!ready)
    return (
      <Card>
        <CustomerNav current="explore" />
        <Text accessibilityRole="alert" style={styles.text}>
          {t('loading')}
        </Text>
      </Card>
    );

  const visits = loyalty.visits.length ? loyalty.visits : EMPTY_VISITS;
  const favouriteIds = favouriteSeatIds(loyalty, venue.id);
  const summary = occupancySummary(venue, store.sessions);
  const visibleSeats = filterSeats(venue, store.sessions, filters);
  const filteredVenue = { ...venue, seats: visibleSeats };
  const usual = usualSuggestion(
    visits,
    venue,
    store.sessions,
    favouriteIds,
    lang,
  );
  const selectedSeat = venue.seats.find(
    (seat) => seat.id === store.selectedSeatId,
  );
  const selectedPinned = selectedSeat
    ? favouriteIds.includes(selectedSeat.id)
    : false;
  const rates = [...new Set(venue.seats.map((seat) => seat.hourlyRate))].sort(
    (a, b) => a - b,
  );
  // The highest rate would match every seat, so it is the same as "Any".
  const priceCaps = rates.slice(0, -1);
  const occupied = (id: string) =>
    store.sessions.some(
      (session) => session.venueId === venue.id && session.seatId === id,
    );

  return (
    <Card>
      <CustomerNav current="explore" />
      <Text style={{ color: venue.accent, fontWeight: '700' }}>
        {t('eyebrow')}
      </Text>
      <Heading>{venue.name}</Heading>
      <Text style={styles.text}>
        {t('intro', { description: descriptionText(venue.description, lang) })}
      </Text>
      {warning ? (
        <Text accessibilityRole="alert" style={styles.text}>
          {loyaltyWarningText(warning, lang)}
        </Text>
      ) : null}
      {linkNotice ? (
        <Text accessibilityRole="alert" style={styles.text}>
          {linkNotice}
        </Text>
      ) : null}
      <Text accessibilityLiveRegion="polite" style={styles.text}>
        {describeOccupancy(summary, lang)}
      </Text>
      <VenuePage venue={venue} />

      {usual ? (
        <Card>
          <Text style={{ fontWeight: '700' }}>{t('usualTitle')}</Text>
          <Text style={styles.text}>
            {t('usualBody', {
              count: usual.visitCount,
              kind: kindWord(usual.seatKind, lang),
              mode: modeLabel(usual.mode, lang),
              order: usual.topItem
                ? t('usualOrder', { item: usual.topItem })
                : '',
            })}
          </Text>
          {usual.seat ? (
            <>
              <Text style={styles.text}>
                {t('usualFree', {
                  seat: seatText(usual.seat.label),
                  pinned: usual.viaFavourite ? t('usualPinned') : '',
                })}
              </Text>
              <View style={styles.row}>
                <Button
                  label={t('usualSelect', { seat: seatText(usual.seat.label) })}
                  onPress={() => choose(usual.seat!.id)}
                />
              </View>
            </>
          ) : (
            <Text style={styles.text}>{usual.reason}</Text>
          )}
        </Card>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: '700' }}>{t('pinnedTitle')}</Text>
        {favouriteIds.length === 0 ? (
          <Text style={styles.text}>{t('pinnedNone')}</Text>
        ) : (
          <View style={styles.row}>
            {favouriteIds.map((id) => {
              const seat = venue.seats.find((entry) => entry.id === id);
              if (!seat) return null;
              const busy = occupied(id);
              return (
                <Button
                  key={id}
                  label={
                    busy
                      ? t('pinnedOccupied', { seat: seatText(seat.label) })
                      : t('pinnedBook', { seat: seatText(seat.label) })
                  }
                  disabled={busy}
                  onPress={() => choose(id)}
                />
              );
            })}
          </View>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: '700' }}>{t('filterTitle')}</Text>
        <View style={styles.row}>
          {KINDS.map((kind) => {
            const label = kindName(kind, lang);
            const on = filters.kinds.includes(kind);
            return (
              <Button
                key={kind}
                label={on ? `✓ ${label}` : label}
                selected={on}
                onPress={() =>
                  setFilters({
                    ...filters,
                    kinds: on
                      ? filters.kinds.filter((entry) => entry !== kind)
                      : [...filters.kinds, kind],
                  })
                }
              />
            );
          })}
        </View>
        <View style={styles.row}>
          {[null, ...priceCaps].map((cap) => {
            const on = filters.maxRate === cap;
            const label =
              cap === null
                ? t('anyPrice')
                : t('priceCap', { price: formatMoney(cap) });
            return (
              <Button
                key={cap ?? 'any'}
                label={on ? `✓ ${label}` : label}
                selected={on}
                onPress={() => setFilters({ ...filters, maxRate: cap })}
              />
            );
          })}
          <Button
            label={
              filters.availableOnly
                ? `✓ ${t('availableOnly')}`
                : t('availableOnly')
            }
            selected={filters.availableOnly}
            onPress={() =>
              setFilters({ ...filters, availableOnly: !filters.availableOnly })
            }
          />
        </View>
        <View style={styles.row}>
          {AMENITIES.map(({ key }) => {
            const label = amenityLabel(key, lang);
            const on = (filters.amenities ?? []).includes(key);
            return (
              <Button
                key={key}
                label={on ? `✓ ${label}` : label}
                selected={on}
                onPress={() => toggleAmenity(key)}
              />
            );
          })}
        </View>
        {hasActiveFilters(filters) ? (
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            {t('showing', {
              shown: visibleSeats.length,
              total: venue.seats.length,
            })}
          </Text>
        ) : null}
      </View>

      {visibleSeats.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="alert" style={styles.text}>
            {t('noMatch')}
          </Text>
          <View style={styles.row}>
            <Button
              label={t('clearFilters')}
              onPress={() => setFilters(noFilters())}
            />
          </View>
        </View>
      ) : (
        <SeatMap
          venue={filteredVenue}
          sessions={store.sessions}
          selectedSeatId={store.selectedSeatId}
          onSelect={choose}
        />
      )}

      {selectedSeat ? (
        <View style={styles.row}>
          <Text style={styles.text}>
            {t('selected', { seat: seatText(selectedSeat.label) })}
            {visibleSeats.some((seat) => seat.id === selectedSeat.id)
              ? ''
              : t('hiddenByFilters')}
          </Text>
          <Button
            label={selectedPinned ? t('unpin') : t('pin')}
            selected={selectedPinned}
            onPress={() => {
              const result = loyalty.toggleFavourite(
                venue.id,
                selectedSeat.id,
                lang,
              );
              setError(result.ok ? '' : result.message);
            }}
          />
        </View>
      ) : null}
      {selectedSeat ? (
        <SeatDetailCard
          key={selectedSeat.id}
          seat={selectedSeat}
          occupied={occupied(selectedSeat.id)}
        />
      ) : null}

      <View style={styles.row}>
        <Button
          label={t('startMetered')}
          onPress={() => start('METERED_OPEN')}
        />
        <Button label={t('startBundle2h')} onPress={() => start('BUNDLE_2H')} />
        <Button label={t('startBundle4h')} onPress={() => start('BUNDLE_4H')} />
      </View>
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Text style={styles.text}>{t('footnote')}</Text>
    </Card>
  );
}
