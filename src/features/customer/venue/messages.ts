import { defineMessages, translator, type Lang } from '../i18n/i18n';

/** Venue slice copy: seat kinds, amenities, seat detail, venue page, opening
 * hours and shared-link notices. Pure so the models can use it. */
export const venueMessages = defineMessages(
  {
    desk1: 'desk',
    desks: 'desks',
    pod1: 'pod',
    pods: 'pods',
    booth1: 'booth',
    booths: 'booths',
    kindDesk: 'Desk',
    kindPod: 'Pod',
    kindBooth: 'Booth',
    amenityPower: 'Power outlet',
    amenityWindow: 'Window',
    amenityQuiet: 'Quiet zone',
    amenityMonitor: 'Monitor available',
    noAmenities: 'No listed amenities',
    statusOccupied: 'Occupied right now',
    statusAvailable: 'Available now',
    // Opening hours
    dayMon: 'Mon',
    dayTue: 'Tue',
    dayWed: 'Wed',
    dayThu: 'Thu',
    dayFri: 'Fri',
    daySat: 'Sat',
    daySun: 'Sun',
    hoursClosed: 'Closed',
    hours24: 'Open 24 hours',
    hoursTitle: 'Hours',
    hoursUnpublished: 'Not published for this demo venue',
    everyDay: 'Every day',
    // Shared seat link
    linkUnknownVenue:
      'That link points to a venue we could not find, so it was ignored.',
    linkUnknownSeat:
      'That link points to a seat that is not in {venue}, so no seat was preselected.',
    // Seat detail card
    seatDetails: '{seat} details',
    seatTypeStatus: 'Type: {kind} · Status: {status}',
    seatAmenities: 'Amenities: {amenities}',
    seatRate:
      'Rate: {rate}/h. Estimates: 1h metered {metered} · 2h bundle {b2} · 4h bundle {b4}',
    seatDemoNote:
      'Demo estimates for seat time only. Amenities are sample data.',
    shareSeat: 'Share this seat',
    linkCopied: 'Link copied. It holds only the venue and seat.',
    linkCopyManually:
      'Copy this link to share the seat. It holds only the venue and seat.',
    // Venue page
    venueHeading: 'Hours, address and prices',
    address: 'Address: {address}',
    openNow: 'Open now',
    closedNow: 'Closed now',
    clockNote: '(device clock, venue time UTC+7)',
    openingHours: 'Opening hours',
    pricesTitle: 'Seat prices by type',
    priceFrom: 'from ',
    priceRow:
      '{kind} ({count}): {from}{rate}/h · 2h bundle {b2} · 4h bundle {b4}',
    venueDemoNote:
      'Demo venue details and estimates. Bundles are 15% off seat time, before any food or drinks.',
  },
  {
    desk1: 'bàn đơn',
    desks: 'bàn đơn',
    pod1: 'buồng riêng',
    pods: 'buồng riêng',
    booth1: 'bàn nhóm',
    booths: 'bàn nhóm',
    kindDesk: 'Bàn đơn',
    kindPod: 'Buồng riêng',
    kindBooth: 'Bàn nhóm',
    amenityPower: 'Ổ cắm điện',
    amenityWindow: 'Cạnh cửa sổ',
    amenityQuiet: 'Khu yên tĩnh',
    amenityMonitor: 'Có màn hình',
    noAmenities: 'Chưa có tiện ích nào được liệt kê',
    statusOccupied: 'Đang có người ngồi',
    statusAvailable: 'Đang trống',
    dayMon: 'T2',
    dayTue: 'T3',
    dayWed: 'T4',
    dayThu: 'T5',
    dayFri: 'T6',
    daySat: 'T7',
    daySun: 'CN',
    hoursClosed: 'Đóng cửa',
    hours24: 'Mở cửa 24 giờ',
    hoursTitle: 'Giờ mở cửa',
    hoursUnpublished: 'Chưa công bố giờ mở cửa cho quán demo này',
    everyDay: 'Hằng ngày',
    linkUnknownVenue:
      'Liên kết này trỏ tới một quán không tìm thấy nên đã được bỏ qua.',
    linkUnknownSeat:
      'Liên kết này trỏ tới một chỗ không có trong {venue}, nên chưa chọn sẵn chỗ nào.',
    seatDetails: 'Chi tiết {seat}',
    seatTypeStatus: 'Loại: {kind} · Trạng thái: {status}',
    seatAmenities: 'Tiện ích: {amenities}',
    seatRate:
      'Giá: {rate}/giờ. Ước tính: 1 giờ tính theo giờ {metered} · gói 2 giờ {b2} · gói 4 giờ {b4}',
    seatDemoNote:
      'Chỉ là ước tính demo cho tiền chỗ ngồi. Tiện ích là dữ liệu mẫu.',
    shareSeat: 'Chia sẻ chỗ này',
    linkCopied: 'Đã sao chép liên kết. Liên kết chỉ chứa quán và chỗ ngồi.',
    linkCopyManually:
      'Hãy sao chép liên kết này để chia sẻ chỗ ngồi. Liên kết chỉ chứa quán và chỗ ngồi.',
    venueHeading: 'Giờ mở cửa, địa chỉ và giá',
    address: 'Địa chỉ: {address}',
    openNow: 'Đang mở cửa',
    closedNow: 'Đang đóng cửa',
    clockNote: '(theo đồng hồ thiết bị, giờ của quán UTC+7)',
    openingHours: 'Giờ mở cửa',
    pricesTitle: 'Giá chỗ ngồi theo loại',
    priceFrom: 'từ ',
    priceRow:
      '{kind} ({count}): {from}{rate}/giờ · gói 2 giờ {b2} · gói 4 giờ {b4}',
    venueDemoNote:
      'Thông tin quán và giá ước tính chỉ để demo. Gói giảm 15% tiền chỗ ngồi, chưa gồm đồ ăn hay đồ uống.',
  },
);

export const venueT = (lang: Lang) => translator(venueMessages, lang);

type Kind = 'desk' | 'pod' | 'booth';
/** "desk" / "desks" (English plural by count; Vietnamese has none). */
export function kindWord(kind: Kind, lang: Lang, count = 1): string {
  const t = venueT(lang);
  return count === 1 ? t(`${kind}1`) : t(`${kind}s`);
}
/** Capitalised kind name for buttons and table rows. */
export function kindName(kind: Kind, lang: Lang): string {
  const t = venueT(lang);
  return kind === 'desk'
    ? t('kindDesk')
    : kind === 'pod'
      ? t('kindPod')
      : t('kindBooth');
}

/** Core seat labels stay "Seat 3"; Vietnamese shows "Chỗ 3". */
export const seatLabelText = (label: string, lang: Lang) =>
  lang === 'vi' ? label.replace(/^Seat\b/, 'Chỗ') : label;
