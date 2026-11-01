const assert = require('node:assert/strict');
const test = require('node:test');
const {transientStateScope} = require('./transient-state-scope.cjs');

const scope = (env, paths) => transientStateScope({env, changedPaths: () => {
    if (paths instanceof Error) throw paths;
    return paths;
}});

test('CI and BEZEG_TRANSIENT_STATE=all run every Demonstration', () => {
    assert.equal(scope({CI: 'true'}, []).all, true);
    assert.equal(scope({BEZEG_TRANSIENT_STATE: 'all'}, []).all, true);
});

test('a listed selection wins over CI and the changed files', () => {
    assert.deepEqual(scope({CI: 'true', BEZEG_TRANSIENT_STATE: ' bezier, orientation ,'}, ['src/graphs/base/BaseGraph.tsx']),
        {all: false, reason: 'BEZEG_TRANSIENT_STATE lists 2', ids: ['bezier', 'orientation'], changedNames: []});
});

test('a change to a shared non-test file runs every Demonstration', () => {
    for (const path of ['src/graphs/base/BaseGraph.tsx', 'src/graphs/graphFactories.ts', 'src/graphs/curves/object/JXGBezierCurve.ts',
        'src/bezeg/impl/curve/polynomial-bezier-curve.ts', 'package-lock.json', 'vite.config.mts']) {
        const result = scope({}, ['docs/commands.md', path]);
        assert.equal(result.all, true, path);
        assert.match(result.reason, /shared by every graph/);
    }
});

test('changed tests and graph files keep the sample and name the changed graph files', () => {
    assert.deepEqual(scope({}, ['src/graphs/base/GraphHost.test.tsx', 'src/graphs/functions/BisectionGraph.tsx',
        'src/graphs/functions/bisectionModel.ts', 'docs/commands.md', 'src/graphs/functions/BisectionGraph.tsx']),
    {all: false, reason: 'sample', ids: null, changedNames: ['BisectionGraph', 'bisectionModel']});
});

test('BEZEG_TRANSIENT_STATE=sample keeps the sample after a shared change, even in CI', () => {
    const result = scope({CI: 'true', BEZEG_TRANSIENT_STATE: 'sample'}, ['src/graphs/base/BaseGraph.tsx', 'src/graphs/linear/LinearMapGraph.tsx']);
    assert.equal(result.all, false);
    assert.deepEqual(result.changedNames, ['BaseGraph', 'LinearMapGraph']);
});

test('unknown changed files run every Demonstration', () => {
    const result = scope({}, new Error('no merge base with master\nmore'));
    assert.equal(result.all, true);
    assert.equal(result.reason, 'the changed files are unknown (no merge base with master)');
});
