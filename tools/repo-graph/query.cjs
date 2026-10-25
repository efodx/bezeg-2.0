'use strict';

// Deterministic experimental retrieval; evaluation records the implementation hash.
function words(text) {
  const tokens = text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  return [...new Set(tokens.map(t => t.length >= 4 && /s$/.test(t) && !/(?:ss|us|is)$/.test(t) ? t.slice(0, -1) : t))];
}

function passages(nodes) {
  const output = [];
  for (const node of nodes) {
    if (!node.text || !node.path || !['file', 'section', 'declaration'].includes(node.kind)) continue;
    // Keep small declarations/sections whole so evidence retains its surrounding contract.
    // Large nodes use fixed line groups as explicit fallback boundaries.
    if (node.text.length <= 4000) {
      output.push({node, text: node.text, startLine: node.startLine, endLine: node.endLine});
      continue;
    }
    const lines = node.text.split('\n');
    // Line groups are explicit passage boundaries, never silently truncated output.
    for (let i = 0; i < lines.length; i += 12) {
      const text = lines.slice(i, i + 12).join('\n');
      if (!text.trim()) continue;
      output.push({node, text, startLine: node.startLine + i, endLine: Math.min(node.startLine + i + 11, node.endLine)});
    }
  }
  return output;
}

const indexes = new WeakMap();
function index(snapshot) {
  if (indexes.has(snapshot.nodes)) return indexes.get(snapshot.nodes);
  const chunks = passages(snapshot.nodes).map(p => ({...p,
    body: new Set(words(p.text)), title: new Set(words(`${p.node.name} ${p.node.path}`))}));
  const frequencies = new Map();
  for (const p of chunks) {
    for (const term of new Set([...words(String(p.node.name)), ...p.body])) {
      frequencies.set(term, (frequencies.get(term) || 0) + 1);
    }
  }
  const result = {chunks, frequencies};
  indexes.set(snapshot.nodes, result);
  return result;
}

