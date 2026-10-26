const assert = require('node:assert/strict');
const test = require('node:test');
const {fingerprintFor, readableActions, expectedFor} = require('./generate-guided-example-inventory.cjs');

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
