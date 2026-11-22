import {
  defineMessages,
  translate,
  type Lang,
  type Params,
} from '../../../i18n/i18n';

/** Cart, menu and order-history copy. English text is what e2e tests select
 * by, so it must not be reworded. Item names come from the venue menu and are
 * shown as stored. */
export const cartMessages = defineMessages(
  {
    // Store notices, errors and warnings (also rendered through `cartText`).
    emptyCart: 'Your cart is empty.',
    sessionUnavailable: 'This session is not available in the current venue.',
    itemGone: "{name} is not on this venue's menu. Remove it and try again.",
    partial:
      'Could not add {name} ({units} of {quantity} sent). Check your tab and try again.',
    orderPlaced: 'Order placed.',
    pricesChanged:
      'Menu prices changed. Review the updated total and place your order again.',
    orderPlacedDropped: 'Order placed. No longer available: {names}.',
    noEarlierOrder: 'There is no earlier order to repeat.',
    noneOnMenu: 'None of those items are on the menu any more.',
    allergyFailedUnavailable:
      'Your order went through, but your allergy note could not be sent to staff (staff requests are unavailable). Please tell staff about your allergy directly.',
    allergyFailedUnexpected:
      'Your order went through, but your allergy note could not be sent to staff (unexpected error). Please tell staff about your allergy directly.',
    allergyFailedReason:
      'Your order went through, but your allergy note could not be sent to staff ({reason}). Please tell staff about your allergy directly.',
    // Menu
    menuTitle: 'Menu',
    menuEmpty: 'No menu items at this venue yet.',
    searchLabel: 'Search menu',
    searchPlaceholder: 'Search the menu',
    noMatch: 'No items match',
    addItem: 'Add {name}',
    // Cart
    cartTitle: 'Your cart',
    allergySent: 'Your allergy note is sent to staff with every order.',
    prefilled: 'Prefilled from your saved preferences',
    cartEmptyHint: 'Your cart is empty. Add something from the menu.',
    quantity: 'Quantity {n}',
    removeItem: 'Remove {name}',
    noteLabel: 'Note for {name}',
    notePlaceholder: 'Note (e.g. less sugar)',
    estimatedTotal: 'Estimated total',
    optionsNote:
      'Options do not change the price. The bill is calculated by the demo core.',
    loadingMember: 'Loading your saved member data…',
    placeOrder: 'Place order',
    // Drink options
    milk: 'Milk',
    sweetness: 'Sweetness',
    ice: 'Ice',
    optionFor: '{title} {option} for {item}',
    milkDairy: 'Dairy milk',
    milkOat: 'Oat milk',
    milkAlmond: 'Almond milk',
    milkNone: 'No milk',
    sugar: '{n}% sugar',
    iceNone: 'No ice',
    iceLess: 'Less ice',
    iceNormal: 'Normal ice',
    // Orders
    ordersTitle: 'Your orders',
    ordersEmpty:
      'No orders yet. Orders you place appear here with their status.',
    statusQueued: 'Status: Queued',
    statusPreparing: 'Status: Preparing',
    statusServed: 'Status: Served',
    orderAgain: 'Order again',
  },
  {
    emptyCart: 'Giỏ hàng của bạn đang trống.',
    sessionUnavailable: 'Phiên này không khả dụng tại quán hiện tại.',
    itemGone:
      '{name} không có trong thực đơn của quán này. Hãy xóa món và thử lại.',
    partial:
      'Không thể thêm {name} (đã gửi {units}/{quantity}). Hãy kiểm tra hóa đơn của bạn và thử lại.',
    orderPlaced: 'Đã đặt món.',
    pricesChanged: 'Giá đã thay đổi. Kiểm tra tổng mới rồi đặt món lại.',
    orderPlacedDropped: 'Đã đặt món. Không còn phục vụ: {names}.',
    noEarlierOrder: 'Chưa có đơn nào trước đó để gọi lại.',
    noneOnMenu: 'Những món đó không còn trong thực đơn.',
    allergyFailedUnavailable:
      'Đơn của bạn đã được đặt, nhưng ghi chú dị ứng chưa gửi được cho nhân viên (yêu cầu hỗ trợ hiện không khả dụng). Vui lòng báo trực tiếp với nhân viên về tình trạng dị ứng của bạn.',
    allergyFailedUnexpected:
      'Đơn của bạn đã được đặt, nhưng ghi chú dị ứng chưa gửi được cho nhân viên (lỗi không mong muốn). Vui lòng báo trực tiếp với nhân viên về tình trạng dị ứng của bạn.',
    allergyFailedReason:
      'Đơn của bạn đã được đặt, nhưng ghi chú dị ứng chưa gửi được cho nhân viên ({reason}). Vui lòng báo trực tiếp với nhân viên về tình trạng dị ứng của bạn.',
    menuTitle: 'Thực đơn',
    menuEmpty: 'Quán này chưa có món nào trong thực đơn.',
    searchLabel: 'Tìm trong thực đơn',
    searchPlaceholder: 'Tìm trong thực đơn',
    noMatch: 'Không có món phù hợp',
    addItem: 'Thêm {name}',
    cartTitle: 'Giỏ hàng của bạn',
    allergySent: 'Ghi chú dị ứng của bạn được gửi cho nhân viên cùng mỗi đơn.',
    prefilled: 'Đã điền sẵn theo sở thích bạn đã lưu',
    cartEmptyHint: 'Giỏ hàng của bạn đang trống. Hãy thêm món từ thực đơn.',
    quantity: 'Số lượng {n}',
    removeItem: 'Xóa {name}',
    noteLabel: 'Ghi chú cho {name}',
    notePlaceholder: 'Ghi chú (ví dụ: ít đường)',
    estimatedTotal: 'Tổng tạm tính',
    optionsNote:
      'Các tùy chọn không làm thay đổi giá. Hóa đơn được tính bởi lõi demo.',
    loadingMember: 'Đang tải dữ liệu thành viên đã lưu của bạn…',
    placeOrder: 'Đặt món',
    milk: 'Sữa',
    sweetness: 'Độ ngọt',
    ice: 'Đá',
    optionFor: '{title} {option} cho {item}',
    milkDairy: 'Sữa tươi',
    milkOat: 'Sữa yến mạch',
    milkAlmond: 'Sữa hạnh nhân',
    milkNone: 'Không sữa',
    sugar: '{n}% đường',
    iceNone: 'Không đá',
    iceLess: 'Ít đá',
    iceNormal: 'Đá bình thường',
    ordersTitle: 'Đơn của bạn',
    ordersEmpty:
      'Chưa có đơn nào. Các đơn bạn đặt sẽ hiện ở đây cùng trạng thái.',
    statusQueued: 'Trạng thái: Đang chờ',
    statusPreparing: 'Trạng thái: Đang chuẩn bị',
    statusServed: 'Trạng thái: Đã phục vụ',
    orderAgain: 'Gọi lại',
  },
);

export type CartMessageKey = keyof typeof cartMessages.en;

/** A store message that is rendered in the viewer's language at display time. */
export interface CartMessage {
  key: CartMessageKey;
  params?: Params;
}
export const cartText = (message: CartMessage, lang: Lang = 'en') =>
  translate(cartMessages, lang, message.key, message.params);
