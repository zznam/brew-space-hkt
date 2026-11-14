# MVP feature spec — 100 features

Status: specification only. Nothing in this file is implemented unless the "Demo" column says so.

This is the flat backlog for the 10–12 week pilot. The [MVP requirements (PRD)](../.beads/artifacts/vhk-qwb/prd.md) remain the acceptance authority; each row cites the PRD section it comes from and adds one testable check. Where the PRD and the older [React Native plan](react-native-plan.md) disagree, the PRD wins.

## Ground rules

- Money is an integer in the tenant currency's smallest unit. Timestamps are stored in UTC and shown in the branch timezone.
- The server is authoritative for price, holds, payment status, and time. The client never marks anything paid.
- Seat time is prepaid in 30-minute steps. Running over time is flagged for staff and never charged automatically.
- AI only classifies and suggests. Rules run first, a manager approves anything that changes price or offers, and every AI path has a non-AI fallback.

## Legend

| Column | Values |
| --- | --- |
| Actor | Owner, Manager, Cashier, Server, Customer, Platform (platform admin), System |
| PRD | `FR01`–`FR08`, `§4` (states and consistency), `§5` (permissions) |
| Pri | **M** = must have for pilot; **S** = add once the core flow is stable (PRD §1.3) |
| Own | BE, FE1 (merchant and shared UI), FE2 (customer), per [CONTRIBUTING.md](../CONTRIBUTING.md); the first name leads |
| Demo | What the local demo does today: Yes, Part (simulated or incomplete), No |

## A. Tenant, brand and access

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F001 | Tenant and branch records with currency, timezone and opening hours | Platform | A new tenant with one branch can be created and its timezone and hours are returned by the API | FR01 | M | BE | No |
| F002 | Create a venue from a template as an independent copy | Platform | Editing the template or venue A afterwards leaves venue B's menu and layout unchanged | FR01 | M | BE | No |
| F003 | Validated brand configuration (logo, colours, name) | Owner | Saving a brand value outside the allowed schema is rejected; no free-form code or markup is stored | FR01 | M | BE, FE1 | Part |
| F004 | Venue-slug routing that loads the brand | Customer | Opening `/v/{slug}` shows that venue's name, colours and menu; an unknown slug shows a not-found page | FR01 | M | FE2, BE | Part |
| F005 | Staff sign-in | Cashier | Staff can sign in and out; an expired or missing session is refused by the API | FR01 | M | BE, FE1 | No |
| F006 | Roles: owner, manager, cashier, server | Owner | Each action in the PRD §5 matrix is allowed or refused by the API according to the caller's role | FR01, §5 | M | BE | No |
| F007 | Branch-scoped staff assignment | Owner | Staff assigned only to branch A cannot read or change orders, shifts or bookings of branch B | FR01 | M | BE | No |
| F008 | Server-side authorisation and tenant isolation on every API | System | A tenant A user calling with a tenant B resource ID is refused and learns nothing about the resource | FR01 | M | BE | No |
| F009 | Staff management: invite, assign role and branch, revoke | Owner | After revocation the staff member's next sensitive API call is refused, not just hidden in the UI | FR01 | M | BE, FE1 | No |

## B. Menu and catalogue

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F010 | Categories and item management for food and drink, time packages and services | Manager | A manager can create, edit and archive an item; a cashier cannot | FR02, §5 | M | BE, FE1 | Part |
| F011 | Size options per item | Manager | An item with sizes shows each size with its own price and the chosen size is stored on the order line | FR02 | M | BE, FE2 | No |
| F012 | Sold-out toggle | Server | Marking an item sold out hides it from new carts at once; lifting it restores it | FR02, §5 | M | BE, FE1 | No |
| F013 | Fixed services with staff availability confirmation | Cashier | A limited service (e.g. monitor rental) is only fulfilled after staff confirm it is available | FR02 | M | BE, FE1 | No |
| F014 | Seat-time packages | Manager | Seat time can only be sold from 30 minutes upward in 30-minute steps | FR02 | M | BE | Part |
| F015 | Fee and tax configuration | Owner | Configured fees and taxes appear as separate lines in the quote before payment | FR02 | M | BE | No |
| F016 | Branded customer menu with category filter | Customer | The menu lists available items by category in the venue's theme and has an empty state | FR02 | M | FE2 | Part |

