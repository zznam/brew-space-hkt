import { calculateBill, formatMoney } from '../../../core/billing';
import type { MenuItem, Seat, Session, Venue } from '../../../core/domain';
import {
  isMember,
  pointsBalance,
  type LoyaltyState,
} from '../loyalty/loyaltyModel';
import {
  BILLING_BLOCK_MINUTES,
  GRACE_MINUTES,
  normalizeText,
} from '../support/supportModel';
import { getVenueInfo } from '../support/venueInfo';

/* Pure, read-only venue assistant (F188). Deterministic keyword rules, no
 * network, no AI. It reads published data only: counts of free seats (never
 * who sits where), seat rates, the menu, venue info and the guest's own point
 * balance. It has no way to book, pay, order or change anything: requests to
 * do so get a refusal that points at the right button. */

export const MAX_QUESTION_LENGTH = 200;

export type ConciergeIntent =
  | 'availability'
  | 'cheapest_seat'
  | 'seat_price'
  | 'menu'
  | 'menu_item'
  | 'menu_price'
  | 'wifi'
  | 'rules'
  | 'points'
  | 'billing'
  | 'privacy'
  | 'refusal'
  | 'help'
  | 'unknown';

export type Language = 'en' | 'vi';

export interface ConciergeContext {
  venue: Venue;
  /** All sessions; only counted per seat, never quoted. */
  sessions: Session[];
  loyalty: LoyaltyState;
}

export interface ConciergeAnswer {
  intent: ConciergeIntent;
  language: Language;
  text: string;
}

export const SUGGESTED_QUESTIONS_EN = [
  'How many seats are free?',
  "What's the cheapest seat?",
  "What's on the menu?",
  'How do I get on the Wi-Fi?',
  'What are the house rules?',
  'How does billing work?',
  'How many points do I have?',
] as const;
export const SUGGESTED_QUESTIONS_VI = [
  'Còn bao nhiêu chỗ trống?',
  'Chỗ nào rẻ nhất?',
  'Quán có món gì?',
  'Wifi dùng thế nào?',
  'Nội quy của quán là gì?',
  'Cách tính tiền thế nào?',
  'Tôi có bao nhiêu điểm?',
] as const;

export const READ_ONLY_NOTE =
  'I only answer questions. I cannot book, pay, order or change anything.';
export const READ_ONLY_NOTE_VI =
  'Mình chỉ trả lời câu hỏi. Mình không thể đặt chỗ, thanh toán, gọi món hay thay đổi gì.';

export const readOnlyNote = (lang: Language = 'en') =>
  lang === 'vi' ? READ_ONLY_NOTE_VI : READ_ONLY_NOTE;

/** Suggested questions for the app language. */
export const suggestedQuestions = (lang: Language = 'en') =>
  lang === 'vi' ? SUGGESTED_QUESTIONS_VI : SUGGESTED_QUESTIONS_EN;

const KINDS: Seat['kind'][] = ['desk', 'pod', 'booth'];

/* ---------- language ---------- */

const VI_CHARS =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/;
const VI_WORDS =
  /(?:^| )(?:khong|cho|ghe|bao nhieu|thuc don|toi|minh|gia|mat khau|diem|noi quy|xin chao|giup|dat|mon|tien|trong|nao|duoc|cach|quan|co)(?: |$)/;

// Clear English function and topic words. Words that collide with unaccented
// Vietnamese ("the", "do", "an", "on", "me") are left out on purpose.
const EN_WORDS =
  /(?:^| )(?:what|whats|which|how|many|much|is|are|does|can|could|my|you|your|we|any|there|have|has|please|where|who|when|why|hi|hello|hey|seat|seats|desk|desks|pods|booths|free|available|availability|cheapest|price|prices|rules|house|points|billing|bill|order|book|pay|cost)(?: |$)/;

/** Language of a question. Vietnamese wins on any Vietnamese cue, English on
 * a clear English cue. When neither shows (for example "wifi?"), `fallback`
 * decides, so the app language answers ambiguous questions. */
export function detectLanguage(
  question: string,
  fallback: Language = 'en',
): Language {
  const raw = question.normalize('NFC').toLowerCase();
  if (VI_CHARS.test(raw)) return 'vi';
  const normalized = normalizeText(question);
  if (VI_WORDS.test(normalized)) return 'vi';
  return EN_WORDS.test(normalized) ? 'en' : fallback;
}

