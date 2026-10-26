# Bézier patches handler handoff 3 — 2026-10-26

## Authorized objective and state

Continue the user's authorized objective: finish `docs/tasks/bezier-patches` in chosen order, create subsequent bounded tasks after the renderer ADR, and use fresh successor chats as needed. Same checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, master. Follow current AGENTS, bounded delegation/model routing, context monitoring, small commits and fast-forward push to origin/master. No further user permission is needed for this objective or successor chats.

Read current task02, `renderer-spike.md`, the functional/smoke reports and review findings; older handoff2 has task04/environment history. Task01,03,04 remain complete. **Task02 is still partial; no renderer selected and no ADR/dependent tasks created.** Do not mistake committed prototypes or source-only fidelity fixes for accepted renderer implementation.

## Completed this phase

HEAD and origin/master **be078cd**. Three commits pushed with fetch/rebase/recheck; no conflicts and no remote changes intervened:

- `be65500` — pinned actual Utah teapot fixture + verifier/provenance. 32 explicit patches,290 points, SHA256/full upstream commit, MIT/Newell attribution, independent power-basis vs Bernstein corners/interiors, deliberate transpose mutation rejected. Corrected earlier research note's last vertex and collapsed bottom-row example.
- `3e1bbc1` — reproducible initial JSXGraph + isolated three.js fallback prototype sources and truthful open findings/screenshots/exports. This is the **original browser-tested prototype revision**, not accepted production code.
- `be078cd` — tensor net endpoint, three triangular iso families in both renderers, JSXGraph actual32patch teapot mode, focused source-extracted assertions, independent smoke evidence and evaluation records. **Corrected sources have NOT had browser rechecks.** Handler additionally guards single-patch construction over empty teapot net and hides its inapplicable inset.

Main production source/package/lockfile unchanged this phase. No full app suite/build needed for throwaway docs prototypes; node syntax, verify-teapot.mjs and verify-fidelity.mjs passed, rerun after fetching/rebasing before push. Deployment CI wasn't awaited; no hosted claim.

## Environment — do not bypass prior rejection

Root installed JSXGraph is invalid1.9.2 despite lock1.14.1. Earlier automatic approval rejected root npmci replacement due shared dependencies. Do not retry/bypass it. Independent `.command-logs/patches-acceptance` has approved lockfile-based1.14.1 dependencies and task04 source/build, and remains the serving root for comparison. Browser assert JXG.version1.14.1. Root Playwright chromium156.0.8078.4 launches via require_escalated; loopback/browser commands use require_escalated from first attempt under project workflow.

**Served prototype copies are stale at initial revision3e1bbc1.** Before new checks copy CURRENT editing sources into isolated docs/prototypes/bezier-patches, including teapot-data.js now referenced by index.html and verify-fidelity.mjs. Do not mutate dependencies. Server uses process.cwd, so launch from isolated root. `BEZEG_SPIKE_PORT=4181 node docs/prototypes/bezier-patches/server.mjs`. URLs root prototype page and three.html.

Three vendor official pinnedr180 modules/core/teapotJSON/license/hashes are in root `.command-logs/patches-three-vendor` and copied to isolated `.command-logs/patches-acceptance/.command-logs/patches-three-vendor`. Source fetch script `docs/prototypes/bezier-patches/fetch-three.mjs` reproduces them without project dependency changes. Modules lazy-load in separate prototype only. Fixture source revision0af9729d0c143a86a1d725d6e2c3ad83301f3f34; SHA256 in reports. Three uses vendor teapot-data.json, JSX uses reviewed global teapot-data.js; sentinels and dimensions match.

## Actual evidence and remaining findings

Durable reports/artifacts are now COMMITTED:

- `prototype-functional.md` and `renderer-functional/`: pinnedJSX functional results,8screenshots,SVG, original partial timings + exact old harness. MouseXY/z, mouse/keyboard orbit, inset movement, math, presentation/resize, board unregister/remount passed selected checks. **PNG fails taintedcanvas, touchz changesXY, mainboardlisteners15→21 after3remounts.** Final live triangle mesh update is **inconclusive**, not proven stale: first assertion failed, repair introduced owned function-backed vertices; final probe queried null polygon path. Need actual SVG polygon `points`/owning node or pixels before release, not null-path comparison.
- `three-prototype.md`: first fallback source implementation. Syntax/inline math passed initially. It includes tensor/triangle/controlnet/construction, mouse/touch gesture code, camera, inset, exports, actual32teapot, explicit disposal API. Browser acceptance still incomplete. SVG painter-sorts faces but overlays all lines; HTML labels overlay geometry. Do not conflate WebGL depth buffer with faithful SVG occlusion.
- `renderer-smoke.md` + `renderer-smoke-artifacts/{screenshots,downloads}`: independent original-source desktop smoke. JSX1.14.1/three r180 and six servedsourcehashes confirmed. JSXtriangle mouseXY actualmovement, bothSVGdownloads, threePNG75kB visibly contains patch+labels (handler inspected). OriginalJSXPNG didn'tdownload. Worker repeated harness-only cross-renderer JXG assumptions and stopped at Three lifecycle; no final JSON survived. Narrow/touch/z/inset/keyboard/teapot render skipped; **not smoke pass**. Original harness only at root `.command-logs/patches-renderer-smoke/verify-renderers.cjs`; do not blindly repeat it. It was not added to prototype source. Three numeric mouse record lost. Source repair followed this smoke, so all affected workflows require recheck.
- `renderer-math-review.md`: tensor net final endpoint wrong, missing triangular iso families, mismatched repeated-patch/teapot scenes. `renderer-fidelity-fix.md` records source corrections and pure checks; browser confirmation remains open.
- `renderer-engineering-review.md`: existingJSX findings plus Three async setup/dispose race, label/SVG depth fidelity, coarse harness assertions, absent keyboard parameter access. These remain open. Prioritize valid prototype comparison and define later production adapter acceptance explicitly.
- `renderer-spike.md` is a partial investigation status, NOT final acceptance report. ADR still absent.

