'use strict';
// Decides which entries the catalog sweeps run. Tier: sampled locally, rotated in CI with a daily full run.
//   transient state    src/graphs/base/graphTransientStateContract.tsx  (BEZEG_TRANSIENT_STATE)
//   lesson restoration src/learning/runtime/lessonRestorationContract.tsx  (BEZEG_LESSON_RESTORATION)
//   scene content      src/learning/content/sceneContentAgainstGraphs.test.tsx  (BEZEG_SCENE_CONTENT)
//   scene replacement  src/graphs/base/sceneReplacementContract.test.tsx  (BEZEG_SCENE_REPLACEMENT)
//   preset round trip  src/graphs/PresetRoundTrip.contract.test.tsx  (BEZEG_PRESET_ROUNDTRIP)
//   graph teardown     src/graphs/base/graphTeardownContract.test.tsx  (BEZEG_GRAPH_TEARDOWN)
// Each sweep mounts many graphs on real boards, so a local run checks a representative sample plus the entries the
// branch's changed files reach. A CI run given BEZEG_SWEEP_ROTATION (a push or pull request) checks the same sample, the
// entries reached since BEZEG_SWEEP_BASE, and one rotating slice of the catalog; the daily scheduled run, a CI run
// without a rotation, BEZEG_SWEEPS=all and the sweep's own variable =all check every entry.
// See docs/commands.md, "Catalog sweep scope".

const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/** Changed files that every graph's scene, restoration or drawing depends on: their change runs the whole contract. */
const SHARED_PATHS = [
    /^src\/graphs\/base\//,
    /^src\/graphs\/(graphFactories|graphLoaders|allGraphFactories)\.ts$/,
    /^src\/graphs\/curves\/object\//,
    /^src\/graphs\/styles\//,
    /^src\/bezeg\//,
    /^src\/learning\/model\.ts$/,
    // Loaded by every test file or imported across graphs. src/localization/ is left out on purpose: most slices add
    // catalog keys, the sweeps compare state rather than text, and typecheck covers the keys.
    /^src\/setupTests\.ts$/,
    /^src\/utils\//,
    /^src\/types\//,
    // Imported by the sweeps' scene helpers (src/graphs/base/realGraphScenes.ts, lessonRestorationContract.tsx); their
    // file names match no graph class, so a change there would otherwise run only the sample.
    /^src\/graphs\/patches\/patch(Dto|Sweep)\.ts$/,
    /^src\/graphs\/projective\/(crossRatio|pascal|polePolar)Model\.ts$/,
    /^src\/analysis\/(summaryStatistics|correlation)Model\.ts$/,
    /^package(-lock)?\.json$/,
    /^vite\.config\.mts$/,
    /^scripts\/transient-state-scope\.cjs$/,
];

/**
 * The shared paths of the lesson sweeps (restoration, scene content): SHARED_PATHS, which already holds the scene store
 * and graph host (src/graphs/base/) and the lesson model, plus what every lesson runs through: the lesson session,
 * catalog and animation (src/learning/runtime/), the Demonstration definitions, storage, and the lesson content
 * helpers that define no lesson. A changed file under src/learning/content/ that defines one or more lessons is not
 * shared: it selects the lessons it mentions (`lessonsReached` in lessonRestorationContract.tsx), and one that
 * mentions none is treated as shared there.
 */
const LESSON_SHARED_PATHS = [
    ...SHARED_PATHS,
    /^src\/learning\/runtime\//,
    /^src\/demonstrations\.ts$/,
    /^src\/storage\//,
];

/**
 * The shared paths of the Preset round trip: SHARED_PATHS already holds the Preset code in src/graphs/base/
 * (BaseGraph, presets/Presets.ts, presets/PresetImport.ts), plus the one Preset module outside it that many graph
 * families import: the function graphs' Preset collections. Browser storage (src/storage/) is left out: Presets
 * are saved through BaseGraph and the contract does not exercise appStorage.
 */
const PRESET_SHARED_PATHS = [
    ...SHARED_PATHS,
    /^src\/graphs\/functions\/functionPresetCollections\.ts$/,
];

/** The sweeps that sample locally and run every entry in CI: the env variable that tunes each, and its shared paths. */
const SWEEPS = {
    transientState: {variable: 'BEZEG_TRANSIENT_STATE', shared: SHARED_PATHS},
    lessonRestoration: {variable: 'BEZEG_LESSON_RESTORATION', shared: LESSON_SHARED_PATHS},
    sceneContent: {variable: 'BEZEG_SCENE_CONTENT', shared: LESSON_SHARED_PATHS},
    sceneReplacement: {variable: 'BEZEG_SCENE_REPLACEMENT', shared: SHARED_PATHS},
    presetRoundTrip: {variable: 'BEZEG_PRESET_ROUNDTRIP', shared: PRESET_SHARED_PATHS},
    graphTeardown: {variable: 'BEZEG_GRAPH_TEARDOWN', shared: SHARED_PATHS},
};

