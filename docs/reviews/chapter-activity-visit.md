# Chapter activity visit ownership

Implementation evidence for [task 01](chapter-activity-visit.md), from [architecture deepening, section 1](../specs/architecture-deepening.md#1-chapter-activity-visit-ownership).

## Ownership and compatibility

`ChapterActivityVisit` holds the visit's activity and ordinary graph snapshots privately alongside reading locations, predecessor/ordinary entry identities, return flags and retry operations. It coordinates launch, scene entry, capture before navigation, reset, ordinary restoration, free exploration and departure. The chapter and workspace use this owner; the hook supplies React lifecycle, router effects and error presentation. `navigationMemory.ts` retains browser reading capture/restore, native history writes and pure marker encoding/validation. `ActivitySession` still owns graph scene sequencing and rollback. The Pages redirect bridge is unchanged.

The deletion test is concrete: removing the visit owner would put snapshot writes, retry targets, predecessor policy, reading-return flags and ordinary/activity coordination back into the hook and chapter callers. These rules now share one implementation. The hook no longer imports the navigation-memory surface or holds session/active/failed/retry refs; chapter launch no longer sequences separate reading and invocation writes. No alternate router, renderer or generic adapter framework was introduced.

Routes, query/hash values, Preset formats and persistent storage are unchanged. Snapshots and pixel reading offsets remain memory-only. Malformed predecessor metadata is rejected; the authored chapter section remains the fallback.

## Acceptance evidence

| Criterion | Evidence |
| --- | --- |
| 1. One owner for snapshots and transitions | Private snapshot and navigation state in `ChapterActivityVisit`; chapter/workspace callers use its operations. No exported mutable scene maps remain. |
| 2. Navigation contract retained | Hook journeys cover actual history traversal, fresh-link return, Forward restore, reset, separate ordinary/activity state and free exploration. Browser evidence below covers real reading and board behavior. |
| 3. Validation and render stability | URL/marker validation journeys preserve unrelated query/hash values; malformed marker fallback and unrelated-render tests cover normalization without authored-scene replay. |
| 4. Failure and departure | Failed-start retry and restart marking, failed capture with retry, last-good scene after failed departure, ordinary retry closure disposal and unrecoverable rollback tests. Lesson-close failure retries the intended Return/read-about operation; throwing departure cleanup releases the owner without capturing a lesson scene. `ActivitySession` tests retain graph rollback checks. |
| 5. Visit locality and hosting separation | Checkpoints live only in private in-memory maps. Pages history bridge source is untouched; allowlist/redirect tests retain independent coverage. |
| 6. Consumer-interface tests and reduced coordination | Tests create an owner per journey and verify restored graph values through its caller interface rather than mutating exported maps. Chapter launch and hook transition coordination were consolidated as described above. |

## Verification

- Started with `just --list`.
- `just check`: TypeScript, all 149 unit files / 2,519 tests, and production build passed. After the final restart-marker effect dependency adjustment, the 36 focused tests in `useChapterActivity.test.tsx`, `ChapterActivityVisit.test.ts`, `historyEntryBridge.test.ts` and `DemonstrationWorkspace.test.tsx` passed again, followed by `just typecheck` and `just build`.
- The production build retains dependency Sass deprecations, large-chunk/direct-eval notices and plugin-timing output; browser logs have Node color-environment warnings. These do not fail the checks.
- Independent engineering and scene/mathematical reviews completed. The marker-validation finding was fixed and re-reviewed; handler review also added lesson-close failure cleanup/retry tests. No graph actions, mathematical evaluators or scene transaction implementation changed.
- Initial sandbox preview/browser attempts were stopped after loopback reachability failed; they establish no browser pass. The production preview and tests were then run outside the sandbox, with HTTP 200 confirmed before browser handoff.

The final production build passed 76 Chromium tests across `standalone-learning`, `history-entry-bridge`, `workflows`, `demonstrations` and `curve-ownership` (39.5 seconds of browser tests; runner log `.command-logs/2026-10-20T18-43-59-865Z-31244-84147eb5.log`). This includes all catalog graph routes, chapter authored scenes/round trips/Forward/reset/refresh, ordinary scene restoration, independent activity edits, query/hash preservation, simulated Pages redirects, language, Preset save/reopen and repeated main/PH auxiliary board disposal.

Manual smoke used the in-app browser against the handler-owned production preview on port 4301, HEAD `bd5f1fd` plus this task's dirty source. The final build was produced at 18:43:44 UTC. The worker spent about eight minutes, including setup, at desktop size and 390×844. Automated evidence supplied the route, Preset and repeated lifecycle baseline rows.

| Manual check | Observed result |
| --- | --- |
| Chapter Back/Forward, scroll/focus and board disposal, final build | Reading at `#control-points` had zero graph boxes. After dragging P1 and visibly changing the curve, Back restored the section/scroll and focused `#activity-shape-control`, still with zero graph boxes. Forward reopened the edited graph. |
| Free exploration and language, final build | Activity query context disappeared while the edited P1 remained; EN then SL retained the edit. |
| Guided lesson, final build | Reached observation, unlocked the graph, moved P1, continued and exited. The lesson closed and restored its entry scene. |
| Narrow layout and keyboard, final build | At 390×844, document width was 375px with no horizontal overflow. Enter selected `Krivulja1`; arrow keys switched EN and restored SL with visible focus. Graph and controls remained reachable. |
| Point/slider/rational controls, preceding build | P1 drag visibly changed the curve; De Casteljau parameter changed 0.50→0.51; rational weight changed 2.00→2.25 with a visible curve response. Later source changes affected visit failure cleanup/retry and restart marking; these graph/control implementations were unchanged. Final automated suites rechecked the routes and scene behavior. |
| PH auxiliary editor and discrepancy disposition | Auxiliary board and coordinate editor appeared; changing `w1 x` −2.6→−2.2 changed the curve. Two manually targeted drags had no visible effect. Handler follow-up used the actual second rendered hodograph point and confirmed dragging changes both `w1 x` and the main curve, once after scene restore and once on a fresh scene without saving/exporting. Both precise Chromium probes passed on the final build; no reproducible defect was found. Probe source/logs remain in `.command-logs/`; temporary test files were removed. |
| Errors and cleanup | Manual browser console warnings/errors were empty. Slovenian and viewport were restored, no manual Presets were created, the temporary tab was closed and the handler's preview was stopped. |

All six task criteria have implementation and verification evidence. Acceptance completed 2026-10-20 at 18:48:46 UTC. Browser evidence is local production-preview evidence, including a simulated Pages redirect; it does not claim a live GitHub Pages audit, physical-device testing or comprehensive accessibility review. No unverified task-specific history, reading-return or departure path is claimed as a pass; injected failures are covered by unit tests rather than browser fault injection.
