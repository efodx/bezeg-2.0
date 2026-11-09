'use strict';
// Decides which entries the catalog sweeps run. Tier: sampled locally, full in CI.
//   transient state    src/graphs/base/graphTransientStateContract.tsx  (BEZEG_TRANSIENT_STATE)
//   lesson restoration src/learning/runtime/lessonRestorationContract.tsx  (BEZEG_LESSON_RESTORATION)
//   scene content      src/learning/content/sceneContentAgainstGraphs.test.tsx  (BEZEG_SCENE_CONTENT)
//   scene replacement  src/graphs/base/sceneReplacementContract.test.tsx  (BEZEG_SCENE_REPLACEMENT)
// Each sweep mounts many graphs on real boards, so a local run checks a representative sample plus the entries the
// branch's changed files reach; CI, BEZEG_SWEEPS=all and the sweep's own variable =all check every entry.
// See docs/commands.md, "Catalog sweep scope".

const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/** Changed files that every graph's scene, restoration or drawing depends on: their change runs the whole contract. */
const SHARED_PATHS = [
    /^src\/graphs\/base\//,
    /^src\/graphs\/graphFactories\.ts$/,
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

/** The sweeps that sample locally and run every entry in CI: the env variable that tunes each, and its shared paths. */
const SWEEPS = {
    transientState: {variable: 'BEZEG_TRANSIENT_STATE', shared: SHARED_PATHS},
    lessonRestoration: {variable: 'BEZEG_LESSON_RESTORATION', shared: LESSON_SHARED_PATHS},
    sceneContent: {variable: 'BEZEG_SCENE_CONTENT', shared: LESSON_SHARED_PATHS},
    sceneReplacement: {variable: 'BEZEG_SCENE_REPLACEMENT', shared: SHARED_PATHS},
};

const isTest = filePath => /\.test\.[jt]sx?$/.test(filePath);

/**
 * The graph classes the Demonstrations instantiate and the directory of each class file, read from the imports of
 * src/graphs/graphFactories.ts (`import X from './dir/X'` or `import {X} from './dir/X'`): [{name, dir: 'src/graphs/dir'}].
 */
function graphClassFiles(root = path.join(__dirname, '..')) {
    const source = fs.readFileSync(path.join(root, 'src/graphs/graphFactories.ts'), 'utf8');
    const classes = [];
    for (const match of source.matchAll(/^import\s+(?:(\w+)|\{([^}]*)\})\s+from\s+'\.\/([^']+)'/gm)) {
        const dir = path.posix.join('src/graphs', path.posix.dirname(match[3]));
        const names = match[1] ? [match[1]] : match[2].split(',').map(name => name.trim().split(/\s+as\s+/).pop()).filter(Boolean);
        for (const name of names) classes.push({name, dir});
    }
    return classes;
}

/**
 * Family reach: a changed non-test file under src/graphs/<dir>/ (not shared) that is no graph class file selects the
 * Demonstrations whose graph class files sit in that directory or below it. Returns those class names; a directory with
 * no graph class file adds none (the sweep keeps its sample).
 */
function familyClassNames(changedFiles, classes) {
    const classNames = new Set(classes.map(({name}) => name));
    const names = new Set();
    for (const file of changedFiles) {
        if (!file.startsWith('src/graphs/')) continue;
        if (classNames.has(file.replace(/^.*\//, '').replace(/\.[^.]+$/, ''))) continue;
        const dir = path.posix.dirname(file);
        for (const {name, dir: classDir} of classes) if (classDir === dir || classDir.startsWith(`${dir}/`)) names.add(name);
    }
    return [...names];
}

/**
 * Which entries of a catalog sweep run. `BEZEG_SWEEPS=all` forces every sweep to all. The sweep's own variable takes
 * `all`, `sample` (keeps the sample even after a shared change, even in CI) or a comma list of ids; unset, CI and a
 * change to a shared path run everything, else the sample plus what the changed files reach.
 * @param {{variable: string, shared: RegExp[]}} sweep
 * @param {{env: Record<string, string | undefined>, changedPaths: () => string[], graphClasses?: () => {name: string, dir: string}[]}} input
 * @returns {{all: boolean, reason: string, ids: string[] | null, changedNames: string[], changedFiles: string[]}}
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
    if (setting === '' && env.CI) return {all: true, reason: 'CI', ids: null, ...none};
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
    return {all: false, reason: 'sample', ids: null, changedNames, changedFiles};
}

/** @param {{env: Record<string, string | undefined>, changedPaths: () => string[]}} input */
const transientStateScope = input => sweepScope(SWEEPS.transientState, input);

const git = (args, cwd) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();

/** Files changed since the branch left master, committed or not, including untracked files. */
function gitChangedPaths(cwd) {
    let base;
    for (const ref of ['origin/master', 'master']) {
        try { base = git(['merge-base', 'HEAD', ref], cwd); break; } catch { /* try the next ref */ }
    }
    if (!base) throw new Error('no merge base with master');
    const lines = text => text.split('\n').map(line => line.trim()).filter(Boolean);
    return [...lines(git(['diff', '--name-only', base], cwd)), ...lines(git(['ls-files', '--others', '--exclude-standard'], cwd))];
}

module.exports = {transientStateScope, sweepScope, graphClassFiles, familyClassNames, SWEEPS, gitChangedPaths, SHARED_PATHS, LESSON_SHARED_PATHS};
