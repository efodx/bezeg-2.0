const assert = require('node:assert/strict');
const test = require('node:test');
const {fingerprintFor, readableActions, expectedFor, linearMapsExpectedFor, complexMapsExpectedFor, numericalExpectedFor, schoolFunctionGraphsExpectedFor, fourierExpectedFor, fourierCoefficientsExpectedFor, epicyclesExpectedFor, projectiveConicsExpectedFor, curveGeometryExpectedFor, convexityExpectedFor, triangulationExpectedFor, sweepExpectedFor, triangleGeometryExpectedFor, interpolationExpectedFor, probabilityExpectedFor, bsplineExpectedFor, phasePortraitsExpectedFor, trigonometryExpectedFor, analyticLinesExpectedFor, isometriesExpectedFor, circleGeometryExpectedFor, combinatoricsExpectedFor, kinematicsExpectedFor, wavesExpectedFor, assertExpectation, chapterInventories} = require('./generate-guided-example-inventory.cjs');

const step = (overrides = {}) => ({id: 'initial', scene: {actions: [{kind: 'parameter', name: 't', value: 0.5}]}, frames: [{id: 'opening', kind: 'observation'}], ...overrides});

test('advanced Bezier first frames are authored independently, and the Coons net reproduces the blend and the boundaries', () => {
    const {advancedBezierExpectedFor, coonsBoundaries, coonsNetRows} = require('./generate-guided-example-inventory.cjs');
    const {evaluateTensor} = require('./patch-guided-example-expectations.cjs');
    const prepared = {kind: 'prepared-scene', sceneId: 'first', source: 'demonstration-default'};
    const sceneOf = actions => ({id: 'first', scene: {actions}, frames: []});
    const reductionId = 'advanced-bezier.reduction.reduction', arcId = 'advanced-bezier.arc-length-param.arc-length-param', coonsId = 'advanced-bezier.patch-coons.patch-coons';
    const reduction = [prepared, {kind: 'reduction-points', points: [[0, 0], [4 / 3, 8 / 3], [8 / 3, 8 / 3], [4, 0]]}, {kind: 'reduction-mode', mode: 'fixed'},
        {kind: 'curve-visibility', target: 'reduction-quadratic', visible: true}, {kind: 'curve-visibility', target: 'reduction-elevation', visible: true}];
    const d1 = advancedBezierExpectedFor(reductionId, sceneOf(reduction));
    assert.deepEqual(d1.types, {curve: 3, point: 11});
    assert.deepEqual(d1.points.at(-1), [2, 4]);
    assert.throws(() => advancedBezierExpectedFor(reductionId, sceneOf(reduction.map(item => item.mode ? {...item, mode: 'free'} : item))), /only fixed end points/);
    assert.throws(() => advancedBezierExpectedFor(reductionId, sceneOf(reduction.map(item => item.points ? {...item, points: [[0, 0], [1, 3], [3, 3], [4, 0]]} : item))), /only the elevated quadratic/);
    assert.throws(() => advancedBezierExpectedFor(reductionId, sceneOf(reduction.map(item => item.target === 'reduction-elevation' ? {...item, visible: false} : item))), /must be shown/);
    const arc = [prepared, {kind: 'arc-curve', curve: 'bezier'}, {kind: 'arc-pieces', value: 8}, {kind: 'curve-visibility', target: 'arc-equal-t', visible: true},
        {kind: 'curve-visibility', target: 'arc-equal-arc', visible: false}, {kind: 'curve-visibility', target: 'arc-speed-plot', visible: false},
        {kind: 'arc-mover-mode', mode: 'parameter'}, {kind: 'arc-mover-position', value: 0.25}, {kind: 'arc-pause'}];
    const d3 = advancedBezierExpectedFor(arcId, sceneOf(arc));
    assert.deepEqual(d3.types, {curve: 1, point: 14});
    assert.equal(d3.points.length, 11);
    // Q(1/4) = (29/32, 27/16) and Q(1/2) = (2, 9/4) by hand.
    assert.deepEqual(d3.points[5], [29 / 32, 27 / 16]);
    assert.deepEqual(d3.points[7], [2, 9 / 4]);
    assert.throws(() => advancedBezierExpectedFor(arcId, sceneOf(arc.map(item => item.target === 'arc-equal-arc' ? {...item, visible: true} : item))), /only the equal-t points/);
    assert.throws(() => advancedBezierExpectedFor(arcId, sceneOf(arc.map(item => item.kind === 'arc-pieces' ? {...item, value: 4} : item))), /only N = 8/);
    const coons = [prepared, prepared, {kind: 'coons', operation: 'set-linked-corners', linked: true}, {kind: 'coons', operation: 'set-shown', shown: 's'}];
    const d4 = advancedBezierExpectedFor(coonsId, sceneOf(coons));
    assert.deepEqual(d4.surface.owners.map(owner => [owner.id, owner.kind]), [['tensor-patch-0', 'tensor']]);
    assert.throws(() => advancedBezierExpectedFor(coonsId, sceneOf(coons.map(item => item.shown ? {...item, shown: 'lc'} : item))), /only S of the unmoved/);
    assert.throws(() => advancedBezierExpectedFor(coonsId, sceneOf([...coons, {kind: 'coons', operation: 'move-point', name: 'c0', index: 1, xyz: [1, 0, 3]}])), /only S of the unmoved/);
    const clippingId = 'advanced-bezier.bezier-clipping.bezier-clipping';
    const clippingPair = [[0, 0], [2, 4], [4, 0], [0, 3], [2, -1], [4, 3]];
    const clippingOverlay = (overlay, visible) => ({kind: 'point-set', operation: 'set-overlay', overlay, visible});
    const clipping = [prepared, {kind: 'point-set', operation: 'load-model', points: clippingPair, gridStepExponent: 0}, {kind: 'point-set', operation: 'set-clip-tolerance', exponent: 6},
        clippingOverlay('control', true), clippingOverlay('hull', true), clippingOverlay('fatLine', false), clippingOverlay('kept', false), clippingOverlay('discarded', false),
        {kind: 'point-set', operation: 'set-trace-step', step: 0}];
    const d2 = advancedBezierExpectedFor(clippingId, sceneOf(clipping));
    assert.deepEqual(d2.types, {curve: 4, point: 6, polygon: 2, segment: 6});
    assert.deepEqual(d2.points, clippingPair);
    assert.throws(() => advancedBezierExpectedFor(clippingId, sceneOf(clipping.map(item => item.operation === 'set-trace-step' ? {...item, step: 4} : item))), /only the crossing pair/);
    assert.throws(() => advancedBezierExpectedFor(clippingId, sceneOf(clipping.map(item => item.overlay === 'fatLine' ? {...item, visible: true} : item))), /only the crossing pair/);
    assert.throws(() => advancedBezierExpectedFor(clippingId, sceneOf(clipping.map(item => item.operation === 'load-model' ? {...item, points: [...clippingPair.slice(0, 3), [0, 4], [2, 0], [4, 4]]} : item))), /only the crossing pair/);
    assert.throws(() => advancedBezierExpectedFor(clippingId, sceneOf(clipping.slice(1))), /must start from the Demonstration default/);
    const fixture = {m: 3, n: 3, net: coonsNetRows(coonsBoundaries)};
    const bezier = (net, t) => [0, 1, 2].map(axis => (1 - t) ** 3 * net[0][axis] + 3 * (1 - t) ** 2 * t * net[1][axis] + 3 * (1 - t) * t ** 2 * net[2][axis] + t ** 3 * net[3][axis]);
    for (const s of [0, 0.25, 0.5, 1]) {
        const near = (actual, expected) => actual.forEach((value, axis) => assert.ok(Math.abs(value - expected[axis]) < 1e-12));
        near(evaluateTensor(fixture, s, 0), bezier(coonsBoundaries.c0, s));
        near(evaluateTensor(fixture, s, 1), bezier(coonsBoundaries.c1, s));
        near(evaluateTensor(fixture, 0, s), bezier(coonsBoundaries.d0, s));
        near(evaluateTensor(fixture, 1, s), bezier(coonsBoundaries.d1, s));
    }
    // The lesson's worked centre: z(S(1/2, 1/2)) = 0.375 + 0.375 - 0.
    assert.ok(Math.abs(evaluateTensor(fixture, 0.5, 0.5)[2] - 0.75) < 1e-12);
});

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
    // A scene may open on one explicit matrix instead of a named example (L7 opens on columns (1,1) and (-1,1)).
    const explicit = linearMapsExpectedFor('lm', lmStep([{kind: 'linear-map', operation: 'set-matrix', matrix: [[1, -1], [1, 1]]}]));
    assert.deepEqual(explicit.points, [[1, 0], [0, 1], [0, 0], [0, 2], [1, 1], [0, 2], [1, 1], [-1, 1]]);
    // The composition mode on its defaults (L5): the fixture's four control points and their images under FR = [[0,-1],[-1,0]].
    const compositionStep = extra => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'},
        {kind: 'linear-map', operation: 'set-mode', mode: 'composition'}, ...extra]}});
    const composition = linearMapsExpectedFor('lm', compositionStep([]));
    assert.deepEqual(composition.types, {curve: 5, point: 8});
    assert.deepEqual(composition.points.slice(4), [[0, -1], [-3, -2], [-2, -4], [1, -5]]);
    assert.throws(() => linearMapsExpectedFor('lm', compositionStep([lmExample('identity')])),
        /default composition mode alone/);
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

