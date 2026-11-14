import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  colors,
  Divider,
  Heading,
  radius,
  styles,
  space,
} from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
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
    <Card variant="subtle">
      <View style={styles.rowBetween}>
        <Heading level={2}>{t('needHelp')}</Heading>
        <Button
          variant="secondary"
          size="sm"
          label={t('callStaff')}
          onPress={() => report(callStaff(context))}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <Text style={styles.sectionLabel}>{t('reportSeatIssue')}</Text>
        <View style={styles.row}>
          {SEAT_ISSUE_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              size="sm"
              label={seatIssueLabel(preset, lang)}
              onPress={() => report(reportSeatIssue(context, preset.id))}
            />
          ))}
        </View>
      </View>

      <Divider />

      <View style={{ gap: space.sm }}>
        <Text style={styles.sectionLabel}>{t('leaveNote')}</Text>
        <TextInput
          placeholderTextColor={colors.subtle}
          accessibilityLabel={t('noteLabel')}
          multiline
          maxLength={MAX_NOTE_LENGTH + 50}
          value={note}
          onChangeText={setNote}
          placeholder={t('notePlaceholder')}
          style={[
            styles.input,
            { minHeight: 72, backgroundColor: colors.surface },
          ]}
        />
        <View style={styles.rowBetween}>
          <Text
            style={[
              styles.caption,
              note.length > MAX_NOTE_LENGTH && { color: colors.danger },
            ]}
          >
            {t('characters', { n: note.length, max: MAX_NOTE_LENGTH })}
          </Text>
          <Button
            size="sm"
            label={t('sendNote')}
            disabled={!note.trim() || note.length > MAX_NOTE_LENGTH}
            onPress={() => report(submitNote(context, note), true)}
          />
        </View>
      </View>

      <Divider />

      <View style={{ gap: space.sm }}>
        <Text style={styles.sectionLabel}>{t('askMove')}</Text>
        <Text style={styles.caption}>{t('seatChangeNote')}</Text>
        <View style={styles.row}>
          {SEAT_PREFERENCES.map((option) => (
            <Button
              key={option.id}
              size="sm"
              label={seatPreferenceLabel(option.id, lang)}
              selected={preferred === option.id}
              onPress={() => setPreferred(option.id)}
            />
          ))}
        </View>
        <TextInput
          placeholderTextColor={colors.subtle}
          accessibilityLabel={t('moveReasonLabel')}
          maxLength={MAX_NOTE_LENGTH + 50}
          value={moveReason}
          onChangeText={setMoveReason}
          placeholder={t('moveReasonPlaceholder')}
          style={[styles.input, { backgroundColor: colors.surface }]}
        />
        <View style={styles.row}>
          <Button
            size="sm"
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
        </View>
      </View>

      {feedback ? (
        <View
          style={{
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: feedback.ok
              ? colors.greenSurface
              : colors.dangerSurface,
            borderWidth: 1,
            borderColor: feedback.ok ? colors.greenBorder : colors.dangerBorder,
          }}
        >
          <Text
            accessibilityRole="alert"
            style={[
              styles.textStrong,
              { color: feedback.ok ? colors.green : colors.danger },
            ]}
          >
            {feedback.text}
          </Text>
        </View>
      ) : null}

      <Divider />

      <View style={styles.rowBetween}>
        <Text style={styles.sectionLabel}>{t('yourRequests')}</Text>
        <Badge label={`${mine.length}`} tone="neutral" />
      </View>

      {mine.length === 0 ? (
        <Text style={styles.text}>{t('noRequests')}</Text>
      ) : (
        mine.map((request) => {
          const status = requestStatus(request, context.minute);
          return (
            <View key={request.id} style={styles.inset}>
              <Text style={styles.textStrong}>
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
                <Text style={[styles.textStrong, { color: colors.amber }]}>
                  {t('staffWillCome')}
                </Text>
              ) : null}
              {status !== 'resolved' ? (
                <View style={styles.row}>
                  <Button
                    size="sm"
                    label={t('markResolved')}
                    onPress={() => markResolved(request.id)}
                  />
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </Card>
  );
}
