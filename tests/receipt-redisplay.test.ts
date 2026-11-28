import { describe, expect, it } from 'vitest';
import { formatPaidAt, hasReceipt } from '../src/features/purchase/receipt';

const cash = {
  method: 'cash' as const,
  amount: 45000,
  tendered: 50000,
  change: 5000,
};

describe('F217 receipt redisplay', () => {
  it('formats the paid time in the branch timezone', () => {
    const paidAt = Date.UTC(2026, 10, 28, 7, 5);
    expect(formatPaidAt(paidAt, 'Asia/Ho_Chi_Minh')).toMatch(/14:05/);
    expect(formatPaidAt(paidAt, 'Asia/Ho_Chi_Minh')).toMatch(/28\/11\/2026/);
    expect(formatPaidAt(paidAt, 'Not/AZone')).toMatch(/07:05.*UTC$/);
  });

  it('only paid or completed orders with a settled payment have a receipt', () => {
    expect(hasReceipt({ status: 'paid', paidAt: 1 }, cash)).toBe(true);
    expect(hasReceipt({ status: 'completed', paidAt: 1 }, cash)).toBe(true);
    expect(hasReceipt({ status: 'awaiting_payment', paidAt: null }, null)).toBe(
      false,
    );
    expect(hasReceipt({ status: 'paid', paidAt: 1 }, null)).toBe(false);
    expect(hasReceipt({ status: 'cancelled', paidAt: 1 }, cash)).toBe(false);
  });
});
