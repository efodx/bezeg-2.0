# Lesson card layout — handler handoff 5 (2026-11-20)

Read [handoff 1](handler-handoff-1.md) for the owner's objective and scope. This note is the state after handler 5, which stopped at its soft budget in the middle of the label collision slice (triage section 7). Spec, with the triage table and every decision: [lesson graphs: label collisions](../../specs/lesson-graph-label-collisions.md).

Branch `worktree-lesson-card-layout` in `.claude/worktrees/lesson-card-layout`. Workers: `bezeg-worker` Sonnet `medium`, each in its own worktree (`isolation: worktree`); the brief's first steps are `git reset --hard <integration head>` and the `node_modules` junction (`cmd //c "mklink /J node_modules C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\node_modules"`). Before removing a worker worktree, unlink its junction with PowerShell (`(Get-Item node_modules).Delete()`).

## Owner directions of this session (verbatim)

- "next sessions should be opus 5.5 high instead of fable": successors are started with `--agent bezeg-handler --model claude-opus-5-5 --effort high`, and each tells its successor the same.
- "update the opus budget, up it by 80%": done, Opus handlers get `BUDGET SOFT` at 315k and `BUDGET HANDOFF` at 387k (commit 6986d95b on master). Told to the owner and not answered: the Opus handoff signal now comes later than Fable's 342k; if Opus's window is not larger, cap it.

## Published

