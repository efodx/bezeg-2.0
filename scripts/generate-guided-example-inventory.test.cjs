const assert = require('node:assert/strict');
const test = require('node:test');
const {fingerprintFor, readableActions, expectedFor, linearMapsExpectedFor, complexMapsExpectedFor, numericalExpectedFor, schoolFunctionGraphsExpectedFor, fourierExpectedFor, projectiveConicsExpectedFor, assertExpectation, chapterInventories} = require('./generate-guided-example-inventory.cjs');

const step = (overrides = {}) => ({id: 'initial', scene: {actions: [{kind: 'parameter', name: 't', value: 0.5}]}, frames: [{id: 'opening', kind: 'observation'}], ...overrides});

test('scene fingerprint covers the prepared actions and first frame and rejects an empty preparation', () => {
    const base = step();
    assert.match(fingerprintFor('bezier', base), /^[a-f0-9]{64}$/);
    assert.notEqual(fingerprintFor('bezier', base), fingerprintFor('bezier', step({scene: {actions: [{kind: 'parameter', name: 't', value: 0.25}]}})));
    assert.notEqual(fingerprintFor('bezier', base), fingerprintFor('bezier', step({frames: [{id: 'different-frame', kind: 'observation'}]})));
    assert.throws(() => fingerprintFor('bezier', step({scene: {actions: []}})), /needs prepared scene actions/);
});

test('inventory actions remain readable and worked-parabola geometry comes from its verified fixture', () => {
    const actions = [{kind: 'prepared-scene', sceneId: 'worked-parabola-join', source: 'lesson-fixture',
        curve: {points: [[0, 0], [0.5, 0], [1.5, 2], [2, 4]], degree: 2, continuity: 1}}];
    const prepared = step({scene: {actions}});
    assert.match(readableActions(actions)[0], /^prepared-scene: \{/);
    assert.deepEqual(expectedFor('splines.worked-join.spline-c1.parabola-derivatives', prepared), {
        types: {curve: 1, point: 5},
        curveCount: 1,
        points: [[0, 0], [0.5, 0], [1.5, 2], [2, 4], [1, 1]],
        curves: [[[0, 0], [1, 1], [2, 4]]],
    });
    assert.equal(expectedFor('splines.piecewise.spline-cn', prepared), undefined);
    assert.throws(() => expectedFor('splines.worked-join.spline-c1.parabola-derivatives', step()), /fixture-backed worked parabola join scene/);
});

test('weighted Bernstein inventory requires degree two without stacking and checks its three basis graphs', () => {
    const actions = [
        {kind: 'bernstein-degree', degree: 2},
        {kind: 'bernstein-stacked-area', visible: false},
    ];
    const prepared = step({scene: {actions}});
    assert.deepEqual(expectedFor('foundations.worked-weight.bernstein.degree-comparison', prepared), {
        types: {curve: 3},
        curveCount: 3,
        curves: [
            [[0, 1], [0.5, 0.25], [1, 0]],
            [[0, 0], [0.5, 0.5], [1, 0]],
            [[0, 0], [0.5, 0.25], [1, 1]],
        ],
    });
    assert.throws(() => expectedFor('foundations.worked-weight.bernstein.degree-comparison',
        step({scene: {actions: [...actions.filter(action => action.kind !== 'bernstein-degree'), {kind: 'bernstein-degree', degree: 1}]}})), /must show degree-two/);
    assert.throws(() => expectedFor('foundations.worked-weight.bernstein.degree-comparison',
        step({scene: {actions: [...actions.filter(action => action.kind !== 'bernstein-stacked-area'), {kind: 'bernstein-stacked-area', visible: true}]}})), /stacked-area view off/);
    assert.throws(() => expectedFor('foundations.worked-weight.bernstein.degree-comparison',
        step({scene: {actions: [...actions, {kind: 'bernstein-degree', degree: 3}]}})), /set the Bernstein degree exactly once/);
});

const lmStep = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'},
    {kind: 'linear-map', operation: 'set-mode', mode: 'basis'}, ...actions]}});
const lmExample = exampleId => ({kind: 'linear-map', operation: 'set-example', exampleId});

