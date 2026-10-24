# Continuous motion previews: implementation handoff

Source spec: [continuous-motion-previews](../../specs/continuous-motion-previews.md). Written 2026-10-17 by the orchestrating handler at a clean checkpoint, for the next handler.

> **Update 2026-10-18:** The owner reopened `ph-quintic` and `subdivision`; the [source spec](../../specs/continuous-motion-previews.md#reopened-clips-owner-decision-2026-10-18) records their implemented capture-only recipe/poster changes and verification (20 clips total). The shared player now uses [hover/focus activation](../../specs/hover-motion-previews.md). The previous completion decision below is historical.
>
> **Update 2026-10-17, Phase 3:** six Phase 3 clips shipped (see the spec's Phase 3 record). `rational-decasteljau` and `ph-quintic` were dropped after review, and the owner dropped `subdivision` (its poster shows the state after Subdivide) and kept `ph-quintic` dropped. The task is complete; the next steps below are historical.
>
> **Update 2026-10-17 02:35 (second handler):** Phase 1 findings 1–9 closed and Phase 1 pushed (cc924cd, c32a474, plus the smoke-test polling fix 8fd4ac8). Phase 2 (`weighted-parameterization`, `complex-multiplication`, `accumulation`) implemented, reviewed (math and visual), smoke-tested and recorded in the spec's Phase 2 record. The motion smoke failure listed below was not machine-specific; see the spec. **Next: owner review of Phases 1–2 at card size before Phase 3.** The sections below describe the state at the first handoff.

## Owner instruction for this run

The owner asked to implement the spec using **Haiku 5.5 `medium` workers as a pilot** in place of the routing table in [agent-workflow](../../agent-workflow.md) (all subagents, including reviewers, use Haiku 5.5 medium). Handlers hand off near 150k context at an easy step.

## State

Branch `worktree-continuous-motion-previews` (worktree `.claude/worktrees/continuous-motion-previews`), based on `origin/master` 96305dc. **Not pushed.** Commits:

| Commit | Content |
| --- | --- |
| 81c6ca6 | Recipe labels repaired for the redesigned controls (full generation was failing at `spline-g1` on master). All posters/clips regenerated; pixel differences are sub-pixel antialiasing (same Chromium 156.0.8078.4, PSNR ~50 dB). |
| ec8637d | `parameter-sweep` and `pointer-drag` modes (`motionSpecs` table in `scripts/demonstration-preview-motion.cjs`), Bézier as `pointer-drag`, `decasteljau` `t` sweep 0.5→1→0→0.5, CRF 28, 295,631 B. `PREVIEW_MOTION_IDS` non-publishing diagnostic. |
| 2221ee2 | Per-spec sweep schedules; `derivative` `Korak h` 1→0.05→1 on f(x)=x², x0=1, recipe window camera, CRF 22, 250,909 B. |
| be98ba3 | Spec-driven `captureDrag`; `farin` glider on edge p1–p2, v 1/3→0.75→1/3, exact restore through the weight number fields, amplitude 0.75 + CRF 14, 263,150 B. |

Phase 1 is implemented; **Phase 1 acceptance is not complete** (fixes below). Phase 2 is not started. Phase 3 waits for owner review (spec gate).

Facts established:
- Bézier reproducibility: 96/96 source PNG hashes, path hashes and decoded pixels are identical across the refactor. WebM bytes vary run to run (libvpx), so compare source-frame hashes/decoded pixels, never WebM bytes.
- Spec deviation settled: the `decasteljau` row says "whole-curve off", but the recipe/poster shows the whole curve on; the clip follows the recipe (spec requires recipe = poster state). Record this in the spec.
- Any change to the motion script changes the presentation fingerprint, so publishing always needs a **full** run (~2–3 min).

## Open findings (Phase 1 fix round, before push)

From the math review (Haiku, read-only):
1. **Derivative tangent through P is not asserted** (`demonstration-preview-motion.cjs` ~188-190): add `|slope·x0 + intercept − f(x0)| < 1e-9` plus a negative test (y = 2x must fail).
2. Derivative tangent lookup (~168) takes the first `dash === 2` object: select by identity or assert exactly one match.
3. Derivative function path hash is constant across frames: assert the snapshot actually contains the function path (`paths.length > 0`) so it cannot pass vacuously.
4. Farin: sort sliders by edge (not insertion order) (~225). The 1e-6 glider tolerance has only 6× margin over the measured 1.6e-7 — keep, but record.
5. Bézier tolerance 0.035 is inherited from the original; record as a known weakness (tightening requires re-verification).
6. `decasteljau` seam: also compare frame 0/95 PNG hashes like the other two; add a negative test for the final-point-on-curve check.

From the engineering/visual review (Haiku, read-only):
7. Bézier still uses a separate legacy offline check (~376-392) instead of `spec.check`: unify. Remove the unused `handle: 1` (~87), the `decasteljau` default argument in `sweepValue` (~27), and the hard-coded `i === 47` (~109; derive from the schedule midpoint). Remove duplicate comments (~573-576); assert the tab-reveal loop (~586) actually made the control visible.
8. **farin visual FAIL**: around frame 47, the `w₂ = 5.99` label is crossed by the moving edge and touched by the curve at card size. Fix within the spec's rules (annotation policy, smaller amplitude, or capture-only label placement if the existing presentation supports it; no runtime styling change). Measure the colliding frame range. Cosmetic: the peak shows 5.99 rather than 6.00 because the sin² peak falls between samples; making the peak land on a sample is optional.
9. AC8 docs not yet written: update `docs/capabilities.md`, `docs/current-architecture.md`, `docs/ui-functionality.md`, the base spec's scope paragraph and pilot list (point to this spec), and this spec's status, deviations (decasteljau whole-curve; per-clip CRF/amplitude reasons; Bézier re-verification evidence above).

Out of scope, noted only: `DecasteljauAnimationControls.tsx:34` renders `t = 0.50` with a decimal point in the Slovenian UI (runtime; report to owner, do not fix here).

## Verification so far

- `node --test scripts/demonstration-preview-capture.test.cjs`: 13/13 at be98ba3.
- `npx tsc --noEmit --pretty false`: pass. `just build`: pass at be98ba3 (clean).
- `just unit src/DemonstrationPreview.motion.test.tsx src/DemonstrationCollection.preview.test.tsx src/WelcomePage.test.tsx`: pass.
- `just smoke-built tests/demonstration-motion.smoke.spec.cjs --port 4191`: 7 pass, 1 fail ("visible previews loop automatically": Bézier `currentTime` only reaches ~1.4 s in 10 s). **Pre-existing on this machine**: also fails with the old six-clip map and with `--workers=1`. Confirm in CI after pushing; check whether the new clips need adding to that spec's `pilots` list (it hard-codes six IDs and a test titled "all six clips").
- Not done: `$smoke-tester` catalog check at desktop and 390 px (AC6), card-size review in the real catalog page.

## Next steps

1. One Haiku worker: fix findings 1-8, full run, confirm unchanged source-frame hashes for untouched clips, view farin frames at card size. Handler reviews and commits.
2. Docs (finding 9) — handler or worker. Update `tests/demonstration-motion.smoke.spec.cjs` for the new clip set if its six-ID assumptions apply.
3. Smoke with `.agents/skills/smoke-tester` (catalog desktop + 390 px), then fetch, rebase onto `origin/master`, push `HEAD:master` (AGENTS.md git rules), check CI with `just ci`.
4. Phase 2 (`weighted-parameterization` α sweep, `complex-multiplication` w drag around the unit circle, `accumulation` x drag with number-field restore), one worker per clip, serialized (shared motion script and published set), each with math invariants from the spec table. Then Phase 2 reviews, docs, push.
5. Stop for owner review before Phase 3.
6. Complete the [evaluation record](../../../.agents/skills/subagent-flow-evaluation/SKILL.md#do-log) for this pilot (data below).

## Environment

- Worktree has its own `npm ci` install (no junction; safe to remove the worktree).
- Production preview for captures: `just preview 3021` from the worktree (the previous handler's server may be gone; restart it, and rebuild with `just build` first if sources changed). Captures: `PREVIEW_BASE_URL=http://127.0.0.1:3021/bezeg-2.0 node scripts/capture-demonstration-previews.cjs`. ffmpeg/ffprobe are on PATH.
- Decoded-pixel compare: extract HEAD assets with `git archive -o .command-logs/old.tar HEAD src/images/demonstrations/catalog` and `tar -xf`, then decode each PNG with `ffmpeg -i f -f rawvideo -pix_fmt rgb24 -` and hash (a helper lives at `.command-logs/pixcmp.cjs <oldDir> <newDir> .png` in this worktree).
- The worktree guard rejects compound shell commands mixing git with loops/variables; run git commands plainly.

## Worker brief pattern (worked first time for W2–W4)

handoff-v6 fields; name the spec rows; say which file/function to build on (`motionSpecs`, `captureSweep`, `captureDrag`, `assertMotionEvidence`); list exact invariants with tolerances; give the fast diagnostic command (`PREVIEW_IDS=<id> PREVIEW_MOTION_IDS=<id>`) and the publishing full run; require unchanged source-frame hashes for existing clips, a frame review at 0/30/47/70/95, and a ≤300-word report with bulky evidence in `.command-logs/`. Forbid commits, pushes, rebuilds, stopping the server, runtime edits.

## Pilot evaluation data (Haiku 5.5 medium, brief handoff-v6)

| Worker | Role | Dispatched → returned | Tokens | Repairs | Outcome |
| --- | --- | --- | --- | --- | --- |
| W1 | recipe repair | 00:03 → 00:12 | ~91k | 0 | green; reviewed only 9/45 posters (handler pixel-checked all) |
| W2 | modes + decasteljau | 00:12 → 00:27 | ~210k | 0 | green; left sweep schedule as globals (fixed by W3) |
| W3 | derivative | 00:27 → 00:37 | ~151k | 0 | green; missed tangent-through-P invariant (math review) |
| W4 | farin | 00:37 → 00:54 | ~225k | 0 | green; label collision found by visual review |
| R1 | math review | 00:58 → 01:01 | ~110k | – | 6 findings, 1 substantive |
| R2 | eng/visual review | 00:58 → 01:01 | ~124k | – | 9 findings, 1 visual fail |

Times are 2026-10-17 local. Handler slip: W4 was dispatched about a minute before W3's commit landed (a refused compound command); W3 was committed before W4 edited anything.
