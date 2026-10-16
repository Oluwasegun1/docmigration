# Design system

Design specification for Migration Hub. Target: **WCAG 2.2 Level AA**, on mid-range mobile first. Companion docs: [architecture.md](architecture.md), [requirements.md](requirements.md).

Principles that the system makes structural: **one primary button per screen**, **status is never colour alone**, **every requirement shows status, verified date and source**.

---

## 1. Colour tokens

### 1.1 Core palette

| Token                   | Hex       | Use                                                            |
| ----------------------- | --------- | -------------------------------------------------------------- |
| `--color-primary`       | `#0F766E` | Primary button fill, links, focus ring, active nav             |
| `--color-on-primary`    | `#FFFFFF` | Text/icons on primary                                          |
| `--color-surface`       | `#FFFFFF` | Page and card background                                       |
| `--color-surface-muted` | `#F3F4F6` | Page sections, input wells, table stripes                      |
| `--color-text`          | `#111827` | Body text, headings                                            |
| `--color-text-muted`    | `#4B5563` | Secondary text, captions, helper text                          |
| `--color-border`        | `#6B7280` | Borders of interactive controls (needs 3:1)                    |
| `--color-border-subtle` | `#D1D5DB` | Decorative dividers only, never the sole boundary of a control |

### 1.2 Status tokens

| Status      | Token                  | Hex       | Meaning in product                                                   | Icon                     |
| ----------- | ---------------------- | --------- | -------------------------------------------------------------------- | ------------------------ |
| Confirmed   | `--status-confirmed`   | `#15803D` | Verified requirement, met criterion, completed task                  | check-circle             |
| Conditional | `--status-conditional` | `#B45309` | Depends on circumstances, "More information needed", "Being checked" | alert-triangle (outline) |
| Estimate    | `--status-estimate`    | `#1D4ED8` | Source-backed estimate or approximate figure                         | info                     |
| Critical    | `--status-critical`    | `#B91C1C` | "Potential blocker", "Requirement appears unmet"                     | octagon-alert            |
| Pending     | `--status-pending`     | `#6B7280` | Not yet started or awaiting sync, unverified                         | clock                    |

### 1.3 Contrast, computed (WCAG relative luminance)

Text and icons need 4.5:1 (text) and 3:1 (non-text). Ratios below were computed from the hex values.

| Foreground            | on Surface `#FFFFFF` | on Surface Muted `#F3F4F6` | Result                                          |
| --------------------- | -------------------- | -------------------------- | ----------------------------------------------- |
| Text `#111827`        | 17.74                | 16.12                      | Pass                                            |
| Text Muted `#4B5563`  | 7.56                 | 6.87                       | Pass                                            |
| Primary `#0F766E`     | 5.47                 | 4.97                       | Pass                                            |
| Confirmed `#15803D`   | 5.02                 | 4.56                       | Pass                                            |
| Conditional `#B45309` | 5.02                 | 4.56                       | Pass                                            |
| Estimate `#1D4ED8`    | 6.70                 | 6.09                       | Pass                                            |
| Critical `#B91C1C`    | 6.47                 | 5.88                       | Pass                                            |
| **Pending `#6B7280`** | 4.83                 | **4.39**                   | **Pass on white, fails 4.5:1 on Surface Muted** |

White text on a solid fill of each colour has the same ratio as the "on white" column (all at least 4.83), so a solid fill with white text is also valid.

> [!WARNING]
> `Pending` `#6B7280` does **not** reach 4.5:1 on `#F3F4F6` (4.39:1). To keep the specified colour and stay compliant, **Pending text and icons must be rendered on a white (`--color-surface`) background**. The status chip (below) always has a white fill, so it passes on any parent surface. Never place bare Pending text directly on Surface Muted. If that is ever needed, use `--color-text-muted` (`#4B5563`).

### 1.4 Usage rules

- **Chips have a white fill**, a 1 px border in the status colour, and status-coloured icon and text. This keeps every pair at its "on white" ratio regardless of the surface behind it.
- Status colour is never the only signal: every status has an **icon and a text label** (WCAG 1.4.1).
- Do not use status colours for decoration or for unrelated emphasis.
- Non-text boundaries (input borders, chip borders, focus ring) must be at least 3:1 against adjacent colours (WCAG 1.4.11). `--color-border` `#6B7280` gives 4.83 on white.
- Dark mode is out of scope for the MVP. If added, re-run the contrast table.
- Any new colour pair must be checked and added to the table before use. CI should run an automated contrast test against these tokens.

