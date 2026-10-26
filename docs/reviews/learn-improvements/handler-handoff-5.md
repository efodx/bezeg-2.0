# Learn improvements — handler successor 5

## Objective and authorization

Continue the owner's authorization to execute every task in local `docs/tasks/learn-improvements/README.md` in order, using fresh successor chats at repository context boundaries. Owner is away and delegated remaining decisions; no optional approval gates. Follow AGENTS.md. Canonical acceptance: `docs/specs/learn-improvements.md`. Tasks1–5 and Task6a Foundations were accepted before this chat. This chat accepted Task6b Rational and Task6c Splines. Do not redo accepted work.

Closeout starts at handler request input144777; next substantial chapter belongs in the fresh chat. All six workers completed and budget watchers consumed. No outstanding implementation or verification work for Rational/Splines.

## Checkout and Git

- Primary checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, branch `master`. Verified saved project `6466c495-4851-4845-83b4-a5801d449d35` points to that exact path via list_projects.
- Accepted Rational app `88da436 feat: explain rational curves with figures and investigations`; acceptance + Splines spec `b6b0bb6`. Both pushed. Rational GitHub Browser smoke succeeded: https://github.com/efodx/bezeg-2.0/actions/runs/40254719381 . Foundations `f441d75` smoke also succeeded (40253532552).
- Accepted Splines app `87439fc feat: clarify spline joins and graph investigations`; acceptance + PH spec `ee7f47b`. Both pushed fast-forward. A handoff documentation commit follows; inspect actual HEAD.
- Latest workflow at dispatch preparation: `ee7f47b` Browser smoke **queued**, https://github.com/efodx/bezeg-2.0/actions/runs/40255714028 . Since app87439fc and docs ee7f47b were pushed together, inspect that run's actual scope/results. Check final status before attributing failures.
- **Untracked `docs/tasks/learn-improvements/README.md` is LOCAL ONLY. NEVER stage or push it.** Preserve backup branch `codex/learn-improvements-local-plan`. Otherwise clean after handoff commit.
- One Rational rebase command refused due to unstaged spec documentation (no conflict); app fast-forward push succeeded with unchanged fetched base. Then committed spec, successfully fetched/rebased clean tracked tree, and pushed. No rewritten existing history or remote conflict. Splines clean tracked-tree fetch/rebase/recheck/push succeeded.

## Rational accepted evidence

`88da436` adds full quarter-circle identity (`a=1-t,b=t,q=sqrt2 ab`, `X=a²+q,Y=b²+q,D=a²+b²+q`, residual `q²-2a²b²=0`), positive-domain explanation/endpoints, accurate weighted cubic and radius3 three-arc circle captures, and bilingual prompts for every occurrence of seven links.

Independent review found two actual prompt issues, both corrected/rechecked: weight selection uses Previous/Next weight controls, not selecting a control point; Rational De Casteljau only displays a growing prefix, not visible homogeneous interpolation levels. Existing mathematical homogeneous-coordinate explanation retained, but prompt observes prefix endpoint R(t).

- Evidence `rational-worker.md`, `rational-review.md`, `rational-browser.md` in this directory. New invariant assertion failed pre-change for missing prompt. Final25tests/3files, exact `npx tsc --noEmit --pretty false`, focused lint, production build passed. Final build log `.command-logs/2026-10-26T01-26-39-923Z-14628-2bd796a8.log` (dirty4d509b9). Handler1001samples minD .8535533905932737,maxresidual4.44e-16.
- Browser script/data/captures ignored `.command-logs/rational-browser.*`/`rational-browser-*.png`. SL/EN refresh/hash,2decoded720x440figures, caption/formula math, no readerboards/errors,1440/1024/390 and390at200%rootfont. Weight w1 2→4:8samples matched independent Bernstein,4controls fixed; t1/3 distance toP1 fell1.6500→1.0214. Circle3→4:101samples/arc radius3,cyclicjoined,total2pi. Handler viewed sourceassets and desktop/narrow/enlarged-text renders. Other unchanged operation runtime uses sufficient existing lesson evidence; Task7 still owns journey.

## Splines accepted evidence

`87439fc` defines globalu[0,2], left t=u/right s=u−1, explicit L/R in both languages, common unit derivative scales,C1 and C2a1. Unequal intervals divide derivatives byh andh²; positive regular tangent scaling distinguished. Adds C1/G1 actual catalog figures and5control-specific bilingual prompts at11linkoccurrences.

Handler pre-review caught missing EnglishL/R definitions, bad single-backslash TS math strings, alts claiming labels/slider absent fromPNG, generic controlprose; all repaired. Independent review found no remaining math/content/control blockers. Presence-based tests cannot establish semantic prompt correctness; source review supplies it.

