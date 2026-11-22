# Server access and purchasing

The API implements tenant/branch provisioning, staff access, brand/catalogue
configuration, item purchasing, offers and fulfilment. `/platform`, `/staff`, `/staff/team`, `/staff/catalogue`, `/staff/offers`, `/staff/orders`, `/staff/tickets` and
`/v/{slug}` use this service. Original merchant/customer routes remain the device
demo, including the isolated POS mock. Demo roles never authorize API requests.
Booking is not connected yet.

## Run locally

Use Node 22.13+ and `npm ci`.

1. Supply `BREWSPACE_ADMIN_EMAIL` and `BREWSPACE_ADMIN_PASSWORD` through your shell's
   secret/environment manager. Passwords must be 12–100 characters. These are
   server-only variables, never `EXPO_PUBLIC_*` values.
2. Run `npm run api:bootstrap` once, then remove those environment values. This
   creates an empty database and one platform administrator. It refuses to
   overwrite an existing database. No demonstration accounts are provisioned.
3. Run `npm run api` and `npm run web` in separate terminals.
4. Open `/platform`, sign in, create a venue and its owner account. Open `/staff`
   as that owner to edit branding and invite/assign/revoke staff.
5. Open Menu in the staff navigation to manage categories, items, sizes and availability.
   Owners/managers can edit; cashiers/servers can update availability. Open `/v/{slug}`
   for the public menu. The original merchant catalogue remains the local demo.
6. On the public menu, choose items/options, review a five-minute quote and place
   an order. In Staff → Orders, open your own shift, select the order and confirm
   the cash actually received. Tickets appear for preparation and serving. Close
   the shift with counted cash to see the expected amount and variance.
7. Staff → Venue → Offers creates owner-controlled vouchers or cashier-proposed
   flash sales. An owner/manager approves each sale with a reason before customers
   can select it. Customer cart → Offer selects one voucher or flash sale.

| Variable                    | Default                                                        | Purpose                                                       |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `BREWSPACE_DB`              | `.data/brewspace.sqlite`                                       | Database on a persistent local volume                         |
| `BREWSPACE_HOST`            | `127.0.0.1`                                                    | Listener address                                              |
| `PORT`                      | `3001`                                                         | Listener port                                                 |
| `BREWSPACE_ALLOWED_ORIGINS` | `http://localhost:8081,http://127.0.0.1:8081`                  | Exact browser origins, comma-separated                        |
| `EXPO_PUBLIC_API_URL`       | `http://127.0.0.1:3001` in development; same origin in exports | Non-secret API base URL; native devices need a reachable host |

For hosting, route `/api/*` to the service and other paths to the Expo SPA, or set
an HTTPS API URL and exact web origin. Terminate HTTPS at the hosting proxy. SQLite
requires a persistent local volume, not ephemeral serverless/network storage. Node
22's `node:sqlite` is experimental; pin and verify the runtime before hosting.

## Contract

Responses: `{ ok: true, data, requestId }` or
`{ ok: false, error: { code, message }, requestId }`, always `no-store`. Screens
translate error codes into EN/VI and show network failures with retry. Tokens live
only in memory for staff/platform; reloading requires sign-in again. Guest order
tokens are scoped to one order, expire after seven days and are stored in browser
`sessionStorage` so the same tab can reload or return from a gateway. They never go
in URLs or `localStorage`. Closing the tab loses access; cross-device recovery is
not implemented. Native clients keep the active guest order only in memory.

- `GET /api/health`: initialization status.
- `GET /api/venues/{slug}`: brand, currency, timezone/hours, categories and available
  items; no staff, credentials, sessions or business totals.
- `POST /api/staff/sign-in`, `/api/platform/sign-in`: email/password JSON; expiring
  bearer token. Staff sessions last 12 hours, platform sessions 2 hours.
- `POST /api/commands/{name}`: `Authorization: Bearer <token>` and JSON input (`{}`
  for no input). `server/contracts.ts` is the explicit allowlist and input schema.
  Identity and tenant overrides cannot be supplied in request bodies.
- `POST /api/customer/{name}`: `createQuote`, `createOrder`, `getOrder`, `cancelOrder`,
  `startOnlinePayment`, `resumeOnlinePayment`, `recheckPayment`. Only `createQuote`
  is anonymous; other calls require the order/quote bearer token.
- `GET /api/payments/vnpay/ipn`: signed provider callback with VNPAY acknowledgement
  codes. Browser return parameters never settle a payment.

Commands: `createTenant`, `createBranch`, `updateBranch`, `listTenants`,
`setTenantStatus`, `me`, `staffSignOut`, `platformSignOut`, `listStaff`, `inviteStaff`,
`updateStaff`, `revokeStaff`, `resetStaffPassword`, `updateBrand`, `getCatalogue`,
`saveCategory`, `saveItem`, `archiveItem`, `setSoldOut`, `getLayout`, `configureFees`,
`createQuote`, `createOrder`, `getOrder`, `listOrders`, `cancelOrder`, `openShift`,
`listShifts`, `closeShift`, `confirmCash`, `listTickets`, `confirmService`, `advanceTicket`,
`startOnlinePayment`, `resumeOnlinePayment`, `recheckPayment`, `listPaymentExceptions`.
Offer commands: `createVoucher` (owner), `proposeSale`, `approveSale`, `stopSale`, `listOffers`.