test('linear maps expectations are authored from the example matrix and the scene layers', () => {
    assert.deepEqual(linearMapsExpectedFor('lm', lmStep([lmExample('identity')])), {
        types: {curve: 8, point: 8}, curveCount: 8,
        points: [[1, 0], [0, 1], [0, 0], [1, 1], [1, 1], [1, 1], [1, 0], [0, 1]]});
    const basis = linearMapsExpectedFor('lm', lmStep([lmExample('basis-default')]));
    // Columns (2,1) and (-1,1): A(e1+e2) = (1,2), the handles sit on the columns.
    assert.deepEqual(basis.points, [[1, 0], [0, 1], [0, 0], [1, 2], [1, 1], [1, 2], [2, 1], [-1, 1]]);
    assert.throws(() => linearMapsExpectedFor('lm', lmStep([])), /exactly one linear-map example/);
    assert.throws(() => linearMapsExpectedFor('lm', lmStep([lmExample('shear')])), /no authored matrix/);
    assert.throws(() => linearMapsExpectedFor('lm', lmStep([lmExample('identity'), {kind: 'linear-map', operation: 'set-matrix', matrix: [[1, 0], [0, 1]]}])),
        /must not override/);
    assert.ok(chapterInventories['linear-maps']);
});

const cmStep = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
const cmChoice = (name, value) => ({kind: 'function-choice', name, value});

test('complex maps expectations are authored from the example and what the opening scene leaves visible', () => {
    // Reciprocal: unit circle and the arrows of z and w; points z, w and the conjugate of z. 1/z, w/z and the inversion circle are hidden.
    assert.deepEqual(complexMapsExpectedFor('cm', cmStep([cmChoice('complex-reciprocal-example', 'outside')])), {
        types: {curve: 3, point: 3}, curveCount: 3, points: [[1, 1], [2, 1], [1, -1]]});
    assert.deepEqual(complexMapsExpectedFor('cm', cmStep([cmChoice('complex-reciprocal-example', 'inside')])).points, [[0.5, 0.5], [2, 1], [0.5, -0.5]]);
    // Roots: only the arrow of w and the point w; the roots, polygon and test point are hidden.
    assert.deepEqual(complexMapsExpectedFor('cm', cmStep([cmChoice('complex-roots-example', 'two-i')])), {
        types: {curve: 1, point: 1}, curveCount: 1, points: [[0, 2]]});
    assert.throws(() => complexMapsExpectedFor('cm', cmStep([])), /exactly one example/);
    assert.throws(() => complexMapsExpectedFor('cm', cmStep([cmChoice('complex-roots-example', 'unity')])), /no authored roots example/);
    assert.throws(() => complexMapsExpectedFor('cm', cmStep([cmChoice('complex-reciprocal-example', 'zero')])), /no authored reciprocal example/);
    assert.throws(() => complexMapsExpectedFor('cm', cmStep([cmChoice('complex-roots-example', 'two-i'), {kind: 'function-visibility', target: 'complex-roots', visible: true}])),
        /only picks the example/);
    assert.ok(chapterInventories['complex-maps']);
});

const fnStep = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
const fnChoice = (name, value) => ({kind: 'function-choice', name, value});
const fnParam = (name, value) => ({kind: 'function-parameter', name, value});

test('numerical methods expectations are authored from the Newton start and the example function', () => {
    const scene = (x0, extra = []) => fnStep([fnChoice('root-finding-method', 'newton'), fnChoice('root-finding-example', 'square-minus-two'), fnParam('root-x0', x0), ...extra]);
    // x0 = 1: f(1) = -1; the points are (x0, f(x0)) and (x0, 0); the tangent is hidden until a step.
    assert.deepEqual(numericalExpectedFor('nm', scene(1)), {types: {point: 3, segment: 1}, curveCount: 1, points: [[1, -1], [1, 0]]});
    assert.deepEqual(numericalExpectedFor('nm', scene(3)).points, [[3, 7], [3, 0]]);
    assert.throws(() => numericalExpectedFor('nm', scene(1, [{kind: 'animation', animationId: 'root-finding', command: 'next-step'}])), /only sets/);
    assert.throws(() => numericalExpectedFor('nm', fnStep([fnChoice('root-finding-method', 'secant'), fnChoice('root-finding-example', 'square-minus-two'), fnParam('root-x0', 1)])), /only the Newton/);
    assert.throws(() => numericalExpectedFor('nm', fnStep([fnChoice('root-finding-method', 'newton'), fnChoice('root-finding-example', 'cubic-two-cycle'), fnParam('root-x0', 1)])), /no authored root-finding example/);
    assert.throws(() => numericalExpectedFor('nm', fnStep([])), /exactly once/);
    assert.ok(chapterInventories['numerical-methods']);
});

