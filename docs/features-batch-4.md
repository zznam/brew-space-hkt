# Feature spec — batch 4 (F301–F520), post-pilot backlog

Status: specification only. Nothing in this file is implemented unless the "Demo" column says so.

This is a fourth brainstorm, of 220 features. It continues the numbering of the [first spec](mvp-features.md) (F001–F100), [batch 2](mvp-features-batch-2.md) (F101–F200) and [batch 3](mvp-features-batch-3.md) (F201–F300) and repeats none of their rows. The ground rules of the first spec (integer money, server authority, prepaid seat time, AI only suggests) apply here unchanged.

Unlike the first three files, this one is not an MVP spec. The [MVP requirements (PRD)](../.beads/artifacts/vhk-qwb/prd.md) remain the acceptance authority for the pilot, and none of these rows is needed to pass it. The rows come from four places:

- The three "Out of MVP" lists. Each excluded idea is written down here as a testable row so it can be sized and argued about, not because the exclusion has been lifted.
- The [user features brainstorm](user-features-brainstorm.md), section 8 (community), which no earlier spec turns into rows.
- Things the Expo demo already shows that no spec row names: the focus timer, badges and streaks, the referral code, and AI venue setup from notes and uploads.
- New areas a cafe and coworking operator meets after the first branch is running: rooms, corporate accounts, several branches, hardware, staffing and stock.

## Read this before planning

F001–F300 already hold 159 must-have rows for one BE and two FE. Nothing here should start before the pilot gates pass.

- **S** rows (42) extend a flow the MVP already defines and reverse no scope decision. They can be picked up one at a time once the flow they extend is stable.
- **C** rows (77) are candidates. Decide each with pilot data; several are cheap but unproven.
- **P** rows (101) are post-MVP: each sits on, or depends on, an "Out of MVP" exclusion. The product owner has to reopen that exclusion before the row is planned.

Rows inside a section are ordered so that the earlier ones can ship without the later ones. A row that needs another row names it in "Source".

## Legend

| Column | Values |
| --- | --- |
| Actor | Owner, Manager, Cashier, Server, Customer, Company admin (section BD), Platform (platform admin), System |
| Source | `Out1`, `Out2`, `Out3` (on the "Out of MVP" list of the first spec, batch 2 or batch 3), `U-…` ([user features brainstorm](user-features-brainstorm.md)), `Fnnn` (extends or needs that row), `Demo` (already visible in the Expo demo), `New` |
| Pri | **S** = extends a stable MVP flow; **C** = candidate, decide with pilot data; **P** = post-MVP, needs an "Out of MVP" exclusion reopened |
| Own | BE, FE1 (merchant and shared UI), FE2 (customer), per [CONTRIBUTING.md](../CONTRIBUTING.md); the first name leads |
| Demo | What exists today: Yes, Part (simulated or incomplete in the Expo demo), No |

Section letters continue from batch 3 (AG). The letter pair "AI" is skipped so that a section name is never confused with the AI features.

## AH. Group and recurring bookings

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F301 | Multi-seat group booking | Customer | One booking holds 2–8 seats for the same time; the hold, the payment and the confirmation succeed or fail for all seats together | Out1, F053 | P | BE, FE2 | No |
| F302 | Adjacent-seat suggestion | Customer | Asking for N seats proposes sets that share a table or zone; when no such set is free the customer is told and offered a split set | F301 | P | BE, FE2 | No |
| F303 | Guest invite link | Customer | Each guest who opens the booker's link is attached to one seat of the booking and sees neither the booker's phone number nor the payment | F301, F137 | P | BE, FE2 | No |
| F304 | Per-guest check-in | Customer | Each guest checks in their own seat; a seat not checked in follows the no-show rule on its own and does not release the others | F301, F057 | P | BE, FE2 | No |
| F305 | Shrink a group before check-in | Customer | Removing a seat before the cancellation cut-off frees that seat and opens a refund request for that seat only | F301, F065 | P | BE, FE2 | No |
| F306 | Shared group order | Customer | Guests of one booking add lines to a shared order; each line shows who added it and only the adder or the booker can remove it | F301, F017 | P | BE, FE2 | No |
| F307 | Weekly recurring booking | Customer | A series repeats the same seat and time for a chosen number of weeks; each occurrence is priced and paid on its own, and an occurrence that conflicts is listed as not booked | Out2 | P | BE, FE2 | No |
| F308 | Skip or cancel one occurrence | Customer | Cancelling one occurrence follows the normal cancellation policy and leaves the rest of the series unchanged | F307, F065 | P | BE, FE2 | No |
| F309 | Recurring series list for staff | Manager | A manager sees every series with its next occurrence and can end one with a reason; ending never cancels a paid occurrence without a refund request | F307 | P | BE, FE1 | No |
| F310 | Sit near a friend | Customer | Two customers can ask to be shown each other's seat; neither sees the other's seat until both accept, and either can withdraw | U-X01, Out2 | P | BE, FE2 | No |

