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
        {all: false, reason: 'BEZEG_TRANSIENT_STATE lists 2', ids: ['bezier', 'orientation'], changedNames: [], changedFiles: []});
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
    {all: false, reason: 'sample', ids: null, changedNames: ['BisectionGraph', 'bisectionModel'],
        changedFiles: ['src/graphs/functions/BisectionGraph.tsx', 'src/graphs/functions/bisectionModel.ts']});
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

// The other catalog sweeps share the rule; each has its own variable and shared paths.
const {sweepScope, SWEEPS} = require('./transient-state-scope.cjs');
const sweep = (name, env, paths) => sweepScope(SWEEPS[name], {env, changedPaths: () => paths});
const lessonSweeps = ['lessonRestoration', 'sceneContent'];

test('every sweep runs everything in CI and with BEZEG_SWEEPS=all, which also beats a sweep list', () => {
    for (const name of Object.keys(SWEEPS)) {
        assert.equal(sweep(name, {CI: 'true'}, []).all, true, name);
        assert.equal(sweep(name, {BEZEG_SWEEPS: 'all'}, []).all, true, name);
        assert.equal(sweep(name, {BEZEG_SWEEPS: 'all', [SWEEPS[name].variable]: 'a,b'}, []).all, true, name);
        assert.equal(sweep(name, {[SWEEPS[name].variable]: 'all'}, []).all, true, name);
    }
    assert.equal(scope({BEZEG_SWEEPS: 'all'}, []).all, true);
});

test('each sweep has its own variable: a list, and sample after a shared change', () => {
    assert.deepEqual(sweep('lessonRestoration', {BEZEG_LESSON_RESTORATION: 'bezier, circle'}, []).ids, ['bezier', 'circle']);
    assert.deepEqual(sweep('sceneReplacement', {BEZEG_SCENE_REPLACEMENT: 'bezier'}, []).ids, ['bezier']);
    // Another sweep's variable does not change this one.
    assert.equal(sweep('sceneContent', {BEZEG_LESSON_RESTORATION: 'bezier'}, []).ids, null);
    const kept = sweep('sceneContent', {CI: 'true', BEZEG_SCENE_CONTENT: 'sample'}, ['src/learning/runtime/LessonSession.ts']);
    assert.equal(kept.all, false);
});

test('a lesson runtime change is shared by the lesson sweeps only', () => {
    for (const name of lessonSweeps) {
        for (const path of ['src/learning/runtime/LessonSession.ts', 'src/learning/model.ts', 'src/graphs/base/SceneStore.ts']) {
            assert.equal(sweep(name, {}, [path]).all, true, `${name} ${path}`);
        }
    }
    assert.equal(sweep('sceneReplacement', {}, ['src/learning/runtime/LessonSession.ts']).all, false);
    assert.equal(sweep('sceneReplacement', {}, ['src/graphs/base/SceneStore.ts']).all, true);
});

test('a changed lesson content file and a changed graph file are reported for selection', () => {
    const result = sweep('lessonRestoration', {}, ['src/learning/content/bsplineBasisGuidedLessons.ts',
        'src/learning/content/bsplineBasisGuidedLessons.test.tsx', 'src/graphs/bspline/BsplineBasisGraph.tsx']);
    assert.equal(result.all, false);
    assert.deepEqual(result.changedFiles, ['src/graphs/bspline/BsplineBasisGraph.tsx', 'src/learning/content/bsplineBasisGuidedLessons.ts']);
    assert.deepEqual(result.changedNames, ['BsplineBasisGraph', 'bsplineBasisGuidedLessons']);
});
