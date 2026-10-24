# Bézier curves: shaping a curve with control points

Status: content outline and source map for the released Bézier pilot. See [implementation and hosted verification](../reviews/standalone-learning/implementation.md), [Slovenian source copy](../content/bezier-curves.sl.md), [English counterpart](../content/bezier-curves.en.md), and [activity script](bezier-study-chapter-activities.md). The [standalone learning specification](standalone-learning.md) owns layout, routes, activity IDs and shared graph behavior. Existing wording is approved and physical-device/projector/classroom gates are removed under the [2026-10-24 owner policy](../guardrails.md#release-policy--owner-decision-2026-10-24), superseding conflicting historical criteria below.

Source direction: [standalone learning](standalone-learning.md). Main subject source: Kevin Štampar, *Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj*, master's thesis, University of Ljubljana, 2024. Owner-supplied file: `15092.pdf`; read from `C:/Users/NonFriedMotherBoard/Downloads/15092.pdf`. Printed pages and PDF viewer pages differ by ten. The repository does not require that machine-specific path; the citation and section/page references below identify the source.

## Learning boundary

Teach how a designer can specify and edit a smooth polynomial curve using control points, how a parameter selects a point on it, and why the resulting representation has useful geometric guarantees.

The intended reader knows plane coordinates and basic algebra, including powers and multiplication. Introduce a parametrized point, a weighted combination, and linear interpolation inside the chapter. Do not require previous familiarity with Bernstein polynomials, Bézier curves, or calculus. This is an entry chapter to an advanced family, not a promise to teach all prerequisite mathematics or serve every age with the same explanation.

The owner wants intuition and precise statements. Include only derivations whose reasoning can be made clear through the graph. No exercises, answer submissions, quizzes, assessment, or completion gates. Graph activities invite observation and manipulation; the subsequent prose supplies the interpretation without depending on a submitted answer.

## Motivation from the thesis

The introduction places Bézier curves in computer-aided geometric design and describes controlling a curve through points. Section 2.3 explicitly connects three mathematical properties to design needs: choosing the start and end, transforming a shape by transforming its controls, and bounding the curve through the convex hull of those controls. These are the chapter's motivating questions, rather than a list of properties to memorize. [Thesis §1, printed pp. 1–2 / PDF pp. 11–12; §2.3, printed pp. 6–7 / PDF pp. 16–17, Theorem 2.12 and Figures 3–5.]

Proposed opening, adapted in original wording rather than quoted:

> Suppose you are shaping a smooth outline in a design program. You want to choose where it begins and ends, adjust its bend, and move or resize the finished shape. How could a computer represent that outline so these edits are predictable? A Bézier curve gives you a small set of control points to work with. Moving a point changes the shape; the mathematics explains how those points guide the curve and what remains guaranteed as you edit it.

This design scenario is an editorial adaptation of the thesis's CAD/CAGD motivation, not a historical quotation or an additional claim about a specific industry workflow. A short historical note may cite §1, but the opening should first establish a problem the reader can understand.

## Proposed reading and activity sequence

The thesis begins its mathematical chapter with Bernstein polynomials. For this learning chapter, propose starting from shape editing, developing repeated interpolation, and then naming the Bernstein representation. The source supports the mathematics; this teaching order is a proposal for owner review.

| Section | Reading and mathematical purpose | Graph activity and return |
| --- | --- | --- |
| 1. How do we describe an editable shape? | Introduce the design problem, control points, and control polygon. Explain that specifying a few points determines a whole curve. | Open the ordinary Bézier curve. Move an interior control point, then return to the explanation of how control points differ from points the curve must pass through. |
| 2. A parameter selects a point | Introduce \(B(t)\), \(0\le t\le1\), as the position of a point moving along a fixed curve. Separate moving along the curve from editing its shape. State that equal parameter increments need not cover equal distances. | Vary the evaluation/construction parameter while leaving controls fixed. Return to an account of what changed and what stayed fixed. This is a conceptual connection to later parameterization material, not an arc-length lesson. |
| 3. Start with a straight segment | Explain \((1-t)P+tQ\) using the two endpoints and a point one quarter, halfway, and three quarters along the segment. Explain the coefficients as complementary shares. | Observe the corresponding interpolation segments in a construction. A separate two-point graph scene or per-row reveal is a possible enhancement, not assumed existing support. |
| 4. Repeat the same operation | Build the quadratic case by interpolating neighboring controls and then their results at the same parameter. Show the De Casteljau idea, then the construction for more controls. | Use a prepared De Casteljau scene to vary the parameter and inspect intermediate points. Return to the interpretation of the final point as the exact point on the mathematical curve, while acknowledging numerical computation on a computer. |
| 5. Where does the formula come from? | Expand the quadratic interpolation once, revealing three blending coefficients. Introduce Bernstein polynomials as the general coefficients, then state the general Bézier representation. | Open the Bernstein visualization to inspect nonnegative contributions and their sum. Match the displayed degree to the example explicitly. Return to the relationship between the basis graph and the curve graph; they show different objects. |
| 6. Why are these controls useful? | Explain endpoint interpolation and the convex-hull guarantee through the blending coefficients and repeated interpolation. Define the hull visually and precisely. Discuss why the curve need not pass through interior controls and why containment is useful rather than an exact shape specification. | Show the control polygon and hull, move controls, and return to the explanation of why containment persists. State the interval assumption. |
| 7. What happens when the whole shape moves? | Introduce affine invariance in practical terms: transforming all control points transforms the curve the same way. Explain the role of coefficients summing to one for translations. | Open the affine demonstration for a supported transformation, clearly labeling its example. Return to the design consequence: a shape can be moved or resized through its finite control data. Keep the explanation focused on supported whole-shape operations. |
| 8. What can we do next? | Summarize control points, the parameter, construction, formula, and guarantees. Pose the next design needs as links: keep part of a curve, change representation without changing shape, join pieces, represent circular arcs. | Direct links to later chapters/demonstrations; do not insert all their existing Guided lessons into this chapter. |

Every activity needs a distinct purpose and a named return section. Do not require one activity for every reading section. The [implementation contract](standalone-learning.md#reading-to-graph-implementation-contract) specifies expanded activity views on existing Demonstrations, activity identities, route transitions, controls, and reading-position restoration. The affine activity is included in the bounded pilot; its scene and wording require the same content review as the other activities.

## A derivation that fits the editorial rule

For three control points, let the first interpolated points be

\[
Q_0(t)=(1-t)P_0+tP_1,\qquad Q_1(t)=(1-t)P_1+tP_2.
\]

Interpolating those results gives

\[
\begin{aligned}
B(t)&=(1-t)Q_0(t)+tQ_1(t)\\
&=(1-t)^2P_0+2t(1-t)P_1+t^2P_2.
\end{aligned}
\]

The graph makes both interpolation stages visible; the short expansion explains the formula rather than asking the learner to accept it. Connect the coefficients to how often each original point contributes. Then state the general formula with its notation introduced:

\[
B(t)=\sum_{i=0}^{n}P_i b_i^n(t),\qquad
b_i^n(t)=\binom{n}{i}(1-t)^{n-i}t^i,\qquad 0\le t\le1.
\]

Here \(n\) is the representation degree and there are \(n+1\) control points; explain the binomial coefficient sufficiently to read the expression. Special control configurations can reduce the actual polynomial degree. The quadratic expansion illustrates the general connection; it does not prove the arbitrary-degree identity. State that identity and reference the thesis recurrence instead of inserting its full induction. [Thesis §§2.1, 2.3–2.4; printed pp. 3–9 / PDF pp. 13–19, Definition 2.9 and Theorem 2.13.]

Endpoint interpolation follows by evaluating the coefficients at the two ends. Convex-hull containment has a graph-friendly justification: every interpolation stays on a segment between preceding points, and a convex set contains these segments. Define convexity before using that argument. The algebraic account uses nonnegative coefficients summing to one. Neither account should say that testing a few graph positions proves the general result. [Thesis Theorems 2.4 and 2.12, printed pp. 3 and 6–7 / PDF pp. 13 and 16–17.]

## Worked example and scene consistency

The current ordinary Bézier lesson uses the cubic controls

\[
P_0=(-4,-3),\quad P_1=(-3,2),\quad P_2=(2,2),\quad P_3=(3,-2).
\]

At the halfway parameter, the blending coefficients are

\[
\left(\frac18,\frac38,\frac38,\frac18\right),\qquad
B\left(\frac12\right)=\left(-\frac12,\frac78\right).
\]

An explanation can show the same result through repeated midpoints:

\[
\begin{aligned}
\text{First row: }&\left(-\frac72,-\frac12\right),\left(-\frac12,2\right),\left(\frac52,0\right),\\
\text{Second row: }&\left(-2,\frac34\right),\left(1,1\right),\\
\text{Final point: }&\left(-\frac12,\frac78\right).
\end{aligned}
\]

These are author-worked calculations, not questions the student must solve. The quadratic derivation above illustrates the simpler case; explicitly announce the transition to this four-control-point example.

The existing De Casteljau lesson instead uses five controls and gives a different halfway point. Do not silently switch defaults and imply that the same curve continued across activities. Prefer one consistent authored curve when the graph capabilities allow it; otherwise label the changed example. A new cross-demonstration scene-setting capability requires its own bounded specification. [Current source: `src/learning/content/guidedLessons.ts`, Bézier and De Casteljau pilots; see the [source/capability audit](bezier-study-chapter-source-notes.md).]

## What stays outside this first chapter

- Bernstein-basis linear-independence proofs, basis products/integrals, and a full induction for De Casteljau. The introduction needs blending behavior, not the whole algebraic theory.
- Detailed subdivision, extrapolation, degree elevation, derivatives, splines, rational curves, and PH curves. Introduce their motivating questions through short links, with later chapters developing them.
- Claims that every control point lies on the curve, that an interior control has only local influence, or that the parameter is a distance fraction. For the ordinary polynomial curve, moving one control changes its contribution wherever its Bernstein coefficient is nonzero.
- A blanket claim that direct Bernstein evaluation is always unstable or that the current renderer must evaluate through De Casteljau. The thesis motivates the algorithm through numerical stability; the chapter should separate the mathematical construction from the app's selected numerical evaluator. Any precise numerical claim needs its own scoped source review.

## Source map and editorial cautions

| Thesis location | What it supports here |
| --- | --- |
| §1, printed pp. 1–2 / PDF pp. 11–12 | CAD/CAGD setting, control-point interaction, and the original visualization purpose. |
| §2.1, printed pp. 3–5 / PDF pp. 13–15; Figures 1–2 | Bernstein definition, coefficient properties, basis plots, and stacked contribution visualization. |
| §2.3, printed pp. 6–7 / PDF pp. 16–17; Figures 3–5 | Bézier definition, endpoint interpolation, affine invariance, convex hull, and their design motivations. |
| §2.4, printed pp. 7–9 / PDF pp. 17–19; Figures 6–10 on subsequent pages | De Casteljau recursion and repeated linear interpolation as its geometric meaning. |
| §§2.5–2.7, printed pp. 9–13 / PDF pp. 19–23 | Motivations for retaining part of a curve, extrapolating it, and representing the same shape at a higher degree; later chapter links. |
| §3 opening, printed p. 15 / PDF p. 25 | Circular arcs as a reason to extend polynomial Bézier representations to rational ones; later chapter link. |

The formula labeled as the third cubic Bernstein basis in Example 2.3 is printed with a quadratic superscript even though the expression is cubic. Treat this as a source typo, not notation to reproduce. Match formulas to the definition and worked computations. Cite the thesis for subject matter; describe the proposed chapter order and opening as editorial adaptations.

Relevant pages were text-extracted, with printed pp. 3, 7, and 9 visually inspected for formulas, figure context, and motivation wording. Independent exact-arithmetic checks cover the worked cubic midpoint and quadratic interpolation expansion. Source inspection is not classroom, language, browser, or graph-scene acceptance.

## Review and next deliverable

The 2026-10-20 deliverable supplies the bilingual learner-facing draft and six exact activity entry/return mappings, preserving different graph defaults. Review evidence and outstanding gates are in [the content review](../reviews/bezier-study-chapter-content.md). The next implementation is bounded by [the pilot handoff](../tasks/standalone-learning/implement-bezier-pilot.md). Use the selected [reading and activity pictures](standalone-learning.md#visual-direction-and-picture-examples) for presentation. Validate the real reading/graph round trip during implementation; the pictures and content review do not establish behavioral acceptance. This content-and-handoff change does not implement routes or replace existing lessons.
