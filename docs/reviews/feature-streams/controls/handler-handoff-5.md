# Controls handler handoff 5

Written 2026-11-08 at a task boundary (task 1 complete), before `BUDGET SOFT`. Read this and the [handler card](../../../agent-workflow/handler-card.md), then continue.

## State

- **Worktree and branch:** `.claude/worktrees/stream-controls`, branch `worktree-stream-controls`, clean, equal to `origin/master` at handoff apart from this note's commit. `Run state: active`.
- **On `master` this session:** `595d5b76` hint clears on Reset (decision 24), `b675f29e` rendered fixture, slice 5c (decision 25), `dc7fa255` fixture findings, slice 5d (decision 26). CI for `4ced8b64` and `b675f29e` is green. Confirm `dc7fa255` with `just ci dc7fa255` (prefix `PATH="/c/Program Files/GitHub CLI:$PATH"` in Bash); it was in progress at handoff.
- **Task 1 (Foundation)** is accepted: slices 1–5 done. Its gaps are listed below; I1 is met by task 2's pilots.

## Next: task 2, shared point controls

[Task 2](../../../tasks/shared-graph-controls/02-shared-point-controls.md): pilots PointSet, Interpolation, curve workspace. The previous handoff also named smoke for `interp-fifth-point-added` and `hermite-locality-six`, the lesson-view changes in decision 6 and the User impact list; fold them into task 2's smoke. Read task 2 and the spec's Capability catalogue section first, write a brief from `brief-5c.md` as a template, and split the pilots into slices.

## Tools now available

- `just controls-fixture` renders every shared control (`fixtures/controls/`, dev server on port 4328, ~25 s) and checks clipping, focus and 44 px touch targets at five views in both languages. Add a new shared control or state to the fixture when you add it to `src/inputs/`.
- `ReplacementRevision` (`src/inputs/replacementRevision.ts`) tells fields about scene replacements; `BaseGraph` provides it around Edit and Display.

## Open items

- At 200% text a longer `ChoiceSelect` option is clipped (native select, 310 px inspector); held as one `test.fail` in `tests/controls-fixture.spec.cjs`. Needs shorter labels or a radio group: a decision to record.
- The count setter's refusal does not listen to `ReplacementRevision`.
- De Boor and Interpolation count setters have no `onSet`, so their typed path is untested; model-refused in-range values are not covered (both from 5b, for task 3).
- In the presenting theme, the enabled count-setter button in a tools list shows a faint glyph ([2a evidence](foundation-2a.md)).
- No screen reader has been run on any slice; browser checks are Chromium only.
- No shipped graph can reach a refused `axisPoint` drag.
- Hand-built −/+ steppers are not caught by lint (`uncaughtSteppers`, five files).
- Nine compgeo hidden live paragraphs and the function status groups still use their own patterns; they move to `LiveReadout` in the family sweeps (decision 18).
- The `.inspector-display-graph` fix was verified in the fixture only; no real route renders that group (smoke found none).

## Risks and working notes

- **Publish races:** the clips stream pushes about every 20 minutes, as long as the gate takes. Three gate runs were rejected at push this session. What worked: after a gate run verified the commit, `git rebase origin/master`, check that the new master commits do not touch your files, rerun `just lint` plus the focused check, and `git push origin HEAD:master`. After a rejected gate run the local commit IDs have changed; declare the new ones.
- **Python edits:** always `open(p, newline='', encoding='utf-8')`. A read without UTF-8 failed on write and truncated a test file (restored from `HEAD`). Build the content before opening for write.
- **Line endings:** `core.autocrlf` is true; keep each file's endings. `git add` with a missing pathspec aborts the whole add; check `git diff --cached --stat`.
- **Ports:** 4317 belongs to Codex; 4327 for previews, 4328 for the fixture.
- **Smoke:** the workspace Reset is on the Save tab ("Shrani"); the Edit tab's "Ponastavi" is the playback reset.

## Settings

Successor: `--agent bezeg-handler --model opus --permission-mode auto --effort medium`. Routing per the handler card. Each handler launches its own successor at handoff and passes this rule on.
