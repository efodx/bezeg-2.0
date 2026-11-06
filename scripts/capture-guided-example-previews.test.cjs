const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {assertPresentationGeometryStable, assertInventoryFamily, captureOutputPath, captureRecipeForEntry, destinationForFamily, parseArgs, presentationFingerprint, presentationHelpers,
    resizeSurfaceCaptureHost, prepareSurfaceCaptureFrame} = require('./capture-guided-example-previews.cjs');
const {fakeSurfaceHost} = require('./surface-view-fixture.cjs');
const {readPublishedSurfaceEvidence: readSurface, validateSurfaceEvidence: validateSurface} = require('./guided-example-surface-evidence.cjs');

test('linear-maps capture family is isolated from the retained manifest and the patches destination', () => {
    const entry = {id: 'linear-maps.matrix-and-image.linear-map',
        path: '/bezeg-2.0/linear-map?example=lesson.linear-maps.matrix-and-image.linear-map'};
    const root = path.resolve(__dirname, '..');
    assert.equal(destinationForFamily('linear-maps'), path.join(root, 'src/images/learning/examples/linear-maps'));
    assert.equal(captureOutputPath(destinationForFamily('linear-maps'), entry.id),
        path.join(root, 'src/images/learning/examples/linear-maps', `${entry.id}.png`));
    assert.equal(parseArgs(['inventory.json', '--family', 'linear-maps']).family, 'linear-maps');
    assert.doesNotThrow(() => assertInventoryFamily([entry], 'linear-maps'));
    assert.throws(() => assertInventoryFamily([entry], 'retained'), /require explicit --family linear-maps/);
    assert.throws(() => assertInventoryFamily([{...entry, id: 'chapter.example'}, entry], 'linear-maps'), /requires a linear-maps inventory/);
    assert.throws(() => assertInventoryFamily([{...entry, path: '/bezeg-2.0/curves?example=x'}], 'linear-maps'), /requires a linear-maps inventory/);
    assert.throws(() => assertInventoryFamily([], 'linear-maps'), /requires a linear-maps inventory/);
    assert.throws(() => assertInventoryFamily([entry], 'patches'), /requires a patch inventory/);
    assert.throws(() => assertInventoryFamily([{id: 'bezier-patches.curve-to-patch.patch-tensor', path: '/bezeg-2.0/patches/x'}], 'linear-maps'), /requires a linear-maps inventory/);
    assert.throws(() => parseArgs(['inventory.json', '--family', 'unknown']), /Unsupported capture family: unknown/);
});

test('complex-maps capture family accepts the two complex routes and nothing else', () => {
    const reciprocal = {id: 'complex-maps.reciprocal-inversion.complex-reciprocal', path: '/bezeg-2.0/complex-reciprocal?example=lesson.complex-maps.reciprocal-inversion.complex-reciprocal'};
    const roots = {id: 'complex-maps.roots.complex-roots', path: '/bezeg-2.0/complex-roots?example=lesson.complex-maps.roots.complex-roots'};
    const root = path.resolve(__dirname, '..');
    assert.equal(destinationForFamily('complex-maps'), path.join(root, 'src/images/learning/examples/complex-maps'));
    assert.equal(parseArgs(['inventory.json', '--family', 'complex-maps']).family, 'complex-maps');
    assert.doesNotThrow(() => assertInventoryFamily([reciprocal, roots], 'complex-maps'));
    assert.throws(() => assertInventoryFamily([reciprocal, roots], 'retained'), /require explicit --family complex-maps/);
    assert.throws(() => assertInventoryFamily([reciprocal, roots], 'linear-maps'), /requires a linear-maps inventory/);
    assert.throws(() => assertInventoryFamily([{...roots, path: '/bezeg-2.0/complex-multiplication?example=x'}], 'complex-maps'), /requires a complex-maps inventory/);
    assert.throws(() => assertInventoryFamily([{...roots, path: '/bezeg-2.0/complex-rootsx'}], 'complex-maps'), /requires a complex-maps inventory/);
    assert.throws(() => assertInventoryFamily([{...roots, id: 'chapter.example'}], 'complex-maps'), /requires a complex-maps inventory/);
    assert.throws(() => assertInventoryFamily([], 'complex-maps'), /requires a complex-maps inventory/);
});

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

