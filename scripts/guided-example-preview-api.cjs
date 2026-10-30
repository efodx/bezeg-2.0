const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {hashFile} = require('./capture-demonstration-previews.cjs');
const {validateSurfaceEvidence, LEGACY_WEBGL_RENDERER} = require('./guided-example-surface-evidence.cjs');

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
    if (expected.surface !== undefined) validateExpectedSurface(id, expected.surface);
}

function validateExpectedSurface(id, surface) {
    assert.ok(surface && typeof surface === 'object' && !Array.isArray(surface), `${id}: expected.surface must be an object`);
    assert.ok(Array.isArray(surface.owners) && surface.owners.length > 0, `${id}: expected.surface.owners must be nonempty authored evidence`);
    const kinds = new Set(['tensor', 'triangular', 'join', 'teapot']);
    const ids = new Set();
    for (const [index, owner] of surface.owners.entries()) {
        assert.ok(owner && typeof owner === 'object' && typeof owner.id === 'string' && owner.id.length > 0,
            `${id}: expected.surface.owners[${index}] needs an exact owner id`);
        assert.ok(!ids.has(owner.id), `${id}: duplicate expected surface owner ${owner.id}`);
        ids.add(owner.id);
        assert.ok(kinds.has(owner.kind), `${id}: unsupported expected surface owner kind for ${owner.id}`);
        assert.ok(Array.isArray(owner.geometrySamples) && owner.geometrySamples.length === 3
            && owner.geometrySamples.every(sample => Array.isArray(sample) && sample.length === 3 && sample.every(Number.isFinite)),
        `${id}: expected surface owner ${owner.id} needs three finite authored xyz samples`);
    }
    const camera = surface.camera;
    assert.ok(camera && [camera.az, camera.el, camera.distance].every(Number.isFinite) && camera.distance > 0
        && Array.isArray(camera.target) && camera.target.length === 3 && camera.target.every(Number.isFinite),
    `${id}: expected.surface.camera must include finite az, el, distance and xyz target`);
    for (const field of ['cameraTolerance', 'geometryTolerance']) {
        if (surface[field] !== undefined) assert.ok(Number.isFinite(surface[field]) && surface[field] >= 0,
            `${id}: expected.surface.${field} must be a nonnegative finite number`);
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
        if (entry.expected?.surface) validateSurfaceCaptureRecord(entry, capture);
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
        if (entry.expected?.surface) validateSurfaceCaptureRecord(entry, capture);
        const file = path.join(destination, capture.file || '');
        assert.ok(capture.file && fs.existsSync(file), `${entry.id}: missing preview asset ${capture.file}`);
        assert.equal(hashFile(file), capture.sha256, `${entry.id}: image checksum mismatch`);
    }
    assert.equal(captures.length, inventory.length, 'Capture manifest includes mappings outside the complete inventory');
}

function validateStoredSurfaceEvidence(entry, record, label) {
    assert.ok(record && record.view === 'surface', `${entry.id}: ${label} surface evidence is missing`);
    const validated = validateSurfaceEvidence({
        framing: {width: record.frame?.width, height: record.frame?.height, camera: record.camera,
            points: record.projectedControlPoints, meshBounds: record.meshBounds},
        surfaceRenderer: record.surfaceRenderer ?? (['webgl', 'webgl2'].includes(record.webglContextType) ? LEGACY_WEBGL_RENDERER : undefined), renderedOwners: record.renderedOwners, expected: entry.expected.surface,
    });
    assert.deepEqual(record.ownerIds, validated.ownerIds, `${entry.id}: ${label} owner IDs do not match observed owner samples`);
    return validated;
}

