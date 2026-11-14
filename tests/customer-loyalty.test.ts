import { describe, expect, it } from 'vitest';
import {
  ALLERGY_NOTICE,
  MAX_ALLERGY_NOTE,
  REFERRAL_BONUS_POINTS,
  allergyNotice,
  checkFriendCode,
  memberReferralCode,
  referralCode,
  defaultPreferences,
  initialLoyaltyState,
  isValidPhone,
  joinProgramme,
  leaveProgramme,
  maskPhone,
  pointsBalance,
  pointsForTotal,
  recordVisit,
  requestOtp,
  setPreferences,
  toggleFavourite,
  venueStats,
  verifyOtp,
  type LoyaltyState,
} from '../src/features/customer/loyalty/loyaltyModel';
import {
  createLoyaltyStore,
  isLoyaltyState,
} from '../src/features/customer/loyalty/loyaltyStore';
import type { VisitSnapshot } from '../src/features/customer/shared/visit';

function visit(
  sessionId: string,
  overrides: Partial<VisitSnapshot> = {},
): VisitSnapshot {
  return {
    sessionId,
    venueId: 'grind',
    venueName: 'The Grind Co-Work',
    seatId: 'grind-seat-3',
    seatLabel: 'Seat 3',
    seatKind: 'desk',
    mode: 'METERED_OPEN',
    minutes: 60,
    time: 30000,
    items: 45000,
    total: 75000,
    orders: [{ name: 'Cold brew', unitPrice: 45000, quantity: 1 }],
    ...overrides,
  };
}
function memberState(venueId = 'grind', phone = '0901234567'): LoyaltyState {
  const result = joinProgramme(initialLoyaltyState(), venueId, {
    phone,
    code: '123456',
    consent: true,
  });
  if (!result.ok) throw new Error(result.message);
  return result.state;
}

describe('phone and OTP', () => {
  it.each([
    ['0901234567', true],
    ['090 123 4567', true],
    ['090.123.4567', true],
    ['901234567', false],
    ['09012345678', false],
    ['1901234567', false],
    ['090123456a', false],
    ['', false],
  ])('validates %s as %s', (phone, valid) => {
    expect(isValidPhone(phone)).toBe(valid);
  });
  it('masks the phone for display', () => {
    expect(maskPhone('0901234567')).toBe('090****567');
    expect(maskPhone('090 123 4567')).toBe('090****567');
  });
  it('requests a demo code only for a valid phone', () => {
    expect(requestOtp('0901234567')).toEqual({
      ok: true,
      phone: '0901234567',
      demoCode: '123456',
    });
    expect(requestOtp('12345')).toMatchObject({ ok: false });
  });
  it('verifies the demo code', () => {
    expect(verifyOtp('123456')).toBe(true);
    expect(verifyOtp(' 123456 ')).toBe(true);
    expect(verifyOtp('000000')).toBe(false);
  });
});

describe('joining', () => {
  const base = initialLoyaltyState();
  const valid = { phone: '0901234567', code: '123456', consent: true };
  it('joins with a valid phone, code and consent', () => {
    const result = joinProgramme(base, 'grind', valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.memberships.grind).toEqual({
        venueId: 'grind',
        phone: '0901234567',
        consent: true,
      });
      expect(result.state.memberships.matcha).toBeUndefined();
    }
  });
  it('requires explicit consent', () => {
    const result = joinProgramme(base, 'grind', { ...valid, consent: false });
    expect(result.ok).toBe(false);
  });
  it('rejects a wrong code and a bad phone', () => {
    expect(joinProgramme(base, 'grind', { ...valid, code: '111111' }).ok).toBe(
      false,
    );
    expect(joinProgramme(base, 'grind', { ...valid, phone: '123' }).ok).toBe(
      false,
    );
  });
  it('rejects unknown venues and double joins', () => {
    expect(joinProgramme(base, 'nowhere', valid).ok).toBe(false);
    expect(joinProgramme(memberState(), 'grind', valid).ok).toBe(false);
  });
  it('does not change state on failure (store)', () => {
    const store = createLoyaltyStore();
    const before = store.getState().memberships;
    const result = store.getState().join('grind', { ...valid, consent: false });
    expect(result.ok).toBe(false);
    expect(store.getState().memberships).toBe(before);
    expect(store.getState().join('grind', valid)).toEqual({ ok: true });
    expect(store.getState().memberships.grind?.phone).toBe('0901234567');
  });
});

