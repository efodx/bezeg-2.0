# Functions and projective graph review

Frozen production snapshot `d2a3b646`, Chromium, initially 1440×900 with selected 390×844 and 1920×1080 captures. The independent technical pass used 1440×1000 for interactions. The initial Luna Max reviewer walked all 14 lessons to their final frames. The handler inspected corrected graph screenshots and the mobile Pascal/three-views/cross-ratio captures. Detailed action records and evidence corrections are retained in [the reviewer handoff](functions-handoff.md).

The desktop graphs generally look coherent and usable. The restrained palette and large board work well for transformation and numerical examples. Projective constructions need more deliberate mobile composition and stronger separation of the main object from its auxiliary lines. No reproducible functional control failure was established by the initial pass.

## Findings

### F1 — P2: Three-views comparison becomes cramped on a narrow screen

On `projective-three-views` at 390×844, finish the lesson and choose Observe on the graph. The source and image panels remain side by side inside the roughly 364 px board. Each comparison occupies only about 170 px; the source title is clipped at the left edge and its line label runs across the shared axis. The two conics are small relative to surrounding empty graph space. The slider remains reachable, but comparing the two constructions and reading their labels requires extra effort. This is a responsive graph-layout defect, not a broken slider.

Stack the source and image panels on narrow screens, or provide a clearly labeled source/image focus switch. Keep equal mathematical scale where comparison requires it, and frame titles inside their own panels. [Screenshot](evidence/functions-projective-three-views-narrow-390.png).

### F2 — P3: Pascal's narrow graph gives auxiliary lines too much visual weight

On `projective-pascal` at 390×844, the hexagon, extended sides, intersection labels and Pascal line compete in the same small area. Some intersections are intentionally outside the window and described as such, so this is not a mathematical-framing bug. The visual opportunity is to make the conic/hexagon and current Pascal line stronger than inactive construction lines, and reveal supporting labels when relevant. [Screenshot](evidence/functions-projective-pascal-narrow-390.png).

### F3 — P2: Cross-ratio point labels collide on a narrow screen

The independent technical pass found crowded labels near the origin on `/projective/cross-ratio` at 390×844 with the default example. The page fits the viewport, but source/image labels and M/N are hard to distinguish inside the 364×295 board. The handler confirmed this in the saved capture. Offset or selectively reveal labels and frame the default construction for the available board size. Point editing itself worked: dragging D changed its coordinate and the exact cross-ratio readout. [Screenshot](evidence/technical-projective-mobile.png). See [technical findings and action evidence](technical.md).

## Observed coverage

Every row reached its final lesson frame. Control evidence below uses actual controls/readouts; discarded generic-SVG comparisons are excluded.

| Graph | Observed action and response | Remaining limit |
| --- | --- | --- |
| function-transformation | Numeric a −2→−1.5 changed formula/parabola | Continuous drag timing not measured |
| function-inverse | x₀ 2→2.5 entered | Detailed board response not retained |
| polynomial-zeros | Numeric root −3→0; unobstructed pointer drag −2→−0.9 | In-lesson first drag inconclusive |
| rational-function | k 1→1.5 entered; 390 px page had no overflow | Continuous drag not measured |
| root-finding | Next changed iteration/error readout | Full playback timing not measured |
| quadrature | Lower limit 0→0.5 entered | Detailed path samples not retained |
| euler-method | Initial x₀ 0→0.5 entered | Detailed path samples not retained |
| fourier-series | N 11→12; readout explained the zero even harmonic and unchanged square-wave sum | Continuous drag not measured |
| fourier-coefficients | Final screenshot is step 14/14, frame 2/2; technical pass changed a₁→b₁ with keyboard and switched to coefficient decay; readout/plots changed | Full inspector is scrollable on desktop; comprehensive keyboard order not tested |
| projective-cross-ratio | Final construction and exact 3/2 readouts inspected; technical pass dragged default-example D 4→5 and cross-ratio 9/8→6/5; keyboard pan changed board | Mobile labels collide (F3); physical touch not tested |
| projective-pascal | Conic selector changed to parabola; Pascal line/readout changed to y+1=0 | Physical touch not tested |
| projective-pole-polar | Final construction inspected; technical pass dragged P (1,21/5)→(2,24/5), updating polar/tangent equations | Physical touch not tested |
| projective-five-point | Final construction inspected; technical pass dragged a defining point, updating conic equation, weight and Farin points | Independent mathematical correctness not re-proved by this UX check |
| projective-three-views | Actual c-slider drag −1.5→0.1 changed ellipse→hyperbola and discriminant −80→39600 | Physical touch not tested |

See [the independent technical pass](technical.md) for additional actions and explicit limits. No claim of comprehensive accessibility, physical-phone behavior, classroom observation or measured frame performance is made. Initial invalid toolbar-icon captures were removed and their change claims invalidated. Worker browser/scripts exited; the preview remained handler-owned.
