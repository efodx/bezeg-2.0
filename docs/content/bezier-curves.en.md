# Bézier curves: shaping a curve with control points

> **Editorial status:** Implementation draft. Activity links are planned destinations; this is not a live chapter.

This chapter starts with a practical question: how can a few points describe a smooth outline that is easy to edit? You need plane coordinates and basic algebra with powers and multiplication. The chapter introduces every new idea it uses; no calculus or prior knowledge of Bézier curves is needed.

<a id="motivation"></a>
## How do we describe an editable shape?

Imagine adjusting a smooth outline in a drawing program. You choose where it begins and ends, change its bend, and move or resize the finished shape. A useful mathematical model should make those edits predictable. A Bézier curve uses a short list of control points: the list determines the whole curve, while each point guides its shape in a precise way.

Try it yourself. In the drawing box below, add a few points, then drag a point or its handle and notice how the line bends. No formulas are needed yet; just see how points and handles shape the path.

*(Interactive drawing playground, mode `draw`.)*

The first and last control points are on the curve. Interior control points usually are not. They pull and guide the curve rather than marking places it must pass through. This distinction lets a small list describe a smooth path without forcing every listed point onto it.

<a id="control-points"></a>
## Control points guide the curve

Call the listed points \(P_0,P_1,\ldots,P_n\). Joining them in order makes the control polygon. The curve starts at \(P_0\) and ends at \(P_n\); the interior points shape its route between them. In the ordinary cubic example used here, the four controls are

\[
P_0=(-4,-3),\quad P_1=(-3,2),\quad P_2=(2,2),\quad P_3=(3,-2).
\]

The four points specify a curve with representation degree three. Moving an interior control changes the curve throughout its open parameter range, although the effect is stronger at some positions than others. The curve need not pass through that moved control. A control polygon is a guide, not a string of curve points.

<!-- Editorial activity metadata; intended destinations are future chapter activities, not evidence of a live UI. -->
> **Explore — Move a control point** · [Open the ordinary Bézier demonstration](/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control). Move an interior control and watch the curve change while its endpoints stay fixed. Then move an endpoint control and observe the corresponding end of the curve follow it. **Return to:** this explanation of control points.
<!-- End editorial activity metadata. -->

The first and last controls determine the curve's endpoints. An interior control guides the curve, but is usually not itself on the curve; moving it changes the curve's shape between the endpoints.

<a id="parameter"></a>
## A parameter selects a point

The curve is a rule that assigns a position to a number \(t\) between \(0\) and \(1\). We write the selected position as \(B(t)\). The parameter \(t\) tells us where we are in the curve's construction: \(B(0)=P_0\) and \(B(1)=P_n\). Changing \(t\) selects another point on the same fixed curve. Moving a control point edits the curve itself.

The parameter is not generally a distance fraction. Increasing it by the same amount each time does not guarantee that the moving point travels the same distance each time. The curve can move faster through some regions than others.

<!-- Editorial activity metadata; intended destinations are future chapter activities, not evidence of a live UI. -->
> **Explore — Follow the parameter** · [Open the quartic De Casteljau demonstration](/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter). Vary the construction parameter while the five controls stay fixed. Notice what moves and what stays the same; equal changes in the parameter do not promise equal distances along the curve. This is the demonstration's degree-four example, not the cubic example above. **Return to:** this parameter explanation.
<!-- End editorial activity metadata. -->

Changing the parameter selects another position along the same curve. The control points and curve shape remain fixed; the parameter marks progress through the construction, not a guaranteed fraction of distance.

<a id="interpolation"></a>
## A straight segment is repeated interpolation's starting point

For endpoints \(P\) and \(Q\), scalar multiplication and addition act on each coordinate. If \(P=(x_P,y_P)\), \(Q=(x_Q,y_Q)\), and \(0\le t\le1\), then

\[
(1-t)P+tQ=\bigl((1-t)x_P+tx_Q,\ (1-t)y_P+ty_Q\bigr).
\]

We call this interpolated point \(L(t)\):

\[
L(t)=(1-t)P+tQ
\]

The point \(L(t)\) lies on the segment from \(P\) to \(Q\) when \(0\le t\le1\). The numbers \(1-t\) and \(t\) are complementary shares: they are nonnegative and add to one. At \(t=\frac14\), the point is one quarter of the way from \(P\) to \(Q\); at \(t=\frac12\), it is halfway; and at \(t=\frac34\), it is three quarters of the way. This operation is linear interpolation.

The same operation can be repeated. Start with neighboring control points, interpolate between each pair using the same \(t\), and then interpolate between the new neighboring points. Repeating until one point remains gives a point on the Bézier curve. This construction is called the De Casteljau construction.

<!-- Editorial activity metadata; intended destinations are future chapter activities, not evidence of a live UI. -->
> **Explore — Repeat interpolation** · [Open the De Casteljau demonstration](/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=repeated-interpolation). Inspect the successive rows at the midpoint parameter. The prepared graph uses five controls, so it is degree four. Each new point lies between two points in the row above, and the final point is the curve point for that parameter. **Return to:** this interpolation explanation.
<!-- End editorial activity metadata. -->