describe('points', () => {
  it.each([
    [0, 0],
    [999, 0],
    [1000, 1],
    [1999, 1],
    [75000, 75],
    [-5000, 0],
    [1500.5, 0],
  ])('%i VND earns %i points', (total, points) => {
    expect(pointsForTotal(total)).toBe(points);
  });
  it('earns points for members only once per session', () => {
    const first = recordVisit(memberState(), visit('s1'));
    expect(pointsBalance(first, 'grind')).toBe(75);
    expect(first.ledger).toEqual([
      {
        id: 'earn-s1',
        venueId: 'grind',
        sessionId: 's1',
        points: 75,
        kind: 'earn',
      },
    ]);
    const second = recordVisit(first, visit('s1', { total: 999000 }));
    expect(second).toBe(first);
  });
  it('records guest visits for stats but earns no points', () => {
    const state = recordVisit(initialLoyaltyState(), visit('s1'));
    expect(state.visits).toHaveLength(1);
    expect(state.ledger).toEqual([]);
    expect(pointsBalance(state, 'grind')).toBe(0);
  });
  it('does not add a ledger entry for a visit worth under one point', () => {
    const state = recordVisit(memberState(), visit('s1', { total: 500 }));
    expect(state.visits).toHaveLength(1);
    expect(state.ledger).toEqual([]);
  });
  it('earns only where the customer is a member', () => {
    const state = recordVisit(
      memberState('grind'),
      visit('s2', { venueId: 'matcha', seatId: 'matcha-seat-3' }),
    );
    expect(state.ledger).toEqual([]);
    expect(venueStats(state, 'matcha').visits).toBe(1);
  });
  it('is idempotent through the store', () => {
    const store = createLoyaltyStore();
    store.getState().join('grind', {
      phone: '0901234567',
      code: '123456',
      consent: true,
    });
    store.getState().recordVisit(visit('s1'));
    store.getState().recordVisit(visit('s1'));
    expect(store.getState().ledger).toHaveLength(1);
    expect(store.getState().visits).toHaveLength(1);
  });
});

describe('stats', () => {
  it('summarises one venue', () => {
    let state = initialLoyaltyState();
    state = recordVisit(state, visit('s1', { minutes: 30, total: 10000 }));
    state = recordVisit(
      state,
      visit('s2', {
        minutes: 90,
        total: 20000,
        seatKind: 'pod',
        orders: [
          { name: 'Croissant', unitPrice: 35000, quantity: 2 },
          { name: 'Cold brew', unitPrice: 45000, quantity: 1 },
        ],
      }),
    );
    state = recordVisit(state, visit('s3', { minutes: 60, total: 5000 }));
    state = recordVisit(
      state,
      visit('other', { venueId: 'matcha', seatId: 'matcha-seat-1' }),
    );
    expect(venueStats(state, 'grind')).toEqual({
      visits: 3,
      totalMinutes: 180,
      totalSpend: 35000,
      favouriteSeatKind: 'desk',
      favouriteItem: 'Cold brew',
    });
  });
  it('is empty without visits', () => {
    expect(venueStats(initialLoyaltyState(), 'grind')).toEqual({
      visits: 0,
      totalMinutes: 0,
      totalSpend: 0,
      favouriteSeatKind: null,
      favouriteItem: null,
    });
  });
});

