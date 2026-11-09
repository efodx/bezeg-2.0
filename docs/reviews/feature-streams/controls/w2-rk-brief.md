# Wave 2 repair RK: curves and UI review findings, switch reason

Read `w2-fc-common-brief.md` (rules, checks, return). Findings: `w2-kr.md` (curves review) and `w2-fcu.md` (UI review). The sweep is committed (`3373d7da`); your changes are a repair on top.

**Owned:** `src/inputs/BooleanField.tsx`, `OnOffSwitch.tsx`, `BooleanField.css`, `BooleanField.test.tsx`; `src/graphs/base/**` (not `BaseGraph.tsx`, not `controls/guard.ts`); `src/graphs/curves/**` and tests; curve keys in `sl.ts`/`en.ts`; in `src/graphs/functions/RungeInterpolationGraph.tsx` only the semicircle switch's props (worker RF edits the rest of that file: re-read before each edit). The controls fixture `fixtures/controls/main.tsx` for one unavailable switch state.

**Work:**
1. **Switch reason (C6, decision 13).** Add optional `unavailableReason` to `BooleanField` (and pass-through on `OnOffSwitch`): the input stays focusable with `aria-disabled="true"`, a change is ignored, and the reason shows as linked help (`aria-describedby`); no native `disabled`. Tests fail first. Use it for the PH offset lines switch (`PhBezierCurveControls.tsx`), Subdivision's show-limit switch and Runge's semicircle switch. Add the state to the controls fixture.
2. **Rational weight minimum** (`w2-kr.md` 1): − is unavailable at w ≤ 0.25 with the positive-weight reason (`CountSetter` `min` or its min reason); a test that − at 0.25 leaves w = 0.25 and shows the reason.
3. **Which curve the typed list shows** (`w2-kr.md` 2, `w2-fcu.md` 2): the list title names the curve ("Krivulja 2: točke" style, matching the curve names the picker uses) on multi-curve boards; with nothing selected, decide between listing curve 1 named as such or listing nothing with a hint, and say which.
4. **Typed-path tests** (`w2-kr.md` 3): strengthen `typedPointPaths.test.tsx`: a spline junction is recomputed after a typed free point (G1), a rational weight is kept, a typed point outside the view refits and one inside does not (decision 6). Remove the no-op `act`. Each new assertion fails under a mutation (skip `afterTypedPointEdit` or `boardUpdate`).
5. **Blossom host Reset** (`w2-kr.md` 4): a test that the host Reset path returns Blossom to its default.
6. **Slovenian** (`w2-fcu.md` 1): `bsp_degree_needs_points` becomes number-agnostic, for example "Število točk: {value0}, zato je najvišja stopnja {value1}."; English in lockstep.
7. **Point names** (`w2-fcu.md` 3): B-spline list rows use the same point names as the board labels (0- or 1-based as drawn).
8. **Arc-length** (`w2-fcu.md` 4): the position slider uses `Slider`'s `unavailableReason` while playing; the Play button's visible reason is linked (`aria-describedby`) or it becomes `UnavailableButton`.

Not in scope (record only): Insertion's separator after a language switch, Basis knot notice clearing, De Casteljau animation buttons and its t live region (C12, step 5), the curve-selection `role="status"` (handler keeps it as a discrete status, like decision 39).

**Checks:** `just unit src/inputs src/graphs/base src/graphs/curves` and curve lesson unit tests, `just lint`, `just typecheck`. Observed failure first for each new assertion (mutation; never `git stash`). Evidence `w2-rk.md`. Return ≤300 words.
