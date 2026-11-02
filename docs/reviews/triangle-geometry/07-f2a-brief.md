# 07 F2a Simson line graph: worker brief (handoff-v12)

One worker (`bezeg-worker`, Sonnet 5.5 `medium`). Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`. Do not commit or push.

## Goal

Task `docs/tasks/triangle-geometry/07-batch-c.md` F2a: the Simson line graph, model and Presets, with **no route, no registration and no lesson** (F2b–F4 come later). Spec `docs/specs/triangle-geometry-lessons.md` T4 (section "### T4. Simson line", acceptance 1–4) and "Correctness Notes"; ADR 0030 §2. Kernel already done: `src/compgeo/simson.ts` (`feet`, `pedalOrient`, `gliderPoint` with **t in radians**, `pedalAreaInexact`, `SIMSON_GLIDER_TOLERANCE = 1e-9`) and `src/compgeo/circle.ts` (`circumcircle`, `powerOfPoint`). Do not change the kernel; report a defect if you find one.

## Settled design (handler)

- **Triangle:** three snapped grid vertices (points mode, grid step 1, at most 3 vertices), as in `EulerLineGraph`. Collinear or coincident vertices give a typed degenerate state: no circle, no P, no feet, a message, and no NaN.
- **Two modes**, `mode: 'glider' | 'exact'` in the scene state, switched by one labelled control:
  - **Glider:** P on the circumcircle with angle parameter `t` in **degrees** (normalised to [0, 360), arrow step 1°, Shift+arrow 10°, numeric field, board drag by atan2 about O), as in `InscribedAngleGraph` but with **no exclusion gaps**. Convert to radians for `gliderPoint`. Offset control ε: a discrete slider over the exported constant `SIMSON_OFFSETS = [-0.2, -0.05, -0.01, -0.001, 0, 0.001, 0.01, 0.05, 0.2]` (P at distance R(1+ε) from O). It is shown only in glider mode and labels its value. Collinearity and status come from `pedalAreaInexact`. Status at ε = 0 within tolerance: "collinear (within 10⁻⁹ of the triangle's area)". Never "exactly collinear". Otherwise "not collinear". Readout: the area of the foot triangle divided by S in a readable form (for example 5,0·10⁻⁴); at ε = 0 show "≤ 10⁻⁹" rather than the round-off value.
  - **Exact:** a free grid point P′ (integer, snapped, numeric fields, the vertices' integer range). "On the circumcircle" is the exact test `powerOfPoint(P′) = 0`. Collinearity is the exact `pedalOrient = 0`. Readouts: the power (an exact rational), the feet as exact rationals, the foot-triangle area / S as an exact rational, and the status "collinear (exact)" or "not collinear".
- **Coincident feet** (P or P′ at a vertex, exact `feet().coincident`): status "two feet coincide; the line passes through the two distinct feet", and the line is drawn through them. In glider mode no vertex special case is needed.
- **Board objects (overlays, all owned and disposed):**
  - `triangle`: segments.
  - `sidelines`: full lines through the sides, **on by default**, because feet may lie on extensions. A foot outside a segment is never an error.
  - `circumcircle`: with O, on.
  - `perpendiculars`: P to each foot, on.
  - `simson`: the line through the distinct feet, drawn only when collinear by the rule of the current mode, on.
  - `pedal`: the foot triangle, lightly filled, drawn only when not collinear, on.
  - Feet are named D (on BC), E (on CA), F (on AB). P is named P in glider mode and P′ in exact mode.
  - Far points follow the Euler/notable rule (`BOARD_COORDINATE_CAP`, `toBoard`, "outside the view" in the panel; never rescale silently).
- **Examples** (example id in the scene state, as in Euler): `default`, `grid-on-circle`, `grid-off-circle`, `vertex`.
  - `default`: the T1 triangle A=(0,0), B=(7,0), C=(2,5), glider, t = 60, ε = 0.
  - `grid-on-circle`: exact mode, P′ = (2,−2).
  - `grid-off-circle`: exact mode, P′ = (6,4), power −2.
  - `vertex`: exact mode, P′ = B = (7,0).
  - Each example sets vertices, mode and its P/P′ fields.
- **Model file** `src/compgeo/simsonLineModel.ts`: pure TypeScript (no JSXGraph), like `src/compgeo/eulerLineModel.ts`. One `analyse…` function returns a typed result for both modes. Exact values stay `Rational` until display.
- **Presets** `src/graphs/compgeo/simsonLinePresetCollection.ts`, key `compgeo-simson-line`, like `eulerLinePresetCollection.ts`.
  - `data`: the PointSetModel, with the same rules.
  - `graphState`: `initialized`, `overlays` (known ids), optional `exampleId`, `mode`, `t` (finite number, normalised; reject non-finite), `epsilon` (a member of `SIMSON_OFFSETS`; reject others with an actionable message), `pPrime` (integer pair in range).
  - Unknown fields are rejected.
  - Share the overlay id list between graph and collection, as Euler does.
- **Locale:** one block of `simson_*` keys right after the last `euler_*` key, in both `sl.ts` and `en.ts`, in the same positions. Slovenian terms (F0 table): *Simsonova premica*, *nožišče pravokotnice*, *nožiščni trikotnik*, *potenca točke na krožnico*, *očrtana krožnica*, *nosilka stranice* (side line). Use `t('key')` / `t('key', {value0})` with the catalogue's exact placeholder names; no `any` or casts. Board labels must update on a live language switch (`onLanguageChange`).
- **Pattern:** subclass `PointSetGraph` as `EulerLineGraph` and `InscribedAngleGraph` do. Do not change `PointSetGraph`, the Geometry stream owns it; if you need a hook, stop and report.

## Tests

For every new assertion group, report a failure observed under a deliberate mutation.

Model (`src/compgeo/simsonLineModel.test.ts`):
1. Enumerate the lattice points of the default circumcircle independently, from x²+y²−7x−3y = 0 over a 41×41 window, without using the model. There must be exactly the eight points of spec T4. Each one reports exact collinear.
2. Feet for P′=(2,−2) and P′=(0,3) equal the spec's exact values.
3. Every other grid point in the window reports not collinear and |power| ≥ 1.
4. Glider: over 2000 seeded t values, the maximum relative area is at least 10⁶ times below `SIMSON_GLIDER_TOLERANCE`. The status is collinear.
5. Offsets: for ε = 0.001, 0.01, 0.05, 0.2 (and the negatives), area/S matches 0.000500, 0.005025, 0.025625, 0.110 to 1e-6 and the oracle |R²−OP²|/(4R²) to 1e-12. The status is not collinear for every nonzero ε.
6. `vertex`: coincident feet, 2 distinct, line defined, coincidence status.
7. A foot outside its segment is reported normally.
8. A degenerate triangle gives a typed result, with no NaN and no throw.

Presets: round trip; unknown field; non-finite t; ε outside the set; non-integer or out-of-range P′; bad example id; collinear accepted; mode and grid-step rejections as in the Euler test.

Host (`SimsonLineGraph.host.test.tsx`):
- Reset.
- Preset restore of vertices, mode, t, ε, P′, example and overlays.
- Every board object removed on dispose (count before and after, including across a mode switch).
- Mode switch in both directions.
- The t field and arrow keys move P and update the readouts.
- Every ε stop changes the status as specified.
- A P′ edit updates the exact readouts.
- `vertex` shows the coincidence status.
- A live SL→EN switch updates the panel and the board labels.
- The degenerate example has no NaN board coordinate.

Drag measurement: write `docs/reviews/triangle-geometry/07-drag-measurement.md` like `04b-drag-measurement.md` (read it first). Record the object count with all overlays on, and a timed scripted jsdom drag of P (glider), of P′ (exact) and of a vertex. Do no optimisation.

Checks: `just unit src/compgeo/simsonLine src/graphs/compgeo/SimsonLine src/graphs/compgeo/simsonLine src/localization`, `npx tsc --noEmit --pretty false`, `just lint` on your files, `just build`. Do not run the full suite; the handler does.

## Rules

Read the Engineering practices section of `AGENTS.md`. Run tests only through `just` (start with `just --list`; see `docs/commands.md`). Locate code with `grep -l`/`-c` before `grep -n`, and read at most 150 lines per call. Send full test and build output to log files under `C:\Users\NonFriedMotherBoard\.claude\jobs\8a3ec379\tmp`. Write LaTeX or backslashes with the Edit tool, not shell heredocs. Preserve unrelated changes.

## Return

At most 400 words: files changed, observed check results, mutation evidence per test group, decisions and risks, and unverified cases, with `file:line` flags. Write longer notes to `docs/reviews/triangle-geometry/07-f2a-w1-notes.md`. On `HANDOFF` from the handler, or past about 40 turns before acceptance, stop at a consistent point, write a handoff note to `docs/reviews/triangle-geometry/07-f2a-w1-handoff.md`, and return partial.
