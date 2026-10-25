'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const graph = require('./structural.cjs');
const enrich = require('./enrich.cjs');
const adapter = require('./codex.cjs');
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(__dirname, `.enrich-${process.pid}-`));
  const put = (name, text) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, text); };
  const git = (...args) => execFileSync('git', args, {cwd: root, stdio: 'ignore'});
  git('init', '-q'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Fixture');
  put('.gitignore', '.repo-graph/\n'); put('tsconfig.json', JSON.stringify({compilerOptions: {target: 'ES2020', module: 'commonjs'}, include: ['src/**/*.ts']}));
  put('src/a.ts', 'export function disposeBoard() {\n  return "dispose the board and listener";\n}\n');
  t.after(() => fs.rmSync(root, {recursive: true, force: true, maxRetries: 8, retryDelay: 100}));
  return {root, put, git};
}
function commit(f) { f.git('add', '-A'); f.git('commit', '-qm', 'fixture'); }
function fakeInvoke(calls, behavior = {}) {
  return (sources, {mode, model, vocabulary = [], context = ''}) => {
    calls.count++;
    const quote = sources[0].text.match(/.{12,}/)?.[0].slice(0, 24) || sources[0].text.slice(0, 12);
    if (behavior.fail?.(sources, mode)) throw new Error('fixture provider failure');
    const result = mode === 'tags' ? {tags: [{sourceId: sources[0].id, concept: behavior.concept || 'board-disposal',
      kind: behavior.kind?.(sources[0]) || 'responsibility', quote, rationale: 'The passage names disposal.'}], relations: []} :
      {tags: [], relations: behavior.relate ? [{from: sources[0].id, to: sources[1].id, type: 'supports',
        fromQuote: quote, toQuote: sources[1].text.match(/.{12,}/)?.[0].slice(0, 24), rationale: 'The passages support a shared decision.'}] : []};
    return {result, provenance: {inferred: true, model, promptVersion: adapter.PROMPT_VERSION,
      promptHash: hash(adapter.promptFor(sources, mode, {vocabulary, context})), schemaHash: hash(JSON.stringify(adapter.SCHEMA))}, metrics: {elapsedMs: 1, usage: null}};
  };
}

test('dry plan is default and explicit scope follows the query passage boundaries', t => {
  const f = fixture(t); commit(f); const snapshot = graph.buildSnapshot(f.root);
  const report = enrich.enrich(f.root, snapshot, {paths: ['src/a.ts']});
  assert.equal(report.plan.dryRun, true); assert.equal(report.plan.modelCalls, 0);
  assert.ok(report.plan.scopedSources > 0); assert.ok(report.plan.jobs.every(j => j.suppliedBytes > 0));
  assert.throws(() => enrich.enrich(f.root, snapshot, {execute: true, model: 'm', maxCalls: 1, timeoutMs: 1000, inputBytes: 18000}), /explicit/);
});

test('cache resumes partial work, remaps IDs and invalidates only changed chunk content', t => {
  const f = fixture(t); commit(f); let snapshot = graph.buildSnapshot(f.root);
  const node = snapshot.nodes.find(n => n.kind === 'declaration' && n.path === 'src/a.ts');
  const calls = {count: 0}, cacheDir = path.join(f.root, '.repo-graph/cache');
  const base = {execute: true, nodeIDs: [node.id], model: 'offline', maxCalls: 0, timeoutMs: 1000, inputBytes: 18000, cacheDir, invoke: fakeInvoke(calls)};
  const paused = enrich.enrich(f.root, snapshot, base);
  assert.equal(paused.modelCalls, 0); assert.ok(paused.pending.length); assert.equal(paused.snapshot.semantic.status, 'partial');
  snapshot = paused.snapshot;
  const resumed = enrich.enrich(f.root, snapshot, {...base, maxCalls: 4});
  assert.equal(calls.count, 1); assert.equal(resumed.snapshot.semantic.status, 'partial');
  assert.ok(resumed.snapshot.semantic.nodes.some(n => n.id === 'concept:board-disposal'));
  const hit = enrich.enrich(f.root, resumed.snapshot, {...base, maxCalls: 4});
  assert.equal(calls.count, 1); assert.equal(hit.modelCalls, 0);
  f.put('src/a.ts', 'export function disposeBoard() {\n  return "dispose the board and listener safely";\n}\n');
  const changed = graph.buildSnapshot(f.root);
  const refreshed = enrich.enrich(f.root, changed, {...base, maxCalls: 4});
  assert.equal(calls.count, 2); assert.equal(refreshed.snapshot.semantic.status, 'partial');
});

