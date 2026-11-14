# Hai màn HTML cho cafe và coworking

Prototype dùng thương hiệu mẫu **Nếp**, tông tối và xanh mint theo ảnh sơ đồ bàn người dùng cung cấp. Màn nhân viên ưu tiên sơ đồ và hoạt động tại quán; màn khách ưu tiên chọn chỗ, gói giờ, đồ uống và tự đặt mua. Các lựa chọn được phát triển theo skill Hallmark.

## Mở thử

Tại root repository:

```bash
rtk proxy python3 -m http.server 4173 --bind 127.0.0.1
```

Mở `http://localhost:4173/prototype/` và chọn một giao diện:

| Giao diện | Đường dẫn | Tệp chính |
| --- | --- | --- |
| FE1 vận hành | `/prototype/operations.html` | `operations.html`, `operations.js` |
| FE2 khách | `/prototype/customer.html` | `customer.html`, `customer.js` |

Không cần cài npm hoặc build. Font và hình vẽ SVG đều nằm trong repository. Khi mở trực tiếp file HTML, các màn vẫn hiển thị được, nhưng cách chia sẻ localStorage giữa file có thể khác theo trình duyệt; nên chạy HTTP server để thử luồng liên màn. Dùng cùng hostname và port cho cả hai màn; `localhost` và `127.0.0.1` là hai origin khác nhau.

## FE1 vận hành

- Chọn chỗ trên sơ đồ hoặc danh sách để xem hạng chỗ, giá và trạng thái.
- Lọc khu vực, trạng thái, tên khách/mã chỗ và ngày đặt.
- Tạo đặt chỗ mẫu, check-in, kết thúc phiên hoặc hủy đặt chỗ mẫu.
- Tạo đơn đồ uống mẫu, chọn số lượng/phương thức và đánh dấu đã phục vụ.
- Nhận việc/hoàn tất yêu cầu hỗ trợ, xem ghi chú chuyển từ checkout khách.
- Duyệt/dừng ưu đãi minh họa giảm 10% tiền chỗ mới tại khu tập trung.
- Chỉnh bố trí bằng nút hoặc phím mũi tên, lưu/hủy thay đổi vị trí; đổi góc nhìn nghiêng.
- Mở nút cài đặt ở cuối thanh dọc để xem giới hạn và khôi phục dữ liệu mẫu. Trên mobile có thể khôi phục từ trang chọn giao diện.

## FE2 khách

- Chọn chỗ còn trống, lọc khu vực; chỗ đang dùng/đã đặt/tạm khóa không thể mua.
- Chọn gói 1, 2 hoặc 4 giờ, thêm/bớt đồ uống và xem tổng tiền cập nhật.
- Xem giá sau khi nhân viên duyệt ưu đãi mẫu; đơn đã xác nhận giữ số tiền đã chụp.
- Xác nhận thanh toán mô phỏng, thử lỗi thanh toán và thử lại.
- Sau checkout, đơn và reservation xuất hiện ở FE1; nhân viên có thể check-in khách.
- Gửi yêu cầu hỗ trợ bằng nội dung tự do; nguyên văn được escape khi hiển thị lại.
- Trên điện thoại, mặc định chọn từ danh sách và có thanh “Xem giỏ” cố định; vẫn có thể chuyển sang sơ đồ.

## Thử luồng liên màn

1. Từ trang chọn giao diện, bấm **Khôi phục dữ liệu mẫu**.
2. Mở màn khách, chọn khu tập trung F01, gói 4 giờ và hai cà phê sữa. Tổng tiền mẫu là 210.000 ₫ khi chưa có sale.
3. Nhập ghi chú cần kết nối màn hình, bấm đặt chỗ, thử tình huống lỗi rồi bấm mô phỏng thanh toán.
4. Chuyển sang màn vận hành: F01 đã đặt, có đơn mới trong POS và ghi chú trong hỗ trợ.
5. Check-in F01, nhận/hoàn tất yêu cầu và đánh dấu đơn đã phục vụ.
6. Từ màn vận hành, mở đề xuất và duyệt giảm 10%. Màn khách chọn một chỗ tập trung khác trong 2 giờ sẽ thấy tiền chỗ còn 54.000 ₫.

## Giới hạn của prototype

- Dữ liệu mẫu lưu trong localStorage; có đồng bộ thay đổi giữa các tab cùng origin. Chưa có transaction, khóa chỗ đồng thời, nhật ký server hay cơ sở dữ liệu.
- Các trang vận hành và dữ liệu trên máy đều truy cập được. Phân quyền trong PRD chưa được triển khai; không dùng dữ liệu khách thật.
- Ngày trình diễn là 14/11/2026, giờ giả định 14:32. Lịch mẫu chỉ biểu diễn trạng thái đơn giản; chưa kiểm tra mọi khoảng giờ, buffer, quá giờ hoặc thanh toán đến muộn như backend MVP.
- Checkout không kết nối cổng thanh toán và không yêu cầu thông tin thẻ. Các thao tác tiền mặt/online/hoàn tiền trong PRD chưa trở thành nghiệp vụ tài chính thật.
- Tự phân loại hỗ trợ dùng từ khóa minh họa; đề xuất pricing là kịch bản duyệt mẫu. Chưa có gọi mô hình AI, phân tích loyalty, OTP hay sổ điểm.
- Sơ đồ là SVG 2D; chế độ nghiêng dùng CSS tạo góc nhìn 2.5D. Chưa có WebGL hoặc bộ dựng asset 3D hoàn chỉnh. Di chuyển chỗ chưa kiểm tra va chạm hoặc publish layout.
- Cấu hình thương hiệu là ví dụ của một quán; tenant isolation và white-label động thuộc giai đoạn backend tiếp theo.
- Các file font được tự host, kèm giấy phép SIL Open Font License trong `prototype/assets/fonts/`.

## Kiểm tra

Kiểm tra thực tế và các giới hạn được ghi tại [báo cáo kiểm tra prototype](prototype-verification.md). Tiêu chí nghiệm thu sản phẩm pilot vẫn theo [PRD](../.beads/artifacts/vhk-qwb/prd.md); prototype chưa thay thế kết quả nghiệm thu backend.
