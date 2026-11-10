# F1 kinematics task 01: kernel (worker note)

Status: complete; review repairs done (positional label formatting, ladder boundaries 20/50/100). Not committed.

Files (new): `src/kinematics/motion.ts`, `decompose.ts`, `arrowScale.ts` and `.test.ts` for each. 41 tests.

Checks: `just unit src/kinematics` pass (41/41); `npx tsc --noEmit` clean outside trig/random; `just lint src/kinematics` pass; no trailing whitespace.

Mutations (each restored, files diffed identical to backup):
- phi'' dropped in `reparametrize`: 3 failures (motion.test KN2 closed form, finite differences; decompose.test KN2 values).
- sign of a_N flipped: 7 failures (cycloid closed forms, KN5 numbers, identities, left normal, circular, KN2).
- ladder `step >= target` replaced by `step > maxMagnitude`: 2 failures (exact boundaries, rounding noise).

Decisions (spec leaves open):
- `sineWarp(b)` is the b gate: b in [0, 0.9], else RangeError. `v0` must be >0 and finite; alpha in [5,85], R and omega in [0.5,4].
- `tangentialStatus(id, aT, |r''|)`: circular is constant-speed by id; the projectile is classified by sign/threshold but never constant-speed (its apex reads stationary-approx).
- `arrowScale(max, unit)`: smallest 1/2/5 x 10^k >= max (1e-12 relative slack), so the longest arrow has length at most 1; zero gives 1; label uses a decimal comma.
- `decompose(d1, d2, scale)` returns `{kind:'singular'}` at zero speed (curvatureAt threshold).

Spec numbers: all KN1-KN5 values reproduced; no spec issue. Unverified: nothing browser-side (kernel only).
- Repair: tiny step 1e-7 label failed before fix ('1e-7 m/s'), passes after.