test('malformed adapter output cannot publish and deleted source links disappear with rebuilt snapshot', t => {
  const f = fixture(t); commit(f); const snapshot = graph.buildSnapshot(f.root);
  const node = snapshot.nodes.find(n => n.kind === 'declaration' && n.path === 'src/a.ts');
  const bad = enrich.enrich(f.root, snapshot, {execute: true, nodeIDs: [node.id], model: 'offline', maxCalls: 4,
    timeoutMs: 1000, inputBytes: 18000, cacheDir: path.join(f.root, '.repo-graph/cache'), invoke: () => ({result: {tags: [{}], relations: []}})});
  assert.equal(bad.snapshot.semantic.status, 'partial'); assert.ok(bad.snapshot.semantic.diagnostics.length);
  f.git('rm', '-q', 'src/a.ts');
  const rebuilt = graph.buildSnapshot(f.root);
  assert.equal(rebuilt.nodes.some(n => n.path === 'src/a.ts'), false);
  assert.equal(rebuilt.semantic.status, 'none');
});

test('cached declaration evidence remaps after rename and line shift, and scoped runs preserve other live cached results', t => {
  const f = fixture(t); f.put('src/b.ts', 'export function releaseBoard() { return "release the board resource"; }\n'); commit(f);
  let snapshot = graph.buildSnapshot(f.root); const calls = {count: 0}, cacheDir = path.join(f.root, '.repo-graph/cache');
  const base = {execute: true, model: 'offline', maxCalls: 4, timeoutMs: 1000, inputBytes: 18000, cacheDir, invoke: fakeInvoke(calls)};
  let a = snapshot.nodes.find(n => n.kind === 'declaration' && n.name === 'disposeBoard');
  const first = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [a.id]});
  assert.ok(first.snapshot.semantic.edges.some(e => e.from === a.id));
  snapshot = first.snapshot;
  const b = snapshot.nodes.find(n => n.kind === 'declaration' && n.name === 'releaseBoard');
  const second = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [b.id]});
  assert.equal(calls.count, 2);
  assert.ok(second.snapshot.semantic.edges.some(e => e.from === a.id));
  assert.ok(second.snapshot.semantic.edges.some(e => e.from === b.id));
  f.git('mv', 'src/a.ts', 'src/renamed.ts');
  f.put('src/renamed.ts', 'export function beforeDispose() { return 1; }\nexport function disposeBoard() {\n  return "dispose the board and listener";\n}\n');
  f.git('add', '-A'); f.git('commit', '-qm', 'rename and shift');
  snapshot = graph.buildSnapshot(f.root);
  a = snapshot.nodes.find(n => n.kind === 'declaration' && n.name === 'disposeBoard');
  assert.equal(a.text, first.snapshot.nodes.find(n => n.kind === 'declaration' && n.name === 'disposeBoard').text);
  const renamed = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [a.id]});
  assert.equal(calls.count, 2);
  const evidence = renamed.snapshot.semantic.edges.find(e => e.from === a.id).evidence[0];
  assert.equal(evidence.startLine, a.startLine);
  assert.equal(evidence.sourceId, a.id);
});

test('invalid cache provenance is a miss and failed snapshot replacement leaves the old snapshot intact', t => {
  const f = fixture(t); commit(f); const snapshot = graph.buildSnapshot(f.root);
  const node = snapshot.nodes.find(n => n.kind === 'declaration' && n.path === 'src/a.ts');
  const calls = {count: 0}, cacheDir = path.join(f.root, '.repo-graph/cache');
  const options = {execute: true, nodeIDs: [node.id], model: 'offline', maxCalls: 4, timeoutMs: 1000,
    inputBytes: 18000, cacheDir, invoke: fakeInvoke(calls)};
  const first = enrich.enrich(f.root, snapshot, options);
  const cacheFile = fs.readdirSync(cacheDir).map(n => path.join(cacheDir, n)).find(n => n.endsWith('.json'));
  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); cache.provenance.promptHash = 'poisoned';
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  const cachedAgain = enrich.enrich(f.root, first.snapshot, options);
  assert.equal(calls.count, 2);
  const before = fs.readFileSync(path.join(f.root, '.repo-graph/snapshot.json'), 'utf8');
  const originalWrite = graph.writeSnapshot;
  graph.writeSnapshot = () => { throw new Error('simulated interrupted write'); };
  try { assert.throws(() => enrich.enrich(f.root, cachedAgain.snapshot, options), /interrupted/); }
  finally { graph.writeSnapshot = originalWrite; }
  assert.equal(fs.readFileSync(path.join(f.root, '.repo-graph/snapshot.json'), 'utf8'), before);
});

