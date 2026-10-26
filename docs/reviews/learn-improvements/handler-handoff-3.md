# Learn improvements — handler successor 3

## Objective and authorization

Continue the owner's request to execute every task in local `docs/tasks/learn-improvements/README.md` in order, with fresh successor chats at context boundaries. Owner is away and delegated remaining decisions; no optional approval gates. Follow AGENTS.md and its handler/worker budgets. Read this note first. Canonical acceptance: `docs/specs/learn-improvements.md`. Previous handoff2 describes earlier accepted tasks1–3; do not redo them.

Handler stopping at a consistent verification boundary near150k request input (latest145613). No agent remains writing. Task4 is accepted and pushed. Task5 content is implemented locally but **not accepted or committed** because named browser criteria remain incomplete.

## Git and owned dirty work

- Primary checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, branch `master`, project `6466c495-4851-4845-83b4-a5801d449d35` (verified path through list_projects).
- Accepted application HEAD `1a03914 feat: illustrate Bézier activities with verified app captures`, pushed fast-forward to origin/master. Browser smoke succeeded: https://github.com/efodx/bezeg-2.0/actions/runs/40249905528 . A documentation-only handoff commit follows; inspect actual HEAD.
- **Keep `docs/tasks/learn-improvements/README.md` untracked/local-only. NEVER stage or push it.** Backup branch `codex/learn-improvements-local-plan` retains the original plan excluded from master.
- Task5 dirty paths: `src/learning/content/bezierChapter.ts`, `docs/specs/learn-improvements.md` (clarified order criterion only), untracked `docs/reviews/learn-improvements/bezier-pilot-worker.md`, `bezier-pilot-review.md`, `bezier-pilot-browser.md`. Preserve them. No other unrelated changes known.

## Task4 accepted evidence

All six actual activity PNGs/manifest, capture script, responsive full-column reader figures and bilingual captions are committed. Scene recipes unchanged. Capture provenance belongs to the earlier captured scene build; final reader acceptance used rebuilt dirty0b2698b. See `captures-worker.md`, `captures-math-review.md`, `captures-ui-review.md`, `captures-browser.md`, `captures-return-diagnosis.md`.

Final focused23files/558tests, exact tsc, focused lint and production build passed. New figure test observed failing against old component. Independent math/provenance and reader/UI reviews found no blockers. Browser18standalone tests passed; six loaded image hashes matched manifest, captions/MathJax translated, no boards on reader,1440/1024/390 at100/200% text had no overflow. Handler viewed all6source PNGs and desktop/narrow cards.

The focused browser probe originally claimed a return-offset defect. Fresh diagnosis proved it sampled mid smooth-scroll; representative natural Tab/Enter and settled return exactly restored scroll/section/focus at100/200%. No application repair. Retained ignored repro `.command-logs/capture-return-repro.cjs` supports `BEZEG_CAPTURE_RETURN_URL` and `BEZEG_CAPTURE_RETURN_TEXT` (100%/200%); default URL4387 is now stopped, so set a new target. See diagnosis note for invocation and measured values. Do not reopen this resolved defect without new settled evidence.

## Task5 implementation and completed checks

Bounded acceptance section5 was committed before implementation. Worker requested Luna high fresh; content-only34line replacement pairs in `bezierChapter.ts`. Preserved8section IDs/order,6activity IDs/routes, formula fields/control coordinates, graph recipes and figures. Quadratic derivation now precedes repeated-interpolation quartic activity; parameter activity explicitly introduces its five-control scene. All6prompts give actions/observations/meaning. Basis functions identified by endpoints/center without colors. Recaps use comparisons.

Independent Luna high review initially found naked0/1values, ordering ambiguity and two repetitive recaps. All have dispositions in `bezier-pilot-review.md`: worker used words/endpoints for naked values; handler replaced parameter recap with same-parameter/different-curves comparison and affine recap with one-control reshape versus same map on every control. Spec explicitly clarifies that the calculation precedes **repeated-interpolation** exploration; earlier parameter activity stays before construction derivation for conceptual order. Reviewer rechecked final corrections and passed. No math or translation findings remain.

Final handler checks after all corrections:

-13/13tests across `bezierChapter.test.ts`, `lessonMathNotation.test.ts`, `chapter/activities.test.ts`: `.command-logs/2026-10-26T00-38-34-670Z-59020-26bc7ae1.log`.
-Exact `npx tsc --noEmit --pretty false` passed; focused lint log `00-38-51-317Z-46484-f25cc297.log`.
-Production build passed dirty1a03914: `.command-logs/2026-10-26T00-38-53-293Z-96840-c68e19b7.log`, existing dependency eval/bundle timing warnings.
-Handler outside-sandbox `just smoke-built tests/standalone-learning.smoke.spec.cjs --port 4392 --workers=2`:18/18passed,37.1sec, `.command-logs/2026-10-26T00-43-27-584Z-91944-bfd8beae.log`. Covers all6authored scenes/returns, parameter motion/reset, affine translation, reading/history/language contracts.
-Delegated browser confirmed SL/EN eight-section order, quadratic formula before repeated-interpolation activity, no reader board. See `bezier-pilot-browser.md`; its remaining gaps are explicit.

## Next steps in order

1. Finish task5 browser acceptance, using existing sufficient18test evidence. Need **saved and visually reviewed desktop/narrow interpolation-flow screenshots**, final reader layout at desktop/narrow/enlarged text and translated formulas/captions (task4 matrix is sufficient for unchanged figure CSS, but changed flow must render). Exercise Bernstein degree2→3 and observe3→4live basis functions; affine translation plus **scale or rotation** with live control/curve same-map evidence; one settled natural Tab/Enter launch/return offset on final build. Reuse retained return repro with new URL. Do not use only a mounted board or empty data as proof.
2. Prefer a small direct Playwright script outside sandbox for these gaps, rather than another broad UI inventory. All existing selectors/helpers in `tests/lesson-smoke-helpers.cjs` and `standalone-learning.smoke.spec.cjs`. Affine buttons include `Right: +0.5`, `Scale up: ×1.2`, `Rotate left: 18°`; degree label `Polynomial degree`. Control transforms may be around a center: check source before asserting an origin-centered scale. Main board accessible through `window.JXG.boards`; live object curves support X(t),Y(t).
3. Record final task5 evidence and accepted disposition, append final delegation outcome, commit task5 only when criteria covered, fetch/rebase only new commits and fast-forward push to master. Do not claim the current pilot accepted merely because tests pass. Preserve local task README.
4. Task6 each chapter separately in order: Foundations, Rational, Splines, PH, Parametrization, Functions/calculus, Analysis. Define bounded acceptance **before each implementation**. Audit `content-audit.md` contains per-chapter fixes. Foundations needs trig/radians introduction and transitions; Rational conic proof algebra; Splines local unit parameter clarification; PH integrated position example; Parametrization chord/knot heuristic and confirmed wrong graph link; calculus continuity quantifiers; Analysis uniform convergence quantifiers. Add meaningful actual app figures and specific investigations for each. Shared `FamilyChapterPage.tsx` currently has generic demo links automatically `?learn=1` when guided lesson available and no figure data fields; a small typed shared extension may belong to Foundations and be reused later. Avoid forcing identical teaching templates.
5. Confirmed Parametrization bug: weighted-knot prose must point to `spline-parameterization`, not single-curve `weighted-parameterization`; spans derive from endpoint chord distances, not arc lengths. Explain alpha choices as timing heuristic, not arc-length parametrization.
6. Task7 reading/exploration journey then task8 final Slovenian-first editorial/math/English-equivalence and production-browser matrix (refresh/language/history/return). Preserve stable URLs/activity contracts or explicitly document any authorized break. Do not stop after pilot.

## Process state and routing

All workers completed. Handler stopped preview4387 session8945 and final4390 session37595 with Ctrl+C; no handler preview ownership passes. Worker says its hung4391runner stopped;4392test runner disposed itself. Rebuild/provenance-check before next preview; current build represents final task5dirty1a tree, docs-only handoff does not change inputs.

Use `just --list` first at verification boundaries, then focused scripts. **Run loopback previews/Playwright via exec_command with sandbox_permissions require_escalated from first attempt.** This handler's ordinary sandbox unit run had cache-open error; escalated run passed. Task5 browser worker mistakenly spent budget on a sandboxed/stalled4391run and heavy direct browser tools; handler reran exact18tests outside sandbox in37sec. Record this as environment/invocation overhead, not an application failure. Runner port syntax is `--port 4391`, not `--port=4391`.

Repo routing: fresh-context GPT-6 Luna high implementation/review, max browser. Workers do not delegate/Git. Watcher/relay required; stop at135k worker signal. This handler task5worker109185, reviewer90362, browser139317HANDOFF relayed. Handler latest145613 before note; don't carry accumulation forward. Continue self-monitor at bounded phases and hand off near150k; no optional owner approvals. Evaluation log records task4acceptance and task5partial boundary without claiming completed browser acceptance.
