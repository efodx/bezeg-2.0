# Site walkthrough: planner intake, 2026-11-14

Status: owner feedback captured for planning. This is an intake, not an implementation plan or a verified defect audit. Source: the owner's spoken walkthrough of the current site. No application changes or browser investigation were performed while compiling it.

The planner should reconcile this feedback with current code, existing specifications and concurrent work, then produce bounded specifications and tasks with acceptance criteria. Preserve the distinctions below between requested outcomes, suggestions and unresolved decisions. No implementation order is implied, except that the owner explicitly identifies verification throughput as a major ongoing blocker.

## 1. Demonstrations catalog and card typography

- **D01 — Round capture frames consistently with their cards.** Captures currently have square corners inside rounded cards, producing an awkward visible junction. Make the framing coherent.
- **D02 — Refine secondary catalog typography.** The main “Demonstrations” and “Explore by topic” headings look good; retain that quality. Family names on the left, chapter names on cards, and the Open / Guided example buttons look off and need review.

## 2. Graph appearance and demonstration captures

### Shared direction

- **G01 — Improve graph typography.** Graph text generally looks uninteresting or inconsistent with the rest of the site. Investigate current font and label rendering choices and what JSXGraph supports before proposing a shared treatment. The triangulation example called “Luna triangulation” in the transcript is a specific example; confirm its actual catalog name rather than guessing.
- **G02 — Make visually weak graphs more inviting.** Improve color, contrast, emphasis and composition while retaining mathematical meaning. This concerns both graph appearance and how demonstrations are presented in captures; identify which layer needs changes for each example.
- **G03 — Use captures to show the construction and its movement.** Usually omit explanatory text, especially localized prose that becomes permanently baked into a capture. Slovenian text currently appears in captures even on the English page. Live graph labels may be correct and should remain localized; the request to hide text is principally about captures.
- **G04 — Keep exceptions to text removal.** Do not impose a blanket no-text policy. Weights can sometimes be useful; some demonstrations are fundamentally about text or need it to convey their idea. Choose exceptions deliberately per demonstration.
- **G05 — Coordinate with capture work already in progress.** The owner skipped unfinished captures being handled separately, mostly analysis examples, including recurrence formulas and the diagram transcribed as “Kobeg” (likely cobweb; confirm). Do not treat those unfinished captures as newly assigned defects.

### Examples needing visual refinement

| Owner's example | Requested direction / specific observation |
| --- | --- |
| Correlation and regression line | Much more inviting presentation; mentioned repeatedly as a weak example. |
| Mean, median, standard deviation and box plot | The graph could look substantially better. |
| Least squares | Keep the useful idea of displaying the squares, but improve the graph's aesthetics. |
| Affine transformations | More inviting appearance; also a comparison for the initial Bézier capture's weak visual impact. |
| Extrapolation | Improve visual appeal. |
| Repeated subdivision | Improve visual appeal. |
| Degree reduction | Improve appearance; prefer curves without the explanatory text above them in the capture. |
| PH curves | The underlying idea is exciting; improve colors and remove top-left explanatory text from captures, including arc-length wording such as “dolžina loka.” |
| Parameterizations / uniform parameterization | Parameterized points do not stand out enough; replace or improve the current brown emphasis. Remove localized explanatory prose from captures where it obscures the motion. |
| Curvature and osculating circle | Improve curve colors and address capture text. The transcript says “oscillating circle”; confirm the catalog entry. |
| Subdivision curves | The lesson is exciting, but green points against a green curve lack useful distinction. |
| Conics: focus, directrix and eccentricity | Good underlying graph; improve visual presentation. |
| Density and probability as area | Refine visuals. |
| One conic, three views | Preserve the excellent interaction of moving the line and seeing the corresponding view on the right; make the visual treatment match the strength of the concept. |
| Initial Bézier curve capture | Too soft / understated compared with stronger examples; improve visual impact. |
| Through the points or near them | Capture feels insufficiently colorful or visually engaging. |
| “Firing points” (speech transcription; identify entry) | Capture feels bloated with ratios; hide ratios and consider hiding weights too. Emphasize how the slider controls the curve. This is an example-specific preference, not a universal ban on weights. |
| Envelope | Capture would look much better with explanatory text removed and the animation foregrounded. The same issue occurs in many other captures. |

