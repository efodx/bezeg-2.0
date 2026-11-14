'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {selectUnitTests, isCutNode, MAX_FILES} = require('./check-changed-selector.cjs');

/** A scratch repository root holding the given files (path -> text). */
function tree(files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bezeg-selector-'));
    for (const [file, text] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
        fs.writeFileSync(path.join(root, file), text);
    }
    return root;
}

const withTree = (files, body) => {
    const root = tree(files);
    try { return body(root); } finally { fs.rmSync(root, {recursive: true, force: true}); }
};

const select = (root, changed, options) => selectUnitTests({root, changed, ...options});

test('a changed file selects the test files that import it, transitively', () => withTree({
    'src/model/a.ts': 'export const a = 1;',
    'src/model/b.ts': "export {a} from './a';",
    'src/model/b.test.ts': "import {a} from './b';",
    'src/model/c.test.ts': "import './d';",
    'src/model/d.ts': 'export const d = 1;',
}, root => {
    assert.deepEqual(select(root, ['src/model/a.ts']), {kind: 'files', files: ['src/model/b.test.ts'], sweeps: []});
}));

test('imports are followed in every spelling the sources use; type-only imports are not', () => withTree({
    'src/lib/index.ts': 'export const x = 1;',
    'src/lib/raw.txt': 'text',
    'src/lib/data.json': '{}',
    'src/lib/dyn.ts': 'export const y = 1;',
    'src/lib/mocked.ts': 'export const z = 1;',
    'src/lib/req.cjs': 'module.exports = 1;',
    'src/lib/types.ts': 'export type T = 1;',
    'src/lib/js.ts': 'export const j = 1;',
    'src/images/one.png': 'png',
    'src/use/index.test.ts': "import {x} from '../lib';",
    'src/use/raw.test.ts': "import raw from '../lib/raw.txt?raw';",
    'src/use/json.test.ts': "import data from '../lib/data.json';",
    'src/use/dyn.test.ts': "const m = await import('../lib/dyn');",
    'src/use/mock.test.ts': "vi.mock('../lib/mocked', () => ({}));",
    'src/use/req.test.ts': "const r = require('../lib/req.cjs');",
    'src/use/type.test.ts': "import type {T} from '../lib/types';",
    'src/use/js.test.ts': "import {j} from '../lib/js.js';",
    'src/use/glob.test.ts': "const urls = import.meta.glob('/src/images/*.png', {eager: true});",
}, root => {
    const picked = changed => select(root, [changed]).files;
    assert.deepEqual(picked('src/lib/index.ts'), ['src/use/index.test.ts']);
    assert.deepEqual(picked('src/lib/raw.txt'), ['src/use/raw.test.ts']);
    assert.deepEqual(picked('src/lib/data.json'), ['src/use/json.test.ts']);
    assert.deepEqual(picked('src/lib/dyn.ts'), ['src/use/dyn.test.ts']);
    assert.deepEqual(picked('src/lib/mocked.ts'), ['src/use/mock.test.ts']);
    assert.deepEqual(picked('src/lib/req.cjs'), ['src/use/req.test.ts']);
    assert.deepEqual(picked('src/lib/js.ts'), ['src/use/js.test.ts']);
    assert.deepEqual(picked('src/images/one.png'), ['src/use/glob.test.ts']);
    assert.deepEqual(select(root, ['src/lib/types.ts']), {kind: 'empty'});
}));

test('a registry is not followed unless it is itself a changed file', () => withTree({
    'src/graphs/FooGraph.ts': 'export class FooGraph {}',
    'src/graphs/FooGraph.test.ts': "import {FooGraph} from './FooGraph';",
    'src/graphs/allGraphFactories.ts': "import {FooGraph} from './FooGraph';",
    'src/graphs/dynamics/runtime.ts': "export const load = () => import('../FooGraph');",
    'src/learning/content/foldChapterRegistry.ts': "import '../../graphs/FooGraph';",
    'src/localization/index.ts': 'export const t = 1;',
    'src/PresetCatalog.test.ts': "import './graphs/allGraphFactories';",
    'src/Lessons.test.ts': "import './learning/content/foldChapterRegistry';",
    'src/Runtime.test.ts': "import './graphs/dynamics/runtime';",
}, root => {
    // Only the importers on the path to a test are followed; the tests behind the registries are left to CI.
    assert.deepEqual(select(root, ['src/graphs/FooGraph.ts']).files, ['src/graphs/FooGraph.test.ts']);
    // A changed registry expands.
    // (allGraphFactories.ts is also a shared path, so its own change falls back to everything.)
    assert.equal(select(root, ['src/graphs/allGraphFactories.ts']).kind, 'fallback');
    assert.deepEqual(select(root, ['src/graphs/dynamics/runtime.ts']).files, ['src/Runtime.test.ts']);
    assert.deepEqual(select(root, ['src/learning/content/foldChapterRegistry.ts']).files, ['src/Lessons.test.ts']);
    // With the cut list emptied (the Vitest comparison mode) the registries are followed.
    assert.deepEqual(select(root, ['src/graphs/FooGraph.ts'], {isCut: () => false}).files, [
        'src/Lessons.test.ts', 'src/PresetCatalog.test.ts', 'src/Runtime.test.ts', 'src/graphs/FooGraph.test.ts',
    ]);
    assert.equal(isCutNode('src/localization/index.ts'), true);
    assert.equal(isCutNode('src/localization/sl.ts'), false);
}));

