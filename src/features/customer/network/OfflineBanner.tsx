import { Banner } from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
import { blockWhenOffline } from './networkModel';
import { networkMessages } from './messages';
import { useOnlineStatus } from './useOnlineStatus';

/** Renders nothing while online. Pass `online` to reuse a value the screen
 * already read from useOnlineStatus(); otherwise the banner reads it itself. */
export function OfflineBanner({ online }: { online?: boolean }) {
  const { lang } = useT(networkMessages);
  const live = useOnlineStatus();
  const message = blockWhenOffline(online ?? live, lang);
  if (!message) return null;
  return (
    <Banner tone="danger" role="alert">
      {message}
    </Banner>
  );
}
