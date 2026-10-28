# Bézier patches handler handoff 13 — 2026-10-28

Current entry point; supersedes [handoff 12](handler-handoff-12.md). Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push). Task 07 is complete; task 08 is in progress.

## Successor rule (owner instruction, 2026-10-28; replaces "do not start your successor")

At your context handoff, commit and push your handoff note, then start your successor yourself: `claude --bg -n "bezier-patches handler <n+1>" --agent claude --model claude-opus-5-5 --permission-mode auto "<prompt>"` from your working directory (CLI at `%APPDATA%\npm\claude`; docs/agent-workflow.md handler budget step 6). The prompt names your note, says to continue under AGENTS.md, and repeats this rule so every successor starts the next one. Do not launch when the remaining work needs an owner decision, would repeat a failed step, or the objective is complete; if the launch fails, end with the note path and a paste-ready prompt. Report the session id, note path and commit in your final message. Repeat this rule in your own handoff note.

## Git state

- `origin/master` = `e51792a` (task 07 complete: R2 repairs `e309b99`, docs/record `e51792a`). CI for `e51792a` not yet checked: `curl -s "https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?branch=master&per_page=3"`.
- `origin/bezier-patches-wip` = this note's commit: on top of master, `39ad327` (08A triangular workspace core), `0725bb5` (real `patch-triangular` catalog preview via selective recapture), then this note. **Not on master yet** — held until the 08A reviews below are dispositioned. Push with `git push origin HEAD:master` from a checkout of `origin/bezier-patches-wip` after fetching (fast-forward of `e51792a`).
- Work happened in worktree `.claude/worktrees/bezier-patches-r2` (branch `worktree-bezier-patches-r2`, `node_modules` is a junction to the main checkout). Untracked `tmp-*` dirs there are worker scratch (logs, mutation scripts); not committed.
- The main checkout `C:\Users\1337Hacker\Desktop\bezeg-2.0` still holds the old uncommitted R2 WIP diff from handler 12 (8 files in `src/graphs/patches`, `src/localization`) on a `master` two commits behind. It is fully superseded by `e309b99`; the owner may discard it (`git checkout -- <files>` then `git pull --ff-only`). `debug.log` is unrelated; leave it.

## Accepted this phase

- Task 07 R2 + R1b recheck: [task07-r2.md](task07-r2.md). Handler change: z-drag `cos el` floor 0.2 → 0.5 after the browser showed 8.11 units per 40 px in top view. Evaluation-log record for task 07 appended.
- 08A ([brief](t08a-brief.md), [worker handoff](t08a-handoff.md)): three sequential Sonnet-high workers — the first two each hit 135k (49 and 59 turns), the third closed out in 44 tool uses. Slice was too large for one worker; split 08B/08C smaller. `just check` 4127 tests; 91+ new scene/Preset tests with observed mutation failures; graph tests 25/25.
- Triangular preview: real generator run (`PREVIEW_RECAPTURE_IDS=patch-triangular … PRESERVE_SOURCE_PROVENANCE=1 VERIFIED_PRESENTATION=1`), handler viewed the PNG (triangular net, 10 points, three iso families). Framing sits right of centre — note for task 13. Manifest `mixedGraphSource: true` (a full recapture clears it; `just preview 3012`).

## 08A reviews (dispatched 09:24 UTC, e51792a..0725bb5)

- **Math (Sonnet medium, read-only; mathematics verified correct: ordering, boundaries↔edges, iso families, de Casteljau levels, exact elevation, lowering claim truthful in `patch_triangular_degree_help`, subdivision, boundary omission of the split):**
  - M1 (medium, derived from code, not reproduced): DTO accepts `u+v ≤ 1+1e-9` (`patchPresetCollections.ts` triangular `checkState`) but the kernel throws above `1+8·EPS` (`triangular-bezier-patch.ts:75-83`); `{u:0.5, v:0.5000000005}` imports then throws in `buildTriangularScene` (`TriangularPatchScene.ts:245`). Fix: clamp `v = min(v, 1−u)` in `stateFromDto` (`TriangularPatchGraph.tsx:49-60`) and/or tighten the tolerance; add a test in the gap (existing test `triangularPatchPresets.test.ts:97` only covers 1+2e-16).
  - M2 (low): `chordTolerance` cached by `input.net` identity (`TriangularPatchScene.ts:161`) — fine only if nets are never mutated in place; confirm.
