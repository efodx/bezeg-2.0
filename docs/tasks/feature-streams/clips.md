# Stream: Clips
Run state: active

Owner of [lesson-guided catalog clips](../../specs/lesson-guided-catalog-clips.md): 67 Demonstrations have a poster but no hover clip. Rules: [feature streams](README.md). Port 4319. Handoffs: `docs/reviews/feature-streams/clips/`.

The family template does not apply. Read the spec's owner decisions first: they are the point of this stream.

## Queue

| Step | Work | Who | Review | Status |
| --- | --- | --- | --- | --- |
| 1 | Route probe: one script over the 67 example scenes records real controls, ranges and labels, and whether they work inside an example scene | Handler or `bezeg-worker` Sonnet | Handler | done |
| 2 | Capture path: row format, generic capture mode, jump check, missing-clip test with a pending list holding the 67, helpers and one worked example so workers need not read `scripts/demonstration-preview-motion.cjs`, and a single-ID test command. Prove it on one sweep, one drag and one surface Demonstration | `bezeg-worker` Sonnet | Engineering | done |
| 3 | Rows: batches of lessons, each worker reading its lessons and writing rows with quotes. Send algorithm Demonstrations with no obvious smooth control (`fortune`, `delaunay`, the monotone family and similar) to Sonnet | `bezeg-worker` Haiku `medium`, Sonnet for the hard ones | Handler spot check | in progress: rows start from the posters; preflight each row first, see [handoff 6](../../reviews/feature-streams/clips/handler-handoff-6.md) |
| 4 | Capture family by family, removing IDs from the pending list and pushing each accepted family. Recapture posters where the start scene differs | Handler or worker, one capture at a time | Generic checks, then Haiku visual review of contact sheets against each `lessonQuote`, Sonnet mathematical review per family | in progress: nine row clips captured from the posters (curve-offset, reduction, patch-coons, inscribed-angle, orientation, polygon-area, triangle-centres, euler-line, simson-line); triangle-centres drags 0.7 and euler-line 1 to stay under 300 KiB; plane geometry lacks only `inversion`. 2026-11-07 batch: 12 more (3 interpolation, 3 school functions, 3 B-splines, 3 analysis); 9 rows held with their capture failures in [held rows](../../reviews/feature-streams/clips/held-rows.md). Handler 5: 18 more, see [handoff 5](../../reviews/feature-streams/clips/handler-handoff-5.md). Handler 6: reviews of those 18, 7 compgeo trace clips (`trace-step`) and conic-focal (`offCamera`); 20 remain, see [handoff 6](../../reviews/feature-streams/clips/handler-handoff-6.md). Handler 7: fortune, voronoi, voronoi-degenerate (`restyle`), segment-intersections recaptured, ear-clipping poster-only; 17 remain, see [handoff 7](../../reviews/feature-streams/clips/handler-handoff-7.md) |
| 5 | Repair batch for review findings, and a final recheck | `bezeg-worker` Haiku or Sonnet by difficulty | Haiku recheck | pending |
| 6 | Acceptance: every spec criterion, docs, `just check`, catalog smoke at desktop and 390px, hosted CI after push | Handler | Handler | pending |

Step 1 replaces the spike the owner ruled out: it informs step 2 and stops nothing. Steps 3 and 4 may overlap once step 2 is pushed.

## Worker briefs

The [Haiku motion pilot](../../agent-workflow/evaluation-log.md) met explicit checks reliably and missed implied ones: wrong visible object, a weakened shared check, a code comment claiming a check that did not exist. It also used 130–200k tokens per one or two clips, and the Haiku `HANDOFF` is at 78k. So:

- Haiku gets two or three Demonstrations per worker, the kit from step 2, and every check stated outright. Name the file and section to read; it does not read the runner.
- Workers own rows and family files only. The runner, shared checks and generated maps stay with the handler or the step 2 worker, and no worker may loosen a shared check.
- Each new assertion is seen failing once.
- Verify review findings before acting on them; a Haiku reviewer has made an unverified claim before.

This departs from the routing card, which sends implementation to Sonnet. Treat it as a pilot: log tokens per clip and repair rate in the evaluation log. If a Haiku batch needs heavy repair, move that kind of Demonstration to Sonnet and carry on.

## Decisions

Handlers decide without asking the owner: record the choice with its reason and rejected alternative in the spec, and continue. The owner asks for a change later if a result is unwelcome. The README's other stop conditions still apply. Git and engineering rules in AGENTS.md are unchanged.

## Shared files

Capture is heavy: run it only while this stream's other workers are idle, one at a time. Regenerate the catalog manifest with its script after rebasing; never merge it by hand.

Controls and Contracts run beside this stream and change graphs and control labels. Before each family's capture, read [the Controls queue](controls.md) on `origin/master`; leave a family for later while Controls is sweeping it. Rows name controls by their current label, so a failed capture after a rebase usually means a renamed control: update the row. This stream changes no app code outside capture-only hooks, and any such hook goes in its own commit.