test('a family-backed chapter inventory covers exactly the registered Demonstration rows on their registered routes', () => {
    const {assertFamilyIdentities} = require('./generate-guided-example-inventory.cjs');
    const rows = [{id: 'a', path: '/bezeg-2.0/f/a'}, {id: 'b', path: '/bezeg-2.0/f/b'}];
    const examples = [{id: 'c.a.a', demonstrationId: 'a', path: '/bezeg-2.0/f/a?example=x'}, {id: 'c.b.b', demonstrationId: 'b', path: '/bezeg-2.0/f/b?example=y'}];
    assert.doesNotThrow(() => assertFamilyIdentities('c', examples, rows));
    assert.throws(() => assertFamilyIdentities('c', examples.slice(1), rows), /registered Demonstration a has no example/);
    assert.throws(() => assertFamilyIdentities('c', [...examples, {id: 'c.z.z', demonstrationId: 'z', path: '/bezeg-2.0/f/z'}], rows), /z is not a registered c Demonstration/);
    assert.throws(() => assertFamilyIdentities('c', [{...examples[0], path: '/bezeg-2.0/f/b'}, examples[1]], rows), /registered route/);
    assert.throws(() => assertFamilyIdentities('c', examples, undefined), /rows are missing/);
    assert.ok(chapterInventories['projective-conics'].identities.module.endsWith('/projective/registration.ts'));
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
    // L5 offset (the segment at d = -1/2, the offset shown) and L6 envelope (four lines, the curve and the touching point hidden).
    const offId = 'curve-geometry.curve-offset.curve-offset', envId = 'curve-geometry.curve-envelope.curve-envelope';
    const offScene = [{...fixture, curve: {points: [[-1, 0], [0, 0], [1, 0]]}}, {kind: 'offset-distance', value: -0.5}, {kind: 'offset-samples', value: 128},
        {kind: 'curve-visibility', target: 'offset-trace', visible: true}, {kind: 'curve-visibility', target: 'offset-cusps', visible: false}, {kind: 'curve-visibility', target: 'offset-speed-plot', visible: false}];
    const envScene = [{...fixture, curve: {points: [[1, 0], [0, 0], [0, 1]]}}, {kind: 'envelope-t', value: 0.5}, {kind: 'envelope-lines', value: 4},
        {kind: 'curve-visibility', target: 'envelope-lines', visible: true}, {kind: 'curve-visibility', target: 'envelope-curve', visible: false}, {kind: 'curve-visibility', target: 'envelope-touch', visible: false}];
    const l5 = curveGeometryExpectedFor(offId, sceneOf(offScene));
    assert.deepEqual(l5, {types: {curve: 2, point: 3}, curveCount: 2, points: [[-1, 0], [0, 0], [1, 0]]});
    const l6 = curveGeometryExpectedFor(envId, sceneOf(envScene));
    assert.deepEqual(l6, {types: {curve: 1, point: 3}, curveCount: 1, points: [[1, 0], [0, 0], [0, 1]]});
    assert.doesNotThrow(() => { assertExpectation(offId, l5); assertExpectation(envId, l6); });
    assert.throws(() => curveGeometryExpectedFor(offId, sceneOf(offScene.map(item => item.kind === 'offset-distance' ? {...item, value: -1} : item))), /only d = -1\/2 is authored/);
    assert.throws(() => curveGeometryExpectedFor(offId, sceneOf(offScene.map(item => item.target === 'offset-cusps' ? {...item, visible: true} : item))), /cusps and speed plot hidden/);
    assert.throws(() => curveGeometryExpectedFor(offId, sceneOf(offScene.map(item => item.curve ? {...item, curve: {points: [[0, 0], [1, 1], [2, 0]]}} : item))), /only the segment/);
    assert.throws(() => curveGeometryExpectedFor(envId, sceneOf(envScene.map(item => item.kind === 'envelope-lines' ? {...item, value: 8} : item))), /only four lines are authored/);
    assert.throws(() => curveGeometryExpectedFor(envId, sceneOf(envScene.map(item => item.target === 'envelope-curve' ? {...item, visible: true} : item))), /curve and the touching point hidden/);
    assert.throws(() => curveGeometryExpectedFor(envId, sceneOf(envScene.map(item => item.curve ? {...item, curve: {points: [[0, 0], [1, 1], [2, 0]]}} : item))), /only the controls/);
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

const psStep = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
const psPoints = (points, mode = 'points', closed) => ({kind: 'point-set', operation: 'set-points', mode, ...(closed === undefined ? {} : {closed}), points});
const psOverlay = (overlay, visible) => ({kind: 'point-set', operation: 'set-overlay', overlay, visible});
const psOp = (operation, extra) => ({kind: 'point-set', operation, ...extra});
const psNext = () => ({kind: 'animation', animationId: 'algorithm-trace', command: 'next-step'});

test('convexity expectations are authored from the graphs: orientation line, area fan, notched pentagon and query point', () => {
    const line = [psPoints([[0, 0], [4, 0]]), psOverlay('turn', true), psOverlay('values', true)];
    assert.deepEqual(convexityExpectedFor('c.orientation.orientation', psStep(line)), {types: {point: 2, line: 1}, curveCount: 0, points: [[0, 0], [4, 0]]});
    assert.throws(() => convexityExpectedFor('c.orientation.orientation', psStep([psPoints([[0, 0], [4, 0], [3, 2]]), psOverlay('turn', true)])), /only the two-point line/);
    assert.throws(() => convexityExpectedFor('c.orientation.orientation', psStep([...line, psOp('set-algorithm', {algorithm: 'gift-wrapping'})])), /only uses point-set/);
    assert.throws(() => convexityExpectedFor('c.orientation.orientation', psStep([line[0], psOverlay('turn', false)])), /turn overlay/);
    const pentagon = [[-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]];
    const fan = [psPoints(pentagon, 'polygon', true), psOverlay('fan', true), psOverlay('lattice', false), psOverlay('values', false)];
    // Five vertices: five edges, two diagonals from v0, three nonzero fan triangles.
    assert.deepEqual(convexityExpectedFor('c.polygon-area.polygon-area', psStep(fan)), {types: {point: 5, segment: 5, curve: 2, polygon: 3}, curveCount: 2, points: pentagon});
    // A fan triangle of area zero is not drawn: v0, v1, v2 collinear leaves two filled triangles.
    assert.equal(convexityExpectedFor('c.polygon-area.polygon-area', psStep([psPoints([[0, 0], [1, 0], [2, 0], [2, 2], [0, 2]], 'polygon', true), ...fan.slice(1)])).types.polygon, 2);
    assert.throws(() => convexityExpectedFor('c.polygon-area.polygon-area', psStep([fan[0], psOverlay('fan', true), psOverlay('lattice', true), psOverlay('values', false)])), /without lattice markers/);
    assert.throws(() => convexityExpectedFor('c.polygon-area.polygon-area', psStep([psPoints(pentagon, 'points'), ...fan.slice(1)])), /closed polygon/);
    const pip = [psOp('set-polygon', {polygon: 'notched'}), psOp('set-query-point', {point: [3, 1]}), psOverlay('ray', false), psOverlay('winding', false), psOverlay('values', true)];
    assert.deepEqual(convexityExpectedFor('c.point-in-polygon.point-in-polygon', psStep(pip)),
        {types: {point: 6, segment: 5}, curveCount: 0, points: [[0, 0], [6, 0], [6, 4], [3, 2], [0, 4], [3, 1]]});
    assert.throws(() => convexityExpectedFor('c.point-in-polygon.point-in-polygon', psStep([psOp('set-polygon', {polygon: 'pentagram'}), ...pip.slice(1)])), /only the notched/);
    assert.throws(() => convexityExpectedFor('c.point-in-polygon.point-in-polygon', psStep([...pip.slice(0, 2), psOverlay('ray', true)])), /without the ray/);
    assert.throws(() => convexityExpectedFor('c.point-in-polygon.point-in-polygon', psStep(pip.slice(1))), /exactly once/);
});

test('convexity expectations are authored from the traces: slow edge test step 0, chain end, curve pair hulls', () => {
    const slow = [psOp('set-algorithm', {algorithm: 'slow-edge-test'}), psOverlay('trace', true), psOverlay('hull', true)];
    assert.deepEqual(convexityExpectedFor('c.convex-hull.convex-hull', psStep(slow)).types, {point: 9, curve: 2});
    assert.throws(() => convexityExpectedFor('c.convex-hull.convex-hull', psStep([psOp('set-algorithm', {algorithm: 'gift-wrapping'}), ...slow.slice(1)])), /only the slow edge test/);
    assert.throws(() => convexityExpectedFor('c.convex-hull.convex-hull', psStep([...slow, psNext()])), /only uses point-set/);
    const chain = [psOp('set-mode', {mode: 'chain'}), psOp('set-pop-rule', {rule: 'right'}), psOp('set-duplicates', {duplicates: 'merge'}), psPoints([[0, 0], [2, 0], [4, 0]]),
        psOverlay('trace', true), psOverlay('hull', true), ...Array.from({length: 11}, psNext)];
    assert.deepEqual(convexityExpectedFor('c.hull-robustness.hull-robustness', psStep(chain)),
        {types: {point: 3, curve: 2, polygon: 1, segment: 4}, curveCount: 2, points: [[0, 0], [2, 0], [4, 0]]});
    assert.throws(() => convexityExpectedFor('c.hull-robustness.hull-robustness', psStep(chain.slice(0, -1))), /exactly 11 next steps/);
    assert.throws(() => convexityExpectedFor('c.hull-robustness.hull-robustness', psStep([psOp('set-pop-rule', {rule: 'non-left'}), ...chain.filter(item => item.operation !== 'set-pop-rule')])), /right pop rule/);
    assert.throws(() => convexityExpectedFor('c.hull-robustness.hull-robustness', psStep([...chain, {kind: 'animation', animationId: 'algorithm-trace', command: 'play'}])), /only uses point-set/);
    const net = [[0, 0], [2, 4], [4, 0], [0, 3], [2, -1], [4, 3]];
    const hulls = [psPoints(net), psOverlay('control', true), psOverlay('hull', true), psOverlay('pieces', false), psOp('set-trace-step', {step: 0})];
    assert.deepEqual(convexityExpectedFor('c.bezier-hulls.bezier-hulls', psStep(hulls)), {types: {point: 6, curve: 4, polygon: 2, segment: 6}, curveCount: 4, points: net});
    assert.throws(() => convexityExpectedFor('c.bezier-hulls.bezier-hulls', psStep([...hulls.slice(0, 3), psOverlay('pieces', true), hulls[4]])), /without the pieces/);
    assert.throws(() => convexityExpectedFor('c.bezier-hulls.bezier-hulls', psStep([psPoints([[0, 0], [1, 1], [2, 2], [0, 3], [2, -1], [4, 3]]), ...hulls.slice(1)])), /triangle hull/);
    assert.throws(() => convexityExpectedFor('c.bezier-hulls.bezier-hulls', psStep([hulls[0], hulls[1], hulls[2], hulls[3], psOp('set-trace-step', {step: 2})])), /only trace step 0/);
    assert.throws(() => convexityExpectedFor('c.unknown.unknown', psStep(hulls)), /no authored Convexity/);
    assert.ok(chapterInventories['convexity-hulls']);
});

test('triangulation expectations are authored from the graphs: ear polygon, point set, named triangulation, sites and query point', () => {
    const quad = [[0, 0], [4, 0], [5, 3], [0, 2]];
    const notched = [[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]];
    const ear = [psPoints(notched, 'polygon', true), psOverlay('trace', true), psOverlay('reflex', true), psOverlay('triangulation', false), psOverlay('colouring', false), psOverlay('guards', false)];
    // Five vertices, five edges, one reflex vertex (3, 2) drawn as an extra marker point; the trace draws nothing at step 0.
    assert.deepEqual(triangulationExpectedFor('t.ear-clipping.ear-clipping', psStep(ear)), {types: {point: 6, segment: 5}, curveCount: 0, points: notched});
    assert.throws(() => triangulationExpectedFor('t.ear-clipping.ear-clipping', psStep([ear[0], psOverlay('trace', true), psOverlay('reflex', true), psOverlay('guards', true)])), /without the triangulation, colouring and guard/);
    assert.throws(() => triangulationExpectedFor('t.ear-clipping.ear-clipping', psStep([...ear, psNext()])), /only uses point-set/);
    assert.throws(() => triangulationExpectedFor('t.ear-clipping.ear-clipping', psStep([psPoints(notched, 'points'), ...ear.slice(1)])), /closed polygon/);
    const seven = [[0, 0], [8, 0], [9, 6], [4, 8], [-1, 5], [3, 3], [6, 3]];
    const set = [psPoints(seven), psOverlay('triangulation', false), psOverlay('edges', false), psOverlay('angles', false)];
    assert.deepEqual(triangulationExpectedFor('t.point-set-triangulation.point-set-triangulation', psStep(set)), {types: {point: 7}, curveCount: 0, points: seven});
    assert.throws(() => triangulationExpectedFor('t.point-set-triangulation.point-set-triangulation', psStep([set[0], psOverlay('triangulation', true)])), /without triangulation/);
    const del = [psPoints(quad), psOverlay('triangulation', true), psOverlay('edges', false), psOverlay('angles', false), psOp('set-triangulation', {triangles: [[0, 1, 2], [0, 2, 3]]})];
    // Five edges, two triangle polygons and the diagonal 0-2, which is illegal (point 3 is inside the circle of 0, 1, 2): one extra dashed curve and one label.
    assert.deepEqual(triangulationExpectedFor('t.delaunay.delaunay', psStep(del)), {types: {point: 4, curve: 6, polygon: 2, text: 1}, curveCount: 6, points: quad});
    // The other diagonal 1-3 is the Delaunay one: five curves and no label.
    assert.deepEqual(triangulationExpectedFor('t.delaunay.delaunay', psStep([...del.slice(0, 4), psOp('set-triangulation', {triangles: [[0, 1, 3], [1, 2, 3]]})])).types, {point: 4, curve: 5, polygon: 2});
    assert.throws(() => triangulationExpectedFor('t.delaunay.delaunay', psStep(del.slice(0, 4))), /exactly once/);
    assert.throws(() => triangulationExpectedFor('t.delaunay.delaunay', psStep([...del.slice(0, 2), psOverlay('edges', true), ...del.slice(3)])), /without edge and angle/);
    const vor = [psPoints(seven), psOverlay('grid', false), psOverlay('diagram', false), psOverlay('delaunay', false), psOp('select-site', {site: null}), psOp('set-query-point', {point: [-2, 1]})];
    assert.deepEqual(triangulationExpectedFor('t.voronoi.voronoi', psStep(vor)), {types: {point: 8}, curveCount: 0, points: [...seven, [-2, 1]]});
    assert.throws(() => triangulationExpectedFor('t.voronoi.voronoi', psStep([...vor.slice(0, 4), psOp('select-site', {site: 2}), vor[5]])), /without a selected site/);
    assert.throws(() => triangulationExpectedFor('t.voronoi.voronoi', psStep([vor[0], psOverlay('diagram', true), ...vor.slice(3)])), /without diagram and Delaunay/);
    assert.throws(() => triangulationExpectedFor('t.voronoi.voronoi', psStep(vor.slice(0, 5))), /exactly once/);
    const degenerate = [psOp('set-mode', {mode: 'sites'}), psPoints([[5, 0], [3, 4], [-4, 3], [1, -5]]), psOverlay('grid', false), psOverlay('diagram', false), psOverlay('delaunay', false)];
    assert.deepEqual(triangulationExpectedFor('t.voronoi-degenerate.voronoi-degenerate', psStep(degenerate)),
        {types: {point: 5}, curveCount: 0, points: [[5, 0], [3, 4], [-4, 3], [1, -5], [4, 2]]});
    assert.throws(() => triangulationExpectedFor('t.voronoi-degenerate.voronoi-degenerate', psStep([psOp('set-mode', {mode: 'four-point'}), ...degenerate.slice(1)])), /only the sites mode/);
    assert.throws(() => triangulationExpectedFor('t.unknown.unknown', psStep(del)), /no authored Triangulations and Voronoi/);
    assert.ok(chapterInventories['triangulations-voronoi']);
});

test('sweep expectations are authored from the graphs: intervals, segments, polygon, the piece at step 15 and sites', () => {
    const intervals = [[0, 1], [4, 1], [2, 2], [7, 2]];
    // Two intervals: four endpoints, two segments, two labels, and the sweep line with its idle current-interval curve at step 0.
    assert.deepEqual(sweepExpectedFor('s.interval-sweep.interval-sweep', psStep([psPoints(intervals, 'intervals')])),
        {types: {point: 4, segment: 2, text: 2, curve: 2}, curveCount: 2, points: intervals});
    assert.throws(() => sweepExpectedFor('s.interval-sweep.interval-sweep', psStep([psPoints(intervals, 'segments')])), /only an interval set/);
    assert.throws(() => sweepExpectedFor('s.interval-sweep.interval-sweep', psStep([psPoints(intervals, 'intervals'), psOp('set-trace-step', {step: 3})])), /first step/);
    const segments = [[0, 0], [6, 4], [0, 4], [6, 0]];
    assert.deepEqual(sweepExpectedFor('s.segment-intersections.segment-intersections', psStep([psPoints(segments, 'segments')])),
        {types: {point: 4, segment: 2, text: 2}, curveCount: 0, points: segments});
    assert.throws(() => sweepExpectedFor('s.segment-intersections.segment-intersections', psStep([psPoints(segments, 'segments'), psNext()])), /only uses point-set/);
    assert.throws(() => sweepExpectedFor('s.segment-intersections.segment-intersections', psStep([])), /exactly once/);
    const polygon = [[0, 0], [4, 3], [8, 0], [12, 8], [8, 5], [4, 8]];
    assert.deepEqual(sweepExpectedFor('s.monotone-partition.monotone-partition', psStep([psPoints(polygon, 'polygon', true)])),
        {types: {point: 6, segment: 6, curve: 1}, curveCount: 1, points: polygon});
    assert.throws(() => sweepExpectedFor('s.monotone-partition.monotone-partition', psStep([psPoints(polygon, 'polygon', false)])), /closed polygon/);
    assert.deepEqual(sweepExpectedFor('s.monotone-triangulation.monotone-triangulation', psStep([psPoints(polygon, 'polygon', true), psOp('set-trace-step', {step: 15})])),
        {types: {point: 11, segment: 10, curve: 5, text: 4, polygon: 1}, curveCount: 5, points: polygon});
    assert.throws(() => sweepExpectedFor('s.monotone-triangulation.monotone-triangulation', psStep([psPoints(polygon, 'polygon', true), psOp('set-trace-step', {step: 0})])), /only step 15/);
    assert.throws(() => sweepExpectedFor('s.monotone-triangulation.monotone-triangulation', psStep([psPoints(polygon.slice(0, 5), 'polygon', true), psOp('set-trace-step', {step: 15})])), /lesson polygon/);
    const sites = [[0, 5], [-4, 3], [4, 3], [0, -3]];
    assert.deepEqual(sweepExpectedFor('s.fortune.fortune', psStep([psPoints(sites), psOp('set-trace-step', {step: 0})])), {types: {point: 4, curve: 1}, curveCount: 1, points: sites});
    assert.throws(() => sweepExpectedFor('s.fortune.fortune', psStep([psPoints(sites), psOp('set-trace-step', {step: 7})])), /queued first step/);
    assert.throws(() => sweepExpectedFor('s.fortune.fortune', psStep([psPoints(sites), psOp('set-trace-step', {step: 0}), psOverlay('grid', false)])), /only uses point-set/);
    assert.throws(() => sweepExpectedFor('s.unknown.unknown', psStep([psPoints(sites)])), /no authored Sweep algorithms/);
    assert.ok(chapterInventories['sweep-algorithms']);
});

test('triangle geometry expectations are authored from the graphs: centroid, inscribed angle, Euler centres, Simson feet and the power secant', () => {
    const all = (names, shown) => names.map(name => psOverlay(name, shown.includes(name)));
    const notable = ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre'];
    const lesson = [[0, 0], [7, 0], [2, 5]];
    assert.deepEqual(triangleGeometryExpectedFor('t.notable-points.triangle-centres', psStep(all(notable, ['triangle', 'centroid']))),
        {types: {point: 4, segment: 6, text: 1}, curveCount: 0, points: lesson});
    assert.throws(() => triangleGeometryExpectedFor('t.notable-points.triangle-centres', psStep(all(notable, ['triangle']))), /centroid must be shown/);
    assert.throws(() => triangleGeometryExpectedFor('t.notable-points.triangle-centres', psStep([...all(notable, ['triangle', 'centroid']), psPoints(lesson)])), /only sets the overlays/);
    const inscribed = ['radii', 'angles'];
    const glider = value => ({kind: 'parameter', name: 't', value});
    assert.deepEqual(triangleGeometryExpectedFor('t.inscribed-angle.inscribed-angle', psStep([...all(inscribed, ['angles']), glider(90)])),
        {types: {point: 5, circle: 1, segment: 5, curve: 3, text: 1}, curveCount: 3, points: lesson});
    assert.throws(() => triangleGeometryExpectedFor('t.inscribed-angle.inscribed-angle', psStep([...all(inscribed, ['angles']), glider(60)])), /90 degrees/);
    const euler = ['triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle'];
    assert.deepEqual(triangleGeometryExpectedFor('t.euler-line.euler-line', psStep(all(euler, ['triangle', 'centres']))),
        {types: {point: 6, segment: 3, text: 1}, curveCount: 0, points: lesson});
    assert.throws(() => triangleGeometryExpectedFor('t.euler-line.euler-line', psStep(all(euler, ['triangle', 'centres', 'line']))), /line must be hidden/);
    const simson = ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson', 'pedal'];
    assert.deepEqual(triangleGeometryExpectedFor('t.simson-line.simson-line', psStep([...all(simson, ['triangle', 'sidelines', 'circumcircle']), glider(250)])),
        {types: {point: 8, segment: 3, line: 3, circle: 1, text: 1}, curveCount: 0, points: lesson});
    assert.throws(() => triangleGeometryExpectedFor('t.simson-line.simson-line', psStep([...all(simson, ['triangle', 'sidelines', 'circumcircle']), glider(150)])), /250 degrees/);
    const inversion = ['inversion-circle', 'rays', 'image', 'secant', 'tangent', 'angle-tangents'];
    const power = {kind: 'inversion', operation: 'load-example', exampleId: 'power'};
    assert.deepEqual(triangleGeometryExpectedFor('t.inversion.inversion', psStep([power, ...all(inversion, ['secant'])])),
        {types: {point: 5, circle: 1, line: 1, text: 1}, curveCount: 0, points: [[0, 0]]});
    assert.throws(() => triangleGeometryExpectedFor('t.inversion.inversion', psStep([{...power, exampleId: 'angle'}, ...all(inversion, ['secant'])])), /only sets the overlays/);
    assert.throws(() => triangleGeometryExpectedFor('t.inversion.inversion', psStep([power, {kind: 'inversion', operation: 'set-theta', degrees: 20}, ...all(inversion, ['secant'])])), /only sets the overlays/);
    assert.throws(() => triangleGeometryExpectedFor('t.unknown.unknown', psStep([])), /no authored Triangle geometry/);
    assert.ok(chapterInventories['triangle-geometry']);
});

test('interpolation expectations are authored from the graphs: the Lagrange marker, Runge nodes, Hermite tips, the manual residuals and the Chaikin polygon', () => {
    const op = (kind, operation, extra) => ({kind, operation, ...extra});
    const overlays = (kind, names, shown) => names.map(name => op(kind, 'set-overlay', {overlay: name, visible: shown.includes(name)}));
    const lagrange = (shown = [], position = 0.5, rule = 'uniform') => psStep([op('interpolation', 'set-rule', {rule}), ...overlays('interpolation', ['hull', 'bezier', 'basis'], shown), {kind: 'parameter', name: 't', value: position}]);
    assert.deepEqual(interpolationExpectedFor('i.lagrange.interp-lagrange', lagrange()),
        {types: {point: 5, curve: 1}, curveCount: 1, points: [[0, 0], [1, 2], [3, 3], [4, 0], [2, 2.8125]]});
    assert.deepEqual(interpolationExpectedFor('i.lagrange.interp-lagrange', lagrange([], 0)).points.at(-1), [0, 0]);
    assert.throws(() => interpolationExpectedFor('i.lagrange.interp-lagrange', lagrange(['hull'])), /hull must be hidden/);
    assert.throws(() => interpolationExpectedFor('i.lagrange.interp-lagrange', lagrange([], 0.5, 'chordal')), /uniform parameter rule/);
    assert.throws(() => interpolationExpectedFor('i.lagrange.interp-lagrange', psStep([...lagrange().scene.actions.slice(1), op('interpolation', 'add-point')])), /only uses interpolation/);
    const runge = (degree = 6, rule = 'equispaced', shown = [], functionId = 'runge') => psStep([op('runge', 'set-function', {function: functionId}), op('runge', 'set-degree', {value: degree}),
        op('runge', 'set-rule', {rule}), ...overlays('runge', ['error', 'semicircle'], shown)]);
    const rungeNodes = interpolationExpectedFor('i.runge.interp-runge', runge());
    assert.deepEqual({...rungeNodes, points: undefined}, {types: {point: 7, curve: 2}, curveCount: 2, points: undefined});
    assert.deepEqual(rungeNodes.points.map(p => p[0]), [-1, -0.6666667, -0.3333333, 0, 0.3333333, 0.6666667, 1]);
    assert.deepEqual([rungeNodes.points[0][1], rungeNodes.points[3][1]], [Number((1 / 26).toFixed(7)), 1]);
    assert.throws(() => interpolationExpectedFor('i.runge.interp-runge', runge(6, 'chebyshev')), /equally spaced/);
    assert.throws(() => interpolationExpectedFor('i.runge.interp-runge', runge(6, 'equispaced', ['error'])), /error must be hidden/);
    assert.throws(() => interpolationExpectedFor('i.runge.interp-runge', runge(6, 'equispaced', [], 'abs')), /only the Runge function/);
    const hermite = (mode = 'hermite', shown = ['tangents']) => psStep([op('hermite', 'set-rule', {rule: 'uniform'}), op('hermite', 'set-tension', {value: 1}), op('hermite', 'set-mode', {mode}),
        ...overlays('hermite', ['tangents', 'bezier'], shown)]);
    assert.deepEqual(interpolationExpectedFor('i.hermite.interp-hermite', hermite()),
        {types: {point: 8, curve: 1, arrow: 4, text: 1}, curveCount: 1, points: [[0, 0], [1, 2], [3, 3], [4, 0], [1, 2], [2.5, 3.5], [4.5, 2], [5, -3]]});
    assert.throws(() => interpolationExpectedFor('i.hermite.interp-hermite', hermite('catmull-rom')), /only the Hermite mode/);
    assert.throws(() => interpolationExpectedFor('i.hermite.interp-hermite', hermite('hermite', ['tangents', 'bezier'])), /Bezier overlay must be hidden/);
    const lsq = (shown = [], line = {slope: 0, intercept: 2}, degree = 1) => psStep([op('lsq', 'set-degree', {value: degree}), op('lsq', 'set-line', line), op('lsq', 'set-mode', {mode: 'manual'}),
        ...overlays('lsq', ['squares', 'normal-equations'], shown)]);
    assert.deepEqual(interpolationExpectedFor('i.least-squares.interp-least-squares', lsq()),
        {types: {point: 4, curve: 2}, curveCount: 2, points: [[0, 1], [1, 2], [2, 2], [3, 4]]});
    assert.throws(() => interpolationExpectedFor('i.least-squares.interp-least-squares', lsq(['squares'])), /squares must be hidden/);
    assert.throws(() => interpolationExpectedFor('i.least-squares.interp-least-squares', lsq([], {slope: 1, intercept: 1})), /y = 2/);
    assert.throws(() => interpolationExpectedFor('i.least-squares.interp-least-squares', psStep([op('lsq', 'set-point', {index: 3, x: 3, y: 8}), ...lsq().scene.actions.slice(1)])), /only uses lsq/);
    const subdivision = (rule = 'chaikin', closed = false, shown = []) => psStep([op('subdivision', 'set-rule', {rule}), op('subdivision', 'set-closed', {closed}), ...overlays('subdivision', ['limit'], shown)]);
    assert.deepEqual(interpolationExpectedFor('i.subdivision.interp-subdivision', subdivision()),
        {types: {point: 8, curve: 2, text: 1}, curveCount: 2, points: [[0, 0], [1, 2], [3, 3], [4, 0], [0, 0], [1, 2], [3, 3], [4, 0]]});
    assert.throws(() => interpolationExpectedFor('i.subdivision.interp-subdivision', subdivision('four-point')), /only the Chaikin rule/);
    assert.throws(() => interpolationExpectedFor('i.subdivision.interp-subdivision', subdivision('chaikin', true)), /only the open polygon/);
    assert.throws(() => interpolationExpectedFor('i.subdivision.interp-subdivision', subdivision('chaikin', false, ['limit'])), /limit overlay must be hidden/);
    assert.throws(() => interpolationExpectedFor('i.subdivision.interp-subdivision', psStep([...subdivision().scene.actions.slice(1), {kind: 'animation', animationId: 'interp-subdivision-rounds', command: 'next-step'}])), /only uses subdivision/);
    assert.throws(() => interpolationExpectedFor('i.unknown.unknown', psStep([])), /no authored Interpolation/);
    assert.ok(chapterInventories.interpolation);
});

test('probability expectations are authored from the graphs: density ends, the binomial threshold, the CLT curves, the stacked dots and the scatter', () => {
    const choice = (name, value) => ({kind: 'function-choice', name, value});
    const param = (name, value) => ({kind: 'function-parameter', name, value});
    const shown = (target, visible) => ({kind: 'function-visibility', target, visible});
    const density = (example = 'standard', a = -1.5, b = 0.5) => psStep([choice('density-example', example), param('density-a', a), param('density-b', b)]);
    assert.deepEqual(probabilityExpectedFor('p.density.prob-density', density()), {types: {curve: 2, point: 2, text: 1}, curveCount: 2, points: [[-1.5, 0], [0.5, 0]]});
    assert.throws(() => probabilityExpectedFor('p.density.prob-density', density('iq')), /only the standard normal/);
    assert.throws(() => probabilityExpectedFor('p.density.prob-density', psStep([choice('density-example', 'standard'), param('density-a', 0), param('density-b', 1), param('density-mu', 1)])), /only sets/);
    const binomial = (example = 'fair20', k = 10) => psStep([choice('binomial-normal-example', example), param('binomial-k', k)]);
    assert.deepEqual(probabilityExpectedFor('p.binomial-normal.prob-binomial-normal', binomial()), {types: {curve: 4, point: 1, text: 1}, curveCount: 4, points: [[10, 0]]});
    assert.throws(() => probabilityExpectedFor('p.binomial-normal.prob-binomial-normal', binomial('fair100')), /only the fair20/);
    assert.throws(() => probabilityExpectedFor('p.binomial-normal.prob-binomial-normal', binomial('fair20', 2.5)), /whole number/);
    assert.throws(() => probabilityExpectedFor('p.binomial-normal.prob-binomial-normal', psStep([choice('binomial-normal-example', 'fair20'), shown('poisson-bars', true)])), /only sets/);
    assert.deepEqual(probabilityExpectedFor('p.clt.prob-clt', psStep([choice('clt-example', 'uniform')])), {types: {curve: 2}, curveCount: 2, points: [], curves: [[[-6, 0], [-5.99, 0], [-5.98, 0]]]});
    assert.throws(() => probabilityExpectedFor('p.clt.prob-clt', psStep([choice('clt-example', 'skewed')])), /only the uniform/);
    assert.throws(() => probabilityExpectedFor('p.clt.prob-clt', psStep([choice('clt-example', 'uniform'), {kind: 'animation', animationId: 'clt-sum', command: 'next-step'}])), /only sets/);
    const summary = (box = false, band = false) => psStep([shown('summary-box-plot', box), shown('summary-sigma-band', band)]);
    assert.deepEqual(probabilityExpectedFor('p.summary.prob-summary', summary()), {types: {point: 9, text: 3}, curveCount: 0,
        points: [[5.8571429, -0.5], [6, -0.95], [4, 0], [5, 0], [5, 0.35], [6, 0], [6, 0.35], [7, 0], [8, 0]]});
    assert.throws(() => probabilityExpectedFor('p.summary.prob-summary', summary(true)), /summary-box-plot must be hidden/);
    assert.throws(() => probabilityExpectedFor('p.summary.prob-summary', summary(false, true)), /summary-sigma-band must be hidden/);
    assert.throws(() => probabilityExpectedFor('p.summary.prob-summary', psStep([shown('summary-box-plot', false)])), /sigma-band visibility exactly once/);
    assert.throws(() => probabilityExpectedFor('p.summary.prob-summary', psStep([...summary().scene.actions.slice(1), {kind: 'summary', operation: 'set-value', index: 6, value: 30}])), /only sets/);
    const correlation = (residuals = false, xOnY = false) => psStep([shown('correlation-residuals', residuals), shown('correlation-x-on-y', xOnY)]);
    assert.deepEqual(probabilityExpectedFor('p.correlation.prob-correlation', correlation()), {types: {point: 4, curve: 1, text: 2}, curveCount: 1, points: [[0, 1], [1, 2], [2, 2], [3, 4]]});
    assert.throws(() => probabilityExpectedFor('p.correlation.prob-correlation', correlation(true)), /correlation-residuals must be hidden/);
    assert.throws(() => probabilityExpectedFor('p.correlation.prob-correlation', correlation(false, true)), /correlation-x-on-y must be hidden/);
    assert.throws(() => probabilityExpectedFor('p.correlation.prob-correlation', psStep([...correlation().scene.actions.slice(1), choice('correlation-example', 'outlier')])), /only sets/);
    assert.throws(() => probabilityExpectedFor('p.unknown.unknown', psStep([])), /no authored Probability/);
    assert.ok(chapterInventories.probability);
});

test('b-spline expectations are authored from the graphs: the hat basis, the de Boor rings, the comb curves, the pieces, the NURBS circle and the blossom triangle', () => {
    const quad = {degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], points: [[0, 0], [1, 2], [3, 2], [4, 0]]};
    const hat = {degree: 1, knots: [0, 0, 1, 2, 2], points: [[0, 0], [1, 0], [2, 0]]};
    const nurbs = {degree: 2, knots: [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1], weights: [1, 1, 1, 1, 1, 1, 1, 1, 1],
        points: [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]]};
    const bs = (curve, ...actions) => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'lesson-fixture', curve}, ...actions]}});
    const t = value => ({kind: 'parameter', name: 't', value});
    const comb = visible => ({kind: 'knot-insertion', operation: 'set-comb', visible});
    const bezier = visible => ({kind: 'blossom', operation: 'set-bezier', visible});
    const args = values => ({kind: 'blossom', operation: 'set-args', args: values});
    assert.deepEqual(bsplineExpectedFor('b.bspline-basis.bspline-basis', bs(hat, t(1))), {types: {curve: 3, point: 8, segment: 1}, curveCount: 3,
        points: [[1, 0], [1, 1], [0, -0.1], [0, -0.17], [1, -0.1], [2, -0.1], [2, -0.17]]});
    assert.throws(() => bsplineExpectedFor('b.bspline-basis.bspline-basis', bs(hat, t(0.5))), /only the slider at t = 1/);
    assert.throws(() => bsplineExpectedFor('b.bspline-basis.bspline-basis', bs(quad, t(1))), /only the authored degree/);
    assert.deepEqual(bsplineExpectedFor('b.bspline-deboor.bspline-deboor', bs(quad, t(0.5))), {types: {curve: 1, point: 7, segment: 2}, curveCount: 1, points: quad.points});
    assert.throws(() => bsplineExpectedFor('b.bspline-deboor.bspline-deboor', bs(quad, t(1.5))), /only the slider at t = 1\/2/);
    assert.throws(() => bsplineExpectedFor('b.bspline-deboor.bspline-deboor', bs(quad, t(0.5), {kind: 'animation', animationId: 'deboor', command: 'next-step'})), /only sets/);
    assert.deepEqual(bsplineExpectedFor('b.bspline-insertion.bspline-insertion', bs(quad, comb(true))), {types: {curve: 3, point: 4}, curveCount: 3, points: quad.points});
    assert.throws(() => bsplineExpectedFor('b.bspline-insertion.bspline-insertion', bs(quad, comb(false))), /only the comb shown/);
    assert.throws(() => bsplineExpectedFor('b.bspline-insertion.bspline-insertion', bs(quad, comb(true), {kind: 'knot-insertion', operation: 'insert', value: 0.5})), /only the comb shown/);
    assert.deepEqual(bsplineExpectedFor('b.bspline-extraction.bspline-extraction', bs(quad)), {types: {curve: 5, point: 4}, curveCount: 5, points: quad.points});
    assert.throws(() => bsplineExpectedFor('b.bspline-extraction.bspline-extraction', bs(quad, {kind: 'bezier-extraction', operation: 'move-point'})), /only sets/);
    assert.deepEqual(bsplineExpectedFor('b.bspline-nurbs.bspline-nurbs', bs(nurbs)), {types: {curve: 2, point: 10}, curveCount: 2, points: nurbs.points.slice(0, 8)});
    assert.throws(() => bsplineExpectedFor('b.bspline-nurbs.bspline-nurbs', bs({...nurbs, weights: [1, 1, 1, 1, 2, 1, 1, 1, 1]})), /only the unit weights/);
    assert.deepEqual(bsplineExpectedFor('b.bspline-blossom.bspline-blossom', bs(quad, bezier(false), args([0, 1]))), {types: {curve: 1, point: 7, segment: 1, text: 1}, curveCount: 1, points: quad.points});
    assert.throws(() => bsplineExpectedFor('b.bspline-blossom.bspline-blossom', bs(quad, bezier(true), args([0, 1]))), /only the hidden Bezier/);
    assert.throws(() => bsplineExpectedFor('b.bspline-blossom.bspline-blossom', bs(quad, bezier(false), args([1, 1]))), /only the hidden Bezier/);
    assert.throws(() => bsplineExpectedFor('b.unknown.unknown', bs(quad)), /no authored B-spline/);
    assert.ok(chapterInventories['b-splines']);
});

