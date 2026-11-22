# Core contract, v1

The separate [server access foundation](api.md) now wraps selected pilot commands
with secure credentials, durable transactions and validated HTTP inputs. Its
screens are independent of the demo stores described below.

`src/core` is the shared foundation, not a backend. `domain.ts` owns the data vocabulary; `fixtures.ts` seeds three isolated venues; `billing.ts` is a pure demonstration policy; `store.ts` exposes a fresh vanilla Zustand store factory; `useAppStore.ts` connects the singleton to React and AsyncStorage.

## Actions

- `setRole`: changes demo presentation. Both roles observe the same sessions.
- `setVenue`: validates venue ID and clears seat selection. Other venues retain their sessions.
- `selectSeat`: accepts only a seat in the active venue.
- `startSession`: requires an available selected seat and at most one demo-customer session per venue; snapshots the hourly rate.
- `addItem`: snapshots a menu price from the current venue onto the current customer's session.
- `endSession`: removes the current customer's demo session in this venue. This is not checkout or payment.
- `setScenario`: replaces active venue sessions with 7/8 morning or 2/8 afternoon occupancy. It intentionally discards that venue's current tabs.
- `advanceTime`: adds 30 minutes to all venues. There is no background clock.
- `reset`: restores all venues to initial fixtures.

User-facing session actions return `ActionResult`. Invalid venue IDs are programmer errors. `SeatMapProps` separates renderer implementation from business state, so 3D and list views can share selection and sessions.

## Billing assumptions

VND integer totals; metered charges round up to 15-minute blocks. Two/four-hour bundles discount seat time 15%. A bundle charges overtime only after its 10-minute grace, rounding the excess to 15 minutes. Menu items are added at their captured prices. The plan's included-drink bundle is not implemented. These are demo policies, not approved pricing for the pilot. Backend quotes must become authoritative before collecting money.

## Storage and integration

Storage key `vibing-hkt:demo:v1` is local per browser/device, never multi-user sync. The root waits for restore before enabling interactions; invalid snapshots fall back to fresh fixtures; writes are queued in order. Change the key or add a migration when the schema changes. Reloads do not add elapsed real time.

Backend work must add authenticated tenant/branch scope, validated contracts, quote expiry, idempotent commands, booking concurrency, durable sessions and ledger, and server-side secrets. Preserve the demo adapter for frontend work. Do not infer payment success from a local store transition or use a client-side rate as authoritative.

## Dependency maintenance

The initial dependency audit (2026-11-14) reports 8 moderate advisories and no high/critical advisories, rooted in the transitive `minimatch` glob parser used by Expo fingerprinting and TypeScript ESLint tooling ([upstream advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)). The audit's proposed Expo downgrade is not compatible with this SDK 58 foundation. Track upstream compatible updates; do not run `npm audit fix --force` blindly. This remains an open tooling maintenance item.

## Local pilot command prototype

`src/core/pilot/index.ts` is a separate in-memory prototype with isolated fixtures,
atomic command execution, access checks, catalogue commands and layout versioning.
Its catalogue is connected to Expo and POS screens through a separate adapter; order state remains isolated. See [coverage and integration limits](pilot-engine.md)
and `tests/pilot.test.ts`. The additive `calculateLineTotal` helper keeps integer
catalogue arithmetic here without changing existing session billing.

## Shared local catalogue

`src/core/catalogue/store.ts` wraps pilot catalogue commands with a pure Zustand
store. `src/core/catalogue/useCatalogue.ts` is its separate native/React binding.
Core session and customer cart factories accept optional menu providers; their
defaults still use fixtures. Production app bindings supply the shared catalogue.
Session-line IDs and names capture selected size identity/labels, preserving the
existing `DemoState` schema and `vibing-hkt:demo:v1` key.

Catalogue startup follows core restoration and registers custom venues before
hydration. Its own `brewspace:catalogue:v1` snapshot contains only validated items,
categories and ID sequence. It never persists demo credentials or pilot session
state. Writes are queued; invalid data falls back to samples with an inline
warning. Merchant/customer screens share changes on this device. Reset clears
catalogue changes. See [screen coverage and limitations](pilot-engine.md).

Integration notes (BE/FE1/FE2): root startup now awaits catalogue restore; shared
UI adds a labeled input and live status announcements; merchant catalogue and POS
menus plus customer menu/cart use the adapter. POS orders still live only in the
merchant mock. Core item actions re-read current availability and prices; purchased
line snapshots remain unchanged by later edits.
