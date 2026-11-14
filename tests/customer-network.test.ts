import { describe, expect, it } from 'vitest';
import {
  OFFLINE_MESSAGE,
  blockWhenOffline,
} from '../src/features/customer/network/networkModel';

describe('blockWhenOffline', () => {
  it('returns null while online', () => {
    expect(blockWhenOffline(true)).toBeNull();
  });
  it('returns the offline message while offline', () => {
    expect(blockWhenOffline(false)).toBe(OFFLINE_MESSAGE);
    expect(OFFLINE_MESSAGE).toBe(
      "You're offline. Ordering and ending your session are paused until you reconnect.",
    );
  });
});
