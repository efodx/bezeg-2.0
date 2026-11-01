const assert = require('node:assert/strict');
const test = require('node:test');
const {fingerprintFor, readableActions, expectedFor, linearMapsExpectedFor, complexMapsExpectedFor, assertExpectation, chapterInventories} = require('./generate-guided-example-inventory.cjs');

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

test('a missing or empty chapter-owned expectation fails', () => {
    const good = {types: {curve: 1}, curveCount: 1, points: [[0, 0]]};
    assert.doesNotThrow(() => assertExpectation('x', good));
    assert.throws(() => assertExpectation('x', undefined), /needs authored expected checks/);
    assert.throws(() => assertExpectation('x', {...good, types: {}}), /expected.types must be nonempty/);
    assert.throws(() => assertExpectation('x', {...good, curveCount: 0}), /curveCount must be a positive integer/);
    assert.throws(() => assertExpectation('x', {...good, points: []}), /expected.points must be nonempty/);
});
