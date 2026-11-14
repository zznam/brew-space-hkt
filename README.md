# Vibing HKT

Shared Expo / React Native foundation for the 3D cafe and coworking platform. One application contains merchant and customer experiences, backed by a local demo core.

- [Tổng quan tính năng và kiến trúc / Features and architecture overview (HTML, VI + EN)](docs/app-overview.html)
- [Tài liệu MVP và phân công 1 BE + 2 FE](.beads/artifacts/vhk-qwb/prd.md)
- [React Native 3D Architecture & Implementation Plan (English)](docs/react-native-plan.md)
- [Brainstorm tính năng cho khách hàng](docs/user-features-brainstorm.md)
- [100-feature MVP spec (English)](docs/mvp-features.md)
- [MVP spec batch 2: F101–F200, PRD gaps and post-core additions](docs/mvp-features-batch-2.md)

## Start here

Use Node 22.13+ (Node 22 is pinned in `.nvmrc`) and npm. No credentials, database, or `.env` file are needed.

```sh
npm ci
npm run web
# or: npm start, npm run ios, npm run android
```

The native commands require an emulator/simulator or a compatible Expo Go installation. This foundation uses Expo SDK 58; check the SDK supported by your Expo Go version or use a development build. Web is the quickest onboarding path.

```sh
npm run check       # TypeScript, ESLint, domain/state tests
npm run build:web   # production bundle in dist/
npm run format:check
# Optional browser smoke test:
npx playwright install chromium
npm run test:e2e
```

Commit `package-lock.json` when changing dependencies. Use `npx expo install <package>` for Expo/native dependencies so versions match the SDK.

## What works

- Merchant live floor, customer seat selection and active session routes.
- Three themed venues, menus, eight seats per venue, local demo sessions.
- Shared Zustand state, validated AsyncStorage restore, role/venue controls, scenario resets, and simulated +30 minute time advances.
- Metered/bundle seat-time estimates, menu additions, and releasing a demo seat.
- An accessible shared seat list as the baseline for a future 3D viewer.

All transactions are simulated on one device. Role switching is a demo tool, not authentication. Time advances only through the simulator. Ending a session clears its tab without taking payment. Data is scoped by venue in local actions; production tenant security must be enforced by the backend.

## Project map

```text
app/                   Thin Expo Router routes and root layout
src/core/              Shared domain, fixtures, billing, state and storage binding
src/components/        Shared UI, simulator and SeatMap renderer contract
src/features/merchant/ Merchant-owned screens
src/features/customer/ Customer-owned screens
tests/                 Framework-independent core regression tests
docs/                  Architecture and contributor handoff
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) for team ownership, first tasks, and PR checks, and [the core contract](docs/core.md) before changing shared behavior.

## Scope and plans

This implements the foundation phase of the [React Native architecture plan](docs/react-native-plan.md), using the current [Expo template conventions](https://docs.expo.dev/more/create-expo/). It supersedes the earlier proposed multi-app folder layout for this starter. Native StyleSheet primitives provide shared styling today; NativeWind can be introduced as a coordinated UI change.

Still to build: interactive 3D/editor, real API/auth, transactional booking and pricing, payment/ledger, AI adapters, loyalty, and production persistence. No OpenAI or payment keys belong in the client or in `EXPO_PUBLIC_*` variables. The [MVP requirements and team responsibilities](.beads/artifacts/vhk-qwb/prd.md) remain the pilot acceptance criteria; this demo does not meet those gates yet.

## HTML prototype

Hai màn dùng Hallmark và ảnh tham chiếu sơ đồ bàn; tông tối, nhấn mint, font tiếng Việt tự host. Bố cục điện thoại tối đa 480 px, tab điều hướng dưới và bottom sheet. Luồng khách: **QR / số bàn / sơ đồ → chọn dịch vụ → đối chiếu gói trả trước → sử dụng → checkout**. Có mượn sách, đồ dùng chung cần trả lại, mua đồ giải trí/văn phòng phẩm, điểm loyalty và hồ sơ mẫu.

```bash
rtk proxy python3 -m http.server 4173 --bind 127.0.0.1
```

- [Chọn giao diện](http://localhost:4173/prototype/)
- [Xem hai màn điện thoại cạnh nhau](http://localhost:4173/prototype/preview.html)
- [FE1 — Vận hành, sơ đồ bàn và POS](http://localhost:4173/prototype/operations.html)
- [FE2 — Hành trình khách và self checkout](http://localhost:4173/prototype/customer.html)

Các màn chia sẻ dữ liệu mẫu qua localStorage khi mở cùng origin (giữ cùng hostname và port). Bắt đầu sử dụng tạo đơn ghi vào phiên và phiếu mượn bên nhân viên; checkout quyết toán phần còn thiếu sau gói và điểm. Gói mẫu `NEP2H` gồm 120 phút và một cà phê sữa. Không thu tiền thật; chưa có backend, xác thực, AI thật hoặc WebGL. Xem [hướng dẫn prototype](docs/prototype.md) và [quy tắc hành trình khách](docs/customer-journey.md).

Kiểm tra quy tắc dịch vụ và hành trình: `rtk proxy node --test prototype/services.check.cjs prototype/journey.check.cjs`. Hai HTML vẫn chạy độc lập với ứng dụng Expo; các quyền lợi và điểm mô phỏng ở HTML không thay đổi demo core trong `src/`.

[Ảnh hai màn và kết quả kiểm tra hành trình hiện tại](docs/customer-journey-verification.md). [Báo cáo lịch sử luồng cũ](docs/prototype-verification.md).
