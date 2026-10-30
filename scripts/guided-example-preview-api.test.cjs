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
const surfaceExample = () => example({id: 'patch-tensor-midpoint', demonstrationId: 'patch-tensor',
    path: '/bezeg-2.0/patches?example=family.patches.patch-tensor',
    expected: {surface: {camera: {az: 0.2, el: 0.7, distance: 8, target: [0, 0, 0]}, owners: [
        {id: 'tensor-patch-0', kind: 'tensor', geometrySamples: [[0, 1, 2], [1, 2, 3], [2, 3, 4]]},
    ]}}});
const surfaceCapture = entry => {
    const surface = entry.expected.surface;
    const scene = {view: 'surface', surfaceRenderer: 'jsx-svg', frame: {width: 420, height: 260}, camera: surface.camera,
        meshBounds: {left: 50, top: 40, right: 400, bottom: 250, inFrustum: true},
        ownerIds: ['tensor-patch-0'], renderedOwners: structuredClone(surface.owners),
        projectedControlPoints: [{id: 'P00', x: 100, y: 100, inFrustum: true}],
        visibleLabelBounds: [{id: 'p00-label', left: 10, top: 10, right: 30, bottom: 20}]};
    return {...capture(entry), width: 840, height: 520, scene: structuredClone(scene),
        initialFrame: {firstFrame: true, backNavigationDisabled: true, stableAcrossMs: 250, preparedSurfaceEvidence: structuredClone(scene)},
        framing: {surfaceHostOnly: true, guidedLessonOverlayHidden: true, authoredCameraPreserved: true,
            width: 420, height: 260, scale: 2, geometryOwners: [...scene.ownerIds], visibleLabelBounds: structuredClone(scene.visibleLabelBounds)},
        captureEvidence: {browserVersion: 'mock-browser', servedBuildVerified: true, buildRevision: 'build-hash',
            sourceRevision: 'revision', pageErrors: []}};
};

test('inventory rejects an empty set, noncanonical routes, duplicates, and missing scene fingerprints', () => {
    assert.throws(() => validateInventory([]), /nonempty array/);
    assert.throws(() => validateInventory([example({path: '/splines?example=x'})]), /deployment prefix/);
    assert.throws(() => validateInventory([example({path: '/bezeg-2.0/splines'})]), /exactly one \?example query/);
    assert.throws(() => validateInventory([example({sceneFingerprint: undefined})]), /sceneFingerprint/);
    assert.throws(() => validateInventory([example({path: '/bezeg-2.0/splines?example=family.splines.worked-join.spline-c1&activity=x'})]), /must not mix example identity/);
    assert.throws(() => validateInventory([example({path: '/bezeg-2.0/splines?example=family.splines.worked-join.other-demo'})]), /must end with demonstrationId/);
    assert.throws(() => validateInventory([example(), example()]), /Duplicate guided-example id/);
});

test('surface inventories require independently authored camera and exact nonempty owner samples', () => {
    const surface = {camera: {az: 0.2, el: 0.7, distance: 8, target: [0, 0, 0]}, owners: [
        {id: 'tensor-patch-0', kind: 'tensor', geometrySamples: [[0, 1, 2], [1, 2, 3], [2, 3, 4]]},
    ], cameraTolerance: 1e-6, geometryTolerance: 1e-6};
    assert.equal(validateInventory([example({expected: {surface}})])[0].expected.surface, surface);
    for (const invalid of [
        {...surface, owners: []},
        {...surface, camera: undefined},
        {...surface, owners: [{...surface.owners[0], geometrySamples: []}]},
        {...surface, owners: [{...surface.owners[0], geometrySamples: [[0, NaN, 2], [1, 2, 3], [2, 3, 4]]}]},
        {...surface, owners: [{...surface.owners[0], id: 'tensor-patch-1', geometrySamples: [[0, 1]]}]},
        {...surface, geometryTolerance: -1},
    ]) assert.throws(() => validateInventory([example({expected: {surface: invalid}})]), /expected(?:\.surface| surface)/);
});

test('published and retained surface records revalidate owner samples, crop evidence, dimensions and provenance', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'guided-surface-preview-'));
    t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
    const entry = surfaceExample();
    const good = surfaceCapture(entry);
    fs.writeFileSync(path.join(directory, good.file), 'png');
    assert.doesNotThrow(() => validatePublishedSet([entry], [good], directory));
    for (const mutate of [
        value => { value.scene.renderedOwners[0].geometrySamples[0][0] += 0.2; },
        value => { value.initialFrame.preparedSurfaceEvidence.renderedOwners = []; },
        value => { value.scene.visibleLabelBounds[0].right = 421; },
        value => { value.scene.projectedControlPoints[0].inFrustum = false; },
        value => { value.scene.meshBounds.left = -1; },
        value => { value.initialFrame.preparedSurfaceEvidence.meshBounds = null; },
        value => { value.initialFrame.preparedSurfaceEvidence.meshBounds.left = -50; },
        value => { value.initialFrame.preparedSurfaceEvidence.meshBounds.inFrustum = false; },
        value => { value.width = 839; },
        value => { delete value.scene.surfaceRenderer; },
        value => { value.initialFrame.preparedSurfaceEvidence.surfaceRenderer = 'canvas'; },
        value => { value.captureEvidence.servedBuildVerified = false; },
    ]) {
        const changed = structuredClone(good); mutate(changed);
        assert.throws(() => validatePublishedSet([entry], [changed], directory), /surface|owner|frame|dimension|provenance|label|cropped/i);
    }
    const curve = example({id: 'ordinary-example'});
    const curveCapture = capture(curve);
    fs.writeFileSync(path.join(directory, curveCapture.file), 'png');
    const fingerprints = {inventory: digest('i'), presentation: digest('p'), buildOutput: digest('b'), buildInputs: digest('bi')};
    const manifest = {captures: [good, curveCapture], fingerprints};
    assert.doesNotThrow(() => validateRetained([entry, curve], manifest, directory, [curve.id], fingerprints));
    // Manifests captured before the SVG surface view stored `webglContextType`; retaining them stays valid until recaptured.
    const legacy = structuredClone(good);
    for (const scene of [legacy.scene, legacy.initialFrame.preparedSurfaceEvidence]) { delete scene.surfaceRenderer; scene.webglContextType = 'webgl2'; }
    assert.doesNotThrow(() => validateRetained([entry, curve], {captures: [legacy, curveCapture], fingerprints}, directory, [curve.id], fingerprints));
    legacy.scene.webglContextType = 'none';
    assert.throws(() => validateRetained([entry, curve], {captures: [legacy, curveCapture], fingerprints}, directory, [curve.id], fingerprints), /surface was not drawn/);
    const tampered = structuredClone(good);
    tampered.scene.renderedOwners[0].geometrySamples[0][1] = -10;
    assert.throws(() => validateRetained([entry, curve], {captures: [tampered, curveCapture], fingerprints}, directory, [curve.id], fingerprints), /geometry sample/);
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
