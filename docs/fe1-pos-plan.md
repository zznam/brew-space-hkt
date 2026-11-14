# FE1 — Merchant POS (selling side) plan

Status: proposed plan, not yet built. Written against the code merged in [PR #4](https://github.com/zznam/vibing-hkt/pull/4) (`src/core`, `src/features/merchant`, `src/components/SeatMap.tsx`) plus the [PRD](../.beads/artifacts/vhk-qwb/prd.md) and the [100-feature spec](mvp-features.md). Where this disagrees with either, the PRD wins (per `mvp-features.md`).

## 1. Scope

"Bán hàng" / POS here means the **cashier-facing selling flow**: walk-in order entry, cart/quote, cash or online payment, kitchen/service ticket board, shift open/close, and refunds. It maps to spec sections **C (Cart and orders), D (Payments), E (Fulfilment), K (Shifts, refunds and reports)**, plus the merchant live-floor screen (F066, already stubbed) as the entry point.

**Explicitly out of this plan** (separate FE1 workstreams, to plan later): the 3D/editor work (section F, F040–F050), pricing-rule and flash-sale admin (section I), and loyalty admin (section J). Those reuse the same `SeatMapProps` contract and merchant shell but are a different set of screens.

## 2. Current state (read from the merged code, not assumed)

- `app/merchant/live-floor.tsx` → `LiveFloorScreen` shows seat occupancy and a flat list of live tabs (`F066`, demo: Part). No cart, no order object, no payment, no shift.
- `src/core/domain.ts` has `Session` with an inline `orders[]` array and `BillingMode`. There is **no `Order`, `Payment`, `Shift`, or `Refund` type**, no state machine (`draft → awaiting_payment → paid → completed`), no idempotency key, no quote/expiry. This is intentional — `docs/core.md` calls it a pure local demo, and the PRD's state machine (§4) and quote/idempotency rules (FR02, F018, F024) are explicitly BE-owned.
- `SeatMap` / `SeatMapProps` (F042/F043, demo: Part) is the stable contract FE1 must keep reusing — do not fork it for POS.
- No shift, no cash drawer, no refund screen, no ticket board (F035) exist yet.
- `CONTRIBUTING.md` already names FE1's first task as "Build merchant POS details ... using `SeatMapProps`" — this plan is that task broken down.

## 3. The decision this plan has to make: what to build against before BE ships the real API

BE owns `src/core/domain.ts` / `billing.ts` and the future API (per `CONTRIBUTING.md`); the PRD requires every money-moving state (order, payment, shift) to be server-authoritative. FE1 cannot invent that contract unilaterally. Three ways to proceed:

| Approach | What it means | Trade-off |
| --- | --- | --- |
| A. Wait for BE | Don't build POS UI logic until `src/core` has real `Order`/`Payment`/`Shift` types or an API contract exists | Correct, but blocks FE1 for weeks — contradicts the PRD's own plan of FE building against mocks first (§6.2, §7: "Hai FE bắt đầu bằng mock theo hợp đồng") |
| B. Fork a throwaway mock inside `src/features/merchant/pos` | FE1 defines its own local `Order`/`Shift`/`Payment` shapes **inside the merchant feature folder**, not in `src/core`, matching the PRD's field names/states exactly, clearly labeled temporary, swapped for the real contract later | Some rework when BE's contract lands, but it's isolated — doesn't touch BE-owned files, doesn't block UI progress, and the swap point is one import |
| C. No state machine yet, just "add item → pay button" | Fastest, but produces a UI that can't demo the states the PRD actually gates pilot on (idempotency, shift-gated cash, awaiting-payment) | Would need a rewrite before week 6–7 (shift/refund milestone); not worth the throwaway savings |

**Recommendation: B.** It matches how the PRD already expects the two FE tracks to work (mock-first, same schema later), keeps BE's files untouched so there's nothing to coordinate before starting, and the mock's shape is dictated by the PRD section FR02/§4 fields, not invented — so swapping it for a real API client is a types-and-import change, not a rewrite.

If you'd rather go with A or C, say so before implementation starts — this is the one call in this plan that changes how much gets rebuilt later.

## 4. Screens and files to build (Approach B)

```text
app/merchant/
  live-floor.tsx        existing — add a "Sell" action per seat/walk-in
  pos.tsx               new route → PosScreen
  shift.tsx             new route → ShiftScreen
  tickets.tsx           new route → TicketBoardScreen
  refunds.tsx           new route → RefundScreen

src/features/merchant/
  LiveFloorScreen.tsx    existing — add navigation to pos.tsx with seat context
  pos/
    PosScreen.tsx        menu grid, cart, quote, pay (cash/online), per F022
    MenuGrid.tsx          categories + items + sold-out state (F010, F012)
    CartPanel.tsx         lines, quantity, note, discount display (F017, F020)
    useDemoOrder.ts       local order/quote state machine (THE temporary mock from §3)
  shift/
    ShiftScreen.tsx       open float, running cash total, close + variance (F092, F093, F094)
  tickets/
    TicketBoardScreen.tsx queued → preparing → ready → served board (F035)
  refunds/
    RefundScreen.tsx      line-level refund request + manager approval (F095, F096)

src/components/
  (reuse Card, Heading, Button, styles from ui.tsx — no new design system)
```

## 5. Phasing (matches the PRD's week numbering, §7.1)

| Weeks | Build | Acceptance (from `mvp-features.md`) |
| --- | --- | --- |
| 2–3 | `PosScreen` + `MenuGrid` + `CartPanel` + `useDemoOrder` against the mock order state machine; cashier can build a walk-in order end to end on-device | F022: cashier can build and take payment for an order on behalf of a walk-in; F010/F012: items + sold-out toggle |
| 2–3 | `TicketBoardScreen` reading paid demo orders | F035: staff see open tickets and can advance status |
| 6–7 | `ShiftScreen`: open float, cash confirm gated by "shift open", close + variance | F031, F092–F094 |
| 6–7 | `RefundScreen`: manager approves full/partial refund by line, capped at amount collected | F095, F096 |
| 8 | Swap `useDemoOrder`'s mock for the real API client once BE's contract lands; delete the mock | — |

This nests inside the existing CI gates (`npm run check`, `npm run build:web`, Playwright smoke) — every new screen needs loading/error/empty states per `CONTRIBUTING.md`, not just the happy path.

## 6. Non-goals / anti-goals

- Not building the 3D editor, pricing admin, or loyalty admin screens (separate plans).
- Not implementing real payment gateway or webhook handling — FE1 calls a mock `pay()` that resolves to `succeeded`/`failed` like the real API will, nothing more.
- Not inventing new money-math — reuse `calculateBill`/`formatMoney` from `src/core`; the mock order wraps them, it doesn't replace them.
- Not touching `src/core/domain.ts` or `billing.ts` — if those need new fields, that's a BE-coordinated change per `CONTRIBUTING.md`, filed as a separate request.

## 7. Open items for the product owner / BE

- Confirm Approach B above (or override with A/C).
- Shift cash float input and variance tolerance — not specified yet, needed for `ShiftScreen` (PRD leaves this to pilot config, §1.2).
- Refund evidence capture for manual (non-gateway) refunds — PRD requires it (FR08) but doesn't specify the UI fields.
