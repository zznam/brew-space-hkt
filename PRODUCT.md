# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two roles sharing one device and one session state, at a physical Vietnamese cafe/coworking venue:

- **Merchant staff**: manage seat/table occupancy, run POS (new orders, cart, payment), and work fulfilment tickets (preparing → ready → served).
- **Customers**: pick or confirm a table, start a metered or prepaid-package session, order drinks/borrow shared items, track loyalty, and check out.

The product is at demo/pilot stage: every transaction is simulated on one device, ahead of a real backend, auth, and payment integration.

## Product Purpose

BrewSpace is the shared Expo foundation for a combined cafe + coworking venue platform: one app holds both the merchant operations view and the customer visit/booking view, backed by a local demo core so both flows can be built, demoed, and pilot-tested before any server exists.

## Positioning

A unified seat/time-based billing and ordering system where merchant and customer see the same live session state from one shared core — not two disconnected apps. Seat occupancy, metered/prepaid billing, item ordering, and loyalty all read the same demo store, and a 3D venue viewer (with an accessible list/2D fallback) renders the same selection and session shape either role can act on. A venue-only booking app or a POS-only product could not truthfully claim this single shared-state, dual-role simulation.

## Operating Context

- Merchant: floor/seat board, POS cart and checkout, fulfilment ticket board, AI-assisted (or no-key local-fallback) venue onboarding.
- Customer: table confirmation (QR, manual code, or map), prepaid-package comparison, active session view (elapsed time, service status, remaining estimate), checkout/receipt, loyalty and account views.
- A `SimulatorBar` (not a real auth mechanism) switches role and venue, applies morning/afternoon occupancy scenarios, advances time in 30-minute steps, and resets demo data — used to demo and test both roles without a backend.
- Multiple isolated venues; sessions for all venues share one array, scoped by `venueId` in every lookup.

## Capabilities and Constraints

- No backend, auth, or payment yet. All state lives in one local Zustand store, persisted to AsyncStorage under `vibing-hkt:demo:v1`; nothing syncs across devices or users.
- Money is integer VND; sessions/orders snapshot prices at creation. Pricing/business logic lives only in `src/core/billing.ts`, never duplicated in screens.
- The merchant POS/tickets module (`src/features/merchant/pos`, `tickets`) is a deliberately isolated mock with its own store, shaped like the eventual API, not wired into `src/core` — lets FE build ahead of backend coordination.
- Merchant onboarding can call OpenAI directly from the browser with a user-provided, non-persisted API key, or fall back to a deterministic local parser with no key — the no-key path must always keep working.
- Seat-picking UI must work through two interchangeable renderers: an accessible list/keyboard baseline (`SeatMapProps`) and a three.js 3D viewer that falls back to a 2D blueprint without WebGL.
- Time only advances through the simulator; there is no real clock. Reloads add no elapsed time.
- Undecided: real backend/auth/payment timeline and contract; the pilot acceptance criteria in `.beads/artifacts/vhk-qwb/prd.md` are a target the app does not yet fully meet.

## Brand Commitments

Name: **BrewSpace**. An established visual direction is already documented in `docs/design-system.md` and is binding for refinement work: a calm, modern phone app — warm paper background, white cards, a single forest-green accent, hierarchy from type and spacing rather than borders. The 390pt phone is the product; wider screens add columns without changing the phone layout. (The separate static HTML prototype under `prototype/` has its own unrelated dark/mint system and is out of scope for this app's design work.)

## Evidence on Hand

- `docs/design-system.md` — the Expo app's current design system (tokens, components, patterns, known gaps including dense desktop-era layouts in `OnboardingScreen` and `UserJourneysGalleryScreen`).
- `docs/core.md`, `CONTRIBUTING.md` — core contract and a manual smoke check with concrete demo numbers (e.g. 65,000 VND after +30m on Seat 8 with one drink).
- `docs/fe1-pos-plan.md`, `.beads/artifacts/vhk-qwb/prd.md` — POS module plan and pilot acceptance criteria (not yet fully met).
- No real customer testimonials, case studies, or production usage data exist — all prices, stock, and sessions are demo fixtures; future work must not fabricate real evidence.

## Product Principles

1. The 390pt phone is the primary, authoritative surface for every screen; wider layouts add columns, they never restyle the phone.
2. Availability and status must be understandable without color alone — always pair color with a text label.
3. Business/pricing logic stays in `src/core`, never in a screen or component; UI never duplicates it.
4. The product simulates real transactions convincingly enough to demo and pilot, while staying honest that nothing here is authoritative until a real backend exists.
5. Role (merchant vs. customer) is a presentation lens on one shared data set, never an authorization boundary.

## Accessibility & Inclusion

Already an established standard, not a new decision: touch targets ≥ 44pt, text contrast ≥ 4.5:1 on `surface`/`paper`, status conveyed via label and not color alone, alert banners use `role="alert"`, live counts use `accessibilityLiveRegion="polite"`. Preserve these in any new or refined UI.
