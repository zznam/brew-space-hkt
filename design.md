# Nếp HTML prototype design system

This system governs the two HTML prototypes in `prototype/`. It does not change the Expo app, its routes, or its contracts.

## Direction

Utilitarian app screens, dark surfaces, mint primary actions. Preserve the user-confirmed palette and the floor-plan reference. Both screens are phone-first, with a plain content column up to 480 px wide, bottom navigation and native dialog bottom sheets. The column has no imitation phone chassis, operating-system bar or notch.

## Page family

- Operations: spatial workbench; compact status totals, seat map/list, service handoff queue and contextual detail sheets.
- Customer: guided visit; table identification, service selection, explicit prepaid-package comparison, active use, then checkout and receipt. Loyalty and profile remain available as account views.
- Entry: index with two destinations.

## Shared tokens

`tokens.css` is the source of truth for colors, type, spacing, motion and focus. `prototype/styles.css` provides the established base. `prototype/mobile.css` appends the phone layout and service vocabulary; `prototype/journey.css` styles the guided customer visit.

- Paper: `oklch(16.5% .009 180)`; elevated surfaces use the existing paper tokens.
- Text: `oklch(94% .006 150)`; muted text uses `--color-muted`.
- Primary: `oklch(83% .115 165)` with `--color-accent-ink`.
- Semantic colors: blue for books/reservations; mint for shared amenities; amber for entertainment; neutral for stationery. Icons and text always identify the service as well as color.
- Focus: existing light focus on dark controls, separate darker focus on mint primary buttons.
- Display: Space Grotesk 600, roman; body: Be Vietnam Pro 400/500/600, self-hosted.
- Body controls target 14–16 px, secondary information at least 12 px; compact bottom navigation at least 11 px. Interactive targets at least 44 px.

## Services

- Borrowing books: book-cover illustration, shelf metadata, free price, return-required tag.
- Shared amenities: basket/extension socket/cable illustration, available quantity, free price, return-required tag.
- Entertainment and stationery: product illustration, price, stock and explicit buy-to-keep tag.
- Borrowing state: requested → borrowed → returned; requested may be cancelled. Pending requests reserve stock.
- Service selection is a draft. Confirming use or additional services checks stock and adds unpaid items to the active session; checkout settles the remaining amount after package coverage and points.
- Borrowed items require staff-confirmed return before checkout. Serving an order is separate from receiving payment.
- Prepaid comparison shows included time/items and extras before use. Changing the selection requires another comparison.

## Layout and interaction

- Headers state the current task and venue in a compact row.
- Navigation is fixed within the same 480 px column, with safe-area padding. The customer screen presents the current journey stage and its next action; active use includes elapsed time, service status and the remaining estimate.
- Arrival has no preselected table. QR links, manual number/code and the map converge on table confirmation.
- No large marketing hero inside the phone screens. Important service shortcuts are visible near the top.
- Detail/forms use native dialogs, with visible close buttons, Escape and keyboard focus handling.
- No decorative animation. Only purposeful transform/opacity feedback; reduced motion removes it.
- Reuse existing `--space-*`, `--radius-*`, `--ease-*` and `--dur-*` values.
- Success is shown where the action happened; errors say what to correct.

## Scope

All prices, stock and operations are demo data. Browser state is preserved when adding the service fields. Real authentication, tenant boundaries, inventory transactions, AI and payment stay outside the HTML prototype.
