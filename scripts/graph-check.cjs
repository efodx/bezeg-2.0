// Per-graph check recipe: node scripts/graph-check.cjs <graph-id> [--route <path>] [--base <url>] [--seeds N]
// Runs the declaration contract test, the parity test and the graph's declaration test, filtered to one graph,
// then (with --base) the jank probe and a short fuzz. Prints a summary block; exit 1 on any failure.
const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const id = argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
if (!id) { console.error('usage: just graph-check <graph-id> [--route <path>] [--base <url>] [--seeds N]'); process.exit(2); }
const base = opt('--base');
const route = opt('--route') || `analysis/${id}`;
const seeds = Math.min(+(opt('--seeds') || 3), 3);
const logDir = path.join('.command-logs', 'graph-check');
fs.mkdirSync(logDir, {recursive: true});

const run = (cmd, args, log, env) => {
    const r = spawnSync(cmd, args, {encoding: 'utf8', env: {...process.env, ...env}});
    fs.writeFileSync(path.join(logDir, `${id}-${log}.log`), `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
    return r;
};
const rows = [];

/** One vitest run through `just unit`; fails when it fails or when the filter matched no test. */
function unit(label, files, filter, env) {
    const out = path.join(logDir, `${id}-${label}.json`);
    try { fs.rmSync(out); } catch { /* none */ }
    const args = ['unit', ...files, ...(filter ? ['-t', filter] : []), '--reporter=json', `--outputFile=${out}`];
    const r = run('just', args, label, env);
    let passed = 0, failed = 0;
    try {
        const j = JSON.parse(fs.readFileSync(out, 'utf8'));
        passed = j.numPassedTests; failed = j.numFailedTests;
    } catch { /* no report */ }
    const ok = r.status === 0 && failed === 0 && passed > 0;
    rows.push({label, ok, detail: ok ? `${passed} passed` : passed === 0 && failed === 0 ? `no test matched "${filter ?? files.join(' ')}" (log ${label}.log)` : `${failed} failed, exit ${r.status} (log .command-logs/graph-check/${id}-${label}.log)`});
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
unit('contract', ['src/learning/content/declarationContract.test.tsx'], ` ${esc(id)}: `);

const R = require('./graph-check-resolve.cjs');
const inventory = JSON.parse(fs.readFileSync('docs/reviews/ux-picks-app-wide/inventory/inventory.json', 'utf8'));
const partition = JSON.parse(fs.readFileSync('docs/reviews/ux-picks-app-wide/inventory/08-partition.json', 'utf8'));
const graphFile = R.graphFileOf(inventory, id);
const declTest = R.declarationTestOf(graphFile);
const recordings = R.parityRecordingsOf(fs.readFileSync('src/graphs/base/declare/parity.test.tsx', 'utf8'), id);
if (recordings.length) unit('parity', ['src/graphs/base/declare/parity.test.tsx'], R.parityFilter(recordings), {BEZEG_PARITY_CHECK: '1'});
else {
    // No recording: parity is not applicable when the declaration shows no values (no readouts, notes, help or status).
    const na = id;
    const before = rows.length;
    unit('parity-na', ['src/graphs/base/declare/parityApplicable.test.tsx'], 'the graph under check shows no values', {BEZEG_PARITY_NA: na});
    const row = rows[before];
    if (row.ok) { row.label = 'parity'; row.detail = 'n/a (no shown values)'; }
    else { row.label = 'parity'; row.detail = `no parity recording in parity.test.tsx SAMPLES with demonstration '${id}' (and the declaration shows values; log .command-logs/graph-check/${id}-parity-na.log)`; }
}
// A golden recording (task 08 step 3: default state and every lesson step) is a separate row; it does not replace parity.
const golden = fs.readdirSync('src/graphs', {recursive: true}).map(String).some(f => f.replace(/\\/g, '/').endsWith(`__parity__/${id}.golden.json`));
if (golden) unit('golden', ['src/graphs/base/declare/parityGolden.test.tsx'], `golden panels ${esc(id)}$`, {BEZEG_PARITY_GOLDEN_CHECK: '1', BEZEG_PARITY_GOLDEN_ID: id});
if (declTest && fs.existsSync(declTest)) unit('declaration', [declTest]);
else rows.push({label: 'declaration', ok: false, detail: graphFile ? `no ${declTest}` : `${id} is not in the inventory (inventory.json)`});
const shared = R.sharedTestsOf(partition, id);
if (shared.length) unit('shared', shared);

if (base) {
    const node = (script, args, label) => {
        const r = run(process.execPath, [script, ...args], label);
        const ok = r.status === 0;
        const lines = `${r.stdout}\n${r.stderr}`.split('\n').filter(l => l.trim());
        rows.push({label, ok, detail: ok ? 'exit 0' : `exit ${r.status}: ${lines.slice(-2).join(' | ').slice(0, 200)}`});
    };
    node('scripts/probe/probe.cjs', ['--base', base, '--route', route], 'probe');
    node('scripts/fuzz/fuzz.cjs', ['--base', base, '--route', route, '--seeds', String(seeds)], 'fuzz');
} else rows.push({label: 'browser', ok: true, detail: 'skipped (no --base)'});

const failed = rows.filter(r => !r.ok);
console.log(`\ngraph-check ${id}: ${failed.length ? 'FAIL' : 'PASS'}`);
for (const r of rows) console.log(`  ${r.ok ? 'pass' : 'FAIL'}  ${r.label.padEnd(12)} ${r.detail}`);
process.exitCode = failed.length ? 1 : 0;