test('document section edits invalidate that section cache without discarding other file cache entries', t => {
  const f = fixture(t); f.put('src/b.ts', 'export function disposeListener() { return "dispose the listener"; }\n');
  f.put('README.md', '# Ownership\nDispose the board after its listeners are removed.\n'); commit(f);
  let snapshot = graph.buildSnapshot(f.root); const calls = {count: 0}, cacheDir = path.join(f.root, '.repo-graph/cache');
  const base = {execute: true, model: 'offline', maxCalls: 4, timeoutMs: 1000, inputBytes: 18000, cacheDir, invoke: fakeInvoke(calls)};
  const section = snapshot.nodes.find(n => n.kind === 'section' && n.name === 'Ownership');
  const first = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [section.id]});
  assert.equal(calls.count, 1);
  f.put('README.md', '# Ownership\nDispose the board and all its listeners after use.\n');
  snapshot = graph.buildSnapshot(f.root);
  const updatedSection = snapshot.nodes.find(n => n.kind === 'section' && n.name === 'Ownership');
  const updated = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [updatedSection.id]});
  assert.equal(calls.count, 2);
  assert.ok(updated.snapshot.semantic.edges.some(e => e.from === updatedSection.id));
  assert.equal(updated.snapshot.semantic.status, 'partial');
  assert.ok(first.snapshot.semantic.nodes.length);
});

test('cached annotations survive a call-limit pause and provider failure in another scope', t => {
  const f = fixture(t); f.put('src/b.ts', 'export function releaseBoard() { return "release the board resource"; }\n'); commit(f);
  const snapshot = graph.buildSnapshot(f.root), a = snapshot.nodes.find(n => n.kind === 'declaration' && n.name === 'disposeBoard');
  const b = snapshot.nodes.find(n => n.kind === 'declaration' && n.name === 'releaseBoard');
  const calls = {count: 0}, base = {execute: true, model: 'offline', maxCalls: 4, timeoutMs: 1000, inputBytes: 18000,
    cacheDir: path.join(f.root, '.repo-graph/cache'), invoke: fakeInvoke(calls)};
  const cachedA = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [a.id]});
  const pausedB = enrich.enrich(f.root, cachedA.snapshot, {...base, nodeIDs: [b.id], maxCalls: 0});
  assert.equal(pausedB.pending[0].reason, 'calllimit');
  assert.ok(pausedB.snapshot.semantic.edges.some(e => e.from === a.id));
  const failedB = enrich.enrich(f.root, pausedB.snapshot, {...base, nodeIDs: [b.id], invoke: fakeInvoke(calls, {fail: () => true})});
  assert.equal(failedB.pending[0].reason, 'previousfailure');
  assert.ok(failedB.snapshot.semantic.edges.some(e => e.from === a.id));
});

test('active cache hits after a blocked uncached job are still assembled', t => {
  const f = fixture(t); f.put('src/b.ts', 'export function releaseBoard() { return "release the board resource"; }\n'); commit(f);
  const snapshot = graph.buildSnapshot(f.root), declarations = snapshot.nodes.filter(n => n.kind === 'declaration');
  const calls = {count: 0}, base = {execute: true, model: 'offline', maxCalls: 4, timeoutMs: 1000, inputBytes: 18000,
    cacheDir: path.join(f.root, '.repo-graph/cache'), invoke: fakeInvoke(calls)};
  const ordered = enrich.selectedPassages(snapshot, {nodeIDs: declarations.map(n => n.id)});
  const cachedId = ordered[1].nodeId;
  const primed = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [cachedId]});
  const blocked = enrich.enrich(f.root, primed.snapshot, {...base, nodeIDs: declarations.map(n => n.id), maxCalls: 0});
  assert.ok(blocked.snapshot.semantic.edges.some(e => e.from === cachedId));
  assert.ok(blocked.pending.length);
});