`origin/master` holds, on 2370a57e: the spec (2b7f569f, 8176aceb), the measurement `scripts/lesson-crawl/label-collisions.cjs`, and the Opus budget (6986d95b). They were pushed by the manual fast-forward of AGENTS.md, not by the gate: `just publish --recipe tooling` failed twice at `scripts/commands.test.cjs:82` ("keeps full logs…", `spawn EPERM` on this machine, exit 127 instead of 7; unrelated to the commits, and it passes and fails in other checkouts' logs). 263 of 264 tooling tests, the hook's 10 tests and lint passed. **Check `just ci 6986d95b`**: the Developer tools and Browser smoke runs were in progress at handoff.

## On the branch, not published, not reviewed

Pushed to `origin/worktree-lesson-card-layout` so it survives. Typecheck and the unit tests of `src/graphs/legend`, `curves/object`, `projective` and `PointStyles` pass at 7634157f.

- **LC-2, LC-3** (ff27cabf): cross-ratio and five-point names through the new shared `src/graphs/legend/pointNamePlacement.ts` (`placeNames`, `PlacedLabels`, `nameBox`, `tickStrips`): a name stays within 14 px of its own marker, off names, markers and ticks; thin lines only break ties. Lesson and route at 1440×900: 0 pairs (from 4 and 2); phone 0 and 1 (from 23 and 7). Looked at both lesson frames: every name reads by its own point. Worker smoke `just smoke-lesson projective-cross-ratio projective-five-point` passed. Not verified: Reset and the language switch in the browser, the five-point lesson's exact scene in the unit test (ellipse and parabola examples were used), the box estimate against rendered sizes.
- **LC-1** (the seven commits after ff27cabf, ending at 7634157f; `git log origin/master..HEAD`): De Casteljau scheme labels `p_i^r`, `r ≥ 1`, placed by `boardLabelPlacement` with two additive options (`LabelItem.prefer`, `LayoutContext.sampleCost`), pure module `src/graphs/curves/object/decasteljauLabels.ts`, wiring in `AbstractJXGBezierCurve.schemeLabelPlacement` and `PointStyles.constructionLabel`. Lesson and route at 1440×900: 0 pairs in LC-1a, 1c, 1d (from 1, 0, 2); crossings 3, 2, 1 (from 11, 6, 1). Phone unchanged by decision (boards under 480 px keep the compact layout). Worker smoke for decasteljau, decasteljau-alternative, subdivision, rational-decasteljau: 9 passed. Known misses: one update with nine control points costs 13.4–14.4 ms against 9.8–11 before (target was +3 ms; +1 ms at five points); LC-1c `p_0^2` is about 1 px over the 16 px gap; about 8.7 % of label-frames hop during playback. The handler has not looked at the final LC-1 renders (`agent-a983953a35c8c28d4/.shots/labels/worker-a2/`). In LC-1d the rational `w_1` text lies on `p_1^0` (out of scope, already so).

## Returned partial, not integrated

Worker C (LC-4 monotone triangulation, LC-5 segment intersections, LC-8 triangle solver) stopped at its budget with everything committed in `.claude/worktrees/agent-ae9382a7bfbba353d`, branch `worktree-agent-ae9382a7bfbba353d`, on ff27cabf: LC-8 633d57e9, LC-5 04848423, LC-4 0ee26de7, and a last WIP commit (tick strips with a 4 px margin as blocks for LC-4; unit test passes, not measured in the browser). Its note is `.shots/labels/notes/worker-c.md` there. Nothing runs at handoff.

- Measured at 0ee26de7 (pairs/crossings; lesson, route, phone; baseline in brackets): LC-4 0/2 (7/11), 0/2 (0/2), 2/3 (7/12), the two phone pairs being "v1 spodnje oglišče" on the ticks 2 and 4, which the WIP commit targets; LC-5 0/1 (1/2), 0/1 (1/2), 0/0 (1/5); LC-8 0/0 everywhere (1/0).
- Pre-change failures were observed for LC-8, LC-5 and the marker assertion of LC-4; LC-4's "lies on", "far from" and "leaves board" assertions were not seen failing on the old code.
- Not done: the browser measurement after the WIP commit, the step check through six algorithm steps, drag and Reset, `just smoke-lesson`, lint after the last LC-4 changes, a look at the route and phone renders.
- To settle in review: the s_k texts and P_i labels are created in `PointSetGraph.createDrawn`, which the worker did not own, so it restyles them from the subclass's `syncScene` (a constraint on the text, a label offset function, a WeakSet); a hook in `PointSetGraph` would be cleaner. The memo token of LC-4 and LC-5 scans board objects on every label evaluation: measure a step and a drag before accepting.

A fresh worker finishes it from that branch head (`git reset --hard worktree-agent-ae9382a7bfbba353d`).

## Remaining steps, in order

1. Finish worker C's items with a fresh worker (see above); look at its lesson-frame renders and the final LC-1 renders; cherry-pick its commits.
2. Dispatch LC-6 (trace–determinant, `src/graphs/linear/iterationBoard.ts:115`, the triangle's name is a fixed text at (0, 1,15)), LC-7 (drag the track, `src/graphs/mechanics/DescentGraph.tsx:460-546`, `tagText`; the graph-character branch edits the same calls) and LC-9 (PH quintic: `showEvaluationPoint` in `src/graphs/curves/object/AbstractJXGPointControlledCurve.ts:383`; the label `B(\frac{1}{2})` is drawn large on p₃ and the tick; the lessons write `\tfrac12`, and 12 lesson scenes use this point). Use `pointNamePlacement` for names beside markers; the spec has each decision.
3. Review routing for a large diff: one `bezeg-reviewer` Sonnet for engineering (ownership and disposal of the memos, the JSXGraph internals read through casts in `schemeLabelPlacement` and `tickStrips`, the memo keys) and one for UI and accessibility on the renders. Then `just check-changed origin/master`, `just smoke-lesson` for every changed graph, and a `bezeg-smoke` pass for Reset, drag and language switch on the changed routes.
4. Re-run `node scripts/lesson-crawl/label-collisions.cjs` three ways (lesson, `--route`, `--vp 390x844`) on the integrated build, update the spec's status and numbers, write the evaluation entry (worker runs: A 144k tokens partial, B 145k partial, A2 77k, B2 81k, C running), rebuild and restart the preview on port 4421, publish with `just publish --background --recipe runtime`, check `just ci`.
5. Report to the owner in plain prose with before and after screenshots (before: `.shots/labels/before/`; baseline numbers `.shots/labels/before*.txt`: 31 pairs and 64 crossings in the lesson frames, 10 and 44 on the routes, 84 and 88 at phone size) and what remains.
6. Remove the worker worktrees and branches after integration: `agent-ad2ae06e6ade79413`, `agent-ab69b6132bc5c4ac8`, `agent-a983953a35c8c28d4`, `agent-a4e292567bfe621d6`, `agent-ae9382a7bfbba353d` (junction first).

## Open

1. The slice above.
2. Waiting for the owner, not to be started: the hidden-tools wording (handoff 3); the phone-navigation handler's question about a short frame ([its note](phone-navigation-handoff.md)).
3. Carried from handoff 4: a full stop wrapping alone after an inline formula; the crawler reads only 1440×900 and the first phone frame; the Voronoi Edit tab's first group has no heading; the Farin chapter text says "vključi stikalo".
4. Seen in this slice, not changed: control point labels lie on their polygon legs on every curve graph (out of scope in the spec); monotone triangulation names one vertex twice (P₂ and v2).

## For the owner

- The `spawn EPERM` failure of `scripts/commands.test.cjs:82` blocks every `tooling` publish from this machine.
- The scheduled run of 2026-11-20 11:41 UTC (44729645497) is still the latest and failed; outside this stream (handoff 4).
- Decided without you, each reversible: labels are placed by search instead of fixed offsets; a name stays beside its own point even when a thin line runs through it; the placement module of the projective graphs lives in `src/graphs/legend/` for the other graphs.
