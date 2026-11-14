'use strict';
// Static unit-test selection for `just check-changed` and the publish gate's slice check (phase 8 change 4 of
// docs/specs/verification-throughput.md). Vitest's `--changed` follows imports through the registries, so a one-graph
// edit selects 100+ files and a localization string most of the suite. This selection follows a changed file to the
// test files that import it, transitively, but stops at the registries (CUT_NODES): the tests of other graphs and
// lessons that reach the file only through a registry are left to hosted CI, which runs everything per push.
// Pure: reads the working tree, runs no command.

const fs = require('node:fs');
const path = require('node:path');
const {SHARED_PATHS, LESSON_SHARED_PATHS, PRESET_SHARED_PATHS} = require('./transient-state-scope.cjs');

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
// Vite's resolve.extensions as used here, plus .json; the importing file's own spelling wins first.
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'];
const MAX_FILES = 400;

/** The vite.config.mts Vitest include (both projects): every .test.ts/.test.tsx under src/. */
const isTestFile = file => /^src\/.*\.test\.(ts|tsx)$/.test(file);

/**
 * Registries that many files reach but that carry no behaviour of the file behind them: a change of one graph, lesson
 * chapter or catalog string selects its own importers, not every test that loads the registry. Never expanded unless
 * the registry itself changed.
 */
const isCutNode = file => file === 'src/graphs/allGraphFactories.ts'
    || file === 'src/graphs/graphLoaders.ts'
    || /^src\/graphs\/[^/]+\/runtime\.ts$/.test(file)
    || /^src\/learning\/content\/[^/]*Registry\.ts$/.test(file)
    || file === 'src/learning/content/chapterOwnedLessons.ts'
    || file === 'src/learning/runtime/lessonCatalog.ts'
    || file === 'src/localization/index.ts'
    || file === 'src/demonstrations.ts'
    || file === 'src/Routes.tsx';

const CONFIG_PATTERNS = [
    /^package(-lock)?\.json$/,
    /^vite\.config\.[^/]+$/,
    /^vitest\.config\.[^/]+$/,
    /^tsconfig[^/]*\.json$/,
    /^src\/setupTests\.[^/]+$/,
    /^eslint\.config\.[^/]+$/,
];

/**
 * Paths whose change keeps today's behaviour (everything Vitest's `--changed` selects). The shared paths of the catalog
 * sweeps under src/ (test files excluded: they select themselves); scripts/transient-state-scope.cjs is left out
 * because the sweep tests, which always run, read it at run time.
 */
function fallbackReason(file) {
    if (CONFIG_PATTERNS.some(pattern => pattern.test(file))) return `configuration file ${file} changed`;
    if (file.startsWith('src/') && !isTestFile(file) && [...SHARED_PATHS, ...LESSON_SHARED_PATHS, ...PRESET_SHARED_PATHS].some(pattern => pattern.test(file))) {
        return `shared path ${file} changed`;
    }
    return undefined;
}

function walk(root, dir, out) {
    for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
        const relative = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(root, relative, out);
        else out.push(relative);
    }
}

