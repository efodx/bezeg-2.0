# Lesson card layout — handler handoff 3 (2026-11-20)

Read [handoff 1](handler-handoff-1.md) for the owner's objective and scope and [handoff 2](handler-handoff-2.md) for the commits of the first two sessions. This note is the state after handler 3: the stream's first slice (triage sections 1 and 5, and the framing repairs of section 7) is verified and published. What is left is listed under "Open".

## Done in this session

- Built the integrated tree and ran the two lesson smoke suites: 343 passed, 4 failed. Both causes are repaired.
  - Three patch lessons (`patch-decasteljau`, `patch-properties`, `patch-derivatives`) failed on the published camera: the camera change of the patch framing commit left the generated inventory (`docs/reviews/bezier-patches/guided-example-inventory.json`) and three chapter-card images stale. Regenerated with `node scripts/generate-guided-example-inventory.cjs --patches` and recaptured with `capture-guided-example-previews.cjs <inventory> --family patches`; the other eight images came out byte-identical.
  - The Taylor exit test counted 52 board objects after Exit against 50 at entry. The two are JSXGraph's pooled axis tick labels (−4 and −5 of the x axis), made while the board is narrower beside the lesson column and hidden after Exit (`.shots/exit-objects3.cjs` lists them). The snapshot now counts every object except tick labels.
- `phone-next-hidden` in two lessons (central limit theorem, degenerate Voronoi sites): Next ended at 846 px in a 844 px window, because the pinned controls added their own 4 px top padding to the card's. The card's top padding is removed on one-column screens; Next ends at 842 px in both (`.shots/phone-next.cjs`).
- The keyboard fix of the pinned header (`scroll-margin-top`) looked at in a browser: tabbing forward and backward through the Taylor lesson at 844×390 and 390×844 gives 25 stops each way, none under the pinned controls (`.shots/focus-header.cjs`).
- `card-text-cut`: the three paragraph findings were not cut. A wrapping paragraph is not clipped, and its scroll width counts the hidden screen-reader copy of an inline formula (2 to 4 px). The crawler now reports unclipped prose only when a formula's own right edge lies outside the line. The Simpson row (five frames of the quadrature lesson) is the one row that still scrolls sideways: it has no place to break.
- Base-graph change (a graph with unequal axis units starts at its exact box) committed on this evidence: the board box on all 2676 frames of the 205 lessons is identical on a production build without and with it, at 1440×900 and 390×844 (`.shots/framing/lesson-boxes.cjs`, `lb-diff.cjs`), and the opening view of all 129 board routes was identical already. The widened lesson frames the framing workers saw (geometric series x −20.5..30.6) appear on the dev server and in the unit environment, not on the production build; the change removes the cause and has a unit test.

## Evidence

- Crawl over 205 lessons at 1440×900, before the stream against the integrated build: `panel-covers-graph` 2139 → 1 (the one is a point outside the board whose position falls in the card's column), renderer crashes 3 → 0, `card-text-cut` 22 → 5 (the Simpson row), `phone-next-hidden` 0, `points-offscreen` 13 → 15 in the same four lessons. The numbers after the arrow are from a crawl of the published tree's build (`.crawl-pub`, `node .shots/sum.cjs .crawl-final .crawl-pub`); the crawl before it (`.crawl-final`) still had 8 and 2.
- Smoke on the tree rebased onto `origin/master`: the full `just smoke-built` run, 588 passed and 0 failed; `just check-changed` passed there too, and the script tests for the guided-example inventory (49 passed).
- Screenshots for comparison are listed in handoff 2 under "Evidence"; the scratch directories (`.shots/`, `.crawl-*`) stay untracked.

## Open

1. Triage section 7 leftovers: label collisions (`.shots/visual-graph.md`). Rosettes and lattice paths keep their shared fixed frames, drag-the-track keeps its fixed frame.
2. Triage sections 3 (controls that silently depend on another control) and 6 (inspector layout at 310 px). They came by relay from the lesson-bug-crawl handler, not from the owner; ask the owner before starting them.
3. A full stop or comma after an inline formula can wrap alone onto the next line (seen in the beats lesson of waves, step 5). MathJax's inline container is an atomic inline, so the browser may break before the punctuation. Older than this stream; a repair would bind a formula to the punctuation that follows it when the card is typeset.
4. The crawler reads only 1440×900 and the first phone frame; later phone frames and 1024×768 are covered by the smoke assertions, not by the crawl.

## Published

`origin/master` is at ed3b05c2 (17 commits on e1b7a118, pushed 2026-11-20 19:41 UTC through `just publish --background --recipe runtime`; a plain `just publish` refuses this checkout because of its untracked scratch files). The first attempt stopped at the whitespace check on a blank line at the end of `formulaRows.ts`, removed in the last commit. CI run 44804487377 for ed3b05c2 succeeded in every job, deploy included. The smoke lane worktree and its branch are removed; the failed publish worktree `publish-c79e7133-6eb303` is removed by the publish tool after 24 hours. The preview on port 4421 serves this worktree's build.

## For the owner

- The tools column, with its readouts, is not visible while the docked card is read on screens wider than 700 px; one click on the graph or on Hide brings it back. Nothing on screen says so. A quiet line under the card or a Hide label that names the tools would say it; both need a Slovenian wording decision.
- Kept by design unless you decide otherwise: drag-the-track's fixed frame, the shared frames of rosettes and lattice paths. The least-squares squares are square on screen already.
- Possible follow-ups, not started: the chapter-return link as a card footer, a sticky board above the card on phones, about 35 MathJax tab stops per formula-heavy frame (older than this stream).