### 1.5 Token implementation (Tailwind v4, `globals.css`)

```css
@theme {
  --color-primary: #0f766e;
  --color-on-primary: #ffffff;
  --color-surface: #ffffff;
  --color-surface-muted: #f3f4f6;
  --color-text: #111827;
  --color-text-muted: #4b5563;
  --color-border: #6b7280;
  --color-border-subtle: #d1d5db;
  --color-status-confirmed: #15803d;
  --color-status-conditional: #b45309;
  --color-status-estimate: #1d4ed8;
  --color-status-critical: #b91c1c;
  --color-status-pending: #6b7280;
}
```

Components consume these tokens only (no raw hex or ad-hoc Tailwind palette classes such as `teal-700`).

---

## 2. Typography

System font stack, no web-font download (faster on mid-range mobile, respects user settings):

```css
--font-sans:
  system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
  "Noto Sans", sans-serif;
```

| Style   | Size               | Weight | Line height | Use                                   |
| ------- | ------------------ | ------ | ----------- | ------------------------------------- |
| Display | 28 px (1.75 rem)   | 600    | 1.25        | Page title (`h1`), one per screen     |
| Heading | 20 px (1.25 rem)   | 600    | 1.3         | Section titles (`h2`/`h3`)            |
| Body    | 16 px (1 rem)      | 400    | 1.5         | Default text, form fields, task rows  |
| Caption | 13 px (0.8125 rem) | 400    | 1.4         | Verified dates, helper text, metadata |

Rules:

- Sizes are set in `rem` so they follow user preferences. Layouts must survive **200 % text zoom** and **reflow at 320 px width** without horizontal scrolling or clipped content (WCAG 1.4.4, 1.4.10).
- Caption is for supplementary text only. Never put the sole statement of a requirement, status or error in Caption. Caption colour is `--color-text` or `--color-text-muted`.
- Support user text-spacing overrides (WCAG 1.4.12). No fixed-height text containers.
- Line length for body copy at most about 70 characters.
- Heading levels follow document structure, with no skipped levels. Visual style is decoupled from the heading level.
- Inputs use at least 16 px to prevent mobile browser zoom on focus.

---

## 3. Interaction and layout foundations

### 3.1 Touch targets

- **Minimum 44 × 44 px** for every interactive element (buttons, tabs, checkboxes, links in lists, chip actions). This exceeds WCAG 2.2 SC 2.5.8 (24 px, AA) and matches the stricter 2.5.5 (AAA).
- **Minimum 8 px** between adjacent targets, measured edge to edge.
- Small visual elements (icons, inline links) get padding or a pseudo-element so the hit area reaches 44 px without enlarging the visual.
- Inline text links inside a sentence are exempt by WCAG, but standalone links (source links, "Edit") must meet 44 px.
- Tokens: `--target-min: 2.75rem` (44 px), `--space-target-gap: 0.5rem` (8 px).

### 3.2 Spacing scale

4 px base: `4, 8, 12, 16, 24, 32, 48`. Card padding 16 px (mobile) and 24 px (desktop). Page gutter 16 px.

### 3.3 Focus (WCAG 2.4.7, 2.4.11, 2.4.13)

- Visible `:focus-visible` ring: **2 px solid `--color-primary`, 2 px offset**, 3:1 or better on both white (5.47) and muted (4.97) surfaces.
- Focus must never be hidden by sticky headers or the bottom tab bar (SC 2.4.11 Focus Not Obscured). Use `scroll-padding` equal to the sticky bar heights.
- Logical tab order. Skip link as the first focusable element (already in the root layout).

### 3.3.1 Other WCAG 2.2 AA commitments