test('pair cache survives a changed shortlist but is dropped after simultaneous source edits', t => {
  const f = fixture(t); f.put('src/b.ts', 'export function consumeState() { return "consume the scene state"; }\n'); commit(f);
  f.put('src/c.ts', 'export function describeScene() { return "describe the scene state"; }\n'); f.git('add', '-A'); f.git('commit', '-qm', 'add candidate');
  let snapshot = graph.buildSnapshot(f.root), nodes = snapshot.nodes.filter(n => n.kind === 'declaration');
  const a = nodes.find(n => n.name === 'disposeBoard'), b = nodes.find(n => n.name === 'consumeState'), c = nodes.find(n => n.name === 'describeScene');
  const calls = {count: 0}, base = {execute: true, model: 'offline', maxCalls: 4,
    timeoutMs: 1000, inputBytes: 18000, cacheDir: path.join(f.root, '.repo-graph/cache'), invoke: fakeInvoke(calls, {relate: true})};
  const first = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [a.id, b.id]});
  const pairEdge = first.snapshot.semantic.edges.find(e => e.type === 'supports' && new Set([e.from, e.to]).has(a.id) && new Set([e.from, e.to]).has(b.id));
  assert.ok(pairEdge);
  const changedShortlist = enrich.enrich(f.root, first.snapshot, {...base, nodeIDs: [a.id, c.id]});
  assert.ok(changedShortlist.snapshot.semantic.edges.some(e => e.type === 'supports' && new Set([e.from, e.to]).has(a.id) && new Set([e.from, e.to]).has(b.id)));
  f.put('src/a.ts', 'export function disposeBoard() { return "dispose the board and updated scene state"; }\n');
  f.put('src/b.ts', 'export function consumeState() { return "consume the updated scene state"; }\n');
  snapshot = graph.buildSnapshot(f.root);
  const edited = snapshot.nodes.filter(n => n.kind === 'declaration');
  const currentA = edited.find(n => n.name === 'disposeBoard'), currentB = edited.find(n => n.name === 'consumeState');
  const second = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [currentA.id, currentB.id]});
  assert.ok(calls.count >= 7);
  assert.ok(second.snapshot.semantic.edges.some(e => e.type === 'supports' && new Set([e.from, e.to]).has(currentA.id) && new Set([e.from, e.to]).has(currentB.id)));
});

test('canonical concept kind conflicts are diagnosed and the conflicting membership is omitted', t => {
  const f = fixture(t); f.put('src/b.ts', 'export function disposeListener() { return "dispose another listener"; }\n'); commit(f);
  const snapshot = graph.buildSnapshot(f.root), nodes = snapshot.nodes.filter(n => n.kind === 'declaration');
  const calls = {count: 0}, result = enrich.enrich(f.root, snapshot, {execute: true, nodeIDs: nodes.map(n => n.id), model: 'offline',
    maxCalls: 2, timeoutMs: 1000, inputBytes: 18000, cacheDir: path.join(f.root, '.repo-graph/cache'),
    invoke: fakeInvoke(calls, {kind: source => source.text.includes('disposeListener') ? 'mathematical' : 'responsibility'})});
  assert.equal(result.snapshot.semantic.status, 'partial');
  assert.ok(result.snapshot.semantic.diagnostics.some(d => /Conflicting concept kinds/.test(d.message)));
  assert.equal(result.snapshot.semantic.edges.filter(e => e.type === 'membership').length, 1);
});

test('structural endpoints map through node IDs when candidate passages carry range IDs', () => {
  const sources = [{id: 'a@1-2', nodeId: 'a', text: 'quartz lantern calibration'},
    {id: 'b@3-4', nodeId: 'b', text: 'velvet compass telemetry'}];
  const jobs = enrich.jobsFor({edges: [{from: 'a', to: 'b', type: 'reference'}]}, sources,
    [{sourceId: sources[0].id, concept: 'first-duty'}, {sourceId: sources[1].id, concept: 'second-duty'}]);
  assert.equal(jobs.filter(j => j.mode === 'pairs').length, 1);
  assert.deepEqual(jobs.find(j => j.mode === 'pairs').sources.map(s => s.nodeId), ['a', 'b']);
});

