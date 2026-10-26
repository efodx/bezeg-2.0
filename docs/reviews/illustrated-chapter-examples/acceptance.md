# Illustrated chapter examples — acceptance record

Implementation authorized by the owner's request to implement the tasks from `2c3df6a`, 2026-10-26. Source: [specification](../../specs/illustrated-chapter-examples.md) and [task queue](../../tasks/illustrated-chapter-examples/README.md).

Status: implementation substantially complete; browser review found missing prompts and narrow enlarged-text overflow. Acceptance remains incomplete. No final acceptance or deployment is claimed yet.

## Scope and curriculum

Implementation uses `.worktrees/consolidated-learning`, branch `codex/consolidated-learning`, baseline `2c3df6aa32d906f2e10279f1b45b16a1fb23fa09`; verification below uses dirty `ad37517a9e43fb043e514b5044b7d3ac2065bd2c`. The primary checkout has unrelated changes and is excluded.

The [curriculum audit](curriculum-audit.md) and [baseline inventory](baseline-examples.json) account for 175 original placements across eight chapters and 44 sections: 56 retained, 40 merged and 79 aliases map to 56 retained homes. Explicit bilingual reading sequences place every retained card once. No registry-append fallback remains. The distinct worked parabola and Foundations quadratic-weight examples remain separate; the former's coefficient reflection is explicitly on paper rather than a nonexistent graph control. Canonical and legacy entry forms keep their retained owners; no route or preset-format break is introduced.

## Acceptance ledger

| Criterion | Evidence | Status |
| --- | --- | --- |
| A1 Exhaustive audit | All 175 dispositions, 56 destinations and source preparations checked against audit; distinct PH goals retained. | Passed |
| A2 Authored sequence | Both renderers consume ordered prose/formula/figure/example references; independent 56-placement and bilingual rendered-order checks. [Sequence evidence](six-chapter-sequences-note.md). | Passed |
| A3 Consolidation | Explicit retained/merged/alias mappings; coherent merged guidance; distinct worked parabola preserved. [Registry evidence](registry-foundations-final-note.md). | Passed |
| A4 Actual-scene images | All 56 exact opening scenes captured, all images and bilingual copy reviewed; mismatches corrected; worked parabola reframed. [First 21](captured-copy-first21-note.md), [remaining 35](captured-copy-remaining35-note.md), [final capture](capture-final-note.md). | Passed |
| A5 Reproducibility | Complete generated inventory, clean context per scene, initial-frame guards, numerical checks, checksums and provenance; permanent unit gate validates all 56 mappings/PNG bytes/source scenes/bilingual resolvers. [Manifest](../../../src/images/learning/examples/manifest.json). | Passed |
| A6 Entry/return continuity | Unit coverage includes all 175 aliases, malformed queries and retained owners. Final production-browser continuity check in progress. | Pending browser |
| A7 Readability/accessibility | Source review and media inspection complete; prompt-weight P2 fixed. Final desktop/projection/narrow touch/keyboard/enlarged-text checks in progress. | Pending browser |
| A8 Complete coverage | Mathematical, engineering and UI source reviews complete; integrated checks and final media build passed. Delegated browser evidence pending. | Partial |

## Automated verification

- `just --list` inspected at start and continuation boundaries.
- Full `just check` passed in 479.0 seconds: 192 files / 3,682 tests, typecheck, lint and production build. Log `.command-logs/handler-integrated-check-3.log`; full test log `2026-10-26T14-33-07-962Z-91852-6bc084a7.log`. Earlier transient file-loading failures did not recur. This predates later caption/media/capture-tooling/CSS-only changes; affected checks below supplement it.
- Final exact `npx tsc --noEmit --pretty false` passed; `.command-logs/handler-final-exact-tsc.log` is empty.
- Final affected unit run passed 5 files / 13 tests: published-media gate, bilingual preview copy, unchanged lesson math notation, exploration fallback and guided-card rendering. `.command-logs/handler-final-focused.log` / `2026-10-26T15-05-52-192Z-12532-da5d0efb.log`.
- Final Node capture/API/inventory run passed 17 tests; `.command-logs/handler-final-media-tooling.log`. Scoped ESLint passed; `.command-logs/handler-final-focused-lint.log`.
- Final production build after all PNGs and copy fixes passed in 8.1 seconds; `.command-logs/handler-final-media-build.log` / `2026-10-26T15-06-09-370Z-95956-dab9045b.log`. Served entry bundles were compared byte-for-byte with this build before smoke dispatch and matched.
- Vitest's filesystem transform cache retained the earlier empty image glob after the PNGs appeared. The media gate passed with `--no-fsModuleCache`; the stale cache was then cleared using `npx vitest --clearCache`, and the final ordinary unit command above passed. One attempted full check was stopped before completion while recapture was active; it supplies no verification evidence.

## Review and regression evidence

Independent [mathematical](mathematical-review-2.md) and [engineering](engineering-review-2.md) reviews each reported one P2, both fixed and rereviewed. The [final engineering/UI review](final-engineering-ui-review.md) accepted ordered rendering, stable lesson cache ownership, media fallback and focus structure. Its inherited bold-prompt finding was fixed by restricting the paragraph selector to direct children; browser style confirmation remains pending.

Production capture exposed a lesson identity loop: repeated retained-example resolution cloned lesson definitions and replaced active sessions on graph updates. A source-definition/home-key WeakMap cache fixes this; the identity regression failed before and passed after the fix. The exact formerly hanging URL then opened in under two seconds with no runtime errors. Logs `.command-logs/handler-stable-identity-red.log` and `handler-stable-identity-green.log`. Eight stale integration assertions were repaired against authored order and retained scenes; [39 focused tests passed](integration-test-repair-note.md).

Initial PNG review rejected lesson overlays covering graphs and false descriptions of later lesson states. Capture hides only the overlay DOM after proving the first frame and prepared scene are stable; no learner action or graph preparation is changed. All 56 images use separate files (no image reuse). Camera-dependent horizontal bands, capped argument arcs, pixel-sized construction arcs and continuity-graph resampling have explicit guards with deliberately failing geometry mutations. Live Bernstein evidence established JSXGraph uses `curve` for the three quadratic basis functions; independent numerical checks remain. The final fingerprint includes inspection, all guard helpers, API code and entry-specific framing. Its missing-helper P2 was fixed before the final complete recapture. See [capture evidence](capture-final-note.md).

New content assertions were observed failing for wrong degree, wrong authored card ID, false fixed-point iteration-path wording, false tangent wording, missing manifest, and changed presentation helpers before the corresponding corrections or restoration.

## Browser and release

Delegated production smoke is running against the verified final build on port 4387. Required coverage is all eight chapters in both languages, real media, representative entry forms and refresh/history/language behavior, midway/completion return focus and reading position, responsive/keyboard/touch/enlarged-text flows, plus the shared-workspace baseline.

Physical-device, actual-projector and classroom observation remain optional follow-up under the release policy. Local preview results will not be presented as hosted GitHub Pages evidence. Final commit, master push and deployment checks remain pending browser acceptance.
