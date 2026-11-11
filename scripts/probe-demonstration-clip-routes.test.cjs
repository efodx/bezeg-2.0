const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {deriveIds} = require('./probe-demonstration-clip-routes.cjs');

const root = path.join(__dirname, '..');
const real = file => fs.readFileSync(path.join(root, file), 'utf8');

test('the clip probe parses the real Demonstration rows and clips', () => {
    const {all, clipCount, targets} = deriveIds();
    assert.ok(all.length > 0 && clipCount > 0);
    assert.equal(targets.length, all.length - clipCount);
});

test('the clip probe fails when the row shape drifts', () => {
    const drifted = file => real(file).replace(/\{id: '/g, '{ id: "');
    assert.throws(() => deriveIds(drifted), /row parser/);
});

test('the clip probe fails when the clip map shape drifts', () => {
    const drifted = file => file === 'src/demonstrationMotionAssets.ts' ? real(file).replace(/\{src: /g, '{ src : ') : real(file);
    assert.throws(() => deriveIds(drifted), /row parser/);
});
