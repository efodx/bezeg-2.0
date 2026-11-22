# Brief: port the interaction fuzzer and its replay cases (task 01c, slices 1-2)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace`). Do not commit. Another worker ports the probe into `scripts/probe/` at the same time: do not touch it.

## Goal

A repository fuzzer that drives **master's current workspace** (inspector controls, not the prototype's pucks and cards) with random learner interactions and checks invariants I1 to I5, with seed replay, shrinking and the replay cases. Source: `docs/tasks/ux-picks-app-wide/01c-check-tooling.md` (slices 1-2, Acceptance first bullet) and `docs/specs/parameter-writes.md` (acceptance 4-5 and the F1-F3 failure descriptions; read those sections only).

## Reference (read-only; never edit)

`docs/reviews/ux-picks-app-wide/night-tooling/fuzz/` (`fuzz.cjs`, `inv.cjs`, `NOTES.md`, `RESULTS*.md`, `min-*.json`, `final/*.txt`). It ran against the prototype's DOM (pucks, cards); keep its invariant logic and generator ideas, replace every selector. For real-input Playwright on master's pilots, the handler's dev smoke `docs/reviews/ux-picks-app-wide/smoke/devcheck-01b.cjs` shows working selectors (sliders, nav buttons, Reset, Preset, lesson Next/Back, Slovenian names).

## Owned paths

`scripts/fuzz/` (new: `fuzz.cjs` CLI, `inv.cjs`, `cases/*.json`, `README.md`), `scripts/fuzz/*.test.cjs` if you add Node tests. Not the `justfile` and not `scripts/commands.cjs` (the handler wires `just fuzz` to `node scripts/fuzz/fuzz.cjs <args>`).

## Settled

- CLI: `node scripts/fuzz/fuzz.cjs --base <url> [--route <path>]... [--lesson <path>] [--seeds N | --seed S] [--steps K] [--replay <case.json>] [--repeat R] [--selftest] [--out <dir>]`. Default out `.command-logs/fuzz/`. Exit 1 on any invariant failure; one summary line per route (`route seeds passed/failed`), failure traces as JSON in out.
- Run against the **dev server** (strict: an untagged write throws `UntaggedWriteError`, which I4 reports as a page error). The handler's dev server is at `http://127.0.0.1:4482/bezeg-2.0/` (do not start or stop servers).
- Actions before pucks exist: inspector sliders (`role=slider`: pointer drag, keyboard arrows, typed entry where a number field exists), count spinbuttons, playback Play/Pause where present, board point drags, board pan (drag empty board, wheel), lesson Back/Next on a lesson route, Esc.
- Invariants, observed through each control's `aria-valuenow`/visible value (sampled per animation frame in the page) and page errors: I1 learner wins (after the learner's last change the value stays the learner's, 100-1000 ms window); I2 no A→B→A flicker within 300 ms (keep the sweep exemption); I3 Esc stills everything (no value changes 200 ms after Esc); I4 no page error or console error (no exception list); I5 untouched parameters stay (a parameter the step did not touch does not change, except one that is playing).
- The checker excludes typed decimals on integer-step parameters (a generator artefact; generate none).
- Shrinking: on failure, minimise the action list by deletion and save `min-<route>-<seed>.json` replayable with `--replay`.
- Replay cases in `scripts/fuzz/cases/`: F1 and F2 (from `min-*.json` where they map to master's controls; rewrite the action list for master's DOM and say in `cases/README` which prototype file each came from), F3 as full seeds (Taylor seed 2; Taylor lesson seed 8), and the waves case (`min-functions_waves-1.json`, two sweeps plus a card drag: map the card drag to a board drag; note the mapping). `--replay` runs each case `--repeat` times (default 5).
- Seeded stale write (acceptance): `--inject-stale` schedules, after a learner slider change, a delayed (`setTimeout` 150 ms) write of the slider's previous value through its DOM input; I1 must fail. Record the observed failure.

## Checks

- `node scripts/fuzz/fuzz.cjs --selftest` passes (the checker on synthetic series, including one I1, I2, I3 and I5 failure each).
- 5 seeds each on Taylor (`analysis/taylor`), transformations, De Casteljau, phase portrait, and the Taylor lesson: report pass/fail per route. A failure is a finding, not something to fix in app code: shrink it and report the case file; never change `src/`.
- `--inject-stale` on Taylor fails I1 (quote the line).
- `--replay` of every case with `--repeat 5`: report results (passing is not required; report them).
- `just lint` passes (scripts are linted).

Send independent reads in one message. Create files with Write, not heredocs; start commands from the working directory. Long runs: foreground with a long timeout, one run at a time (machine memory).

## Return (at most 400 words)

Files; per-route seed results; inject-stale output line; replay results per case; findings with case files; anything not ported and why. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/01c-fuzzer.md`.