## C. Cart and orders

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F017 | Cart with add, remove, quantity and line note | Customer | Changing quantity or removing a line updates the estimated total before a quote is requested | FR02 | M | FE2 | Part |
| F018 | Server quote with price snapshot and 5-minute expiry | Customer | The quote returns line prices, total and an expiry time; the order uses the quoted prices | FR06 | M | BE | No |
| F019 | Re-quote after expiry | Customer | Confirming an expired quote is refused and the customer must accept a fresh quote | FR06 | M | BE, FE2 | No |
| F020 | Order totals with lines, discount and fees | System | The order total equals the sum of snapshot lines minus discount plus fees, as an integer | FR02 | M | BE | Part |
| F021 | One capped promotion per order | System | Applying a voucher or points to an order that already has a flash sale is refused | FR02 | M | BE | No |
| F022 | Cashier walk-in order | Cashier | A cashier can build and take payment for an order on behalf of a walk-in customer | FR02 | M | FE1, BE | No |
| F023 | Order state machine | System | An order moves draft → awaiting payment → paid → completed; it can be cancelled only before payment | §4 | M | BE | No |
| F024 | Idempotent create and pay commands | System | Repeating a request with the same idempotency key produces one order and one charge | FR02 | M | BE | No |
| F025 | Mixed order activation | System | For an order with items and seat time, items reach fulfilment after payment and the seat is granted only when the reservation confirms | FR02 | M | BE | No |

## D. Payments

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F026 | Online gateway checkout | Customer | A customer can pay an order through the chosen provider's test environment | FR02 | M | BE, FE2 | No |
| F027 | Verified payment webhook | System | A webhook with a bad signature, wrong amount, currency or order ID is rejected; a replayed event changes nothing; a late callback never downgrades a succeeded payment | §4 | M | BE | No |
| F028 | Payment state machine | System | A payment moves initiated → pending → succeeded, failed or expired, and attempts can never collect more than the order balance | §4 | M | BE | No |
| F029 | "Verifying payment" screen | Customer | When the result is unknown the customer sees a verifying state with a recheck action and no prompt to pay again | FR05 | M | FE2 | No |
| F030 | Status-query reconciliation | System | A payment whose callback was lost is settled by querying the provider | §4 | M | BE | No |
| F031 | Cash confirmation tied to a shift | Cashier | Only a cashier or manager with an open shift can mark an order paid in cash, and the shift records it | FR02, FR08 | M | BE, FE1 | No |
| F032 | Double-payment handling | System | If two attempts both succeed, the order is paid once and the excess appears in the refund queue with both receipts kept | §4 | M | BE | No |
| F033 | Payment after hold expiry | System | A late payment confirms the booking only if the seat is still free; otherwise the money is recorded, the customer is told and a refund request is opened | §4 | M | BE | No |

## E. Fulfilment

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F034 | Fulfilment queue | System | Only paid orders enter the queue and move queued → preparing → ready → served | §4 | M | BE | No |
| F035 | Staff ticket board | Server | Staff see open tickets with seat label and items and can advance each ticket's status | FR05 | M | FE1 | No |
| F036 | Customer order progress and own orders | Customer | A customer sees the live status of their own orders and cannot open anyone else's | FR05, §5 | M | FE2, BE | No |
| F037 | Durable retry of the paid-to-fulfilment event | System | If publishing the ticket fails it is retried until it succeeds without creating a second charge | §4 | M | BE | No |
| F038 | Fulfilment cancel separate from refund | Manager | Cancelling a ticket does not refund the order, and refunding does not mark the ticket cancelled or served | §4 | M | BE | No |

