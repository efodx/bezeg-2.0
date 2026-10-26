const test = require('node:test');
const assert = require('node:assert/strict');
const {assertPresentationGeometryStable, captureRecipeForEntry, presentationFingerprint} = require('./capture-guided-example-previews.cjs');

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