test('phase-portraits expectations are authored from the graphs: the linear plane frames, the logistic cobweb and the bifurcation cursor', () => {
    const ps = (...actions) => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
    const system = value => ({kind: 'phase', operation: 'set-system', system: value});
    const matrix = (A, B, C, D) => ({kind: 'phase', operation: 'set-matrix', A, B, C, D});
    const seeds = (...values) => ({kind: 'phase', operation: 'set-seeds', seeds: values.map(([X, Y]) => ({X, Y}))});
    const r = R => ({kind: 'phase', operation: 'set-r', R});
    const steps = count => ({kind: 'phase', operation: 'set-step', step: count});
    assert.deepEqual(phasePortraitsExpectedFor('p.linear-system.phase-portrait', ps(system('linear'), matrix(16, 4, 8, 12), seeds([20, 0]))),
        {types: {curve: 3, line: 2, point: 5, segment: 2}, curveCount: 3, points: [[0, 0], [1, 0], [4, 2], [1, 3]]});
    // The adapter repeats the prepared scene of a lesson scene that already starts with its own: two default scenes are accepted.
    const doubled = step({scene: {actions: [...ps(system('linear'), matrix(16, 4, 8, 12), seeds([20, 0])).scene.actions, {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}]}});
    assert.equal(phasePortraitsExpectedFor('p.linear-system.phase-portrait', doubled).curveCount, 3);
    assert.throws(() => phasePortraitsExpectedFor('p.linear-system.phase-portrait', ps(system('linear'), matrix(-16, -4, -8, -12), seeds([20, 0]))), /only the matrix E/);
    assert.throws(() => phasePortraitsExpectedFor('p.linear-system.phase-portrait', ps(system('linear'), matrix(16, 4, 8, 12), seeds([20, 0], [0, 20]))), /only the seeds/);
    assert.throws(() => phasePortraitsExpectedFor('p.linear-system.phase-portrait', ps(system('pendulum'), matrix(16, 4, 8, 12), seeds([20, 0]))), /only the linear system/);
    assert.throws(() => phasePortraitsExpectedFor('p.linear-system.phase-portrait', ps(system('linear'), matrix(16, 4, 8, 12), seeds([20, 0]), r(290))), /not authored/);
    assert.deepEqual(phasePortraitsExpectedFor('p.pendulum.phase-portrait', ps(system('linear'), matrix(0, 4, -4, 0), seeds([20, 0]))),
        {types: {curve: 3, line: 0, point: 5, segment: 2}, curveCount: 3, points: [[0, 0], [1, 0], [0, -1], [1, 0]]});
    assert.throws(() => phasePortraitsExpectedFor('p.pendulum.phase-portrait', ps(system('pendulum'), seeds([20, 0]))), /only the linear centre/);
    assert.throws(() => phasePortraitsExpectedFor('p.pendulum.phase-portrait', ps(system('linear'), matrix(0, -4, 4, 0), seeds([20, 0]))), /only the matrix/);
    const logistic = phasePortraitsExpectedFor('p.logistic-map.logistic-map', ps(r(290), steps(20)));
    assert.deepEqual([logistic.types, logistic.curveCount], [{curve: 7, point: 3}, 7]);
    assert.deepEqual(logistic.points.map(point => point.map(value => Number(value.toFixed(6)))), [[0.2, 0.2], [0.655172, 0.655172], [0.66383, 0.66383]]);
    assert.throws(() => phasePortraitsExpectedFor('p.logistic-map.logistic-map', ps(r(300), steps(20))), /only r = 2\.9/);
    assert.throws(() => phasePortraitsExpectedFor('p.logistic-map.logistic-map', ps(r(290), steps(5))), /only 20 steps/);
    assert.throws(() => phasePortraitsExpectedFor('p.logistic-map.logistic-map', ps(r(290), steps(20), {kind: 'phase', operation: 'set-seed', X: 30})), /not authored/);
    const branch = phasePortraitsExpectedFor('p.bifurcation.logistic-map', ps(r(290)));
    assert.deepEqual([branch.types, branch.curveCount, branch.points.length], [{curve: 7, point: 2}, 7, 2]);
    assert.throws(() => phasePortraitsExpectedFor('p.bifurcation.logistic-map', ps(r(290), steps(5))), /not authored/);
    assert.throws(() => phasePortraitsExpectedFor('p.unknown.unknown', ps()), /no authored phase-portraits/);
    assert.ok(chapterInventories['phase-portraits']);
});

