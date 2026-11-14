import type { Seat, Session } from '../../../core/domain';
import { translate, type Lang, type Params } from '../i18n/i18n';
import {
  supportMessages,
  type SupportErrorCode,
  type SupportMessageKey,
} from './messages';

export type { SupportErrorCode } from './messages';

/** Translate one support message key. English is the default. */
export function supportText(
  key: SupportMessageKey,
  lang: Lang = 'en',
  params?: Params,
): string {
  return translate(supportMessages, lang, key, params);
}

/** Text for a failure code (validators and stores return a code plus English
 * text; the UI shows the translated text for the code). */
export function errorText(code: SupportErrorCode, lang: Lang = 'en'): string {
  return supportText(`err.${code}`, lang, { max: MAX_NOTE_LENGTH });
}

/** Message to show for a failed result: translated when it has a code, the
 * original English message otherwise. */
export function failureText(
  result: { message: string; code?: SupportErrorCode },
  lang: Lang = 'en',
): string {
  return result.code ? errorText(result.code, lang) : result.message;
}

/* Pure support-request domain. The note classifier is a deterministic,
 * rule-based stand-in for the future AI classifier: it only labels a note and
 * never touches orders, prices or sessions. */

export const MAX_NOTE_LENGTH = 300;

export type NoteCategory =
  | 'allergy'
  | 'safety'
  | 'payment'
  | 'equipment'
  | 'cleaning'
  | 'order'
  | 'other';
export type NotePriority = 'urgent' | 'normal' | 'low';

export interface NoteClassification {
  category: NoteCategory;
  needsStaff: boolean;
  priority: NotePriority;
  reasonCode: string;
  confidence: number;
}

/** Below this confidence a human always takes over (fallback to staff). */
export const CONFIDENCE_THRESHOLD = 0.6;

/** Lowercase, strip Vietnamese diacritics and map d-stroke so rules match
 * "dị ứng" and "di ung" alike. Apostrophes are dropped ("doesn't" -> "doesnt"). */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

interface Rule {
  category: NoteCategory;
  reasonCode: string;
  priority: NotePriority;
  needsStaff: boolean;
  confidence: number;
  /** Tested against the normalized (ASCII, lowercase) text. */
  pattern: RegExp;
  /** Tested against the NFC lowercase text, for words that collide once
   * diacritics are stripped (e.g. "bẩn" dirty vs "bàn" table). */
  rawPattern?: RegExp;
}

// Leading boundary only, so "cancel" also matches "cancelled".
const lead = '(?:^|[^a-z0-9])';
const tail = '(?:$|[^a-z0-9])';
const word = (source: string) => new RegExp(`${lead}(?:${source})`);
// Leading and trailing boundary, for short or ambiguous words.
const exact = (source: string) => `${lead}(?:${source})${tail}`;
const any = (...sources: string[]) => new RegExp(sources.join('|'));

const SPILL = word(
  'spill|do nuoc|do ca phe|do tra|do ly|do cafe|tran nuoc|vang nuoc|nuoc do',
);
const POWER = any(
  `${lead}(?:outlet|socket|plug|charger|power|electric|laptop|o cam|cai sac|may tinh|monitor|man hinh|cable|day dien)`,
  exact('dien'),
);

