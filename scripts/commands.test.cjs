'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Writable} = require('node:stream');
const {spawn, spawnSync} = require('node:child_process');
const test = require('node:test');
const commands = require('./commands.cjs');

function fixture() {
    const root = fs.mkdtempSync(path.join(__dirname, '..', '.command-test-'));
    fs.mkdirSync(path.join(root, 'src'), {recursive: true});
    fs.mkdirSync(path.join(root, 'build'), {recursive: true});
    fs.writeFileSync(path.join(root, 'src/main.js'), 'source');
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(path.join(root, 'build/index.html'), '<main>built</main>');
    return root;
}

function cleanup(root) { fs.rmSync(root, {recursive: true, force: true}); }

test('runs plans in order, stops at failure and preserves the original code', async () => {
    const root = fixture();
    const events = path.join(root, 'events.log');
    const step = (label, code, exit = 0) => ({label, executable: process.execPath, args: ['-e', `require('node:fs').appendFileSync(${JSON.stringify(events)}, ${JSON.stringify(`${code}\n`)}); process.exit(${exit})`]});
    try {
        const code = await commands.runPlan({root, scope: 'fail-fast', env: {}, steps: [step('first', 'first'), step('second', 'second', 23), step('never', 'never')]});
        assert.equal(code, 23);
        assert.equal(fs.readFileSync(events, 'utf8'), 'first\nsecond\n');
        assert.equal(fs.readdirSync(path.join(root, '.command-logs')).length, 1);
        assert.ok(fs.statSync(path.join(root, '.command-logs', fs.readdirSync(path.join(root, '.command-logs'))[0])).size > 0);
    } finally { cleanup(root); }
});

test('forwards arguments as discrete values to a real child process', async () => {
    const root = fixture();
    const log = path.join(root, 'args.log');
    const args = ['space value', '"quoted"', 'left|right', '$HOME', '&;`()'];
    const script = `process.stdout.write(JSON.stringify(process.argv.slice(1)))`;
    try {
        const result = await commands.runChild({executable: process.execPath, args: ['-e', script, ...args], cwd: root, env: {}, log});
        assert.equal(result.code, 0);
        assert.deepEqual(JSON.parse(result.tail), args);
    } finally { cleanup(root); }
});

test('keeps full logs, streams only in verbose mode, and bounds failure excerpts', async () => {
    const root = fixture();
    const log = path.join(root, 'output.log');
    const long = 'diagnostic'.repeat(3000);
    const result = await commands.runChild({executable: process.execPath, args: ['-e', `console.log(${JSON.stringify(long)}); process.exit(7)`], cwd: root, env: {}, log, verbose: false});
    try {
        const full = fs.readFileSync(log, 'utf8');
        assert.equal(result.code, 7);
        assert.ok(full.length > 16 * 1024);
        assert.ok(Buffer.byteLength(result.tail) <= 16 * 1024);
    } finally { cleanup(root); }
});

test('verbose mode streams child output and keeps the same complete log', async () => {
    const root = fixture();
    const log = path.join(root, 'verbose.log');
    let streamed = '';
    const destination = new Writable({write(chunk, encoding, done) { streamed += chunk.toString(); done(); }});
    try {
        const result = await commands.runChild({executable: process.execPath, args: ['-e', "process.stdout.write('visible output')"], cwd: root, env: {}, log, verbose: true, stdout: destination, stderr: destination});
        assert.equal(result.code, 0);
        assert.match(streamed, /visible output/);
        assert.match(fs.readFileSync(log, 'utf8'), /visible output/);
    } finally { cleanup(root); }
});

test('reports an unstartable executable with exit 127', async () => {
    const root = fixture();
    try {
        const result = await commands.runChild({executable: path.join(root, 'missing-tool'), cwd: root, env: {}, log: path.join(root, 'missing.log')});
        assert.equal(result.code, 127);
        assert.match(result.error.message, /ENOENT/);
    } finally { cleanup(root); }
});

