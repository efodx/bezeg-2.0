# Learn improvements — handler successor 1

## Objective and authorization

Continue the owner's request to do every task in `docs/tasks/learn-improvements/README.md` in order and spawn successors under AGENTS.md. Owner explicitly authorized remaining design decisions and said they would be away. Do not ask for optional approvals. Follow repository delegation, verification, commit and master-push rules. No external tracker.

Canonical acceptance: `docs/specs/learn-improvements.md`; prior behavior in `docs/specs/unified-learning.md`. Before each later slice, add bounded acceptance for that slice to the improvement spec. Read relevant area documents only.

## Checkout and Git

- Same primary checkout: `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, branch `master`, saved local project `6466c495-4851-4845-83b4-a5801d449d35`.
- Accepted commits after rebasing onto current origin/master: `5a31a16` audit/spec; `d25852f` landing. Base `ef97b37` includes newer CI-only changes. A documentation handoff commit follows these. Handler is committing/pushing all accepted commits before successor creation; inspect actual Git state first.
- **Keep the backlog README local.** Initial checkout contained local-only commit `9727d37 docs: record Learn improvement plan`; origin had independently advanced. Preserved it on local branch `codex/learn-improvements-local-plan`, rebased only this task's two new commits with `git rebase --onto origin/master 9727d37`, and restored README as an untracked file in `docs/tasks/learn-improvements/`. Do not stage/push that file. Backup copy also in ignored `.command-logs/learn-improvements-local-plan.md`. No unrelated changes otherwise.
- Initial push attempt was rejected as non-fast-forward; corrected by the bounded rebase above. No conflicts, force-pushes or amended commits. Latest fetch showed `0 2` ahead/behind before this handoff commit.

## Accepted work

1. Full eight-chapter bilingual source audit: `content-audit.md`. Includes mathematical arithmetic checks, prerequisite sufficiency and actual control-source checks. Confirmed defect: weighted-knot prose links to the single-curve alpha-warp demo rather than spline knot allocation; spline uses endpoint **chord** distances, not arc lengths. Fix in Parametrization slice. Remaining prioritized teaching findings are dispositioned to each chapter slice. No formula/translation error confirmed. Browser/learner-study evidence is not claimed by audit.
2. Learn landing: Foundations start, one heading/action per topic, eight existing app-derived previews, explanatory links between chapters, shorter copy and native counted disclosures for all 45 guided lessons. Intrinsic720x440 image dimensions reserve lazy-loading space. Handler fixed links to44px after smoke. Captures contain some Slovenian baked-in labels; alt/captions translate.

Evidence: `landing-worker.md`, `landing-browser.md` and retained representative screenshots/JSON in `landing-browser/`. Handler reviewed source diff, desktop and narrow renders. Completed worker handoffs were consolidated and deleted. No application changes pending.

## Remaining tasks, in order

3. Improve shared chapter reader: reading measure/type/spacing/formulas/header scale, contents/current section, chapter neighbors, long mobile contents, keyboard/enlarged/projection-like views. Entry files `src/learning/ChapterPage.tsx`, `FamilyChapterPage.tsx`, `ChapterPage.css`; existing Bézier reader already has richer scroll/current-section/return behavior. Family reader currently marks only clicked hash. Preserve existing anchors and activity return contract. Add acceptance before implementation; delegate a bounded slice rather than a sweeping rewrite.
4. Replace Bézier illustrations with actual reproducible app captures. Existing activity illustrations are programmatic SVG in ChapterPage. Reuse/audit catalog capture machinery where useful, but match authored activity scenes exactly. Catalog preview generator entry `scripts/capture-demonstration-previews.cjs`; asset manifest under `src/images/demonstrations/catalog/`. Need deliberate framing/labels/captions/alt/provenance and a refresh command.
5. Complete Bézier pilot: reduce degree switching/repetitions, explanation→visual→exploration→interpretation, verify every activity and return.
6. Each remaining chapter separately: Foundations, Rational curves, Splines, PH, Parametrization, Functions/calculus, Analysis. Address audit findings, add useful app figures and specific investigation instructions. Preserve topic teaching needs; use exact math delimiters and meaningful numerical checks.
7. Reading↔exploration journey: distinguish prepared chapter activities, guided lessons and free exploration, appropriate scene carryover, exact section return, Back/Forward and available controls. Do not silently promise generic family links already carry a prepared scene.
8. Final Slovenian-first editorial/math/English-equivalence and production browser verification, desktop/narrow, refresh/language/return flows. Record every criterion's evidence/gaps.

The task README has not been marked checked; only audit and landing are complete. Do not skip tasks3–8 because the landing is accepted.

## Verification and processes

- Before rebase: focused LearningPage unit passed, `just typecheck`, exact `npx tsc --noEmit --pretty false`, focused lint, production builds passed. Sass/Vite bridge warnings pre-exist.
- Delegated production Chromium smoke9/9 via unified-learning spec; focused real-browser all8 image decode/translation, disclosures/keyboard/focus, all45 links44px,1440/1024/390/200% text, no page overflow, no boards, lesson entry and history/hash/refresh passed. Initial harness timing and last-topic bottom-clamp assertions corrected with observed evidence; no app navigation fix needed. Last topic is visible at maximum page scroll, not aligned to viewport top.
- Post-rebase at `d25852f`: focused unit passed (`.command-logs/2026-10-25T23-45-13-065Z-92260-89a852b2.log`); build passed (`...23-45-23-245Z-104908-0719d991.log`). Origin changes only CI test ordering/sharding; app diff remains the reviewed landing change. No need repeat sufficient checks solely for docs handoff.
- All workers finished. All watcher output consumed. Preview4387 stopped by handler after browser checks; worker's4388 server disposed. No live previews/processes owned by old handler. Build remains on disk but provenance/revision may need refresh after later commits.

## Settings and workflow notes

Workspace-write with automatic approval review. Git metadata writes and loopback/browser commands required `require_escalated`; automated approval allowed them. Do not interpret an initial sandbox denial as user refusal. Use PowerShell throughout file operations.

Worker routing per repo: fresh-context GPT-6 Luna high implementation/review; max browser smoke; no worker delegation/Git. Audit first pass missed control/prerequisite depth; explicit completion request found the real mismatch. Watch every worker and relay HANDOFF signals; audit follow-up was stopped at135595 after finishing notes. Implementation completed101197; smoke126192 request-input tokens. Handler self-check reached151040 at the slice boundary; no new slice started. Record evaluation outcomes using `.agents/skills/subagent-flow-evaluation/SKILL.md`, without loading history.

Design skill initialized for landing: Impeccable incumbent cream/green Read surface. `impeccable context` ran once in old session; craft floor read. Detector had only advisory incumbent color differences. It reported stale `.impeccable/design.json` vs DESIGN.md; optional `document` refresh was not authorized as extra scope and not performed. Mention once in eventual task response if useful; do not expand this objective. Prototype skill was inspected but not applied; no mockup approval gate. Owner delegated design decisions explicitly.

Create another fresh successor at150k input according to `docs/agent-workflow.md`, checking self at bounded steps. Retain model/effort only if owner explicitly selects them; none selected for successor. No owner decision blocks further work.
