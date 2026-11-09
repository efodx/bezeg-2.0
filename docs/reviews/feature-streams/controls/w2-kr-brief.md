# Wave 2 review: curves sweep (K1, K2, K4), engineering and mathematical meaning

`bezeg-reviewer`, read-only. Do not edit files. Report findings with `file:line`, severity (high, medium, low) and the expected behaviour.

**Diff:** the uncommitted working tree in `.claude/worktrees/stream-controls` under `src/inputs/CountSetter*`, `src/graphs/base/**` (excluding moved files from commit `b09c6de8`), `src/graphs/curves/{bspline,bezier,reduction,arclength,parametric,ph,spline,rational}/**`, `src/graphs/curves/typedPointPaths.test.tsx`, the curve keys in `src/localization/sl.ts`/`en.ts`, the four `src/learning/**/bspline*GuidedLessons.ts` files, and `eslint.config.mjs`. Start with `git diff --stat`, then read by file. Ignore `src/graphs/functions/**` and K3's directories (`interpolation`, `hermite`, `subdivisionCurves`, `comb`, `envelope`, `offset`, `parametrisations`), which another worker is still editing.

**Sources:** briefs `w2-fc-common-brief.md`, `w2-k1-brief.md`, `w2-k2-brief.md`, `w2-k4-brief.md`; evidence `w2-k1.md`, `w2-k2.md`, `w2-k4.md` (in `docs/reviews/feature-streams/controls/`); spec `docs/specs/shared-graph-controls.md` *Owner decisions* and *Delegated decisions* (2, 3, 6, 7, 10, 13, 14, 17, 18, 24, 29, 30).

**Check:**
1. `CountSetter` additions (`decimals`, `step`, `rejectedHint`, `minusLabel`, `plusLabel`, `onSet` returning false): existing callers unchanged; the rational weight keeps ±0.25, refuses w ≤ 0 with its reason, and typed weights keep their precision.
2. K4's typed-point seam (`workspaceTypedPoints`, `typedPointsOf` in `BaseCurveGraph.tsx`): a typed move takes the same model path as a drag (constraints, weights, spline junctions recomputed, readouts, view refit only when outside the view, decision 6); spline rows are free points only; the list follows the selected curve, and on multi-curve boards the user can tell which curve is listed. Listeners and React state are owned and disposed.
3. K2's `BSplinePointList` and `editPoint` on Blossom, Extraction, Insertion, Nurbs, DeBoor: same path as a drag; insertion ghost, De Boor levels and Nurbs weights follow; no duplicate of K4's seam where the seam would apply.
4. Degree `CountSetter`s (Basis, Blossom, DeBoor): same ranges as the old selects, lesson actions and Presets still accepted, the points-limited maximum states its reason.
5. Refusals and announcements: one `RefusalChannel` and one `LiveReadout` per graph; Nurbs's weight refusal now only in the field hint (K2's proposal: judge it against decision 14); Insertion formats numbers at refusal time (K2: a language switch keeps the old separator; severity?).
6. Resets: Blossom's Reset test now calls `resetToDefaults()` instead of the host Reset (K2): does a test still show that the host Reset gives the default? The "Reset example" label is shared by Extraction, Insertion, Nurbs, and lessons quote the new name.
7. Editing-mode buttons as `UnavailableButton` (decision 9 pressed group kept); the reworded workspace hint is accurate in both languages.
8. Tests: wiring checks are real (would fail if unwired), no duplicate mechanics, no weak assertions.

**Checks you may run:** `just unit <paths>`, `just typecheck`, `just lint <paths>`. Log to `.command-logs/w2-kr-*.log`.

**Return:** at most 400 words, findings ordered by severity; full list in `docs/reviews/feature-streams/controls/w2-kr.md` if you can write it, else in your message.