## AJ. Waitlist and demand

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F311 | Waitlist for a full time slot | Customer | A customer joins a waitlist for a tier and time window when no seat is free; joining holds nothing and promises no position | Out2, F051 | P | BE, FE2 | No |
| F312 | Waitlist offer with a timed hold | System | When a matching seat frees, the first entry gets an offer with a five-minute hold; an unanswered offer passes to the next entry | F311, F053 | P | BE | No |
| F313 | Leave or expire a waitlist entry | Customer | A customer can leave at any time; an entry expires by itself at the end of its window and sends no offer afterwards | F311 | P | BE, FE2 | No |
| F314 | One winner per freed seat | System | Offers never outnumber freed seats; two customers accepting at once get one confirmation and one clear refusal | F311, F055 | P | BE | No |
| F315 | Walk-in queue at the door | Cashier | Staff add a walk-in party with a name and size; the queue shows the order of arrival and who has been called | New | C | BE, FE1 | No |
| F316 | Queue status page | Customer | A queued party opens a page by code, without an account, and sees whether they are waiting, called or removed | F315 | C | BE, FE2 | No |
| F317 | Estimated wait | System | The wait shown is derived from booked session ends, is labelled as an estimate, and is hidden when there is too little data | F315 | C | BE, FE2 | No |
| F318 | Alert when a favourite seat is free | Customer | A member can ask for one alert when a favourite seat is free in a chosen window; the alert holds nothing | F138 | C | BE, FE2 | No |
| F319 | Usually-quiet times on the venue page | Customer | The venue page shows quiet and busy time bands from the last four weeks of occupancy and uses no individual customer's data | F131, F132 | S | BE, FE2 | No |
| F320 | Waitlist conversion report | Manager | A report shows entries, offers, accepted offers and expired offers per day | F311 | P | BE, FE1 | No |

## AK. Meeting rooms and private spaces

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F321 | Room as a bookable resource | Manager | A room is one bookable unit with a capacity; it is never sold seat by seat and appears in availability search as a room | F250 | S | BE, FE1 | No |
| F322 | Room hourly price and minimum duration | Manager | A room has its own hourly price and minimum length; a shorter request is refused with the minimum stated | F321, F075 | S | BE, FE1 | No |
| F323 | Room equipment list | Customer | The room card lists fixed equipment (screen, whiteboard, speakerphone) set by the manager | F321, F168 | S | FE2, BE | No |
| F324 | Room add-ons at booking | Customer | Optional add-ons (projector, flip chart) are priced lines on the booking quote and are limited by the number the venue owns | F321, F013 | C | BE, FE2 | No |
| F325 | Catering pre-order with lead time | Customer | Food for a room can be ordered only up to a configured lead time before the start; later requests are refused with the cut-off shown | F321, F119 | C | BE, FE2 | No |
| F326 | Room check-in by code | Customer | The booker checks in with the booking code at the room; the room stays locked to others during the check-in window | F321, F057 | S | BE, FE2 | No |
| F327 | Room overrun warning | System | Ten minutes before a room booking ends, the occupant and staff are told whether another booking follows | F321, F143 | S | BE, FE1 | No |
| F328 | Room turnaround checklist | Server | A room becomes available again only after staff tick the reset checklist or a manager overrides it with a reason | F321, F160 | C | FE1, BE | No |
| F329 | Room deposit | Customer | A configured part of the room price is paid at booking and the rest at check-in; the cancellation policy states what happens to the deposit | F321, Out3 | P | BE, FE2 | No |
| F330 | Private hire enquiry | Customer | A customer sends an enquiry for a zone or the whole venue; a manager replies with a quote, and accepting it creates a scheduled lock | F156 | C | BE, FE1 | No |

## AL. Passes, memberships and wallet

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F331 | Hour bundle | Customer | A member buys a bundle of hours used across visits; every use and refund is a ledger entry and the balance is never negative | Out2, F014 | P | BE, FE2 | No |
| F332 | Bundle validity period | Manager | A bundle has an expiry date shown before purchase; expired hours are removed by a ledger entry, not by editing the balance | F331 | P | BE, FE1 | No |
| F333 | Day pass | Customer | A day pass covers one tier for one calendar day in the branch timezone; leaving and returning the same day needs no new payment | Out2 | P | BE, FE2 | No |
| F334 | Monthly membership with a fair-use cap | Customer | A monthly plan includes a stated number of hours; use beyond it is priced normally and the member sees hours left | Out1 | P | BE, FE2 | No |
| F335 | Plan renewal reminder and cancel | Customer | A member is reminded before renewal and can cancel in the app; cancelling stops the next charge and keeps the paid period | F334 | P | BE, FE2 | No |
| F336 | Pause a plan | Customer | A member can pause a plan once per period for a bounded time; the end date moves by the paused days | F334 | P | BE, FE2 | No |
| F337 | Prepaid wallet top-up | Customer | A member tops up a balance by the online gateway; the balance changes only after a verified payment | Out2, F027 | P | BE, FE2 | No |
| F338 | Pay with wallet balance | Customer | Wallet balance can pay all or part of an order; the rest goes to another method and a failed second payment restores the balance | F337 | P | BE, FE2 | No |
| F339 | Gift card | Customer | A gift card is bought for a fixed value and redeemed once by code into the recipient's wallet; a used code is refused | F337 | P | BE, FE2 | No |
| F340 | Transfer bundle hours to another member | Customer | A member sends hours to another member of the same venue; both ledgers record it and it cannot be undone by the sender | F331 | P | BE, FE2 | No |

## AM. Bill splitting, tips and payment methods

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F341 | Split a bill evenly | Customer | An order is split into N equal parts whose sum equals the total to the đồng; the order is paid only when every part is paid | Out1 | P | BE, FE2 | No |
| F342 | Split a bill by item | Customer | Each payer picks lines; every line belongs to exactly one payer before any payment starts | Out1 | P | BE, FE2 | No |
| F343 | Unpaid share handling | Cashier | If one share stays unpaid past its expiry, staff see the remaining amount and can collect it at the counter | F341 | P | BE, FE1 | No |
| F344 | Pay for another seat | Customer | A customer pays the open order of another seat after that seat's owner accepts; the payer sees only the amount | F070 | C | BE, FE2 | No |
| F345 | Tip at checkout | Customer | An optional tip is added as its own amount, is never discounted or taxed as a sale, and is shown on the receipt | New | C | BE, FE2 | No |
| F346 | Tip report by shift | Manager | Tips are reported per shift and per method, apart from sales | F345, F097 | C | BE, FE1 | No |
| F347 | Saved payment method | Customer | A member can keep a gateway token for later payments; the app stores no card number and the member can remove the token | F026 | C | BE, FE2 | No |
| F348 | Bank-transfer QR with reference matching | Customer | A transfer QR carries the amount and an order reference; a transfer with the matching reference and amount marks the order paid, and any other goes to the money exceptions queue | F128 | C | BE, FE2 | No |
| F349 | Two payment methods at the counter | Cashier | A counter order can be paid part in cash and part by another method; the order is paid only when both parts are confirmed | F031 | C | BE, FE1 | No |
| F350 | House tab for approved members | Manager | A manager lets a named member pay later up to a limit; unpaid tabs are listed with their age and a new order is refused at the limit | Out1 | P | BE, FE1 | No |

