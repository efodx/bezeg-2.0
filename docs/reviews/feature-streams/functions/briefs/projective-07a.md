# Brief handoff-v13: projective conics 07a (K4 five-point graph, F2a)

- **Role:** implementation; edit permission in the stream worktree `.claude/worktrees/stream-functions`. Do not commit, push or delegate. Preserve the untracked files under `docs/reviews/feature-streams/functions/`.
- **Source:** K4 in `docs/specs/projective-conics-lessons.md` (§K4 graph needs and acceptance 1–7; §Implementation Decisions), `docs/tasks/projective-conics/07-batch-b.md` (F2a), ADR 0033. No route, no lesson, no chapter in this slice (that is F2b–F5).
- **Pattern to copy:** the K3 slice: `src/graphs/projective/PolePolarGraph.tsx`, `polePolarModel.ts`, `polePolarEdit.ts`, `polePolarText.ts`, `PolePolarControls.tsx`, their tests, and the parser in `projectivePresetCollection.ts` (board ownership, disposal, language switch via `onLanguageChange`, keyboard stepping, Preset validation with actionable errors). Kernels to use, not change: `src/projective/conic.ts` (`conicFromFivePoints`, `classify`), `rationalArc.ts` (`rationalArc`: control points, weight, Farin points, shoulder, denominator zeros, typed statuses), `conicSampler.ts` (`sampleConic`, `DEFAULT_SAMPLE_DENSITY`).

## What to build

New files `fivePointModel.ts`, `fivePointEdit.ts`, `fivePointText.ts`, `FivePointGraph.tsx`, `FivePointControls.tsx` and tests under `src/graphs/projective/`, and one `projective-five-point` parser in the Preset collection module.

- **Model (pure, React/JSXGraph free):** five finite points stored as integer numerators over the fixed denominator 15; arc end indices `a ≠ b` and third-point index `t` (distinct from both); example id. Pointer drag and arrow keys snap/step to 1/5 (numerator multiples of 3); examples load exact points. Derived: `conicFromFivePoints` status (`unique | line-pair | pencil | invalid`), conic type, and for `unique` the `rationalArc` result. Keep the last unique conic in state with a `stale` flag when the current position is degenerate (acceptance 6).
- **Examples** (verify each in the model test with exact arithmetic, no three collinear unless stated):
  - `ellipse` (default): (5,0), (0,3), (−5,0), (4,9/5), (−3,12/5); ends (5,0),(0,3); third (4,9/5). Expect conic 9x²+25y²−225 up to scale, P1=(5,3), w²=1/2, w=√2/2 to 1e-12, Farin (5, 1.2426…), (2.0711…, 3), shoulder (3.5355…, 2.1213…).
  - `hyperbola`: (3,0), (5,16/3), (17/5,32/15), (−3,0), (5,−16/3); ends (3,0),(5,16/3); third (17/5,32/15). Expect 16x²−9y²−144, P1=(3,2), w=2/√3, denominator zeros ≈ −1.366 and 2.366.
  - `parabola`: (0,0), (4,4), (1,2), (1,−2), (4,−4); ends (0,0),(4,4); third (1,2). Expect y²−4x, P1=(0,2), w=1 exactly, shoulder (1,2).
  - `three-collinear`: (0,0),(1,1),(2,2),(3,0),(0,4) → `line-pair` (96x²−24xy−72y²−288x+288y up to scale).
  - `four-collinear`: (0,0),(1,1),(2,2),(3,3),(0,4) → `pencil`.
- **Graph:** five draggable grid points (labelled P₁…P₅ or A–E, your choice, consistent in both languages), the conic drawn from the exact coefficients through `sampleConic` (hyperbola branches never joined), the chosen arc ends highlighted, both end tangents, P1, the control polygon, the weight readout (exact `w²` fraction and, when rational, `w`; decimal otherwise), the Farin points and shoulder, and the overlay of the arc drawn by the existing rational curve evaluator (`RationalBezierCurve` or its kernel in `src/bezeg/impl/kernels/bezier-kernels.ts`, read only) with weights [1,w,1]. An "extrapolation" toggle draws the arc for t outside [0,1] (dashed), split at the denominator zeros and never joined across one.
- **Deviation readout (acceptance 3):** max over 200 samples of the arc of the first-order distance |Q(p)|/|∇Q(p)| to the exact conic; must be < 1e-9 on all three conic examples (test it). The figure text says it is a sampled check.
- **Status line** with an actionable message for: `line-pair` (three collinear: name them), `pencil` (four collinear or a repeated point), `invalid`, arc `split-needed` (parallel tangents: "choose a point between", mention the circle lesson's three-piece minimum, see `MIN_CIRCLE_PIECES` in `RationalBezierCurveCircleGraphN.tsx`), `complementary-arc` (the third point is on the other arc), `no-real-weight`, and for `ok` a note that the Bézier covers one side only (acceptance 5). Stale conic drawn greyed/dashed with the status saying so.
- **Controls:** example select, arc end selectors and third-point selector, extrapolation toggle, numeric x/y inputs per point (accessible labels), Reset. Keyboard: arrow keys step the focused point.
- **Locale:** one `projective_five_point_*` block after the existing projective keys in `sl.ts` and `en.ts`, lockstep. Reuse existing Slovenian terms (grep `sl.ts` for Farin, utež, tangenta, stožnica, par premic, šop) and `docs/tasks/projective-conics/README.md` §Slovenian terms; for a genuinely new term follow `docs/localization.md#choosing-new-terms` and list it in your report. Math in board/readout text follows the existing projective text helpers.

## Checks

- `npx tsc --noEmit --pretty false`; `npx eslint` on touched files.
- `BEZEG_MEMORY_FLOOR_GB=0.5 just unit src/graphs/projective src/projective src/i18n` (adjust the i18n path to where locale tests live). Never bare `npx vitest`; not the full suite.
- Host test like `PolePolarGraph.host.test.tsx`: mount, drag/step a point, example switching, degenerate and stale states, language switch updates board text, import/Reset, unmount leaves no board objects.
- Mutation evidence: for at least four new assertions (wrong P1, wrong weight, joined hyperbola branches or crossing a denominator zero, stale flag not set, invalid Preset accepted), report the observed failure.

## Return

≤ 400 words: files changed, checks with log paths, mutation evidence, example numbers as computed by your tests, new terms, deviations as `file:line`, open questions. Logs go to `C:/Users/NonFriedMotherBoard/.claude/jobs/7077c050/tmp/07a/`, never `docs/`.

Budget: locate with `grep -l`/`-c` before reading; read ≤ 150 lines per call; send test and lint output to log files. On a `HANDOFF` message, or after about 30 turns before acceptance, stop at a consistent point, write state, remaining steps, touched files and checks to `docs/reviews/feature-streams/functions/worker-projective-07a-handoff.md`, and return as partial.
