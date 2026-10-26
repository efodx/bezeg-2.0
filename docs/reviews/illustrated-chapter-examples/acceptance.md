# Illustrated chapter examples — acceptance record

Implementation authorized by the owner's request to implement the tasks from `2c3df6a`, 2026-10-26. Source: [specification](../../specs/illustrated-chapter-examples.md) and [task queue](../../tasks/illustrated-chapter-examples/README.md).

Status: complete 2026-10-26. All tasks and A1–A8 accepted. Missing prompts and enlarged-text overflow were repaired and verified. Hosted delivery is recorded separately below.

## Scope and curriculum

Implementation uses `.worktrees/consolidated-learning`, branch `codex/consolidated-learning`, baseline `2c3df6aa32d906f2e10279f1b45b16a1fb23fa09`; final capture and production-browser verification use `93066f43c9edf0cd145473fd62317f7397934b09`, integrated onto master at `2ef29a0`. Later commits `a96d00b` and `28f8cbb` contain verified smoke assertions/reports and refreshed provenance only. The primary checkout has unrelated changes and is excluded.

The [curriculum audit](curriculum-audit.md) and [baseline inventory](baseline-examples.json) account for 175 original placements across eight chapters and 44 sections: 56 retained, 40 merged and 79 aliases map to 56 retained homes. Explicit bilingual reading sequences place every retained card once. No registry-append fallback remains. The distinct worked parabola and Foundations quadratic-weight examples remain separate; the former's coefficient reflection is explicitly on paper rather than a nonexistent graph control. Canonical and legacy entry forms keep their retained owners; no route or preset-format break is introduced.

## Acceptance ledger

| Criterion | Evidence | Status |
| --- | --- | --- |
| A1 Exhaustive audit | All 175 dispositions, 56 destinations and source preparations checked against audit; distinct PH goals retained. | Passed |
| A2 Authored sequence | Both renderers consume ordered prose/formula/figure/example references; independent 56-placement and bilingual rendered-order checks. [Sequence evidence](six-chapter-sequences-note.md). | Passed |
| A3 Consolidation | Explicit retained/merged/alias mappings; coherent merged guidance; distinct worked parabola preserved. [Registry evidence](registry-foundations-final-note.md). | Passed |
| A4 Actual-scene images | All 56 exact opening scenes captured, all images and bilingual copy reviewed; mismatches corrected; worked parabola reframed. [First 21](captured-copy-first21-note.md), [remaining 35](captured-copy-remaining35-note.md), [final capture](capture-final-note.md). | Passed |
| A5 Reproducibility | Complete generated inventory, clean context per scene, initial-frame guards, numerical checks, checksums and provenance; permanent unit gate validates all 56 mappings/PNG bytes/source scenes/bilingual resolvers. [Manifest](../../../src/images/learning/examples/manifest.json). | Passed |
| A6 Entry/return continuity | Unit coverage includes all 175 aliases, malformed queries and retained owners. Canonical/legacy routes, refresh/history/language and four midway/completion focus/scroll returns passed. [Browser evidence](final-browser-acceptance.md). | Passed |
| A7 Readability/accessibility | Source review and media inspection complete; prompt-weight P2 fixed. All 64 bilingual viewport checks, touch/keyboard, 200% text and missing-media fallback passed. [Browser evidence](final-browser-acceptance.md). | Passed |
| A8 Complete coverage | Mathematical, engineering and UI source reviews complete; integrated checks and final media build passed. All 56 images decoded in both languages; observed order, identity, copy and URLs match the inventory. [Browser evidence](final-browser-acceptance.md). | Passed |

## Automated verification

- `just --list` inspected at start and continuation boundaries.
- Full `just check` passed in 479.0 seconds: 192 files / 3,682 tests, typecheck, lint and production build. Log `.command-logs/handler-integrated-check-3.log`; full test log `2026-10-26T14-33-07-962Z-91852-6bc084a7.log`. Earlier transient file-loading failures did not recur. This predates later caption/media/capture-tooling/CSS-only changes; affected checks below supplement it.
- Integrated-master `just check`: typecheck and lint passed; 192 test files ran with 3,685 passing tests and one stale Foundations figure-count assertion. The command exited 1. The corrected assertion distinguishes two explanatory figures from three illustrated cards; focused LearningPage/guided-example/media/math-notation tests passed (`handler-final-unit-repair.log`). This full run is not reported as passing.
- Exact `npx tsc --noEmit --pretty false` and scoped ESLint passed (`handler-master-exact-tsc.log`, `handler-final-test-lint.log`). Integrated capture/inventory/API and catalog-provenance tooling passed 53 Node tests (`handler-master-tooling.log`).
- Full 56-scene recapture after integrating master produced SHA-identical PNGs to the reviewed set; changed images = 0 (`final-capture-comparison.json`). Capture source is `93066f4`; post-capture media and LearningPage tests passed (`handler-post-capture-unit.log`).
- Final production build passed in 8.6 seconds (`handler-final-browser-build.log`). Served HTML and all five JS/CSS assets matched local bytes, including `index-9pAhOL_0.js` and `index-Ci6_9flY.css`. Existing Sass/eval warnings remain.
- Selected production smoke suite: 20 passed and five stale selector/scene-fixture assertions failed initially. All five corrected cases then passed against the same build; syntax and scoped lint passed. This is combined 25-case coverage, not one all-green 25-case run. [Repair evidence](final-smoke-assertion-repair.md).
- Vitest's filesystem transform cache retained the earlier empty image glob after the PNGs appeared. The media gate passed with `--no-fsModuleCache`; the stale cache was then cleared using `npx vitest --clearCache`, and the final ordinary unit command above passed. One attempted full check was stopped before completion while recapture was active; it supplies no verification evidence.