## AN. Invoices, tax and accounting

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F351 | VAT invoice request at checkout | Customer | A customer enters company name, tax code and address before or after paying; the request is tied to one paid order | Out2 | P | BE, FE2 | No |
| F352 | E-invoice issued through a provider | System | A paid order with a request is sent once to the e-invoice provider; the returned invoice number and file are stored on the order | Out1, F351 | P | BE | No |
| F353 | Invoice replacement | Manager | A wrong invoice is replaced or adjusted through the provider, never edited; both documents stay linked to the order | F352 | P | BE, FE1 | No |
| F354 | Saved company invoice profile | Customer | A member saves invoice details and picks them at checkout; deleting a profile does not change invoices already issued | F351 | P | BE, FE2 | No |
| F355 | Invoice sequence per branch | System | Internal invoice references are numbered per branch without gaps or reuse, even when two orders are paid at once | F352 | P | BE | No |
| F356 | Tax rate per item group | Manager | Different item groups can carry different tax rates; the order shows tax per rate and the totals match the lines | F015 | C | BE, FE1 | No |
| F357 | Accounting export | Owner | A daily journal of sales, tax, discounts, refunds and payments by method is exported in a documented format | Out1, F098 | P | BE, FE1 | No |
| F358 | Gateway settlement reconciliation | Owner | Gateway payouts are matched to orders; an order without a payout and a payout without an order are both listed | F094 | C | BE, FE1 | No |
| F359 | Gateway fee report | Owner | Fees charged by the gateway are shown per day and per method next to gross sales | F358 | C | BE, FE1 | No |
| F360 | Period close | Owner | After a period is closed, its orders, shifts and refunds cannot be changed; a correction is a new dated adjustment | F357 | P | BE, FE1 | No |

## AO. Stock, recipes and purchasing

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F361 | Ingredient stock records | Manager | Each ingredient has a unit and a quantity on hand per branch; every change is a dated movement with a reason | Out1 | P | BE, FE1 | No |
| F362 | Recipe per menu item | Manager | A menu item lists the ingredients and quantities it uses, including the effect of size and modifiers | F361, F113 | P | BE, FE1 | No |
| F363 | Stock reduced on fulfilment | System | Ingredients are deducted when a line is made, once per line, and a remake deducts again with its own movement | F362, F228 | P | BE | No |
| F364 | Sold out when an ingredient runs short | System | An item whose recipe cannot be made from stock is marked sold out and comes back when stock is received | F362, F012 | P | BE | No |
| F365 | Suppliers and purchase orders | Manager | A purchase order lists items, quantities and expected cost for one supplier and moves draft → sent → received or cancelled | F361 | P | BE, FE1 | No |
| F366 | Goods receipt | Manager | Receiving against a purchase order raises stock by the quantity received and records any shortfall | F365 | P | BE, FE1 | No |
| F367 | Stock take | Manager | A count is entered per ingredient; the difference from the book quantity is recorded as a variance with a reason | F361 | P | BE, FE1 | No |
| F368 | Waste log | Server | Staff record wasted stock with a reason; waste is reported apart from sales use | F361 | P | BE, FE1 | No |
| F369 | Item cost and margin | Owner | Each item shows its recipe cost and margin from the latest purchase cost; an item with no recipe shows no margin | F362 | P | BE, FE1 | No |
| F370 | Reorder point alert | Manager | An ingredient at or below its reorder point appears on a reorder list with a suggested quantity | F361 | P | BE, FE1 | No |

## AP. Staff scheduling and workforce

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F371 | Weekly rota | Manager | A manager plans who works which shift per branch; staff see only their own branch's rota | F007 | C | BE, FE1 | No |
| F372 | Shift swap request | Server | A staff member proposes a swap with a colleague; it takes effect only after the colleague and a manager accept | F371 | C | BE, FE1 | No |
| F373 | Availability and leave | Server | Staff mark days they cannot work; the rota warns when a planned shift conflicts | F371 | C | BE, FE1 | No |
| F374 | Clock in and out | Server | Staff clock in and out at their branch; a missing clock-out is flagged for a manager to correct with a reason | F371 | C | BE, FE1 | No |
| F375 | Timesheet export | Owner | Worked hours per person and period are exported; corrections are marked as such | F374, F098 | C | BE, FE1 | No |
| F376 | Opening and closing checklists | Server | A branch has opening and closing checklists; each tick records who and when, and an incomplete list is visible to the manager | New | C | FE1, BE | No |
| F377 | Staff training mode | Server | A staff member practises on sample data that never reaches real orders, shifts or reports, and the screen says so throughout | F262 | S | FE1, BE | No |
| F378 | Manager PIN for one action | Manager | A manager approves a single restricted action on a cashier's device by PIN; the approval is audited and grants nothing else | F107, F099 | S | BE, FE1 | No |
| F379 | Staff notice board | Manager | A manager posts a notice to a branch; staff see it at the start of their shift and the manager sees who has read it | New | C | BE, FE1 | No |
| F380 | Staff activity summary | Manager | A manager sees tickets handled and support requests closed per person and shift; staff see only their own | F234 | C | BE, FE1 | No |

