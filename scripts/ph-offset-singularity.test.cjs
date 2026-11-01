'use strict';
const test = require('node:test');
const assert = require('node:assert');
const m = require('./ph-offset-singularity.cjs');
const [CUBIC, QUINTIC] = Object.values(m.FIXTURES);

test('curvature matches analytic parabola-like case w = 1 + i t (kappa = 2/(1+t^2)^2, rho(0) = 1/2)', () => {
  const g = [[1, 0], [1, 1]];
  for (const t of [0, 0.3, 0.7, 1]) assert.ok(Math.abs(m.curvature(g, t) - 2 / Math.pow(1 + t * t, 2)) < 1e-12);
  assert.ok(Math.abs(m.minRadius(g).rho - 0.5) < 1e-9);
});

test('curvature matches finite differences of the integrated curve on both fixtures', () => {
  for (const fx of [CUBIC, QUINTIC]) {
    const n = 4000, h = 1 / n, r = m.offsetPoints(fx.w, fx.start, 0, n).curve;
    for (const i of [400, 2000, 3600]) {
      const dx = (r[i + 1][0] - r[i - 1][0]) / (2 * h), dy = (r[i + 1][1] - r[i - 1][1]) / (2 * h);
      const ddx = (r[i + 1][0] - 2 * r[i][0] + r[i - 1][0]) / (h * h), ddy = (r[i + 1][1] - 2 * r[i][1] + r[i - 1][1]) / (h * h);
      const k = (dx * ddy - dy * ddx) / Math.pow(dx * dx + dy * dy, 1.5);
      assert.ok(Math.abs(k - m.curvature(fx.w, i * h)) < 1e-4, `${k} vs ${m.curvature(fx.w, i * h)}`);
    }
  }
});

test('findSelfIntersection detects a crossing polyline and ignores a simple one', () => {
  const ts = [0, 1, 2, 3, 4];
  assert.ok(m.findSelfIntersection([[0, 0], [2, 2], [2, 0], [0, 2], [3, 3]], ts));
  assert.equal(m.findSelfIntersection([[0, 0], [1, 0], [2, 0], [3, 1], [4, 3]], ts), null);
});

test('fixture minimum radii (min is at an endpoint of [0,1])', () => {
  const c = m.minRadius(CUBIC.w), q = m.minRadius(QUINTIC.w);
  assert.ok(Math.abs(c.rho - 4) < 1e-6 && c.t === 0);
  assert.ok(Math.abs(q.rho - 1) < 1e-6 && q.t === 1);
});

test('control: d = 0.5 rho_min gives no self-intersection on either card', () => {
  assert.equal(m.analyse(CUBIC).controlHit, null);
  assert.equal(m.analyse(QUINTIC).controlHit, null);
});

test('1.5 rho_min: cubic is outside the slider, quintic in range but with no self-intersection (no robust d)', () => {
  const c = m.analyse(CUBIC), q = m.analyse(QUINTIC);
  assert.equal(c.inRange, false);
  assert.equal(q.inRange, true);
  assert.equal(q.hit, null);
  assert.equal(q.hitOpposite, null);
});

test('quintic does self-intersect at d = -2.5 but not at +2.5 (sign convention mutation), cubic never within the slider', () => {
  const run = (fx, d) => { const o = m.offsetPoints(fx.w, fx.start, d, 2000); return m.findSelfIntersection(o.points, o.ts); };
  const hit = run(QUINTIC, -2.5);
  assert.ok(hit);
  assert.ok(Math.abs(hit.ti - 0.13) < 0.05 && Math.abs(hit.tj - 0.72) < 0.05);
  assert.equal(run(QUINTIC, 2.5), null);
  assert.deepEqual(m.analyse(CUBIC).sweep, []);
});
