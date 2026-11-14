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
  Eyebrow,
  Heading,
  styles,
  useResponsive,
} from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { CustomerNav } from '../shared/CustomerNav';
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
        <CustomerNav current="member" />
        <Text accessibilityRole="alert" style={styles.text}>
          {t('loading')}
        </Text>
      </Card>
    );
  const member = isMember(loyalty, venue.id);
  return (
    <Card>
      <CustomerNav current="member" />
      <View style={styles.rowBetween}>
        <View style={{ gap: 4 }}>
          <Eyebrow color={venue.accent}>{t('eyebrow')}</Eyebrow>
          <Heading>{venue.name}</Heading>
        </View>
        <Badge
          label={member ? 'Active Member' : 'Guest'}
          tone={member ? 'success' : 'neutral'}
        />
      </View>

      {warning ? (
        <View
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.amberSurface,
            borderWidth: 1,
            borderColor: colors.amberBorder,
          }}
        >
          <Text
            accessibilityRole="alert"
            style={[styles.text, { color: colors.amber, fontWeight: '600' }]}
          >
            {loyaltyWarningText(warning, lang)}
          </Text>
        </View>
      ) : null}

      {member ? (
        <MemberView key={venue.id} venue={venue} state={loyalty} />
      ) : (
        <GuestView key={venue.id} venue={venue} state={loyalty} />
      )}
    </Card>
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
    <Card variant="subtle" style={{ gap: 8 }}>
      <Text style={styles.subheading}>{t('statsTitle')}</Text>
      {stats.visits === 0 ? (
        <Text style={styles.text}>{t('statsNone')}</Text>
      ) : (
        <View style={{ gap: 6 }}>
          <Text style={[styles.text, { color: colors.ink, fontWeight: '600' }]}>
            {t('statVisits', { n: stats.visits })}
          </Text>
          <Text style={styles.text}>{t('statTime', { time })}</Text>
          <Text style={[styles.text, { color: colors.ink, fontWeight: '600' }]}>
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

      <Card variant="subtle" style={{ gap: 12 }}>
        <Text style={styles.subheading}>
          {t('joinTitle', { venue: venue.name })}
        </Text>

        <View style={{ gap: 6 }}>
          <Text style={styles.sectionLabel}>{t('mobileNumber')}</Text>
          <TextInput
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
          <View
            style={{
              padding: 10,
              borderRadius: 10,
              backgroundColor: colors.greenSurface,
              borderWidth: 1,
              borderColor: colors.greenBorder,
            }}
          >
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.text, { color: colors.green, fontWeight: '700' }]}
            >
              {t('demoOtp', { phone: maskPhone(sentTo), code: DEMO_OTP })}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text style={styles.sectionLabel}>{t('verificationCode')}</Text>
          <TextInput
            accessibilityLabel={t('verificationCode')}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            style={[styles.input, { backgroundColor: colors.surface }]}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.sectionLabel}>{t('friendCodeLabel')}</Text>
          <TextInput
            accessibilityLabel={t('friendCodeA11y')}
            autoCapitalize="characters"
            placeholder={`${venue.id.toUpperCase()}-XXXXXX`}
            value={friendCode}
            onChangeText={setFriendCode}
            style={[styles.input, { backgroundColor: colors.surface }]}
          />
          <Text style={[styles.text, { fontSize: 13 }]}>
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
            gap: 12,
            alignItems: 'flex-start',
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: consent ? colors.green : colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: consent ? colors.green : colors.ink,
            }}
          >
            {consent ? '[x]' : '[ ]'}
          </Text>
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
            style={{ color: colors.danger, fontWeight: '700' }}
          >
            {message}
          </Text>
        ) : null}

        <Text style={[styles.text, { fontSize: 13 }]}>{t('pointsLater')}</Text>
      </Card>

      <Stats venue={venue} state={state} />
      <BadgesPanel visits={venueVisits(state, venue.id)} />

      {hasLocalData ? (
        <Card variant="subtle" style={{ gap: 10 }}>
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
      <Card variant="accent" style={{ gap: 8 }}>
        <Text style={[styles.text, { color: colors.ink, fontWeight: '700' }]}>
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

      <Card variant="subtle" style={{ gap: 8 }}>
        <Text style={styles.subheading}>{t('historyTitle')}</Text>
        {ledger.length === 0 ? (
          <Text style={styles.text}>{t('historyNone')}</Text>
        ) : (
          ledger.map((entry) => {
            const visit = state.visits.find(
              (item) => item.sessionId === entry.sessionId,
            );
            return (
              <View
                key={entry.id}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={[
                    styles.text,
                    { color: colors.ink, fontWeight: '600' },
                  ]}
                >
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

      <Card variant="subtle" style={{ gap: 8 }}>
        <Text style={styles.subheading}>{t('referralTitle')}</Text>
        <View
          style={{
            padding: 12,
            borderRadius: 10,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignSelf: 'flex-start',
          }}
        >
          <Text
            accessibilityLabel={t('referralA11y', { code: referral ?? '' })}
            style={{
              fontWeight: '800',
              fontSize: 18,
              color: colors.ink,
              letterSpacing: 0.8,
            }}
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

      <Card variant="subtle" style={{ gap: 10 }}>
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
          accessibilityLabel={t('allergyA11y')}
          maxLength={MAX_ALLERGY_NOTE}
          multiline
          value={draft.allergyNote}
          onChangeText={(allergyNote) => setDraft({ ...draft, allergyNote })}
          style={[styles.input, { backgroundColor: colors.surface }]}
        />
        {notice ? (
          <Text
            style={[styles.text, { color: colors.amber, fontWeight: '600' }]}
          >
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
            style={[styles.text, { color: colors.green, fontWeight: '700' }]}
          >
            {saved}
          </Text>
        ) : null}
      </Card>

      <Card variant="subtle" style={{ gap: 8 }}>
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

      <Card variant="subtle" style={{ gap: 10 }}>
        <Text style={styles.subheading}>{t('leaveTitle')}</Text>
        {confirmLeave ? (
          <>
            <Text
              accessibilityRole="alert"
              style={[styles.text, { color: colors.danger, fontWeight: '600' }]}
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
