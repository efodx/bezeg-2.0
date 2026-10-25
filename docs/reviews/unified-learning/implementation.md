# Unified learning acceptance

Accepted locally on 2026-10-25 at 23:40 CET (2026-10-25 22:40 UTC), from the owner request in [the specification](../../specs/unified-learning.md).

Learn now groups eight family chapters and all 45 available guided lessons. Seven new original bilingual drafts include prerequisites, definitions, worked examples, investigations, assumptions and limitations. The original Bézier chapter retains its activities and restoration. The existing catalog's Guided path shortcut now uses the established Guided lesson label; this checkout had no separate Guided Paths route to remove. Existing graph URLs, lesson scenes, presets and catalog return state remain compatible.

## Evidence

| Area | Result |
| --- | --- |
| Content and mathematics | Independent review checked worked arithmetic and coverage; all seven initial findings and the derivative-notation follow-up are closed. See [review disposition](math-handoff.md). The final draft also defines factorials and the imaginary unit. |
| Engineering/accessibility review | Independent static review found a missing SPA topic-anchor scroll, now fixed. Its wording discrepancy was resolved by preserving the established Slovenian term and aligning the spec. The browser-discovered native-anchor focus override was fixed with same-tab router navigation and explicit heading focus. Modified-click behavior remains native. |
| Types | `npx tsc --noEmit --pretty false` passed; final `just typecheck` passed on upstream base `48a13ad`. |
| Lint | `just lint . --ignore-pattern '.benchmark-output/**'` passed. Plain `just check` stopped on a pre-existing `eqeqeq` violation in ignored `.benchmark-output/check-localization-assets.cjs`; that unrelated scratch file and lint configuration were preserved. |
| Content/navigation regression | Three focused files passed all 14 tests. Final content/notation recheck passed both files. Omitting Foundations from the index deliberately failed the family-coverage assertion; the file was restored byte-for-byte and the 14 tests passed again. |
| Broad unit verification | First run: 170 files/3,530 tests passed; two subdivision timing failures, a transient missing-package suite failure and a missing-package worker-start error remained. Packages resolved on recheck. The three affected files then had 367 passing tests and three timing failures in rational subdivision. The final isolated polynomial/rational subdivision run passed all 16 selected tests without changing timeouts or assertions. No single broad run was entirely green; all observed failures were closed by targeted reruns. Logs are retained under `.command-logs/`. |
| Production build | Final `just build` passed in 16 seconds, log `2026-10-25T22-37-39-865Z-4768-5fa968ea.log`. Existing Sass/direct-eval warnings remain. |
| Production browser | Final Learn suite: 9/9 passed, all eight direct chapter routes, refresh, contents/hash, SL/EN, typeset math, 390px with 200% text, lesson entry and topic return. The delegated baseline contributed 74 passing home/catalog/original-chapter checks; its build-race arc-length failure passed an isolated rerun. See [browser evidence](browser-smoke.md). |

The upstream fast-forward changed only test logging. Before the final definition edits, rebuilding after that update produced 146 byte-identical production files; the final prose build received its own 9/9 browser recheck. No dependency or rendering migration was made.

Coverage is local Chromium production-preview evidence. Hosted Pages deployment, physical devices, projectors and classroom observation were not tested here. The new chapters are complete first drafts, without a claim of comprehensive prerequisite coverage or an assessed curriculum.
