# Controls handler handoff 4

Written at `BUDGET SOFT`, 2026-11-08. Read this and the [handler card](../../../agent-workflow/handler-card.md), then continue.

## State

- **Worktree and branch:** `.claude/worktrees/stream-controls`, branch `worktree-stream-controls`. `Run state: active`.
- **On `master`:** task 1 slices 3 (`606902be`, CI green) and 4 (`2fe941f9` + docs `2b91d01c`). Confirm CI for `2b91d01c` with `just ci 2b91d01c` (prefix `PATH="/c/Program Files/GitHub CLI:$PATH"` in Bash); its run was in progress at handoff.
- **Committed locally, not pushed:** slice 5a, `56a74a93` "feat: lint rejects raw controls in graph code" (decision 22, [evidence](foundation-5a.md), evaluation entry). The publish gate needs a clean checkout, so publish it together with 5b.
- **Slices 5a and 5b:** accepted and committed (decisions 22–23, evidence [5a](foundation-5a.md), [5b](foundation-5b.md)). The previous handler ran the publish gate for both before handing off: check `git log origin/master` and `.command-logs/5-publish.log`. If they are not on master, rerun `just publish --recipe runtime --base 2b91d01c --commits <5a id>,<5b id>`, using the base the gate reports if master moved.

## Next: fix the field hint that survives Reset

5b found that after a refused typed value, the host Reset restores the value but leaves the range hint on screen, on all four numeric and slider consumers. The cause is in `src/inputs/NumberInput.tsx:97`: the sync effect updates the draft but never clears the hint. The four Reset cases in `src/graphs/base/sharedControls.graphs.test.tsx` run as `it.fails` through `knownGap: {reset: STALE_HINT}`.

The fix: clear the hint when the external value changes. Keep a hint that is still true, such as the unavailable reason or a snapped notice set by the same commit; check that the snapped hint from decision 16 still shows after its own commit. Remove the `knownGap` entries. This is a small, coupled change, so handler or one worker. Other 5b findings, both for task 3: the count setters in De Boor and Interpolation have no `onSet`, so their typed path is untested; model-refused in-range values are not covered.

## Next: slice 5c, rendered fixture

Workstream 1 asks for a test-only rendered fixture: [lesson-authoring](../../../specs/lesson-authoring-architecture.md#1-shared-inspector-controls), line ~72 and I3. It must not be a public route. Handler's intended design, not yet recorded:

- A root-level `fixtures/controls/index.html` with `main.tsx`, served only by the Vite dev server. The production build uses `index.html` as its only entry; verify the fixture is absent from `build/`.
- It renders every shared control variant: both boolean variants, choice, numeric, slider and count, with help and error, unavailable and disabled states, and long bilingual labels. A query parameter selects the language.
- A Playwright spec and a `just` recipe start the dev server on port 4328 and take shots at 1440×900, 1024×768, ~724 px, 390×844 and 200% text. They check for no clipping and visible focus.
- This closes the long-open gap: the checkbox variant, switch help and a disabled switch have no browser coverage.
- Record the design as a spec decision before dispatch. Recipe changes touch `justfile`, which is a shared file.

Then task 2 (smoke `interp-fifth-point-added` and `hermite-locality-six`) and the queue in [controls.md](../../../tasks/feature-streams/controls.md).

## Open items

- In the presenting theme, the enabled count-setter button in a tools list shows a faint glyph ([2a evidence](foundation-2a.md)).
- No screen reader has been run on any slice.
- No shipped graph can reach a refused `axisPoint` drag.
- Hand-built −/+ steppers are not caught by lint (`uncaughtSteppers`, five files).
- Nine compgeo hidden live paragraphs and the function status groups still use their own patterns. They move to `LiveReadout` in the family sweeps (decision 18).

## Risks and working notes

- **Line endings:** `core.autocrlf` is true. Workers' edits left about 65 files stat-dirty but content-identical, and that blocked the publish gate. `git checkout --` on them is refused by the permission classifier. A fix that worked: for each file whose `git diff` is empty, convert it to CRLF. Files without a final newline need the trailing `\r` removed (`truncate -s -1`). Tell workers to keep line endings.
- **Edits with Python:** files may hold CRLF. Match with the file's own newline, or an assert will fail after a commit has already gone in (this happened once; fixed with a follow-up docs commit).
- **`git add` with a pathspec that no longer exists aborts the whole add.** Check `git diff --cached --stat` before committing.
- **Publish needs arguments:** `--recipe runtime --base <parent> --commits <ids>`. It takes 15–40 minutes and requires a clean checkout, so no worker may be editing.
- **Workers' background `check-changed` may never write its log.** The runtime gate runs `check-changed` anyway.
- **Ports:** 4317 belongs to Codex; use 4327–4329.

## Settings

Successor: `--agent bezeg-handler --model opus --permission-mode auto --effort medium`. Routing per the handler card. Each handler launches its own successor at handoff and passes this rule on.
