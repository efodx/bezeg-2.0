# Gate timings, partial record (2026-11-07 to 2026-11-09)

Partial record for the spec follow-up "record gate timings for a week against the 2026-11-07 baseline". The week is incomplete: data runs through 2026-11-09 (about 05:40 local) and this file is to be extended, not treated as the result.

## Method

`.command-logs/gt.cjs` and `gt2.cjs` (scratch, not committed) read every timestamped `<ISO>-publish-<pid>-<id>.log` and background `publish-<sha>-<id>.log` in the main checkout and all worktrees: 75 logs in 32 `.command-logs` directories. Start is the UTC time in the file name (birth time for background logs), end is the file's last-modified time, wall is their difference. Outcome comes from the traced `git push` output (`->  master` is pushed, a rejection text is a push race), from the `check-changed ... failed` lines, and, where a hand-named tee'd copy (`h-publish-3.log` and the like, matched by its `Log:` line) exists, from its `Failed at:` stage; the tee'd copies are used only for that and never counted as separate runs. A published slice is the consecutive attempts in one checkout up to the next successful push; its gate wall is the sum of its attempts' walls, so reruns are included. Attempts under 2 minutes that did not push (dirty checkout, bad arguments, cancelled at once) are excluded (18). Days are local time (UTC+1). Landmark: phase 1 items 1-2 (delta retry plus publish lock) and item 3 (slot holding) landed 2026-11-08 15:19 +01:00 (`05b9fa0e`, `e755621a`); a slice is "after" if its first attempt started after that.

## Headline

| | Slices | Median wall, all (min) | Full slices (>= 5 min) | Median / max wall, full (min) | Attempts per full slice, mean | Slices with a rerun |
|---|---|---|---|---|---|---|
| Before | 19 | 17.2 | 11 | 38.7 / 112.5 | 2.36 | 6 of 19 |
| After | 16 | 3.3 | 5 | 18.9 / 48.7 | 1.20 | 1 of 16 |

The all-slice medians mix docs-only slices (about 0.1 to 4 min) with full-check slices, so the full-slice columns are the comparable ones. Before the landing, 11 push races in published slices each cost a complete rerun (17 to 34 min). After it, no push race appears in the logs. The single slice that needed a second attempt was a verify failure (19.7 min, then a 21.0 min pass), not a race. One 48.7 min slice (agent worktree, 2026-11-09) ran two full `check-changed` passes (1155 s and 1700 s) inside one log with a third fetch; this looks like an in-gate retry that was a full run, not a delta.

## Per day

| Day | Published slices | Gate wall per slice incl. reruns, median / max (min) | Attempts per slice, median / mean | Slices needing a rerun | Failed attempts by stage |
|---|---|---|---|---|---|
| 2026-11-07 | 9 | 3.9 / 112.5 | 1 / 2.11 | 4 | aborted 2, push race 7, recheck 1 |
| 2026-11-08 | 18 | 9.6 / 66.1 | 1 / 1.33 | 3 | push race 4, aborted 1, verify 1 |
| 2026-11-09 | 8 | 3.4 / 48.7 | 1 / 1.00 | 0 | none |


## Per published slice

