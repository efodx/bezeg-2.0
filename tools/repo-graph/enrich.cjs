'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {passages} = require('./query.cjs');
const adapter = require('./codex.cjs');
const graph = require('./structural.cjs');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const DEFAULTS = {model: 'gpt-6-luna', maxCalls: 4, timeoutMs: 60000, inputBytes: 18000, elapsedMs: 240000};
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const VOCABULARY_BYTES = 6000;

function canonicalId(value) {
  const id = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return /^[a-z][a-z0-9-]{2,79}$/.test(id) ? id : null;
}

function vocabularyFor(snapshot) {
  const seeds = snapshot.nodes.filter(n => n.kind === 'concept' && n.provenance === 'glossary')
    .map(n => ({id: canonicalId(n.name), canonical: n.name, aliases: [n.name], description: n.text || ''}));
  const raw = seeds.filter(n => n.id).sort((a, b) => cmp(a.id, b.id));
  const counts = new Map(); for (const item of raw) counts.set(item.id, (counts.get(item.id) || 0) + 1);
  const collisions = [...counts].filter(([, count]) => count > 1).map(([id]) => id);
  const entries = raw.filter(item => counts.get(item.id) === 1);
  const included = []; let bytes = 0;
  for (const entry of entries) {
    const size = Buffer.byteLength(JSON.stringify(entry));
    if (bytes + size > VOCABULARY_BYTES) continue;
    included.push(entry); bytes += size;
  }
  const omitted = seeds.length - included.length;
  return {entries: included, omitted, collisions, invalid: seeds.length - raw.length,
    byteOmitted: entries.length - included.length,
    fingerprint: hash(JSON.stringify({entries: included, omitted, collisions}))};
}

function withVocabulary(snapshot, options = {}) {
  const vocabulary = vocabularyFor(snapshot);
  const context = `${options.context || ''}\nGlossary vocabulary fingerprint ${vocabulary.fingerprint}; omitted ${vocabulary.omitted} entries.`;
  const supplied = Array.isArray(options.vocabulary) ? options.vocabulary : [];
  const combined = [...vocabulary.entries, ...supplied].filter((item, index, all) => all.findIndex(other => JSON.stringify(other) === JSON.stringify(item)) === index);
  return {...options, context, vocabulary: combined, vocabularyFingerprint: vocabulary.fingerprint,
    vocabularyOmitted: vocabulary.omitted, vocabularyCollisions: vocabulary.collisions,
    vocabularyInvalid: vocabulary.invalid, vocabularyByteOmitted: vocabulary.byteOmitted};
}

function selectedPassages(snapshot, options = {}) {
  const paths = options.paths && new Set(options.paths);
  const ids = options.nodeIDs && new Set(options.nodeIDs);
  return passages(snapshot.nodes).filter(p => (!paths || paths.has(p.node.path)) && (!ids || ids.has(p.node.id)))
    .map((p, i) => ({id: `${p.node.id}@${p.startLine}-${p.endLine}`, nodeId: p.node.id, path: p.node.path,
      startLine: p.startLine, endLine: p.endLine, text: p.text, index: i}))
    .filter(p => !options.passageIDs || options.passageIDs.includes(p.id));
}

