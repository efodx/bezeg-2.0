# Make the first graph interaction obvious

**Proposal, 19 November 2026.** A visitor should be able to open a Demonstration, do one interesting thing and see what changed. The first pilot should be **Epicycles**, the graph the owner recalls their visitor trying. Follow it with **De Casteljau** and **Simulation of random experiments**. Those three test different ways to start exploring.

## What the visitor meets on Epicycles

The graph opens paused on a circle. The first controls are “Primer” (Example), “Število členov N” (Number of terms N), and “Parametrizacija” (Parametrization). The button that sets the circles moving comes after an explanation of equal versus chord-length parametrization. A newcomer can reasonably read this sequence as a set of decisions they must make before pressing Play. The existing example already runs with one click.

At 1440 × 900, Play starts 762 px down the page. The prompt that actually suggests playing begins at 1013 px, outside the window. At 390 × 844, the existing graph-adjacent Play button **already works well**. It occupies the last 44 px of the first screen. The manual time slider begins at 1534 px, well away from the graph. In the desktop reduced-motion check, automatic playback was unavailable and an arrow key on the time slider advanced the trace.

The starting example also matters. We ran the trace, changed the example, and compared the reported maximum trace error at two settings. On the circle, going from $N=1$ to $N=5$ changed the error from 0.00735 to 0.00155. On the diamond the same change took it from 0.18943 to 0.06694. The diamond gives someone a specific feature to watch as they move the slider. Its corners sharpen. There is also a naming problem. At $N=5$ the interface labels the input “number of terms” and reports **11 terms**. The model includes frequencies from $-N$ through $N$, including the constant term. These are plausible sources of friction. The visitor's own sequence of actions is unknown.

![Published Epicycles inspector beside a proposed 310 px layout. The proposed panel starts with a prompt about the corners of a diamond, a Draw trace button and manual time control. Shape and trace detail follow, with coordinates, parametrization and calculations in named disclosures.](../reviews/graph-control-first-use/epicycles-proposal.png)

**What to try in the pilot.** Open an ordinary fresh visit on the existing diamond example at $N=1$, paused. Put “Izriši sled” / “Draw the trace” and manual time first. Then offer the shape and “Podrobnost sledi (N)” / “Trace detail (N)” with the exact field and computed term count. At the diamond, invite the visitor to increase (N) and watch the corners. The geometric question follows the selected shape. Explain the harmonic cutoff and show the coefficient table under “Terms and approximation error”. Keep the circle within the example chooser. The new starting example is a proposal to test. Existing saved scenes, authored lesson scenes and explicit example links should continue to open with their own values.

## What recurred across 30 graphs

| Finding | Published evidence | Design response |
| --- | --- | --- |
| The first task is often buried under setup. | De Casteljau opens with a curve-selection notice and ten coordinate fields before Play. Simulation shows the generator seed and a second seed while seed comparison is off. | Put the action that changes the picture first. Open the exact coordinates by name, and show the second seed when someone enables comparison. |
| An empty-looking panel can be as confusing as a full one. | Bézier opens with one curve on the board and “Nobena krivulja ni izbrana” (No curve is selected). Clicking the lone curve button reveals five operation disclosures plus point editing. Bernstein's degree control, by comparison, gives an immediate experiment in the same amount of space. | Let the first line say which point to drag and what will bend. Give keyboard users an adjacent way to choose and move a point. Ask for curve selection when the operation needs a target. |
| Settings, explanations and actions have nearly equal visual weight. | On the tensor patch, a degree-reduction explanation fills the space between the two degree controls. On Triangle centres, a list of calculations and coordinates takes the first screen below the example chooser. | Reserve one strong control or direct-manipulation cue for the first move. Keep one telling result close to it. Put the detailed explanation beside the operation it explains. Keep long calculations available by name. |
| The ordering matters more than the total number of controls. | Convex Hull exposes 41 Edit controls across the panel, yet Next step is the second control. Bisection's Next step cut the default interval width from 1 to 0.5 and showed which half survived. On Linear function, editing one point changed the slope and equation together. | Reuse these short action–result loops. A useful primary action can be a slider, a point or a Step button. A graph with one obvious degree control can stay that simple. |
| A control can work while its result is offscreen. | At 390 × 844, Linear function's inspector starts below the board. Typing a slope of 3 gave an equation of $y=3x+1$ in the inspector, while scrolling to the field moved the board out of view. Bisection already keeps its step control at the board. | Put the one essential action next to the graph on small screens. Reuse the existing playback slot where applicable. Keep a compact result beside a field that must remain below the board. |

