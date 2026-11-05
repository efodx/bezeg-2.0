const assert = require('node:assert/strict');
const test = require('node:test');
const {fingerprintFor, readableActions, expectedFor, linearMapsExpectedFor, complexMapsExpectedFor, numericalExpectedFor, schoolFunctionGraphsExpectedFor, fourierExpectedFor, fourierCoefficientsExpectedFor, epicyclesExpectedFor, projectiveConicsExpectedFor, curveGeometryExpectedFor, assertExpectation, chapterInventories} = require('./generate-guided-example-inventory.cjs');

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

test('quadrature expectations are authored from the bounds: two points on the axis and two curves', () => {
    const scene = (extra = [], rule = 'simpson', n = 4) => fnStep([fnChoice('quadrature-function', 'sin'), fnParam('quadrature-a', 0), fnParam('quadrature-b', 3), fnParam('quadrature-n', n), fnChoice('quadrature-rule', rule), ...extra]);
    assert.deepEqual(numericalExpectedFor('q', scene()), {types: {point: 2}, curveCount: 2, points: [[0, 0], [3, 0]]});
    assert.deepEqual(numericalExpectedFor('q', scene([], 'trapezoid', 3)).points, [[0, 0], [3, 0]]);
    assert.throws(() => numericalExpectedFor('q', scene([{kind: 'animation', animationId: 'x', command: 'next-step'}])), /only sets/);
    assert.throws(() => numericalExpectedFor('q', scene([], 'simpson', 3)), /even for Simpson/);
    assert.throws(() => numericalExpectedFor('q', scene([], 'midpoint')), /no authored quadrature rule/);
    assert.throws(() => numericalExpectedFor('q', fnStep([fnChoice('quadrature-function', 'cube'), fnParam('quadrature-a', 0), fnParam('quadrature-b', 3), fnParam('quadrature-n', 2), fnChoice('quadrature-rule', 'trapezoid')])), /no authored quadrature function/);
    assert.throws(() => numericalExpectedFor('q', fnStep([fnChoice('quadrature-function', 'sin'), fnParam('quadrature-a', 4), fnParam('quadrature-b', 3), fnParam('quadrature-n', 2), fnChoice('quadrature-rule', 'trapezoid')])), /below quadrature-b/);
    assert.throws(() => numericalExpectedFor('q', fnStep([fnChoice('quadrature-function', 'sin'), fnParam('quadrature-b', 3), fnParam('quadrature-n', 2), fnChoice('quadrature-rule', 'trapezoid')])), /exactly once/);
});

