# Bézier patches handler handoff 4 — 2026-10-26

## Objective and checkout

Continue the authorized objective: finish `docs/tasks/bezier-patches` in chosen order, create subsequent bounded tasks after the renderer ADR, and use fresh successor chats when needed. Same primary checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, master. User standing authorization includes delegated implementation, commits, fast-forward push to master and successor chats. Follow AGENTS; no further permission needed for the objective. **Task01/03/04 complete; task02 partial, no renderer selected, no ADR/dependent tasks.**

HEAD/origin/master `0ec2f8f7e641e6c63b9908bd2d26484da5183d43`, this phase's single commit: `Repair renderer spike interactions and bound measurement evidence`. Fetched, rebased (already current), reran focused checks, fast-forward pushed. Production app/package/lockfile unchanged. No hosted/deployment claim. Git remaining only pre-existing untracked `.worktrees/`, old handoffs and this note; preserve them. All prototype source/evidence and evaluation records are committed.

## Read next

- `docs/tasks/bezier-patches/02-renderer-spike.md`, rendering/acceptance sections of spec and guardrails.
- **`docs/reviews/bezier-patches/renderer-repair-verification.md`** is this phase's durable result and exact next gaps.
- `three-focused-smoke.md` baseline; `three-lifecycle-fix.md` and `three-lifecycle-review.md`; `measurement-harness.md` and `measurement-review.md`.
- Prior handoff3 contains earlier JSX findings, fixture/history/environment details. Avoid redoing covered checks or loading whole accumulated workflow logs.

## Accepted progress

Independent stable THREE-only smoke on be078cd found actual pointer failure: `rayFor` chained `Raycaster.setFromCamera()` which returns void. Also reproduced dead toolbar after remount and null.add from setup completing after dispose during held fixture fetch. Baseline other checks passed actual32teapot, exports with labels, presets/depth surface-net visual inspection, resize390/nooverflow, key orbit and inset. HTML label occlusion and SVG line-depth fidelity remain open.

Repaired `three-prototype.js`: explicit raycaster return; generation guards after import/fetch/JSON; scoped RAF/observer and ready only when complete; toolbar listeners separate from renderer mount; final disposal removes both; stale errors ignored; pending-kind change including teapot handled. Source math unchanged. Independent engineering review found verifier gaps, repaired in `verify-three-lifecycle.mjs`: deferred schedules at each await, resource/listener/RAF mutations rather than readiness-only, exact control listener counts across repeated mounts, guard deletion mutations fail, old be078cd failures reproduced. Handler reran syntax + lifecycle + fidelity + teapot verifiers before commit and after rebase, all pass.

Handler browser recheck of exact repaired served source: `three-focused-artifacts/repair-2026-10-26-1946/results.json` and preserved verify.mjs. 11/12 rows pass, zero runtime/console errors. Tensor/triangle actual mouse edits and changed rendered pixels, touch orbit, keyboard, inset, actual teapot, exports, presentation390, remount toolbar and delayed-fetch disposal pass. The combined touch XY→z row passes XY but fails the z assertion. **Fresh-scene touch z passes BOTH tensor and triangle**, only point0 changes +0.82963z with exact unchangedXY/camera; exact raw data+harness in touch.json/verify-touch.mjs. Need diagnose combined hit target (likely projected overlap after XY), not assume coordinate drift: the failing harness doesn't retain before/after all-net deltas. No source repair needed until actual selected-object evidence. Recheck actual rendered owner, not only model or null path.

Two repair harness runs hit Windows UNKNOWN when overwriting results JSON; unique numbered checkpoint files completed the third run. Only final results.json retained plus exact harness/screenshots/downloads; redundant owned failed run removed. Baseline worker evidence retained separately. Report says no overall smoke pass because one row failed. Preset capture pass isn't handler acceptance of vector export depth.

## New bounded measurements

`measure.mjs` now dual-renderer, filterable and per-operation bounded, with parent hard deadline process-tree kill (Windows taskkill); progress before risky operations, raw records, persistent failures; fresh browser context each gesture; runtime+full active served/local asset hashes+git HEAD/dirty manifest. Defaults tiny tensor iso8/tiling8 desktop1440x1000 three input samples once. JSX triangular explicitly mesh by default; optional surface mode. Teapot drag/UV explicitly skip, orbit supported. Nonempty patch-owner render checks and movement/fixed camera checks. Two review rounds repaired handler and independent reviewer findings; see guide for env options. Don't print entire >300-line source or thousands-line raw JSON; use filters/summaries.