Each row repeats the same straight-segment calculation on neighboring points. The final row has one point, which is exactly the curve position selected by the parameter in the mathematical construction.

Here is the simpler quadratic case, with three controls \(P_0,P_1,P_2\). First interpolate the neighboring pairs:

\[
Q_0(t)=(1-t)P_0+tP_1,\qquad Q_1(t)=(1-t)P_1+tP_2.
\]

Then interpolate those results with the same parameter:

\[
\begin{aligned}
B(t)&=(1-t)Q_0(t)+tQ_1(t)\\
&=(1-t)^2P_0+2t(1-t)P_1+t^2P_2.
\end{aligned}
\]

The middle coefficient appears twice because \(P_1\) contributes through both first-row interpolations. This is a derivation for three controls; the next section gives the general formula. The De Casteljau activity above has five controls and remains a separate degree-four example.

<a id="bernstein-form"></a>
## Bernstein coefficients give a general formula

The quadratic expansion has coefficients that depend on \(t\), and those coefficients say how much each control contributes. For representation degree \(n\), define the Bernstein coefficient

\[
b_i^n(t)=\binom{n}{i}(1-t)^{n-i}t^i,\qquad i=0,1,\ldots,n.
\]

The binomial coefficient \(\binom{n}{i}\) counts the ways to choose \(i\) positions from \(n\); for example, \(\binom{2}{1}=2\). A Bézier curve with controls \(P_0,\ldots,P_n\) is

\[
B(t)=\sum_{i=0}^{n}P_i b_i^n(t),\qquad 0\le t\le1.
\]

The symbol \(\sum_{i=0}^{n}\) means to add one term for each index \(i\), starting at zero and ending at \(n\). Thus the formula adds each control point multiplied by its matching Bernstein coefficient.

Thus \(n+1\) control points give a representation of degree \(n\). A special arrangement of controls can make the actual polynomial degree lower. “Representation degree” counts the controls in this formula; it does not promise that every such curve has exactly that polynomial degree. The quadratic expansion above illustrates the pattern. The general identity follows from the repeated-interpolation recurrence; the plot of a few coefficients is useful to inspect, but is not a proof for every degree.

The coefficients add to one because \(((1-t)+t)^n\) is a product of \(n\) identical factors. When expanded, choosing \(i\) of those factors to contribute \(t\) gives \(\binom{n}{i}\) terms of the form \((1-t)^{n-i}t^i\). Adding all choices gives the full expansion, \(((1-t)+t)^n=1\).

The quadratic Bernstein activity starts at degree two to match the three-control derivation. Its graph shows basis functions, not a Bézier curve. In the separate ordinary cubic example, the degree is three and its four midpoint weights are \(\left(\frac18,\frac38,\frac38,\frac18\right)\). For its authored controls, repeated midpoint interpolation gives

\[
\begin{aligned}
\text{First row: }&\left(-\frac72,-\frac12\right),\left(-\frac12,2\right),\left(\frac52,0\right),\\
\text{Second row: }&\left(-2,\frac34\right),\left(1,1\right),\\
\text{Final point: }&\left(-\frac12,\frac78\right).
\end{aligned}
\]

This four-control-point calculation is a worked cubic example. It is separate from the quadratic derivation and from the degree-four De Casteljau activity.

<!-- Editorial activity metadata; intended destinations are future chapter activities, not evidence of a live UI. -->
> **Explore — See the blending coefficients** · [Open the Bernstein demonstration](/bezeg-2.0/bernstein?chapter=bezier-curves&activity=blending-coefficients). It opens at degree two; inspect the three coefficients and, if useful, the stacked view. Their graph describes the coefficients, while the curve formula combines them with control points. **Return to:** this formula and its notation.
<!-- End editorial activity metadata. -->

At degree two, the graph lets you compare the three coefficient functions across the parameter interval. They are weights in the curve formula; by themselves they are not the curve's coordinates.

<a id="geometric-properties"></a>
## Endpoints and the convex hull explain useful guarantees

At \(t=0\), all Bernstein coefficients are zero except \(b_0^n(0)=1\), so \(B(0)=P_0\). At \(t=1\), only \(b_n^n(1)=1\), so \(B(1)=P_n\). The curve therefore passes exactly through its first and last controls.

For every \(t\) in \([0,1]\), each coefficient is nonnegative. Their sum is one by the binomial theorem:

\[
\sum_{i=0}^{n}b_i^n(t)=((1-t)+t)^n=1.
\]

A weighted combination with nonnegative weights summing to one is a convex combination. The convex hull of the controls is the smallest convex set containing them; “convex” means that the straight segment between any two points in the set also stays in it. This definition includes a line segment or a single point when the controls are degenerate. The curve lies inside this hull. One way to see why is to use the repeated construction: each step stays on a segment between points already in the hull, and convexity keeps that segment inside. This is a general guarantee, not a conclusion drawn from checking a handful of plotted positions. It applies on \([0,1]\); outside that interval some weights can be negative.

