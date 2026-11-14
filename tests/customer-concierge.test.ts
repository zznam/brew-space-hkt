import { describe, expect, it } from 'vitest';
import {
  calculateBill,
  formatMoney,
  getVenue,
  scenarioSessions,
  type Session,
} from '../src/core';
import {
  SUGGESTED_QUESTIONS_EN,
  SUGGESTED_QUESTIONS_VI,
  answerQuestion,
  detectLanguage,
  type ConciergeContext,
} from '../src/features/customer/concierge/conciergeModel';
import {
  initialLoyaltyState,
  joinProgramme,
  pointsBalance,
  recordVisit,
  type LoyaltyState,
} from '../src/features/customer/loyalty/loyaltyModel';
import type { VisitSnapshot } from '../src/features/customer/shared/visit';
import { getVenueInfo } from '../src/features/customer/support/venueInfo';

const venue = getVenue('grind');
// Afternoon: seats 1 and 2 (desks) taken. Free: 3 desks, 2 pods, 1 booth.
const sessions = scenarioSessions(venue, 'afternoon');
const base: ConciergeContext = {
  venue,
  sessions,
  loyalty: initialLoyaltyState(),
};
const ask = (q: string, ctx: ConciergeContext = base) => answerQuestion(q, ctx);

function member(): LoyaltyState {
  const joined = joinProgramme(initialLoyaltyState(), 'grind', {
    phone: '0901234567',
    code: '123456',
    consent: true,
  });
  if (!joined.ok) throw new Error(joined.message);
  const visit: VisitSnapshot = {
    sessionId: 'v1',
    venueId: 'grind',
    venueName: venue.name,
    seatId: 'grind-seat-3',
    seatLabel: 'Seat 3',
    seatKind: 'desk',
    mode: 'METERED_OPEN',
    minutes: 60,
    time: 30000,
    items: 0,
    total: 30000,
    orders: [],
  };
  return recordVisit(joined.state, visit);
}

describe('availability', () => {
  it.each([
    'How many seats are free?',
    'any seats available?',
    'Còn bao nhiêu chỗ trống?',
    'con bao nhieu cho trong',
    'còn ghế không',
  ])('answers %j with total counts', (q) => {
    const result = ask(q);
    expect(result.intent).toBe('availability');
    expect(result.text).toMatch(/6/);
    expect(result.text).toMatch(/8/);
    expect(result.text).toMatch(/3 (desks|bàn làm việc)/);
  });

  it('answers per kind', () => {
    expect(ask('Are there any pods free?').text).toMatch(/2 pods/);
    expect(ask('is a booth available').text).toMatch(/1 booth /);
    expect(ask('còn pod nào không').text).toMatch(/2 pod/);
  });

  it('counts never include occupant data', () => {
    const noisy: Session[] = sessions.map((s) => ({
      ...s,
      customerId: 'secret-customer-id',
    }));
    const ctx = { ...base, sessions: noisy };
    for (const q of [
      ...SUGGESTED_QUESTIONS_EN,
      ...SUGGESTED_QUESTIONS_VI,
      'is a pod free',
      'who is sitting in seat 1?',
      'ai đang ngồi ở ghế 2',
    ]) {
      const text = ask(q, ctx).text;
      expect(text).not.toContain('secret-customer-id');
      expect(text).not.toContain('sample-guest');
      expect(text).not.toMatch(/seed-|grind-seat/);
    }
    expect(ask('How many seats are free?', ctx).text).toBe(
      ask('How many seats are free?').text,
    );
  });

  it('declines to say who sits where', () => {
    expect(ask('who is sitting here?').intent).toBe('privacy');
    expect(ask('is seat 3 taken?').intent).toBe('privacy');
    expect(ask('ai đang ngồi ghế 1').intent).toBe('privacy');
  });

  it('ignores sessions from other venues', () => {
    const other = scenarioSessions(getVenue('cyber'), 'morning');
    const text = ask('how many seats are free', {
      ...base,
      sessions: [...sessions, ...other],
    }).text;
    expect(text).toMatch(/6 of 8/);
  });
});

