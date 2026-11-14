import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Button,
  Card,
  colors,
  Divider,
  radius,
  styles,
  useResponsive,
  Screen,
  ScreenHeader,
  Chip,
  space,
} from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
import { useLoyalty, useLoyaltyReady } from '../loyalty/useLoyalty';
import {
  MAX_QUESTION_LENGTH,
  SUGGESTED_QUESTIONS_EN,
  SUGGESTED_QUESTIONS_VI,
  answerQuestion,
  readOnlyNote,
} from './conciergeModel';
import { conciergeMessages } from './messages';

interface Message {
  id: number;
  from: 'you' | 'venue';
  text: string;
}
const MAX_MESSAGES = 40;

/** "Ask the venue": read-only Q&A at '/customer/assistant'. */
export function ConciergeScreen() {
  const { t, lang } = useT(conciergeMessages);
  const { isWide } = useResponsive();
  const venueId = useAppStore((state) => state.venueId);
  const sessions = useAppStore((state) => state.sessions);
  const { ready } = useLoyaltyReady();
  const loyalty = useLoyalty((state) => state);
  const venue = getVenue(venueId);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(1);

  if (!ready)
    return (
      <Card>
        <Text accessibilityRole="alert" style={styles.text}>
          {t('loading')}
        </Text>
      </Card>
    );

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    const reply = answerQuestion(text, { venue, sessions, loyalty }, lang);
    const youId = nextId.current++;
    const venueMessageId = nextId.current++;
    setMessages((previous) =>
      [
        ...previous,
        { id: youId, from: 'you' as const, text },
        { id: venueMessageId, from: 'venue' as const, text: reply.text },
      ].slice(-MAX_MESSAGES),
    );
    setDraft('');
  }

  return (
    <Screen>
      <ScreenHeader
        overline={t('overline')}
        accentColor={venue.accent}
        title={t('heading')}
        subtitle={t('intro', { venue: venue.name, note: readOnlyNote(lang) })}
      />

      <Card>
        <Text style={styles.sectionLabel}>{t('suggested')}</Text>
        {/* English keeps both rows as before; Vietnamese shows its own row. */}
        {lang === 'vi' ? null : (
          <View style={styles.row}>
            {SUGGESTED_QUESTIONS_EN.map((question) => (
              <Chip
                key={question}
                label={question}
                onPress={() => ask(question)}
              />
            ))}
          </View>
        )}
        <View style={styles.row}>
          {SUGGESTED_QUESTIONS_VI.map((question) => (
            <Chip
              key={question}
              label={question}
              onPress={() => ask(question)}
            />
          ))}
        </View>
      </Card>

      <View style={{ gap: space.md }}>
        <TextInput
          placeholderTextColor={colors.subtle}
          accessibilityLabel={t('inputLabel')}
          maxLength={MAX_QUESTION_LENGTH}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => ask(draft)}
          returnKeyType="send"
          placeholder={t('placeholder')}
          style={styles.input}
        />
        <View style={styles.row}>
          <Button
            variant="primary"
            fullWidth={!isWide}
            label={t('ask')}
            disabled={!draft.trim()}
            onPress={() => ask(draft)}
          />
        </View>
      </View>

      <Divider />

      <View style={styles.rowBetween}>
        <Text style={styles.subheading}>{t('conversation')}</Text>
        <Badge label={`${messages.length} msg`} tone="neutral" />
      </View>

      <View accessibilityLabel={t('conversation')} style={{ gap: space.md }}>
        {messages.length === 0 ? (
          <Card variant="subtle">
            <Text style={styles.text}>{t('empty')}</Text>
          </Card>
        ) : (
          messages.map((message) => {
            const isYou = message.from === 'you';
            return (
              <View
                key={message.id}
                style={{
                  padding: space.lg,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: isYou ? colors.greenBorder : colors.border,
                  backgroundColor: isYou
                    ? colors.greenSurface
                    : colors.surfaceSubtle,
                  gap: space.xs,
                }}
              >
                <Text
                  style={[
                    styles.captionStrong,
                    isYou && { color: colors.green },
                  ]}
                >
                  {isYou ? t('you') : t('assistant')}
                </Text>
                <Text style={[styles.text, { color: colors.ink }]}>
                  {message.text}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.row}>
        <Button
          label={t('back')}
          onPress={() => router.replace('/customer/explore')}
        />
      </View>
    </Screen>
  );
}
