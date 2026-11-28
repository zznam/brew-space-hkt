import { describe, expect, it } from 'vitest';
import { customerRefundStatus } from '../src/core/pilot/orders';
import type { RefundStatus } from '../src/core/pilot/types';

describe('F127 refund status for the customer', () => {
  it('maps every internal status to requested, approved, paid or declined', () => {
    const cases: [RefundStatus, string][] = [
      ['requested', 'requested'],
      ['approved', 'approved'],
      ['processing', 'approved'],
      ['failed', 'approved'],
      ['succeeded', 'paid'],
      ['declined', 'declined'],
    ];
    for (const [internal, shown] of cases)
      expect(customerRefundStatus(internal)).toBe(shown);
  });

  it('only shows paid once the money is confirmed', () => {
    const notYet: RefundStatus[] = [
      'requested',
      'approved',
      'processing',
      'failed',
      'declined',
    ];
    for (const status of notYet)
      expect(customerRefundStatus(status)).not.toBe('paid');
  });
});