test('accepts a marked viewport-generated field rebuilt inside the presented window, and nothing else', () => {
    const field = (samples, points, viewportGenerated = true, id = 'field') => ({id, samples, points, viewportGenerated});
    const initial = {points: [], boundingBox: [-4, 4, 5, -1], curves: [[[-3.7, -0.8], [0, 1], [4, 3]]],
        curveData: [field([[-3.7, -0.8], [0, 1], [4, 3]], [[-3.7, -0.8], [0, 1], [4, 3]])]};
    const presented = {points: [], boundingBox: [-1.7, 3.3, 3.1, 0.4], curves: [[[-1.6, 0.5], [0, 1], [3, 3]]],
        curveData: [field([[-1.6, 0.5], [0, 1], [3, 3]], [[-1.6, 0.5], [0, 1], [3, 3]])]};
    assert.doesNotThrow(() => assertPresentationGeometryStable(initial, presented, 'euler'));
    // a mark outside the presented window, an unmarked curve, a different board object, or no marks at all
    const outside = structuredClone(presented);
    outside.curveData[0].points.push([3.5, 1]);
    assert.throws(() => assertPresentationGeometryStable(initial, outside, 'euler'), /curve geometry/);
    const unmarked = {...presented, curveData: [field(presented.curves[0], presented.curves[0], false)]};
    assert.throws(() => assertPresentationGeometryStable(initial, unmarked, 'euler'), /curve geometry/);
    const other = {...presented, curveData: [field(presented.curves[0], presented.curves[0], true, 'other')]};
    assert.throws(() => assertPresentationGeometryStable(initial, other, 'euler'), /curve geometry/);
    const empty = {...presented, curveData: [field(presented.curves[0], [])]};
    assert.throws(() => assertPresentationGeometryStable(initial, empty, 'euler'), /curve geometry/);
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

test('a curve geometry card fits its own lesson scene instead of the poster window of its demonstration', () => {
    const recipe = {id: 'curve-comb', framing: {kind: 'coordinate-window', window: [-8, 4.9, 8, -4.9]}, actions: []};
    for (const id of ['curve-geometry.curve-comb.curve-comb', 'curve-geometry.curve-evolute.curve-evolute', 'curve-geometry.curve-envelope.curve-envelope'])
        assert.deepEqual(captureRecipeForEntry({id}, recipe).framing, {kind: 'finite-geometry-fit'});
    assert.deepEqual(recipe.framing, {kind: 'coordinate-window', window: [-8, 4.9, 8, -4.9]});
    assert.equal(captureRecipeForEntry({id: 'projective-conics.projective-pascal.projective-pascal'}, recipe), recipe);
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
    const host = Object.assign(fakeSurfaceHost({attrs}), {style: {setProperty: (name, value) => properties.set(name, value)},
        querySelectorAll: () => [], getBoundingClientRect: () => ({left: 0, top: 0, right: 420, bottom: 260})});
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

test('numerical, school, fourier, projective and curve-geometry capture families accept exactly their own routes', () => {
    const entries = {
        'numerical-methods': [
            {id: 'numerical-methods.root-finding.root-finding', path: '/bezeg-2.0/analysis/root-finding?example=lesson.numerical-methods.root-finding.root-finding'},
            {id: 'numerical-methods.quadrature.quadrature', path: '/bezeg-2.0/analysis/quadrature?example=lesson.numerical-methods.quadrature.quadrature'},
            {id: 'numerical-methods.euler-method.euler-method', path: '/bezeg-2.0/analysis/euler-method?example=lesson.numerical-methods.euler-method.euler-method'}],
        'school-function-graphs': [
            {id: 'school-function-graphs.function-transformation.function-transformation', path: '/bezeg-2.0/functions/transformations?example=lesson.school-function-graphs.function-transformation.function-transformation'},
            {id: 'school-function-graphs.function-inverse.function-inverse', path: '/bezeg-2.0/functions/inverse?example=lesson.school-function-graphs.function-inverse.function-inverse'},
            {id: 'school-function-graphs.polynomial-zeros.polynomial-zeros', path: '/bezeg-2.0/functions/polynomial-zeros?example=lesson.school-function-graphs.polynomial-zeros.polynomial-zeros'},
            {id: 'school-function-graphs.rational-function.rational-function', path: '/bezeg-2.0/functions/rational-functions?example=lesson.school-function-graphs.rational-function.rational-function'},
            {id: 'school-function-graphs.geometric-series.geometric-series', path: '/bezeg-2.0/functions/geometric-series?example=lesson.school-function-graphs.geometric-series.geometric-series'},
            {id: 'school-function-graphs.conic-focal.conic-focal', path: '/bezeg-2.0/functions/conics?example=lesson.school-function-graphs.conic-focal.conic-focal'}],
        'fourier-series': [{id: 'fourier-series.fourier-series.fourier-series', path: '/bezeg-2.0/analysis/fourier-series?example=lesson.fourier-series.fourier-series.fourier-series'},
            {id: 'fourier-series.fourier-coefficients.fourier-coefficients', path: '/bezeg-2.0/analysis/fourier-coefficients?example=lesson.fourier-series.fourier-coefficients.fourier-coefficients'},
            {id: 'fourier-series.epicycles.epicycles', path: '/bezeg-2.0/analysis/epicycles?example=lesson.fourier-series.epicycles.epicycles'}],
        'projective-conics': [
            {id: 'projective-conics.projective-cross-ratio.projective-cross-ratio', path: '/bezeg-2.0/projective/cross-ratio?example=lesson.projective-conics.projective-cross-ratio.projective-cross-ratio'},
            {id: 'projective-conics.projective-pascal.projective-pascal', path: '/bezeg-2.0/projective/pascal?example=lesson.projective-conics.projective-pascal.projective-pascal'},
            {id: 'projective-conics.projective-pole-polar.projective-pole-polar', path: '/bezeg-2.0/projective/pole-polar?example=lesson.projective-conics.projective-pole-polar.projective-pole-polar'},
            {id: 'projective-conics.projective-five-point.projective-five-point', path: '/bezeg-2.0/projective/five-point?example=lesson.projective-conics.projective-five-point.projective-five-point'},
            {id: 'projective-conics.projective-three-views.projective-three-views', path: '/bezeg-2.0/projective/three-views?example=lesson.projective-conics.projective-three-views.projective-three-views'}],
        'advanced-bezier': [{id: 'advanced-bezier.reduction.reduction', path: '/bezeg-2.0/bezier/reduction?example=lesson.advanced-bezier.reduction.reduction'},
            {id: 'advanced-bezier.arc-length-param.arc-length-param', path: '/bezeg-2.0/bezier/arc-length?example=lesson.advanced-bezier.arc-length-param.arc-length-param'},
            {id: 'advanced-bezier.bezier-clipping.bezier-clipping', path: '/bezeg-2.0/bezier/clipping?example=lesson.advanced-bezier.bezier-clipping.bezier-clipping'},
            {id: 'advanced-bezier.patch-coons.patch-coons', path: '/bezeg-2.0/patches/coons?example=lesson.advanced-bezier.patch-coons.patch-coons'}],
        'curve-geometry': [{id: 'curve-geometry.curve-parametric.curve-parametric', path: '/bezeg-2.0/curve-geometry/parametric?example=lesson.curve-geometry.curve-parametric.curve-parametric'},
            {id: 'curve-geometry.curve-curvature.curve-curvature', path: '/bezeg-2.0/curve-geometry/curvature?example=lesson.curve-geometry.curve-curvature.curve-curvature'},
            {id: 'curve-geometry.curve-comb.curve-comb', path: '/bezeg-2.0/curve-geometry/comb?example=lesson.curve-geometry.curve-comb.curve-comb'},
            {id: 'curve-geometry.curve-evolute.curve-evolute', path: '/bezeg-2.0/curve-geometry/evolute?example=lesson.curve-geometry.curve-evolute.curve-evolute'},
            {id: 'curve-geometry.curve-offset.curve-offset', path: '/bezeg-2.0/curve-geometry/offset?example=lesson.curve-geometry.curve-offset.curve-offset'},
            {id: 'curve-geometry.curve-envelope.curve-envelope', path: '/bezeg-2.0/curve-geometry/envelope?example=lesson.curve-geometry.curve-envelope.curve-envelope'}],
    };
    const root = path.resolve(__dirname, '..');
    for (const [family, list] of Object.entries(entries)) {
        assert.equal(destinationForFamily(family), path.join(root, 'src/images/learning/examples', family));
        assert.equal(parseArgs(['inventory.json', '--family', family]).family, family);
        assert.doesNotThrow(() => assertInventoryFamily(list, family));
        assert.throws(() => assertInventoryFamily(list, 'retained'), new RegExp(`require explicit --family ${family}`));
        assert.throws(() => assertInventoryFamily([], family), new RegExp(`requires a ${family} inventory`));
        assert.throws(() => assertInventoryFamily([{...list[0], id: 'chapter.example'}], family), new RegExp(`requires a ${family} inventory`));
        assert.throws(() => assertInventoryFamily([{...list[0], path: '/bezeg-2.0/curves?example=x'}], family), new RegExp(`requires a ${family} inventory`));
        for (const other of Object.keys(entries).filter(name => name !== family)) {
            assert.throws(() => assertInventoryFamily(list, other), new RegExp(`requires a ${other} inventory`));
        }
    }
    // Neighbouring routes of the same Demonstration families are refused.
    assert.throws(() => assertInventoryFamily([{...entries['numerical-methods'][0], path: '/bezeg-2.0/analysis/bisection'}], 'numerical-methods'), /requires a numerical-methods inventory/);
    assert.throws(() => assertInventoryFamily([{...entries['numerical-methods'][0], path: '/bezeg-2.0/analysis/root-findingx'}], 'numerical-methods'), /requires a numerical-methods inventory/);
    for (const path of ['/bezeg-2.0/analysis/quadraturex', '/bezeg-2.0/analysis/quadrature-rules', '/bezeg-2.0/analysis/bisection', '/bezeg-2.0/analysis', '/bezeg-2.0/quadrature'])
        assert.throws(() => assertInventoryFamily([{...entries['numerical-methods'][1], path}], 'numerical-methods'), /requires a numerical-methods inventory/);
    for (const path of ['/bezeg-2.0/analysis/euler-methodx', '/bezeg-2.0/analysis/euler', '/bezeg-2.0/analysis/euler-methods', '/bezeg-2.0/euler-method'])
        assert.throws(() => assertInventoryFamily([{...entries['numerical-methods'][2], path}], 'numerical-methods'), /requires a numerical-methods inventory/);
    assert.throws(() => assertInventoryFamily([{...entries['school-function-graphs'][0], path: '/bezeg-2.0/functions/derivative'}], 'school-function-graphs'), /requires a school-function-graphs inventory/);
    assert.throws(() => assertInventoryFamily([{...entries['fourier-series'][0], path: '/bezeg-2.0/analysis/fourier-seriesx'}], 'fourier-series'), /requires a fourier-series inventory/);
    assert.throws(() => assertInventoryFamily([{...entries['fourier-series'][1], path: '/bezeg-2.0/analysis/fourier-coefficientsx'}], 'fourier-series'), /requires a fourier-series inventory/);
    assert.throws(() => assertInventoryFamily([{...entries['fourier-series'][2], path: '/bezeg-2.0/analysis/epicyclesx'}], 'fourier-series'), /requires a fourier-series inventory/);
    for (const path of ['/bezeg-2.0/projective/cross-ratiox', '/bezeg-2.0/projective', '/bezeg-2.0/projective/conics', '/bezeg-2.0/pascal', '/bezeg-2.0/projective/five-pointx', '/bezeg-2.0/projective/tangent'])
        assert.throws(() => assertInventoryFamily([{...entries['projective-conics'][0], path}], 'projective-conics'), /requires a projective-conics inventory/);
    for (const path of ['/bezeg-2.0/curve-geometry/parametricx', '/bezeg-2.0/curve-geometry/curvaturex', '/bezeg-2.0/curve-geometry/combx', '/bezeg-2.0/curve-geometry/evolutes', '/bezeg-2.0/curve-geometry/offsets', '/bezeg-2.0/curve-geometry/envelopes', '/bezeg-2.0/curve-geometry', '/bezeg-2.0/curve-geometry/other', '/bezeg-2.0/parametric'])
        assert.throws(() => assertInventoryFamily([{...entries['curve-geometry'][0], path}], 'curve-geometry'), /requires a curve-geometry inventory/);
    for (const path of ['/bezeg-2.0/bezier/reductions', '/bezeg-2.0/bezier/arc-lengths', '/bezeg-2.0/bezier/clippings', '/bezeg-2.0/patches/coonsx', '/bezeg-2.0/bezier', '/bezeg-2.0/patches/tensor', '/bezeg-2.0/reduction'])
        assert.throws(() => assertInventoryFamily([{...entries['advanced-bezier'][0], path}], 'advanced-bezier'), /requires a advanced-bezier inventory/);
});

test('accepts a view-clamped function graph and its coinciding ghost across capture reframing, and pairs them by id', () => {
    // x^2 plotted over the view with off-screen values clamped to a view-relative height, drawn twice (graph and ghost).
    const frame = (box, clamp, ids) => {
        const xs = Array.from({length: 401}, (_, index) => box[0] + (box[2] - box[0]) * index / 400);
        const samples = xs.map(x => [Number(x.toFixed(6)), Math.min(x * x, clamp)]);
        return {points: [], curves: [samples, samples], boundingBox: box, unitScale: [10, 10],
            curveData: ids.map(id => ({id, samples, points: samples}))};
    };
    const initial = frame([-10.205931, 7, 16.205931, -9], 23, ['graph', 'ghost']);
    const presented = frame([-8.52, 9.24, 14.52, -11.24], 29.72, ['ghost', 'graph']);
    assert.doesNotThrow(() => assertPresentationGeometryStable(initial, presented, 'function-transformation'));
    const changed = frame([-8.52, 9.24, 14.52, -11.24], 29.72, ['ghost', 'graph']);
    changed.curveData = changed.curveData.map(curve => ({...curve, points: curve.points.map(([x]) => [x, Math.min((x - 0.5) * (x - 0.5), 29.72)])}));
    changed.curves = changed.curveData.map(curve => curve.points);
    changed.curveData = changed.curveData.map(curve => ({...curve, samples: curve.points}));
    assert.throws(() => assertPresentationGeometryStable(initial, changed, 'function-transformation'), /curve geometry/);
});
