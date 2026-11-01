'use strict';
// Decides which Demonstrations the transient state contract (src/graphs/base/graphTransientStateContract.tsx) mounts.
// The contract mounts every graph several times on a real board and costs about 13 CPU minutes, so a local run checks a
// representative sample plus the graphs the branch changed; CI and BEZEG_TRANSIENT_STATE=all check every graph.
// See docs/commands.md, "Transient state contract scope".

const {execFileSync} = require('node:child_process');

/** Changed files that every graph's scene, restoration or drawing depends on: their change runs the whole contract. */
const SHARED_PATHS = [
    /^src\/graphs\/base\//,
    /^src\/graphs\/graphFactories\.ts$/,
    /^src\/graphs\/curves\/object\//,
    /^src\/graphs\/styles\//,
    /^src\/bezeg\//,
    /^src\/learning\/model\.ts$/,
    /^package(-lock)?\.json$/,
    /^vite\.config\.mts$/,
    /^scripts\/transient-state-scope\.cjs$/,
];

const isTest = filePath => /\.test\.[jt]sx?$/.test(filePath);

/**
 * @param {{env: Record<string, string | undefined>, changedPaths: () => string[]}} input
 * @returns {{all: boolean, reason: string, ids: string[] | null, changedNames: string[]}}
 *   `ids` is an explicit selection (BEZEG_TRANSIENT_STATE=a,b); otherwise the contract adds the graphs whose class (or
 *   a superclass) is named like a changed file in `changedNames` to its sample.
 */
function transientStateScope({env, changedPaths}) {
    const setting = (env.BEZEG_TRANSIENT_STATE ?? '').trim();
    if (setting === 'all') return {all: true, reason: 'BEZEG_TRANSIENT_STATE=all', ids: null, changedNames: []};
    if (setting !== '' && setting !== 'sample') {
        const ids = setting.split(',').map(id => id.trim()).filter(Boolean);
        return {all: false, reason: `BEZEG_TRANSIENT_STATE lists ${ids.length}`, ids, changedNames: []};
    }
    if (setting === '' && env.CI) return {all: true, reason: 'CI', ids: null, changedNames: []};
    let paths;
    try {
        paths = changedPaths();
    } catch (error) {
        return {all: true, reason: `the changed files are unknown (${error.message.split('\n')[0]})`, ids: null, changedNames: []};
    }
    // BEZEG_TRANSIENT_STATE=sample keeps the sample even after a shared change.
    const shared = setting === 'sample' ? undefined
        : paths.find(filePath => !isTest(filePath) && SHARED_PATHS.some(pattern => pattern.test(filePath)));
    if (shared) return {all: true, reason: `${shared} is shared by every graph`, ids: null, changedNames: []};
    const changedNames = [...new Set(paths
        .filter(filePath => filePath.startsWith('src/') && !isTest(filePath))
        .map(filePath => filePath.replace(/^.*\//, '').replace(/\.[^.]+$/, '')))].sort();
    return {all: false, reason: 'sample', ids: null, changedNames};
}

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

module.exports = {transientStateScope, gitChangedPaths, SHARED_PATHS};