/* ---------- intent rules (tested against normalizeText output) ---------- */

type RefusalTopic =
  'book' | 'order' | 'pay' | 'end' | 'cancel' | 'move' | 'redeem';
const REFUSALS: { topic: RefusalTopic; pattern: RegExp }[] = [
  {
    topic: 'redeem',
    pattern: /\b(redeem|spend my points|use my points)\b|dung diem|doi diem/,
  },
  {
    topic: 'move',
    pattern:
      /\b(change|switch|swap|move)\b.*\b(seat|desk|pod|booth|me)\b|\bmove me\b|doi (cho|ghe)|chuyen (cho|ghe)/,
  },
  {
    topic: 'cancel',
    pattern: /\b(cancel|refund)\b|hoan tien|\bhuy\b/,
  },
  {
    topic: 'end',
    pattern:
      /\bend (my |the )?(session|visit|timer)\b|\bstop (my )?(session|timer)\b|\bcheck ?out\b|ket thuc|tra (cho|ban)\b/,
  },
  {
    topic: 'pay',
    pattern: /\b(pay|charge me|top up)\b|thanh toan|tra tien|quet the/,
  },
  {
    topic: 'order',
    pattern:
      /\border (me|a|an|the|some|one)\b|\bplace (an |my )?order\b|\bwant to order\b|\bcan i order\b|\b(buy|purchase)\b|dat mon|goi mon|(^| )mua( |$)/,
  },
  {
    topic: 'book',
    pattern:
      /\b(book|reserve|reservation)\b|\bhold (me )?a\b|dat (cho|ban|ghe|truoc|phong)|giu (cho|ban|ghe)/,
  },
];
const PRIVACY =
  /\bwho\b.*\b(sit|sitting|here|seat|there|occupy|occupied|taken|using)\b|(^| )ai (dang|ngoi|o day|su dung)|\b(someone|somebody)\b|(seat|ghe|cho)\s*(so\s*)?#?\d+/;
const POINTS =
  /\b(points?|loyalty|rewards?|membership|member)\b|(?<!dia )\bdiem\b|tich diem|thanh vien/;
const WIFI = /wi ?-?fi|internet|password|mat khau|\bpass\b/;
const RULES =
  /\b(rules?|policy|policies|etiquette|guidelines)\b|\bcan i (bring|eat|smoke|use my)\b|noi quy|quy dinh|quy tac|duoc (mang|hut|an)\b/;
const BILLING =
  /\b(bill|billing|billed|charged?|charges|fees?|payment|bundles?|grace|overtime|blocks?|metered|pay as you go|discount|calculated)\b|15 ?(min|phut)|tinh (tien|phi|gia)|cach tinh|(^| )phi( |$)|goi (2|4)|goi gio|giam gia|qua gio/;
const CHEAPEST =
  /\bcheap(est)?\b|\b(lowest|least expensive|affordable|budget)\b|re nhat|re hon|thap nhat|gia (thap|re)|tiet kiem|(^| )re( |$)/;
const PRICE =
  /\b(price|prices|pricing|cost|costs|how much|rates?|per hour|hourly)\b|(^| )gia( |$)|bao nhieu tien|het bao nhieu|moi gio|bao nhieu 1 gio/;
const MENU_CONTEXT =
  /\b(menu|drinks?|food|snacks?|matcha|coffee|latte|espresso|cappuccino|croissant|tea|sell|serve)\b|thuc don|do an|do uong|nuoc uong|ca phe|tra sua|banh|an gi|uong gi|mon gi|co mon/;
const EXISTENCE =
  /^(is|are|do|does)\b.*\b(on the menu|have|sell|serve|offer)\b|\bdo you (have|sell|serve|offer)\b|\bis there\b|\bgot any\b|\bco ban\b|\bco mon\b|\btren (the )?(thuc don|menu)\b/;
const AVAILABILITY =
  /\b(seats?|desks?|pods?|booths?|spots?|vacan\w*|available|availability|free|empty|space|busy|crowded|full|packed)\b|ghe|cho (trong|ngoi|nao|con)|con (cho|ghe|ban|trong)|het cho|ban trong|bao nhieu (cho|ghe)|trong khong|dong khong|buong|phong rieng|ban lam viec/;
