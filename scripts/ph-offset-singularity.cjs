'use strict';
/**
 * Offset-singularity check for the PH guided examples (owner decision D10).
 * Convention matches src/bezeg/impl/curve/ph-math.ts phOffsetRational (edge normals (dy,-dx), i.e. the RIGHT normal):
 *   O(t) = r(t) + d * (r'_y, -r'_x) / |r'|, so O' = sigma (1 + d*kappa) T and a cusp sits at d = -1/kappa.
 * Hodograph r' = w^2, w(t) = sum C(m,i)(1-t)^(m-i) t^i w_i. Pure Node, no dependencies.
 */
const FIXTURES = {
  'ph-curves.investigate-ph.ph-cubic-singularity': {start: [-2, -1], w: [[2, 0], [2, 1]], signs: ['rightSign'], view: [-3.2, 2.7, 3.4, -2.7]},
  'ph-curves.investigate-ph.ph-quintic-singularity': {start: [-2, -1], w: [[2, 0], [2, 1], [1, 1]], signs: ['both'], view: [-3, 2.2, 2.5, -2.6]},
};
const SLIDER = {min: -3, max: 3, step: 0.01};

const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };

/** w(t) and w'(t) as [re, im]. */
function wAt(gens, t) {
  const m = gens.length - 1;
  let re = 0, im = 0, dre = 0, dim = 0;
  for (let i = 0; i <= m; i++) {
    const b = binom(m, i) * Math.pow(t, i) * Math.pow(1 - t, m - i);
    re += b * gens[i][0]; im += b * gens[i][1];
    // derivative of Bernstein basis: m (B_{i-1,m-1} - B_{i,m-1})
    const bm = (j) => (j < 0 || j > m - 1) ? 0 : binom(m - 1, j) * Math.pow(t, j) * Math.pow(1 - t, m - 1 - j);
    const db = m * (bm(i - 1) - bm(i));
    dre += db * gens[i][0]; dim += db * gens[i][1];
  }
  return {re, im, dre, dim};
}

/** Signed curvature kappa = Im(conj(r') r'') / |r'|^3 = 2 Im(conj(w) w') / |w|^4. */
function curvature(gens, t) {
  const {re, im, dre, dim} = wAt(gens, t);
  return 2 * (re * dim - im * dre) / Math.pow(re * re + im * im, 2);
}

/** Point r(t) by integrating r' = w^2 (composite Simpson on [0,t], fine panels). */
function integrateRs(gens, start, ts) {
  // cumulative Simpson with per-sample sub-steps
  const f = (t) => { const {re, im} = wAt(gens, t); return [re * re - im * im, 2 * re * im]; };
  const out = [start.slice()];
  let x = start[0], y = start[1];
  for (let i = 1; i < ts.length; i++) {
    const a = ts[i - 1], b = ts[i], mid = (a + b) / 2;
    const fa = f(a), fm = f(mid), fb = f(b), h = (b - a) / 6;
    x += h * (fa[0] + 4 * fm[0] + fb[0]); y += h * (fa[1] + 4 * fm[1] + fb[1]);
    out.push([x, y]);
  }
  return out;
}

/** Max |kappa| over [t0,t1] (dense sampling + golden refinement). Returns {rho, t, kappa}. */
function minRadius(gens, t0 = 0, t1 = 1, samples = 20000) {
  let best = {kappa: 0, t: t0};
  for (let i = 0; i <= samples; i++) {
    const t = t0 + (t1 - t0) * i / samples, k = curvature(gens, t);
    if (Math.abs(k) > Math.abs(best.kappa)) best = {kappa: k, t};
  }
  return {rho: 1 / Math.abs(best.kappa), t: best.t, kappa: best.kappa, atEndpoint: best.t === t0 || best.t === t1};
}

/** Offset polyline O(t_i) = r + d (r'_y, -r'_x)/|r'| at n+1 samples. */
function offsetPoints(gens, start, d, n = 2000) {
  const ts = Array.from({length: n + 1}, (_, i) => i / n);
  const rs = integrateRs(gens, start, ts);
  return {ts, points: ts.map((t, i) => {
    const {re, im} = wAt(gens, t);
    const dx = re * re - im * im, dy = 2 * re * im, s = re * re + im * im;
    return [rs[i][0] + d * dy / s, rs[i][1] - d * dx / s];
  }), curve: rs};
}