## AQ. Kitchen and bar

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F381 | Kitchen display mode | Server | The ticket board has a landscape mode readable from two metres that needs no scrolling for the first eight tickets | F035 | S | FE1 | No |
| F382 | Preparation time per item | Manager | Each item has a preparation time; a ticket's promised time is derived from its slowest line and the queue | F152 | S | BE, FE1 | No |
| F383 | Queue-based throttling | System | When the queue passes a configured length, new orders show a longer estimate; past a second threshold, new orders pause and staff are told | F121, F382 | C | BE | No |
| F384 | Batch view of identical items | Server | Staff can see the count of each identical item across open tickets and still mark each ticket's line separately | F222 | C | FE1 | No |
| F385 | Timed start for pre-orders | System | A pre-order ticket appears on the board at booking start minus its preparation time, not when it is paid | F119, F382 | S | BE, FE1 | No |
| F386 | Allergy flag on the ticket | Server | A line whose customer note or saved preference names an allergen is marked on the ticket in text, not colour alone | F115, F180 | S | BE, FE1 | No |
| F387 | Sold-out switch on the ticket board | Server | Staff mark an item sold out from the ticket board; open tickets holding it are listed for follow-up | F012, F229 | S | FE1, BE | No |
| F388 | Keyboard and bump-bar control | Server | Every ticket step can be done from a keyboard or bump bar, with the focused ticket clearly marked | F035, F198 | C | FE1 | No |
| F389 | Runner assignment | Server | A ready ticket for seat delivery can be claimed by one staff member; a claimed ticket shows who has it | F225 | C | BE, FE1 | No |
| F390 | Daily prep list | Manager | A list for tomorrow shows pre-ordered items and bookings by time band so the bar can prepare | F119, F153 | C | BE, FE1 | No |

## AR. Hardware and devices

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F391 | Receipt printer | Cashier | A paid counter order prints a receipt on a supported printer; a printer fault never blocks the payment and can be retried | Out1, F124 | P | FE1 | No |
| F392 | Kitchen ticket printer | System | A new ticket prints once at its station; a reprint is marked as a reprint | Out1, F221 | P | FE1, BE | No |
| F393 | Cash drawer | Cashier | The drawer opens on a confirmed cash payment and on a recorded cash movement, and at no other time | Out1, F130 | P | FE1 | No |
| F394 | Barcode scan for retail goods | Cashier | Scanning a retail item's barcode adds it to the counter order; an unknown code adds nothing and says so | Out1, F201 | P | FE1, BE | No |
| F395 | Card terminal | Cashier | The amount is sent to the terminal and the order is marked paid only on the terminal's approved result | Out1 | P | BE, FE1 | No |
| F396 | Customer-facing counter display | Customer | A second screen shows the lines and total of the order being built and nothing from other orders | F022 | C | FE1 | No |
| F397 | Self-order kiosk mode | Customer | A device locked to one venue runs the customer order flow, returns to the start after inactivity and clears the previous customer's data | F016 | C | FE2, FE1 | No |
| F398 | Room door display | Customer | A tablet by a room shows its current and next booking by time only, with no customer names | F321, F045 | C | FE1 | No |
| F399 | NFC seat tag | Customer | Tapping a seat's tag opens the same landing page as its QR code and follows the same rotation rule | F067, F164 | C | FE2, BE | No |
| F400 | Floor status wall screen | Customer | A public screen shows free and taken seats under the public map privacy rule and refreshes without interaction | F045, F132 | S | FE2 | No |

## AS. Events and community

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F401 | Event listing | Manager | A manager publishes an event with time, capacity, price and description; a draft is not visible to customers | U-X02, Out2 | P | BE, FE1 | No |
| F402 | Event ticket purchase | Customer | A ticket is bought as a service line; capacity is rechecked at payment and never oversold | F401, F013 | P | BE, FE2 | No |
| F403 | Event check-in | Server | Staff check a ticket in by code; a code already used is refused and shows when it was used | F402 | P | BE, FE1 | No |
| F404 | Seats blocked for an event | System | Publishing an event creates a scheduled lock on its seats; unpublishing removes the lock and nothing else | F401, F156 | P | BE | No |
| F405 | Event cancellation | Manager | Cancelling an event opens a refund request for every paid ticket and tells each buyer | F402, F095 | P | BE, FE1 | No |
| F406 | Event waitlist | Customer | A full event takes a waitlist; a freed ticket is offered to the first entry for a limited time | F402 | P | BE, FE2 | No |
| F407 | Event attendance report | Manager | A report shows tickets sold, checked in and refunded per event | F403 | P | BE, FE1 | No |
| F408 | Venue news feed | Customer | The venue page shows dated posts from the manager (new items, quiet hours, events); a post can be scheduled and withdrawn | U-X03, Out2 | P | BE, FE2 | No |
| F409 | Anonymous study-buddy matching | Customer | Customers who opt in with a goal are suggested a shared zone; no name or contact is shown unless both choose to share | U-X05 | P | BE, FE2 | No |
| F410 | Customer-proposed event | Customer | A member proposes an event; it is listed only after a manager approves it and can be declined with a reason | F401 | P | BE, FE2 | No |