const HELP =
  /^(hi|hello|hey|help|xin chao|chao|alo)\b|\bwhat can you (do|answer)\b|ban lam duoc gi|^giup\b|giup (toi|minh)/;

const KIND_PATTERNS: Record<Seat['kind'], RegExp> = {
  desk: /\bdesks?\b|ban lam viec/,
  pod: /\bpods?\b/,
  booth: /\bbooths?\b|buong|phong rieng/,
};

/* ---------- helpers over published data ---------- */

const normalizeName = (name: string) => normalizeText(name);

/** Menu items the question names: the whole name, or its last word (the head
 * noun, at least 4 letters), so "croissant" finds "Butter croissant" while
 * "iced tea" does not find "Iced espresso". */
function matchMenuItems(venue: Venue, q: string): MenuItem[] {
  return venue.menu.filter((item) => {
    const name = normalizeName(item.name);
    const head = name.split(' ').at(-1) ?? '';
    return (
      q.includes(name) ||
      (head.length >= 4 && new RegExp(`(?:^|[^a-z0-9])${head}`).test(q))
    );
  });
}

function mentionedKinds(q: string): Seat['kind'][] {
  return KINDS.filter((kind) => KIND_PATTERNS[kind].test(q));
}

/** Free-seat counts only. Nothing about who sits where is read. */
function freeCounts(venue: Venue, sessions: Session[]) {
  const taken = new Set(
    sessions
      .filter((session) => session.venueId === venue.id)
      .map((session) => session.seatId),
  );
  const byKind: Record<Seat['kind'], number> = { desk: 0, pod: 0, booth: 0 };
  let free = 0;
  for (const seat of venue.seats) {
    if (!taken.has(seat.id)) {
      free++;
      byKind[seat.kind]++;
    }
  }
  return { free, total: venue.seats.length, byKind };
}

function rateRange(venue: Venue, kind: Seat['kind']) {
  const rates = venue.seats
    .filter((seat) => seat.kind === kind)
    .map((seat) => seat.hourlyRate);
  if (rates.length === 0) return null;
  return { min: Math.min(...rates), max: Math.max(...rates) };
}
const money = formatMoney;
const rangeText = (range: { min: number; max: number }) =>
  range.min === range.max
    ? `${money(range.min)}`
    : `${money(range.min)} - ${money(range.max)}`;

const KIND_EN: Record<Seat['kind'], [string, string]> = {
  desk: ['desk', 'desks'],
  pod: ['pod', 'pods'],
  booth: ['booth', 'booths'],
};
const KIND_VI: Record<Seat['kind'], string> = {
  desk: 'bàn đơn',
  pod: 'pod',
  booth: 'booth',
};
const kindName = (lang: Language, kind: Seat['kind'], n = 2) =>
  lang === 'vi' ? KIND_VI[kind] : KIND_EN[kind][n === 1 ? 0 : 1];

function billingExample(venue: Venue) {
  const rate = Math.min(...venue.seats.map((seat) => seat.hourlyRate));
  const base: Session = {
    id: 'example',
    venueId: venue.id,
    seatId: '',
    customerId: '',
    mode: 'METERED_OPEN',
    elapsedMinutes: 60,
    lockedHourlyRate: rate,
    orders: [],
  };
  return {
    rate,
    hour: calculateBill(base).time,
    bundle: calculateBill({
      ...base,
      mode: 'BUNDLE_2H',
      elapsedMinutes: 120,
    }).time,
  };
}

/* ---------- answers ---------- */

const answer = (
  intent: ConciergeIntent,
  language: Language,
  text: string,
): ConciergeAnswer => ({ intent, language, text });

