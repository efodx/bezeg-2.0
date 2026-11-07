'use strict';

// Acceptance tests for docs/specs/fail-fast-publication-gate.md. Everything runs against temporary
// repositories and a local bare remote; nothing here can reach the production origin.

const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {publish, spawnExec} = require('./publish-gate.cjs');

const GATE = path.join(__dirname, 'publish-gate.cjs');

// Stands in for scripts/commands.cjs: records the revision it saw, then does what the fixture asks.
const FAKE_COMMANDS = `
const {execSync, spawn} = require('node:child_process');
const fs = require('node:fs');
const record = process.env.FIXTURE_RECORD;
const head = execSync('git rev-parse HEAD').toString().trim();
fs.appendFileSync(record, process.argv[2] + ' ' + head + '\\n');
const action = process.env.FIXTURE_ACTION;
if (action === 'dirty') fs.writeFileSync('stray.txt', 'made during verification');
if (action === 'commit') execSync('git commit --allow-empty -m moved');
if (action === 'fail') process.exit(7);
if (action === 'hang') {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio: 'ignore'});
    fs.writeFileSync(process.env.FIXTURE_PIDS, process.pid + ' ' + child.pid);
    setInterval(() => {}, 1000);
}
`;

function git(cwd, ...args) {
    return execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
}

function commitFile(cwd, file, content, message = `change ${file}`) {
    fs.mkdirSync(path.dirname(path.join(cwd, file)), {recursive: true});
    fs.writeFileSync(path.join(cwd, file), content);
    git(cwd, 'add', file);
    git(cwd, 'commit', '-m', message);
    return git(cwd, 'rev-parse', 'HEAD');
}

function configure(cwd) {
    for (const [key, value] of [['user.name', 'Fixture'], ['user.email', 'fixture@example.invalid'], ['core.autocrlf', 'false'], ['commit.gpgsign', 'false']]) {
        git(cwd, 'config', key, value);
    }
}

// The path holds a space on purpose: every test exercises it.
function fixture(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bezeg publish gate '));
    t.after(() => fs.rmSync(dir, {recursive: true, force: true, maxRetries: 5}));
    const remote = path.join(dir, 'remote.git');
    const work = path.join(dir, 'work tree');
    const other = path.join(dir, 'other');
    git(dir, 'init', '--bare', '-b', 'master', remote);
    fs.mkdirSync(work);
    git(work, 'init', '-b', 'master');
    configure(work);
    git(work, 'remote', 'add', 'origin', remote);
    fs.writeFileSync(path.join(work, '.gitignore'), '.command-logs\n');
    commitFile(work, 'scripts/commands.cjs', FAKE_COMMANDS, 'fixture');
    git(work, 'add', '.gitignore');
    git(work, 'commit', '-m', 'ignore logs');
    git(work, 'push', 'origin', 'HEAD:refs/heads/master');
    git(dir, 'clone', remote, other);
    configure(other);
    const base = git(work, 'rev-parse', 'HEAD');
    const record = path.join(dir, 'record.txt');
    process.env.FIXTURE_RECORD = record;
    process.env.FIXTURE_PIDS = path.join(dir, 'pids.txt');
    delete process.env.FIXTURE_ACTION;
    return {dir, remote, work, other, base, record, remoteHead: () => git(remote, 'rev-parse', 'refs/heads/master'),
        advanceRemote(file = 'other.txt') {
            git(other, 'pull', '--ff-only', 'origin', 'master');
            commitFile(other, file, 'from elsewhere\n');
            git(other, 'push', 'origin', 'HEAD:refs/heads/master');
        },
        run(options) {
            return publish({cwd: work, base, recipe: 'runtime', expectedOrigins: [remote], ...options});
        }};
}

function recording(calls, behaviour = () => null) {
    return async request => {
        calls.push(request);
        return await behaviour(request, calls.length - 1) ?? spawnExec(request);
    };
}

const isPush = ({args}) => args[0] === 'push';

test('a clean slice is verified and pushed once, as the recorded revision', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const calls = [];
    const report = await f.run({commits: [commit], exec: recording(calls)});
    assert.equal(report.ok, true, report.message);
    assert.equal(report.exitCode, 0);
    assert.equal(f.remoteHead(), report.candidate);
    assert.equal(calls.filter(isPush).length, 1);
    assert.deepEqual(report.completed, ['arguments', 'repository', 'clean', 'slice', 'fetch', 'reconcile', 'whitespace', 'scope', 'verify:links', 'verify:check', 'recheck', 'push', 'confirm']);
    assert.equal(fs.readFileSync(f.record, 'utf8').trim(), `check ${report.candidate}`);
    assert.ok(fs.existsSync(report.logPath));
});

