import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, Heading, colors, styles } from '@/components/ui';
import { useLoyalty, useLoyaltyReady } from '../loyalty/useLoyalty';
import {
  MAX_QUESTION_LENGTH,
  READ_ONLY_NOTE,
  SUGGESTED_QUESTIONS_EN,
  SUGGESTED_QUESTIONS_VI,
  answerQuestion,
} from './conciergeModel';
import { CustomerNav } from '../shared/CustomerNav';

interface Message {
  id: number;
  from: 'you' | 'venue';
  text: string;
}
const MAX_MESSAGES = 40;

/** "Ask the venue": read-only Q&A at '/customer/assistant'. */
export function ConciergeScreen() {
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
          Loading the assistant…
        </Text>
      </Card>
    );

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    const reply = answerQuestion(text, { venue, sessions, loyalty });
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
      <Heading>Ask the venue</Heading>
      <Text style={styles.text}>
        {venue.name}. {READ_ONLY_NOTE} You can write in English or Vietnamese.
      </Text>
      <Text style={styles.text}>Suggested questions</Text>
      <View style={styles.row}>
        {SUGGESTED_QUESTIONS_EN.map((question) => (
          <Button
            key={question}
            label={question}
            onPress={() => ask(question)}
          />
        ))}
      </View>
      <View style={styles.row}>
        {SUGGESTED_QUESTIONS_VI.map((question) => (
          <Button
            key={question}
            label={question}
            onPress={() => ask(question)}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Ask the venue a question"
        maxLength={MAX_QUESTION_LENGTH}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => ask(draft)}
        returnKeyType="send"
        placeholder="e.g. How many seats are free?"
        style={{
          minHeight: 44,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          color: colors.ink,
        }}
      />
      <Button label="Ask" disabled={!draft.trim()} onPress={() => ask(draft)} />
      <Text style={styles.text}>Conversation</Text>
      <View accessibilityLabel="Conversation" style={{ gap: 10 }}>
        {messages.length === 0 ? (
          <Text style={styles.text}>
            No questions yet. Tap a suggestion or type your own.
          </Text>
        ) : (
          messages.map((message) => (
            <View
              key={message.id}
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 8,
                gap: 2,
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: '700' }}>
                {message.from === 'you' ? 'You' : 'Venue assistant'}
              </Text>
              <Text style={{ color: colors.ink, lineHeight: 22 }}>
                {message.text}
              </Text>
            </View>
          ))
        )}
      </View>
      <Button
        label="Back to explore"
        onPress={() => router.replace('/customer/explore')}
      />
    </Card>
  );
}
