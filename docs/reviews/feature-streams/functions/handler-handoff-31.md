# Functions stream: handler handoff 31

Handler 31 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 after its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions` (`origin/stream-functions` has diverged, never force-push it). Use `git log` for hashes after any rebase.

## Done this session (on master)

- **Poster repairs** (`da824fdc`): `fourier-coefficients` recipe window `[-6.2, 3.8, 6.2, -3.8]`; `rational-function` asymptote labels moved off the curve (oblique/horizontal label at the rightmost spot where the curve runs below the line, ≥ 12 px from poles; `x = a` left of a pole when f rises to +∞ on its right; host test) and window `[-4.7, 8, 12.7, -2.6]`; both posters recaptured selectively (`poster-recapture-31.log`; needs `PREVIEW_BASE_URL=http://127.0.0.1:4315/bezeg-2.0` with the path, and `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` because the recipe file is in the presentation fingerprint).
- **Fourier task 05 F6 accepted, Batch B released** (`75b4a459`): `just check` green at `69e58fc9` (9641 units), `just smoke-lesson` 6 lessons (12 tests), browser smoke 1920/390 SL/EN, CI green run 41614323543 on `b6b4dc66`.
- **Numerical 07 step 1** (`c2a90be9`): `scripts/euler-field-perf.cjs` + `scripts/perf-harness/`, `docs/reviews/numerical-methods/07-field-measurement.md`, **ADR 0037** (field = one JSXGraph curve, NaN-separated).
- Answered geometry 43 and curves 37: their `guidedExamplePreviews.test.ts` failure was the stale Vitest glob cache (`docs/commands.md:18`), not master.

## Local only (not pushed): numerical 07 F2a under review

Commit `cd2c304c` "feat: direction-field and Euler graph, unmounted (numerical methods 07 F2a, under review)" plus this note's commit. Files: `src/analysis/eulerModel.ts`, `eulerField.ts` (+ tests), `src/graphs/functions/EulerGraph.tsx`, `eulerMessages.ts`, `EulerGraph.host.test.tsx` (11 tests), `EulerGraph.test.ts` (28 Preset cases), `euler` Preset collection, `PresetCatalog.test.tsx` pending key `euler`, `euler_ode_*` / `invalid_euler_ode_*` locale keys. Briefs `briefs/numerical-07-f2a.md`, `-resume.md`; first worker's note `worker-numerical-07-f2a-handoff.md`. Worker checks: tsc 0, eslint 0, `just unit src/graphs/functions src/analysis src/localization src/graphs/base` passed; mutations (ratio swapped, slope transposed, Y bound loosened, extra field curve, polyline past last finite point) each failed tests and were reverted. Logs in the old job tmp (gone); rerun if needed. Handler decisions: prefix `euler_ode_*`; exact value/error hidden when the exact solution has a pole at or before end x; no lesson actions at F2a.

Reviews (no blocking findings) — repair, then accept:

1. **should (math):** `euler_ode_note` (`en.ts:747`, `sl.ts:746`) says the ratio approaches 2 "without reaching it"; false for \(y'=x-y\) (ratios 3.12, 2.29, 2.12, 2.06 from above; \(y'=y\) from below 1.53, 1.69, 1.82, 1.90). Write "approaches 2 as h shrinks" / "se približuje 2, ko se h manjša". Also check SL "rešitev približa" (maybe "jo približa").
2. minor (math): `eulerModel.ts:187` exact readout skips the `|y| > 1000` cutoff used by `exactAt` (`:146-151`); apply the same bound.
3. minor: `EulerGraph.tsx:311` steps readout shows planned steps after an early stop; show steps taken or label "planned".
4. minor: `revealed` not reset on example / initial point / end-x change (`eulerModel.ts:127-128`, `EulerGraph.tsx:76-92`); reset to `null` (recommended) and test it.
5. minor: `eulerMessages.ts:34-35` edit messages reuse file-import wording; comment unreachable or add edit wording.
6. minor: `EulerGraph.tsx:149-150` cached arrays shared by reference with the curve; assign copies or document read-only.
7. minor tests: unmount should also assert the point and caption texts leave `board.objects` (`host.test:242-272`); add a resize case to the field-cache key test (`:150-163`).
8. deferred: `displayedError`/`ERROR_DISPLAY_DIGITS` imported from `quadratureModel` (move to a shared helper when a third consumer appears); `fieldBuilds` is a documented test seam.

Then: `npx tsc`, eslint, scoped `just unit`, commit, rebase onto `origin/master`, push, record F2a in `docs/tasks/numerical-methods/07-batch-c.md` and the stream row.

## Next, in order

1. F2a repairs and acceptance (above).
2. F2b: route, catalog entry, registration, poster recipe and capture (pattern: quadrature 06 F2b brief `briefs/numerical-06-f2b.md`), with UI/a11y review and browser smoke; remove `euler` from `PENDING_ROUTE_KEYS`.
3. F3 lesson N5, F4 chapter section, F5 card, F6 gate (re-check 1920 zoom/pan frames on the real route per ADR 0037).

## Open risks

- Count tables (`guidedExamplePreviewCopy.test.ts`, `authoredChapterCoverage.test.ts`, `lessonCatalog.test.ts`, `Routes.test.tsx`, `demonstrations.test.ts`) conflict on rebases; recheck them.
- Heredocs halve `\`; edit LaTeX with the Edit tool. Workers may write cp1252 bytes (`×` as 0xD7): check new docs for valid UTF-8, and fix single lines, not whole files.
- Open deviation (owner): Fourier decay spectra stacked in the inspector, not side by side.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), launch the successor at 215k or right after closing out at the soft threshold, and pass this rule on. Workers `bezeg-worker` Sonnet `medium`, 135k watcher each; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Ports 4315 (preview/capture), 4320 (`just smoke-lesson`), 4330 (field perf harness).