test('resolves npm from the setup-node lib/node_modules layout', () => {
    const root = fixture();
    const node = path.join(root, 'node/bin/node');
    const npmCli = path.join(root, 'node/lib/node_modules/npm/bin/npm-cli.js');
    fs.mkdirSync(path.dirname(node), {recursive: true});
    fs.mkdirSync(path.dirname(npmCli), {recursive: true});
    fs.writeFileSync(node, '');
    fs.writeFileSync(npmCli, '');
    try {
        assert.equal(commands.resolveNpmCli({execPath: node, env: {}, pathValue: ''}), npmCli);
    } finally { cleanup(root); }
});

test('resolves an npm executable symlink found on PATH', t => {
    if (process.platform === 'win32') return t.skip('Windows npm wrappers are resolved from the Node installation');
    const root = fixture();
    const npmCli = path.join(root, 'share/npm/bin/npm-cli.js');
    const npmLink = path.join(root, 'bin/npm');
    fs.mkdirSync(path.dirname(npmCli), {recursive: true});
    fs.mkdirSync(path.dirname(npmLink), {recursive: true});
    fs.writeFileSync(npmCli, '');
    fs.symlinkSync(npmCli, npmLink);
    try {
        assert.equal(commands.resolveNpmCli({execPath: path.join(root, 'node'), env: {}, pathValue: path.dirname(npmLink)}), fs.realpathSync(npmLink));
    } finally { cleanup(root); }
});

