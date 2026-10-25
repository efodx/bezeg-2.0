'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {invoke, cacheKey, validate} = require('./codex.cjs');

function analyze(sources, options) {
  const key = cacheKey(sources, options.mode, options.model);
  const file = path.join(options.cacheDir, `${key}.json`);
  if (!options.force && fs.existsSync(file)) {
    const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
    const remap = new Map(cached.ids.map((id, i) => [id, sources[i].id]));
    const result = {tags: cached.result.tags.map(t => ({...t, sourceId: remap.get(t.sourceId)})),
      relations: cached.result.relations.map(r => ({...r, from: remap.get(r.from), to: remap.get(r.to)}))};
    validate(result, sources, options.mode);
    return {...cached, result, cacheHit: true, metrics: {modelCalls: 0, elapsedMs: 0, usage: null}};
  }
  const response = invoke(sources, options);
  const record = {...response, ids: sources.map(s => s.id), cacheHit: false};
  fs.mkdirSync(options.cacheDir, {recursive: true});
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(record, null, 2));
  fs.renameSync(temporary, file);
  return record;
}

function cli(argv = process.argv.slice(2)) {
  const mode = argv[0];
  if (!['plan', 'run', 'repeat', 'edit', 'multi-edit'].includes(mode)) throw new Error('Usage: node tools/repo-graph/pilot.cjs plan|run|repeat|edit|multi-edit [source-id ...]');
  const root = path.resolve(__dirname, '../..');
  const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/pilot-corpus.json'), 'utf8'));
  const passages = corpus.passages;
  const ids = argv.slice(1);
  if (ids.length > 4 || ids.some(id => !passages.some(p => p.id === id))) throw new Error('Select at most four valid pilot source IDs');
  const selected = ids.length ? ids.map(id => passages.find(p => p.id === id)) : passages.slice(0, 4);
  if (selected.length < 2) throw new Error('Pilot needs two to four sources');
  // Check frozen passages against live source before spending usage. Edited runs alter supplied copies only.
  for (const p of selected) {
    const live = fs.readFileSync(path.join(root, p.path), 'utf8').split(/\r?\n/).slice(p.startLine - 1, p.endLine).join('\n');
    if (live !== p.text) throw new Error(`Pilot fixture drifted: ${p.path}:${p.startLine}`);
  }
  const base = {model: 'gpt-6-luna', cacheDir: path.join(root, '.repo-graph/pilot/cache')};
  const sources = selected.map((p, i) => ({...p, text: p.text +
    (mode === 'edit' && i === 0 || mode === 'multi-edit' && i < 2 ? '\n// Pilot copy-only edit: preserve the same documented responsibility.' : '')}));
  const jobs = sources.map(s => ({mode: 'tags', sources: [s]}));
  jobs.push({mode: 'pairs', sources});
  const plan = jobs.map(job => ({mode: job.mode, ids: job.sources.map(s => s.id),
    suppliedBytes: Buffer.byteLength(require('./codex.cjs').promptFor(job.sources, job.mode)),
    cacheHit: fs.existsSync(path.join(base.cacheDir, `${cacheKey(job.sources, job.mode, base.model)}.json`))}));
  if (mode === 'plan') { console.log(JSON.stringify({model: base.model, maxCalls: jobs.length,
    maxInputBytesPerCall: 18000, timeoutMsPerCall: 60000, concurrency: 1, retries: 0, plan}, null, 2)); return; }
  const started = performance.now();
  const records = [];
  for (const [i, job] of jobs.entries()) {
    let record;
    try { record = analyze(job.sources, {...base, mode: job.mode, force: mode === 'repeat' && i === 0}); }
    catch (error) {
      fs.mkdirSync(path.join(root, '.repo-graph/pilot'), {recursive: true});
      fs.writeFileSync(path.join(root, '.repo-graph/pilot', `${mode}-partial.json`), JSON.stringify({
        experiment: mode, status: 'partial', records, pending: jobs.slice(i).map(j => ({mode: j.mode, ids: j.sources.map(s => s.id)})),
        error: error.message, metrics: error.metrics || null, rejectedOutput: error.rejectedOutput || null}, null, 2));
      throw error;
    }
    records.push({mode: job.mode, ids: job.sources.map(s => s.id), ...record});
    console.log(JSON.stringify({job: i + 1, mode: job.mode, cacheHit: record.cacheHit, metrics: record.metrics}));
  }
  const report = {experiment: mode, selectedIds: sources.map(s => s.id), elapsedMs: Math.round(performance.now() - started), records};
  const file = path.join(root, '.repo-graph/pilot', `${mode}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`Report: ${file}`);
}

if (require.main === module) { try { cli(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = {analyze, cli};
