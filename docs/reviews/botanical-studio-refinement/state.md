# Botanical studio repair: state note (handler 1 handoff, 2026-11-14)

Worktree `.claude/worktrees/studio-repair`, branch `worktree-studio-repair`, based on `origin/master` `70a66386`. `npm ci` is done. **No source edits yet**: handler 1 spent its context on the review below. Settings to keep: model `claude-fable-5-2`, permission mode `auto`, work stays with the handler (small coupled CSS; no worker needed).

## Owner directions, verbatim

1. "Check what changed in 'Refine Home and demonstration workspace as a botanical studio.' I think that it turned out awful, I want you to check it out and tell me if you agree or disagree and why."
2. "okay, do it" (answering handler 1's proposal: "keep the workspace chrome and undo the width cap, the phone header wrap and the Home hero scale").
3. "also, I think before it looked a bit more fun, you can use inspiration from the homepage to make it a bit more fun, but still the graph and tools are main content of course" (about the Demonstration workspace).

## Measured review of `4e844f56` (before = `3ac53060`, now = `70a66386`)

| Measurement | Before | Commit | Master now |
| --- | --- | --- | --- |
| Board width, `/complex-multiplication`, 1920×1080 | 1482 | 936 | 946 |
| Home h1 size at 1440 | 60px | 84px | 80px |
| Home `.demonstrations-opening-controls` top at 1440×900 | 751 | 852 | 872 |
| Home h1 top at 390 (header one row, then two) | 97 | 153 | 153 |

Kept as good: no coloured panel caps, no ochre heading dash, segmented inspector tabs, Literata titles, `contain: paint` (removed about 720px of phantom page scroll).

## Remaining steps, in order

**Commit A, repairs** (spec section to add: "Repair round 2026-11-14" in `docs/specs/botanical-studio-refinement.md`; update DESIGN.md Typography and Layout).

1. Width cap. `src/graphs/base/DemonstrationWorkspaceIdentity.css:13` and `src/AppHeader.css:21` both use `max(24px, calc((100vw - 1280px) / 2))`. Replace with one shared token in `src/shellTokens.css`, for example `--bezeg-shell-page-inline: max(24px, min(54px, calc((100vw - 1280px) / 2)))`, so the header stays aligned with the workspace. This leaves every viewport up to 1328px unchanged, which matters: Playwright smoke runs at 1280×720, and `tests/curve-ownership.smoke.spec.cjs:194` compares SVG paths exactly and passes only at some board widths (898px passes). Do not touch the 700px-and-below rules restored by `c0b86e6a`. Acceptance: board about 1480px wide at 1920×1080 and about 1000px at 1440; smoke unchanged.
2. Phone header. `src/AppHeader.css` rules at 700px and below: the 25px wordmark plus nav exceed 358px at 390, so `.app-header-actions` wraps. Cut toggle padding (borderless now, keep 44px min-height), action gap, select min-width and, if needed, wordmark to about 22px. Acceptance: one row at 390 and 360 in Slovenian and English; note that before the commit 360 already wrapped.
3. Home hero. `--bezeg-type-hero` (only user: `src/WelcomePage.css`) to about `clamp(2.25rem, 1.45rem + 3.2vw, 4rem)`; `.demonstrations-opening-image-stage` min-height 320 to 280 (the art is width-limited, so it keeps its size; 320 only adds blank cream); trim page gap 52 to about 40 and top padding 48 to 40. Acceptance: at 1440×900 the selector rail is fully visible; at 390×844 the featured card's "Odpri demonstracijo" is visible; headline on two lines on phones in both languages; `tests/home.smoke.spec.cjs` green.

**Commit B, workspace character** (direction 3; separate commit so the owner can revert it alone). Handler 1 loaded the `impeccable` skill, `bolder` playbook: amplify what the system already owns, add no new colour, font or primitive, make one decisive move and keep the rest quiet. Read `~/.claude/skills/impeccable/reference/craft-floor.md` immediately before UI edits and run `~/.claude/skills/impeccable/scripts/impeccable detect --json <changed files>` once at the end. Vocabulary already in the system: filled elder branches (`src/sideBotanicals/`, `docs/specs/side-botanicals.md`, shown on Home from 1600px), the 48px graph-grid backdrop with a fade mask (`src/learning/LearningPage.css:2`, `src/DemonstrationsPage.css`), `--bezeg-shell-shadow-card`, `--bezeg-shell-ochre`. The earlier workspace had a faded grid, an elder watermark behind the heading and soft panel shadows. Do not bring back the ochre heading dash or the coloured panel caps (owner flagged both), keep Presentation mode navy and plain, and take no width or height from the graph or inspector. Record the choice and rejected alternatives in the spec.

**Verify and publish.** `just check-changed`; `just smoke` for `tests/home.smoke.spec.cjs`, `tests/curve-ownership.smoke.spec.cjs` and the workspace, lesson and Presentation specs (shared shell and workspace changed, so follow `docs/smoke-tests.md`); screenshots at 360, 390, 1024, 1440 and 1920 in both languages, looked at before commit. Then `just publish --recipe runtime --base <base> --commits <ids>` and `just ci <sha>`.

## To report to the owner at the end

- Correction: handler 1 said the Home preview art "did not grow"; it grew about 5%, and the extra 40px of stage height is blank.
- Not in scope, still open: family label under the featured title; Home grid, green rail and ochre accents removed by `4e844f56`.
- The owner's main checkout is 210 commits behind `origin/master` and its `node_modules` is empty.
- Impeccable: "A newer Impeccable (v4.9.0) is available. Update now? It runs `npx impeccable update`." Also `.impeccable/design.json` is older than DESIGN.md; offer `document` to refresh it.
- Review screenshots: `C:\Users\1337Hacker\AppData\Local\Temp\claude\bffafdcc01e3f2c0\e64d020c-d8d3-4a96-9321-692e0e21b112\scratchpad\shots` (may be cleared).

## Handoff rule

At your own context handoff, rewrite this note, commit and push it, then start your successor with `claude --bg` as in `docs/agent-workflow.md` (handler budget, step 6) and pass this rule on.
