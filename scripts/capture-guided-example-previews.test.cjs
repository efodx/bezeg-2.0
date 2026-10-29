const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {assertPresentationGeometryStable, assertInventoryFamily, captureOutputPath, captureRecipeForEntry, destinationForFamily, parseArgs, presentationFingerprint, presentationHelpers,
    resizeSurfaceCaptureHost, prepareSurfaceCaptureFrame} = require('./capture-guided-example-previews.cjs');
const {readPublishedSurfaceEvidence: readSurface, validateSurfaceEvidence: validateSurface} = require('./guided-example-surface-evidence.cjs');

test('patch capture family uses its fixed subdirectory and rejects retained inventories', () => {
    const inventory = [{id: 'bezier-patches.curve-to-patch.patch-tensor',
        path: '/bezeg-2.0/patches/curve-to-patch?example=lesson.bezier-patches.curve-to-patch.patch-tensor'}];
    assert.equal(parseArgs(['inventory.json']).family, 'retained');
    assert.equal(destinationForFamily('retained'), path.join(path.resolve(__dirname, '..'), 'src/images/learning/examples'));
    assert.equal(destinationForFamily('patches'), path.join(path.resolve(__dirname, '..'), 'src/images/learning/examples/patches'));
    assert.equal(captureOutputPath(destinationForFamily('patches'), inventory[0].id),
        path.join(path.resolve(__dirname, '..'), 'src/images/learning/examples/patches', `${inventory[0].id}.png`));
    assert.deepEqual(parseArgs(['inventory.json', '--family', 'patches', '--id', inventory[0].id]), {
        inventoryPath: path.resolve('inventory.json'), ids: [inventory[0].id], family: 'patches'});
    assert.doesNotThrow(() => assertInventoryFamily(inventory, 'patches'));
    assert.throws(() => assertInventoryFamily(inventory, 'retained'), /require explicit --family patches/);
    assert.doesNotThrow(() => assertInventoryFamily([{...inventory[0], path: '/bezeg-2.0/patches?example=lesson.bezier-patches.curve-to-patch.patch-tensor'}], 'patches'));
    assert.throws(() => assertInventoryFamily([{...inventory[0], id: 'chapter.example'}], 'patches'), /requires a patch inventory/);
    assert.throws(() => assertInventoryFamily([{...inventory[0], path: '/bezeg-2.0/curves?example=chapter.example'}], 'patches'), /requires a patch inventory/);
    assert.throws(() => parseArgs(['inventory.json', '--family', 'retained']), /Unsupported capture family: retained/);
});

const before = {
    points: [[0, 0.5]],
    curves: [[[-4.9, -0.25], [19.05, -0.25], [43, -0.25]]],
    boundingBox: [-4.9, 1.5, 43, -1.5],
};
const presented = {
    points: [[0, 0.5]],
    curves: [[[-2.52, -0.25], [9, -0.25], [20.52, -0.25]]],
    boundingBox: [-2.52, 1.5, 20.52, -1.5],
};

test('accepts a horizontal construction that follows the camera edges while preserving its mathematical level', () => {
    assert.doesNotThrow(() => assertPresentationGeometryStable(before, presented));
});

test('still rejects changed points, changed horizontal level, and non-camera curve edits', () => {
    assert.throws(() => assertPresentationGeometryStable(before, {...presented, points: [[0.1, 0.5]]}), /point geometry/);
    assert.throws(() => assertPresentationGeometryStable(before, {
        ...presented,
        curves: [[[-2.52, -0.2], [9, -0.2], [20.52, -0.2]]],
    }), /curve geometry/);
    assert.throws(() => assertPresentationGeometryStable(before, {
        ...presented,
        curves: [[[-2.52, -0.25], [9.1, -0.25], [20.52, -0.25]]],
    }), /curve geometry/);
});

test('rejects curve additions or removals during capture presentation', () => {
    assert.throws(() => assertPresentationGeometryStable(before, {...presented, curves: []}), /curve count/);
});

