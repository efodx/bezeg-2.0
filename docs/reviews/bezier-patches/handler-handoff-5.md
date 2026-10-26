# Bézier patches handler handoff 5 — 2026-10-26

## Objective and checkout

Continue the user's authorized objective: finish `docs/tasks/bezier-patches` in chosen order, create subsequent bounded implementation tasks after the renderer ADR, and use fresh successor chats as needed. Follow current AGENTS.md. Same primary checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, master. User standing authorization covers delegation, commits, fast-forward master push and successor chats. Task01/03/04 complete; task02 partial; no renderer selected or dependent tasks created.

HEAD/origin/master `e044790`, pushed after fetch and no-op rebase. Three commits this phase:

- `fcd3ed0` batch JSX parameter construction, A/B verifier and evidence.
- `d684284` Three label occlusion and mixed raster/vector exports, diagnostics, verifiers and browser evidence.
- `e044790` full matrix attempt, honest failures and task/evaluation updates.

Only pre-existing untracked `.worktrees/` and older handoffs remain, plus this note. Preserve them. No production route/dependency/package/lock change. No deployment acceptance claim.

## Read first and current blocking evidence

Read `docs/reviews/bezier-patches/renderer-matrix-attempt.md` and `matrix-attempt-2026-10-26/summary.json` FIRST. Do not print the whole raw matrix: it is116k lines. Query specific cases from `measure.json`.

The full exclusive192-case matrix completed within600seconds with exit1 and56 failed checks. Config: both renderers, tensor/triangular, iso8/16 × tiling8/16, desktop1440×1000/narrow390×844, drag/orbit/uv, two repeats × eight inputs. Chromium156.0.8078.4. All96 JSX cases complete;40 Three cases complete;56 Three cases failed. No hard timeout.

-8 Three tensor narrow drag cases: expected point0 did not move, camera fixed, positive patch pixels.
-48 Three triangular cases (all gestures/densities/viewports): patch-pixel probe records zero sampled/interior pixels;47 had changed interaction state, one also did not move expected point.
- These are unresolved non-vacuity failures, NOT evidence of an empty rendered patch or established renderer incapability. New label hiding can invalidate label-based targeting/sampling. Diagnose tiny actual-owner probes before any fix. The report preserves the failed attempt; do not overwrite it or use failed-run timings as accepted comparisons.
- `measure.mjs` currently targets control label1 for Three drag and samples WebGL near the `P(u,v)` label. Hidden labels have zero bounding rect; whether this explains each failure still needs actual browser proof. Narrow point targets may need scroll/visibility/ray-owner evidence. Record all net deltas, actual pointer hit, target style/rect/projected center, camera and rendered mesh evidence. Never weaken the nonempty owner/geometry assertions to make the matrix pass.

Next bounded slice should diagnose and repair measurement targeting/probe assumptions if confirmed, or actual source behavior if reproduced. All192 records retain per-case served/local asset hashes and raw samples. Base metadata is fcd3ed0 plus pending Three source; exact source became d684284. JSX1.14.1 and Three r180 asserted. Headless/rAF/host-write and API-work-path caveats remain; no budgets or speed ratio accepted.

## Accepted new progress

`jsx-batching.md` plus artifacts: fixed baseline0ec2f8f vs candidate, same tensor/triangle mesh iso8/tiling8, one warmup/three measured changes. Median3419.5→87.1ms tensor,1541.9→55.3ms triangle. Tracked board calls63→3 and43→3. Actual owning board construction point agrees with independent Bernstein math, rendered owner primitives present, object counts stable. Handler inspected both screenshots and retained the single suspend/try/finally/unsuspend candidate. This is a tiny API comparison, not interaction/renderer acceptance. Existing inset outline/marker and readout inconsistencies are explicit; no new repair attempted. JSX actual32teapot and corrected live triangular mesh response still need focused browser confirmation; old PNG taint/touchzXY/listener failures remain.

`three-touch-target.md`: old combined triangular test was not z drift. After point1(index0) mouse edit and point2(index1) XY touch +58,+20px, the next ray hit nearer index5. Only5 changed in z, exact fixedXY/camera; tensor sequence edits1 correctly. Old test inspected only1. Raw all-net deltas/ray hits/projections retained. `diagnose-three-touch.mjs` is a historical source-instrumented probe; its original targeting assumes labels now intentionally hidden, so adapt rather than blindly rerun. Its extra constraint assertion was added after the retained old-source run, explicitly disclosed.

`three-export-depth.md`: new shared cached label projection/frustum/raycast visibility against actual surface meshes and other control spheres; owner sphere excluded, fixed0.12world-unit tolerance documented. Invalidation camera/model/resize/labels; disposal clears cache. SVG embeds current WebGL PNG scene and visible SVG text labels. Geometry is raster inside SVG, not editable vector paths; this is an explicit tradeoff and contract does not demand pure-vector geometry. PNG/screen/export share visible labels. Prototype labels are plain text; production MathJax is later adapter work. Three source SHA `4a88d4443ffdbdb88154f624033fa37d507e990f15f16575ded40e84a2c4341b`.