test('school function graphs expectations are authored from the transformation rule and the mirror point', () => {
    const transform = (a, b, c, d, u, visible = true) => fnStep([fnChoice('transform-base', 'square'), fnParam('transform-a', a), fnParam('transform-b', b), fnParam('transform-c', c),
        fnParam('transform-d', d), fnParam('transform-u', u), {kind: 'function-visibility', target: 'reference', visible}]);
    const expectFor = (suffix, scene) => schoolFunctionGraphsExpectedFor(`sfg.x.${suffix}`, scene);
    // Identity parameters: the image of (2, 4) is (2, 4). a = 2, b = 2, c = 1, d = -1: (u/b + c, a f(u) + d) = (2, 7).
    assert.deepEqual(expectFor('function-transformation', transform(1, 1, 0, 0, 2)), {types: {curve: 2, point: 2}, curveCount: 2, points: [[2, 4], [2, 4]]});
    assert.deepEqual(expectFor('function-transformation', transform(2, 2, 1, -1, 2)).points, [[2, 4], [2, 7]]);
    assert.throws(() => expectFor('function-transformation', transform(1, 1, 0, 0, 2, false)), /assumes the ghost is shown/);
    assert.throws(() => expectFor('function-transformation', transform(1, 0, 0, 0, 2)), /b not zero/);
    const inverse = (x0, inverseVisible = false) => fnStep([fnChoice('inverse-restriction', 'square'), fnParam('inverse-base', 2), fnParam('inverse-x0', x0),
        {kind: 'function-visibility', target: 'inverse-curve', visible: inverseVisible}, {kind: 'function-visibility', target: 'tangent', visible: false}]);
    // P = (2, 4) and its mirror (4, 2) in y = x; the restriction y = x^2 is the only authored one.
    assert.deepEqual(expectFor('function-inverse', inverse(2)), {types: {curve: 2, line: 1, point: 2}, curveCount: 2, points: [[2, 4], [4, 2]]});
    assert.deepEqual(expectFor('function-inverse', inverse(3)).points, [[3, 9], [9, 3]]);
    assert.throws(() => expectFor('function-inverse', inverse(2, true)), /inverse curve and tangents are hidden/);
    assert.throws(() => expectFor('function-inverse', fnStep([fnChoice('inverse-restriction', 'natural'), fnParam('inverse-x0', 1),
        {kind: 'function-visibility', target: 'inverse-curve', visible: false}, {kind: 'function-visibility', target: 'tangent', visible: false}])), /only the square restriction/);
    assert.throws(() => expectFor('function-other', transform(1, 1, 0, 0, 2)), /no authored School function graphs first frame/);
    assert.ok(chapterInventories['school-function-graphs']);
});

test('fourier series expectations are authored from the closed-form partial sum', () => {
    const scene = (n, x, example = 'square') => fnStep([fnChoice('fourier-example', example), fnParam('fourier-n', n), fnParam('fourier-x', x), fnParam('fourier-epsilon', 0.1)]);
    const expected = fourierExpectedFor('f', scene(1, 1.57));
    assert.deepEqual(expected.types, {curve: 6, segment: 13, point: 7});
    assert.equal(expected.curveCount, 6);
    // N = 1: S_1(x) = 4 sin(x) / pi; the Gibbs peak is at pi / 2 where S_1 = 4 / pi.
    const near = (actual, wanted) => assert.ok(Math.abs(actual - wanted) < 1e-12, `${actual} != ${wanted}`);
    near(expected.points[3][0], Math.PI / 2);
    near(expected.points[3][1], 4 / Math.PI);
    near(expected.points[4][1], 4 * Math.sin(1.57) / Math.PI);
    assert.deepEqual(expected.points.slice(0, 3), [[0, -1], [0, 1], [0, 0]]);
    assert.deepEqual(expected.points.slice(5), [[1.57, 1], [1.57, 0]]);
    // N = 3 at x = pi / 2: (4 / pi)(1 - 1/3) = 8 / (3 pi); an even N draws the sum of N - 1.
    near(fourierExpectedFor('f', scene(3, Math.PI / 2)).points[4][1], 8 / (3 * Math.PI));
    near(fourierExpectedFor('f', scene(4, Math.PI / 2)).points[4][1], 8 / (3 * Math.PI));
    assert.throws(() => fourierExpectedFor('f', scene(1, 1.57, 'sawtooth')), /only the square wave/);
    assert.throws(() => fourierExpectedFor('f', scene(0, 1.57)), /positive integer/);
    assert.throws(() => fourierExpectedFor('f', fnStep([])), /exactly once/);
    assert.throws(() => fourierExpectedFor('f', fnStep([fnChoice('fourier-example', 'square'), fnParam('fourier-n', 1), fnParam('fourier-x', 1.57), fnParam('fourier-epsilon', 0.1),
        {kind: 'function-visibility', target: 'band', visible: true}])), /only sets/);
    assert.ok(chapterInventories['fourier-series']);
});

