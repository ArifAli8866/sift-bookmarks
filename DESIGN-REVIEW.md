# Sift — design review

A critical pass over the interface of the bookmark manager in this repo, run from the
designer's side of the glass: screenshots of every surface, then the code changes that the
screenshots argued for. Everything below was checked against a running dev server (Chrome
over CDP, real mouse/pointer events, 1440×900 @2× and 430×900 @3× touch emulation), not
against intent.

**How to run:** `npm run dev` → http://localhost:3000, `npm run check` for the gates in §7.
Re-shoot the review with
`python3 tools/cdp_shot.py --url http://localhost:3000 --out shots --steps /tmp/verify.json --wait 3`.

---

## 1. Point of view

Sift is a utility, not a landing page. The reference is macOS itself — Finder's list
view, Mail's sidebar, the Spotlight/Raycast palette — rather than a web-app dashboard.
Three rules were applied to everything:

1. **One voice.** A single accent colour, one radius family, one type ramp. If a
   surface needs more than that, the information is wrong, not the styling.
2. **Depth is a whisper.** Hairlines are 0.5px, shadows are wide and faint, glass
   (`backdrop-filter`) is reserved for the four surfaces that float over content:
   sidebar, toolbar, popovers, overlays. Never inside a card.
3. **Motion explains, doesn't perform.** 110–320ms, one deceleration curve
   (`cubic-bezier(.22,.8,.28,1)`), and every animation must be interruptible
   (FLIP settle, Escape cancels). Nothing loops.

What that explicitly excludes, because those are the defaults every AI-built admin UI
converges on: a row of stat cards on the dashboard, per-collection colour coding, icon
tiles with coloured gradient backgrounds, a dark mode that is simply "inverted",
and card hover states that translate/scale the card.

## 2. Tokens

| | light | dark |
|---|---|---|
| window / content | `#f6f6f8` | `#161618` |
| card surface | `#ffffff` | `#1e1e21` |
| text 1 → 4 | `#1b1b1f → #9a9aa1` | `#f1f1f4 → #7c7c85` |
| accent | `#0a7aff` | `#0a84ff` |
| favourite | `#b3801f` | `#dda84e` |
| hairline | `rgba(0,0,0,.09)` | `rgba(255,255,255,.075)` |

Type is the system UI stack (`-apple-system, "SF Pro Text", "Segoe UI Variable Text",
"Inter var"`) so the app reads as an app, with `Inter var` as the cross-platform
fallback and `font-feature-settings: "cv01","ss03"` for a slightly cooler texture.
Ramp: 11 / 11.5 / 12 / 12.5 / 13 / 15 — a card title and a section title are the same
15px/590 step, which is what makes the grid feel like one object. Numbers use a
separate mono ramp (`ui-monospace, "SF Mono"`) with `tabular-nums`; `font-variant-numeric:
tabular-nums` is why the sidebar counts and the age column can never shuffle.

Spacing is on a 4px lattice; radii are 5–13px and *nested* (a 11px card contains 5px
chips and 22px icon buttons), which is what makes macOS surfaces feel resolved.

Motion: `--t-tint 110ms` (colour), `--t-micro 130ms` (opacity), `--t-fast 170ms`,
`--t-base 210ms` (overlays), `--t-slow 260ms` (sidebar sheet), `--t-settle 320ms`
(drag drop).

## 3. Surface by surface

