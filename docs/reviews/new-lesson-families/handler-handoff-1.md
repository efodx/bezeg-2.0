# New lesson families — handler handoff 1

**Date:** 2026-10-31. **Reason:** handler context reached the 150k soft threshold.
**Objective (owner request):** add the line-sweep family to the candidate list, then turn every candidate family into a spec, using subagents for separate slices. Specs only; no tasks or implementation.
**Branch/worktree:** `worktree-lesson-candidates-research` at `.claude/worktrees/lesson-candidates-research`. Accepted commits: `a7f3e3f` (research notes, pushed to `master`), `452c955` (index + wave-1 specs; push with the rest).
**Source:** [index spec](../../specs/new-lesson-families.md), [lesson-family research](../../research/lesson-family-candidates-2026-10-31.md), [computational geometry research](../../research/computational-geometry-candidates-2026-10-31.md) (Family C = sweep algorithms, added at the owner's request).

## Accepted

| Spec | Status | Handler review |
| --- | --- | --- |
| [new-lesson-families.md](../../specs/new-lesson-families.md) | written by handler | links checked; unwritten specs marked "(planned)" — remove each marker when its spec lands |
| [numerical-methods-lessons.md](../../specs/numerical-methods-lessons.md) | accepted | Newton errors, bisection step count, Euler \(y'=x-y\) values recomputed |
| [convexity-hulls-lessons.md](../../specs/convexity-hulls-lessons.md) | accepted after repair | orient values recomputed; **A6 intersection was wrong** (now \(t=1/4,3/4\)); pair counts confirmed; dyadic-crossing caveat added |
| [curve-geometry-lessons.md](../../specs/curve-geometry-lessons.md) | accepted | cubic \(\kappa(0),\kappa(1/2),\kappa(1)\) and cardioid curvature recomputed |
| [school-function-graphs-lessons.md](../../specs/school-function-graphs-lessons.md) | accepted | transformation, inverse slopes, rational value, geometric sums, hyperbola focal distances and rational quarter-ellipse point recomputed; numerical-methods cross-reference updated |

## Remaining steps, in order

Dispatch with the [common brief](spec-brief-common.md) (handoff-v12) plus a short family-specific paragraph, as `bezeg-worker` on Sonnet 5.5 `medium`, at most three at once. Use `general-purpose` only where web sources must be opened (record why).

1. **triangulation-voronoi-lessons.md** — Family B of the computational-geometry note (ear clipping + Fisk, point-set triangulations, Delaunay flips, Voronoi duality). Depends on the shared core defined in `convexity-hulls-lessons.md` §"Shared computational-geometry core": extend its reserved incircle predicate and add a triangulation adjacency structure; don't redefine the core.
2. **b-splines-nurbs-lessons.md** — research family 3 (Cox–de Boor, de Boor, knot insertion/multiplicity, Bézier extraction, NURBS circle, optional blossoming). Owns the knot-vector/de Boor kernel; must list ADR alternatives (representation, knot/degree convention, preset format). Reuses the curvature kernel in `curve-geometry-lessons.md`.
3. **sweep-algorithms-lessons.md** — Family C (1D interval sweep, Bentley–Ottmann, monotone partition + monotone triangulation, Fortune; optional closest-pair sweep, overlay). dBCKO section numbers in the note come from memory of the TOC and **must be checked** against https://ics-websites.science.uu.nl/geobook/toc.html — this worker needs web access (`general-purpose`). Builds on the shared core and the Voronoi drawing from step 1, so dispatch after step 1 lands.
4. **interpolation-approximation-lessons.md** — research family 5 (Lagrange vs Bézier, Runge vs Chebyshev, Hermite/Catmull–Rom, least squares, Chaikin/four-point). Numerical-methods spec already defers Runge and least squares here. Subdivision lessons reuse the uniform B-spline limit from step 2, so dispatch after step 2.

Suggested waves: (1, 2) then (3, 4).

For each returned spec: recompute every new number yourself (one of three wave-1 specs had a wrong value), check relative links, remove the "(planned)" marker in the index, commit. Finally push: fetch, rebase onto `origin/master`, `git push origin HEAD:master`; record delegation outcomes with the `subagent-flow-evaluation` skill (`do-log`).

## Open owner decisions collected so far

- Robustness policy for geometry predicates (grid-snapped exact recommended) — ADR.
- New catalog family "Računska geometrija" vs placing lessons in existing families; whether numerical methods joins Analysis.
- One `algorithm-trace` lesson animation id vs one per algorithm; `src/compgeo/` location.
- Simpson as a fifth `SumMethod` (affects stored integral Presets) vs a separate mode.
- Direction-field and curvature-comb drawing approach after dragging measurement (ADRs).
- Curvature in shared Bézier/spline graphs vs separate Demonstrations.
- Separate school function catalogue (`src/analysis/schoolFunctions.ts`) vs widening `FUNCTION_IDS`; geometric series in `SequenceGraph` vs a new `SeriesGraph`; OR/VR levels unchecked against the matura PDF.
- All Slovenian terms are proposals (uncertain: *polje smeri*, *red konvergence*, *ovojno število*, *ost*, *glavnik ukrivljenosti*, shoelace).

## Checks run

Link existence checks on all committed specs and notes; handler recomputation with `node -e` as listed above. No build, lint or `lessonMathNotation` run (docs only; specs are not lesson content).

## Settings to keep

Handler: Claude Opus 5.5, auto permission mode. Workers: `bezeg-worker`, Sonnet 5.5, brief revision handoff-v12; budget watcher per worker at 135k.