**Visual treatment.** Keep the cream panel, green actions, readable sizes and current targets. Within Edit, give the first experiment a short instruction and one visually dominant action. Then group the remaining fields by what someone is trying to do, using names such as “Edit point coordinates”, “Set the interval”, or “Compare seeds”. Prefer spacing and a single rule between tasks to a box around every field. Retain the visible selected state of board modes. Put a slider's exact entry on the same row as its label. On a graph that starts with a drag, the plotted handle and its cue can carry the emphasis.

## Sample and visual evidence

We opened the published site in a clean Edge/Chromium browser, default Slovenian, at 1440 × 900 with a 310 px inspector. All 30 Edit panels were inspected as images. We also opened Display and Save across the sample. Display varies by graph and sometimes contains part of the mathematics, such as Derivative's exact tangent. Save contains familiar shared preset and export controls. The recommendations below focus on entering free exploration. The sample deliberately includes sparse and dense panels, 2D and 3D graphs, direct manipulation, algorithms and simulations. The deployed entry asset observed on Epicycles was `index-4YFBiBaU.js`.

**How to read the counts.** “In view / total” counts fully visible controls on the first desktop screen over all rendered controls in the initial Edit section. Each button, select, input and disclosure summary counts once. Thus a slider and its exact field count as two controls for one decision. Closed disclosure contents, the tab bar and board controls are excluded. Readouts and teaching text occupy space without adding to these counts. **20 of 30** had an Edit control outside the first screen. **23 of 30** had content taller than the inspector's own scroll region, including readouts. These are layout observations. User comprehension and completion time were not measured.

### Curves and constructions

[View the five panels at their captured width](../reviews/graph-control-first-use/panels-1.png)

