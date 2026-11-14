# Site walkthrough: planner intake, 2026-11-14

Status: planning started 2026-11-14; see the [disposition](#11-disposition-2026-11-14) for the packages, the owner's decisions so far and the specs each item goes to. Sections 1–10 are the intake as captured and are not edited. Originally: owner feedback captured for planning. This is an intake, not an implementation plan or a verified defect audit. Source: the owner's spoken walkthrough of the current site. No application changes or browser investigation were performed while compiling it.

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

## 11. Disposition, 2026-11-14

Planned against `master` at `f1d33fa4`. Code and specs were read; nothing was run in a browser. Every feedback ID belongs to exactly one package.

| Package | Intake IDs | Goes to | State |
| --- | --- | --- | --- |
| A. Verification throughput | T01–T05 | [Verification throughput, phase 8](verification-throughput.md#phase-8-remeasure-after-phases-07-local-waiting-first-owner-report-2026-11-14) | Proposed. Measurement first. |
| B. Shell and label polish | D01, D02, L02, L03, H01, H05, M01, M02, M03 | [Shell and label polish](site-walkthrough-shell-polish.md) | Proposed. Needs no owner decision. |
| C. Design decisions | H02, H03, H04, L01, L04, L05, P01, P02 | [Design proposal](site-walkthrough-design.md), with the [options gallery](../reviews/site-walkthrough/design/) | Proposed. Waiting for the owner's picks; no app change yet. |
| D. Graphs and captures | G01–G07 and the example table | [Graphs and captures](site-walkthrough-graphs-and-captures.md) | Proposed. The policy and a three-example pilot go to the owner before any batch. |
| E. Documentation | DOC01 | Spec not written. Documentation only. | Unscheduled. |

Order: A first, because every other package pays the same wait. B and E can run beside it. C's mockups go to the owner meanwhile. D starts once the capture-text policy (decision 5) is written, so captures are recorded once.

### Owner decisions, 2026-11-14

- **H02 (decision 1):** the homepage shows a rotating selection from a curated pool of attractive demonstrations, not a beginner set. Pool membership, the label that replaces "starting demonstrations" and the rotation behavior are still to be specified in package C.
- **G07 (decision 6):** the planner proposes several recognizable subjects for the epicycles example and the owner picks one. The subject itself is still open.
- **G05:** the clips stream is treated as complete. It left some captures unfinished; package D works from the current state of the captures and does not wait for that stream. Its remaining queue entry (`projective-pascal`, in [the clips stream file](../tasks/feature-streams/clips.md)) is not a dependency.
- **T01:** the wait is local as well as on CI. Agents wait for tests before they can continue, and the owner calls this a constant blocker. Phase 8 measures local agent waiting first.

- **H01:** remove the footer completely, including the contact line. The owner will add contact details back once he is ready to give the site's link to other people.
- **Sequencing:** the planner chooses the order and may run packages in parallel sessions.
- **Previews:** the owner reaches this machine only through Tailscale. Every preview offered for his review is served to the tailnet; see [Sessions](#sessions-2026-11-14).

Decisions 2, 3, 4, 5 and 8 remain open. They are the owner's to make. The sessions propose options with a recommendation through mockups, a pilot preview or a written proposal, and wait for his choice; 8 follows the phase 8 measurement in the same way.

### Sessions, 2026-11-14

Four handler sessions run in parallel, each in its own worktree and branch, pushing accepted slices to `master` under AGENTS.md. Owner decisions are not delegated to them: each session stops at design, taste, architecture and verification-policy choices, lists them with a Tailscale preview in its state note, and continues only on the owner's answer. (The sessions were first briefed to decide for themselves; the owner corrected that the same day, and each was told.) Each keeps its queue in `docs/tasks/site-walkthrough/<id>.md` and its state note in `docs/reviews/site-walkthrough/<id>/state.md`. Package E waits: its audit should describe the site after packages B and C land, and it keeps one more session off a CPU-bound machine.

| Id | Package | Port | First deliverable |
| --- | --- | --- | --- |
| `throughput` | A | 4334 | The phase 8a remeasure note |
| `polish` | B | 4331 | Slice 3 (footer, header brand), because package C also edits the homepage |
| `design` | C | 4332 | A mockup gallery with options and a recommendation per item, and epicycles subject candidates; then it waits for the owner |
| `graphs` | D | 4333 | The package D spec: capture-text policy, per-example table with route ids, graph typography research; then a pilot of three examples |

Shared files: `src/WelcomePage.*` belongs to `polish` until slice 3 is pushed, then to `design`. Localization edits (`sl.ts`, `en.ts`) are pushed promptly by whichever session makes them. `graphs` does not edit inspector panels, which [control choice](control-choice-and-composition.md) owns.

Previews for the owner: build and serve the worktree with `just preview <port>`, publish that port to the tailnet with `tailscale serve --bg --http=<port> http://127.0.0.1:<port>`, and give the owner the address `http://desktop-a0j72sv.tail2032db.ts.net:<port>/` plus the app's base path. `tailscale serve status` lists the ports already taken. Remove the entry (`tailscale serve --http=<port> off`) and stop the server when the preview is no longer needed. A `localhost` address is of no use to the owner.

### Names resolved (decision 7)

| Transcribed | Catalog name | Basis |
| --- | --- | --- |
| "Luna triangulation" | Delaunay triangulation | `compgeo_delaunay_title` |
| "de Joule" | De Casteljau | `de_casteljau_construction`, `de_casteljau_scheme` |
| "Firing points" | Farin points | `farin_points` |
| "oscillating circle" | Curvature and the osculating circle | `curvature_circle_title` |
| "Kobeg" | The cobweb diagram of `RecursionCobwebGraph` | Confirmed by the owner, 2026-11-14. |

Route ids for the other rows of the example table are assigned in package D's spec, not here.

### Reconciliation with existing work

- The catalog, action-affordance and homepage carousel specs are implemented. D01, D02 and H03 are new polish on finished work, not open acceptance gaps.
- [Movable-point cursor](movable-point-cursor.md) was verified on 2026-10-25 for Bézier and function graphs only. Interval Sweep does not use the shared binding, which is consistent with M02.
- [Verification throughput](verification-throughput.md) phases 0–7 are largely implemented. Full hosted runs on 2026-11-13 and 11-14 still took a median of 12.2 min, against 8:39 on 2026-11-09, which is consistent with T01.
- [Control choice and composition](control-choice-and-composition.md) started on 2026-11-14 and owns the graph inspector panels. Packages B and D do not edit panel controls.
- [Elder identity](elder-identity.md) artwork is postponed by the owner. L05 concerns the existing [side botanicals](side-botanicals.md) on chapter pages; that spec currently excludes animated branches from chapter pages, so package C records the reversal there.
- H01 removes the homepage's author and supervisor credit and its contact line. The user impact is recorded in package B.