test('shared inferred concepts take priority over a crowded lexical candidate shortlist', () => {
  const sources = Array.from({length: 10}, (_, i) => ({id: `${i}@1-1`, nodeId: `${i}`, text: 'shared boilerplate wording'}));
  const memberships = sources.map((s, i) => ({sourceId: s.id, concept: i >= 8 ? 'special-duty' : `separate-duty-${i}`}));
  const pair = enrich.jobsFor({edges: []}, sources, memberships).find(j => j.mode === 'pairs');
  assert.ok(pair.sources.some(s => s.nodeId === '8'));
  assert.ok(pair.sources.some(s => s.nodeId === '9'));
});

test('disconnected passages with independent shared tags reach one resumable pair batch', t => {
  const f = fixture(t);
  f.put('src/b.ts', 'export function parseVector() { return "quartz lantern calibration"; }\n');
  f.put('src/c.ts', 'export function cacheOrbit() { return "velvet compass telemetry"; }\n'); commit(f);
  const snapshot = graph.buildSnapshot(f.root), nodes = snapshot.nodes.filter(n => n.kind === 'declaration' && ['parseVector', 'cacheOrbit'].includes(n.name));
  const calls = {count: 0}, cacheDir = path.join(f.root, '.repo-graph/cache');
  const opts = {execute: true, nodeIDs: nodes.map(n => n.id), model: 'offline', timeoutMs: 1000, inputBytes: 18000, cacheDir, invoke: fakeInvoke(calls, {relate: true})};
  const paused = enrich.enrich(f.root, snapshot, {...opts, maxCalls: 2});
  assert.equal(calls.count, 2); assert.ok(paused.pending.some(p => p.mode === 'pairs' && p.reason === 'calllimit'));
  const resumed = enrich.enrich(f.root, paused.snapshot, {...opts, maxCalls: 1});
  assert.equal(calls.count, 3); assert.ok(resumed.snapshot.semantic.edges.some(e => e.type === 'supports'));
  const warm = enrich.enrich(f.root, resumed.snapshot, {...opts, maxCalls: 0});
  assert.equal(calls.count, 3); assert.equal(warm.modelCalls, 0);
});

test('glossary aliases are retained exactly and vocabulary edits invalidate cached tags', t => {
  const f = fixture(t); f.put('GLOSSARY.md', '**Bézier Curve**: A parametric curve.\n'); commit(f);
  let snapshot = graph.buildSnapshot(f.root), node = snapshot.nodes.find(n => n.kind === 'declaration' && n.name === 'disposeBoard');
  const calls = {count: 0}, base = {execute: true, nodeIDs: [node.id], model: 'offline', maxCalls: 4, timeoutMs: 1000,
    inputBytes: 18000, cacheDir: path.join(f.root, '.repo-graph/cache'), invoke: fakeInvoke(calls, {concept: 'bezier-curve'})};
  const first = enrich.enrich(f.root, snapshot, base);
  const concept = first.snapshot.semantic.nodes.find(n => n.aliases.includes('Bézier Curve'));
  assert.ok(concept.aliases.includes('Bézier Curve'));
  f.put('GLOSSARY.md', '**Bézier Curve**: A smooth parametric curve.\n');
  snapshot = graph.buildSnapshot(f.root); node = snapshot.nodes.find(n => n.kind === 'declaration' && n.name === 'disposeBoard');
  const changed = enrich.enrich(f.root, snapshot, {...base, nodeIDs: [node.id]});
  assert.equal(calls.count, 2); assert.ok(changed.plan === undefined);
});

test('authentication preflight failures do not count as model calls', t => {
  const f = fixture(t); commit(f); const snapshot = graph.buildSnapshot(f.root), node = snapshot.nodes.find(n => n.kind === 'declaration');
  const result = enrich.enrich(f.root, snapshot, {execute: true, nodeIDs: [node.id], model: 'offline', maxCalls: 1,
    timeoutMs: 1000, inputBytes: 18000, cacheDir: path.join(f.root, '.repo-graph/cache'),
    invoke: () => { const error = new Error('login missing'); error.metrics = {modelCalls: 0, usage: null}; throw error; }});
  assert.equal(result.invocationAttempts, 1); assert.equal(result.modelCalls, 0); assert.equal(result.usage.modelCalls, 0); assert.equal(result.unknownModelCalls, 0);
});