### Positive references to preserve and learn from

The owner finds these more exciting or inviting: epicycles, fixed-point iteration, accumulated integral, definite integral, inverse function and logarithm, complex multiplication, subdivision, Darboux sums, and the example transcribed as “de Joule” (confirm its actual name). Use them as comparative references, not a mandate to make every graph equally busy.

Convexity and concavity also looks good, but its capture appears to skip between frames instead of animating smoothly (**G06**). Investigate the motion separately from the successful visual treatment.

### Epicycles example content

- **G07 — Replace or supplement the uneven curve with a recognizable, complex subject.** The owner likes the existing graph's appearance. The requested improvement is the example: use a fun drawing or recognizable real-world shape that demonstrates how a complex curve can be approximated increasingly well using circles. The exact subject remains to be chosen.

## 3. Shared mathematical labels and movable points

- **M01 — Fix inconsistent math rendering.** The point label in blossoming / polar form and point labels in Interval Sweep appear to bypass MathJax and look different from other mathematical text. Confirm and fix the affected rendering paths.
- **M02 — Make draggable points communicate that they are movable.** In Interval Sweep, hovering a movable point does not show the hand / drag affordance that the owner sees in Bézier curves. Make this consistent.
- **M03 — Investigate a shared movable-point implementation.** The owner expects common label rendering and interaction affordances across graphs. Determine where implementations diverge and consolidate an appropriate shared interface or implementation. Treat “these should be shared” as an architectural direction to investigate, not evidence that a particular abstraction is already missing.

## 4. Chapters and guided examples

- **L01 — Standardize section-heading numbering across chapters.** Bézier curves has numbers near section titles while some other chapters do not. Inconsistent chapter structure is the problem. Whether to keep or remove numbering is an open design decision; apply the chosen convention consistently through shared chapter presentation.
- **L02 — Polish previous / next chapter navigation.** Positions and chapter-title typography are good. The Previous chapter wording and arrows look off and make the overall buttons feel wrong. Refine those elements while retaining the successful placement and title treatment.
- **L03 — Polish the All learning content return control.** Its arrow and overall appearance need refinement alongside chapter navigation.
- **L04 — Propose better styling for the guided example Back button.** The owner likes the Back / Next placement and mostly likes the surrounding frame. The solid white Back button background feels out of place. Show alternatives that fit the existing aesthetic.
- **L05 — Extend side botanicals to chapter reading pages.** The owner explicitly reverses any earlier preference against this: the homepage and demonstrations botanicals add welcome character and should also appear along chapter sides. Keep reading comfortable; the owner does not consider the existing decoration excessively distracting.

## 5. Homepage and site identity

- **H01 — Remove the homepage footer.** The owner requests removal and no longer wants the professor mentioned there. Capture this as an explicit removal request, not merely a typography change.
- **H02 — Reconsider “starting demonstrations.”** The current label reflects the project's historical starting set from the master's thesis, not beginner suitability. Discuss the intended purpose with the owner before choosing between actual beginner demonstrations and a varied selection drawn from attractive demonstrations. The latter could show random entries from a curated pool. Neither strategy has been selected.
- **H03 — Simplify carousel navigation and improve the cards below.** The owner dislikes the left / right arrows and counter beneath the carousel. Suggested direction: remove them and make the underlying cards nicer. Resolve the final navigation treatment during design rather than assuming removal is already settled.
- **H04 — Give the homepage a clear route to learning chapters.** It should lead to the learning overview / all chapters as well as all demonstrations.
- **H05 — Refine the header's use of the icon.** The current icon looks good on the phone and browser tab. Its presentation at the top left beside the site name looks poor. Review that placement, scale and treatment without assuming the icon itself needs replacing.

## 6. Presets

- **P01 — Modernize the save-preset dialog.** The window that opens when saving a preset is conspicuously outdated compared with the rest of the site.
- **P02 — Review the broader presets experience.** The owner invites better UX, beyond a visual reskin of a thesis-era workflow originally built for personal use. Inspect the current flow before proposing concrete improvements. Preserve the static, client-only product constraints and safe handling of local data and imported files.

## 7. Documentation consolidation

