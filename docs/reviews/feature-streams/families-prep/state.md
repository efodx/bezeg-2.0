# Families-prep state note

Handler 5 handed off at BUDGET SOFT on 2026-11-11 to handler 6. The worktree is on branch `worktree-stream-families-prep-2`. One worker dispatched by handler 5 may still be running: the phase-portraits `LogisticMapGraph` worker, whose report goes to handler 5, not to you. Watch its note (`notes/f2a-phase-03.md`) and the working tree. Do not dispatch a second worker on that slice until the note shows the worker has stopped (rewritten as FINAL EVIDENCE for the whole slice, or a HANDOFF state). Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take two minutes or more while agents run. Give commits about 300 s and tsc about 200 s, and prefer the file tools for reading.
- Publish with `just publish --background --recipe runtime --base <last published local commit> --commits <ids oldest first>`, then check `just publish --status`. Pushed hashes differ from local ones, because publish rebases. Wait for a pending publish before you start one that depends on it. A background loop works: `while just publish --status | grep -q 'publish-<id>.*pending'; do sleep 30; done`.
- The publish gate rejects trailing whitespace. Run `LC_ALL=C.UTF-8 grep -nP ' +\r?$'`, because without the UTF-8 locale grep -P fails.
- Edit spec text with the Edit tool. Shell or Python replacement strings must not contain `\b`, `\v`, `\a` or `\t`. Check with `grep -cP '[\x00-\x08\x0b\x0c\x0e-\x1f]' <file>`.
- **Staging one slice's locale lines (changed by handler 5).** Do not use `git apply --unidiff-zero` while another slice has an unstaged block above yours. It placed the recursion block 138 lines late in `fc8fc14f`, which `a811d19e` fixed. Use `python .command-logs/h5-stage-only.py <drop-prefix>` instead. It stages each locale file as the working copy minus the lines that start with `"<drop-prefix>`. Then confirm that `git diff --cached -U0 -- src/localization | grep -E '^[+-][^+-]' | grep -v <your-prefix>` is empty. When the locale diff holds only your block, `git add` both files.

## Done

- F0, and all ungated F1 (handlers 2 and 3).
- **F2a.** Every graph has no route yet. Each passed engineering, UI/accessibility and maths reviews, and its repairs. Evidence is in `notes/f2a-*.md`, and decisions are in each spec's "F2a decisions" bullet.
  - Earlier: trigonometry 03–05, circle geometry 02, analytic lines 02, isometries 03.
  - Committed and published by handler 5 (local id → pushed):
    - randomness 03 (`a01d39e8` → `2b41f442`), which also carried the stream restart;
    - combinatorics 02 (`f5510444` → `ef4f2f1c`);
    - kinematics 02 (`ba08c623` → `098b4b66`);
    - recursion 02 (`fc8fc14f` → `254b5192`), with its locale-position fix (`a811d19e` → `9c5fbd89`);
    - waves 02 (`3d5c448f` → `8c1b431f`).
  - Mechanical-curves 02 is committed as `738cf9a1`; its publish was started in the background from base `3d5c448f`. Check `just publish --status` before calling it published, and use `738cf9a1` as the base for the next publish.
- **Owed at F2b** (also in each family's spec or task):
  - browser drag and playback measurements (every F2a figure is a jsdom placeholder);
  - Preset restore through the model parsers (recursion records it in its task 02 status);
  - the frieze NaN-break render check;
  - the waves sinc cost (about 42 ms in jsdom);
  - a remeasurement of the phase-portraits curve updates (jsdom: 21 ms median at 24 trajectories; compute is fine).
- **Controls-stream gaps** are filed in `docs/tasks/feature-streams/controls.md`:
  - `NumberInput` at 40 px in the inspector;
  - no checkbox group;
  - (new) the reduced-motion preference is read only at render.
  - Also seen, but not filed: the `NumberInput` range hint rounds π to 3,14 (descent θ help).

## In flight

- **Phase-portraits 03** (note `notes/f2a-phase-03.md`):
  - Done and uncommitted: the measurement, recorded in ADR 0054 §2 ("Measurement results", compute-only). The opt-in perf test is `src/dynamics/phaseDrawing.perf.test.ts` (`BEZEG_PERF=1`); the reviewers should judge whether it stays.
  - Done and uncommitted: `src/dynamics/phaseModel.ts`(+test).
  - Done and uncommitted: `src/graphs/dynamics/PhasePortraitGraph.tsx`(+test), with about 60 tests, 7 mutations and all checks passing.
  - Done and uncommitted: the `phase_graph_*` locale block, which sits right after the `descent_graph_*` block.
  - In progress: a worker building `LogisticMapGraph` (PP4–PP5). It also removes the unused `phase_graph_entry_rejected`/`_seed_rejected`.
  - Next: three reviews of the whole slice (engineering Sonnet, maths Sonnet, UI Haiku, at most two at a time), one repair worker, your recheck, then the commit. The locale diff then holds only `phase_graph_*`, so `git add` both files. Then publish with base `738cf9a1`.

Next F2a slices, in rank order, at most two in the stream: solids 03 (3D, measure first), level-sets 04, linear-maps 11, complex-maps 09. Then a Controls-compliance review of the four earlier F2a graphs (trig 04–05, circle 02, lines 02, isometries 03) against `docs/specs/shared-graph-controls.md`. Then F2b–F6 per family release task (read the family template in `docs/tasks/feature-streams/README.md` and its shared-file rules first).

## Pipeline that worked (handler 5)

- **Slices span workers.** A graph slice takes two to five workers: model, then graph, then compile/tests, then finishing checks. Every one stops at the 135k HANDOFF with a usable note. Brief each successor from the note in about 400 words, and make the last step a short "finishing" worker (lint, build, greps, final note).
- **Reviews.** Engineering (Sonnet, ≤400 words), maths (Sonnet, ≤350 words, at least six independent re-derivations), UI/accessibility (Haiku, ≤300 words). Give the Haiku reviewer an "already known, do not re-report" list and tell it to read by sections. Then one Sonnet repair worker with numbered, settled decisions. Record the decisions in the spec's F2a bullet yourself.
- **Lessons each brief carries.** These cut repeat findings:
  - describedBy help that states the range; a caption for every element a readout names; no hard-coded strings;
  - a cache keyed on state identity with no language-resolved strings;
  - typed input refused, while dragging snaps; program-changed values announced; every stored-field change pauses, including a direct `setState`;
  - readout rows always labelled (an unlabelled row turns `ReadoutList` into a `ul`); decimal comma and true minus; scales stated; colour never the only carrier;
  - Reset uses the shared `reset` key (C29); continuous runs use the `reduced-motion` play block (C12);
  - the JSXGraph text-timer baseline in ownership tests (`RecursionCobwebGraph.test.tsx` ~545–560); JSXGraph evaluates `visible` during `create` (a TDZ crash).
- **Templates.**
  - `KinematicsGraph` for host-held time and playback;
  - `LatticePathGraph` for drag handles with numeric fields;
  - `RecursionCobwebGraph` for stepping.
- **Locale.** Name the block's anchor key in each brief and forbid sed or scripts on the locale files. One worker removed a space after a colon in a neighbouring key; another inserted keys by script.
- Mutation backups go in `.command-logs/<slice>-<name>.bak`, never in `/tmp`.

Rules to keep: at most two workers in the stream at once; never edit shared host files. At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