function refusal(topic: RefusalTopic, lang: Language): string {
  const en: Record<RefusalTopic, string> = {
    book: "I can't book or hold a seat. Pick a seat on Explore and use the start button there.",
    order:
      "I can't place orders. Add items from the menu on My session, then use Place order.",
    pay: "I can't take payment. This demo collects none; the End demo session button on My session shows your total.",
    end: "I can't end your session. Use the End demo session button on My session.",
    cancel:
      "I can't cancel or refund anything. For a refund use Request a refund on your receipt, or tap Call staff on My session.",
    move: "I can't move you. Use Ask to move seats on My session and a team member will help.",
    redeem:
      "I can't redeem points. Points can't be redeemed in this demo; I can only tell you your balance.",
  };
  const vi: Record<RefusalTopic, string> = {
    book: 'Mình không thể đặt hay giữ chỗ. Hãy chọn chỗ ở tab Khám phá rồi bấm nút bắt đầu ở đó.',
    order:
      'Mình không thể gọi món. Hãy thêm món từ thực đơn ở tab Phiên của tôi rồi bấm Đặt món.',
    pay: 'Mình không thể thanh toán. Bản demo không thu tiền; tab Phiên của tôi hiện tổng tiền tạm tính của bạn.',
    end: 'Mình không thể kết thúc phiên của bạn. Hãy dùng nút Kết thúc phiên demo ở tab Phiên của tôi.',
    cancel:
      'Mình không thể huỷ hay hoàn tiền. Hãy dùng Yêu cầu hoàn tiền trên biên nhận, hoặc bấm Gọi nhân viên ở tab Phiên của tôi.',
    move: 'Mình không thể đổi chỗ cho bạn. Hãy dùng Xin đổi chỗ ở tab Phiên của tôi để nhân viên hỗ trợ.',
    redeem:
      'Mình không thể đổi điểm. Bản demo chưa cho đổi điểm; mình chỉ cho bạn biết số dư.',
  };
  return lang === 'vi' ? vi[topic] : en[topic];
}

function availabilityAnswer(
  ctx: ConciergeContext,
  q: string,
  lang: Language,
): ConciergeAnswer {
  const counts = freeCounts(ctx.venue, ctx.sessions);
  const kinds = mentionedKinds(q);
  const name = ctx.venue.name;
  let text: string;
  if (kinds.length > 0) {
    const parts = kinds.map((kind) =>
      lang === 'vi'
        ? `${counts.byKind[kind]} ${kindName(lang, kind)}`
        : `${counts.byKind[kind]} ${kindName(lang, kind, counts.byKind[kind])}`,
    );
    text =
      lang === 'vi'
        ? `Hiện ${name} còn trống: ${parts.join(', ')} (trên tổng ${counts.total} chỗ).`
        : `Right now ${name} has ${parts.join(' and ')} free (of ${counts.total} seats).`;
  } else {
    const breakdown = KINDS.filter((kind) => counts.byKind[kind] > 0)
      .map((kind) =>
        lang === 'vi'
          ? `${counts.byKind[kind]} ${kindName(lang, kind)}`
          : `${counts.byKind[kind]} ${kindName(lang, kind, counts.byKind[kind])}`,
      )
      .join(', ');
    text =
      lang === 'vi'
        ? `${name} còn ${counts.free} trên ${counts.total} chỗ trống${breakdown ? ` (${breakdown})` : ''}.`
        : `${name} has ${counts.free} of ${counts.total} seats free${breakdown ? `: ${breakdown}` : ''}.`;
  }
  text +=
    lang === 'vi'
      ? ' Mình chỉ cho biết số lượng, không cho biết ai ngồi đâu. Xem sơ đồ chỗ ngồi ở tab Khám phá.'
      : " I only share counts, never who is sitting where. The seat map on Explore shows each seat's status.";
  return answer('availability', lang, text);
}

function priceAnswer(
  ctx: ConciergeContext,
  q: string,
  lang: Language,
  cheapest: boolean,
): ConciergeAnswer {
  const { venue } = ctx;
  const counts = freeCounts(venue, ctx.sessions);
  const kinds = mentionedKinds(q);
  if (cheapest && kinds.length === 0) {
    const min = Math.min(...venue.seats.map((seat) => seat.hourlyRate));
    const kindsAtMin = KINDS.filter((kind) =>
      venue.seats.some((seat) => seat.kind === kind && seat.hourlyRate === min),
    );
    const free = kindsAtMin.reduce((sum, kind) => sum + counts.byKind[kind], 0);
    const label = kindsAtMin.map((kind) => kindName(lang, kind)).join(' / ');
    return answer(
      'cheapest_seat',
      lang,
      lang === 'vi'
        ? `Chỗ rẻ nhất là ${label}, ${money(min)} mỗi giờ (hiện còn ${free} chỗ trống loại này).`
        : `The cheapest seats are ${label} at ${money(min)} per hour (${free} free right now).`,
    );
  }
  const shown = kinds.length > 0 ? kinds : KINDS;
  const lines: string[] = [];
  for (const kind of shown) {
    const range = rateRange(venue, kind);
    if (!range) {
      lines.push(
        lang === 'vi'
          ? `${venue.name} không có ${kindName(lang, kind)}.`
          : `${venue.name} has no ${kindName(lang, kind)}.`,
      );
      continue;
    }
    lines.push(
      lang === 'vi'
        ? `${kindName(lang, kind)}: ${rangeText(range)} mỗi giờ (còn ${counts.byKind[kind]} chỗ trống)`
        : `${kindName(lang, kind)}: ${rangeText(range)} per hour (${counts.byKind[kind]} free)`,
    );
  }
  return answer(
    cheapest ? 'cheapest_seat' : 'seat_price',
    lang,
    (lang === 'vi' ? 'Giá chỗ ngồi: ' : 'Seat rates: ') +
      lines.join('; ') +
      '.',
  );
}

