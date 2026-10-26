# Bézier patches handler handoff7 — 2026-10-26

## User stop and portable continuation

The user subsequently asked to push all current work with its handoff because usage is running low and work cannot continue on this PC. **Work is stopped; do not automatically start another chat or resume on this PC.** The successor chat confirmed it created no task07 edits, dependency changes, workers, servers or browser sessions. Tasks01–06 are committed and pushed; task07 has not started. Resume only when the user continues the work on the destination machine.

On the destination machine, clone/fetch `https://github.com/efodx/bezeg-2.0`, check out current `origin/master`, read this note and current AGENTS.md, inspect Git status, run `just --list`, then continue task07. Earlier handoffs are committed alongside this note as historical context; this note is the current entry point. Existing Windows absolute paths below identify the source checkout and must be adapted to the destination. Ignored `.command-logs`, installed dependencies and `.worktrees` are not transferred by Git; durable acceptance summaries, source, tests and renderer reports are tracked. Recreate a clean pinned dependency environment on the destination and rerun relevant checks. The rejected root reinstall described below applies to the existing source-PC environment; it must not be retried/bypassed there. Do not assume that its isolated `.command-logs/patches-acceptance` environment exists on another machine.

## Objective and checkout

Continue the user's authorized objective: finish `docs/tasks/bezier-patches` in chosen order, using fresh successor chats as needed. Current AGENTS.md applies. Same primary checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, master HEAD/origin/master **90367a9**. Standing authorization covers implementation delegation, commits, fast-forward master push and successor chats. Do not stop at a plan. Old handler stops after confirmed successor creation.

Tasks01–06 complete. Start **07 surface adapter/tensor workspace**, then08,09,10,11,12,13,14 per index. No production patch route or Three dependency has shipped. ADR0018 accepted Three lazy-loaded only for patch views; do not reopen renderer investigation without a concrete defect. [Handoff6](handler-handoff-6.md) contains exact renderer measurement/probe limits and environment history if needed; normal next work should read task07/spec/ADR and accepted geometry evidence rather than huge raw matrices.

This phase pushed two separate commits after fetch/no-op rebase:

- **22fd5ea** — exact tensor-product geometry, shared patch interface, property/cache tests and independent review evidence.
- **90367a9** — canonical triangular geometry, scheme-derived subdivision, curved tensor cross-check, boundary roundoff repair, property/cache tests and acceptance evidence.

Only pre-existing untracked `.worktrees/`, old worker/handoff notes, and this new handoff remain. Preserve them. No owned server/browser/process remains. All workers finished, and watcher terminal events were consumed.

## Geometry now available

`src/bezeg/api/patch/bezier-patch.ts`: shared eval/partials/normal/boundaries/mesh/bounds interface. Mesh carries points, parameter pairs and explicit indexed triangle faces. Tensor uses two interval counts; triangular requires omitted/equal second count. Bounds enclose control nets. Geometry has no renderer/React imports.

`src/bezeg/impl/patch/tensor-product-bezier-patch.ts`: bi-degrees1–4, net[i][j] where i=u,j=v; evaluate rows in v, then in u. Both exact two-stage and generalized direct bilinear recurrences expose schemes. Direct recurrence performs min(m,n) simultaneous2x2 reductions then univariate remainder, including nonsquare nets. Boundary order u0,u1,v0,v1; isoCurveU fixesu and variesv. Exact first/second partials, twist, normalized `S_u × S_v`, per-direction subdivision/elevation, meshes/bounds. Finite tensor parameters allow extrapolation; bounds are valid on unit square. Zero/nonfinite normals throw. Issued boundary/iso curves snapshot net references and remain live to edits of those points; net replacement requires new curve objects.

`triangular-bezier-patch.ts`: degrees1–4 in descendingi then descendingj canonical order, k=n−i−j. A=(u,v,w)=(1,0,0),B=(0,1,0),C=(0,0,1). Full barycentric scheme, exact derivatives/normals/elevation, boundary curve objects A→B,B→C,C→A, explicit lattice mesh. Subdivision reads scheme levels into children(A,B,P),(B,C,P),(C,A,P). Child maps are documented in [acceptance](triangular-geometry.md). Edge/vertex subdivisions explicitly throw (collapsed-child policy). Boundary evaluation accepts tiny sum overrun≤8ε and normalizes u,v onto edge; larger overrun/negative inputs reject. Partials use same canonical triple. Both halves of curved tensor S(x,y)=(x,y,xy) cross-check against quadratic triangles.

Both patch types have complete point/version/structural/density cache dependencies, volatile-point bypass, defensive eval/mesh/bounds outputs, bounded LRU128 evaluations/4meshes, safety cap256 intervals per edge. Defaults for actual UI remain8/optional16 per ADR; cap256 is an allocation bound, not a UI option.

## Review and final checks