| Criterion                        | Requirement for this product                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| 1.4.1 Use of colour              | Status always has icon plus text                                                            |
| 1.4.3 / 1.4.11 Contrast          | As in section 1.3                                                                           |
| 1.4.13 Content on hover or focus | Tooltips are dismissible, hoverable and persistent. No essential info in tooltips           |
| 2.1.1 / 2.1.2 Keyboard           | All functions keyboard operable, no traps (including dialogs and menus)                     |
| 2.5.7 Dragging movements         | Any drag reordering has a button alternative (for example "Move up / down")                 |
| 2.5.8 Target size (min)          | Exceeded by the 44 px rule                                                                  |
| 3.2.6 Consistent help            | Help or contact link in the same place on every page (More menu and footer)                 |
| 3.3.1 / 3.3.3 Error handling     | Errors identified in text, adjacent to the field, with a suggested fix                      |
| 3.3.7 Redundant entry            | Never ask again for information already given (profile data is reused, drafts are restored) |
| 3.3.8 Accessible authentication  | No cognitive-function tests. Support password managers and paste                            |
| 4.1.3 Status messages            | Sync, save and error banners use `role="status"` or `role="alert"`                          |
| Motion                           | Respect `prefers-reduced-motion`. No auto-playing animation                                 |

---

## 4. Core components

Each component's props make the accessible, honest form the only form.

### 4.1 Button

| Variant     | Appearance                                             | Rule                                               |
| ----------- | ------------------------------------------------------ | -------------------------------------------------- |
| Primary     | Fill `--color-primary`, text `--color-on-primary`      | **Exactly one per screen** (`data-primary-action`) |
| Secondary   | White fill, 1 px `--color-border`, text `--color-text` | Any number                                         |
| Ghost       | No fill, primary text                                  | Low-emphasis, still 44 px                          |
| Destructive | White fill, `--status-critical` border and text        | Never primary-styled, always confirms              |

- Height at least 44 px, horizontal padding 16 px, Body-weight 600 label, radius 8 px.
- States: hover (darken fill about 8 %), pressed, `focus-visible` ring, **disabled** (use `aria-disabled` with an explanation when the reason matters, rather than a silent dead button), **loading** (spinner with text, `aria-busy`, prevents double submit).
- Labels are verbs describing the outcome ("Continue", "Add to my plan"). No icon-only buttons without an accessible name.
- The primary button is a single `PrimaryAction` component. A second instance on one screen logs a development-time error and fails the e2e test.
- Mobile: primary button full width, placed in the thumb zone, and never obscured by the tab bar.

### 4.2 Status chip

Anatomy: `[icon] Label`. White fill, 1 px status-colour border, status-colour text and icon, Caption-sized text at 13 px weight 600 (minimum chip height 28 px). The chip itself is informational and not interactive. If it opens an explanation, wrap it in a 44 px button.

| Chip text                                     | Status token | Icon           |
| --------------------------------------------- | ------------ | -------------- |
| Verified · Met · Marked done by you           | Confirmed    | check-circle   |
| More information needed · Being checked       | Conditional  | alert-triangle |
| Estimate                                      | Estimate     | info           |
| Potential blocker · Requirement appears unmet | Critical     | octagon-alert  |
| Pending · Waiting to sync · Unverified        | Pending      | clock          |
| Potential match                               | Confirmed    | check-circle   |

- Icons are decorative (`aria-hidden`), and the text carries the meaning. The chip is exposed as plain text.
- Wording stays tentative ("Potential", "appears"). See [requirements.md](requirements.md) section 0.
- Never truncate chip text. It wraps if needed.

### 4.3 Requirement card

Mandatory fields (required props, enforced by types and a runtime guard):

1. Title and plain-language summary.
2. **Content status chip** (Verified / Being checked / Unverified).
3. **Verified date** ("Verified on 12 Mar 2026") in Caption, `--color-text-muted`, on white.
4. **Source link** to the official regulator (see 4.5), always visible.
5. Optional: screening result chip and "Why this result".

Layout: white card, 1 px `--color-border-subtle`, 16 px padding, `article` with heading. Order: title, chips, summary, verified date, source. Cards on Surface Muted pages keep a white fill so Pending text passes.

`Being checked`: add a conditional-coloured left border (4 px) **plus** the note "We're confirming this with the regulator. Check the source before acting." The note is Body text, not Caption. If the verified date or source is missing, the card does not render for end users (admin error state instead).

### 4.4 Task row

Anatomy (min height 44 px, row padding 12 px 16 px):
`[checkbox 44px target] Title · status chip · due date / cost estimate · [chevron/Details]`

