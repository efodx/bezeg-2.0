const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const graph = require('./structural.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(__dirname, `.fixture-${process.pid}-`));
  const put = (rel, text) => { const full = path.join(root, rel); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, text); };
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git('init', '-q'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Fixture');
  put('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'commonjs', strict: true }, include: ['src/**/*.ts'] }, null, 2));
  put('.gitignore', 'ignored.txt\n.repo-graph/\n');
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }));
  return { root, put, git };
}
function commit(f) { f.git('add', '-A'); f.git('commit', '-qm', 'fixture'); }

test('identical inputs produce byte-stable structure with current source and semantic completeness', t => {
  const f = fixture(t);
  f.put('src/lib.ts', 'export function curve(x: number) { return x * x; }\n');
  f.put('scripts/standalone.js', 'function legacy() { return 1; }\n');
  f.put('README.md', '# Guide\n\nSee [library](src/lib.ts).\n'); commit(f);
  const first = graph.buildSnapshot(f.root); const second = graph.buildSnapshot(f.root);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.semantic.status, 'none');
  assert.ok(first.manifest.revision.length >= 7);
  assert.ok(first.nodes.some(n => n.kind === 'declaration' && n.name === 'curve'));
  assert.equal(first.structural.status, 'partial');
  assert.ok(first.structural.fileOnly.includes('scripts/standalone.js'));
  assert.ok(first.edges.some(e => e.type === 'link'));
});

test('duplicate declarations and headings have unique path identities; inserted lines refresh ranges', t => {
  const f = fixture(t);
  f.put('src/dupe.ts', 'export function repeat() { return 1; }\nexport function repeat(x: number) { return x; }\n');
  f.put('guide.md', '# Part\nOne\n# Part\n```md\n# hidden\n```\n');
  f.put('adjacent.md', '# First\n# Second\n'); commit(f);
  const initial = graph.buildSnapshot(f.root);
  const decls = initial.nodes.filter(n => n.kind === 'declaration' && n.name === 'repeat');
  const sections = initial.nodes.filter(n => n.kind === 'section' && n.name === 'Part');
  assert.equal(decls.length, 2); assert.equal(new Set(decls.map(n => n.id)).size, 2);
  assert.equal(sections.length, 2); assert.equal(new Set(sections.map(n => n.id)).size, 2);
  assert.equal(initial.nodes.some(n => n.name === 'hidden'), false);
  const adjacent = initial.nodes.find(n => n.kind === 'section' && n.name === 'First');
  assert.equal(adjacent.endLine, 1);
  f.put('src/dupe.ts', '// inserted\n' + fs.readFileSync(path.join(f.root, 'src/dupe.ts'), 'utf8'));
  const shifted = graph.buildSnapshot(f.root);
  assert.equal(shifted.nodes.find(n => n.id === decls[0].id).startLine, decls[0].startLine + 1);
  assert.notEqual(shifted.manifest.fingerprint, initial.manifest.fingerprint);
});

test('imports and re-exports resolve to files, and identifier references connect declarations', t => {
  const f = fixture(t);
  f.put('src/math.ts', 'export function square(x: number) { return x * x; }\n');
  f.put('src/index.ts', "export { square } from './math';\nimport { square } from './math';\nexport const area = (x: number) => { console.log(x); return square(x); };\nexport const broken = () => missingThing();\n"); commit(f);
  const snap = graph.buildSnapshot(f.root);
  const paths = new Map(snap.nodes.filter(n => n.kind === 'file').map(n => [n.path, n.id]));
  assert.ok(snap.edges.some(e => e.type === 're-export' && e.from === paths.get('src/index.ts') && e.to === paths.get('src/math.ts')));
  assert.ok(snap.edges.some(e => e.type === 'import' && e.from === paths.get('src/index.ts') && e.to === paths.get('src/math.ts')));
  const square = snap.nodes.find(n => n.kind === 'declaration' && n.name === 'square');
  const area = snap.nodes.find(n => n.kind === 'declaration' && n.name === 'area');
  assert.ok(snap.edges.some(e => e.type === 'reference' && e.from === area.id && e.to === square.id));
  assert.ok(snap.manifest.diagnostics.some(d => d.kind === 'unresolved-reference' && d.name === 'missingThing'));
  assert.ok(snap.manifest.diagnostics.some(d => d.kind === 'external-reference-coverage' && d.path === 'src/index.ts'));
});