test('accepts origin-centered arcs whose scale stays between cap-bound and fixed-pixel camera scales', () => {
    const initial = {
        points: [[0, 1], [1, 1]],
        curves: [
            [[0.444811, 0], [0.444744, 0.005458], [0.444677, 0.010916]],
            [[0.652389, 0], [0.651996, 0.016006], [0.651603, 0.032011]],
        ],
        boundingBox: [-7.42833607907743, 4.5, 7.42833607907743, -4.5],
        unitScale: [67.44444444444444, 67.44444444444444],
    };
    const reframed = {
        points: [[0, 1], [1, 1]],
        curves: [
            [[0.576, 0], [0.575913, 0.007068], [0.575827, 0.014136]],
            [[0.8, 0], [0.799518, 0.019627], [0.799036, 0.039254]],
        ],
        boundingBox: [-4.032, 2.846, 4.032, -2.146],
        unitScale: [52.08333333333334, 52.08333333333334],
    };
    assert.doesNotThrow(() => assertPresentationGeometryStable(initial, reframed, 'complex-multiplication'));
    const changedArc = structuredClone(reframed);
    changedArc.curves[1][2][1] += 0.01;
    assert.throws(() => assertPresentationGeometryStable(initial, changedArc, 'complex-multiplication'), /curve geometry/);
});

test('accepts pixel-locked construction curves when capture reframing changes horizontal and vertical scales independently', () => {
    const initial = {
        points: [],
        curves: [[[0.017298, 0], [0.014765, 0.006116], [0.012232, 0.012232]]],
        boundingBox: [-1.288797, 2.2, 4.488797, -1.3],
        unitScale: [173.428571, 173.428571],
    };
    const reframed = {
        points: [],
        curves: [[[0.036571, 0], [0.031216, 0.014099], [0.025860, 0.028197]]],
        boundingBox: [-0.96, 2.378, 4.16, -1.078],
        unitScale: [82.03125, 75.231481],
    };
    assert.doesNotThrow(() => assertPresentationGeometryStable(initial, reframed, 'arc-length'));
    const changed = structuredClone(reframed);
    changed.curves[0][2][1] += 0.002;
    assert.throws(() => assertPresentationGeometryStable(initial, changed, 'arc-length'), /curve geometry/);
});

test('accepts a sampled graph whose viewport domain changes while its shared function values stay fixed', () => {
    const initial = {
        points: [], curves: [[[-4, 16], [-1.5, 2.25], [1, 1]]],
        curveData: [{id: 'graph', samples: [[-4, 16], [-1.5, 2.25], [1, 1]], points: [[-4, 16], [-3, 9], [-2, 4], [-1, 1], [0, 0], [1, 1]]}],
    };
    const reframed = {
        points: [], curves: [[[-3, 9], [-1, 2.25], [1, 1]]],
        curveData: [{id: 'graph', samples: [[-3, 9], [-1, 2.25], [1, 1]], points: [[-3, 9], [-2, 4], [-1, 1], [0, 0], [1, 1]]}],
    };
    assert.doesNotThrow(() => assertPresentationGeometryStable(initial, reframed, 'continuity'));
    const changed = structuredClone(reframed);
    changed.curveData[0].points[1][1] += 0.1;
    assert.throws(() => assertPresentationGeometryStable(initial, changed, 'continuity'), /curve geometry/);
});

