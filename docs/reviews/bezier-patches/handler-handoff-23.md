# Bézier patches Codex handoff 23 — 2026-10-29

Continue the same authorized objective: finish, independently review, verify, document, commit and publish tasks11–14 under AGENTS.md. Read this note FIRST, then applicable AGENTS.md and docs/agent-workflow.md. Do not repeat accepted work. Task11 is complete. Task12 prose/reading checks pass; clickable prerequisites, actual activity figures and patch return/focus remain task13 integration. Task13 has verified evidence tooling, but no authored examples/media. Task14 remains.

## Checkout and Git

Work ONLY in `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\bezier-patches-r2`, expected branch `worktree-bezier-patches-r2`. Preserve untracked `.claude/scratch/` and primary checkout stale diff/debug.log. No primary source checkout was used.

New commits, pushed fast-forward to both origin/master and origin/bezier-patches-wip:

- `cbe00ee` — rendered mesh-owner evidence producer.
- `be5ad2e` — surface capture reader/runner and reviewed repair, documentation/evaluation.
- `0f72761abfeedbc3dd20c7a8b519a9cba10a6744` — exact predecessor CI record and smoke-note whitespace normalization.

Fetch found master unchanged at9983277; rebasing only these new commits found no conflicts or changes. An initial rebase refused the handler's unstaged CI note; its task-owned stash was subsequently restored and dropped. No unrelated work was stashed. A committed trailing blank line was fixed in0f72761 without amending history. Only scratch was untracked before this handoff.

## Exact source CI