describe('preferences', () => {
  it('requires membership', () => {
    expect(
      setPreferences(initialLoyaltyState(), 'grind', defaultPreferences()).ok,
    ).toBe(false);
  });
  it('saves valid preferences and trims the allergy note', () => {
    const result = setPreferences(memberState(), 'grind', {
      milk: 'oat',
      sweetness: 30,
      allergyNote: '  peanuts  ',
    });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.state.preferences.grind).toEqual({
        milk: 'oat',
        sweetness: 30,
        allergyNote: 'peanuts',
      });
  });
  it('rejects invalid values', () => {
    const state = memberState();
    const prefs = defaultPreferences();
    expect(
      setPreferences(state, 'grind', {
        ...prefs,
        allergyNote: 'x'.repeat(MAX_ALLERGY_NOTE + 1),
      }).ok,
    ).toBe(false);
    expect(
      setPreferences(state, 'grind', { ...prefs, sweetness: 45 as 50 }).ok,
    ).toBe(false);
    expect(
      setPreferences(state, 'grind', { ...prefs, milk: 'soy' as 'oat' }).ok,
    ).toBe(false);
    expect(
      setPreferences(state, 'grind', {
        ...prefs,
        allergyNote: 'x'.repeat(MAX_ALLERGY_NOTE),
      }).ok,
    ).toBe(true);
  });
  it('shows the staff notice only for a non-empty allergy note', () => {
    const prefs = defaultPreferences();
    expect(allergyNotice(prefs)).toBeNull();
    expect(allergyNotice({ ...prefs, allergyNote: '   ' })).toBeNull();
    expect(allergyNotice({ ...prefs, allergyNote: 'nuts' })).toBe(
      ALLERGY_NOTICE,
    );
  });
});

describe('favourite seats', () => {
  it('toggles and caps at three per venue', () => {
    let state = initialLoyaltyState();
    for (const n of [1, 2, 3]) {
      const result = toggleFavourite(state, 'grind', `grind-seat-${n}`);
      if (!result.ok) throw new Error(result.message);
      state = result.state;
    }
    expect(toggleFavourite(state, 'grind', 'grind-seat-4').ok).toBe(false);
    // Other venues have their own allowance.
    expect(toggleFavourite(state, 'matcha', 'matcha-seat-1').ok).toBe(true);
    const removed = toggleFavourite(state, 'grind', 'grind-seat-2');
    expect(removed.ok && removed.state.favourites.grind).toEqual([
      'grind-seat-1',
      'grind-seat-3',
    ]);
  });
  it('rejects seats from another venue', () => {
    expect(
      toggleFavourite(initialLoyaltyState(), 'grind', 'matcha-seat-1').ok,
    ).toBe(false);
  });
});

describe('leaving the programme', () => {
  it('deletes only that venue and keeps the rest', () => {
    let state = memberState('grind');
    const joined = joinProgramme(state, 'matcha', {
      phone: '0907654321',
      code: '123456',
      consent: true,
    });
    if (!joined.ok) throw new Error(joined.message);
    state = joined.state;
    state = recordVisit(state, visit('g1'));
    state = recordVisit(
      state,
      visit('m1', { venueId: 'matcha', seatId: 'matcha-seat-3' }),
    );
    const pinned = toggleFavourite(state, 'grind', 'grind-seat-3');
    if (!pinned.ok) throw new Error(pinned.message);
    state = pinned.state;
    const pinnedOther = toggleFavourite(state, 'matcha', 'matcha-seat-3');
    if (!pinnedOther.ok) throw new Error(pinnedOther.message);
    state = pinnedOther.state;

    const left = leaveProgramme(state, 'grind');
    expect(left.memberships.grind).toBeUndefined();
    expect(left.preferences.grind).toBeUndefined();
    expect(left.favourites.grind).toBeUndefined();
    expect(left.visits.map((v) => v.venueId)).toEqual(['matcha']);
    expect(left.ledger.map((entry) => entry.venueId)).toEqual(['matcha']);
    expect(left.memberships.matcha).toBeDefined();
    expect(left.favourites.matcha).toEqual(['matcha-seat-3']);
    expect(left.preferences.matcha).toBeDefined();
    // The original state is untouched.
    expect(state.memberships.grind).toBeDefined();
  });
  it('wipes a guest venue through the store', () => {
    const store = createLoyaltyStore();
    store.getState().recordVisit(visit('s1'));
    store.getState().toggleFavourite('grind', 'grind-seat-1');
    store.getState().leave('grind');
    expect(store.getState().visits).toEqual([]);
    expect(store.getState().favourites).toEqual({});
  });
});