### Timing attempt

Only6 completed idle originalJSX tensor gestures at desktop1440x1000 iso8/tiling8:3drags/3orbits,40pointer steps each. Raw data in renderer-functional/interrupted-timing.json. Dragmedianframe16.7ms p95about150ms. Orbitframe16.7median/p9516.8–33.3; boardupdatemedian23.3–24.4ms. Different populations; no-op/suspended update calls make dragboardmedian0 uninformative. Input-to-next-rAF is proxy, not actual compositor latency.

First programmaticUV run never completed before handler stopped at19:17:38UTC (roughly3min inUV); no UVraw samples or accepted cause. Code observation: setParameter and inset rebuild/remove many construction objects without suspension; a plausible amplification, not measured causal finding or renderer verdict. This requires bounded profiling/repair before treating it as representative renderer performance. Current measure.mjs defaults12samples/3repetitions and writes per-operation UVprogress but is still JSX-only, allconfigs, lacks overall timeout and no three support. Add filters/deadlines and start with tiny bounded runs rather than another multi-minute blind combined run. Source samples/input path changed since old6gestures; preserve exact revisions and remeasure after fidelity fixes. Actualphoneoptional per guardrails; narrowbrowser results aren't physicalphone.

## Next bounded work (chosen order can change)

1. Fresh browser smoke/fix owner for THREE ONLY first, avoid cross-renderer JXG assumptions. Stable copied source/hash, representative mouse+touchXY/z with fixedcamera, rendered triangle changes during drag, keyboardcamera/inset (or namegap), presentation/resize, repeateddispose/remount including async setup race, PNG/SVG withlabels, visible actual32teapot. Then targetedJSX confirmation of fixedgeometry/actualteapot and remainingmusthaves if needed. Keep each renderer harness separate or explicit adapters, save incremental JSON even on errors. No more broad retry loop losing earlier results. Use smoke skill delegation and bounded budgets.
2. Investigate/repair concrete prototype defects within candidate scope. Possible cheap JSXPNG cause: exported SVG contains **one foreignObject** (handler counted), while labels are separately serialized asSVGtext; Chromium taints canvases drawing SVGforeignObject. Check removing unusedforeignObject versus genuine requiredlabel content; this is an observation/suggestion, not verifiedfix. Touchz XYdrift and listener leak need source-correct handling if retaining JSX. Three SVG curve/label occlusion and setup/dispose race also need meaningful acceptance dispositions.
3. Profile/collect exclusive same-scene timings bothrenderers, tensor/triangle8/16iso and8/16tiling, desktop+narrowbrowser, actual32patchteapot (now implemented in both but unviewed). Run idle withouttests/build/otherbrowser. MatchshowNet, shading, data, construction andinput, measureframes andtails/actualmovement, not justobjectrebuild. Physicaldeviceoptional. Set measuredbudgets/defaults onlyafterdata.
4. Next-free renderer ADR with measured reasons/alternatives/adapterseam/zrule/trianglepath/budgets/teapotfeasibility; link spec. ONLY THEN create nextboundedtaskfiles patchmath,adapter+tensor,triangular,remainingdemonstrations,chapter+lessons+previews,integratedacceptance and continue all authorized work.

## Context, workers and processes

Handler firstself35022,141758 at19:30:07UTC. This is a natural bounded checkpoint just below150k; no new slice was started afterward, nextchat avoids crossing during broad browser work. Evaluation skill records appended, requested settings vs actualmodeldistinguished. All workers finished (no delegation/commits): functional97314input, teapot65636, three87213, mathreview67250, engineering81866, smoke121621 beforetiny artifact-location followup, fidelity86720. Sources/reports owned as named above, no unfinished worker edits.

Handler server exec95977 stoppedCtrl+C at19:28:29UTC; measurement28672 stoppedCtrl+C at19:17:38; no owned browser/server/worker intentionallyrunning. Smoke browsers closed. Watchers consumed completion events. No source-writer should remain from this handler.

Git dirty after commits: only pre-existing untracked `.worktrees/` and older untracked handoffs (`3d-points-worker-handoff.md`, `handler-handoff-1.md`, `handler-handoff-2.md`, `renderer-prototype-handoff.md`), plus this handoff. Preserve unrelated changes; current prototype/evidence are now tracked. Retire oldhandoffs onlyafterpreservinguniqueevidence underdocumentationpolicy. Do not delete shared worktrees or dependencyjunctions.

Saved project verified by list_projects: Bezeg6466c495-4851-4845-83b4-a5801d449d35, exactprimarypath. Create successor in its localenvironment, no worktree/branchswitch. Userdidnotselectmodel/effort; omitoverrides. Permissionworkspace-write/auto-review. NewhandlerinspectGit+owntelemetry thencontinue; thishandlerstopsaftercreation.
