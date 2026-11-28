# MVP feature spec — batch 3 (F201–F300)

Status: specification only. Nothing in this file is implemented unless the "Demo" column says so.

This is a third brainstorm of 100 features. It continues the numbering of the [first spec](mvp-features.md) (F001–F100) and [batch 2](mvp-features-batch-2.md) (F101–F200) and repeats none of their rows. The [MVP requirements (PRD)](../.beads/artifacts/vhk-qwb/prd.md) remain the acceptance authority, and the ground rules of the first spec (integer money, server authority, prepaid seat time, AI only suggests) apply here unchanged.

The rows come from three places:

- PRD requirements that F001–F200 still do not name as their own row: the "request only" permissions in §5, the API rules in §6.2, the pilot gates in §10.1 and the pilot metrics in §10.2.
- The [HTML prototype](prototype.md), which already shows book and equipment lending and retail goods with a unit count. Neither earlier spec covers them.
- Day-to-day operating detail around the flows the first two specs define: counter work, the ticket board, support follow-up, venue setup and the 3D viewer.

## Read this before planning

The first two specs already hold 143 must-have rows for one BE and two FE over 10–12 weeks. This batch is a backlog to choose from, not a third commitment:

- **M** rows (16) are gaps: the PRD requires them for pilot but F001–F200 does not name them. They need to be planned into the existing tasks or explicitly waived by the product owner.
- **S** rows (75) are additions for after the core flow is stable. None should start before booking and payment pass their checks.
- **C** rows (9) are candidates to revisit with pilot data.

Section X needs a scope decision before any of it is planned. The PRD puts ingredient stock and recipes after MVP. Section X asks for something smaller, a unit count on finished goods and a loan record, but it is still scope the PRD does not list.

## Legend

| Column | Values |
| --- | --- |
| Actor | Owner, Manager, Cashier, Server, Customer, Platform (platform admin), System |
| Source | PRD `FR01`–`FR08`, `§n` (PRD section), `Proto` ([HTML prototype](prototype.md)), `U-…` ([user features brainstorm](user-features-brainstorm.md)), `Fnnn` (extends that earlier row) |
| Pri | **M** = pilot gap; **S** = after the core flow is stable; **C** = candidate, decide with pilot data |
| Own | BE, FE1 (merchant and shared UI), FE2 (customer), per [CONTRIBUTING.md](../CONTRIBUTING.md); the first name leads |
| Demo | What exists today: Yes, Part (simulated or incomplete in the Expo demo), Proto (HTML prototype only), No |

## X. Lending and retail goods

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F201 | Retail goods with a unit count | Manager | A retail item (pen, notebook, game) carries a count of units on hand; food and drink items carry none | Proto, FR02 | S | BE, FE1 | Proto |
| F202 | Count reduced on payment only | System | The count drops when payment succeeds, is rechecked before the order is confirmed, and a repeated payment callback reduces it once | Proto, §4 | S | BE | Proto |
| F203 | Sold out at zero and low-count alert | System | An item at zero cannot be added to a cart; at the configured threshold staff see a low-count alert | Proto, FR02 | S | BE, FE1 | Proto |
| F204 | Count adjustment with reason | Manager | Receiving, damage and recount adjustments each need a reason and are audited; a cashier cannot adjust | Proto, §5 | S | BE, FE1 | No |
| F205 | Lendable item catalogue | Manager | Books and shared equipment are listed with a quantity available and a "must be returned" label, and have no price | Proto | S | BE, FE1 | Proto |
| F206 | Free loan request | Customer | A request is tied to a seat, holds one unit at once and never appears on a paid order; sending the same request twice holds one unit | Proto | S | BE, FE2 | Proto |
| F207 | Loan lifecycle | Server | A loan moves awaiting handover → on loan → returned and can be cancelled only before handover; returning restores the quantity | Proto | S | BE, FE1 | Proto |
| F208 | Open loans block session end | Cashier | Staff cannot end a session whose seat has a loan awaiting handover or on loan until it is returned or cancelled | Proto, FR04 | S | BE, FE1 | Proto |
| F209 | Customer's loans list | Customer | The customer sees each of their own loans with its status and where to return it | Proto | S | FE2 | Proto |
| F210 | Lost or damaged loan record | Manager | Staff close a loan as lost or damaged with a note; the quantity is reduced and nothing is charged automatically | Proto | C | BE, FE1 | No |

