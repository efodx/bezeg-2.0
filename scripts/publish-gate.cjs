'use strict';

// Fail-fast publication gate (docs/specs/fail-fast-publication-gate.md). It reconciles the handler's
// declared commits with origin/master, verifies that exact revision and pushes it as a fast-forward.
// Every external command runs through one adapter, and any failure stops every later stage.

const {spawn, spawnSync} = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {parseArgs} = require('node:util');
const {LESSON_SHARED_PATHS} = require('./transient-state-scope.cjs');
const {alwaysRunFiles} = require('./check-changed-always-run.cjs');

const PRODUCTION_ORIGINS = ['https://github.com/efodx/bezeg-2.0.git', 'https://github.com/efodx/bezeg-2.0'];
const USAGE = 'Usage: just publish [--background] --recipe <docs|tooling|runtime> --base <commit> --commits <id,id,...> | just publish --status\n'
    + 'List the reviewed commits oldest first: every commit after --base, and no others.';
const OUTPUT_TAIL = 2000;
const CANCELLED_EXIT = 130;
const KILL_GRACE_MS = 2000;
const MAX_RETRIES = 3;
const MAX_RECORDS = 20;
const LOCK_WAIT_MS = 15 * 60 * 1000;
const LOCK_STALE_MS = 45 * 60 * 1000;
const LOCK_POLL_MS = 1000;
const WORKTREE_KEEP_MS = 24 * 60 * 60 * 1000;
const WORKTREES_DIR = path.join('.claude', 'worktrees');
// The always-run unit tier (scripts/check-changed-always-run.cjs) goes between lint and build when the slice has files for it.
const DELTA_CHECKS = (changed) => {
    const always = alwaysRunFiles(changed);
    return ['typecheck', 'lint', ...(always.length ? [{name: 'unit', args: () => always}] : []), 'build'];
};
// Beyond the catalog sweeps' widest shared list (lesson sweeps): files whose change can alter how any slice typechecks, lints, builds or tests.
const DELTA_SHARED_PATHS = [...LESSON_SHARED_PATHS, /^package(-lock)?\.json$/, /^\.nvmrc$/, /^vite\.config\.mts$/, /^tsconfig[^/]*\.json$/, /^src\/setupTests\.ts$/, /^eslint\.config\./];
const DELTA_NOT_COVERED = 'delta path: master moved only in files the slice and shared configuration do not touch, so the always-run unit tier ran on the new master but the rest of the unit tests did not (typecheck, lint and build also ran); hosted CI runs the full suite before deploying';

const isDocumentation = file => file.startsWith('docs/') || file.endsWith('.md');
const isTooling = file => isDocumentation(file) || /^(scripts|tools)\//.test(file) || file === 'justfile';

// A recipe names the checks a change needs, the files they can vouch for, and what they leave unproven.
const RECIPES = {
    docs: {
        checks: [],
        allows: isDocumentation,
        notCovered: ['typecheck, lint, unit tests, production build and browser smoke', 'link anchors'],
    },
    tooling: {
        checks: ['tooling-test', 'lint'],
        allows: isTooling,
        notCovered: ['typecheck, unit tests, production build and browser smoke', 'link anchors'],
    },
    // Unit tests run only where the slice's changes reach, so a rebase onto a moved master does not rerun the whole
    // suite; hosted CI runs every test before it deploys.
    runtime: {
        checks: [{name: 'check-changed', args: ({master}) => [master]}],
        allows: () => true,
        notCovered: ['unit tests the changed files do not reach through imports: hosted CI runs the full suite before deploying', 'browser smoke: run it first when a route, control, lesson or rendering path changed', 'link anchors'],
    },
};

class GateStop extends Error {
    constructor(message, exitCode = 1) {
        super(message);
        this.exitCode = exitCode;
    }
}

function killTree(child) {
    if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
        return;
    }
    const kill = name => { try { process.kill(-child.pid, name); } catch { /* the group has already exited */ } };
    kill('SIGTERM');
    setTimeout(() => kill('SIGKILL'), KILL_GRACE_MS).unref();
}

