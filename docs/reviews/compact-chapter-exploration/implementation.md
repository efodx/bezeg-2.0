# Compact chapter exploration verification

Source: [bounded specification](../../specs/compact-chapter-exploration.md). Scope: shared presentation in all eight readers, retaining existing content, static assets and destination contracts. [Inventory](inventory.md) lists all chapters and launch types.

## Before and after

Baseline: checkout `f2f628e61e51412901245b206e2009ab3d688d24`, production build made with `just build`, served at port 4389 before application edits. The only initial dirty state was the owner's untracked local Learn improvement backlog. Later unrelated edits from another chat were preserved; final implementation and verification moved into a managed worktree based on the same revision.

Final: `C:/Users/NonFriedMotherBoard/.codex/worktrees/compact-chapter-exploration/bezeg`, production build at 08:58:17 UTC, served at `http://127.0.0.1:4391/bezeg-2.0`. Only this task's source changes are present in that checkout.

English “Move a control point,” 1440 × 900 viewport, normal text:

| Measurement | Before | After |
| --- | ---: | ---: |
| Card width | 780 px | 780 px |
| Card height | 729.109375 px | 248.4375 px |
| Preview width | 746 px | 240 px |
| Preview height | 455.875 px | 146.65625 px |
| Prompt font | 16 px | 16 px |

Height decreased by 480.671875 px (65.9%). The full prompt, caption, return link and launch action remain visible. The original 720 × 440 asset is unchanged and uses proportional containment. The handler inspected desktop and narrow screenshots: no cropped diagram or hidden copy. At 390 px the card width is 358 px; document scroll width remains 390 px, including 200% root text.

Evidence: [before dimensions](before-dimensions.json), [after dimensions](after-dimensions.json), [before desktop](before-desktop.png), [after desktop](after-desktop.png), [before card](before-shape-control.png), [after card](after-shape-control.png), [narrow screenshot](after-narrow.png).

## Implementation and review

`ChapterExploration` owns the optional static preview, title, prompt, primary action, contextual reading link and secondary action presentation. Callers own navigation nodes; the component cannot infer or initialize a scene. Bézier retains all six existing prepared activity destinations, visit state and launch callbacks. Family readers retain their section figures, subject prompts, free exploration links and optional secondary guided lesson links. No runtime, mathematical evaluation, storage or route changes.

Independent content/mathematical review found no changed claims, lost content or changed scene semantics. Independent engineering/accessibility review identified two issues, both fixed and rechecked: family link CSS specificity now preserves inline-flex alignment, and named exploration landmarks include their title and family section to distinguish repeated demonstrations. Tests check card counts and unique names. Handler integration review also corrected an obsolete list wrapper introduced while moving the changes to the isolated worktree.

The Impeccable detector ran once on the original implementation and reported inherited palette/radius advisories. The reader's existing palette was retained; the compact cards use one border without the previous decorative shadow. A stale design sidecar was reported and left outside this task.

## Automated checks

- New shared-presentation assertions failed against the original markup for all six Bézier cards and all seven family chapters, then passed after migration.
- Final isolated focused reader/content/navigation/notation suite: 47 tests in seven files passed (ChapterPage, LearningPage, familyChapters, bezierChapter, lessonMathNotation, familyInvestigation, ChapterActivityVisit).
- Final isolated `useChapterActivity` tests passed separately, including existing transient scene and reading return contracts.
- Final isolated typecheck and scoped lint passed. An initial scoped lint attempt hit a transient shared-node_modules lstat error; retry passed with no dependency changes.
- Final isolated `just build` passed; log `.command-logs/2026-10-26T08-58-17-207Z-748-05233740.log`. Existing Sass deprecation warnings remain.
- `git diff --check` passed. Source assets and graph runtimes are unchanged.

## Browser acceptance

Accepted at 2026-10-26 09:20:43 UTC. See [browser smoke](browser-smoke.md). All eight chapters passed Slovenian/English content and launch-link checks. Six existing Bézier launch/authored-scene smoke cases passed, including sampled return, reset and refresh behavior. Prepared keyboard entry/return, focus/scroll restoration and Forward passed; representative ordinary/guided family launch and section return passed. All 64 chapter/language/viewport/text-size layout combinations are covered: 16 worker probes plus 48 saved handler probes in [layout-verification.json](layout-verification.json). The handler recheck closed the worker aggregate-output gap. An initial 8px Rational overflow reading did not reproduce in direct fresh and settled checks and is retained in the report. No physical-device or exhaustive accessibility claim is made.