test('euler expectations are authored from the initial point and the exact-curve visibility', () => {
    const scene = (visible = true, extra = [], step = '0.5', y0 = 1, end = 1) => fnStep([{kind: 'function-visibility', target: 'euler-exact', visible}, fnChoice('euler-example', 'exponential'), fnChoice('euler-step', step),
        fnParam('euler-x0', 0), fnParam('euler-y0', y0), fnParam('euler-end', end), ...extra]);
    assert.deepEqual(numericalExpectedFor('e', scene()), {types: {curve: 4, point: 1}, curveCount: 4, points: [[0, 1]]});
    assert.deepEqual(numericalExpectedFor('e', scene(false, [], '0.25', 2, 1)), {types: {curve: 3, point: 1}, curveCount: 3, points: [[0, 2]]});
    // end x = x0: no polyline, so the field and the node crosses (and the exact curve when shown)
    assert.deepEqual(numericalExpectedFor('e', scene(false, [], '0.5', 1, 0)), {types: {curve: 2, point: 1}, curveCount: 2, points: [[0, 1]]});
    assert.deepEqual(numericalExpectedFor('e', scene(true, [], '0.5', 1, 0)).curveCount, 3);
    assert.throws(() => numericalExpectedFor('e', scene(true, [{kind: 'animation', animationId: 'x', command: 'next-step'}])), /only sets/);
    assert.throws(() => numericalExpectedFor('e', scene(true, [], '0.3')), /no authored Euler step/);
    assert.throws(() => numericalExpectedFor('e', scene(true, [fnChoice('euler-example', 'blow-up')])), /exactly once/);
    assert.throws(() => numericalExpectedFor('e', fnStep([fnChoice('euler-example', 'cosine'), fnChoice('euler-step', '1'), fnParam('euler-x0', 0), fnParam('euler-y0', 1), fnParam('euler-end', 1),
        {kind: 'function-visibility', target: 'euler-exact', visible: true}])), /no authored Euler example/);
    assert.throws(() => numericalExpectedFor('e', scene(true, [], '0.5', 1, -1)), /not below euler-x0/);
    assert.throws(() => numericalExpectedFor('e', fnStep([fnChoice('euler-example', 'exponential'), fnChoice('euler-step', '1'), fnParam('euler-x0', 0), fnParam('euler-y0', 1), fnParam('euler-end', 1)])), /euler-exact exactly once/);
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
    // Polynomial zeros: the example's zeros are gliders on the x-axis; the derivative adds a second curve; a move onto another zero is not authored.
    const polynomial = (example, derivative, moves = []) => fnStep([fnChoice('polynomial-example', example), ...moves.map(([slot, z]) => fnParam(`poly-zero-${slot}`, z)),
        {kind: 'function-visibility', target: 'polynomial-derivative', visible: derivative}]);
    assert.deepEqual(expectFor('polynomial-zeros', polynomial('default', false)), {types: {curve: 1, point: 2}, curveCount: 1, points: [[-2, 0], [1, 0]]});
    assert.deepEqual(expectFor('polynomial-zeros', polynomial('triple', true)), {types: {curve: 2, point: 1}, curveCount: 2, points: [[1, 0]]});
    assert.deepEqual(expectFor('polynomial-zeros', polynomial('degree-five', false)).points, [[-3, 0], [-1, 0], [2, 0]]);
    assert.deepEqual(expectFor('polynomial-zeros', polynomial('default', false, [[1, -3]])).points, [[-3, 0], [1, 0]]);
    assert.throws(() => expectFor('polynomial-zeros', polynomial('default', false, [[1, 1]])), /no two zeros merge/);
    assert.throws(() => expectFor('polynomial-zeros', polynomial('default', false, [[3, 1]])), /does not have/);
    // Rational functions: the zeros of both lists are gliders on the x-axis, a hole adds its point, the probe adds a point and a segment, and the
    // asymptote and each pole add a line; a move onto a zero of the other list makes a hole, onto one of the same list is not authored.
    const rational = (example, moves = [], probe = 10) => fnStep([fnChoice('rational-example', example), ...moves.map(([name, z]) => fnParam(name, z)), fnParam('rational-probe', probe)]);
    assert.deepEqual(expectFor('rational-function', rational('oblique')), {types: {curve: 1, line: 2, point: 4, segment: 1}, curveCount: 1, points: [[-1, 0], [1, 0], [2, 0], [10, 12.375]]});
    assert.deepEqual(expectFor('rational-function', rational('oblique', [['rational-denominator-1', 1]])),
        {types: {curve: 1, line: 1, point: 5, segment: 1}, curveCount: 1, points: [[-1, 0], [1, 0], [1, 0], [1, 2], [10, 11]]});
    assert.deepEqual(expectFor('rational-function', rational('horizontal')).points, [[-1, 0], [1, 0], [-2, 0], [2, 0], [10, 2.0625]]);
    const vertical = expectFor('rational-function', rational('horizontal', [['rational-numerator-2', 2]]));
    assert.deepEqual(vertical.points.slice(0, 5), [[-1, 0], [2, 0], [-2, 0], [2, 0], [2, 1.5]]);
    assert.deepEqual(vertical.types, {curve: 1, line: 2, point: 6, segment: 1});
    const doublePole = expectFor('rational-function', rational('double-pole'));
    assert.deepEqual(doublePole.types, {curve: 1, line: 3, point: 4, segment: 1});
    assert.deepEqual(doublePole.points.slice(0, 3), [[0, 0], [-2, 0], [1, 0]]);
    assert.ok(Math.abs(doublePole.points[3][1] - 40 / (12 * 81)) < 1e-12);
    // At a pole the probe is not shown.
    assert.deepEqual(expectFor('rational-function', rational('oblique', [], 2)).types, {curve: 1, line: 2, point: 3});
    assert.throws(() => expectFor('rational-function', rational('oblique', [['rational-numerator-1', 1]])), /no two zeros of one list merge/);
    assert.throws(() => expectFor('rational-function', rational('oblique', [['rational-denominator-2', 1]])), /does not have/);
    assert.throws(() => expectFor('rational-function', fnStep([fnChoice('rational-example', 'oblique'), fnParam('k', 3), fnParam('rational-probe', 10)])), /assumes the example's k/);
    assert.throws(() => expectFor('rational-function', fnStep([fnChoice('rational-example', 'cubic'), fnParam('rational-probe', 10)])), /no authored rational example/);
    assert.throws(() => expectFor('function-other', transform(1, 1, 0, 0, 2)), /no authored School function graphs first frame/);
    assert.ok(chapterInventories['school-function-graphs']);
});

test('geometric series expectations are authored from the example, the shown terms and the tolerance', () => {
    const series = (example, terms, tolerance) => fnStep([fnChoice('series-example', example), fnParam('series-n', terms), fnParam('series-tolerance', tolerance)]);
    const expectFor = (example, terms, tolerance) => schoolFunctionGraphsExpectedFor('school-function-graphs.geometric-series.geometric-series', series(example, terms, tolerance));
    // |q| < 1: 2n bars and the limit line; a positive tolerance adds the band (a curve) and its two edges.
    assert.deepEqual(expectFor('default', 3, 0), {types: {segment: 7}, curveCount: 0, points: []});
    assert.deepEqual(expectFor('default', 8, 0.01), {types: {segment: 19, curve: 1}, curveCount: 1, points: []});
    assert.deepEqual(expectFor('alternating', 4, 0), {types: {segment: 9}, curveCount: 0, points: []});
    // q = -1: no limit, so no limit line and no band, even with a tolerance.
    assert.deepEqual(expectFor('divergent', 6, 0), {types: {segment: 12}, curveCount: 0, points: []});
    assert.deepEqual(expectFor('divergent', 6, 0.5), {types: {segment: 12}, curveCount: 0, points: []});
    assert.doesNotThrow(() => assertExpectation('x', expectFor('default', 3, 0)));
    assert.throws(() => assertExpectation('x', {types: {segment: 0}, curveCount: 0, points: []}), /expected.points must be nonempty/);
    assert.throws(() => assertExpectation('x', {types: {point: 1}, curveCount: 0, points: []}), /expected.points must be nonempty/);
    assert.throws(() => expectFor('bogus', 3, 0), /no authored series example/);
    assert.throws(() => expectFor('default', 51, 0), /out of range/);
    assert.throws(() => schoolFunctionGraphsExpectedFor('school-function-graphs.geometric-series.geometric-series', fnStep([fnChoice('series-example', 'default'), fnParam('series-n', 3), fnParam('series-tolerance', 0), fnParam('series-q', 0.9)])), /extend seriesExpectedFor/);
});

test('conic expectations are authored for the ellipse opening scene only', () => {
    const id = 'school-function-graphs.conic-focal.conic-focal';
    assert.deepEqual(schoolFunctionGraphsExpectedFor(id, fnStep([fnChoice('conic-example', 'ellipse')])),
        {types: {curve: 1, line: 1, segment: 3, point: 3}, curveCount: 1, points: [[-4, 0], [0, 3], [4, 0]]});
    assert.throws(() => schoolFunctionGraphsExpectedFor(id, fnStep([fnChoice('conic-example', 'circle')])), /extend conicExpectedFor/);
    assert.throws(() => schoolFunctionGraphsExpectedFor(id, fnStep([fnChoice('conic-example', 'ellipse'), fnParam('conic-weight', 1)])), /extend conicExpectedFor/);
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

test('fourier coefficients expectation is authored from the jump layout breakpoints', () => {
    const scene = (extra = {}) => {
        const values = {'fourier-view': extra['fourier-view'] ?? 'projection', 'fourier-layout': extra['fourier-layout'] ?? 'jump', 'fourier-term': extra['fourier-term'] ?? 'b'};
        return fnStep([...Object.entries(values).map(([name, value]) => fnChoice(name, value)),
            ...[-1, -1, 1, 1].map((value, index) => fnParam(`fourier-handle-${index}`, extra[`h${index}`] ?? value)),
            fnParam('fourier-order', extra.K ?? 16), fnParam('fourier-harmonic', extra.k ?? 1),
            {kind: 'function-visibility', target: 'fourier-partial-sum', visible: extra.overlay ?? true}]);
    };
    const expected = fourierCoefficientsExpectedFor('f', scene());
    assert.deepEqual(expected.types, {curve: 5, segment: 2, point: 7});
    assert.equal(expected.curveCount, 5);
    assert.deepEqual(expected.points, [[-Math.PI, -1], [1, -1], [1, 1], [Math.PI, 1], [-Math.PI, 0], [Math.PI, 0], [1, 0]]);
    assert.throws(() => fourierCoefficientsExpectedFor('f', scene({'fourier-view': 'decay'})), /only the projection view/);
    assert.throws(() => fourierCoefficientsExpectedFor('f', scene({'fourier-layout': 'abs'})), /only the jump layout/);
    assert.throws(() => fourierCoefficientsExpectedFor('f', scene({'fourier-term': 'a'})), /sine term/);
    assert.throws(() => fourierCoefficientsExpectedFor('f', scene({k: 2})), /only k = 1/);
    assert.throws(() => fourierCoefficientsExpectedFor('f', scene({K: 8})), /only K = 16/);
    assert.throws(() => fourierCoefficientsExpectedFor('f', scene({h0: 0})), /only the handles/);
    assert.throws(() => fourierCoefficientsExpectedFor('f', scene({overlay: false})), /overlay must be on/);
    assert.throws(() => fourierCoefficientsExpectedFor('f', fnStep([{kind: 'function-visibility', target: 'band', visible: true}])), /only sets/);
});

test('epicycles expectation is authored from the circle definition', () => {
    const scene = (extra = {}) => fnStep([fnChoice('epicycle-example', extra.example ?? 'circle'), fnChoice('epicycle-parametrization', extra.parametrization ?? 'equal'),
        fnParam('epicycle-n', extra.N ?? 1), fnParam('epicycle-time', extra.time ?? 0)]);
    const expected = epicyclesExpectedFor('f', scene());
    const k = (4 / 3) * (Math.SQRT2 - 1);
    assert.deepEqual(expected.types, {curve: 5, point: 12});
    assert.equal(expected.curveCount, 5);
    assert.equal(expected.points.length, 12);
    assert.deepEqual(expected.points.slice(0, 4), [[1, 0], [0, 1], [-1, 0], [0, -1]]);
    assert.deepEqual(expected.points.slice(4, 6), [[1, k], [k, 1]]);
    assert.deepEqual(expected.points.slice(6, 8), [[-k, 1], [-1, k]]);
    assert.deepEqual(expected.points.slice(8, 10), [[-1, -k], [-k, -1]]);
    assert.deepEqual(expected.points.slice(10), [[k, -1], [1, -k]]);
    assert.ok(Math.abs(k - 0.5522847498) < 1e-9);
    assert.deepEqual(chapterInventories['fourier-series'].expectedFor('fourier-series.epicycles.epicycles', scene()), expected);
    assert.throws(() => chapterInventories['fourier-series'].expectedFor('fourier-series.fourier-series.fourier-series', scene()), /extend fourierExpectedFor/);
    assert.throws(() => epicyclesExpectedFor('f', scene({example: 'diamond'})), /only the circle/);
    assert.throws(() => epicyclesExpectedFor('f', scene({parametrization: 'chord'})), /only the equal/);
    assert.throws(() => epicyclesExpectedFor('f', scene({N: 3})), /only N = 1/);
    assert.throws(() => epicyclesExpectedFor('f', scene({time: Math.PI / 2})), /only t = 0/);
    assert.throws(() => epicyclesExpectedFor('f', fnStep([fnParam('epicycle-control-0-1-x', 1)])), /only sets/);
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
    // K4: P1 = (5, 3), w = sqrt(1/2) (D = (4, 9/5) has barycentric coordinates against A P1 B, Farin points and the shoulder from it.
    const w = Math.SQRT1_2;
    const k4Actions = [{kind: 'projective', operation: 'five-point-load-example', exampleId: 'ellipse'}, {kind: 'projective', operation: 'five-point-set-extrapolation', on: false}];
    const k4 = projectiveConicsExpectedFor('projective-conics.projective-five-point.projective-five-point', step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...k4Actions]}}));
    assert.deepEqual(k4.types, {curve: 3, line: 2, point: 9});
    assert.equal(k4.curveCount, 3);
    const f1 = [(5 + 5 * w) / (1 + w), 3 * w / (1 + w)], f2 = [5 * w / (1 + w), (3 * w + 3) / (1 + w)];
    pointsNear(k4.points, [[5, 0], [0, 3], [-5, 0], [4, 9 / 5], [-3, 12 / 5], [5, 3], f1, f2, [(f1[0] + f2[0]) / 2, (f1[1] + f2[1]) / 2]]);
    // K5: c = 2 misses the circle, so no point shows; the checked curves are the frames, L = 4 and the circle's first vertices.
    const k5Actions = [{kind: 'projective', operation: 'three-views-set-c', tenths: 20}, {kind: 'projective', operation: 'three-views-set-point', on: false}];
    const k5Id = 'projective-conics.projective-three-views.projective-three-views';
    const k5 = projectiveConicsExpectedFor(k5Id, step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...k5Actions]}}));
    assert.deepEqual(k5.types, {curve: 5, point: 0});
    assert.equal(k5.curveCount, 5);
    assert.deepEqual(k5.points, []);
    assert.equal(k5.curves.length, 4);
    pointsNear(k5.curves[0], [[-11.5, -7], [-6, -7], [-0.5, -7]]);
    pointsNear(k5.curves[1], [[0.5, -7], [6, -7], [11.5, -7]]);
    pointsNear(k5.curves[2], [[-11.5, 4], [-6, 4], [-0.5, 4]]);
    pointsNear(k5.curves[3], [[-4, 0], [-6 + 2 * (1 + Math.cos(Math.PI / 60)) / 2, Math.sin(Math.PI / 60)], [-6 + 2 * Math.cos(Math.PI / 60), 2 * Math.sin(Math.PI / 60)]]);
    assert.doesNotThrow(() => assertExpectation(k5Id, k5));
    assert.throws(() => assertExpectation(k5Id, {...k5, curves: []}), /expected.points must be nonempty/);
    assert.throws(() => assertExpectation('x', {...k4, points: []}), /expected.points must be nonempty/);
    const sceneOf = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
    assert.throws(() => projectiveConicsExpectedFor('p.projective-five-point.projective-five-point', sceneOf([k4Actions[0]])), /five-point opening/);
    assert.throws(() => projectiveConicsExpectedFor('p.projective-five-point.projective-five-point', sceneOf([k4Actions[0], {...k4Actions[1], on: true}])), /five-point opening/);
    assert.throws(() => projectiveConicsExpectedFor('p.projective-three-views.projective-three-views', sceneOf([{...k5Actions[0], tenths: 10}, k5Actions[1]])), /three-views opening/);
    assert.throws(() => projectiveConicsExpectedFor('p.projective-three-views.projective-three-views', sceneOf([...k5Actions, {kind: 'projective', operation: 'three-views-set-angle', step: 1}])), /three-views opening/);
    // Other examples, extra actions, wrong operations and unknown lessons have no authored first frame.
    assert.throws(() => projectiveConicsExpectedFor('p.projective-cross-ratio.projective-cross-ratio', pcStep('load-example', 'infinity')), /exactly one load-example of the default example/);
    assert.throws(() => projectiveConicsExpectedFor('p.projective-pascal.projective-pascal', pcStep('pascal-load-example', 'default', [{kind: 'projective', operation: 'pascal-set-conic', conic: 'hyperbola'}])), /exactly one pascal-load-example/);
    assert.throws(() => projectiveConicsExpectedFor('p.projective-pole-polar.projective-pole-polar', pcStep('load-example', 'default')), /exactly one pole-polar-load-example/);
    assert.throws(() => projectiveConicsExpectedFor('p.projective-pole-polar.projective-pole-polar', pcStep('pole-polar-load-example', 'default', [{kind: 'parameter', name: 't', value: 1}])), /prepared scene and one projective/);
    assert.throws(() => projectiveConicsExpectedFor('p.other.other', pcStep('load-example', 'default')), /no authored Projective conics first frame/);
    assert.ok(chapterInventories['projective-conics']);
});

