# Local pilot engine: first executable slice

The [server access foundation](api.md) now injects real password/token primitives
and SQLite transactions for selected commands. The deterministic defaults described
here remain only for the local demo. See [implementation order](mvp-implementation.md)
for API coverage and remaining pilot work.

`src/core/pilot/index.ts` exposes a framework-independent, in-memory command runner.
The command engine remains separate from the Expo session store and merchant POS mock.
The catalogue adapter now connects merchant editing, customer menus and the POS menu
to the catalogue commands. Existing session billing policy and POS order ownership
are unchanged.

## Try it

```ts
import { createPilotEngine, createPilotWorld } from './src/core/pilot';

const engine = createPilotEngine(createPilotWorld());
const branch = engine.snapshot().db.branches[0]!;
const tenant = engine.snapshot().db.tenants[0]!;
const login = engine.execute('staffSignIn', {
  email: `manager@${tenant.id}.demo.test`,
  password: 'demo-password',
});
if (login.ok) {
  const catalogue = engine.execute('getCatalogue', undefined, {
    staffToken: login.data.token,
  });
  const menu = engine.execute('publicVenue', { slug: branch.slug });
}
```

Every command returns `{ ok: true, data }` or `{ ok: false, error: { code,
message, details? } }`. A clock can be injected as the third `createPilotEngine`
argument for expiry checks. A command receives private copies of state and inputs;
success commits atomically, refusal discards domain changes. Rate-limit hits and
redacted logs survive refusals. Results and snapshots cannot mutate engine state.
Run `npx vitest run tests/pilot.test.ts` for boundary coverage.

## Feature-bank coverage

All entries below are **partial local implementations**, not completed pilot
acceptance checks. The feature bank's API, UI and production requirements still
apply.

| IDs             | Executable behavior                                                                                 | Remaining integration                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| F003            | Allowlisted brand fields, URL/colour checks and readable text contrast                              | Owner form and server validation                                                                            |
| F004            | Brand/menu lookup by slug, unknown slug refused                                                     | `/v/{slug}` route                                                                                           |
| F005–F009       | Staff session expiry, role matrix, branch/resource checks, invite/assign/revoke                     | Real identity provider, API enforcement and staff screens; unimplemented business actions still need guards |
| F010–F012       | Category/item edit/archive, size/modifier previews, sold-out toggle and revalidation                | Screens, time packages and authoritative quote/order integration                                            |
| F046–F050       | Asset approval, immutable placement helpers, draft version conflict, validation and publish history | Editor screens, real asset storage and renderer integration                                                 |
| F067, F164      | Public seat locators, rotation invalidates old QR                                                   | QR rendering and scanning UI                                                                                |
| F103–F106, F110 | Local throttles, support grants, suspension, reset invalidation and credential log redaction        | Network boundary, distributed limits and production logging                                                 |
| F182–F185       | AI-off/budget/error fallback, run metadata and contact-detail redaction                             | Rules-based support workflow, asynchronous adapter with enforced timeout, privacy review                    |

Pilot line previews select current catalogue prices and preserve chosen size/modifiers.
They do not create orders or reserve stock/services. Integer arithmetic stays in
`src/core/billing.ts`; existing metered/bundle estimates are unchanged. Invalid
sizes, duplicate modifier groups, foreign categories, sold-out/archived items and
invalid quantities are refused. Snapshots remain unchanged after menu edits.

## Limits and integration notes

The fixtures contain public demonstration passwords. Password digests, PRNG tokens
and signatures are simulation utilities, not production security. The entire world
is visible to its host. Only Vietnam's fixed UTC offset is modeled by the time
helpers; do not use them for arbitrary daylight-saving timezones. AI redaction is
best-effort and synchronous adapters cannot enforce a wall-clock timeout.

The engine now includes five-minute quotes, item orders, cash shifts, online payment
evidence, an append-only ledger, fulfilment retry and ticket transitions. Only the
server adapter may expose these commands to real clients: it injects secure
credentials, wraps commands in SQLite transactions, validates VNPAY signatures and
queries the provider. The original local catalogue adapter still persists only its
catalogue slice and does not connect the demo POS to API transactions.

Vouchers and approved flash sales now have caps, quote snapshots and transactional
usage holds. Booking, time-based pricing, refund execution and loyalty remain open.
The provider sandbox, hosted operations and full pilot acceptance gates remain open.

Shared BE paths changed: new `src/core/pilot/` modules plus an additive integer
line-total helper in `src/core/billing.ts`. No root `@/core` exports were changed
because pilot types have intentionally separate names and semantics. The app and
POS retain their existing order stores and receive read-only menu providers from
the catalogue adapter.

## Catalogue screen integration

Merchant → Menu opens `/merchant/catalogue`. Managers can create/rename categories,
create/edit food, drink or service items with integer prices, add/remove sizes,
archive items and toggle availability. This uses a local demo manager session;
it does not add production sign-in. Each form and status is bilingual EN/VI.

The customer session menu reads the same catalogue, filters by category and lets
customers pick a priced size. Size identity and label are captured in the existing
session-line ID/name, so bills, history and receipts keep their purchased size and
price without changing the persisted session schema. Existing preparation options
remain free; the screen editor does not yet author paid modifier groups.

`src/core/catalogue/store.ts` is the pure adapter, and `useCatalogue.ts` owns its
React/AsyncStorage binding. Startup awaits core restoration, registers custom
venues, then hydrates the catalogue before showing interactive routes. Only an
allowlisted, versioned catalogue snapshot (items, categories and ID sequence) is
stored under `brewspace:catalogue:v1`; credentials, engine sessions, logs and other
pilot records are excluded. Restore validates category/item schemas and tenant
references as a whole. Writes are serialized and storage failures appear inline.
Changes are shared within this app instance/device, not synchronized across tabs,
devices or users. Simulator reset clears catalogue edits along with other demo data.

Core session actions and the customer cart use injected menu providers; default
factory behavior stays fixture-backed for existing consumers. Submit/reorder and
POS payment recheck availability, so archived, sold-out and removed sizes cannot
be submitted from stale drafts. A changed customer price refreshes the estimate
and requires another submit to accept it. Already ordered lines keep their prices.
POS order/ticket state stays in its isolated mock, with only menu lookup and
availability-toggle callbacks supplied at the binding.

Checks: `tests/catalogue.test.ts`, `tests/catalogue-storage.test.ts`, and
`e2e/catalogue.spec.ts` cover size-to-bill prices, category edits, venue isolation,
stale carts, price review, persistence/recovery, and EN/VI phone/desktop screens.
