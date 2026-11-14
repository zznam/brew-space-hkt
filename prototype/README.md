# Nếp — hai màn HTML trên điện thoại

Prototype thiết kế độc lập với ứng dụng Expo trong `app/` và `src/`. Dữ liệu mẫu chia sẻ qua localStorage giữa hai màn cùng origin.

Chạy tại **root repository** để tải được `../tokens.css`:

```sh
rtk proxy python3 -m http.server 4173 --bind 127.0.0.1
```

- [Xem hai màn cạnh nhau](http://localhost:4173/prototype/preview.html)
- [FE1 — Nhân viên](http://localhost:4173/prototype/operations.html)
- [FE2 — Khách](http://localhost:4173/prototype/customer.html)
- [Thử đường dẫn QR bàn W03](http://localhost:4173/prototype/customer.html?venue=nep-q3&table=W03)

Luồng khách: **QR / số bàn / sơ đồ → chọn dịch vụ → đối chiếu gói trả trước → sử dụng → checkout**. Có điểm loyalty và hồ sơ mẫu. Gói minh họa `NEP2H` gồm 120 phút và một cà phê sữa; sách và đồ chung cần nhân viên xác nhận nhận trả. Đơn ghi vào phiên lúc bắt đầu sử dụng, quyết toán ở checkout.

Xem [hướng dẫn tổng quan](../docs/prototype.md), [quy tắc hành trình khách](../docs/customer-journey.md) và [hệ thiết kế](../design.md). [Báo cáo kiểm tra trước đây](../docs/prototype-verification.md) thuộc luồng cũ; không dùng làm bằng chứng cho luồng mới.

Kiểm tra các quy tắc thuần bằng Node, không cần build Expo:

```sh
rtk proxy node --test prototype/services.check.cjs prototype/journey.check.cjs
```

Lệnh trên chạy từ root repository. Không có đăng nhập, quét camera, AI hoặc thanh toán thật.

Sau khi cài các dev dependency và Chromium cho Playwright, có thể chạy xuyên hai màn bằng `rtk proxy node prototype/journey.browser.cjs` khi HTTP server đang bật. Xem [báo cáo kiểm tra hành trình hiện tại](../docs/customer-journey-verification.md).