function query(snapshot, task, {maxChars = 8000, maxBytes = 32000, maxResults = 12, mode = 'structural'} = {}) {
  if (!task?.trim() || !Number.isInteger(maxChars) || maxChars < 512 || !Number.isInteger(maxBytes) || maxBytes < 512 ||
    !Number.isInteger(maxResults) || maxResults < 1 || maxResults > 100 || !['lexical', 'structural', 'semantic'].includes(mode)) throw new Error('Invalid query or reading limits');
  if (mode === 'semantic' && (!snapshot.semantic?.edges?.length || snapshot.semantic.status === 'none')) throw new Error('Semantic retrieval is unavailable: no validated current annotations');
  const terms = words(task);
  const {chunks, frequencies} = index(snapshot);
  const explicitSymbols = new Set([...task.matchAll(/`([A-Za-z_$][\w$]*)`|\b([a-z_$][\w$]*[A-Z][\w$]*)\b/g)].map(m => m[1] || m[2]));
  if (/^[A-Za-z_$][\w$]*$/.test(task.trim())) explicitSymbols.add(task.trim());
  const ranked = chunks.map(p => {
    const {body, title} = p;
    const matches = terms.filter(t => body.has(t) || title.has(t));
    const score = (p.node.kind === 'declaration' && explicitSymbols.has(p.node.name) ? 100 : 0) + matches.reduce((sum, term) => sum + Math.log(1 + chunks.length / (1 + (frequencies.get(term) || 0))) *
      (body.has(term) ? 1 : 0.2) * (title.has(term) ? 2 : 1), 0) /
      Math.sqrt(1 + p.text.length / 900) * (['historical', 'superseded', 'proposed'].includes(p.node.authority) ? 0.6 : 1);
    return {...p, score, explanation: `lexical: ${matches.join(', ')}`};
  });
  const allEdges = mode === 'semantic' ? [...snapshot.edges, ...snapshot.semantic.edges] : snapshot.edges;
  if (mode === 'semantic') {
    const concepts = new Map(snapshot.semantic.nodes.map(n => [n.id, n]));
    const paths = new Map(snapshot.nodes.map(n => [n.id, n.path]));
    for (const edge of snapshot.semantic.edges.filter(e => e.type === 'membership')) {
      const concept = concepts.get(edge.to);
      if (!concept) continue;
      const labels = new Set(words(`${concept.name} ${(concept.aliases || []).join(' ')}`));
      const matches = terms.filter(t => labels.has(t));
      if (!matches.length) continue;
      const degree = new Set(snapshot.semantic.edges.filter(e => e.to === edge.to).map(e => paths.get(e.from))).size;
      const score = matches.reduce((sum, term) => sum + Math.log(1 + chunks.length / (1 + (frequencies.get(term) || 0))), 0) * 8 / Math.sqrt(degree || 1);
      for (const p of ranked.filter(p => p.node.id === edge.from && edge.evidence.some(e =>
        e.sourceId === p.node.id && p.startLine <= e.endLine && p.endLine >= e.startLine))) {
        const authoritativeScore = score * (['historical', 'superseded', 'proposed'].includes(p.node.authority) ? 0.6 : 1);
        if (authoritativeScore > p.score) {
          p.score = authoritativeScore;
          p.explanation = `inferred membership ${concept.name}; ${edge.provenance.model}/${edge.provenance.promptVersion}; ${edge.rationale}`;
        }
      }
    }
  }
  const hasConceptSeeds = mode === 'semantic' && ranked.some(p => p.explanation.startsWith('inferred membership'));
  const semanticCutoff = hasConceptSeeds ? ranked.reduce((max, p) => Math.max(max, p.score), 0) * 0.65 : 0;
  const seeds = [...ranked].sort((a, b) => b.score - a.score).filter(p => p.score > 0 && p.score >= semanticCutoff).slice(0, 8);
  if (mode !== 'lexical') {
    const byNode = new Map();
    for (const p of ranked) { if (!byNode.has(p.node.id)) byNode.set(p.node.id, []); byNode.get(p.node.id).push(p); }
    const degree = new Map();
    const filesByPath = new Map(snapshot.nodes.filter(n => n.kind === 'file').map(n => [n.path, n.id]));
    for (const e of allEdges) { degree.set(e.from, (degree.get(e.from) || 0) + 1); degree.set(e.to, (degree.get(e.to) || 0) + 1); }
    for (const seed of seeds) {
      for (const edge of allEdges) {
        if (['contains', 'containment'].includes(edge.type) || (mode !== 'semantic' && edge.inferred)) continue;
        const backingFile = filesByPath.get(seed.node.path);
        const reviewed = edge.inferred && edge.type !== 'membership';
        const viaFile = (['link', 'import', 're-export'].includes(edge.type) || reviewed) && backingFile && seed.node.id !== backingFile;
        const target = edge.from === seed.node.id ? edge.to : edge.to === seed.node.id ? edge.from :
          viaFile && edge.from === backingFile ? edge.to : viaFile && edge.to === backingFile ? edge.from : null;
        if (!target) continue;
        const bonus = seed.score * 0.35 / Math.sqrt(degree.get(target) || 1);
        for (const p of byNode.get(target) || []) {
          if (hasConceptSeeds && reviewed) {
            const priority = Math.max(seed.score, p.score) * 1.1;
            seed.pairPriority = Math.max(seed.pairPriority || 0, priority);
            p.pairPriority = Math.max(p.pairPriority || 0, priority);
          }
          p.connection ||= `${edge.inferred ? 'inferred' : 'structural'} ${viaFile ? 'via file + ' : ''}${edge.type} from ${seed.node.path}:${seed.startLine}`;
          if (bonus > p.score) {
            p.score = bonus;
            p.explanation = `${edge.inferred ? 'inferred' : 'structural'} ${edge.type} from ${seed.node.path}:${seed.startLine}` +
              (edge.inferred ? `; ${edge.provenance.model}/${edge.provenance.promptVersion}; ${edge.rationale}` : '');
          }
        }
      }
    }
  }
  ranked.sort((a, b) => (b.pairPriority || 0) - (a.pairPriority || 0) || b.score - a.score || a.node.path.localeCompare(b.node.path, 'en') || a.startLine - b.startLine);
  const header = `Repository reading packet (source content; verify passages before editing)\nRevision: ${snapshot.manifest.revision}\nFingerprint: ${snapshot.manifest.fingerprint}\nStructural: ${snapshot.structural?.status || snapshot.manifest.structuralStatus || 'see diagnostics'}; semantic: ${snapshot.semantic?.status || 'none'}\nMode: ${mode}; extractor: ${snapshot.manifest.extractorVersion}; diagnostics: ${snapshot.manifest.diagnostics?.length || 0}; excluded: ${snapshot.manifest.excluded?.length || 0}\n`;
  const footerReserve = 230;
  let output = header;
  const selected = [];
  const omitted = [];
  for (const p of ranked.filter(p => p.score > 0)) {
    if (selected.some(s => s.path === p.node.path && s.startLine <= p.endLine && s.endLine >= p.startLine)) continue;
    const block = `\n${p.node.path}:${p.startLine}-${p.endLine} [${p.node.kind}; ${p.node.authority || 'unknown'}; hash:${p.node.contentHash?.slice(0, 12) || 'unknown'}]\n${p.explanation}${p.connection && !p.explanation.includes(p.connection) ? `; ${p.connection}` : ''}\n${p.text}\n`;
    if ((hasConceptSeeds && p.explanation.startsWith('lexical:') && !p.connection && p.score < semanticCutoff) ||
      selected.length >= maxResults || output.length + block.length + footerReserve > maxChars || Buffer.byteLength(output + block) + footerReserve > maxBytes) {
      omitted.push({path: p.node.path, startLine: p.startLine}); continue;
    }
    output += block;
    selected.push({id: p.node.id, path: p.node.path, startLine: p.startLine, endLine: p.endLine, text: p.text, explanation: p.explanation});
  }
  output += `\nReturned: ${selected.length}; omitted relevant candidates: ${omitted.length}. Coverage: indexed formats only; unresolved/dynamic links and unenriched concepts may be missing. Estimated tokens: ${Math.ceil((output.length + 230) / 4)}.\n`;
  if (output.length > maxChars || Buffer.byteLength(output) > maxBytes) throw new Error('Reading budget too small for packet metadata');
  return {text: output, selected, omitted, characters: output.length, bytes: Buffer.byteLength(output), estimatedTokens: Math.ceil(output.length / 4)};
}

module.exports = {words, passages, query};