const pcStep = (operation, exampleId, extra = []) => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'},
    {kind: 'projective', operation, exampleId}, ...extra]}});

test('projective conics expectations are authored from the example numbers and what each graph draws', () => {
    const near = (actual, wanted) => assert.ok(Math.abs(actual - wanted) < 1e-9, `${actual} != ${wanted}`);
    const pointsNear = (actual, wanted) => {
        assert.equal(actual.length, wanted.length);
        wanted.forEach((point, index) => point.forEach((value, axis) => near(actual[index][axis], value)));
    };
    // K1: images where the rays from O = (0, 5) meet y = 1 + x/2: x = 0, 8/11, 24/13, 16/7.
    const k1 = projectiveConicsExpectedFor('projective-conics.projective-cross-ratio.projective-cross-ratio', pcStep('load-example', 'default'));
    assert.deepEqual(k1.types, {line: 2, segment: 4, point: 11});
    assert.equal(k1.curveCount, 0);
    pointsNear(k1.points, [[0, 0], [1, 0], [3, 0], [4, 0], [0, 5], [0, 1], [2, 2], [0, 1], [8 / 11, 1 + 4 / 11], [24 / 13, 1 + 12 / 13], [16 / 7, 1 + 8 / 7]]);
    // K2: the six ellipse points, the Pascal points (12, 3/5) and (15/2, 9/2); (-15, 24) is outside the view box.
    const k2 = projectiveConicsExpectedFor('projective-conics.projective-pascal.projective-pascal', pcStep('pascal-load-example', 'default'));
    assert.deepEqual(k2.types, {curve: 1, line: 7, point: 8});
    assert.equal(k2.curveCount, 1);
    pointsNear(k2.points, [[5, 0], [3, 12 / 5], [0, 3], [-3, 12 / 5], [0, -3], [4, -9 / 5], [12, 3 / 5], [15 / 2, 9 / 2]]);
    // K3: P = (1, 21/5), tangency points (-3, 12/5) and (4, 9/5), centre (0, 0).
    const k3 = projectiveConicsExpectedFor('projective-conics.projective-pole-polar.projective-pole-polar', pcStep('pole-polar-load-example', 'default'));
    assert.deepEqual(k3.types, {curve: 1, line: 3, point: 4});
    assert.equal(k3.curveCount, 1);
    pointsNear(k3.points, [[1, 21 / 5], [4, 9 / 5], [-3, 12 / 5], [0, 0]]);
    // Other examples, extra actions, wrong operations and unknown lessons have no authored first frame.
    assert.throws(() => projectiveConicsExpectedFor('p.projective-cross-ratio.projective-cross-ratio', pcStep('load-example', 'infinity')), /exactly one load-example of the default example/);
    assert.throws(() => projectiveConicsExpectedFor('p.projective-pascal.projective-pascal', pcStep('pascal-load-example', 'default', [{kind: 'projective', operation: 'pascal-set-conic', conic: 'hyperbola'}])), /exactly one pascal-load-example/);
    assert.throws(() => projectiveConicsExpectedFor('p.projective-pole-polar.projective-pole-polar', pcStep('load-example', 'default')), /exactly one pole-polar-load-example/);
    assert.throws(() => projectiveConicsExpectedFor('p.projective-pole-polar.projective-pole-polar', pcStep('pole-polar-load-example', 'default', [{kind: 'parameter', name: 't', value: 1}])), /prepared scene and one projective/);
    assert.throws(() => projectiveConicsExpectedFor('p.other.other', pcStep('load-example', 'default')), /no authored Projective conics first frame/);
    assert.ok(chapterInventories['projective-conics']);
});

test('a missing or empty chapter-owned expectation fails', () => {
    const good = {types: {curve: 1}, curveCount: 1, points: [[0, 0]]};
    assert.doesNotThrow(() => assertExpectation('x', good));
    assert.throws(() => assertExpectation('x', undefined), /needs authored expected checks/);
    assert.throws(() => assertExpectation('x', {...good, types: {}}), /expected.types must be nonempty/);
    assert.throws(() => assertExpectation('x', {...good, curveCount: 1.5}), /curveCount must be a nonnegative integer/);
    assert.throws(() => assertExpectation('x', {...good, curveCount: undefined}), /curveCount must be a nonnegative integer/);
    assert.throws(() => assertExpectation('x', {...good, curveCount: -1}), /curveCount must be a nonnegative integer/);
    assert.doesNotThrow(() => assertExpectation('x', {...good, curveCount: 0}));
    assert.throws(() => assertExpectation('x', {...good, points: []}), /expected.points must be nonempty/);
});
