# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## What this is

Vibing HKT is the shared Expo SDK 58 / React Native foundation for a cafe and coworking platform. One app holds both the merchant and the customer experience, backed by a local demo core. There is no backend, auth, or payment yet: every transaction is simulated on one device. A three.js 3D venue viewer and an OpenAI-backed merchant onboarding flow do exist, but both are client-only demos (see Architecture) — not production AI/3D infrastructure.

The repo holds two independent things:

- **The Expo app** (`app/`, `src/`, `tests/`, `e2e/`): the real codebase. English docs.
- **A static HTML prototype** (`prototype/`, `tokens.css`, root `architecture.md`, `.hallmark/`): an earlier design exploration with its own sample data and `localStorage`. It shares no code with the Expo app, and its docs are in Vietnamese. Root `architecture.md` describes only the prototype, not the app.

## Commands

Node 22.13+ (`.nvmrc` pins 22) and npm. No `.env` or credentials are needed.

```sh
npm ci
npm run web            # quickest dev loop; also: npm start, npm run ios, npm run android
npm run check          # typecheck + lint + vitest (the main gate)
npm run format:check   # prettier; `npm run format` to fix
npm run build:web      # expo export to dist/
npm run test:e2e       # Playwright; needs `npx playwright install chromium` once
```

Single tests:

```sh
npx vitest run tests/core.test.ts -t "<test name>"
npx playwright test --project=desktop -g "<test name>"
```

- Vitest only picks up `tests/**/*.test.ts`.
- Playwright starts `npm run web -- --port 8081` itself and runs each spec in a `desktop` and a `mobile` viewport project. Outside CI it reuses a server already on 8081. `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome` uses an installed Chrome instead of the downloaded Chromium.
- CI (`.github/workflows/ci.yml`) runs, in order: `format:check`, `check`, `build:web`, `test:e2e`. Run all four before opening a PR.
- Add Expo/native dependencies with `npx expo install <package>` so versions match the SDK, and commit `package-lock.json`.
- ESLint is pinned to 9 for `eslint-config-expo`'s peer range. Don't bump it on its own.
- Don't run `npm audit fix --force`: the fix it proposes downgrades Expo (see `docs/core.md`, "Dependency maintenance").

The prototype needs no build. Serve the repo root (not `prototype/`, because it loads `../tokens.css`) and open `/prototype/`:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

## Architecture

Read `docs/core.md` before changing anything in `src/core`. It is the contract for actions, billing, and storage.

**Layers.** Routes in `app/` are one-line re-exports of screens in `src/features/{merchant,customer}`. Screens read state and call actions from `src/core`, and render through shared primitives in `src/components`. Business logic belongs in `src/core`, never in routes, screens, or components. In particular, pricing lives only in `src/core/billing.ts`.

**The core is split in two on purpose.**

- `@/core` (`src/core/index.ts`) exports the pure, framework-independent part: `domain.ts` (types), `fixtures.ts` (three seeded venues), `billing.ts`, and `store.ts`, whose `createAppStore()` returns a fresh vanilla Zustand store.
- `@/core/useAppStore` is the only module that touches React and AsyncStorage. It owns the singleton `appStore`, the `useAppStore(selector)` hook, and `initializeStore()`.

Keep that boundary. Importing `useAppStore` from pure code makes the core tests load native storage. `tests/core.test.ts` builds its own store with `createAppStore()`, and `tests/storage.test.ts` mocks AsyncStorage and re-imports the binding per test.

**Startup and persistence.** `app/_layout.tsx` awaits `initializeStore()` and renders nothing interactive until it resolves. Restore validates the snapshot with `isDemoState` and falls back to fresh fixtures (with a warning banner) if it is malformed or incompatible. After that, every store change is written to the key `vibing-hkt:demo:v1` through a serialized write queue. If you change the shape of `DemoState`, change the key or add a migration.

**Roles are presentation, not permissions.** `app/index.tsx` redirects by `role`, and the `merchant/` and `customer/` layouts set the role on mount. Both roles see the same sessions. `SimulatorBar` (in the root layout) switches role and venue, applies the morning/afternoon scenarios, resets, and advances time.

**Time only moves through the simulator.** `advanceTime` adds 30 minutes to every session. There is no clock, and a reload adds no elapsed time.

**Venue scoping.** Sessions for all venues live in one array. Every lookup and action filters by the active `venueId`, so keep new lookups venue-scoped.

**Action results.** User-facing session actions (`startSession`, `addItem`, `endSession`) return `ActionResult` (`{ ok: true } | { ok: false; message }`) for the screen to display. An invalid venue ID is a programmer error and throws.

**`SeatMapProps`** (`src/components/SeatMap.tsx`) is the renderer contract. The accessible seat list is the baseline. `src/components/canvas3d/CafeScene3D.tsx` + `sceneBuilder.ts` is a three.js viewer (orbit camera, raycast seat picking) reading the same venue/session/selection shape; it feature-detects WebGL and falls back to a 2D blueprint view when it's unavailable. Any seat-picking UI must work with both.

**The merchant POS module is an intentionally isolated mock.** `src/features/merchant/pos/` and `src/features/merchant/tickets/` have their own zustand store (`posStore.ts`, not persisted), shaped like the eventual PRD/API fields, but never import `src/core`'s domain/billing — only read-only venue/seat lookups. This lets FE build real UI now and swap the mock for a real API client later without BE coordination (see `docs/fe1-pos-plan.md`, "Approach B"). Don't wire POS state into `src/core`.

**Merchant AI onboarding is a client-side demo, not a backend integration.** `src/features/merchant/onboarding/openaiOnboarding.ts` calls the OpenAI API directly from the browser using a key the owner types into a form field at runtime — held only in component state, never persisted or read from `EXPO_PUBLIC_*`/env. With no key, the same file deterministically synthesizes a venue from the owner's notes/uploads, so the flow always works without a key; keep that path working for any change here.

## Conventions

- Money is integer VND. Sessions snapshot the hourly rate and menu prices when created, so later fixture changes don't alter open tabs.
- Never mutate fixtures or store arrays in place.
- New domain behavior needs boundary tests in `tests/`.
- Availability must be understandable without color or 3D: use text labels and the shared buttons in `src/components/ui.tsx`.
- No secrets in the client or in `EXPO_PUBLIC_*` variables.
- TypeScript runs with `strict` and `noUncheckedIndexedAccess`, so indexed access yields `T | undefined`. `@/*` maps to `src/*`.

## Ownership

`CONTRIBUTING.md` splits the work among three contributors. Changes to shared paths (`src/core`, root layout, package files, `src/components`) need coordination, so flag them in the PR's "Integration notes".

- BE: `src/core/domain.ts`, `src/core/billing.ts`, and the future API.
- FE1: `src/features/merchant` and shared `src/components`.
- FE2: `src/features/customer`.

`CONTRIBUTING.md` also has a manual smoke check with expected numbers (for example, 65,000 VND after +30m on Seat 8 with one drink). Use it to verify a flow end to end.

## Other folders

- `docs/react-native-plan.md`, `docs/mvp-features*.md`, `.beads/artifacts/vhk-qwb/prd.md`: plans and pilot acceptance criteria. The app does not meet them yet, and the plan's multi-app folder layout was superseded by the current single-app layout.
- `docs/fe1-pos-plan.md`: design doc for the isolated POS module above — read before changing it.
- `.beads/`: Beads issue tracker data (prefix `vhk`).
- `graft/`: a local, gitignored code index. Don't commit or lint it.
