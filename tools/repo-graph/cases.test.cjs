'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
test('frozen evaluation cases retain the split and unambiguous source anchors', () => {
  const {cases} = require('./fixtures/cases.json');
  assert.equal(cases.length, 12);
  assert.equal(cases.filter(c => c.split === 'development').length, 8);
  assert.equal(cases.filter(c => c.split === 'held-out').length, 4);
  assert.equal(new Set(cases.map(c => c.id)).size, 12);
  for (const item of cases) {
    assert.ok(item.mandatoryPassages.length);
    assert.ok(item.distractors.length);
    for (const p of [...item.mandatoryPassages, ...item.distractors,
      ...item.usefulConnections.flatMap(c => [c.from, c.to])]) {
      const text = fs.readFileSync(path.join(root, p.path), 'utf8');
      assert.equal(text.split(p.anchor).length - 1, 1, `${item.id}: ${p.path}: ${p.anchor}`);
    }
  }
});
test('frozen source excerpts are content-addressed independently of paths/ranges', () => {
  const {passages} = require('./fixtures/pilot-corpus.json');
  assert.equal(passages.length, 10);
  assert.equal(new Set(passages.map(p => p.id)).size, passages.length);
  for (const p of passages) {
    assert.equal(crypto.createHash('sha256').update(p.text).digest('hex'), p.sha256);
    assert.ok(Number.isInteger(p.startLine) && p.endLine >= p.startLine);
  }
});
