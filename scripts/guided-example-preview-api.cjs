const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {hashFile} = require('./capture-demonstration-previews.cjs');

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const graphGeometryTypes = new Set(['curve', 'functiongraph', 'circle', 'point', 'line', 'segment', 'arrow',
    'polygon', 'arc', 'sector', 'ellipse', 'conic', 'spline', 'turtle']);

function validateInventory(inventory) {
    assert.ok(Array.isArray(inventory) && inventory.length > 0, 'Guided-example inventory must be a nonempty array');
    const ids = new Set();
    for (const entry of inventory) {
        assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), 'Inventory entries must be objects');
        assert.ok(typeof entry.id === 'string' && idPattern.test(entry.id), 'Each example needs a stable id');
        assert.ok(!ids.has(entry.id), `Duplicate guided-example id: ${entry.id}`);
        ids.add(entry.id);
        assert.ok(typeof entry.demonstrationId === 'string' && idPattern.test(entry.demonstrationId), `${entry.id}: missing demonstrationId`);
        assert.ok(typeof entry.path === 'string', `${entry.id}: missing canonical path`);
        const target = new URL(entry.path, 'https://bezeg.invalid');
        assert.equal(target.origin, 'https://bezeg.invalid', `${entry.id}: path must be relative to the canonical site`);
        assert.ok(target.pathname.startsWith('/bezeg-2.0/'), `${entry.id}: path must include the /bezeg-2.0 deployment prefix`);
        const exampleQueries = target.searchParams.getAll('example');
        assert.equal(exampleQueries.length, 1, `${entry.id}: path must contain exactly one ?example query`);
        assert.ok(exampleQueries[0], `${entry.id}: path must identify its prepared ?example scene`);
        assert.equal(target.searchParams.size, 1, `${entry.id}: capture path must not mix example identity with other scene queries`);
        assert.equal(exampleQueries[0].split('.').at(-1), entry.demonstrationId,
            `${entry.id}: example identity must end with demonstrationId ${entry.demonstrationId}`);
        assert.ok(!target.hash, `${entry.id}: capture path must not include a fragment`);
        assert.ok(typeof entry.sceneFingerprint === 'string' && /^[a-f0-9]{64}$/i.test(entry.sceneFingerprint),
            `${entry.id}: sceneFingerprint must be a SHA-256 hash of its prepared scene and actions`);
        if (entry.actions !== undefined) assert.ok(Array.isArray(entry.actions), `${entry.id}: actions must be an array`);
        if (entry.expected !== undefined) validateExpected(entry.id, entry.expected);
    }
    return inventory;
}

function validateExpected(id, expected) {
    assert.ok(expected && typeof expected === 'object' && !Array.isArray(expected), `${id}: expected must be an object`);
    if (expected.types !== undefined) {
        assert.ok(expected.types && typeof expected.types === 'object' && !Array.isArray(expected.types), `${id}: expected.types must be an object`);
        for (const [type, count] of Object.entries(expected.types)) {
            assert.ok(type.length > 0 && Number.isInteger(count) && count >= 0, `${id}: invalid expected element count for ${type}`);
        }
    }
    for (const field of ['points', 'curves']) if (expected[field] !== undefined) assert.ok(Array.isArray(expected[field]), `${id}: expected.${field} must be an array`);
    if (expected.curveCount !== undefined) assert.ok(Number.isInteger(expected.curveCount) && expected.curveCount >= 0, `${id}: invalid expected curveCount`);
    for (const [index, point] of (expected.points || []).entries()) assert.ok(Array.isArray(point) && point.length === 2 && point.every(Number.isFinite), `${id}: invalid expected.points[${index}]`);
    for (const [index, curve] of (expected.curves || []).entries()) {
        assert.ok(Array.isArray(curve) && curve.length === 3 && curve.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)),
            `${id}: expected.curves[${index}] must contain three finite [x,y] samples`);
    }
}