/** CI rotation slices: odd, so a slice spreads over the 4 transient state and 8 lesson restoration part files. */
const ROTATION_SLICES = 7;

/**
 * The CI rotation slice from BEZEG_SWEEP_ROTATION, `index/count` with 0 <= index < count, or null when unset or malformed.
 * @returns {{index: number, count: number} | null}
 */
function parseRotation(value) {
    const match = /^(\d+)\/(\d+)$/.exec((value ?? '').trim());
    if (!match) return null;
    const index = Number(match[1]);
    const count = Number(match[2]);
    return count > 0 && index < count ? {index, count} : null;
}

const isTest = filePath => /\.test\.[jt]sx?$/.test(filePath);

/**
 * The graph classes the Demonstrations instantiate and the directory of each class file, read from the imports of
 * src/graphs/graphFactories.ts (`import X from './dir/X'` or `import {X} from './dir/X'`) and the runtime loaders of
 * feature-registered families (src/graphs/graphLoaders.ts): [{name, dir: 'src/graphs/dir', stem}]; `name` is the import alias or class, `stem` the class file's basename (they differ for
 * aliased default imports, and for a default export whose class is named apart from its file, such as `GraphExtrapolation` in
 * './curves/bezier/ExtrapolationGraph').
 */
/** The class a default export names (`export default class X` or `export default X;`), else the file stem. */
function defaultClassName(root, dir, stem) {
    const file = ['.tsx', '.ts'].map(extension => path.join(root, dir, `${stem}${extension}`)).find(candidate => fs.existsSync(candidate));
    if (!file) return stem;
    const text = fs.readFileSync(file, 'utf8');
    const match = text.match(/export\s+default\s+class\s+(\w+)/) ?? text.match(/^export\s+default\s+(\w+)\s*;/m);
    return match ? match[1] : stem;
}

function graphClassFiles(root = path.join(__dirname, '..')) {
    const source = fs.readFileSync(path.join(root, 'src/graphs/graphFactories.ts'), 'utf8');
    const classes = [];
    for (const match of source.matchAll(/^import\s+(?:(\w+)|\{([^}]*)\})\s+from\s+'\.\/([^']+)'/gm)) {
        const dir = path.posix.join('src/graphs', path.posix.dirname(match[3]));
        const names = match[1] ? [match[1]] : match[2].split(',').map(name => name.trim().split(/\s+as\s+/).pop()).filter(Boolean);
        for (const name of names) classes.push({name, dir, stem: path.posix.basename(match[3])});
    }
    // Feature-registered families: src/graphs/graphLoaders.ts imports `./<dir>/runtime`, whose lazy loaders read
    // `import('./X').then(m => () => new m.X())`.
    const loaders = fs.readFileSync(path.join(root, 'src/graphs/graphLoaders.ts'), 'utf8');
    for (const family of loaders.matchAll(/from\s+'\.\/([^']+)\/runtime'/g)) {
        const runtimeDir = path.posix.join('src/graphs', family[1]);
        const runtime = fs.readFileSync(path.join(root, runtimeDir, 'runtime.ts'), 'utf8');
        // A loader may reach a class outside its runtime's directory (`import('../WavesGraph')`); the join normalizes `..`.
        for (const match of runtime.matchAll(/import\('((?:\.\.?\/)+[^']+)'\)\.then\(\w+\s*=>\s*\(\)\s*=>\s*new\s+\w+\.(\w+)\(/g)) {
            const dir = path.posix.join(runtimeDir, path.posix.dirname(match[1]));
            const stem = path.posix.basename(match[1]);
            // `new m.default()`: the sweeps match `constructor.name`, so read the declared class name from the class file.
            const name = match[2] === 'default' ? defaultClassName(root, dir, stem) : match[2];
            classes.push({name, dir, stem});
        }
    }
    return classes;
}

/**
 * Family reach: a changed non-test file under src/graphs/<dir>/ (not shared) that is no graph class file selects the
 * Demonstrations whose graph class files sit in that directory or below it. Returns those class names; a directory with
 * no graph class file adds none (the sweep keeps its sample).
 */
