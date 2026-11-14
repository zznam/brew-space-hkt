import { useEffect, useReducer } from 'react';
import { Text, View } from 'react-native';
import { Button, styles } from '@/components/ui';
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

const sectionTitle = { fontWeight: '700', fontSize: 17 } as const;

/** Pomodoro aid for the session screen. Uses the device clock only: it never
 * changes session time or the bill, and it resets if you leave this screen. */
export function FocusTimer({ venueId }: { venueId: string }) {
  const [state, dispatch] = useReducer(focusReducer, undefined, () =>
    initialFocusState(),
  );
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
  const message = announcement(state);
  return (
    <View style={{ gap: 8 }}>
      <Text style={sectionTitle}>Focus timer</Text>
      <Text style={styles.text}>
        A personal Pomodoro aid on this device. It uses your device clock and
        never affects your session time or bill. It resets if you leave this
        screen.
      </Text>
      <View style={styles.row}>
        {FOCUS_PRESETS.map((item) => (
          <Button
            key={item.id}
            label={`${item.label} min`}
            selected={item.id === state.presetId}
            disabled={state.phase !== 'idle'}
            onPress={() => dispatch({ type: 'preset', presetId: item.id })}
          />
        ))}
      </View>
      <Text
        accessibilityLabel={`${phaseLabel(state.phase)}, ${formatClock(state.remainingMs)} left`}
        style={{ fontSize: 32, fontWeight: '700' }}
      >
        {formatClock(state.remainingMs)}
      </Text>
      <Text style={styles.text}>
        {phaseLabel(state.phase)}
        {state.phase !== 'idle' && !state.running ? ' (paused)' : ''} · Focus
        blocks done: {state.cycles} · {preset.workMinutes} min focus,{' '}
        {preset.breakMinutes} min break
      </Text>
      <View style={styles.row}>
        <Button
          label={
            state.phase === 'idle'
              ? 'Start'
              : state.running
                ? 'Pause'
                : 'Resume'
          }
          onPress={() =>
            dispatch({
              type: state.running ? 'pause' : 'start',
              nowMs: Date.now(),
            })
          }
        />
        <Button
          label="Reset"
          disabled={state.phase === 'idle'}
          onPress={() => dispatch({ type: 'reset' })}
        />
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.text}>
        {message}
      </Text>
      {state.phase === 'break' ? (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {breakSuggestion(membership && prefs ? prefs : null)}
        </Text>
      ) : null}
    </View>
  );
}