## F. 3D space and layout

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F039 | Seat and asset model with stable seat IDs | System | Moving an asset keeps each seat's ID and its bookings; one table asset can carry several seats | FR03 | M | BE | Part |
| F040 | Zones and seat tiers | Manager | Every seat belongs to a tier (e.g. window, quiet, communal) that pricing can target | FR03, FR06 | M | BE, FE1 | No |
| F041 | 3D floor viewer | Customer | The published layout renders in 3D with orbit and pan and the venue's theme | FR03 | M | FE1 | No |
| F042 | Tap-to-select seat | Customer | Tapping a seat in 3D selects the same seat as the list view through `SeatMapProps` | FR03 | M | FE1 | Part |
| F043 | Seat status display | Customer | Free, held, booked, in use, cleaning and locked are each distinguishable by text as well as colour | FR03 | M | FE1 | Part |
| F044 | List and 2D fallback | Customer | With WebGL disabled a customer can still pick a seat and finish a booking | FR03 | M | FE1 | Part |
| F045 | Public map privacy | System | The public map API returns availability only, with no occupant name, phone or order | FR03 | M | BE | No |
| F046 | Editor: approved asset library | Manager | The editor lists only approved GLB/glTF assets the tenant may use; arbitrary upload is not offered | FR03 | M | BE, FE1 | No |
| F047 | Editor: drag, rotate, snap and delete | Manager | An asset can be placed on the floor, snapped to the grid, rotated and removed | FR03 | M | FE1 | No |
| F048 | Editor: bind seats to assets | Manager | A manager can attach or detach a sellable seat on an asset | FR03 | M | FE1, BE | No |
| F049 | Draft, preview and publish | Manager | Publish is refused when seat IDs are duplicated, an asset is off the floor, or a removed seat still has open bookings; the draft can still be saved | FR03 | M | BE, FE1 | No |
| F050 | Optimistic layout versioning | Manager | When two managers edit the same draft, the second save is refused with a conflict instead of overwriting | FR03 | M | BE | No |

## G. Booking and sessions

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F051 | Availability search | Customer | For a date, start time and duration the server returns which seats are free | FR04 | M | BE, FE2 | No |
| F052 | Seat-time quote | Customer | The quote for a seat and duration shows the price before any hold is paid for | FR04, FR06 | M | BE | Part |
| F053 | Five-minute hold | Customer | Starting checkout creates a hold with a payment deadline; the seat is unavailable to others until it expires | FR04 | M | BE | No |
| F054 | Booking confirmed on payment | System | A booking is confirmed only when payment succeeded and the hold is still valid, both checked on the server | FR04 | M | BE | No |
| F055 | Overlap prevention | System | When two customers try to hold the same seat for intersecting times including buffer, exactly one succeeds and the other is offered alternatives | FR04 | M | BE | No |
| F056 | Start-time rules and timezone | Customer | Advance bookings start on 15-minute steps, walk-ins start at server time, and all times display in the branch timezone | FR04 | M | BE, FE2 | No |
| F057 | Check-in window | Customer | The booking owner or a cashier can check in from the start time until 15 minutes after; earlier attempts are refused | FR04 | M | BE, FE2 | Part |
| F058 | Awaiting-handover state | Cashier | If the seat is not ready the booking waits for staff handover and is not turned into a no-show | FR04 | M | BE, FE1 | No |
| F059 | No-show | System | A booking not checked in by the end of the window becomes no-show, releases the rest of its slot and triggers no automatic refund | FR04 | M | BE | No |
| F060 | Checkout, cleaning and buffer | Customer | Ending a session sets the seat to cleaning and frees the remaining slot 10 minutes after the actual end; nothing is refunded | FR04 | M | BE, FE2 | Part |
| F061 | Overtime flag | System | When purchased time ends the session is flagged and staff are notified; no extra charge and no automatic checkout | FR04 | M | BE, FE1 | No |
| F062 | Paid extension | Customer | An extension updates the end time only after the extra time is paid and the following slot plus buffer is free | FR04 | M | BE, FE2 | No |
| F063 | Extension conflict | Customer | When the next slot is taken the customer is told why and shown other seats; the existing booking is unchanged | FR04 | M | BE, FE2 | No |
| F064 | Staff seat transfer | Cashier | Staff can move a booking to a free seat of the same tier with the same times; customers cannot | FR04, §5 | M | BE, FE1 | No |
| F065 | Cancel before check-in | Customer | Cancelling releases the slot and opens a money-handling request under venue policy; it does not refund by itself | FR04 | M | BE, FE2 | No |
| F066 | Merchant live floor | Manager | Staff see every seat's status and remaining time and can lock a seat or mark it cleaned | FR03, FR04 | M | FE1 | Part |