## Review and regression evidence

Independent [mathematical](mathematical-review-2.md) and [engineering](engineering-review-2.md) reviews each reported one P2, both fixed and rereviewed. The [final engineering/UI review](final-engineering-ui-review.md) accepted ordered rendering, stable lesson cache ownership, media fallback and focus structure. Its inherited bold-prompt finding was fixed by restricting the paragraph selector to direct children; browser confirmation passed with prompt weight 400 across all 64 viewport/locale checks. Seven missing learner prompts and enlarged MathJax overflow were repaired; see [repair evidence](card-repair-note.md).

Production capture exposed a lesson identity loop: repeated retained-example resolution cloned lesson definitions and replaced active sessions on graph updates. A source-definition/home-key WeakMap cache fixes this; the identity regression failed before and passed after the fix. The exact formerly hanging URL then opened in under two seconds with no runtime errors. Logs `.command-logs/handler-stable-identity-red.log` and `handler-stable-identity-green.log`. Eight stale integration assertions were repaired against authored order and retained scenes; [39 focused tests passed](integration-test-repair-note.md).

Initial PNG review rejected lesson overlays covering graphs and false descriptions of later lesson states. Capture hides only the overlay DOM after proving the first frame and prepared scene are stable; no learner action or graph preparation is changed. All 56 images use separate files (no image reuse). Camera-dependent horizontal bands, capped argument arcs, pixel-sized construction arcs and continuity-graph resampling have explicit guards with deliberately failing geometry mutations. Live Bernstein evidence established JSXGraph uses `curve` for the three quadratic basis functions; independent numerical checks remain. The final fingerprint includes inspection, all guard helpers, API code and entry-specific framing. Its missing-helper P2 was fixed before the final complete recapture. See [capture evidence](capture-final-note.md).

New content assertions were observed failing for wrong degree, wrong authored card ID, false fixed-point iteration-path wording, false tangent wording, missing manifest, and changed presentation helpers before the corresponding corrections or restoration.

## Browser and release

The [final production-browser review](final-browser-acceptance.md) passed 133 distinct checks, including 112 bilingual image decodes, 64 responsive chapter checks, four return flows, representative graph interactions and guided observation/edit/reopen/exit restoration. The initial detached fallback locator was a harness race; its focused rerun passed. No uncaught runtime errors occurred. Intentional image-request failure was recorded. All owned preview/browser processes were closed; an unrelated pre-existing server on port 4387 was left untouched.

Physical-device, actual-projector and classroom observation remain optional under the release policy. Screen-reader behavior was not tested. Local preview results are not hosted GitHub Pages evidence. Hosted CI and deployment passed; details follow.

## Evidence retention

Five temporary handler handoffs were retired after consolidating their final outcomes here and in the linked capture, repair, review and browser records. Historical evaluation entries mentioning those filenames refer to former continuation notes; this record is their current completion reference.

## Delivered release — 2026-10-26

Fast-forward pushed `5216c2bc0f2abd7a3f7a70bf623e13c0be62d37b` to `origin/master`. The final rebase from `2ef29a0` to `a5bb2d0` was clean; its only upstream changes were AGENTS/localization and Bézier-patch planning documentation. Application, tooling and media bytes were unchanged. Rebased commit mapping: `7b2caba` → `cd4c26f`, `93066f4` → `235559a`, `a96d00b` → `1ed1a5c`, `28f8cbb` → `f9bf851`. Capture provenance retains the actual revision used at capture rather than rewriting its history.

[GitHub Actions run 40356064803](https://github.com/efodx/bezeg-2.0/actions/runs/40356064803) passed TypeScript, lint, production build, both unit shards (2,089 + 1,597 = **3,686 tests**, 192 files), and all four Chromium shards (44 + 43 + 43 + 113 = **243 browser tests**). The smoke gate and Pages deployment both succeeded. This complete CI run supersedes the local full-check gap described above without changing that historical result.

Actual [GitHub Pages site](https://efodx.github.io/bezeg-2.0/) checked in Chromium at 16:16:18–16:16:32 UTC: all eight chapter deep routes loaded, all 56 chapter previews decoded (12/3/7/6/7/3/9/9 by chapter), and the direct Taylor example URL loaded a visible graph. No uncaught runtime errors occurred; the browser was closed. Entry asset names match the local tested production build, and all four compiled JS/CSS files match byte for byte. The uncompiled history bridge matches after CRLF/LF normalization, accounting for Windows versus Linux checkout. Local evidence: `.command-logs/hosted-illustrated-release.json`. The first hosted harness run already passed chapter/image/assets checks but used the wrong board selector; correcting it to the actual `#jgbox` produced the complete pass above.
