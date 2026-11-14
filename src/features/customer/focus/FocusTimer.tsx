import { useEffect, useReducer } from 'react';
import { Text, View } from 'react-native';
import { Button, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
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

const sectionTitle = { fontWeight: '700', fontSize: 17 } as const;

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
    <View style={{ gap: 8 }}>
      <Text style={sectionTitle}>{t('title')}</Text>
      <Text style={styles.text}>{t('intro')}</Text>
      <View style={styles.row}>
        {FOCUS_PRESETS.map((item) => (
          <Button
            key={item.id}
            label={t('presetLabel', { label: item.label })}
            selected={item.id === state.presetId}
            disabled={state.phase !== 'idle'}
            onPress={() => dispatch({ type: 'preset', presetId: item.id })}
          />
        ))}
      </View>
      <Text
        accessibilityLabel={t('clockLabel', {
          phase: phaseLabel(state.phase, lang),
          clock: formatClock(state.remainingMs),
        })}
        style={{ fontSize: 32, fontWeight: '700' }}
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
      <View style={styles.row}>
        <Button
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
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {breakSuggestion(membership && prefs ? prefs : null, lang)}
        </Text>
      ) : null}
    </View>
  );
}