## H. Self-checkout and support

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F067 | Table QR | Customer | Scanning a table QR identifies the venue and seat and grants no access to any booking or session | FR05 | M | BE | No |
| F068 | QR landing page | Customer | After scanning, the customer sees the venue, seat, menu and available services | FR05 | M | FE2 | No |
| F069 | Separate order at an occupied seat | Customer | A second person at an occupied seat can buy items on their own order without seeing or joining the active session | FR05 | M | BE, FE2 | No |
| F070 | Session ownership | Customer | Viewing or acting on a booking requires the original checkout session or a verified booking code | FR05 | M | BE | No |
| F071 | Call staff | Customer | Pressing "Call staff" always creates a support request, with AI switched off or failing | FR05 | M | BE, FE2 | No |
| F072 | Support request lifecycle and queue | Server | Staff see requests by priority and move them open → acknowledged → resolved, with times and handler recorded | FR05, §4 | M | BE, FE1 | No |
| F073 | Note classification | System | A customer note is classified by rules first, then by AI returning `category`, `needs_staff`, `priority`, `reason_code` and `confidence`; the note cannot change an order or price | FR05 | S | BE | No |
| F074 | Mandatory escalation and AI fallback | System | Payment errors, refund or cancel requests, booking conflicts, allergy notes, AI timeouts, malformed output and low confidence all create a staff request, and ordering and payment keep working | FR05 | M | BE | No |

## I. Pricing and flash sales

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F075 | Price rules by tenant, branch, tier and time band | Manager | The quoted seat price follows the most specific active rule and never depends on who the customer is | FR06 | M | BE, FE1 | No |
| F076 | Rule overlap validation | Manager | Publishing two rules with the same priority and overlapping scope and validity is refused | FR06 | M | BE | No |
| F077 | Multi-band pricing | System | A booking spanning two time bands is priced per segment and rounded once on the line total | FR06 | M | BE | No |
| F078 | Price breakdown and price stability | Customer | The breakdown is shown before payment; changing a rule later does not alter paid bookings, and extensions use the price at the time of extension | FR06 | M | BE, FE2 | No |
| F079 | Flash sale definition | Manager | A flash sale has scope, start, end, discount, discount cap and a quota of uses | FR06 | M | BE, FE1 | No |
| F080 | Flash sale quota | System | Quota is held at checkout, consumed on payment and returned when a hold expires; it cannot be oversold under concurrency | FR06 | M | BE | No |
| F081 | Occupancy and revenue dashboard | Manager | A manager sees occupancy by time band and tier, revenue and item volume over time | FR06 | S | FE1, BE | No |
| F082 | Pricing and flash sale suggestions | Manager | Suggestions come from configured thresholds and, with enough data, AI explanations; each is re-checked against floor price, discount cap and quota before it can be saved | FR06 | S | BE | No |
| F083 | Approve, stop and broadcast | Manager | Prices do not change until a manager approves; approval records who, why, version and validity; an approved sale shows as a banner to customers and can be stopped for new purchases | FR06, §4 | M | BE, FE1, FE2 | No |

## J. Loyalty

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F084 | Guest checkout | Customer | A customer can order and pay without an account | FR07 | M | BE, FE2 | No |
| F085 | Membership with OTP and consent | Customer | Joining requires OTP verification and explicit consent, is scoped to one tenant, and the member can leave | FR07 | M | BE, FE2 | No |
| F086 | Points ledger | System | Points are pending at payment and available after service completes, and are granted once per eligible transaction | FR07 | M | BE | No |
| F087 | Earn, redeem and cap configuration | Owner | The tenant sets the earn formula, redeem rate and redemption cap; points have no cash value | FR07 | M | BE, FE1 | No |
| F088 | Points hold and redeem | Customer | Points are held when the order is created and deducted after payment; two simultaneous redemptions cannot overspend the balance | FR07 | M | BE | No |
| F089 | Refund reversal and points debt | System | A refund reverses earned points for the refunded value and returns redeemed points; if earned points were already spent, a debt is recorded and redemption is blocked while the balance is not positive | FR07 | M | BE | No |
| F090 | Behaviour stats and rule-based suggestions | Manager | Visits, usual time band, total duration, favourite item group, spend and recency are tracked; a personal suggestion needs at least 3 completed orders | FR07 | M | BE | No |
| F091 | AI offer suggestions and member page | Manager | AI may propose only one of the allowed offer templates; customers see an offer on the member page only after a manager approves it, and a generic offer is used when AI fails | FR07 | S | BE, FE1, FE2 | No |