describe('isLoyaltyState', () => {
  const populated = (() => {
    let state = recordVisit(memberState(), visit('s1'));
    const pinned = toggleFavourite(state, 'grind', 'grind-seat-3');
    if (pinned.ok) state = pinned.state;
    return state;
  })();
  it('accepts fresh and populated states', () => {
    expect(isLoyaltyState(initialLoyaltyState())).toBe(true);
    expect(isLoyaltyState(populated)).toBe(true);
    expect(isLoyaltyState(JSON.parse(JSON.stringify(populated)))).toBe(true);
  });
  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['an array', []],
    ['an empty object', {}],
    ['a missing field', { ...initialLoyaltyState(), ledger: undefined }],
    [
      'an unknown venue membership',
      {
        ...initialLoyaltyState(),
        memberships: {
          nowhere: { venueId: 'nowhere', phone: '0901234567', consent: true },
        },
      },
    ],
    [
      'membership without consent',
      {
        ...initialLoyaltyState(),
        memberships: {
          grind: { venueId: 'grind', phone: '0901234567', consent: false },
        },
      },
    ],
    [
      'an invalid phone',
      {
        ...initialLoyaltyState(),
        memberships: {
          grind: { venueId: 'grind', phone: '123', consent: true },
        },
      },
    ],
    [
      'negative points',
      {
        ...populated,
        ledger: [{ ...populated.ledger[0], points: -3 }],
      },
    ],
    [
      'duplicate ledger ids',
      { ...populated, ledger: [...populated.ledger, ...populated.ledger] },
    ],
    [
      'duplicate visits',
      { ...populated, visits: [...populated.visits, ...populated.visits] },
    ],
    [
      'a visit with a foreign seat',
      {
        ...initialLoyaltyState(),
        visits: [visit('s1', { seatId: 'matcha-seat-1' })],
      },
    ],
    [
      'a bad billing mode',
      {
        ...initialLoyaltyState(),
        visits: [visit('s1', { mode: 'FREE' as 'BUNDLE_2H' })],
      },
    ],
    [
      'too many favourites',
      {
        ...initialLoyaltyState(),
        favourites: {
          grind: [1, 2, 3, 4].map((n) => `grind-seat-${n}`),
        },
      },
    ],
    [
      'a favourite from another venue',
      {
        ...initialLoyaltyState(),
        favourites: { grind: ['matcha-seat-1'] },
      },
    ],
    [
      'invalid preferences',
      {
        ...initialLoyaltyState(),
        preferences: {
          grind: { milk: 'soy', sweetness: 50, allergyNote: '' },
        },
      },
    ],
  ])('rejects %s', (_name, value) => {
    expect(isLoyaltyState(value)).toBe(false);
  });
});

