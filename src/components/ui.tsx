import { useState, type PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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

/**
 * Mobile-first responsive hook.
 * Base styles target a 390pt phone viewport (1 column, full-width cards).
 * Use `isWide` (width >= 768) only to layer multi-column enhancements on top.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const safeWidth = width > 0 ? width : 390;
  return {
    width: safeWidth,
    height,
    isWide: safeWidth >= 768,
    isCompact: safeWidth < 420,
  };
}

export type ButtonVariant =
  'default' | 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  selected = false,
  disabled = false,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  style,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === 'primary' || selected;
  const isSecondary = variant === 'secondary' && !isPrimary;
  const isDanger = variant === 'danger' && !isPrimary;
  const isGhost = variant === 'ghost' && !isPrimary;

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
        isSecondary && styles.buttonSecondary,
        isDanger && styles.buttonDanger,
        isPrimary && styles.selected,
        fullWidth && { width: '100%' },
        { opacity: disabled ? 0.45 : pressed ? 0.72 : 1 },
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          size === 'sm' && styles.buttonTextSm,
          isSecondary && { color: colors.green, fontWeight: '700' },
          isDanger && { color: colors.danger, fontWeight: '700' },
          isPrimary && { color: '#ffffff', fontWeight: '700' },
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
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          accentColor ? { color: accentColor } : undefined,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {sublabel ? (
        <Text style={styles.statSublabel} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/**
 * Expandable row/card for moving secondary detail behind a tap on mobile.
 */
export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: PropsWithChildren<{
  title: string;
  summary?: string;
  defaultOpen?: boolean;
}>) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.collapsibleContainer}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.collapsibleHeader,
          { opacity: pressed ? 0.72 : 1 },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.subheading}>{title}</Text>
          {summary ? (
            <Text style={[styles.text, { fontSize: 13 }]} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.green }}>
          {open ? 'Hide ▲' : 'Show ▼'}
        </Text>
      </Pressable>
      {open ? <View style={{ gap: 10, paddingTop: 4 }}>{children}</View> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#1a241f',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardSubtle: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 14,
    shadowOpacity: 0,
  },
  cardAccent: {
    backgroundColor: colors.greenSurface,
    borderColor: colors.greenBorder,
    padding: 14,
    borderRadius: 14,
    shadowOpacity: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    maxWidth: '100%',
    borderRadius: 12,
    backgroundColor: colors.paperAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSm: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    minHeight: 38,
    borderRadius: 10,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  buttonSecondary: {
    backgroundColor: colors.greenSurface,
    borderColor: colors.greenBorder,
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
    width: '100%',
    maxWidth: '100%',
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSubtle,
    color: colors.ink,
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statTile: {
    flex: 1,
    minWidth: 96,
    maxWidth: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  statSublabel: {
    fontSize: 11,
    color: colors.subtle,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: 2,
  },
  collapsibleContainer: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    gap: 6,
  },
  collapsibleHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