test('inventory rejects symlinks before reading linked source', t => {
  const f = fixture(t); const outside = path.join(path.dirname(f.root), `repo-graph-outside-${process.pid}.md`);
  fs.writeFileSync(outside, '# Outside\n');
  t.after(() => { try { fs.unlinkSync(outside); } catch {} });
  try { fs.symlinkSync(outside, path.join(f.root, 'linked.md'), 'file'); }
  catch (error) { t.skip(`Symlinks are unavailable on this platform: ${error.code || error.message}`); return; }
  const inv = graph.inventory(f.root);
  assert.ok(!inv.files.some(file => file.path === 'linked.md'));
  assert.ok(inv.excluded.some(file => file.path === 'linked.md' && file.reason === 'symlink'));
});

test('Markdown links resolve inline titles and reference definitions, while fenced links are ignored', t => {
  const f = fixture(t);
  f.put('guide.md', '[inline](target.md "a title")\n[reference][target]\n\n[target]: <target.md> "title"\n[broken](missing.md "title")\n```md\n[fenced](also-missing.md)\n```\n');
  f.put('target.md', '# Target\n'); commit(f);
  const snap = graph.buildSnapshot(f.root); const guide = snap.nodes.find(n => n.kind === 'file' && n.path === 'guide.md'); const target = snap.nodes.find(n => n.kind === 'file' && n.path === 'target.md');
  assert.equal(snap.edges.filter(e => e.type === 'link' && e.from === guide.id && e.to === target.id).length, 1);
  assert.ok(snap.manifest.diagnostics.some(d => d.kind === 'unresolved-link' && d.target === 'missing.md'));
  assert.ok(!snap.manifest.diagnostics.some(d => d.target === 'also-missing.md'));
});

test('live inventory includes dirty tracked and eligible untracked files, removes deleted and renamed nodes, excludes ignored and unsafe formats', t => {
  const f = fixture(t);
  f.put('src/old.ts', 'export const oldName = 1;\n'); f.put('notes.md', '# Notes\n'); commit(f);
  f.git('mv', 'src/old.ts', 'src/new.ts');
  f.put('src/new.ts', 'export const newName = 3;\n');
  f.put('scratch.txt', 'eligible untracked\n'); f.put('ignored.txt', 'ignored\n'); f.put('.env.local', 'secret'); f.put('asset.png', Buffer.from([137, 80, 78, 71]));
  f.put('table.csv', 'a,b\n1,2\n');
  const inv = graph.inventory(f.root);
  assert.ok(inv.files.some(x => x.path === 'src/new.ts'));
  assert.ok(inv.files.some(x => x.path === 'scratch.txt'));
  assert.ok(!inv.files.some(x => x.path === 'ignored.txt'));
  assert.ok(inv.excluded.some(x => x.path === '.env.local' && x.reason === 'credential'));
  assert.ok(inv.excluded.some(x => x.path === 'asset.png' && x.reason === 'binary'));
  assert.ok(inv.excluded.some(x => x.path === 'table.csv' && x.reason === 'unsupported-format'));
  const snap = graph.buildSnapshot(f.root);
  assert.ok(!snap.nodes.some(n => n.path === 'src/old.ts'));
  assert.ok(snap.nodes.some(n => n.path === 'src/new.ts' && n.name === 'newName'));
  assert.ok(snap.manifest.files.some(x => x.path === 'src/new.ts'));
  fs.rmSync(path.join(f.root, 'notes.md'));
  const deleted = graph.buildSnapshot(f.root);
  assert.ok(!deleted.nodes.some(n => n.path === 'notes.md'));
  assert.ok(deleted.edges.every(e => deleted.nodes.some(n => n.id === e.from) && deleted.nodes.some(n => n.id === e.to)));
});