## Y. Counter and POS

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F211 | Park and resume a counter order | Cashier | A draft order can be parked and resumed by a cashier of the same branch; a parked draft holds no seat, quota or count | F022 | S | FE1, BE | No |
| F212 | Void before payment with a reason | Cashier | Removing a line or cancelling an unpaid counter order records a reason; after payment the only path is a refund request | §4, F023 | S | BE, FE1 | No |
| F213 | Manual discount with manager approval | Manager | A counter discount needs a manager, counts as the order's single promotion, cannot exceed the discount cap and is audited | FR02, §5, F172 | S | BE, FE1 | No |
| F214 | Complimentary item with reason | Manager | A zero-priced line records a reason and approver and is reported separately from sales | FR08 | C | BE, FE1 | No |
| F215 | Cash tendered and change | Cashier | Entering the amount received shows the change; an amount below the total cannot be confirmed | FR02, F031 | S | FE1 | Yes |
| F216 | Order search for staff | Cashier | A cashier finds an order of their own shift by code, seat or time; a manager searches the whole branch | §5 | S | BE, FE1 | No |
| F217 | Receipt redisplay at the counter | Cashier | Staff reopen the receipt of a paid counter order to show or read out to the customer | F124 | S | FE1 | Yes |
| F218 | Link a counter order to an active session | Cashier | A counter order linked to a seat's active session appears in that session's order list and total | FR02, F142 | S | BE, FE1 | No |
| F219 | POS favourites grid | Cashier | Items a manager pins appear first on the POS; sold-out items stay visible but disabled | F022 | C | FE1 | No |
| F220 | Staff refund proposal | Cashier | A cashier or server proposes a refund on a paid order with a reason; it enters the manager's queue and refunds nothing by itself | §5 | M | BE, FE1 | No |

## Z. Tickets and fulfilment

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F221 | Station routing | Manager | Each category is assigned to a station (bar, kitchen, service desk) and the ticket board can be filtered to one station | F035 | S | BE, FE1 | No |
| F222 | Per-line ticket status | Server | A line can be marked ready on its own; the ticket becomes ready when all its lines are | F034 | C | BE, FE1 | No |
| F223 | Undo the last ticket step | Server | Within a short configured time the last status change can be reverted by one step, and the reversal is recorded | F035 | S | BE, FE1 | No |
| F224 | Ticket age marker | Server | A ticket waiting longer than the configured time is marked by text as well as colour and sorted first | §10.2, F035 | S | FE1 | Part |
| F225 | Serve to seat or pick up at counter | Customer | The order records the choice; the ticket shows a seat label or a pickup number | FR02 | S | BE, FE2, FE1 | Part |
| F226 | Order-ready notice | Customer | When a ticket turns ready the customer's open screen shows a notice on its next refresh, with the pickup number if any | FR05, F036 | S | FE2 | Yes |
| F227 | Wrong or missing item report | Customer | A report from a served order creates a staff request that carries the order reference and refunds nothing by itself | FR05, F074 | S | BE, FE2 | No |
| F228 | Remake ticket | Server | A remake is linked to the original ticket with a reason, charges nothing and is counted in the daily report | F038 | S | BE, FE1 | No |
| F229 | Paid line that cannot be made | Server | Marking a paid line unavailable tells the customer, opens a refund request for that line's value and leaves the other lines in progress | §4, FR08 | S | BE, FE1, FE2 | No |
| F230 | Rented equipment return | Cashier | A paid rental (e.g. monitor) stays open until staff record its return; ending the session warns while one is open | FR02, F013 | S | BE, FE1 | No |

## AA. Support follow-up and service quality

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F231 | Customer's own support requests | Customer | The customer sees each of their requests as open, acknowledged or resolved and cannot see anyone else's | §5 | M | FE2, BE | Part |
| F232 | Unacknowledged request escalation | Manager | A request not acknowledged within 2 minutes in staffed hours is flagged to the manager | §10.2 | S | BE, FE1 | No |
| F233 | Staffed hours | Manager | Response time is measured only inside configured staffed hours; outside them the customer is told nobody is on duty | §10.2 | S | BE, FE1, FE2 | No |
| F234 | Support response-time report | Manager | The report shows the share of requests acknowledged within 2 minutes and, separately, time to resolve | §10.2 | M | BE, FE1 | No |
| F235 | Hand a request to another staff member | Server | The handler can pass a request on; both handlers and the times are kept | F072 | S | BE, FE1 | No |
| F236 | Resolution outcome and note | Server | Resolving a request records an outcome code and an optional note visible to staff only | F072 | S | BE, FE1 | No |
| F237 | Cancel own open request | Customer | A customer withdraws a request that nobody has acknowledged; an acknowledged one cannot be withdrawn | FR05 | S | BE, FE2 | No |
| F238 | Quick requests without typing | Customer | Preset requests (water, tissue, clean table) create a request in one tap and never pass through AI | FR05, F071 | S | FE2, BE | No |
| F239 | Rating summary | Manager | The manager sees average ratings for seats, drinks and service and a list of low ratings with their session | F149 | S | BE, FE1 | No |
| F240 | Lock a seat from an issue report | Manager | From a seat issue staff lock the seat with the report as the reason; unlocking prompts to resolve the report | F147, F156 | S | FE1, BE | No |