## AT. Focus and productivity

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F411 | Focus timer with presets | Customer | During a session the customer starts, pauses and resets a work and break timer from preset lengths; phase changes are announced to assistive technology | Demo, Out2 | P | FE2 | Part |
| F412 | Break suggestion from saved preferences | Customer | At a break the timer suggests a drink matching the member's saved milk and sweetness; it adds nothing to the cart by itself | Demo, F180 | P | FE2 | Part |
| F413 | Timer survives leaving the screen | Customer | The timer keeps correct time after the app is backgrounded or reloaded, using elapsed clock time, not ticks | F411 | P | FE2 | No |
| F414 | Focus history | Customer | A member sees focus time per visit and per week on their own device; nothing is shown to staff | F411 | P | FE2, BE | No |
| F415 | Visit goal | Customer | A customer writes an optional private goal at check-in and sees it again with the session summary | F142 | C | FE2 | No |
| F416 | End-of-visit summary | Customer | After checkout the customer sees time seated, focus blocks and spend for the visit | F142, F411 | P | FE2 | No |
| F417 | Quiet hours per zone | Manager | A zone can be quiet during set hours; the rule is shown on the zone, on the seat card and before payment | F134 | S | BE, FE2 | No |
| F418 | Zone noise level | Server | Staff set a zone's current noise level from three labelled steps; customers see the level and when it was set | F134 | C | BE, FE1 | No |
| F419 | Do-not-disturb marker | Customer | A customer marks their seat do-not-disturb; staff see it on the live floor and deliveries still arrive | F150 | S | BE, FE2 | No |
| F420 | Ambient sound player | Customer | A customer plays venue-chosen background sound through their own device; it stops when the session ends | New | C | FE2 | No |

## AU. Badges, tiers and referrals

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F421 | Visit badges | Customer | A member sees badges with progress computed from their own visit history; a refunded visit does not count | Demo, Out2 | P | FE2, BE | Part |
| F422 | Visit streak | Customer | A streak counts consecutive weeks with a visit in the branch timezone and shows the date it will lapse | Demo, Out2 | P | FE2, BE | Part |
| F423 | Hide badges and streaks | Customer | A member can turn badges and streaks off; nothing about them is shown or notified afterwards | F421 | P | FE2 | No |
| F424 | Membership tiers | Owner | Tiers are set by spend or hours over a rolling period; a member's tier and the amount needed for the next are shown | Out2, F086 | P | BE, FE2 | No |
| F425 | Tier benefits within the discount cap | Owner | A tier benefit counts as the order's single promotion and never goes below the floor price | F424, F172 | P | BE, FE1 | No |
| F426 | Referral code | Customer | A member has a code with a check character; a friend's mistyped code is refused and a member cannot use their own | Demo, Out2 | P | BE, FE2 | Part |
| F427 | Referral reward on first paid visit | System | Both members receive points only after the friend's first paid visit; a refund of that visit reverses both | F426, F089 | P | BE | No |
| F428 | Referral abuse limits | System | Rewards are capped per member per month and refused for the same phone number or device | F427, F103 | P | BE | No |
| F429 | Stamp card | Customer | Buying a configured number of a chosen item group earns one free item, redeemed as the order's single promotion | F021 | C | BE, FE2 | No |
| F430 | Birthday reward | Customer | A member who gave a birth month gets one voucher that month; the field is optional and can be removed | F173, F276 | C | BE, FE2 | No |

## AV. Marketing and customer follow-up

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F431 | Campaign message to a member group | Manager | A manager writes a message for one rule-based group; it is sent only to members with marketing consent | Out1, F275, F276 | P | BE, FE1 | No |
| F432 | Campaign schedule and frequency cap | Manager | A campaign is sent at a set time; a member receives no more than the configured number of messages per week across campaigns | F431 | P | BE, FE1 | No |
| F433 | Campaign results | Manager | A campaign shows sent, delivered, opened and voucher redeemed counts, with no per-member reading history | F431 | P | BE, FE1 | No |
| F434 | Messaging channel adapter | System | Messages go through one adapter interface (push, email, Zalo); a channel failure is recorded and not retried without limit | F431 | P | BE | No |
| F435 | Per-channel preferences and unsubscribe | Customer | Every marketing message carries an unsubscribe link; the member's channel choices take effect on the next send | F276 | P | BE, FE2 | No |
| F436 | Lapsed-member offer by rule | Manager | Members with no visit for a configured number of days form a group that can receive one offer; no prediction model is used | F431, Out1 | P | BE, FE1 | No |
| F437 | Follow-up on a low rating | Manager | A rating at or below a threshold opens a manager task with the visit details; closing it needs an outcome | F149, F239 | S | BE, FE1 | No |
| F438 | Public review prompt | Customer | After a high rating the customer is offered a link to the venue's public review page; nothing is posted for them | F149 | C | FE2 | No |
| F439 | Campaign link attribution | Manager | A campaign link records which campaign led to a booking or order, without placing personal data in the link | F431 | P | BE | No |
| F440 | Share card for a venue or seat | Customer | Sharing produces a picture with the venue name, seat and time, and no personal data | F137 | C | FE2 | No |

## AW. Several branches and franchise

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F441 | Branch picker for customers | Customer | A brand with several branches shows them with address, hours and live capacity; picking one loads that branch's menu and map | F001, F131 | S | FE2, BE | No |
| F442 | Brand menu with branch overrides | Owner | Items are defined once for the brand; a branch can change price and availability and cannot change the item's identity | F010 | C | BE, FE1 | No |
| F443 | Price rule templates for branches | Owner | A brand rule set is copied to chosen branches as an independent copy that the branch may then edit | F075 | C | BE, FE1 | No |
| F444 | Brand-wide points | Owner | When the owner turns it on, points earned at one branch can be redeemed at another; the ledger records the branch of every entry | F086 | C | BE, FE2 | No |
| F445 | Voucher valid at chosen branches | Owner | A voucher lists the branches where it works; it is refused elsewhere with the reason | F173 | S | BE, FE1 | No |
| F446 | Consolidated brand report | Owner | The owner sees sales, hours sold and refunds across branches of the same currency, with each branch's figures matching its own report | F097 | S | BE, FE1 | No |
| F447 | Branch comparison | Owner | Branches are compared on the same measures for the same period, with seat count shown beside each | F446 | C | BE, FE1 | No |
| F448 | Staff working at another branch | Manager | A staff member is given access to a second branch for a dated period; access ends by itself | F007 | S | BE, FE1 | No |
| F449 | Approval for brand catalogue changes | Owner | A manager's change to a brand item waits for owner approval; branch overrides do not | F442 | C | BE, FE1 | No |
| F450 | Franchise fee report | Owner | A report shows each branch's sales base and the fee due under the configured rate for a period | F446 | C | BE, FE1 | No |

