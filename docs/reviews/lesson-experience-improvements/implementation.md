# Lesson experience implementation — 2026-10-21

Source: [accepted specification](../../specs/lesson-experience-improvements.md). Historical coverage limits below remain recorded under the current release policy.

## Baseline and adopted layout

The handler built an isolated archive of starting revision `42c7d88e767726b2fac5063fbaa3e5766b5cd80f` with the installed locked dependencies. The only copied dependency asset was JSXGraph's unmodified stylesheet, required by its relative import. Production preview and Chromium ran outside the sandbox because sandbox Chromium could not reach loopback. No app source was altered for capture.

Slovenian Taylor entry, default exponential scene, was captured at 1440×1000, 390×844, 844×390, 1920×1080 Presentation, and 390×844 with 200% root font size. Each capture included overlay top/middle/bottom. Observed overlay client/content heights were respectively 660/760, 694/1276, 257/1288, 680/760, and 694/3570 CSS pixels, all internally scrolling. The [desktop](baseline-desktop.png) and [narrow](baseline-narrow.png) captures show long repeated summary copy and graph labels under the translucent prose.

The adopted layout uses an opaque surface, compact header, scrolling desktop prose, and horizontal persistent progress/navigation. Narrow/short-height prose uses page flow with persistent Hide/Exit and navigation. Reading and graph exploration alternate over the same mounted board. [ADR 0003](../../adr/0003-frame-based-graph-anchored-lesson-overlay.md) reconciles the older rail/translucency/scroll contracts.

## User impact and content

Early Exit now explains restoration and unsaved progress, pauses playback, and asks for confirmation. Cancel and Escape preserve the session; confirmed exit restores the entry checkpoint before clearing host lesson context. Restore failure leaves recovery visible. Completion preserves the final scene. Routes, unrelated query/hash state, Presets, and transient-progress policy are unchanged.

Taylor retains seven stable steps and existing scenes/actions, with 18 rather than 17 frames. The opening now asks whether a higher degree improves approximation, names minimum derivative/factorial notation, then gives a separate initial-degree calculation. That calculation shows only the initial error, not the degree comparison or bound. Observation still asks for degrees 3 and 6 before deliberate reveal. Lagrange assumptions, actual-error/bound distinction, convergence limits, and the smooth counterexample remain in the lesson. Added frames precede experimentation, so no extra navigation is inserted into an ongoing experiment. No numerical algorithms change and no stored-progress migration is needed.

## Verification and review

The handler's content/notation/real-graph scene checks passed. Independent engineering review found no actionable lifecycle/ownership issue; independent content/UI review found no blocking mathematical or code-evident accessibility issue. These reviews explicitly did not establish browser behavior.

The first responsive browser matrix passed 10/10 SL/EN desktop, Presentation, narrow, short-height, and 200%-root-text cases, after MathJax settled. It checked top/middle/bottom action hit targets and viewport bounds, opaque background, scroll ownership, horizontal overflow, first-frame boundary, dialog keyboard trap/safe focus/Escape cancellation, URL/progress/board identity preservation, and new-frame heading visibility.

The broader suite caught a real regression: after hiding taller reading content, the surviving workspace Continue control could be above the viewport. The handler retained the existing pointer hit-test and requested a post-handoff focus/scroll repair. The initial full unit run found one old workspace test expecting immediate Exit/old navigation labels; the revised integration test exercises cancel and confirmation, restore/focus, and completion scene retention.

Final command results and independent browser observations are recorded with the completed implementation below and in [browser smoke](browser-smoke.md).

### Final verification