test('propagates a signal to its child and returns a signal exit code', {timeout: 10_000}, async () => {
    const root = fixture();
    const ready = path.join(root, 'signal-ready');
    const wrapper = path.join(root, 'signal-wrapper.cjs');
    const runnerPath = path.join(__dirname, 'commands.cjs');
    fs.writeFileSync(wrapper, `const fs=require('node:fs'); const {runChild}=require(${JSON.stringify(runnerPath)}); const task=runChild({executable:process.execPath,args:['-e','setInterval(()=>{},1000)'],cwd:${JSON.stringify(root)},env:process.env,log:${JSON.stringify(path.join(root, 'signal.log'))}}); fs.writeFileSync(${JSON.stringify(ready)},'ready'); setTimeout(()=>process.emit('SIGTERM'),100); task.then(result=>{process.exitCode=result.code});`);
    const wrapperChild = spawn(process.execPath, [wrapper], {cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    const closed = new Promise((resolve, reject) => {
        wrapperChild.once('error', reject);
        wrapperChild.once('close', (code, signal) => resolve({code, signal}));
    });
    let wrapperOutput = '';
    wrapperChild.stdout.setEncoding('utf8').on('data', chunk => { wrapperOutput += chunk; });
    wrapperChild.stderr.setEncoding('utf8').on('data', chunk => { wrapperOutput += chunk; });
    try {
        const started = Date.now();
        while (!fs.existsSync(ready) && Date.now() - started < 4000) await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(fs.existsSync(ready), true, `signal fixture should start: ${wrapperOutput}`);
        const result = await closed;
        assert.equal(result.code, 143);
    } finally {
        if (wrapperChild.exitCode === null) wrapperChild.kill('SIGKILL');
        cleanup(root);
    }
});

test('verbose output sink failure stops the child and keeps the file log', {timeout: 10_000}, async () => {
    const root = fixture();
    const log = path.join(root, 'verbose-failure.log');
    const sentinel = path.join(root, 'child-survived-verbose-error');
    const brokenPipe = Object.assign(new Error('closed output pipe'), {code: 'EPIPE'});
    const destination = new Writable({highWaterMark: 1024, write(chunk, encoding, done) { setTimeout(() => done(brokenPipe), 25); }});
    try {
        const result = await commands.runChild({
            executable: process.execPath,
            args: ['-e', `process.stdout.write('logged before pipe error'.repeat(32768)); setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'alive'), 3000); setInterval(()=>{}, 1000)`],
            cwd: root,
            env: {},
            log,
            verbose: true,
            stdout: destination,
            stderr: destination,
        });
        assert.notEqual(result.code, 0);
        assert.equal(result.verboseError.code, 'EPIPE');
        assert.match(fs.readFileSync(log, 'utf8'), /logged before pipe error/);
        assert.equal(fs.existsSync(sentinel), false);
    } finally { cleanup(root); }
});

test('CLI keeps a broken summary pipe from crashing or reporting success', {timeout: 10_000}, async () => {
    const root = fixture();
    const npmCli = path.join(root, 'npm-cli.js');
    const ready = path.join(root, 'cli-ready');
    fs.mkdirSync(path.join(root, 'scripts'), {recursive: true});
    fs.copyFileSync(path.join(__dirname, 'commands.cjs'), path.join(root, 'scripts/commands.cjs'));
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(npmCli, '');
    const wrapper = path.join(root, 'cli-wrapper.cjs');
    fs.writeFileSync(wrapper, `require('node:fs').writeFileSync(${JSON.stringify(ready)},'ready'); require('./scripts/commands.cjs').cli(['unit'])`);
    const wrapperChild = spawn(process.execPath, [wrapper], {cwd: root, windowsHide: true, env: {...process.env, npm_execpath: npmCli}, stdio: ['ignore', 'pipe', 'pipe']});
    const closed = new Promise((resolve, reject) => {
        wrapperChild.once('error', reject);
        wrapperChild.once('close', (code, signal) => resolve({code, signal}));
    });
    wrapperChild.stdout.resume();
    try {
        const started = Date.now();
        while (!fs.existsSync(ready) && Date.now() - started < 4000) await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(fs.existsSync(ready), true, 'CLI fixture should start');
        wrapperChild.stdout.destroy();
        const result = await closed;
        assert.equal(result.code, 1);
        assert.equal(fs.readdirSync(path.join(root, '.command-logs')).length, 1);
    } finally {
        if (wrapperChild.exitCode === null) wrapperChild.kill('SIGKILL');
        cleanup(root);
    }
});

test('log write failure kills the child and returns a failed result', {timeout: 10_000}, async () => {
    const root = fixture();
    const logDirectory = path.join(root, 'is-a-directory.log');
    const sentinel = path.join(root, 'child-survived.log-error');
    fs.mkdirSync(logDirectory);
    try {
        const result = await commands.runChild({
            executable: process.execPath,
            args: ['-e', `setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'alive'), 3000); setInterval(()=>{}, 1000)`],
            cwd: root,
            env: {},
            log: logDirectory,
        });
        assert.notEqual(result.code, 0);
        assert.match(result.logError.message, /EISDIR|EPERM|access/i);
        assert.equal(fs.existsSync(sentinel), false);
    } finally { cleanup(root); }
});

test('validates and strips smoke port options', () => {
    assert.deepEqual(commands.parsePortArgs(['--port', '4312', 'grep', 'quoted value'], 4173), {port: 4312, args: ['grep', 'quoted value']});
    for (const args of [['--port', '0'], ['--port', '65536'], ['--port', '4.5'], ['--port']]) {
        assert.throws(() => commands.parsePortArgs(args, 4173), /port/i);
    }
});

test('provenance rejects changed inputs and changed or missing output', async () => {
    const root = fixture();
    const stampPath = path.join(root, '.bezeg-build-provenance.json');
    try {
        await assert.rejects(commands.assertProvenance(root), /provenance is missing/);
        fs.writeFileSync(stampPath, 'not json');
        await assert.rejects(commands.assertProvenance(root), /provenance is unreadable/);
        fs.writeFileSync(stampPath, 'null');
        await assert.rejects(commands.assertProvenance(root), /provenance is invalid/);
        const stamp = {version: 1, revision: 'fixture', dirty: false, inputs: commands.digestInputs(root), output: commands.digestBuild(root)};
        fs.writeFileSync(stampPath, JSON.stringify(stamp));
        await commands.assertProvenance(root);
        fs.writeFileSync(path.join(root, '.env.production.local'), 'VITE_TEST=one');
        await assert.rejects(commands.assertProvenance(root), /inputs changed/);
        stamp.inputs = commands.digestInputs(root);
        fs.writeFileSync(stampPath, JSON.stringify(stamp));
        fs.writeFileSync(path.join(root, 'vite.config.js'), 'export default {}');
        await assert.rejects(commands.assertProvenance(root), /inputs changed/);
        stamp.inputs = commands.digestInputs(root);
        fs.writeFileSync(stampPath, JSON.stringify(stamp));
        fs.writeFileSync(path.join(root, 'src/main.js'), 'changed');
        await assert.rejects(commands.assertProvenance(root), /inputs changed/);
        stamp.inputs = commands.digestInputs(root);
        fs.writeFileSync(stampPath, JSON.stringify(stamp));
        fs.writeFileSync(path.join(root, 'build/index.html'), 'different');
        await assert.rejects(commands.assertProvenance(root), /output changed/);
        fs.rmSync(path.join(root, 'build'), {recursive: true});
        await assert.rejects(commands.assertProvenance(root), /Build output is missing/);
    } finally { cleanup(root); }
});

test('build refuses provenance when a build changes its source inputs', async () => {
    const root = fixture();
    const priorNpmExecPath = process.env.npm_execpath;
    const npmCli = path.join(root, 'npm-cli.js');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({scripts: {build: 'fixture'}}));
    fs.writeFileSync(npmCli, `const fs=require('node:fs'); fs.writeFileSync('src/main.js','changed during build'); fs.writeFileSync('build/index.html','built');`);
    process.env.npm_execpath = npmCli;
    try {
        assert.equal(await commands.execute('build', [], {root}), 1);
        assert.equal(fs.existsSync(path.join(root, '.bezeg-build-provenance.json')), false);
    } finally {
        if (priorNpmExecPath === undefined) delete process.env.npm_execpath;
        else process.env.npm_execpath = priorNpmExecPath;
        cleanup(root);
    }
});

test('check-localization runs the local compiler before build and stamps its output', async () => {
    const root = fixture();
    const priorNpmExecPath = process.env.npm_execpath;
    const npmCli = path.join(root, 'npm-cli.js');
    const events = path.join(root, 'events.log');
    fs.mkdirSync(path.join(root, 'node_modules/typescript/bin'), {recursive: true});
    fs.writeFileSync(path.join(root, 'node_modules/typescript/bin/tsc'), `require('node:fs').appendFileSync(${JSON.stringify(events)}, 'typecheck\\n')`);
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({scripts: {build: 'node build-fixture.cjs'}}));
    fs.writeFileSync(path.join(root, 'build-fixture.cjs'), `require('node:fs').appendFileSync(${JSON.stringify(events)}, 'build\\n'); require('node:fs').writeFileSync('build/index.html', 'fixture build')`);
    fs.writeFileSync(npmCli, `const args=process.argv.slice(2); if (JSON.stringify(args)!==JSON.stringify(['run','build'])) process.exit(31); require('./build-fixture.cjs')`);
    process.env.npm_execpath = npmCli;
    try {
        const code = await commands.execute('check-localization', [], {root});
        assert.equal(code, 0);
        assert.equal(fs.readFileSync(events, 'utf8'), 'typecheck\nbuild\n');
        await commands.assertProvenance(root);
    } finally {
        if (priorNpmExecPath === undefined) delete process.env.npm_execpath;
        else process.env.npm_execpath = priorNpmExecPath;
        cleanup(root);
    }
});

