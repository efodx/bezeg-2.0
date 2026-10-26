# Learn improvements — handler successor 2

## Objective and authorization

Continue the owner's request to execute every task in the local `docs/tasks/learn-improvements/README.md` in order, with fresh successor chats at context boundaries. Owner is away and explicitly delegated remaining decisions. No optional approval gates. Follow AGENTS.md. Prior handoff: `handler-handoff-1.md`; current canonical acceptance: `docs/specs/learn-improvements.md`.

This handler is stopping at the capture implementation boundary near its 150k request-input budget (latest observed 144665 before closeout). A capture worker crossed its 135k signal and received HANDOFF; it finished its consistent implementation and note. No concurrent handler or worker will continue writing.

## Checkout and Git

- Primary checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, branch `master`, saved project `6466c495-4851-4845-83b4-a5801d449d35` (path verified with list_projects).
- Accepted and pushed application commit `007c286 feat: refine shared chapter reading and navigation`, atop prior `3c96183`. GitHub Browser smoke succeeded: https://github.com/efodx/bezeg-2.0/actions/runs/40247627973 . A documentation-only handoff commit follows; inspect actual HEAD.
- **Keep `docs/tasks/learn-improvements/README.md` untracked/local-only. Do not stage/push it.** Backup branch `codex/learn-improvements-local-plan` preserves original local plan commit `9727d37` excluded from master.
- Task4 is uncommitted and not accepted. Preserve these owned dirty paths: `docs/commands.md`; `src/learning/ChapterPage.tsx`, `ChapterPage.css`, `ChapterPage.test.tsx`; new `scripts/capture-chapter-figures.cjs`; new `src/images/learning/bezier/` (six PNGs, manifest); new `docs/reviews/learn-improvements/captures-worker.md`. Section4 acceptance in the spec is committed with this handoff. No unrelated changes known.

## Accepted work

Tasks1–2 were accepted by previous handler: audit and Learn landing (see handoff1).

Task3 shared reader is accepted/pushed. Shared `ChapterNavigation.tsx` gives both readers live section tracking without history mutation, native bounded mobile contents with close/heading focus, and translated ordered previous/next chapters. Reduced heading/intro sizing, 70ch body measure and internal formula overflow. Preserved existing Bézier activity return/language-reading-position logic. Removed redundant category eyebrow after visual review. Relevant evidence: `reader-worker.md`, `reader-browser.md` plus screenshots.

Checks: focused learning tests19/19, typecheck, exact `npx tsc --noEmit --pretty false`, focused lint, builds, delegated unified-learning9/9, focused browser matrix on Bézier+Foundations at1440/1024/390 and100%/200% text; active marker, no history mutation, deep refresh, SL/EN, Back/Forward, long/short contents and parameter activity return. Final header cleanup rebuilt and all11 targeted chapter/recovery/activity checks passed (`.command-logs/2026-10-26T00-03-48-711Z-102764-c2ca0e76.log`). Handler viewed all desktop/narrow/header renders. Full CI subsequently succeeded.

Prior landing deployment3c96183 had failed because standalone-learning smoke expected removed landing heading `Bézier curves`. Reproduced this and the new native-disclosure selector mismatch, then fixed only test locators. The corrected tests passed locally and CI. No recovery application defect was found. Initial smoke harness expected a hash on return despite starting from hashless URL; correct contract restores original URL, activity focus and reading position. Corrected harness passed. No remaining issue from these failures.

## Task4 current implementation and required next steps

Read `captures-worker.md` first. Worker has implemented a ~200-line capture script, six720x440 actual app PNGs and manifest; replaced inline activity SVG helpers with full-column static images and bilingual alt/captions; mathematical caption symbols are delimited. Removed activity eyebrow. `docs/commands.md` documents refresh via `PREVIEW_BASE_URL` and `node scripts/capture-chapter-figures.cjs` after build/preview.

All six exact activity query URLs were captured in isolated contexts using existing `presentBoard` camera/label/stroke presentation helper. Source scenes/actions are unchanged. Both De Casteljau activities are quartic at one half; affine figure correctly shows the original cubic (no invented transformed comparison). Handler viewed all six initial captures and found clean framing. Final regeneration used stronger evidence with same scenes.

