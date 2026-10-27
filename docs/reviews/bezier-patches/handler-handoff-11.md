# Bézier patches handler handoff 11 — 2026-10-28

Current entry point; supersedes [handoff 10](handler-handoff-10.md) for task 07 state (handoff 9's "Accepted" and handoff 8's Environment still apply). Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push, successor handlers).

## Successor rule (owner instruction, 2026-10-27)

At your context handoff, start your successor yourself with `mcp__ccd_session__start_session` (initiation `user_asked`, context `fresh`, `use_worktree: false`, permission mode auto; the `claude` CLI is not on PATH). If the app refuses a direct start, propose it as an `own_initiative` card. Repeat this rule in your successor's prompt and note, then end your turn; do not run concurrently with it.

## Git state

- Local `master` = `origin/master` = this note's commit on top of `a9113ab`. The master push hold is lifted: `validateGeneratedPreviews` accepts the real `patch-tensor` capture (196d891). `origin/bezier-patches-wip` mirrors master; it is no longer needed for holding.
- CI (Browser smoke): `d7dcffd` failed (surface-unaware smoke specs), `d2eeb14` passed. **`a9113ab` not yet checked** — check first: `curl -s "https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?branch=master&per_page=3"` (`gh` is not installed, so `just ci` fails).
- `debug.log` is pre-existing and unrelated; leave it.

## Accepted this phase

- **75c03e9 C2b** (Sonnet high; first worker hit 135k → [c2b-handoff.md](c2b-handoff.md), finished by a second worker): MathJax label overlay from `SurfaceView.onLayout`, surface SVG (`<image>` + vector visible labels, `StillFigureSvg.ts`) and PNG through `FigureCapture`'s `StillFigureSource`; `BaseGraph.figureContainer`/`createFigureCaptureTarget` replace `hasBoard` guards; `NO_FIGURE_BATCH` removed. 12 mutations observed (table in the c2b handoff).
- **196d891 C3** ([c3-brief.md](c3-brief.md)): `surface-view` recipe framing, `captureSurface`, validator surface branch (non-uniform pixels, recipe camera, projected points in frame; 5 mutations rejected), read-only `data-surface-framing` host attribute; selective recapture (`PREVIEW_RECAPTURE_IDS=patch-tensor …PRESERVE_SOURCE_PROVENANCE …VERIFIED_PRESENTATION`), manifest marked `mixedGraphSource`. **d7dcffd** pruned a stale lint suppression.
- **Reviews**: [task07-smoke.md](task07-smoke.md) (Sonnet, ~24 checks passed, real WebGL/picking/drag/touch/390px/keyboard/labels/export, timings within ADR0018 on software GL), [task07-engineering-review.md](task07-engineering-review.md), [task07-math-review.md](task07-math-review.md).
- **d2eeb14 R1a** ([r1-brief.md](r1-brief.md)): smoke suite recognises surface workspaces; motion checks exempt demonstrations without a manifest clip (derived from the manifest — disappears when task 13 adds the clip). Full built smoke 245 passed; CI green.
- **a9113ab R1b**: exact one-direction lowering (`patchDegree.ts`, collocation), Preset import graphState rejection, pinch zoom + drag cancel, host `role="application"` + `aria-describedby`, WebGL context loss notice, elevation clamp = top preset, label chord tolerance, help texts. `just check` passed at a9113ab's content (dirty-tree run). Observed pre-fix failures in the worker report (all items except the clamp).

## Remaining task 07 steps, in order

1. Check CI for `a9113ab`; fix if red.
2. Focused browser recheck of R1b (bezeg-smoke, Haiku medium, narrow): pinch zoom on touch emulation, second pointer cancels a point drag, host role/label/description, degree lowering in Uredi changes only that direction (elevate then lower restores the net), hostile Preset import rejected with an actionable message, top preset then drag does not jump.
3. Decide (handler) and record: deferred review items — math F4 (`zModeDrag` ignores fov/elevation; z moves up to 47× cursor in top view), F6 (point notation `P_{ij}` vs `b(i,j)` vs spec `b_ij`); eng #7 (validator trusts the manifest's own projected points), #8 (`publishFraming` per frame in production), #9 (full re-sample on every orbit; matters for the teapot capstone, task 10), #11 (control-point green ≈3:1 on white), #12 (no timeouts on `SurfaceLabelOverlay.ready()`/`image.decode()`); smoke observations: inset fixed 218 px (no resize scaling); Preset batch dialog selects nothing for a Preset saved after the dialog mounted and downloads an empty zip silently (shared code, pre-existing). Fix the cheap ones (F4, F6, #11, #12, empty-zip) in one Sonnet slice or record them as task-14 follow-ups in the task file.
4. Optional owner-visible decision: a full `just preview` recapture would clear `mixedGraphSource` (redoes 45 board captures and clips); the current selective capture is valid evidence.
5. Docs: capabilities, current-architecture (`GraphSession.createAuxiliaryBoard`, `StillFigureSource`, `figureContainer`), ui-functionality (surface controls, pinch), hosting/commands (surface preview capture flags), spec/task 07 status → complete; evaluation-log records (subagent-flow-evaluation skill `do-log`) for slices A, B, C1 (old), C1a, C1b, C1c, C2a, mutation slice, C2b (incl. its 135k handoff), C3, task07 reviews, R1a, R1b. Commit, push master.

Then tasks 08–14 in index order (08 triangular workspace next).

## Settings

Handler Opus 5.5, auto mode; workers `bezeg-worker` Sonnet high for implementation/repairs, `bezeg-smoke` Sonnet medium for broad smoke and Haiku medium for narrow rechecks, Haiku for routine review/mutation runs. Watchers per docs/agent-workflow.md (self 150k, then 190k; workers 135k / Haiku 78k). Two disjoint-file workers in parallel worked well (R1a tests/ + R1b src/); concurrent `just build` can fail provenance once — rebuild. This handler reached 150k after C2b, C3, three reviews and one repair round.
