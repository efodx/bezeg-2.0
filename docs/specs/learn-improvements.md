# Learn improvements

Source: owner request, 2026-10-26, to execute [the ordered backlog](../tasks/learn-improvements/README.md). The backlog itself stays local and must not be pushed. This specification extends [unified learning](unified-learning.md).

## Sequence and boundaries

Complete the content audit first, then the landing page, shared reader, reproducible app figures, Bézier pilot, each remaining chapter in backlog order, reading/exploration navigation, and final editorial/browser verification. Define acceptance for each implementation slice before editing its application code. Preserve stable chapter/section/activity links, existing valid presets and independent graph entry unless a deliberate break is documented here.

## 1. Content audit

Review the rendered content sources for all eight chapters, Slovenian first and English for equivalent meaning. Cover mathematical correctness and assumptions, prerequisite sufficiency, introduced notation, worked-example arithmetic, explanation gaps, graph instructions, and connections. Distinguish actual errors from teaching improvements, prioritize actionable findings, and give source locations and a concrete correction or outcome. Check the relevant graph or lesson source where an instruction depends on available behavior. Do not modify application content in this slice.

Acceptance:

- A repository-local audit covers Foundations, Bézier, Rational curves, Splines, PH curves, Parametrization, Functions and calculus, and Analysis individually.
- Each chapter records reviewed scope and evidence, prioritized errors and teaching improvements (or an explicit absence of identified errors), and recommendations suitable for the later bounded implementation.
- Verify numerical examples by calculation; separate demonstrated defects, pedagogical judgment, and unverified claims. Resolve mathematical contradictions before dependent edits.
- The handler checks findings against sources and records disposition for later slices. Documentation-only audit needs no browser smoke.

## Shared constraints and later verification

Keep static client-only ownership, Slovenian default and equivalent English, elderflower visual identity, readable formulas and precise mathematics. Use actual reproducible Bezeg captures for figures. Reading pages mount no boards. Verify UI changes at desktop/narrow widths, enlarged text, keyboard access and projection-like views; run the smoke skill for affected routes/workflows. Final verification covers refresh, language switch, browser history and exact-section activity return. Record observed evidence and gaps per slice; physical device/projector observations are optional under the release policy.

## 2. Learn landing page

Owner confirmed a Foundations starting point followed by an ordered topic map with graph lessons within each topic, and delegated remaining design decisions (2026-10-26). Refine the existing cream/green reading surface. The page should help students choose; full chapter prerequisites belong in the reader.

Acceptance:

- Give Foundations an explicit starting action in the introduction. Explain that topic order is suggested, not enforced, and distinguish reading from step-by-step guided graph lessons.
- Keep all eight topic anchors, chapter routes and all 45 available guided lesson links. Each topic has one main chapter heading and read action; eliminate the repeated family/chapter heading pair.
- Show a meaningful existing app-derived graph preview for every topic, using catalog capture assets and accurate bilingual alt/caption text. Preserve the entire graph image rather than cropping away controls or labels. Images load lazily below the introduction; no videos or live boards are needed.
- Replace landing-page prerequisite paragraphs with short topic connections pointing to relevant chapters. Use a clear primary read action and a native expandable list of guided graph lessons per topic, with an informative count. All lessons remain reachable by keyboard without a pointer.
- At 1440px, 1024px (projection-like), 390px, and 200% text, retain readable headings, visible focus, usable targets and no document horizontal overflow. Expanded lesson lists fit naturally. Hash returns scroll to the topic, language changes update labels and previews, and browser Back retains navigation.
- Run focused learning unit checks, typecheck, production build, and delegated production browser validation covering these states. Review the rendered page before acceptance; no mathematical runtime or preset behavior changes are in this slice.

Accepted 2026-10-26: audit in `docs/reviews/learn-improvements/content-audit.md`; landing implementation and browser evidence in `docs/reviews/learn-improvements/landing-worker.md` and `landing-browser.md`. Handler reviewed desktop and narrow renders and repaired lesson link target heights after browser review. Catalog captures may contain Slovenian graph labels; bilingual alternative text/captions supply the corresponding explanation. Later chapter figures still require reproducible captures matched to their specific examples and activities.

## 3. Shared chapter reader

Refine the incumbent reading surface for all eight chapters without changing mathematical content or activity recipes. Keep existing chapter/section URLs and the Bézier reading-position/activity-return contract.

Acceptance:

- Reduce introductory heading scale and excess introductory spacing; use a consistent, comfortable body measure (about 65–75 characters on wide screens), clear section separation, and readable formula regions that scroll internally when needed.
- Both readers indicate the section being read during ordinary scrolling, direct hash entry and contents activation. Do not rewrite browser history on scrolling. Dispose observers/listeners when leaving a chapter.
- Desktop contents remain reachable on short screens; narrow contents use a keyboard-operable disclosure with bounded internal scrolling, close after selection, and retain focus on the selected section heading. Preserve modified-click link behavior.
- Show explicitly labeled previous/next chapter links, in the Learn topic order, on every chapter including Bézier; endpoints show only available neighbors. Labels translate with the current language.
- At 1440px, 1024px, 390px and 200% text, verify no document horizontal overflow, usable contents and visible keyboard focus. Long formulas may scroll within their labeled regions. Check long Bézier contents, a family chapter, deep-link refresh, language changes and one Bézier activity return. Reading routes mount no boards.
- Run focused learning tests, typecheck, production build and delegated browser smoke on the affected reading routes. Review the rendered desktop/narrow result and account for acceptance and coverage gaps in a repository-local evidence note.