function spawnExec({executable, args, cwd, logPath, signal, input}) {
    return new Promise(resolve => {
        fs.appendFileSync(logPath, `\n$ ${JSON.stringify([executable, ...args])}\n`);
        let child;
        try {
            child = spawn(executable, args, {
                cwd,
                env: {...process.env, GIT_EDITOR: 'true'},
                shell: false,
                windowsHide: true,
                detached: process.platform !== 'win32',
                stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
            });
            if (input !== undefined) {
                child.stdin.on('error', () => { /* the command exited before reading */ });
                child.stdin.end(input);
            }
        } catch (error) {
            resolve({code: 127, signal: null, error, stdout: '', stderr: ''});
            return;
        }
        const output = {stdout: [], stderr: []};
        const collect = name => child[name].on('data', chunk => {
            output[name].push(chunk);
            fs.appendFileSync(logPath, chunk);
        });
        collect('stdout');
        collect('stderr');
        const cancel = () => killTree(child);
        signal?.addEventListener('abort', cancel, {once: true});
        const finish = result => {
            signal?.removeEventListener('abort', cancel);
            resolve({...result, stdout: Buffer.concat(output.stdout).toString('utf8'), stderr: Buffer.concat(output.stderr).toString('utf8')});
        };
        child.once('error', error => finish({code: 127, signal: null, error}));
        child.once('close', (code, closeSignal) => finish({code, signal: closeSignal}));
    });
}

