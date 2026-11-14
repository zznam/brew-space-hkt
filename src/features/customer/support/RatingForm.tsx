import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  colors,
  Heading,
  radius,
  styles,
  space,
} from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
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
    <View style={{ gap: space.sm }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={t('ratingScore', { label, n })}
            accessibilityState={{ selected: value === n }}
            onPress={() => onChange(n)}
            style={{
              flex: 1,
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: value === n ? colors.green : colors.border,
              backgroundColor: value === n ? colors.green : colors.paperAlt,
            }}
          >
            <Text
              style={[
                styles.textStrong,
                value === n && { color: colors.onPrimary },
              ]}
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
      <Card variant="accent">
        <View style={styles.rowBetween}>
          <Heading>{t('thankYou')}</Heading>
          <Badge label={t('ratedBadge')} tone="success" />
        </View>
        <Text style={styles.textStrong}>
          {t('yourRating', {
            seat: existing.seat,
            drinks: existing.drinks,
            service: existing.service,
          })}
        </Text>
        <View style={styles.row}>
          <Button
            size="sm"
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
        </View>
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
        placeholderTextColor={colors.subtle}
        accessibilityLabel={t('commentLabel')}
        multiline
        value={comment}
        onChangeText={setComment}
        placeholder={t('commentPlaceholder')}
        style={[styles.input, { minHeight: 72 }]}
      />
      <View style={styles.rowBetween}>
        <Text
          style={[
            styles.caption,
            comment.length > MAX_NOTE_LENGTH && { color: colors.danger },
          ]}
        >
          {t('characters', { n: comment.length, max: MAX_NOTE_LENGTH })}
        </Text>
        <Button
          variant="secondary"
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
      </View>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.textStrong, { color: colors.danger }]}
        >
          {error}
        </Text>
      ) : null}
    </Card>
  );
}
