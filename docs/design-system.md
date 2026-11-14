# BrewSpace design system

The visual language of the Expo app (`app/`, `src/`). The HTML prototype has its own system in root `design.md`; the two share nothing.

Direction: a calm, modern phone app. Warm paper background, white cards, one forest-green accent, hierarchy from type and spacing rather than borders. The phone (390pt) is the product; wider screens add columns.

## Where things live

| File                      | Holds                                                                        |
| ------------------------- | ---------------------------------------------------------------------------- |
| `src/components/theme.ts` | Tokens: `colors`, `space`, `radius`, `type`, `elevation`, `layout`, `motion` |
| `src/components/ui.tsx`   | Primitives and the shared `styles` sheet (re-exports the tokens)             |
| `src/components/Icon.tsx` | Line icons drawn from views (no icon font or SVG dependency)                 |
| `app/_layout.tsx`         | App shell: app bar, demo strip, scrolling content, bottom tab bar            |

Screens import from `@/components/ui` only. A screen never writes a raw hex, font size or radius.

## Tokens

**Colour** (`colors`)

| Role            | Tokens                                                 | Use                                                                        |
| --------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Text            | `ink`, `muted`, `subtle`                               | Primary, secondary, tertiary text. All pass 4.5:1 on `surface` and `paper` |
| Background      | `paper`, `paperAlt`                                    | Page; tonal fills (default button, demo strip)                             |
| Surface         | `surface`, `surfaceSubtle`                             | Cards; inset rows inside cards                                             |
| Line            | `border`, `borderStrong`                               | Hairlines; input and ghost-button outlines                                 |
| Brand / success | `green`, `greenPressed`, `greenSurface`, `greenBorder` | Primary action, selected, available                                        |
| Info            | `blue*`                                                | Occupied, in progress                                                      |
| Warning         | `amber*`                                               | Needs attention soon                                                       |
| Danger          | `danger*`                                              | Destructive, errors, sold out                                              |
| On-colour       | `onPrimary`, `overlay`                                 | Text on green; scrims                                                      |

Status is never colour alone: every tone is paired with a text label. Venue `accent` colours come from fixtures and are used only for the screen overline and the selected-seat outline.

**Type** (`type`, exposed as `styles.*`)

| Token      | Size / line / weight     | Style                            | Use                               |
| ---------- | ------------------------ | -------------------------------- | --------------------------------- |
| `display`  | 28 / 34 / 800            | `styles.display`                 | Screen title (via `ScreenHeader`) |
| `title`    | 22 / 28 / 800            | `styles.heading`                 | Section title, key figures        |
| `headline` | 17 / 22 / 700            | `styles.subheading`              | Card title                        |
| `body`     | 15 / 22 / 400            | `styles.text`                    | Body copy (muted)                 |
| `label`    | 15 / 20 / 600            | `styles.textStrong`              | Emphasised line, button label     |
| `caption`  | 13 / 18 / 400            | `styles.caption`                 | Helper text, metadata             |
| `overline` | 11 / 14 / 700, uppercase | `styles.sectionLabel`, `Eyebrow` | Section labels                    |

**Spacing** (`space`, 4pt grid): `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32`. Screen padding and the gap between cards are `lg`; gaps inside a card are `md`; related items `sm`.

**Radius** (`radius`): `sm 8` small marks · `md 12` inputs, inset rows, banners · `lg 16` buttons, tiles · `xl 20` cards · `pill` chips, badges.

**Elevation** (`elevation`): `none` flat · `card` resting surfaces · `raised` the tab bar. Nothing else casts a shadow.

**Layout** (`layout`): touch target 44, control height 48 (`sm` 36 with hit slop), app bar 56, tab bar 60, wide breakpoint 768.

**Motion** (`motion`): press feedback is opacity 0.7 (primary buttons darken instead); disabled is opacity 0.4. No decorative animation.

## Components

