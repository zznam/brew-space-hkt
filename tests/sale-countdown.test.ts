import { describe, expect, it } from 'vitest';
import {
  clockOffset,
  formatCountdown,
  saleTimeLeft,
} from '../src/features/access/saleCountdown';

describe('F279 sale countdown by server time', () => {
  it('measures time left on the server clock even when the device clock is wrong', () => {
    const server = 1_000_000;
    const device = server - 120_000; // device is two minutes slow
    const offset = clockOffset(server, device);
    expect(saleTimeLeft(server + 60_000, device, offset)).toBe(60_000);
    expect(saleTimeLeft(server + 60_000, device + 90_000, offset)).toBe(0);
  });

  it('falls back to the device clock without a server time', () => {
    expect(clockOffset(Number.NaN, 5)).toBe(0);
  });

  it('formats short and long countdowns', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(59_001)).toBe('01:00');
    expect(formatCountdown(754_000)).toBe('12:34');
    expect(formatCountdown(3_600_000)).toBe('1 h 00 min');
    expect(formatCountdown(3_900_000)).toBe('1 h 05 min');
  });
});