test('trigonometry expectations are authored from the graphs: the unit circle with and without the symmetry markers and the sides-mode triangle with its bars', () => {
    const ts = (...actions) => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
    const angle = degrees => ({kind: 'trig', operation: 'set-angle', which: 'first', degrees});
    const overlay = name => ({kind: 'trig', operation: 'set-overlay', overlay: name, on: true});
    const start = trigonometryExpectedFor('t.radian-sine-cosine.unit-circle', ts(angle(0)));
    assert.deepEqual([start.types, start.curveCount, start.points], [{circle: 1, curve: 1, point: 2, segment: 4}, 1, [[1, 0], [1.7, 0]]]);
    const reflect = trigonometryExpectedFor('t.addition-formulas.unit-circle', ts(angle(30), overlay('symmetries')));
    assert.deepEqual([reflect.types, reflect.curveCount], [{circle: 1, curve: 2, point: 5, segment: 5}, 2]);
    assert.deepEqual(reflect.points.map(point => point.map(value => Number(value.toFixed(6)))),
        [[0.866025, 0.5], [2.223599, 0.5], [0.866025, -0.5], [-0.866025, 0.5], [-0.866025, -0.5]]);
    assert.throws(() => trigonometryExpectedFor('t.radian-sine-cosine.unit-circle', ts(angle(30))), /only the angle 0/);
    assert.throws(() => trigonometryExpectedFor('t.radian-sine-cosine.unit-circle', ts(angle(0), overlay('cosine'))), /only the angle 0/);
    assert.throws(() => trigonometryExpectedFor('t.addition-formulas.unit-circle', ts(angle(30), overlay('addition'))), /only the angle 30/);
    assert.throws(() => trigonometryExpectedFor('t.addition-formulas.unit-circle', ts(angle(30), {kind: 'trig', operation: 'set-zoom'})), /not authored/);
    const mode = value => ({kind: 'triangle', operation: 'set-mode', mode: value});
    const vertex = (name, x, y) => ({kind: 'triangle', operation: 'set-vertex', vertex: name, x, y});
    const triangle = (value, a, b, c) => ts(mode(value), vertex('A', ...a), vertex('B', ...b), vertex('C', ...c));
    for (const section of ['sine-rule', 'cosine-rule']) {
        const frame = trigonometryExpectedFor(`t.${section}.triangle-solver`, triangle('sides', [0, 0], [7, 0], [2, 4]));
        assert.deepEqual([frame.types, frame.curveCount, frame.points], [{point: 3, segment: 7, circle: 0}, 0, [[0, 0], [2, 4], [7, 0]]]);
        assert.throws(() => trigonometryExpectedFor(`t.${section}.triangle-solver`, triangle('circle', [0, 0], [7, 0], [2, 4])), /only the mode sides/);
        assert.throws(() => trigonometryExpectedFor(`t.${section}.triangle-solver`, triangle('sides', [0, 0], [7, 0], [6, 5])), /only the triangle/);
    }
    assert.throws(() => trigonometryExpectedFor('t.unknown.unknown', ts()), /no authored trigonometry/);
    assert.ok(chapterInventories.trigonometry);
});

