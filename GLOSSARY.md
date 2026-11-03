# Bezeg

Bezeg is an educational tool for exploring the properties of curves through interactive demonstrations.

## Language

**Bezeg**:
The educational app for students and educators exploring Bézier, rational Bézier, spline, and PH curve concepts, and the function and calculus concepts that lead to them.

**Function demonstration**:
A Demonstration of a real function graph `y = f(x)` in the *Functions and calculus* family (linear, exponential and trigonometric functions, continuity, derivative, definite integral, area between curves, arc length), as distinct from a curve demonstration driven by control points.

**Trace**:
The recorded sequence of steps of an algorithm Demonstration in the *Računska geometrija* family (convex hull, ear clipping, sweeps, Lawson flips). Next step and playback walk the same trace; editing the input recomputes it and returns to step 0.

**Beach line (obalna črta)**:
In Fortune's algorithm the lower envelope of the parabolas of the sites already passed by the sweep line; its arcs, read left to right, are named by their sites and its breakpoints trace the Voronoi edges.

**Circle event (krožni dogodek)**:
An event of Fortune's algorithm at the lowest point of the circle through three sites on consecutive arcs; the middle arc disappears and a Voronoi vertex is reported.

**False alarm (lažni alarm)**:
A scheduled circle event that is cancelled before it is reached because the circle is no longer empty (a site event split an arc or changed a neighbour).

**Orientation**:
The sign of the cross product \((q-p)\times(r-p)\) of three grid points, computed exactly (`orient`): positive is a left (counter-clockwise) turn, negative a right turn, zero collinear. Every decision of the *Računska geometrija* family reduces to orientation or another exact sign test, never to a floating-point comparison.

**Signed area**:
The shoelace sum \(\tfrac12\sum(x_iy_{i+1}-x_{i+1}y_i)\) of a polygon: positive for counter-clockwise vertex order, negative for clockwise. For a self-intersecting polygon it is the sum of winding number times area, not "the area", and Pick's theorem (\(A=I+B/2-1\) for lattice polygons) is not offered.

**Convex hull**:
The smallest convex polygon containing a point set. The hull Demonstration builds it by three algorithms (the slow edge test, the monotone chain and gift wrapping) that must return the same vertices; a point on a hull edge is on the boundary but not a vertex.

**Ear**:
Three consecutive polygon vertices whose turn is strictly convex and whose triangle contains no other vertex; ear clipping removes one ear per step until a triangle remains.

**Triangulation** (*triangulacija*):
A maximal set of non-crossing segments between the points of a point set, which divides the convex hull into triangles. It exists only for at least three points that are not all collinear and are pairwise distinct; the point-set triangulation Demonstration refuses other input.

**Edge flip** (*zamenjava roba*, Lawson flip):
Replacing the diagonal of a convex quadrilateral formed by the two triangles at an interior edge with its other diagonal. The counts of triangles and edges do not change; a flip is refused for a boundary edge or when the quadrilateral is not strictly convex.

**Illegal edge** (*neustrezen rob*):
An interior edge \(ac\) of a triangulation whose neighbouring triangle has its opposite vertex \(d\) strictly inside the circumcircle of \(abc\) (incircle determinant \(D>0\)). Flipping it increases the sorted angle vector lexicographically; an edge with \(D\le0\) is legal.

**Empty circle / incircle test** (*preizkus krožnice*):
The exact sign of the incircle determinant of four grid points, which tells whether the fourth lies inside, on or outside the circle (*očrtana krožnica*) through the first three taken counter-clockwise. A triangulation whose circumcircles all pass this test empty is a Delaunay triangulation.

**Delaunay triangulation** (*Delaunayeva triangulacija*):
A triangulation in which every edge is legal, equivalently no triangle's circumcircle holds another point strictly inside; it is unique when no four points lie on one circle. Lawson's algorithm reaches it from any triangulation by flipping illegal edges until none remain; the Delaunay Demonstration records those flips as a trace.

**Voronoi diagram** (*Voronojev diagram*):
The division of the plane into cells, one per site (*mesto*): the cell (*celica*) of a site is the set of points no farther from it than from any other site, an intersection of half-planes bounded by perpendicular bisectors. Voronoi vertices (*Voronojeva oglišča*) are points equidistant from three or more nearest sites; cells of sites on the convex hull are unbounded, and the edge between the cells of two consecutive hull sites is a ray.

**Duality** (*dualnost*):
The correspondence between the Voronoi diagram and the Delaunay triangulation of the same sites: each Delaunay triangle gives the Voronoi vertex at its circumcentre, each interior Delaunay edge a finite Voronoi edge and each hull edge a ray. The dual is a triangulation only when no four sites lie on an empty circle.

**Cocircular points** (*kocirkularne točke*):
Four or more points on one circle, detected when the incircle test returns zero. When that circle holds no other site, the Delaunay triangulation is not unique and the Voronoi vertex at its centre has degree four or more; the degenerate-sites Demonstration shows this case next to collinear sites, whose cells are strips and half-planes with no vertices.

