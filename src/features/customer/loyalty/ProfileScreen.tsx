import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { formatMoney, getVenue, type Venue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Button,
  Card,
  colors,
  radius,
  styles,
  useResponsive,
  Banner,
  Screen,
  ScreenHeader,
  space,
  Icon,
} from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
import { kindWord, seatLabelText } from '../venue/messages';
import { BadgesPanel } from '../rewards/BadgesPanel';
import {
  DEMO_OTP,
  MAX_ALLERGY_NOTE,
  MILK_OPTIONS,
  REFERRAL_BONUS_POINTS,
  SWEETNESS_OPTIONS,
  allergyNotice,
  favouriteSeatIds,
  getPreferences,
  isMember,
  maskPhone,
  memberReferralCode,
  pointsBalance,
  requestOtp,
  venueStats,
  type LoyaltyState,
  type Preferences,
} from './loyaltyModel';
import { loyaltyMessages, loyaltyWarningText } from './messages';
import { useLoyalty, useLoyaltyReady } from './useLoyalty';

const MILK_KEY = {
  dairy: 'milkDairy',
  oat: 'milkOat',
  almond: 'milkAlmond',
  none: 'milkNone',
} as const;

const venueVisits = (state: LoyaltyState, venueId: string) =>
  state.visits.filter((visit) => visit.venueId === venueId);

function PrivacyLink() {
  const { t } = useT(loyaltyMessages);
  return (
    <View style={styles.row}>
      <Button
        size="sm"
        label={t('privacyLink')}
        onPress={() => router.push('/customer/privacy' as never)}
      />
    </View>
  );
}

export function ProfileScreen() {
  const { t, lang } = useT(loyaltyMessages);
  const { ready, warning } = useLoyaltyReady();
  const loyalty = useLoyalty((state) => state);
  const venue = getVenue(useAppStore((state) => state.venueId));
  if (!ready)
    return (
      <Card>
        <Text accessibilityRole="alert" style={styles.text}>
          {t('loading')}
        </Text>
      </Card>
    );
  const member = isMember(loyalty, venue.id);
  return (
    <Screen>
      <ScreenHeader
        overline={t('eyebrow')}
        accentColor={venue.accent}
        title={venue.name}
        trailing={
          <Badge
            label={member ? 'Active Member' : 'Guest'}
            tone={member ? 'success' : 'neutral'}
          />
        }
      />

      {warning ? (
        <Banner tone="warning" role="alert">
          {loyaltyWarningText(warning, lang)}
        </Banner>
      ) : null}

      {member ? (
        <MemberView key={venue.id} venue={venue} state={loyalty} />
      ) : (
        <GuestView key={venue.id} venue={venue} state={loyalty} />
      )}
    </Screen>
  );
}

function Stats({ venue, state }: { venue: Venue; state: LoyaltyState }) {
  const { t, lang } = useT(loyaltyMessages);
  const stats = venueStats(state, venue.id);
  const hours = Math.floor(stats.totalMinutes / 60);
  const minutes = stats.totalMinutes % 60;
  const time = hours
    ? t('hoursMinutes', { h: hours, m: minutes })
    : t('minutesOnly', { m: minutes });
  return (
    <Card>
      <Text style={styles.subheading}>{t('statsTitle')}</Text>
      {stats.visits === 0 ? (
        <Text style={styles.text}>{t('statsNone')}</Text>
      ) : (
        <View style={{ gap: space.sm }}>
          <Text style={styles.textStrong}>
            {t('statVisits', { n: stats.visits })}
          </Text>
          <Text style={styles.text}>{t('statTime', { time })}</Text>
          <Text style={styles.textStrong}>
            {t('statSpend', { money: formatMoney(stats.totalSpend) })}
          </Text>
          <Text style={styles.text}>
            {t('statSeatKind', {
              kind: stats.favouriteSeatKind
                ? kindWord(stats.favouriteSeatKind, lang)
                : t('noneYet'),
            })}
          </Text>
          <Text style={styles.text}>
            {t('statItem', { item: stats.favouriteItem ?? t('noneYet') })}
          </Text>
        </View>
      )}
    </Card>
  );
}