describe('referral', () => {
  const phone = '0901234567';
  const friendPhone = '0912345678';
  const join = (
    state: LoyaltyState,
    venueId: string,
    friendCode?: string,
    ownPhone = phone,
  ) =>
    joinProgramme(state, venueId, {
      phone: ownPhone,
      code: '123456',
      consent: true,
      friendCode,
    });
  const friendCode = referralCode('grind', friendPhone);
  const brokenCheck =
    friendCode.slice(0, -1) + (friendCode.endsWith('A') ? 'B' : 'A');

  it('derives a deterministic code per venue and masked phone', () => {
    expect(referralCode('grind', phone)).toBe(referralCode('grind', phone));
    expect(referralCode('grind', phone)).toBe(
      referralCode('grind', '090 123 4567'),
    );
    expect(referralCode('grind', phone)).not.toBe(
      referralCode('matcha', phone),
    );
    expect(referralCode('grind', phone)).not.toBe(friendCode);
    expect(referralCode('grind', phone)).toMatch(/^GRIND-[A-Z0-9]{6}$/);
    expect(referralCode('grind', phone)).not.toContain('1234567');
  });
  it('gives a code to members only', () => {
    expect(memberReferralCode(initialLoyaltyState(), 'grind')).toBeNull();
    expect(memberReferralCode(memberState(), 'grind')).toBe(
      referralCode('grind', phone),
    );
    expect(memberReferralCode(memberState(), 'matcha')).toBeNull();
  });
  it('grants the bonus once at join with a valid friend code', () => {
    const result = join(
      initialLoyaltyState(),
      'grind',
      ` ${friendCode.toLowerCase()} `,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(pointsBalance(result.state, 'grind')).toBe(REFERRAL_BONUS_POINTS);
    expect(result.state.ledger).toEqual([
      expect.objectContaining({
        kind: 'referral',
        points: 50,
        venueId: 'grind',
      }),
    ]);
    expect(result.state.memberships.grind?.referredBy).toBe(friendCode);
    expect(isLoyaltyState(result.state)).toBe(true);
    // Joining again is refused, so the bonus cannot be claimed twice.
    expect(join(result.state, 'grind', friendCode).ok).toBe(false);
    expect(pointsBalance(result.state, 'grind')).toBe(50);
  });
  it('stacks with visit points and stays venue scoped', () => {
    const result = join(initialLoyaltyState(), 'grind', friendCode);
    if (!result.ok) throw new Error(result.message);
    const next = recordVisit(result.state, visit('s1'));
    expect(pointsBalance(next, 'grind')).toBe(50 + 75);
    expect(pointsBalance(next, 'matcha')).toBe(0);
  });
  it('grants nothing without a code and keeps the membership shape', () => {
    const result = join(initialLoyaltyState(), 'grind', '   ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.ledger).toEqual([]);
      expect(result.state.memberships.grind).toEqual({
        venueId: 'grind',
        phone,
        consent: true,
      });
    }
  });
  it.each([
    ['your own code', referralCode('grind', phone)],
    ['a code from another venue', referralCode('matcha', friendPhone)],
    ['a code for an unknown venue', 'NOWHERE-ABCDEF'],
    ['garbage', 'hello'],
    ['a bad check character', brokenCheck],
  ])('rejects %s without joining', (_name, code) => {
    const store = createLoyaltyStore();
    const result = store.getState().join('grind', {
      phone,
      code: '123456',
      consent: true,
      friendCode: code,
    });
    expect(result.ok).toBe(false);
    expect(store.getState().memberships).toEqual({});
    expect(store.getState().ledger).toEqual([]);
  });
  it('reports distinct messages', () => {
    expect(
      checkFriendCode('grind', phone, referralCode('grind', phone)),
    ).toEqual({ ok: false, message: 'You cannot use your own referral code.' });
    expect(
      checkFriendCode('grind', phone, referralCode('matcha', friendPhone)),
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining('another venue'),
    });
    expect(checkFriendCode('grind', phone, '')).toEqual({
      ok: true,
      code: null,
    });
  });
  it('removes the bonus when leaving', () => {
    const result = join(initialLoyaltyState(), 'grind', friendCode);
    if (!result.ok) throw new Error(result.message);
    expect(leaveProgramme(result.state, 'grind').ledger).toEqual([]);
  });
  it('works through the store', () => {
    const store = createLoyaltyStore();
    expect(
      store.getState().join('grind', {
        phone,
        code: '123456',
        consent: true,
        friendCode,
      }),
    ).toEqual({ ok: true });
    expect(pointsBalance(store.getState(), 'grind')).toBe(50);
  });
  it('still validates old snapshots without referral fields', () => {
    const old = JSON.parse(JSON.stringify(memberState()));
    expect(old.memberships.grind.referredBy).toBeUndefined();
    expect(isLoyaltyState(old)).toBe(true);
    const oldWithEarn = JSON.parse(
      JSON.stringify(recordVisit(memberState(), visit('s1'))),
    );
    expect(oldWithEarn.ledger[0].kind).toBe('earn');
    expect(isLoyaltyState(oldWithEarn)).toBe(true);
  });
  it('rejects malformed referral fields', () => {
    const base = JSON.parse(JSON.stringify(memberState()));
    base.memberships.grind.referredBy = 42;
    expect(isLoyaltyState(base)).toBe(false);
    const ledger = JSON.parse(
      JSON.stringify(recordVisit(memberState(), visit('s1'))),
    );
    ledger.ledger[0].kind = 'gift';
    expect(isLoyaltyState(ledger)).toBe(false);
  });
});
