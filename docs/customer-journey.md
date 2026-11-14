# Hành trình khách trên HTML prototype

Tài liệu này mô tả luồng khách đang được cập nhật theo phản hồi: **xác định bàn → chọn dịch vụ → đối chiếu gói trả trước → sử dụng → checkout**. Gói mẫu bao gồm **giờ ngồi và đồ uống/dịch vụ đi kèm**. Đây là prototype HTML độc lập với ứng dụng Expo; các quy tắc dưới đây không thay đổi `src/core`.

Mở [hai màn điện thoại cạnh nhau](http://localhost:4173/prototype/preview.html) để thử khách và nhân viên trên cùng dữ liệu. Mở [màn khách](http://localhost:4173/prototype/customer.html) nếu chỉ cần giao diện FE2. Hai màn phải dùng cùng hostname và port để đồng bộ localStorage.

## Năm bước của một lượt sử dụng

| Bước             | Khách thực hiện                                                                                              | Kết quả                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 1. Xác định bàn  | Quét QR tại bàn, nhập số/mã bàn hoặc chọn trên sơ đồ; xác nhận bàn                                           | Có bàn cho lượt dùng, chưa giữ chỗ hoặc thu tiền                       |
| 2. Chọn dịch vụ  | Chọn thời lượng dự kiến, đồ uống, sách/đồ chung cần mượn và sản phẩm muốn mua                                | Có lựa chọn để kiểm tra quyền lợi; chưa trừ tồn                        |
| 3. Đối chiếu gói | Kiểm tra gói trong tài khoản mẫu hoặc nhập mã; xem phần bao gồm và trả thêm, hoặc chọn tiếp tục không có gói | Khách xác nhận cách tính trước khi bắt đầu                             |
| 4. Sử dụng       | Bắt đầu phiên, nhận dịch vụ; xem thời gian, đơn và đồ mượn; gọi thêm khi cần                                 | Bàn chuyển sang đang dùng, đơn ghi vào phiên, phiếu mượn gửi nhân viên |
| 5. Checkout      | Kiểm tra thời gian thực dùng, gói, khoản phát sinh và điểm muốn đổi; trả đồ rồi xác nhận                     | Tạo biên nhận mẫu, cập nhật điểm và giải phóng bàn                     |

Không chọn sẵn bàn khi mở trang. Chọn món không đồng nghĩa đã mua; đối chiếu gói không đồng nghĩa đã thanh toán. Thay đổi bàn, thời lượng hoặc món sau đối chiếu phải kiểm tra lại trước khi bắt đầu.

## Nhận diện đúng bàn

QR tại bàn chứa đường dẫn của đúng quán và mã bàn, ví dụ:

```text
http://localhost:4173/prototype/customer.html?venue=nep-q3&table=W03
```

Khách dùng camera điện thoại để mở liên kết; prototype không cung cấp máy quét camera nhúng. Khi dùng trên điện thoại khác, thay `localhost` bằng địa chỉ máy phục vụ truy cập được trong mạng. Liên kết thử QR trên giao diện là ví dụ để xem luồng mở bàn, không phải kết quả quét thật.

Nhập số/mã bàn và chọn trên sơ đồ đều đi đến cùng bước xác nhận. Bàn đang dùng, đã đặt hoặc tạm khóa không thể bị nhận làm phiên mới của khách khác. QR hoặc mã không hợp lệ cần được sửa; không tự chuyển sang bàn trống khác.

## Gói trả trước và phần phát sinh

Gói mẫu **2 giờ & cà phê** có mã `NEP2H`, gồm tối đa 120 phút tại hạng chỗ được hỗ trợ và một cà phê sữa. Khách có thể dùng tài khoản thành viên mẫu để thử việc tìm quyền lợi theo tài khoản, hoặc nhập mã mẫu ở bước đối chiếu.

- Trước sử dụng, tổng tiền là **ước tính theo thời lượng dự kiến**. Khi checkout, tiền giờ tính theo **thời gian thực dùng**, làm tròn lên phút.
- Gói chỉ bù các quyền lợi phù hợp; quá giờ, thêm đồ uống hoặc mua sản phẩm ngoài gói tạo phần trả thêm.
- Quyền lợi của gói dùng cho một lượt; phần không dùng không đổi thành tiền hoàn. Gói đã nhận cho một phiên không được dùng lại cho phiên khác.
- Gọi thêm dịch vụ trong phiên vẫn quay qua đối chiếu quyền lợi còn lại. Không tạo phiên giờ thứ hai hoặc cấp lại một đồ uống đã dùng hết quyền lợi.
- Gói cần được chọn trước khi bắt đầu; phiên ban đầu không dùng gói không thể gắn gói hồi tố ở lần gọi thêm. Quyền lợi đã chốt cho phiên được giữ khi sử dụng tiếp, kể cả gói hết hạn sau lúc bắt đầu.
- Giá giờ và giá món được lưu tại lúc xác nhận sử dụng để thay đổi danh mục sau đó không sửa giá đã chốt.

Ví dụ theo dữ liệu mẫu: bàn cửa sổ 40.000 ₫/giờ, dùng 150 phút, một cà phê sữa 45.000 ₫ và một trà 45.000 ₫. Tổng trước gói là 190.000 ₫. Gói bù 80.000 ₫ tiền giờ và 45.000 ₫ cà phê; phần phát sinh là **65.000 ₫**, trước đổi điểm.

Mã gói và tài khoản đều là dữ liệu demo trong trình duyệt. Chưa có xác minh mã, OTP, đồng bộ ví hoặc quyền lợi trên server.

## Dịch vụ, tồn và đồ cần trả

| Nhóm           | Cách nhận diện                       | Trong phiên                               |
| -------------- | ------------------------------------ | ----------------------------------------- |
| Đồ uống        | Hình món, tên, giá                   | Đơn gửi nhân viên và ghi vào phiên        |
| Sách           | Bìa, vị trí kệ, nhãn cần trả         | Mượn miễn phí, đọc tại quán               |
| Đồ dùng chung  | Ổ cắm nối dài, rổ, cáp; số lượng còn | Mượn miễn phí, nhân viên giao và nhận trả |
| Đồ giải trí    | Bài/xếp hình, giá, tồn               | Mua mang về, ghi khoản phải trả           |
| Văn phòng phẩm | Bút/sổ, quy cách, giá, tồn           | Mua mang về, ghi khoản phải trả           |

Ở bước chọn dịch vụ chưa giữ tồn. Khi xác nhận bắt đầu hoặc gọi thêm, kiểm tra lại tồn, ghi nhận sản phẩm bán và tạo phiếu mượn cùng lượt xác nhận. Sản phẩm đã đưa vào sử dụng được ghi nợ vào phiên; **trừ tồn không có nghĩa đã thanh toán**. Checkout mới quyết toán phần cần trả. Đây là thay đổi so với luồng giỏ hàng trả trước của prototype cũ.

Phiếu mượn đi theo `chờ giao → đang mượn → đã trả`. Yêu cầu chờ giao giữ số lượng và có thể hủy. Khách có thể yêu cầu trả đồ; nhân viên xác nhận đã nhận trả mới hoàn tồn. Khách không tự xác nhận trả một món đang giữ. Checkout bị chặn khi còn phiếu chờ giao/đang mượn chưa xử lý.

FE1 nhìn thấy bàn đang dùng, đơn chưa checkout và hàng chờ giao. Đánh dấu đơn đã phục vụ không đổi trạng thái thanh toán. Nhân viên không được giải phóng phiên khách đang còn chờ quyết toán bằng nút kết thúc phiên cũ.

## Loyalty và hồ sơ

Khách có thể xem hành trình mà không đăng nhập. Tài khoản thành viên mẫu mở phần điểm và quyền lợi demo; không phải tài khoản đã xác thực.

- Điểm chỉ được cộng khi checkout thành công, theo phần thực trả: mỗi 10.000 ₫ được 1 điểm, làm tròn xuống.
- Quy tắc đổi mẫu: 1 điểm = 100 ₫; đổi theo bội số 10 điểm, không vượt số điểm hoặc khoản phải trả.
- Phần được gói bù và phần giảm bằng điểm không sinh điểm mới. Thanh toán lỗi không trừ hoặc cộng điểm; xác nhận lặp không ghi thêm lần nữa.
- Ví dụ phần phát sinh 65.000 ₫, đổi 10 điểm giảm 1.000 ₫: thực trả 64.000 ₫ và nhận 6 điểm.
- Hồ sơ cho sửa tên, số điện thoại, email và lựa chọn nhận thông tin; dữ liệu chỉ lưu cục bộ. Không chuyển danh tính giữa một phiên đang mở.

Lịch sử điểm và biên nhận giúp đối chiếu lần sử dụng. Chưa có AI suy luận thói quen, chiến dịch tự động, phân hạng thành viên hoặc thông báo marketing thật.

## Kịch bản thử bằng tay

1. Khôi phục dữ liệu mẫu, mở màn khách và xác nhận chưa chọn sẵn bàn.
2. Thử liên kết QR, nhập mã `W03` và chọn trên sơ đồ; mỗi cách phải xác định đúng bàn. Thử một bàn bận và mã sai.
3. Chọn thời lượng, một cà phê sữa, thêm trà, một cuốn sách và bút. Xem phần bao gồm/phát sinh với `NEP2H`; thử tiếp tục không có gói trên lượt khác.
4. Bắt đầu dùng. Bên nhân viên kiểm tra bàn đang dùng, đơn chưa checkout và phiếu chờ giao; giao sách rồi đánh dấu đơn đã phục vụ.
5. Khách gọi thêm dịch vụ, kiểm tra quyền lợi còn lại và xác nhận. Phiên gốc tiếp tục, không cấp lại quyền lợi đã dùng.
6. Mở checkout khi đang giữ sách: phải yêu cầu trả. Nhân viên nhận trả rồi khách kiểm tra lại tổng và đổi điểm nếu đang dùng tài khoản mẫu.
7. Thử lỗi thanh toán mô phỏng: phiên, quyền lợi và điểm không được quyết toán. Thử lại thành công: chỉ có một biên nhận/đợt điểm, bàn được giải phóng.
8. Tải lại cùng origin để kiểm tra hồ sơ, phiên đang mở hoặc biên nhận còn được lưu.

Đây là kịch bản cần xác minh, không phải báo cáo kết quả. [Báo cáo kiểm tra cũ](prototype-verification.md) lưu kết quả trước lần đổi hành trình này.

## Giới hạn

Mọi dữ liệu, mã gói, thanh toán, điểm và danh tính đều là mô phỏng localStorage. Đồng bộ chỉ xảy ra giữa trang cùng origin trên cùng trình duyệt; không có giao dịch nhiều thiết bị, phân quyền thật, backend hoặc bảo đảm tài chính. Sơ đồ là SVG 2D/2.5D; AI và WebGL chưa được triển khai. Không dùng thông tin cá nhân hoặc phương tiện thanh toán thật để thử.