function menuAnswer(
  ctx: ConciergeContext,
  q: string,
  lang: Language,
): ConciergeAnswer {
  const { venue } = ctx;
  const list = venue.menu
    .map((item) => `${item.name} ${money(item.price)}`)
    .join(', ');
  const matched = matchMenuItems(venue, q);
  const wantsPrice = PRICE.test(q) || CHEAPEST.test(q);
  if (matched.length > 0) {
    const text = matched
      .map((item) =>
        lang === 'vi'
          ? `${item.name} có trong thực đơn, giá ${money(item.price)}.`
          : `Yes, ${item.name} is on the menu at ${money(item.price)}.`,
      )
      .join(' ');
    return answer(wantsPrice ? 'menu_price' : 'menu_item', lang, text);
  }
  if (CHEAPEST.test(q) && venue.menu.length > 0) {
    const item = venue.menu.reduce((a, b) => (b.price < a.price ? b : a));
    return answer(
      'menu_price',
      lang,
      lang === 'vi'
        ? `Món rẻ nhất là ${item.name}, ${money(item.price)}.`
        : `The cheapest item is ${item.name} at ${money(item.price)}.`,
    );
  }
  if (EXISTENCE.test(q) && !/^(what|whats|which)\b|\bgi$/.test(q))
    return answer(
      'menu_item',
      lang,
      lang === 'vi'
        ? `Mình không thấy món đó trong thực đơn hôm nay. Thực đơn: ${list}.`
        : `I don't see that on today's menu. The menu is: ${list}.`,
    );
  return answer(
    wantsPrice ? 'menu_price' : 'menu',
    lang,
    lang === 'vi'
      ? `Thực đơn ${venue.name}: ${list}. Gọi món ở tab Phiên của tôi.`
      : `Menu at ${venue.name}: ${list}. Order from My session.`,
  );
}

function billingAnswer(ctx: ConciergeContext, lang: Language): ConciergeAnswer {
  const example = billingExample(ctx.venue);
  const text =
    lang === 'vi'
      ? `Thời gian chỗ ngồi được tính theo block ${BILLING_BLOCK_MINUTES} phút của giá theo giờ. Gói 2 giờ và 4 giờ rẻ hơn 15% so với tính theo block. Gói có ${GRACE_MINUTES} phút ân hạn sau giờ đã mua; sau đó thời gian thêm tính theo block ${BILLING_BLOCK_MINUTES} phút. Ví dụ ở mức giá thấp nhất (${money(example.rate)}/giờ): 1 giờ tính theo block là ${money(example.hour)}, gói 2 giờ là ${money(example.bundle)}. Đây chỉ là ước tính demo, không thu tiền.`
      : `Seat time is billed in ${BILLING_BLOCK_MINUTES}-minute blocks of the hourly rate. The 2-hour and 4-hour bundles are 15% off the block price. Bundles have a ${GRACE_MINUTES}-minute grace period after the included time; after that, extra time is billed in ${BILLING_BLOCK_MINUTES}-minute blocks. Example at the lowest rate (${money(example.rate)}/hour): 1 hour pay as you go is ${money(example.hour)}, a 2-hour bundle is ${money(example.bundle)}. This is a demo estimate; no payment is collected.`;
  return answer('billing', lang, text);
}

const CALL_STAFF: Record<Language, string> = {
  en: 'For anything else, tap Call staff on My session and a team member will help.',
  vi: 'Với việc khác, hãy bấm Gọi nhân viên ở tab Phiên của tôi để nhân viên hỗ trợ.',
};

