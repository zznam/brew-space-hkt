import { describe, expect, it } from 'vitest';
import { getVenue, scenarioSessions } from '../src/core';
import {
  READ_ONLY_NOTE,
  SUGGESTED_QUESTIONS_EN,
  SUGGESTED_QUESTIONS_VI,
  answerQuestion,
  detectLanguage,
  readOnlyNote,
  suggestedQuestions,
  type ConciergeContext,
} from '../src/features/customer/concierge/conciergeModel';
import { conciergeMessages } from '../src/features/customer/concierge/messages';
import { initialLoyaltyState } from '../src/features/customer/loyalty/loyaltyModel';
import { getVenueInfo } from '../src/features/customer/support/venueInfo';

const venue = getVenue('grind');
const ctx: ConciergeContext = {
  venue,
  sessions: scenarioSessions(venue, 'afternoon'),
  loyalty: initialLoyaltyState(),
};

describe('concierge message table', () => {
  it('has a non-empty Vietnamese value for every English key', () => {
    for (const key of Object.keys(conciergeMessages.en)) {
      const vi = (conciergeMessages.vi as Record<string, string>)[key];
      expect(vi, key).toBeTruthy();
    }
  });
  it('keeps the same placeholders in both languages', () => {
    expect(conciergeMessages.vi.intro).toContain('{venue}');
    expect(conciergeMessages.vi.intro).toContain('{note}');
  });
});

describe('suggested questions and notes follow the app language', () => {
  it('picks the right list', () => {
    expect(suggestedQuestions()).toBe(SUGGESTED_QUESTIONS_EN);
    expect(suggestedQuestions('en')).toBe(SUGGESTED_QUESTIONS_EN);
    expect(suggestedQuestions('vi')).toBe(SUGGESTED_QUESTIONS_VI);
  });
  it('translates the read-only note', () => {
    expect(readOnlyNote()).toBe(READ_ONLY_NOTE);
    expect(readOnlyNote('vi')).not.toBe(READ_ONLY_NOTE);
    expect(readOnlyNote('vi')).toMatch(/Mình/);
  });
  it('every Vietnamese suggestion gets a Vietnamese answer, not unknown', () => {
    for (const question of SUGGESTED_QUESTIONS_VI) {
      const result = answerQuestion(question, ctx, 'vi');
      expect(result.language).toBe('vi');
      expect(result.intent).not.toBe('unknown');
    }
    for (const question of SUGGESTED_QUESTIONS_EN) {
      const result = answerQuestion(question, ctx, 'vi');
      expect(result.language).toBe('en');
      expect(result.intent).not.toBe('unknown');
    }
  });
});

describe('ambiguous questions use the app language', () => {
  it('keeps the old default for ambiguous questions', () => {
    expect(detectLanguage('wifi?')).toBe('en');
    expect(detectLanguage('menu')).toBe('en');
    expect(answerQuestion('wifi?', ctx).language).toBe('en');
  });
  it('falls back to the app language only when the question is ambiguous', () => {
    expect(detectLanguage('wifi?', 'vi')).toBe('vi');
    expect(detectLanguage('menu', 'vi')).toBe('vi');
    expect(detectLanguage('pod', 'vi')).toBe('vi');
    expect(detectLanguage('wifi?', 'en')).toBe('en');
    const wifi = answerQuestion('wifi?', ctx, 'vi');
    expect(wifi.intent).toBe('wifi');
    expect(wifi.language).toBe('vi');
    expect(wifi.text).toContain(getVenueInfo('grind', 'vi').wifiAccess);
  });
  it('never overrides a clear question language', () => {
    expect(detectLanguage('How many seats are free?', 'vi')).toBe('en');
    expect(detectLanguage('What is the wifi password?', 'vi')).toBe('en');
    expect(detectLanguage('Còn bao nhiêu chỗ?', 'en')).toBe('vi');
    expect(detectLanguage('con bao nhieu cho', 'en')).toBe('vi');
    expect(answerQuestion('How many seats are free?', ctx, 'vi').language).toBe(
      'en',
    );
    expect(answerQuestion('Còn bao nhiêu chỗ trống?', ctx, 'en').language).toBe(
      'vi',
    );
  });
});

describe('Vietnamese venue text inside answers', () => {
  it('uses the Vietnamese house rules for a Vietnamese question', () => {
    const result = answerQuestion('nội quy là gì', ctx);
    expect(result.language).toBe('vi');
    for (const rule of getVenueInfo('grind', 'vi').rules)
      expect(result.text).toContain(rule);
  });
  it('keeps English rules for an English question', () => {
    const result = answerQuestion('What are the house rules?', ctx, 'vi');
    for (const rule of getVenueInfo('grind').rules)
      expect(result.text).toContain(rule);
  });
  it('translates the read-only note in the Vietnamese help answer', () => {
    const result = answerQuestion('xin chào', ctx);
    expect(result.intent).toBe('help');
    expect(result.text).toContain(readOnlyNote('vi'));
  });
});
