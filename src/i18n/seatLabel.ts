import type { Lang } from './i18n';

/** Fixture labels stay "Seat 3"; only the Vietnamese rendering is "Chỗ 3". */
export const seatLabelText = (label: string, lang: Lang) =>
  lang === 'vi' ? label.replace(/^Seat\b/, 'Chỗ') : label;
