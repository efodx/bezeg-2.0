'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {query} = require('./query.cjs');
const snapshot = {manifest: {revision: 'abc', fingerprint: '123', extractorVersion: 'test', diagnostics: [], excluded: []},
  semantic: {status: 'partial'}, nodes: [
    {id: 'a', name: 'commitScene', kind: 'declaration', path: 'scene.ts', startLine: 3, endLine: 3, text: 'Scene state is written synchronously.'},
    {id: 'b', name: 'listener', kind: 'declaration', path: 'board.ts', startLine: 9, endLine: 9, text: 'The listener belongs to the board.'},
  ], edges: [{from: 'a', to: 'b', type: 'reference', provenance: 'typescript'}]};
test('structural traversal adds a referenced passage with evidence and current ranges', () => {
  const plain = query(snapshot, 'scene', {mode: 'lexical'});
  assert.equal(plain.selected.length, 1);
  const structural = query(snapshot, 'scene', {mode: 'structural'});
  assert.equal(structural.selected.length, 2);
  assert.match(structural.text, /board.ts:9-9/);
  assert.match(structural.text, /structural reference/);
  assert.match(structural.text, /Revision: abc/);
  assert.throws(() => query(snapshot, 'scene', {mode: 'semantic'}), /unavailable/);
});
test('strict character, UTF-8 byte and passage limits apply to entire packet', () => {
  const s = structuredClone(snapshot);
  s.nodes = Array.from({length: 30}, (_, i) => ({...s.nodes[0], id: `${i}`, path: `${i}.ts`, text: 'scene č'.repeat(40)}));
  const packet = query(s, 'scene', {maxChars: 1200, maxBytes: 1300, maxResults: 2});
  assert.ok(packet.characters <= 1200);
  assert.ok(packet.bytes <= 1300);
  assert.ok(packet.selected.length <= 2);
  assert.ok(packet.omitted.length > 0);
  assert.ok(packet.selected.length > 0);
});

test('semantic mode uses validated concept memberships from the separate semantic section', () => {
  const s = structuredClone(snapshot);
  s.semantic = {status: 'partial', nodes: [{id: 'concept:board-disposal', name: 'board-disposal', aliases: []}],
    edges: [{from: 'b', to: 'concept:board-disposal', type: 'membership', inferred: true,
      rationale: 'The board owns the listener.', evidence: [{sourceId: 'b', startLine: 9, endLine: 9}],
      provenance: {model: 'offline', promptVersion: 'test'}}]};
  assert.equal(query(s, 'disposal', {mode: 'lexical'}).selected.length, 0);
  const packet = query(s, 'disposal', {mode: 'semantic'});
  assert.equal(packet.selected.length, 2);
  assert.equal(packet.selected[0].path, 'board.ts');
  assert.match(packet.text, /inferred membership board-disposal; offline\/test/);
});

test('a declaration follows its backing file link and exact symbol survives broad prose', () => {
  const s = structuredClone(snapshot);
  s.nodes.push({id: 'file-a', kind: 'file', path: 'scene.ts', name: 'scene.ts', startLine: 1, endLine: 4, text: 'Scene file with a linked contract.'});
  s.edges = [{from: 'file-a', to: 'b', type: 'link'}];
  const packet = query(s, 'commitScene', {maxResults: 2});
  assert.equal(packet.selected[0].id, 'a');
  assert.ok(packet.selected.some(p => p.id === 'b'));
  assert.match(packet.text, /via file/);
});

test('reviewed semantic endpoints precede disconnected concept matches under a result budget', () => {
  const s = structuredClone(snapshot);
  s.nodes.push({...s.nodes[0], id: 'c', name: 'unconnected', path: 'aaa.md'});
  const member = from => ({from, to: 'concept:scene-duty', type: 'membership', inferred: true,
    rationale: 'A scene responsibility.', evidence: [{sourceId: from, startLine: 1, endLine: 10}], provenance: {model: 'offline', promptVersion: 'test'}});
  s.semantic = {status: 'partial', nodes: [{id: 'concept:scene-duty', name: 'scene-duty', aliases: []}],
    edges: [member('a'), member('c'), {from: 'a', to: 'b', type: 'supports', inferred: true,
      rationale: 'A reviewed contract.', provenance: {model: 'offline', promptVersion: 'test'}}]};
  s.edges = [];
  const packet = query(s, 'scene duty', {mode: 'semantic', maxResults: 2});
  assert.deepEqual(new Set(packet.selected.map(p => p.id)), new Set(['a', 'b']));
});

test('evaluation requires actual anchor text, not only an overlapping line range', () => {
  const {containsAnchor} = require('./evaluate.cjs');
  const selected = [{path: 'a.ts', startLine: 1, endLine: 1, text: 'secondDeclaration()'}];
  assert.equal(containsAnchor(selected, {path: 'a.ts', line: 1, anchor: 'firstDeclaration'}), false);
  assert.equal(containsAnchor(selected, {path: 'a.ts', line: 1, anchor: 'secondDeclaration'}), true);
});
