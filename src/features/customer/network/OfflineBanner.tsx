import { Text, View } from 'react-native';
import { styles } from '@/components/ui';
import { blockWhenOffline } from './networkModel';
import { useOnlineStatus } from './useOnlineStatus';

/** Renders nothing while online. Pass `online` to reuse a value the screen
 * already read from useOnlineStatus(); otherwise the banner reads it itself. */
export function OfflineBanner({ online }: { online?: boolean }) {
  const live = useOnlineStatus();
  const message = blockWhenOffline(online ?? live);
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: '#fdecea',
        borderWidth: 1,
        borderColor: '#e3a9a3',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Text style={[styles.text, { color: '#8a2a22', fontWeight: '600' }]}>
        {message}
      </Text>
    </View>
  );
}
