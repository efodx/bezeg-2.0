import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('./teapot-data.js');
const { teapotPatches: indices, teapotVertices: xyz, resolvePatch } = data;

assert.equal(indices.length, 512);
assert.equal(Math.min(...indices), 0);
assert.equal(Math.max(...indices), 289);
assert.equal(xyz.length, 870);
assert.ok(xyz.every(Number.isFinite));
assert.equal(new Set(Array.from({ length: 32 }, (_, p) => indices.slice(p * 16, p * 16 + 16).join(','))).size, 32);
assert.deepEqual(xyz.slice(0, 3), [1.4, 0, 2.4]);
assert.deepEqual(xyz.slice(-3), [1.5, -0.84, 0.075]);
assert.deepEqual(indices.slice(0, 16), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
for (const patchIndex of [...Array.from({ length: 4 }, (_, i) => 20 + i), ...Array.from({ length: 4 }, (_, i) => 28 + i)]) {
  const collapsedRow = indices.slice(patchIndex * 16, patchIndex * 16 + 4);
  assert.equal(new Set(collapsedRow).size, 1, `collapsed cusp row missing in patch ${patchIndex}`);
}

const patches = Array.from({ length: 32 }, (_, p) => resolvePatch(p));
assert.ok(patches.every(p => p.length === 16 && p.every(q => q.length === 3 && q.every(Number.isFinite))));
const extent = [0, 1, 2].map(axis => [Math.min(...xyz.filter((_, i) => i % 3 === axis)), Math.max(...xyz.filter((_, i) => i % 3 === axis))]);
assert.deepEqual(extent, [[-3.0, 3.525], [-2.0, 2.0], [0, 3.15]]);

// The source Matrix4 uses this cubic power basis, with control rows transposed
// during its Matrix4 fill. This reproduces its M^T * G^T * M matrix path.
const M = [
  [-1, 3, -3, 1],
  [3, -6, 3, 0],
  [-3, 3, 0, 0],
  [1, 0, 0, 0],
];
const multiply = (a, b) => a.map(row => b[0].map((_, c) => row.reduce((sum, x, k) => sum + x * b[k][c], 0)));
const transpose = a => a[0].map((_, c) => a.map(row => row[c]));
const power = q => [q ** 3, q ** 2, q, 1];
const basis = q => M.map(row => row.reduce((sum, x, k) => sum + x * power(q)[k], 0));
function sourcePowerEval(control, u, v, transposeMutation = false) {
  // The upstream loops assign g[c*4+r] = P[r][c]; Matrix4.set reads g row-major.
  const g = Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) =>
    transposeMutation ? control[r * 4 + c] : control[c * 4 + r]));
  const vp = power(u), wp = power(v);
  return [0, 1, 2].map(axis => {
    const gAxis = g.map(row => row.map(point => point[axis]));
    const coeff = multiply(multiply(transpose(M), gAxis), M);
    return wp.reduce((sum, y, r) => sum + y * coeff[r].reduce((acc, x, c) => acc + x * vp[c], 0), 0);
  });
}
function bernstein(q) { const a = 1 - q; return [a ** 3, 3 * q * a ** 2, 3 * q ** 2 * a, q ** 3]; }
function bernsteinEval(control, u, v, transposeMutation = false) {
  const bu = bernstein(u), bv = bernstein(v), out = [0, 0, 0];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const point = control[transposeMutation ? c * 4 + r : r * 4 + c], weight = bu[r] * bv[c];
    for (let axis = 0; axis < 3; axis++) out[axis] += weight * point[axis];
  }
  return out;
}
const close = (a, b, tolerance = 2e-11) => a.every((x, i) => Math.abs(x - b[i]) <= tolerance);
function assertCrossCheck(control, patchIndex, transposeMutation = false) {
  // u addresses source grid rows; v addresses columns. This is source s/t order.
  for (const [u, v, r, c] of [[0, 0, 0, 0], [1, 0, 3, 0], [0, 1, 0, 3], [1, 1, 3, 3]]) {
    const expected = control[r * 4 + c];
    assert.ok(close(sourcePowerEval(control, u, v, transposeMutation), expected), `source corner mismatch patch ${patchIndex} at (${u},${v})`);
    assert.ok(close(bernsteinEval(control, u, v), expected), `Bernstein corner mismatch patch ${patchIndex} at (${u},${v})`);
  }
  for (const [u, v] of [[0.2, 0.37], [0.5, 0.5], [0.83, 0.61]]) {
    assert.ok(close(sourcePowerEval(control, u, v, transposeMutation), bernsteinEval(control, u, v)), `source/Bernstein mismatch patch ${patchIndex} at (${u},${v})`);
  }
}

for (let p = 0; p < 32; p++) assertCrossCheck(patches[p], p);

// The asymmetric handle/spout nets make a transposed adapter fail the same
// source-vs-Bernstein assertion used above. Keep this mutation check live.
assert.throws(() => assertCrossCheck(patches[12], 12, true), /source (corner|\/Bernstein) mismatch/);

for (const patchIndex of [...Array.from({ length: 8 }, (_, i) => 20 + i), ...Array.from({ length: 4 }, (_, i) => 28 + i)]) {
  const transformed = resolvePatch(patchIndex, { fitLid: true, blinn: false });
  for (let k = 0; k < 16; k++) {
    const source = patches[patchIndex][k];
    assert.equal(transformed[k][0], source[0] * (patchIndex < 28 ? 1.077 : 1));
    assert.equal(transformed[k][1], source[1] * (patchIndex < 28 ? 1.077 : 1));
    assert.equal(transformed[k][2], source[2] * 1.3);
  }
}
const display = resolvePatch(0, { displaySpace: true, size: 2 });
assert.ok(display.every(([x, y, z]) => [x, y, z].every(Number.isFinite)));
assert.throws(() => resolvePatch(32), RangeError);

console.log('teapot fixture OK: 32 distinct bicubic patches, 290 finite source points, four corners and three interiors per patch; deliberate grid-transpose mutation rejected');
