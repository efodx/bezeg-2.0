# Task 07 slice 4 worker note: PARTIAL (second worker, budget handoff)

## Done (first worker): see git diff; followView contract, director follow, bisectionView.ts, BisectionGraph declaration, fragments, tests.

## Done (second worker)
- viewDirector.ts: "latest writer wins" (`intentWonAt`, `intentSeen`; set in `intentChanged` only for a non-learner write that MOVED the stored intent box; `target()` uses the intent while `follow()` still equals the follow seen at that write). Unit test "latest writer wins" in viewDirector.test.ts seen red (follow ignored the write: 1 failed) then green. A first version (any non-learner write) broke the lesson: every scene restates the default view, so the follow was ignored; hence the "moved the intent" condition.
- BisectionGraph.host.test.tsx: `beforeAll(() => installBoardShims())`; passes (pucks mount, assertion kept).
- parity.test.tsx: bisection SAMPLES entry (8 states, via `next-step` lesson actions and arbiter writes); `functions/__parity__/bisection.json` recorded. Declared the readout rows (`declaredRows`, `readoutHelp`), `declaredPanel` on the Orodja readout, row ids in `BisectionIds`, 3 keys `bisection_readout_fa/fb/fm` (sl/en in fragments/bisection.ts). `just graph-check bisection`: PASS (contract, parity 2, declaration 9; browser skipped).
- BisectionGraph.tsx: lesson morph writes a/b as `animation` and mid-glide brackets are invalid, which dropped the step (Back landed at step 0). Added `glideStep` (remembered at the first animation write of a glide, cleared by setExample, resetIteration, transition, a non-animation endpoint write). Back now restores the step.
- BisectionGraph.declaration.test.tsx: `DrivenBisectionGraph` subclass exposing the protected `applyLessonAction` (tsc TS2445 fixed).
- Suites (one run, before the glideStep/intentSeen changes): `just unit` controlsSignature, graphTeardownContract, GraphTransientState*, PresetRoundTrip.contract, declarationContract, src/graphs/functions, src/workspace, base/declare, localization, learning/content: passed (399 s). `npx tsc --noEmit`: clean (after the subclass fix, before glideStep). `just lint` on touched files: passed.

## NOT re-run after the last edits (glideStep, intentSeen, setExample revert)
- `just unit` on viewDirector.test.ts, BisectionGraph.* tests, parity/graph-check, tsc, lint. Re-run them.

## Spot-check (Vite 4483, script 07-morph-3a-remeasure.cjs; also new probes 07-follow-probe.cjs, 07-follow-frames.cjs)
1440x900 / 1280x720, latest run: Back within 2 % at every step except b13 (19.4 % / 27 %, Back from the free-exploration step). Glides per step: 0 or 1 except n13 first Next at 1440 (2). Largest single-frame jump FAILS the 30 % limit: n11 42 % / 34-38 %, n13 121-139 % (both viewports).
- n13 frame dump (07-follow-frames.cjs): during the a/b morph the box jumps, then the glide grows the box to width about 97 and SETTLES there (cubic, bracket [-1.5, 2]): the final fit is wrong, not just a jump. Suspects: the `view: bisectionCubicView` write of `bisection-free-scene` (intent wins until the follow changes, then the follow, but the follow changes every morph frame), or `bisectionFollowView` for transient invalid brackets (a, b between lesson values) giving a huge y range via sampling, or the keep-mode fit with marks. Not isolated.
- b13 mismatch is probably the same cause (Back to the free-exploration step).

## Third worker
- lessonMorph.ts: `morph: false` ranges skipped; a step that changes a bound choice/count (new dep `structuralKeys`) morphs nothing. graphDeclaration.ts `RangeParameter.morph?: false`; BaseGraph.tsx passes `morph` and `structuralKeys`; bisect-a/b `morph: false`. Both tests seen red then green. `glideStep` removed (Back within 2 % at every step but b13).
- bisectionView.ts: follow box height capped at 1x its width (cubic box was 41 high: equal-unit fit widened it to 97). n13 settles at ~16 wide now. Test bisectionView.test.ts.
- Not fixed: per-frame jump share (n11 ~55 %, n13 ~108 %, n14, b5/b10 ~30-35 %) is the zoom/pan ratio of lesson scene changes under linear ease-out; needs a different glide (log-space zoom / ease-in-out) in viewDirector. b13 Back mismatch 110-158 % remains (not isolated).
- Checks passed: unit (view, functions, declare, contracts), parity, graph-check bisection, tsc, lint.

## Open (older)
1. Isolate the n13 huge settled box and the n11 jump (log `follow()` and `target()` per frame; check `bisectionFollowView` with the morph's intermediate (a, b)).
2. Re-run the checks above and the 1280x720 numbers after the fix.
3. Decide whether `glideStep` belongs in the graph or in the morph (steps would survive for every iterative graph).

## Fourth worker
- viewDirector.ts: `glideBox` (geometric size, linear centre; linear fallback for zero/sign change) replaces linear box mix; test "the glide shape" seen red.
- b13 cause: a scene writes the default view then its own view in one tick, so every step flapped the intent and re-won over the follow. Now only the net move since the last fit counts (`intentPending`, settled in `fit`). Test seen red. Back is 0 % at every step (bisection, both viewports).
- graphDeclaration.ts: checkDeclaration rejects `morph` other than false (test). bisectionView.test.ts seen red without the cap.
- Open: per-frame jump (max coord delta / width) n11 55 % at 1440 (35 % at 1280), n13 35 %, because that step pans ~3 widths in 250 ms with ease-out cubic; needs ease-in-out or a longer glide, not done. Taylor 1440 b6 Back 3.5 % (not compared to before).
