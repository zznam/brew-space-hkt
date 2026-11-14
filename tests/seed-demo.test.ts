import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_CUSTOMER_ID, isDemoState } from '@/core';
import { appStore } from '@/core/useAppStore';
import { cartStore } from '@/features/customer/cart/useCart';
import { pointsBalance } from '@/features/customer/loyalty/loyaltyModel';
import { isLoyaltyState } from '@/features/customer/loyalty/loyaltyStore';
import { loyaltyStore } from '@/features/customer/loyalty/useLoyalty';
import { computeBadges } from '@/features/customer/rewards/badgesModel';
import { supportStore } from '@/features/customer/support/useSupport';
import {
  resetAllDemoStores,
  seedSpeedrunDemo,
} from '@/features/gallery/seedDemo';
import { posStore } from '@/features/merchant/pos/usePosStore';

const storage = vi.hoisted(() => ({
  getItem: vi.fn().mockResolvedValue(null),
  setItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: storage,
}));

describe('seedSpeedrunDemo & resetAllDemoStores', () => {
  beforeEach(() => {
    resetAllDemoStores();
  });

  it('seeds all demo stores with valid speedrun data', () => {
    seedSpeedrunDemo();

    const core = appStore.getState();
    expect(isDemoState(core)).toBe(true);
    for (const venueId of ['grind', 'matcha', 'cyber'] as const) {
      const session = core.sessions.find(
        (s) => s.venueId === venueId && s.customerId === DEMO_CUSTOMER_ID,
      );
      expect(session).toBeDefined();
      expect(session?.orders.length).toBeGreaterThan(0);
    }

    const loyalty = loyaltyStore.getState();
    expect(isLoyaltyState(loyalty)).toBe(true);
    expect(pointsBalance(loyalty, 'grind')).toBe(858);

    const badges = computeBadges(loyalty.visits);
    expect(badges.filter((b) => b.earned).length).toBeGreaterThanOrEqual(6);

    const posOrders = posStore
      .getState()
      .orders.filter((o) => o.venueId === 'grind');
    const fulfillments = new Set(posOrders.map((o) => o.fulfillment));
    expect(fulfillments.has('queued')).toBe(true);
    expect(fulfillments.has('preparing')).toBe(true);
    expect(fulfillments.has('ready')).toBe(true);
    expect(fulfillments.has('served')).toBe(true);
    expect(
      posOrders.filter((o) => o.status === 'draft').length,
    ).toBeGreaterThan(0);

    const cart = cartStore.getState();
    expect(cart.orders.length).toBeGreaterThan(0);
    expect(cart.lines.length).toBeGreaterThan(0);

    const support = supportStore.getState();
    expect(support.lastReceipt).not.toBeNull();
    expect(support.requests.length).toBeGreaterThan(0);
  });

  it('resetAllDemoStores clears seeded stores back to initial state', () => {
    seedSpeedrunDemo();
    resetAllDemoStores();

    expect(isDemoState(appStore.getState())).toBe(true);
    expect(posStore.getState().orders).toHaveLength(0);
    expect(loyaltyStore.getState().visits).toHaveLength(0);
    expect(Object.keys(loyaltyStore.getState().memberships)).toHaveLength(0);
    expect(supportStore.getState().requests).toHaveLength(0);
    expect(supportStore.getState().lastReceipt).toBeNull();
    expect(cartStore.getState().orders).toHaveLength(0);
    expect(cartStore.getState().lines).toHaveLength(0);
  });
});