| Graph | In view / total | Opening panel | Proposed first task |
| --- | ---: | --- | --- |
| [Bézier curve](https://efodx.github.io/bezeg-2.0/bezier/curve) | 2 / 2 | A single curve is visible, but Edit opens by saying none is selected. | Drag an orange control point to bend the curve. Offer precise point entry alongside that cue. |
| [De Casteljau](https://efodx.github.io/bezeg-2.0/bezier/decasteljau) | 11 / 17 | Curve selection and five pairs of coordinates fill the panel before animation. | Run the construction or scrub its position. Group coordinates and speed separately. |
| [Subdivision](https://efodx.github.io/bezeg-2.0/bezier/subdivision-2) | 10 / 12 | Four coordinate pairs take precedence over the subdivision parameter and action. | Place the split point and subdivide. Put exact point coordinates in a single disclosure. |
| [Rational Bézier curve](https://efodx.github.io/bezeg-2.0/rational/base) | 9 / 9 | The opening screen contains a selection notice and four coordinate pairs. The distinctive weight control is absent from this view. | Choose a point and vary its weight. Show the resulting pull on the curve. |
| [Symmetric C¹ spline](https://efodx.github.io/bezeg-2.0/spline/c1spline) | 13 / 13 | Six pairs of point coordinates dominate the view of a continuity demonstration. | Identify a movable handle at a join and show how its neighbour follows. Keep exact coordinates available. |

### Basis functions, interpolation and surfaces

[View the five panels at their captured width](../reviews/graph-control-first-use/panels-2.png)

| Graph | In view / total | Opening panel | Proposed first task |
| --- | ---: | --- | --- |
| [Bernstein polynomials](https://efodx.github.io/bezeg-2.0/bernstein) | 3 / 3 | A single degree stepper occupies the panel. The count is readable and the graph is beside it. | Keep this as a reference. Ask what happens when the degree goes up by one. |
| [de Boor's algorithm](https://efodx.github.io/bezeg-2.0/bspline/deboor) | 7 / 25 | Degree, count and the knot-replacement explanation precede Next level. | Advance one level and see the construction contract. Move knot-vector and degree editing into setup. |
| [Through the points or near them](https://efodx.github.io/bezeg-2.0/interpolation/lagrange) | 11 / 16 | A parameter convention, point count and four coordinate pairs precede the curve-comparison tools. | Start by moving one point and comparing the two curves. Group point setup and basis options. |
| [Curvature and the osculating circle](https://efodx.github.io/bezeg-2.0/curve-geometry/curvature) | 4 / 4 | The parameter slider already comes first. The curve-selection block below it is more prominent than an explanation of what moves. | Keep the slider first. Identify the circle whose size changes along the curve. |
| [Tensor-product Bézier patch](https://efodx.github.io/bezeg-2.0/patches/tensor) | 7 / 13 | The example name repeats beneath its chooser, then two degree controls and a long derivation precede the surface point controls. | Invite a control-net drag to reshape the dome. Expose coordinates, Bernstein weight, degree and approximation details by task. |

### Functions and calculus

[View the five panels at their captured width](../reviews/graph-control-first-use/panels-3.png)

| Graph | In view / total | Opening panel | Proposed first task |
| --- | ---: | --- | --- |
| [Linear function](https://efodx.github.io/bezeg-2.0/functions/linear) | 6 / 6 | Four coordinate cells precede slope and intercept, although the equation makes changes easy to interpret. | Move one point or change the slope and keep the updated equation adjacent. Group exact point coordinates. |
| [Transforming a function graph](https://efodx.github.io/bezeg-2.0/functions/transformations) | 7 / 12 | Vertical and horizontal stretch appear before shifts in a tall stack of similar sliders. | Start with one translation and its effect on the two graphs. Group the other translations and stretches by task. |
| [Polynomial zeros and multiplicity](https://efodx.github.io/bezeg-2.0/functions/polynomial-zeros) | 7 / 11 | The coefficient leads, followed by repeated location, multiplicity and Remove controls for each zero. | Change one highlighted zero and compare crossing versus touching. Defer adding and removing zeros. |
| [Derivative](https://efodx.github.io/bezeg-2.0/functions/derivative) | 4 / 4 | The step-size slider is visible, followed by a long explanation of the forbidden zero. The exact tangent is in Display. | Bring the secant toward the tangent with the step slider. Keep the limit result nearby and the zero-step rule with exact entry. |
| [Definite integral](https://efodx.github.io/bezeg-2.0/functions/integral) | 6 / 8 | Two bound sliders and their explanation precede the subinterval and sum controls. | Increase the number of rectangles and compare the sum with the integral. Offer bounds and rule together as setup. |

### Algorithms and motion

[View the five panels at their captured width](../reviews/graph-control-first-use/panels-4.png)

| Graph | In view / total | Opening panel | Proposed first task |
| --- | ---: | --- | --- |
| [Bisection](https://efodx.github.io/bezeg-2.0/analysis/bisection) | 8 / 8 | Interval setup occupies most of the first screen, but a single Next step produces a clear visual and numerical change. | Lead with Next step and the surviving interval. Keep the endpoints together under interval setup. |
| [Epicycles](https://efodx.github.io/bezeg-2.0/analysis/epicycles) | 6 / 7 | Shape, cutoff and parametrization come before Play. The chosen circle barely changes over common cutoff values. | Start the diamond trace, scrub it, then adjust detail and inspect the corners. See the pilot above. |
| [Direction field and Euler's method](https://efodx.github.io/bezeg-2.0/analysis/euler-method) | 4 / 9 | The equation, start coordinates and step-size explanation appear before the action that draws a step. | Take one Euler step in the visible field, then change step size and compare paths. |
| [Logistic map and bifurcations](https://efodx.github.io/bezeg-2.0/analysis/logistic-map) | 7 / 7 | The parameter, initial value, and step/play controls are all on the first screen. Detailed diagnostics follow. | Keep this grouping. Call attention to the next iterate, then offer period and stability results. |
| [Waves and sampling](https://efodx.github.io/bezeg-2.0/functions/waves) | 7 / 16 | Several amplitude and phase controls appear before playback in the default wave-addition example. | Play the sum of two waves, then change one phase and watch the sum. Reveal the other wave settings together. |

### Geometry and maps

[View the five panels at their captured width](../reviews/graph-control-first-use/panels-5.png)

| Graph | In view / total | Opening panel | Proposed first task |
| --- | ---: | --- | --- |
| [Notable points of a triangle](https://efodx.github.io/bezeg-2.0/triangle-centres) | 1 / 23 | After the example chooser, computed radii, centre positions and vertex coordinates occupy the opening view. | Drag a vertex and follow one centre. Let the visitor choose more centres and expand their calculations. |
| [Convex hull](https://efodx.github.io/bezeg-2.0/compgeo/convex-hull) | 5 / 41 | Next step is immediately below the algorithm selector. The 41-control panel grows mostly farther down in point editing. | Keep Next step in place. Keep the accepted edge visible and fold the long point editor. |
| [Delaunay triangulation](https://efodx.github.io/bezeg-2.0/compgeo/delaunay) | 4 / 32 | The example and step controls lead well. A full explanation of edge flipping then separates the action from its status. | Keep Step and the tested edge together. Put the longer algorithm explanation behind an explicit link or disclosure. |
| [Linear map](https://efodx.github.io/bezeg-2.0/linear-map) | 8 / 10 | The example, display mode, four matrix cells and identity reset precede the readout. | Move one basis vector and watch the unit square. Keep the matrix together for exact entry. |
| [Cross-ratio and central projection](https://efodx.github.io/bezeg-2.0/projective/cross-ratio) | 1 / 18 | Only the example fits as a first-screen Edit control. Exact and decimal ratios and point listings occupy the remaining space. | Move a source point and compare the two ratios side by side. Fold the coordinate listings. |

### Probability, counting and solids

[View the five panels at their captured width](../reviews/graph-control-first-use/panels-6.png)

| Graph | In view / total | Opening panel | Proposed first task |
| --- | ---: | --- | --- |
| [Density and probability as area](https://efodx.github.io/bezeg-2.0/probability/density) | 7 / 7 | Mean and spread lead, while the area experiment described by the title relies on the two interval boundaries. | Drag a boundary and watch the probability percentage. Put distribution parameters in a named group. |
| [The central limit theorem without randomness](https://efodx.github.io/bezeg-2.0/probability/clt) | 6 / 17 | Add another copy is already near the top. The lower panel contains five individual density-height controls. | Keep Add another copy and the changing curve together. Fold custom distribution editing. |
| [Simulation of random experiments](https://efodx.github.io/bezeg-2.0/probability/simulation) | 5 / 15 | Seed, sample count, comparison switch and second seed precede the run controls on the default Galton board. | Change the number of balls and compare the histogram with the expected shape. Show the second seed when comparing runs. |
| [Lattice paths and Pascal's triangle](https://efodx.github.io/bezeg-2.0/combinatorics/lattice-paths) | 6 / 11 | Content, example and target coordinates come before the selected-path slider and pagination. | Trace a different route to the same target. Group grid setup and list pagination separately. |
| [Solids, sections and volumes](https://efodx.github.io/bezeg-2.0/analysis/solids) | 4 / 10 | Shape and mode are followed by three plane-normal components. The plane offset is farther down. | Slide the cutting plane through the cube and watch the section. Put plane orientation and exact components in their own group. |

## Rollout

| Order | Work | Acceptance |
| --- | --- | --- |
| 1 · Epicycles | Reorder the existing controls, distinguish cutoff from term count, and try the diamond opening shown above. Compare the entry experience to the current circle. | From a fresh desktop or phone visit, trace the shape or scrub manually with the graph visible. Change detail, see the effect at a corner, and find the coefficient table and exact point entry. A reduced-motion visitor can do the same experiment manually. |
| 2 · De Casteljau and Simulation | Apply the idea to a point-based construction and a statistical experiment. De Casteljau begins with running or scrubbing the construction. Simulation begins with a visible experiment and sample size. Expose seed comparison on request. | Animate De Casteljau without selecting a curve or paging through coordinates. On the default Galton board, change the ball count and see the histogram and deviation respond. Then set a precise coordinate or reproduce a simulation by seed. |
| 3 · Apply what transfers | First cover the related curve, playback and simulation families. Then address results-first geometry panels and precision-heavy 3D panels. Use the sample table to choose each first task. Keep short, effective panels as comparison cases. | For each migrated route, capture the opening panel at 310 px, the chosen action and its visible consequence. Verify representative phone and keyboard paths. Create a shared composition only after the pilots demonstrate the same need across graphs. |

**How to tell whether this helped.** Use the same neutral tasks on the current and pilot versions. For Epicycles, ask “Can you get the circles to draw a shape?” and then “Can you make the trace come closer to the corners?” For De Casteljau, ask to show how the curve is constructed. For Simulation, ask to compare what happens with fewer balls. Avoid mentioning the button or slider in the task. Record time to first meaningful graph change, wrong turns, requests for help and whether the visitor can point to what changed. A practical pilot target is 4 of 5 first-time visitors completing the first task unaided within 20 seconds. Split or counterbalance the versions to limit practice effects. This is a proposed usability target and optional observation exercise. A teacher's counter-test is to set an exact value, restore a saved setup and demonstrate the same construction.

**Implementation boundaries.** Start in each graph's ordinary control composition, including `EpicycleGraph.tsx`, the curve panels under `src/graphs/base/controls/` and `SimulationGraph.tsx`. Use the shared controls catalogue, `InspectorDisclosure`, existing board handles and the responsive playback slot. Move each control with its existing value, focus, validation and accessible name. Bring the existing route-specific prompt into view next to the first action and retire the generic instruction there. For reduced motion, give the manual time control the prominent place at the graph. Do not add a mandatory tutorial or a global beginner/expert preference. Keep topic-specific vocabulary and mathematical detail accessible at the point of use. [Control catalogue](../controls.md) · [Phone playback](mobile-graph-playback.md)

**Checks for implementation.** Verify the first action and its consequence at 1440 × 900, 390 × 844 and enlarged text. Exercise keyboard point entry and manual motion, reduced motion, Slovenian and English, and Presentation mode. Check that reset, example changes, lessons and preset restore synchronize the board and inspector. Check prompts, accessible names, localized strings and preview recipes when changing a label or starting scene. Advanced operations, exact entry, refusal messages and saved setups must remain reachable. The scope of this document is the audit and proposal.