test('the cut registries named in the design all exist in this repository', () => {
    const repo = path.resolve(__dirname, '..');
    const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
    const files = walk(path.join(repo, 'src')).map(file => path.relative(repo, file).replace(/\\/g, '/'));
    for (const file of ['src/graphs/allGraphFactories.ts', 'src/graphs/graphLoaders.ts', 'src/learning/content/chapterOwnedLessons.ts', 'src/learning/runtime/lessonCatalog.ts', 'src/localization/index.ts', 'src/demonstrations.ts', 'src/Routes.tsx']) {
        assert.ok(files.includes(file), `${file} is cut but missing`);
        assert.equal(isCutNode(file), true, file);
    }
    assert.ok(files.filter(file => /^src\/graphs\/[^/]+\/runtime\.ts$/.test(file)).every(isCutNode));
    assert.ok(files.filter(file => /^src\/learning\/content\/[^/]*Registry\.ts$/.test(file)).length > 10);
});

test('falls back for a shared path, a configuration file, an unknown change list, a file outside the graph and an oversize selection', () => withTree({
    'src/graphs/base/Shared.ts': 'export const s = 1;',
    'src/graphs/base/Shared.test.ts': "import './Shared';",
    'src/x.ts': 'export const x = 1;',
    'src/x.test.ts': "import './x';",
}, root => {
    assert.deepEqual(select(root, ['src/graphs/base/Shared.ts']), {kind: 'fallback', reason: 'shared path src/graphs/base/Shared.ts changed'});
    // A changed test file under a shared path selects itself instead.
    assert.deepEqual(select(root, ['src/graphs/base/Shared.test.ts']).files, ['src/graphs/base/Shared.test.ts']);
    for (const config of ['package.json', 'package-lock.json', 'vite.config.mts', 'vitest.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'src/setupTests.ts', 'eslint.config.mjs']) {
        assert.equal(select(root, ['src/x.ts', config]).kind, 'fallback', config);
    }
    assert.deepEqual(select(root, undefined), {kind: 'fallback', reason: 'changed file list unknown'});
    assert.match(select(root, ['src/deleted.ts']).reason, /src\/deleted\.ts is not in the import graph/);
    assert.match(select(root, ['src/x.ts'], {maxFiles: 0}).reason, /exceeds 0/);
    assert.equal(select(root, ['src/x.ts'], {maxFiles: 1}).kind, 'files');
    assert.equal(MAX_FILES, 400);
}));

test('the catalog sweep test files are always added, found through the helper that imports catalogSweepScope', () => withTree({
    'src/graphs/base/catalogSweepScope.ts': 'export const scope = 1;',
    'src/learning/runtime/lessonRestorationContract.tsx': "import {scope} from '../../graphs/base/catalogSweepScope';",
    'src/learning/runtime/lessonRestoration.part1.test.tsx': "import './lessonRestorationContract';",
    'src/graphs/PresetRoundTrip.contract.test.tsx': "import './base/catalogSweepScope';",
    'src/y.ts': 'export const y = 1;',
    'src/y.test.ts': "import './y';",
    'src/unrelated.test.ts': 'test(1)',
}, root => {
    assert.deepEqual(select(root, ['src/y.ts']), {
        kind: 'files',
        files: ['src/graphs/PresetRoundTrip.contract.test.tsx', 'src/learning/runtime/lessonRestoration.part1.test.tsx', 'src/y.test.ts'],
        sweeps: ['src/graphs/PresetRoundTrip.contract.test.tsx', 'src/learning/runtime/lessonRestoration.part1.test.tsx'],
    });
}));

test('a change outside src selects no unit test, even with sweep files present', () => withTree({
    'src/graphs/base/catalogSweepScope.ts': 'export const scope = 1;',
    'src/Sweep.test.ts': "import './graphs/base/catalogSweepScope';",
    'docs/note.md': 'x',
}, root => {
    assert.deepEqual(select(root, ['docs/note.md', 'scripts/tool.cjs', 'tests/smoke.cjs', '.github/workflows/ci.yml', 'scripts/transient-state-scope.cjs']), {kind: 'empty'});
    assert.deepEqual(select(root, []), {kind: 'empty'});
}));

test('a script that a source test requires selects that test; a new untracked test selects itself', () => withTree({
    'scripts/helper.cjs': 'module.exports = 1;',
    'src/helper.test.ts': "const h = require('../scripts/helper.cjs');",
}, root => {
    assert.deepEqual(select(root, ['scripts/helper.cjs']).files, ['src/helper.test.ts']);
    fs.writeFileSync(path.join(root, 'src/fresh.test.ts'), 'test(1)');
    assert.deepEqual(select(root, ['src/fresh.test.ts']).files, ['src/fresh.test.ts']);
}));

test('on this repository the selection is small, includes the sweeps and runs fast', () => {
    const started = Date.now();
    const result = selectUnitTests({root: path.resolve(__dirname, '..'), changed: ['src/graphs/linear/labelLayout.ts']});
    assert.equal(result.kind, 'files');
    assert.ok(result.sweeps.length > 0 && result.files.length < MAX_FILES);
    assert.ok(Date.now() - started < 10_000);
});
