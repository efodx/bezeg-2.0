'use strict';
const path = require('node:path');
const fs = require('node:fs');
const structural = require('./structural.cjs');
const {query} = require('./query.cjs');

function cli(argv = process.argv.slice(2), root = path.resolve(__dirname, '../..')) {
  const command = argv.shift();
  if (command === 'build') {
    if (argv.length) throw new Error('Usage: graph-build');
    const start = performance.now();
    const snapshot = structural.buildSnapshot(root);
    const file = structural.writeSnapshot(root, snapshot);
    console.log(JSON.stringify({file, elapsedMs: Math.round(performance.now() - start), bytes: fs.statSync(file).size,
      nodes: snapshot.nodes.length, edges: snapshot.edges.length, revision: snapshot.manifest.revision,
      fingerprint: snapshot.manifest.fingerprint, files: snapshot.manifest.files.length,
      exclusions: snapshot.manifest.excluded.length, diagnostics: snapshot.manifest.diagnostics.length,
      structural: {status: snapshot.structural.status, compilerFiles: snapshot.structural.compilerFiles.length,
        fileOnly: snapshot.structural.fileOnly.length}, semantic: snapshot.semantic.status}, null, 2));
    return;
  }
  if (command === 'status') {
    if (argv.length) throw new Error('Usage: graph-status');
    const snapshot = structural.readSnapshot(root);
    let freshness = 'current';
    try { structural.assertFresh(root, snapshot); } catch (error) { freshness = error.message; }
    console.log(JSON.stringify({revision: snapshot.manifest.revision, fingerprint: snapshot.manifest.fingerprint,
      freshness, compiler: snapshot.manifest.compilerVersion, extractor: snapshot.manifest.extractorVersion,
      structural: snapshot.structural || {status: 'see diagnostics'}, semantic: snapshot.semantic,
      files: snapshot.manifest.files.length, excluded: snapshot.manifest.excluded.length,
      diagnostics: snapshot.manifest.diagnostics.length}, null, 2));
    return;
  }
  if (command === 'enrich') {
    const options = {execute: false, maxCalls: 4, timeoutMs: 60000, inputBytes: 18000, elapsedMs: 240000,
      paths: [], nodeIDs: [], passageIDs: []};
    while (argv.length) {
      const flag = argv.shift();
      if (flag === '--execute') { options.execute = true; continue; }
      const value = argv.shift();
      if (!value) throw new Error(`Missing value for ${flag}`);
      if (flag === '--path') options.paths.push(value);
      else if (flag === '--node') options.nodeIDs.push(value);
      else if (flag === '--passage') options.passageIDs.push(value);
      else if (flag === '--model') options.model = value;
      else {
        const key = {'--max-calls': 'maxCalls', '--timeout-ms': 'timeoutMs', '--input-bytes': 'inputBytes', '--elapsed-ms': 'elapsedMs'}[flag];
        if (!key) throw new Error(`Unknown enrichment option ${flag}`);
        options[key] = Number(value);
      }
    }
    if (!options.paths.length) delete options.paths;
    if (!options.nodeIDs.length) delete options.nodeIDs;
    if (!options.passageIDs.length) delete options.passageIDs;
    if (options.execute && !options.model) throw new Error('Explicit execution requires --model; the pilot selected gpt-6-luna');
    if (!Number.isInteger(options.maxCalls) || options.maxCalls < 0 || options.maxCalls > 4 ||
      !Number.isInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 60000 ||
      !Number.isInteger(options.inputBytes) || options.inputBytes < 1 || options.inputBytes > 18000 ||
      !Number.isInteger(options.elapsedMs) || options.elapsedMs < 1 || options.elapsedMs > 240000) throw new Error('Enrichment limits exceeded (4 calls, 60 seconds/call, 18,000 bytes/call, 240 seconds/run)');
    const snapshot = structural.readSnapshot(root);
    structural.assertFresh(root, snapshot);
    const result = require('./enrich.cjs').enrich(root, snapshot, options);
    if (result.plan) {
      const {jobs, ...summary} = result.plan;
      console.log(JSON.stringify({...summary, limits: options, jobs: jobs.slice(0, 12), omittedJobs: Math.max(0, jobs.length - 12)}, null, 2));
    } else console.log(JSON.stringify({modelCalls: result.modelCalls, invocationAttempts: result.invocationAttempts,
      unknownModelCalls: result.unknownModelCalls, usage: result.usage,
      semantic: {status: result.snapshot.semantic.status, coverage: result.snapshot.semantic.coverage,
        concepts: result.snapshot.semantic.nodes.length, edges: result.snapshot.semantic.edges.length,
        pending: result.pending.length, diagnostics: result.snapshot.semantic.diagnostics}}, null, 2));
    return;
  }
  if (command === 'query') {
    const task = argv.shift();
    const options = {};
    while (argv.length) {
      const flag = argv.shift();
      const value = argv.shift();
      if (!value) throw new Error(`Missing value for ${flag}`);
      const key = {'--max-chars': 'maxChars', '--max-bytes': 'maxBytes', '--max-results': 'maxResults', '--mode': 'mode'}[flag];
      if (!key) throw new Error(`Unknown query option ${flag}`);
      options[key] = key === 'mode' ? value : Number(value);
    }
    const snapshot = structural.readSnapshot(root);
    structural.assertFresh(root, snapshot);
    process.stdout.write(query(snapshot, task, options).text);
    return;
  }
  throw new Error('Usage: graph build|status|enrich [--path source --model gpt-6-luna --execute]|query "task" [--max-chars 8000 --max-bytes 32000 --max-results 12 --mode lexical|structural|semantic]');
}
if (require.main === module) { try { cli(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = {cli};