test('any failing command before the push stops the run and leaves the remote alone', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const calls = [];
    const before = f.remoteHead();
    // A dry pass lists the commands; stopping at the push keeps the fixture reusable.
    await f.run({commits: [commit], exec: recording(calls, request => (isPush(request) ? {code: 1, signal: null} : null))});
    const pushIndex = calls.findIndex(isPush);
    assert.ok(pushIndex > 10, 'the sequence reached the push');
    for (let index = 0; index <= pushIndex; index += 1) {
        const seen = [];
        const report = await f.run({commits: [commit], exec: recording(seen, (_, at) => (at === index ? {code: 3, signal: null, stdout: '', stderr: 'injected'} : null))});
        assert.equal(report.ok, false, `command ${index}`);
        assert.equal(report.exitCode, 3, `command ${index}`);
        assert.equal(seen.length, index + 1, `command ${index} ran nothing later`);
        assert.equal(seen.slice(0, index).some(isPush), false);
        assert.equal(f.remoteHead(), before);
        assert.ok(report.failedStage);
    }
});

test('a whitespace error blocks publication and keeps the commits', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'trailing space \n');
    const before = f.remoteHead();
    const report = await f.run({commits: [commit]});
    assert.equal(report.failedStage, 'whitespace');
    assert.notEqual(report.exitCode, 0);
    assert.equal(f.remoteHead(), before);
    assert.equal(git(f.work, 'rev-parse', 'HEAD'), commit);
    assert.equal(fs.existsSync(f.record), false);
});

test('verification runs on the rebased revision, not the one that was declared', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    f.advanceRemote();
    const report = await f.run({commits: [commit]});
    assert.equal(report.ok, true, report.message);
    assert.notEqual(report.candidate, commit);
    assert.equal(fs.readFileSync(f.record, 'utf8').trim(), `check ${report.candidate}`);
    assert.equal(f.remoteHead(), report.candidate);
});

test('a rebase conflict stops with its state kept and the remote unchanged', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'same.txt', 'mine\n');
    f.advanceRemote('same.txt');
    const before = f.remoteHead();
    fs.mkdirSync(path.join(f.work, '.command-logs'), {recursive: true});
    fs.writeFileSync(path.join(f.work, '.command-logs', 'keep.txt'), 'ignored work');
    const report = await f.run({commits: [commit]});
    assert.equal(report.failedStage, 'reconcile');
    assert.match(report.message, /rebase --abort/);
    assert.equal(f.remoteHead(), before);
    assert.ok(fs.existsSync(path.join(f.work, '.git', 'rebase-merge')) || fs.existsSync(path.join(f.work, '.git', 'rebase-apply')));
    assert.match(git(f.work, 'status', '--porcelain'), /same\.txt/);
    assert.ok(fs.existsSync(path.join(f.work, '.command-logs', 'keep.txt')));
});

test('unexpected files, wrong declarations and an unsupported origin stop before anything changes', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const extra = commitFile(f.work, 'src/b.txt', 'b\n');
    const before = f.remoteHead();
    const expectStop = async (options, stage) => {
        const report = await f.run(options);
        assert.equal(report.failedStage, stage, report.message);
        assert.equal(f.remoteHead(), before);
        assert.equal(git(f.work, 'rev-parse', 'HEAD'), extra);
    };
    await expectStop({commits: [commit]}, 'slice');
    await expectStop({commits: [extra, commit]}, 'slice');
    await expectStop({commits: [commit, extra], base: 'no-such-commit'}, 'slice');
    await expectStop({commits: [commit, extra], base: extra}, 'slice');
    await expectStop({commits: [commit, extra], expectedOrigins: ['https://example.invalid/repo.git']}, 'repository');
    fs.writeFileSync(path.join(f.work, 'unrelated.txt'), 'keep me');
    await expectStop({commits: [commit, extra]}, 'clean');
    assert.equal(fs.readFileSync(path.join(f.work, 'unrelated.txt'), 'utf8'), 'keep me');
    assert.equal(git(f.work, 'stash', 'list'), '');
});

test('a candidate that changes during verification is not pushed', async t => {
    for (const action of ['dirty', 'commit']) {
        const f = fixture(t);
        const commit = commitFile(f.work, 'src/a.txt', 'a\n');
        const before = f.remoteHead();
        process.env.FIXTURE_ACTION = action;
        const report = await f.run({commits: [commit]});
        assert.equal(report.failedStage, 'recheck', action);
        assert.equal(f.remoteHead(), before);
    }
});

test('a remote advance just before the push is a rejection, with no retry', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const calls = [];
    const report = await f.run({commits: [commit], exec: recording(calls, request => {
        if (isPush(request)) f.advanceRemote();
        return null;
    })});
    assert.equal(report.failedStage, 'push');
    assert.notEqual(report.exitCode, 0);
    assert.equal(calls.filter(isPush).length, 1);
    assert.equal(calls.filter(({args}) => args[0] === 'rebase').length, 1);
    assert.equal(calls.some(({args}) => args.some(arg => /force/.test(arg) || arg.startsWith('+'))), false);
    assert.notEqual(f.remoteHead(), report.candidate);
});

