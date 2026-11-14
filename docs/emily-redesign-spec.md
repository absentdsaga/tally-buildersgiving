![reference](https://mily.zo.space/tally/redesign-reference.png)

Reference image: https://mily.zo.space/tally/redesign-reference.png

**Goal:** Restyle the volunteer screen and the staff page to match the reference image: a light grey canvas, soft grey and lime rounded cards, a black icon rail, big thin numbers, pill-shaped everything. Desktop and mobile. This is a visual redesign. Every feature that works today must still work the same way after it.

## Rules for this change (read first)

1. **Do not change behavior.** Recording, counting, the "already counted" stamp, Approve / Fix, the grant report download, the sample week, the speaker toggle, the language toggle and the API calls stay exactly as they are.
2. **Keep every existing `id`, every `data-key` / `data-key-placeholder`, and these classes, because the JS uses them:** `hidden`, `recording`, `result-status`, `counted`, `not-counted`, `btn-text`. Before deleting or renaming any class, grep `public/app.js` and `public/staff.js` for it. Adding new classes and wrapper elements is fine.
3. **Work from the newest code** (the round 2 version that's live now), not the older GitHub copy.
4. **Files to touch:** `public/style.css` (rewrite), `public/index.html` and `public/staff.html` (new wrappers and layout), and `public/staff.js` only to add the chart and the KPI numbers, built from data it already loads.
5. **No new frameworks.** Plain HTML, CSS and JS. Two CDN links are allowed: the Google Font, and Lucide icons.
6. Any new visible text needs English and Spanish strings in the existing translation setup.
7. When done, run `bun test`. All tests must pass. Then check both pages at 390px wide and at 1440px wide.

## 1. Design tokens (put these at the top of style.css, replacing the old :root)

```css
:root {
  --backdrop: #abb6ae;      /* desktop only: sage behind the floating canvas */
  --canvas: #f3f3f3;        /* the app surface */
  --card: #eaeeea;          /* default card */
  --white: #ffffff;         /* tabs, icon tiles, inputs */
  --ink: #17181c;           /* text, rail, primary buttons, filled bars */
  --ink-2: #434547;         /* active icon on the rail */
  --lime: #f0faa0;          /* the one accent card, second chart series */
  --lime-soft: #fbffc7;     /* small % pills */
  --muted: #8b908c;         /* secondary text */
  --muted-2: #bfc3bf;       /* hints, dashed outlines, axis labels */
  --grid: #dde2dd;          /* chart gridlines */
  --danger: #e5484d;        /* ONLY for "Needs you today" and danger concerns */
  --r-canvas: 32px;
  --r-card: 28px;
  --r-tile: 14px;
  --r-pill: 999px;
  --font: "Inter Tight", -apple-system, "Segoe UI", sans-serif;
}
```

**Font:** add `<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet">` to both HTML files.

**Icons:** Lucide via `<script src="https://unpkg.com/lucide@latest"></script>`, use `<i data-lucide="name"></i>`, and call `lucide.createIcons()` after the page loads and after any re-render. Size 18px, stroke width 1.75.

## 2. The rules that make it look like the reference

- **No borders and no drop shadows anywhere.** Cards are separated only by color: grey cards on a lighter grey canvas.
- **Everything is round.** Cards 28px, the canvas 32px, buttons and tabs fully pill-shaped, icon tiles 14px.
- **Gaps are 12px** between all cards, on both desktop and mobile. Card padding is 24px (18px on mobile).
- **Exactly one lime card per screen.** Lime is the highlight, so it marks the single most important number.
- **Red appears only on concerns.** No other red, green or orange in the app. Remove the old green `--accent`.
- **Type:**
  - Page headline: 56px desktop / 34px mobile, weight 500, line-height 1.05, letter-spacing -0.03em.
  - Big numbers: 64px desktop / 48px mobile, weight 400, letter-spacing -0.04em. The unit next to it ("/ 40 hrs") is 15px `--muted`.
  - Card titles: 15px, weight 500.
  - Body: 14px, weight 400. Hint text: 13px `--muted`, one line, ellipsis.
- **Icon tile:** a 40px white circle (or 40px white rounded square, 14px radius) with an 18px ink icon in the middle. Every card title has one on its left.
- **Corner arrow:** cards that open something get a Lucide `arrow-up-right` at top right, 20px, ink.
- **Kebab:** KPI cards get a Lucide `more-vertical` at top right.
- **% pill:** a small `--lime-soft` pill (12px text, weight 500, 4px 8px padding) with a tiny ring icon after the number, sitting above the big number, right-aligned to it.

### The capsule meter (used in KPI cards and on the volunteer result)
A row of 10 vertical capsules, each 28px wide x 56px tall, 4px gap, fully rounded. Filled capsules are solid `--ink`. Empty ones are transparent with a 1.5px dashed `--muted-2` outline. Fill count = round(percent / 10). Animate filling left to right, 60ms apart.

### Buttons
- **Primary:** `--ink` background, white text, pill, 48px tall, 22px side padding, a Lucide icon before the label (`plus`, `download`, etc.), 15px weight 500.
- **Secondary:** white background, ink text, same shape.
- **Round icon button:** 48px white circle with an 18px icon (used for settings and the speaker toggle).
- **Tabs:** a row of white pills (40px tall, 18px side padding, 14px text). The active one is `--ink` with white text.

## 3. Staff page, desktop (1024px and up)

The body is `--backdrop`. The app sits on it as one floating `--canvas` panel: 24px margin all around, 32px radius, 24px inner padding. Inside the panel, a two-part grid: a **72px icon rail** on the left, then the content.

**Icon rail (left):** full height, `--ink`, 24px radius, icons in white at 60% opacity, stacked with 28px spacing. The active item sits in a 44px `--ink-2` rounded square at full opacity.
- Top: a 44px white-outlined circle with Lucide `sparkle` (the Tally mark).
- Then: `home` (staff dashboard), `mic` (link to the volunteer screen), `triangle-alert` (jumps to Needs you today), `file-down` (grant report), `clock` (updates log).
- Bottom: `volume-2` (the existing speaker toggle), `languages` (the existing language toggle), and a 44px circle with the coordinator's initials on lime.

**Header row:**
- Left: headline on two lines, with small pills set into the text the way the reference does it:
  > Today's `[white pill: users icon]` volunteers
  > and `[lime pill: clock icon]` their hours

  The inline pills are 56px x 36px, fully rounded, with an 18px icon, sitting on the text baseline.
  Spanish: "Los voluntarios `[pill]` de hoy / y `[pill]` sus horas".
- Right: round settings icon button, then the primary button **"Download grant report"** (this is the existing report button, restyled, with a `download` icon).

**Tabs row** (under the header, 24px gap): `All` (active) · `Needs you today` · `Waiting for approval` · `Approved` · `Sites`. Each tab scrolls to its section on the page. If a filter already exists, hook it up; otherwise scroll-to is enough.

**Main grid:** a 3-column area on the left (about 75% wide) and a 1-column stack on the right (about 25%).

Row 1, three cards, equal width:
1. **Hours counted** (grey card). Icon tile `clock`, kebab. % pill shows percent of today's goal. Big number = total hours today, then "/ 40 hrs" (if there's no goal setting, use 40). Capsule meter below.
2. **Approved** (the lime card). Icon tile `badge-check`. % pill. Big number = approved hours, then "/ [total] hrs". Capsule meter showing approved vs. total.
3. **Needs you today** (dark card, `--ink`, white text). Takes the place of the photo card in the reference. Top left: big white number of open urgent concerns, 64px, with a small `--danger` dot beside it. Under it: "Needs you today" in 22px white weight 400, at most 2 lines. At the bottom: a full-width white pill button "Review now" with a `play`-style arrow, which scrolls to the concerns. When there are 0: the number is 0, the text reads "Nothing urgent", and the button is hidden.

Row 2, one card spanning all three columns: **Hours this week** chart (grey card).
- Header: icon tile `bar-chart-3`, title "Hours this week" at 26px weight 400, legend dots ("● Approved" in ink, "● Waiting" in lime), and a white pill dropdown on the right showing "This week".
- Chart: one capsule per day (7 days), each 44px wide.
  - Ink capsule = total hours that day, scaled to the tallest day.
  - Inside it, starting at the bottom, a lime capsule = hours still waiting for approval.
  - A 10px white dot at the top of each capsule and at the top of the lime part.
  - Days with no shifts: a dashed `--muted-2` capsule at full height with a grey dot at the top.
  - Today's label is bold, and today's bar shows small tooltip pills: ink pill with white text for the total ("12 hrs"), lime pill for waiting ("4").
  - Horizontal gridlines in `--grid`, 1px. Y labels on the left, x labels (day and date, "Mon 10") underneath, 11px `--muted-2`.
  - Build it with divs and CSS heights computed in `staff.js` from the entries it already loads. No chart library. Bars grow from 0 on load, 500ms ease-out, 40ms stagger.

Row 3, spanning all three columns: **Updates** (the existing log, restyled). Each entry becomes a white row card, 18px radius, 16px padding:
- Left: a 40px lime circle with the volunteer's initials.
- Then name (15px 500) and below it the site + time in `--muted`.
- Then hours as a 28px number.
- Then status: "Already counted" as a grey pill, "Approved by ___" as a lime-soft pill.
- Right: the existing Approve (primary, small, 36px) and Fix (secondary, small) buttons.

**Right column, top to bottom:**
1. Two square tiles side by side (grey cards, centered content, white icon tile above a 15px label): **"Volunteer screen"** (`mic`, opens `/`) and **"Sample week"** (`calendar-plus`, the existing load sample week button).
2. Then one card per open concern, stacked: grey card, icon tile (`triangle-alert`, the icon turns `--danger` for danger or today), corner arrow at top right, the volunteer's name as the title, and their words underneath as 13px `--muted`, two lines max. Danger and today cards get a 6px `--danger` dot before the title. FYI concerns show the same card with no dot. The newest goes on top. If there are none, show one card: icon `check`, title "All clear", hint "No concerns today."

## 4. Volunteer screen, mobile first (this is the main phone screen)

- Body `--canvas`, 20px side padding. No floating panel on mobile.
- **Top bar:** left, the 40px ink circle with a white `sparkle` (Tally mark). Right, two round white icon buttons: the speaker toggle (`volume-2` / `volume-x`) and the language toggle (shows "ES" / "EN" in 14px weight 600).
- **Headline,** 34px, two lines, with an inline lime pill holding a `mic` icon:
  > Tell us about
  > your `[lime pill: mic]` shift

  Spanish: "Cuéntanos / de tu `[pill]` turno".
- **Name field:** a white pill input, 56px tall, 20px padding, placeholder "Your first name", with a `user` icon inside on the left. No border.
- **Talk button:** the hero. A 220px `--ink` circle centered on the page, with a 64px white `mic` icon and the label ("Tap to talk") under the icon in 15px white. Around it, a 12px `--lime` ring with a 6px gap.
  - While recording (the `recording` class): the circle turns `--lime`, the icon and text turn ink, and the ring pulses (scale 1 to 1.08, 1.2s loop).
  - The level meter under it becomes the capsule meter (10 capsules, filled live from the mic level). The timer sits below it, 28px tabular numbers.
- **Type instead:** a text link under the button, 14px `--muted`, underlined. The existing text area opens as a white 20px-radius card with the send button as a primary pill.
- **"Counting…" state:** the existing spinner becomes three 10px ink dots pulsing in turn, with "Counting…" beside them.
- **Result:** the lime card (one per screen, so this is it).
  - Top row: icon tile `clock` + "Your hours", and a status pill at top right ("Counted" ink pill with white text, or "Already counted at 3:12 PM" white pill).
  - Big number = hours, 64px, then "hrs" in `--muted`.
  - Capsule meter under it (hours out of 10).
  - Site name under it, 15px, with a `map-pin` icon.
- **Concerns on the result:** a separate `--ink` card under the lime one. White title "Staff will see this today", the volunteer's words in 14px at 70% white. Danger level adds a full-width white pill: "If someone is in danger, call 911" with a `phone` icon.
- **Bottom nav:** a floating black pill bar, 64px tall, 16px from the bottom and sides, `--ink`, with the nav icons in white at 60% opacity and the active one in a 44px `--ink-2` circle. Same icons as the desktop rail. Leave 96px of bottom padding on the page so nothing hides under it.

## 5. Staff page, mobile (under 1024px)

- No floating panel and no left rail. The bottom nav becomes the floating black pill bar described above.
- Headline drops to 34px, same inline pills.
- The report button goes full width under the headline.
- Tabs scroll sideways in one row with no visible scrollbar.
- The cards stack in this order: **Needs you today** (dark) → Hours counted + Approved side by side (2 columns, numbers 40px, capsules 18x40) → concern cards → chart (the capsules shrink to fit 7 across, 28px wide) → updates → the two square tiles.

## 6. Volunteer screen, desktop

Use the same floating canvas and the left rail as the staff page. Center the volunteer column at 520px wide inside the canvas, with the headline at 56px. Everything else as on mobile.

## 7. Motion (small and fast)

- Cards fade up 8px on load, 300ms, 40ms stagger.
- Big numbers count up from 0 (this already exists for hours, so keep it).
- Buttons scale to 0.97 on press.
- Respect `prefers-reduced-motion`: turn all of it off.

## 8. Done when

- [ ] Both pages match the reference: grey canvas, soft grey cards, one lime card, black rail or bottom pill, no borders, no shadows.
- [ ] Every round 2 feature still works: talk, counting, already counted, voice thank-you, speaker toggle, language toggle, Approve, Fix, grant report download, sample week.
- [ ] Spanish mode shows Spanish for every new label.
- [ ] Looks right at 390px and 1440px. Nothing hides under the bottom bar.
- [ ] Text contrast passes: ink on lime, ink on grey, white on ink.
- [ ] `bun test` passes.


## 9. UX upgrades (part of this same pass, these override anything above)

The reference image is a pretty dashboard for a desk. Tally is used by tired volunteers on phones and by a coordinator glancing across a room, and it will be judged on a projector. These changes keep the look and fix what the reference gets wrong for that.

1. **Urgent goes first.** On desktop, the dark "Needs you today" card moves to the FIRST position in row 1 (leftmost), then Hours counted, then Approved (lime). Reading order = priority order.
2. **The headline carries the live numbers.** Staff headline becomes: `[N] volunteers` `[users pill]` / `and [N] hours today` `[lime clock pill]`, with N filled in from the data and counting up on load. Spanish: `[N] voluntarios` / `y [N] horas hoy`. Someone across the table reads the day in one look.
3. **Readable grey.** The reference's light grey text fails contrast. Use `--muted: #5f6661` for ALL readable text (hints, sites, times, axis labels). Keep `#bfc3bf` only for dashed outlines and decoration. Minimum text size 14px everywhere (axis labels 12px). Many volunteers are over 55.
4. **Thicker outlines for the projector.** Dashed empty capsules use a 2px dash, not 1.5px. Gridlines `#d3d8d3`.
5. **Numbers don't jitter.** `font-variant-numeric: tabular-nums` on every number, timer and time.
6. **Talk button says how to stop.** While recording, swap the `mic` icon for a `square` (stop) icon and show "Listening… tap to stop" under it. On phones that support it, `navigator.vibrate(10)` on start and stop.
7. **The result is the moment.** When the result arrives: hide the talk button area, scroll to the top, and show the lime card with the volunteer's thank-you as its first line in 28px ("Thank you, Luis." / "Gracias, Luis."), then the big hours number counting up, then the capsules filling. Under it a secondary pill button "Tell us something else" brings the talk button back.
8. **Danger can't be missed.** If a concern is danger level, the "call 911" pill sits ABOVE the lime card, full width, `--danger` background, white text, `phone` icon, and is a real `tel:911` link. Florida Abuse Hotline as a `tel:18009622873` link under it.
9. **New entries announce themselves on staff.** When the staff page gets a new update, the row slides in at the top and its background flashes `--lime` for 1.2s, then settles to white. If it's a concern, the Needs-you number bumps (scale 1.15 then back). This is what judges will watch live.
10. **Empty states.** Before any data: the chart card shows one line, "No shifts yet", and a primary pill "Load sample week" (the existing button). The updates list shows "Updates show up here as volunteers talk."
11. **Remember the name.** Save the volunteer's first name in `localStorage` and prefill it next time, so a returning volunteer only taps and talks.
12. **Phone basics.** Use `100dvh` not `100vh`. Bottom bar and page padding add `env(safe-area-inset-bottom)`. All tap targets at least 48px. Inputs 16px font so iPhone doesn't zoom.
13. **Keyboard and screen readers.** Visible focus ring: 2px `--ink` outline, 3px offset, on every button, tab, link and input. Icon-only buttons get `aria-label`s in the current language. Switch `<html lang>` between `en` and `es` with the toggle.
14. **Projector width.** On screens wider than 1600px, cap the floating canvas at 1560px and center it, so the cards don't stretch thin.

Add to "Done when":
- [ ] Needs you today is the first card on desktop and on mobile.
- [ ] Every readable text color passes 4.5:1 contrast on its background.
- [ ] A danger concern shows a tappable 911 link above the result.

From Emily

