# F1 mechanics kernel 01: worker note

Files: src/mechanics/{tracks,descentTime,brachistochrone}.ts and their .test.ts (all new; no existing file edited).

Status: all five acceptance items covered; `just unit src/mechanics` 32 tests pass; tsc 0 errors; lint passes.

Mutations (each run, failure observed, code restored and diffed):
- s^2 -> s: 8 failures (line/cycloid closed forms, MC1, MC2 default, tautochrone, random lower-bound).
- y1 > 0 -> y1 >= 0: "y1 = 0 is never-starts" fails.
- r with 1 + cos: 5 failures (MC1/MC2 numbers, bisection round trip, line comparison, random lower-bound).

Decisions:
- `cycloidTrack` passes a stable depth 2r sin^2(t/2) to the adapter (`trackFromDepthSource(..., depth?)`). With the source's own r(1-cos t) the cusp quadrature has error 5e-10, not 1e-12.
- Admissibility: y_n = 0 reported `above-start`; all points equal P0 is `never-starts`; P0 != (0,0) throws RangeError.
- Bezier s^2 vs s^4 is checked against s^4 at 2000 panels: s^4 with 200 panels errs 2.5e-11 on [(0,0),(3,3),(0.25,0.5),(1,1)] (s^2 agrees with 2000 panels of both).

Not covered: MC1 acceptance 3 (bead position by bisection, energy conservation) is scene-level, not kernel items 1-6.
Spec issue: spec says cycloid quadrature agrees to 1e-12 "with the cycloid source"; this needs the stable depth above.
- Random-cubic test also asserts 10 000 admissible, admissible/attempts > 0.25, worst margin < 0.5; mutation time x100 fails it (worst 49.4).
