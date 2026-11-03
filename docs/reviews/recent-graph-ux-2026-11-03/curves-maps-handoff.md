# Curves and maps UX review handoff

This is a partial reviewer handoff requested at the 136,479 request-input-token budget signal. Stop browser checks here and continue from these artifacts; the final `curves-maps.md` report is still unwritten.

## Frozen target and cleanup

- Production snapshot: `d2a3b6465f541c687811692f4ae1b3f720483141`, served by the handler-owned preview at `http://127.0.0.1:4323/bezeg-2.0/`. Reachability returned HTTP 200 and rendered the homepage.
- The only pre-existing unrelated working-tree files observed were `.claude/jobs/` and `debug.log`. No application source was edited.
- All custom Node/Playwright commands completed; the last 13-route run exited 0 and closed its browser and contexts in `finally`. The failed sandbox-only Chromium launch never opened a browser. The handler preview was left running.
- Required instructions/specs were read: `AGENTS.md`, scope, smoke-tester worker execution, smoke checklist, product/design guardrails, and the acceptance sections of the four family specs.

## Lesson coverage

All 13 included lessons were opened and clicked frame-by-frame to the final frame, then finished. First-pass progress and per-frame sequences are in `.command-logs/graph-ux-audit-2026-11-03/curves-maps/walk-0-4.json`, `walk-4-8.json`, and `walk-8-13.json`. A second pass confirmed final-frame, finish, and hide actions for all 13 in `route-actions.json` (`finalReached`, `finished`, and `hidden` are true on every row). Route screenshots from the walk are in the same log directory.

| Route | Final frame | Recorded route-specific action / status |
| --- | --- | --- |
| `bspline-basis` | 6/6, 2/2 | Parameter (t) keyboard-arrow test moved 0.50→0.51; board SVG and readout changed in `walk-0-4.json`. Second action attempt hit an ambiguous label (text field + slider). |
| `bspline-deboor` | 6/6, 2/2 | Parameter (t) moved 0.50→0.51; screenshot shows the readout updating. Whole-board SVG hash was unchanged, so inspect active construction coordinates before claiming geometric response. Second action attempt hit ambiguous label. |
| `bspline-insertion` | 6/6, 2/2 | Entered insertion value 0.5 and clicked Insert; graph text/readout changed. No geometry equivalence measurement. |
| `bspline-extraction` | 6/6, 2/2 | Example selector changed `quadratic`→`cubic`; graph readout changed. |
| `bspline-nurbs` | 6/6, 2/2 | (t) slider 0.063→0.064 changed the board snapshot. Weight 2 input accepted 0.8, but sampled graph text was unchanged; verify curve/readout before concluding response. |
| `prob-density` | 6/6, 2/2 | Mean slider moved 0→0.1 and board snapshot changed. Second action attempt hit ambiguous label. |
| `prob-binomial-normal` | 6/6, 2/2 | (n) moved 20→21 and board snapshot changed. Second action attempt hit ambiguous label. |
| `prob-clt` | 7/7, 2/2 | (n) moved 1→2 and board snapshot changed. Second action attempt hit ambiguous label. |
| `prob-summary` | 6/6, 2/2 | Numeric edit was not completed: `getByLabel('Vrednost 7')` matched a group and multiple inputs. |
| `prob-correlation` | 6/6, 2/2 | Actual pointer drag moved point ((2,2))→((2.2,2.4)); graph text changed. |
| `linear-map` | 6/6, 1/1 | Matrix input already held 2 after the lesson; the attempted action caused no further change. Choose a different coefficient or matrix preset. |
| `complex-reciprocal` | 7/7, 1/1 | Actual pointer drag moved (z=(1,1))→((1.4,1.5)); graph labels/readout changed. |
| `complex-roots` | 7/7, 1/1 | Degree input changed 3→4; readout changed. |

## Candidate visual finding and evidence

Observed at 1440×900 on `bspline-basis`: the recurrence equation in the first lesson frame runs past the right edge of the reading panel; its second half is visibly clipped in the screenshot. Treat this as a visual/math-layout defect to verify (including whether an internal scroll exists), not a prose critique. Suggested direction: break/alignment-wrap the recurrence or contain it in a clearly scrollable math block. Screenshot: `docs/reviews/recent-graph-ux-2026-11-03/evidence/curves-maps-bspline-basis-first-frame.png`; the graph without lesson overlay is `.../evidence/curves-maps-bspline-basis-graph.png`.

No confirmed mathematical/control bug is established by this partial pass. Positive observations: the calm cream/forest/ochre palette is coherent; graph titles and control labels are large and readable on desktop; probability, scatter and complex-map readouts respond to the exercised controls. Keep judgments separate from unfinished interaction coverage.

## Next bounded steps

1. Continue using the frozen preview and inspect the candidate equation clipping in its actual scroll container; view the saved screenshot before assigning priority.
2. At 1440×900, finish targeted controls using unambiguous selectors: B-spline weight response; summary value 7 edit; linear-map coefficient/preset change; de Boor next-level/play/reset; CLT play/stop; actual B-spline knot/control-point drags; verify insertion/extraction geometry and NURBS weight effect.
3. Capture and inspect 390×844 and 1920×1080 representative complex scenes (probability correlation or CLT, B-spline extraction/NURBS, complex maps). Check page overflow, graph/inspector access, target visibility, and lesson-hide/reopen behavior. No responsive or keyboard-accessibility pass has yet been completed beyond slider ArrowRight actions.
4. Check source line locations against the frozen revision if useful, then write `docs/reviews/recent-graph-ux-2026-11-03/curves-maps.md` with all 13 routes, observed findings vs aesthetic opportunities, concrete reproduction/impact/suggested direction, and gaps. Do not use a deterministic Impeccable scan or read the other reviewers’ reports.

## Existing evidence/scripts

- Scripts: `.command-logs/graph-ux-audit-2026-11-03/curves-maps/lesson_walk.cjs`, `route_actions.cjs`, `inspect_points.cjs`.
- Data: `walk-0-4.json`, `walk-4-8.json`, `walk-8-13.json`, `route-actions.json`.
- Pointer evidence screenshots: `evidence/curves-maps-prob-correlation-after-drag.png`, `evidence/curves-maps-complex-reciprocal-after-drag.png`, `evidence/curves-maps-complex-roots-after-degree-change.png`.
- This handoff and the five copied screenshots are the only changes created under `docs/reviews/recent-graph-ux-2026-11-03`; scripts and working screenshots stay under `.command-logs/graph-ux-audit-2026-11-03/curves-maps/`.