function jobsFor(snapshot, sources, memberships = []) {
  const jobs = sources.map(s => ({mode: 'tags', sources: [s]}));
  if (!memberships.length) return jobs;
  const byId = new Map(sources.map(s => [s.id, s]));
  const byNode = new Map(sources.map(s => [s.nodeId, s]));
  const pairs = [], seenPairs = new Set();
  const addPair = (a, b) => {
    if (!a || !b || a.id === b.id || a.nodeId === b.nodeId) return;
    const ordered = [a, b].sort((x, y) => cmp(x.id, y.id));
    const key = `${ordered[0].id}\0${ordered[1].id}`;
    if (seenPairs.has(key) || pairs.length >= 48) return;
    seenPairs.add(key); pairs.push({key, sources: ordered});
  };
  // Independent concept tags get first claim on the bounded shortlist.
  const inverted = new Map();
  for (const membership of memberships) {
    const source = byId.get(membership.sourceId);
    if (!source) continue;
    if (!inverted.has(membership.concept)) inverted.set(membership.concept, []);
    const list = inverted.get(membership.concept);
    if (!list.some(s => s.id === source.id) && list.length < 12) list.push(source);
  }
  for (const [concept, list] of [...inverted].sort(([a], [b]) => cmp(a, b))) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length && j < i + 4; j++) addPair(list[i], list[j]);
  }
  for (const e of snapshot.edges) {
    if (['contains', 'containment'].includes(e.type)) continue;
    const a = byNode.get(e.from), b = byNode.get(e.to);
    if (!a || !b || a.id === b.id) continue;
    addPair(a, b);
  }
  // Bounded inverted-index candidates let unrelated files meet without an all-pairs scan.
  const postings = new Map();
  for (const source of sources) for (const token of new Set(source.text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [])) {
    if (!postings.has(token)) postings.set(token, []);
    const list = postings.get(token); if (list.length < 12) list.push(source);
  }
  for (const [token, list] of [...postings].sort(([a], [b]) => cmp(a, b))) {
    if (list.length < 2 || list.length >= 12) continue;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length && j < i + 4; j++) addPair(list[i], list[j]);
  }
  if (pairs.length) jobs.push({mode: 'pairs', sources: pairs.slice(0, 3).flatMap(p => p.sources).filter((s, i, all) => all.findIndex(x => x.id === s.id) === i).slice(0, 4)});
  return jobs;
}

function cacheFile(cacheDir, job, options) {
  const base = adapter.cacheKey(job.sources, job.mode, options.model, options);
  return path.join(cacheDir, `${base}.json`);
}

function remapAndValidate(record, sources, mode, expectedModel, options = {}) {
  if (!Array.isArray(record.ids) || record.ids.length !== sources.length || record.ids.some(id => typeof id !== 'string') || new Set(record.ids).size !== record.ids.length) {
    throw new Error('Cache source identities are invalid');
  }
  // Adapter cache identity excludes IDs by design. Recreate the original prompt with its IDs,
  // while validating its evidence against the remapped current passages below.
  const originalSources = sources.map((source, i) => ({...source, id: record.ids[i]}));
  const prompt = adapter.promptFor(originalSources, mode, options);
  const expectedSchema = hash(JSON.stringify(adapter.SCHEMA));
  const p = record.provenance;
  if (!p || p.inferred !== true || p.model !== expectedModel || typeof p.model !== 'string' ||
    p.promptVersion !== adapter.PROMPT_VERSION || p.promptHash !== hash(prompt) || p.schemaHash !== expectedSchema) {
    throw new Error('Cache provenance does not match the current prompt, schema, or model');
  }
  const remap = new Map(record.ids.map((id, i) => [id, sources[i]?.id]));
  const result = {tags: record.result.tags.map(t => ({...t, sourceId: remap.get(t.sourceId)})),
    relations: record.result.relations.map(r => ({...r, from: remap.get(r.from), to: remap.get(r.to)}))};
  adapter.validate(result, sources, mode);
  return result;
}

function loadCache(file, job) {
  if (!fs.existsSync(file)) return null;
  try {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(record.ids) || record.ids.length !== job.sources.length) return null;
    if (record.sourceHashes && JSON.stringify(record.sourceHashes) !== JSON.stringify(job.sources.map(s => hash(s.text)))) return null;
    const result = remapAndValidate(record, job.sources, job.mode, job.model, job.options);
    return {...record, result, cacheHit: true};
  } catch { return null; }
}

