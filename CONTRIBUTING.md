# Contributing

1. Install Node 22 and run `npm ci` followed by `npm run web`.
2. Create a feature branch, e.g. `git switch -c feat/customer-cart`.
3. Keep changes focused on your feature folder. Coordinate shared contract changes before coding against them.
4. Run `npm run check`, `npm run format:check`, and `npm run build:web` before opening a PR.
5. Describe behavior, validation, and any missing backend integration in the PR. Changes land through PRs.

## Ownership and ready-to-start tasks

| Contributor | Main paths                                                      | First task                                                                                                       |
| ----------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| BE          | `src/core/domain.ts`, `src/core/billing.ts`, future API service | Define versioned API/quote/session contracts and server auth; replace demo actions with authoritative operations |
| FE1         | `src/features/merchant`, shared `src/components`                | Build merchant POS details and a 3D renderer using `SeatMapProps`, retaining the accessible seat list            |
| FE2         | `src/features/customer`                                         | Build menu/cart and customer session details using existing core actions; cover empty/error/loading states       |

FE1 owns shared presentation and renderer changes; BE owns shared business contracts. FE1 and FE2 review each other's user flows. Coordinate edits to `src/core`, root providers, package files, and shared components. No duplicated pricing logic in screens.

## Conventions

- Routes in `app/` re-export feature screens. Keep business logic out of route files and UI components.
- Import shared contracts from `@/core`; import the React/storage binding from `@/core/useAppStore` separately. Pure tests must not load native storage.
- Use integer VND, stable venue/seat IDs, explicit errors, and venue-scoped lookups.
- Subscribe to small state slices as screens grow. Never mutate fixtures or store arrays directly.
- New domain behavior needs boundary tests. Every network flow needs loading, error, retry, and empty states.
- Use shared buttons and text labels; availability must be understandable without colors or 3D.
- Keep secrets on the server. Never interpret the simulator role as a permission check.
- Install native packages with `npx expo install`. Include the lockfile and verify web plus the affected native platform.

## Manual smoke check

1. Open Merchant; verify two occupied seats at The Grind.
2. Switch to Customer, choose Seat 8, start a metered session and add a drink.
3. Advance +30m; the demo estimate should be 65,000 VND (40,000/h seat plus 45,000 drink).
4. Switch to Merchant; verify Seat 8 and the same total. Reload and verify persistence.
5. Switch venues; the Grind session must not appear there. Switch back to recover it.
6. End the customer demo session; Seat 8 becomes available.
7. Apply Morning then Afternoon; verify 7 then 2 occupied seats in the active venue. Reset all demo data.

CI checks formatting, types, lint, core tests, web export, and browser flows at desktop/mobile viewport sizes. Native rendering and actual 3D/device performance still need device testing.

For the automated browser smoke test, run `npx playwright install chromium` then `npm run test:e2e`. If Chrome is already installed, `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npm run test:e2e` can use it with an isolated test profile. Use `npm run format` before committing.

Tooling note: ESLint 9 is pinned to satisfy Expo’s current React lint plugin peer range. Upgrade it together with `eslint-config-expo` when its plugin supports ESLint 10.
