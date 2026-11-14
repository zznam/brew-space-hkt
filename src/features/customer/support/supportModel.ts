import type { Session } from '../../../core/domain';

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
  { ok: true; text: string } | { ok: false; message: string };

/** Trim and bound free text. Free text is data only; it is never executed. */
export function validateNote(text: unknown): NoteValidation {
  if (typeof text !== 'string' || !text.trim())
    return { ok: false, message: 'Write a short note first.' };
  const trimmed = text.trim();
  if (trimmed.length > MAX_NOTE_LENGTH)
    return {
      ok: false,
      message: `Notes can be at most ${MAX_NOTE_LENGTH} characters.`,
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

export type RequestKind = 'call_staff' | 'note' | 'seat_issue';
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

const plural = (n: number) => `${n} minute${n === 1 ? '' : 's'}`;

export function timeStatus(
  session: Pick<Session, 'mode' | 'elapsedMinutes'>,
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
      message: `${plural(elapsed)} so far. Seat time is billed in 15-minute blocks; the current block ends in ${plural(toNext)}.`,
    };
  }
  const remaining = Math.max(0, included - elapsed);
  const over = Math.max(0, elapsed - included);
  const graceLeft = Math.max(0, GRACE_MINUTES - over);
  const label = `${included / 60}-hour bundle`;
  let state: TimeState;
  let message: string;
  if (over > GRACE_MINUTES) {
    state = 'overtime';
    message = `You are ${plural(over)} past your ${label}. Extra time is now billed in 15-minute blocks.`;
  } else if (remaining === 0) {
    state = 'grace';
    message = `Your ${label} is used up. ${plural(graceLeft)} of grace left before extra time is billed.`;
  } else if (remaining <= ENDING_SOON_MINUTES) {
    state = 'ending_soon';
    message = `${plural(remaining)} left in your ${label}. Your session will not end automatically.`;
  } else {
    state = 'ok';
    message = `${plural(remaining)} left in your ${label}.`;
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