function addedMarkdownLinks(diff) {
    const links = [];
    let file = null;
    for (const line of diff.split(/\r?\n/)) {
        if (line.startsWith('+++ ')) {
            file = line.startsWith('+++ b/') ? line.slice(6) : null;
        } else if (file && line.startsWith('+')) {
            const text = line.slice(1).replace(/`[^`]*`/g, '');
            for (const match of text.matchAll(/\]\(([^)\s]+)/g)) links.push({file, target: match[1]});
        }
    }
    return links;
}

function brokenLinks(root, diff) {
    return addedMarkdownLinks(diff).filter(({file, target}) => {
        if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) return false;
        const relative = decodeURIComponent(target.split('#')[0]);
        return relative !== '' && !fs.existsSync(path.resolve(root, path.dirname(file), relative));
    });
}

function defaultLogPath(cwd) {
    const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
    return path.join(cwd, '.command-logs', `${stamp}-publish-${process.pid}-${crypto.randomBytes(4).toString('hex')}.log`);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function pidAlive(pid) {
    try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

function readHolder(lockPath) {
    try { return JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch { return null; }
}

/**
 * Removes a dead or stale lock without racing another waiter: only the process holding `<lock>.reclaim` may remove it,
 * and only while the lock still holds the stale holder it read. Without this, two waiters reading the same dead holder
 * could each remove the lock, the second deleting the first's fresh one, and both enter the critical section.
 */
function reclaimStale(lockPath, stale, pollMs) {
    const mutex = `${lockPath}.reclaim`;
    let fd;
    try { fd = fs.openSync(mutex, 'wx'); } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        // A reclaimer that died mid-reclaim leaves the mutex behind; it only ever lives for a moment.
        try { if (Date.now() - fs.statSync(mutex).mtimeMs > pollMs * 10) fs.rmSync(mutex, {force: true}); } catch { /* gone meanwhile */ }
        return;
    }
    try {
        const current = readHolder(lockPath);
        if ((current?.token ?? null) === (stale?.token ?? null)) fs.rmSync(lockPath, {force: true});
    } finally {
        fs.closeSync(fd);
        fs.rmSync(mutex, {force: true});
    }
}

/** Takes the machine-wide publish lock, waiting for a live holder and reclaiming a dead or stale one. */
async function acquireLock({lockPath, waitMs, staleMs, pollMs, signal, cancelled}) {
    const token = crypto.randomBytes(8).toString('hex');
    const started = Date.now();
    fs.mkdirSync(path.dirname(lockPath), {recursive: true});
    for (;;) {
        if (signal?.aborted) throw cancelled();
        try {
            const fd = fs.openSync(lockPath, 'wx');
            fs.writeSync(fd, JSON.stringify({pid: process.pid, token, at: Date.now(), cwd: process.cwd()}));
            fs.closeSync(fd);
            return () => {
                if (readHolder(lockPath)?.token === token) fs.rmSync(lockPath, {force: true});
            };
        } catch (error) {
            if (error.code !== 'EEXIST') throw new GateStop(`Could not take the publish lock ${lockPath}: ${error.message}`);
        }
        const holder = readHolder(lockPath);
        let age;
        try { age = Date.now() - fs.statSync(lockPath).mtimeMs; } catch { continue; }
        // An unreadable lock is a holder caught mid-write or a crash before writing: give it a moment, then reclaim.
        if (holder ? !pidAlive(holder.pid) || age > staleMs : age > pollMs * 5) {
            reclaimStale(lockPath, holder, pollMs);
            continue;
        }
        if (Date.now() - started >= waitMs) {
            throw new GateStop(`Another publish holds ${lockPath} (pid ${holder?.pid}, since ${new Date(holder?.at ?? 0).toISOString()}). Wait for it, or delete the lock if that process is gone, then publish again.`);
        }
        await sleep(pollMs);
    }
}

function readRecords(storePath) {
    try {
        const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        return Array.isArray(parsed.entries) ? parsed.entries.filter(entry => entry && entry.patchId && entry.master && entry.recipe) : [];
    } catch {
        return [];
    }
}

function writeRecord(storePath, entry) {
    const entries = [...readRecords(storePath).filter(old => !(old.patchId === entry.patchId && old.recipe === entry.recipe)), entry].slice(-MAX_RECORDS);
    fs.mkdirSync(path.dirname(storePath), {recursive: true});
    const temporary = `${storePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify({entries}, null, 1));
    fs.renameSync(temporary, storePath);
}

async function publish({cwd = process.cwd(), base, commits, recipe, expectedOrigins = PRODUCTION_ORIGINS, exec = spawnExec, signal, logPath = defaultLogPath(cwd),
    // Per user, not os.tmpdir(): TEMP differs between shells and sandboxes, which would split the lock.
    lockPath = process.env.BEZEG_PUBLISH_LOCK || path.join(os.homedir(), '.bezeg', 'publish.lock'),
    lockWaitMs = LOCK_WAIT_MS, lockStaleMs = LOCK_STALE_MS, lockPollMs = LOCK_POLL_MS, maxRetries = MAX_RETRIES}) {
    const report = {
        ok: false, recipe, base, commits, candidate: null, verifiedBase: null, completed: [], failedStage: null,
        message: null, exitCode: 1, notCovered: [], logPath, pushed: false, retries: 0, paths: [],
    };
    let current = 'arguments';
    let root = cwd;

    const cancelled = () => new GateStop('Cancelled; no later stage ran.', CANCELLED_EXIT);
    const run = async (executable, args, hint, input) => {
        if (signal?.aborted) throw cancelled();
        const result = await exec({stage: current, executable, args, cwd: root, logPath, signal, input});
        if (signal?.aborted) throw cancelled();
        const command = [path.basename(executable), ...args].join(' ');
        const detail = `${(result.stderr || result.stdout || '').trim().slice(-OUTPUT_TAIL)}`;
        const explain = message => [message, hint, detail].filter(Boolean).join('\n');
        if (result.error) throw new GateStop(explain(`Could not start ${command}: ${result.error.message}`), 127);
        if (result.signal) throw new GateStop(explain(`${command} was stopped by ${result.signal}.`));
        if (result.code !== 0) throw new GateStop(explain(`${command} exited with ${result.code}.`), result.code || 1);
        return (result.stdout ?? '').trim();
    };
    const git = (args, hint) => run('git', args, hint);
    const stage = async (name, work) => {
        current = name;
        if (signal?.aborted) throw cancelled();
        const value = await work();
        report.completed.push(name);
        return value;
    };
    const assertClean = async () => {
        const status = await git(['status', '--porcelain']);
        if (status) {
            throw new GateStop(`The checkout has uncommitted or untracked files:\n${status}\nNothing was changed. Commit them, or publish from an isolated worktree.`);
        }
    };

    try {
        const selected = await stage('arguments', () => {
            if (!Object.hasOwn(RECIPES, recipe ?? '')) throw new GateStop(`Unknown or missing recipe "${recipe ?? ''}".\n${USAGE}`, 2);
            if (!base || !commits?.length) throw new GateStop(`Declare the task base and its commits.\n${USAGE}`, 2);
            fs.mkdirSync(path.dirname(logPath), {recursive: true});
            return RECIPES[recipe];
        });
        report.notCovered = selected.notCovered;

        await stage('repository', async () => {
            root = await git(['rev-parse', '--show-toplevel']);
            for (const args of [['remote', 'get-url', 'origin'], ['remote', 'get-url', '--push', 'origin']]) {
                const url = await git(args);
                if (!expectedOrigins.includes(url)) throw new GateStop(`Unsupported origin ${url}. This command publishes only to ${expectedOrigins[0]}.`);
            }
        });

        await stage('clean', async () => {
            await assertClean();
            const gitDir = await git(['rev-parse', '--absolute-git-dir']);
            const pending = ['rebase-merge', 'rebase-apply', 'MERGE_HEAD', 'CHERRY_PICK_HEAD'].find(name => fs.existsSync(path.join(gitDir, name)));
            if (pending) throw new GateStop(`A Git operation is in progress (${pending}). Finish or abort it first.`);
        });

        const baseCommit = await stage('slice', async () => {
            const resolve = id => git(['rev-parse', '--verify', `${id}^{commit}`], `"${id}" is not a commit in this repository.`);
            const declaredBase = await resolve(base);
            const declared = [];
            for (const id of commits) declared.push(await resolve(id));
            await git(['merge-base', '--is-ancestor', declaredBase, 'HEAD'], `The task base ${base} is not an ancestor of HEAD.`);
            const range = `${declaredBase}..HEAD`;
            const actual = (await git(['rev-list', '--reverse', '--topo-order', range])).split(/\s+/).filter(Boolean);
            if (actual.join() !== declared.join()) {
                throw new GateStop(`The declared commits do not match ${base}..HEAD, oldest first.\nDeclared: ${declared.join(' ') || '(none)'}\nActual:   ${actual.join(' ') || '(none)'}`);
            }
            if (await git(['rev-list', '--merges', range])) throw new GateStop('The slice contains a merge commit. Rebase it to a linear series first.');
            return declaredBase;
        });

        const commonDir = path.resolve(root, await git(['rev-parse', '--git-common-dir']));
        const storePath = path.join(commonDir, 'bezeg-publish', 'verified.json');
        const names = async (from, to) => (await git(['-c', 'core.quotePath=false', 'diff', '--name-only', '--no-renames', from, to])).split(/\r?\n/).filter(Boolean);
        const patchIdOf = async (from, to) => {
            const diff = await git(['diff', '--no-color', '--no-renames', from, to]);
            return diff ? (await run('git', ['patch-id', '--stable'], undefined, `${diff}\n`)).split(/\s+/)[0] || null : null;
        };
        const reconcile = async (onto, from) => {
            await git(['rebase', '--no-autostash', '--onto', onto, from], 'The rebase stopped and its state is kept. Resolve it, or run `git rebase --abort`, then declare the new commits and publish again.');
            const head = await git(['rev-parse', 'HEAD']);
            await git(['merge-base', '--is-ancestor', onto, head], 'The reconciled revision does not contain origin/master.');
            const count = Number(await git(['rev-list', '--count', `${onto}..${head}`]));
            if (count !== commits.length) throw new GateStop(`The rebase left ${count} of ${commits.length} declared commits; some are already on master. Declare the remaining commits and publish again.`);
            return head;
        };
        // `named` records the first pass's stages in the report; a retry runs the same work without renaming them.
        const vet = async (onto, head, named) => {
            const step = named ? stage : (name, work) => { current = name; return work(); };
            await step('whitespace', () => git(['diff', '--check', onto, head], 'Fix these whitespace errors in a new commit, then publish again.'));
            const changed = await step('scope', async () => {
                const files = await names(onto, head);
                const outside = files.filter(file => !selected.allows(file));
                if (outside.length) throw new GateStop(`Recipe ${recipe} cannot vouch for these files:\n${outside.join('\n')}\nSelect a recipe that covers them.`);
                return files;
            });
            await step('verify:links', async () => {
                const diff = await git(['-c', 'core.quotePath=false', 'diff', '-U0', '--no-color', '--no-renames', onto, head, '--', '*.md']);
                const broken = brokenLinks(root, diff);
                if (broken.length) throw new GateStop(`Added links point at missing files:\n${broken.map(({file, target}) => `${file}: ${target}`).join('\n')}`);
            });
            return changed;
        };
        const runChecks = async (list, onto, label = '') => {
            for (const check of list) {
                const {name, args = () => []} = typeof check === 'string' ? {name: check} : check;
                await stage(`verify:${label}${name}`, () => run(process.execPath, ['scripts/commands.cjs', name, ...args({master: onto})]));
            }
        };
        const remember = (id, onto) => {
            if (id) writeRecord(storePath, {patchId: id, master: onto, recipe, at: new Date().toISOString()});
        };

        let master = await stage('fetch', async () => {
            await git(['fetch', 'origin', 'refs/heads/master']);
            return git(['rev-parse', '--verify', 'FETCH_HEAD^{commit}']);
        });
        report.verifiedBase = master;

        report.candidate = await stage('reconcile', () => reconcile(master, baseCommit));
        const firstChanged = await vet(master, report.candidate, true);
        let patchId = await patchIdOf(master, report.candidate);
        // Delta path: the slice was verified on an older master and that master moved without touching the slice.
        // A record on the fetched master itself (no incoming files) is deliberately a delta too: a rerun after a
        // rejected push or a cancelled run gets the cheap re-verification instead of the full unit run.
        const decide = async (latest, changed) => {
            if (recipe !== 'runtime') return {path: 'full', reason: `recipe ${recipe} reruns its own checks`};
            const entry = readRecords(storePath).reverse().find(old => old.patchId === patchId && old.recipe === recipe);
            if (!patchId || !entry) return {path: 'full', reason: 'no verified-base record for this slice'};
            let incoming;
            try { incoming = await names(entry.master, latest); } catch { return {path: 'full', reason: `cannot compare the recorded base ${entry.master} with ${latest}`}; }
            const overlap = incoming.find(file => changed.includes(file));
            if (overlap) return {path: 'full', reason: `incoming change to ${overlap} overlaps the slice`};
            const shared = incoming.find(file => DELTA_SHARED_PATHS.some(pattern => pattern.test(file)));
            if (shared) return {path: 'full', reason: `incoming change to shared path ${shared}`};
            return {path: 'delta', reason: `${incoming.length} incoming file(s) since the recorded base ${entry.master}, none shared with the slice`};
        };

        const first = await decide(master, firstChanged);
        if (first.path === 'delta') {
            report.paths.push({...first, reason: `verified-base record for this slice: ${first.reason}`});
            await runChecks(DELTA_CHECKS(firstChanged), master, 'delta:');
            report.notCovered = [...new Set([...report.notCovered, DELTA_NOT_COVERED])];
        } else {
            report.paths.push({path: 'full', reason: first.reason === 'no verified-base record for this slice' ? 'first verification of this slice' : first.reason});
            await runChecks(selected.checks, master);
            remember(patchId, master);
        }

        let rejections = 0;
        for (;;) {
            let pushError = null;
            let needFull = false;
            const release = await acquireLock({lockPath, waitMs: lockWaitMs, staleMs: lockStaleMs, pollMs: lockPollMs, signal, cancelled});
            try {
                current = 'fetch';
                await git(['fetch', 'origin', 'refs/heads/master']);
                const latest = await git(['rev-parse', '--verify', 'FETCH_HEAD^{commit}']);
                if (latest !== master) {
                    if (++report.retries > maxRetries) {
                        current = 'push';
                        throw new GateStop(`origin/master moved ${report.retries} times while publishing (limit ${maxRetries}). Nothing was pushed; publish again once it settles.`);
                    }
                    report.candidate = await stage('retry:reconcile', () => reconcile(latest, master));
                    const changed = await vet(latest, report.candidate, false);
                    patchId = await patchIdOf(latest, report.candidate);
                    const decision = await decide(latest, changed);
                    report.paths.push(decision);
                    master = latest;
                    report.verifiedBase = latest;
                    if (decision.path === 'delta') {
                        // Not remembered: the record keeps the last base the unit tests ran on, so every later
                        // delta compares all of master's movement since then with the slice, not just the last step.
                        await runChecks(DELTA_CHECKS(changed), latest, 'delta:');
                        report.notCovered = [...new Set([...report.notCovered, DELTA_NOT_COVERED])];
                    } else {
                        needFull = true;
                    }
                }
                if (!needFull) {
                    await stage('recheck', async () => {
                        const head = await git(['rev-parse', 'HEAD']);
                        if (head !== report.candidate) throw new GateStop(`HEAD moved from the verified ${report.candidate} to ${head}. Publish again to verify it.`);
                        await assertClean();
                    });
                    try {
                        await stage('push', async () => {
                            await git(['push', 'origin', `${report.candidate}:refs/heads/master`], 'The remote was not updated. If it advanced, publish again: the new revision needs its own verification.');
                            report.pushed = true;
                        });
                    } catch (error) {
                        // Only a rejection because master moved is retried; any other push failure stops here.
                        // `[remote rejected]` (a hook or permission refusal) is not a moved master and is not retried.
                        if (!(error instanceof GateStop) || signal?.aborted || !/non-fast-forward|fetch first|stale info|\[rejected\]|Updates were rejected/i.test(error.message)) throw error;
                        pushError = error;
                    }
                }
            } finally {
                release();
            }
            if (needFull) {
                await runChecks(selected.checks, master);
                remember(patchId, master);
                continue;
            }
            if (!pushError) break;
            // The push was rejected because master moved: the next pass fetches, rebases and counts the move.
            if (++rejections > maxRetries + 1) throw pushError;
            current = 'push';
        }

        await stage('confirm', async () => {
            const [remote] = (await git(['ls-remote', 'origin', 'refs/heads/master'])).split(/\s+/);
            if (remote !== report.candidate) throw new GateStop(`origin/master is ${remote || 'missing'} after the push, not ${report.candidate}.`);
        });

        report.ok = true;
        report.exitCode = 0;
    } catch (error) {
        report.failedStage = current;
        report.message = error.message;
        report.exitCode = error instanceof GateStop ? error.exitCode : 1;
    }
    return report;
}

function formatReport(report) {
    const lines = [`Publish gate, recipe ${report.recipe ?? '(none)'}`];
    if (report.candidate) lines.push(`Candidate: ${report.candidate} on ${report.verifiedBase}`);
    lines.push(`Completed: ${report.completed.join(', ') || '(none)'}`);
    for (const {path: kind, reason} of report.paths ?? []) lines.push(`Verification path: ${kind} (${reason})`);
    if (report.retries) lines.push(`Retries after master moved: ${report.retries}`);
    if (report.notCovered.length) lines.push(`Not covered: ${report.notCovered.join('; ')}`);
    if (report.ok) {
        lines.push(`Pushed ${report.candidate} to origin master. CI and Pages have not reported yet: check \`just ci ${report.candidate}\`.`);
    } else {
        lines.push(`Failed at: ${report.failedStage}${report.pushed ? ' (the push itself succeeded)' : ' (nothing was pushed)'}`, report.message);
    }
    lines.push(`Log: ${report.logPath}`);
    return lines.join('\n');
}

// Background publication (docs/adr/0043-background-publish-worktree.md): the same gate, run detached in its own worktree.
const backgroundDir = root => path.join(root, '.command-logs');
const gitSync = (cwd, args) => {
    const result = spawnSync('git', args, {cwd, encoding: 'utf8', windowsHide: true});
    if (result.error || result.status !== 0) throw new GateStop(`git ${args.join(' ')} failed: ${(result.stderr || result.error?.message || '').trim().slice(-OUTPUT_TAIL)}`);
    return result.stdout.trim();
};

/** Removes a publish worktree. Its node_modules link goes first, so Git never follows it into the shared install. */
function removePublishWorktree(root, worktree) {
    const link = path.join(worktree, 'node_modules');
    try {
        if (fs.lstatSync(link).isSymbolicLink()) { try { fs.unlinkSync(link); } catch { fs.rmdirSync(link); } }
    } catch { /* no link, or it could not be removed: checked below */ }
    let remains = false;
    try { fs.lstatSync(link); remains = true; } catch { /* gone */ }
    if (remains) return false; // a link or directory is still there: never let Git or rmSync follow it into the shared install
    spawnSync('git', ['worktree', 'remove', '--force', worktree], {cwd: root, windowsHide: true, stdio: 'ignore'});
    fs.rmSync(worktree, {recursive: true, force: true, maxRetries: 3});
    spawnSync('git', ['worktree', 'prune'], {cwd: root, windowsHide: true, stdio: 'ignore'});
    return true;
}

/** Only a `publish-*` directory directly under the main checkout's worktrees directory, never the origin or the main worktree. */
function isPublishWorktree(origin, worktree) {
    try {
        const main = fs.realpathSync.native(mainCheckout(origin));
        const target = fs.realpathSync.native(worktree);
        const parent = path.join(main, WORKTREES_DIR);
        const same = (a, b) => path.relative(a, b) === '';
        return path.dirname(target).toLowerCase() === parent.toLowerCase() && path.basename(target).startsWith('publish-')
            && !same(target, fs.realpathSync.native(origin)) && !same(target, main);
    } catch { return false; }
}

const claimPath = root => path.join(backgroundDir(root), 'publish.claim');

/** Takes the exclusive start claim, unless an earlier start or run is still alive. */
function takeClaim(root, now) {
    const file = claimPath(root);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            fs.writeFileSync(file, JSON.stringify({pid: process.pid, at: new Date(now).toISOString()}), {flag: 'wx'});
            return true;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            const holder = readJson(file);
            if (holder?.pid && pidAlive(holder.pid)) return false;
            fs.rmSync(file, {force: true});
        }
    }
    return false;
}