// Order matters: the first matching rule wins, most severe first.
const RULES: Rule[] = [
  {
    category: 'allergy',
    reasonCode: 'ALLERGY_KEYWORD',
    priority: 'urgent',
    needsStaff: true,
    confidence: 0.95,
    pattern: word(
      'di ung|allerg|anaphyla|epipen|peanut|dau phong|shellfish|gluten|lactose|intoleran|khong dung nap|tree nuts?',
    ),
  },
  {
    category: 'safety',
    reasonCode: 'SAFETY_KEYWORD',
    priority: 'urgent',
    needsStaff: true,
    confidence: 0.95,
    pattern: word(
      'fire|smoke|smoking|burning|burnt|spark|shock|electrocut|injur|bleed|blood|faint|collaps|chok|emergency|ambulance|danger|hoa hoan|chay no|bi chay|co chay|mui khet|khoi|bi thuong|chay mau|ngat|cap cuu|dien giat|cham dien|chap dien|nguy hiem',
    ),
  },
  {
    category: 'payment',
    reasonCode: 'PAYMENT_KEYWORD',
    priority: 'normal',
    needsStaff: true,
    confidence: 0.9,
    pattern: any(
      `${lead}(?:refund|cancel|payment|pay|paid|charge|overcharg|invoice|bill|receipt|thanh toan|hoan tien|tra lai tien|tinh tien|hoa don|huy don|huy bo|huy dat)`,
      exact('huy'),
    ),
  },
  {
    category: 'equipment',
    reasonCode: 'EQUIPMENT_KEYWORD',
    priority: 'normal',
    needsStaff: true,
    confidence: 0.8,
    pattern: any(
      `${lead}(?:wifi|wi-fi|internet|mat mang|outlet|socket|plug|o cam|monitor|man hinh|charger|cai sac|keyboard|ban phim|chuot|chair|air ?con|may lanh|dieu hoa|broken|not working|doesnt work|dont work|isnt working|khong hoat dong|bi hong|bi loi)`,
      exact('mouse|ghe|hong'),
    ),
  },
  {
    category: 'cleaning',
    reasonCode: 'CLEANING_KEYWORD',
    priority: 'low',
    needsStaff: true,
    confidence: 0.8,
    pattern: word(
      'dirty|clean|messy|trash|rubbish|sticky|wipe|crumb|don dep|lau ban|ve sinh|do ban|bi ban|rat ban|ban qua|ban ban|rac|spill|do nuoc|tran nuoc',
    ),
    rawPattern: /bẩn|dơ|rác/,
  },
  {
    category: 'order',
    reasonCode: 'ORDER_NOTE',
    priority: 'low',
    needsStaff: false,
    confidence: 0.75,
    pattern: word(
      'less ice|no ice|extra ice|more ice|less sugar|no sugar|less sweet|extra shot|oat milk|soy milk|it da|nhieu da|khong da|it duong|khong duong|it ngot|nhieu duong|sua yen mach|sua dau nanh|them shot|take away|mang di',
    ),
  },
  {
    category: 'other',
    reasonCode: 'NOISE_KEYWORD',
    priority: 'low',
    needsStaff: true,
    confidence: 0.75,
    pattern: any(
      `${lead}(?:noisy|loud|too much noise|on ao|qua on)`,
      exact('am i'),
    ),
    rawPattern: /(?:^|[^\p{L}])ồn/u,
  },
];

export type NoteValidation =
  | { ok: true; text: string }
  | { ok: false; message: string; code: SupportErrorCode };

/** Trim and bound free text. Free text is data only; it is never executed. */
export function validateNote(text: unknown): NoteValidation {
  if (typeof text !== 'string' || !text.trim())
    return {
      ok: false,
      message: 'Write a short note first.',
      code: 'NOTE_EMPTY',
    };
  const trimmed = text.trim();
  if (trimmed.length > MAX_NOTE_LENGTH)
    return {
      ok: false,
      message: `Notes can be at most ${MAX_NOTE_LENGTH} characters.`,
      code: 'NOTE_TOO_LONG',
    };
  return { ok: true, text: trimmed };
}

/** Classify a note. Throws on empty / too-long text; callers should use
 * validateNote first (the store does). */
export function classifyNote(text: string): NoteClassification {
  const checked = validateNote(text);
  if (!checked.ok) throw new Error(checked.message);
  const raw = checked.text.normalize('NFC').toLowerCase();
  const norm = normalizeText(checked.text);

  // Mandatory: a spill next to anything electrical is a safety event.
  if (SPILL.test(norm) && POWER.test(norm))
    return {
      category: 'safety',
      needsStaff: true,
      priority: 'urgent',
      reasonCode: 'SPILL_NEAR_POWER',
      confidence: 0.95,
    };

  for (const rule of RULES) {
    if (rule.pattern.test(norm) || rule.rawPattern?.test(raw)) {
      return {
        category: rule.category,
        needsStaff: rule.needsStaff,
        priority: rule.priority,
        reasonCode: rule.reasonCode,
        confidence: rule.confidence,
      };
    }
  }
  return {
    category: 'other',
    needsStaff: true,
    priority: 'normal',
    reasonCode: 'LOW_CONFIDENCE_FALLBACK',
    confidence: 0.3,
  };
}

/** Categories staff must always handle, whatever the confidence. */
export function isMandatoryCategory(category: NoteCategory): boolean {
  return (
    category === 'allergy' || category === 'safety' || category === 'payment'
  );
}

/** Final routing decision. Mandatory categories and low confidence always go
 * to a human regardless of what a classifier (or future AI) says. */
export function mustEscalate(c: NoteClassification): boolean {
  return (
    c.needsStaff ||
    isMandatoryCategory(c.category) ||
    c.confidence < CONFIDENCE_THRESHOLD
  );
}

export type RequestKind =
  'call_staff' | 'note' | 'seat_issue' | 'seat_change' | 'refund';
export type RequestStatus = 'open' | 'acknowledged' | 'resolved';

