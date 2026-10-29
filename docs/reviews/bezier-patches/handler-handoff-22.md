# Bézier patches Codex handoff 22 — 2026-10-29

Continue the same authorized objective: implement, independently review, verify, document, commit and publish tasks11–14 under AGENTS.md. Read this note first, then applicable AGENTS.md and docs/agent-workflow.md. Do not repeat accepted work. Task11 is complete; task12 prose and selected reading/browser checks pass, with task13 integration gaps below. Task13 has its first isolated helper, not finished examples/captures. Task14 remains.

## Checkout and publication

Work ONLY in `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\bezier-patches-r2`, branch `worktree-bezier-patches-r2`. Never use the primary checkout or its stale diff/debug.log. Scratch `.claude/scratch/` remains untracked and preserved.

New accepted commits: `cf5c31826f1e2fe556ab01e5a45a2e1e412027ff` (chapter inventory repair/browser acceptance evidence) and `fc15dbe237c010c6c1103c82bcc3f192641f9bee` (unintegrated surface evidence helper). Both are pushed to origin/master and origin/bezier-patches-wip. Fetch/rebase found master unchanged; no conflicts or rewritten commits. No live app source, poster, clip or capture manifest changed in these commits. Helper publication does not constitute publication of completed task13 media/features.

Exact predecessor source CI40840496778 at27330ef was checked: build, units, checks and three lesson smoke shards passed. Other-specs had119passes/one failure: tests/unified-learning.smoke.spec.cjs expected8 Learn chapter cards, actual9. Deployment skipped. This is recorded in [source CI](t12-source-ci.md); never describe that run as green. The stale test is now repaired. New exact-source CI [40862281154](https://github.com/efodx/bezeg-2.0/actions/runs/40862281154) atfc15dbe is in progress at closeout; confirm it rather than a later docs-only handoff run. GitHub connector `github.fetch` GET `/repos/efodx/bezeg-2.0/actions/runs?head_sha=<FULL_SHA>&per_page=3`, then `/actions/runs/<ID>/jobs` works. Parse `structuredContent.content`. `github.fetch_workflow_job_logs` takes `repo_full_name` and `job_id`; generic fetch rejects the logs endpoint. `gh` is absent.

## Accepted task12 browser work

See [chapter evidence](t12-codex-chapter-smoke.md) and [chapter record](chapter.md). Existing final prose source27330ef retains predecessor4802tests/239files, type/lint/build pass; no relevant source change invalidated it. The production runner accepted its existing build stamp4dd5f22 with dirty chapter changes subsequently committed27330ef.

The explicit nine-chapter inventory and ten existing unified-learning rows passed, including shared curve example return/focus. The new patch row initially failed a test-authoring expectation (English heading “Triangular Bézier patches”, actual reviewed source “Triangular patches”); handler corrected it and reran successfully. Final patch row checks all11 bilingual section IDs/headings/outcomes, prerequisite route text, loaded default-scene figure/alt/captions, desktop reading, both languages at390×844/200% root text, nonempty math evidence, math/page containment, sidebar/refresh/mobile contents focus and runtime errors. Logs09:17:19 (ten passes/one expectation failure),09:17:49 (patch pass),09:20:03 (both-language narrow patch pass); detailed filenames in smoke note. Focused lint passed09:21:03. These are DOM/layout/image-load checks; they do not establish visual poster quality, physical-device behavior or hosted deployment.

Concrete task12 gaps, to close through task13: no patch activity invoker renders. `src/learning/FamilyChapterPage.tsx` renders `kind: 'example'` content blocks; current patch sections only carry demonstrationIds/investigationPrompts without those blocks. The prerequisite chapter route is plain text, not clickable. Add actual authored examples/blocks and clickable prerequisite navigation, real-scene figures, then test patch-specific activity return scroll and invoker focus. Do not substitute existing curve-runtime evidence. Task12 remains partial until this integration.

## Task13 accepted first slice and next boundary

Use [t13-codex-implementation-boundaries.md](t13-codex-implementation-boundaries.md) for capture/content ownership; do not repeat exploration. New `scripts/guided-example-surface-evidence.cjs` reads real framing/WebGL and validates explicit owner identities, finite nonempty geometry and exact camera/coordinate expectations. Its test records are fixtures only. [Adapter contract/gap](t13-surface-evidence.md), [independent review/disposition](t13-surface-evidence-review.md).

Engineering reviewer found teapot's valid framing has `points: []`, which initial helper rejected. Worker observed the regression fail before repair, then handler inspected corrected guard and verified5Node tests, syntax and focused lint. Empty projected points require complete32 expected/rendered teapot owners; subsequent ID/kind/nonempty/finite/geometry/camera checks still apply. No new formula/evaluator/construction or UI changed in this isolated helper; independent engineering review was sufficient for this slice. Math/UI review remains required for actual forthcoming authored content/runtime/UI work.

The helper is NOT integrated into the capture runner. The app currently publishes `data-surface-framing` with camera and projected controls but no supported page-readable rendered-owner geometry record. Next bounded implementation: narrow read-only evidence producer sourced from authoritative SurfaceScene/renderer state, including logical teapot patch ownership through the merged mesh; do not count optional boundary polylines as mesh ownership. Then add the surface captureExample path beside JSXGraph, preserving served production bundle/source/build freshness and rejecting empty evidence. Inspect helper before selecting producer fields; keep shared producer/capture interface under one owner.

Remaining task13: all11 bilingual authored examples with exact fixtures/cameras/two complete frames; full concept coverage including variation bound counterexample, triangle comparison, join continuity and32-patch teapot; smoke rows; removal of temporary patches exclusions; catalog metadata/prompts; actual-scene reader/guided figures; all6motion clips and required posters/recipes. Generate actual captures from verified production builds with real nonempty owners before claiming publication acceptance. Never manufacture manifest evidence. Host-fit/reset and carried poster framing/labels remain mapped in t13 boundaries. Keep task11 runtime and task12 prose ownership explicit when an extension is necessary.

Then task14: full P1–P10 audit, old curve and patch routes, bilingual lessons/navigation/keyboard/touch/projection/emulated widths, current SVG/PNG/MathJax, presets/invalid imports, reset/camera/transient lifecycle, default+16density measurements and32-owner teapot stress. Update capabilities/architecture/UI/roadmap/domain glossary. Required independent reviews and full smoke checklist. Preserve prior limits in handoff19/task14. Physical-device/projector/classroom observations are optional, not emulated passes.

## Ownership, monitors and continuation

All workers completed; watcher completion events consumed. No worker-owned process remains. Handler preview4391/session41656 stopped with Ctrl+C; ports4391/4392 have no listeners. Runner82516 finished. No source writer/browser/preview is transferred. Working tree before this handoff: only preserved scratch untracked.

Worker settings requested: chapter smoke Luna/max; surface implementation/engineering review Luna/high; fresh contexts/handoff-v12; no worker delegation/Git. Chapter child's escalation stalled until handler interrupt/resume; handler ran browser checks. Initial watcher telemetry unavailable, later emitted HANDOFF135680 after worker had returned partial; relay consumed. Surface worker completion65157input, after repair72636; reviewer47443. Current-task evaluation records committed; do not load accumulated evaluation history for ordinary assignments.

Handler startup35234input,146564at publication boundary; closing near150k rather than starting another substantial slice. Read self monitor at startup/bounded phases, prepare handoff150k and escalation190k; not historical175k. Long external approval waits mean wall clock does not measure worker performance.

`list_projects` again found only primary Bezeg (`C:\Users\1337Hacker\Desktop\bezeg-2.0`) and two unrelated projects. No exact-worktree saved project exists, so no fresh local successor can be created under the owner rule. No primary-checkout successor/fork/background CLI substitute was launched. Use [paste-ready continuation prompt](handler22-continuation-prompt.md).

## Codex successor rule — owner authorization, carried forward in full

I explicitly authorize you and every successor to create fresh Codex successor chats solely to continue this same objective.

Follow docs/agent-workflow.md's Codex handler budget: self-check at startup and bounded phases, prepare handoff at150k input, escalation190k. Do not carry forward the historical175k Claude threshold.

At a context handoff:

1. Collect worker notes and record accepted progress, unfinished edits, checks/tested revision, process ownership, risks and exact next steps in a new numbered docs/reviews/bezier-patches/handler-handoff-<n>.md.
2. Commit and push the handoff note and completed verified work; preserve unfinished changes explicitly.
3. Use list_projects and create_thread to start a FRESH LOCAL Codex chat in this EXACT checkout. Verify the saved project path matches this worktree. Do not silently switch to the primary checkout, create another worktree, or fork accumulated history.
4. Give the successor the new note, original objective, remaining acceptance and this entire Codex successor rule. Confirm creation and report its thread ID/link, note path and handoff commit, then stop writing in the old chat.
5. If no matching saved project exists or fresh-chat creation is unavailable/fails, return the committed handoff and a paste-ready continuation prompt. Do not substitute a background Claude or Codex CLI process. Do not launch a successor when the objective is complete or an owner decision blocks continuation.


Closeout monitor:152,154input after handoff preparation; no new slice/worker launched at threshold. Exact sourceCI40862281154 still in progress at this sample (build/checks passed; remaining shards pending in previous job snapshot). All local owned processes stopped and worker notes collected. Successor must confirm the final source-run result before claiming deployment.