**Sidebar (236px).** Three groups — Library, Collections, Tags — with 11px uppercase-ish
section heads at `--text-4`, 13px rows, counts right-aligned in mono. The selected row is a
solid accent pill with white text (Finder's source list), everything else is tint-on-hover
only. Footer holds the theme cycle, the shortcuts sheet and a 10px `1.0`. No search box,
no "new collection" CTA banner, no user avatar: the sidebar is a filter list.

**Toolbar (52px).** Title + count badge, then filter, view segmented control, sort, New.
The title icon was removed in this pass: the sidebar already shows which scope is active,
and a second glyph beside the words was decoration. The count badge is now a *visible*
count (see §5.4), not a library total.

**Card (grid).** 22px favicon, 15/590 title (one line), 12px `host/path` where the host is
`--text-2` and the path `--text-4` — a two-level hierarchy inside one line. Footer rail
carries up to two tag chips, then age + star + ⋯ right-aligned. Height 100px; hairline
above the footer. Cards do not lift or scale on hover: they gain a 0.5px stronger border,
a 1px/24px shadow and a 110ms background tint. Star and ⋯ fade in at 130ms; pinned cards
keep the star at rest so state is readable without hovering.

**List.** `minmax(0,1.6fr) minmax(0,1fr) 112px 56px 52px` — title, url, tags, age, actions.
No column headers (deliberate: this is a personal library, not a spreadsheet), 34px rows,
zebra-free, and the whole row is one link.

**Sections.** Grouped by collection with a sticky head: icon, name, count, a hairline rule
that runs to the right edge. The head is a 34px band of the content colour with a
`backdrop-filter` — it belongs to the scroll view, not the toolbar, so two levels of
chrome never stack.

**Drag reorder.** Grab anywhere on a card (except the star/⋯/chips) arms after 4px of
travel; the card under the pointer gets a 1.5px accent ring and a lifted shadow; the other
cards slide to open the slot *live* — nearest-centre slot resolution over the original
rects, so the target is stable while the pointer sits still. Release settles with a FLIP
transform over `--t-settle`. Escape restores the original order. `is-reordering` disables
transitions on everything except the moving cards, and the click that follows a drag is
swallowed in the capture phase so a reorder never opens the link.

**Menu.** Right-click or ⋯: 220px popover, 0.5px hairline, 10px/8px padding, one accent
item (Open link), a `Move to` group, destructive last in red, shortcut hints in mono at
the right edge. It positions itself inside the viewport, and on touch it opens from the
same ⋯ that is visible at rest (§5.2).

**Palette (⌘K).** 620px, top-anchored, Spotlight metrics: 28px rows, 13px title, mono
domain hint at the right. Fuzzy scoring weights title 1.0, host 0.7+3, tag −6, favourite
+7. Action hints appear **only on the highlighted row** (§5.10) — a list where every row
shouts "↵ open" is noise. Bookmarks / Tags / Actions groups, footer hints, result count.

**Dialogs.** 480px sheet, title + ×, fields with labels above (11px `--text-4`), footer
with the ⌘↵ hint on the left and Cancel/primary right. The Address field carries the
fetched favicon inside it, which is the confirmation; the text line under it is reserved
for problems (§5.6). New bookmarks derive a title from the page once the icon resolves.

**Empty & loading.** Library-empty, scope-empty and no-results each get their own
sentence and at most one action ("Clear filter", "Add a link"), plus a 44px quiet glyph —
no illustration. The skeleton mirrors the real geometry (same 100px cards, same footer
rule) so the swap moves nothing; the first paint is the skeleton, server-rendered, so there
is no white flash and no false "No collections" (§5.9).

**Mobile (≤900px).** Sidebar becomes a sheet with a scrim, `visibility` flips after the
slide-out so a closed sheet can't be Tabbed into; nav selection closes it. One column.
Toolbar swaps the filter field for a search icon. Drag is gated on
`!(pointer: coarse)` — a long-press-drag is not implemented, so on touch the order is
keyboard/menu driven (Move up/down, ⌘↑↓) rather than pretending to work.

## 4. Interaction model

`⌘K` palette · `⌘N` new (prefills current collection) · `⌘\` sidebar · `⌘1/2/3`
All/Favourites/Recent · `/` focus filter · `Esc` clear filter, then blur · `?` shortcuts ·
single-key on the focused card `f` favourite, `e` edit, `⌫` delete, `⌘↑/↓` reorder ·
`⇧` in the palette edits instead of opening. Deletions toast with Undo. Focus rings are
`:focus-visible` only, so a mouse never sees them and the keyboard always does.

## 5. Defects found in this pass, and what fixed them

Each of these was reproduced with a scripted real-event interaction before and after.

**5.1 Drag dropped one slot short, and the card jumped on pick-up.**
Symptom: dragging card 1 onto slot 4 landed at 3. Cause: the offset was measured from the
*first qualifying pointermove* (which only fires after 4px of travel, ~145px after easing)
instead of the pointerdown, so every frame carried a phantom offset. Fix: `grabX = a.x -
rect.left` at pointerdown. Verified: index 0→3 gives `TS,Rust,MDN,React`→`MDN` at 3,
3→0 reverses correctly, adjacent moves work, and orders persist densely `0..n` with no
duplicates across 29 bookmarks.

**5.2 Card star and ⋯ were unclickable.**
Symptom: tapping ⋯ on mobile did nothing; the click navigated. Cause: the stretched link
(`.card-link::after { inset: 0; z-index: 1 }`) covered the footer actions — the chips had
been lifted above it, the actions had not. Fix: `.card-actions { position: relative; z-index: 2 }`
(rows already had it). Verified by clicking and asserting the popover and `aria-pressed`
change, in both views and on touch.

**5.3 Card titles truncated behind the action overlay.**
The star/⋯ used to float over the top-right corner, so a 0.5-line-long title lost its
tail. Moving them into the footer rail (and deleting the padding hack that reserved space
in the head) gave every title its full width: "TypeScript Handbook — Narrowing" and
"Rust Book — Error Handling" now fit without ellipsis.

**5.4 The count badge lied.**
Scoped to a collection of 5 links the badge read `29` (library total). Fix: the badge now
counts what is on screen, and only adds a denominator when the *filter* is what hides the
rest: `29` → `5` → `1 of 5` → `0 of 5`, each checked against the DOM card count.

**5.5 Menu could not be dismissed with Escape.**
Chrome re-focuses the element that received `contextmenu` after the event, which undid the
popover's synchronous `focus()`; Escape went to the card, not the menu. Fix: defer the focus
one `requestAnimationFrame` and add a window-level *capture* Escape listener. Verified:
`activeElement` is the popover, and `Escape` → `popover:false`.

**5.6 The new-bookmark sheet repeated itself.**
The URL field already shows the fetched favicon, yet a line under it restated the host in
11px. Now that line only appears for problems ("Checking the site…", "No icon for
reddit.com — name it however you like.", an invalid-address message), and the row keeps its
height so nothing shifts. Also fixed here: focused inputs drew a double ring (field glow +
browser outline) — the raw input's `:focus-visible` outline is now suppressed inside
fields; and the "Add to favourites" control was a bordered box that read as a text field,
now a quiet 30px checkbox row aligned with the picker beside it.

**5.7 Per-slot React re-render during drag.**
`setOverIndex` fired a re-render every time the pointer crossed a slot boundary — visible
as stutter in the 60px-per-frame test. The drop index is derived at release, so the state
was deleted along with the dead `data-dropIndex` writes; now only the transform writes
happen per frame.

**5.8 Sidebar chrome that carried no information.**
The duplicate title icon (§3, toolbar), the brand-count `29` next to "Sift", the card
`translateY` on hover, and the coloured-collection experiment were all removed. Nothing was
added to fill the space; the grid is the product.

**5.9 The first paint claimed an empty library.**
Before hydration the sidebar rendered "No collections" and `0` counts. While
`lib.hydrated` is false the sidebar now paints three skeleton rows and dimmed count
placeholders — the SSR HTML was checked directly (`is-sk` present, "No collections" absent).

**5.10 The palette shouted.**
Every row carried a right-aligned "open" while the footer already explained ↵, and the
domain hint competed with it. Hints now render only on the highlighted row, in symbol form
(`↵ open`, `→ go`), which is also how the ⌘N/⇧↵ affordances become discoverable without a
tour.

## 6. Known limits / next

- Touch reorder is menu-only; a long-press-to-drag with hysteresis would need a
  `touch-action: none` audit of the card first.
- Favicon fetch is a public endpoint stand-in; a real product proxies it (no CORS, no
  mixed-content surprises) and caches by host.
- The palette searches title/url/tags only. Full-text would want a worker and an inverted
  index; at 29 items it would be theatre.
- `--measure` caps content at 1220px; a 5K display therefore shows wide gutters. That is
  a deliberate line-length decision, but a "max columns" override could be a preference.
- Motion respects `prefers-reduced-motion` by collapsing to opacity-only, but the drag
  ghost still follows the pointer (a drag has no non-motion equivalent).

## 7. Verification

`npm run check` is the standing gate: it typechecks, then runs
`tools/design-checks.mjs`, which transpiles the pure helpers with the local
TypeScript package and asserts the things a reviewer would otherwise eyeball —
16 relative-time buckets (`44s → now`, `9d → 1w`, `40d → 1mo`, `366d → 1y`), the
url/monogram helpers behind every card line, the palette's ranking rules, and three
CSS contract rules that catch silent paint-time failures: every `var(--x)` in
`app/*.css` must be defined (73 of them), every `backdrop-filter` must have its
`-webkit-` twin, and every `color-mix` shadow must keep a plain fallback on the line
above (one was missing and was added).

```
npm run check          # tsc --noEmit + the assertions above — all pass
npm run build          # compiled, typechecked, 3/3 static pages
```

Interaction behaviour was verified with real pointer events rather than inferred from
code: `python3 tools/cdp_shot.py --url http://localhost:3000 --out shots --steps
/tmp/verify.json --wait 3` (the driver lives in `tools/cdp_shot.py`; each step prints
the DOM state it asserts, e.g. `{"popover":true}` → `Escape` → `{"popover":false}`).

Screenshots referenced above live in `shots/`: `30-light`, `36-list`, `37-drag-mid`,
`38-drag-after`, `40-palette`, `52-dialog-tags`, `53-shortcuts`, `54-empty-search`,
`55-collection-view`, `81-card-menu`, `88-dialog-filled`, `90-mobile-actions`,
`91-mobile-nav`, `95-shortcuts-nofocusring`. Earlier numbers (`01`–`14`, `20`–`28`)
are the pre-fix passes, kept so the before/after is checkable.
