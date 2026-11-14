import { defineMessages, translator, type Lang } from '../i18n/i18n';

/** Explore screen copy. Pure so exploreModel can use it. English text is
 * unchanged from the original screen; end-to-end tests select by it. */
export const exploreMessages = defineMessages(
  {
    loading: 'Loading your seats and preferences…',
    eyebrow: 'CUSTOMER / FIND YOUR SPACE',
    intro: '{description} Select an available seat to try a demo session.',
    // Occupancy summary
    seatsFree: '{free} of {total} seats free',
    // Billing mode in a sentence
    modeMetered: 'metered time',
    modeBundle2h: 'the 2h bundle',
    modeBundle4h: 'the 4h bundle',
    // Your usual
    usualTitle: 'Your usual',
    usualBody:
      'Based on {count} visits here you usually take a {kind} with {mode}{order}.',
    usualOrder: ' and order {item}',
    usualFree: '{seat} is free{pinned}.',
    usualPinned: ' and is one of your pinned seats',
    usualSelect: 'Select {seat}',
    usualNoSeat:
      'No {kind} is free right now. Check back soon or pick another seat.',
    // Pinned seats
    pinnedTitle: 'Your pinned seats',
    pinnedNone:
      'No pinned seats yet. Select a seat and press Pin seat to find it again in one tap.',
    pinnedOccupied: '{seat} (occupied)',
    pinnedBook: 'Book my seat again: {seat}',
    // Filters
    filterTitle: 'Filter seats',
    anyPrice: 'Any price',
    priceCap: '≤ {price}/h',
    availableOnly: 'Available only',
    showing: 'Showing {shown} of {total} seats.',
    noMatch: 'No seats match these filters.',
    clearFilters: 'Clear filters',
    // Selection
    selected: 'Selected: {seat}',
    hiddenByFilters: ' - hidden by filters',
    unpin: '★ Unpin seat',
    pin: '☆ Pin seat',
    // Start buttons
    startMetered: 'Start metered',
    startBundle2h: '2h bundle · 15% off',
    startBundle4h: '4h bundle · 15% off',
    footnote:
      'Demo estimates in VND. Metered time rounds up to 15 minutes; bundles include a 10 minute overtime grace period.',
    // Messages that come back from the demo core as English text
    errSelectSeat: 'Select a seat first.',
    errOccupied: 'This seat is already occupied.',
    errActiveSession: 'Finish your current demo session first.',
  },
  {
    loading: 'Đang tải chỗ ngồi và tuỳ chọn của bạn…',
    eyebrow: 'KHÁCH HÀNG / TÌM KHÔNG GIAN CỦA BẠN',
    intro: '{description} Hãy chọn một chỗ trống để thử phiên demo.',
    seatsFree: 'Còn {free}/{total} chỗ trống',
    modeMetered: 'tính theo giờ',
    modeBundle2h: 'gói 2 giờ',
    modeBundle4h: 'gói 4 giờ',
    usualTitle: 'Lựa chọn quen thuộc của bạn',
    usualBody:
      'Dựa trên {count} lần ghé ở đây, bạn thường chọn {kind} với {mode}{order}.',
    usualOrder: ' và gọi {item}',
    usualFree: '{seat} đang trống{pinned}.',
    usualPinned: ' và là một trong những chỗ bạn đã ghim',
    usualSelect: 'Chọn {seat}',
    usualNoSeat:
      'Hiện không còn {kind} nào trống. Hãy quay lại sau hoặc chọn chỗ khác.',
    pinnedTitle: 'Chỗ bạn đã ghim',
    pinnedNone:
      'Chưa ghim chỗ nào. Hãy chọn một chỗ và nhấn Ghim chỗ để tìm lại nhanh chỉ với một chạm.',
    pinnedOccupied: '{seat} (đang có người)',
    pinnedBook: 'Đặt lại chỗ của tôi: {seat}',
    filterTitle: 'Lọc chỗ ngồi',
    anyPrice: 'Mọi mức giá',
    priceCap: '≤ {price}/giờ',
    availableOnly: 'Chỉ chỗ trống',
    showing: 'Hiển thị {shown}/{total} chỗ.',
    noMatch: 'Không có chỗ nào khớp với bộ lọc này.',
    clearFilters: 'Xoá bộ lọc',
    selected: 'Đã chọn: {seat}',
    hiddenByFilters: ' - bị ẩn bởi bộ lọc',
    unpin: '★ Bỏ ghim chỗ',
    pin: '☆ Ghim chỗ',
    startMetered: 'Bắt đầu tính theo giờ',
    startBundle2h: 'Gói 2 giờ · giảm 15%',
    startBundle4h: 'Gói 4 giờ · giảm 15%',
    footnote:
      'Ước tính demo bằng VND. Thời gian tính theo giờ được làm tròn lên 15 phút; gói có thêm 10 phút quá giờ được ân hạn.',
    errSelectSeat: 'Hãy chọn một chỗ trước.',
    errOccupied: 'Chỗ này đã có người ngồi.',
    errActiveSession: 'Hãy kết thúc phiên demo hiện tại trước.',
  },
);

export const exploreT = (lang: Lang) => translator(exploreMessages, lang);

const CORE_ERRORS: Record<string, keyof typeof exploreMessages.en> = {
  'Select a seat first.': 'errSelectSeat',
  'This seat is already occupied.': 'errOccupied',
  'Finish your current demo session first.': 'errActiveSession',
};
/** Translates the few English errors the demo core returns when a session
 * cannot start; unknown messages are shown as they are. */
export const startErrorText = (message: string, lang: Lang) => {
  const key = CORE_ERRORS[message];
  return key ? exploreT(lang)(key) : message;
};

export const MODE_KEY = {
  METERED_OPEN: 'modeMetered',
  BUNDLE_2H: 'modeBundle2h',
  BUNDLE_4H: 'modeBundle4h',
} as const;

/** Taglines of the demo venues (core fixtures, English only). */
const VI_DESCRIPTION: Record<string, string> = {
  'Warm coffee. Clear thinking.': 'Cà phê ấm áp. Tư duy sáng rõ.',
  'A little room for your next idea.':
    'Một góc nhỏ cho ý tưởng tiếp theo của bạn.',
  'Find your focus, any time.': 'Tìm thấy sự tập trung, vào bất cứ lúc nào.',
};
export const descriptionText = (description: string, lang: Lang) =>
  lang === 'vi' ? (VI_DESCRIPTION[description] ?? description) : description;