## AX. Analytics and forecasting

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F451 | Occupancy by hour and weekday | Manager | A grid shows average occupancy per hour and weekday for a chosen range, with the values readable as text | F081 | S | BE, FE1 | No |
| F452 | Session length and spend per hour by tier | Manager | A report shows average session length and food and drink spend per seated hour for each tier | F281 | S | BE, FE1 | No |
| F453 | Booking funnel | Manager | Counts are shown for venue page views, seat selections, holds and paid bookings, with the drop between each step | F286 | S | BE, FE1 | No |
| F454 | Returning-customer rate | Owner | For members only, the share returning within 30 days of a first visit is shown by month of first visit | F179 | C | BE, FE1 | No |
| F455 | Seven-day demand forecast | Manager | Expected occupancy per time band for the next seven days is shown with the method named and last week's error beside it | F451 | C | BE, FE1 | No |
| F456 | Staffing suggestion from the forecast | Manager | The forecast suggests staff per shift from a configured ratio; it changes no rota by itself | F455, F371 | C | BE, FE1 | No |
| F457 | Popularity and margin matrix | Owner | Items are placed by units sold and margin; items without a recipe cost are listed apart | F369, F280 | P | BE, FE1 | No |
| F458 | Scheduled report by email | Owner | An owner receives a chosen report on a schedule; the email holds totals only and links to the signed-in report | F097, F125 | S | BE, FE1 | No |
| F459 | Unusual-day alert | Owner | A day whose revenue, refunds or no-shows differ from the four-week norm by a configured margin raises one alert with the figures | F157 | C | BE, FE1 | No |
| F460 | Pinned dashboard tiles | Manager | A manager chooses and orders the tiles on their dashboard; the choice is theirs alone | F081 | C | FE1, BE | No |

## AY. AI assistants

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F461 | Venue draft from notes and uploads | Owner | From notes, photos, video and documents the system drafts a venue (zones, seats, menu) for review; with no AI key a deterministic draft is produced from the same input | Demo | C | FE1, BE | Part |
| F462 | Refine the draft by chat | Owner | The owner asks for changes in words; each reply is a new draft version that can be compared with and reverted to the last | Demo, F461 | C | FE1, BE | Part |
| F463 | Server-side AI proxy | System | AI calls go through the server with the tenant's budget and log; the client holds no key and the key field is removed | F461, F183, F299 | S | BE, FE1 | No |
| F464 | Draft becomes a layout draft, never published | System | An accepted AI venue is saved as an unpublished layout and catalogue draft that goes through the normal publish checks | F461, F049 | S | BE, FE1 | No |
| F465 | Menu photo to menu items | Manager | A photo of a printed menu becomes a list of proposed items and prices; nothing is saved until the manager confirms each row | F122 | C | BE, FE1 | No |
| F466 | Description and translation drafts | Manager | The system drafts an item description and its Vietnamese or English translation; a draft is marked until a person approves it | F114, F199 | C | BE, FE1 | No |
| F467 | Assistant prepares a booking for confirmation | Customer | The assistant fills seat, time and package into the normal booking screen; only the customer's own confirmation creates the hold | F188 | C | BE, FE2 | No |
| F468 | Voice question to the assistant | Customer | A customer asks by voice; the recognised text is shown before the answer and can be corrected | F188 | C | FE2 | No |
| F469 | Weekly feedback themes | Manager | Ratings and comments of the week are grouped into themes with counts and example comments, with personal data removed first | F239, F185 | C | BE, FE1 | No |
| F470 | Report question in plain words | Owner | The owner asks a question about their reports; the answer cites the figures and report it used and says so when the data cannot answer | F097, F184 | C | BE, FE1 | No |

## AZ. 3D, editor and way-finding

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F471 | Several floors | Customer | A venue with more than one floor has a floor switcher; the seat list groups seats by floor and search covers all floors | F041, F044 | S | FE2, BE | No |
| F472 | Path from the entrance to the seat | Customer | After check-in the map shows a route to the seat, and the same route is given as text steps | Out2, F260 | P | FE2 | No |
| F473 | Compare two seats | Customer | Two seats are shown side by side with tier, price for the chosen time, amenities and photo | Out2, F135 | P | FE2 | No |
| F474 | Floor-plan image as an editor underlay | Manager | A manager places a floor-plan image under the editor grid to trace; the image is never published to customers | F047 | S | FE1 | No |
| F475 | Venue-uploaded 3D assets | Manager | An uploaded model is checked for format, size and polygon budget and is usable only after it passes | Out1, F165 | P | BE, FE1 | No |
| F476 | Room scan import | Manager | A scan from a supported device becomes a draft layout with walls and floor; seats are still placed and bound by hand | Out1 | P | BE, FE1 | No |
| F477 | Seat finder in the camera view | Customer | On a supported phone the customer sees a marker toward their seat; the text route remains available | Out1, F472 | P | FE2 | No |
| F478 | One editor at a time | Manager | Opening a draft that someone else is editing shows who has it; taking over needs a confirmation and ends the other session's saves | F050 | S | BE, FE1 | No |
| F479 | Day and evening lighting preview | Customer | The viewer can switch between two lighting presets; seat status stays readable in both | F041, F200 | C | FE2 | No |
| F480 | Seasonal decoration set | Manager | A decoration set is turned on and off without a new layout version, and changes no seat ID, position or price | F046, F050 | C | FE1, BE | No |

