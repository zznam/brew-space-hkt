import { useEffect, useReducer } from 'react';
import { Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  colors,
  radius,
  styles,
  space,
} from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
import { useLoyalty, useLoyaltyReady } from '../loyalty/useLoyalty';
import {
  FOCUS_PRESETS,
  announcement,
  breakSuggestion,
  focusReducer,
  formatClock,
  getPreset,
  initialFocusState,
  phaseLabel,
} from './focusModel';
import { focusMessages } from './messages';

/** Pomodoro aid for the session screen. Uses the device clock only: it never
 * changes session time or the bill, and it resets if you leave this screen. */
export function FocusTimer({ venueId }: { venueId: string }) {
  const [state, dispatch] = useReducer(focusReducer, undefined, () =>
    initialFocusState(),
  );
  const { t, lang } = useT(focusMessages);
  useLoyaltyReady();
  const membership = useLoyalty((store) => store.memberships[venueId]);
  const prefs = useLoyalty((store) => store.preferences[venueId]);
  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(
      () => dispatch({ type: 'tick', nowMs: Date.now() }),
      1000,
    );
    return () => clearInterval(id);
  }, [state.running]);

  const preset = getPreset(state.presetId);
  const message = announcement(state, lang);
  return (
    <Card variant="subtle">
      <View style={styles.rowBetween}>
        <Text style={styles.subheading}>{t('title')}</Text>
        <Badge
          label={phaseLabel(state.phase, lang)}
          tone={
            state.phase === 'work'
              ? 'info'
              : state.phase === 'break'
                ? 'success'
                : 'neutral'
          }
        />
      </View>

      <Text style={styles.text}>{t('intro')}</Text>

      <View style={styles.row}>
        {FOCUS_PRESETS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            label={t('presetLabel', { label: item.label })}
            selected={item.id === state.presetId}
            disabled={state.phase !== 'idle'}
            onPress={() => dispatch({ type: 'preset', presetId: item.id })}
          />
        ))}
      </View>

      <View
        style={{
          padding: space.lg,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          gap: space.xs,
        }}
      >
        <Text
          accessibilityLabel={t('clockLabel', {
            phase: phaseLabel(state.phase, lang),
            clock: formatClock(state.remainingMs),
          })}
          style={[styles.display, { fontVariant: ['tabular-nums'] }]}
        >
          {formatClock(state.remainingMs)}
        </Text>
        <Text style={styles.text}>
          {t('summary', {
            phase: phaseLabel(state.phase, lang),
            paused: state.phase !== 'idle' && !state.running ? t('paused') : '',
            cycles: state.cycles,
            work: preset.workMinutes,
            rest: preset.breakMinutes,
          })}
        </Text>
      </View>

      <View style={styles.row}>
        <Button
          variant="secondary"
          label={
            state.phase === 'idle'
              ? t('start')
              : state.running
                ? t('pause')
                : t('resume')
          }
          onPress={() =>
            dispatch({
              type: state.running ? 'pause' : 'start',
              nowMs: Date.now(),
            })
          }
        />
        <Button
          label={t('reset')}
          disabled={state.phase === 'idle'}
          onPress={() => dispatch({ type: 'reset' })}
        />
      </View>

      <Text accessibilityLiveRegion="polite" style={styles.text}>
        {message}
      </Text>
      {state.phase === 'break' ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.textStrong, { color: colors.green }]}
        >
          {breakSuggestion(membership && prefs ? prefs : null, lang)}
        </Text>
      ) : null}
    </Card>
  );
}
