# Functions stream: handler handoff 19

Handler 19 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02 after the 150k soft threshold. `G-FN`, `G-REG` and `G-HL` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`, equal to `origin/master` at this note's parent plus this note. `origin/worktree-stream-functions` has old, diverged history: never push there. `origin/stream-functions-f3c`, `-f3c-wip` and `-f4-wip` are stale backups. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **On `master` this session:** F3c K3 lesson (`ef4f8f21`, after two mechanical rebases and a preview-count fix 78/85), F4 chapter `projective-conics` (`e762b621`, chapter reference count 90 after merging T4 Simson), F5 chapter cards (`1ed73370`). Evidence is in `docs/tasks/projective-conics/06-batch-a-release.md` (F3c, F4, F5 entries).
- **F6 so far, at `1ed73370`:** `just check` green (typecheck, lint, 464 files / 8235 unit tests, build). `just smoke-lesson projective-cross-ratio projective-pascal projective-pole-polar circle farin` passed (14 tests).
- **Hosted CI is red, not from this stream.** Runs 41441375191 (`e762b621`) and 41442928082 (`1ed73370`) fail only `tests/demonstrations.smoke.spec.cjs:114` with "Missing or stale recipe/outcome provenance for interp-subdivision". It already failed on `a142bf70` (run 41437547157, before our pushes): curves BS-A-5a (`c6dd85a9`) changed the `interp-subdivision` recipe without recapture. The curves stream owns the fix (its BS-A-5b joint poster capture). Do not recapture posters from this stream.

## Next, in order

1. F6 browser smoke: dispatch one `bezeg-smoke` (smoke-tester skill, port 4315, `just build` first if stale) for gate items 1 and 3–4 of `docs/specs/projective-conics-lessons.md` §Batch-wide acceptance gate: the three `/bezeg-2.0/projective/...` routes open directly and after refresh with their lesson and static preview; `/learn/projective-conics` and its three cards; SL and EN with a live language switch (board text too); keyboard parameter stepping; restore on lesson exit; Presets and figure export; `/learn/rational-curves#worked-conic`, `circle` and `farin` unchanged; no console errors; no overflow at 390 px.
2. CI: check `gh run list --branch master`. Accept F6 once the only CI failure is the curves-owned `interp-subdivision` provenance (record it) or CI is green. Record F6 in `06-batch-a-release.md` and the stream file (family 3: "F6 accepted … (Batch A released)"), push.
3. Then family 3 Batch B (K4–K5, five-point conic) per the spec and `docs/tasks/projective-conics/README.md`, or, if Batch B is not planned there, the remaining Batch B work of the other three families; check each family's task README for the next unaccepted batch. If nothing ungated remains, write a final note and set `Run state: complete`.

## Deferred items (low)

- F5: the K1 card is small and crowded because the K1 lesson opens at a wide view; a tighter opening view would improve it. K2 card labels `p` and `s6` clipped at the edge.
- F3c review: `pole-polar-place` while P is at infinity is untested in the host test.
- Handoff 16's items still stand (Learn card `alt` text with raw LaTeX, root-finding Method switch on the default scene, Fourier \(S_1\) sampling and zoom, the uniform-convergence link).

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`. Workers `bezeg-worker` Sonnet `medium`. Logs in the current job's tmp folder. Heavy checks with `BEZEG_MEMORY_FLOOR_GB=0.5`, one at a time. Claude Code reaps background commands for low memory while the session idles (three times this session); the harness asks for the owner's approval before rerunning a reaped command, so expect a pause there.
