# Shared lane brief: task 08, converting demonstrations

Every lane dispatch names a lane from `docs/reviews/ux-picks-app-wide/inventory/08-partition.json` (its demonstrations, graph
files, lesson files, own tests) and its worktree. Everything else is here.

## Role and rules

- `bezeg-worker` (Sonnet). Work only in the worktree the dispatch names; never `cd` elsewhere, never create a worktree,
  never commit or push. Send independent reads and searches in one message.
- **Owned**: the lane's graph files, its lesson files (only the frames of its own demonstrations), its own tests, new
  `<Graph>.declaration.test.tsx` files, its `SAMPLES` entries in `src/graphs/base/declare/parity.test.tsx` and their
  `__parity__/<id>.json`, and a fragment `src/localization/fragments/<demo-id>.ts` plus its one registration line in
  `src/localization/fragments/index.ts` for new text. Shared bases the lane owns (`ownedBases`) only when the dispatch says so.
- **Not owned**: `sl.ts`/`en.ts`, shared panels and bases (`BaseFunctionGraph`, `BaseCurveGraph`, `PointSetGraph`, ...), the
  all-graph suites (`PresetRoundTrip.contract`, `graphTeardownContract`, `controlsSignature`, `GraphTransientState*`,
  `declarationContract`), the `*.golden.json` files. A missing key, a needed base change, a failing all-graph case or a contract
  gap: stop that demonstration and report it.
- **Mathematics untouched**: no edit to evaluation, geometry or construction code.
- Contract decisions in force: `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md` "Triage decisions" (points are board-owned
  rows/legend only; vector parameters and 3D cameras stay in Orodja; board captions stay board-drawn).

## Read first

1. `docs/guides/converting-a-graph.md` (the conversion guide: placement rules, legend, actions, frames, section 7 checks).
2. The recipe for the demonstration's base class, from the worked example's notes:
   - `BaseFunctionGraph` subclass: `briefs/notes/08-base-function.md` "Recipe" (worked example `ExponentialFunctionGraph.tsx`).
   - `BaseCurveGraph` / `BaseBezierCurveGraph` subclass: `briefs/notes/08-curve-workspace.md` "Recipe" (worked example `BezierCurveGraph.tsx`).
   - `PointSetGraph` subclass: `briefs/notes/08-point-set.md` "Recipe" (worked example `PolygonAreaGraph.tsx`).
   - Plain `BaseGraph`: the guide plus a pilot of similar shape (`TaylorGraph.tsx`, `NotablePointsGraph.tsx`, `DecasteljauGraph.tsx`).
   All under `docs/reviews/ux-picks-app-wide/`.
3. Placement rule for pucks: `docs/tasks/ux-picks-app-wide/05-pucks.md` (owner: pucks for what a student flips or compares a lot,
   setup stays in Orodja, choices of at most 4 options, no locked pucks).
4. If the prototype has a declaration for the demonstration (`git show aff6df6c:<graph path>` contains `workspaceUx`;
   ids listed in `inventory/08-triage.md` line 21), read it for intent only; the contract here is the authority.

## Per demonstration

1. Record parity **before** touching the graph (recipe step 1). Record with `BEZEG_PARITY_RECORD=1 BEZEG_PARITY_ID=<id>` so other lanes' recordings stay untouched. A graph that shows no values gets parity `n/a` and no recording.
2. Convert by the recipe. Two judgements are yours, one line of reasoning each in the notes: where each non-slider control goes
   (board or Orodja), and the legend's default place when bottom right covers the data.