test('curve geometry expectations are authored from the cycloid and the cubic', () => {
    const prepared = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
    const fixture = {kind: 'prepared-scene', sceneId: 'x', source: 'lesson-fixture', curve: {points: [[0, 0], [1, 0], [2, 1], [3, 3]]}};
    const sceneOf = actions => step({scene: {actions}});
    const roll = [prepared, {kind: 'parametric-curve', curve: 'cycloid', radius: 1}, {kind: 'parameter', name: 't', value: 0}, {kind: 'curve-visibility', target: 'parametric-trace-full', visible: false}];
    const hide = visible => [{kind: 'curve-visibility', target: 'curvature-frame', visible}, {kind: 'curve-visibility', target: 'curvature-circle', visible: false}];
    const cubic = [fixture, {kind: 'parameter', name: 't', value: 0.5}, ...hide(false)];
    const rollId = 'curve-geometry.curve-parametric.curve-parametric', bendId = 'curve-geometry.curve-curvature.curve-curvature';
    const l1 = curveGeometryExpectedFor(rollId, sceneOf(roll));
    assert.deepEqual(l1, {types: {circle: 1, segment: 1, point: 2}, curveCount: 0, points: [[0, 0], [0, 1]]});
    const l2 = curveGeometryExpectedFor(bendId, sceneOf(cubic));
    assert.deepEqual(l2, {types: {curve: 1, point: 5}, curveCount: 1, points: [[0, 0], [1, 0], [2, 1], [3, 3], [1.5, 0.75]]});
    assert.doesNotThrow(() => { assertExpectation(rollId, l1); assertExpectation(bendId, l2); });
    // A changed first frame fails instead of being captured under the old expectation.
    assert.throws(() => curveGeometryExpectedFor(rollId, sceneOf(roll.map(item => item.name === 't' ? {...item, value: 1} : item))), /only t = 0 is authored/);
    assert.throws(() => curveGeometryExpectedFor(rollId, sceneOf(roll.map(item => item.curve ? {...item, curve: 'cardioid'} : item))), /only the cycloid of radius 1/);
    assert.throws(() => curveGeometryExpectedFor(rollId, sceneOf([...roll, {kind: 'curve-visibility', target: 'curvature-frame', visible: true}])), /extend curveGeometryExpectedFor/);
    assert.throws(() => curveGeometryExpectedFor(rollId, sceneOf(roll.map(item => item.target ? {...item, visible: true} : item))), /trace must be hidden/);
    assert.throws(() => curveGeometryExpectedFor(rollId, sceneOf(roll.filter(item => !item.target))), /trace must be hidden/);
    assert.throws(() => curveGeometryExpectedFor(bendId, sceneOf(cubic.map(item => item.name === 't' ? {...item, value: 1} : item))), /only t = 0.5 is authored/);
    assert.throws(() => curveGeometryExpectedFor(bendId, sceneOf([fixture, {kind: 'parameter', name: 't', value: 0.5}, ...hide(true)])), /must be hidden/);
    assert.throws(() => curveGeometryExpectedFor(bendId, sceneOf([{...fixture, curve: {points: [[0, 0], [1, 2], [2, -2], [3, 0]]}}, ...cubic.slice(1)])), /only the cubic with control points/);
    assert.throws(() => curveGeometryExpectedFor('curve-geometry.other.other', sceneOf(roll)), /no authored Curve geometry first frame/);
    // L3 comb (cubic, comb hidden) and L4 evolute (parabola at t = 0.75, trace and normal hidden).
    const combId = 'curve-geometry.curve-comb.curve-comb', evoId = 'curve-geometry.curve-evolute.curve-evolute';
    const combScene = [prepared, {kind: 'comb-curve', curve: 'cubic'}, {kind: 'comb-gain', value: 1.4}, {kind: 'curve-visibility', target: 'curvature-comb', visible: false}];
    const evoScene = [prepared, {kind: 'parameter', name: 't', value: 0.75}, {kind: 'evolute-trace', mode: 'hidden'}, {kind: 'curve-visibility', target: 'evolute-normal', visible: false},
        {kind: 'curve-visibility', target: 'curvature-frame', visible: false}, {kind: 'curve-visibility', target: 'curvature-circle', visible: true}];
    const l3 = curveGeometryExpectedFor(combId, sceneOf(combScene));
    assert.deepEqual(l3, {types: {curve: 1, point: 4}, curveCount: 1, points: [[0, 0], [1, 0], [2, 1], [3, 3]]});
    const l4 = curveGeometryExpectedFor(evoId, sceneOf(evoScene));
    assert.deepEqual(l4, {types: {curve: 1, circle: 1, point: 6}, curveCount: 1, points: [[-1, 1], [0, -1], [1, 1], [0.5, 0.25], [-0.5, 1.25]]});
    assert.doesNotThrow(() => { assertExpectation(combId, l3); assertExpectation(evoId, l4); });
    assert.throws(() => curveGeometryExpectedFor(combId, sceneOf(combScene.map(item => item.target ? {...item, visible: true} : item))), /comb must be hidden/);
    assert.throws(() => curveGeometryExpectedFor(combId, sceneOf(combScene.map(item => item.curve ? {...item, curve: 'c1'} : item))), /only the demonstration cubic/);
    assert.throws(() => curveGeometryExpectedFor(evoId, sceneOf(evoScene.map(item => item.name === 't' ? {...item, value: 0.5} : item))), /only t = 0.75 is authored/);
    assert.throws(() => curveGeometryExpectedFor(evoId, sceneOf(evoScene.map(item => item.mode ? {...item, mode: 'full'} : item))), /trace must be hidden/);
    assert.throws(() => curveGeometryExpectedFor(evoId, sceneOf(evoScene.map(item => item.target === 'evolute-normal' ? {...item, visible: true} : item))), /normal and frame hidden/);
    assert.ok(chapterInventories['curve-geometry']);
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
