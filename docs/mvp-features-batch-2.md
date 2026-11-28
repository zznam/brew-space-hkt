# MVP feature spec — batch 2 (F101–F200)

Status: specification only. Nothing in this file is implemented unless the "Demo" column says so.

This is a second brainstorm of 100 features. It continues the numbering of the [first 100-feature spec](mvp-features.md) and repeats none of its rows. The [MVP requirements (PRD)](../.beads/artifacts/vhk-qwb/prd.md) remain the acceptance authority, and the ground rules of the first spec (integer money, server authority, prepaid seat time, AI only suggests) apply here unchanged.

The rows come from two places:

- PRD requirements that the first spec does not list as their own row, mostly permissions (§5), non-functional requirements (§9) and pilot readiness (§10–§12).
- Customer ideas rated P0 or P1 in the [user features brainstorm](user-features-brainstorm.md), cited by their `U-` ID.

## Read this before planning

The first spec already holds 96 must-have rows for one BE and two FE over 10–12 weeks. This batch is not a second commitment of the same size:

- **M** rows (47) are gaps: the PRD requires them for pilot but F001–F100 does not name them. They need to be planned into the existing tasks or explicitly waived by the product owner.
- **S** rows (45) are cheap additions for after the core flow is stable. None should start before booking and payment pass their checks.
- **C** rows (8) are candidates to revisit with pilot data.

## Legend

| Column | Values |
| --- | --- |
| Actor | Owner, Manager, Cashier, Server, Customer, Platform (platform admin), System |
| Source | PRD `FR01`–`FR08`, `§n` (PRD section), `Tnn` (PRD task), `U-…` (user features brainstorm) |
| Pri | **M** = pilot gap; **S** = after the core flow is stable; **C** = candidate, decide with pilot data |
| Own | BE, FE1 (merchant and shared UI), FE2 (customer), per [CONTRIBUTING.md](../CONTRIBUTING.md); the first name leads |
| Demo | What the local demo does today: Yes, Part (simulated or incomplete), No |

## M. Access, security and privacy

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F101 | Guest order token | Customer | A guest reads their order only with an unguessable, scoped, expiring token; lookup by sequential ID or phone number is refused | §5 | M | BE | No |
| F102 | Booking recovery on another device | Customer | Entering a valid booking code on a new device restores access; repeated wrong codes are throttled | FR05, §5 | M | BE, FE2 | No |
| F103 | Rate limits on sign-in, OTP, checkout and AI | System | Exceeding the configured rate on each of the four endpoints returns a throttled error and normal use is unaffected | §9 | M | BE | No |
| F104 | Time-boxed platform support grant | Platform | A platform admin reads tenant business data only under a grant with a reason and expiry; the grant and each access are audited | §5 | M | BE | No |
| F105 | Suspend and reactivate a tenant | Platform | A suspended tenant refuses staff sign-in and new orders, keeps its data, and works again after reactivation | §5 | M | BE | No |
| F106 | Staff password reset and sign-out everywhere | Cashier | After a reset, every earlier session of that staff member is refused on its next call | FR01 | S | BE, FE1 | No |
| F107 | Quick staff switch on a shared tablet | Cashier | Staff switch with a PIN without a full sign-out, and each action records the person who actually did it | §5 | S | FE1, BE | No |
| F108 | Member data deletion request | Customer | A member can ask for deletion; an authorised person processes it and identifying data is removed while reporting totals stay | FR07, §11, U-L09 | M | BE, FE2 | No |
| F109 | Privacy and data-use screen | Customer | A page states what is stored, for how long, and what is sent to AI, and is reachable before joining loyalty | U-A05 | S | FE2 | No |
| F110 | Log redaction | System | Application logs contain no payment details, OTP codes or access tokens when a checkout and a sign-in are traced end to end | §9 | M | BE | No |
| F111 | Retention settings for customer data, AI logs and audit | Owner | Records older than the configured period are removed or anonymised by a scheduled job, and the setting change is audited | §9, §11 | M | BE | No |
| F112 | Audit log viewer | Owner | The owner filters audit events by actor, action type and date; managers see only their branch | §5, §9 | S | FE1, BE | No |

