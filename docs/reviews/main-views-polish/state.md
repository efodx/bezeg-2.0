# Main views polish: state note

Owner request (2026-11-13, verbatim): "/impeccable I want you to polish the page and its main views. So homepage, demonstrations, learn". Later, verbatim: "if you'll be spawning any workers/successors for this session chain, you should be using Fable 5.2 instead of opus."

## Where things stand

- Worktree `.claude/worktrees/polish-main-views`, branch `worktree-polish-main-views`, based on `origin/master` at `6ed90a04`. Only this note is committed; **no UI edit has been made yet**.
- Handler 1 did the evidence pass (rendered review at 1920, 1366, 900, 390 and 320 px, sl and en, hover/focus/empty/open states) and produced the fix list below. Handler 2 implements it, verifies, commits and pushes.
- `npm ci` has run in this worktree. The main checkout's `node_modules` is empty; do not rely on it.
- Settings to keep: model `claude-fable-5-2` for the handler and every worker (owner direction above); pass the same rule to any successor. Standing owner preference: decide without asking, record the reason, report it so the owner can overrule.

## Method constraints (Impeccable polish)

This is refinement of the recorded look in `DESIGN.md`, not a redesign: keep copy, behaviour, the elderflower art, the 5px green rail on the featured card, the grid backdrop, the system-sans stack and the carousel behaviour. Read `C:\Users\1337Hacker\.claude\skills\impeccable\reference\craft-floor.md` immediately before the first UI edit. After the edits run the detector once: `C:/Users/1337Hacker/.claude/skills/impeccable/scripts/impeccable detect --json <changed files>`. Verify by looking at the rendered pages, batching fixes between looks.

## Fix list, in priority order

Files: `src/WelcomePage.{tsx,css}`, `src/HomeDemonstrationsCarousel.css`, `src/DemonstrationsPage.{tsx,css}`, `src/DemonstrationCollection.css` (shared with the workspace picker dialog), `src/learning/LearningPage.{tsx,css}`, `src/shellTokens.css`, `src/localization/{sl,en}.ts`, `src/WelcomePage.test.tsx`.

Functional and accessibility:

1. **Demonstrations topic list is unreachable on laptops.** `.demonstration-topics` is `position: sticky; top: 18px` and 992px tall; at 1366×768 its bottom sits at 1010px, so the last topics cannot be reached until the end of a 20,000px page. Give it `max-height: calc(100dvh - 36px)`, `overflow-y: auto`, `overscroll-behavior: contain` and the shell scrollbar colours. The picker already bounds it (`DemonstrationPicker.css:27`); keep that working.
2. **Contrast.** `.demonstrations-catalog-family` `#75816d` on `#fffdf6` is about 4.0:1 at 11px: use `--bezeg-shell-label`. Topic counts `#66755f` are 4.49:1 on the canvas and about 4.1:1 on the selected tint: use `label`, and `label-selected` when pressed. Search placeholder is browser grey `rgb(117,117,117)`: use `label` with `opacity: 1`.
3. **Phone carousel layout shift.** At 390px the featured card is 466px on four slides and 488px on two (measured), so the rail jumps on every auto-advance. Reserve the copy height at ≤700px (find whether the title or the paragraph wraps, then set a `min-height` in lines) so all six slides measure the same.
4. **Selected topic loses its tint on hover**: `.demonstration-topics button:hover` comes after the pressed rule. Exclude pressed from the hover rule.
5. **Phantom scroll.** `.welcome-page` and `.demonstrations-page` use `min-height: calc(100vh - 64px)` under a 72px desktop header, so the home page scrolls 8px at 1920×1080 with nothing to reveal. Use 72px on desktop and keep 64px at ≤700px (Learn already uses 72px); prefer `dvh`.

Hierarchy and system drift:

6. **Remove the eyebrow above the h1 on all three views** ("Bezeg · Raziskuj krivulje" on Home and Demonstrations, "Bezeg · Učenje" on Learn). Reasons: the craft floor bans a kicker above a heading; the three are styled inconsistently (regular mixed case on two, bold uppercase on Learn); they repeat the header brand and active nav item; and `docs/specs/lesson-panel-visual-refinement.md:10` already removed redundant eyebrows. This overrides `docs/specs/learn-landing-visual-alignment.md` (lines 30, 34, 66) and `docs/specs/homepage-carousel-and-demonstrations-catalogue.md:22`: record the decision and the rejected alternative (unify the style and keep them) in those specs and in `DESIGN.md` ("Learn landing" paragraph). Update `src/WelcomePage.test.tsx:95`, delete the `bezeg_explore_curves` key from `sl.ts` and `en.ts` together (only these three places use it), and drop `--bezeg-shell-eyebrow` if nothing else uses it. **Make this its own commit** so the owner can revert it alone.
7. **Home primary action floats.** "Vse demonstracije →" sits unanchored between the headline and the botanical (x≈720–920 of a 1100px column at 1366; at ≥1600 the botanical is hidden but its 250px reserved padding remains). Decision: put the action under the intro copy in the left column at every width (the arrangement already used below 820px), keep the botanical in its corner, and drop the reserved padding at ≥1600px. Rejected: anchoring the action at the right edge under the botanical (overlaps the stem at 820–1000px). Add `--bezeg-shell-shadow-action` to `.welcome-primary` (Learn's start action has it; `DESIGN.md` says action links use it) and `text-wrap: balance` to the home h1. Record the change in `docs/specs/homepage-visual-flair.md`. Learn keeps its right-side start action: it is anchored to the card edge there.
8. **Demonstrations summary floats.** "18 tem · 138 prikazov" is pushed to the middle of the row by `justify-content: space-between` inside a 780px heading. Stack it under the lead as a 13px `ink-secondary` line, the same as Learn's `.learning-counts`.
9. **Terminology.** `catalog_summary` says "prikazov" in sl and "families" in en, while every other string on the page says "demonstracij" and "topics" (`catalog_result_count`, `catalog_all_topics`). Change to "{value0} tem · {value1} demonstracij" and "{value0} topics · {value1} demonstrations"; check `docs/localization.md` first and run `just check-localization`.
10. **Token drift.** `DemonstrationsPage.css` and `DemonstrationCollection.css` hard-code hex values; Home and Learn use `--bezeg-shell-*`. Map them: `#f7f5e9` canvas, `#19372f`/`#203b33`/`#213f2c` ink, `#526152`/`#5d6d5b`/`#63705c` ink-secondary, `#354b3d`/`#29452e`/`#34543a` choice-ink, `#fffdf6` preview-panel, `#d5dccd` rule, `#dbe2d4` media-rule, `#eaf0e3` media, `#c4cebb` control-rule, `#edf2e7` choice-selected, `#e7eddf`/`#e5ebdc`/`#e2ecd9` nav-active, `#c4d0bb`/`#b9c5b1` rule-active, `#edf1e7` control-hover, `#785016` lesson-ink, `#f0e4c9` lesson-hover, `#456db0` focus, grid lines to `--bezeg-shell-grid`. Add one token, `--bezeg-shell-field-rule: #aebba6`, for the search input and mobile select border. In `LearningPage.css:101` replace `#577cc3` with `--bezeg-shell-header-focus` (exact match). Leave `DemonstrationPicker.css` alone.

Detail:

11. **Card actions are misaligned.** "Odpri" text starts 12px right of the title and copy. Use 8px horizontal padding on `.demonstrations-catalog-action` and `padding: 10px 12px 12px 5px` on the row so the label lines up with the copy at 13px; keep 44px targets. Remove the dead duplicate rule (`DemonstrationCollection.css:34-35` sets a background and then clears it).
12. **Home rail is inset 6px from the card edge.** Add `margin-inline: -6px` to `.demonstrations-opening-rail` (the 6px padding stays for focus rings) and `scroll-padding-inline: 6px`; confirm no horizontal page scroll at 390 and 320px.
13. **Phone featured actions.** At 390px "Vodeni primer →" wraps under the primary button and its text is indented 14px. At ≤480px stack both actions full width.
14. **Search field.** Hide the native `::-webkit-search-cancel-button` (the explicit "Počisti iskanje" button duplicates it and the native one is unthemed blue), set `caret-color` to the action colour, give the clear and no-results buttons a hover state (`control-rule-hover` border, `nav-active` background) and 14px text. Typed text looked pale grey in the capture: read the computed `color` of `#demonstration-search` with a value and fix it if it is not `ink`.
15. **Browser surfaces.** Add the `::selection` rule Learn has (`LearningPage.css:3`) to `.welcome-page` and `.demonstrations-page`; `font-variant-numeric: tabular-nums` on topic counts and the result count.
16. **Learn thumbnails on hover.** The poster's baked cream background shows as a lighter box on the hovered row: `mix-blend-mode: multiply` on `.learning-thumb img`.
17. Demonstrations h1: `margin: 0 0 12px; line-height: 1.1`.

Left alone on purpose: the scarab glyphs in the footer (owner's wording), the 5px rail, border-plus-shadow cards and unicode arrows (recorded in `DESIGN.md`), the full-width search field, the header wrapping to two rows at 320px.

## Verification still to do

- Dev server: `npx vite --port 4471 --strictPort --host 127.0.0.1` (handler 1's may still hold the port; use another and edit the scripts). Open `/bezeg-2.0/` with the trailing slash. The dev-only 404 for `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js` is a pre-existing `%BASE_URL%` doubling in `index.html:22`, outside this task; mention it in the report.
- Scratch capture scripts (untracked, do not commit): `.polish-tmp/shots.cjs <outDir> [filter]` (three views × four widths, overflow and console check) and `.polish-tmp/states.cjs <outDir>` (sticky list position, card heights per slide, empty/hover/focus/Contents states, 320px, English). Baselines are in `.polish-tmp/before` and `.polish-tmp/before-states`.
- Re-measure: topic list bottom ≤ viewport at 1366×768; equal card heights on phone; `scrollWidth == clientWidth` everywhere; home `scrollHeight == 1080` at 1920×1080; contrast of the changed labels.
- `npx tsc --noEmit --pretty false`, `just lint`, `just check-changed`, production build; the picker dialog shares `DemonstrationCollection.css`, so look at it once in a workspace (`/bezeg-2.0/bezier/curve`, open the demonstration picker).
- Controls and routes changed on three views: run the `smoke-tester` rows for home, the catalogue and Learn.
- Update `DESIGN.md` (eyebrow removal, home action position, catalogue tokens) and the specs named above. Commit in small commits (eyebrow removal separate), then publish per `AGENTS.md` ("Push" means fast-forward to `origin/master` after fetch and rebase; `just publish`).

## Report to the owner at the end

What changed per view, the two decisions that override earlier specs (eyebrow removal, home action position) with the commit to revert for each, checks run, and the dev-only 404 noted above.