Implementation browser and handler rerun passed tensor/triangle × four presets:8 SVGs decoded with exact canvas byte equality, SVG text equals visible labels;8 PNGs decoded with geometry; overlap label hidden; another visible target XY→z fixed camera. Handler inspected tensor-isometric, triangle-top and triangle-isometric exports. Durable implementation and handler artifact folders linked in reports.

Independent engineering/spec reviewer found no actionable current-source issues; focused verifier mutations fail when occlusion/visibility filtering removed. Handler reran export/depth, lifecycle, fidelity and teapot verifiers after push: ALL PASS. Syntax and whitespace checks pass. No broad application build/suite required for docs prototypes. Two mistaken handler verifier filenames were corrected; actual scripts are `verify-fidelity.mjs`, `verify-teapot.mjs`.

## Smoke limitation and environment

`three-export-depth-smoke.md` preserves delegated partial coverage and handler fallback. Worker tried sandboxed Playwright (absent sandbox Chromium) then IAB download wait stalled314.9s despite nominal10s. Handler interrupted at bounded~10min; corrective guidance was queued behind tool wait. Worker returned readiness/visual only, no files. Browser inventory became empty, helper never launched Chromium and exited. Handler separately ran existing implementation verifier outside sandbox and inspected export: all8+touch passed. This reused worker-authored oracle, not independent test authorship. Do not relabel delegated smoke a pass. Keyboard/narrow/remount browser checks were not repeated after depth fix; earlier report plus current lifecycle tests retain their limits.

Root installed JSX1.9.2 remains invalid despite lock1.14.1. Prior root npmci was auto-review rejected. DO NOT retry/bypass. Approved isolated `.command-logs/patches-acceptance` has pinned1.14.1 and Three vendor files. Current isolated prototype.js,three-prototype.js,measure.mjs are absolute-path copies of current sources. No dependency mutation needed.

Run preview FROM isolated root: `BEZEG_SPIKE_PORT=4181 node docs/prototypes/bezier-patches/server.mjs`. Run all loopback/Playwright outside sandbox from FIRST attempt. Sandboxed browser path resolves under sandbox.*AC and doesn't exist; unsandboxed `C:/Users/NonFriedMotherBoard/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe` exists. Run JSX measurement FROM isolated directory so pinned dependency hashes match, using absolute root output folder. Recopy changed files by absolute path. Serialize browser/timing/builds/tests.

## Remaining order

1. Diagnose the56 matrix failures with tiny exact-owner probes, repair bounded measurement/source slice based on evidence, then rerun affected cells. Preserve successful JSX data and failed raw matrix; record source/revision changes and compare appropriate populations only.
2. Focused JSX corrected triangle/actual32teapot confirmation and pass/fail/disposition of known rejected-candidate gaps. Avoid endlessly productionizing a throwaway rejected renderer. Keyboard parameter entry needs explicit renderer-decision vs later adapter acceptance disposition; plain DOM sliders are product contract, current prototype inset lacks them.
3. Exclusive actual32teapot orbit measurements for both renderers at required densities and desktop/narrow, with incremental bounded output; teapot drag/uv legitimately skipped. Defaults/iso applicability must be honest (teapot currently no iso families).
4. Resolve any remaining chosen-renderer must-have, then next-free ADR0018 with measured alternatives, adapter attach/reconcile/onEdit/dispose, z rule, triangle path, budgets/defaults/teapot feasibility and explicit export tradeoff. Link spec/evidence. No ADR yet.
5. Only after ADR create subsequent bounded tasks for geometry, adapter+tensor,triangle,remaining demos,chapter/lessons/previews,acceptance, then continue authorized implementation.

## Process and context closeout

Preview exec67099 stopped Ctrl+C. Matrix exec69515 completed exit1 with192 records. Handler fallback browser exec51701 completed exit0 and closed contexts. All source workers/reviewer/smoke returned; no owned server/browser/worker intentionally running. Watchers54985/27267/37565/17566 consumed completed; smoke60330 consumed idle event90283, worker subsequently returned partial. No orphan task helper found by scoped process search. IAB inventory empty after stalled tool abort.

Handler start38193input; crossed150k at150604 after matrix preservation, no new slice started. Latest closeout154149 before this note. Worker completion observations JSX91117,Three123207,reviewer56355; smoke90283idle, not proven peak/total. Evaluation logged with brief/repair/environment limits. Fresh successor local project verified `Bezeg` id6466c495-4851-4845-83b4-a5801d449d35 exact checkout. Omit model/effort overrides (user did not choose). Retain workspace-write/auto-review and routing; no additional permission needed. Old handler ends after confirmed creation.
