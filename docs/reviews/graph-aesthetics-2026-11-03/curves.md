# Curves, probability, maps — aesthetic review

**Scope:** the 13 assigned lessons on frozen preview d2a3b646, inspected in Chromium at a 1440×1000 desktop viewport. Findings below are subjective aesthetic judgments, mainly about color and hierarchy.

## Ranked aesthetic findings

1. **High confidence — `/linear-map`, middle and terminal (K3/6 and K6/6).** The dark olive transformed lattice crosses almost the whole plot over a pale sage base grid. Those repeated lines outweigh the blue image curve and small vector markers at the center, so the mapped object is hard to find at a glance. Lighten and thin the base lattice, reduce the transformed grid’s visual weight, and reserve a stronger accent for the mapped curve and key vectors. This is weaker than [B-spline basis, middle](evidence/curves/bspline-basis-middle.png), where distinct blue, amber, sage and violet traces remain easy to separate. [Middle frame](evidence/curves/linear-map-middle.png) · [full workspace](evidence/curves/linear-map-middle-workspace.png).

2. **High confidence — `/bspline/insertion`, middle (K3/6 · frame 2/3).** Vivid orange diagonal hatching fills the wide band between the inserted control polygon and the green spline. The hatch becomes the dominant texture and competes with the curve it is meant to explain. Keep orange for the important boundary/points, but use a much lighter, quieter fill or fewer hatch lines. [B-spline extraction, middle](evidence/curves/bspline-extraction-middle.png) is a stronger comparison: blue and ochre spans distinguish the two Bézier pieces while dashed guides stay subordinate. [Insertion frame](evidence/curves/bspline-insertion-middle.png) · [full workspace](evidence/curves/bspline-insertion-middle-workspace.png).

3. **Medium-high confidence — `/complex-reciprocal`, terminal (K7/7).** The compact construction mixes a forest-green (z) vector, blue (w) vector, brown dashed circle, and ochre, violet and teal result markers. Around the origin, tiny points and labels become a patchwork without a clear input/result color rule. Group each operand and its construction in one hue, give reciprocal results one distinct accent, and mute auxiliary circles. [Complex roots, terminal](evidence/curves/complex-roots-final.png) is a stronger nearby example: the root set uses a consistent green family and the dashed circle remains quiet. [Reciprocal frame](evidence/curves/complex-reciprocal-final.png) · [full workspace](evidence/curves/complex-reciprocal-final-workspace.png).

4. **Medium confidence — `/probability/clt`, middle (K4/7 · frame 2/2).** The finite-sum and reference-density curves use similarly weighted olive and dusty-teal greens. They merge along the tails and at crossings, making the comparison subtle except at the peaks. Give the two distributions a more distinct hue pair or a clearer stroke hierarchy. [Binomial-to-normal, middle](evidence/curves/prob-binomial-normal-middle.png) is a stronger comparison: the dark-green curve, muted green bars, and slate-blue selected tail carry related but distinct roles. [CLT frame](evidence/curves/prob-clt-middle.png) · [full workspace](evidence/curves/prob-clt-middle-workspace.png).

## Stronger references

- [B-spline extraction, middle](evidence/curves/bspline-extraction-middle-workspace.png): distinct blue and ochre segments, with restrained dashed construction guides.
- [B-spline basis, middle](evidence/curves/bspline-basis-middle-workspace.png): four curve hues distinguish overlapping basis functions.
- [Binomial-to-normal, middle](evidence/curves/prob-binomial-normal-middle-workspace.png): a coherent curve/bar/tail palette with a clear focal curve.

## Coverage (13/13 routes)

`K` = lesson step; `f` = frame within that step. All routes returned HTTP 200; each capture had a visible `#jgbox > svg` board at 1002×660 with graph paths.

| Route | Opening | Middle | Terminal |
|---|---:|---:|---:|
| `/bspline/basis` | K1/6 f1/2 | K3/6 f2/2 | K6/6 f2/2 |
| `/bspline/deboor` | K1/6 f1/2 | K3/6 f2/3 | K6/6 f2/2 |
| `/bspline/insertion` | K1/6 f1/2 | K3/6 f2/3 | K6/6 f2/2 |
| `/bspline/extraction` | K1/6 f1/2 | K3/6 f2/2 | K6/6 f2/2 |
| `/bspline/nurbs` | K1/6 f1/2 | K3/6 f2/2 | K6/6 f2/2 |
| `/probability/density` | K1/6 f1/2 | K3/6 f2/2 | K6/6 f2/2 |
| `/probability/binomial-normal` | K1/6 f1/2 | K3/6 f2/2 | K6/6 f2/2 |
| `/probability/clt` | K1/7 f1/2 | K4/7 f2/2 | K7/7 f2/2 |
| `/probability/summary` | K1/6 f1/2 | K3/6 f2/2 | K6/6 f2/2 |
| `/probability/correlation` | K1/6 f1/2 | K3/6 f2/2 | K6/6 f2/2 |
| `/linear-map` | K1/6 f1/1 | K3/6 f1/1 | K6/6 f1/1 |
| `/complex-reciprocal` | K1/7 f1/1 | K4/7 f1/1 | K7/7 f1/1 |
| `/complex-roots` | K1/7 f1/1 | K4/7 f1/1 | K7/7 f1/1 |

**Capture notes and limits:** the nine [opening](evidence/curves/contact-opening-set1.png) · [middle](evidence/curves/contact-middle-set1.png) · [terminal](evidence/curves/contact-final-set1.png) contact sheets group 4–5 lessons each; sets 2 and 3 are in the same folder. The lesson card was hidden only during screenshots with temporary CSS on `.guided-lesson-content`; lesson state and graph styling were unchanged. Full-workspace images are included for all four candidates and three comparisons. Review covers desktop lesson scenes only; no mobile or broad control-interaction pass was requested.
