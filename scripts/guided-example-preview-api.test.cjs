const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {validateInventory, verifyEvidence, validateRetained, validatePublishedSet} = require('./guided-example-preview-api.cjs');

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const example = (overrides = {}) => ({id: 'splines.worked-join.spline-c1', demonstrationId: 'spline-c1',
    path: '/bezeg-2.0/splines?example=family.splines.worked-join.spline-c1', sceneFingerprint: digest('prepared scene/actions'),
    expected: {types: {functiongraph: 1}, curveCount: 1, points: [[1, 1]]}, ...overrides});
const capture = (entry, bytes = 'png') => ({id: entry.id, demonstrationId: entry.demonstrationId, path: entry.path,
    sceneFingerprint: entry.sceneFingerprint, file: `${entry.id}.png`, sha256: digest(bytes)});

test('inventory rejects an empty set, noncanonical routes, duplicates, and missing scene fingerprints', () => {
    assert.throws(() => validateInventory([]), /nonempty array/);
    assert.throws(() => validateInventory([example({path: '/splines?example=x'})]), /deployment prefix/);
    assert.throws(() => validateInventory([example({path: '/bezeg-2.0/splines'})]), /exactly one \?example query/);
    assert.throws(() => validateInventory([example({sceneFingerprint: undefined})]), /sceneFingerprint/);
    assert.throws(() => validateInventory([example({path: '/bezeg-2.0/splines?example=family.splines.worked-join.spline-c1&activity=x'})]), /must not mix example identity/);
    assert.throws(() => validateInventory([example({path: '/bezeg-2.0/splines?example=family.splines.worked-join.other-demo'})]), /must end with demonstrationId/);
    assert.throws(() => validateInventory([example(), example()]), /Duplicate guided-example id/);
});

test('scene evidence rejects an empty board and checks visible function graphs and prepared geometry', () => {
    const entry = validateInventory([example()])[0];
    assert.throws(() => verifyEvidence(entry, {visibleCount: 0, types: {}, points: [], curves: []}), /empty board/);
    assert.throws(() => verifyEvidence(entry, {visibleCount: 2, types: {point: 2}, points: [[0, 0]], curves: []}), /functiongraph objects/);
    assert.throws(() => verifyEvidence(example({expected: undefined}), {visibleCount: 4, types: {axis: 2, ticks: 2, text: 3}, points: [], curves: []}), /no substantive visible graph geometry/);
    const curveEntry = example({expected: {types: {curve: 1}, curves: [[[0, 0], [1, 1], [2, 4]]]}});
    assert.throws(() => verifyEvidence(curveEntry, {visibleCount: 1, types: {curve: 1}, points: [], curves: []}), /every visible curve\/functiongraph needs numerical samples/);
    assert.throws(() => verifyEvidence(curveEntry, {visibleCount: 1, types: {curve: 1}, points: [], curves: [[[0, 0], [Number.NaN, 1], [2, 4]]]}), /three finite \[x,y\] samples/);
    const evidence = verifyEvidence(entry, {visibleCount: 2, types: {functiongraph: 1, point: 1}, points: [[1, 1]], curves: [[[0, 0], [1, 1], [2, 4]]]});
    assert.deepEqual(evidence.visibleElementTypes, {functiongraph: 1, point: 1});
});

test('retained assets fail on a missing file, stale scene mapping, or changed partial-regeneration fingerprint', t => {
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'guided-example-preview-'));
    t.after(() => fs.rmSync(destination, {recursive: true, force: true}));
    const entry = example();
    const fingerprints = {inventory: digest('inventory'), presentation: digest('presentation'), buildOutput: digest('build')};
    const missing = {captures: [capture(entry)]};
    assert.throws(() => validateRetained([entry], missing, destination, [], fingerprints), /missing preview asset/);
    fs.writeFileSync(path.join(destination, capture(entry).file), 'png');
    assert.throws(() => validateRetained([example({sceneFingerprint: digest('changed')})], missing, destination, [], fingerprints), /prepared scene\/actions changed/);
    const prior = {captures: [capture(entry)], fingerprints: {...fingerprints, presentation: digest('old presentation')}};
    assert.throws(() => validateRetained([entry], prior, destination, [], fingerprints), /presentation fingerprint changed/);
});

test('full regeneration replaces stale prior mappings instead of retaining them', () => {
    const current = example();
    const removed = example({id: 'removed-example', sceneFingerprint: digest('removed')});
    assert.deepEqual(validateRetained([current], {captures: [capture(removed)]}, '.', [current.id], {}), []);
});

test('complete manifest validation detects stale mappings, missing files, and checksum edits', t => {
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'guided-example-preview-publish-'));
    t.after(() => fs.rmSync(destination, {recursive: true, force: true}));
    const entry = example();
    const good = capture(entry);
    assert.throws(() => validatePublishedSet([entry], [good], destination), /missing preview asset/);
    fs.writeFileSync(path.join(destination, good.file), 'png');
    validatePublishedSet([entry], [good], destination);
    assert.throws(() => validatePublishedSet([example({path: '/bezeg-2.0/splines?example=changed'})], [good], destination), /stale scene URL/);
    assert.throws(() => validatePublishedSet([entry], [{...good, demonstrationId: 'wrong-demo'}], destination), /stale demonstration mapping/);
    assert.throws(() => validatePublishedSet([entry], [good, {...good, id: 'unknown-example'}], destination), /outside the complete inventory/);
    fs.writeFileSync(path.join(destination, good.file), 'mutated');
    assert.throws(() => validatePublishedSet([entry], [good], destination), /checksum mismatch/);
});
