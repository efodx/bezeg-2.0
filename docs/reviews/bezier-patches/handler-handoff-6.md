# Bézier patches handler handoff6 — 2026-10-26

## Objective and checkout

Continue the user's authorized objective: finish `docs/tasks/bezier-patches` in chosen order, create later bounded tasks after the renderer ADR, and use fresh successor chats when needed. Current AGENTS.md applies. Same primary checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, master HEAD/origin/master `2767125`. Standing authorization covers implementation delegation, commits, fast-forward master push and fresh successor chats. Do not stop at a plan.

Tasks01–04 are now complete, including renderer task02. ADR0018 selects Three for patch views. Production tasks05–14 were created and reviewed. Start05 tensor geometry next, then06,07,08,09,10,11,12,13,14 as the task index says. No production surface route has shipped yet. Do not reopen the completed renderer spike without a concrete new defect.

This phase pushed two logically separate commits after fetch/no-op rebase:

- `37707a6`: actual visible-owner measurement probes, completed measurements, focused JSX confirmation, non-vacuity and review evidence.
- `2767125`: accepted ADR0018, tasks05–14, spec/index status updates and evaluation record.

Only pre-existing untracked `.worktrees/` and older handoffs remain, plus this handoff. Preserve them; none were staged. No owned process, browser or worker intentionally remains running.

## Renderer decision and evidence

Read `docs/adr/0018-three-surface-view-adapter.md`, `docs/reviews/bezier-patches/renderer-measurements.md`, and the next task's relevant spec before implementation. Raw matrices are huge; use summaries/targeted JSON queries only.

- Corrected Three run `matrix-owner-2026-10-26`:144 records,112complete (96 tensor/triangle cases+16actual32-patch teapot orbit),32explicit inapplicable teapot drag/UV skips,0failures.
- Separate JSX teapot `teapot-jsx-2026-10-26`:48records,16complete orbit,32skips,0failures. Existing96 complete JSX patch records from the old matrix remain useful; JSX source is unchanged.
- Config iso8/16×tiling8/16,desktop1440×1000/narrow390×844,2repeats×8inputs,Chromium156.0.8078.4,JSX1.14.1,Three r180. Teapot has no iso families; repeated iso settings are repeated workloads.
- Three source hash `0d5354cfd0c81c1f230a4bb3c09a0875b17ade62faea4ea6518554b48befba1f`, JSX `9038ca9671a2d90a36069714fd8fb187c657ba10aad5766dc988bf9e443e6f07`. Source commit37707a6. Measurement metadata records basee044790+dirty exact hashes. Harness convenience trace correction happened after timings and is explicitly disclosed.

Root causes: hidden/occluded label rectangles caused zero patch sampling; narrow tensor point0 projects x≈400.3 outside390px viewport and old drag used(0,0). New Three diagnostics use actual owned camera/control rays, canvas hit, frustum and surface/control occlusion. Drag selects first visible exact owner, asserts exactly that one net index changes and camera stays fixed. Narrow tensor selects index1 vs JSXindex0; no strict point-for-point renderer speed ratio. Surface probe compares actual owner-visible vs owner-hidden pixels and restores visibility in finally. It requires actual mesh counts and projected surface ray ownership, independent of labels/color thresholds.

The original192-case failed matrix remains unchanged, as do two later Windows file-output aborts. Final run recovered41 Windows UNKNOWN writes through a bounded specific-error retry; unrelated errors and exhausted retries still throw. Continuous rAF tails include host-write/retry gaps and cannot establish active-frame budgets. Event→next-rAF is a proxy, not compositor/visible latency. Headless narrow emulation is not physical-phone evidence.

ADR chooses Three lazy-loaded for surfaces, JSX remains existing curves/separate parameter board. Defaultiso8/tiling8;16explicit option. Typed plain scene/interface attach,reconcile,onEdit,dispose; exact XY horizontal-plane/z-only rule with fixed camera. Canonical triangular lattice and three iso families. Teapot32feasible at tiling8 (4096triangles);16optional stress(16384). SVG embeds raster geometry plus vector labels, preserving depth but not editable surface paths. MathJax labels, keyboard sliders, numericxyz/index selection, responsive fitting of defaultnet, Presets, synchronous scenes and production budgets remain acceptance work in07–14. Optional standalone patch-compare route is omitted in favor of08 comparison view; no existingroute changes.

