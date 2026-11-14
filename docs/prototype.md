# Hai màn HTML cho cafe và coworking

Prototype dùng thương hiệu mẫu **Nếp**, tông tối và xanh mint theo ảnh sơ đồ bàn người dùng cung cấp. Hai màn dùng nội dung dọc tối đa 480 px, tab điều hướng dưới và bottom sheet. Có nhận diện riêng cho đồ uống, sách, đồ dùng chung, đồ giải trí và văn phòng phẩm. Hệ thiết kế được chốt theo Hallmark tại [design.md](../design.md).

Luồng khách hiện tại là **xác định bàn → chọn dịch vụ → đối chiếu gói trả trước → sử dụng → checkout**, kèm điểm loyalty và hồ sơ. [Tài liệu hành trình khách](customer-journey.md) ghi chi tiết quyền lợi, khoản phát sinh, thời điểm trừ tồn và kịch bản thử. Luồng này thay thế cách đặt gói giờ vào giỏ rồi thanh toán trước của prototype cũ.

## Mở thử

Tại root repository:

```bash
rtk proxy python3 -m http.server 4173 --bind 127.0.0.1
```

| Giao diện      | Đường dẫn                    | Tệp chính                                        |
| -------------- | ---------------------------- | ------------------------------------------------ |
| Chọn giao diện | `/prototype/`                | `index.html`                                     |
| FE1 vận hành   | `/prototype/operations.html` | `operations.html`, `operations.js`               |
| FE2 khách      | `/prototype/customer.html`   | `customer.html`, `customer.js`, `journey.js`     |
| Xem song song  | `/prototype/preview.html`    | Hai iframe chạy màn thật ở kích thước điện thoại |