function globToRegExp(pattern) {
    let source = '';
    for (let index = 0; index < pattern.length; index += 1) {
        const char = pattern[index];
        if (char === '*') {
            if (pattern[index + 1] === '*') { source += '.*'; index += 1; if (pattern[index + 1] === '/') index += 1; } else source += '[^/]*';
        } else if (char === '?') source += '[^/]';
        else if (char === '{') source += '(?:';
        else if (char === '}') source += ')';
        else if (char === ',' ) source += '|';
        else source += char.replace(/[.+^$()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`^${source}$`);
}

const IMPORT_RE = /\b(import|export)\s+(type\s+)?(?:[^'"`;]*?\bfrom\s*)?['"]([^'"\n]+)['"]/g;
const CALL_RE = /\b(?:import|require|vi\.(?:mock|doMock|unmock|importActual|importMock|requireActual))\s*(?:<[^>()]*>)?\(\s*['"]([^'"\n]+)['"]/g;
const GLOB_RE = /import\.meta\.glob\s*(?:<[^>()]*>)?\(\s*(\[[^\]]*\]|['"][^'"\n]+['"])/g;

/** The specifiers a source text loads at run time (type-only imports are erased and skipped), and its glob patterns. */
function scanSpecifiers(text) {
    const specifiers = new Set();
    for (const match of text.matchAll(IMPORT_RE)) if (!match[2]) specifiers.add(match[3]);
    for (const match of text.matchAll(CALL_RE)) specifiers.add(match[1]);
    const globs = [];
    for (const match of text.matchAll(GLOB_RE)) for (const literal of match[1].matchAll(/['"]([^'"\n]+)['"]/g)) globs.push(literal[1]);
    return {specifiers, globs};
}

/**
 * The reverse import graph of src/: file -> Set of the files importing it. Edges also reach files outside src/ that a
 * source file imports by a relative path (so a changed script that a test requires selects that test).
 */
function buildReverseGraph(root) {
    const files = [];
    walk(root, 'src', files);
    const inGraph = new Set(files);
    const exists = candidate => {
        if (inGraph.has(candidate)) return true;
        if (candidate.startsWith('src/') || candidate.startsWith('..')) return false;
        try { return fs.statSync(path.join(root, candidate)).isFile(); } catch { return false; }
    };
    const resolveSpecifier = (from, specifier) => {
        if (!specifier.startsWith('.')) return undefined;
        const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier.replace(/[?#].*$/, '')));
        const stem = base.replace(/\.(m?js|jsx|cjs)$/, '');
        const candidates = [base, ...RESOLVE_EXTENSIONS.map(extension => `${base}${extension}`), ...RESOLVE_EXTENSIONS.map(extension => `${base}/index${extension}`)];
        if (stem !== base) candidates.push(`${stem}.ts`, `${stem}.tsx`);
        return candidates.find(exists);
    };
    const importers = new Map();
    const link = (target, from) => {
        if (!target || target === from) return;
        if (!importers.has(target)) importers.set(target, new Set());
        importers.get(target).add(from);
    };
    for (const file of files) {
        if (!SOURCE_EXTENSIONS.includes(path.posix.extname(file))) continue;
        const {specifiers, globs} = scanSpecifiers(fs.readFileSync(path.join(root, file), 'utf8'));
        for (const specifier of specifiers) link(resolveSpecifier(file, specifier), file);
        for (const glob of globs) {
            // Vite: a leading "/" is the project root, "./" the importing file's directory.
            const absolute = glob.startsWith('/') ? glob.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(file), glob));
            const matcher = globToRegExp(absolute);
            for (const candidate of files) if (matcher.test(candidate)) link(candidate, file);
        }
    }
    return {files: inGraph, importers};
}

/**
 * Test files that read a catalog sweep variable directly or through a helper: those importing catalogSweepScope.ts
 * (transitively, no registry cut) or naming one of the sweep variables.
 */
function sweepTestFiles(root, graph) {
    const reached = reach(graph, ['src/graphs/base/catalogSweepScope.ts'], () => false);
    return [...reached].filter(isTestFile);
}

function reach(graph, starts, isCut, cutFrom = new Set(starts)) {
    const seen = new Set(starts);
    const queue = [...starts];
    while (queue.length) {
        const node = queue.pop();
        for (const importer of graph.importers.get(node) ?? []) {
            if (seen.has(importer)) continue;
            seen.add(importer);
            // A registry is reached and recorded but not expanded, unless it is one of the changed files.
            if (isCut(importer) && !cutFrom.has(importer)) continue;
            queue.push(importer);
        }
    }
    return seen;
}

/**
 * @param {{root: string, changed: string[] | undefined, isCut?: (file: string) => boolean, maxFiles?: number}} input
 * `changed` are repository-relative paths with `/` separators (committed, uncommitted and untracked); `isCut` is a
 * test option (default CUT).
 * @returns {{kind: 'files', files: string[], sweeps: string[]} | {kind: 'fallback', reason: string} | {kind: 'empty'}}
 */
function selectUnitTests({root, changed, isCut = isCutNode, maxFiles = MAX_FILES}) {
    if (!changed) return {kind: 'fallback', reason: 'changed file list unknown'};
    const paths = [...new Set(changed.map(file => file.replace(/\\/g, '/')))];
    for (const file of paths) {
        const reason = fallbackReason(file);
        if (reason) return {kind: 'fallback', reason};
    }
    const graph = buildReverseGraph(root);
    const sourceChanges = paths.filter(file => file.startsWith('src/'));
    for (const file of sourceChanges) {
        if (!graph.files.has(file)) return {kind: 'fallback', reason: `${file} is not in the import graph (deleted or unreadable)`};
    }
    const starts = paths.filter(file => graph.files.has(file) || graph.importers.has(file));
    const selected = new Set();
    for (const file of reach(graph, starts, isCut)) if (isTestFile(file)) selected.add(file);
    const sweeps = sourceChanges.length || selected.size ? sweepTestFiles(root, graph) : [];
    for (const file of sweeps) selected.add(file);
    if (selected.size === 0) return {kind: 'empty'};
    if (selected.size > maxFiles) return {kind: 'fallback', reason: `selection of ${selected.size} files exceeds ${maxFiles}`};
    return {kind: 'files', files: [...selected].sort(), sweeps: [...sweeps].sort()};
}

module.exports = {selectUnitTests, buildReverseGraph, isCutNode, isTestFile, MAX_FILES};