test('spawn errors, signals and failing checks stop the pipeline with their result', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const isCheck = ({stage}) => stage === 'verify:check';
    const spawnError = await f.run({commits: [commit], exec: recording([], request => (isCheck(request) ? {code: 127, signal: null, error: new Error('ENOENT')} : null))});
    assert.equal(spawnError.failedStage, 'verify:check');
    assert.equal(spawnError.exitCode, 127);
    const signalled = await f.run({commits: [commit], exec: recording([], request => (isCheck(request) ? {code: null, signal: 'SIGKILL'} : null))});
    assert.equal(signalled.failedStage, 'verify:check');
    assert.equal(signalled.exitCode, 1);
    assert.match(signalled.message, /SIGKILL/);
    process.env.FIXTURE_ACTION = 'fail';
    const failed = await f.run({commits: [commit]});
    assert.equal(failed.failedStage, 'verify:check');
    assert.equal(failed.exitCode, 7);
    assert.equal(f.remoteHead(), f.base);
});

test('cancellation ends the running check and its children, and nothing later runs', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    process.env.FIXTURE_ACTION = 'hang';
    const controller = new AbortController();
    const pidFile = process.env.FIXTURE_PIDS;
    const watcher = setInterval(() => { if (fs.existsSync(pidFile)) controller.abort(); }, 50);
    t.after(() => clearInterval(watcher));
    const calls = [];
    const report = await f.run({commits: [commit], signal: controller.signal, exec: recording(calls)});
    clearInterval(watcher);
    assert.equal(report.exitCode, 130);
    assert.equal(report.failedStage, 'verify:check');
    assert.equal(calls.some(isPush), false);
    assert.equal(f.remoteHead(), f.base);
    assert.ok(fs.existsSync(report.logPath));
    const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
    const pids = fs.readFileSync(pidFile, 'utf8').split(' ').map(Number);
    for (let attempt = 0; attempt < 100 && pids.some(alive); attempt += 1) await new Promise(resolve => setTimeout(resolve, 50));
    assert.deepEqual(pids.filter(alive), []);
});

test('the docs recipe checks links, claims no app coverage and refuses code', async t => {
    const f = fixture(t);
    const good = commitFile(f.work, 'docs/guide.md', 'See [the page](../scripts/commands.cjs#top) and [site](https://example.invalid/x).\n');
    const report = await f.run({recipe: 'docs', commits: [good]});
    assert.equal(report.ok, true, report.message);
    assert.equal(fs.existsSync(f.record), false);
    assert.match(report.notCovered.join(), /unit tests/);

    const broken = commitFile(f.work, 'docs/broken.md', 'See [nothing](missing.md).\n');
    const stopped = await f.run({base: report.candidate, recipe: 'docs', commits: [broken]});
    assert.equal(stopped.failedStage, 'verify:links');
    assert.match(stopped.message, /missing\.md/);

    git(f.work, 'reset', '--hard', report.candidate);
    const code = commitFile(f.work, 'src/a.txt', 'a\n');
    const refused = await f.run({base: report.candidate, recipe: 'docs', commits: [code]});
    assert.equal(refused.failedStage, 'scope');
    assert.match(refused.message, /src\/a\.txt/);
    assert.equal(f.remoteHead(), report.candidate);
});

test('the tooling recipe runs its checks, and a missing or unknown recipe runs nothing', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'scripts/tool.cjs', 'module.exports = 1;\n');
    for (const recipe of [undefined, 'toString', 'everything']) {
        const calls = [];
        const report = await f.run({recipe, commits: [commit], exec: recording(calls)});
        assert.equal(report.failedStage, 'arguments');
        assert.equal(report.exitCode, 2);
        assert.deepEqual(calls, []);
    }
    const report = await f.run({recipe: 'tooling', commits: [commit]});
    assert.equal(report.ok, true, report.message);
    assert.deepEqual(fs.readFileSync(f.record, 'utf8').trim().split('\n').map(line => line.split(' ')[0]), ['tooling-test', 'lint']);
});

test('the command line returns the gate result, and production defaults refuse a fixture origin', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const args = ['--recipe', 'runtime', '--base', f.base, '--commits', commit];
    const production = spawnSync(process.execPath, [GATE, ...args], {cwd: f.work, encoding: 'utf8'});
    assert.equal(production.status, 1);
    assert.match(production.stderr, /Unsupported origin/);
    assert.match(production.stderr, /nothing was pushed/);
    assert.equal(spawnSync(process.execPath, [GATE, '--wrong'], {cwd: f.work, encoding: 'utf8'}).status, 2);

    const script = `require(${JSON.stringify(GATE)}).cli(process.argv.slice(1), {expectedOrigins: [${JSON.stringify(f.remote)}]})`;
    process.env.FIXTURE_ACTION = 'fail';
    const failed = spawnSync(process.execPath, ['-e', script, '--', ...args], {cwd: f.work, encoding: 'utf8'});
    assert.equal(failed.status, 7, failed.stderr);
    delete process.env.FIXTURE_ACTION;
    const passed = spawnSync(process.execPath, ['-e', script, '--', ...args], {cwd: f.work, encoding: 'utf8'});
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /CI and Pages have not reported yet/);
    assert.equal(f.remoteHead(), commit);
});