function GuestView({ venue, state }: { venue: Venue; state: LoyaltyState }) {
  const { t, lang } = useT(loyaltyMessages);
  const { isWide } = useResponsive();
  const join = useLoyalty((store) => store.join);
  const leave = useLoyalty((store) => store.leave);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const hasLocalData =
    venueStats(state, venue.id).visits > 0 ||
    favouriteSeatIds(state, venue.id).length > 0;

  function sendCode() {
    const result = requestOtp(phone, lang);
    if (!result.ok) {
      setSentTo(null);
      setMessage(result.message);
      return;
    }
    setSentTo(result.phone);
    setMessage('');
  }
  function submit() {
    const result = join(venue.id, { phone, code, consent, friendCode }, lang);
    setMessage(result.ok ? '' : result.message);
  }

  return (
    <>
      <Text style={styles.text}>{t('guestIntro')}</Text>
      <PrivacyLink />

      <Card>
        <Text style={styles.subheading}>
          {t('joinTitle', { venue: venue.name })}
        </Text>

        <View style={{ gap: space.sm }}>
          <Text style={styles.sectionLabel}>{t('mobileNumber')}</Text>
          <TextInput
            placeholderTextColor={colors.subtle}
            accessibilityLabel={t('mobileNumber')}
            keyboardType="phone-pad"
            placeholder="0901234567"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setSentTo(null);
            }}
            style={[styles.input, { backgroundColor: colors.surface }]}
          />
        </View>

        <View style={styles.row}>
          <Button size="sm" label={t('sendCode')} onPress={sendCode} />
        </View>

        {sentTo ? (
          <Banner tone="success">
            {t('demoOtp', { phone: maskPhone(sentTo), code: DEMO_OTP })}
          </Banner>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Text style={styles.sectionLabel}>{t('verificationCode')}</Text>
          <TextInput
            placeholderTextColor={colors.subtle}
            accessibilityLabel={t('verificationCode')}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            style={[styles.input, { backgroundColor: colors.surface }]}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Text style={styles.sectionLabel}>{t('friendCodeLabel')}</Text>
          <TextInput
            placeholderTextColor={colors.subtle}
            accessibilityLabel={t('friendCodeA11y')}
            autoCapitalize="characters"
            placeholder={`${venue.id.toUpperCase()}-XXXXXX`}
            value={friendCode}
            onChangeText={setFriendCode}
            style={[styles.input, { backgroundColor: colors.surface }]}
          />
          <Text style={styles.caption}>
            {t('referralNote', {
              venue: venue.name,
              points: REFERRAL_BONUS_POINTS,
            })}
          </Text>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          onPress={() => setConsent(!consent)}
          style={{
            flexDirection: 'row',
            gap: space.md,
            alignItems: 'flex-start',
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: consent ? colors.green : colors.border,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: radius.sm,
              borderWidth: 2,
              borderColor: consent ? colors.green : colors.borderStrong,
              backgroundColor: consent ? colors.green : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {consent ? <Icon name="check" color={colors.onPrimary} /> : null}
          </View>
          <Text style={[styles.text, { flex: 1, color: colors.ink }]}>
            {t('consentText', { venue: venue.name })}
          </Text>
        </Pressable>

        <View style={styles.row}>
          <Button
            variant="primary"
            fullWidth={!isWide}
            label={t('join')}
            onPress={submit}
          />
        </View>

        {message ? (
          <Text
            accessibilityRole="alert"
            style={[styles.textStrong, { color: colors.danger }]}
          >
            {message}
          </Text>
        ) : null}

        <Text style={styles.caption}>{t('pointsLater')}</Text>
      </Card>

      <Stats venue={venue} state={state} />
      <BadgesPanel visits={venueVisits(state, venue.id)} />

      {hasLocalData ? (
        <Card>
          <Text style={styles.text}>{t('guestLocal')}</Text>
          {confirmClear ? (
            <View style={styles.row}>
              <Button
                variant="danger"
                label={t('confirmDeleteData')}
                onPress={() => {
                  leave(venue.id);
                  setConfirmClear(false);
                }}
              />
              <Button
                label={t('cancel')}
                onPress={() => setConfirmClear(false)}
              />
            </View>
          ) : (
            <View style={styles.row}>
              <Button
                variant="danger"
                label={t('deleteVisitData')}
                onPress={() => setConfirmClear(true)}
              />
            </View>
          )}
        </Card>
      ) : null}
    </>
  );
}

function MemberView({ venue, state }: { venue: Venue; state: LoyaltyState }) {
  const { t, lang } = useT(loyaltyMessages);
  const { isWide } = useResponsive();
  const leave = useLoyalty((store) => store.leave);
  const toggleFavourite = useLoyalty((store) => store.toggleFavourite);
  const setPreferences = useLoyalty((store) => store.setPreferences);
  const membership = state.memberships[venue.id];
  const stored = getPreferences(state, venue.id);
  const [draft, setDraft] = useState<Preferences>(stored);
  const [saved, setSaved] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const ledger = state.ledger.filter((entry) => entry.venueId === venue.id);
  const favourites = favouriteSeatIds(state, venue.id);
  const notice = allergyNotice(draft, lang);
  const referral = memberReferralCode(state, venue.id);

  return (
    <>
      <Card variant="accent">
        <Text style={styles.textStrong}>
          {t('memberLine', {
            phone: membership ? maskPhone(membership.phone) : '',
          })}
        </Text>
        <Text accessibilityRole="header" style={styles.heading}>
          {t('pointsHeading', { n: pointsBalance(state, venue.id) })}
        </Text>
        <Text style={styles.text}>
          {t('earnNote', { unit: formatMoney(1000) })}
        </Text>
      </Card>

      <Card>
        <Text style={styles.subheading}>{t('historyTitle')}</Text>
        {ledger.length === 0 ? (
          <Text style={styles.text}>{t('historyNone')}</Text>
        ) : (
          ledger.map((entry) => {
            const visit = state.visits.find(
              (item) => item.sessionId === entry.sessionId,
            );
            return (
              <View key={entry.id} style={styles.inset}>
                <Text style={styles.textStrong}>
                  {t('historyLine', {
                    n: entry.points,
                    detail:
                      entry.kind === 'referral'
                        ? t('historyReferral')
                        : visit
                          ? `${seatLabelText(visit.seatLabel, lang)}, ${formatMoney(visit.total)}`
                          : t('historyVisit', { id: entry.sessionId }),
                  })}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      <Stats venue={venue} state={state} />
      <BadgesPanel visits={venueVisits(state, venue.id)} />

      <Card>
        <Text style={styles.subheading}>{t('referralTitle')}</Text>
        <View
          style={{
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignSelf: 'flex-start',
          }}
        >
          <Text
            accessibilityLabel={t('referralA11y', { code: referral ?? '' })}
            style={[styles.subheading, { letterSpacing: 0.8 }]}
          >
            {referral}
          </Text>
        </View>
        <Text style={styles.text}>
          {t('referralExplain', {
            venue: venue.name,
            points: REFERRAL_BONUS_POINTS,
          })}
        </Text>
      </Card>

      <PrivacyLink />

      <Card>
        <Text style={styles.subheading}>{t('prefsTitle')}</Text>

        <Text style={styles.sectionLabel}>{t('milk')}</Text>
        <View style={styles.row}>
          {MILK_OPTIONS.map((milk) => (
            <Button
              key={milk}
              size="sm"
              label={
                draft.milk === milk
                  ? `✓ ${t(MILK_KEY[milk])}`
                  : t(MILK_KEY[milk])
              }
              selected={draft.milk === milk}
              onPress={() => setDraft({ ...draft, milk })}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t('sweetness')}</Text>
        <View style={styles.row}>
          {SWEETNESS_OPTIONS.map((sweetness) => (
            <Button
              key={sweetness}
              size="sm"
              label={
                draft.sweetness === sweetness
                  ? `✓ ${sweetness}%`
                  : `${sweetness}%`
              }
              selected={draft.sweetness === sweetness}
              onPress={() => setDraft({ ...draft, sweetness })}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>
          {t('allergyLabel', {
            n: draft.allergyNote.length,
            max: MAX_ALLERGY_NOTE,
          })}
        </Text>
        <TextInput
          placeholderTextColor={colors.subtle}
          accessibilityLabel={t('allergyA11y')}
          maxLength={MAX_ALLERGY_NOTE}
          multiline
          value={draft.allergyNote}
          onChangeText={(allergyNote) => setDraft({ ...draft, allergyNote })}
          style={[styles.input, { backgroundColor: colors.surface }]}
        />
        {notice ? (
          <Text style={[styles.textStrong, { color: colors.amber }]}>
            {notice}
          </Text>
        ) : null}

        <View style={styles.row}>
          <Button
            variant="primary"
            fullWidth={!isWide}
            label={t('savePrefs')}
            onPress={() => {
              const result = setPreferences(venue.id, draft, lang);
              setSaved(result.ok ? t('prefsSaved') : result.message);
            }}
          />
        </View>
        {saved ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.textStrong, { color: colors.green }]}
          >
            {saved}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.subheading}>{t('pinnedTitle')}</Text>
        {favourites.length === 0 ? (
          <Text style={styles.text}>{t('pinnedNone')}</Text>
        ) : (
          <View style={styles.row}>
            {favourites.map((id) => {
              const seat = venue.seats.find((entry) => entry.id === id);
              return seat ? (
                <Button
                  key={id}
                  size="sm"
                  label={t('unpinSeat', {
                    seat: seatLabelText(seat.label, lang),
                  })}
                  onPress={() => toggleFavourite(venue.id, id)}
                />
              ) : null;
            })}
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.subheading}>{t('leaveTitle')}</Text>
        {confirmLeave ? (
          <>
            <Text
              accessibilityRole="alert"
              style={[styles.textStrong, { color: colors.danger }]}
            >
              {t('leaveConfirm', { venue: venue.name })}
            </Text>
            <View style={styles.row}>
              <Button
                variant="danger"
                label={t('confirmDeleteMine')}
                onPress={() => leave(venue.id)}
              />
              <Button
                label={t('cancel')}
                onPress={() => setConfirmLeave(false)}
              />
            </View>
          </>
        ) : (
          <View style={styles.row}>
            <Button
              variant="danger"
              label={t('leaveButton')}
              onPress={() => setConfirmLeave(true)}
            />
          </View>
        )}
      </Card>
    </>
  );
}
