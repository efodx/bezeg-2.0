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

const run = (cmd, args, log) => {
    const r = spawnSync(cmd, args, {encoding: 'utf8'});
    fs.writeFileSync(path.join(logDir, `${id}-${log}.log`), `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
    return r;
};
const rows = [];

/** One vitest run through `just unit`; fails when it fails or when the filter matched no test. */
function unit(label, files, filter) {
    const out = path.join(logDir, `${id}-${label}.json`);
    try { fs.rmSync(out); } catch { /* none */ }
    const args = ['unit', ...files, ...(filter ? ['-t', filter] : []), '--reporter=json', `--outputFile=${out}`];
    const r = run('just', args, label);
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

const parity = fs.readdirSync('src/graphs', {recursive: true}).map(String).some(f => f.replace(/\\/g, '/').endsWith(`__parity__/${id}.json`));
const bare = id.replace(/-/g, '').toLowerCase();
const declTests = fs.readdirSync('src/graphs', {recursive: true}).map(String).filter(f => /\.declaration\.test\.tsx$/.test(f) && path.basename(f).toLowerCase().startsWith(bare)).map(f => 'src/graphs/' + f.replace(/\\/g, '/'));
if (parity) unit('parity', ['src/graphs/base/declare/parity.test.tsx'], `parity recording ${esc(id)} `);
else rows.push({label: 'parity', ok: false, detail: `no recording src/graphs/**/__parity__/${id}.json`});
if (declTests.length) unit('declaration', declTests);
else rows.push({label: 'declaration', ok: false, detail: `no src/graphs/**/${id}*.declaration.test.tsx`});

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
