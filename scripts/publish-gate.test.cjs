'use strict';

// Acceptance tests for docs/specs/fail-fast-publication-gate.md. Everything runs against temporary
// repositories and a local bare remote; nothing here can reach the production origin.

const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {formatReport, publish, spawnExec} = require('./publish-gate.cjs');
const {ALWAYS_RUN} = require('./check-changed-always-run.cjs');

const GATE = path.join(__dirname, 'publish-gate.cjs');

// Stands in for scripts/commands.cjs: records the revision it saw, then does what the fixture asks.
const FAKE_COMMANDS = `
const {execSync, spawn} = require('node:child_process');
const fs = require('node:fs');
const record = process.env.FIXTURE_RECORD;
const head = execSync('git rev-parse HEAD').toString().trim();
fs.appendFileSync(record, process.argv.slice(2).join(' ') + ' ' + head + '\\n');
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
    process.env.BEZEG_PUBLISH_LOCK = path.join(dir, 'publish.lock');
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
    assert.deepEqual(report.completed, ['arguments', 'repository', 'clean', 'slice', 'fetch', 'reconcile', 'whitespace', 'scope', 'verify:links', 'verify:check-changed', 'recheck', 'push', 'confirm']);
    assert.equal(fs.readFileSync(f.record, 'utf8').trim(), `check-changed ${report.verifiedBase} ${report.candidate}`);
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
        // Each run must take the full path, so the record of the earlier ones is cleared.
        fs.rmSync(path.join(f.work, '.git', 'bezeg-publish'), {recursive: true, force: true});
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
    // Unit tests are selected against the fetched master, so only the slice's own changes count, not master's advance.
    assert.notEqual(report.verifiedBase, f.base);
    assert.equal(fs.readFileSync(f.record, 'utf8').trim(), `check-changed ${report.verifiedBase} ${report.candidate}`);
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

const isCheck = (request, name) => request.executable === process.execPath && request.args[1] === name;
const recorded = f => fs.readFileSync(f.record, 'utf8').trim().split('\n').map(line => line.split(' ')[0]);
const storeDir = f => path.join(f.work, '.git', 'bezeg-publish');

// Moves master once, while the first (unlocked) verification is running.
const advanceDuringCheck = (f, file, before = () => {}) => {
    let moved = false;
    return request => {
        if (!moved && isCheck(request, 'check-changed')) {
            moved = true;
            before();
            f.advanceRemote(file);
        }
        return null;
    };
};

// A base with a ten-line file lets the slice and master edit different lines of it without a rebase conflict.
function sharedFileFixture(t) {
    const f = fixture(t);
    const lines = Array.from({length: 10}, (_, index) => `line ${index}`);
    const base = commitFile(f.work, 'src/big.txt', `${lines.join('\n')}\n`);
    git(f.work, 'push', 'origin', 'HEAD:refs/heads/master');
    const commit = commitFile(f.work, 'src/big.txt', `${['edited', ...lines.slice(1)].join('\n')}\n`);
    return {...f, commit, run: options => publish({cwd: f.work, base, recipe: 'runtime', expectedOrigins: [f.remote], ...options}),
        advanceBig() {
            git(f.other, 'pull', '--ff-only', 'origin', 'master');
            fs.writeFileSync(path.join(f.other, 'src/big.txt'), `${[...lines.slice(0, 9), 'tail edited'].join('\n')}\n`);
            git(f.other, 'commit', '-am', 'edit tail');
            git(f.other, 'push', 'origin', 'HEAD:refs/heads/master');
        }};
}

test('master moving elsewhere while the slice was verified takes the delta path and pushes', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const report = await f.run({commits: [commit], exec: recording([], advanceDuringCheck(f, 'other.txt'))});
    assert.equal(report.ok, true, report.message);
    assert.deepEqual(recorded(f), ['check-changed', 'typecheck', 'lint', 'unit', 'build']);
    assert.deepEqual(report.paths.map(entry => entry.path), ['full', 'delta']);
    assert.equal(report.retries, 1);
    assert.equal(f.remoteHead(), report.candidate);
    assert.ok(report.notCovered.some(text => text.startsWith('delta path')));
    assert.match(formatReport(report), /Verification path: delta/);
    const store = JSON.parse(fs.readFileSync(path.join(storeDir(f), 'verified.json'), 'utf8'));
    // The record keeps the base the unit tests ran on; a delta-checked master never becomes a recorded base.
    assert.notEqual(store.entries.at(-1).master, report.verifiedBase);
    assert.equal(store.entries.length, 1);
    assert.equal(fs.existsSync(process.env.BEZEG_PUBLISH_LOCK), false);
});

test('the delta path runs the always-run unit tier on the new master', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const report = await f.run({commits: [commit], exec: recording([], advanceDuringCheck(f, 'other.txt'))});
    assert.equal(report.ok, true, report.message);
    const lines = fs.readFileSync(f.record, 'utf8').trim().split('\n').map(line => line.split(' '));
    const delta = lines.slice(1);
    assert.deepEqual(delta.map(line => line[0]), ['typecheck', 'lint', 'unit', 'build']);
    assert.deepEqual(delta[2].slice(1, -1), ALWAYS_RUN);
    assert.ok(report.completed.includes('verify:delta:unit'), 'delta unit step is labelled under delta:');
    assert.ok(report.notCovered.some(text => text.includes('always-run unit tier ran')));
});

test('an incoming change to a file the slice changed needs the full check-changed', async t => {
    const f = sharedFileFixture(t);
    let moved = false;
    const report = await f.run({commits: [f.commit], exec: recording([], request => {
        if (!moved && isCheck(request, 'check-changed')) { moved = true; f.advanceBig(); }
        return null;
    })});
    assert.equal(report.ok, true, report.message);
    assert.deepEqual(recorded(f), ['check-changed', 'check-changed']);
    assert.match(report.paths.at(-1).reason, /overlaps the slice/);
    assert.equal(f.remoteHead(), report.candidate);
});

// A first run whose push fails leaves a verified-base record; the rerun starts from it.
const failFirstPush = (f, commit) => f.run({commits: [commit], exec: recording([], request => (isPush(request) ? {code: 1, signal: null} : null))});

test('a rerun of a verified slice takes the delta path on its first pass after unrelated master movement', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    assert.equal((await failFirstPush(f, commit)).ok, false);
    fs.rmSync(f.record);
    f.advanceRemote('other.txt');
    const report = await f.run({commits: [commit], exec: recording([])});
    assert.equal(report.ok, true, report.message);
    assert.deepEqual(recorded(f), ['typecheck', 'lint', 'unit', 'build']);
    assert.equal(report.paths[0].path, 'delta');
    assert.match(report.paths[0].reason, /verified-base record/);
    assert.ok(report.notCovered.some(text => text.startsWith('delta path')));
    assert.equal(f.remoteHead(), report.candidate);
});

test('a rerun whose incoming change overlaps the slice still takes the full path first', async t => {
    const f = sharedFileFixture(t);
    assert.equal((await failFirstPush(f, f.commit)).ok, false);
    fs.rmSync(f.record);
    f.advanceBig();
    const report = await f.run({commits: [f.commit], exec: recording([])});
    assert.equal(report.ok, true, report.message);
    assert.deepEqual(recorded(f), ['check-changed']);
    assert.equal(report.paths[0].path, 'full');
    assert.match(report.paths[0].reason, /overlaps the slice/);
});

test('an incoming change to a shared path needs the full check-changed', async t => {
    for (const file of ['package.json', 'tsconfig.app.json', 'src/graphs/base/x.ts', 'eslint.config.mjs']) {
        const f = fixture(t);
        const commit = commitFile(f.work, 'src/a.txt', 'a\n');
        const report = await f.run({commits: [commit], exec: recording([], advanceDuringCheck(f, file))});
        assert.equal(report.ok, true, report.message);
        assert.deepEqual(recorded(f), ['check-changed', 'check-changed'], file);
        assert.match(report.paths.at(-1).reason, /shared path/, file);
    }
});

test('without a verified-base record the retry runs the full check-changed', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const forget = () => fs.rmSync(storeDir(f), {recursive: true, force: true});
    const advance = advanceDuringCheck(f, 'other.txt');
    const report = await f.run({commits: [commit], exec: recording([], request => {
        // The record is written after the check passes, so drop it on the next command, once master has moved.
        if (isCheck(request, 'check-changed')) return advance(request);
        if (request.args[0] === 'fetch' && fs.existsSync(storeDir(f)) && fs.existsSync(f.record)) forget();
        return null;
    })});
    assert.equal(report.ok, true, report.message);
    assert.deepEqual(recorded(f), ['check-changed', 'check-changed']);
    assert.match(report.paths.at(-1).reason, /no verified-base record/);
});

test('a rejected push is retried after a fresh fetch and rebase', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const calls = [];
    let rejected = false;
    const report = await f.run({commits: [commit], exec: recording(calls, request => {
        if (isPush(request) && !rejected) { rejected = true; f.advanceRemote(); }
        return null;
    })});
    assert.equal(report.ok, true, report.message);
    assert.equal(calls.filter(isPush).length, 2);
    assert.equal(calls.filter(({args}) => args[0] === 'rebase').length, 2);
    assert.equal(report.retries, 1);
    assert.equal(f.remoteHead(), report.candidate);
    assert.equal(calls.some(({args}) => args.some(arg => /force/.test(arg) || arg.startsWith('+'))), false);
});

test('retries stop at the cap with the push stage as the failure', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const calls = [];
    let count = 0;
    const report = await f.run({commits: [commit], exec: recording(calls, request => {
        if (isPush(request)) f.advanceRemote(`other-${count++}.txt`);
        return null;
    })});
    assert.equal(report.ok, false);
    assert.equal(report.failedStage, 'push');
    assert.notEqual(report.exitCode, 0);
    assert.equal(report.retries, 4);
    assert.equal(calls.filter(isPush).length, 4);
    assert.match(report.message, /moved 4 times/);
    assert.notEqual(f.remoteHead(), report.candidate);
    assert.equal(fs.existsSync(process.env.BEZEG_PUBLISH_LOCK), false);
});

test('a live holder of the publish lock is waited for, then reported when it does not leave', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const lock = process.env.BEZEG_PUBLISH_LOCK;
    fs.writeFileSync(lock, JSON.stringify({pid: process.pid, token: 'other', at: Date.now()}));
    const blocked = await f.run({commits: [commit], lockWaitMs: 200, lockPollMs: 20});
    assert.equal(blocked.ok, false);
    assert.match(blocked.message, new RegExp(`Another publish holds .*pid ${process.pid}`));
    assert.equal(f.remoteHead(), f.base);
    assert.equal(fs.existsSync(lock), true, 'a lock we do not own is left alone');
    setTimeout(() => fs.rmSync(lock, {force: true}), 300);
    const waited = await f.run({commits: [commit], lockWaitMs: 5000, lockPollMs: 20});
    assert.equal(waited.ok, true, waited.message);
    assert.equal(fs.existsSync(lock), false);
});

test('a lock left by a dead process or an expired holder is reclaimed', async t => {
    const dead = spawnSync(process.execPath, ['-e', '0']);
    assert.ok(dead.pid);
    const f = fixture(t);
    let lock = process.env.BEZEG_PUBLISH_LOCK;
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    fs.writeFileSync(lock, JSON.stringify({pid: dead.pid, token: 'gone', at: Date.now()}));
    const first = await f.run({commits: [commit], lockWaitMs: 200, lockPollMs: 20});
    assert.equal(first.ok, true, first.message);
    const g = fixture(t);
    const second = commitFile(g.work, 'src/a.txt', 'a\n');
    lock = process.env.BEZEG_PUBLISH_LOCK;
    fs.writeFileSync(lock, JSON.stringify({pid: process.pid, token: 'old', at: 1}));
    const old = new Date(Date.now() - 3_600_000);
    fs.utimesSync(lock, old, old);
    const reclaimed = await g.run({commits: [second], lockWaitMs: 200, lockPollMs: 20, lockStaleMs: 60_000});
    assert.equal(reclaimed.ok, true, reclaimed.message);
});

test('spawn errors, signals and failing checks stop the pipeline with their result', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const isCheck = ({stage}) => stage === 'verify:check-changed';
    const spawnError = await f.run({commits: [commit], exec: recording([], request => (isCheck(request) ? {code: 127, signal: null, error: new Error('ENOENT')} : null))});
    assert.equal(spawnError.failedStage, 'verify:check-changed');
    assert.equal(spawnError.exitCode, 127);
    const signalled = await f.run({commits: [commit], exec: recording([], request => (isCheck(request) ? {code: null, signal: 'SIGKILL'} : null))});
    assert.equal(signalled.failedStage, 'verify:check-changed');
    assert.equal(signalled.exitCode, 1);
    assert.match(signalled.message, /SIGKILL/);
    process.env.FIXTURE_ACTION = 'fail';
    const failed = await f.run({commits: [commit]});
    assert.equal(failed.failedStage, 'verify:check-changed');
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
    assert.equal(report.failedStage, 'verify:check-changed');
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

// Background publication (docs/adr/0043-background-publish-worktree.md): the launcher is injected, so no real gate runs here.
const {publishBackground, backgroundStatus, cli, removePublishWorktree} = require('./publish-gate.cjs');

function background(f, commits, extra = {}) {
    const launched = [];
    const launch = request => { launched.push(request); return extra.pid ?? process.pid; };
    return {launched, run: () => publishBackground({cwd: f.work, base: f.base, recipe: 'runtime', commits, launch, ...extra.options})};
}

test('background creates a worktree at the last declared commit and returns before the gate runs', async t => {
    const f = fixture(t);
    const first = commitFile(f.work, 'src/a.txt', 'a\n');
    const last = commitFile(f.work, 'src/b.txt', 'b\n');
    fs.writeFileSync(path.join(f.work, 'untracked.txt'), 'the handler may keep editing');
    const b = background(f, [first, last]);
    const result = await b.run();
    assert.equal(result.ok, true, result.message);
    assert.equal(result.exitCode, 0);
    assert.equal(git(result.worktree, 'rev-parse', 'HEAD'), last);
    assert.match(path.relative(fs.realpathSync.native(f.work), fs.realpathSync.native(result.worktree)).split(path.sep).join('/'), /^\.claude\/worktrees\/publish-[0-9a-f]+-[0-9a-f]+$/);
    assert.equal(b.launched.length, 1);
    assert.equal(b.launched[0].cwd, result.worktree);
    assert.equal(path.dirname(result.resultPath), path.join(fs.realpathSync.native(f.work), '.command-logs'));
    assert.equal(fs.existsSync(result.resultPath), false);
    assert.equal(f.remoteHead(), f.base);
});

test('background seeds the new worktree with the origin checkout\'s typecheck cache, and works without one', async t => {
    const f = fixture(t);
    const first = commitFile(f.work, 'src/a.txt', 'a\n');
    const bare = await background(f, [first]).run();
    assert.equal(bare.ok, true, bare.message);
    assert.equal(fs.existsSync(path.join(bare.worktree, '.command-logs', 'tsc.tsbuildinfo')), false);
    fs.rmSync(path.join(f.work, '.command-logs', `publish-${bare.id}.pending`), {force: true});
    fs.mkdirSync(path.join(f.work, '.command-logs'), {recursive: true});
    fs.writeFileSync(path.join(f.work, '.command-logs', 'tsc.tsbuildinfo'), '{"fixture":true}');
    const seeded = await background(f, [first]).run();
    assert.equal(seeded.ok, true, seeded.message);
    assert.equal(fs.readFileSync(path.join(seeded.worktree, '.command-logs', 'tsc.tsbuildinfo'), 'utf8'), '{"fixture":true}');
});

test('a background run that succeeds writes an ok result and removes its worktree', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const result = await background(f, [commit]).run();
    const argv = ['--recipe', 'runtime', '--base', f.base, '--commits', commit, '--result-file', result.resultPath, '--origin', f.work, '--log-path', result.logPath];
    await cli(argv, {cwd: result.worktree, expectedOrigins: [f.remote]});
    const written = JSON.parse(fs.readFileSync(result.resultPath, 'utf8'));
    assert.equal(written.ok, true);
    assert.equal(written.failedStage, null);
    assert.equal(written.pushedRevision, f.remoteHead());
    assert.equal(written.logPath, result.logPath);
    assert.equal(fs.existsSync(result.worktree), false);
    assert.equal(git(f.work, 'worktree', 'list', '--porcelain').includes('publish-'), false);
    process.exitCode = 0;
});

test('a background run that fails writes the failed stage and keeps its worktree', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const result = await background(f, [commit]).run();
    process.env.FIXTURE_ACTION = 'fail';
    const argv = ['--recipe', 'runtime', '--base', f.base, '--commits', commit, '--result-file', result.resultPath, '--origin', f.work, '--log-path', result.logPath];
    await cli(argv, {cwd: result.worktree, expectedOrigins: [f.remote]});
    delete process.env.FIXTURE_ACTION;
    const written = JSON.parse(fs.readFileSync(result.resultPath, 'utf8'));
    assert.equal(written.ok, false);
    assert.equal(written.failedStage, 'verify:check-changed');
    assert.equal(written.pushedRevision, null);
    assert.equal(fs.existsSync(result.worktree), true);
    assert.equal(f.remoteHead(), f.base);
    process.exitCode = 0;
});

test('a second background run refuses while the first is pending, and runs once it has a result or died', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const first = await background(f, [commit]).run();
    const second = background(f, [commit]);
    const refused = await second.run();
    assert.equal(refused.ok, false);
    assert.notEqual(refused.exitCode, 0);
    assert.match(refused.message, /pending/);
    assert.equal(second.launched.length, 0);
    assert.equal(git(f.work, 'worktree', 'list', '--porcelain').split('publish-').length, 2);
    fs.writeFileSync(first.resultPath, '{"ok":true}');
    assert.equal((await background(f, [commit]).run()).ok, true);
});

test('a dead pending background run does not block the next one', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    await background(f, [commit], {pid: 2 ** 22 + 12345}).run();
    assert.equal((await background(f, [commit]).run()).ok, true);
});

test('background refuses declared commits that do not match base..HEAD and creates nothing', async t => {
    const f = fixture(t);
    const first = commitFile(f.work, 'src/a.txt', 'a\n');
    commitFile(f.work, 'src/b.txt', 'b\n');
    const b = background(f, [first]);
    const result = await b.run();
    assert.equal(result.ok, false);
    assert.match(result.message, /do not match/);
    assert.equal(b.launched.length, 0);
    assert.equal(git(f.work, 'worktree', 'list', '--porcelain').includes('publish-'), false);
    assert.equal(fs.existsSync(path.join(f.work, '.claude', 'worktrees')), false);
});

test('status prints the latest results and pending runs', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const pending = await background(f, [commit]).run();
    assert.match(backgroundStatus({cwd: f.work}), /pending/);
    fs.writeFileSync(pending.resultPath, JSON.stringify({ok: false, failedStage: 'verify:lint', pushedRevision: null, logPath: 'x.log', worktree: pending.worktree, at: '2026-11-09T10:00:00.000Z'}));
    const text = backgroundStatus({cwd: f.work});
    assert.match(text, /FAILED at verify:lint/);
    assert.match(text, /x\.log/);
    assert.doesNotMatch(text, /pending/);
    assert.match(backgroundStatus({cwd: path.join(f.dir, 'other')}), /No background publish/);
});

test('a foreground run given result flags never deletes its checkout, and the flags come as a pair', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const resultFile = path.join(f.dir, 'x', 'publish-zz.json');
    await cli(['--recipe', 'runtime', '--base', f.base, '--commits', commit, '--result-file', resultFile, '--origin', f.work], {cwd: f.work, expectedOrigins: [f.remote]});
    assert.equal(fs.existsSync(path.join(f.work, '.git')), true);
    assert.equal(fs.existsSync(resultFile), true);
    process.exitCode = 0;
    await cli(['--recipe', 'runtime', '--base', f.base, '--commits', commit, '--result-file', resultFile], {cwd: f.work, expectedOrigins: [f.remote]});
    assert.equal(process.exitCode, 2);
    process.exitCode = 0;
    await cli(['--recipe', 'runtime', '--base', f.base, '--commits', commit, '--origin', f.work], {cwd: f.work, expectedOrigins: [f.remote]});
    assert.equal(process.exitCode, 2);
    process.exitCode = 0;
});

test('removing a publish worktree never reaches through its node_modules link', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const result = await background(f, [commit]).run();
    const shared = path.join(f.dir, 'shared modules');
    fs.mkdirSync(shared);
    fs.writeFileSync(path.join(shared, 'marker.txt'), 'keep');
    fs.symlinkSync(shared, path.join(result.worktree, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    removePublishWorktree(f.work, result.worktree);
    assert.equal(fs.existsSync(path.join(shared, 'marker.txt')), true);
    assert.equal(fs.existsSync(result.worktree), false);
});

test('a second background run refuses while the first is still launching', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    let release;
    const held = new Promise(resolve => { release = resolve; });
    let started;
    const reached = new Promise(resolve => { started = resolve; });
    const slow = publishBackground({cwd: f.work, base: f.base, recipe: 'runtime', commits: [commit], launch: () => { started(); return held; }});
    await reached;
    const second = background(f, [commit]);
    const refused = await second.run();
    assert.equal(refused.ok, false);
    assert.equal(second.launched.length, 0);
    assert.equal(git(f.work, 'worktree', 'list', '--porcelain').split('publish-').length, 2);
    release(process.pid);
    assert.equal((await slow).ok, true);
    assert.equal(fs.existsSync(path.join(f.work, '.command-logs', 'publish.claim')), false);
});

test('a launch that yields no pid leaves no worktree, claim or pending record', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    for (const launch of [() => undefined, () => { throw new Error('spawn failed'); }]) {
        const result = await publishBackground({cwd: f.work, base: f.base, recipe: 'runtime', commits: [commit], launch});
        assert.equal(result.ok, false);
        assert.equal(git(f.work, 'worktree', 'list', '--porcelain').includes('publish-'), false);
        const left = fs.readdirSync(path.join(f.work, '.command-logs')).filter(name => /\.(pending|claim)$/.test(name));
        assert.deepEqual(left, []);
    }
});

test('stale cleanup removes only publish worktrees older than a day', async t => {
    const f = fixture(t);
    const commit = commitFile(f.work, 'src/a.txt', 'a\n');
    const dir = path.join(f.work, '.claude', 'worktrees');
    fs.mkdirSync(dir, {recursive: true});
    git(f.work, 'worktree', 'add', '--detach', path.join(dir, 'publish-old'), commit);
    git(f.work, 'worktree', 'add', '--detach', path.join(dir, 'publish-new'), commit);
    fs.mkdirSync(path.join(dir, 'other-dir'));
    const old = new Date(Date.now() - 48 * 3600 * 1000);
    fs.utimesSync(path.join(dir, 'publish-old'), old, old);
    fs.utimesSync(path.join(dir, 'other-dir'), old, old);
    assert.equal((await background(f, [commit]).run()).ok, true);
    assert.equal(fs.existsSync(path.join(dir, 'publish-old')), false);
    assert.equal(fs.existsSync(path.join(dir, 'publish-new')), true);
    assert.equal(fs.existsSync(path.join(dir, 'other-dir')), true);
});

// The detached gate must not inherit the caller's stdout pipe, or a captured `just publish --background` waits for the whole gate.
test('launchGate returns the gate pid and releases a captured stdout pipe at once', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'launch-'));
    const sleeper = path.join(dir, 'sleeper.cjs');
    const pidFile = path.join(dir, 'pid');
    fs.writeFileSync(sleeper, `require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setTimeout(() => {}, 20000);`);
    const caller = path.join(dir, 'caller.cjs');
    fs.writeFileSync(caller, `const {launchGate} = require(${JSON.stringify(path.join(__dirname, 'publish-gate.cjs'))}); console.log(launchGate({cwd: ${JSON.stringify(dir)}, args: [], script: ${JSON.stringify(sleeper)}}));`);
    const child = require('node:child_process').spawn(process.execPath, [caller], {stdio: ['ignore', 'pipe', 'pipe']});
    let out = '';
    child.stdout.on('data', d => { out += d; });
    let pid = 0;
    try {
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('stdout pipe still open after 5 s: launched child inherited it')), 5000);
            child.stdout.on('close', () => { clearTimeout(timer); resolve(); });
        });
        pid = Number(out.trim());
        for (let i = 0; i < 50 && !fs.existsSync(pidFile); i++) await new Promise(r => setTimeout(r, 100));
        assert.equal(Number(fs.readFileSync(pidFile, 'utf8')), pid, 'returned pid is the sleeper');
        process.kill(pid, 0);
    } finally {
        child.kill();
        pid = pid || Number(out.trim()) || 0;
        if (pid) try { process.kill(pid); } catch { /* already gone */ }
    }
});
