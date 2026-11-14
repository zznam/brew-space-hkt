import type { Lang } from '../../../i18n/i18n';

/** Static demo venue details shown after check-in. No Wi-Fi credentials live
 * in client code; the card only says where guests find them. Real values must
 * come from the venue's backend config. */
/** Vietnamese variants of the text fields. The English fields stay the
 * source that other slices read; `getVenueInfo(id, 'vi')` swaps these in. */
export interface VenueInfoVi {
  wifiAccess: string;
  rules: [string, string, string];
  address: string;
}

export interface VenueInfo {
  wifiName: string;
  /** Where guests find the Wi-Fi password, never the password itself. */
  wifiAccess: string;
  rules: [string, string, string];
  /** Demo street address (not a real place). Real values come from the
   * venue's backend config. */
  address: string;
  /** Venue clock offset from UTC in minutes, used to read the device clock in
   * venue time. Fixed offsets only: the demo venues are in a zone without DST. */
  utcOffsetMinutes: number;
  /** Opening hours per weekday, index 0 = Sunday ... 6 = Saturday. `null`
   * means closed all day. Times are 24h "HH:MM" in venue time; "24:00" is
   * end of day. Demo data until the backend owns opening hours (F140). */
  hours: (DayHours | null)[];
  /** Vietnamese text for the fields above. */
  vi: VenueInfoVi;
}
export interface DayHours {
  open: string;
  close: string;
}
const HO_CHI_MINH_OFFSET = 7 * 60;
const week = (
  weekday: DayHours | null,
  saturday: DayHours | null,
  sunday: DayHours | null,
): (DayHours | null)[] => [
  sunday,
  weekday,
  weekday,
  weekday,
  weekday,
  weekday,
  saturday,
];

const INFO: Record<string, VenueInfo> = {
  grind: {
    wifiName: 'Grind-Guest-DEMO',
    wifiAccess: 'Printed on the card at your table.',
    address: '12 Demo Lane, District 1, Ho Chi Minh City (demo address)',
    utcOffsetMinutes: HO_CHI_MINH_OFFSET,
    hours: week(
      { open: '07:30', close: '21:00' },
      { open: '08:30', close: '22:00' },
      { open: '09:00', close: '18:00' },
    ),
    rules: [
      'Keep calls short and take longer ones to the phone booth.',
      'Please push your chair in and clear your table when you leave.',
      'Hot drinks stay away from power strips and laptops.',
    ],
    vi: {
      wifiAccess: 'In trên thẻ đặt ở bàn của bạn.',
      address: '12 Hẻm Demo, Quận 1, TP. Hồ Chí Minh (địa chỉ demo)',
      rules: [
        'Hãy nói chuyện điện thoại ngắn gọn, cuộc gọi dài thì ra buồng điện thoại.',
        'Vui lòng kê ghế gọn lại và dọn bàn khi bạn rời đi.',
        'Để đồ uống nóng cách xa ổ điện và laptop.',
      ],
    },
  },
  matcha: {
    wifiName: 'Matcha-Muse-DEMO',
    wifiAccess: 'Shown on the board next to the tea bar.',
    address: '34 Sample Street, District 3, Ho Chi Minh City (demo address)',
    utcOffsetMinutes: HO_CHI_MINH_OFFSET,
    hours: week(
      { open: '09:00', close: '20:00' },
      { open: '09:00', close: '20:00' },
      null,
    ),
    rules: [
      'Studio is a quiet zone: headphones for audio, please.',
      'No outside food; ask us if you have dietary needs.',
      'Tell a team member before moving furniture.',
    ],
    vi: {
      wifiAccess: 'Hiển thị trên bảng cạnh quầy trà.',
      address: '34 Đường Mẫu, Quận 3, TP. Hồ Chí Minh (địa chỉ demo)',
      rules: [
        'Studio là khu yên tĩnh: vui lòng dùng tai nghe khi nghe âm thanh.',
        'Không mang đồ ăn từ ngoài vào; hãy hỏi chúng tôi nếu bạn có nhu cầu ăn uống riêng.',
        'Hãy báo nhân viên trước khi di chuyển bàn ghế.',
      ],
    },
  },
  cyber: {
    wifiName: 'CyberPod-DEMO',
    wifiAccess: 'On the screen inside your pod.',
    address: '56 Example Road, Binh Thanh, Ho Chi Minh City (demo address)',
    utcOffsetMinutes: HO_CHI_MINH_OFFSET,
    hours: week(
      { open: '00:00', close: '24:00' },
      { open: '00:00', close: '24:00' },
      { open: '00:00', close: '24:00' },
    ),
    rules: [
      'Keep gaming audio in headphones.',
      'Drinks go in the holders, never next to keyboards.',
      'Pods are cleaned between guests; report any issue right away.',
    ],
    vi: {
      wifiAccess: 'Hiển thị trên màn hình trong buồng của bạn.',
      address: '56 Đường Ví Dụ, Bình Thạnh, TP. Hồ Chí Minh (địa chỉ demo)',
      rules: [
        'Hãy dùng tai nghe khi chơi game.',
        'Đồ uống để trong giá đựng, không để cạnh bàn phím.',
        'Buồng riêng được dọn giữa các lượt khách; hãy báo ngay nếu có sự cố.',
      ],
    },
  },
};

const FALLBACK: VenueInfo = {
  wifiName: 'Venue-Guest-DEMO',
  wifiAccess: 'Ask a team member.',
  address: 'Ask a team member for the address (demo venue).',
  utcOffsetMinutes: HO_CHI_MINH_OFFSET,
  hours: week(null, null, null),
  rules: [
    'Be considerate of the people around you.',
    'Keep drinks away from electronics.',
    'Ask a team member if you need anything.',
  ],
  vi: {
    wifiAccess: 'Hãy hỏi nhân viên.',
    address: 'Hãy hỏi nhân viên về địa chỉ (quán demo).',
    rules: [
      'Hãy tôn trọng những người xung quanh.',
      'Để đồ uống cách xa thiết bị điện tử.',
      'Hãy hỏi nhân viên nếu bạn cần gì.',
    ],
  },
};

/** English by default, so existing callers are unchanged. For 'vi' the
 * Wi-Fi hint, rules and address are Vietnamese; everything else (network
 * name, hours, offset) is the same. */
export function getVenueInfo(venueId: string, lang: Lang = 'en'): VenueInfo {
  const info = INFO[venueId] ?? FALLBACK;
  return lang === 'vi' ? { ...info, ...info.vi } : info;
}
