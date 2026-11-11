const assert = require('node:assert/strict');
const test = require('node:test');
const {transientStateScope} = require('./transient-state-scope.cjs');

const classes = [
    {name: 'BisectionGraph', stem: 'BisectionGraph', dir: 'src/graphs/functions'}, {name: 'NewtonGraph', stem: 'NewtonGraph', dir: 'src/graphs/functions'},
    {name: 'BezierCurveGraph', stem: 'BezierCurveGraph', dir: 'src/graphs/curves/bezier'}, {name: 'CurveGraph', stem: 'CurveGraph', dir: 'src/graphs/curves'},
    {name: 'OrientationGraph', stem: 'OrientationGraph', dir: 'src/graphs/compgeo'},
];
const scope = (env, paths, graphClasses = () => classes) => transientStateScope({env, graphClasses, changedPaths: () => {
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
    {all: false, reason: 'sample', ids: null, changedNames: ['BisectionGraph', 'NewtonGraph', 'bisectionModel'],
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

test('family reach: a helper file under a graph directory selects the graph classes of that directory', () => {
    const result = scope({}, ['src/graphs/functions/rootModel.ts']);
    assert.equal(result.all, false);
    assert.deepEqual(result.changedNames, ['BisectionGraph', 'NewtonGraph', 'rootModel']);
});

test('family reach: subdirectories count below the changed directory, not above it', () => {
    assert.deepEqual(scope({}, ['src/graphs/curves/helper.ts']).changedNames, ['BezierCurveGraph', 'CurveGraph', 'helper']);
    assert.deepEqual(scope({}, ['src/graphs/curves/bezier/helper.ts']).changedNames, ['BezierCurveGraph', 'helper']);
});

test('family reach: a graph class file and a test file do not widen the selection', () => {
    assert.deepEqual(scope({}, ['src/graphs/functions/NewtonGraph.tsx']).changedNames, ['NewtonGraph']);
    assert.deepEqual(scope({}, ['src/graphs/functions/rootModel.test.ts']).changedNames, []);
});

test('family reach: shared paths still run everything', () => {
    assert.equal(scope({}, ['src/graphs/projective/crossRatioModel.ts']).all, true);
    assert.equal(scope({}, ['src/graphs/base/helper.ts']).all, true);
});

test('family reach: a directory without a Demonstration keeps the sample', () => {
    const result = scope({}, ['src/graphs/attributes/helper.ts']);
    assert.equal(result.all, false);
    assert.deepEqual(result.changedNames, ['helper']);
});

test('family reach reads the class files from the imports of graphFactories.ts', () => {
    const {graphClassFiles} = require('./transient-state-scope.cjs');
    const found = graphClassFiles();
    assert.ok(found.some(({name, dir}) => name === 'OrientationGraph' && dir === 'src/graphs/compgeo'));
    assert.ok(found.some(({name, dir}) => name === 'BezierCurveGraph' && dir === 'src/graphs/curves/bezier'));
});

test('family reach also reads the registered projective graphs from their runtime loaders', () => {
    const {graphClassFiles, familyClassNames} = require('./transient-state-scope.cjs');
    const found = graphClassFiles();
    for (const name of ['CrossRatioGraph', 'PascalGraph', 'PolePolarGraph', 'FivePointGraph', 'ThreeViewsGraph']) {
        assert.ok(found.some(entry => entry.name === name && entry.dir === 'src/graphs/projective'), name);
    }
    assert.deepEqual(familyClassNames(['src/graphs/projective/idealMarker.ts'], found).sort(),
        ['CrossRatioGraph', 'FivePointGraph', 'PascalGraph', 'PolePolarGraph', 'ThreeViewsGraph']);
});

/** Ground truth for the regex parser: every graph class constructed in the sources is found, and every found class file defines its class. */
function checkGraphClassFiles(found, root, sources) {
    const missing = [];
    for (const {text, pattern} of sources) {
        for (const match of text.matchAll(pattern)) if (!found.some(({name}) => name === match[1])) missing.push(match[1]);
    }
    const fs = require('node:fs');
    const path = require('node:path');
    // Default imports may be aliased (the class name differs from the file), so the file is the import's stem, not the name.
    const noFile = found.filter(({dir, stem}) => !['.tsx', '.ts'].some(extension => fs.existsSync(path.join(root, dir, `${stem}${extension}`))))
        .map(({name}) => name);
    return {missing, noFile};
}

const realSources = root => {
    const fs = require('node:fs');
    const path = require('node:path');
    const read = file => fs.readFileSync(path.join(root, file), 'utf8');
    return [
        {text: read('src/graphs/graphFactories.ts'), pattern: /=>\s*new\s+(\w+)\(/g},
        {text: read('src/graphs/projective/runtime.ts'), pattern: /new\s+\w+\.(\w+)\(/g},
    ];
};

test('graphClassFiles finds every constructed graph class and each class directory holds sources (drift guard)', () => {
    const path = require('node:path');
    const root = path.join(__dirname, '..');
    const {graphClassFiles} = require('./transient-state-scope.cjs');
    const found = graphClassFiles(root);
    const sources = realSources(root);
    assert.ok(sources.every(({text, pattern}) => [...text.matchAll(pattern)].length > 0), 'the ground-truth patterns matched nothing');
    const result = checkGraphClassFiles(found, root, sources);
    assert.deepEqual(result, {missing: [], noFile: []});
});

test('the drift guard fails when the parser returns fewer classes or a wrong directory', () => {
    const path = require('node:path');
    const root = path.join(__dirname, '..');
    const {graphClassFiles} = require('./transient-state-scope.cjs');
    const found = graphClassFiles(root);
    const sources = realSources(root);
    assert.notDeepEqual(checkGraphClassFiles(found.slice(1), root, sources).missing, []);
    assert.notDeepEqual(checkGraphClassFiles(found.map(entry => ({...entry, dir: 'src/graphs/nowhere'})), root, sources).noFile, []);
    // A stem the directory does not hold (a parser that kept the alias instead of the file name) is drift too.
    const aliased = found.map(entry => entry.name === 'DecasteljauGraph3' ? {...entry, stem: entry.name} : entry);
    assert.deepEqual(checkGraphClassFiles(aliased, root, sources).noFile, ['DecasteljauGraph3']);
});

test('a change to the file of an aliased graph class is a class file, not a helper of its directory', () => {
    const {graphClassFiles, familyClassNames} = require('./transient-state-scope.cjs');
    const found = graphClassFiles();
    // graphFactories.ts imports it as `DecasteljauGraph3`, so the alias differs from the file stem.
    const entry = found.find(({name}) => name === 'DecasteljauGraph3');
    assert.ok(entry);
    assert.equal(entry.stem, 'SubdivisionGraph1');
    assert.deepEqual(familyClassNames(['src/graphs/curves/bezier/SubdivisionGraph1.tsx'], found), []);
    // A helper beside it still reaches the directory's classes, by name.
    const reached = familyClassNames(['src/graphs/curves/bezier/helper.ts'], found);
    assert.ok(reached.includes('DecasteljauGraph3'));
});