## Purchase and payment contract

Quotes snapshot sizes/modifiers/notes and configured fees for five minutes. Amounts
are integer VND; percent fees use basis points, apply to the scoped subtotal and
round once per fee. Availability is rechecked when creating an order. Prices from
the client are refused. Cash confirmation requires the caller's own open shift in
the order's branch, sufficient tendered cash and no pending online attempt.
Idempotency keys are retained on retries; reusing a key with changed input fails.

One promotion is allowed per quote/order. Discounts apply only to eligible lines,
round down once, and cannot exceed the offer cap or the owner's percentage ceiling.
Fees currently apply to the pre-discount scoped subtotal. A quote expires no later
than its offer. Quota is reserved atomically when creating the order, consumed once
on payment, and released on cancellation/expiry. An unresolved online payment keeps
its reservation until reconciliation; it is never silently released and charged again.
Stopping a sale refuses new orders without rewriting existing order snapshots.

Payment, ledger, paid order and outbox commit together. A two-second worker retries
ticket publication, and serving the ticket completes an item-only order. Limited
services need explicit staff availability confirmation. Ticket cancellation does
not refund money. Payment deadlines cancel unpaid orders unless an online attempt
is unresolved; uncertainty keeps the order pending and blocks a second payment.

The VNPAY adapter defaults to sandbox. Configure these **server-only** values:
`VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_TENANT_ID`, `BREWSPACE_PUBLIC_ORIGIN`
(web origin), `VNPAY_SERVER_IP` (server egress address), and optionally `VNPAY_MODE`
(`sandbox` or `production`). One configured merchant channel serves exactly one
tenant; other tenants retain cash checkout. Use separate channels/adapters before
enabling online payments for additional merchants. Register the API's IPN URL with
VNPAY. A public HTTPS origin is required outside local sandbox development.

Signed requests use VNPAY 2.1.0 and HMAC-SHA512. The adapter verifies callback/query
signatures, merchant, reference, integer amount and currency when present; the
VND-only request supplies the currency binding for callbacks without that field.
A 30-second worker queries unresolved attempts with persisted query leases. A
timeout or ambiguous status stays pending. Successful payments never downgrade;
duplicate receipts do not add ledger entries. Verified late/excess money is retained
with a refund request and manager-visible exception, without a second fulfilment.
Refund execution is a later slice. VNPAY protocol sources:
[checkout/IPN](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html),
[status queries](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).

No merchant credentials or provider transaction were used during implementation.
Local signed fixtures verify the adapter and browser return flow; real sandbox
certification, callback reachability and provider operational limits remain gates.

`createTenant` takes `name`, `currency: "VND"`, `branch`, `owner`, optional `brand`,
`isTemplate`, `templateBranchId`. A branch has `name`, unique `slug`, `address`,
`timezone: "Asia/Ho_Chi_Minh"`, seven `hours` entries (Sunday first; `null` for closed,
otherwise `{ open: "07:00", close: "22:00" }`). Opening times must precede closing
times on the same day; `24:00` is a valid closing time. Unsupported currencies,
timezones and overnight hours are rejected rather than silently mispriced.

Only platform admins can copy a branch of an active template tenant. A copy has
independent item/category/tier/seat/placement/zone IDs and copies tenant-private
asset definitions. Only published layout/configuration is copied, never people,
transactions, sessions, QR codes, logs or consumed quotas. Staff invitation creates
an account with an initial password; it does not send email.

## Persistence and authorization

The HTTP service always injects `server/security.ts`: salted scrypt passwords,
256-bit random session tokens, SHA-256 digests for stored tokens. Unknown-user
login performs the same password derivation. Core deterministic credentials remain
only for local demos/tests; never expose an engine without the server adapter.

SQLite uses WAL, full synchronous commits and `BEGIN IMMEDIATE` around loading the
latest state, validating a command and saving. Multiple connections cannot overwrite
stale state. The first schema stores a versioned JSON aggregate, not normalized
booking/payment tables or proven pilot throughput. Refusals preserve throttles and
redacted logs while discarding domain writes. Corruption/incompatible versions are
errors, never a reason to discard data and reseed fixtures.

Each call rechecks role, branch, staff status, session epoch and expiry. Revocation
and password reset invalidate earlier sessions. Foreign resources return `NOT_FOUND`;
platform tokens cannot call staff endpoints. The last owner cannot be demoted;
self-revocation is refused. IP/account login throttles survive restart, origin and
body limits are enforced, and forwarded IP headers are not trusted. Configure edge
limits at the proxy when hosting behind it.

## Evidence and remaining gates

`tests/api.test.ts` covers real HTTP, two tenants, branches/roles, revocation, expiry,
sign-out, malformed inputs, public privacy, stored credentials, template isolation,
rollback and database reopening. `e2e/access.spec.ts` proxies browser traffic to
isolated real API/SQLite instances for owner/platform/staff flows, EN/VI, public
menus, offline retry and phone overflow. Tests never write `.data/` or real accounts.

Remaining: booking/mixed orders, refund execution,
editor integration, support/pricing/loyalty, provider sandbox validation, backup
restore, deployment, device/owner UAT, load/security review. Pilot gates remain open.

Integration notes: shared changes include `src/core/pilot`, input/header primitives,
root shell, package files and tests. Existing session billing and POS order state
remain isolated. API screens do not require demo hydration or show simulator controls.
