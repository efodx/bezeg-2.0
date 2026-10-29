# Task 13 basics content review

Reviewed `patchGuidedExamplesBasics.ts` and its focused test against chapter sections 1–4, the chapter criteria and the first four research concepts. Read-only review; the source and test were not changed.

The authored fixtures are mathematically consistent with `TensorPatchGraph`'s flattened `i`-major net order. The bilinear control array represents `S(u,v)=(u,v,uv)` and its stated midpoint. The quadratic control-net fixture's `P11` height `1.2` gives `S(1/4,1/2)=(-1/2,0,9/40)`. The iso-curve fixture gives `Q0=(0,-1,0)`, `Q1=(0,0,0.6)`, `Q2=(0,1,0)`, and midpoint height `0.3`. The boundary claim is correctly limited to `u=0`; interior `Qj` are computed across the three rows. Bilingual frames and section-specific measurable tasks are present, with math symbols delimited in prose.

## Finding

- **Teaching mismatch, `patchGuidedExamplesBasics.ts:51-52`.** The frame explains a family of moving `u`-curves as `v` changes, but `patch-v-sweep` actually advances only the evaluation parameter `v` while holding `u=1/2`, so the visible marker follows one iso-curve across an already-rendered patch. It does not show the whole `u`-curve moving or its swept area being formed. Either narrow the frame's claim to what the animation shows and explain that the surface is the union of the fixed-`v` curves, or add a view/action that visibly sweeps those curves.

## Verification limits

The test uses a real `TensorPatchGraph`, starts each lesson synchronously, checks a computed marker against the fixture, and verifies sweep cancellation plus scene restoration. Its rendered assertions cover net point/polyline counts, but do not assert boundary-curve or iso-curve counts/coordinates; in particular, the displayed (Q_j) claims are not checked against rendered iso-curve controls. Worker-reported typecheck, lint, notation and focused tests passed; I did not rerun them. No browser preview or host-camera fit was verified. Registry integration and assets remain outside this slice by assignment.

## Handler disposition

Narrowed the first frame's bilingual animation claim to the actual moving marker and explicitly stationary displayed iso-curves. The mathematical family-of-curves explanation remains. This module is preparation only: task13's actual moving-curve sweep remains an integration gap, along with independent assertions for displayed iso-control points and boundary counts, registry/notation inventory integration and browser framing. No complete task13 example acceptance is claimed. Worker timestamp labelled 17:00:02 UTC was host local; parent clock recorded 16:00:19Z after dispatch, so the exact worker UTC start is unverified.