## N. Catalogue and ordering extras

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F113 | Item modifiers (sugar, ice, milk) | Customer | Chosen modifiers are stored on the order line, priced by the server and printed on the staff ticket | §6.1, U-S02 | M | BE, FE2 | No |
| F114 | Item photo and description | Manager | A manager attaches a size-limited image and text to an item; other file types are refused | FR02 | S | BE, FE1 | No |
| F115 | Allergen and dietary tags | Manager | Tags show on the item and can be filtered; an allergy note still goes to staff regardless of tags | FR05, U-L11 | S | BE, FE2 | No |
| F116 | Menu search | Customer | Typing part of an item name lists matching available items across categories, with an empty state | FR02 | S | FE2 | Yes |
| F117 | Item availability by time band | Manager | An item limited to a time band cannot be added to a cart outside it | FR02 | C | BE | No |
| F118 | Fixed-price combos | Manager | A combo sells as one line at one price, lists its parts on the ticket and counts as the order's single promotion if discounted | FR02, FR06 | C | BE, FE1 | No |
| F119 | Pre-order with a booking | Customer | Items bought with an advance booking enter the fulfilment queue at check-in, not at payment | U-B11 | S | BE, FE2 | No |
| F120 | Reorder the last order | Customer | "Same as last time" rebuilds the cart from the previous order at current prices and skips sold-out items with a notice | U-S09 | S | FE2, BE | Yes |
| F121 | Pause new food and drink orders | Manager | While paused, new item orders are refused with a clear message and seat-time sales continue | FR06 | S | BE, FE1 | No |
| F122 | Bulk menu import | Manager | A CSV import shows a preview with per-row errors and creates nothing until confirmed | FR01 | S | BE, FE1 | No |

## O. Payments and receipts

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F123 | Pay at counter from the phone | Customer | Choosing cash leaves the order awaiting payment with an expiry until a cashier confirms it; nothing is fulfilled before that | FR02, U-P03 | M | BE, FE2, FE1 | No |
| F124 | Digital receipt | Customer | A paid order shows a receipt with lines, discount, fees, total, payment method and time in the branch timezone | U-P05 | S | FE2, BE | Yes |
| F125 | Receipt by email | Customer | If the customer enters an address the receipt is sent once; the address is not used for marketing | U-P05 | C | BE | No |
| F126 | Customer refund request | Customer | The owner of a paid order can request a refund with a reason; it enters the manager's queue and refunds nothing by itself | §5, U-P07 | M | BE, FE2 | No |
| F127 | Refund status for the customer | Customer | The customer sees requested, approved, paid or declined and never sees "refunded" before the money is confirmed | FR08, T08 | M | FE2, BE | No |
| F128 | Money exceptions queue | Manager | Excess payments, late payments and unresolved pending payments are listed with their evidence until someone resolves each one | §4, T08 | M | FE1, BE | No |
| F129 | Gateway outage mode | System | When the provider is unreachable, online checkout is disabled with a pay-at-counter message and no order is left half paid | §9 | S | BE, FE2 | No |
| F130 | Cash movements during a shift | Cashier | Cash put in or taken out with a reason is included in the expected cash at close | FR08 | C | BE, FE1 | No |

## P. Discovery and seat choice

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F131 | Venue page with hours, address and tier prices | Customer | The venue page shows opening hours, address and the seat price table by tier before any seat is chosen | FR01, FR06, U-D01 | M | FE2 | Part |
| F132 | Live capacity summary | Customer | The page shows free seats out of total by tier as counts only, with no occupant data | U-D02 | S | BE, FE2 | No |
| F133 | Seat amenity filters | Customer | Filtering by power outlet, window, quiet or monitor narrows both the 3D view and the list to the same seats | U-D04 | S | FE2, FE1 | No |
| F134 | Zone vibe labels | Manager | A zone label such as silent, discussion or phone-call area shows on the map and the seat card | U-D08 | S | FE1, BE | No |
| F135 | Seat detail card | Customer | Selecting a seat shows its tier, amenities, status and price for the chosen time before checkout | FR03, U-B01 | M | FE2 | Part |
| F136 | Hold countdown | Customer | The checkout shows time left on the hold from server time, and on expiry the customer is returned to seat choice | FR04, U-B03 | M | FE2 | No |
| F137 | Shareable seat and time link | Customer | The link opens the venue with the seat and time preselected and carries no personal or booking data | U-D07 | S | FE2 | No |
| F138 | Favourite seat and one-tap rebook | Customer | A member pins a seat; rebooking uses it if free and otherwise offers seats of the same tier | U-B06 | S | FE2, BE | No |
| F139 | Add to calendar | Customer | A confirmed booking downloads as an `.ics` file with venue, seat and times in the branch timezone | U-B10 | S | FE2 | No |
| F140 | Opening hours and special closures enforced | Manager | A booking or extension outside opening hours or on a closed day is refused by the server | FR01, FR04 | M | BE, FE1 | No |

