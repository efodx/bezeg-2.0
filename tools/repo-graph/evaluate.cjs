'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {readSnapshot, assertFresh, hash} = require('./structural.cjs');
const {query} = require('./query.cjs');

function anchorLine(root, reference) {
  const text = fs.readFileSync(path.join(root, reference.path), 'utf8');
  const offset = text.indexOf(reference.anchor);
  if (offset < 0 || text.indexOf(reference.anchor, offset + 1) >= 0) throw new Error(`Missing or ambiguous anchor ${reference.path}: ${reference.anchor}`);
  return text.slice(0, offset).split('\n').length;
}
function containsAnchor(selected, reference) {
  return selected.some(s => s.path === reference.path && s.startLine <= reference.line &&
    s.endLine >= reference.line && s.text.includes(reference.anchor));
}
function evaluate(root = path.resolve(__dirname, '../..')) {
  const snapshot = readSnapshot(root);
  assertFresh(root, snapshot);
  const cases = require('./fixtures/cases.json').cases;
  const dir = path.join(root, '.repo-graph/evaluation');
  fs.mkdirSync(dir, {recursive: true});
  const results = [];
  const modes = snapshot.semantic?.edges?.length ? ['lexical', 'structural', 'semantic'] : ['lexical', 'structural'];
  for (const item of cases) {
    for (const mode of modes) {
      const start = performance.now();
      const packet = query(snapshot, item.task, {mode, maxChars: 8000, maxBytes: 32000, maxResults: 12});
      const expected = item.mandatoryPassages.map(p => ({...p, line: anchorLine(root, p)}));
      const hit = p => containsAnchor(packet.selected, p);
      const mandatory = expected.map(p => ({path: p.path, anchor: p.anchor, line: p.line, retrieved: hit(p)}));
      results.push({id: item.id, split: item.split, mode, elapsedMs: Math.round(performance.now() - start),
        mandatory, allMandatory: mandatory.every(p => p.retrieved), returned: packet.selected.length,
        characters: packet.characters, bytes: packet.bytes, selected: packet.selected,
        relevantByMandatoryAnchor: packet.selected.filter(s => expected.some(p => containsAnchor([s], p))).length,
        precisionNote: 'Mandatory-anchor coverage is conservative automated evidence, not manual relevance judgment.'});
      fs.writeFileSync(path.join(dir, `${item.id}-${mode}.txt`), packet.text);
    }
  }
  const report = {revision: snapshot.manifest.revision, fingerprint: snapshot.manifest.fingerprint,
    queryHash: hash(fs.readFileSync(path.join(__dirname, 'query.cjs'))),
    semanticStatus: snapshot.semantic.status, results};
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({queryHash: report.queryHash, semanticStatus: report.semanticStatus,
    summary: modes.map(mode => {
      const rows = results.filter(r => r.mode === mode && r.split === 'held-out');
      return {mode, heldOutAllMandatory: rows.filter(r => r.allMandatory).length, heldOutCount: rows.length,
        mandatoryHits: rows.flatMap(r => r.mandatory).filter(p => p.retrieved).length,
        mandatoryCount: rows.flatMap(r => r.mandatory).length,
        maxCharacters: Math.max(...rows.map(r => r.characters))};
    })}, null, 2));
}
if (require.main === module) { try { evaluate(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = {anchorLine, containsAnchor, evaluate};