test('configuration changes invalidate fingerprints and glossary terms create explicit mention edges', t => {
  const f = fixture(t);
  f.put('GLOSSARY.md', '# Glossary\n\n**Curve**: A mathematical curve.\n');
  f.put('src/curve.ts', '// Curve calculations\nexport const curve = 1;\n'); commit(f);
  const first = graph.buildSnapshot(f.root);
  const concept = first.nodes.find(n => n.kind === 'concept' && n.name === 'Curve');
  const file = first.nodes.find(n => n.kind === 'file' && n.path === 'src/curve.ts');
  assert.ok(first.edges.some(e => e.type === 'glossary-mention' && e.from === file.id && e.to === concept.id));
  assert.equal(first.nodes.find(n => n.kind === 'file' && n.path === 'GLOSSARY.md').authority, 'unknown');
  f.put('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'commonjs', strict: true }, include: ['src/**/*.ts'] }));
  const second = graph.buildSnapshot(f.root);
  assert.notEqual(second.manifest.configFingerprint, first.manifest.configFingerprint);
  assert.notEqual(second.manifest.fingerprint, first.manifest.fingerprint);
});

test('extended TypeScript configuration is fingerprinted and planned documentation maps to proposed authority', t => {
  const f = fixture(t);
  f.put('tsconfig.json', JSON.stringify({ extends: './base.json', include: ['src/**/*.ts'] }));
  f.put('base.json', JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'commonjs' } }));
  f.put('src/a.ts', 'export const a = 1;\n');
  f.put('proposal.md', 'Status: planned\n\n# Proposal\nBody\n'); commit(f);
  f.put('accepted.md', '# Accepted decision\n\nAccepted on 2026-10-25. Kept current.\n');
  f.put('superseded.md', '# Old decision\n\nStatus: superseded\nAccepted on 2025-01-01. Historical acceptance is overridden.\n');
  f.put('example.md', '# Unknown status\n\n```\nStatus: current\n```\n');
  const first = graph.buildSnapshot(f.root);
  assert.ok(first.manifest.configFiles.some(file => file.path === 'base.json'));
  assert.equal(first.nodes.find(n => n.kind === 'section' && n.name === 'Proposal').authority, 'proposed');
  assert.equal(first.nodes.find(n => n.kind === 'file' && n.path === 'accepted.md').authority, 'current');
  assert.equal(first.nodes.find(n => n.kind === 'file' && n.path === 'superseded.md').authority, 'superseded');
  assert.equal(first.nodes.find(n => n.kind === 'file' && n.path === 'example.md').authority, 'unknown');
  f.put('base.json', JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'commonjs' } }));
  const second = graph.buildSnapshot(f.root);
  assert.notEqual(second.manifest.configFingerprint, first.manifest.configFingerprint);
});

test('snapshot validation rejects dangling edges and freshness rejects changed source before publication', t => {
  const f = fixture(t); f.put('src/a.ts', 'export const a = 1;\n'); commit(f);
  const snap = graph.buildSnapshot(f.root);
  assert.throws(() => graph.validateSnapshot({ ...snap, edges: [...snap.edges, { from: 'missing', to: 'also-missing', type: 'reference', provenance: 'fixture' }] }), /endpoint/);
  assert.throws(() => graph.validateSnapshot({ ...snap, nodes: snap.nodes.map((node, index) => index ? node : { ...node, path: 'outside.ts' }) }), /source location/);
  assert.throws(() => graph.validateSnapshot({ ...snap, nodes: snap.nodes.map((node, index) => index ? node : { ...node, contentHash: 'stale' }) }), /content hash/);
  graph.writeSnapshot(f.root, snap);
  assert.equal(graph.readSnapshot(f.root).manifest.fingerprint, snap.manifest.fingerprint);
  assert.equal(graph.assertFresh(f.root, snap), true);
  const forged = structuredClone(snap);
  forged.nodes[0].text = forged.nodes[0].text.replace(/./, char => char === 'X' ? 'Y' : 'X');
  forged.nodes[0].contentHash = graph.hash(forged.nodes[0].text);
  assert.equal(graph.validateSnapshot(forged), true);
  assert.throws(() => graph.assertFresh(f.root, forged), /passage is not current/);
  const movedRange = structuredClone(snap);
  movedRange.nodes[0].startLine++; movedRange.nodes[0].endLine++;
  assert.throws(() => graph.assertFresh(f.root, movedRange), /passage is not current/);
  const currentSource = snap.nodes.find(n => n.kind === 'file' && n.path === 'src/a.ts');
  const provenance = {inferred: true, model: 'offline', promptVersion: 'test', promptHash: 'p', schemaHash: 's'};
  const enriched = {...snap, semantic: {status: 'partial', nodes: [{id: 'concept:board-disposal', kind: 'concept',
    name: 'board-disposal', aliases: [], conceptKind: 'responsibility', provenance}], edges: [{from: currentSource.id,
    to: 'concept:board-disposal', type: 'membership', rationale: 'Test evidence validation.', inferred: true, provenance,
    evidence: [{sourceId: currentSource.id, quote: currentSource.text.trim(), startLine: 1, endLine: 1}]}]}};
  assert.equal(graph.validateSnapshot(enriched), true);
  const invalidEvidence = structuredClone(enriched);
  invalidEvidence.semantic.edges[0].evidence[0].quote = 'this quote does not occur in source';
  assert.throws(() => graph.validateSnapshot(invalidEvidence), /inferred evidence/);
  f.put('src/a.ts', 'export const a = 2;\n');
  assert.throws(() => graph.assertFresh(f.root, snap), /stale/);
  assert.throws(() => graph.writeSnapshot(f.root, snap), /stale/);
});
