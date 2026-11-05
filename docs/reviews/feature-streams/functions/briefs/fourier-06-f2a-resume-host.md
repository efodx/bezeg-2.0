# Brief handoff-v12: Fourier series 06 F2a Part H resume

- **Role:** implementation and test worker; edit permission in `.claude/worktrees/stream-functions`. Do not commit, push, stash or delegate. Do **not** run `just build`, `just preview` or any smoke.
- **Goal:** finish Part H of [fourier-06-f2a.md](fourier-06-f2a.md) (read its Settled decisions and Part H). The previous worker's note is `docs/reviews/feature-streams/functions/worker-fourier-06-f2a-handoff.md`. The code exists, uncommitted, in the working tree. Model and kernel results stay unchanged.

## State measured by the handler (2026-11-05)

The previous note's "tsc clean" no longer holds. Reproduce these first:

- `npx tsc --noEmit --pretty false` fails: `EpicycleGraph.host.test.tsx` line 118 (`triggerEventHandlers` is not on `Point`) and line 399 (`epicycle-vertex-9-x` is not a parameter name; to test an out-of-range index without a cast, go through a path that takes an unchecked value, or drop that case and cover it in the model test, which already rejects `index`).
- `eslint`: unused `GraphPalette` at `EpicycleGraph.tsx:23`.
- `just unit src/graphs/functions/EpicycleGraph`: 5 of 14 fail.

## The five failures: find the cause before touching an assertion

1. **Disposal: `expected 33 to be 29`.** Treat this as a possible real leak. Find which four objects survive or are double counted, and show it. Change the test only if you can show the expectation was wrong; say so in your return.
2. **Keyboard step: `0.05228475` against `0.05228474983…`.** A value appears rounded to 8 decimals somewhere. The model forbids silent rounding, and a vertex delta must carry the exact \(\kappa\)-derived control offset. If the code rounds, fix the code. If the test's expected value is the wrong one, show why.
3. **Status: `'1,0001'` against `'1'`.** \(|c_1|=1.000126\) for `circle`, so the display of four decimals looks right and the expectation wrong. Confirm it.
4. **Two message regexes** (`/^Premik ni mogoč.*med −3 in 3/`, `/med −3 in 3.*popravi vrednost v datot…/`). Read the actual strings. The reason must state the range and what to do. If the text does, fix the regex; if it lacks them, fix the text in both catalogs.

## Handler decisions

- Visible handle labels and any user-facing index count from **1** ("Krajišče 1"). Lesson action names stay 0-based. Add a test.
- The `N` step buttons step by **1** (user story 6). Check that they do; the note reads "+-10".
- The keyboard path through named inspector number fields is accepted. They must step \(0{,}05\), Shift \(0{,}5\).
- Keep the 49-coordinate closed circle polygon.

## Then

- At least three mutations with an observed failure: for example drop the pause on an edit, make the circle count depend on \(N\), remove the cache identity check, drop the time reset on import.
- `just unit src/analysis src/graphs/functions src/localization src/learning` (this covers the `src/learning/model.ts` additions, unchecked so far), eslint on all touched files, final `npx tsc --noEmit --pretty false`, with logs to `C:/Users/1337Hacker/.claude/jobs/cb986187/tmp/fourier-f2a/`.
- Never weaken a test to pass it. Report only what you saw in the final run of each check, after your last edit.

## Return

At most 250 words: the cause of each of the five failures and whether code or test changed, the mutations, each check's final result with its log path, open questions. Budget: grep before reading, at most 150 lines per read. On `HANDOFF` or after about 25 turns, append to the worker note and return partial.
