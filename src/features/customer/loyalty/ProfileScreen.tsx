import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { formatMoney, getVenue, type Venue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, Heading, colors, styles } from '@/components/ui';
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
const input = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  minHeight: 44,
  fontSize: 15,
  color: colors.ink,
} as const;
const sectionTitle = { fontWeight: '700', fontSize: 17 } as const;

const venueVisits = (state: LoyaltyState, venueId: string) =>
  state.visits.filter((visit) => visit.venueId === venueId);

function PrivacyLink() {
  const { t } = useT(loyaltyMessages);
  return (
    <View style={styles.row}>
      <Button
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
  return (
    <Card>
      <CustomerNav current="member" />
      <Text style={{ color: venue.accent, fontWeight: '700' }}>
        {t('eyebrow')}
      </Text>
      <Heading>{venue.name}</Heading>
      {warning ? (
        <Text accessibilityRole="alert" style={styles.text}>
          {loyaltyWarningText(warning, lang)}
        </Text>
      ) : null}
      {isMember(loyalty, venue.id) ? (
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
    <View style={{ gap: 6 }}>
      <Text style={sectionTitle}>{t('statsTitle')}</Text>
      {stats.visits === 0 ? (
        <Text style={styles.text}>{t('statsNone')}</Text>
      ) : (
        <>
          <Text style={styles.text}>
            {t('statVisits', { n: stats.visits })}
          </Text>
          <Text style={styles.text}>{t('statTime', { time })}</Text>
          <Text style={styles.text}>
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
        </>
      )}
    </View>
  );
}

function GuestView({ venue, state }: { venue: Venue; state: LoyaltyState }) {
  const { t, lang } = useT(loyaltyMessages);
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
      <View style={{ gap: 10 }}>
        <Text style={sectionTitle}>
          {t('joinTitle', { venue: venue.name })}
        </Text>
        <Text style={styles.text}>{t('mobileNumber')}</Text>
        <TextInput
          accessibilityLabel={t('mobileNumber')}
          keyboardType="phone-pad"
          placeholder="0901234567"
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            setSentTo(null);
          }}
          style={input}
        />
        <View style={styles.row}>
          <Button label={t('sendCode')} onPress={sendCode} />
        </View>
        {sentTo ? (
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            {t('demoOtp', { phone: maskPhone(sentTo), code: DEMO_OTP })}
          </Text>
        ) : null}
        <Text style={styles.text}>{t('verificationCode')}</Text>
        <TextInput
          accessibilityLabel={t('verificationCode')}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          style={input}
        />
        <Text style={styles.text}>{t('friendCodeLabel')}</Text>
        <TextInput
          accessibilityLabel={t('friendCodeA11y')}
          autoCapitalize="characters"
          placeholder={`${venue.id.toUpperCase()}-XXXXXX`}
          value={friendCode}
          onChangeText={setFriendCode}
          style={input}
        />
        <Text style={styles.text}>
          {t('referralNote', {
            venue: venue.name,
            points: REFERRAL_BONUS_POINTS,
          })}
        </Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          onPress={() => setConsent(!consent)}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}
        >
          <Text style={{ fontSize: 20, color: colors.ink }}>
            {consent ? '[x]' : '[ ]'}
          </Text>
          <Text style={[styles.text, { flex: 1 }]}>
            {t('consentText', { venue: venue.name })}
          </Text>
        </Pressable>
        <View style={styles.row}>
          <Button label={t('join')} onPress={submit} />
        </View>
        {message ? <Text accessibilityRole="alert">{message}</Text> : null}
        <Text style={styles.text}>{t('pointsLater')}</Text>
      </View>
      <Stats venue={venue} state={state} />
      <BadgesPanel visits={venueVisits(state, venue.id)} />
      {hasLocalData ? (
        <View style={{ gap: 10 }}>
          <Text style={styles.text}>{t('guestLocal')}</Text>
          {confirmClear ? (
            <View style={styles.row}>
              <Button
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
                label={t('deleteVisitData')}
                onPress={() => setConfirmClear(true)}
              />
            </View>
          )}
        </View>
      ) : null}
    </>
  );
}

function MemberView({ venue, state }: { venue: Venue; state: LoyaltyState }) {
  const { t, lang } = useT(loyaltyMessages);
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
      <View style={{ gap: 6 }}>
        <Text style={styles.text}>
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
      </View>

      <View style={{ gap: 6 }}>
        <Text style={sectionTitle}>{t('historyTitle')}</Text>
        {ledger.length === 0 ? (
          <Text style={styles.text}>{t('historyNone')}</Text>
        ) : (
          ledger.map((entry) => {
            const visit = state.visits.find(
              (item) => item.sessionId === entry.sessionId,
            );
            return (
              <Text key={entry.id} style={styles.text}>
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
            );
          })
        )}
      </View>

      <Stats venue={venue} state={state} />
      <BadgesPanel visits={venueVisits(state, venue.id)} />

      <View style={{ gap: 6 }}>
        <Text style={sectionTitle}>{t('referralTitle')}</Text>
        <Text
          accessibilityLabel={t('referralA11y', { code: referral ?? '' })}
          style={{ fontWeight: '700', fontSize: 18, color: colors.ink }}
        >
          {referral}
        </Text>
        <Text style={styles.text}>
          {t('referralExplain', {
            venue: venue.name,
            points: REFERRAL_BONUS_POINTS,
          })}
        </Text>
      </View>
      <PrivacyLink />

      <View style={{ gap: 10 }}>
        <Text style={sectionTitle}>{t('prefsTitle')}</Text>
        <Text style={styles.text}>{t('milk')}</Text>
        <View style={styles.row}>
          {MILK_OPTIONS.map((milk) => (
            <Button
              key={milk}
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
        <Text style={styles.text}>{t('sweetness')}</Text>
        <View style={styles.row}>
          {SWEETNESS_OPTIONS.map((sweetness) => (
            <Button
              key={sweetness}
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
        <Text style={styles.text}>
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
          style={input}
        />
        {notice ? <Text style={styles.text}>{notice}</Text> : null}
        <View style={styles.row}>
          <Button
            label={t('savePrefs')}
            onPress={() => {
              const result = setPreferences(venue.id, draft, lang);
              setSaved(result.ok ? t('prefsSaved') : result.message);
            }}
          />
        </View>
        {saved ? (
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            {saved}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={sectionTitle}>{t('pinnedTitle')}</Text>
        {favourites.length === 0 ? (
          <Text style={styles.text}>{t('pinnedNone')}</Text>
        ) : (
          <View style={styles.row}>
            {favourites.map((id) => {
              const seat = venue.seats.find((entry) => entry.id === id);
              return seat ? (
                <Button
                  key={id}
                  label={t('unpinSeat', {
                    seat: seatLabelText(seat.label, lang),
                  })}
                  onPress={() => toggleFavourite(venue.id, id)}
                />
              ) : null;
            })}
          </View>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={sectionTitle}>{t('leaveTitle')}</Text>
        {confirmLeave ? (
          <>
            <Text accessibilityRole="alert" style={styles.text}>
              {t('leaveConfirm', { venue: venue.name })}
            </Text>
            <View style={styles.row}>
              <Button
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
              label={t('leaveButton')}
              onPress={() => setConfirmLeave(true)}
            />
          </View>
        )}
      </View>
    </>
  );
}
