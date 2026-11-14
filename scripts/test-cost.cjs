'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, 'node_modules', '.vite', 'vitest');
const BASELINE = path.join(ROOT, '.command-logs', 'test-cost-baseline.json');
const NEW_FILE_SECONDS = 5;
const PARTIAL_RATIO = 0.8;

/** Merge every project's per-file durations from Vitest's results.json into {path: seconds}. */
function parseResults(raw) {
    if (!raw || typeof raw !== 'object' || !raw.projects || typeof raw.projects !== 'object') {
        throw new Error('Unrecognized results.json shape (expected a "projects" object).');
    }
    const files = {};
    for (const project of Object.values(raw.projects)) {
        for (const [file, entry] of Object.entries(project.files ?? {})) {
            files[file] = (files[file] ?? 0) + (entry.duration ?? 0) / 1000;
        }
    }
    return files;
}

function summarize(files, top) {
    const entries = Object.entries(files).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return {
        top: entries.slice(0, top),
        total: entries.reduce((sum, [, s]) => sum + s, 0),
        count: entries.length,
    };
}

/** Compare current files with a baseline snapshot; per-file deltas cover files present in both. */
function diff(files, baseline, {limit = 10} = {}) {
    const total = Object.values(files).reduce((sum, s) => sum + s, 0);
    const increases = [];
    const newSlow = [];
    for (const [file, seconds] of Object.entries(files)) {
        if (file in baseline.files) {
            const delta = seconds - baseline.files[file];
            if (delta > 0) increases.push([file, delta]);
        } else if (seconds > NEW_FILE_SECONDS) {
            newSlow.push([file, seconds]);
        }
    }
    const bySize = (a, b) => b[1] - a[1];
    return {
        totalDelta: total - baseline.total,
        increases: increases.sort(bySize).slice(0, limit),
        newSlow: newSlow.sort(bySize),
        partial: Object.keys(files).length < Object.keys(baseline.files).length * PARTIAL_RATIO,
    };
}

function findResults() {
    if (!fs.existsSync(CACHE_DIR)) return null;
    const candidates = fs.readdirSync(CACHE_DIR, {withFileTypes: true})
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(CACHE_DIR, entry.name, 'results.json'))
        .filter(file => fs.existsSync(file))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return candidates[0] ?? null;
}

/**
 * Per-file seconds from every results.json under dir, such as the unit shards' artifacts of a scheduled CI run
 * (`gh run download <run> -p 'unit-durations-*' -D <dir>`). Shards run disjoint files; a file found twice keeps its
 * longest duration.
 */
function readResultsDir(dir) {
    const found = [];
    const visit = current => {
        for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) visit(full);
            else if (entry.name === 'results.json') found.push(full);
        }
    };
    visit(dir);
    const files = {};
    for (const file of found) {
        for (const [name, seconds] of Object.entries(parseResults(JSON.parse(fs.readFileSync(file, 'utf8'))))) files[name] = Math.max(files[name] ?? 0, seconds);
    }
    return {files, count: found.length};
}

function revision() {
    try {
        return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim();
    } catch {
        return 'unknown';
    }
}

const fmt = seconds => seconds.toFixed(1).padStart(7);

function cli(args, out = process.stdout) {
    const save = args.includes('--save');
    const topIndex = args.indexOf('--top');
    const top = topIndex >= 0 ? Number(args[topIndex + 1]) : 15;
    const resultsIndex = args.indexOf('--results');
    const resultsDir = resultsIndex >= 0 ? args[resultsIndex + 1] : undefined;
    if (!Number.isInteger(top) || top < 1 || (resultsIndex >= 0 && !resultsDir)) throw new Error('Usage: just test-cost [--save] [--top N] [--results <dir>]');
    let files;
    if (resultsDir) {
        if (!fs.existsSync(resultsDir)) throw new Error(`No such directory: ${resultsDir}`);
        const read = readResultsDir(resultsDir);
        if (!read.count) {
            out.write(`No results.json under ${resultsDir}.\n`);
            return 1;
        }
        files = read.files;
        out.write(`Read ${read.count} results.json file${read.count === 1 ? '' : 's'} under ${resultsDir}.\n`);
    } else {
        const resultsFile = findResults();
        if (!resultsFile) {
            out.write('No Vitest results cache found. Run `just check` or `just unit` first.\n');
            return 1;
        }
        files = parseResults(JSON.parse(fs.readFileSync(resultsFile, 'utf8')));
    }
    const summary = summarize(files, top);
    if (save) {
        fs.mkdirSync(path.dirname(BASELINE), {recursive: true});
        const snapshot = {files, total: summary.total, at: new Date().toISOString(), revision: revision()};
        fs.writeFileSync(BASELINE, `${JSON.stringify(snapshot, null, 2)}\n`);
        out.write(`Saved baseline: ${summary.count} files, ${summary.total.toFixed(1)} s (${path.relative(ROOT, BASELINE)}).\n`);
        return 0;
    }
    out.write(`Slowest ${summary.top.length} of ${summary.count} unit test files (seconds):\n`);
    for (const [file, seconds] of summary.top) out.write(`${fmt(seconds)}  ${file}\n`);
    out.write(`Total: ${summary.total.toFixed(1)} file-seconds across ${summary.count} files.\n`);
    if (!fs.existsSync(BASELINE)) {
        out.write('No baseline; run `just test-cost --save` after a full `just unit` to record one.\n');
        return 0;
    }
    const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    const d = diff(files, baseline);
    const sign = d.totalDelta >= 0.05 ? '+' : '';
    if (Math.abs(d.totalDelta) < 0.05) d.totalDelta = 0;
    out.write(`Baseline ${baseline.revision} (${baseline.at}): ${baseline.total.toFixed(1)} s across ${Object.keys(baseline.files).length} files; total delta ${sign}${d.totalDelta.toFixed(1)} s.\n`);
    if (d.partial) out.write('Note: this looks like a partial (filtered) run; per-file deltas cover only files present in both and the total delta is not comparable.\n');
    if (d.increases.length) out.write(`Largest per-file increases:\n${d.increases.map(([f, s]) => `  +${s.toFixed(1)}  ${f}`).join('\n')}\n`);
    if (d.newSlow.length) out.write(`New files above ${NEW_FILE_SECONDS} s:\n${d.newSlow.map(([f, s]) => `  ${s.toFixed(1)}  ${f}`).join('\n')}\n`);
    return 0;
}

module.exports = {parseResults, readResultsDir, summarize, diff, cli};

if (require.main === module) process.exitCode = cli(process.argv.slice(2));
