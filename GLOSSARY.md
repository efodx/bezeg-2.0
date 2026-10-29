# Bezeg

Bezeg is an educational tool for exploring the properties of curves through interactive demonstrations.

## Language

**Bezeg**:
The educational app for students and educators exploring Bézier, rational Bézier, spline, and PH curve concepts, and the function and calculus concepts that lead to them.

**Function demonstration**:
A Demonstration of a real function graph `y = f(x)` in the *Functions and calculus* family (linear, exponential and trigonometric functions, continuity, derivative, definite integral, area between curves, arc length), as distinct from a curve demonstration driven by control points.

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
