'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {analyze} = require('./pilot.cjs');
const {hash} = require('./structural.cjs');

// Exactly five calls at most, sequential, no retry. Saved successful work resumes from cache.
function cli() {
  const root = path.resolve(__dirname, '../..');
  const passages = require('./fixtures/pilot-corpus.json').passages;
  const originals = ['scene-store-sync', 'iteration-adr'].map(id => passages.find(p => p.id === id));
  for (const p of originals) {
    const text = fs.readFileSync(path.join(root, p.path), 'utf8').split(/\r?\n/).slice(p.startLine - 1, p.endLine).join('\n');
    if (text !== p.text || hash(text) !== p.sha256) throw new Error('Frozen pilot source drift');
  }
  const edited = {...originals[0], text: originals[0].text + '\n// Copy-only pilot edit: notification occurs after the synchronous write.'};
  const tasks = [
    {label: 'code-tags', mode: 'tags', sources: [originals[0]]},
    {label: 'doc-tags', mode: 'tags', sources: [originals[1]]},
    {label: 'candidate-review', mode: 'pairs', sources: originals},
    {label: 'repeat-code', mode: 'tags', sources: [originals[0]], repeat: true},
    {label: 'changed-code', mode: 'tags', sources: [edited]},
  ];
  const cacheDir = path.join(root, '.repo-graph/pilot/cache');
  const reportFile = path.join(root, '.repo-graph/pilot/repair.json');
  const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {status: 'partial', records: []};
  for (const task of tasks) {
    if (report.records.some(r => r.label === task.label)) continue;
    const start = performance.now();
    try {
      const record = analyze(task.sources, {mode: task.mode, model: 'gpt-6-luna', cacheDir, force: task.repeat});
      report.records.push({label: task.label, ...record});
      console.log(JSON.stringify({label: task.label, cacheHit: record.cacheHit, metrics: record.metrics}));
    } catch (error) {
      report.records.push({label: task.label, status: 'rejected', error: error.message,
        rejectedOutput: error.rejectedOutput || null, metrics: error.metrics || {elapsedMs: Math.round(performance.now() - start)}});
      console.log(JSON.stringify({label: task.label, error: error.message, metrics: error.metrics || null}));
    }
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  }
  const warmStart = performance.now();
  report.warm = originals.map(source => {
    const result = analyze([source], {mode: 'tags', model: 'gpt-6-luna', cacheDir});
    if (!result.cacheHit) throw new Error('No-change run made a model call');
    return {id: source.id, modelCalls: 0, cacheHit: true};
  });
  report.warmElapsedMs = Math.round(performance.now() - warmStart);
  report.status = report.records.every(r => r.status !== 'rejected') ? 'complete' : 'partial';
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
}
if (require.main === module) { try { cli(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = {cli};
