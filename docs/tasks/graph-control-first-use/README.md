# First-use control plans for the full catalogue

These plans cover **138 public Demonstrations across 18 catalogue families** at revision `25fcac1c`. Each graph has its own first task, controls to move or group, and a visible result to check. The [source spec and visual audit](../../specs/graph-control-first-use.md) set the interaction goals and architecture. The pages below are implementation plans.

## Start with three routes

Start with the local Epicycles reorder. The source plan specifies when to introduce the curve-order option, how to verify an optional mobile scrubber on two graphs, and how to update preview selectors when wording changes. [Architecture and implementation sequence](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

| Pilot | First experiment | What it tests |
| --- | --- | --- |
| [Epicycles](analysis.md#epicycles) | Press Play, then choose the diamond and change the harmonic cutoff. | Can a small panel make the first action obvious? Preserve the default circle and shared Play/Pause behaviour. |
| [De Casteljau](bezier.md#decasteljau) | Scrub one construction before opening its point coordinates. | Can an opt-in ordering in a curve graph expose the construction and preserve the full point editor? |
| [Simulation of random experiments](probability.md#prob-simulation) | Change the Galton board's ball count and compare the histogram with its prediction. | Can conditional settings get out of the way while saved seeds and repeated runs remain reproducible? |

After the pilots, apply a successful change first to the audited siblings listed on each family page. Use Bernstein and Convex hull as comparison cases for single-control and many-control panels. For the remaining 108 routes, inspect the live opening and try the proposed task before editing. When the current panel already meets the acceptance check, record that result and keep its layout.

## Family plans

| Catalogue family | Graphs | In the visual audit |
| --- | ---: | ---: |
| [Basics](basics.md) | 2 | 1 |
| [Bézier curves](bezier.md) | 11 | 3 |
| [Rational Bézier curves](rational.md) | 7 | 1 |
| [Splines](spline.md) | 5 | 1 |
| [PH curves](ph.md) | 2 | 0 |
| [Parametrizations](param.md) | 3 | 0 |
| [Geometry of curves](curve-geometry.md) | 8 | 1 |
| [Interpolation and approximation](interpolation.md) | 5 | 1 |
| [B-splines](bspline.md) | 6 | 1 |
| [Bézier patches](patches.md) | 7 | 1 |
| [Functions and calculus](functions.md) | 16 | 6 |
| [Analysis](analysis.md) | 23 | 5 |
| [Probability and statistics](probability.md) | 6 | 3 |
| [Combinatorics](combinatorics.md) | 2 | 1 |
| [Maps of the plane](maps.md) | 6 | 1 |
| [Plane geometry](plane-geometry.md) | 8 | 1 |
| [Computational geometry](computational-geometry.md) | 16 | 2 |
| [Projective geometry of conics](projective.md) | 5 | 1 |
| **Total** | **138** | **30** |

**Evidence.** “Audited” links to the earlier 310 px visual review. “Source-planned” means the plan draws on the registered teaching prompts, implementation or capture recipes. Its proposed ordering and acceptance check still need a rendered review. Each graph links to its public route and the graph module resolved by its runtime loader. Families follow the public catalogue, which sometimes presents graphs implemented in different source directories.

## Definition of done for a route

1. From an ordinary fresh visit, try the named task on the current version. Record what the visitor must choose, what is visible on the board and what they must scroll to. A deliberate reveal or a genuine selection requirement belongs in the task.
2. Compose the first experiment inside the graph's existing Edit or Display content with the [shared controls](../../controls.md). Keep one owner for each value and one live control when placement changes. Use named disclosures for optional work. Keep exact entry, validation, feedback and active editing modes reachable.
3. Repeat the route's acceptance check on the board and its readout. Compare the 310 px desktop inspector and a narrow touch viewport, exercise the keyboard equivalent, check enlarged text, and verify the Slovenian and English labels. Check shared playback, manual operation in reduced motion and Presentation wherever the route uses them.
4. Verify scene and control agreement after reset, example change, preset restore and any guided lesson that drives the regrouped controls. Keep the same lesson-action IDs, route identities, preset fields, domain handling and board ownership. Check affected preview recipes when renaming a control. Run the focused checks and browser verification required by the source spec and repository.

For the three pilots, the [usability tasks](../../specs/graph-control-first-use.md#rollout) also give a way to measure whether newcomers can start unaided and explain what changed. The per-route checks below are proposed acceptance criteria.