## Q. Arrival and in-session

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F141 | Walk-in from a free seat's QR | Customer | Scanning a free seat's QR lets a guest buy time starting now without an account, through the normal hold and payment | FR04, FR05, U-C05 | M | FE2, BE | Part |
| F142 | Session dashboard | Customer | The session owner sees seat, time left by server time, orders placed and total spent in the session | FR04, U-S01 | M | FE2 | Part |
| F143 | Ending-soon reminder | Customer | Fifteen minutes before the end the customer is offered an extension if the next slot is free, or other seats if not | FR04, U-S07 | M | FE2, BE | No |
| F144 | Booking reminder | Customer | A reminder is sent 30 minutes before the start through the one channel chosen for the pilot, only to customers who opted in | U-C02 | S | BE, FE2 | No |
| F145 | Running-late notice | Customer | Staff see the notice on the booking; the check-in window does not change | U-C03 | S | FE2, FE1 | No |
| F146 | Wifi and house rules after check-in | Customer | Wifi details and rules appear only after check-in and never on the public venue page | U-C06 | S | FE2, BE | No |
| F147 | Seat issue report | Customer | A report (broken outlet, weak wifi, dirty table) is tied to the seat and appears in the support queue | U-S12 | S | FE2, BE | No |
| F148 | Seat-change request | Customer | The customer asks to move; only staff can carry out the transfer | FR04, U-S13 | S | FE2, FE1 | No |
| F149 | Post-session rating | Customer | After checkout the customer can rate seat, drinks and service; ratings go to the venue privately | U-X04 | S | FE2, BE | No |
| F150 | Stepping-away marker | Customer | "Back in 15 minutes" shows on the live floor so staff do not clear the table; it does not pause paid time | U-S15 | C | FE2, FE1 | No |
| F151 | Mid-session offer | Customer | After a configured time in session the customer sees one manager-approved offer and no more than one per session | U-S11 | C | BE, FE2 | No |
| F152 | Order time estimate | Customer | A queued order shows an estimate from recent preparation times, or no estimate when data is thin | U-S03 | C | BE, FE2 | No |

## R. Staff operations

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F153 | Booking timeline by seat | Cashier | Staff see today's bookings, holds and buffers per seat on a timeline and can open any booking from it | FR04, §7 | M | FE1 | No |
| F154 | Staff-created booking | Cashier | A cashier books a seat for a phone or walk-in customer through the same availability, hold and payment rules | FR04 | M | FE1, BE | No |
| F155 | Manual session correction | Manager | A manual check-in or check-out time needs a reason and is audited; paid amounts are not changed | §9 | M | BE, FE1 | No |
| F156 | Scheduled seat lock with reason | Manager | A seat locked for a period cannot be booked in it, and locked minutes are excluded from occupancy | FR03, FR08 | M | BE, FE1 | No |
| F157 | Staff alerts panel | Cashier | Overtime sessions, bookings awaiting handover and payment exceptions appear in one list, each with a link to act | FR04, §4 | M | FE1 | No |
| F158 | Reinstate a late arrival | Cashier | Staff can check in a no-show booking if its seat is still free for the remaining time; otherwise they are shown other seats | FR04 | M | BE, FE1 | No |
| F159 | Server-role limited view | Server | A server sees tickets and seat information only; revenue, customer contact details and exports are refused by the API | §5 | M | BE, FE1 | No |
| F160 | Cleaning queue | Server | Seats in cleaning are listed oldest first and one tap marks a seat ready | FR04 | S | FE1 | No |
| F161 | New ticket and request alert | Server | A new ticket or support request raises a visible and optional sound alert on the staff screen | FR05 | S | FE1 | No |
| F162 | Staff note on a booking or session | Cashier | A note is visible to staff of that branch only and never to the customer | FR04 | S | BE, FE1 | No |
| F163 | Different-tier transfer as an adjustment | Manager | Moving a booking to another tier needs a manager, records the price difference as an adjustment and keeps the original snapshot | FR04 | S | BE, FE1 | No |