**Sweep line**:
A line moved across the plane that stops only at events (interval or segment endpoints, intersections) held in the event queue; the status is the ordered list of objects the line currently crosses.

**Monotone polygon** (*monotoni večkotnik*):
A polygon is \(y\)-monotone when every horizontal line meets it in at most one segment, so its boundary splits into a left and a right chain from the top vertex to the bottom one. The monotone partition Demonstration cuts a simple polygon into such pieces; the monotone triangulation Demonstration then triangulates each piece with a stack.

**Vertex type** (*vrsta oglišča*):
The class a downward sweep gives each polygon vertex from its two neighbours and its interior angle: start, end, split, merge or regular (*začetno, končno, razcepno, zlivno, navadno oglišče*). Equal heights are ordered by smaller \(x\) first. Split and merge vertices are exactly where the polygon fails to be \(y\)-monotone.

**Helper** (*pomočnik roba*):
For an edge in the sweep status, the lowest vertex above the sweep line whose horizontal segment to that edge stays inside the polygon. A split vertex, or a later vertex meeting a merge helper, receives a diagonal to the helper.

**Iteration**:
One revealed step of an iterative Demonstration such as bisection. Next step and playback run the same transition, so k steps by either route give the same state; the iteration index is saved with a Preset, running playback is not.

**Bracket**:
An interval [a, b] on which a continuous function has opposite signs at its endpoints, so the intermediate value theorem guarantees a root inside. An interval with equal signs is an invalid bracket, not a proof of "no root".

**Accumulation function**:
The signed accumulated integral A(x) of a function f from a fixed lower bound a to x. It is signed, never the unsigned area, and its slope at x is f(x).

**Demonstration**:
An interactive mathematical example through which a learner explores a curve concept or construction.
_Avoid_: Tool (when referring to the whole example)

**Bézier patch**:
A parameterized surface defined by a control net and Bernstein weights. Tensor-product patches use two independent parameter directions; triangular patches use three nonnegative barycentric parameters that sum to one.

**Control net**:
The indexed grid or triangular array of control points that determines a Bézier curve or patch.

**Barycentric coordinates**:
Nonnegative weights whose sum is one, used to identify a point in a triangle; a triangular Bézier patch uses these as its parameters.

**Preset**:
A named saved configuration of a demonstration that can be reopened or exchanged as a file.

**Presentation mode**:
A view of a demonstration that gives the graph more space for classroom projection.
_Avoid_: Fullscreen (unless referring to the browser's fullscreen feature)

**Learning path**:
A progression through chapter sections and their Guided examples, with each example connecting back to its chapter explanation.

**Guided example**:
A chapter-owned mathematical example that combines explanation and directed graph exploration in a Demonstration. It may contain a single exploration prompt or several ordered explanation and observation frames.
_Avoid_: Guided lesson, Guided path (for an individual example), Vodena učna pot; use Vodeni primer in Slovenian.

**Study chapter**:
A readable development of a mathematical topic through motivation, explanation, worked examples, and graph activities, with sections that learners can revisit directly.

**Chapter activity**:
A Guided example encountered within a Study chapter. A Demonstration can support examples in several chapters.

**Lesson step**:
One learner-facing unit within a Guided example. It may explain a concept, establish a graph scene, invite an observation, or lead to the next step.

**Graph action**:
A learner-visible operation that a Demonstration exposes for a Guided example, such as changing a parameter or showing a construction.

**Lesson scene**:
A temporary graph configuration used to illustrate a Lesson step.

**Lesson progress**:
The learner's position within a Guided example.

**Lesson overlay**:
A graph-anchored presentation of a Guided example that keeps the graph visible while changing between explanation and active exploration context.
_Avoid_: Lesson panel, when the graph remains the primary workspace

**Exploration prompt**:
The compact lesson context shown while a learner is actively using the graph, containing the current step, observation cue, and navigation back to the explanation.

**Graph animation**:
A time-based visual progression of a graph-owned mathematical construction, distinct from decorative motion used to transition the lesson overlay.

**Lesson frame**:
A bounded learner-facing view within a Lesson step, focused on one explanation, observation, or graph action.

**Explanation frame**:
A Lesson frame that introduces the current mathematical idea or notation before graph interaction.

**Observation frame**:
A Lesson frame that gives the learner a graph-focused action or prompt and makes the relevant visual evidence easy to inspect.

**Reviewed lesson**:
A Guided example whose mathematical claims, learner-facing copy, prepared scenes, graph actions, and required interaction evidence have been approved for its Demonstration.

**Lesson cohort**:
A bounded rollout group of Demonstrations that share a mathematical family or capability pattern and are reviewed together.

**Capability matrix**:
A project inventory that maps each Demonstration to its supported Guided example actions, prepared scenes, correctness checks, and review status.