test('analytic-lines expectations are authored from the graph: each mode names its handles, lines, arrows and construction points', () => {
    const lines = (mode, points) => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, {kind: 'lines', operation: 'set-mode', mode},
        {kind: 'lines', operation: 'set-points', points: Object.fromEntries(Object.entries(points).map(([name, [x, y]]) => [name, {x, y}]))}]}});
    const forms = analyticLinesExpectedFor('a.forms-of-a-line.line-geometry', lines('forms', {P: [-2, 1], Q: [4, 4]}));
    assert.deepEqual([forms.types, forms.curveCount, forms.points], [{line: 1, point: 2, segment: 0}, 0, [[-2, 1], [4, 4]]]);
    const normal = analyticLinesExpectedFor('a.normal-parallel-perpendicular.line-geometry', lines('normal', {P: [-2, 1], Q: [4, 4], R: [3, -2], S: [5, -2]}));
    assert.deepEqual(normal.types, {line: 2, point: 4, segment: 2});
    const angle = analyticLinesExpectedFor('a.angle-between-lines.line-geometry', lines('angle', {P: [-2, 1], Q: [0, 2], R: [0, 2], S: [1, 5]}));
    assert.deepEqual([angle.types, angle.curveCount], [{line: 2, point: 5, segment: 2, curve: 1}, 1]);
    const distance = analyticLinesExpectedFor('a.distance-point-line.line-geometry', lines('distance', {P: [-2, 1], Q: [4, 4], T: [3, -2]}));
    assert.deepEqual([distance.types, distance.points.at(-1)], [{line: 1, point: 4, segment: 4}, [0.8, 2.4]]);
    assert.throws(() => analyticLinesExpectedFor('a.forms-of-a-line.line-geometry', lines('normal', {P: [-2, 1], Q: [4, 4]})), /only the mode forms/);
    assert.throws(() => analyticLinesExpectedFor('a.forms-of-a-line.line-geometry', lines('forms', {P: [-2, 1], Q: [4, 5]})), /only the handles/);
    assert.throws(() => analyticLinesExpectedFor('a.forms-of-a-line.line-geometry', lines('forms', {P: [-2, 1], Q: [4, 4], T: [0, 0]})), /exactly the handles/);
    assert.throws(() => analyticLinesExpectedFor('a.unknown.line-geometry', lines('forms', {})), /no authored analytic-lines/);
    assert.ok(chapterInventories['analytic-lines']);
});

