import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Reproducible isolated renderer prototype vendor fetch. No package files change.
const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(root, '../../../.command-logs/patches-three-vendor');
const revision = '0af9729d0c143a86a1d725d6e2c3ad83301f3f34';
const base = `https://raw.githubusercontent.com/mrdoob/three.js/${revision}`;
const files = new Map([
  ['three.module.js', `${base}/build/three.module.js`],
  ['three.core.js', `${base}/build/three.core.js`],
  ['TeapotGeometry.js', `${base}/examples/jsm/geometries/TeapotGeometry.js`],
  ['LICENSE', `${base}/LICENSE`],
]);
await mkdir(out, { recursive: true });
const entries = [];
for (const [name, url] of files) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch ${url}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(resolve(out, name), bytes);
  entries.push({ name, url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const teapotSource = await readFile(resolve(out, 'TeapotGeometry.js'), 'utf8');
function arrayLiteral(name) {
  const start = teapotSource.indexOf(`const ${name} = [`);
  if (start < 0) throw new Error(`Could not find ${name} in pinned source`);
  const open = teapotSource.indexOf('[', start), close = teapotSource.indexOf('];', open);
  if (close < 0) throw new Error(`Could not find end of ${name}`);
  return JSON.parse(teapotSource.slice(open, close + 1).replace(/\/\*[\s\S]*?\*\//g, '').replace(/-\s+(?=\d)/g, '-').replace(/,\s*]/g, ']'));
}
const patches = arrayLiteral('teapotPatches');
const vertices = arrayLiteral('teapotVertices');
if (patches.length !== 512 || vertices.length !== 870) throw new Error('Pinned teapot dimensions did not match expected 512 indices and 870 coordinates');
const teapot = { sourceRevision: revision, patches, vertices };
const data = Buffer.from(JSON.stringify(teapot));
await writeFile(resolve(out, 'teapot-data.json'), data);
entries.push({ name: 'teapot-data.json', source: 'extracted literal arrays from TeapotGeometry.js', bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
await writeFile(resolve(out, 'SHA256SUMS.json'), `${JSON.stringify({ revision, entries }, null, 2)}\n`);
console.log(JSON.stringify({ out, revision, entries }, null, 2));