## AB. Booking and session management

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F241 | My bookings list | Customer | The owner sees upcoming and past bookings for this venue with status; a guest sees those of the current device only | FR04, §5 | S | FE2, BE | No |
| F242 | Booking confirmation with code | Customer | After payment the screen shows seat, times in the branch timezone, the booking code and how to check in | FR04, FR05 | M | FE2, BE | No |
| F243 | Reschedule before check-in | Customer | A new time goes through availability and a fresh quote; the original booking stays until the new one confirms, and any price difference becomes an adjustment or refund request | FR04 | C | BE, FE2 | No |
| F244 | Join loyalty right after paying | Customer | A guest who joins in the same session gets the points of that order once, under the normal pending rule | FR07, F084 | S | BE, FE2 | No |
| F245 | End-of-day open session list | Manager | At closing the manager sees sessions still active and holds unresolved; each is closed by hand with a reason and none ends automatically | §4, F155 | S | BE, FE1 | No |
| F246 | Return to the active session | Customer | Reopening the venue link on the same device returns to the active session without re-entering the code | FR05, F070 | S | FE2 | Part |
| F247 | Extension at the counter | Cashier | A cashier extends a session for the customer under the same next-slot and payment rules, with cash allowed | FR04, F062 | S | BE, FE1 | No |
| F248 | Early checkout confirmation | Customer | Ending early requires confirming a message that unused time is not refunded | FR04, U-P04 | S | FE2 | Yes |
| F249 | Buffer and check-in window settings | Owner | Cleaning buffer and check-in window are set per branch within fixed bounds and apply only to bookings made afterwards | §11 | S | BE, FE1 | No |
| F250 | Whole table sold as one seat | Manager | A private table is configured as one sellable seat with a capacity label shown on the seat card | §11, FR03 | S | BE, FE1 | No |

## AC. 3D viewer experience

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F251 | Camera presets and reset | Customer | Buttons switch between top and angled views, and reset returns to the published default view | FR03 | S | FE1 | No |
| F252 | Readable seat labels in 3D | Customer | Labels face the camera and do not overlap at the default zoom | FR03 | S | FE1 | No |
| F253 | Bounded touch camera | Customer | One finger orbits, a pinch zooms and two fingers pan; the camera cannot go under the floor or lose the venue | FR03, F041 | S | FE1 | No |
| F254 | Adaptive render quality | System | When frame rate stays below the agreed level, shadows and pixel ratio drop and the viewer stays usable | §1.3, §9 | S | FE1 | No |
| F255 | 3D load measurements | System | Load time, load failure and fallback use are recorded per device class with no personal data | §1.3 | S | FE1, BE | No |
| F256 | Recovery from a lost graphics context | Customer | If the 3D context is lost mid-use the list view opens with the same seat and time still selected | FR03, F044 | S | FE1 | No |
| F257 | View from the seat | Customer | From a seat card the camera moves to that seat's eye level and back | FR03 | C | FE1 | No |
| F258 | Seat photo | Manager | A size-limited photo attached to a seat shows on the seat card; other file types are refused | F135 | S | BE, FE1, FE2 | No |
| F259 | Map follows the chosen time | Customer | Changing date, time or duration redraws seat status on the map and list from the availability answer | FR04, F051 | S | FE2, FE1 | No |
| F260 | Text summary of the floor | Customer | The 3D view has a text alternative giving free seats by zone and a link to the list view | §9 | S | FE1 | Yes |