test('isometries expectations are authored from the graph: mirrors with a rotation centre, a reflection with its axis, and the dilation rays', () => {
    const mirror = (px, py, qx, qy) => ({p: {x: px, y: py}, q: {x: qx, y: qy}});
    const open = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
    const mirrors = open([{kind: 'isometry', operation: 'set-mode', mode: 'mirrors'}, {kind: 'isometry', operation: 'set-mirrors', mirrors: {'1': mirror(0, 0, 1, 0), '2': mirror(0, 0, 2, 1)}}]);
    const two = isometriesExpectedFor('i.two-mirrors.isometries', mirrors);
    assert.deepEqual([two.types, two.curveCount, two.points], [{line: 2, curve: 3, point: 5, segment: 0}, 3, [[0, 0], [1, 0], [2, 1]]]);
    const classify = open([{kind: 'isometry', operation: 'set-mode', mode: 'classify'}, {kind: 'isometry', operation: 'set-mirror-count', count: 1},
        {kind: 'isometry', operation: 'set-mirrors', mirrors: {'1': mirror(1, 0, 2, 1)}}]);
    assert.deepEqual(isometriesExpectedFor('i.classifying-a-motion.isometries', classify).types, {line: 2, curve: 2, point: 2, segment: 0});
    const dilation = open([{kind: 'isometry', operation: 'set-mode', mode: 'similarity'}, {kind: 'isometry', operation: 'set-dilation', centre: {x: 1, y: 1}, k: 1.5, turn: 'r0'}]);
    const dil = isometriesExpectedFor('i.dilation-similarity.isometries', dilation);
    assert.deepEqual([dil.types, dil.points], [{line: 0, curve: 2, point: 2, segment: 4}, [[1, 1], [2.5, 1]]]);
    assert.throws(() => isometriesExpectedFor('i.two-mirrors.isometries', open([{kind: 'isometry', operation: 'set-mode', mode: 'classify'}, {kind: 'isometry', operation: 'set-mirrors', mirrors: {'1': mirror(0, 0, 1, 0), '2': mirror(0, 0, 2, 1)}}])), /only the mirrors mode/);
    assert.throws(() => isometriesExpectedFor('i.two-mirrors.isometries', open([{kind: 'isometry', operation: 'set-mode', mode: 'mirrors'}])), /the opening scene is/);
    assert.throws(() => isometriesExpectedFor('i.dilation-similarity.isometries', open([{kind: 'isometry', operation: 'set-mode', mode: 'similarity'}, {kind: 'isometry', operation: 'set-dilation', centre: {x: 1, y: 1}, k: 2, turn: 'r0'}])), /only the centre/);
    assert.throws(() => isometriesExpectedFor('i.unknown.isometries', mirrors), /no authored isometries/);
    assert.ok(chapterInventories.isometries);
});

