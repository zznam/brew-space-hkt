import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button, Card, Heading, colors, styles } from '@/components/ui';
import { MAX_NOTE_LENGTH } from './supportModel';
import { useSupport } from './useSupport';

const GROUPS = [
  { key: 'seat', label: 'Seat' },
  { key: 'drinks', label: 'Drinks' },
  { key: 'service', label: 'Service' },
] as const;
type GroupKey = (typeof GROUPS)[number]['key'];

function Selector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.text}>{label}</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${n} out of 5`}
            accessibilityState={{ selected: value === n }}
            onPress={() => onChange(n)}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: value === n ? colors.green : colors.border,
              backgroundColor: value === n ? colors.green : '#eef1e9',
            }}
          >
            <Text
              style={{
                color: value === n ? 'white' : colors.ink,
                fontWeight: '600',
              }}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function RatingForm({ sessionId }: { sessionId: string }) {
  const existing = useSupport((state) =>
    state.ratings.find((entry) => entry.sessionId === sessionId),
  );
  const rate = useSupport((state) => state.rate);
  const [scores, setScores] = useState<Record<GroupKey, number>>({
    seat: 0,
    drinks: 0,
    service: 0,
  });
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  if (existing && !editing)
    return (
      <Card>
        <Heading>Thank you!</Heading>
        <Text style={styles.text}>
          Your rating: seat {existing.seat}, drinks {existing.drinks}, service{' '}
          {existing.service}.
        </Text>
        <Button
          label="Change my rating"
          onPress={() => {
            setScores({
              seat: existing.seat,
              drinks: existing.drinks,
              service: existing.service,
            });
            setComment(existing.comment);
            setEditing(true);
          }}
        />
      </Card>
    );

  const complete = GROUPS.every((group) => scores[group.key] > 0);
  return (
    <Card>
      <Heading>How was your visit?</Heading>
      {GROUPS.map((group) => (
        <Selector
          key={group.key}
          label={group.label}
          value={scores[group.key]}
          onChange={(value) =>
            setScores((current) => ({ ...current, [group.key]: value }))
          }
        />
      ))}
      <TextInput
        accessibilityLabel="Comment (optional)"
        multiline
        value={comment}
        onChangeText={setComment}
        placeholder="Anything we should know? (optional)"
        style={{
          minHeight: 72,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 12,
          color: colors.ink,
        }}
      />
      <Text
        style={{
          color: comment.length > MAX_NOTE_LENGTH ? '#a33' : colors.muted,
        }}
      >
        {comment.length}/{MAX_NOTE_LENGTH} characters
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: '#a33' }}>
          {error}
        </Text>
      ) : null}
      <Button
        label="Submit rating"
        disabled={!complete}
        onPress={() => {
          const result = rate({ sessionId, ...scores, comment });
          if (result.ok) {
            setError('');
            setEditing(false);
          } else setError(result.message);
        }}
      />
    </Card>
  );
}