## S. Layout and space operations

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F164 | Printable seat QR sheet and code rotation | Manager | A manager prints a QR per seat; regenerating a seat's code makes the old one stop resolving | FR05 | M | BE, FE1 | No |
| F165 | Asset size budget check | System | An asset above the agreed size or triangle budget cannot enter the approved library | §9 | M | BE, FE1 | No |
| F166 | 3D loads after the menu | Customer | On a mid-range Android phone the menu and prices are usable before the 3D view finishes loading, and a failed 3D load does not block checkout | §9 | M | FE2, FE1 | No |
| F167 | Layout templates | Manager | A new venue can start from a template layout and edit it; this is also the fallback if the editor is cut back at week 4 | §1.3, §7.1 | S | FE1, BE | No |
| F168 | Seat amenity attributes | Manager | Each seat records outlet, window, monitor and similar attributes that filters and the seat card read | FR03, U-D04 | S | BE, FE1 | No |
| F169 | Editor undo and redo | Manager | The last 20 editor actions can be undone and redone before saving | FR03 | S | FE1 | No |
| F170 | Layout version history and rollback | Manager | A previous published version can be republished through the same publish validation | FR03 | S | BE, FE1 | No |

## T. Pricing, promotions and loyalty extras

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F171 | Cancellation and no-show policy shown before payment | Owner | The venue's configured policy text appears on the booking checkout and is stored with the booking | FR04, §11 | M | BE, FE2 | No |
| F172 | Floor price and maximum discount guardrails | Owner | No rule, sale or suggestion can be saved if it prices below the floor or discounts above the cap | FR06, §11 | M | BE, FE1 | No |
| F173 | Voucher codes | Manager | A voucher has a value, cap, validity and usage limit; an expired, exhausted or unknown code is refused with a reason | FR02 | M | BE, FE1, FE2 | No |
| F174 | Member points wallet | Customer | A member sees pending and available points and each ledger entry with its order | FR07, U-L02 | M | FE2 | No |
| F175 | Price check tool | Manager | For a seat, date and duration the manager sees the price and which rules produced it, without creating a hold | FR06 | S | FE1, BE | No |
| F176 | Sale seats highlighted on the map | Customer | Seats covered by an active flash sale are marked in 3D and in the list by text as well as colour | U-L10 | S | FE1, FE2 | No |
| F177 | Sale performance report | Manager | For each sale the manager sees uses, total discount given and revenue of the orders that used it | FR06 | S | BE, FE1 | No |
| F178 | Member lookup at the counter | Cashier | A cashier attaches a counter order to a member only after the member confirms by OTP | FR07 | S | BE, FE1 | No |
| F179 | Member spend and hours history | Customer | A member sees hours used and spend by month for this tenant only | U-P06 | S | FE2, BE | No |
| F180 | Saved drink preferences | Customer | Saved preferences prefill modifiers; a saved allergy still raises a staff request on every order | U-L11 | S | FE2, BE | No |
| F181 | Usual-flow card | Customer | After three completed orders a member is offered their usual seat, duration and item in one tap, through the normal quote | FR07, U-L04 | S | BE, FE2 | No |

## U. AI controls

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F182 | AI off switch per tenant | Owner | With AI off, support notes go to staff by rules and suggestions stop; ordering, booking and payment are unchanged | §9 | M | BE, FE1 | No |
| F183 | AI budget per tenant | Platform | When the tenant's token or spend limit is reached, AI calls stop and the rule fallback takes over | §9 | M | BE | No |
| F184 | AI run log | System | Each AI call stores model and prompt version, reduced input, output, validation result and approver if any | §9 | M | BE | No |
| F185 | Personal data removed before AI calls | System | Names and phone numbers are stripped from support notes, and pricing and loyalty prompts carry only aggregates or internal IDs | §9 | M | BE | No |
| F186 | Staff correction of AI classification | Server | Staff can change a request's category or priority and the correction is stored against the AI run | §9 | S | BE, FE1 | No |
| F187 | Suggestion outcome tracking | Manager | Approve and reject decisions with reasons are counted per prompt version | §9 | S | BE | No |
| F188 | Read-only venue assistant | Customer | The assistant answers availability and menu questions from published data and cannot book, pay or change anything | U-A06 | C | BE, FE2 | No |