test('typecheck runs only the local compiler', async () => {
    const root = fixture();
    const events = path.join(root, 'events.log');
    fs.mkdirSync(path.join(root, 'node_modules/typescript/bin'), {recursive: true});
    fs.writeFileSync(path.join(root, 'node_modules/typescript/bin/tsc'), `require('node:fs').appendFileSync(${JSON.stringify(events)}, JSON.stringify(process.argv.slice(2)))`);
    try {
        assert.equal(await commands.execute('typecheck', [], {root}), 0);
        assert.deepEqual(JSON.parse(fs.readFileSync(events, 'utf8')), ['--noEmit', '--pretty', 'false']);
        assert.equal(fs.existsSync(path.join(root, '.bezeg-build-provenance.json')), false);
    } finally { cleanup(root); }
});

test('lint runs the local ESLint on the repository or on the given paths', async () => {
    const root = fixture();
    const events = path.join(root, 'events.log');
    fs.mkdirSync(path.join(root, 'node_modules/eslint/bin'), {recursive: true});
    fs.writeFileSync(path.join(root, 'node_modules/eslint/bin/eslint.js'), `require('node:fs').appendFileSync(${JSON.stringify(events)}, JSON.stringify(process.argv.slice(2)) + '\\n')`);
    try {
        assert.equal(await commands.execute('lint', [], {root}), 0);
        assert.equal(await commands.execute('lint', ['tests', '--max-warnings', '0'], {root}), 0);
        assert.deepEqual(fs.readFileSync(events, 'utf8').trim().split('\n').map(line => JSON.parse(line)), [['.'], ['tests', '--max-warnings', '0']]);
    } finally { cleanup(root); }
});

