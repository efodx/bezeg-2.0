# Wave 3 slice C29/C30 brief: shared labels and layout classes

Read `w3-common-brief.md` first (it reuses `w2-pa-common-brief.md` by section). Spec `docs/specs/shared-graph-controls.md` rows C29, C30 (lines 53–54), task `docs/tasks/shared-graph-controls/04-remaining-controls.md` item 6, [choosing new terms](../../../localization.md#choosing-new-terms). Inventory at HEAD (2026-11-09, supersedes triage rows C29-01 and C30-01, which are stale on `pointset-row` and `rational-weight-*`) is reproduced below. The slice runs alone; two workers split it by region.

## Settled decisions (handler; recorded as decisions 67 and 68)

**67. C29, one key per shared meaning.** One key where English and Slovenian agree and the control does the same thing:

| Shared key (new or kept) | Replaces | SL / EN |
| --- | --- | --- |
| `next_step` | the 13 `*_next_step` keys and `collision_inspect_next` | Naslednji korak / Next step |
| `reset` (exists) | `sequence_reset`, `series_reset` | Ponastavi / Reset |
| `back` (exists) | `vor_construct_back` | Nazaj / Back |
| `clear` | `playground_clear`, `pointset_clear` | Počisti / Clear |
| `add_point` (exists) | `pointset_add_point` | Dodaj točko / Add point |
| `show_error_bound`, `hide_error_bound` | `taylor_show_bound`/`fixed_point_show_bound`, the two `*_hide_bound` | Pokaži oceno napake / Skrij oceno napake |
| `step_counter` | `hulltrace_step_counter`, `subdiv_step_readout` (if it renders the same "Korak k od n"; move it onto `StepCounter` if not already) | Korak {0} od {1} / Step {0} of {1} |

Kept apart, with reasons: `bisection_reset`/`root_finding_reset` ("Ponastavi iteracijo", a narrower meaning); Delete (`delete`, `delete_point`, Izbriši) against Remove (`prob_summary_remove_text`, `point_controls_remove_selected`, Odstrani), which Slovenian distinguishes; `point_controls_clear_all` (names its object); `collision_inspect_prev` against `playground_segment_prev` (step against segment); `guided_lesson_*` keys (lesson chrome, owned by the learn-ui stream: do not touch). The "six aria-labels on one +1 stepper" from the spec were not found at HEAD (`CountSetter` has three defaults): record as resolved by earlier sweeps after one grep confirms it. The three copies of one B-spline example set (`src/graphs/curves/bspline/bsplineInsertionModel.ts:22`, `src/learning/content/bsplineExtractionGuidedLessons.ts:18`, `src/learning/content/bsplineInsertionGuidedLessons.ts:17`) become one exported constant in the model file, imported by the two lesson files (values unchanged; lesson tests must stay green).

**68. C30, layout classes belong to the shared control.** `inspector-playback` is only on `PlaybackButtons`' group. A non-playback button row (Delaunay, Triangulation, Voronoi site and construction rows, `ResetExampleButton`, Summary statistics values, the plain `demo-actions`/`bisection-actions` rows) uses one shared row class `control-row` with its CSS in `src/inputs/` (gap, wrap, and the coarse-pointer 44 px rule `@media (pointer: coarse), (max-width: 700px)` as in `src/inputs/Slider.css:13-14`). Playback uses of `demo-actions`/`bisection-actions` that wrap `PlaybackButtons` drop the wrapper class when `PlaybackButtons` already lays them out; remove the then-unused rules in `functions/FunctionReadout.css`. `pointset-row` (PointSetControls, Pascal steppers) becomes `control-row` (this gives the Pascal steppers the 44 px rule, open item OI-02). Hooks with no use go (`pointset-check`, `simson-slider-row`, `inscribed-slider-row`: confirm zero hits). `collision-playground__buttons` stays: it is playback-only layout of the playground's own `PlaybackButtons` group; record that. EulerGraph and BSplineInsertionGraph's `inspector-playback`: keep if the group is a playback group, else `control-row`. Rejected: per-graph row classes, which C30 replaces.

## Workers and owned regions

- **Worker L (C29):** sole owner of `sl.ts` and `en.ts` (Edit tool only, keep LF) and of `t("…")` key arguments in any file; the B-spline constant (model and two lesson files). Remove the replaced keys from both catalogs in lockstep.
- **Worker K (C30):** sole owner of `className` attributes and wrapper elements, all CSS files, and the new `src/inputs/ControlRow.css` (or equivalent). Does not edit `t(...)` calls or catalogs.
- Shared tsx files: each edits only its region and re-reads a file before each edit. If a test fails in the other worker's region, note it; do not fix it.

## Checks

Before renaming or removing any key, class or `data-*` hook, grep `tests/`, `src/**/*.test.*` and `src/learning` for readers and update them in the same slice (a smoke spec reading `.inspector-playback` on a non-playback group must move to a stable `data-*` hook, not to the new class). L: `npx tsc --noEmit --pretty false` through `just` (`just check-localization`), unit tests of each touched directory, `lessonMathNotation.test.ts` stays green. K: `just unit` for touched directories; a test that `PlaybackButtons` renders `inspector-playback` and that `control-row` carries the coarse rule (CSS-source assertion acceptable), each with an observed failure (revert, run, restore) in the result file as you go.

## Return

Each worker ≤250 words: done and not done, `file:line` for key points, checks with results, observed failures, readers updated. Evidence: `w3-c29.md` (L), `w3-c30.md` (K). On `HANDOFF`, write done/remaining there and stop.