/** Answer one question from published data. Never throws, never acts. The
 * answer follows the question's language; `appLanguage` only decides when the
 * question itself does not show one. */
export function answerQuestion(
  question: string,
  ctx: ConciergeContext,
  appLanguage: Language = 'en',
): ConciergeAnswer {
  const lang = detectLanguage(
    typeof question === 'string' ? question : '',
    appLanguage,
  );
  const q = normalizeText(
    typeof question === 'string' ? question.slice(0, MAX_QUESTION_LENGTH) : '',
  );
  if (!q)
    return answer(
      'help',
      lang,
      lang === 'vi'
        ? 'Hãy gõ một câu hỏi, ví dụ: "Còn bao nhiêu chỗ trống?".'
        : 'Type a question, for example "How many seats are free?".',
    );

  for (const rule of REFUSALS)
    if (rule.pattern.test(q))
      return answer('refusal', lang, refusal(rule.topic, lang));

  if (PRIVACY.test(q))
    return answer(
      'privacy',
      lang,
      lang === 'vi'
        ? 'Mình chỉ cho biết số lượng chỗ trống, không chia sẻ thông tin về khách khác hay trạng thái từng chỗ. Xem sơ đồ chỗ ngồi ở tab Khám phá.'
        : "I only share how many seats are free, never who is sitting where or any guest's details. The seat map on Explore shows each seat's status.",
    );

  if (POINTS.test(q)) {
    const { venue, loyalty } = ctx;
    if (!isMember(loyalty, venue.id))
      return answer(
        'points',
        lang,
        lang === 'vi'
          ? `Điểm thưởng chỉ dành cho thành viên. Bạn chưa tham gia chương trình của ${venue.name}; hãy tham gia ở tab Thành viên.`
          : `Points are for members. You haven't joined the ${venue.name} programme yet; join on the Member tab.`,
      );
    const points = pointsBalance(loyalty, venue.id);
    return answer(
      'points',
      lang,
      lang === 'vi'
        ? `Bạn có ${points} điểm tại ${venue.name}. Bản demo chưa cho đổi điểm.`
        : `You have ${points} points at ${venue.name}. Points can't be redeemed in this demo.`,
    );
  }

  if (WIFI.test(q)) {
    const info = getVenueInfo(ctx.venue.id, lang);
    return answer(
      'wifi',
      lang,
      lang === 'vi'
        ? `Wi-Fi: ${info.wifiName}. Mật khẩu: ${info.wifiAccess} Mình không biết hay chia sẻ mật khẩu.`
        : `Wi-Fi network: ${info.wifiName}. Password: ${info.wifiAccess} I don't know or share the password itself.`,
    );
  }

  if (RULES.test(q)) {
    const info = getVenueInfo(ctx.venue.id, lang);
    return answer(
      'rules',
      lang,
      (lang === 'vi' ? 'Nội quy: ' : 'House rules: ') +
        info.rules.map((rule, i) => `${i + 1}. ${rule}`).join(' '),
    );
  }

  if (BILLING.test(q)) return billingAnswer(ctx, lang);

  const menuNamed = matchMenuItems(ctx.venue, q).length > 0;
  if (menuNamed || MENU_CONTEXT.test(q)) return menuAnswer(ctx, q, lang);

  if (CHEAPEST.test(q)) return priceAnswer(ctx, q, lang, true);
  if (PRICE.test(q)) return priceAnswer(ctx, q, lang, false);
  if (AVAILABILITY.test(q)) return availabilityAnswer(ctx, q, lang);

  if (HELP.test(q))
    return answer(
      'help',
      lang,
      (lang === 'vi'
        ? 'Mình trả lời về chỗ trống, giá chỗ ngồi, thực đơn, Wi-Fi, nội quy, điểm thưởng và cách tính tiền. '
        : 'I can answer questions about free seats, seat prices, the menu, Wi-Fi, house rules, your points and how billing works. ') +
        readOnlyNote(lang),
    );

  return answer(
    'unknown',
    lang,
    lang === 'vi'
      ? `Mình chưa có thông tin về câu hỏi này. ${CALL_STAFF.vi}`
      : `I don't have an answer to that. ${CALL_STAFF.en}`,
  );
}