- `just unit --maxWorkers=4`: **154 files / 3,094 tests passed**, local log `.command-logs/2026-10-21T17-29-40-745Z-29644-b4f4d7bb.log`. Final shared handoff/formula-access changes additionally passed the three affected runtime/session/workspace suites (47 tests); the final Taylor assumption text passed the content/notation suites.
- `npx tsc --noEmit --pretty false`: passed after the final source changes.
- `just build`: passed with local provenance at starting HEAD `42c7d88`, task changes dirty, final build log `.command-logs/2026-10-21T17-42-19-004Z-49360-2057df4b.log`. Existing JSXGraph direct-eval and bundler timing warnings remain; no renderer/build-tool changes were made.
- `just smoke-built --workers=4`: exercised **245 production browser checks**, with 241 passes and four failures from outdated expectations: duplicate reading Continue, internal narrow overlay scrolling, and restoration after completion. Updated those tests to assert the new contract while retaining board identity, geometry, restore and reachability checks. The earlier offscreen-Continue product regression had already been repaired before this run. Broad log `.command-logs/2026-10-21T17-35-50-177Z-49748-007fb530.log`.
- Final targeted production rerun: **21/21 passed**, including all four corrected cases, every Taylor row, observation/animation/focus flows, touch exit, the five-layout bilingual matrix, and same-frame reading position after MathJax reflow. Log `.command-logs/2026-10-21T17-42-39-892Z-31524-ec089b28.log`. The final source change after the broad run only restored Taylor's derivative assumptions in rendered notation; no shared runtime behavior changed. A second entire 245-test run was not repeated after that content-only edit.
- Independent smoke additionally observed an actual polynomial drag and changed curve path, edited-scene preservation across SL/EN, Taylor checkpoint restoration, short-lesson completion, and Chapter return. Full automated coverage supplies the selected rational/PH, preset, navigation, keyboard and shared animation workflows the manual worker skipped. See its report for the exact scope.
- Final reading captures, refreshed against the last build and visually inspected by the handler: [desktop SL](final-reading-desktop.png), [390px SL](final-reading-narrow.png), [short landscape EN](final-reading-landscape.png), [200% root text EN](final-reading-enlarged.png), [Presentation EN](final-reading-projection.png). Each shows Taylor instructions, with opaque reading and horizontal persistent actions. Measured document widths equal viewport widths in all five captures. Full bilingual top/middle/bottom captures also ran as browser-test attachments. Root-font enlargement is a CSS stress test, not browser zoom or a physical-device test.
- `git diff --check`: passed. Unrelated `debug.log` was not staged or changed.

| Spec stories | Evidence and limits |
| --- | --- |
| 1–15: readable progress, navigation, scroll/focus and targets | Bilingual responsive matrix at five layouts, settled MathJax, top/middle/bottom pointer hit-tests, 44px targets, first/last boundaries, named navigation/status/formula regions; data-driven narrow formula walks. Screen-reader semantics and keyboard behavior checked, actual assistive technology remains open. |
| 16–21: handoff, scene/view preservation and pause | Runtime/workspace integration, production graph-access and observation-flow tests, independent Taylor edit/reopen/Continue and board-view checks, same-frame reading-position reflow test. |
| 22–27: confirmation, cancellation, restoration, completion and Chapter ownership | Runtime/session restore-failure and completion tests, dialog safe focus/Tab/Escape/URL matrix, explicit-confirmation browser exits/re-entry, chapter activity navigation checks. |
| 28–31: language, projection and reduced motion | SL/EN frame walks and matrix, Presentation viewport, keyboard and animation-pause smoke. Root-font enlargement and browser viewport emulation are limited proxies; physical projector/touch review remains open. |
| 32–35: Taylor pacing and mathematics | Stable scenes and step identities, separate initial-degree calculation, prediction/reveal assertions, numeric/model and real-graph scene checks, independent mathematical review. Polynomial existence and Lagrange differentiability assumptions are in rendered notation, with adapter assertions. |
| 36: unsupported actions and restore failure | Existing capability validation/scene rollback tests plus new visible failed-exit recovery test. Failure leaves the session/dialog active with retry/continue actions. |

## Coverage limits

- Formative student/educator observation has not been performed. Hesitation, accidental navigation, and understanding of actual error versus estimate remain unmeasured.
- Browser viewport/touch emulation and projection dimensions do not establish physical-touch or classroom-projector acceptance.
- Automated names, status semantics, focus and keyboard checks are not a full assistive-technology evaluation.
- Taylor source questions remain recorded; the available lesson is released under the current policy. Classroom observations remain optional evidence.

These observations remain unperformed. Under the [2026-10-24 policy](../../guardrails.md#release-policy--owner-decision-2026-10-24), formative, physical-device and projector observations are optional evidence; specific accessibility defects and unverified concrete requirements remain follow-ups.
