# Functions stream: final note (handler 40)

Handler 40 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-05. The supervisor started it because the stream was `active` with no live session. It found no work left, set `Run state: complete` and launched no successor.

## Outcome

All four families are released, and every batch in their specs is accepted:

| Family | Batches | Last acceptance |
| --- | --- | --- |
| Numerical methods | A, B, C (N1–N5) | CI run 41644682121 |
| Function graphs for the matura | A, B, C (S1–S6) | CI run 41935910406 |
| Projective geometry of conics | A, B (K1–K5) | 2026-11-03, 07i F6 |
| Fourier series | A, B, C (F1–F5) | CI run 42056227787 |

## Checked before closing

- Each spec's release-batch table against its task README: no batch without a task, and no task unaccepted.
- No unchecked `- [ ]` item in the four task folders.
- Hosted CI on `master`: the last six runs are green, through `28cf77a3`.
- Messages to Functions in other stream files: the `fourier-coefficients` and `rational-function` poster notes from Geometry were repaired in `da824fdc`, and Maps fixed the transient-state keys itself. The `epicycles` poster is Curves' Romb recipe, with the F5 card added. A further recapture is optional.

This run changed documentation only, so it ran no unit, smoke or `just check` commands. Three task README rows still read `planned` and one stopped at F2b, although the stream file records them accepted. They now match the stream file.

## For the owner

- **Classroom device:** ADR 0040's F6 re-check of epicycles did not run because the device was not available, so sustained 60 Hz pointer input is unmeasured. If it misses the drag threshold in force (p95 50,1 ms, no frame over 100 ms), ADR 0040 says to stop and take it to the owner. This is the only ADR check left open.
- **Unobserved in a browser:** "start playback, then change step" in the epicycles lesson (playback is locked in `content` mode, so only a unit test covers it), and that "Opazuj na grafu" unlocks playback, which was read from the code. The 390 px lesson text was not read closely.
- **Lesson layout:** at step 1 frame 1 of the epicycles lesson, the lesson card covers the whole unit circle at 1920. This is the shared layout, and the card can be hidden or dragged.
- **Another stream's failure:** `scripts/demonstration-preview-motion-runner.test.cjs` fails on `patch-coons`, a surface demonstration with no surface motion entry. No `just` or package script runs that file.

## Known nits, not scheduled

- The Reset host test does not fail on the unfixed code.
- `NumberInput` rounds plain-arrow steps to 9 decimals.
- `EpicycleGraph.unmount` clears `hostListeners`.
- S5's explore-scene nit and S6's small-screen notes (handoffs 37 and 38).
- `docs/tasks/fourier-series/06-batch-c.md` step 2 has a mangled `\(k\ne0\)`.

## Restarting

The supervisor does not relaunch a `complete` stream. For new Functions work, the owner sets line 2 of `docs/tasks/feature-streams/functions.md` to `active`, adds the work to that file, and starts a handler from this note.
