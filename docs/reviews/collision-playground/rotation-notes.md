# Rotation and friction prototype (2026-11-08) - worker notes

## Geometry model (decision under item 2)
- `x,y` stay the centre of the body's axis-aligned box (what the broad phase reads). World vertex = pos + s*(R(theta) p - bb(theta)), bb = box centre of the rotated hull (template units). At theta = 0, bb = 0 (template boxes are centred), so the unrotated path is untouched.
- Rotation centre is the area centroid G = pos + s*(R c - bb). `vx,vy` are G's velocity. `advanceSpinning` (world.ts) moves G and recomputes pos, hx, hy each step. Templates carry `centroidX/Y`, `inertia` (polygonTemplates.ts, `polygonMassProperties`). Mass = area*s^2, I = J*s^4. Circles: m = r^2, I = r^4/2.
- Bounce off: `stepWorld(..., spin=false)`; narrow phase uses the old integer path for any pair with both angles 0. Switching bounce off calls `clearRotation` (angles, omega zero; boxes back to template).
- Wall: old reflect for unrotated bodies; rotated polygons use an inward-only reflect (a growing box must not flip a body moving away).
- Contact (rotation.ts `polygonContact`): minimum-penetration outward face normal over touching piece pairs; contact point = other part's deepest vertex(es) (average within 1e-6*s). Limitation: for edge-edge contact the average is of the incident edge's endpoints, not the clipped overlap midpoint, so it can be off along the edge for long edges.
- Response (response.ts `contactImpulse`): normal impulse e=1 only when approaching at the contact point, then one Coulomb friction impulse, FRICTION = 0.4, clamped by mu*jn. Positional push by depth split by inverse mass (polygons now too).
- Snapshot: optional `angles: Float32Array`, present only while bounce is on, added to transferables. Circles draw a radius line at theta (outline colour) when angles present. Rotated polygons drawn with canvas transform; boxes stage draws fill-only sprites ('plainFill'/'hitFill' kinds) plus the current axis-aligned box dashed; hulls/pieces rotate with the sprite.

## Tests (src/compgeo/collisions/rotation.test.ts, 12 tests, all pass)
Seen failing under a deliberate break: torque sign flip (4 fail), friction clamp x3 (1), B angle ignored in SAT (1), SAT support bias (2), box half-height /2.2 (2), inertia sign (1), body-i torque sign (2). Covered: mass properties (unit square, all templates incl. L vs triangle sums), brute-force rotated SAT (3000 seeded cases), box containment/touch, frictionless conservation (momentum, angular momentum, energy 1e-9), frictional (KE non-increase, momenta, |jt|<=mu jn), off-centre sign, centred (impulse level and circles), glancing circle spin, spinning world boxes/centroid motion.

## Checks
- `just unit src/compgeo/collisions src/learning/playground/collisions`: 193 pass, 2 fail. Both failures are CollisionPlayground.test.tsx tab-order tests (`keyboard path > reaches every control in order`, `polygon mode > puts the stage switch in the tab order...`): the bounce checkbox already in the working tree before this task sits in the tab order where they expect a button. Not touched; needs a test update by the handler.
- `npx tsc --noEmit --pretty false`: clean. `just lint ...`: passed.
- Not verified: browser behaviour, performance, drawing of rotated sprites (no unit test for the transform path).