Required predecessor [CI40862281154](https://github.com/efodx/bezeg-2.0/actions/runs/40862281154), exact sourcefc15dbe237c010c6c1103c82bcc3f192641f9bee, completed **successfully**, including all unit/check/build/Chromium shards, aggregate smoke and deploy. Confirmed through GitHub connector, recorded in [t12-source-ci.md](t12-source-ci.md). Earlier CI40840496778 at27330ef remains failed with deployment skipped; do not rewrite that history.

New exact source [CI40904168769](https://github.com/efodx/bezeg-2.0/actions/runs/40904168769), source0f72761abfeedbc3dd20c7a8b519a9cba10a6744, was in progress at16:41:55 local. This push includes both source commits; verify this run, not a subsequent documentation-only handoff run. No new deployment success is claimed. GitHub `github.fetch` GET approved API run/jobs paths works; parse `structuredContent.content` and print compact fields. `gh` is absent.

## Accepted bounded task13 work

Use [implementation boundaries](t13-codex-implementation-boundaries.md) and updated [surface evidence seam](t13-surface-evidence.md).

Producer: `SurfaceScene.meshOwners` gives explicit logical face ranges for tensor, triangular, two join owners and all32 teapot patches through the merged mesh. `ThreeSurfaceView` publishes `data-rendered-surface-owners` only after render, with xyz samples from actual uploaded Float32 mesh triangle vertices (first vertex of first/middle/last drawable triangles). Boundary polylines never prove owners. Cached against BufferGeometry plus owner signature to avoid rescanning during camera orbit. Clears before reconcile validation, hidden/empty ownership, render failure, context loss and disposal. See [worker note](t13-producer-worker-handoff.md) and [engineering review](t13-producer-review.md). No formula/evaluator/construction/drawing coordinates changed; handler used engineering review, not a separate mathematical review for this evidence-only slice.

Runner: `readPublishedSurfaceEvidence` consumes the real owner attribute. The surface branch of `capture-guided-example-previews.cjs` requires independent authored `entry.expected.surface` camera/owner samples, verifies first frame and250ms stability, hides overlay, resizes host only, checks camera/geometry again, validates ordinary projected points and visible label bounds, and preserves actual sample/framing/WebGL evidence for retained/published checks. Presentation fingerprint includes resize/reader helpers. JSXGraph path and served-build provenance checks remain. [Worker/repair note](t13-runner-worker-handoff.md), [independent re-review](t13-runner-review.md).

Three review findings repaired: missing crop rejection, missing resize fingerprint, and omitted observed samples/retained evidence validation. Handler reran final24Node tests. Safe incompleteness remains: point-free scenes (teapot and default subdivision) **reject capture** until projected mesh-bounds evidence exists. Three owner samples alone cannot prove crop bounds. Empty visible-label arrays are valid when labels are absent; future authored figures must specify required labels and visually review them. No direct end-to-end capture test or actual authored surface capture exists. Do not treat fixture tests as capture-manifest evidence.

## Checks and live processes

- Handler focused five producer suites passed (worker129tests); producer source-suppression/teapot-metadata mutations observed failures.
- Handler24Node capture-tool tests passed; negative fixtures cover malformed/empty owners, geometry/camera, crop, stored evidence/provenance and dimensions/fingerprints. Runner source-removal mutation evidence was not separately collected; real capture is unverified.
- `just check` passed on9983277 with the source edits later committed above: **4803tests/239files**, typecheck, lint, production rebuild. Logs `.command-logs/2026-10-29T15-35-50-591Z-20068-adfe09f8.log` and build `2026-10-29T15-39-00-425Z-20068-6c3e0c81.log`; warnings recorded in build log. No application changes occurred after those checks.
- [Producer production smoke](t13-producer-smoke.md): six routes, finite mesh owner samples,32-owner teapot with boundaries hidden, shading clear/restore, parameter/orbit, geometry Reset, language, narrow keyboard, legacy point drag/slider passed. Repeated tensor→triangular→tensor SPA navigation twice passed a focused follow-up; single canvas/current owners and working control after return. This verifies publication/lifecycle, not the capture runner or visual media quality.
- All workers complete, watcher completion events consumed. Handler production preview4391/session34162 was stopped with Ctrl+C. Unit/check process36582 completed0. No browser/source writer/preview ownership transfers. Scratch is preserved. Full task14 smoke/performance/export evidence remains outstanding.

## Exact next steps

1. Confirm new exact-source CI40904168769 and its deploy outcome. Inspect current Git/later evidence before work.
2. Finish the capture framing seam with a bounded read-only producer extension proving mesh crop bounds from actual rendered geometry (including point-free teapot/subdivision), then wire runner/retained validation and meaningful negative checks. Keep producer/capture interface under one owner; use cached geometry bounds and avoid per-orbit triangle scanning. Do not substitute optional lines or sampled owner points as full mesh bounds. Revalidate against a fresh production build.
3. Author all11 examples with exact fixtures/cameras, two complete bilingual frames, section ownership and links, synchronous scenes/restoration tests, required mathematical/engineering/UI reviews. Registry currently routes multiple `lesson.<chapter>.<section>.<demo>` identities to one per-demo lesson; give sections their actual authored scenes rather than reusing a default lesson. `getChapterGuidedExamples` currently derives retained homes and has no patch cards. Preserve established curve examples. See task13 boundary's concept map, including variation counterexample, triangle comparison, join continuity and32-patch teapot. Add clickable prerequisite, actual example blocks/figures and patch-specific return scroll/invoker focus. Remove temporary patch exclusions only with real coverage.
4. Add catalog metadata/prompts, independently derived expected geometry inventory, actual guided/reader images and six motion clips/posters/recipes. Retain source/build/served-byte provenance and real nonempty owners. Check host-fit/reset and carried triangular poster framing. Never manufacture a manifest, infer expected from live DOM or claim feature/media publication without required captures.
5. Finish task14 P1–P10 acceptance ledger/full checks and smoke, old/new routes, bilingual/keyboard/touch/projection emulation, exports with MathJax, presets/invalid imports, reset/camera/transient lifecycle, default+16-density measurements and32-owner stress. Update capabilities/architecture/UI/roadmap/domain glossary. Physical-device/projector/classroom observations remain optional and must not be claimed.

## Budget and successor

Handler startup34375input; bounded checks at148956 before closeout and150469 after commits; last closeout sample156234, below190k escalation. No new slice launched after150k. Worker terminal input samples: producer108744, producer-review70539, runner116170, runner-review101818, smoke123474. Requested Luna/high implementations/reviews and Luna/max smoke; handoff-v12, no worker delegation/Git. Evaluation record appended from current evidence only.

`list_projects` again returned only primary Bezeg (`C:\Users\1337Hacker\Desktop\bezeg-2.0`) and two unrelated projects. No saved project matches this exact worktree. No successor was launched in the primary project, forked history, another worktree or a background CLI. Use [paste-ready prompt](handler23-continuation-prompt.md). The required full owner authorization follows.

## Codex successor rule — owner authorization, carried forward in full

I explicitly authorize you and every successor to create fresh Codex successor chats solely to continue this same objective.

Follow docs/agent-workflow.md's Codex handler budget: self-check at startup and bounded phases, prepare handoff at150k input, escalation190k. Do not carry forward the historical175k Claude threshold.

At a context handoff:

1. Collect worker notes and record accepted progress, unfinished edits, checks/tested revision, process ownership, risks and exact next steps in a new numbered docs/reviews/bezier-patches/handler-handoff-<n>.md.
2. Commit and push the handoff note and completed verified work; preserve unfinished changes explicitly.
3. Use list_projects and create_thread to start a FRESH LOCAL Codex chat in this EXACT checkout. Verify the saved project path matches this worktree. Do not silently switch to the primary checkout, create another worktree, or fork accumulated history.
4. Give the successor the new note, original objective, remaining acceptance and this entire Codex successor rule. Confirm creation and report its thread ID/link, note path and handoff commit, then stop writing in the old chat.
5. If no matching saved project exists or fresh-chat creation is unavailable/fails, return the committed handoff and a paste-ready continuation prompt. Do not substitute a background Claude or Codex CLI process. Do not launch a successor when the objective is complete or an owner decision blocks continuation.
