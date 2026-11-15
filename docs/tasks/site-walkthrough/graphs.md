# Site walkthrough queue: graphs (package D)

Run state: waiting on the owner (affine clip)

Source: [graphs and captures spec](../../specs/site-walkthrough-graphs-and-captures.md) (approved 2026-11-14). State: [state note](../../reviews/site-walkthrough/graphs/state.md). Port 4333. Worktree `walkthrough-graphs`, branch `worktree-walkthrough-graphs`.

Rule (planning session, 2026-11-14): propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. The owner approved the capture-text rule, the three pilot directions (with leave to refine colours), Literata for graph text, the convexity sweep, the kitten and rust red for the envelope's current line on 2026-11-14.

| # | Slice | Intake IDs | State |
| --- | --- | --- | --- |
| 1 | Spec: capture-text policy, example table with ids, typography research, G06 cause, reference yardstick, acceptance | G01–G07 | Done, on `master` |
| 2 | Pilot: `prob-correlation`, `curve-envelope`, `interp-subdivision` | G02, G03 | Done; recaptured for real; envelope current line in rust red (owner's pick) |
| 3 | Captures runnable again; C3 tooling test; envelope colours; validator compares stored text patterns | G03, G04 | Done |
| 4 | Publish the pilot and capabilities | G02, G03 | Done, on `master` (`e01449db`, CI green) |
| 5 | G07 epicycles subjects: Slovenia, kitten (second drawing, approved), blossom | G07 | Done |
| 6 | C4 typography (Literata at the board), cross-family look, correlation label and surface readout fixes | G01 | Done |
| 7 | C5 convexity sweep | G06 | Done |
| 8 | Blocker triage over all 118 captures | G02, G03 | Done (`docs/reviews/site-walkthrough/graphs/blocker-triage.md`) |
| 9a | B1 Probability, B2 Interpolation | G02–G04 | Done, on `master` (`7b634d9d`, CI green) |
| 9b | B3 Bézier | G02–G04 | Done, on `master` (`b5fd6947`); extrapolation smoke fixed (`e676f01b`), CI green |
| 9c | B4 PH and parameterizations, with the `bezier` card | G02–G04 | On `master` (`b5fd6947`) |
| 9d | B5 curve geometry | G02–G04 | On `master` (`b5fd6947`) |
| 9e | B6 conics and three views | G02–G04 | Done, on `master` (`c181252c`) |
| 9f | B7 rational (policy reaches smartlabels) | G02–G04 | Done, on `master` (`c181252c`) |
| 9h | B8a functions and analysis, B8e capture-tool repair | G03, G04 | Done, on `master` (`f44ddd3e`, CI green) |
| 9g | B8b to B8d text sweep, B10 patches | G02–G04 | B8b, B8c, B8d, B8f published under the grant (`b8b`..`b8f` pages); `projective-cross-ratio` recaptured in B9; B10 and B8g (`inscribed-angle`, `euler-line`, `simson-line`, missed by the sweep) published under the grant (`b10`, `b8g` pages) |
| 10 | Epicycles catalog card with a subject (B9), with `voronoi-degenerate` | G07, G03 | Done (Slovenia at N = 10), published under the grant (`b9` page) |
| 11 | Repair the `bezier` restore step | G02 | Done, on `master` |
| 12 | Recapture guided example images per chapter (B11, brief `docs/reviews/site-walkthrough/graphs/b11/brief.md`) | G02 | Part 1 (56 retained images) on `master` (`42d5e56c`); part 2: all 30 chapter folders recaptured, checks updated (`2da033f9`), images, alt text and page (`c880b108`), then rebased onto `master` and `isometries` and `trigonometry` recaptured on master's code (`b41dfb8d`); publishing under the grant (`b11` page), result in the state note. Package done apart from the affine clip, which waits on the owner |