function verifyEvidence(entry, evidence) {
    assert.ok(evidence && Number.isInteger(evidence.visibleCount) && evidence.visibleCount > 0, `${entry.id}: empty board`);
    assert.ok(evidence.types && Object.entries(evidence.types).some(([type, count]) => graphGeometryTypes.has(type) && count > 0),
        `${entry.id}: no substantive visible graph geometry (axes, ticks, grids, and text do not count)`);
    const expected = entry.expected || {};
    for (const [type, count] of Object.entries(expected.types || {})) {
        assert.equal(evidence.types[type] || 0, count, `${entry.id}: expected ${count} visible ${type} objects`);
    }
    const curveCount = (evidence.types.curve || 0) + (evidence.types.functiongraph || 0);
    if (expected.curveCount !== undefined) assert.equal(curveCount, expected.curveCount, `${entry.id}: visible curve/functiongraph count`);
    const samples = evidence.curves || [];
    if (curveCount > 0) {
        assert.equal(samples.length, curveCount, `${entry.id}: every visible curve/functiongraph needs numerical samples`);
        assert.ok(samples.every(curve => Array.isArray(curve) && curve.length === 3 && curve.every(point =>
            Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))),
        `${entry.id}: curve evidence must contain three finite [x,y] samples per curve`);
    }
    for (const point of expected.points || []) {
        assert.ok((evidence.points || []).some(candidate => candidate.every((value, axis) => Math.abs(value - point[axis]) < 1e-7)),
            `${entry.id}: missing prepared point ${JSON.stringify(point)}`);
    }
    if ((expected.curves || []).length) {
        assert.ok(samples.length > 0, `${entry.id}: expected numerical curve checks but the board supplied no curve samples`);
        for (const curve of expected.curves) assert.ok(samples.some(candidate => curve.every((point, index) =>
            point.every((value, axis) => Math.abs(value - candidate[index][axis]) < 1e-6))),
        `${entry.id}: missing prepared curve samples ${JSON.stringify(curve)}`);
    }
    return {visibleElementCount: evidence.visibleCount, visibleElementTypes: evidence.types,
        visiblePointCount: (evidence.points || []).length, sampledVisibleCurves: evidence.curves || [],
        checks: [...Object.keys(expected.types || {}).map(type => `type:${type}`), ...(expected.curveCount === undefined ? [] : ['curve-count']),
            ...(expected.points || []).map(point => `point:${point.join(',')}`), ...(expected.curves || []).map(() => 'curve-samples') ]};
}

function validateRetained(inventory, previousManifest, destination, selectedIds, fingerprints) {
    const known = new Map(inventory.map(entry => [entry.id, entry]));
    const selected = new Set(selectedIds);
    for (const id of selected) assert.ok(known.has(id), `Unknown guided-example id: ${id}`);
    if (selected.size === inventory.length && inventory.every(entry => selected.has(entry.id))) return [];
    const previous = previousManifest?.captures || [];
    assert.ok(Array.isArray(previous), 'Existing preview manifest has an invalid captures list');
    const priorIds = new Set();
    for (const capture of previous) {
        assert.ok(capture && typeof capture.id === 'string' && !priorIds.has(capture.id), 'Existing manifest has duplicate or invalid capture IDs');
        priorIds.add(capture.id);
        const entry = known.get(capture.id);
        assert.ok(entry, `Stale mapping in prior manifest: ${capture.id} is absent from the current inventory`);
        assert.equal(capture.file, `${entry.id}.png`, `${entry.id}: stale or unsafe preview filename`);
        assert.equal(capture.demonstrationId, entry.demonstrationId, `${entry.id}: stale demonstration mapping in prior manifest`);
        assert.equal(capture.path, entry.path, `${entry.id}: stale scene URL in prior manifest`);
        assert.equal(capture.sceneFingerprint, entry.sceneFingerprint, `${entry.id}: prepared scene/actions changed; recapture this image`);
        const file = path.join(destination, capture.file || '');
        assert.ok(capture.file && fs.existsSync(file), `${entry.id}: missing preview asset ${capture.file}`);
        assert.equal(hashFile(file), capture.sha256, `${entry.id}: retained preview checksum differs from its manifest`);
    }
    if (selected.size < inventory.length) {
        assert.equal(previous.length, inventory.length, 'Partial regeneration requires a complete previous inventory; run without --id');
        for (const key of ['inventory', 'presentation', 'buildOutput', 'buildInputs']) {
            assert.equal(previousManifest.fingerprints?.[key], fingerprints[key], `Partial regeneration refused: ${key} fingerprint changed; run without --id`);
        }
    }
    return previous.filter(capture => !selected.has(capture.id));
}

function validatePublishedSet(inventory, captures, destination) {
    const byId = new Map(captures.map(capture => [capture.id, capture]));
    assert.equal(byId.size, captures.length, 'Capture manifest contains duplicate IDs');
    for (const entry of inventory) {
        const capture = byId.get(entry.id);
        assert.ok(capture, `${entry.id}: missing preview mapping`);
        assert.equal(capture.demonstrationId, entry.demonstrationId, `${entry.id}: stale demonstration mapping`);
        assert.equal(capture.file, `${entry.id}.png`, `${entry.id}: stale or unsafe preview filename`);
        assert.equal(capture.path, entry.path, `${entry.id}: stale scene URL mapping`);
        assert.equal(capture.sceneFingerprint, entry.sceneFingerprint, `${entry.id}: stale scene fingerprint mapping`);
        const file = path.join(destination, capture.file || '');
        assert.ok(capture.file && fs.existsSync(file), `${entry.id}: missing preview asset ${capture.file}`);
        assert.equal(hashFile(file), capture.sha256, `${entry.id}: image checksum mismatch`);
    }
    assert.equal(captures.length, inventory.length, 'Capture manifest includes mappings outside the complete inventory');
}

module.exports = {validateInventory, verifyEvidence, validateRetained, validatePublishedSet};