- **Engineering (Sonnet medium, static read; no blocking/medium; tensor behaviour, disposal, transient split state, DTO, localization, placeholder lesson section and test strength verified fine):**
  - E1 (low): `DemonstrationPreview.tsx:6,96` optional `src` is now unused by callers (kept for a test); its `src`-keyed effect sets `pending` with no `<img>`. Decide: keep knowingly or revert.
  - E2 (low): same `u+v ≤ 1+1e-9` tolerance as M1 — fixed together with M1.
  - E3 (low): `setSelectedCoordinates` exists without a panel control — intended, 08B adds the editor.
  - E4 (low, accessibility): three iso families distinguished by colour only (`threeSurfaceView.ts:48-49`, `patch_triangular_iso_help` `en.ts:1252`); amber 4.4:1 on white. Consider a dash pattern or legend in 08B/UI review.
- **Browser smoke (`bezeg-smoke` Sonnet medium, `just preview 4195` of `0725bb5`, Chromium; all 8 checks passed, 0 console errors; scripts/screens in the worktree's `tmp-smoke08/`):** host role/label/description; degree 1–4 → 3/6/10/15 points, elevate/lower round trip exact; u/v clamp with read-only w; split overlay inside, none on the boundary; switches, three iso colours, camera presets and reset; plane and z drag with camera fixed; Preset save/reload/restore incl. degree 4 and camera, delete; hostile imports (length, degree, non-numeric) rejected with actionable messages; English switch keeps framing identical; 390×844 touch orbit without overflow; tensor ↔ triangular navigation.
  - S1 (low, UX): typing `u` above its allowed maximum is not applied but the field keeps showing the typed text (`TriangularPatchPanels.tsx` u/v inputs) — show the clamped value or a validation message.
  - S2 (low, UX): initial camera distance 15.68 vs 7.37 after "Ponastavi pogled" — the graph opens small; the default camera should match the fitted reset view (the preview recipe already uses 7.37).
  - Gap: the catalog card image was not opened in this run (the capture worker's demonstrations catalog smoke, 55 passed, covers the manifest/preview wiring).

**Disposition plan for the successor:** one small repair slice for M1+E2 (clamp in `stateFromDto`, test in the tolerance gap with an observed pre-fix failure), S1, S2, and M2 confirmation; decide E1 (handler: keep — it is tested and harmless) and E4 (carry to 08B UI work). Then `just check`, push master.

## Remaining steps, in order

1. Disposition every 08A review finding (repair worker Sonnet high, small slice; handler confirms local fixes), `just check`, push master (fast-forward), mirror wip, check CI.
2. 08B (Sonnet high, keep ≤ ~20 turns of work — split further if needed): triangle-domain inset (GraphSession auxiliary board, edge/vertex clamps), index `(i,j,k)` selection + numeric xyz editor, three edge-parallel highlight lines, Bernstein weight readout (P with subscript indices like tensor), export labels. Mirror task 07 C2a ([c2a-brief.md](c2a-brief.md)).
3. 08C: comparison view (tensor and triangular patch of the same boundary degree, distinct domains explained) inside `patch-triangular`.
4. Task 08 acceptance: math/engineering/UI review of 08B/08C, smoke of affected routes, measure default/stress gestures against ADR0018 budgets, evidence in `docs/reviews/bezier-patches/triangular-workspace.md`, docs (capabilities, ui-functionality, current-architecture), evaluation-log record for task 08 (include 08A's two budget handoffs), mark task 08 complete.
5. Then tasks 09–14 in index order.

Follow-ups recorded for later tasks: task 13 owns the triangular preview framing and any motion clip; task 12 owns the placeholder `triangular-patches` section in `guidedLessonOwnership.ts`.

## Settings

Handler Opus 5.5, auto mode. **Handler self watcher soft threshold 175k (owner override of AGENTS.md's 150k, 2026-10-28; also in project memory), then 190k closeout.** Workers: `bezeg-worker` Sonnet high for implementation/repairs, Sonnet medium for math/engineering review; `bezeg-smoke` Sonnet medium for first-pass smoke of new UI, Haiku medium for narrow rechecks (name the inspector tab — Preset controls are only under **Shrani**, import is a modal). Watchers 135k / Haiku 78k. At most three workers at once; give one worker preview/build ownership.