function saveCache(file, job, response) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify({...response, mode: job.mode, ids: job.sources.map(s => s.id),
    sourceHashes: job.sources.map(s => hash(s.text))}, null, 2)}\n`);
  fs.renameSync(temp, file);
}

function cachedPairJobs(cacheDir, sources, options) {
  if (!fs.existsSync(cacheDir)) return [];
  const byHash = new Map();
  for (const source of sources) {
    const key = hash(source.text);
    if (!byHash.has(key)) byHash.set(key, []);
    byHash.get(key).push(source);
  }
  const jobs = [], seen = new Set();
  const names = fs.readdirSync(cacheDir).filter(n => n.endsWith('.json')).sort(cmp);
  const omitted = Math.max(0, names.length - 2048);
  for (const name of names.slice(0, 2048)) {
    const file = path.join(cacheDir, name);
    let record;
    try { record = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    if (record.mode !== 'pairs' || !Array.isArray(record.sourceHashes) || record.sourceHashes.length < 2 ||
      record.sourceHashes.length > 4 || !Array.isArray(record.ids) || record.ids.length !== record.sourceHashes.length) continue;
    const candidates = record.sourceHashes.map(h => byHash.get(h));
    if (candidates.some(list => !list?.length)) continue;
    const used = new Set();
    const current = candidates.map((list, i) => {
      const source = list.find(s => s.id === record.ids[i] && !used.has(s.id)) ||
        list.find(s => !used.has(s.id));
      if (source) used.add(source.id);
      return source;
    });
    if (current.some(s => !s)) continue;
    if (new Set(current.map(s => s.id)).size !== current.length) continue;
    const job = {mode: 'pairs', sources: current, model: options.model, options};
    if (cacheFile(cacheDir, job, options) !== file || seen.has(current.map(s => s.id).sort(cmp).join('\0'))) continue;
    const hit = loadCache(file, job);
    if (!hit) continue;
    seen.add(current.map(s => s.id).sort(cmp).join('\0'));
    jobs.push({job, record: hit});
  }
  jobs.omitted = omitted;
  return jobs;
}

function plan(snapshot, options = {}) {
  const settings = withVocabulary(snapshot, {...DEFAULTS, ...options});
  const sources = selectedPassages(snapshot, options);
  const jobs = jobsFor(snapshot, sources).map(job => {
    job.model = settings.model; job.options = settings;
    const bytes = Buffer.byteLength(adapter.promptFor(job.sources, job.mode, settings));
    const file = options.cacheDir ? cacheFile(options.cacheDir, job, settings) : null;
    const hit = file ? loadCache(file, job) !== null : false;
    return {mode: job.mode, ids: job.sources.map(s => s.id), suppliedBytes: bytes,
      estimatedTokens: Math.ceil(adapter.promptFor(job.sources, job.mode, settings).length / 4), cacheHit: hit};
  });
  const runnable = jobs.filter(j => !j.cacheHit).length;
  return {dryRun: true, scopedSources: sources.length, scope: {paths: options.paths || [], nodeIDs: options.nodeIDs || []},
      model: options.model || null, jobs, modelCalls: 0, potentialCalls: runnable,
     vocabularyFingerprint: settings.vocabularyFingerprint, omittedVocabulary: settings.vocabularyOmitted,
     pairCandidates: 'unknown until independently tagged concepts or matching pair caches are available',
    cliOverhead: 'separate from supplied input estimates; actual usage is unknown until reported by the adapter'};
}

function sourceEvidence(tagOrQuote, source, id) {
  const quote = typeof tagOrQuote === 'string' ? tagOrQuote : tagOrQuote.quote;
  const offset = source.text.indexOf(quote);
  if (offset < 0) throw new Error('Evidence quote is absent from current source');
  const startLine = source.startLine + source.text.slice(0, offset).split('\n').length - 1;
  const endLine = startLine + quote.split('\n').length - 1;
  return {sourceId: id || source.nodeId, startLine, endLine, quote};
}

function semanticFrom(snapshot, records, pending, usage, diagnostics, scopePartial = false, chunkCoverage = {}) {
  const concepts = new Map(), edges = [];
  const vocabulary = vocabularyFor(snapshot);
  const aliases = new Map(vocabulary.entries.flatMap(v => [[v.canonical, v], [v.id, v], ...v.aliases.map(a => [a, v])]));
  for (const {job, record} of records) {
    for (const tag of record.result.tags) {
      const source = job.sources.find(s => s.id === tag.sourceId);
      const glossary = aliases.get(tag.concept);
      const canonical = glossary?.id || tag.concept;
      const rawAlias = tag.concept;
      if (concepts.has(canonical) && concepts.get(canonical).conceptKind !== tag.kind) {
        diagnostics.push({message: `Conflicting concept kinds for ${canonical}; membership omitted`, concept: canonical});
        continue;
      }
      if (!concepts.has(canonical)) concepts.set(canonical, {id: `concept:${canonical}`, kind: 'concept', name: canonical,
        aliases: [...new Set([canonical, ...(glossary?.aliases || []), rawAlias])], conceptKind: tag.kind, provenance: record.provenance});
      else if (!concepts.get(canonical).aliases.includes(rawAlias)) concepts.get(canonical).aliases.push(rawAlias);
      edges.push({from: source.nodeId, to: `concept:${canonical}`, type: 'membership', rationale: tag.rationale,
        evidence: [sourceEvidence(tag, source)], inferred: true, provenance: record.provenance});
    }
    for (const relation of record.result.relations) {
      const left = job.sources.find(s => s.id === relation.from), right = job.sources.find(s => s.id === relation.to);
      edges.push({from: left.nodeId, to: right.nodeId, type: relation.type, rationale: relation.rationale,
        evidence: [sourceEvidence(relation.fromQuote, left), sourceEvidence(relation.toQuote, right)],
        inferred: true, provenance: record.provenance});
    }
  }
  const total = records.length + pending.length;
  const incompleteScope = total > 0 && records.some(({job}) => job.sources.some(s => s.outOfScope));
  return {status: pending.length || diagnostics.length || incompleteScope || scopePartial ? 'partial' : total ? 'complete' : 'none', nodes: [...concepts.values()], edges,
    pending, coverage: {completedJobs: records.length, pendingJobs: pending.length, totalJobs: total,
      totalChunks: chunkCoverage.totalChunks || 0, completedChunks: chunkCoverage.completedChunks || 0,
      scopeChunks: chunkCoverage.scopeChunks || 0, scopedPendingChunks: chunkCoverage.scopedPendingChunks || 0}, diagnostics, usage};
}

function recordUsage(usage, metrics, successful) {
  if (metrics?.modelCalls === 1 || metrics?.usage || (successful && metrics?.modelCalls !== 0)) usage.modelCalls++;
  else if (metrics?.modelCalls !== 0) usage.unknownModelCalls++;
  if (metrics?.usage) {
    for (const key of ['input_tokens', 'cached_input_tokens', 'output_tokens']) {
      if (Number.isFinite(metrics.usage[key])) usage[key] += metrics.usage[key];
    }
    if (!Number.isFinite(metrics.usage.input_tokens) || !Number.isFinite(metrics.usage.output_tokens)) usage.unknownUsageCalls++;
  } else if (metrics?.modelCalls !== 0) usage.unknownUsageCalls++;
  usage.complete = usage.unknownUsageCalls === 0;
}

function enrich(root, snapshot, options = {}) {
  if (!options.execute) return {plan: plan(snapshot, {...options, cacheDir: options.cacheDir || path.join(root, graph.STATE_DIR, 'cache')})};
  for (const key of ['model', 'maxCalls', 'timeoutMs', 'inputBytes']) if (options[key] == null) throw new Error(`Execute requires ${key}`);
  if (!options.paths?.length && !options.nodeIDs?.length && !options.passageIDs?.length) throw new Error('Execute requires an explicit paths, nodeIDs or passageIDs scope');
  if (!Number.isInteger(options.maxCalls) || options.maxCalls < 0 || options.maxCalls > 4 || !Number.isInteger(options.timeoutMs) || options.timeoutMs < 1 ||
    !Number.isInteger(options.inputBytes) || options.inputBytes < 1 || (options.elapsedMs != null && (!Number.isInteger(options.elapsedMs) || options.elapsedMs < 1))) throw new Error('Invalid execute budget');
  const structuralCopy = {...snapshot, semantic: {status: 'none', nodes: [], edges: [], diagnostics: []}};
  graph.validateSnapshot(structuralCopy); graph.assertFresh(root, structuralCopy);
  const settings = withVocabulary(snapshot, options);
  const cacheDir = options.cacheDir || path.join(root, graph.STATE_DIR, 'cache');
  const scoped = selectedPassages(snapshot, options);
  if (!scoped.length) throw new Error('The explicit enrichment scope matched no current source passages');
  const allSources = selectedPassages(snapshot);
  const marked = new Set(scoped.map(s => s.id));
  const jobs = jobsFor(snapshot, scoped);
  const started = performance.now(), records = [], pending = [], diagnostics = [], usage = {input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, modelCalls: 0, unknownModelCalls: 0, unknownUsageCalls: 0, complete: true};
  if (settings.vocabularyByteOmitted) diagnostics.push({message: `${settings.vocabularyByteOmitted} glossary vocabulary entries omitted by the ${VOCABULARY_BYTES}-byte context limit`, reason: 'vocabularylimit', omitted: settings.vocabularyByteOmitted});
  if (settings.vocabularyCollisions.length) diagnostics.push({message: 'Ambiguous glossary labels omitted rather than merged', reason: 'vocabularycollision', ids: settings.vocabularyCollisions});
  if (settings.vocabularyInvalid) diagnostics.push({message: 'Glossary labels without supported canonical identifiers omitted', reason: 'vocabularyidentifier', omitted: settings.vocabularyInvalid});
  if (vocabularyFor(snapshot).collisions.length) diagnostics.push({message: `Ambiguous glossary canonical IDs omitted: ${vocabularyFor(snapshot).collisions.join(', ')}`, reason: 'vocabulary-collision', ids: vocabularyFor(snapshot).collisions});
  let calls = 0, blockedReason = null;
  const workQueue = jobs;
  for (let i = 0; i < workQueue.length; i++) {
    const job = workQueue[i], file = cacheFile(cacheDir, job, settings);
    job.model = options.model; job.options = settings;
    let record = loadCache(file, job);
    if (job.outOfScope && !record) continue;
    if (!record) {
      const prompt = adapter.promptFor(job.sources, job.mode, settings);
      const inputSize = Buffer.byteLength(prompt);
      const limitReason = inputSize > options.inputBytes ? 'inputlimit' :
        calls >= options.maxCalls ? 'calllimit' :
        performance.now() - started >= (options.elapsedMs || DEFAULTS.elapsedMs) ? 'elapsed' : null;
      if (job.outOfScope) continue;
      if (limitReason || blockedReason) {
        const reason = blockedReason || limitReason;
        pending.push({mode: job.mode, ids: job.sources.map(s => s.id), reason});
        if (inputSize > options.inputBytes) diagnostics.push({message: 'Job exceeds input byte limit and remains pending', reason: 'inputlimit', ids: job.sources.map(s => s.id), suppliedBytes: inputSize, inputBytes: options.inputBytes});
        if (limitReason === 'calllimit' || limitReason === 'elapsed') blockedReason = limitReason;
        continue;
      }
      try {
        const invoke = options.invoke || adapter.invoke;
        calls++;
        const remainingMs = Math.max(1, (options.elapsedMs || DEFAULTS.elapsedMs) - (performance.now() - started));
        const response = invoke(job.sources, {mode: job.mode, model: options.model, timeoutMs: Math.min(options.timeoutMs, remainingMs),
          vocabulary: settings.vocabulary, context: settings.context});
        record = {...response, ids: job.sources.map(s => s.id), cacheHit: false};
        remapAndValidate(record, job.sources, job.mode, options.model, settings);
        saveCache(file, job, record);
      } catch (error) {
        recordUsage(usage, error.metrics || record?.metrics, false);
        diagnostics.push({message: error.message, metrics: error.metrics || record?.metrics || null,
          rejectedOutput: error.rejectedOutput?.slice(0, 8000) || null});
        pending.push({mode: job.mode, ids: job.sources.map(s => s.id), reason: 'previousfailure'});
        blockedReason = 'previousfailure';
        continue;
      }
      recordUsage(usage, record.metrics, true);
    }
    records.push({job, record});
  }
  for (const source of allSources) {
    if (marked.has(source.id)) continue;
    const cachedJob = {mode: 'tags', sources: [source], model: options.model, options: settings};
    const record = loadCache(cacheFile(cacheDir, cachedJob, settings), cachedJob);
    if (record) records.push({job: cachedJob, record});
  }
  const glossary = new Map(vocabularyFor(snapshot).entries.flatMap(v => [[v.canonical, v.id], [v.id, v.id]]));
  const memberships = records.filter(r => r.job.mode === 'tags').flatMap(({job, record}) => record.result.tags.map(t => ({
    sourceId: t.sourceId, concept: glossary.get(t.concept) || t.concept}))).filter(m => marked.has(m.sourceId));
  const pairJob = jobsFor(snapshot, scoped, memberships).find(j => j.mode === 'pairs');
  if (pairJob) {
    pairJob.model = options.model; pairJob.options = settings;
    const file = cacheFile(cacheDir, pairJob, settings);
    let record = loadCache(file, pairJob);
    if (!record) {
      const prompt = adapter.promptFor(pairJob.sources, 'pairs', settings), inputSize = Buffer.byteLength(prompt);
      const reason = blockedReason || (inputSize > options.inputBytes ? 'inputlimit' : calls >= options.maxCalls ? 'calllimit' :
        performance.now() - started >= (options.elapsedMs || DEFAULTS.elapsedMs) ? 'elapsed' : null);
      if (reason) pending.push({mode: 'pairs', ids: pairJob.sources.map(s => s.id), reason});
      else try {
        calls++;
        const invoke = options.invoke || adapter.invoke;
        const remainingMs = Math.max(1, (options.elapsedMs || DEFAULTS.elapsedMs) - (performance.now() - started));
        record = {...invoke(pairJob.sources, {mode: 'pairs', model: options.model, timeoutMs: Math.min(options.timeoutMs, remainingMs),
          vocabulary: settings.vocabulary, context: settings.context}),
          ids: pairJob.sources.map(s => s.id), cacheHit: false};
        remapAndValidate(record, pairJob.sources, 'pairs', options.model, settings); saveCache(file, pairJob, record);
        recordUsage(usage, record.metrics, true);
      } catch (error) {
        recordUsage(usage, error.metrics || record?.metrics, false);
        diagnostics.push({message: error.message, metrics: error.metrics || record?.metrics || null,
          rejectedOutput: error.rejectedOutput?.slice(0, 8000) || null});
        pending.push({mode: 'pairs', ids: pairJob.sources.map(s => s.id), reason: 'previousfailure'});
      }
    }
    if (record && !records.some(r => r.job.mode === 'pairs' && r.job.sources.map(s => s.id).join('\0') === pairJob.sources.map(s => s.id).join('\0'))) records.push({job: pairJob, record});
  }
  const cachedPairs = cachedPairJobs(cacheDir, allSources, settings);
  if (cachedPairs.omitted) diagnostics.push({message: `${cachedPairs.omitted} cached pair records omitted after the 2048-record scan cap`, reason: 'paircache-scan-cap', omitted: cachedPairs.omitted});
  for (const cached of cachedPairs) {
    if (!records.some(r => r.job.mode === 'pairs' && r.job.sources.map(s => s.id).sort(cmp).join('\0') === cached.job.sources.map(s => s.id).sort(cmp).join('\0'))) records.push(cached);
  }
  // Requests paused in another explicit scope remain visible without executing them.
  const liveSources = new Map(allSources.map(s => [s.id, s]));
  for (const prior of snapshot.semantic.pending || []) {
    if (!Array.isArray(prior.ids) || prior.ids.some(id => !liveSources.has(id)) ||
      (prior.model && prior.model !== options.model)) continue;
    const job = {mode: prior.mode, sources: prior.ids.map(id => liveSources.get(id)), model: options.model, options: settings};
    if (loadCache(cacheFile(cacheDir, job, settings), job)) continue;
    if (!pending.some(p => p.mode === prior.mode && p.ids.join('\0') === prior.ids.join('\0'))) pending.push(prior);
  }
  for (const entry of pending) entry.model = options.model;
  const partialRecords = records.map(r => ({...r, job: {...r.job,
    sources: r.job.sources.map(s => ({...s, outOfScope: !marked.has(s.id)}))}}));
  const next = {...snapshot, semantic: semanticFrom(snapshot, partialRecords, pending, usage, diagnostics,
    marked.size !== allSources.length, {totalChunks: allSources.length,
      completedChunks: new Set(partialRecords.filter(r => r.job.mode === 'tags').flatMap(r => r.job.sources.map(s => s.id))).size,
      scopeChunks: scoped.length, scopedPendingChunks: new Set(pending.filter(p => p.mode === 'tags').flatMap(p => p.ids).filter(id => marked.has(id))).size})};
  graph.writeSnapshot(root, next);
  return {snapshot: next, invocationAttempts: calls, modelCalls: usage.modelCalls,
    unknownModelCalls: usage.unknownModelCalls, completedJobs: records.length, pending: next.semantic.pending, usage};
}

module.exports = {plan, enrich, jobsFor, selectedPassages};
