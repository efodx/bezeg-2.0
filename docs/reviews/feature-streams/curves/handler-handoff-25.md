# Curves stream: handler handoff 25

Handler 25 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-02 at its 175k soft threshold. The supervisor started it after the PC switch. Replaces [handoff 24](handler-handoff-24.md).

## State

- Branch `worktree-stream-curves` equals `origin/master` at `95a8e3e5`. Working tree clean, nothing uncommitted.
- Nothing in flight: no workers, preview servers or temporary worktrees.
- Settings: handler Opus, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet; narrow smoke `bezeg-smoke` Haiku, broad or new-UI smoke Sonnet.
- Test slots on the new PC: heavy runs queue behind other streams. A path-filtered unit run over `src/graphs/base src/graphs/functions src/demonstrations src/learning/runtime src/localization` took 614 s. Use the narrowest paths that cover a change.

## Done this session

1. **BS-A-6, B-splines Batch A gate: passed**, so Batch A is released. Evidence is in `docs/tasks/b-splines-nurbs/README.md` (row BS-A-5…6): `just check` passed; the hosted CI full run at `6d7267a9` was green; `smoke-lesson bspline-basis bspline-deboor` passed 4/4; Haiku smoke covered both routes and the chapter. Gap: the basis Reset button was not exercised.
2. **IA-B-2c, I4 least-squares graph core** (`6a3a73eb`). [Evidence](../../interpolation-approximation/ia-b-2c-graph.md): two workers (the first reached its budget and handed off), engineering + UI review and a mathematical review, both with no blocking or should-fix findings. Its deferred nits are listed there.
3. **IA-B-2d, I4 registration** (`474f7d43`, `95a8e3e5`). It adds `/bezeg-2.0/interpolation/least-squares` with `lesson: false`, and `interp-least-squares` is in `POSTER_PENDING`.
   - **Escaped defect, mine:** the IA-B-2c push broke the Preset catalog contract on `master`, because the collection had no Demonstration. The Functions stream patched it first (`58aff938`, `PENDING_ROUTE_KEYS`); I removed the key there.
   - Registration also exposed a real defect: the default Preset could not be exported and imported again. Function graphs put the model in `graphState`, and the shared `checkSceneState` rejects the `points` list. The fix is a `checkGraphState` on the collection (`functionPresetCollections.ts`), with a rejection test that I watched fail without the fix.
   - **Lesson for briefs:** a slice that adds a Preset collection must run `just unit src/graphs/base/presets` before push.
4. Logged handoff 23's evaluation record (`e80bb0b1`).

## Next steps, in order

1. **Confirm the hosted CI full run at `95a8e3e5` is green** (`just ci`; check that `unit` and `chromium` jobs ran). If it is red, fix it before pushing anything else.
2. **Browser smoke of `/interpolation/least-squares`** (not done). Use a `bezeg-smoke` Sonnet worker, because this is first-pass UI, on port 4314. Cover:
   - SL and EN with a live switch;
   - dragging a point (the readout changes), typed point list, add/remove point and the degree limit;
   - manual line mode, squares toggle, normal equations typeset by MathJax;
   - Reset, Preset save and restore;
   - 390×844 and 200% text, with no console errors.
3. **IA-B-3b, I4 guided lesson (F3).** It has six steps per spec lines 91–104, an `lsq` lesson action, numbers asserted against the readout, and a smoke row. Mirror IA-A-3b (Runge). In the same slice, fix two deferred nits: show "≈" when a rounded residual or SS is not exact, and label the normal equations as the best fit's while manual mode is on. Keep the prose about outliers and squared vertical residuals as a modelling choice: acceptance criterion 3 requires it.
4. **I4 poster** (`interp-least-squares` is in `POSTER_PENDING`; recipe window `[-1.2, 4.6, 5.7, 0.4]` is unverified). Capture it when the other workers are idle.
5. Family 4 (PS) graphs (`G-FN` open), per handoff 18.
6. Interpolation chapter (F4): move the I1, I2, I3, I4 and I5 lessons out of the interim owner `bezier-curves/geometric-properties` (`guidedLessonOwnership.ts`).
7. Deferred, low priority: handoff 24 item 4.

## Evaluation record

Logged in `docs/agent-workflow/evaluation-log.md` (curves handler 25).

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-25.md under AGENTS.md.
