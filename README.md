# Quản lý quán cafe và coworking bằng không gian 3D

- [Tài liệu MVP và phân công 1 BE + 2 FE](.beads/artifacts/vhk-qwb/prd.md)
- [React Native 3D Architecture & Implementation Plan (English)](docs/react-native-plan.md)
- [Brainstorm tính năng cho khách hàng](docs/user-features-brainstorm.md)
- [100-feature MVP spec (English)](docs/mvp-features.md)

Phạm vi: pilot vận hành 1–2 quán trong 10–12 tuần. Tài liệu gồm nghiệp vụ, tiêu chí nghiệm thu, phân quyền sản phẩm, phân công phát triển và kế hoạch triển khai. Repository hiện có PRD và prototype HTML; chưa có backend sản phẩm.

## HTML prototype

Hai màn dùng Hallmark và ảnh tham chiếu sơ đồ bàn; tông tối, nhấn mint, font tiếng Việt tự host.

```bash
rtk proxy python3 -m http.server 4173 --bind 127.0.0.1
```

- [Chọn giao diện](http://localhost:4173/prototype/)
- [FE1 — Vận hành, sơ đồ bàn và POS](http://localhost:4173/prototype/operations.html)
- [FE2 — Khách đặt chỗ và self checkout](http://localhost:4173/prototype/customer.html)

Các màn chia sẻ dữ liệu mẫu qua localStorage khi mở cùng origin (giữ cùng hostname và port). Đơn từ checkout khách xuất hiện ở màn vận hành. Không thu tiền thật; chưa có backend, AI thật hoặc WebGL. [Hướng dẫn prototype](docs/prototype.md).

[Ảnh hai màn và kết quả kiểm tra](docs/prototype-verification.md).