function validateSurfaceCaptureRecord(entry, capture) {
    const scene = validateStoredSurfaceEvidence(entry, capture.scene, 'captured scene');
    validateStoredSurfaceEvidence(entry, capture.initialFrame?.preparedSurfaceEvidence, 'prepared first-frame');
    assert.equal(capture.initialFrame?.firstFrame, true, `${entry.id}: missing first-frame capture evidence`);
    assert.equal(capture.initialFrame?.backNavigationDisabled, true, `${entry.id}: missing initial navigation evidence`);
    assert.equal(capture.initialFrame?.stableAcrossMs, 250, `${entry.id}: missing first-frame stability evidence`);
    const framing = capture.framing;
    assert.ok(framing?.surfaceHostOnly === true && framing.guidedLessonOverlayHidden === true && framing.authoredCameraPreserved === true,
        `${entry.id}: surface presentation evidence is missing`);
    assert.deepEqual([scene.frame.width, scene.frame.height], [framing.width, framing.height], `${entry.id}: surface evidence frame differs from presentation`);
    assert.deepEqual(framing.geometryOwners, scene.ownerIds, `${entry.id}: surface framing owner list differs from observed evidence`);
    assert.ok(Number.isInteger(framing.width) && framing.width > 0 && Number.isInteger(framing.height) && framing.height > 0
        && Number.isInteger(framing.scale) && framing.scale > 0, `${entry.id}: invalid surface capture dimensions`);
    assert.deepEqual([capture.width, capture.height], [framing.width * framing.scale, framing.height * framing.scale],
        `${entry.id}: surface image dimensions do not match capture framing`);
    assert.deepEqual(framing.visibleLabelBounds, capture.scene.visibleLabelBounds, `${entry.id}: visible label bounds differ from scene evidence`);
    validateSurfacePresentation(entry.id, scene.frame, scene.projectedControlPoints, capture.scene.visibleLabelBounds, scene.meshBounds);
    const provenance = capture.captureEvidence;
    assert.ok(provenance && typeof provenance.browserVersion === 'string' && provenance.browserVersion.length > 0
        && provenance.servedBuildVerified === true && typeof provenance.buildRevision === 'string' && provenance.buildRevision.length > 0
        && typeof provenance.sourceRevision === 'string' && provenance.sourceRevision.length > 0
        && Array.isArray(provenance.pageErrors) && provenance.pageErrors.length === 0,
    `${entry.id}: surface capture provenance is missing or invalid`);
}

function validateSurfacePresentation(id, frame, points, visibleLabelBounds, meshBounds) {
    assert.ok(meshBounds && typeof meshBounds.inFrustum === 'boolean'
        && [meshBounds.left, meshBounds.top, meshBounds.right, meshBounds.bottom].every(Number.isFinite)
        && meshBounds.right > meshBounds.left && meshBounds.bottom > meshBounds.top,
    `${id}: projected full-mesh crop bounds are missing or malformed`);
    assert.ok(meshBounds.inFrustum && meshBounds.left >= 0 && meshBounds.top >= 0
        && meshBounds.right <= frame.width && meshBounds.bottom <= frame.height,
    `${id}: projected full-mesh bounds are cropped or behind the camera`);
    assert.ok(Array.isArray(points), `${id}: projected surface points are missing`);
    for (const [index, point] of points.entries()) {
        assert.ok(point && typeof point.id === 'string' && point.id && point.inFrustum === true
            && [point.x, point.y].every(Number.isFinite) && point.x >= 0 && point.y >= 0 && point.x <= frame.width && point.y <= frame.height,
        `${id}: projected surface point ${index} is outside the capture frame or frustum`);
    }
    assert.ok(Array.isArray(visibleLabelBounds), `${id}: visible surface label bounds are missing`);
    const ids = new Set();
    for (const [index, label] of visibleLabelBounds.entries()) {
        assert.ok(label && typeof label.id === 'string' && label.id && !ids.has(label.id), `${id}: visible surface label ${index} has a missing or duplicate identity`);
        ids.add(label.id);
        assert.ok([label.left, label.top, label.right, label.bottom].every(Number.isFinite)
            && label.left >= 0 && label.top >= 0 && label.right <= frame.width && label.bottom <= frame.height
            && label.right > label.left && label.bottom > label.top,
        `${id}: visible surface label ${label.id} is outside the capture frame`);
    }
}

module.exports = {validateInventory, verifyEvidence, validateRetained, validatePublishedSet, validateExpectedSurface,
    validateSurfaceCaptureRecord, validateSurfacePresentation};
