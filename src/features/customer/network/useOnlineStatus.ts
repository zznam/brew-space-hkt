import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

const isWeb = () => Platform.OS === 'web' && typeof window !== 'undefined';

function subscribe(onChange: () => void) {
  if (!isWeb()) return () => {};
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function getSnapshot() {
  return isWeb() && typeof navigator !== 'undefined'
    ? navigator.onLine !== false
    : true;
}

/** True while the device is online. On web it follows navigator.onLine and the
 * window 'online'/'offline' events. On iOS/Android it always returns true:
 * detecting a lost connection there needs @react-native-community/netinfo,
 * which is not a dependency of this demo. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
