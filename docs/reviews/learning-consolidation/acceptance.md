# Learning consolidation acceptance

Status: local acceptance complete, 2026-10-26 12:30 UTC; master integration and hosted deployment checks follow. Source: [chapter-owned guided learning](../../specs/chapter-owned-guided-learning.md), confirmed 2026-10-26. Implementation uses the isolated codex/consolidated-learning worktree from dd7c414; unrelated primary-checkout work was preserved.

## Behavior and compatibility

Learn leads through eight bilingual chapters into one Guided example / Vodeni primer experience. The registry adapts six prepared Bézier activities, 78 family prompt/section rows, and all 45 authored multi-frame definitions. One LessonSession owns the graph checkpoint; the older ActivitySession is suppressed for these routes. Chapter links remember section-relative reading position and invoking-link focus in memory. Completion keeps the graph editable and offers Continue in chapter. Midway return, Exit, route departure and completed-example return restore the entry checkpoint and stop playback.

Canonical example identities and legacy chapter/activity, explore and learn=1 links select allowlisted shipped content with authored ownership. Existing graph routes and Preset schemas remain unchanged. Reload starts authored content; checkpoints, bookmarks and progress are visit-local. The observable compatibility change is a unified example panel instead of separate investigation/activity banners. Old activity-only Reset/Free exploration actions are replaced by the shared example controls and independent catalog exploration. Selecting the already-open graph in the picker preserves the active example and checkpoint.

## Acceptance mapping

| Criterion | Evidence |
| --- | --- |
| Chapters own every guided entry; one instructional surface/session | Registry ownership tests, chapter/workspace tests, [runtime review](final-runtime-review.md), [engineering review](engineering-review.md). |
| Short and multi-frame round trips, midway return, reading/focus | Chapter/bookmark unit tests and actual production browser round trips in [delegated smoke](production-smoke.md); automated standalone suite covers history Back/Forward. |
| Completion leaves graph editable, explicit continuation | GuidedLesson lifecycle tests and delegated completion followed by coordinate edit to -5 and Continue in chapter. |
| Catalog guidance, free exploration, legacy and canonical entry | Registry/resolver tests, automated unified/standalone/history suites, delegated catalog/free/direct/refresh checks. |
| Product-wide prompt/scene match | [78-row inventory](content-acceptance-inventory.md), [content acceptance](content-acceptance.md), 84 focused real-graph/resolver tests. Exact continuity, derivative, integral and arc-length starts asserted. |
| Spline worked join | Actual quadratic spline controls (0,0),(.5,0),(1.5,2),(2,4); span samples and join (1,1), first derivatives and one-sided second differences verified. [Independent mathematical review](final-math-review.md). |
| Safe restoration, graph editing, animation cleanup | Workspace/GuidedLesson tests, restoration contracts, delegated drag/slider/weight/PH editor and hide/reopen/Exit/playback checks. |
| Slovenian/English, keyboard, narrow/enlarged text | Delegated Chromium at 1440×1000 and 390×844/200% text plus automated bilingual chapter/lesson workflows. |

## Verification and repairs

Stable full unit run: **183 files, 3,657 tests passed**, 927.88s, log .command-logs/2026-10-26T12-00-10-452Z-73572-3635eb3a.log. Afterward a bounded picker fix removed the new same-graph close branch; its workspace unit tests passed. Final source typecheck passed in .command-logs/2026-10-26T12-02-32-618Z-95920-51681d85.log. Stable rebuilt production app after picker repair: .command-logs/2026-10-26T12-20-45-383Z-18200-b773d3cd.log. Existing dependency eval/bundle/timing warnings remain; no renderer or dependency migration occurred.

The first stable full browser run ended **235 passed, 7 failed** (.command-logs/2026-10-26T12-08-49-210Z-103128-524419ef.log). It exposed one implementation regression: picking the current graph closed its example. Removing that branch restored existing continuation semantics. Other repairs retained acceptance assertions while correcting stale completion/Exit semantics, renamed hide labels, full chapter-title matching, a missing evaluate argument, CSS escaping for dotted IDs, and an invalid plural spline URL fixture. Final rerun results follow below.

Observed-red evidence: [chapter checks](chapter-checks.md) documents a bookmark-restoration mutation; engineering review records pre-fix workspace overlap/restoration failures. [Content mutation log](content-mutation.log) preserves strict-route-guard red evidence. Earlier concurrent/mutation unit runs and builds invalidated by changing inputs are excluded from acceptance. The inventory labels were regenerated after the independent math review's artifact-staleness observation. The handler subsequently corrected the worked-join row to quote the runtime prompt override rather than the older family source prompt; the exact fixture and numerical evidence were already current.

## Limits

Delegated checks used headless Chromium on a local production preview; they establish neither physical-device/classroom behavior nor hosted Pages behavior. The full automated suite uses Chromium, including emulated touch. No broad claim about other browser engines is made. The spline coefficient-variation question remains learner exploration; base-join derivative claims are numerically verified. No required criterion has been silently waived.

Final local browser outcome: the full stable rerun passed 240/242 cases in 461.3s (.command-logs/2026-10-26T12-21-38-462Z-92348-b4b59f7c.log). Its two remaining test-only failures were corrected: exact full spline owner text and section-relative viewport offset (the former expression combined page scroll with viewport geometry). Keyboard activation avoids an automatic pointer scroll between the captured offset and launch. All six standalone chapter cases then passed in 22.6s (.command-logs/2026-10-26T12-30-08-965Z-20696-c74ed11f.log), covering both corrected cases, prepared geometry, short/multi-frame returns, completion/editing, narrow controls and legacy aliases. Thus all 242 cases have passing observations on the stable application; there was no single all-green local full-suite run. Final lint passed (.command-logs/2026-10-26T12-21-49-387Z-106680-154624cd.log); source typecheck passed again after the picker fix (.command-logs/2026-10-26T12-23-38-934Z-18652-40c8dc77.log). Final test-only metric/title edits receive a focused lint check below.

Focused lint for the final browser assertion edits passed: .command-logs/2026-10-26T12-31-32-783Z-4136-9193891a.log. Redundant completed handoffs and superseded transient run summaries were removed after preserving their unique findings and exclusions here and in the task evaluation record. Review reports, explicit mutation evidence and inspected production screenshots remain.
