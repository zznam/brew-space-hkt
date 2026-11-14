import { translate, type Lang } from '../i18n/i18n';
import { networkMessages } from './messages';

/** Pure offline policy. No React, no platform imports: safe to import from tests. */
export const OFFLINE_MESSAGE = networkMessages.en.offline;

/** Returns the message to show when an action whose result the app cannot
 * learn must be blocked, or null when the action may go ahead. */
export function blockWhenOffline(
  online: boolean,
  lang: Lang = 'en',
): string | null {
  return online ? null : translate(networkMessages, lang, 'offline');
}
