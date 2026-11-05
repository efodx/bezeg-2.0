# Curves stream: handler handoff 43

Handler 43 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired. It replaces [handoff 42](handler-handoff-42.md).

## State

- Branch `worktree-stream-curves`, on `origin/master` with the CG-B1-4 commit and this note. Clean tree. No preview server, worker or watcher of this handler should be running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `ffd25687` | Slovenian blossom arguments use `;` (`f(0; 0,5)`); the decimal comma read as another argument. Recipe intent corrected | Two tests failed against the old code; a third pins the cubic form; `tsc` |
| `36df707e` | BS-C-L6e: joint selective poster capture of `bspline-blossom`, `point-in-polygon`, `hull-robustness`; `POSTER_PENDING` empty | Viewed by eye; manifest delta only those three captures, 51 motions unchanged |
| `e562b75c`, `58ce7dd3` | BS-C-L6f: [audit](../../b-splines-nurbs/bs-c-l6f-criterion-audit.md), 21 covered, 0 missing; two test gaps closed. **Family 2 complete** | `just check` one known failure (below), build, `smoke-lesson bspline-blossom`, hosted CI green on `58ce7dd` |
| CG-B1-4 commit (see `git log`) | Chapter `curve-geometry`: intro, L1 and L2 sections, Learn card; lessons moved out of `parametrization` and `bezier-curves` | Worker mutations of each test group; handler checked every quoted number by hand and fixed three prose faults; see the commit message for the check results |

## Next steps, in order

1. Check hosted CI on the CG-B1-4 commit (`just ci`).
2. CG-B1-5: preview clips and example cards for L1 and L2 ([tasks](../../../tasks/curve-geometry/README.md)). Both Demonstrations already have posters and preview copy, so first establish what is still missing; it may be small.
3. CG-B1-6: the Batch 1 gate, including the **L2 dragging measurement** the spec requires (`docs/specs/curve-geometry-lessons.md` lines 17 and 135: dragging measurement recorded, independent mathematical review of the kernel, both languages in the browser). See [performance-plan.md](../../../performance-plan.md).
4. Then Batch 2: CG-B2-1 comb measurement and its ADR. `G-CURVE` is open. After family 1: family 5 (advanced Bézier), Batch A (D1, D3). Family 3's task rows read "planned" but are stale: its row in `curves.md` shows all five lessons and the chapter done.
5. Low priority, carried over: P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, and `BSplineNurbsGraph.importPresetData` building the scene twice (nit).

## Risks and notes

- **`just check` is red on master, from another stream:** `src/learning/chapter/guidedExamplePreviews.test.ts`, "publishes the school-function-graphs example cards" (`geometric-series/sl` preview undefined). Handler 42 reproduced it without curves work, and its resolver imports no poster or blossom code. The Functions stream owns it. `just check` stops there, so run the build separately.
- Handoff 42's L6e step was out of date: `73df56b1` had already captured the blossom poster. Check `POSTER_PENDING` before planning a capture.
- A selective capture must include every shipped id without a retained capture (the exhaustive route check), and those ids must leave `POSTER_PENDING` first. `PREVIEW_BASE_URL` needs the `/bezeg-2.0` path. A failing capture can hang after its error, so run it under `timeout`.
- The convexity `point-in-polygon` poster has a faint crossing count beside the edge; Geometry was told in `curves.md`.
- `functions-and-calculus` is a prerequisite link of `curve-geometry` but sits later in the Learn order (other strand).
- Local `scripts/demonstration-preview-capture.test.cjs`: 36 of 37; the VP9 `bt709` failure is the known FFmpeg gap.
- Carried over: a blossom Preset with a stored `segment` invalid for its data draws no blossom (hand-edited files only); the NURBS board draws no control-polygon lines; family pages are not routes; the 390×844 lesson card covers the board (owner look).

## Lessons for briefs

- A chapter worker needed 51 tool uses, 107k tokens: within budget when told to skip the full suite and the evidence note.
- The worker's prose passed its own number tests but still claimed more than it delivered and used \(\kappa\) before defining it. Read chapter prose as a reader, not only against the numbers.
- Backslashes in a Bash heredoc did not survive as written in this session; build them with `chr(92)` in Python edits of TS math strings.
- Python edits must handle CRLF files: detect `\r\n` before matching.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-43.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