- Checkbox is a real `<input type="checkbox">` or role-equivalent, with a visible 24 px box inside a 44 px target and an accessible name equal to the task title.
- Completion text: "Marked done by you · 14 Mar" (Caption, `--color-text`). Completed rows keep full contrast and never grey out text below 4.5:1. Convey completion by checkmark, label and optional strikethrough-free styling.
- States: next (the single "Next step" row gets a primary-coloured 4 px leading bar and label "Next step"), blocked ("Waiting for: <task>", Pending chip), done, **Requirement changed** (Conditional chip, plus "Review" 44 px action), waiting to sync (Pending chip).
- Rows are a list (`ul/li`). Reordering, if any, has "Move up / Move down" buttons (2.5.7).
- Rows are separated by at least 8 px or a 1 px subtle divider, with action targets at least 8 px apart.

### 4.5 Source card

A required companion to every requirement.

- Contents: regulator name (for example "General Medical Council"), page title, **full domain** shown as text, retrieved date, and a link button "Open official source" (Secondary button style, 44 px).
- The link text is descriptive ("Open GMC registration requirements"). No bare "click here" or raw URL as the only text.
- External links open in a new tab with `rel="noopener noreferrer"` and announce it ("opens in new tab", with an icon marked `aria-hidden` plus visually hidden text).
- Offline: still shows regulator, title, URL and retrieved date from the cached snapshot, with the link marked "Needs a connection".
- Only domains on the approved regulator allow-list can be rendered as a source.

### 4.6 Stepper (onboarding and multi-step flows)

- Semantic ordered list (`ol`) with the current step marked `aria-current="step"`. A visible text summary "Step 3 of 6: Specialty" is always present (never dots or colour alone), and the page `h1` matches the step.
- Step states: complete (check icon plus "Completed"), current (filled primary indicator plus "Current"), upcoming (outline plus "Not started"), skipped ("Skipped" with Pending chip). All indicators carry text via visually hidden labels.
- Completed steps are links/buttons (44 px) back to the step. Upcoming steps are not links unless prerequisites are met.
- On mobile, collapse to the text summary plus a thin progress bar (`role="progressbar"` with `aria-valuenow`/`aria-valuemax`).
- Navigation: one **primary** "Continue", secondary "Back" and "Skip for now", with at least 8 px between them. Focus moves to the new step heading on change, and the change is announced.
- Autosave status ("Saved on this device") is announced politely via `role="status"`.

---

## 5. Forms

- Visible `<label>` for every field, with no placeholder-as-label. Helper text is linked via `aria-describedby`.
- Required fields are marked in text ("Required"), not just an asterisk or colour.
- Errors: inline, in text with an icon, using `--status-critical`, linked via `aria-describedby`, and summarised in an error summary at the top that receives focus on failed submit.
- Inputs: min height 44 px, 1 px `--color-border`, 16 px text, 8 px radius, visible focus ring.
- Autocomplete attributes on personal fields. Never block paste.

## 6. Responsive and performance

- Mobile first: single column below 640 px, bottom tab bar (4 tabs plus More), content max width about 720 px on large screens (see [architecture.md](architecture.md)).
- Bottom tab bar items are at least 44 px high with 8 px gaps or dividers, labels always visible, `aria-current="page"` for the active tab.
- No hover-only functionality. No motion above 200 ms except reduced-motion-safe fades. No custom fonts or heavy images.
- Skeletons for loading, with `aria-busy` on the region.

## 7. Verification checklist

Automated:

- Unit test asserting all token pairs in section 1.3 meet their required ratio (fails the build on regression).
- `eslint-plugin-jsx-a11y` in lint, and axe checks in Playwright for each primary screen (zero serious or critical violations).
- Playwright: exactly one `data-primary-action` per primary screen. Target-size assertions (bounding box at least 44 × 44) for buttons, tabs and task checkboxes.

Manual, per release:

- Keyboard-only pass, VoiceOver (iOS) and TalkBack (Android) pass on onboarding, an Explore pathway, and Plan.
- 200 % zoom and 320 px reflow. Windows high-contrast/forced-colors mode. Reduced motion.
- Throttled mid-range device check (CPU 4x, Slow 4G).