Interior controls need not lie on the curve. Their influence is global: for an interior index \(i\), the coefficient \(b_i^n(t)\) is positive at every \(0<t<1\). Moving that control therefore changes the curve throughout the open parameter interval, with a varying amount of change. The endpoints remain fixed. The hull gives a boundary for the whole curve, not an exact trace of it.

<!-- Editorial activity metadata; intended destinations are future chapter activities, not evidence of a live UI. -->
> **Explore — Check the geometric bounds** · [Open the ordinary Bézier demonstration](/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds). The authored activity opens with the control polygon and convex hull shown. Move a control and compare the curve with the hull. The graph offers examples to inspect; nonnegative coefficients summing to one explain why containment holds for all \(t\in[0,1]\). **Return to:** this guarantee.
<!-- End editorial activity metadata. -->

The curve may move inside the hull as controls change, but it remains within the convex set. This guarantee bounds the curve without claiming that it follows the polygon edges or passes through every control.

<a id="affine-transformations"></a>
## Transforming the controls transforms the curve

The ordinary Bézier example has its own four controls listed earlier. The affine demonstration uses a different, explicitly prepared cubic example; its picture and coordinates belong to that demonstration. In either case, the mathematical rule is the same: apply one affine transformation \(T\) to every control, and the new curve is the transformation of the old curve.

For a point \(x=(x_1,x_2)\), write a \(2\times2\) matrix as \(A=\begin{pmatrix}a_{11}&a_{12}\\a_{21}&a_{22}\end{pmatrix}\); then \(Ax=(a_{11}x_1+a_{12}x_2,a_{21}x_1+a_{22}x_2)\). This linear part can rotate, reflect, or scale. A vector \(c\) is then added to translate the result. Together they define \(T(x)=Ax+c\). Since \(B(t)=\sum_{i=0}^{n} b_i^n(t)P_i\) and the weights add to one,

\[
\begin{aligned}
T(B(t))&=A\left(\sum_{i=0}^{n}b_i^n(t)P_i\right)+c\\
&=\sum_{i=0}^{n}b_i^n(t)\bigl(AP_i+c\bigr),
\end{aligned}
\]

In the second line, the translation is \(c\sum_{i=0}^{n} b_i^n(t)=c\), because the weights sum to one. The result is exactly the Bézier formula made from the transformed controls \(T(P_i)\). This explains why translating, rotating, reflecting, or scaling the control data transforms the whole curve in the corresponding way.

<!-- Editorial activity metadata; intended destinations are future chapter activities, not evidence of a live UI. -->
> **Explore — Transform a whole shape** · [Open the affine Bézier demonstration](/bezeg-2.0/bezier/affine?chapter=bezier-curves&activity=transform-shape). Try the supported translation, scale, rotation, or reflection controls and observe the demonstration's labeled cubic example. The controls transform the curve's control points. **Return to:** this affine property and its translation argument.
<!-- End editorial activity metadata. -->

Each supported operation acts on the control data, and the curve follows that same affine transformation. The translation argument works because the control weights add to one.

<a id="next-ideas"></a>
## What can we do next?

You have seen how a control list specifies a curve, how a parameter selects a point, how repeated interpolation constructs that point, and how Bernstein coefficients express the same curve. The endpoint and convex-hull properties give useful guarantees, and affine transformations can be applied directly to the controls.

Each segment of your drawing is a cubic Bézier curve with control points \(P_0\)–\(P_3\), as above: two points on the curve and their two handles. A smooth point keeps the tangent directions on both sides equal (G1), and mirrored handles also keep the derivative equal (C1). One curve through all the same points has degree \(3k\) for \(k\) segments and passes through only the first and last point. Joining low-degree pieces keeps editing local: moving one point changes only the pieces next to it. The [spline demonstrations](/bezeg-2.0/spline/spline) explore this further.

*(Interactive playground, mode `inspect`: Look underneath.)*

These ideas lead to further questions. How can we keep only part of a curve? [Explore subdivision](/bezeg-2.0/bezier/subdivision-2). How can the same shape be represented with more control points? [Explore degree elevation](/bezeg-2.0/bezier/elevation). How can separate curve pieces join smoothly? [Explore spline curves](/bezeg-2.0/spline/spline). What changes when we want an exact circular arc? [Explore rational curves](/bezeg-2.0/rational/base) and the [circle construction](/bezeg-2.0/rational/circlen). These are related demonstrations for further exploration, not prerequisites for this chapter or promises of later chapters.

### Source

The mathematical definitions and properties in this chapter follow Kevin Štampar, *Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj* (master's thesis, University of Ljubljana, 2024), especially §§1, 2.1, and 2.3–2.5. The opening scenario is original editorial wording informed by the thesis's computer-aided geometric design motivation; it is not a quotation. The worked cubic midpoint and quadratic expansion are calculated examples.
