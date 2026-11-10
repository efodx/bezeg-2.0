# F1 lines 01: line kernel worker note

Files: `src/compgeo/lineForms.ts`, `src/compgeo/lineForms.test.ts` (30 tests). No existing file edited.

API: normalizeLine, explicitForm (ExplicitForm, `vertical` discriminant), interceptForm ({m,n}|undefined), parallel, perpendicular, sameLine, project, footOfPerpendicular, distanceSquared, distance, lineDirection, angleBetweenDirections, angleBetweenLines (DirectionAngle {dot, cross, radians}), intersectLines.

Checks (observed): `just unit src/compgeo/lineForms` passed; `npx tsc --noEmit --pretty false` clean; `just lint src/compgeo` passed.

Mutations (each restored; final run green):
- tolerance in parallel: 4 failures (brute-force grid, nearly-parallel, self-parallel, intersection property)
- foot sign: 3 (L4 numbers, L4 property, large-range)
- perpendicular sign: 2 (L2 numbers, brute-force)
- acos instead of atan2: first survived (tolerant 1e-12 test); added strict `radians === pi/4` assertion, then fails "L3 checked numbers"
- normalize sign dropped: 1 (normalizes signs)
- Cramer y swapped: 2 (L5 numbers, intersection property)
- same -> parallel: 2
- distanceSquared missing square: 4
- explicit k sign: 1

Decisions: Line stays circle.ts Line with Rational coefficients; normalizeLine clears denominators by lcm. Zero-normal lines throw RangeError. angle takes a zero direction -> RangeError. interceptForm returns undefined also for c=0 with a,b nonzero (through origin).
Spec L1 counter-example reproduces only with slope-then-intercept doubles (k=(dy)/(dx); n=p.y-k*p.x), giving the y-intercept -5.333333333333334 vs -5.333333333333333; c/b with a,b,c doubles gives equal values. Spec does not name the formula (analytic-lines-lessons.md:65), not an error but ambiguous; the intercept is the y-intercept (n), not the x one.