Exclusive tiny probes completed 3 gestures each, retained `timing-probes/jsx.json` and three.json. Chromium156.0.8078.4. JSX1.14.1: drag frame16.7ms median /166.6p95; orbit16.7/33.4; **parameter setParameter cost3452.3ms median /3497.7max**. Three r180: drag33.3/100; orbit33.3/33.4; parameter7.7/8.3ms. ONLY3 input samples/one repetition; no budgets or renderer speed ratio accepted. RAF includes host file-write/dispatch gaps; not compositor latency. Camera/material/work path differences remain. JSX construction rebuild not batched, so profile/batch reasonably before blaming renderer.

Initial root JSX probe correctly failed asset hash verification (installed1.9.2). Successful JSX run invoked copied current harness FROM isolated pinned install. One relative-copy mistake briefly launched stale old harness, stopped immediately; final successful raw evidence is current bounded runner. Always copy by absolute path or use root cwd carefully before choosing isolated workdir.

## Environment / serving

Root installed JSXGraph1.9.2 invalid despite lock1.14.1. Earlier automatic approval rejected root npmci replacement. **Do not retry/bypass.** Approved `.command-logs/patches-acceptance` has pinned1.14.1 dependencies/build. Three r180 vendor/data remains ignored `.command-logs/patches-three-vendor` in both roots. No dependency changes needed. Copy changed prototype files (absolute paths) into isolated docs/prototypes/bezier-patches before serving. Current served copies have corrected three source and current measurement runner; other prototype sources unchanged. Recopy after any edit, including teapot-data.js if touched.

Launch server FROM isolated root: `BEZEG_SPIKE_PORT=4181 node docs/prototypes/bezier-patches/server.mjs`. URLs index.html/three.html. Loopback/Playwright commands require_escalated from first attempt per workflow. Root Playwright works. Run JSX measurement from isolated directory so local dependency hash matches pinned served1.14.1. Use absolute `BEZEG_MEASURE_OUT` in root .command-logs to keep raw outputs discoverable. Browser/timings must be exclusive with each other and builds/tests.

Handler server exec74856 STOPPED Ctrl+C at closeout. All worker/browser/timing sessions complete, none intentionally running. No source writers remain. Browser rechecks closed contexts; startup failures before browser not concern, earlier evidence-writing failures exited parent; no known live browser. If uncertain inspect only owned Playwright processes outside sandbox. Watcher sessions were consumed. Reviewer initial session21223 may remain as a completed/unconsumed watcher only, not source writer; monitor helper process harmless and should exit on completion.

## Next bounded order

1. Diagnose combined Three touch XY→z target by recording all changed point indices, ray hit, projected center, camera, mode; fresh-scene z already passes so avoid another broad generic smoke.
2. Profile JSX parameter path with tiny bounded one-operation samples; test batching object remove/create in suspended board as candidate repair, compare same source/config beforeafter; retain exact settled math/rendered construction. Also current JSX triangle mesh polygon `points`/owning SVG and actualteapot source fixes still need browser confirmation. Existing PNG taint foreignObject, touchzXY drift and listener leak remain from earlier evidence. Candidate rejection can be recorded honestly; don't spend endless work making rejected prototype production-ready.
3. Resolve/disposition candidate SVG line/label depth and missing keyboard inset entry for renderer decision vs later adapter acceptance. Source Three SVG overlays lines and labels; raster WebGL net depth is separate. Don't claim SVG fidelity because download exists. Task02 checks pass/fail with evidence, not full production feature delivery; explicitly account for every unresolved must-have before ADR.
4. Exclusive bounded same-scene full comparison: both patch kinds, iso8/16×tiling8/16, desktop+narrow, representative drag/orbit/UV repeated, actual32teapot orbit at required densities. Start small filters; overall deadline and incremental JSON. Match visible net/iso/construction, data, camera/config enough for fair comparison; preserve differences as caveats, don't infer device performance. Physical phone optional per guardrails.
5. Write next-free renderer ADR with measured alternatives, adapter attach/reconcile/onEdit/dispose, z rule, triangle path, budgets/defaults/teapot feasibility; link spec. Only then create subsequent bounded implementation tasks (geometry, adapter+tensor,triangle, demonstrations,chapter+lessons+previews,acceptance) and continue authorized objective.

## Context and coordination

Handler initial self34398,147901 at final boundary after push. No new slice started; closing here with successor before further substantial work. Worker requested routing Luna max smoke, Luna high impl/review, aliases not exposed. Worker completion watcher observations smoke108854,measurement113957,lifecycle100480,review81548; some may predate followups, no peak/total inference. Evaluation logged with honest missing dispatch clock/prospective size fields.

Project list verified `Bezeg` id6466c495-4851-4845-83b4-a5801d449d35 points exact checkout. Successor local environment, no branch/worktree switch. User did not select model/effort; omit overrides. Preserve workspace-write/auto-review permissions. New handler inspect git+self telemetry, follow AGENTS bounded delegation and commit/push rules. Old handler ends after confirmed creation.