function segInter(p, q, r, s) {
  const cr = (a, b) => a[0] * b[1] - a[1] * b[0];
  const d1 = [q[0] - p[0], q[1] - p[1]], d2 = [s[0] - r[0], s[1] - r[1]], den = cr(d1, d2);
  if (den === 0) return null;
  const w = [r[0] - p[0], r[1] - p[1]];
  const u = cr(w, d2) / den, v = cr(w, d1) / den;
  return u > 0 && u < 1 && v > 0 && v < 1 ? {u, v, point: [p[0] + u * d1[0], p[1] + u * d1[1]]} : null;
}

/** First proper intersection between non-adjacent segments; returns {i, j, ti, tj, point} or null. */
function findSelfIntersection(points, ts) {
  const n = points.length - 1;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    const h = segInter(points[i], points[i + 1], points[j], points[j + 1]);
    if (h) return {i, j, ti: ts[i] + h.u * (ts[i + 1] - ts[i]), tj: ts[j] + h.v * (ts[j + 1] - ts[j]), point: h.point};
  }
  return null;
}

const roundStep = (d) => Math.round(d / SLIDER.step) * SLIDER.step;
const inRange = (d) => d >= SLIDER.min && d <= SLIDER.max;

function analyse(fx) {
  const mr = minRadius(fx.w);
  // cusp at d = -1/kappa: the sign that reaches the bend is -sign(kappa)
  const dCusp = -Math.sign(mr.kappa) * 1.5 * mr.rho;
  const dChosen = Number(roundStep(dCusp).toFixed(2));
  const run = (d) => { const o = offsetPoints(fx.w, fx.start, d); return findSelfIntersection(o.points, o.ts); };
  const control = Number(roundStep(-Math.sign(mr.kappa) * 0.5 * mr.rho).toFixed(2));
  const sweep = [];
  for (let d = SLIDER.min; d <= SLIDER.max + 1e-9; d += 0.05) {
    const o = offsetPoints(fx.w, fx.start, d, 1000);
    if (findSelfIntersection(o.points, o.ts)) sweep.push(Number(d.toFixed(2)));
  }
  return {sweep, mr, dChosen, inRange: inRange(dChosen), hit: run(dChosen), hitOpposite: run(-dChosen), control, controlHit: run(control)};
}

module.exports = {FIXTURES, SLIDER, wAt, curvature, minRadius, offsetPoints, findSelfIntersection, integrateRs, analyse};

if (require.main === module) {
  for (const [id, fx] of Object.entries(FIXTURES)) {
    const a = analyse(fx);
    const f = (h) => h ? `yes t=(${h.ti.toFixed(4)}, ${h.tj.toFixed(4)}) at (${h.point.map(v => v.toFixed(3)).join(', ')})` : 'no';
    console.log(`${id}\n  fixture start=${JSON.stringify(fx.start)} w=${JSON.stringify(fx.w)} t in [0,1]`);
    console.log(`  rho_min=${a.mr.rho.toFixed(4)} at t=${a.mr.t.toFixed(4)} (kappa=${a.mr.kappa.toFixed(4)}, endpoint=${a.mr.atEndpoint})`);
    console.log(`  slider [${SLIDER.min}, ${SLIDER.max}] step ${SLIDER.step}; chosen d=${a.dChosen} (in range: ${a.inRange}); d=${a.dChosen}: ${f(a.hit)}`);
    console.log(`  d=${-a.dChosen}: ${f(a.hitOpposite)}`);
    console.log(`  slider sweep (step 0.05): self-intersection for d in ${a.sweep.length ? '[' + a.sweep[0] + ', ' + a.sweep[a.sweep.length - 1] + ']' : 'none'}`);
    console.log(`  control d=${a.control} (0.5 rho_min): ${f(a.controlHit)}`);
  }
}
