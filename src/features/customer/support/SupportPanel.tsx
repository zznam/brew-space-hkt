import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, Card, Heading, colors, styles } from '@/components/ui';
import {
  MAX_NOTE_LENGTH,
  REQUEST_STATUS_LABEL,
  SEAT_ISSUE_PRESETS,
  mustEscalate,
  requestStatus,
} from './supportModel';
import type { SubmitResult, SupportContext } from './supportStore';
import { useSupport } from './useSupport';

/** Customer help panel. `context.minute` is the session's elapsed minutes, which
 * drives the demo status progression. */
export function SupportPanel({ context }: { context: SupportContext }) {
  const requests = useSupport((state) => state.requests);
  const callStaff = useSupport((state) => state.callStaff);
  const submitNote = useSupport((state) => state.submitNote);
  const reportSeatIssue = useSupport((state) => state.reportSeatIssue);
  const markResolved = useSupport((state) => state.markResolved);
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();

  const mine = requests
    .filter(
      (request) =>
        request.venueId === context.venueId &&
        request.seatId === context.seatId,
    )
    .slice()
    .reverse();

  function report(result: SubmitResult, clearNote = false) {
    if (!result.ok) return setFeedback({ ok: false, text: result.message });
    if (clearNote) setNote('');
    const { classification } = result.request;
    setFeedback({
      ok: true,
      text:
        !classification || mustEscalate(classification)
          ? 'A team member will come to your seat.'
          : 'Noted for your team. This does not change your order or price.',
    });
  }

  return (
    <Card>
      <Heading>Need help?</Heading>
      <Button label="Call staff" onPress={() => report(callStaff(context))} />
      <Text style={styles.text}>Report a seat issue</Text>
      <View style={styles.row}>
        {SEAT_ISSUE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            label={preset.label}
            onPress={() => report(reportSeatIssue(context, preset.id))}
          />
        ))}
      </View>
      <Text style={styles.text}>Leave a note</Text>
      <TextInput
        accessibilityLabel="Note for staff"
        multiline
        maxLength={MAX_NOTE_LENGTH + 50}
        value={note}
        onChangeText={setNote}
        placeholder="e.g. peanut allergy, wifi not working"
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
          color: note.length > MAX_NOTE_LENGTH ? '#a33' : colors.muted,
        }}
      >
        {note.length}/{MAX_NOTE_LENGTH} characters
      </Text>
      <Button
        label="Send note"
        disabled={!note.trim() || note.length > MAX_NOTE_LENGTH}
        onPress={() => report(submitNote(context, note), true)}
      />
      {feedback ? (
        <Text
          accessibilityRole="alert"
          style={{ color: feedback.ok ? colors.green : '#a33' }}
        >
          {feedback.text}
        </Text>
      ) : null}
      <Text style={styles.text}>Your requests here</Text>
      {mine.length === 0 ? (
        <Text style={styles.text}>No requests yet.</Text>
      ) : (
        mine.map((request) => {
          const status = requestStatus(request, context.minute);
          return (
            <View
              key={request.id}
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 10,
                gap: 4,
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: '600' }}>
                {request.text}
              </Text>
              <Text style={styles.text}>
                Status: {REQUEST_STATUS_LABEL[status]}
                {request.classification
                  ? ` · Priority: ${request.classification.priority}`
                  : ''}
              </Text>
              {request.classification &&
              mustEscalate(request.classification) &&
              status !== 'resolved' ? (
                <Text style={styles.text}>
                  A team member will come to your seat.
                </Text>
              ) : null}
              {status !== 'resolved' ? (
                <Button
                  label="Mark resolved"
                  onPress={() => markResolved(request.id)}
                />
              ) : null}
            </View>
          );
        })
      )}
    </Card>
  );
}