## AD. Venue setup and go-live

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F261 | Setup checklist | Owner | The checklist shows brand, hours, menu, layout, prices, payment and staff as done or missing, and go-live is refused while a required step is missing | §12 | S | FE1, BE | No |
| F262 | Test mode before go-live | Owner | In test mode only the provider's test environment is used, and orders are marked as tests and left out of reports | §11 | S | BE, FE1 | No |
| F263 | Go-live switch | Owner | Going live needs the checklist complete, is audited, and leaves test orders, bookings and points out of live data | §12 | S | BE, FE1 | No |
| F264 | Starter configuration set | Platform | A new venue can start with a sample menu, prices and policies as its own copy to edit | §1.3, F002 | S | BE | No |
| F265 | Brand preview and contrast check | Owner | Brand colours are previewed on the customer menu before saving, and a text and background pair below the contrast minimum is refused | FR01, §9 | S | FE1 | Yes |
| F266 | Editor duplicate and multi-select | Manager | Several assets can be selected, moved together and duplicated; duplicates get no seat until one is bound | FR03, F047 | S | FE1 | No |
| F267 | Editor overlap warning | Manager | Overlapping assets are flagged before publish as a warning that does not block it | FR03, F049 | C | FE1 | No |
| F268 | Automatic seat labels | Manager | A new seat gets the next free label in its zone; relabelling keeps the seat ID and its bookings | FR03, F039 | S | BE, FE1 | No |
| F269 | Venue notice banner | Manager | A notice with a validity period shows on the venue page and stops showing when it ends | FR01, F140 | S | BE, FE1, FE2 | No |
| F270 | Versioned policy and terms text | Owner | Each edit creates a new version, and bookings and consents keep the version they were made under | §11, F171 | S | BE, FE1 | No |

## AE. Pricing, promotions and loyalty

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F271 | Special-day price calendar | Manager | Named dates use their own rule set, validated for overlap like any other rule | FR06, F076 | S | BE, FE1 | No |
| F272 | "Not applied" explanation | Customer | When a voucher or points are refused because another promotion is on the order, the customer is told which one | FR02, F021 | S | BE, FE2 | No |
| F273 | Manual points adjustment | Owner | An adjustment needs a reason, is a ledger entry of its own and is audited | FR07, F086 | S | BE, FE1 | No |
| F274 | Points expiry | Owner | Available points older than the configured period expire as a ledger entry, and the member sees the date beforehand | FR07 | C | BE, FE2 | No |
| F275 | Rule-based member groups | Manager | New, regular and lapsed groups are computed from stored stats; managers see counts and only the owner sees identities | FR07, §5, §6.1 | S | BE, FE1 | No |
| F276 | Separate marketing consent | Customer | Joining loyalty does not opt the member into messages; a separate choice does, and it can be withdrawn | FR07, §11 | S | BE, FE2 | No |
| F277 | Consent record | System | Each consent stores the time and the policy version shown | FR07, §11 | S | BE | No |
| F278 | Per-customer voucher limit | Manager | A voucher limited to one use per customer is refused the second time for the same member or guest token | F173 | S | BE | No |
| F279 | Sale countdown on the banner | Customer | The banner shows time left by server time, and after the end the sale is gone on the next refresh and from new quotes | FR06, F083 | S | FE2, BE | No |

## AF. Reports and pilot measures

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F280 | Sales by item group | Manager | Revenue and quantity are shown per category for a date range | §1.3 | S | BE, FE1 | No |
| F281 | Hours sold and revenue by tier | Manager | The report splits seat hours and seat revenue by tier and time band | FR08 | S | BE, FE1 | No |
| F282 | No-show and cancellation report | Manager | Counts and rates are shown per day and tier | §10.2 | S | BE, FE1 | No |
| F283 | Refund report by reason | Manager | Confirmed refunds are listed with reason, approver and amount, and their total matches the daily report | FR08 | S | BE, FE1 | No |
| F284 | Cash variance history | Manager | Variance is listed per shift and cashier over a date range | FR08, F093 | S | BE, FE1 | No |
| F285 | Self-service share | Manager | Each paid customer order records whether staff acted for the customer and why; the report shows the share that needed no staff | §10.2 | M | BE, FE1 | No |
| F286 | Checkout completion measure | Manager | Eligible checkout attempts, completions and failure classes are counted, with provider declines reported separately | §10.2 | M | BE | No |
| F287 | Tax and fee summary | Owner | Collected taxes and fees are totalled per configured line for a date range | FR02, F015 | S | BE, FE1 | No |
| F288 | Date range and previous-period comparison | Manager | Each report takes a date range and can show the same length of time just before it | FR08 | S | FE1, BE | No |
| F289 | Seat use ranking | Manager | Seats are ranked by hours sold with their issue report counts alongside | FR08, F147 | C | BE, FE1 | No |

