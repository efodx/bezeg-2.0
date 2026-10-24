# Landing audit remediation evidence

Source: [bounded specification](../specs/landing-audit-remediation.md). The owner accepted contrast, startup loading, MathJax, and token consolidation work, and explicitly excluded a carousel pause-control change.

## Implementation and review

- The selected category foreground is now `#526152` on `#edf2e7`, approximately 5.78:1; default and hover pairings remain approximately 4.89:1 and 4.70:1. `src/shellTokens.css` centralizes the incumbent header/home roles; `DESIGN.md` describes their bounded scope. No layout, copy, preview art, or carousel behavior was redesigned.
- `Routes.tsx` lazy-loads graph and learning features. `graphs/graphFactories.ts` retains all 45 controller mappings. A lightweight lesson-availability registry prevents homepage/catalog links from importing complete lesson prose.
- MathJax now loads on demand with readiness and failure handling shared by graph entry, chapter/lesson typesetting, and figure capture. Graph entry has a localized loading status; failed requests/timeouts can be retried. Chapter typesetting retains language-change anchor restoration.
- Independent visual/accessibility source review found no actionable issue. Independent engineering/preservation review found a missing direct-chapter loader invocation and a weakened route-to-controller regression assertion; both were repaired and re-reviewed. No numerical or construction changes were found.
- The first integrated unit run found a GuidedLesson typesetting test-isolation problem after introducing the shared loader. The loader now respects the current exposed API, and lesson tests provide an explicit resolved renderer fixture. The affected five-suite rerun passed 32 tests; the final complete run is recorded below.
- An isolated deliberate mutation that skipped MathJax script creation failed the assertion `expected null not to be null` at the copied `loader.test.ts:6`. The fixed loader passes its focused tests. The temporary mutation harness/cache were removed.

## Startup payload

Baseline production entry: `index-Dfjdfioi.js`, 3,238,169 bytes (build-reported gzip 815.49 kB).

Corrected production build: initial `index-B3FvDtll.js` plus its recursively traversed static JavaScript imports total **424,461 bytes**:

| Initial JavaScript | Bytes |
| --- | ---: |
| Entry | 109,083 |
| Rolldown runtime | 979 |
| Shared React/router/runtime chunk | 314,399 |
| **Total** | **424,461** |

This is an approximately **86.9% reduction** in initial JavaScript bytes. Summed gzip output from Node's standard gzip encoder is 126,932 bytes; do not compare that exact encoding with Vite's differently reported baseline gzip number as a measured transfer result. Executable graph and learning modules remain available as deferred chunks. These measurements establish payload reduction, not Core Web Vitals, interaction latency, or classroom-device performance.

## Verification

- Worker typecheck and relevant focused route/loader/chapter/lesson/export suites passed after repairs.
- Corrected production build passed, with existing Sass deprecation and dependency direct-eval warnings. The preview's build provenance checks rejected an earlier build after final source edits; it was rebuilt before accepted checks.
- Handler browser review used the local production preview at port 4307, baseline revision `12275769d2ff218946756e85ef9adcc58167b63a` plus the current dirty task diff. The homepage retained its composition, selected foreground/background, a visible 3px keyboard outline, and no document overflow at 1440px and 390px. Narrow Slovenian and English text fit; language was restored to Slovenian. Its DOM contained no MathJax loader on a homepage-only visit. Initial module preload links referenced only the entry and runtime chunks.
- The source detector ran once after UI work. The approved rail and grid were retained. Further advisories concerned untouched legacy menu styles, alpha-mask black values, and decorative 2px radii outside the documented component radius roles; no new actionable design failure was found.

The final complete unit run passed **3,098 of 3,099 tests across 156 files**; one subdivision checkpoint case exceeded the existing 15-second timeout while browser verification was concurrent. That same case passed in the earlier complete run. A subsequent isolated filter exercised all three subdivision checkpoint cases and passed (**3 passed / 363 skipped** in that file), without changing assertions or timeouts. A first filter matched zero tests and is explicitly excluded from evidence. The timeout was not reproduced in the focused run; its cause was not established. Full-run and focused logs are `.command-logs/2026-10-24T09-00-44-052Z-95836-afbd4f41.log` and `.command-logs/2026-10-24T09-07-04-533Z-91984-230debc1.log`.

Delegated production browser smoke passed **56 existing Playwright checks**, including all 45 demonstration routes, plus direct browser checks for deferred scripts, actual chapter formulas, graph edits, and valid SVG/PNG downloads. See [the smoke evidence](landing-audit-smoke.md). The handler closed the worker's PH editor coverage gap: selecting the cubic PH curve exposed its auxiliary hodograph board; editing `w0 x` from -3.5 to -3.25 through the coordinate editor changed the rendered main-board SVG paths (8 paths present) and arc-length readout from 10.333 to 9.554. Restoring -3.5 restored the original readout; the verification tab was closed. This was an in-app browser desktop check, not a physical-device measurement.

Browser checks used the delegated smoke lane because route loading and formula readiness cross multiple surfaces; the handler's home visual and PH editor checks complement that coverage.

## Compatibility and limits

No URLs, stored preset format, import/export format, mathematical evaluation, renderer, dependency, or build tool were intentionally changed. The owner-approved carousel behavior remains in place. Physical-device and projector validation, comprehensive assistive-technology testing, and measured cold-load timings remain outside this change.
