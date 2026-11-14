import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, Card, Heading, colors, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { supportMessages } from './messages';
import {
  MAX_NOTE_LENGTH,
  SEAT_ISSUE_PRESETS,
  SEAT_PREFERENCES,
  type SeatPreference,
  failureText,
  mustEscalate,
  priorityLabel,
  requestDisplayText,
  requestStatus,
  requestStatusLabel,
  seatIssueLabel,
  seatPreferenceLabel,
} from './supportModel';
import type { SubmitResult, SupportContext } from './supportStore';
import { useSupport } from './useSupport';

/** Customer help panel. `context.minute` is the session's elapsed minutes, which
 * drives the demo status progression. */
export function SupportPanel({ context }: { context: SupportContext }) {
  const { t, lang } = useT(supportMessages);
  const requests = useSupport((state) => state.requests);
  const callStaff = useSupport((state) => state.callStaff);
  const submitNote = useSupport((state) => state.submitNote);
  const reportSeatIssue = useSupport((state) => state.reportSeatIssue);
  const requestSeatChange = useSupport((state) => state.requestSeatChange);
  const markResolved = useSupport((state) => state.markResolved);
  const [note, setNote] = useState('');
  const [preferred, setPreferred] = useState<SeatPreference>('any');
  const [moveReason, setMoveReason] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();

  const mine = requests
    .filter(
      (request) =>
        request.venueId === context.venueId &&
        request.seatId === context.seatId &&
        // Same session only, so the next guest at a seat never sees old requests.
        request.sessionId === context.sessionId,
    )
    .slice()
    .reverse();

  function report(result: SubmitResult, clearNote = false) {
    if (!result.ok)
      return setFeedback({ ok: false, text: failureText(result, lang) });
    if (clearNote) setNote('');
    if (result.request.kind === 'seat_change') {
      setMoveReason('');
      return setFeedback({
        ok: true,
        text: t('seatChangeSent'),
      });
    }
    const { classification } = result.request;
    setFeedback({
      ok: true,
      text:
        !classification || mustEscalate(classification)
          ? t('staffWillCome')
          : t('notedForTeam'),
    });
  }

  return (
    <Card>
      <Heading>{t('needHelp')}</Heading>
      <Button
        label={t('callStaff')}
        onPress={() => report(callStaff(context))}
      />
      <Text style={styles.text}>{t('reportSeatIssue')}</Text>
      <View style={styles.row}>
        {SEAT_ISSUE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            label={seatIssueLabel(preset, lang)}
            onPress={() => report(reportSeatIssue(context, preset.id))}
          />
        ))}
      </View>
      <Text style={styles.text}>{t('leaveNote')}</Text>
      <TextInput
        accessibilityLabel={t('noteLabel')}
        multiline
        maxLength={MAX_NOTE_LENGTH + 50}
        value={note}
        onChangeText={setNote}
        placeholder={t('notePlaceholder')}
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
        {t('characters', { n: note.length, max: MAX_NOTE_LENGTH })}
      </Text>
      <Button
        label={t('sendNote')}
        disabled={!note.trim() || note.length > MAX_NOTE_LENGTH}
        onPress={() => report(submitNote(context, note), true)}
      />
      <Text style={styles.text}>{t('askMove')}</Text>
      <Text style={styles.text}>{t('seatChangeNote')}</Text>
      <View style={styles.row}>
        {SEAT_PREFERENCES.map((option) => (
          <Button
            key={option.id}
            label={seatPreferenceLabel(option.id, lang)}
            selected={preferred === option.id}
            onPress={() => setPreferred(option.id)}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel={t('moveReasonLabel')}
        maxLength={MAX_NOTE_LENGTH + 50}
        value={moveReason}
        onChangeText={setMoveReason}
        placeholder={t('moveReasonPlaceholder')}
        style={{
          minHeight: 44,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.ink,
        }}
      />
      <Button
        label={t('askMove')}
        disabled={moveReason.length > MAX_NOTE_LENGTH}
        onPress={() =>
          report(
            requestSeatChange(context, {
              preferredKind: preferred,
              reason: moveReason,
            }),
          )
        }
      />
      {feedback ? (
        <Text
          accessibilityRole="alert"
          style={{ color: feedback.ok ? colors.green : '#a33' }}
        >
          {feedback.text}
        </Text>
      ) : null}
      <Text style={styles.text}>{t('yourRequests')}</Text>
      {mine.length === 0 ? (
        <Text style={styles.text}>{t('noRequests')}</Text>
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
                {requestDisplayText(request, lang)}
              </Text>
              <Text style={styles.text}>
                {t('status', { status: requestStatusLabel(status, lang) })}
                {request.classification
                  ? t('priority', {
                      priority: priorityLabel(
                        request.classification.priority,
                        lang,
                      ),
                    })
                  : ''}
              </Text>
              {request.classification &&
              mustEscalate(request.classification) &&
              status !== 'resolved' ? (
                <Text style={styles.text}>{t('staffWillCome')}</Text>
              ) : null}
              {status !== 'resolved' ? (
                <Button
                  label={t('markResolved')}
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
