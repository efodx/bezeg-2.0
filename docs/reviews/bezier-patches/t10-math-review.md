# Task 10 mathematical review (routes over the 10M model, HEAD 3c38f9c)

Scope: how TensorSubdivision{Graph,Scene,Panels} and TensorJoin{Graph,Scene,Panels} use `tensorSubdivision.ts`/`tensorJoins.ts`, the starting scenes, and the sl/en texts. Read-only; tests not re-run.

Counts: high 0, medium 1, low 4.

## Verified correct
- Subdivision: `buildSubdivisionScene` draws `subdivisionPieces(patch, dir, value)` of the displayed net (TensorSubdivisionScene.ts:41-56). Split curve is `S(value,t)` for u and `S(t,value)` for v (:44). Correspondence uses `locateInPieces` (tensorSubdivision.ts:39-45): left piece local = c/value, right = (c-value)/(1-value), the other parameter unchanged, so both directions are right. At c = value the left piece at local 1 is chosen, and the right piece at local 0 gives the same point. Elevation `patch.elevate(direction)` is exact. The ghost holds the pre-elevation net by reference (TensorSubdivisionGraph.tsx:134-141) and is invalidated by identity of `after`.
- Joins: derived B rows are `enforceJoin` after `matchBoundaryDegree` (TensorJoinGraph.tsx:46-50). The C1/G1 factor is `alpha*m_A/m_B` (tensorJoins.ts:76). That gives `S_{B,u}(0,v) = m_B(Q1-Q0) = alpha m_A (P_m-P_{m-1}) = alpha S_{A,u}(1,v)`, correct. Degree handling: v shared outside none (`settleNet`, `setBDegree`), B stored as edited in none (`joinedPatch` keeps the arrays). Arrows: one `drawScale = 0.25 D / max(|S_Au|,|S_Bu|)` for both (TensorJoinScene.ts:50-60), so C1 draws equal and G1 in ratio alpha; both start at their own boundary point with the same v, which is correct under the shared v parametrisation. The report is `classifyJoin(this.state.net, this.bNet())` (TensorJoinGraph.tsx:132), so it is computed from the displayed nets. The kink scene (patchPresetCollections.ts:197-199) mirrors the cross-boundary z-step, so it is C0 and not G1 where the step is non-zero.

## Findings

### M1 (medium) "C0 only" can be shown for a surface that is geometrically G1
sl.ts:1365 / en.ts:1366 (`patch_join_report_c0`), label `patch_join_state_c0`, TensorJoinPanels.tsx `joinReportCase`.
`g1` in the report means a constant ratio: `d^B = alpha* d^A`. Tangent-plane continuity is weaker: `S_{B,u} = alpha(v) S_{A,u} + beta(v) S_v` is G1 with non-constant alpha or an extra tangential term. For such a join the state row says "C0 only" and the note says "neither C1 nor G1 with a constant ratio" (a true sentence, hedged), but the note goes on to say "if the angle between the normals is greater than 0, the surface has a sharp edge". The state label itself is unhedged, and the panel shows normal angle 0 next to "C0 only". Failure scenario: a student drags a B point so that the boundary derivative varies in ratio, giving angle 0 and the label "C0 only".
Fix: in `joinReportCase`, when `maxNormalAngle` is defined and below the tolerance (and not g1), use a distinct text such as "tangent planes coincide, but not with a constant ratio" or "C0, tangent planes seem to coincide (non-constant ratio)". Alternatively, rename the state "C0, no constant ratio". Do not claim "sharp edge" unless the angle is greater than 0.

### L1 (low) C1 text "So the tangent planes agree as well" is only conditionally true
sl.ts:1367 / en.ts:1368 (`patch_join_report_c1`).
C1 gives equal `S_u`. C0 gives equal boundary tangent `S_v`, since the boundary curves coincide. So the pair `(S_u,S_v)` is identical on both sides and the spans agree wherever they are defined. If `S_u` is parallel to `S_v`, or `S_v = 0`, at some boundary point, the span is a line or a point and there is no tangent plane there to agree. The vanish text already handles the all-zero case but not partial degeneracy. Failure scenario: a collapsed-edge boundary (S_v = 0 at one end) in C1 still reads "tangent planes agree" there. Same caveat applies to the G1 text ("tangent planes coincide along the boundary", :1369/:1368) at points where both derivatives vanish.
Fix: "Hence the tangent planes agree wherever they are defined" (sl: "povsod, kjer sta določeni"). The unconditional wording is acceptable for the default scenes.

### L2 (low) `derivativesVanish` threshold is absolute, text says "zero"
tensorJoins.ts:149 vs `patch_join_report_vanish`. Tolerance-based, text says "is zero along the whole boundary". Fine for teaching; no fix needed beyond "(by this test)" if wanted.

### L3 (low) Correspondence test at the split value does not check the other piece
TensorSubdivisionScene.test.ts and TensorSubdivisionGraph.test.tsx:100-106 use u = 0.4 = split and assert piece "left" and the point, but not local parameter 1, nor that the right piece at local 0 gives the same point. The note `patch_correspondence_note` ("on the cut curve the two pieces agree") is therefore untested at route level. Add `piece(right).eval(0,v) == piece(left).eval(1,v) == S(u0,v)` with the independent `evalNet`.

### L4 (low) Elevation test does not verify the pieces after elevation are the subdivision of the elevated net
TensorSubdivisionGraph.test.tsx:129-148 only counts `piece-l-row-` rows (m+1). Piece positions are not compared with `evalNet(elevated, 0.4*s, t)`. The scene-level test covers pieces generally, so this is a coverage gap, not a defect.

## Prompts and help text
Mathematically correct: split help, elevate help ("keeps the surface exactly"), alpha help ("S_u of B is alpha times S_u of A; alpha = 1 is C1", consistent with enforceJoin), mode help (rows derived per mode), shared-degree text (exact elevation), legend ("both drawn at the same scale", true: common factor). No text calls tangent-plane agreement "matching derivatives"; the G1 text separates the two. no-C0 text is true. The vanish text is a true and appropriately cautious statement. The G1 mode label "tangent planes coincide" describes the property; the construction (constant ratio) is stricter, which is fine for the offered mode.

## Tests
Independent evaluation is used: Bernstein `evalNet` (subdivision) and textbook `derivativeU` plus a hand-computed bilinear split (join scene). The G1 arrow test checks `S_Bu = alpha S_Au` independently and the common-scale length. Non-vacuous. No fully vacuous assertion found. Weak spots only as L3/L4. The graph test "C0 only is not C1..." drags b-1-1 in c0 and then asserts `g1:false`; it holds only because the drag changes the ratio, which is the intent.
Not verified: tests were not run; sl/en lockstep beyond the grep'd keys; arrow colours versus the legend (roles `vector-u`/`vector-v` mapped to blue/red in the renderer).