test('diagnoses a camera-reframed curve change with example id and before/after samples', () => {
    const mutated = {...presented, curves: [[[-2.52, -0.2], [9, -0.2], [20.52, -0.2]]]};
    assert.throws(() => assertPresentationGeometryStable(before, mutated, 'example-id'), error => {
        assert.match(error.message, /example-id: capture presentation changed curve geometry/);
        assert.match(error.message, /before=\[\[-4\.9,-0\.25\]/);
        assert.match(error.message, /after=\[\[-2\.52,-0\.2\]/);
        return true;
    });
});

test('tightens only the worked parabola capture frame and retains shared spline recipes for other examples', () => {
    const recipe = {id: 'spline-c1', framing: {kind: 'coordinate-window', window: [-4.6, 4.2, 4.6, -4.2]}, actions: []};
    const target = captureRecipeForEntry({id: 'splines.worked-join.spline-c1.parabola-derivatives'}, recipe);
    assert.deepEqual(target.framing, {kind: 'finite-geometry-fit'});
    assert.deepEqual(target.actions, recipe.actions);
    assert.deepEqual(recipe.framing, {kind: 'coordinate-window', window: [-4.6, 4.2, 4.6, -4.2]});
    assert.equal(captureRecipeForEntry({id: 'splines.continuity-levels.spline-c1'}, recipe), recipe);
});

test('presentation fingerprint changes when a framing entry or a presentation helper changes', () => {
    const shared = {recipeFraming: [{id: 'spline-c1', framing: {kind: 'coordinate-window', window: [-4.6, 4.2, 4.6, -4.2]}}],
        entryFraming: [{id: 'worked', framing: {kind: 'finite-geometry-fit'}}]};
    const baseline = presentationFingerprint({...shared, helpers: [function inspectBoard() { return 'board-v1'; }]});
    const changedHelper = presentationFingerprint({...shared, helpers: [function inspectBoard() { return 'board-v2'; }]});
    const changedEntry = presentationFingerprint({...shared, entryFraming: [{id: 'worked', framing: {kind: 'coordinate-window', window: [-4.6, 4.2, 4.6, -4.2]}}],
        helpers: [function inspectBoard() { return 'board-v1'; }]});
    assert.notEqual(baseline, changedHelper);
    assert.notEqual(baseline, changedEntry);
});

test('presentation fingerprint includes resize behavior', () => {
    const helpers = presentationHelpers();
    assert.ok(helpers.includes(resizeSurfaceCaptureHost));
    const baseline = presentationFingerprint({helpers});
    const changed = presentationFingerprint({helpers: helpers.map(helper => helper === resizeSurfaceCaptureHost
        ? function resizeSurfaceCaptureHost() { return 'changed'; } : helper)});
    assert.notEqual(baseline, changed);
});

test('surface capture resizes before rejecting an out-of-frame projected point', async () => {
    const attrs = {
        'data-surface-framing': JSON.stringify({width: 700, height: 400,
            camera: {az: 0.2, el: 0.7, distance: 8, target: [0, 0, 0]},
            meshBounds: {left: 50, top: 40, right: 400, bottom: 250, inFrustum: true},
            points: [{id: 'P00', x: 421, y: 100, inFrustum: false}]}),
        'data-rendered-surface-owners': JSON.stringify([{id: 'tensor-patch-0', kind: 'tensor',
            geometrySamples: [[0, 1, 2], [1, 2, 3], [2, 3, 4]]}]),
    };
    const properties = new Map();
    const gl = {};
    const host = {style: {setProperty: (name, value) => properties.set(name, value)},
        getAttribute: name => attrs[name] || null, querySelector: () => ({getContext: type => type === 'webgl' ? gl : null}),
        querySelectorAll: () => [], getBoundingClientRect: () => ({left: 0, top: 0, right: 420, bottom: 260})};
    const page = {locator: () => ({waitFor: async () => {}, evaluate: async (callback, argument) => callback(host, argument)}),
        waitForFunction: async () => {}, evaluate: async () => {}};
    await assert.rejects(prepareSurfaceCaptureFrame(page), /outside the capture frame or frustum/);
    assert.equal(properties.get('width'), '420px', 'negative crop check must run after capture-only host resize');
    attrs['data-surface-framing'] = JSON.stringify({width: 700, height: 400,
        camera: {az: 0.2, el: 0.7, distance: 8, target: [0, 0, 0]},
        meshBounds: {left: 50, top: 40, right: 500, bottom: 280, inFrustum: true}, points: []});
    attrs['data-rendered-surface-owners'] = JSON.stringify(Array.from({length: 32}, (_, index) => ({id: `teapot-patch-${index}`,
        kind: 'teapot', geometrySamples: [[index, 0, 0], [index, 1, 0], [index, 2, 0]]})));
    await assert.doesNotReject(prepareSurfaceCaptureFrame(page));
    const expectedTeapot = {camera: {az: 0.2, el: 0.7, distance: 8, target: [0, 0, 0]},
        owners: Array.from({length: 32}, (_, index) => ({id: `teapot-patch-${index}`, kind: 'teapot',
            geometrySamples: [[index, 0, 0], [index + 1, 0, 0], [index, 1, 0]]}))};
    attrs['data-rendered-surface-owners'] = JSON.stringify(expectedTeapot.owners);
    assert.equal(validateSurface({...await readSurface(page), expected: expectedTeapot}).ownerIds.length, 32);
    const subdivision = {camera: expectedTeapot.camera, owners: [{id: 'tensor-patch-0', kind: 'tensor',
        geometrySamples: [[0, 0, 0], [1, 0, 0], [0, 1, 0]]}]};
    attrs['data-rendered-surface-owners'] = JSON.stringify(subdivision.owners);
    assert.equal(validateSurface({...await readSurface(page), expected: subdivision}).ownerIds.length, 1);
    const clipped = JSON.parse(attrs['data-surface-framing']);
    clipped.meshBounds.left = -1;
    attrs['data-surface-framing'] = JSON.stringify(clipped);
    await assert.rejects(prepareSurfaceCaptureFrame(page), /mesh bounds are cropped or behind/);
    clipped.meshBounds.left = 50; clipped.meshBounds.inFrustum = false;
    attrs['data-surface-framing'] = JSON.stringify(clipped);
    await assert.rejects(prepareSurfaceCaptureFrame(page), /mesh bounds are cropped or behind/);
});
