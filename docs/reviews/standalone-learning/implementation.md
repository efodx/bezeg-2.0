# Standalone Bézier pilot implementation evidence

Date: 2026-10-20. Source: [implementation handoff](../../tasks/standalone-learning/implement-bezier-pilot.md) and [parent specification](../../specs/standalone-learning.md). Implementation base: `d29cd32814c53534f86f450ff25f5f1b7bf39255`; checks below exercised the dirty pilot checkout. Unrelated staged planning documents and `debug.log` were preserved.

Code commits: `400091c` (graph/session seam) and `3f9f074` (chapter/navigation/UI). The fetched `origin/master` remained the implementation base, so the commits already form a fast-forward history without rebasing unrelated work.

## Delivered behavior

Learning and Demonstrations remain separate header destinations. The static bilingual chapter has eight stable section IDs and six graph-free mathematical activity previews. Six activities reuse four existing graph classes and inspectors. No backend, dependency, preset format, graph route or mathematical evaluator migration was introduced.

The typed activity registry owns demonstration/section identities and authored actions. Graph-owned checkpoints include geometry, parameters, construction options, viewport, selection/editing mode, display size, axes and point-label preferences. Activity snapshots and ordinary exploration snapshots live in separate visit-memory maps. A versioned history marker contains validated IDs and entry/predecessor metadata, never graph data. Refresh starts the authored scene; meaningful reading section/focus recovery survives activity refresh while pixel offsets and edited geometry remain visit-scoped.

Activity return, Back/Forward, explicit Reset, ordinary related-reading restoration, scene adoption for Free exploration and Guided lesson suspension use the shared graph owner. The host closes a lesson and captures a paused activity before disposing the board. Preparation/restore failures roll back; unrecoverable owners are disposed. Departure capture failures preserve the last good snapshot and show an app-level notice on the destination.

## Review and repairs

Independent source mathematics review found no mismatch between bilingual copy, the six scene contracts and sampled previews. Exact examples remain distinct: ordinary cubic midpoint `(-1/2,7/8)`, quartic midpoint `(0,7/4)`, quadratic Bernstein midpoint weights `(1/4,1/2,1/4)`, and affine cubic midpoint `(3/8,0)` translated by `1/2` to `(7/8,0)`. This is agent source review, not owner terminology/content approval.

Independent engineering review identified history metadata/fallback and operation-specific retry gaps. The implementation now retains validated predecessor metadata across reload, arms a section/focus fallback before departure capture, isolates activity invocation memory, gates ordinary restoration to explicit/known returns, retries the failed operation and disposes an owner if rollback fails.

Browser verification found and repaired:

- De Casteljau Reset could evaluate an auxiliary whole-curve plot during source replacement and roll back to the edited parameter. The graph removes that plot before reconstruction and reconciles it after checkpoint restore/typed visibility actions, including synchronous true→false→true transitions. A real-graph regression checks parameter/readout and stable curve counts after reopening and Reset.
- Long inline MathJax and section headings overflowed at 390px/200% text. Scoped wrapping and local math scrolling repair this. A later top-of-chapter Slovenian check caught long title words as well; heading wrapping and a bilingual, fully typeset top-of-chapter regression now cover that case. Wide display math remains inside its labeled local scroll region.
- Reading inherited the app's navy background with dark green text. Reading and index now use the warm workspace canvas; independent browser measurements confirmed `rgb(244,240,223)` background and `rgb(36,59,43)` text.
- Existing curve test doubles needed selection methods and the board's `fullUpdate` method after checkpoint coverage expanded. Assertions were retained.

## Acceptance mapping