Mở [preview](http://localhost:4173/prototype/preview.html) để thử liên màn. Không cần cài npm hoặc build. Font và hình SVG nằm trong repository. Chạy HTTP server từ root để tải được `tokens.css`; dùng cùng hostname và port cho cả hai màn. `localhost` và `127.0.0.1` là hai origin khác nhau và không chia sẻ trạng thái.

## FE1 vận hành

- Chọn chỗ trên sơ đồ hoặc danh sách để xem hạng chỗ, giá và trạng thái; lọc khu vực, ngày và tên/mã chỗ.
- Tạo đặt chỗ mẫu, check-in hoặc hủy đặt chỗ. Phiên khách cần hoàn tất checkout trước khi giải phóng bàn; còn phiếu mượn chưa xử lý cũng chặn kết thúc.
- Xem đơn ghi vào phiên từ phía khách; trạng thái phục vụ và thanh toán là hai việc riêng. Đánh dấu đã phục vụ không thu tiền.
- Tạo đơn đồ uống mẫu ở POS theo kịch bản riêng của nhân viên.
- Tab **Dịch vụ** có chờ giao, đang mượn và danh mục. Nhân viên giao sách/đồ chung, nhận trả hoặc hủy yêu cầu chưa giao.
- Nhận/hoàn tất yêu cầu hỗ trợ; phân loại bằng từ khóa chỉ là minh họa.
- Duyệt/dừng đề xuất giảm giá mẫu, chỉnh bố trí bằng nút/phím mũi tên, lưu/hủy thay đổi và đổi góc nhìn nghiêng.
- Mở cài đặt để xem giới hạn hoặc khôi phục dữ liệu mẫu.

## FE2 khách

1. **Xác định bàn:** mở liên kết QR tại bàn, nhập số/mã hoặc chọn trên sơ đồ, rồi xác nhận. Trang không chọn sẵn bàn. Bàn bận/đã đặt/tạm khóa không thể bị chiếm bằng phiên mới.
2. **Chọn dịch vụ:** thời lượng dự kiến, đồ uống, sách/đồ chung muốn mượn và sản phẩm muốn mua. Chưa giữ tồn ở bước chọn.
3. **Đối chiếu gói:** dùng tài khoản thành viên mẫu hoặc mã `NEP2H`; xem phần bao gồm và trả thêm. Có thể chọn tiếp tục không có gói. Gói mẫu gồm 120 phút và một cà phê sữa cho hạng chỗ phù hợp.
4. **Sử dụng:** bàn chuyển sang đang dùng; đơn và phiếu mượn sang FE1. Khách theo dõi thời gian, món/đồ mượn và gọi thêm trong cùng phiên.
5. **Checkout:** kiểm tra tiền theo thời gian thực dùng, phần gói bù, điểm muốn đổi và tiền còn lại. Đồ mượn cần được nhân viên nhận trả trước khi hoàn tất. Có tình huống thanh toán lỗi và thử lại mô phỏng.

Khách có mục hồ sơ và loyalty riêng. Tên, điện thoại, email và lựa chọn nhận thông tin lưu cục bộ; tài khoản mẫu không có OTP/xác thực. Điểm chỉ đổi/cộng khi checkout thành công theo quy tắc demo được hiển thị.

QR được quét bằng camera điện thoại để mở một URL như `/prototype/customer.html?venue=nep-q3&table=W03`; chưa có trình quét camera bên trong trang. Khi thử bằng thiết bị khác, địa chỉ server phải truy cập được từ thiết bị đó.

## Chính sách mẫu cho dịch vụ

| Nhóm           | Nhận diện                               | Xử lý                                         |
| -------------- | --------------------------------------- | --------------------------------------------- |
| Sách           | Icon sách, bìa, vị trí kệ, nhãn cần trả | Miễn phí, đọc tại quán, trả trước khi rời     |
| Đồ dùng chung  | Ổ cắm nối dài/rổ/cáp, tồn khả dụng      | Miễn phí, nhân viên giao và xác nhận nhận trả |
| Đồ giải trí    | Bài/xếp hình, giá và tồn                | Mua mang về, ghi vào phiên                    |
| Văn phòng phẩm | Bút/sổ, quy cách, giá và tồn            | Mua mang về, ghi vào phiên                    |

Khi bắt đầu dùng hoặc xác nhận gọi thêm, hệ thống kiểm tra lại và ghi nhận tồn sản phẩm/phiếu mượn. Đơn lúc này **chưa được thanh toán**; khách quyết toán ở checkout. Phiếu mượn đi theo `chờ giao → đang mượn → đã trả`; có thể hủy khi chờ giao. Khách yêu cầu trả, nhân viên xác nhận nhận trả mới hoàn số lượng. Xử lý lặp cùng mã không trừ tồn hoặc cộng điểm thêm lần nữa.

Các quy tắc là mô phỏng cục bộ, chưa thay thế transaction trên server. Chi tiết và ví dụ số tiền có tại [hành trình khách](customer-journey.md).

## Giới hạn của prototype

- Dữ liệu mẫu lưu localStorage, đồng bộ giữa các trang cùng origin trong cùng trình duyệt. Chưa có khóa chỗ đồng thời nhiều thiết bị, cơ sở dữ liệu, API hoặc nhật ký server.
- Không có phân quyền thật, xác minh danh tính, tenant isolation hoặc white-label động. Không dùng dữ liệu khách thật.
- Gói, điểm, biên nhận và thanh toán đều là demo; không kết nối cổng thanh toán và không yêu cầu thông tin thẻ. Chưa có tiền cọc, phạt, hoàn tiền hoặc đổi trả sản phẩm bán.
- Hỗ trợ dùng từ khóa minh họa, pricing dùng kịch bản duyệt mẫu. Chưa có mô hình AI hoặc phân tích loyalty thật.
- Sơ đồ là SVG 2D; chế độ nghiêng dùng CSS cho góc nhìn 2.5D. Chưa có WebGL, asset editor 3D hoàn chỉnh, kiểm tra va chạm hoặc publish layout.
- Font tự host, kèm giấy phép SIL Open Font License trong `prototype/assets/fonts/`.
- HTML prototype độc lập với ứng dụng Expo; thời gian và trạng thái không dùng chung với simulator trong app.

## Kiểm tra

```bash
rtk proxy node --test prototype/services.check.cjs prototype/journey.check.cjs
```

Kiểm thử Node kiểm tra các quy tắc thuần. [Kịch bản thử bằng tay](customer-journey.md#kịch-bản-thử-bằng-tay) bao phủ hành trình mới; [báo cáo trước đây](prototype-verification.md) giữ kết quả của luồng cũ. Tiêu chí pilot vẫn theo [PRD](../.beads/artifacts/vhk-qwb/prd.md); prototype chưa thay thế nghiệm thu backend.
