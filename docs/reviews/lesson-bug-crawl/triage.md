# Lesson bug crawl — triaged findings (2026-11-20)

Source: full crawl of 37 chapters (~210 examples, 2721 raw crawler findings, 702 merged groups at medium or above) in
`.crawl-full/` plus the pilot in `.crawl-pilot/`, reviewed by 77 Haiku reviewers (owner budget 80). Merged tables:
`node scripts/lesson-crawl/merge.cjs .crawl-full --min medium`. "Verified" means the handler reproduced it live on the
preview (fresh route, `replay.cjs`, `probe3.cjs`) or confirmed it in source; "lead" means seen by a reviewer in a
screenshot only. Nothing has been fixed: **waiting for the owner's go-ahead.**

## 1. Systemic — the floating lesson card covers the top of the graph (medium, verified)

About 75 % of all raw findings (`panel-covers-graph`) in nearly every chapter. At 1440×900 the card sits over the upper
part of the board, and scene framing does not leave room for it. It hides control points the step text names
(Bézier p₁, p₂, B(½); De Casteljau P⁰; conic focal ellipse top) and on-graph legends and readouts (Taylor, level sets,
waves, compound interest, drag-the-track, trigonometric functions, arc length, linear programming, Markov chain, random
walk, least squares, evolute κ/R/E, offset distance d, law of large numbers). One root cause: fix in the card placement
or the board framing, not per lesson.

## 2. Runtime error (high, verified)

- Bézier curve lesson `lesson.bezier-curves.control-points.bezier`: after Finish, the edit tab's »Zmanjšaj število«
  throws the JSXGraph error "Can't create polygon / polygonalchain with parent types other than 'point'…". On a fresh
  route the same click works. A lesson-built object over the point list is not rebuilt when the count drops.
  Repro: `node scripts/lesson-crawl/replay.cjs bezeg-2.0/bezier/curve lesson.bezier-curves.control-points.bezier "click:^Zmanjšaj število:1"`.

## 3. Controls that silently depend on another control (medium)

- Verified: complex roots (`/complex-roots`): editing the test point z (Re, Im) changes nothing on the graph until
  »Pokaži preizkusno točko« in Razkritja is on; only a help line mentions it.
- Verified: complex reciprocal (`/complex-reciprocal`): the inversion centre c and radius r change nothing visible,
  because the example hides the inversion circle; the legend still names »križec: z′«.
- Verified: projective three views (`/projective/three-views`): »Kot točke P na krožnici« is disabled until the
  checkbox above it is on, with no hint.
- Lead: rational Farin lesson asks to switch on »Farinove točke«, which is on Prikaz, without saying where.
- Lead: Voronoi (`/compgeo/fortune`) »Pokaži simetralo«, »Predvajaj«, »Ponastavi gradnjo«, »Nazaj« are disabled after
  the lesson with no reason shown; Shrani »Uvozi prednastavitve« looks disabled next to »Izvozi«.
- Low: PH curves Edit tab shows an empty »Odmiki krivulje« section until the offset is enabled in Prikaz.
- Lead: orientation »Dodajanje z dotikom ali klikom« shows no pressed state, so its mode is not readable.

## 4. Content (medium)

- Verified: `analyticLinesIntersectGuidedLessons.ts:104` `latex` row ends with English `\text{the same line}` in the
  Slovenian lesson.
- Verified: `familyChapters.ts:71` rational subdivision text says »Subdividiraj«; the button is »Subdiviziraj«.
- Verified: law of large numbers (`/probability/simulation`): the »Število poskusov (logaritemska os)« axis is labelled
  with the exponents 0,2 … 2 (and −0,2) instead of trial counts 1, 10, 100; the axis reads as linear.
- Lead: g1-symmetric spline lesson names sliders »b 2«, »b 3« that are not visible in the edit panel.
- Lead (maybe capture timing): phase-portrait linear system asks to compare trajectories that are not drawn; Cavalieri
  step says Strižba −1,5 and 3 while the field still shows 0.

## 5. Lesson card text overflow (medium, screenshots)

- Formula rows cut at the card's right edge: kinematics tangential–normal step 7, forms of a line »c = …«, isometries
  classifying a motion, B-spline blossom f(¼, ¾).
- Truncated card titles: determinant area, Delaunay, rational De Casteljau. Fixed-point card has no title.

## 6. Inspector layout at 310 px (medium/low, screenshots)

Simson »Primer« and radical-axis »Konstrukcija« selects truncate their value (radical axis also repeats it as help);
Bézier subdivision point block and curve-geometry comb/envelope hint clipped at the panel bottom; circle-constructions
coordinate rows misaligned; CLT buttons and probability summary »Vrednost 1–7« labels wrap; orientation add/remove
button grid ragged; repeated subdivision »Krivulja« buttons ragged and Krivulja10 looks selected when none is;
inconsistent stepper styles (B-spline de Boor, least squares); linear function disabled empty boxes with squeezed help;
Shrani tab mixes three button sizes.

## 7. Graph framing and labels (medium/low, screenshots)

Tiny or off-centre patches (Coons, patch De Casteljau, derivatives); oversized axis ranges (drag-the-track, geometric
series: x to 50 for four bars, lattice paths, rosettes); overlapping point labels (De Casteljau and subdivision
superscripts, cross-ratio, five-point, trace–determinant, PH quintic p₂ on a tick); root-finding x₁ label floating with
its point off-board; least-squares residual squares drawn non-square by unequal axis scale.

## Dismissed after verification

- `control-unusable` locator timeouts (74 groups): every sampled one works live — complex Euler velocity/acceleration
  toggles (below the fold, scroll works), polygon-area »Sklenjen večkotnik«, Hermite points, arc-length b, CLT n,
  waves phase and amplitude, recursion a₁/q, isometries P1.
- »Oznake točk« inspector-only (labels are HTML, outside the hashed SVG); Bernstein degree, subdivision, extrapolation
  and patch sliders change the graph.
- Subdivision »Parameter subdivizije t« showing 1: out-of-range input is marked invalid and reverts on blur; the
  screenshot caught the crawler's typed value.
- PH offset not drawn: the lesson tells the learner to switch it on in Prikaz.
- »Stopnja krpe« help text: complete in `sl.ts`; only visually clipped.
- Dashed steppers at a bound (Galton +, CLT »Nazaj na n = 1«, spline-cn, Bernstein +): `aria-disabled` by design.