Independent math and engineering reviews completed for both tasks; handler verified local repairs and ran final checks. Evidence: [tensor-geometry](tensor-geometry.md), [tensor-engineering-review](tensor-engineering-review.md), [tensor worker](tensor-geometry-worker.md), [triangular-geometry](triangular-geometry.md), [triangular worker](triangular-geometry-worker.md). Evaluation records appended for05/06, committed with each task.

Tensor review repairs: generalized recurrence initially only2x2; fixed per source. API initially tuple4 boundaries; changed variable-length for triangle. Tests added partition reproduction, second partial/twist finite differences, explicit nonsquare intermediate scheme and positive face winding. Cache review caught mutable cached eval and unbounded caches; defensive copies/LRU/cap repaired. Four baseline cache failures genuine. Fifth alleged tracked-edit failure was a fixture with coordinate-derived versions masked by structural version; replaced with real PointImpl globally monotonic stamps. No production invalidation defect claimed and no corrected-fixture baseline rerun. Final primed cache tests pass. Don't repeat that evidence mistake.

Triangular repair: strict `1-u-v<0` rejected valid(.8,.2)/mesh5. Handler/reviewers caught it, worker reproduced both actual pre-fix failures, applied narrow8ε sum handling and canonical derivative triple.99,456 edge triples with eval/both partials across densities1–256 pass; actual meshes5/6/8/10/16/256 pass. Handler enumeration found232 affected densities before fix; reviewer incorrectly included256, corrected in acceptance. Full-edge curve comparisons, cross-density output and primed NaN/Infinity edit rejection added.

Final handler checks on stable base22fd5ea+task06 source (now90367a9): **just unit src/bezeg:233 tests/15files pass**, **just typecheck pass**, **just lint src/bezeg/impl/patch pass**, whitespace pass. Logs are in triangular acceptance. Previous05 final221tests/14files also passed. Existing kernels/curve expectations unchanged. Independent Bernstein/coefficients/finite-difference tolerances and meaningful mutations recorded; +1 triangular recurrence failed7tests, tensor transpose/flipped face rejected. No browser/build was required or claimed for geometry-only changes. C1 join derivative tests remain task10; P5 is not globally complete until those pass.

## Environment and task07 constraints

Root installed JSXGraph1.9.2 differs lock1.14.1. **Earlier root npmci automatic-review rejection MUST NOT be retried or bypassed.** No install attempted this phase; all geometry tests import no JSXGraph. Approved isolated `.command-logs/patches-acceptance` has pinned1.14.1 and Three vendor from prototype. Task07 must inspect current environment and use an approved isolated dependency workflow for pinned production Three/package-lock work; don't silently certify root's invalid dependencies. Copy changed sources there by ABSOLUTE path as needed. Loopback previews/Playwright must run outside sandbox from FIRST attempt. No owned preview currently running.

Task07 is large: read task/spec/ADR and split bounded slices with one owner for shared graph/session interfaces. Requires pinned lazy Three dependency; plain scene attach/reconcile/onEdit/dispose; owned resources/async cancellation; authoritative synchronous scene store (no graph-field mirrors); new patch-tensor route/Presets with validated additive DTOs; numericxyz/index selection, pointer/touch horizontalXY or z-only with fixed camera; square inset/keyboardu/v; reset/camera/visibility controls and bilingual keys; narrow responsivefit of defaultnet; MathJax label SVG/PNG export via raster geometry+vector labels; old curve routes/Presets/imports preserved; actual-geometry/lifecycle mutations; full smoke via skill; production budgets defaultiso8/tiling8 and optional16. ADR contains60ms drag next-rAF p95,16.7ms orbit,50ms active-frame targets and separate input-to-visible evidence. Earlier continuous rAF series included host-write gaps and cannot certify active budgets. Do not relabel next-rAF proxy as visible presentation latency.

Use impeccable as task07 requests; follow any applicable prototype/design workflow. Existing approved renderer prototype is reference, not production implementation. Full justcheck + transient/Presets tests, engineering/UI/accessibility review, smoke and production measurements are mandatory for07. Update architecture/capabilities/UI guidance. See task08–14 for remaining routes/content/runtime; no need to preload them all.

## Context and continuation

Handler start34743/latest139487input before note; fresh handoff at this completed geometry boundary rather than start task07 with≈10k budget left. Implementation05 watcher111888 then132340; math63965, engineering87518, cache64312/65737. Implementation06 watcher91097 then105743; math65520,engineering70317. Observed samples, not proven peaks or cumulativeusage. All terminal events consumed. Skills already used in old chat: subagent-flow-evaluation for records. Workers requested Luna/high per workflow, fresh contexts. No user model override. Keep workspace-write/auto-review.

Saved local projectBezeg id6466c495-4851-4845-83b4-a5801d449d35 verified exact checkout. Successor should run selfcheck/justlist/Gitstatus, then continue07 implementation under existing authorization. No further permission needed for objective/delegation/commits/masterpush/successor. Follow context thresholds150k/190k and create next fresh chats as needed.