function familyClassNames(changedFiles, classes) {
    const stems = new Set(classes.map(({stem}) => stem));
    const names = new Set();
    for (const file of changedFiles) {
        if (!file.startsWith('src/graphs/')) continue;
        if (stems.has(file.replace(/^.*\//, '').replace(/\.[^.]+$/, ''))) continue;
        const dir = path.posix.dirname(file);
        for (const {name, dir: classDir} of classes) if (classDir === dir || classDir.startsWith(`${dir}/`)) names.add(name);
    }
    return [...names];
}

/**
 * Which entries of a catalog sweep run. `BEZEG_SWEEPS=all` forces every sweep to all. The sweep's own variable takes
 * `all`, `sample` (keeps the sample even after a shared change, even in CI) or a comma list of ids; unset, a change to
 * a shared path runs everything, else the sample plus what the changed files reach. In CI, a valid BEZEG_SWEEP_ROTATION
 * adds its slice of the catalog (`rotation`) to that selection; CI without one runs everything.
 * @param {{variable: string, shared: RegExp[]}} sweep
 * @param {{env: Record<string, string | undefined>, changedPaths: () => string[], graphClasses?: () => {name: string, dir: string}[]}} input
 * @returns {{all: boolean, reason: string, ids: string[] | null, changedNames: string[], changedFiles: string[], rotation?: {index: number, count: number}}}
 *   `ids` is an explicit selection; otherwise the sweep adds the entries whose class (or a superclass) is named like a
 *   file in `changedNames` (which also lists the graph classes of a changed helper's directory, see `familyClassNames`),
 *   or that a file in `changedFiles` (changed non-test sources under src/) defines.
 */
function sweepScope(sweep, {env, changedPaths, graphClasses = graphClassFiles}) {
    const none = {changedNames: [], changedFiles: []};
    const setting = (env[sweep.variable] ?? '').trim();
    if ((env.BEZEG_SWEEPS ?? '').trim() === 'all') return {all: true, reason: 'BEZEG_SWEEPS=all', ids: null, ...none};
    if (setting === 'all') return {all: true, reason: `${sweep.variable}=all`, ids: null, ...none};
    if (setting !== '' && setting !== 'sample') {
        const ids = setting.split(',').map(id => id.trim()).filter(Boolean);
        return {all: false, reason: `${sweep.variable} lists ${ids.length}`, ids, ...none};
    }
    const rotation = setting === '' && env.CI ? parseRotation(env.BEZEG_SWEEP_ROTATION) : null;
    if (setting === '' && env.CI && !rotation) return {all: true, reason: 'CI', ids: null, ...none};
    let paths;
    try {
        paths = changedPaths();
    } catch (error) {
        return {all: true, reason: `the changed files are unknown (${error.message.split('\n')[0]})`, ids: null, ...none};
    }
    // The variable =sample keeps the sample even after a shared change.
    const shared = setting === 'sample' ? undefined
        : paths.find(filePath => !isTest(filePath) && sweep.shared.some(pattern => pattern.test(filePath)));
    if (shared) return {all: true, reason: `${shared} is shared by every graph`, ids: null, ...none};
    const changedFiles = [...new Set(paths.filter(filePath => filePath.startsWith('src/') && !isTest(filePath)))].sort();
    const fileNames = changedFiles.map(filePath => filePath.replace(/^.*\//, '').replace(/\.[^.]+$/, ''));
    let family = [];
    try { family = familyClassNames(changedFiles, graphClasses()); } catch { /* unreadable factories: keep name matching only */ }
    const changedNames = [...new Set([...fileNames, ...family])].sort();
    if (rotation) return {all: false, reason: `CI rotation ${rotation.index}/${rotation.count}`, ids: null, changedNames, changedFiles, rotation};
    return {all: false, reason: 'sample', ids: null, changedNames, changedFiles};
}

/** @param {{env: Record<string, string | undefined>, changedPaths: () => string[]}} input */
const transientStateScope = input => sweepScope(SWEEPS.transientState, input);

const git = (args, cwd) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();

/**
 * Files changed since the branch left master, committed or not, including untracked files. `since` (CI's
 * BEZEG_SWEEP_BASE: the last verified master commit, or a pull request's merge base) replaces the merge base.
 */
function gitChangedPaths(cwd, since) {
    let base = since?.trim() || undefined;
    if (base) git(['cat-file', '-e', `${base}^{commit}`], cwd);
    for (const ref of base ? [] : ['origin/master', 'master']) {
        try { base = git(['merge-base', 'HEAD', ref], cwd); break; } catch { /* try the next ref */ }
    }
    if (!base) throw new Error('no merge base with master');
    const lines = text => text.split('\n').map(line => line.trim()).filter(Boolean);
    return [...lines(git(['diff', '--name-only', base], cwd)), ...lines(git(['ls-files', '--others', '--exclude-standard'], cwd))];
}

module.exports = {transientStateScope, sweepScope, parseRotation, ROTATION_SLICES, graphClassFiles, familyClassNames, SWEEPS, gitChangedPaths, SHARED_PATHS, LESSON_SHARED_PATHS, PRESET_SHARED_PATHS};