function readJson(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/** Background runs that started but have not written a result (a dead pid means the run ended without one). */
function pendingRuns(root) {
    const dir = backgroundDir(root);
    let names = [];
    try { names = fs.readdirSync(dir).filter(name => /^publish-.+\.pending$/.test(name)); } catch { /* none yet */ }
    return names.map(name => ({id: name.slice('publish-'.length, -'.pending'.length), ...readJson(path.join(dir, name))}))
        .filter(run => !fs.existsSync(path.join(dir, `publish-${run.id}.json`)));
}

/** Publish worktrees live under the main checkout, even when the handler runs from a linked worktree. */
const mainCheckout = root => path.dirname(gitSync(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']));

function removeStaleWorktrees(root, now) {
    const dir = path.join(mainCheckout(root), WORKTREES_DIR);
    let names;
    try { names = fs.readdirSync(dir).filter(name => name.startsWith('publish-')); } catch { return; }
    const live = pendingRuns(root).filter(run => run.pid && pidAlive(run.pid)).map(run => run.worktree);
    for (const name of names) {
        const worktree = path.join(dir, name);
        try {
            if (!live.includes(worktree) && now - fs.statSync(worktree).mtimeMs > WORKTREE_KEEP_MS) removePublishWorktree(root, worktree);
        } catch { /* leave it for the next run */ }
    }
}

function launchGate({cwd, args}) {
    const child = spawn(process.execPath, [__filename, ...args], {cwd, detached: true, windowsHide: true, stdio: 'ignore', env: {...process.env, GIT_EDITOR: 'true'}});
    child.unref();
    return child.pid;
}

/** Creates the publish worktree at the last declared commit and starts the foreground gate there; returns at once. */
async function publishBackground({cwd = process.cwd(), base, commits, recipe, launch = launchGate, now = Date.now()}) {
    const fail = (message, exitCode = 1) => ({ok: false, message, exitCode});
    let claimed = false;
    let root;
    let worktree;
    try {
        if (!Object.hasOwn(RECIPES, recipe ?? '')) return fail(`Unknown or missing recipe "${recipe ?? ''}".\n${USAGE}`, 2);
        if (!base || !commits?.length) return fail(`Declare the task base and its commits.\n${USAGE}`, 2);
        root = gitSync(cwd, ['rev-parse', '--show-toplevel']);
        const pending = pendingRuns(root).find(run => run.pid && pidAlive(run.pid));
        if (pending) return fail(`A background publish is pending (${pending.id}, pid ${pending.pid}) and has no result yet. Check \`just publish --status\` first.`);
        if (!takeClaim(root, now)) return fail('Another background publish is being started. Check `just publish --status` first.');
        claimed = true;
        const resolve = id => gitSync(root, ['rev-parse', '--verify', `${id}^{commit}`]);
        const declaredBase = resolve(base);
        const declared = commits.map(resolve);
        gitSync(root, ['merge-base', '--is-ancestor', declaredBase, 'HEAD']);
        const actual = gitSync(root, ['rev-list', '--reverse', '--topo-order', `${declaredBase}..HEAD`]).split(/\s+/).filter(Boolean);
        if (actual.join() !== declared.join()) {
            return fail(`The declared commits do not match ${base}..HEAD, oldest first.\nDeclared: ${declared.join(' ')}\nActual:   ${actual.join(' ') || '(none)'}`);
        }
        if (gitSync(root, ['rev-list', '--merges', `${declaredBase}..HEAD`])) return fail('The slice contains a merge commit. Rebase it to a linear series first.');

        removeStaleWorktrees(root, now);
        const last = declared.at(-1);
        const id = `${gitSync(root, ['rev-parse', '--short', last])}-${crypto.randomBytes(3).toString('hex')}`;
        worktree = path.join(mainCheckout(root), WORKTREES_DIR, `publish-${id}`);
        const logDir = backgroundDir(root);
        const resultPath = path.join(logDir, `publish-${id}.json`);
        const logPath = path.join(logDir, `publish-${id}.log`);
        fs.mkdirSync(logDir, {recursive: true});
        gitSync(root, ['worktree', 'add', '--detach', worktree, last]);
        const modules = path.join(root, 'node_modules');
        if (fs.existsSync(modules)) fs.symlinkSync(fs.realpathSync(modules), path.join(worktree, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
        const args = ['--recipe', recipe, '--base', declaredBase, '--commits', declared.join(','), '--result-file', resultPath, '--origin', root, '--log-path', logPath];
        const pid = await launch({cwd: worktree, args, logPath});
        if (!Number.isInteger(pid)) throw new GateStop('The background gate did not start (no process id).');
        fs.writeFileSync(path.join(logDir, `publish-${id}.pending`), JSON.stringify({pid, worktree, at: new Date(now).toISOString()}));
        const started = {ok: true, exitCode: 0, id, worktree, logPath, resultPath, pid};
        worktree = undefined;
        return started;
    } catch (error) {
        if (worktree && fs.existsSync(worktree)) {
            try { removePublishWorktree(root, worktree); } catch { /* the stale cleanup removes it later */ }
        }
        return fail(error.message, error.exitCode ?? 1);
    } finally {
        if (claimed) fs.rmSync(claimPath(root), {force: true});
    }
}

/** Runs in the background process after its gate: records the outcome, and drops the worktree only when the gate succeeded. */
function recordBackgroundResult({report, resultFile, origin, worktree}) {
    const result = {ok: report.ok, failedStage: report.ok ? null : report.failedStage, pushedRevision: report.pushed || report.ok ? report.candidate : null,
        logPath: report.logPath, worktree, at: new Date().toISOString()};
    fs.mkdirSync(path.dirname(resultFile), {recursive: true});
    fs.appendFileSync(report.logPath, `\n${formatReport(report)}\n`);
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 1));
    fs.rmSync(resultFile.replace(/\.json$/, '.pending'), {force: true});
    if (report.ok && origin && isPublishWorktree(origin, worktree)) {
        // The process's own directory cannot be removed on Windows.
        if (path.resolve(process.cwd()).toLowerCase().startsWith(path.resolve(worktree).toLowerCase())) process.chdir(origin);
        removePublishWorktree(origin, worktree);
    }
    return result;
}

/** Latest background results, newest first, after the runs that still have no result. */
function backgroundStatus({cwd = process.cwd(), limit = 5} = {}) {
    const root = gitSync(cwd, ['rev-parse', '--show-toplevel']);
    const dir = backgroundDir(root);
    let files = [];
    try { files = fs.readdirSync(dir).filter(name => /^publish-.+\.json$/.test(name)).map(name => ({name, time: fs.statSync(path.join(dir, name)).mtimeMs})); } catch { /* none */ }
    const lines = pendingRuns(root).map(run => `publish-${run.id}: ${run.pid && pidAlive(run.pid) ? 'pending' : 'ended without a result'} (pid ${run.pid}, worktree ${run.worktree})`);
    for (const {name} of files.sort((a, b) => b.time - a.time).slice(0, limit)) {
        const result = readJson(path.join(dir, name)) ?? {};
        const outcome = result.ok ? `ok, pushed ${result.pushedRevision}` : `FAILED at ${result.failedStage ?? 'unknown'}${result.pushedRevision ? ` (pushed ${result.pushedRevision})` : ''}`;
        lines.push(`${name.slice(0, -'.json'.length)}: ${outcome} at ${result.at ?? '?'}`, `  log: ${result.logPath ?? '?'}${result.ok ? '' : `\n  worktree kept: ${result.worktree ?? '?'}`}`);
    }
    return lines.length ? lines.join('\n') : 'No background publish has run from this checkout.';
}

async function cli(argv, options = {}) {
    let values;
    try {
        ({values} = parseArgs({args: argv, options: {
            recipe: {type: 'string'}, base: {type: 'string'}, commits: {type: 'string'}, background: {type: 'boolean'}, status: {type: 'boolean'},
            'result-file': {type: 'string'}, origin: {type: 'string'}, 'log-path': {type: 'string'},
        }}));
    } catch (error) {
        console.error(`${error.message}\n${USAGE}`);
        process.exitCode = 2;
        return;
    }
    if (Boolean(values['result-file']) !== Boolean(values.origin)) {
        console.error(`--result-file and --origin are internal flags and must be given together.
${USAGE}`);
        process.exitCode = 2;
        return;
    }
    const commits = values.commits?.split(',').map(id => id.trim()).filter(Boolean);
    if (values.status) {
        try { console.log(backgroundStatus({cwd: options.cwd})); } catch (error) { console.error(error.message); process.exitCode = 1; }
        return;
    }
    if (values.background) {
        const started = await publishBackground({cwd: options.cwd, recipe: values.recipe, base: values.base, commits});
        if (started.ok) console.log(`Background publish started (pid ${started.pid}).\nWorktree: ${started.worktree}\nLog: ${started.logPath}\nResult: ${started.resultPath}\nCheck \`just publish --status\` before calling the slice published.`);
        else console.error(started.message);
        process.exitCode = started.exitCode;
        return;
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    process.once('SIGINT', abort);
    process.once('SIGTERM', abort);
    const report = await publish({
        ...options,
        recipe: values.recipe,
        base: values.base,
        commits,
        signal: controller.signal,
        ...(values['log-path'] ? {logPath: values['log-path']} : {}),
    });
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
    if (values['result-file']) recordBackgroundResult({report, resultFile: values['result-file'], origin: values.origin, worktree: options.cwd ?? process.cwd()});
    else (report.ok ? console.log : console.error)(formatReport(report));
    process.exitCode = report.exitCode;
}

if (require.main === module) cli(process.argv.slice(2));

module.exports = {PRODUCTION_ORIGINS, RECIPES, backgroundStatus, cli, formatReport, publish, publishBackground, removePublishWorktree, spawnExec};