describe('prices', () => {
  it('answers the cheapest seat', () => {
    const en = ask("What's the cheapest seat?");
    expect(en.intent).toBe('cheapest_seat');
    expect(en.text).toContain(formatMoney(30000));
    expect(en.text).toMatch(/desks/);
    const vi = ask('Chỗ nào rẻ nhất?');
    expect(vi.intent).toBe('cheapest_seat');
    expect(vi.text).toContain(formatMoney(30000));
    expect(ask('cho nao re nhat').intent).toBe('cheapest_seat');
  });

  it('answers the price of a kind', () => {
    const pod = ask('How much is a pod?');
    expect(pod.intent).toBe('seat_price');
    expect(pod.text).toContain(formatMoney(40000));
    expect(pod.text).not.toContain(formatMoney(30000));
    expect(ask('giá pod bao nhiêu').text).toContain(formatMoney(40000));
    expect(ask('gia booth').text).toContain(formatMoney(40000));
  });
});

describe('menu', () => {
  it('lists the menu with prices', () => {
    const result = ask("What's on the menu?");
    expect(result.intent).toBe('menu');
    for (const item of venue.menu) {
      expect(result.text).toContain(item.name);
      expect(result.text).toContain(formatMoney(item.price));
    }
    expect(ask('thực đơn có gì').intent).toBe('menu');
    expect(ask('quan co mon gi').intent).toBe('menu');
  });

  it('answers whether an item is on the menu', () => {
    const yes = ask('Is cold brew on the menu?');
    expect(yes.intent).toBe('menu_item');
    expect(yes.text).toMatch(/Yes/);
    expect(yes.text).toContain(formatMoney(45000));
    expect(ask('có croissant không').text).toContain(formatMoney(35000));
    const no = ask('Do you sell pizza?');
    expect(no.text).toMatch(/don't see/);
    expect(no.text).toContain('Butter croissant');
    // "iced tea" must not match "Iced espresso" just on the word "iced".
    expect(ask('is iced tea on the menu?').text).toMatch(/don't see/);
  });

  it('answers the price of an item', () => {
    const result = ask('How much is the croissant?');
    expect(result.intent).toBe('menu_price');
    expect(result.text).toContain(formatMoney(35000));
    expect(ask('cheapest drink').text).toContain('Butter croissant');
  });
});

describe('venue info', () => {
  it('shares where the wifi password is, never a password', () => {
    const info = getVenueInfo('grind');
    for (const q of [
      'wifi?',
      'What is the wifi password?',
      'mật khẩu wifi là gì',
      'mat khau wifi',
    ]) {
      const result = ask(q);
      expect(result.intent).toBe('wifi');
      expect(result.text).toContain(info.wifiName);
      expect(result.text).toContain(info.wifiAccess);
    }
  });

  it('lists the house rules', () => {
    const info = getVenueInfo('grind');
    for (const q of ['What are the house rules?', 'nội quy là gì', 'noi quy']) {
      const result = ask(q);
      expect(result.intent).toBe('rules');
      for (const rule of info.rules) expect(result.text).toContain(rule);
    }
  });
});

describe('billing', () => {
  it('explains blocks, bundle discount and grace from core facts', () => {
    const result = ask('How does billing work?');
    expect(result.intent).toBe('billing');
    expect(result.text).toMatch(/15-minute/);
    expect(result.text).toMatch(/15%/);
    expect(result.text).toMatch(/10-minute grace/);
    const hour: Session = {
      id: 'x',
      venueId: 'grind',
      seatId: 's',
      customerId: 'c',
      mode: 'METERED_OPEN',
      elapsedMinutes: 60,
      lockedHourlyRate: 30000,
      orders: [],
    };
    expect(result.text).toContain(formatMoney(calculateBill(hour).time));
    expect(result.text).toContain(
      formatMoney(
        calculateBill({ ...hour, mode: 'BUNDLE_2H', elapsedMinutes: 120 }).time,
      ),
    );
  });

  it('works in Vietnamese', () => {
    const result = ask('Cách tính tiền thế nào?');
    expect(result.intent).toBe('billing');
    expect(result.language).toBe('vi');
    expect(result.text).toMatch(/15 phút/);
  });
});

describe('points', () => {
  it('is for members only', () => {
    const result = ask('How many points do I have?');
    expect(result.intent).toBe('points');
    expect(result.text).toMatch(/Points are for members/);
    expect(result.text).not.toMatch(/You have \d+ points/);
    expect(ask('Tôi có bao nhiêu điểm?').text).toMatch(/thành viên/);
  });

  it('reads the member balance read-only', () => {
    const loyalty = member();
    const balance = pointsBalance(loyalty, 'grind');
    expect(balance).toBeGreaterThan(0);
    const before = JSON.stringify(loyalty);
    expect(ask('my points', { ...base, loyalty }).text).toContain(
      `${balance} points`,
    );
    expect(ask('tôi có bao nhiêu điểm', { ...base, loyalty }).text).toContain(
      `${balance} điểm`,
    );
    expect(JSON.stringify(loyalty)).toBe(before);
  });

  it('does not leak another venue balance', () => {
    const loyalty = member();
    const matcha = { ...base, venue: getVenue('matcha'), loyalty };
    expect(ask('my points', matcha).text).toMatch(/Points are for members/);
  });
});

describe('read-only guarantees', () => {
  it.each([
    'book seat 3',
    'Can you reserve a pod for me?',
    'đặt chỗ giúp tôi',
    'dat cho so 3',
    'đặt bàn',
    'order me a cold brew',
    'I want to order a croissant',
    'gọi món cà phê',
    'pay my bill',
    'thanh toán giúp mình',
    'end my session',
    'kết thúc phiên',
    'cancel my order',
    'hoàn tiền cho tôi',
    'move me to a pod',
    'change my seat',
    'đổi chỗ cho mình',
    'redeem my points',
  ])('refuses %j', (q) => {
    const result = ask(q);
    expect(result.intent).toBe('refusal');
    expect(result.text).toMatch(/can't|không thể/);
  });

  it('points at the right button', () => {
    expect(ask('book seat 3').text).toMatch(/Explore/);
    expect(ask('order me a latte').text).toMatch(/Place order/);
    expect(ask('refund please').text).toMatch(/Request a refund/);
    expect(ask('change my seat').text).toMatch(/Ask to move seats/);
    expect(ask('end my session').text).toMatch(/End demo session/);
  });

  it('never changes the context it is given', () => {
    const snapshot = JSON.stringify(base);
    for (const q of [
      'book seat 3',
      'order me tea',
      'pay',
      ...SUGGESTED_QUESTIONS_EN,
    ])
      ask(q);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});

describe('fallbacks', () => {
  it('admits what it does not know and suggests Call staff', () => {
    for (const q of ['What is the meaning of life?', 'Có chỗ gửi xe không?']) {
      const result = ask(q);
      expect(result.intent).toBe('unknown');
      expect(result.text).toMatch(/Call staff/);
    }
  });
  it('handles empty, odd and long input without throwing', () => {
    expect(ask('   ').intent).toBe('help');
    expect(ask('?!?').intent).toBe('unknown');
    expect(() => ask('x'.repeat(5000))).not.toThrow();
    expect(() => answerQuestion(undefined as never, base)).not.toThrow();
  });
  it('greets with what it can do', () => {
    const result = ask('hello');
    expect(result.intent).toBe('help');
    expect(result.text).toMatch(/cannot book/);
  });
});

describe('language', () => {
  it('detects Vietnamese with and without diacritics', () => {
    expect(detectLanguage('Còn bao nhiêu chỗ?')).toBe('vi');
    expect(detectLanguage('con bao nhieu cho')).toBe('vi');
    expect(detectLanguage('How many seats?')).toBe('en');
  });
  it('every suggested question gets a real answer', () => {
    for (const q of [...SUGGESTED_QUESTIONS_EN, ...SUGGESTED_QUESTIONS_VI])
      expect(ask(q).intent).not.toBe('unknown');
  });
});