- **DOC01 — Bring the README and project directions into line with the current project.** The project has advanced substantially since they were written. Audit documentation against actual capabilities, architecture and contributor workflows; reconcile stale or conflicting guidance. This is broader consolidation, not just a homepage copy update.

## 8. Verification throughput and architecture investigation

**T01 is a major owner-identified bottleneck.** The owner reports CI still takes about 12 minutes even for small changes, despite several earlier attempts to narrow verification. Treat this duration as a report to remeasure, not a new benchmark established by this intake.

Requested investigation and outcomes:

- **T01 — Explain and reduce end-to-end verification latency.** Measure where time goes for representative small changes, including local waits, hardware contention, CI jobs and publication. Reconcile the findings with earlier optimization work and explain why the bottleneck persists.
- **T02 — Make routine checks proportional to the change.** Revisit affected-test selection, modular boundaries and which checks must run on every change. The goal is useful confidence without repeatedly holding agents behind unnecessary work.
- **T03 — Retain periodic full CI coverage.** The owner explicitly wants the full test set run in CI at least periodically. Choose and document a policy for targeted runs versus full runs; no particular schedule or trigger has been selected.
- **T04 — Examine test value and duplication.** Determine whether repeated tests protect genuinely different behavior or repeatedly cover the same shared behavior. Investigate whether broad imports, insufficient sharing or poor module boundaries amplify the cost. The owner's DRY / architecture explanation is a hypothesis, not a confirmed diagnosis or authorization to delete coverage indiscriminately.
- **T05 — Address constrained hardware and agent waiting.** Include the cost of waiting in the analysis. Judge proposals by practical turnaround and concurrency, as well as test execution totals. Avoid recreating the same recurring bottleneck under a different command.

## 9. Decisions and identification needed during planning

1. Homepage featured content: true beginner set, rotating attractive set, or another approach agreed with the owner; then choose wording and selection behavior.
2. Chapter numbering: keep or remove, consistently.
3. Carousel navigation: determine whether removing arrows / counter and improving the cards provides the desired experience.
4. Guided Back button: propose visual alternatives.
5. Capture text: define selective suppression and explicit exceptions, keeping live localized labels distinct from captured pixels.
6. Epicycles: choose a recognizable complex curve / drawing.
7. Resolve ambiguous speech-transcribed demonstration names before assigning graph-specific work. No guessed names in this intake should silently become route IDs.
8. CI: select evidence-backed routine/full coverage boundaries and periodic full-run policy.

## 10. Planner handoff and overlap checks

The following are starting references by subject, not a claim that their requirements remain unimplemented. Check their current status and recent work before creating duplicate tasks:

- Catalog and homepage: [demonstrations library](demonstrations-library-redesign.md), [demonstration action affordances](demonstration-action-affordances.md), [homepage carousel and catalog](homepage-carousel-and-demonstrations-catalogue.md), [annotation follow-up](annotated-ui-follow-up.md).
- Graphs and captures: [graph visual style](graph-visual-style.md), [graph palette](graph-palette-refinement.md), [rendered style contracts](rendered-graph-style-contracts.md), [concept-led previews](concept-led-demonstration-previews.md), [continuous motion](continuous-motion-previews.md), [PH overlay](ph-arc-length-and-elevation-overlay.md).
- Labels and point interaction: [movable-point cursor](movable-point-cursor.md), [shared graph controls](shared-graph-controls.md).
- Chapters and decoration: [chapter reader polish](chapter-reader-polish.md), [chapter return control](chapter-return-control.md), [side botanicals](side-botanicals.md).
- Documentation: [documentation lifecycle](documentation-lifecycle.md).
- Verification: [verification throughput](verification-throughput.md), [test consolidation](test-consolidation.md), [CI change scoping](ci-change-scoping.md), [publication gate](fail-fast-publication-gate.md).

The resulting plan should retain these feedback IDs for traceability, identify affected routes / demonstrations, distinguish shared improvements from graph-specific art direction, and define observable acceptance criteria. Include the owner's positive references and open decisions in design briefs. Coordinate capture changes with the ongoing capture stream. Verify interface changes through the project's focused browser workflow and mathematical changes with relevant invariants; documentation-only intake needs neither an app build nor a smoke run.
