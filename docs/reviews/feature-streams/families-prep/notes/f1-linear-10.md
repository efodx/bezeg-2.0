# f1-linear-10 handoff (Batch D kernel)

Status: complete, uncommitted. New files: src/linear/iterate2.ts, stability2.ts and their .test.ts.

- iterate2: orbit (cap ORBIT_MAX_STEPS 1000, overflow >1e150, readouts), iterationOutcome, collapses,
  dominantDirection, modulusRatio, startsOnOtherEigenvector (exact integer test), lineAngleDegrees.
- stability2: exactTraceDet, discreteStability(TD), flowStability(TD), companion.
- Edge result carries `edge` (first) and `edges` (vertices lie on two); names determinant-one,
  eigenvalue-one, eigenvalue-minus-one.
- classifyEigen input contract: quarter grid only (RangeError otherwise), but not limited to [-4,4].
- Mutations (all restored): delta<=1 inside -> 4 failures; equal-moduli folded -> 3; overflow cap removed -> 1.
- Spec numbers all reproduced (L6 iterates, angles, stretches, ratios; L7 table). No spec issue found.
- Companion with delta=3/16 is off the quarter grid, so discreteStability(companion) throws; use the TD variants.
- Review repairs: docs use D for the discriminant; companion/*TD accept any finite doubles, reject non-finite
  (RangeError). orbit throws RangeError for non-finite v0 or norm > 1e150. New tests fail under `>=`, no capped flag,
  and no start check (observed).
