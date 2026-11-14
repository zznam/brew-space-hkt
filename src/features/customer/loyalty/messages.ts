import { defineMessages, translator, type Lang } from '../../../i18n/i18n';

/** Loyalty copy: model errors, the member profile and the privacy page. Pure
 * so loyaltyModel can use it. English text is unchanged from the original
 * screens; end-to-end tests select by it. */
export const loyaltyMessages = defineMessages(
  {
    privacyOverline: 'CUSTOMER / DATA PRIVACY',
    localOnly: 'Local Device Only',
    // Model errors and notices
    errPhone: 'Enter a 10 digit mobile number starting with 0.',
    errUnknownVenue: 'Unknown venue.',
    errAlreadyJoined: 'You already joined this programme.',
    errCode: 'The code is not correct. Try again.',
    errConsent: 'Please agree to the data use above to join.',
    errFriendInvalid: "That friend's code is not valid.",
    errFriendOtherVenue: "That code belongs to another venue's programme.",
    errOwnCode: 'You cannot use your own referral code.',
    errNeedJoin: 'Join the programme to save preferences.',
    errAllergyLength: 'Allergy note can be up to {max} characters.',
    errUnknownSeat: 'That seat is not in this venue.',
    errMaxPins: 'You can pin up to {max} seats. Unpin one first.',
    allergyNotice: 'Staff will always be notified about allergies',
    warnIncompatible: 'Saved member data was incompatible. Starting fresh.',
    warnLoadFailed: 'Saved member data could not be loaded. Starting fresh.',
    // Profile: shared
    loading: 'Loading your member profile…',
    eyebrow: 'CUSTOMER / MEMBER',
    privacyLink: 'How we use your data',
    statsTitle: 'Your stats here',
    statsNone:
      'No completed visits yet. Stats appear after your first session.',
    statVisits: 'Visits: {n}',
    statTime: 'Time spent: {time}',
    statSpend: 'Total spend: {money}',
    statSeatKind: 'Favourite seat type: {kind}',
    statItem: 'Favourite item: {item}',
    noneYet: 'none yet',
    minutesOnly: '{m} min',
    hoursMinutes: '{h} h {m} min',
    // Profile: guest
    guestIntro:
      'You are browsing as a guest. Guests can still buy, but only members earn points. Join to earn points.',
    joinTitle: 'Join {venue} rewards',
    mobileNumber: 'Mobile number',
    sendCode: 'Send code',
    demoOtp: 'Demo only: no SMS is sent. Your code for {phone} is {code}.',
    verificationCode: 'Verification code',
    friendCodeLabel: "Friend's code (optional)",
    friendCodeA11y: "Friend's code",
    referralNote:
      'A valid code from {venue} gives you {points} bonus points once. Demo only: your friend is not credited, because this device holds the only data.',
    consentText:
      'I agree that {venue} stores my mobile number, visit history, points, drink preferences and pinned seats on this device to run its rewards programme. I can leave at any time and my data is deleted.',
    join: 'Join',
    pointsLater:
      'Points are earned from your next completed visit after joining.',
    guestLocal:
      'Your guest visits and pinned seats are kept only on this device.',
    confirmDeleteData: 'Yes, delete this data',
    cancel: 'Cancel',
    deleteVisitData: 'Delete my visit data',
    // Profile: member
    memberLine: 'Member · {phone}',
    pointsHeading: '{n} points',
    earnNote:
      'You earn 1 point per full {unit} spent after each completed visit. Redeeming points is not available yet.',
    historyTitle: 'Points history',
    historyNone: 'No points yet. Complete a visit to earn your first points.',
    historyLine: '+{n} points · {detail}',
    historyReferral: 'Referral bonus for using a friend code',
    historyVisit: 'Visit {id}',
    referralTitle: 'Your referral code',
    referralA11y: 'Your referral code is {code}',
    referralExplain:
      "A friend joining {venue} can enter it for {points} bonus points. Demo only: there is one device and no server, so a friend's join cannot be checked and you are not credited for it.",
    prefsTitle: 'Drink preferences',
    milk: 'Milk',
    milkDairy: 'Dairy',
    milkOat: 'Oat',
    milkAlmond: 'Almond',
    milkNone: 'No milk',
    sweetness: 'Sweetness',
    allergyLabel: 'Allergy note ({n}/{max})',
    allergyA11y: 'Allergy note',
    savePrefs: 'Save preferences',
    prefsSaved: 'Preferences saved.',
    pinnedTitle: 'Pinned seats',
    pinnedNone:
      'No pinned seats. Pin one from Explore to find it again quickly.',
    unpinSeat: '★ {seat} · Unpin',
    leaveTitle: 'Leave programme',
    leaveConfirm:
      'This deletes your membership, points, visit history, preferences and pinned seats for {venue}. It cannot be undone.',
    confirmDeleteMine: 'Yes, delete my data',
    leaveButton: 'Leave programme and delete my data',
    // Privacy page
    privTitle: 'How we use your data',
    privIntro:
      'What is stored, how long it is kept, what is sent to AI, and how to delete it. You can read this before joining.',
    privS1Title: 'Stored on this device only',
    privS1L1:
      'Everything below stays on this device. This demo has no server, no account system and no analytics, so nothing here is uploaded anywhere.',
    privS2Title: '1. Demo session (key vibing-hkt:demo:v1)',
    privS2L1:
      'Seats, sessions, orders on your tab, the selected venue and role. It is demo data, not a real booking or payment.',
    privS2L2: 'Cleared by "Reset all demo data" in the simulator bar.',
    privS3Title: '2. Member data (key vibing-hkt:customer:v1)',
    privS3L1:
      'Only after you join, plus visit history for guests: your mobile number, your consent, visit history (seat, minutes, items, total), points history, drink preferences including the allergy note, pinned seats, and a referral bonus if you used a friend code.',
    privS3L2:
      'Badges, streaks and your referral code are worked out from this data when you open the page. They are not stored separately.',
    privS3L3:
      'There is no automatic expiry: data stays until you delete it or clear this site or app data.',
    privS4Title: '3. Memory only (lost on reload)',
    privS4L1:
      'Your cart and order log, support requests, the last receipt and ratings, and the focus timer. They are never written to storage.',
    privS5Title: 'Sent to AI',
    privS5L1:
      'Nothing today. No AI feature exists in this app. If one is added later, this page will say what it would send and ask for your consent first.',
    privS6Title: 'Demo notes',
    privS6L1:
      'The verification code is shown on screen and no SMS is sent. A friend code is checked only for its format, venue and that it is not your own: the friend is not credited, because there is only this device.',
    privDeleteTitle: 'How to delete your data',
    privDeleteBody:
      "On the Member page, use “Leave programme and delete my data” (members) or “Delete my visit data” (guests). This removes that venue's number, visits, points, preferences and pinned seats at once.",
    privGoMember: 'Go to Member page',
  },
  {
    privacyOverline: 'KHÁCH / QUYỀN RIÊNG TƯ',
    localOnly: 'Chỉ lưu trên máy này',
    errPhone: 'Hãy nhập số điện thoại di động 10 chữ số, bắt đầu bằng số 0.',
    errUnknownVenue: 'Không tìm thấy quán.',
    errAlreadyJoined: 'Bạn đã tham gia chương trình này rồi.',
    errCode: 'Mã chưa đúng. Hãy thử lại.',
    errConsent: 'Vui lòng đồng ý với việc sử dụng dữ liệu ở trên để tham gia.',
    errFriendInvalid: 'Mã của bạn bè không hợp lệ.',
    errFriendOtherVenue: 'Mã này thuộc chương trình của quán khác.',
    errOwnCode: 'Bạn không thể dùng mã giới thiệu của chính mình.',
    errNeedJoin: 'Hãy tham gia chương trình để lưu tuỳ chọn.',
    errAllergyLength: 'Ghi chú dị ứng tối đa {max} ký tự.',
    errUnknownSeat: 'Chỗ này không thuộc quán này.',
    errMaxPins:
      'Bạn chỉ có thể ghim tối đa {max} chỗ. Hãy bỏ ghim một chỗ trước.',
    allergyNotice: 'Nhân viên sẽ luôn được thông báo về dị ứng',
    warnIncompatible:
      'Dữ liệu thành viên đã lưu không tương thích. Bắt đầu lại từ đầu.',
    warnLoadFailed:
      'Không thể tải dữ liệu thành viên đã lưu. Bắt đầu lại từ đầu.',
    loading: 'Đang tải hồ sơ thành viên của bạn…',
    eyebrow: 'KHÁCH HÀNG / THÀNH VIÊN',
    privacyLink: 'Cách chúng tôi dùng dữ liệu của bạn',
    statsTitle: 'Thống kê của bạn tại đây',
    statsNone:
      'Chưa có lần ghé nào hoàn thành. Thống kê sẽ xuất hiện sau phiên đầu tiên của bạn.',
    statVisits: 'Số lần ghé: {n}',
    statTime: 'Thời gian đã ngồi: {time}',
    statSpend: 'Tổng chi tiêu: {money}',
    statSeatKind: 'Loại chỗ ngồi yêu thích: {kind}',
    statItem: 'Món yêu thích: {item}',
    noneYet: 'chưa có',
    minutesOnly: '{m} phút',
    hoursMinutes: '{h} giờ {m} phút',
    guestIntro:
      'Bạn đang xem với tư cách khách. Khách vẫn có thể mua hàng, nhưng chỉ thành viên mới tích điểm. Hãy tham gia để tích điểm.',
    joinTitle: 'Tham gia ưu đãi của {venue}',
    mobileNumber: 'Số điện thoại di động',
    sendCode: 'Gửi mã',
    demoOtp:
      'Chỉ là bản demo: không gửi SMS. Mã của bạn cho {phone} là {code}.',
    verificationCode: 'Mã xác minh',
    friendCodeLabel: 'Mã của bạn bè (không bắt buộc)',
    friendCodeA11y: 'Mã của bạn bè',
    referralNote:
      'Mã hợp lệ từ {venue} tặng bạn {points} điểm thưởng một lần. Bản demo: bạn bè của bạn không được cộng điểm, vì thiết bị này giữ toàn bộ dữ liệu.',
    consentText:
      'Tôi đồng ý để {venue} lưu số điện thoại di động, lịch sử ghé, điểm, tuỳ chọn đồ uống và các chỗ đã ghim của tôi trên thiết bị này để vận hành chương trình ưu đãi. Tôi có thể rời đi bất cứ lúc nào và dữ liệu của tôi sẽ bị xoá.',
    join: 'Tham gia',
    pointsLater:
      'Điểm được tích từ lần ghé hoàn thành tiếp theo sau khi bạn tham gia.',
    guestLocal:
      'Các lần ghé và chỗ đã ghim của bạn khi là khách chỉ được lưu trên thiết bị này.',
    confirmDeleteData: 'Có, xoá dữ liệu này',
    cancel: 'Huỷ',
    deleteVisitData: 'Xoá dữ liệu lần ghé của tôi',
    memberLine: 'Thành viên · {phone}',
    pointsHeading: '{n} điểm',
    earnNote:
      'Bạn nhận 1 điểm cho mỗi {unit} chi tiêu trọn vẹn sau mỗi lần ghé hoàn thành. Hiện chưa thể đổi điểm.',
    historyTitle: 'Lịch sử điểm',
    historyNone:
      'Chưa có điểm. Hãy hoàn thành một lần ghé để nhận điểm đầu tiên.',
    historyLine: '+{n} điểm · {detail}',
    historyReferral: 'Điểm thưởng vì dùng mã của bạn bè',
    historyVisit: 'Lần ghé {id}',
    referralTitle: 'Mã giới thiệu của bạn',
    referralA11y: 'Mã giới thiệu của bạn là {code}',
    referralExplain:
      'Bạn bè tham gia {venue} có thể nhập mã này để nhận {points} điểm thưởng. Bản demo: chỉ có một thiết bị và không có máy chủ, nên không thể kiểm tra việc bạn bè tham gia và bạn không được cộng điểm.',
    prefsTitle: 'Tuỳ chọn đồ uống',
    milk: 'Sữa',
    milkDairy: 'Sữa bò',
    milkOat: 'Sữa yến mạch',
    milkAlmond: 'Sữa hạnh nhân',
    milkNone: 'Không sữa',
    sweetness: 'Độ ngọt',
    allergyLabel: 'Ghi chú dị ứng ({n}/{max})',
    allergyA11y: 'Ghi chú dị ứng',
    savePrefs: 'Lưu tuỳ chọn',
    prefsSaved: 'Đã lưu tuỳ chọn.',
    pinnedTitle: 'Chỗ đã ghim',
    pinnedNone:
      'Chưa ghim chỗ nào. Hãy ghim một chỗ từ trang Khám phá để tìm lại nhanh.',
    unpinSeat: '★ {seat} · Bỏ ghim',
    leaveTitle: 'Rời chương trình',
    leaveConfirm:
      'Thao tác này xoá tư cách thành viên, điểm, lịch sử ghé, tuỳ chọn và các chỗ đã ghim của bạn tại {venue}. Không thể hoàn tác.',
    confirmDeleteMine: 'Có, xoá dữ liệu của tôi',
    leaveButton: 'Rời chương trình và xoá dữ liệu của tôi',
    privTitle: 'Cách chúng tôi dùng dữ liệu của bạn',
    privIntro:
      'Dữ liệu nào được lưu, lưu bao lâu, những gì được gửi tới AI và cách xoá. Bạn có thể đọc trang này trước khi tham gia.',
    privS1Title: 'Chỉ lưu trên thiết bị này',
    privS1L1:
      'Mọi thứ bên dưới chỉ nằm trên thiết bị này. Bản demo không có máy chủ, không có hệ thống tài khoản và không có phân tích, nên không có gì ở đây được tải lên bất kỳ đâu.',
    privS2Title: '1. Phiên demo (khoá vibing-hkt:demo:v1)',
    privS2L1:
      'Chỗ ngồi, phiên, các món gọi trên hoá đơn của bạn, quán đã chọn và vai trò. Đây là dữ liệu demo, không phải đặt chỗ hay thanh toán thật.',
    privS2L2: 'Được xoá bằng "Reset all demo data" trên thanh mô phỏng.',
    privS3Title: '2. Dữ liệu thành viên (khoá vibing-hkt:customer:v1)',
    privS3L1:
      'Chỉ sau khi bạn tham gia, cùng lịch sử ghé của khách: số điện thoại di động, sự đồng ý của bạn, lịch sử ghé (chỗ ngồi, số phút, món, tổng tiền), lịch sử điểm, tuỳ chọn đồ uống gồm cả ghi chú dị ứng, chỗ đã ghim và điểm thưởng giới thiệu nếu bạn dùng mã của bạn bè.',
    privS3L2:
      'Huy hiệu, chuỗi và mã giới thiệu của bạn được tính từ dữ liệu này khi bạn mở trang. Chúng không được lưu riêng.',
    privS3L3:
      'Không có thời hạn tự động hết hạn: dữ liệu được giữ cho đến khi bạn xoá hoặc xoá dữ liệu trang web hay ứng dụng này.',
    privS4Title: '3. Chỉ trong bộ nhớ (mất khi tải lại)',
    privS4L1:
      'Giỏ hàng và nhật ký gọi món, yêu cầu hỗ trợ, biên nhận và đánh giá gần nhất, và bộ hẹn giờ tập trung. Chúng không bao giờ được ghi vào bộ nhớ lưu trữ.',
    privS5Title: 'Gửi tới AI',
    privS5L1:
      'Hiện không có gì. Ứng dụng này không có tính năng AI nào. Nếu sau này có, trang này sẽ nói rõ sẽ gửi gì và hỏi sự đồng ý của bạn trước.',
    privS6Title: 'Ghi chú về bản demo',
    privS6L1:
      'Mã xác minh được hiển thị trên màn hình và không có SMS nào được gửi. Mã của bạn bè chỉ được kiểm tra về định dạng, quán và việc không phải mã của chính bạn: bạn bè không được cộng điểm, vì chỉ có thiết bị này.',
    privDeleteTitle: 'Cách xoá dữ liệu của bạn',
    privDeleteBody:
      'Ở trang Thành viên, hãy dùng “Rời chương trình và xoá dữ liệu của tôi” (thành viên) hoặc “Xoá dữ liệu lần ghé của tôi” (khách). Thao tác này xoá ngay số điện thoại, lần ghé, điểm, tuỳ chọn và chỗ đã ghim của quán đó.',
    privGoMember: 'Đến trang Thành viên',
  },
);

export const loyaltyT = (lang: Lang) => translator(loyaltyMessages, lang);

/** The load warnings that useLoyalty reports as English text. */
export const LOAD_WARNING_INCOMPATIBLE =
  'Saved member data was incompatible. Starting fresh.';
export const LOAD_WARNING_FAILED =
  'Saved member data could not be loaded. Starting fresh.';
export function loyaltyWarningText(warning: string, lang: Lang): string {
  const t = loyaltyT(lang);
  if (warning === LOAD_WARNING_INCOMPATIBLE) return t('warnIncompatible');
  if (warning === LOAD_WARNING_FAILED) return t('warnLoadFailed');
  return warning;
}
