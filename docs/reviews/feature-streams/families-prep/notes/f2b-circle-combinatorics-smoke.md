# F2b circle and combinatorics browser smoke (partial handoff)

Checkout: stream-families-prep, HEAD 1dbe6ed9 (clean). Production preview at http://127.0.0.1:4321/bezeg-2.0, started and stopped by this run (confirmed unreachable afterwards). Browser: Playwright Chromium, headless. Scratch: .command-logs/f2b-cc-smoke/.

Status: PARTIAL. Catalog checks and visual review of screenshots not done; see gaps.

## Results per check

Route abbreviations: CC = circle-constructions, LP = combinatorics/lattice-paths, CT = combinatorics/counting.

| Item | Route | Lang | Result |
| --- | --- | --- | --- |
| 1 catalog card / link | all | SL, EN | Not run as a click test. Demonstrations page lists "Odpri" links to all three routes (SL). Family order not verified. |
| 1 console errors on load | all | SL, EN | Pass, no console errors or warnings. |
| 2 drag point | CC | SL, EN desk | Pass: centre (0,0) to (2,-1) and (3,-2); inputs updated. |
| 2 drag point | LP | SL, EN desk | Pass: target (5,3) to (7,2) and (6,2); inputs updated. |
| 2 valid edit | CC, LP | SL, EN | Pass, value applied. |
| 2 out-of-range | CC | SL, EN | Pass: 9999 refused, aria-invalid, visible reason ("Vnesi vrednost med −16 in 16." / "Enter a value between −16 and 16."), value restored. |
| 2 out-of-range | LP | SL, EN | Pass: 99 refused, visible reason, restored. |
| 2 out-of-range | CT | SL, EN | Pass: 9999 refused, visible reason, restored. |
| 2 modes | CC | SL, EN | Pass: tangents, radical, apollonius, common each selected. |
| 2 views | LP | SL, EN | Pass: paths, triangle, expansion each selected. |
| 2 ordered/repetition | CT | SL, EN | Pass: both checkboxes toggled. |
| 2 table replaces tree | CT | SL, EN | Partial: n,k = 3,2 shows no table line; 6,3 and 12,6 show "table is shown instead" text. No `<table>` element; visual not confirmed. |
| 3 reset returns default | CC, LP, CT | SL, EN | Pass: matches load-time baseline. |
| 4 preset save/reopen | CC, LP, CT | SL, EN desk | Pass: reopened state equals saved state. |
| 4 export/import | CC, LP, CT | SL desk | Pass: file exported, import valid, preset listed. |
| 5 Tab order | CC | SL desk | FAIL (candidate): DOM order is centre x, centre y, radius, P x, P y. Absolute y: P y (702) sits above centre y (736), radius (817) and P x (899). Not checked visually. |
| 5 Tab order | LP | SL desk | Partial: first 4 stops visually ordered; rest of sequence not reviewed. |
| 5 Tab order | CT | SL desk | Pass for first 4 stops; focus ring solid 3px. |
| 6 no horizontal overflow | CC, LP, CT | SL, EN 390 | Pass: scrollWidth = clientWidth = 390. |
| 6 controls reachable | CC, LP, CT | SL, EN 390 | Pass: no control outside or covered. |
| 6 board in viewport at load | CC, LP, CT | SL, EN 390 | Pass: board fully visible at load (top about 250-360 px). After EN switch and Edit click the board scrolls partly above the viewport (top -163). |
| 6 touch drag | CC, LP | SL, EN 390 | Pass: CDP touch moved the point (CC centre (0,0)->(5,4); LP (5,3)->(7,5)). |
| 6 touch drag | CT | SL, EN 390 | Not applicable: no draggable point. |
| 7 screenshots | all | | Captured (board and page PNG per run in .command-logs/f2b-cc-smoke/). NOT visually reviewed. |

Console: no errors or warnings in any run.

## Gaps

- Catalog family order (Geometrija ravnine, Verjetnost in statistika, Kombinatorika) and EN card titles not verified; EN card check needs the EN selector first.
- Link-open test not clicked from the catalog.
- Screenshots not reviewed (step 7). Counting table at 390 SL not visually confirmed.
- Circle Tab order (P y above centre y) needs visual confirmation before calling it a failure.
- Lattice Tab order after the 4th stop not reviewed.
- Counting has no drag point; the drag check does not apply.
- Empty-frame expectation (no lesson/poster/clip) not explicitly checked.