## K. Shifts, refunds and reports

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F092 | Open shift | Cashier | A cashier opens a shift with an opening float; cash cannot be confirmed without an open shift | FR08 | M | BE, FE1 | No |
| F093 | Close shift | Cashier | Closing records counted cash and the manager sees the variance and revenue by payment method | FR08 | M | BE, FE1 | No |
| F094 | Pending-payment reconciliation | Cashier | At close, in-flight payments are either settled or listed as pending; order amounts cannot be edited to balance the shift | FR08 | M | BE | No |
| F095 | Refund request and approval | Manager | A manager approves a full or partial refund by line value, never above the amount collected and not yet refunded | FR08, §5 | M | BE, FE1 | No |
| F096 | Refund execution | System | The refund goes through the gateway API or a manual record with evidence and confirmer; it is stored as an adjustment entry and counts only once confirmed paid | FR08, §4 | M | BE | No |
| F097 | Daily and shift report | Manager | The report shows net revenue after refunds, order count, hours sold, seat occupancy and support request count | FR08 | M | BE, FE1 | No |
| F098 | Permissioned exports | Owner | Managers export revenue for their branch; only the owner can export the customer list | FR08, §5 | M | BE | No |

## L. Platform

| ID | Feature | Actor | Acceptance check | PRD | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F099 | Audit log | Owner | Cash confirmation, refunds, price approvals, layout publishes and permission changes each record actor, time and target | FR01, §5 | M | BE | No |
| F100 | Demo adapter and network states | System | The app runs against either the local demo adapter with its simulator bar or the real API, and every network screen has loading, error, retry and empty states | §4 | M | FE1, FE2 | Part |

## Summary

| Area | Features | Must | Should |
| --- | --- | --- | --- |
| A. Tenant, brand and access | 9 | 9 | 0 |
| B. Menu and catalogue | 7 | 7 | 0 |
| C. Cart and orders | 9 | 9 | 0 |
| D. Payments | 8 | 8 | 0 |
| E. Fulfilment | 5 | 5 | 0 |
| F. 3D space and layout | 12 | 12 | 0 |
| G. Booking and sessions | 15 | 15 | 0 |
| H. Self-checkout and support | 8 | 7 | 1 |
| I. Pricing and flash sales | 9 | 7 | 2 |
| J. Loyalty | 8 | 7 | 1 |
| K. Shifts, refunds and reports | 7 | 7 | 0 |
| L. Platform | 2 | 2 | 0 |
| **Total** | **100** | **96** | **4** |

If scope has to shrink, cut the four "Should" rows first (F073, F081, F082, F091): they are the AI and analytics richness, and the rules they sit on top of stay.

## Out of MVP

Not counted above and not to be built for the pilot:

- Metered pay-as-you-go seat billing, automatic overtime charges, and bundles with an included drink (in the older plan and the current demo's billing policy).
- Ingredient stock, recipes, e-invoices, accounting, bill splitting, customer credit.
- Free-form architecture modelling, space scanning, VR/AR, multi-user editing, venue-uploaded 3D assets.
- Custom domains, per-brand native apps, asset marketplace.
- AI that refunds, resolves disputes, changes prices by itself, or prices per individual customer; camera recognition.
- Group bookings across seats, unlimited memberships, external calendar sync.
- Churn prediction, custom-trained models, automated SMS or email campaigns.
- Offline operation, POS hardware integration, SLAs.
