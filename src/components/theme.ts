/**
 * BrewSpace design tokens. The single source of truth for colour, type,
 * spacing, radius, elevation and motion in the Expo app.
 *
 * Screens never write a raw hex, font size or radius: they read a token from
 * here (or a shared style from `ui.tsx`). See `docs/design-system.md`.
 */

export const colors = {
  // Neutrals
  ink: '#16201b',
  muted: '#55635a',
  subtle: '#66736b',
  paper: '#f5f3ec',
  paperAlt: '#ebe8de',
  surface: '#ffffff',
  surfaceSubtle: '#f8f7f2',
  border: '#e2e5dc',
  borderStrong: '#bcc7ba',
  // Brand / success
  green: '#1e563b',
  greenPressed: '#17432e',
  greenSurface: '#e4f1ea',
  greenBorder: '#a9cfbb',
  // Info
  blue: '#1d5b8c',
  blueSurface: '#e6f0f8',
  blueBorder: '#abc9e4',
  // Warning
  amber: '#8f5210',
  amberSurface: '#fdf3e1',
  amberBorder: '#ebca96',
  // Danger
  danger: '#b42318',
  dangerSurface: '#fdefed',
  dangerBorder: '#f7c5c0',
  // On-colour and scrims
  onPrimary: '#ffffff',
  overlay: 'rgba(22, 32, 27, 0.45)',
} as const;

/** 4pt spacing grid. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Type scale. Every text style in the app is one of these. */
export const type = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
} as const;

/** Elevation levels. `none` is flat; `card` rests; `raised` floats (bars). */
export const elevation = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  raised: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;

/** Sizes that more than one component must agree on. */
export const layout = {
  touchTarget: 44,
  controlHeight: 48,
  controlHeightSm: 36,
  appBarHeight: 56,
  tabBarHeight: 60,
  screenPadding: space.lg,
  contentMaxWidth: 1080,
  wideBreakpoint: 768,
} as const;

export const motion = {
  pressedOpacity: 0.7,
  disabledOpacity: 0.4,
} as const;
