# Architecture review follow-ups — November 2026

Status: planned, 2026-11-10. Three implementation tasks selected at the owner's request; implementation is unstarted. [Task queue](../tasks/architecture-followups-2026-11/README.md).

Source: the owner-supplied `architecture-review-20261110-222813-196Z.html`, reviewing 20 October–10 November at `337ea75c`. The assessment was checked against that local HEAD and rechecked against fetched `origin/master` at `4d58732a`. The report's earlier scaling and paused-method defects are already repaired; they are evidence of maintenance friction, not newly reproduced bugs. This document retains the decisions and source evidence without depending on the temporary HTML file.

## Disposition

| Report card | Judgment | Intended work |
| --- | --- | --- |
| 01 Board units | Agree. Callers still choose dimensional scale factors despite existing conversion helpers and regression coverage. | First: one owner for board-unit projection across Orientation, Signed area, Notable points and Euler line. |
| 02 Chapter reading | Agree with a narrower scope. Two readers implement overlapping restoration schedules; their legacy visit responsibilities are different. | Third: shared reading restoration, with the existing legacy visit as a separate collaborator. |
| 03 Collision settings | Agree with a narrower scope. A method change can already trigger two rebuilds; snapshot matching by values does not identify the action being confirmed. | Second: authoritative applied settings and action confirmation at the existing worker seam. |
| 04 Preview destinations | No separate task now. The duplication is real, but the accepted registration work already addresses shared destination identities. | The projective-conics pilot in [lesson-authoring workstream 3](lesson-authoring-architecture.md#3-feature-local-registration) is implemented and accepted in [Controls step 9](../tasks/feature-streams/controls.md) as of `4d58732a`. Reconsider other families only when actual preview work needs them. |

The preview decision does not claim all duplication is already removed. Preserve the shared-route Coons ownership case, wrong-family rejection, retained-manifest protection, separate runtime/tooling loading surfaces and independent scene expectations in any later family migration. Do not reopen the accepted pilot or expand it into an all-family migration from this review.

## 1. Board-unit projection

### Evidence and scope

- [pointSetModel.ts](../../src/compgeo/pointSetModel.ts), `gridToBoard`, scales points but leaves derived quantities to callers.
- [OrientationGraph.tsx](../../src/graphs/compgeo/OrientationGraph.tsx) doubles the grid exponent before calling formatting helpers in [orientationReadout.ts](../../src/graphs/compgeo/orientationReadout.ts).
- [areaReadout.ts](../../src/graphs/compgeo/areaReadout.ts) publishes an `areaExponent` for consumers to interpret. Its board-lattice eligibility and Pick checks are mathematical policy and remain there.
- [notablePointsModel.ts](../../src/compgeo/notablePointsModel.ts) and [eulerLineModel.ts](../../src/compgeo/eulerLineModel.ts) each scale coordinates, lengths and squared quantities. Existing rational helpers do not hide which scale each quantity needs.

Concentrate dimensional conversion in a small pure module used by these four graphs and their readout/model adapters. Accept the grid step once per projection context and expose only the operations real callers need. Preserve exact integer/rational results until their existing drawing or formatting conversion. Keep predicates, family validity rules, board caps and localized formatting with their existing owners. A generic units framework or a wrapper that still makes callers double exponents would not meet the goal.

### Acceptance

- **B1:** The migrated consumers no longer compute dimensional scale factors or carry an area exponent into their formatting calls. Coordinate/length and squared/area scaling each have one implementation owner; list the removed caller rules in the completion evidence.
- **B2:** The same board geometry represented at grid steps 1 and 1/256 produces the same drawn points, centres, circles/radii, bounds and readouts in all four real graph hosts. Assertions require the expected objects to exist. Use independent expected values as well as cross-grid comparisons so a common wrong scale cannot pass.
- **B3:** Preserve exact signs and degeneracy decisions, rational centres and squared radii, and the existing rule that tiny nonzero values are never worded as zero. Preserve self-intersecting signed sums, label visibility, board caps, lattice markers and when Pick's theorem is withheld. [ADR 0021](../adr/0021-exact-grid-predicates.md) and [ADR 0030](../adr/0030-triangle-geometry-rationals-gliders-and-placement.md) remain authoritative.
- **B4:** Current Presets and grid exponent encoding retain their shape and behavior. Reset, Preset restore, synchronous lesson actions and language changes leave the board and readout consistent. Preserve the shared controls and settled live readouts now on master. No renderer or algorithm replacement, new dependency, or unrelated graph-family migration.

## 2. Applied collision settings

### Evidence and scope

[CollisionPlayground.tsx](../../src/learning/playground/collisions/CollisionPlayground.tsx), `onMethod`, sends `setMethod` and then `setCount` when a new limit lowers the count. [collisionLoop.ts](../../src/learning/playground/collisions/collisionLoop.ts) already clamps and rebuilds in `setMethod`; its `setCount` path rebuilds again. The view's `pendingAnnounce` identifies snapshots by optional method/count values, while [useCollisionWorker.ts](../../src/learning/playground/collisions/useCollisionWorker.ts) exposes raw snapshots and commands without an applied-action result. This is source-confirmed duplicate work; no new performance measurement is claimed.

Deepen that existing seam. The worker applies and clamps settings; the session distinguishes requested state from confirmed state and identifies which applied result completes a reader action. Use a bounded action/revision identity or an equivalent explicit acknowledgement; matching only method/count or the resettable step index is insufficient. Keep presentation formatting in the view. Do not add a general command bus, another worker, a physics rewrite or a parallel simulation state owner.

### Acceptance

- **C1:** A paused polygon run at 3,500 bodies switching from sweep to naive applies the 3,000-body limit with one world rebuild and no compensating count command. The control, readout and clamp explanation converge on the worker's applied result.
- **C2:** A snapshot queued before an action cannot confirm that action, including when it happens to have the same method/count. Rapid consecutive actions have an explicit policy: announce the latest pending user intent once when its result is confirmed; older results never complete or overwrite that pending confirmation. Background simulation frames produce no action announcements.
- **C3:** An in-limit paused method switch updates counters and confirmation without advancing the simulation, rebuilding the arrangement, or requiring Play/Step. Count, reset, step, coverage and bounce commands retain their current effects; any command covered by action confirmation is identified explicitly, not guessed from matching settings. Preserve master's pause-before-edit policy for method, count, coverage and new arrangement; an acknowledgement must not resume playback.
- **C4:** Canvas drawing continues to read the newest snapshot through the ref/subscription path, at its existing pace; high-frequency snapshots do not cause React renders. Preserve shared controls, `SettledReadout`/`LiveReadout` and their playback muting, readout throttling, automatic pauses, idle behavior, reduced-motion startup, worker failure handling and complete disposal.
- **C5:** Keep the measured workload limits, fixed simulated time step, separate worker and containment requirements of [ADR 0042](../adr/0042-collision-playground-worker-and-canvas.md) and the [collision spec](collision-playground.md#containment). Re-run representative containment and switch-latency measurements; retain the existing caveat that high coverage/bounce costs were not established by default-setting measurements.

## 3. Chapter reading restoration

### Evidence and scope

[ChapterPage.tsx](../../src/learning/ChapterPage.tsx) tries a guided bookmark, legacy visit and route invocation before a hash target, then typesets and may restore again; it separately tracks a section anchor across language changes. [FamilyChapterPage.tsx](../../src/learning/FamilyChapterPage.tsx) waits for typesetting, tries a bookmark once per pathname/hash, then scrolls to the hash. The shared [guidedExampleReading.ts](../../src/learning/chapter/guidedExampleReading.ts) and DOM functions in [navigationMemory.ts](../../src/learning/chapter/navigationMemory.ts) do not own this scheduling and precedence.

Make one reader module own restoration precedence, typesetting settlement, section-relative anchoring, focus and cancellation for both readers. A hook is sufficient if it removes the duplicated policy; do not create a pluggable navigation framework. Content/rendering, chapter ownership/lookup, lesson overlay navigation, graph checkpoints, native-history bridging and the legacy activity visit remain with their current owners. The Bézier reader may supply its legacy restoration/invocation fallback without the new module absorbing that session. Preserve master's `observeChapterInlineMath` setup/disposal after typesetting and its shared section permalinks; this work does not redesign math layout.

### Acceptance

- **R1:** Both readers delegate the shared restoration schedule. For a guided-example return, the applicable bookmark takes precedence over a hash; the legacy Bézier visit/invocation fallback retains its existing place before a plain section jump. An ordinary section navigation without a return restores the section heading. A fresh chapter without an anchor starts at its heading.
- **R2:** Final scroll and focus restoration happens after math settles, including a typesetting rejection. A late promise or animation frame from an old route, language or unmounted reader cannot move the current page or steal focus. Re-rendering alone does not replay restoration.
- **R3:** Switching language preserves the visible section and its relative reading offset, including when the URL still names a different section; it does not replay an example bookmark or jump back to the hash. Preserve meaningful focus, with a heading fallback if the original target no longer exists.
- **R4:** Real Bézier and family chapter routes retain direct section links, refresh, Guided example launch/return, Back/Forward and invoking-link focus. Unknown sections fall back to the chapter start under the [standalone-learning route contract](standalone-learning.md#urls-and-section-identity); preserve unrelated search/history state. Keep dedicated legacy-visit tests and chapter-owned session behavior from [ADR 0014](../adr/0014-study-chapters-share-demonstrations.md).
- **R5:** Reading memory stays visit-local; no stored progress or Preset writes. Route names and section identities stay unchanged. A small behavioral correction needed to meet the reading contract is recorded and covered by a failing pre-change regression; otherwise treat the work as consolidation, not a claim of a newly observed navigation defect.

## Execution and verification

The tasks are independent; the queue orders benefit and boundedness rather than introducing dependencies. Check active owners before changing shared PointSet controls or chapter files. Each implementation must remove the caller coordination it replaces, preserve existing useful tests and update the relevant architecture guidance when ownership changes.

Use focused unit/host tests first, then the repository's scoped verification and publication workflow. New behavioral regressions need observed pre-change or deliberate-mutation failure evidence. Use engineering review for the multi-file implementation, mathematical review for board projection, and UI/accessibility review for changed reading or control behavior. Use `$smoke-tester` for affected browser workflows; the task files name the coverage. Report incomplete coverage rather than assuming acceptance.

This planning change only checks source claims, local links, task/spec coverage and whitespace. It does not run or claim application, browser or performance acceptance.
