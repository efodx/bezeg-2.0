# Learn UI stream: handler handoff 7

Date: 2026-11-01. Handler 5 stops because Claude Code reaped its background commands for low system memory (`just check`, the 4387 capture preview and the self watcher). Read [handoff 6](handler-handoff-6.md) for earlier context. Source: [spec](../../../specs/guided-example-highlights.md), [tasks](../../../tasks/guided-example-highlights/README.md), [stream record](../../../tasks/feature-streams/learn-ui.md#3-guided-example-highlights).

## State

- Branch `worktree-stream-learn-ui`, **rebased onto `origin/master` 24b8c862** (clean, no conflicts). Because the rebase rewrote the branch, it is pushed to the new remote branch `origin/worktree-stream-learn-ui-rebased`; the old `origin/worktree-stream-learn-ui` holds the pre-rebase history and is stale. Not on `master` yet.
- Task 01 **accepted** (stream record and task file updated): Sonnet engineering and mathematical reviews found nothing blocking. Repairs `049969b8`-equivalent (per-entry inventory fingerprints for `--id`, `expectChange: false` enforced, literal S1 pin, D10 note wording); per-example highlight copy `guidedExampleHighlightCopy.ts` with S1–S3 SL/EN captions (handler reworded three strings); full recapture (56 PNGs byte-identical, manifest gains per-entry fingerprints); S1–S3 cards browser-checked at 1440 in SL and after a live switch to EN. Hashes changed in the rebase: see `git log origin/master..HEAD`.

## Checks on the rebased HEAD

Passed: `npx tsc --noEmit --pretty false`; `node --test scripts/*guided-example*.test.cjs scripts/ph-offset-singularity.test.cjs` (57/57); `node scripts/generate-guided-example-inventory.cjs` reproduces the committed inventory (only line endings differ), so master's A9b/A10 changes did not change scene fingerprints. Before the rebase: `just unit src/learning` (copy worker), lint, build.

Not run on the rebased HEAD: `just check` (killed after waiting 406 s for the test slot held by the platform stream's check). The manifest's build provenance predates the rebase; that only blocks `--id` partial runs, and batches recapture in full anyway.

## Update (handler 5, after the owner said continue)

- `just check` **passed on `940e9531`** (588 s; typecheck, lint, all unit tests, build), based on `origin/master` 24b8c862.
- `origin/master` then moved 31 commits (geometry stream, compgeo family registration). The branch was rebased again, cleanly, onto `dc899f60`; the regenerated inventory is unchanged. `just check` on that rebase was killed for low memory again, so it is unverified on the new base. That HEAD is pushed to `origin/worktree-stream-learn-ui-rebased-2` (the `-rebased` branch is now stale too).
- Handler 5 reached its 150k soft context threshold: the successor starts fresh from this note.
- **First step for the successor:** `git fetch`; if `origin/master` moved, rebase again; run `just check`; if green, `git push origin HEAD:master`. Then step 2 below.

## Next

1. Once memory allows: `just check` on this HEAD. If green, push to `master` as a fast-forward (`git fetch`, rebase again if `origin/master` moved, recheck, `git push origin HEAD:master`), then delete nothing remote without asking.
2. Batch 03a: chapter `bezier-curves` (12 cards, no section figures; audit rows `highlight-audit.md` §2 "bezier-curves"). Recipes in `guidedExampleHighlights.ts`, expectations in `guidedExampleHighlightExpectations.ts`, copy in `guidedExampleHighlightCopy.ts`, full recapture. Three activity cards (`convex-hull`, `quartic-interpolation`, `decasteljau-parameter`) have no lesson frames; the runner reaches frames through lesson navigation, so the worker must report whether `decasteljau-parameter` at t = 1/4 is expressible rather than invent steps.
3. Then 03b (foundations, rational, splines), 04a (PH, parametrization; quintic singularity card waits for the owner's D10 answer), 04b (functions, analysis), 06 (patches; the runner first needs highlight support on surface boards). Run serially in this worktree: they share the recipe registry, copy map, `familyChapters.ts` and the manifest. Keep each brief to about 20 worker turns.
4. Section 1 F6 `just check` is satisfied by step 1.

## Notes

- Partial `--id` capture runs also require unchanged build fingerprints, so any batch that edits `src` must run the full capture (about 56 entries, a few minutes) after `just build` and `just preview 4387`.
- Card copy for a `highlight` recipe must come from `guidedExampleHighlightCopy.ts`; the test fails on a missing or orphan entry. Card alt/caption is plain text (no KaTeX).
- Open owner decision unchanged: D10 quintic card d = −2.5 (see handoff 6).
- `do-log` records for handlers 3–5 still unwritten.

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; capture preview on 4387; smoke `bezeg-smoke` with `SMOKE_PORT=4312`.