## BA. Platform and integrations

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F481 | Public availability API | Platform | A tenant can turn on a read-only endpoint returning free-seat counts per tier and time; it exposes no customer or session data | F132, F045 | C | BE | No |
| F482 | Signed outbound webhooks | Platform | A tenant registers a URL for order, booking and refund events; each delivery is signed, retried with backoff and listed with its result | F037 | C | BE, FE1 | No |
| F483 | Calendar sync | Customer | A member links a calendar; confirmed, moved and cancelled bookings are mirrored there and unlinking removes future entries | Out1, F139 | P | BE, FE2 | No |
| F484 | Embeddable booking widget | Owner | A venue's own website embeds a widget that runs the same quote and hold calls and hands payment to the venue page | F051 | C | FE2, BE | No |
| F485 | Custom domain per brand | Owner | A brand serves its venue pages on its own domain with a valid certificate; the venue-slug address keeps working | Out1, F004 | P | BE | No |
| F486 | Staff single sign-on | Owner | Staff of a tenant sign in with the tenant's identity provider; roles and branches are still assigned in the app | F005 | C | BE, FE1 | No |
| F487 | Delivery-platform order intake | System | Orders from a delivery platform arrive as tickets marked with their origin and never touch seats or sessions | F034 | C | BE, FE1 | No |
| F488 | Tenant plan and usage | Platform | Each tenant has a plan with limits (branches, seats, AI budget); usage against each limit is shown to the owner | F105, F183 | C | BE, FE1 | No |
| F489 | Feature switches per tenant | Platform | A platform admin turns a feature on for chosen tenants; the change is audited and a switched-off feature leaves no dead links | F182 | S | BE | No |
| F490 | Full tenant data export | Owner | An owner requests an export of the tenant's catalogue, orders, bookings and ledgers in a documented format | F098 | C | BE, FE1 | No |

## BB. Native app, offline and notifications

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F491 | Push notifications with per-type choice | Customer | A customer chooses which notices arrive as push (order ready, ending soon, booking reminder); declining push loses no in-app notice | F143, F144, F226 | S | BE, FE2 | No |
| F492 | Install to home screen | Customer | The web app offers installation once after a completed visit and never during checkout | New | S | FE2 | No |
| F493 | Offline view of the session and receipt | Customer | With no connection the customer still sees the last known session, its time and past receipts, marked with when they were fetched | F193 | S | FE2 | No |
| F494 | Offline cash orders at the counter | Cashier | Cash orders taken offline are queued, numbered locally and sent when the connection returns; a conflict (sold out, seat taken) goes to a review list | Out1, F129 | P | BE, FE1 | No |
| F495 | Queued-action indicator | Customer | Any action waiting to be sent shows as pending, can be cancelled before it is sent, and is never sent twice | F024, F193 | S | FE2, FE1 | No |
| F496 | Ongoing session notification | Customer | On supported phones the lock screen shows the time left in the session and is removed when the session ends | F142 | C | FE2 | No |
| F497 | App links to a seat or booking | Customer | A venue, seat or booking link opens the installed app at that screen and falls back to the web page | F137 | S | FE2 | No |
| F498 | Biometric unlock for staff switch | Cashier | On a shared device a staff member confirms a quick switch with the device's biometric check in place of the PIN | F107 | C | FE1 | No |
| F499 | Staged over-the-air update | Platform | A JavaScript update goes to a share of devices first and can be rolled back; a change needing a native rebuild is never sent this way | F197 | S | FE1, FE2 | No |
| F500 | Home-screen widget | Customer | A widget shows the next booking or the active session's time left and opens the app at that screen | F241 | C | FE2 | No |

## BC. Trust, safety and compliance

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F501 | Lost and found log | Server | Staff record a found item with place and time and close it as returned or disposed, with who collected it | New | C | BE, FE1 | No |
| F502 | Incident log | Manager | A manager records an incident (injury, theft, dispute) with restricted read access; entries cannot be deleted | F099 | C | BE, FE1 | No |
| F503 | Customer block with review date | Manager | A manager blocks a member from booking with a reason and a review date; the member is told only that booking is unavailable | F085 | C | BE, FE1 | No |
| F504 | House rules accepted at first booking | Customer | A customer accepts the current house rules once per version before their first booking; the acceptance is recorded | F270, F277 | S | BE, FE2 | No |
| F505 | Age-restricted item check | Server | An item marked age-restricted needs staff to confirm an age check at handover; refusing voids the line into a refund request | F010, F229 | C | BE, FE1 | No |
| F506 | Two-step sign-in for owner and manager | Owner | Owners and managers confirm sign-in with a second step; recovery needs another owner or the platform, and is audited | F005, F106 | S | BE, FE1 | No |
| F507 | Member data export | Customer | A member requests a copy of their profile, bookings, orders and points in a readable file, delivered only after re-verifying by OTP | F108 | S | BE, FE2 | No |
| F508 | Step-free seats and route | Customer | A seat can be marked step-free with table height noted; the filter and the text floor summary both use it | F133, F260 | S | BE, FE2 | No |
| F509 | Reusable cup count and discount | Customer | A customer's own-cup choice applies a configured discount within the discount cap and is counted in a report | F172 | C | BE, FE2 | No |
| F510 | Service status notice | Platform | A platform notice about an outage or planned work appears in every affected tenant's staff and customer apps and clears itself when ended | F269, F191 | S | BE, FE1 | No |

## BD. Company accounts