Accepted 2026-10-26: shared reader implementation and independent review in `docs/reviews/learn-improvements/reader-worker.md`; browser matrix, section tracking, keyboard contents, language/history and activity-return evidence in `reader-browser.md`. All eight chapter route rows and the final targeted recovery/activity checks passed. Handler reviewed normal desktop/narrow renders, removed the redundant Bézier category label and reverified the rebuilt reader. No math, scene, preset or URL contract changed.

## 4. Reproducible Bézier app figures

Replace the six programmatic activity illustrations with actual static captures from the authored chapter activity URLs. Keep activity recipes and reading/activity URL contracts unchanged in this slice. Degree/prose simplification remains task 5.

Acceptance:

- Capture all six activities from a clean browser context through the shipped chapter activity flow; the graph scene must be the same one opened by its activity link. Both De Casteljau activities intentionally share the quartic scene at parameter one half. Capture the affine activity's actual starting scene and describe it accurately rather than drawing an additional transformed curve absent from the activity.
- Supply deliberate framing that includes relevant controls, curves, construction and labels, consistent cream background and legible contrast. Capture the board only, without workspace controls. Preserve mathematical coordinates and visible construction meaning; capture-only camera/label sizing is allowed. Include meaningful, checkable scene evidence and fail on empty/missing graph data or runtime errors.
- Render responsive figures with intrinsic dimensions, bilingual alt text and captions explaining the pictured claim/starting scene. Use enough reading-column space for labels, avoid cropping, and mount no live boards in reading. Remove the obsolete hand-drawn SVG/geometry helpers.
- Provide a repeatable offline command, reuse existing capture presentation helpers where appropriate, and retain a compact manifest identifying activity URLs, source/build provenance, scene checks and output hashes. Regeneration must not mutate catalog assets or authored scenes. Document refresh instructions and caption/label language limitations.
- Check curve endpoints/control points, De Casteljau parameter and degree, Bernstein degree/basis, convex hull visibility and affine starting geometry against actual scene/recipe evidence. Unit checks must preserve existing activity/content invariants. Run typecheck, focused lint, production build and delegated browser checks of image decoding, framing, responsive layout, language captions and activity scene/return. Handler reviews all six captures and desktop/narrow reader renders.

Accepted 2026-10-26: six captures and reproducible generator reviewed independently for mathematics/provenance and reader integration (`captures-math-review.md`, `captures-ui-review.md`). Final 23 focused unit files / 558 tests, exact TypeScript check, focused lint and production build passed. The new figure test failed against the pre-change component as expected. Production browser evidence (`captures-browser.md`) covers all six decoded asset hashes, bilingual captions/MathJax, desktop/projection/narrow widths and enlarged text; 18 standalone-learning tests passed. Handler reviewed all six source captures and desktop/narrow rendered cards. The reported return-offset failure was an early smooth-scroll sample: a separate diagnosis verified exact settled return and focus at 100% and 200% text (`captures-return-diagnosis.md`), with no app repair. Captures rely on adjacent captions for parameter/basis identification; embedded legends and physical-device/projector review were not added. Capture provenance records the earlier scene build, while final reader acceptance uses the rebuilt dirty `0b2698b` tree.

## 5. Bézier teaching pilot

Refine the bilingual Bézier chapter using the accepted reader and six activity captures. Retain the authored scenes and stable section/activity URLs: the cubic controls and worked midpoint, quadratic derivation and basis plot, and quartic De Casteljau construction each serve a distinct purpose. Explain transitions before learners encounter the changed degree rather than changing the scenes merely for uniformity.

Acceptance:

- State the four-control cubic, five-control quartic and three-control quadratic roles where each is introduced. Explain why the smaller quadratic calculation illustrates the same repeated-interpolation rule; place the calculation before the repeated-interpolation quartic exploration, with an explicit bridge back to five controls. The earlier parameter activity remains before the derivation, because selecting a point precedes explaining its construction; introduce its five-control scene explicitly at entry.
- Give each of the six activities a concrete change, an observable result and an interpretation in both languages. Replace repeated post-activity summaries with a focused comparison or question answered by the preceding mathematics; avoid presenting a plotted example as a proof.
- Keep the cubic midpoint arithmetic, Bernstein partition of unity, representation-degree caveat, convex-hull assumptions and affine argument accurate. Make the basis plot interpretable using endpoint/central behavior even without color discrimination or an embedded legend. Keep prose symbols delimited and English equivalent to Slovenian.
- Preserve all eight section IDs, all six activity IDs, existing exact return/history behavior, and the existing scene/capture provenance. No runtime or graph recipes change. Reader pages mount no boards.
- Verify content/activity invariants and notation, exact TypeScript check and production build. Independently review the bilingual teaching sequence and arithmetic. Use delegated browser checks for all six authored activities and returns, plus desktop/narrow/enlarged-text rendering and translated formulas/captions. Record evidence and any coverage limits before acceptance.

