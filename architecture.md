# Project map

- `prototype/index.html`: cửa vào hai giao diện HTML, không cần build.
- `prototype/preview.html`, `preview.css`: xem hai màn điện thoại cạnh nhau bằng iframe thật.
- `prototype/operations.html`, `operations.js`: FE1 vận hành, POS mẫu, booking, hỗ trợ và chỉnh bố trí.
- `prototype/customer.html`, `customer.js`: FE2 chọn chỗ, giỏ hàng và checkout mô phỏng.
- `prototype/shared.js`: dữ liệu mẫu, localStorage, SVG mặt bằng và icon dùng chung.
- `prototype/styles.css`, `prototype/mobile.css`, `tokens.css`: style nền, bố cục điện thoại tối đa 480 px và design token.
- `prototype/services.js`, `service-ui.js`, `services.check.cjs`: danh mục, tồn mẫu, mượn/giao/trả, bán hàng và kiểm thử biên độc lập.
- `prototype/fonts.css`, `assets/fonts/`: font tự host cùng giấy phép.
- `docs/prototype.md`: cách mở thử, phạm vi mô phỏng và kết quả kiểm tra.
- `docs/react-native-plan.md`, `docs/user-features-brainstorm.md`: kế hoạch app React Native và brainstorm tính năng khách từ các nhánh tài liệu.
- `docs/mvp-features*.md`: các đợt đặc tả tính năng MVP từ nhánh tài liệu.
- `.beads/artifacts/vhk-qwb/prd.md`: PRD cho pilot 1–2 quán, 1 BE + 2 FE, 10–12 tuần.
- `.hallmark/`: bối cảnh và lịch sử lựa chọn thiết kế.
- `design.md`: hệ thiết kế dùng chung, phạm vi hai HTML prototype.
- `app/`, `src/`, `tests/`: ứng dụng Expo và demo core riêng; xem `docs/core.md` trước khi sửa hợp đồng ứng dụng.

Chưa có backend, đăng nhập, WebGL, AI hoặc thanh toán thật. Các vị trí 3D hiện được biểu diễn bằng SVG 2D và góc nhìn nghiêng 2.5D. Chạy web server tại root repo để CSS dùng chung được tải đúng đường dẫn.
