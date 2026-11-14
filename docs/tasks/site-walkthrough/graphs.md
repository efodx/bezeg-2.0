# Site walkthrough queue: graphs (package D)

Run state: active

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
| 9b | B3 Bézier (`extrapolation`, `repeated-subdivision`, `reduction`) | G02–G04 | Shown to the owner; `affine` unchanged with reason; `bezier` blocked on the capture tool |
| 9c | B4 PH and parameterizations, with the `bezier` card | G02–G04 | Shown to the owner (`b4.html`) |
| 9d | B5 curve geometry | G02–G04 | In work; the owner agreed to the rust-red osculating circle |
| 9e | B6–B8, B10 | G02–G04 | Next, one at a time |
| 10 | Epicycles catalog card with a subject (B9) | G07 | After 9c; its recipe label is stale |
| 11 | Repair the `bezier` restore step | G02 | Done (`49e6013a`, not yet published) |
| 12 | Recapture guided example images per chapter | G02 | Open |
