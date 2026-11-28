import { defineMessages } from '../../i18n/i18n';

/** Active session screen copy. English keeps the raw billing-mode code shown
 * today; only Vietnamese gets a readable mode name. */
export const activeSessionMessages = defineMessages(
  {
    overline: 'CUSTOMER / ACTIVE SESSION',
    statSeat: 'Seat Time',
    statSeatSub: '{minutes}m elapsed',
    statMenu: 'Menu Tab',
    statMenuSub: '{n} item(s)',
    statTotal: 'Running Total',
    statTotalSub: 'VND estimate',
    badge: '{seat} · {minutes}m',
    nextSession: 'Your next focus session',
    noSession: 'You have no active demo session at {venue}.',
    exploreSeats: 'Explore seats',
    liveTab: 'Your live tab',
    header: '{venue} · {seat} · {minutes} minutes · {mode}',
    modeMeteredOpen: 'METERED_OPEN',
    modeBundle2h: 'BUNDLE_2H',
    modeBundle4h: 'BUNDLE_4H',
    summary: '{count} items added · Seat time {time} · Menu {menu}',
    disclaimer:
      'Demo estimate only. Ending this session releases the seat and clears its tab; it does not collect payment.',
    endSession: 'End demo session',
    earlyEnd:
      'You still have {minutes} minutes of prepaid seat time. Ending now does not refund unused time.',
    endAnyway: 'End anyway',
    keepSeat: 'Keep my seat',
  },
  {
    overline: 'KHÁCH / PHIÊN ĐANG MỞ',
    statSeat: 'Tiền chỗ',
    statSeatSub: 'Đã ngồi {minutes} phút',
    statMenu: 'Tiền món',
    statMenuSub: '{n} món',
    statTotal: 'Tạm tính',
    statTotalSub: 'Ước tính VND',
    badge: '{seat} · {minutes} phút',
    nextSession: 'Phiên tập trung tiếp theo của bạn',
    noSession: 'Bạn chưa có phiên demo nào đang diễn ra tại {venue}.',
    exploreSeats: 'Khám phá chỗ ngồi',
    liveTab: 'Hóa đơn trực tiếp của bạn',
    header: '{venue} · {seat} · {minutes} phút · {mode}',
    modeMeteredOpen: 'Tính theo giờ',
    modeBundle2h: 'Gói 2 giờ',
    modeBundle4h: 'Gói 4 giờ',
    summary: 'Đã thêm {count} món · Tiền chỗ ngồi {time} · Thực đơn {menu}',
    disclaimer:
      'Chỉ là ước tính của bản demo. Kết thúc phiên sẽ trả chỗ ngồi và xóa hóa đơn của phiên; không thu tiền thật.',
    endSession: 'Kết thúc phiên demo',
    earlyEnd:
      'Bạn còn {minutes} phút đã trả trước. Kết thúc bây giờ sẽ không hoàn lại thời gian chưa dùng.',
    endAnyway: 'Vẫn kết thúc',
    keepSeat: 'Giữ chỗ',
  },
);

export const MODE_KEYS = {
  METERED_OPEN: 'modeMeteredOpen',
  BUNDLE_2H: 'modeBundle2h',
  BUNDLE_4H: 'modeBundle4h',
} as const;
