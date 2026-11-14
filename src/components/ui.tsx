import { useState, type PropsWithChildren, type ReactNode } from 'react';
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
import { Icon, type IconName } from './Icon';
import {
  colors,
  elevation,
  layout,
  motion,
  radius,
  space,
  type,
} from './theme';

export { colors, elevation, layout, motion, radius, space, type };
export { Icon, type IconName };

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
    isWide: safeWidth >= layout.wideBreakpoint,
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
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === 'primary' || selected;
  const isSecondary = variant === 'secondary' && !isPrimary;
  const isDanger = variant === 'danger' && !isPrimary;
  const isGhost = variant === 'ghost' && !isPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={size === 'sm' ? 4 : undefined}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        isGhost && styles.buttonGhost,
        isSecondary && styles.buttonSecondary,
        isDanger && styles.buttonDanger,
        isPrimary && styles.selected,
        isPrimary && pressed && { backgroundColor: colors.greenPressed },
        fullWidth && { width: '100%' },
        {
          opacity: disabled
            ? motion.disabledOpacity
            : pressed && !isPrimary
              ? motion.pressedOpacity
              : 1,
        },
        style,
      ]}
    >
      <Text
        numberOfLines={2}
        style={[
          styles.buttonText,
          size === 'sm' && styles.buttonTextSm,
          isSecondary && { color: colors.green },
          isDanger && { color: colors.danger },
          isPrimary && { color: colors.onPrimary },
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
  variant?: 'default' | 'subtle' | 'accent';
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

/** `level` 1 is a section title; 2 is a card or sub-section title. */
export function Heading({
  children,
  level = 1,
  style,
}: PropsWithChildren<{ level?: 1 | 2; style?: StyleProp<TextStyle> }>) {
  return (
    <Text
      accessibilityRole="header"
      style={[level === 1 ? styles.heading : styles.subheading, style]}
    >
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
  tone?: Tone;
}) {
  const palette = TONES[tone];

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
        <View style={{ flex: 1, gap: space.xxs }}>
          <Text style={styles.subheading}>{title}</Text>
          {summary ? (
            <Text style={styles.caption} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={{ gap: space.md, paddingTop: space.xs }}>{children}</View>
      ) : null}
    </View>
  );
}

/** Page container: the vertical rhythm between a screen's sections. */
export function Screen({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

/**
 * The top of every screen: what this is (overline), where you are (title),
 * one optional line of context, and an optional trailing status.
 */
export function ScreenHeader({
  overline,
  title,
  subtitle,
  trailing,
  accentColor = colors.green,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  accentColor?: string;
}) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeaderRow}>
        <View style={{ flex: 1, gap: space.xs }}>
          {overline ? <Eyebrow color={accentColor}>{overline}</Eyebrow> : null}
          <Text accessibilityRole="header" style={styles.display}>
            {title}
          </Text>
        </View>
        {trailing}
      </View>
      {subtitle ? <Text style={styles.text}>{subtitle}</Text> : null}
    </View>
  );
}

export type Tone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

const TONES: Record<Tone, { bg: string; border: string; text: string }> = {
  neutral: { bg: colors.paperAlt, border: colors.border, text: colors.muted },
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
};

/** Inline message that stays where the action happened. */
export function Banner({
  children,
  tone = 'info',
  role,
}: PropsWithChildren<{ tone?: Tone; role?: 'alert' }>) {
  const palette = TONES[tone];
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <Text
        accessibilityRole={role}
        style={[styles.bannerText, { color: palette.text }]}
      >
        {children}
      </Text>
    </View>
  );
}

/** What a list shows when it has nothing: one line, optionally one action. */
export function EmptyState({
  title,
  message,
  children,
}: PropsWithChildren<{ title?: string; message: string }>) {
  return (
    <View style={styles.emptyState}>
      {title ? <Text style={styles.subheading}>{title}</Text> : null}
      <Text style={[styles.text, { textAlign: 'center' }]}>{message}</Text>
      {children}
    </View>
  );
}

/** Toggleable filter or choice. Use `Button` for actions. */
export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        {
          opacity: disabled
            ? motion.disabledOpacity
            : pressed
              ? motion.pressedOpacity
              : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Two to four mutually exclusive options in one control. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              size === 'sm' && styles.segmentSm,
              selected && styles.segmentSelected,
              { opacity: pressed ? motion.pressedOpacity : 1 },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.segmentText,
                size === 'sm' && { fontSize: type.caption.fontSize },
                selected && { color: colors.ink },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  selected = false,
}: {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        selected && { backgroundColor: colors.ink },
        { opacity: pressed ? motion.pressedOpacity : 1 },
      ]}
    >
      <Icon name={icon} color={selected ? colors.onPrimary : colors.ink} />
    </Pressable>
  );
}

