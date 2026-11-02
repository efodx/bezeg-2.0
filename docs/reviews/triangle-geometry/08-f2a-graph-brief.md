# 08 F2a slice 2: inversion graph, worker brief (handoff-v12)

One worker (`bezeg-worker`, Sonnet 5.5 `medium`). Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`. Do not commit or push.

## Goal

Task `docs/tasks/triangle-geometry/08-batch-d.md` F2a, **graph, Presets and locale**: the inversion graph on top of the reviewed model `src/compgeo/inversionModel.ts` (slice 1). There is **no route, no registration and no lesson** (F2b–F4 come later). Spec `docs/specs/triangle-geometry-lessons.md` section "### T5. Power of a point and inversion" (graph needs, acceptance 2) and "Correctness Notes". Do not change the model or the kernels (`src/compgeo/circle.ts`, `src/analysis/complexMobius.ts`); report a defect if you find one. Every drawn position comes from the model's `drawn`/`board` fields; never compute an inversion in the graph.

## Settled design (handler)

- **Pattern:** subclass `PointSetGraph` as `SimsonLineGraph` does (read it and `SimsonLinePanel.tsx` first; they are the closest template). `pointLimit: 1`. Do not change `PointSetGraph`, the Geometry stream owns it; if you need a hook, stop and report.
- **The one vertex is the centre point.** In the focuses `point`, `source` and `angle` it is the inversion centre, named C. In the focus `power` it is the power point, named P, and the analysis uses it as `power.point`. All model examples have both at the origin; the spec's orthogonal example relies on this (the power of C with respect to the circle (5,0) radius 3 is 16 = r²). With no vertex (the user deleted it), the state is typed "no centre": a message, no derived objects, no NaN.
- **Focus** `focus: 'point' | 'source' | 'power' | 'angle'` in the scene state, chosen by one labelled control (segmented buttons or a select). The focus decides which derived objects exist; overlays switch their parts on and off.
  - `point`: X (subclass-owned draggable grid point, snapped, numeric fields) and its image X′ (`analysePoint`). At X = C: no X′ and the message "the centre has no image". Position readout inside / on / outside, the exact image as rationals.
  - `source`: a source kind control (circle | line). A circle has a draggable grid centre and an integer radius 1..8 (numeric field with arrows); a line has two draggable grid points (distinct; a coincident drop is rejected and reverts). The image comes from `analyseSource`: drawn as a circle or a line by its `shape`. Readouts: "circle through C → line", "line through C → itself", "circle → circle", with the exact image (centre and r², or a x + b y = c).
  - `power`: the circle (draggable grid centre, radius 1..8), the direction θ in degrees (normalised to [0, 360), arrows 1°, Shift+arrows 10°, numeric field, board drag of a direction handle by atan2 about P). Readouts from `analysePower`: the exact power, the position, PA, PB and the signed product (marked approximate), the tangent length for an outside P. The inversion circle is not drawn in this focus.
  - `angle`: two circles (draggable grid centres, radii 1..8) and the intersection choice `which` (0 | 1, a two-state control). Readouts from `analyseAngle`: the angle before and after, signed and unsigned, with the sentence that the sign flips. A right angle (unsigned within 1e-9 of 90°) is shown unsigned only, because ±90° is one undirected angle (model header). Typed cases (`no-intersection`, `tangent`, `point-at-centre`, `coincident`) each have a message and draw no angle.
- **Inversion radius** r: integer 1..8 (`isInversionRadius`), numeric field with arrows, plus a board handle on the circle at C + (r, 0) dragged along the ray and snapped to an integer radius in range.
- **Overlays** (all owned and disposed; share the id list between graph and collection, as Euler/Simson do): `inversion-circle` (on), `rays` (the ray from C through X and X′, on), `image` (the image curve or point, on), `secant` (on), `tangent` (the two tangent segments and points, on), `angle-tangents` (the tangent lines at Q and Q′, on). Names: C, X, X′, P, A, B, T₁, T₂, Q, Q′.
- **Far images (spec acceptance 2):** the board never receives a non-finite value. When an image point or an image circle's centre is outside the current view, or the model's `board` is undefined (beyond `INVERSION_DRAW_CAP = 30`), draw an **edge marker**: a small arrow head at the view boundary on the ray from C in the model's `direction`, and say "outside the view" in the panel, as Simson does. An image line is drawn as a line (the board clips it). Never rescale the view silently.
- **View:** `initialView()` returns `[-5, 6, 10, -6]`, which shows every example (the power circle reaches x = 8). The cap of 30 stays beyond it.
- **Examples:** a select over the model's `INVERSION_EXAMPLES` ids; choosing one sets the vertex, r, focus and the focus fields. `point` → focus point; `through-centre`, `not-through-centre`, `orthogonal`, `line-through-centre` → source; `power` → power; `angle` → angle. The scene state stores the `exampleId` until the user edits.
- **Presets** `src/graphs/compgeo/inversionPresetCollection.ts`, key `compgeo-inversion`, like `simsonLinePresetCollection.ts`.
  - `data`: the PointSetModel, with the same rules, at most one vertex.
  - `graphState`: `initialized`, `overlays` (known ids), optional `exampleId` (a model id), `focus`, `radius`, `x`, `source`, `power` (`circle`, `thetaDeg` finite, normalised), `angle` (`first`, `second`, `which`). Validate with the model's exported guards (`isInversionRadius`, `isInversionPoint`, `isCircleSpec`, `isInversionSource`). Reject unknown fields and non-finite numbers with actionable messages.
- **Locale:** one block of `inversion_*` keys right after the last `simson_*` key, in both `sl.ts` and `en.ts`, in the same positions. Slovenian terms (spec section "Terms" / F0 table, check them there): *inverzija*, *krožnica inverzije*, *središče inverzije*, *potenca točke na krožnico*, *sekanta*, *tangenta*, *posplošena krožnica*. Use `t('key')` / `t('key', {value0})` with the catalogue's exact placeholder names; no `any` or casts. Board labels must update on a live language switch (`onLanguageChange`).

## Tests

For every new assertion group, report a failure observed under a deliberate mutation.

Presets (`src/graphs/compgeo/inversionPresetCollection.test.ts`): round trip of every example; unknown field; non-finite θ; radius 0 and 9; non-integer or out-of-range points; a line source with equal points; bad example id; bad focus; two vertices rejected; mode and grid-step rejections as in the Simson test.

Host (`src/graphs/compgeo/InversionGraph.host.test.tsx`):
- Reset.
- Preset restore of the vertex, r, focus, every focus field, example and overlays.
- Every board object removed on dispose (count before and after, including across every focus switch and a source kind switch).
- Each example shows its spec numbers in the panel: X′ for `point`; the line x = 2; the circle (3/2, 0) with r² = 1/4; power 16 with PA·PB ≈ 16 and tangent length 4; the self-mapped circle for `orthogonal`; 60° before and −60°/60° after for `angle`; the line through C for `line-through-centre`.
- X = C shows the centre message and draws no X′; X at distance 1 with r = 8 shows the edge marker and "outside the view", and no board coordinate is non-finite (scan every created object).
- The radius field and handle change r; the θ field and arrows move the secant.
- Deleting the vertex gives the "no centre" state without NaN.
- A live SL→EN switch updates the panel and the board labels.

Drag measurement: write `docs/reviews/triangle-geometry/08-drag-measurement.md` like `07-drag-measurement.md` (read it first). Record the object count with all overlays on in each focus, and a timed scripted jsdom drag of C, X, a source centre and the θ handle. Do no optimisation.

Checks: `just unit src/compgeo/inversion src/graphs/compgeo/Inversion src/graphs/compgeo/inversion src/localization`, `npx tsc --noEmit --pretty false`, `just lint` on your files, `just build`. Do not run the full suite; the handler does.

## Rules

Read the Engineering practices section of `AGENTS.md`. Run tests only through `just` (start with `just --list`; see `docs/commands.md`). Locate code with `grep -l`/`-c` before `grep -n`, and read at most 150 lines per call. Send full test and build output to log files under `C:\Users\NonFriedMotherBoard\.claude\jobs\706240bc\tmp`. Write LaTeX or backslashes with the Edit tool, not shell heredocs. Preserve unrelated changes.

## Return

At most 400 words: files changed, observed check results, mutation evidence per test group, decisions and risks, and unverified cases, with `file:line` flags. Write longer notes to `docs/reviews/triangle-geometry/08-f2a-graph-w1-notes.md`. On `HANDOFF` from the handler, or past about 40 turns before acceptance, stop at a consistent point, write a handoff note to `docs/reviews/triangle-geometry/08-f2a-graph-w1-handoff.md`, and return partial.