test('circle-geometry expectations are authored from the graph: tangents with contacts, radical axes with the orthogonal circle, the bisector locus and four common tangents', () => {
    const open = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
    const mode = value => ({kind: 'circle', operation: 'set-mode', mode: value});
    const circle = (name, x, y, r) => ({kind: 'circle', operation: 'set-circle', circle: name, x, y, r});
    const point = (x, y) => ({kind: 'circle', operation: 'set-point', x, y});
    const tangents = circleGeometryExpectedFor('c.tangents-from-a-point.circle-construction', open([mode('tangents'), circle('c1', 0, 0, 5), point(13, 0)]));
    assert.deepEqual([tangents.types, tangents.curveCount], [{circle: 2, segment: 4, point: 5, line: 0}, 0]);
    const radical = circleGeometryExpectedFor('c.radical-axis-and-centre.circle-construction', open([mode('radical'), circle('c1', 0, 0, 5), circle('c2', 6, 0, 3), circle('c3', 3, 6, 2), point(4, 2)]));
    assert.deepEqual([radical.types, radical.points[4]], [{circle: 4, segment: 0, point: 8, line: 3}, [13 / 3, 10 / 3]]);
    const bisector = circleGeometryExpectedFor('c.apollonius-circle.circle-construction', open([mode('apollonius'),
        {kind: 'circle', operation: 'set-apollonius', a: {x: 0, y: 0}, b: {x: 6, y: 0}, p: {x: 8, y: 4}, k: 1}]));
    assert.deepEqual([bisector.types, bisector.points[3]], [{circle: 0, segment: 3, point: 4, line: 1}, [3, 0]]);
    const common = circleGeometryExpectedFor('c.common-tangents.circle-construction', open([mode('common'), circle('c1', 0, 0, 5), circle('c2', 13, 0, 3)]));
    assert.deepEqual(common.types, {circle: 2, segment: 1, point: 6, line: 4});
    assert.throws(() => circleGeometryExpectedFor('c.tangents-from-a-point.circle-construction', open([mode('radical'), circle('c1', 0, 0, 5), point(13, 0)])), /only the tangents mode/);
    assert.throws(() => circleGeometryExpectedFor('c.tangents-from-a-point.circle-construction', open([mode('tangents'), circle('c1', 0, 0, 5), point(3, 0)])), /only the circle/);
    assert.throws(() => circleGeometryExpectedFor('c.common-tangents.circle-construction', open([mode('common')])), /the opening scene is/);
    assert.throws(() => circleGeometryExpectedFor('c.unknown.circle-construction', open([])), /no authored circle-geometry/);
    assert.ok(chapterInventories['circle-geometry']);
});

