# Background publication from a dedicated worktree

Status: accepted, 2026-11-09 (verification-throughput handler 4, under the owner's standing rule that handlers decide and record). Source: [verification throughput, phase 1 item 4](../specs/verification-throughput.md#phase-1-stop-losing-the-publication-race-largest-stream-gain-script-only). Amends [fail-fast publication gate](../specs/fail-fast-publication-gate.md), which says the gate does not choose a worktree.

`just publish --background` runs the existing gate in a detached publish worktree that the gate creates for the declared commits, and returns at once. The handler continues the next slice in its own checkout while the gate fetches, rebases, verifies and pushes.

## Context

A `runtime` gate takes about 16–50 minutes on a loaded machine (2026-11-07 baseline), and the handler waits for all of it, because the gate requires a clean checkout whose candidate does not change during verification. Phases 1–3 made the gate cheaper, and the delta path made its retries cheaper. The remaining cost is that the stream does nothing while the gate runs. Worktrees in this repository already junction `node_modules` to the main checkout, so a further checkout costs a `git worktree add` and no install.

## Decision

- `--background` takes the same `--recipe`, `--base` and `--commits` arguments. The handler's checkout must still hold the declared commits, but it no longer needs to stay clean or unchanged after the command returns.
- The gate creates `.claude/worktrees/publish-<short sha>-<random>` with `git worktree add --detach` at the last declared commit and junctions its `node_modules` to the main checkout's. It spawns the ordinary foreground gate there, detached, with the same arguments, and prints the worktree path, the log path and a result-file path (`.command-logs/publish-<id>.json` in the handler's checkout).
- The foreground gate is unchanged: clean checkout, fetch, rebase onto `origin/master`, delta or full checks, the machine-wide publish lock, fast-forward push. Its rebase moves the publish worktree's detached `HEAD` only, never the handler's branch.
- On exit the background run writes the result file (`ok`, failed stage, pushed revision, log path) and removes its worktree on success. On failure it keeps the worktree for diagnosis, and a stale one is removed by the next background run after 24 hours.
- `just publish --status` prints the latest result files. The handler checks the result before it reports a slice published, and before it starts a background publish that depends on an earlier one.
- At most one background publish per handler checkout is pending at a time. The second refuses while the first's result file is missing, because its commits would otherwise race to the same lock with an older base.
- After a successful background push, the handler's branch still holds the pre-rebase commits. Its next `just publish` rebases its new commits only, so the already-published patches drop out as duplicates.

## Alternatives

- **Keep the foreground gate** (status quo). Simplest and fully observed, but the stream idles for the whole gate. That idle time is the largest remaining stream cost after phases 1–3.
- **Background gate in the handler's own checkout.** It needs no worktree, but the handler's next edits would change the files under verification. The gate already refuses that, and it must, so this does not work.
- **Push to a staging branch and let hosted CI fast-forward master.** The handler would never wait, but the spec rejects it: it breaks the fail-fast contract, because unverified work leaves the machine and red is found minutes later.
- **A shared, permanent publish worktree.** It saves one `git worktree add` per publish (a few seconds), but concurrent handlers would need to queue on it, and a failed gate's state would block the next one.

## Consequences

- The handler must check a background result before it calls a slice published or pushes dependent work. A failure arrives late, so the handler may already have built on the failing commits. Repair is the usual new commit on top, published again.
- A background gate and the handler's own focused checks compete for the machine's two test slots. The slot and run-claim scripts already arbitrate that. The gate's run claim belongs to the publish worktree, not the handler's checkout.
- Failed publish worktrees accumulate until cleanup. They are under `.claude/worktrees/`, which is ignored.
- The publication spec's "the gate does not choose a worktree" now holds for the foreground gate only.