| ID | Feature | Actor | Acceptance check | Source | Pri | Own | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F511 | Company account | Owner | A venue creates a company account with a billing contact; members are linked to it by invitation and can leave it | New | P | BE, FE1 | No |
| F512 | Company admin manages employees | Company admin | A company admin invites and removes employees; removal stops new company-paid bookings and leaves paid ones in place | F511 | P | BE, FE2 | No |
| F513 | Monthly hour allowance per employee | Company admin | Each employee has a monthly allowance; a booking beyond it is paid by the employee, and the split is shown before payment | F511 | P | BE, FE2 | No |
| F514 | Spending policy | Company admin | The company chooses what it pays for (seat time only, or food up to a daily cap); anything else is on the employee's own payment | F511 | P | BE, FE2 | No |
| F515 | Team booking by the company admin | Company admin | An admin books seats for named employees; each employee sees the booking in their own list | F511, F301 | P | BE, FE2 | No |
| F516 | Reference on company bookings | Customer | An employee adds a cost-centre or purchase-order reference that appears on the company invoice line | F511 | P | BE, FE2 | No |
| F517 | Negotiated company rates | Owner | A company has its own price list for seat time; it never goes below the floor price and is shown as the applied price | F511, F172 | P | BE, FE1 | No |
| F518 | Consolidated monthly invoice | Owner | Company-paid bookings and orders of a month are billed on one invoice with a line per employee and reference | F511, F352 | P | BE, FE1 | No |
| F519 | Company usage report | Company admin | The admin sees hours and spend per employee and month, limited to company-paid activity | F511 | P | BE, FE2 | No |
| F520 | Suspension for overdue invoices | Owner | A company with an invoice overdue past a configured number of days cannot make new company-paid bookings; employees can still pay themselves | F518 | P | BE, FE1 | No |

## Summary

| Area | Features | S | C | P |
| --- | --- | --- | --- | --- |
| AH. Group and recurring bookings | 10 | 0 | 0 | 10 |
| AJ. Waitlist and demand | 10 | 1 | 4 | 5 |
| AK. Meeting rooms and private spaces | 10 | 5 | 4 | 1 |
| AL. Passes, memberships and wallet | 10 | 0 | 0 | 10 |
| AM. Bill splitting, tips and payment methods | 10 | 0 | 6 | 4 |
| AN. Invoices, tax and accounting | 10 | 0 | 3 | 7 |
| AO. Stock, recipes and purchasing | 10 | 0 | 0 | 10 |
| AP. Staff scheduling and workforce | 10 | 2 | 8 | 0 |
| AQ. Kitchen and bar | 10 | 5 | 5 | 0 |
| AR. Hardware and devices | 10 | 1 | 4 | 5 |
| AS. Events and community | 10 | 0 | 0 | 10 |
| AT. Focus and productivity | 10 | 2 | 3 | 5 |
| AU. Badges, tiers and referrals | 10 | 0 | 2 | 8 |
| AV. Marketing and customer follow-up | 10 | 1 | 2 | 7 |
| AW. Several branches and franchise | 10 | 4 | 6 | 0 |
| AX. Analytics and forecasting | 10 | 4 | 5 | 1 |
| AY. AI assistants | 10 | 2 | 8 | 0 |
| AZ. 3D, editor and way-finding | 10 | 3 | 2 | 5 |
| BA. Platform and integrations | 10 | 1 | 7 | 2 |
| BB. Native app, offline and notifications | 10 | 6 | 3 | 1 |
| BC. Trust, safety and compliance | 10 | 5 | 5 | 0 |
| BD. Company accounts | 10 | 0 | 0 | 10 |
| **Total** | **220** | **42** | **77** | **101** |

If scope has to shrink, drop P first, then C. Within a section, drop from the bottom up: later rows depend on earlier ones.

## Open decisions these rows depend on

| Decision | Rows | Reference |
| --- | --- | --- |
| Whether group bookings are reopened, and the largest group | F301–F306, F515 | First spec, "Out of MVP" |
| Whether recurring bookings and waitlists are reopened | F307–F314, F320 | Batch 2, "Still out of MVP" |
| Whether stored value (bundles, wallet, gift cards, tabs) is allowed at all, given the licensing and refund duties it brings | F331–F340, F350 | First spec and batch 2 exclusions |
| Whether any deposit is ever taken | F329 | Batch 3: no deposit or fine |
| Which e-invoice provider, and who is the seller of record | F351–F355, F518 | First spec, "Out of MVP" |
| Whether ingredient stock is worth building or better left to an existing stock system | F361–F370, F457 | PRD puts stock and recipes after MVP |
| Which printers, drawers, scanners and terminals are supported | F391–F395 | First spec: no POS hardware integration |
| Whether the demo's focus timer becomes a supported feature | F411–F416 | Batch 2, "Still out of MVP" |
| Whether gamification fits the calm brand direction | F421–F423, F429 | [PRODUCT.md](../PRODUCT.md), brand commitments |
| Which messaging channels, and who pays for sends | F431–F436, F439 | First spec: no automated campaigns |
| Whether the browser key field for AI setup is removed before any real venue uses it | F461–F464 | [AGENTS.md](../AGENTS.md): client-side demo only |
| Whether offline counter work is needed, and its conflict rules | F494 | First spec: no offline operation |
| Whether company accounts are sold per venue or per brand | F511–F520 | New scope |

## Still not proposed

These stay out even of this backlog, because each breaks a ground rule of the first spec and not just a scope line:

- AI that refunds, resolves disputes, changes prices by itself or prices per individual customer; camera recognition of people.
- Metered pay-as-you-go seat billing and automatic overtime charges.
- Churn prediction and custom-trained models.
- Free-form architecture modelling, VR, simultaneous multi-user editing and an asset marketplace.
- Per-brand native apps and service-level agreements.