Handler review requested fixes before worker closeout: verify fetched served bundles match local stamped build (initial code only copied local stamp), sample actual live curves (initial code only counted curves), preserve geometry after presentation, delimit caption math, remove redundant activity eyebrow. Worker reports these are implemented and generator passed for all six URLs after final changes. Inspect actual diff; final independent code/math/media review has **not** happened.

Script checks cubic/quartic/affine controls and curve samples at0,.5,1; all ten quartic interpolation points; each quadratic Bernstein function at0,.5,1; hull/polygon visibility; framing/no crop, runtime errors and geometry after capture presentation. Expected quartic midpoint is(0,1.75). Manifest records source HEAD007c286, activity URLs/action summaries, source/build stamp, verified served entry hashes and output hashes. Capture served the accepted reader build stamped3c96183 dirty; it contained task3 app code, not the subsequent task4 reader edits. Runtime scenes are unchanged. It is valid capture provenance, not evidence of task4 reader build. Do not claim otherwise.

Next in order:

1. Inspect task4 diff by file and final script/evidence. Run focused tests (ChapterPage, learning/content and activity invariants as relevant), exact tsc, focused lint including script, production build. Worker unit/typecheck/lint passed **before** final sampling/provenance/caption edits; final reruns pending.
2. Delegate bounded independent capture-math/tooling and engineering/UI review as appropriate for the multi-file slice. Check actual numerical assertions and provenance are non-vacuous. Handler remains final acceptor.
3. Start a fresh provenance-valid production preview and use smoke-tester for task4 affected reader images/activity workflows: decode all six, intrinsic dimensions/containment/framing, SL/EN alt/caption and MathJax, desktop/narrow/enlarged text, no boards on reader, actual activity scene and exact reading return. Review desktop/narrow renders. Preserve prior sufficient reader evidence; don't rerun full graph/lesson suite without cause.
4. Fix/reverify findings. Record accepted task4 evidence and delegation outcome, commit only task paths, fetch/rebase only new commits if needed, push HEAD:master. Do not commit unverified task4 application progress as accepted.
5. Task5 Bézier pilot: bounded acceptance first, then degree transitions/recaps/teaching sequence and every activity return. Audit findings in content-audit.md. Be deliberate if changing scenes because images must regenerate. Existing activities use cubic, quartic, quadratic bases and affine cubic; choose whether to simplify or clearly teach the change under owner-delegated decisions.
6. Task6 each chapter separately: Foundations, Rational, Splines, PH, Parametrization, Functions/calculus, Analysis. Address audit findings and introduce meaningful app figures/investigations. Confirmed defect: weighted-knot prose points to single-curve alpha warp rather than spline knot allocation; use spline-parameterization and describe chord distances, not arc length. Math notation constraints apply.
7. Task7 reading/exploration journey, then task8 final Slovenian-first math/editorial/English-equivalence and production browser matrix including refresh/language/history/return. Do not skip remaining backlog after accepting captures.

## Processes, tools and routing

All implementation/review/smoke agents from this handler are finished. Watchers consumed. Handler stopped production preview4387 (session24458) during closeout. Delegated4388 and handler4389 test previews were disposed by runners. No live process ownership passes to successor. Existing build predates task4 integration; rebuild before preview/smoke.

Workspace-write, PowerShell, automatic approval review. Git metadata/network, Playwright and loopback needed require_escalated; accepted by reviewer. Do not misread sandbox failures as owner refusal. Start command verification with `just --list` per AGENTS.md (already run here, successor can use commands guide).

Repo routing: fresh-context GPT-6 Luna high implementation/review; max browser smoke. No worker delegation/Git. Monitor each worker and relay135k HANDOFF; self monitor at bounded phases. Do not carry resolved-model claims from requested settings. Capture worker watcher terminal signal137694; HANDOFF relayed; final stable note received. Other completed worker input samples: reader_impl116550, reader_review67402, reader_smoke113375. Task3 outcomes recorded in evaluation-log.md without loading its history; append task4 completion when accepted, retaining its partial implementation boundary record.

Impeccable initialized in this session, incumbent cream/green Read world. Handler/worker each independently ran detector on task3 (avoidable duplicate); no design-system refresh performed. No task4 final detector or responsive review yet. No mockup approval gate; owner delegated design choices. Use `impeccable context` once in fresh session if needed and read craft-floor before UI edits.
