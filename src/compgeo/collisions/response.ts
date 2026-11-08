import { POLYGON_TEMPLATES } from './polygonTemplates'
import { centroidOf, makePlacement, place, polygonContact } from './rotation'
import type { Contact } from './rotation'
import type { World } from './world'

/** Coulomb friction coefficient of the bounce prototype (bodies of the same material). */
export const FRICTION = 0.4

/**
 * Optional bounce between touching bodies (owner prototype, 2026-11-08). Runs over the touching pairs the narrow phase
 * already found, so it costs O(touching pairs) per step. Bodies are rigid with unit density: mass = area, moment of
 * inertia = polar second moment about the centroid (circles: r^2 and r^4/2; polygons: template values times s^2 and
 * s^4, rotating about the area centroid, see rotation.ts).
 *
 * Per pair: a contact (unit normal from i to j, depth, point). Circles use the centre line and the touching surface
 * point; polygons the minimum-penetration SAT axis over the touching convex pieces and the deepest vertex. Both are
 * pushed apart by the depth, split by inverse mass. Then a normal impulse with restitution 1, applied only while the
 * contact points approach, and one Coulomb friction impulse (|jt| <= FRICTION * jn) from the relative velocity at the
 * contact point, spin included. Pairs are resolved in the order found, so naive and sweep can diverge after a
 * multi-body contact.
 */
export function bounceTouchingPairs(world: World, pairs: Int32Array, pairCount: number): void {
  const { x, y, hx, hy, template, scale } = world
  const circles = world.shape === 'circle'
  for (let k = 0; k < pairCount; k++) {
    const i = pairs[2 * k]
    const j = pairs[2 * k + 1]
    if (circles) {
      const dx = x[j] - x[i]
      const dy = y[j] - y[i]
      const d = Math.hypot(dx, dy)
      if (d === 0) continue
      const nx = dx / d
      const ny = dy / d
      const invI = 1 / (hx[i] * hy[i])
      const invJ = 1 / (hx[j] * hy[j])
      const overlap = hx[i] + hx[j] - d
      if (overlap > 0) {
        const push = overlap / (invI + invJ)
        x[i] -= nx * push * invI
        y[i] -= ny * push * invI
        x[j] += nx * push * invJ
        y[j] += ny * push * invJ
      }
      // The touching surface on the centre line: r_i along n from i, r_j = r_i - d from j (negative: back along n).
      const ri = hx[i]
      contactImpulse(world, i, j, nx, ny, ri * nx, ri * ny, (ri - d) * nx, (ri - d) * ny, invI, 2 * invI * invI, invJ, 2 * invJ * invJ)
      continue
    }
    const a = POLYGON_TEMPLATES[template[i]]
    const b = POLYGON_TEMPLATES[template[j]]
    if (!polygonContact(a, x[i], y[i], world.angle[i], b, x[j], y[j], world.angle[j], scale, contact)) continue
    place(placeA, a, x[i], y[i], world.angle[i], scale)
    place(placeB, b, x[j], y[j], world.angle[j], scale)
    centroidOf(placeA, a, centroidA)
    centroidOf(placeB, b, centroidB)
    const s2 = scale * scale
    const invMi = 1 / (a.doubledArea / 2 * s2)
    const invMj = 1 / (b.doubledArea / 2 * s2)
    const invIi = 1 / (a.inertia * s2 * s2)
    const invIj = 1 / (b.inertia * s2 * s2)
    const { nx, ny, depth, px, py } = contact
    if (depth > 0) {
      const push = depth / (invMi + invMj)
      x[i] -= nx * push * invMi
      y[i] -= ny * push * invMi
      x[j] += nx * push * invMj
      y[j] += ny * push * invMj
    }
    contactImpulse(world, i, j, nx, ny, px - centroidA.x, py - centroidA.y, px - centroidB.x, py - centroidB.y, invMi, invIi, invMj, invIj)
  }
}

const contact: Contact = { nx: 0, ny: 0, depth: 0, px: 0, py: 0 }
const placeA = makePlacement()
const placeB = makePlacement()
const centroidA = { x: 0, y: 0 }
const centroidB = { x: 0, y: 0 }

/**
 * The normal and friction impulses of one contact (`friction` is the Coulomb coefficient; 0 means frictionless). (rax, ray) and (rbx, rby) run from each body's centre of mass to the
 * contact point; n points from i to j. Mutates the velocities and angular velocities of i and j.
 */
export function contactImpulse(
  world: World, i: number, j: number, nx: number, ny: number,
  rax: number, ray: number, rbx: number, rby: number,
  invMi: number, invIi: number, invMj: number, invIj: number, friction = FRICTION,
): void {
  const { vx, vy, omega } = world
  let rvx = vx[j] - omega[j] * rby - (vx[i] - omega[i] * ray)
  let rvy = vy[j] + omega[j] * rbx - (vy[i] + omega[i] * rax)
  const vn = rvx * nx + rvy * ny
  if (vn >= 0) return
  const raN = rax * ny - ray * nx
  const rbN = rbx * ny - rby * nx
  const jn = (-2 * vn) / (invMi + invMj + raN * raN * invIi + rbN * rbN * invIj)
  vx[i] -= jn * invMi * nx
  vy[i] -= jn * invMi * ny
  omega[i] -= jn * raN * invIi
  vx[j] += jn * invMj * nx
  vy[j] += jn * invMj * ny
  omega[j] += jn * rbN * invIj
  // Friction along the tangent t = (-ny, nx), from the relative velocity after the normal impulse.
  rvx = vx[j] - omega[j] * rby - (vx[i] - omega[i] * ray)
  rvy = vy[j] + omega[j] * rbx - (vy[i] + omega[i] * rax)
  const tx = -ny
  const ty = nx
  const vt = rvx * tx + rvy * ty
  const raT = rax * ty - ray * tx
  const rbT = rbx * ty - rby * tx
  const raw = -vt / (invMi + invMj + raT * raT * invIi + rbT * rbT * invIj)
  const limit = friction * jn
  const jt = Math.max(-limit, Math.min(limit, raw))
  vx[i] -= jt * invMi * tx
  vy[i] -= jt * invMi * ty
  omega[i] -= jt * raT * invIi
  vx[j] += jt * invMj * tx
  vy[j] += jt * invMj * ty
  omega[j] += jt * rbT * invIj
}
