import { defineMessages } from '../../i18n/i18n';

/** Journeys gallery copy. Step keys are `<step>.title|summary|cta|h1..h4`. */
export const galleryMessages = defineMessages(
  {
    overline: 'PRODUCT TOUR',
    title: 'User journeys',
    subtitle: 'Pick a step to set up the demo state and open that screen.',
    activeSessions: '{n} active sessions',
    yourSession: 'Your session: {seat} · {minutes}m',
    noSession: 'No customer session yet',
    prepared: 'Prepared active customer session with sample drink.',
    catAll: 'All',
    catCustomer: 'Customer',
    catLoyalty: 'Loyalty',
    catMerchant: 'Merchant',
    catAi3d: 'AI 3D',
    catChip: '{label} · {n}',
    catA11y: '{label} journeys, {n} steps',
    journeyCustomer: 'Journey 1 · Customer Space & Session',
    journeyLoyalty: 'Journey 2 · Loyalty, Privacy & Concierge',
    journeyMerchant: 'Journey 3 · Merchant Floor, POS & Kitchen',
    journeyAi3d: 'Journey 4 · AI 3D Onboarding & Spatial Studio',
    stepBadge: 'Step {n} · {role}',
    roleCustomer: 'Customer',
    roleMerchant: 'Merchant',
    lookFor: 'What to look for',
    highlightCount: '{n} highlights',
    opens: 'Opens {route}',

    'custExplore.title': 'Explore & 3D Floor Discovery',
    'custExplore.summary':
      'Browse real-time seat availability, filter by amenity tags (Quiet, Power Outlet, Monitor, Window), and inspect the interactive 3D floor map or accessible seat list.',
    'custExplore.h1':
      'Hero availability banner with free/occupied KPIs & hourly pricing range',
    'custExplore.h2': 'Multi-amenity filter pills with live match counter',
    'custExplore.h3':
      'Interactive 3D Orbit Floor Map with floating HUD & accessible list fallback',
    'custExplore.h4':
      'Seat Detail preview drawer with deep-link share URL & package vs hourly selector',
    'custExplore.cta': 'Open Explore & 3D Map',

    'custDeeplink.title': 'Shared Seat Deep Link (?venue & ?seat)',
    'custDeeplink.summary':
      'Deep-linked seat invitation shared by a teammate that preselects the venue and seat, highlights zone details, and opens the check-in card immediately.',
    'custDeeplink.h1':
      'Automatic venue and seat preselection via query parameters',
    'custDeeplink.h2':
      'Contextual deep-link banner confirming the shared seat selection',
    'custDeeplink.h3':
      'Venue showcase card with zone breakdown, Wi-Fi credentials, and house rules',
    'custDeeplink.cta': 'Launch Shared Seat Link',

    'custSession.title': 'Live Workspace Session, Menu Cart & Focus Timer',
    'custSession.summary':
      'Active customer dashboard displaying running bill breakdown, Pomodoro focus timer, customized drink ordering (milk/ice/sweetness), order history, and table support.',
    'custSession.h1':
      'Elevated dark live-bill summary with seat charge + itemized orders',
    'custSession.h2':
      'Interactive Focus Timer with preset durations (15m / 25m / 45m)',
    'custSession.h3':
      'Expandable drink customization drawer & cart with loyalty point redemption',
    'custSession.h4':
      'Quick staff call buttons (Water, Power/Adapter, Clean Table, Bill Help)',
    'custSession.cta': 'Launch Active Session',

    'custReceipt.title': 'Digital Receipt, Refund Request & 5-Star Rating',
    'custReceipt.summary':
      'Post-checkout itemized invoice showing VAT breakdown, loyalty points earned, self-serve refund request tracking, and customer feedback rating.',
    'custReceipt.h1':
      'Monospace receipt header with invoice ID, timestamps, and tax summary',
    'custReceipt.h2':
      'Self-serve issue & refund request card with live review status badge',
    'custReceipt.h3':
      'Interactive 1–5 star rating widget with comment submission',
    'custReceipt.cta': 'Open Receipt & Feedback',

    'loyaltyProfile.title':
      'Member OTP Login, Loyalty Tier & Drink Preferences',
    'loyaltyProfile.summary':
      'Phone + OTP verification flow (demo code 123456), member tier progression (Bronze → Silver → Gold), milestone badges, and saved barista preferences.',
    'loyaltyProfile.h1': 'One-tap demo OTP verification or guest preview mode',
    'loyaltyProfile.h2':
      'Tier progress bar with lifetime points and redeemable VND balance',
    'loyaltyProfile.h3':
      'Saved default milk, ice, sweetness, and dietary notes for faster ordering',
    'loyaltyProfile.h4': 'Achievement badge grid with unlock progress bars',
    'loyaltyProfile.cta': 'Open Loyalty Profile',

    'loyaltyPrivacy.title': 'Transparency & Personal Data Controls',
    'loyaltyPrivacy.summary':
      'Clear breakdown of locally stored session, loyalty, and preference records with one-click personal data erasure.',
    'loyaltyPrivacy.h1': 'Structured inventory of stored data categories',
    'loyaltyPrivacy.h2':
      'Two-step confirmation flow to wipe personal profile & local history',
    'loyaltyPrivacy.cta': 'Open Privacy Controls',

    'loyaltyConcierge.title': 'Bilingual (EN / VI) Venue Concierge Assistant',
    'loyaltyConcierge.summary':
      'Instant Q&A assistant answering Wi-Fi, quiet seat recommendations, power outlets, pricing, and drink picks using live venue state.',
    'loyaltyConcierge.h1':
      'Quick-tap topic chips for Wi-Fi, Quiet Seats, Power, Pricing, and Drinks',
    'loyaltyConcierge.h2':
      'Conversational message bubbles with live seat availability lookups',
    'loyaltyConcierge.h3':
      'Full English & Tiếng Việt language toggle support across customer chrome',
    'loyaltyConcierge.cta': 'Open Venue Concierge',

    'merchFloor.title': 'Live Floor Command Center & Session Inspector',
    'merchFloor.summary':
      'Real-time operational overview with occupancy rate, active tabs, accrued revenue KPIs, 3D floor map, seat inspector, and active session table.',
    'merchFloor.h1':
      '4-tile KPI strip (Occupancy %, Occupied vs Free, Open Tabs, Live Revenue)',
    'merchFloor.h2':
      'Side-by-side 3D floor map and contextual Seat Inspector panel',
    'merchFloor.h3':
      'One-click Hourly or 3-Hour Study Pass check-in, quick drink add, and checkout',
    'merchFloor.cta': 'Open Merchant Floor',

    'merchPos.title': 'Counter POS Terminal & Sold-Out Inventory Control',
    'merchPos.summary':
      'Fast barista point-of-sale terminal supporting walk-in or seat-linked orders, category filtering, live sold-out toggles, and Cash / Online checkout.',
    'merchPos.h1':
      'Category filter pills with instant stock status badges and sold-out switches',
    'merchPos.h2':
      'Seat assignment selector linking orders directly to occupied floor desks',
    'merchPos.h3':
      'Order confirmation modal with receipt number and direct Ticket Board link',
    'merchPos.cta': 'Open POS Terminal',

    'merchTickets.title': 'Barista & Kitchen Ticket Board (KDS)',
    'merchTickets.summary':
      'Kanban-style fulfillment board tracking orders from Queued → Preparing → Ready → Served with elapsed timers and one-tap status progression.',
    'merchTickets.h1': 'Status filter tabs with live ticket counts per stage',
    'merchTickets.h2':
      'Color-coded ticket cards showing seat badge, payment method, and line items',
    'merchTickets.h3':
      'Single-tap progression (Start Preparing → Mark Ready → Mark Served)',
    'merchTickets.cta': 'Open Ticket Board',

    'aiOnboarding.title': 'Multimodal AI 3D Venue Generator & Spatial Editor',
    'aiOnboarding.summary':
      'End-to-end onboarding wizard where cafe owners upload photos, videos, floorplans, or menus, generate a 3D venue with AI, refine it via chat prompts, and publish live.',
    'aiOnboarding.h1':
      '4-step visual progress tracker (Upload → AI Refine → 3D Studio → Publish)',
    'aiOnboarding.h2':
      'Multimodal media upload cards + optional runtime OpenAI API key input',
    'aiOnboarding.h3':
      'Multi-turn conversational refinement with saved iteration snapshots',
    'aiOnboarding.h4':
      'Interactive 3D room dimension, wall/floor palette, and furniture inspector',
    'aiOnboarding.cta': 'Open 3D Onboarding Studio',
  },
  {
    overline: 'THAM QUAN SẢN PHẨM',
    title: 'Hành trình người dùng',
    subtitle: 'Chọn một bước để thiết lập dữ liệu demo và mở màn hình đó.',
    activeSessions: '{n} phiên đang mở',
    yourSession: 'Phiên của bạn: {seat} · {minutes} phút',
    noSession: 'Chưa có phiên khách nào',
    prepared: 'Đã chuẩn bị phiên khách đang mở kèm một món mẫu.',
    catAll: 'Tất cả',
    catCustomer: 'Khách',
    catLoyalty: 'Thành viên',
    catMerchant: 'Chủ quán',
    catAi3d: 'AI 3D',
    catChip: '{label} · {n}',
    catA11y: 'Hành trình {label}, {n} bước',
    journeyCustomer: 'Hành trình 1 · Chỗ ngồi & phiên của khách',
    journeyLoyalty: 'Hành trình 2 · Thành viên, quyền riêng tư & trợ lý',
    journeyMerchant: 'Hành trình 3 · Mặt bằng, bán hàng & bếp',
    journeyAi3d: 'Hành trình 4 · Thiết lập quán bằng AI & Studio 3D',
    stepBadge: 'Bước {n} · {role}',
    roleCustomer: 'Khách',
    roleMerchant: 'Chủ quán',
    lookFor: 'Điểm đáng xem',
    highlightCount: '{n} điểm nổi bật',
    opens: 'Mở {route}',

    'custExplore.title': 'Khám phá & mặt bằng 3D',
    'custExplore.summary':
      'Xem chỗ trống theo thời gian thực, lọc theo tiện ích (yên tĩnh, ổ cắm, màn hình, cửa sổ) và xem mặt bằng 3D tương tác hoặc danh sách chỗ dễ tiếp cận.',
    'custExplore.h1': 'Dải thông tin chỗ trống/có khách và khoảng giá theo giờ',
    'custExplore.h2':
      'Bộ lọc nhiều tiện ích kèm số chỗ khớp cập nhật trực tiếp',
    'custExplore.h3':
      'Mặt bằng 3D xoay được, kèm danh sách chỗ thay thế dễ tiếp cận',
    'custExplore.h4':
      'Thẻ chi tiết chỗ ngồi với liên kết chia sẻ và lựa chọn gói hoặc tính theo giờ',
    'custExplore.cta': 'Mở Khám phá & bản đồ 3D',

    'custDeeplink.title': 'Liên kết chia sẻ chỗ ngồi (?venue & ?seat)',
    'custDeeplink.summary':
      'Lời mời chỗ ngồi do đồng đội chia sẻ: tự chọn sẵn quán và chỗ, làm nổi bật thông tin khu vực và mở ngay thẻ nhận chỗ.',
    'custDeeplink.h1': 'Tự chọn quán và chỗ ngồi từ tham số trên đường dẫn',
    'custDeeplink.h2': 'Thông báo xác nhận chỗ ngồi được chia sẻ',
    'custDeeplink.h3':
      'Thẻ giới thiệu quán với các khu vực, thông tin Wi-Fi và nội quy',
    'custDeeplink.cta': 'Mở liên kết chia sẻ chỗ',

    'custSession.title': 'Phiên làm việc, giỏ món & đồng hồ tập trung',
    'custSession.summary':
      'Bảng điều khiển của khách đang ngồi: hóa đơn tạm tính, đồng hồ Pomodoro, gọi đồ uống tùy chỉnh (sữa/đá/độ ngọt), lịch sử gọi món và hỗ trợ tại bàn.',
    'custSession.h1': 'Tóm tắt hóa đơn trực tiếp gồm tiền chỗ và từng món',
    'custSession.h2':
      'Đồng hồ tập trung với các mốc có sẵn (15 / 25 / 45 phút)',
    'custSession.h3': 'Tùy chỉnh đồ uống và giỏ món, có đổi điểm thành viên',
    'custSession.h4':
      'Nút gọi nhân viên nhanh (nước, ổ cắm/sạc, dọn bàn, hỏi hóa đơn)',
    'custSession.cta': 'Mở phiên đang diễn ra',

    'custReceipt.title': 'Hóa đơn điện tử, yêu cầu hoàn tiền & đánh giá 5 sao',
    'custReceipt.summary':
      'Hóa đơn chi tiết sau khi kết thúc: thuế VAT, điểm thành viên nhận được, theo dõi yêu cầu hoàn tiền và đánh giá của khách.',
    'custReceipt.h1': 'Đầu hóa đơn có mã, thời gian và tóm tắt thuế',
    'custReceipt.h2':
      'Thẻ báo sự cố và yêu cầu hoàn tiền kèm trạng thái xét duyệt',
    'custReceipt.h3': 'Đánh giá 1–5 sao kèm nhận xét',
    'custReceipt.cta': 'Mở hóa đơn & đánh giá',

    'loyaltyProfile.title': 'Đăng nhập OTP, hạng thành viên & sở thích đồ uống',
    'loyaltyProfile.summary':
      'Xác minh số điện thoại bằng OTP (mã demo 123456), lên hạng thành viên (Đồng → Bạc → Vàng), huy hiệu cột mốc và sở thích pha chế đã lưu.',
    'loyaltyProfile.h1': 'Xác minh OTP demo một chạm hoặc xem ở chế độ khách',
    'loyaltyProfile.h2':
      'Thanh tiến độ hạng với tổng điểm và số dư VND đổi được',
    'loyaltyProfile.h3':
      'Lưu sẵn sữa, đá, độ ngọt và ghi chú ăn kiêng để gọi món nhanh hơn',
    'loyaltyProfile.h4': 'Lưới huy hiệu thành tích kèm tiến độ mở khóa',
    'loyaltyProfile.cta': 'Mở hồ sơ thành viên',

    'loyaltyPrivacy.title': 'Minh bạch & kiểm soát dữ liệu cá nhân',
    'loyaltyPrivacy.summary':
      'Liệt kê rõ dữ liệu phiên, thành viên và sở thích lưu trên máy, kèm xóa dữ liệu cá nhân bằng một nút.',
    'loyaltyPrivacy.h1': 'Danh mục các loại dữ liệu đang lưu',
    'loyaltyPrivacy.h2':
      'Xác nhận hai bước trước khi xóa hồ sơ và lịch sử trên máy',
    'loyaltyPrivacy.cta': 'Mở kiểm soát quyền riêng tư',

    'loyaltyConcierge.title': 'Trợ lý quán song ngữ (EN / VI)',
    'loyaltyConcierge.summary':
      'Trợ lý hỏi đáp tức thì về Wi-Fi, gợi ý chỗ yên tĩnh, ổ cắm, giá và đồ uống, dựa trên tình trạng thực của quán.',
    'loyaltyConcierge.h1':
      'Chủ đề chạm nhanh: Wi-Fi, chỗ yên tĩnh, ổ cắm, giá, đồ uống',
    'loyaltyConcierge.h2': 'Tin nhắn hội thoại có tra cứu chỗ trống trực tiếp',
    'loyaltyConcierge.h3':
      'Chuyển đổi English & Tiếng Việt trên toàn bộ giao diện',
    'loyaltyConcierge.cta': 'Mở trợ lý quán',

    'merchFloor.title': 'Trung tâm mặt bằng & kiểm tra phiên',
    'merchFloor.summary':
      'Tổng quan vận hành theo thời gian thực: tỷ lệ lấp đầy, hóa đơn mở, doanh thu tạm tính, mặt bằng 3D, kiểm tra chỗ ngồi và bảng phiên đang mở.',
    'merchFloor.h1':
      'Dải chỉ số (lấp đầy, có khách/trống, hóa đơn mở, doanh thu)',
    'merchFloor.h2': 'Mặt bằng 3D đặt cạnh bảng kiểm tra chỗ ngồi',
    'merchFloor.h3':
      'Nhận chỗ theo giờ hoặc gói học 3 giờ, thêm đồ uống nhanh và thanh toán',
    'merchFloor.cta': 'Mở mặt bằng chủ quán',

    'merchPos.title': 'Quầy bán hàng & quản lý hết hàng',
    'merchPos.summary':
      'Màn bán hàng nhanh cho barista: đơn khách lẻ hoặc gắn với chỗ ngồi, lọc theo nhóm món, bật/tắt hết hàng và thanh toán tiền mặt / online.',
    'merchPos.h1': 'Lọc theo nhóm món kèm trạng thái tồn và công tắc hết hàng',
    'merchPos.h2': 'Chọn chỗ ngồi để gắn đơn với bàn đang có khách',
    'merchPos.h3': 'Xác nhận đơn kèm số hóa đơn và liên kết sang bảng phiếu',
    'merchPos.cta': 'Mở quầy bán hàng',

    'merchTickets.title': 'Bảng phiếu pha chế & bếp (KDS)',
    'merchTickets.summary':
      'Bảng theo dõi đơn kiểu Kanban: Chờ → Đang làm → Xong → Đã phục vụ, có thời gian chờ và chuyển trạng thái một chạm.',
    'merchTickets.h1': 'Lọc theo trạng thái kèm số phiếu từng giai đoạn',
    'merchTickets.h2':
      'Thẻ phiếu có chỗ ngồi, phương thức thanh toán và các món',
    'merchTickets.h3':
      'Chuyển bước một chạm (Bắt đầu làm → Báo xong → Báo đã phục vụ)',
    'merchTickets.cta': 'Mở bảng phiếu',

    'aiOnboarding.title':
      'Dựng quán 3D bằng AI đa phương thức & chỉnh không gian',
    'aiOnboarding.summary':
      'Trình thiết lập trọn gói: chủ quán tải lên ảnh, video, sơ đồ hoặc thực đơn, để AI dựng quán 3D, tinh chỉnh qua trò chuyện rồi xuất bản.',
    'aiOnboarding.h1':
      'Tiến trình 4 bước (Tải lên → AI tinh chỉnh → Studio 3D → Xuất bản)',
    'aiOnboarding.h2':
      'Tải lên nhiều loại tệp, kèm ô nhập khóa API OpenAI không bắt buộc',
    'aiOnboarding.h3':
      'Tinh chỉnh qua nhiều lượt trò chuyện, lưu lại từng phiên bản',
    'aiOnboarding.h4': 'Chỉnh kích thước phòng, màu tường/sàn và nội thất 3D',
    'aiOnboarding.cta': 'Mở Studio thiết lập 3D',
  },
);

export type GalleryKey = keyof typeof galleryMessages.en;
