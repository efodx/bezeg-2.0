# Functions stream: handler handoff 6

Handler 6 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-10-31, after reaching the 150k soft threshold. The supervisor started this handler after handler 5's successor failed to launch.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete the junction before removing the worktree.
- **Everything is on `master` (`ab81346`).** The tree is clean and nothing waits on a branch. Pushed this session:
  - Fourier task 02 (`f38f3e7`), handler 5's work. A full `just unit` passed (6137/6137) at the 20:00–20:14 UTC checkpoint. CI is green.
  - Projective task 03, the sampler: accepted (`32be360`). The re-review found one should-fix. A parabola with coefficients above \(2^{53}\) lost its vertex path, so the sampler returned `ok` with no pieces. The handler fixed it with a red regression test first. Record: [03 acceptance record](../../../tasks/projective-conics/03-conic-sampler.md#acceptance-record-2026-10-31).
  - Projective task 04, the five-point solver and rational arc: accepted (`a085606`); the review found nothing. Record: [04 acceptance record](../../../tasks/projective-conics/04-five-point-solver.md#acceptance-record-2026-10-31).
  - Task 05 split into slices 05a–05d: see the [slices table](../../../tasks/projective-conics/05-batch-a-graphs.md#slices-handler-plan-2026-10-31).
  - Slice 05a, the K1 cross-ratio graph and the family Preset collection: accepted (`16d46bf` before the rebase). One review found 3 should-fixes and 4 notes, all repaired. Record: [05a acceptance record](../../../tasks/projective-conics/05-batch-a-graphs.md#05a-acceptance-record-2026-10-31).
  - `docs/localization.md` now points to the projective term table. The `do-log` records for handlers 5–6 are in `docs/agent-workflow/evaluation-log.md`. 05a's record is written too.
- **Checks on 05a:** the projective and localization unit tests, lint, and `check-localization` (typecheck and build) passed. The full suite was left to hosted CI on the `ab81346` push; this handler did not see that run's result. **Confirm it first:** `gh run list --branch master --limit 3`. If it failed on projective files, fix it before anything else (README, Test load: CI).

## Remaining steps, in order

1. **Confirm CI** for `ab81346`, as above.
2. **05b: the K3 pole and polar graph.** Use the same brief as 05a, and require the 05a patterns listed in its acceptance record: the example-fit test, `example` consistency, the narrow live region, the import and Reset test, and focus handed back to the board. Spec: K3 in `docs/specs/projective-conics-lessons.md`. The conic is drawn with `sampleConic`. Locale keys go in the existing `projective_*` block. Then run an engineering and UI review (Sonnet).
3. **05c: the K2 Pascal and Pappus graph**, the same way. It uses `conicPencil` parameter handles.
4. **05d: the drag measurement** per `docs/performance-plan.md`. It fixes `DEFAULT_SAMPLE_DENSITY` (720 for now) and `DIRECTION_BOUND` (14 for now), and records them in ADR 0033 or a follow-up. Check `git ls-tree --name-only origin/master docs/adr/` before writing an ADR. It also covers the sampler's open notes in the 03 record: the chord-only `refine`, and pieces missed in a distant view.
5. **Then wait.** Task 06 and task 07 F2b–F6 need `G-REG`; the graph slices of families 1, 2 and 4 need `G-FN`. Projective 07 F2a, the K4 and K5 graphs, is ungated but depends on 06. When only gated work remains, set `Run state: waiting on G-FN, G-REG`, push, and end.

## Owner decisions and risks

Carried over from handoff 5:
- `TRANSFORM_BOUNDS` and `POLY_BOUNDS` are unconfirmed.
- Decimal-comma localization in the graph and lesson slices is undecided.
- ε=0 is routed to `circleConic`.
- *pol* is always paired with *polara*.
- *šop premic*, *središčna projekcija*, *Pappusov izrek* and the Fourier wave names rest on thin sources.
- The quotient-rule LaTeX assertion belongs in family 2's task 06.
- Fourier 02 has three open notes in its acceptance record.

New this session:
- Task 04 has extra arc statuses: `no-real-weight`, `complementary-arc`, and `split-needed` with reason `ideal-end`. Task 07 must give them UI wording.
- 05a's browser layout is unverified until route slice 06: the line-label offsets, the readout widths at \(x=-13.6\), touch dragging, and two `role="status"` regions read by a screen reader.
- `docs/tasks/fourier-series/01-coefficient-kernel.md`, in its acceptance record's "Shift identity sign" bullet, contains literal tab characters where `\tau` lost its `\t`. This is a bash-heredoc backslash collapse. Fix it with the Edit tool.

## Settings to keep

- **Successor:** `--agent claude --model opus --permission-mode auto --effort medium`.
- **Workers and reviewers:** `bezeg-worker` and `bezeg-reviewer`, Sonnet `medium`. A graph slice uses one worker. When the review finds several issues, give the repairs to a fresh worker with a focused brief.
- **Smoke port:** 4315.