export interface SupportRequest {
  id: string;
  venueId: string;
  seatId: string;
  sessionId: string | null;
  kind: RequestKind;
  text: string;
  classification: NoteClassification | null;
  /** Stored status. 'resolved' means the customer closed it manually; use
   * requestStatus() for the displayed (demo-progressed) status. */
  status: RequestStatus;
  createdAtMinute: number;
  /** Only set on 'seat_change' requests. Optional so older requests stay valid. */
  preferredKind?: SeatPreference;
}

/* ---------- seat-change request (F148) ---------- */

export type SeatPreference = 'any' | Seat['kind'];

export const SEAT_PREFERENCES: readonly {
  id: SeatPreference;
  label: string;
}[] = [
  { id: 'any', label: 'Any seat' },
  { id: 'desk', label: 'Desk' },
  { id: 'pod', label: 'Pod' },
  { id: 'booth', label: 'Booth' },
];

export const isSeatPreference = (value: unknown): value is SeatPreference =>
  SEAT_PREFERENCES.some((entry) => entry.id === value);

export const SEAT_CHANGE_NOTE =
  'Only a team member can move you, and nothing changes until they do. Your time keeps running, and the usual rate rules apply: another kind of seat may have a different hourly rate.';

export function classifySeatChange(): NoteClassification {
  return {
    category: 'other',
    needsStaff: true,
    priority: 'low',
    reasonCode: 'SEAT_CHANGE_REQUEST',
    confidence: 1,
  };
}

/** An optional free-text reason: empty is fine, too long is not. */
export function validateOptionalReason(
  text: unknown,
):
  | { ok: true; text: string }
  | { ok: false; message: string; code: SupportErrorCode } {
  if (text === undefined || text === null) return { ok: true, text: '' };
  if (typeof text !== 'string')
    return {
      ok: false,
      message: 'The reason must be text.',
      code: 'REASON_NOT_TEXT',
    };
  const trimmed = text.trim();
  if (trimmed.length > MAX_NOTE_LENGTH)
    return {
      ok: false,
      message: `Reasons can be at most ${MAX_NOTE_LENGTH} characters.`,
      code: 'REASON_TOO_LONG',
    };
  return { ok: true, text: trimmed };
}

export interface SeatIssuePreset {
  id: 'outlet_broken' | 'wifi_weak' | 'needs_cleaning' | 'too_noisy' | 'other';
  label: string;
  category: NoteCategory;
  priority: NotePriority;
}

export const SEAT_ISSUE_PRESETS: readonly SeatIssuePreset[] = [
  {
    id: 'outlet_broken',
    label: 'Outlet is broken',
    category: 'equipment',
    priority: 'normal',
  },
  {
    id: 'wifi_weak',
    label: 'Wi-Fi is weak',
    category: 'equipment',
    priority: 'normal',
  },
  {
    id: 'needs_cleaning',
    label: 'Table needs cleaning',
    category: 'cleaning',
    priority: 'low',
  },
  {
    id: 'too_noisy',
    label: 'Too noisy here',
    category: 'other',
    priority: 'low',
  },
  {
    id: 'other',
    label: 'Other seat issue',
    category: 'other',
    priority: 'normal',
  },
];

export function findSeatIssuePreset(id: string): SeatIssuePreset | undefined {
  return SEAT_ISSUE_PRESETS.find((preset) => preset.id === id);
}

export function classifySeatIssue(preset: SeatIssuePreset): NoteClassification {
  return {
    category: preset.category,
    needsStaff: true,
    priority: preset.priority,
    reasonCode: `SEAT_ISSUE_${preset.id.toUpperCase()}`,
    confidence: 1,
  };
}

/** Demo status progression; there is no real staff app behind it yet. */
export function requestStatus(
  request: Pick<SupportRequest, 'status' | 'createdAtMinute'>,
  currentMinute: number,
): RequestStatus {
  if (request.status === 'resolved') return 'resolved';
  const delta = currentMinute - request.createdAtMinute;
  if (delta >= 30) return 'resolved';
  if (delta >= 1) return 'acknowledged';
  return 'open';
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: 'Open - waiting for staff',
  acknowledged: 'Acknowledged - staff are on the way',
  resolved: 'Resolved',
};

/** Core seat labels stay "Seat 3"; Vietnamese screens show "Chỗ 3". */
export const seatLabelText = (label: string, lang: Lang = 'en'): string =>
  lang === 'vi' ? label.replace(/^Seat\b/, 'Chỗ') : label;

export const requestStatusLabel = (
  status: RequestStatus,
  lang: Lang = 'en',
): string => supportText(`status.${status}`, lang);

export const priorityLabel = (
  priority: NotePriority,
  lang: Lang = 'en',
): string => supportText(`priority.${priority}`, lang);

export const seatPreferenceLabel = (
  preference: SeatPreference,
  lang: Lang = 'en',
): string => supportText(`pref.${preference}`, lang);