## AG. AI, contracts, security and release quality

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F290 | AI suggestion expiry | System | A suggestion past its expiry cannot be approved or applied, and an approved one stops applying when its validity ends | §4 | M | BE | No |
| F291 | Labelled classification test set | System | At least 50 human-labelled requests are run per prompt version, and missed mandatory escalations are reported | §10.2 | M | BE | No |
| F292 | Weekly AI review list | Manager | The manager sees the week's corrected classifications and the approved offers that had no uses | §10.2, F186 | S | BE, FE1 | No |
| F293 | Idempotency key payload check | System | Repeating an idempotency key with a different payload is refused | §6.2 | M | BE | No |
| F294 | Response envelope and error codes | System | Business responses carry version, server time, expiry and a code from a published list; clients show a message for every code and use server time for countdowns | §6.2 | M | BE, FE1, FE2 | No |
| F295 | One schema for mock and real API | System | The mock adapter and the real API are checked against the same schema in CI | §6.2 | M | BE, FE1, FE2 | No |
| F296 | Tenant-private asset URLs | System | A tenant's private asset URL is refused for another tenant and for a caller without a session | §10.1 | M | BE | No |
| F297 | No customer impersonation | System | No API lets staff or a platform admin obtain a customer's session or token | §5 | M | BE | No |
| F298 | Backup before a large publish | System | Publishing a layout or price set that is flagged as large takes a backup first | §9 | M | BE | No |
| F299 | No secrets in client bundles | System | A CI check fails if a provider or AI key appears in a built client bundle or an `EXPO_PUBLIC_*` variable | §9 | M | FE1, FE2, BE | No |
| F300 | Pilot gate test suite | System | Automated API tests cover the ten §10.1 gates and run against seed data for two independent tenants | §10.1, §1.2 | M | BE, FE1, FE2 | No |

## Summary

| Area | Features | M | S | C |
| --- | --- | --- | --- | --- |
| X. Lending and retail goods | 10 | 0 | 9 | 1 |
| Y. Counter and POS | 10 | 1 | 7 | 2 |
| Z. Tickets and fulfilment | 10 | 0 | 9 | 1 |
| AA. Support follow-up and service quality | 10 | 2 | 8 | 0 |
| AB. Booking and session management | 10 | 1 | 8 | 1 |
| AC. 3D viewer experience | 10 | 0 | 9 | 1 |
| AD. Venue setup and go-live | 10 | 0 | 9 | 1 |
| AE. Pricing, promotions and loyalty | 9 | 0 | 8 | 1 |
| AF. Reports and pilot measures | 10 | 2 | 7 | 1 |
| AG. AI, contracts, security and release quality | 11 | 10 | 1 | 0 |
| **Total** | **100** | **16** | **75** | **9** |

If scope has to shrink, drop C first, then S. An M row can only be dropped by the product owner waiving the PRD requirement it cites.

## Open decisions these rows depend on

| Decision | Rows | Reference |
| --- | --- | --- |
| Whether lending and counted retail goods are in the pilot at all | F201–F210 | PRD §1.3 puts ingredient stock after MVP and does not mention finished goods |
| Whether a lost or damaged loan is ever charged | F210 | Prototype limits: no deposit or fine |
| Manual discount and complimentary item limits | F213, F214 | §11 (floor price and discount cap) |
| Staffed hours and who is told about unacknowledged requests | F232, F233 | §11 (support contact during pilot) |
| Reschedule policy and how a price difference is handled | F243 | §11 (cancel, no-show and refund policy) |
| Bounds for buffer and check-in window | F249 | §11 (default 10 and 15 minutes) |
| Whether points expire, and after how long | F274 | §11 |
| What counts as a "large" publish | F298 | §9 |
| Frame-rate level that triggers lower render quality | F254 | §9 (week 1 device tests) |

## Still out of MVP

The "Out of MVP" list in the [first spec](mvp-features.md#out-of-mvp) and the "Still out of MVP" list in [batch 2](mvp-features-batch-2.md#still-out-of-mvp) both stand. This batch adds nothing from them. In particular, section X stops short of ingredient stock, recipes, purchasing, deposits and late fees, and section Y stops short of bill splitting, customer credit and POS hardware.