test('smoke-lesson validates ids and forwards a lesson grep with remaining arguments to the built smoke script', async () => {
    const root = fixture();
    const priorNpmExecPath = process.env.npm_execpath;
    const npmCli = path.join(root, 'npm-cli.js');
    fs.mkdirSync(path.join(root, 'tests'), {recursive: true});
    fs.writeFileSync(path.join(root, 'tests/guided-lessons.smoke.spec.cjs'), "const rows = [{\n    id: 'sequence',\n}, {\n    id: 'sequence-convergence',\n}, {\n    id: 'taylor',\n}];");
    fs.writeFileSync(npmCli, `require('node:fs').writeFileSync('received.json', JSON.stringify({args: process.argv.slice(2), port: process.env.SMOKE_PORT}))`);
    fs.writeFileSync(path.join(root, '.bezeg-build-provenance.json'), JSON.stringify({version: 1, revision: 'fixture', dirty: false, inputs: commands.digestInputs(root), output: commands.digestBuild(root)}));
    process.env.npm_execpath = npmCli;
    try {
        assert.throws(() => commands.lessonGrep(root, []), /Usage/);
        assert.throws(() => commands.lessonGrep(root, ['taylr']), /Unknown lesson id "taylr".*sequence, sequence-convergence, taylor/);
        const grep = commands.lessonGrep(root, ['sequence']);
        assert.match('Lesson sequence sl: walks every frame', new RegExp(grep));
        assert.match('Shared lesson runtime on sequence header language switch', new RegExp(grep));
        assert.doesNotMatch('Lesson sequence-convergence sl: walks every frame', new RegExp(grep));
        assert.equal(await commands.execute('smoke-lesson', ['taylor', 'sequence', '--port', '4390', '--workers=1'], {root}), 0);
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'received.json'), 'utf8')), {
            args: ['run', 'test:smoke:built', '--', 'tests/guided-lessons.smoke.spec.cjs', '--grep', '(Lesson|on) (taylor|sequence) ', '--workers=1'],
            port: '4390',
        });
    } finally {
        if (priorNpmExecPath === undefined) delete process.env.npm_execpath;
        else process.env.npm_execpath = priorNpmExecPath;
        cleanup(root);
    }
});

test('loc matches keys and both translations and reports missing or truncated entries', () => {
    const root = fixture();
    fs.mkdirSync(path.join(root, 'src/localization'), {recursive: true});
    fs.writeFileSync(path.join(root, 'src/localization/sl.ts'), 'export const sl = {\r\n    "taylor_bound": "napaka \\"ocena\\" ≤ {value0}",\r\n    "only_sl": "Krivulja",\r\n};\r\n');
    fs.writeFileSync(path.join(root, 'src/localization/en.ts'), 'export const en = {\n    "taylor_bound": "error ≤ {value0}",\n    "only_en": "Curve",\n};\n');
    try {
        assert.equal(commands.lookupLocalization(root, 'TAYLOR'), 'taylor_bound\n  sl: napaka \\"ocena\\" ≤ {value0}\n  en: error ≤ {value0}\n1 key matches.');
        assert.equal(commands.lookupLocalization(root, 'krivulja|curve'), 'only_sl\n  sl: Krivulja\n  en: (missing)\nonly_en\n  sl: (missing)\n  en: Curve\n2 keys match.');
        assert.match(commands.lookupLocalization(root, '.', 1), /^taylor_bound\n.*\n.*\n3 keys match; showing the first 1/);
        assert.throws(() => commands.lookupLocalization(root, '('), /Invalid pattern/);
    } finally { cleanup(root); }
});