export const seatIssueLabel = (
  preset: Pick<SeatIssuePreset, 'id'>,
  lang: Lang = 'en',
): string => supportText(`preset.${preset.id}`, lang);

/** The text to show for a stored request. Stored text is always English (it
 * is data); in Vietnamese the app-generated kinds are rebuilt from their parts
 * and the customer's own words are shown as typed. */
export function requestDisplayText(
  request: Pick<SupportRequest, 'kind' | 'text' | 'preferredKind'>,
  lang: Lang = 'en',
): string {
  if (lang === 'en') return request.text;
  switch (request.kind) {
    case 'call_staff':
      return supportText('text.callStaff', lang);
    case 'seat_issue': {
      const preset = SEAT_ISSUE_PRESETS.find(
        (entry) => entry.label === request.text,
      );
      return preset ? seatIssueLabel(preset, lang) : request.text;
    }
    case 'seat_change': {
      const preferred = supportText(
        `prefShort.${request.preferredKind ?? 'any'}`,
        lang,
      );
      const split = request.text.indexOf('): ');
      return split === -1
        ? supportText('text.seatChange', lang, { preferred })
        : supportText('text.seatChangeReason', lang, {
            preferred,
            reason: request.text.slice(split + 3),
          });
    }
    case 'refund': {
      const prefix = 'Refund request: ';
      return request.text.startsWith(prefix)
        ? supportText('text.refund', lang, {
            reason: request.text.slice(prefix.length),
          })
        : request.text;
    }
    default:
      return request.text;
  }
}

/* ---------- session time status (mirrors src/core/billing.ts) ---------- */

export const GRACE_MINUTES = 10;
export const ENDING_SOON_MINUTES = 15;
export const BILLING_BLOCK_MINUTES = 15;

export type TimeState = 'ok' | 'ending_soon' | 'grace' | 'overtime';

export type TimeStatus =
  | {
      kind: 'bundle';
      includedMinutes: number;
      elapsedMinutes: number;
      remainingMinutes: number;
      overMinutes: number;
      graceRemainingMinutes: number;
      state: TimeState;
      message: string;
    }
  | {
      kind: 'metered';
      elapsedMinutes: number;
      /** Minutes left in the current 15 minute block; the next block is billed after it. */
      minutesToNextBlock: number;
      state: 'ok';
      message: string;
    };

export function includedMinutes(mode: Session['mode']): number {
  return mode === 'BUNDLE_2H' ? 120 : mode === 'BUNDLE_4H' ? 240 : 0;
}

const plural = (n: number, lang: Lang) =>
  `${n} ${supportText(n === 1 ? 'time.minute.one' : 'time.minute.other', lang)}`;

export function timeStatus(
  session: Pick<Session, 'mode' | 'elapsedMinutes'>,
  lang: Lang = 'en',
): TimeStatus {
  const elapsed = session.elapsedMinutes;
  if (!Number.isSafeInteger(elapsed) || elapsed < 0)
    throw new Error('Invalid elapsed minutes');
  const included = includedMinutes(session.mode);
  if (!included) {
    const inBlock = elapsed % BILLING_BLOCK_MINUTES;
    const toNext =
      inBlock === 0 ? BILLING_BLOCK_MINUTES : BILLING_BLOCK_MINUTES - inBlock;
    return {
      kind: 'metered',
      elapsedMinutes: elapsed,
      minutesToNextBlock: toNext,
      state: 'ok',
      message: supportText('time.metered', lang, {
        elapsed: plural(elapsed, lang),
        toNext: plural(toNext, lang),
      }),
    };
  }
  const remaining = Math.max(0, included - elapsed);
  const over = Math.max(0, elapsed - included);
  const graceLeft = Math.max(0, GRACE_MINUTES - over);
  const hours = included / 60;
  let state: TimeState;
  let message: string;
  if (over > GRACE_MINUTES) {
    state = 'overtime';
    message = supportText('time.overtime', lang, {
      over: plural(over, lang),
      hours,
    });
  } else if (remaining === 0) {
    state = 'grace';
    message = supportText('time.grace', lang, {
      grace: plural(graceLeft, lang),
      hours,
    });
  } else if (remaining <= ENDING_SOON_MINUTES) {
    state = 'ending_soon';
    message = supportText('time.ending_soon', lang, {
      remaining: plural(remaining, lang),
      hours,
    });
  } else {
    state = 'ok';
    message = supportText('time.ok', lang, {
      remaining: plural(remaining, lang),
      hours,
    });
  }
  return {
    kind: 'bundle',
    includedMinutes: included,
    elapsedMinutes: elapsed,
    remainingMinutes: remaining,
    overMinutes: over,
    graceRemainingMinutes: graceLeft,
    state,
    message,
  };
}