## V. Reliability and pilot operations

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F189 | Daily backup and restore drill | System | Staging is restored from a backup before pilot, and transactions after the backup are reconciled from the provider | §9 | M | BE | No |
| F190 | Correlation ID across order, payment and support | System | One ID finds an order's API calls, payment events and support requests in the logs | §9 | M | BE | No |
| F191 | Error tracking and health alerts | System | An unhandled API or client error and a failing webhook or job each raise an alert to the on-call person | §12 | M | BE, FE1, FE2 | No |
| F192 | Bounded polling with write-time recheck | System | Open screens refresh every 5 to 10 seconds, stop when hidden, and every write is revalidated by the server | §6.2 | M | FE1, FE2 | No |
| F193 | Connection-loss banner | Customer | When offline the app says so and blocks confirming any transaction whose result it cannot learn | §9, U-A04 | M | FE2, FE1 | No |
| F194 | Performance budgets and load test | System | At the §9 test load the business APIs stay under 800 ms p95 and the customer menu is usable within 3 seconds on the pilot Android device | §9 | M | BE, FE2 | No |
| F195 | Pilot metrics capture | Manager | Time from open to hold, no-show rate, extension rate and payment exception count are reported for the pilot period | §10.2 | M | BE | No |
| F196 | In-app staff exception guide | Cashier | Staff can open the procedure for each exception state (pending payment, late arrival, refund) from the screen where it occurs | §12 | M | FE1 | No |
| F197 | Stale client handling | System | A client older than the API's minimum version is told to reload instead of failing on a changed contract | §6.2 | S | BE, FE1, FE2 | No |

## W. Accessibility and language

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F198 | Labelled, keyboard-operable forms | Customer | Checkout and POS forms can be completed by keyboard alone and each field has a label and a readable error | §9 | M | FE1, FE2 | Part |
| F199 | Vietnamese and English | Customer | Every customer screen switches between the two languages; money and times keep the branch formats | U-A01 | S | FE2, FE1 | No |
| F200 | Dark mode and reduced motion | Customer | With reduced motion set, 3D transitions and pulsing effects are off and all functions still work | U-A03 | S | FE1, FE2 | No |

## Summary

| Area | Features | M | S | C |
| --- | --- | --- | --- | --- |
| M. Access, security and privacy | 12 | 8 | 4 | 0 |
| N. Catalogue and ordering extras | 10 | 1 | 7 | 2 |
| O. Payments and receipts | 8 | 4 | 2 | 2 |
| P. Discovery and seat choice | 10 | 4 | 6 | 0 |
| Q. Arrival and in-session | 12 | 3 | 6 | 3 |
| R. Staff operations | 11 | 7 | 4 | 0 |
| S. Layout and space operations | 7 | 3 | 4 | 0 |
| T. Pricing, promotions and loyalty extras | 11 | 4 | 7 | 0 |
| U. AI controls | 7 | 4 | 2 | 1 |
| V. Reliability and pilot operations | 9 | 8 | 1 | 0 |
| W. Accessibility and language | 3 | 1 | 2 | 0 |
| **Total** | **100** | **47** | **45** | **8** |

If scope has to shrink, drop C first, then S. An M row can only be dropped by the product owner waiving the PRD requirement it cites.

## Open decisions these rows depend on

| Decision | Rows | Reference |
| --- | --- | --- |
| Notification channel for reminders (web push, Zalo OA, SMS or email) and who pays | F144 | User brainstorm §11 |
| Retention periods for customer data, AI logs and audit | F108, F111, F184 | §11 |
| Floor price, discount cap and AI budget values | F172, F183 | §11 |
| Cancellation, no-show and refund policy wording | F171, F126 | §11 |
| Whether customers see live seat counts or only "seats available" | F132 | User brainstorm §11 |
| Whether English is needed at pilot | F199 | User brainstorm §11 |
| Asset size budget from week 1 device tests | F165, F166 | §9 |

## Still out of MVP

The "Out of MVP" list in the [first spec](mvp-features.md#out-of-mvp) stands. From the user brainstorm, these stay out as well: waitlists, recurring bookings, group bookings, prepaid wallets and hour bundles, bill splitting, VAT invoices, membership tiers, badges and streaks, referrals, events, venue news feed, in-venue way-finding, focus timer, seat comparison and social seating.