| Requirement | Evidence |
| --- | --- |
| Eight bilingual sections, six activity identities, delimited notation, exact examples | `bezierChapter.test.ts`, `activities.test.ts`, independent source review |
| Authored scenes, synchronous preparation, independent snapshots, paused capture, reset and rollback | `ActivitySession` tests; real-graph `ControlsFollowGraph.test.tsx`; six production activity rows |
| Entry/return, actual Back/Forward, refresh, section/focus restoration | `useChapterActivity.test.tsx`; six production rows; refreshed no-hash chapter launch row |
| Ordinary related reading remains separate from activity edits | Unit history tests and production keyboard-coordinate edit/return test |
| Free exploration and invalid/missing/mismatched/duplicate context | Unit validation and scene-adoption tests; production query/hash preservation test |
| Guided lesson exclusive scene ownership | Existing lesson suite plus production activity→lesson→Exit→reading/reopen test |
| Bernstein degree/stacked reset and affine transform | Production controls and exact translated control coordinates |
| Unknown chapters/sections | Recovery view and canonical chapter-start browser row; unknown chapters retain one language selector |
| Language switching, narrow reading/activity layout, keyboard and Presentation | Automated activity/lesson coverage and [independent browser report](browser-smoke.md) |
| Existing catalog, families, presets, import/export and lessons | Full production browser regression and independent baseline report; see final command results below |

## Commands and stable-build evidence

- `just --list`: used to select repository commands.
- `just check` passed: **147 files / 2,507 unit tests**, TypeScript and production build. Log: `.command-logs/2026-10-20T15-27-22-231Z-7648-59a7da3e.log`. The final family-label mapping and title-only UI verification also passed `just typecheck`.
- `just build` at 17:28 local passed with provenance recorded after all runtime writers stopped. Log: `.command-logs/2026-10-20T15-28-31-520Z-20108-d4222a0d.log`. Existing bundle-size and JSXGraph `eval` warnings remain.
- `just smoke-built --port 4301 --workers=3`: **229 production browser tests passed**, covering all existing routes and lesson rows, presets, languages and workflows. Log: `.command-logs/2026-10-20T15-21-49-999Z-21404-d621e2d7.log`. This build preceded only the final title-wrapping/family-label correction and failure-section fallback ordering; affected paths were rechecked below and by focused unit tests.
- `just smoke-built tests/standalone-learning.smoke.spec.cjs --port 4301 --workers=3` on the final 17:28 build: **13/13 passed**, including all six activity round trips, actual De Casteljau board coordinates, independent keyboard-edited scenes, lesson suspension, both languages at the chapter top at 390px/200% after typesetting, existing family identity, and unknown-route recovery. Log: `.command-logs/2026-10-20T15-28-38-345Z-8860-62945c19.log`.
- Supplemental isolated Playwright file-exchange check on the final preview passed: an activity's keyboard-edited `(-5,-3)` control was saved as a temporary preset, exported to `presets.txt`, imported into a fresh browser context and restored with matching board coordinates. An unsupported JSON file was rejected with an actionable message before the valid import. Both isolated contexts were closed. Local harness: `.command-logs/verify-pilot-file-exchange.cjs`; an initial harness assertion used the wrong pre-existing preset key and was corrected to `preset-bezier-curve` without an app change. Existing full-suite batch-export tests also download and inspect generated PNG figures and restoration of the graph owner.
- A restricted-shell full run stalled and restricted preview sockets were unreachable. Elevated local verification resolved those environment limitations; initial blocked checks were not counted as product failures. A later `just check` passed its type/unit/build phases but refused provenance because the final not-found styling changed during build; the stable standalone build above superseded that artifact.

Screenshots and independent browser details are linked from [the browser report](browser-smoke.md). Local production preview results do not establish deployed GitHub Pages behavior.

## Hosted verification and redirect repair

