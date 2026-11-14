import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button, Card, Heading, colors, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { supportMessages, type SupportMessageKey } from './messages';
import { MAX_NOTE_LENGTH, failureText } from './supportModel';
import { useSupport } from './useSupport';

const GROUPS = [
  { key: 'seat', label: 'group.seat' },
  { key: 'drinks', label: 'group.drinks' },
  { key: 'service', label: 'group.service' },
] as const satisfies readonly { key: string; label: SupportMessageKey }[];
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
  const { t } = useT(supportMessages);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.text}>{label}</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={t('ratingScore', { label, n })}
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
  const { t, lang } = useT(supportMessages);
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
        <Heading>{t('thankYou')}</Heading>
        <Text style={styles.text}>
          {t('yourRating', {
            seat: existing.seat,
            drinks: existing.drinks,
            service: existing.service,
          })}
        </Text>
        <Button
          label={t('changeRating')}
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
      <Heading>{t('ratingHeading')}</Heading>
      {GROUPS.map((group) => (
        <Selector
          key={group.key}
          label={t(group.label)}
          value={scores[group.key]}
          onChange={(value) =>
            setScores((current) => ({ ...current, [group.key]: value }))
          }
        />
      ))}
      <TextInput
        accessibilityLabel={t('commentLabel')}
        multiline
        value={comment}
        onChangeText={setComment}
        placeholder={t('commentPlaceholder')}
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
        {t('characters', { n: comment.length, max: MAX_NOTE_LENGTH })}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: '#a33' }}>
          {error}
        </Text>
      ) : null}
      <Button
        label={t('submitRating')}
        disabled={!complete}
        onPress={() => {
          const result = rate({ sessionId, ...scores, comment });
          if (result.ok) {
            setError('');
            setEditing(false);
          } else setError(failureText(result, lang));
        }}
      />
    </Card>
  );
}
