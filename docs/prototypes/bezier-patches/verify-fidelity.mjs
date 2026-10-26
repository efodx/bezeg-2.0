import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const root = new URL('./', import.meta.url);
const jsx = await readFile(new URL('prototype.js', root), 'utf8');
const three = await readFile(new URL('three-prototype.js', root), 'utf8');
const html = await readFile(new URL('index.html', root), 'utf8');
const require = createRequire(import.meta.url);
const teapot = require('./teapot-data.js');

function declaration(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is present in source`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) {
      return new Function(`${source.slice(start, i + 1)}; return ${name};`)();
    }
  }
  assert.fail(`${name} declaration is complete`);
}

const mix = (a, b, t) => a.map((x, i) => x * (1 - t) + b[i] * t);
const close = (actual, expected) => assert.ok(actual.every((x, i) => Math.abs(x - expected[i]) < 1e-12), `${actual} ≈ ${expected}`);
const sampleControlLine = new Function('mix', `return (${declaration(jsx, 'sampleControlLine').toString()});`)(mix);
const point = [0, 1, 2, 3].map(x => [x, x * 2, -x]);
const oldQ = Math.min(2, Math.floor(3));
const oldEnd = mix(point[oldQ], point[Math.min(3, oldQ + 1)], 3 % 1);
assert.deepEqual(oldEnd, point[2], 'pre-fix s=1 sampler counterexample lands on control 2');
assert.deepEqual(sampleControlLine(point, 1), point[3], 'tensor control line includes its final endpoint');
assert.deepEqual(sampleControlLine(point, 0), point[0], 'tensor control line includes its first endpoint');

for (const source of [jsx, three]) {
  const families = declaration(source, 'triangularIsoFamilies');
  const at = (u, v) => [u, v, 1 - u - v];
  const paths = families(at);
  const t = 0.4, s = 0.3;
  assert.equal(paths.length, 3, 'three independent barycentric families are present');
  paths.map((family, i) => close(family(t)(s), [[t, s * (1 - t), 1 - t - s * (1 - t)], [s * (1 - t), t, 1 - t - s * (1 - t)], [s * (1 - t), (1 - s) * (1 - t), t]][i]));
  close(paths[0](t)(0), at(t, 0));
  close(paths[0](t)(1), at(t, 1 - t));
  close(paths[1](t)(0), at(0, t));
  close(paths[1](t)(1), at(1 - t, t));
  close(paths[2](t)(0), at(0, 1 - t));
  close(paths[2](t)(1), at(1 - t, 0));
  assert.equal(new Set(paths.map(family => family(t)(s).slice(0, 2).join(','))).size, 3, 'interior samples from all families are distinct');
}

const oldW1 = [0.4 * (1 - 0.3), 0.4 * 0.3];
const oldW2 = [0.4 * 0.7, 0.4 * (1 - 0.7)];
close(oldW1, oldW2);

assert.equal(teapot.teapotPatches.length, 32 * 16);
assert.equal(teapot.teapotVertices.length, 290 * 3);
assert.equal(new Set(Array.from({ length: 32 }, (_, i) => teapot.teapotPatches.slice(i * 16, i * 16 + 16).join(','))).size, 32);
assert.ok(Array.from({ length: 32 }, (_, i) => teapot.resolvePatch(i, { fitLid: false, blinn: true, displaySpace: false })).every(patch => patch.length === 16 && patch.every(p => p.length === 3 && p.every(Number.isFinite))));
assert.match(jsx, /for\(let i=0;i<32;i\+\+\).*resolvePatch\(i,\{fitLid:false,blinn:true,displaySpace:false\}\)/);
assert.match(html, /teapot-data\.js[\s\S]*prototype\.js/);
assert.match(three, /for\(let p=0;p<32;p\+\+\)/);

console.log('Renderer fidelity assertions passed: tensor net endpoints, 3 triangular iso families per renderer, and 32 distinct raw teapot patches.');
