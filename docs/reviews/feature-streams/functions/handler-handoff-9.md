# Functions stream: handler handoff 9

Handler 9 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-01 at the 150k soft threshold. `G-FN` and `G-REG` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Pushed to `master`:** `723e285f` (run state active), then `45571d42` and `c428fe92` with this note's status records. The push commit is in the stream file's history.
- **Accepted this session:**
  - Numerical methods 04 **F2a**, `45571d42`: `src/analysis/rootFindingModel.ts`, `src/graphs/functions/RootFindingGraph.tsx`, `rootFindingMessages.ts`, Preset collection `root-finding`, 58 locale keys after `bisection_note`, and four Slovenian terms in `docs/localization.md`: tangentna (Newtonova) metoda, sekantna metoda, približek, začetni približek. Sonnet review found nothing of medium severity or higher. The handler added `aria-label` to the iterate table.
  - Projective 06 **F2b**, `c428fe92`: Projective family, routes `/bezeg-2.0/projective/{cross-ratio,pascal,pole-polar}`, `PresetImport` registration, preview recipes, and posters in `POSTER_PENDING`. Fixes found by registration:
    - `exportPreset` drops `model` from `graphState`;
    - each collection is one shared object per key;
    - Reset uses `initialView()`, the same box as start-up;
    - the transient-state contract declares the three ids in `PRESET_DATA_STATE_KEYS`, and `realGraphScenes.perturbModel` switches example by collection key.

    Browser frames are in the ADR 0033 "Browser measurement (slice 06)" section. Drags hold 60 Hz. The K2 conic switch has p95 66.6 ms, once per click, so no bound or density change.
- **Checks at `c428fe92`:**
  - `just typecheck` passed.
  - `just build` passed.
  - `just unit` on Routes, demonstrations, DemonstrationsPage, preview assets, `src/learning`, `src/graphs/base`, `src/graphs/projective`, `src/graphs/functions` and rootFinding passed. Two Maps contract failures appeared in it; Maps fixed them in `a8407d3b`, and a rerun of `GraphTransientState` after rebasing over it passed.
  - The full suite passed before the last rebase, apart from the failures fixed in this slice.
  - Low memory reaped background runs twice, so checks ran in the foreground.
  - No browser smoke of the new routes beyond W1's probe, which showed titles, one board per route and the live switch.
- **Flaky, not ours:** `src/graphs/compgeo/InscribedAngleGraph.host.test.tsx`'s scripted-drag test (Maps, `5d629d58`) timed out at 60 s in a loaded full run. It passed alone in 60.8 s. If it recurs, tell the Maps stream.

## Next, in order

1. **Projective 06 smoke** (handoff 8 item 1, still open): `bezeg-smoke` (Sonnet; first pass of new UI) on port 4315 against a fresh `just build`. Cover the three routes: layout, label offsets, marker faces, touch and pointer dragging, the live SL/EN switch, the status live regions, Preset save/reload, and the malformed-import error text. The view box now comes from `initialView()`, so check the starting framing on each route. Also not covered by W1's measurement: touch, CPU throttling, the line-pair conic, and why a half-turn K2 handle sweep snapped back to its start (a quarter turn worked). Investigate that in the smoke or a probe.
2. **Numerical methods 04 F2b:** route, Analysis catalog entry, Demonstration registration, and a `root-finding` lesson animation id with its typed scene action (add the names to `FUNCTION_PARAMETER_NAMES`/choice names in `src/learning/model.ts`). Remove `root-finding` from `PENDING_ROUTE_KEYS` in `PresetCatalog.test.tsx`. Expect the shared contracts (`GraphTransientState`, `Routes.test`, `demonstrations.test`, `DemonstrationsPage.test`, `lessonCatalog.test`, `POSTER_PENDING`) to need the new id; run them before the full suite.
3. Family 2 (school function graphs) 05 F2a and Fourier 03 F2a are ungated now. They can run beside the steps above, at most two workers at a time.
4. Then projective 06 F3–F6 and numerical 05 lessons.

## Deferred review items (low)

- RootFinding: no test switches the language while the graph is mounted, and the host test runs SL only. The range-edit message formats its bounds at throw time. A stored Newton model with a missing `x1` gets only the generic message. The model stores both starts for either method; equal starts are rejected only for secant. The non-finite and step-cap statuses are untested at graph level. The table shows the last 10 rows.

## Lessons for briefs

- When two workers share the worktree and touch registration, the full suite fails in shared contracts (`PresetCatalog`, `GraphTransientState`) for the other worker's ids. Give a new graph's collection a `PENDING_ROUTE_KEYS`-style entry in the same slice.
- The test-slot wait reached about 14 minutes and low memory killed one background chain. Use `BEZEG_MEMORY_FLOOR_GB=0.5` only on trees older than `c0fc4292`; this tree has it.
- Model-shape detection in shared test helpers matched unrelated models (`example` field in Darboux/Bisection). Key such branches by collection key.

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`; workers and reviewers `bezeg-worker` / `bezeg-reviewer` Sonnet `medium`; smoke `bezeg-smoke`; port 4315; name the projective term table in Slovenian briefs.