3. Declaration test, broken once (quote the failure).
4. Checks, all must pass:
   - `just graph-check <id> --route <route>` (route from the graph's `runtime.ts`; no `--base`: the handler runs the browser
     probe and fuzz at merge). Its rows: contract, parity (or n/a), golden, declaration.
   - `BEZEG_PARITY_GOLDEN_CHECK=1 BEZEG_PARITY_GOLDEN_ID=<id> just unit src/graphs/base/declare/parityGolden.test.tsx`
     (the old panel's values still shown where the panel remains; a deliberate difference is reported, never re-recorded).
   - `just unit <the lane's own tests> src/learning/content/declarationContract`.
   - `npx tsc --noEmit --pretty false`; `just lint <changed files>`.
   Run path-filtered in the foreground with a long timeout; never bare `npm test`/`npx vitest`/`npx playwright`; no
   `just check-changed`, no build, no browser.
5. Time: note the wall-clock minutes from start to green for the demonstration.

6. Tagging rule: a DOM event handler (`onChange`, `onClick`, a button, a slider) relies on `learnerInputTagging` (window capture
   listeners tag pointer, key, click, input and change dispatches as `learner`): no `runAs('learner')` in it. `runAs('learner', ...)`
   only for entry points outside the DOM: JSXGraph drag handlers, imperative calls (`performAction`) and tests.
7. The red check must break a value, `pressed` or visibility (a row text, a pressed state, a legend `visible`), not rename an id: an
   id rename fails on the id comparison alone and proves nothing about the values.
8. Run the family directory's tests (`src/graphs/<family>/`) and the lane's `sharedTests` from `08-partition.json`
   (`just graph-check` runs the shared ones), not only the graph's own tests.
9. The example for a function demonstration is function-inverse (legend with one entry per drawn object, board actions, two curves).
   A tools group that pucks may own is wrapped in `PuckOwnedGroup` (`src/graphs/base/controls/PuckOwnership.tsx`), so no empty
   group or orphan label is left. A subclass that drives a switch itself vetoes the base's puck for it (`curveDisplayPuck`).
   Refusal text uses the shared `DomainError` with a catalog `message(...)` (Slovenian and English), never English strings.

## Tough choices (owner, 2026-11-27)

When a choice is genuinely hard (two defensible placements, a contract reading you are unsure of, a fix that might change
meaning), do not guess: stop at a consistent point, write the question with the options and their trade-offs to your notes,
and return it as `QUESTION:` at the top of your report. The handler asks a Fable advisor and continues you with the answer.

## Report

At most 300 words: per demonstration one line `id: done | stopped (reason) — minutes — files — placement judgements`, the
observed red failure, controls left in Orodja and why, anything for the handler (missing keys, base changes, contract gaps).
Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-<lane id>.md`.

## Common misses (found at acceptance)

- A declared legend replaces the graph's own legend panel: make `renderLegend()` (or the inline legend block) render nothing
  once the legend is declared, or Orodja shows a second legend (L06).
- Marks cover everything the learner watches: every main curve (both curves of a pair, e.g. f and f⁻¹), not only the first
  `plotted` function, or the view director lets cards cover it (L06).
- Board-drawn captions (JSXGraph texts) are not marks: a card can cover them (counting-tree's row caption ran under Odčitki,
  L30). Marks (and `followView`) cover every caption the learner reads, caption wrap stays within the view box, and a
  browser shot at 1440x900 and 1280x720 of the lesson's main steps on the dev server (`http://127.0.0.1:4483/bezeg-2.0/`,
  `just shot`) confirms nothing read is under a card. The jsdom golden can drop a caption that fits in the browser (fixed
  300 px fake cards): report it; the handler re-records after the browser check.
- `just unit FirstTask` and `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>` run for
  every lane (check-changed does not select them; round 10 broke master CI on a FirstTask case).
- The multi-graph `*FirstTask.test.tsx` files (Functions, Bspline, Patch, ...) assert a graph's first control leads Edit; a lane whose
  control becomes a puck updates its case there as in 688294ccf (puck on `[data-puck-strip]`, absent from Edit). Lanes may edit
  their own demonstration's case only.
- Label/symbol rule: where a declaration sets `symbol`, the `label` / row `name` is the bare name ("Središče" + `c`, not
  "Središče c"); presenters typeset the symbol next to it. Puck labels are at most 16 characters (longer: short name + the
  symbol, siblings distinct). Orodja controls keep their old key and letter; add a bare key to the family fragment.
- Find the route in the graph's `runtime.ts` (e.g. `/functions/inverse`, not `/functions/<id>`).
- The golden and parity recorders only see text marked `data-readout`/`data-readout-note`. If the old panel shows sentences
  without those markers, the golden file holds none of them: before converting, add the markers to the unconverted graph
  (text unchanged), record parity with `BEZEG_PARITY_ID`, then convert (L01).