test('pair reconstruction handles file/section copies of identical Markdown text', t => {
  const f = fixture(t); f.put('guide.md', '# Disposal contract\nThe graph releases objects before leaving this view.\n'); commit(f);
  const snapshot = graph.buildSnapshot(f.root), code = snapshot.nodes.find(n => n.name === 'disposeBoard'),
    prose = snapshot.nodes.find(n => n.kind === 'file' && n.path === 'guide.md');
  const calls = {count: 0}, options = {execute: true, model: 'offline', maxCalls: 4, timeoutMs: 1000,
    inputBytes: 18000, invoke: fakeInvoke(calls, {relate: true})};
  const first = enrich.enrich(f.root, snapshot, {...options, nodeIDs: [code.id, prose.id]});
  assert.ok(first.snapshot.semantic.edges.some(e => e.type === 'supports'));
  const cached = enrich.enrich(f.root, first.snapshot, {...options, maxCalls: 0, nodeIDs: [code.id]});
  assert.equal(cached.modelCalls, 0);
  assert.ok(cached.snapshot.semantic.edges.some(e => e.type === 'supports'));
});

test('vocabulary overflow, canonical collisions and pair-cache scan caps stay explicit', t => {
  const f = fixture(t);
  f.put('GLOSSARY.md', '**Bézier Curve**: A curve.\n**Bezier Curve**: Another spelling.\n' +
    Array.from({length: 100}, (_, i) => `**Long Vocabulary Label ${i}**: A seeded responsibility.\n`).join(''));
  commit(f);
  const snapshot = graph.buildSnapshot(f.root), code = snapshot.nodes.find(n => n.name === 'disposeBoard');
  const cacheDir = path.join(f.root, '.repo-graph/cache'); fs.mkdirSync(cacheDir, {recursive: true});
  for (let i = 0; i < 2049; i++) fs.writeFileSync(path.join(cacheDir, `record-${String(i).padStart(4, '0')}.json`), '{}');
  const result = enrich.enrich(f.root, snapshot, {execute: true, nodeIDs: [code.id], model: 'offline', maxCalls: 0,
    timeoutMs: 1000, inputBytes: 18000, cacheDir});
  assert.equal(result.modelCalls, 0);
  assert.ok(result.snapshot.semantic.diagnostics.some(d => d.reason === 'vocabularylimit'));
  assert.ok(result.snapshot.semantic.diagnostics.some(d => d.reason === 'vocabularycollision' && d.ids.includes('bezier-curve')));
  assert.ok(result.snapshot.semantic.diagnostics.some(d => d.reason === 'paircache-scan-cap' && d.omitted === 1));
});

test('pending work survives a switch of explicit scope without out-of-scope execution', t => {
  const f = fixture(t); f.put('src/b.ts', 'export function releaseListener() { return "release the listener safely"; }\n'); commit(f);
  const snapshot = graph.buildSnapshot(f.root), a = snapshot.nodes.find(n => n.name === 'disposeBoard'), b = snapshot.nodes.find(n => n.name === 'releaseListener');
  const calls = {count: 0}, options = {execute: true, model: 'offline', timeoutMs: 1000, inputBytes: 18000, invoke: fakeInvoke(calls)};
  const paused = enrich.enrich(f.root, snapshot, {...options, nodeIDs: [a.id], maxCalls: 0});
  const switched = enrich.enrich(f.root, paused.snapshot, {...options, nodeIDs: [b.id], maxCalls: 1});
  assert.equal(calls.count, 1);
  assert.ok(switched.pending.some(p => p.mode === 'tags' && p.ids.some(id => id.startsWith(a.id))));
  assert.equal(switched.snapshot.semantic.coverage.scopedPendingChunks, 0);
  const resumed = enrich.enrich(f.root, switched.snapshot, {...options, nodeIDs: [a.id], maxCalls: 1});
  assert.equal(calls.count, 2);
  assert.ok(!resumed.pending.some(p => p.mode === 'tags' && p.ids.some(id => id.startsWith(a.id))));
});