test('ci lists runs and excerpts only failure lines from the first failed run', async () => {
    const calls = [];
    const runs = [
        {databaseId: 2, workflowName: 'Browser smoke', status: 'completed', conclusion: 'failure', headSha: 'abcdef1234567', displayTitle: 'x', createdAt: '2026-10-16T20:00:00Z', url: 'https://example.test/2'},
        {databaseId: 1, workflowName: 'Browser smoke', status: 'in_progress', conclusion: '', headSha: '1234567abcdef', displayTitle: 'y', createdAt: '2026-10-16T19:00:00Z', url: 'https://example.test/1'},
    ];
    const output = async (executable, root, args) => {
        calls.push([executable, ...args]);
        if (args[1] === 'list') return JSON.stringify(runs);
        return 'smoke\tRun tests\t2026-10-16T20:01:00.0000000Z   ✘ 3 [chromium] › Lesson taylor › narrow viewport\nsmoke\tRun tests\t2026-10-16T20:01:01.0000000Z installing browsers\nsmoke\tRun tests\t2026-10-16T20:01:02.0000000Z     Expected: 390';
    };
    const summary = await commands.ciSummary('.', 'abcdef1', output);
    assert.deepEqual(calls[0].slice(-2), ['--commit', 'abcdef1']);
    assert.deepEqual(calls[1], ['gh', 'run', 'view', '2', '--log-failed']);
    assert.match(summary, /^abcdef1 Browser smoke: failure .*\n1234567 Browser smoke: in_progress/);
    assert.match(summary, /2 matching lines.*\n {2}✘ 3 \[chromium\] › Lesson taylor › narrow viewport\n {4}Expected: 390$/);
    assert.doesNotMatch(summary, /installing browsers/);
    assert.match(await commands.ciSummary('.', undefined, async () => '[]'), /No workflow runs found on master/);
    const superseded = [{...runs[1], status: 'completed', conclusion: 'success'}, runs[0]];
    calls.length = 0;
    assert.doesNotMatch(await commands.ciSummary('.', undefined, async (...args) => { calls.push(args); return JSON.stringify(superseded); }), /Failure excerpt/);
    assert.equal(calls.length, 1);
});

test('real just preserves quoted recipe arguments when available', t => {
    const just = process.env.JUST_BINARY || (spawnSync('just', ['--version'], {encoding: 'utf8'}).status === 0 ? 'just' : undefined);
    if (!just) return t.skip('just is not installed; set JUST_BINARY to run this integration check');
    const root = fixture();
    fs.mkdirSync(path.join(root, 'scripts'), {recursive: true});
    fs.copyFileSync(path.join(__dirname, '..', 'justfile'), path.join(root, 'justfile'));
    fs.copyFileSync(path.join(__dirname, 'commands.cjs'), path.join(root, 'scripts/commands.cjs'));
    const npmCli = commands.resolveNpmCli();
    if (!npmCli) { cleanup(root); return t.skip('npm-cli.js is not available for the end-to-end argument check'); }
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({scripts: {test: 'node print-args.cjs'}}));
    fs.writeFileSync(path.join(root, 'print-args.cjs'), `const args=process.argv.slice(2); if(args.includes('fail-child')) process.exit(23); require('node:fs').writeFileSync('received.json', JSON.stringify(args))`);
    const args = ['space value', '"quoted"', 'left|right', '$HOME', '&;`()'];
    try {
        const result = spawnSync(just, ['--justfile', 'justfile', 'unit', ...args], {cwd: root, encoding: 'utf8', env: {...process.env, npm_execpath: npmCli}});
        assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'received.json'), 'utf8')), ['--run', ...args]);
        const failure = spawnSync(just, ['--justfile', 'justfile', 'unit', 'fail-child'], {cwd: root, encoding: 'utf8', env: {...process.env, npm_execpath: npmCli}});
        assert.equal(failure.status, 23, `${failure.stdout}\n${failure.stderr}`);
    } finally { cleanup(root); }
});
