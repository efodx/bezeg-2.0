# 04b inscribed angle graph: worker brief (handoff-v12)

Shared by worker A (model + Presets) and worker B (graph). Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`. Do not commit or push.

## Goal

Task `docs/tasks/triangle-geometry/04-batch-a-graphs.md` acceptance 2–4 (the inscribed angle graph); spec `docs/specs/triangle-geometry-lessons.md` T2 (lines 114–127), Implementation/Testing Decisions (181–197); ADR 0030 §2 (the glider is the only inexact input). No route, no registration, no lesson (task 05).

## Settled design (handler)

- **Circle:** three grid vertices A, B, C (integers, grid step 1) define the circle via `circumcircle(a, b, c)` in `src/compgeo/circle.ts` (exact centre O and r²). AB is the chord. C is an exact grid point on the circle. Collinear or coincident vertices give a degenerate state: no circle, no glider, no NaN.
- **Examples:** `default` = the T1 triangle A=(0,0), B=(7,0), C=(2,5) (∠ACB = 66.8014°, ∠AOB = 133.6028°). `thales` = A=(0,0), B=(8,6), C=(1,7) (centre (4,3), r=5; exact `thalesDot` = 0 at C).
- **Glider P:** parameter `t` in **degrees**, normalised to [0, 360); position `circlePoint(circle, t·π/180)` (a double). The default t places P on C's arc; for `default` pick an integer t on C's arc and record it. Arrow-key step 1°, Shift+arrow 10°. **Exclusion:** P never lies within `GLIDER_EXCLUSION_DEG = 0.5` of the polar angle of A or of B about O. A t inside a gap (typed, dragged, stepped, or from a Preset) moves to the gap edge in the direction of motion; with no direction, to the nearer edge. Name and export the constant.
- **Readouts (doubles, shown to 0.1°):** inscribed ∠APB; the central angle that subtends the arc AB *not containing C* (equal to 2·∠ACB). `angleBetween(O, A, B)` gives the unsigned angle in [0°, 180°]; when ∠ACB > 90° (C on the minor arc) the subtending central angle is 360° − that value. State the rule in the code docs. Also: which arc P is on (the same side of line AB as C or the other, by the orientation sign of A, B, P against A, B, C), and the relation. P on C's arc: ∠APB = ∠ACB (Euclid III.21) = half the central angle (III.20). Other arc: ∠APB = 180° − ∠ACB (III.22). ∠ACB at grid C is still a double angle, but `thalesDot(C, A, B)` is an exact Rational: show "AB is a diameter (exact)" when it is zero. Never display "exactly equal" for P; the label is "equal to the displayed precision".
- **Typed results:** model functions return `{kind: 'degenerate'}`/`undefined` instead of NaN. Copy the pattern of `src/compgeo/notablePointsModel.ts` (pure TS, no JSXGraph, `BOARD_COORDINATE_CAP`, `toBoard`).
- **Presets:** like `src/graphs/compgeo/notablePointsPresetCollection.ts`. Key `compgeo-inscribed-angle`. `data` = the PointSetModel (points mode, grid step exponent 0, ≤3 vertices, integer range by `parsePointSetModel`, collinear accepted). `graphState`: `initialized`, `overlays` (known ids), optional `exampleId` (`default` | `thales`), `t` (a finite number; reject a non-finite or non-number t with an actionable message; out-of-range values are normalised, not rejected). Unknown fields are rejected, as in the notable collection.
- **Locale:** one block of `inscribed_*` keys right after the last `notable_*` key, in both `src/localization/sl.ts` and `en.ts`, in lockstep. Slovenian terms: *obodni kot*, *središčni kot*, *tetiva*, *Talesov izrek (kot v polkrogu)*, *lok*. Call `t('key')` / `message('key', {value0})` with the catalogue's exact placeholder names; never `any` or casts.

## Worker A scope (model + Presets)

Owns `src/compgeo/inscribedAngleModel.ts` and `.test.ts`, `src/graphs/compgeo/inscribedAnglePresetCollection.ts` and `.test.ts`, and only the `inscribed_*` locale keys its Preset messages need.

Tests. For each new assertion group, report an observed failure under a deliberate mutation.

1. Default: ∠ACB, ∠APB (P on C's arc, three t values) and the central angle agree with 66.8014° / 133.6028° to 1e-4°. A point on the other arc gives 113.1986°.
2. Over 100 t positions on the major arc (skipping the exclusion gaps), 2·∠APB equals the central angle to 1e-12 (say whether in degrees or radians). On the minor arc, ∠APB + ∠ACB = 180° to 1e-12.
3. Thales: enumerate every lattice point on the `thales` circle with an independent integer check (x−4)²+(y−3)²=25, not the model, and assert exact `thalesDot` = 0 at each one other than A and B. The model reports the diameter flag for C=(1,7).
4. Exclusion: t at the polar angle of A, of B, and inside each gap moves to the edges in both directions; a step across a gap skips it; no NaN; negative and ≥360 t are normalised.
5. Obtuse case (C on the minor arc, e.g. A=(0,0), B=(7,0), C=(3,1)): the central-angle rule and the arc classification are correct.
6. Degenerate (collinear, coincident): typed result, no NaN, no throw.
7. Presets: round trip; unknown field; non-finite t; bad example id; out-of-range integer; collinear accepted; mode and grid-step rejections as in the notable test.

Checks: `just unit src/compgeo/inscribedAngle src/graphs/compgeo/inscribedAngle`, `npx tsc --noEmit --pretty false`.

## Worker B scope (graph)

Owns `src/graphs/compgeo/InscribedAngleGraph.tsx`, `InscribedAnglePanel.tsx`, `inscribedAngleText.ts`, `InscribedAngleGraph.host.test.tsx`, the rest of the `inscribed_*` keys, and `docs/reviews/triangle-geometry/04b-drag-measurement.md`. The model and Presets come from worker A; fix them only if a defect blocks you, and report it.

Pattern: `src/graphs/compgeo/NotablePointsGraph.tsx`, a subclass of `PointSetGraph` whose interface stays unchanged (the geometry stream owns it). Required: three snapped vertices with numeric fields; the circle with its centre O; the chord AB; the glider P (a board point constrained to the circle: dragging updates `t` from atan2 about O, then applies the exclusion); a numeric t field (degrees) and arrow-key steps on a focusable control; radii OA and OB and the angle marks as toggleable overlays; readouts and the arc/relation text in the panel, with the label "equal to the displayed precision" and the undefined-angle note. Degenerate state: no circle, no glider, a text message.

Host tests: Reset; Preset restore (vertices, example, t, toggles); every board object owned and removed on dispose (count board objects before and after); a live language switch updates board text and panel text; the t field and arrow keys move P and the readouts; a t typed inside a gap snaps out; a vertex edit moves the circle and keeps P on it; the degenerate example has no NaN in any board coordinate. For each new assertion, report an observed failure under a mutation.

Drag measurement: like `docs/reviews/triangle-geometry/04a-drag-measurement.md` (read it first). Record the object count with all overlays on and a timed scripted drag of P and of a vertex in jsdom. No optimization.

Checks: path-filtered `just unit`, tsc, lint, `just build`. Do not run the full suite; the handler does.

## Rules

Read the Engineering practices section of `AGENTS.md`. Run tests only through `just` (start with `just --list`; see `docs/commands.md`). Locate with `grep -l`/`-c` before `grep -n`, and read at most 150 lines per call. Send full test and build output to log files under `C:\Users\NonFriedMotherBoard\.claude\jobs\03a5c0cd\tmp`. Preserve unrelated changes.

## Return

At most 400 words: files changed, observed check results, mutation evidence per test group, decisions and risks, and unverified cases, with `file:line` flags. On `HANDOFF` from the handler, or past about 30 turns before acceptance, stop at a consistent point, write a handoff note to `docs/reviews/triangle-geometry/04b-worker-<A|B>-handoff.md`, and return partial.
