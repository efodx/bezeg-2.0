# Functions stream: handler handoff 7

Handler 7 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-10-31 at the 150k soft threshold, after finishing slice 05c.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Everything is on `master` (`52ba7b08`, plus this note).** The tree is clean. Pushed this session:
  - `214f5841`: restored `\tau` in the [Fourier 01 acceptance record](../../../tasks/fourier-series/01-coefficient-kernel.md). It no longer contains tab characters.
  - `ca4b831c`: slice 05b, the K3 pole and polar graph. Its CI run passed. Record: [05b acceptance record](../../../tasks/projective-conics/05-batch-a-graphs.md#05b-acceptance-record-2026-10-31).
  - `eae37fae`: a K3 fix. The graph now owns JSXGraph's helper points for coefficient-defined lines (`src/graphs/projective/definingPoints.ts`), and the K3 readouts moved to the inspector.
  - `d44a39be`: slice 05c, the K2 Pascal and Pappus graph. Record: [05c acceptance record](../../../tasks/projective-conics/05-batch-a-graphs.md#05c-acceptance-record-2026-10-31).
  - The `do-log` records for 05b and 05c are in `docs/agent-workflow/evaluation-log.md`.
- **CI:** the 05a run (`ab81346`) and the 05b run passed. The run for the `52ba7b08` push started after this note was written. **Confirm it first:** `gh run list --branch master --limit 3`. If it failed on projective files, fix that before anything else.
- **Checks on 05c, on the rebased tree:** `just unit src/graphs/projective src/localization src/projective`, `just lint` and `just check-localization` passed. The full suite is left to hosted CI.

## Remaining steps, in order

1. **Confirm CI** for `52ba7b08`, as above.
2. **05d: the drag measurement** per `docs/performance-plan.md`. It fixes `DEFAULT_SAMPLE_DENSITY` (720 for now, in `src/projective/conicSampler.ts`) and `DIRECTION_BOUND` (14 for now, in `src/projective/conicPencil.ts`).
   - Record the numbers in ADR 0033 or a follow-up ADR. Check `git ls-tree --name-only origin/master docs/adr/` before choosing an ADR number; other streams add ADRs (0035 is the sweep-line family's).
   - Cover the sampler's open notes in the [03 record](../../../tasks/projective-conics/03-conic-sampler.md#acceptance-record-2026-10-31): the chord-only `refine`, and pieces missed in a distant view.
   - Representative interactions: dragging a K2 handle on each conic (the conic stays put, but six handles redraw the hexagon), dragging K3's P, and a conic switch in K2 and K3. The graphs exist only as components; there is no route until slice 06. Measure through a host or bench harness, or document why a browser measurement waits for slice 06.
   - Changing `DIRECTION_BOUND` changes the table indices that K2 Presets store. The `projective-pascal` Preset key has no route or `PresetImport` registration yet, so no user data exists. Record that in the ADR, and re-derive the K2 example indices with their tests.
3. **Then wait.** Task 06 and task 07 F2b–F6 need `G-REG`; the graph slices of families 1, 2 and 4 need `G-FN`. Projective 07 F2a (the K4 and K5 graphs) is ungated but depends on 06. When only gated work remains, set `Run state: waiting on G-FN, G-REG` in `docs/tasks/feature-streams/functions.md`, push, and end.

## Owner decisions and risks

Carried over from handoff 6:
- `TRANSFORM_BOUNDS` and `POLY_BOUNDS` are unconfirmed.
- Decimal-comma localization in the graph and lesson slices is undecided.
- ε=0 is routed to `circleConic`.
- *pol* is always paired with *polara*.
- *šop premic*, *središčna projekcija*, *Pappusov izrek* and the Fourier wave names rest on thin sources.
- The quotient-rule LaTeX assertion belongs to family 2's task 06.
- Fourier 02 has three open notes in its acceptance record.
- Task 04's arc statuses (`no-real-weight`, `complementary-arc`, `split-needed` with reason `ideal-end`) need UI wording in task 07.

New this session:
- **K2 and K3 figure exports have no readout text,** because the readouts moved to the inspector so they would not overlap the hyperbola. Slice 06 or the lessons may add an export caption.
- **K3 has no separate pole-of-a-line mode** (contract step 6). The lesson can show it with the same picture, since P is the pole of its drawn polar.
- **K2 terms not yet in the projective term table:** *Pascalova premica*, *šestkotnik*, *stranica*, *oglišče*, *presečišče* and *determinanta*. Add them when the lesson slice settles the terms.
- **The workers' Slovenian strings needed handler correction:** *stožernica* became *stožnica*, and an agreement error was fixed. Name the term table (`docs/tasks/projective-conics/README.md`) in every brief that writes Slovenian.
- **Unverified until route slice 06,** for all three graphs: browser layout, label offsets, marker faces, touch and pointer dragging, the live SL/EN switch, and screen-reader behaviour of the status regions.

## Settings to keep

- **Successor:** `--agent claude --model opus --permission-mode auto --effort medium`.
- **Workers and reviewers:** `bezeg-worker` and `bezeg-reviewer`, Sonnet `medium`. A graph slice the size of K2 exceeded one Sonnet budget; split large slices. When a review finds several issues, give the repairs to a fresh worker with a focused brief.
- **Smoke port:** 4315.