- Evidence `splines-worker.md`, `splines-review.md`, `splines-browser.md`. New invariant assertion failed pre-change for absent prompt. Final26tests(7family/notation+19LearningPage), exacttsc,focusedlint,buildpassed. Build `.command-logs/2026-10-26T01-36-33-128Z-42904-41327dbe.log` dirtyb6b0bb6. Handler chain-rule spotcheck hL1,hR2 gives first(1,2)vs(.5,1),seconds at a1(0,2)vs(0,.5).
- Direct browser script/data/captures `.command-logs/splines-browser.*`/`splines-browser-*.png`:10groups passed, SL/ENrefresh/hash,2images/formulas/captions,11prompts,1440/1024/390 and390at200%, Rational baseline,zero errors. General continuity1→0/degree2→3 livefinite path deltas1.556/.458; G1b1 exactspinbutton1→.65 pathdelta.368. Browser needed harness corrections:11occurrences vs5uniqueIDs,actual#jgbox container,range default .9967 vs exactspinbutton model1. This is recorded; no graph repair claimed, no exactdecimal pointerdrag claim.
- Handler viewed source C1/G1PNGs and SLdesktop workedjoin,EN390/200%text,full C1/G1figure renders. Freecontrol dragging,physical devices/comprehensive accessibility outside targeted pass, unchangedruntime sufficient existing evidence reused. No board/runtime/scene/preset/route change.

## Remaining work in order

1. Check final ee7f47b workflow above. Reuse accepted checks unless a new concern invalidates them.
2. **Task6d PH curves next. Bounded acceptance ALREADY DEFINED/COMMITTED in spec §6d. No PH app implementation started.** Complete integrated position for worked derivative: r(t)=(t−t³/3,t²),r(0)=(0,0),r(1)=(2/3,1),speed1+t²,length4/3; translation initialpoint doesn't affect velocity/length. Inspect actual PH controls before prompts. Reuse existing typed family figures/prompts. Catalog recipes `ph-cubic` oneoffsetd.35,`ph-quintic` oneoffsetd.5 (`scripts/demonstration-preview-recipes.cjs`); this handler read recipes but has NOT viewed PH assets. Distinguish them from worked numerical curve. Normal/offset explanations need regularpoint/nonzero speed, signed/zero distance, no false polynomial/globalregular guarantee. Generating-point auxiliary editor is not automatically a plotted hodograph. Offset distance/count controls appear only after enabling offsets (see `src/graphs/base/controls/PhBezierCurveControls.tsx`).
3. Then separately define/complete **Parametrization, Functions/calculus, Analysis** in order. Prior content audit `content-audit.md`: weighted-knot section must link `spline-parameterization`, not single-curve `weighted-parameterization`; distances are endpoint CHORD distances, not arclength; alpha0/.5/1 timing heuristic, not exact arclength. Calculus continuity tolerance/neighborhood quantifiers. Analysis uniformconvergence epsilon/N independentofx. No acceptance yet defined for these remaining chapter slices.
4. Task7 reading/exploration journey; Task8 final Slovenian-first editorial/math/English and productionbrowser acceptance (refresh/lang/history/exact return). Do not stop after chapter content. Preserve URLs/activitycontracts. Family links currently accurately labeled Guided graph lesson and open?learn=1; browser checks explicitly Exit lesson→Exit and restore graph to reach free controls. Task7 must clarify that journey and exact return; familylinks do not supply prepared worked numerical scenes.

## Processes, routing, context

All implementation/review/browser workers completed. All watchers consumed; no HANDOFF threshold. Implementation workers do not delegate/Git. Routing per workflow: fresh Luna high implementation/review, Luna max browser; handler scope/review/build/acceptance/Git. Evaluation records added for both chapters. Exposed workercompletioninputs Rational130900/review82146firstcompletion/browser108678; Splines94702/review73320/browser108709. No inferred cumulativeusage/resolvedsettings. Handler start34103 and closeout144777; check selfmonitor at start/boundaries.

Handler stopped own preview4396 session52182 with CtrlC after final browser. No live preview/process ownership transfers; browser contexts closed. Build remains final Splines bytes dirtyb6b0bb6 provenance; next appchanges require rebuild.

All loopback/Playwright commands need `sandbox_permissions=require_escalated` FIRST attempt. Git writes need escalation too (.git read-only sandbox). Use narrow direct Playwright scripts immediately; inventories waste workercontext and guessedselectors cause repeatedruns. Reliable ignored templates `foundations-handler-final.cjs`, `rational-browser.cjs`, `splines-browser.cjs`. Read actual renderer/selectors: #jgbox, `.learning-investigations li` contains link then `.learning-investigation-prompt`, repeatedlinks need `.first()`, exact controls NumberInput accessible spinbutton vs native range (model value can differ by range normalization), general Cn counters are read-only outputs with plus/minusbuttons. `just preview 4396` positional; smoke --port4397 separateargument. `just --list` at boundaries. Preserve scene/language during interaction as applicable. Handler source review is still essential for bilingual omissions/capture mismatches even when tests pass.

Continue through fresh successors until the whole owner objective is complete. No optional owner approval gates.
