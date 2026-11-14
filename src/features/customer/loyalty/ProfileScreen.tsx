import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { formatMoney, getVenue, type Venue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, Heading, colors, styles } from '@/components/ui';
import { CustomerNav } from '../shared/CustomerNav';
import {
  DEMO_OTP,
  MAX_ALLERGY_NOTE,
  MILK_OPTIONS,
  SWEETNESS_OPTIONS,
  allergyNotice,
  favouriteSeatIds,
  getPreferences,
  isMember,
  maskPhone,
  pointsBalance,
  requestOtp,
  venueStats,
  type LoyaltyState,
  type Preferences,
} from './loyaltyModel';
import { useLoyalty, useLoyaltyReady } from './useLoyalty';

const MILK_LABEL = {
  dairy: 'Dairy',
  oat: 'Oat',
  almond: 'Almond',
  none: 'No milk',
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

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export function ProfileScreen() {
  const { ready, warning } = useLoyaltyReady();
  const loyalty = useLoyalty((state) => state);
  const venue = getVenue(useAppStore((state) => state.venueId));
  if (!ready)
    return (
      <Card>
        <CustomerNav current="member" />
        <Text accessibilityRole="alert" style={styles.text}>
          Loading your member profile…
        </Text>
      </Card>
    );
  return (
    <Card>
      <CustomerNav current="member" />
      <Text style={{ color: venue.accent, fontWeight: '700' }}>
        CUSTOMER / MEMBER
      </Text>
      <Heading>{venue.name}</Heading>
      {warning ? (
        <Text accessibilityRole="alert" style={styles.text}>
          {warning}
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
  const stats = venueStats(state, venue.id);
  return (
    <View style={{ gap: 6 }}>
      <Text style={sectionTitle}>Your stats here</Text>
      {stats.visits === 0 ? (
        <Text style={styles.text}>
          No completed visits yet. Stats appear after your first session.
        </Text>
      ) : (
        <>
          <Text style={styles.text}>Visits: {stats.visits}</Text>
          <Text style={styles.text}>
            Time spent: {formatMinutes(stats.totalMinutes)}
          </Text>
          <Text style={styles.text}>
            Total spend: {formatMoney(stats.totalSpend)}
          </Text>
          <Text style={styles.text}>
            Favourite seat type: {stats.favouriteSeatKind ?? 'none yet'}
          </Text>
          <Text style={styles.text}>
            Favourite item: {stats.favouriteItem ?? 'none yet'}
          </Text>
        </>
      )}
    </View>
  );
}

function GuestView({ venue, state }: { venue: Venue; state: LoyaltyState }) {
  const join = useLoyalty((store) => store.join);
  const leave = useLoyalty((store) => store.leave);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const hasLocalData =
    venueStats(state, venue.id).visits > 0 ||
    favouriteSeatIds(state, venue.id).length > 0;

  function sendCode() {
    const result = requestOtp(phone);
    if (!result.ok) {
      setSentTo(null);
      setMessage(result.message);
      return;
    }
    setSentTo(result.phone);
    setMessage('');
  }
  function submit() {
    const result = join(venue.id, { phone, code, consent });
    setMessage(result.ok ? '' : result.message);
  }

  return (
    <>
      <Text style={styles.text}>
        You are browsing as a guest. Guests can still buy, but only members earn
        points. Join to earn points.
      </Text>
      <View style={{ gap: 10 }}>
        <Text style={sectionTitle}>Join {venue.name} rewards</Text>
        <Text style={styles.text}>Mobile number</Text>
        <TextInput
          accessibilityLabel="Mobile number"
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
          <Button label="Send code" onPress={sendCode} />
        </View>
        {sentTo ? (
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            Demo only: no SMS is sent. Your code for {maskPhone(sentTo)} is{' '}
            {DEMO_OTP}.
          </Text>
        ) : null}
        <Text style={styles.text}>Verification code</Text>
        <TextInput
          accessibilityLabel="Verification code"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          style={input}
        />
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
            I agree that {venue.name} stores my mobile number, visit history,
            points, drink preferences and pinned seats on this device to run its
            rewards programme. I can leave at any time and my data is deleted.
          </Text>
        </Pressable>
        <View style={styles.row}>
          <Button label="Join" onPress={submit} />
        </View>
        {message ? <Text accessibilityRole="alert">{message}</Text> : null}
        <Text style={styles.text}>
          Points are earned from your next completed visit after joining.
        </Text>
      </View>
      <Stats venue={venue} state={state} />
      {hasLocalData ? (
        <View style={{ gap: 10 }}>
          <Text style={styles.text}>
            Your guest visits and pinned seats are kept only on this device.
          </Text>
          {confirmClear ? (
            <View style={styles.row}>
              <Button
                label="Yes, delete this data"
                onPress={() => {
                  leave(venue.id);
                  setConfirmClear(false);
                }}
              />
              <Button label="Cancel" onPress={() => setConfirmClear(false)} />
            </View>
          ) : (
            <View style={styles.row}>
              <Button
                label="Delete my visit data"
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
  const notice = allergyNotice(draft);

  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={styles.text}>
          Member · {membership ? maskPhone(membership.phone) : ''}
        </Text>
        <Text accessibilityRole="header" style={styles.heading}>
          {pointsBalance(state, venue.id)} points
        </Text>
        <Text style={styles.text}>
          You earn 1 point per full {formatMoney(1000)} spent after each
          completed visit. Redeeming points is not available yet.
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={sectionTitle}>Points history</Text>
        {ledger.length === 0 ? (
          <Text style={styles.text}>
            No points yet. Complete a visit to earn your first points.
          </Text>
        ) : (
          ledger.map((entry) => {
            const visit = state.visits.find(
              (item) => item.sessionId === entry.sessionId,
            );
            return (
              <Text key={entry.id} style={styles.text}>
                +{entry.points} points ·{' '}
                {visit
                  ? `${visit.seatLabel}, ${formatMoney(visit.total)}`
                  : `Visit ${entry.sessionId}`}
              </Text>
            );
          })
        )}
      </View>

      <Stats venue={venue} state={state} />

      <View style={{ gap: 10 }}>
        <Text style={sectionTitle}>Drink preferences</Text>
        <Text style={styles.text}>Milk</Text>
        <View style={styles.row}>
          {MILK_OPTIONS.map((milk) => (
            <Button
              key={milk}
              label={
                draft.milk === milk ? `✓ ${MILK_LABEL[milk]}` : MILK_LABEL[milk]
              }
              selected={draft.milk === milk}
              onPress={() => setDraft({ ...draft, milk })}
            />
          ))}
        </View>
        <Text style={styles.text}>Sweetness</Text>
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
          Allergy note ({draft.allergyNote.length}/{MAX_ALLERGY_NOTE})
        </Text>
        <TextInput
          accessibilityLabel="Allergy note"
          maxLength={MAX_ALLERGY_NOTE}
          multiline
          value={draft.allergyNote}
          onChangeText={(allergyNote) => setDraft({ ...draft, allergyNote })}
          style={input}
        />
        {notice ? <Text style={styles.text}>{notice}</Text> : null}
        <View style={styles.row}>
          <Button
            label="Save preferences"
            onPress={() => {
              const result = setPreferences(venue.id, draft);
              setSaved(result.ok ? 'Preferences saved.' : result.message);
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
        <Text style={sectionTitle}>Pinned seats</Text>
        {favourites.length === 0 ? (
          <Text style={styles.text}>
            No pinned seats. Pin one from Explore to find it again quickly.
          </Text>
        ) : (
          <View style={styles.row}>
            {favourites.map((id) => {
              const seat = venue.seats.find((entry) => entry.id === id);
              return seat ? (
                <Button
                  key={id}
                  label={`★ ${seat.label} · Unpin`}
                  onPress={() => toggleFavourite(venue.id, id)}
                />
              ) : null;
            })}
          </View>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={sectionTitle}>Leave programme</Text>
        {confirmLeave ? (
          <>
            <Text accessibilityRole="alert" style={styles.text}>
              This deletes your membership, points, visit history, preferences
              and pinned seats for {venue.name}. It cannot be undone.
            </Text>
            <View style={styles.row}>
              <Button
                label="Yes, delete my data"
                onPress={() => leave(venue.id)}
              />
              <Button label="Cancel" onPress={() => setConfirmLeave(false)} />
            </View>
          </>
        ) : (
          <View style={styles.row}>
            <Button
              label="Leave programme and delete my data"
              onPress={() => setConfirmLeave(true)}
            />
          </View>
        )}
      </View>
    </>
  );
}