| Component                     | Variants / props                                                                                     | Use when                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `Screen`                      | —                                                                                                    | Root of every screen; sets section rhythm             |
| `ScreenHeader`                | `overline`, `title`, `subtitle`, `trailing`, `accentColor`                                           | Once, at the top of every screen                      |
| `Card`                        | `default` (elevated), `subtle` (outlined), `accent` (green tint)                                     | A section. `accent` for the one thing to notice       |
| `styles.inset` (+ `insetRow`) | —                                                                                                    | A row or box inside a card. Don't nest cards in cards |
| `Button`                      | `primary`, `default`, `secondary`, `ghost`, `danger`; `sm`/`md`; `selected`, `disabled`, `fullWidth` | Actions. One `primary` per view                       |
| `Chip`                        | `selected`, `disabled`                                                                               | Filters, suggestions, toggles (not actions)           |
| `SegmentedControl`            | `sm`/`md`                                                                                            | 2–4 mutually exclusive options                        |
| `IconButton`                  | `selected`                                                                                           | Icon-only action; `accessibilityLabel` required       |
| `TabBar`                      | items with `icon`, `label`, optional `accessibilityLabel`                                            | The role's top-level destinations                     |
| `Badge`                       | `neutral`, `success`, `info`, `warning`, `danger`                                                    | Short status next to a title                          |
| `Banner`                      | same tones; `role="alert"`                                                                           | Inline message where the action happened              |
| `EmptyState`                  | `title`, `message`, optional action                                                                  | Every list with nothing in it                         |
| `StatTile`                    | `label`, `value`, `sublabel`, `accentColor`                                                          | A row of 2–3 headline numbers                         |
| `CollapsibleSection`          | `title`, `summary`, `defaultOpen`                                                                    | Secondary detail behind a tap                         |
| `Heading`                     | `level` 1 or 2                                                                                       | Section (`1`) or card (`2`) title                     |
| `Eyebrow`, `Divider`, `Icon`  | —                                                                                                    | Overline label; hairline; decorative glyph            |

States every interactive component has: default, pressed, selected (where it applies), disabled. Focus uses the platform ring.

## Patterns

- **Shell.** App bar (brand, language toggle for customers, journeys button) → demo strip (one horizontally scrolling row) → scrolling content → bottom tab bar. Navigation lives only in the tab bar; screens don't render their own nav. Detail routes highlight their parent tab (`customerTabForPath`, `merchantTabForPath`).
- **Screen.** `Screen` › `ScreenHeader` › banners › cards. The header sits on the page, not in a card.
- **Lists.** Rows are `styles.inset` inside a card: label left, action right. Empty lists show `EmptyState`.
- **Forms.** `styles.sectionLabel` above `styles.input` (48pt, 16px text so iOS doesn't zoom), helper text in `styles.caption`, the result of the action in a `Banner` directly below.
- **Wide screens.** Add columns with `useResponsive().isWide`; never change the phone layout to do it.

## Accessibility

- Touch targets ≥ 44pt; `sm` controls are 36pt tall with 4pt hit slop and spacing around them.
- Text contrast ≥ 4.5:1 for all text tokens on `surface` and `paper`.
- Icons are hidden from assistive tech; the control carries the name. Where a tab's visible label is shortened ("Floor"), `accessibilityLabel` keeps the full name ("Live Floor") and contains the visible text.
- Errors and warnings use `Banner role="alert"`; live counts use `accessibilityLiveRegion="polite"`.

## Do / don't

| Do                                              | Don't                                                        |
| ----------------------------------------------- | ------------------------------------------------------------ |
| Read every value from `theme.ts`                | Write a hex, `fontSize` or `borderRadius` number in a screen |
| Add a missing primitive to `ui.tsx`             | Style a one-off `Pressable` in a feature folder              |
| Use `Chip` for filters and `Button` for actions | Use `Button selected` as a filter                            |
| One `primary` button per view                   | Stack several green buttons                                  |
| Put rows in `styles.inset`                      | Nest `Card` in `Card`                                        |

## Known gaps

- Light theme only. Tokens are static, so dark mode needs a theme hook first.
- The 3D viewer (`canvas3d/`) and onboarding fixtures keep their own scene/material colours; they are content, not UI chrome.
- `OnboardingScreen` and `UserJourneysGalleryScreen` use the tokens and shell but still have dense, desktop-era layouts.