test('combinatorics expectations are authored from the graphs: the lattice target, the counting tree and the expansion bars', () => {
    const open = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
    const target = (a, b) => ({kind: 'combinatorics', operation: 'set-target', a, b});
    const lattice = combinatoricsExpectedFor('c.lattice-paths-and-pascal.lattice-paths', open([target(2, 2)]));
    assert.deepEqual([lattice.types, lattice.points], [{curve: 3, point: 2}, [[0, 0], [2, 2]]]);
    assert.deepEqual(combinatoricsExpectedFor('c.pascal-identity.lattice-paths', open([target(2, 2)])), lattice);
    const counting = open([{kind: 'combinatorics', operation: 'set-counting-mode', view: 'choices', n: 3, k: 2, ordered: true, repetition: false}]);
    const tree = combinatoricsExpectedFor('c.counting-and-choices.counting-tree', counting);
    assert.deepEqual([tree.types, tree.points], [{curve: 1, point: 1}, [[12.2, 21]]]);
    assert.ok(Math.abs(tree.curves[0][2][0] - (0.6 + 23.2 / 6)) < 1e-12);
    const bars = combinatoricsExpectedFor('c.binomial-theorem.lattice-paths', open([{kind: 'combinatorics', operation: 'set-expansion', n: 1, c: 1}]));
    assert.deepEqual([bars.types, bars.points, bars.curves[1][2]], [{curve: 2}, [], [1.6, 17.5]]);
    assert.throws(() => combinatoricsExpectedFor('c.lattice-paths-and-pascal.lattice-paths', open([target(5, 3)])), /only the target/);
    assert.throws(() => combinatoricsExpectedFor('c.counting-and-choices.counting-tree', open([target(2, 2)])), /the opening scene is/);
    assert.throws(() => combinatoricsExpectedFor('c.unknown.lattice-paths', open([])), /no authored combinatorics/);
    assert.ok(chapterInventories.combinatorics);
});

test('kinematics expectations are authored from the graph: two curves, the moving point and, for the varied circle, its reference point', () => {
    const open = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
    const motion = value => ({kind: 'kinematics', operation: 'set-motion', motion: value});
    const params = value => ({kind: 'kinematics', operation: 'set-params', ...value});
    const time = t => ({kind: 'kinematics', operation: 'set-time', t});
    const off = {showVelocity: false, showAcceleration: false};
    const cycloid = kinematicsExpectedFor('k.position-velocity-acceleration.curve-kinematics', open([params(off), time(0)]));
    assert.deepEqual([cycloid.types, cycloid.points], [{curve: 2, point: 1}, [[0, 0]]]);
    const warped = kinematicsExpectedFor('k.speed-and-parametrization.curve-kinematics', open([motion('circular'), params({...off, radius: 1, omega: 1, b: 0.5}), time(0)]));
    assert.deepEqual([warped.types, warped.points], [{curve: 2, point: 2}, [[1, 0]]]);
    const throwing = kinematicsExpectedFor('k.projectile-motion.curve-kinematics', open([motion('projectile'), params(off), time(0)]));
    assert.deepEqual([throwing.types, throwing.points], [{curve: 2, point: 1}, [[0, 0]]]);
    const circle = kinematicsExpectedFor('k.circular-motion.curve-kinematics', open([motion('circular'), params({...off, radius: 2, omega: 1.5}), time(0)]));
    assert.deepEqual([circle.types, circle.points], [{curve: 2, point: 1}, [[2, 0]]]);
    assert.throws(() => kinematicsExpectedFor('k.position-velocity-acceleration.curve-kinematics', open([params(off), time(1)])), /only the cycloid/);
    assert.throws(() => kinematicsExpectedFor('k.circular-motion.curve-kinematics', open([motion('circular'), params({...off, radius: 2, omega: 1.5, b: 0.5}), time(0)])), /only the circle/);
    assert.throws(() => kinematicsExpectedFor('k.projectile-motion.curve-kinematics', open([params(off), time(0)])), /the opening scene is/);
    assert.throws(() => kinematicsExpectedFor('k.unknown.curve-kinematics', open([])), /no authored kinematics/);
    assert.ok(chapterInventories.kinematics);
});

test('waves expectations are authored from the graph: the sum, beats and standing wave openings with their curves and markers', () => {
    const open = actions => step({scene: {actions: [{kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'}, ...actions]}});
    const mode = value => ({kind: 'waves', operation: 'set-mode', mode: value});
    const components = value => ({kind: 'waves', operation: 'set-components', ...value});
    const time = t => ({kind: 'waves', operation: 'set-time', t});
    const sum = wavesExpectedFor('w.superposition-and-phase.waves', open([components({a2: 0, p2: 0}), time(0)]));
    assert.deepEqual([sum.types, sum.points], [{curve: 6, point: 3, arrow: 2}, [[0, 1], [0, 0]]]);
    const beats = wavesExpectedFor('w.beats.waves', open([mode('beats'), components({f1: 10, f2: 12, showEnvelope: false}), time(0)]));
    assert.deepEqual([beats.types, beats.points], [{curve: 5, point: 1}, [[0, 2]]]);
    const standing = wavesExpectedFor('w.standing-waves.waves', open([mode('standing'), components({halfWaves: 2, a1: 1}), time(0)]));
    assert.deepEqual([standing.types, standing.points.length], [{curve: 4, point: 5}, 5]);
    assert.throws(() => wavesExpectedFor('w.superposition-and-phase.waves', open([components({a2: 0, p2: 0}), time(0.1)])), /only the sum/);
    assert.throws(() => wavesExpectedFor('w.beats.waves', open([components({f1: 10, f2: 12, showEnvelope: false}), time(0)])), /the opening scene is set-mode/);
    assert.throws(() => wavesExpectedFor('w.unknown.waves', open([])), /no authored waves/);
    assert.ok(chapterInventories.waves);
});
