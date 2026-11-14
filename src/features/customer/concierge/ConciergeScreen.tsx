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
  Eyebrow,
  Heading,
  styles,
} from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { useLoyalty, useLoyaltyReady } from '../loyalty/useLoyalty';
import {
  MAX_QUESTION_LENGTH,
  SUGGESTED_QUESTIONS_EN,
  SUGGESTED_QUESTIONS_VI,
  answerQuestion,
  readOnlyNote,
} from './conciergeModel';
import { conciergeMessages } from './messages';
import { CustomerNav } from '../shared/CustomerNav';

interface Message {
  id: number;
  from: 'you' | 'venue';
  text: string;
}
const MAX_MESSAGES = 40;

/** "Ask the venue": read-only Q&A at '/customer/assistant'. */
export function ConciergeScreen() {
  const { t, lang } = useT(conciergeMessages);
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
        <CustomerNav current="assistant" />
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
    <Card>
      <CustomerNav current="assistant" />

      <View style={styles.rowBetween}>
        <View style={{ gap: 4 }}>
          <Eyebrow color={venue.accent}>CUSTOMER / VENUE CONCIERGE</Eyebrow>
          <Heading>{t('heading')}</Heading>
        </View>
        <Badge label={venue.name} tone="info" />
      </View>

      <Text style={styles.text}>
        {t('intro', { venue: venue.name, note: readOnlyNote(lang) })}
      </Text>

      <Card variant="subtle" style={{ gap: 10 }}>
        <Text style={styles.sectionLabel}>{t('suggested')}</Text>
        {/* English keeps both rows as before; Vietnamese shows its own row. */}
        {lang === 'vi' ? null : (
          <View style={styles.row}>
            {SUGGESTED_QUESTIONS_EN.map((question) => (
              <Button
                key={question}
                size="sm"
                label={question}
                onPress={() => ask(question)}
              />
            ))}
          </View>
        )}
        <View style={styles.row}>
          {SUGGESTED_QUESTIONS_VI.map((question) => (
            <Button
              key={question}
              size="sm"
              label={question}
              onPress={() => ask(question)}
            />
          ))}
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <TextInput
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

      <View accessibilityLabel={t('conversation')} style={{ gap: 10 }}>
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
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isYou ? colors.greenBorder : colors.border,
                  backgroundColor: isYou
                    ? colors.greenSurface
                    : colors.surfaceSubtle,
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    color: isYou ? colors.green : colors.ink,
                    fontWeight: '800',
                    fontSize: 13,
                  }}
                >
                  {isYou ? t('you') : t('assistant')}
                </Text>
                <Text style={{ color: colors.ink, lineHeight: 22 }}>
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
    </Card>
  );
}
