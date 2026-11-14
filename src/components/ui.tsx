import type { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const colors = {
  ink: '#1a241f',
  muted: '#57655c',
  subtle: '#78867d',
  paper: '#f4f2eb',
  paperAlt: '#eae7dd',
  surface: '#ffffff',
  surfaceSubtle: '#f9f8f4',
  border: '#d6ddd4',
  borderStrong: '#b8c4b6',
  green: '#1e563b',
  greenSurface: '#e6f2ec',
  greenBorder: '#a3cbb7',
  blue: '#1d5b8c',
  blueSurface: '#e8f1f8',
  blueBorder: '#abc9e4',
  amber: '#9a5b13',
  amberSurface: '#fef5e7',
  amberBorder: '#ebca96',
  danger: '#b42318',
  dangerSurface: '#fef3f2',
  dangerBorder: '#fecdca',
};

export type ButtonVariant =
  'default' | 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  selected = false,
  disabled = false,
  variant = 'default',
  size = 'md',
  style,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === 'primary' || selected;
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        isGhost && styles.buttonGhost,
        isDanger && !selected && styles.buttonDanger,
        isPrimary && styles.selected,
        { opacity: disabled ? 0.45 : pressed ? 0.72 : 1 },
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          size === 'sm' && styles.buttonTextSm,
          isDanger && !selected && { color: colors.danger },
          isPrimary && { color: '#ffffff' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  variant = 'default',
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'subtle' | 'accent' | 'Elevated';
}>) {
  return (
    <View
      style={[
        styles.card,
        variant === 'subtle' && styles.cardSubtle,
        variant === 'accent' && styles.cardAccent,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Heading({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return (
    <Text accessibilityRole="header" style={[styles.heading, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({
  children,
  color = colors.green,
}: PropsWithChildren<{ color?: string }>) {
  return (
    <Text style={[styles.eyebrow, { color }]} numberOfLines={1}>
      {children}
    </Text>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'info' | 'warning' | 'danger';
}) {
  const palette = {
    neutral: {
      bg: colors.paperAlt,
      border: colors.border,
      text: colors.muted,
    },
    success: {
      bg: colors.greenSurface,
      border: colors.greenBorder,
      text: colors.green,
    },
    info: {
      bg: colors.blueSurface,
      border: colors.blueBorder,
      text: colors.blue,
    },
    warning: {
      bg: colors.amberSurface,
      border: colors.amberBorder,
      text: colors.amber,
    },
    danger: {
      bg: colors.dangerSurface,
      border: colors.dangerBorder,
      text: colors.danger,
    },
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function StatTile({
  label,
  value,
  sublabel,
  accentColor,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accentColor?: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          accentColor ? { color: accentColor } : undefined,
        ]}
      >
        {value}
      </Text>
      {sublabel ? <Text style={styles.statSublabel}>{sublabel}</Text> : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 22,
    gap: 14,
    shadowColor: '#1a241f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardSubtle: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    padding: 16,
    borderRadius: 14,
    shadowOpacity: 0,
  },
  cardAccent: {
    backgroundColor: colors.greenSurface,
    borderColor: colors.greenBorder,
    padding: 16,
    borderRadius: 14,
    shadowOpacity: 0,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.paperAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
    borderRadius: 10,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  buttonDanger: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerBorder,
  },
  selected: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  buttonText: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 14,
  },
  buttonTextSm: {
    fontSize: 13,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSubtle,
    color: colors.ink,
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statTile: {
    flex: 1,
    minWidth: 135,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  statSublabel: {
    fontSize: 12,
    color: colors.subtle,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: 4,
  },
});
