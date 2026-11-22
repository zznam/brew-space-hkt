# MVP implementation order

The PRD is the acceptance authority. Implement mandatory (`M`) features in dependency
order. Should-have/candidate ideas and post-pilot F301–F520 follow the core flow.
This record does not claim the pilot is ready.

| Priority             | Scope                                        | Evidence / remaining work                                                                                                                                                                                                                                                                               |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Access            | F001–F009 and access gaps                    | API, tenant/branch/templates, staff sessions and server permissions, owner staff/brand screens, public slug menu. See `api.md`, API tests and browser tests. Hosting/UAT remain.                                                                                                                        |
| 2. Purchase          | F010–F038, F084/F101/F113/F123, basic shifts | Shared catalogue, quotes/snapshots, capped offers with approval and transactional quota, cash shifts, idempotent payments, guest ownership and fulfilment are implemented and tested. VNPAY checkout/callback/query and exception queue have local tests. Next: mixed orders and provider sandbox validation. |
| 3. Booking and space | F039–F070                                    | Demo renderer and local layout validation exist. Add authoritative availability/holds/buffer, prepaid pricing, payment confirmation, sessions/extensions/transfers; connect editor and both roles.                                                                                                      |
| 4. Operations        | F071–F080/F083, F092–F100 and required gaps  | Support/escalations, pricing/approvals, full shifts/refunds/reconciliation and audited adjustments.                                                                                                                                                                                                     |
| 5. Membership        | F085–F090 and required gaps                  | OTP/consent, tenant-scoped membership, points holds/reversals/debt, behavior aggregates and member screens.                                                                                                                                                                                             |
| 6. Pilot             | PRD §9, §10.1 and §12; other mandatory gaps  | Load/isolation/concurrency/provider failure tests, backup restore, deployment/runbook, device/owner UAT. AI explanations follow a stable core flow.                                                                                                                                                     |

Defaults: Node 22 modular service, SQLite on a persistent local volume, VND and
Vietnam time. VNPAY is the selected payment adapter, sandbox by default; merchant
credentials and an externally reachable callback are required for provider validation.
OTP selection follows with membership. No external rollout, provider account purchase
or live payment has been performed.

Purchase evidence: `tests/orders.test.ts`, `tests/payments.test.ts`, `tests/vnpay.test.ts`, `tests/promotions.test.ts`
and real HTTP/SQLite coverage in `tests/api.test.ts`. Browser tests cover cash payment,
walk-in orders, fulfilment, cancellation, shift reconciliation, reload recovery and
a simulated gateway round-trip that does not trust return URL parameters. See
`docs/api.md` for setup, guarantees and limitations.
