# Task 12 repair calculation and proposed content

## Variation-diminishing counterexample

Use a bilinear patch with control net

```
P00=(0,0, 1)   P01=(0,1,-1)
P10=(1,0,-1)   P11=(1,1, 1)
```

(The first subscript is the `u` index.) Its exact evaluation is

`S(u,v)=(u,v,(1-2u)(1-2v))`.

Take the vertical line `L={(1/2,1/2,t): t is real}`. Since the first two coordinates of `S` equal `u,v`, there is only one possible parameter pair on this line: `(u,v)=(1/2,1/2)`. The height there is zero, so `L` meets the patch exactly once, at `(1/2,1/2,0)`. It misses the control-net wireframe: each of the four net edges has either `x=0`, `x=1`, `y=0`, or `y=1`, whereas all points on `L` have `x=y=1/2`. Thus the proposed upper bound “a straight line intersects the patch no more times than it intersects the control-net wireframe” would give `1 <= 0`, which is false. This is one counterexample to that explicitly stated direct extension; it does not rule out every possible bivariate formulation, and it does not contradict the univariate theorem for any curve's actual control polygon.

This is the standard small saddle example and agrees with the teaching reference that observes a straight line can intersect a patch while missing its control net. The calculation above is independent and exact.

### Proposed English lesson text

“For a planar Bézier curve, the variation-diminishing bound says that a line meets the curve no more times than it meets the curve's control polygon. A tempting direct surface version would say that a line meets a patch no more times than it meets the control-net wireframe. For the bilinear net `P_{00}=(0,0,1)`, `P_{01}=(0,1,-1)`, `P_{10}=(1,0,-1)`, `P_{11}=(1,1,1)`, the patch is `S(u,v)=(u,v,(1-2u)(1-2v))`. The vertical line through `(1/2,1/2)` meets the patch once, at `(1/2,1/2,0)`, but misses every control-net edge. So this proposed bound would say `1≤0`, which is false. This is one counterexample to that direct line-versus-net bound; it does not rule out every possible bivariate formulation. The curve theorem applies to an actual curve's control polygon. Convex-hull containment and affine invariance still follow from the nonnegative Bernstein weights.”

### Proposed Slovenian lesson text

“Za ravninsko Bézierjevo krivuljo izrek o zmanjševanju variacije pravi, da jo premica seka največ tolikokrat, kot seka njen kontrolni poligon. Mamljiva neposredna različica za krpe bi trdila, da premica krpo seka največ tolikokrat, kot seka žično kontrolno mrežo. Za bilinearno mrežo `P_{00}=(0,0,1)`, `P_{01}=(0,1,-1)`, `P_{10}=(1,0,-1)`, `P_{11}=(1,1,1)` je krpa `S(u,v)=(u,v,(1-2u)(1-2v))`. Navpična premica skozi `(1/2,1/2)` krpo seka enkrat, v točki `(1/2,1/2,0)`, kontrolno mrežo pa zgreši. Ta predlagana meja bi torej trdila `1≤0`, kar ne drži. To je en protiprimer tej neposredni meji za premico in mrežo; ne izključuje vseh mogočih dvorazsežnih različic izreka. Izrek za krivulje velja za kontrolni poligon dejanske krivulje. Lastnosti konveksne ovojnice in afine invariantnosti še vedno sledita iz nenegativnih Bernsteinovih uteži.”

## Iso-curve scope

Keep the formulas and boundary exception explicit. Suggested bilingual clause: “For an interior value of `u`, the iso-curve control points are computed as `Q_j(u)=...`; they generally are not a row of the net. At `u=0` or `u=1`, they are exactly the corresponding boundary row.” Slovenian: “Pri notranji vrednosti `u` kontrolne točke izoparametrične krivulje izračunamo kot `Q_j(u)=...`; praviloma niso vrstica mreže. Pri `u=0` ali `u=1` so natanko ustrezna robna vrstica.”

## Regression assertion direction

Assertions should match actual authored text in both languages: (1) general/computed interior iso-curve controls and the boundary exception; (2) the exact four-point saddle net and its formula; (3) the line passes through the stated surface point and misses the net; (4) explicitly label `1≤0` as the failed proposed patch/control-net upper bound, while preserving that the curve theorem applies to an actual curve's control polygon and avoiding a universal claim about every bivariate formulation. A small independent algebraic check can assert the bilinear height at the center is zero and that every control-net segment has a fixed boundary coordinate 0 or 1.

## Supporting source

The closest source for this exact line-versus-net criterion is the UPM course text “CHAPTER 5: SURFACES,” section “Properties of Bézier patches,” https://dcain.etsin.upm.es/~leonardo/etema5.htm. It states that simple geometric variation-diminishing concepts do not carry over, and specifically that it is easy to construct a patch intersected by a straight line while its control net is not. This is a lecture/textbook-style source; it supports the chosen comparison, while the explicit saddle calculation above independently verifies the concrete example. The primary research paper is Hartmut Prautzsch and Timothy Gallagher, “Is there a geometric variation diminishing property for B-spline or Bézier surfaces?”, Computer Aided Geometric Design 9(2), 119–124 (1992), https://doi.org/10.1016/0167-8396(92)90011-D; its abstract says it presents examples showing simple geometric concepts of variation diminishing do not work for tensor-product Bézier/B-spline surfaces and Bézier triangles.

## Implemented repair and evidence

Changed files:
- `src/learning/content/patchChapterBasics.ts`: replaced the false universal claim that an iso-curve does not pass through net points with a statement that interior iso-curve control points generally do not coincide with net points, while boundary parameters use the first/last rows.
- `src/learning/content/patchChapterEvaluation.ts`: added the bilinear net, its evaluated saddle, the fully defined vertical line, the `1≤0` counterexample to the direct line-versus-wireframe upper bound, and an explicit limit that this example does not rule out every bivariate formulation. The curve comparison is scoped to planar curves.
- `src/learning/content/patchChapter.test.ts`: added bilingual authored-text assertions plus an independent geometric check of the line/patch point and the four control-net edge invariants.

Red check before the prose fix: `npx vitest run src/learning/content/patchChapter.test.ts` failed on the missing Slovenian `praviloma` boundary-scope assertion (5 passed, 1 failed), demonstrating that the authored-text regression caught the finding. After repair, `just unit src/learning/content/patchChapter.test.ts src/learning/content/lessonMathNotation.test.ts` passed (9 tests across 2 files); log: `.command-logs/2026-10-29T08-06-56-130Z-764-e49f3e55.log`. `just typecheck` passed; log: `.command-logs/2026-10-29T08-07-03-653Z-26024-51206fc4.log`. `just --list` was checked first. No production build was run; the handler owns that check.

Independent geometry verification: `S(1/2,1/2)=(1/2,1/2,0)`. The line condition fixes `u=v=1/2`, so this is the only patch intersection. The four net edges each fix `x` or `y` to `0` or `1`, so none meets the line. The authored counterexample's counts are therefore exactly one and zero.