export interface TabItem<T extends string> {
  key: T;
  label: string;
  icon: IconName;
  /** Full name for assistive tech when the visible label is abbreviated. */
  accessibilityLabel?: string;
}

/** Bottom navigation: the app's 3–5 top-level destinations, thumb-reachable. */
export function TabBar<T extends string>({
  items,
  current,
  onSelect,
}: {
  items: TabItem<T>[];
  current: T | null;
  onSelect: (key: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.tabBar}>
      <View style={styles.tabBarInner}>
        {items.map((item) => {
          const selected = item.key === current;
          const tint = selected ? colors.green : colors.subtle;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel ?? item.label}
              accessibilityState={{ selected }}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [
                styles.tab,
                { opacity: pressed ? motion.pressedOpacity : 1 },
              ]}
            >
              <View style={[styles.tabPill, selected && styles.tabPillActive]}>
                <Icon name={item.icon} color={tint} />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  { color: tint },
                  selected && { fontWeight: '700' },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  // Layout
  screen: {
    width: '100%',
    gap: space.lg,
  },
  screenHeader: {
    gap: space.sm,
    paddingTop: space.xs,
  },
  screenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
    width: '100%',
    marginVertical: space.xs,
  },

  // Surfaces
  card: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.md,
    ...elevation.card,
  },
  cardSubtle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md + 2,
    ...elevation.none,
  },
  cardAccent: {
    backgroundColor: colors.greenSurface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...elevation.none,
  },
  banner: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  bannerText: {
    ...type.caption,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  inset: {
    width: '100%',
    maxWidth: '100%',
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    gap: space.xs,
  },
  insetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },

  // Type
  display: {
    ...type.display,
    color: colors.ink,
  },
  heading: {
    ...type.title,
    color: colors.ink,
  },
  subheading: {
    ...type.headline,
    color: colors.ink,
  },
  eyebrow: {
    ...type.overline,
  },
  sectionLabel: {
    ...type.overline,
    color: colors.muted,
  },
  text: {
    ...type.body,
    color: colors.muted,
  },
  textStrong: {
    ...type.label,
    color: colors.ink,
  },
  caption: {
    ...type.caption,
    color: colors.muted,
  },

  // Controls
  button: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    minHeight: layout.controlHeight,
    maxWidth: '100%',
    borderRadius: radius.lg - 2,
    backgroundColor: colors.paperAlt,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSm: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    minHeight: layout.controlHeightSm,
    borderRadius: radius.md - 2,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
  },
  buttonSecondary: {
    backgroundColor: colors.greenSurface,
  },
  buttonDanger: {
    backgroundColor: colors.dangerSurface,
  },
  selected: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  buttonText: {
    ...type.label,
    color: colors.ink,
    textAlign: 'center',
  },
  buttonTextSm: {
    fontSize: 13,
    lineHeight: 18,
  },
  iconButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radius.pill,
    backgroundColor: colors.paperAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: layout.controlHeightSm,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  chipText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: colors.paperAlt,
  },
  segment: {
    flexGrow: 1,
    minHeight: layout.controlHeightSm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.md - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSm: {
    minHeight: 30,
    paddingHorizontal: space.sm + 2,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    ...elevation.card,
  },
  segmentText: {
    ...type.label,
    fontSize: 14,
    color: colors.muted,
  },
  input: {
    width: '100%',
    maxWidth: '100%',
    minHeight: layout.controlHeight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm + 2,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
  },

  // Data display
  badge: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  statTile: {
    flex: 1,
    minWidth: 96,
    maxWidth: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.xxs,
    ...elevation.card,
  },
  statLabel: {
    ...type.overline,
    letterSpacing: 0.4,
    color: colors.muted,
  },
  statValue: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.ink,
  },
  statSublabel: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.subtle,
  },
  collapsibleContainer: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    gap: space.sm,
  },
  collapsibleHeader: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },

  // Navigation
  tabBar: {
    width: '100%',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    alignItems: 'center',
    ...elevation.raised,
  },
  tabBarInner: {
    width: '100%',
    maxWidth: 560,
    flexDirection: 'row',
    paddingHorizontal: space.sm,
    paddingTop: space.xs + 2,
    paddingBottom: space.xs + 2,
  },
  tab: {
    flex: 1,
    minHeight: layout.tabBarHeight - 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
  },
  tabPill: {
    width: 56,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: colors.greenSurface,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
});