Accepted 2026-10-26: final bilingual source review (`bezier-pilot-review.md`), 13 focused tests, exact TypeScript, lint, production build and 18 standalone browser tests passed. Final narrow browser follow-up (`bezier-pilot-browser.md`) closes the prior gaps: desktop/narrow/enlarged-text flow and captions, live degree-two to degree-three basis count, affine translation plus scale on controls and curve, and exact settled keyboard return. Handler visually reviewed saved interpolation flow and activity captures. No scene or runtime change; physical-device and comprehensive accessibility review remain outside the scoped browser evidence.

## 6a. Foundations

Revise Foundations first, then handle the remaining family chapters separately in backlog order. Reuse the shared reader, stable sections and catalog routes.

Acceptance:

- Introduce radians, sine/cosine as coordinates on the unit circle, and polar form before using complex multiplication; explain the zero-factor exception. Connect Bernstein weights to combining controls and complex multiplication to transformations used in later curve chapters.
- Preserve the quadratic weighting arithmetic and state why its three weights differ from a captured cubic basis plot when applicable. Add meaningful, reproducible app-derived figures explaining weights and multiplication; existing catalog captures may be reused when their exact recipe matches the caption and the example is explicitly distinguished from other calculations. Record asset/recipe references and visually check the figures.
- Replace each generic Foundations graph link with bilingual instructions naming an available change, observable result and mathematical interpretation. Retain links to both demonstrations, and label guided graph lessons accurately. Do not promise a prepared scene or automatic numerical example unless the link actually supplies one.
- Add a small typed, optional shared family-reader extension for figures and investigation instructions, reusable by later chapters; unaffected chapters retain their behavior. Keep prose math delimited, captions/alt bilingual, figures uncropped and responsive, and reading pages board-free. No renderer, preset or lesson-runtime change.
- Run focused family/reader/notation tests, exact TypeScript, focused lint and production build. Independently review the mathematics and bilingual instructions. Delegated browser checks cover Foundations plus an unchanged family baseline, desktop/narrow/enlarged text, loaded figures/formulas, language/deep-link refresh, and the specified graph actions. Handler reviews saved desktop/narrow renders. Shared navigation acceptance remains in Task 7.

Accepted 2026-10-26: Foundations now introduces radians/unit-circle coordinates and polar form, including zero-factor and modulo-full-turn qualifications. Two matching catalog figures and specific bilingual investigations use the optional shared reader fields. Independent mathematical/bilingual and engineering/UI reviews passed after the angle wording correction (`foundations-*-review.md`). Final 24 focused tests, exact TypeScript, lint, build, nine unified-learning production browser tests and handler's targeted reader/control checks passed. Handler reviewed source images plus desktop/narrow/enlarged-text captures. `foundations-browser.md` records final evidence, including the explicit guided-lesson exit used to reach free controls; Task 7 still owns improving that journey.

## 6b. Rational curves

After Foundations acceptance, revise Rational curves using the typed family-reader figures and investigation prompts. Preserve all existing sections and seven catalog destinations.

Acceptance:

- Fill the circular-arc proof's omitted algebra: define convenient intermediate quantities and show directly why the numerator-square sum equals the denominator square for every parameter. Retain positivity, interval assumptions, endpoint/midpoint values and homogeneous-coordinate meaning. A plotted circle supports the result but does not prove it.
- Add actual reproducible app figures for relative-weight influence and the segmented circle. Existing catalog captures may be reused with accurate scene captions and asset/recipe references: distinguish the weighted cubic capture from the worked quadratic, and the three-piece circle from the worked quarter-circle. Do not imply that a default graph opens the worked numerical example.
- Give every Rational graph link bilingual instructions with an available action, observable effect and interpretation: relative weight, rational De Casteljau, elevation, extrapolation, subdivision, Farin points and circle piece count. Preserve valid graph routes, authored lessons, reading sections and existing data. State the positive-weight/denominator caveat where extrapolation exceeds the unit interval.
- Keep Slovenian-first prose and English equivalent, symbols delimited, caption mathematics typeset, alt text natural-language, and figures uncropped/responsive. Reuse the accepted shared reader without another runtime or navigation extension.
- Verify the algebra independently (including sampled rational coordinates), focused content/notation/reader tests, exact TypeScript, focused lint and production build. Independent mathematical/bilingual review and targeted production browser checks cover loaded figures, SL/EN formulas/captions, desktop/narrow/enlarged-text layout, deep-link refresh and representative weight/circle-count interactions with live geometry. Handler visually reviews saved desktop/narrow renders. Unchanged operation runtime can use existing sufficient lesson/browser evidence; record any remaining gaps explicitly.