| Pushed (local) | Checkout | Attempts | Gate wall (min) | Outcomes |
|---|---|---|---|---|
| 11-07 02:22 | queue-leftovers | 1 | 3.9 | pushed 3.9 |
| 11-07 02:33 | clips-stream-setup | 1 | 0.1 | pushed 0.1 |
| 11-07 08:51 | stream-clips | 1 | 1.1 | pushed 1.1 |
| 11-07 10:00 | stream-clips | 1 | 1.7 | pushed 1.7 |
| 11-07 11:30 | stream-controls | 3 | 84.0 | push race 27.3; push race 24.0; pushed 32.8 |
| 11-07 12:34 | stream-clips | 3 | 98.8 | aborted 33.3; push race 24.2; pushed 41.3 |
| 11-07 12:35 | stream-clips | 1 | 0.1 | pushed 0.1 |
| 11-07 15:52 | stream-controls | 5 | 112.5 | push race 24.2; aborted 23.2; push race 25.1; push race 18.7; pushed 21.3 |
| 11-07 22:41 | stream-controls | 3 | 63.7 | recheck 29.8; push race 33.8; pushed 0.1 |
| 11-08 01:31 | stream-controls | 1 | 17.2 | pushed 17.2 |
| 11-08 01:47 | stream-collision | 3 | 38.7 | aborted 16.7; push race 20.5; pushed 1.5 |
| 11-08 03:10 | stream-controls | 1 | 18.1 | pushed 18.1 |
| 11-08 04:08 | stream-controls | 1 | 1.7 | pushed 1.7 |
| 11-08 05:14 | stream-collision | 1 | 20.9 | pushed 20.9 |
| 11-08 06:46 | stream-controls | 1 | 19.8 | pushed 19.8 |
| 11-08 07:37 | stream-collision | 1 | 2.0 | pushed 2.0 |
| 11-08 11:26 | stream-controls | 4 | 66.1 | push race 18.2; push race 17.1; push race 17.2; pushed 13.6 |
| 11-08 12:28 | stream-controls | 1 | 13.9 | pushed 13.9 |
| 11-08 14:05 | verification-throughput-plan | 1 | 0.1 | pushed 0.1 |
| 11-08 15:45 | verification-throughput-plan | 1 | 0.2 | pushed 0.2 |
| 11-08 16:50 | verification-throughput-2 | 1 | 3.3 | pushed 3.3 |
| 11-08 19:00 | verification-throughput-2 | 2 | 40.8 | verify 19.7; pushed 21.0 |
| 11-08 19:07 | verification-throughput-2 | 1 | 0.1 | pushed 0.1 |
| 11-08 20:18 | verification-throughput-2 | 1 | 5.2 | pushed 5.2 |
| 11-08 20:39 | verification-throughput-2 | 1 | 0.1 | pushed 0.1 |
| 11-08 22:19 | verification-throughput-2 | 1 | 18.9 | pushed 18.9 |
| 11-08 22:56 | verification-throughput-2 | 1 | 3.3 | pushed 3.3 |
| 11-09 01:40 | verification-throughput-2 | 1 | 17.9 | pushed 17.9 |
| 11-09 02:17 | agent-a18d8a9709fec93af | 1 | 48.7 | pushed 48.7 |
| 11-09 02:28 | agent-a18d8a9709fec93af | 1 | 0.1 | pushed 0.1 |
| 11-09 02:31 | verification-throughput-2 | 1 | 3.4 | pushed 3.4 |
| 11-09 02:32 | verification-throughput-2 | 1 | 0.1 | pushed 0.1 |
| 11-09 04:35 | bg | 1 | 3.5 | pushed 3.5 |
| 11-09 05:03 | bg | 1 | 3.9 | pushed 3.9 |
| 11-09 05:33 | bg | 1 | 0.1 | pushed 0.1 |

Excluded as not a gate attempt (under 2 min and not pushed: early refusals such as dirty checkout, bad arguments, or cancelled before checks): 18. Unfinished runs of failed or rejected attempts with no later push in the logs: stream-clips (4), stream-contracts (2).
## Caveats

- Lock and slot waiting is not logged by `publish-gate.cjs` (the lock wait is silent; test-slot waits are not in the publish trace), so wait time cannot be separated from running time. Wall includes both.
- Delta-path use is not marked in the publish logs, only in the tee'd stdout summary when one was kept; delta passes are therefore visible only as short second `check-changed` runs. After-landing logs show 2 fetches per run (the extra one is the final confirm or retry fetch), so a fetch count does not identify a retry.
- Wall is last-modified time minus the file-name time. Logs of the same run written after the gate ended (a later append) would overstate it; not seen, not checked.
- Slice grouping is by checkout and order, not by commit identity: a rebase changes the shas, and nested worktrees reuse checkouts. Two groups may be wrong: `stream-clips` (4 attempts: recheck, three push races, about 62 min) and `stream-contracts` (2 push races, about 65 min) have no later push in the logs and were presumably published by a manual rebase and push; they are excluded from the slice statistics, which makes the before group look slightly better than it was.
- Background-gate logs (`publish-<sha>-<id>.log`) carry no checkout name; they are three slices, all after the landing, all short.
- Logs deleted or never kept are missing; the hand-named logs are partial copies of stdout. Sample is small (35 slices, 16 full), mostly from three checkouts, so medians are indicative. Load on the machine differs between periods and is not controlled for.
- Not done: no per-stage breakdown, no CI/Pages timings, no data after 2026-11-09 05:40.