Prototype rejected-candidate limits remain: JSXPNGtaint,touchzXYdrift,listener growth,unaccepted four-viewdepth. Handler's focused `verify-jsx-final.mjs` now proves all64actualSVGpolygons change before pointerup and all32teapotowners agree with independent fixtureBernsteins to8.88e-16; screenshots inspected. Initial verifier incorrectly treated homogeneousFasaffine, caught nonfiniteerrors and was corrected toX/Y/Z; rawfailure kept.

## Review and verification

Implementation worker finished; handler repaired teapot centroid accidentally readinggetXforeachaxis and checked correctXYZcentroid independently withinFloat32tolerance. `verify-three-probes.mjs` passes currentmesh differential and rejects deliberate no-opmesh-hide mutation. Boundedwrite retry fault injection passes recovery/exhaustion/unrelatederror/platform assertions.

Independent engineering/spec review found one low-severity trace issue: `samples[].state` usednet0 when selectedtarget1. Handler source now usesstarted.expectedPointIndex; focused actual-source expression check passes and restoringoldexpression giveswrongcoords. Rawtimings unchanged: rawInputToNextRaf containsfullnet and finalexpectedindex checks arecorrect. Report explicitlydiscloses misleading oldconveniencefield. Reviewer found no material ADR/taskoverclaims. See renderer-closeout-review.md.

Handler reran `verify-three-export-depth.mjs`, `verify-three-lifecycle.mjs`, `verify-fidelity.mjs`, `verify-teapot.mjs`:allpass. Four edited/newscript syntax checks, whitespace and114localMarkdownlinks pass. No broad appbuild/smoke required or claimed for prototype-only changes; current source diagnostics do not alter normal scene behavior. Prior delegatedsmoke partial/stall limits remain historical; don't relabel them. Production07 and11 requirefullsmoke as scoped in tasks.

## Environment and process ownership

Root installedJSX1.9.2 remainsinvalid for lock1.14.1. Earlier rootnpmci automaticapproval rejection MUST NOT be retried/bypassed. Approved isolated `.command-logs/patches-acceptance` has pinned1.14.1 andThreevendor. Copychangedsource by ABSOLUTEpath there. Its measure.mjs is current except the post-timing selectedpoint trace expression; recopy if used. Handlernewverifiers are copied. No dependency install this phase.

Run loopback/Playwright outside sandbox fromFIRSTattempt. SandboxedChromium pathdoesn'texist. Preview was port4181 fromisolatedroot, workerPID89052; handlerverified nodecommandserver.mjs then stoppedthatPID. All Playwrightcontexts closed, matricesdone. Bothworkersfinished and watcherevents consumed (implementation22476,review22255); timing exec7497/9552finished. No serverneedsreuse. Non-escalatedGit staging initially hitindexlock permissiondenied; normalrequire_escalated Git succeeded. There was no new auto-review rejection to bypass.

## Next steps

1. At task start runhandler selfcheck and `just --list`, inspectGitstate. Read05 and relevant specgeometry section; inspectexisting kernel/Point seams withsearch. Delegate boundedtensorimplementation perworkflow (worker ownsmodules/tests, nofurtherdelegation/commits). Mainowns scope/review/verification/commits/push. Later mathematical review must be independent of new mathematical implementation.
2. Execute05–14 in specified order; do not silently waive geometry properties, derivativejoinconditions, Presetvalidation, MathJaxexport, responsivefit, synchronouslessonstate or productionperformance checks. Use each task's evidence path and bounded slices.
3. Task07 adds actualproductionThree dependency/adapter/firstroute separately; rendererADRdidnotmutatepackage/routes. Respect rootdependencyrejection and approvedisolatedverification process. Preserve othercurvefeatures and oldPresetfiles.
4. Continuefreshchats at150khandlerinput; collectat190k. Do not retain this oldhandler'slonghistory viafork.

Handler start31683input, crossed150k at154979 duringcloseout; latest observed165610before thisnote. Implementation watchercompletion132130input, reviewer69800; not provenpeaks/totals. Evaluation loggedwithbrief/repairs/envlimits. SavedprojectBezeg id6466c495-4851-4845-83b4-a5801d449d35 verifiedexactcheckout. Omit model/effortoverride for successor(userdidn'tchoose); retainworkspace-write/auto-review. Oldhandler stops immediately after confirmedsuccessorcreation.