The first publication through `7f6dc30` passed [Browser smoke run 39449383116](https://github.com/efodx/bezeg-2.0/actions/runs/39449383116) and deployed Pages. Live verification passed Learning discovery, all eight sections, section deep links, all six direct activity links and refreshes, invalid-context normalization and unknown-chapter recovery, without JavaScript or asset failures. The separate hosted history probe exposed a gap hidden by the local preview's HTTP 200 fallback: Pages' real 404 redirect discarded `history.state` on activity refresh, losing the original entry and its known reading predecessor.

The correction transports only bounded, validated router/chapter navigation metadata through a one-use same-tab handoff, with an exact URL match and 60-second expiry. It never stores graph geometry, pixel offsets, commands, presets or progress. Source reading entries retain only the invoking activity/section identities for meaningful focus recovery after a document reload. Blocked storage falls back to canonical navigation without inventing a predecessor. Redirect encoding also preserves literal `~and~` query values, while decoding existing legacy redirect links remains supported.

The true-404 browser regression additionally caught React Router's initial `default` key having no matching native history key. Normalizing only that initial source entry allows the reading invocation to survive document navigation. Its unit regression covers both null native state and `{idx:0}`; the production browser regression now checks exact entry identity, unrelated query/hash values, restart notice, consumed handoff and invoking-link focus on the original no-hash chapter URL. Independent engineering review closed the corrected bridge without further findings.

Final correction verification at a stable checkout: `just check` passed **148 files / 2,511 tests**, TypeScript and production build (`.command-logs/2026-10-20T15-56-07-302Z-25896-d9728cfe.log`, build `.command-logs/2026-10-20T15-56-45-502Z-25896-8ff61370.log`). The combined chapter and real-404 production suite passed **14/14** (`.command-logs/2026-10-20T15-56-59-729Z-252-777208d8.log`). The deployed-host result follows below.

The correction's full local browser run passed 229/230, with one 60-second initial-render timeout on the existing 1440px restored catalog-motion preview row; its failure screenshot showed a blank app (`.command-logs/2026-10-20T15-58-20-789Z-2492-7b07a6b4.log`). The same row passed immediately in isolation, then the complete 14-row motion file passed with three workers on the identical build (`.command-logs/2026-10-20T16-03-20-613Z-2372-e5b39d85.log`, `.command-logs/2026-10-20T16-03-37-836Z-30564-7a0797e3.log`). No application or test code changed; the initial timeout's cause is unconfirmed and the full local attempt is not reported as a clean pass.

A second complete production browser run on the same runtime build passed **230/230** without source or test changes (`.command-logs/2026-10-20T16-10-20-454Z-25288-7ad7d4fc.log`, 245.9 seconds). Its recorded checkout was `c7eecc5`, which adds only unrelated planning documentation after `4a492d4`; runtime fingerprint matching allowed reuse of the verified build.

Publication of `4a492d4` triggered [run 39453235333](https://github.com/efodx/bezeg-2.0/actions/runs/39453235333). A concurrent documentation-only push (`c7eecc5`) cancelled its first attempt during browser checks, then skipped deployment itself. This was workflow concurrency, not a reported test failure. The handler restarted the cancelled smoke job using GitHub's targeted rerun operation; the runtime code on master remained unchanged.

A subsequent planning/status push cancelled that rerun. Its documentation image triggered full verification in [run 39456519443](https://github.com/efodx/bezeg-2.0/actions/runs/39456519443) at `e18ad68`, which includes the correction; comparison of `src`, `public`, `index.html`, package/build configuration and workflows against `4a492d4` found no changes. The handler followed that newer full run instead of launching competing verification, and the user agreed to pause other pushes until deployment completed.

That run passed **148 unit files / 2,511 tests**, TypeScript, production build and **230/230 Chromium tests** (7.2 minutes), then successfully deployed Pages at approximately 18:31 Europe/Ljubljana. Live probes on the deployed site passed Learning discovery/eight sections, chapter-section deep link and refresh, all six activity direct links and refreshes, invalid-context query/hash normalization and unknown-chapter recovery, with no JavaScript or asset failures. The real-host history probe passed unchanged router key/index and activity entry/predecessor metadata across refresh, the restart notice, exact query/hash preservation including literal `~and~`, original no-hash Return URL and focus on the invoking activity link. Supplemental local harnesses: `.command-logs/verify-hosted-pilot.cjs` and `.command-logs/probe-hosted-history.cjs` (exit 0). Publication/hosted verification is complete; other pushes may resume.

## Remaining release gates

Implementation is an educational pilot draft. Owner/subject-matter approval of Slovenian terminology, English copy and classroom suitability remains open. Physical touch devices, an actual projector and screen-reader use have not been established by browser viewport/keyboard tests. Hosted Pages deep links, refresh, history return and deployed assets passed the separate post-publication checks above. No completion or mastery claim follows from reading or opening an activity. Review this pilot's evidence before extending to another chapter.
