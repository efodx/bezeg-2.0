'use strict';

// Fail-fast publication gate (docs/specs/fail-fast-publication-gate.md). It reconciles the handler's
// declared commits with origin/master, verifies that exact revision and pushes it as a fast-forward.
// Every external command runs through one adapter, and any failure stops every later stage.

const {spawn, spawnSync} = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');

const PRODUCTION_ORIGINS = ['https://github.com/efodx/bezeg-2.0.git', 'https://github.com/efodx/bezeg-2.0'];
const USAGE = 'Usage: just publish --recipe <docs|tooling|runtime> --base <commit> --commits <id,id,...>\n'
    + 'List the reviewed commits oldest first: every commit after --base, and no others.';
const OUTPUT_TAIL = 2000;
const CANCELLED_EXIT = 130;
const KILL_GRACE_MS = 2000;

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
    runtime: {
        checks: ['check'],
        allows: () => true,
        notCovered: ['browser smoke: run it first when a route, control, lesson or rendering path changed', 'link anchors'],
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

function spawnExec({executable, args, cwd, logPath, signal}) {
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
                stdio: ['ignore', 'pipe', 'pipe'],
            });
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

async function publish({cwd = process.cwd(), base, commits, recipe, expectedOrigins = PRODUCTION_ORIGINS, exec = spawnExec, signal, logPath = defaultLogPath(cwd)}) {
    const report = {
        ok: false, recipe, base, commits, candidate: null, verifiedBase: null, completed: [], failedStage: null,
        message: null, exitCode: 1, notCovered: [], logPath, pushed: false,
    };
    let current = 'arguments';
    let root = cwd;

    const cancelled = () => new GateStop('Cancelled; no later stage ran.', CANCELLED_EXIT);
    const run = async (executable, args, hint) => {
        if (signal?.aborted) throw cancelled();
        const result = await exec({stage: current, executable, args, cwd: root, logPath, signal});
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

        const master = await stage('fetch', async () => {
            await git(['fetch', 'origin', 'refs/heads/master']);
            return git(['rev-parse', '--verify', 'FETCH_HEAD^{commit}']);
        });
        report.verifiedBase = master;

        report.candidate = await stage('reconcile', async () => {
            await git(['rebase', '--no-autostash', '--onto', master, baseCommit], 'The rebase stopped and its state is kept. Resolve it, or run `git rebase --abort`, then declare the new commits and publish again.');
            const head = await git(['rev-parse', 'HEAD']);
            await git(['merge-base', '--is-ancestor', master, head], 'The reconciled revision does not contain origin/master.');
            const count = Number(await git(['rev-list', '--count', `${master}..${head}`]));
            if (count !== commits.length) throw new GateStop(`The rebase left ${count} of ${commits.length} declared commits; some are already on master. Declare the remaining commits and publish again.`);
            return head;
        });
        const candidate = report.candidate;

        await stage('whitespace', () => git(['diff', '--check', master, candidate], 'Fix these whitespace errors in a new commit, then publish again.'));

        await stage('scope', async () => {
            const changed = await git(['-c', 'core.quotePath=false', 'diff', '--name-only', '--no-renames', master, candidate]);
            const outside = changed.split(/\r?\n/).filter(Boolean).filter(file => !selected.allows(file));
            if (outside.length) throw new GateStop(`Recipe ${recipe} cannot vouch for these files:\n${outside.join('\n')}\nSelect a recipe that covers them.`);
        });

        await stage('verify:links', async () => {
            const diff = await git(['-c', 'core.quotePath=false', 'diff', '-U0', '--no-color', '--no-renames', master, candidate, '--', '*.md']);
            const broken = brokenLinks(root, diff);
            if (broken.length) throw new GateStop(`Added links point at missing files:\n${broken.map(({file, target}) => `${file}: ${target}`).join('\n')}`);
        });

        for (const check of selected.checks) {
            await stage(`verify:${check}`, () => run(process.execPath, ['scripts/commands.cjs', check]));
        }

        await stage('recheck', async () => {
            const head = await git(['rev-parse', 'HEAD']);
            if (head !== candidate) throw new GateStop(`HEAD moved from the verified ${candidate} to ${head}. Publish again to verify it.`);
            await assertClean();
        });

        await stage('push', async () => {
            await git(['push', 'origin', `${candidate}:refs/heads/master`], 'The remote was not updated. If it advanced, publish again: the new revision needs its own verification.');
            report.pushed = true;
        });

        await stage('confirm', async () => {
            const [remote] = (await git(['ls-remote', 'origin', 'refs/heads/master'])).split(/\s+/);
            if (remote !== candidate) throw new GateStop(`origin/master is ${remote || 'missing'} after the push, not ${candidate}.`);
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
    if (report.notCovered.length) lines.push(`Not covered: ${report.notCovered.join('; ')}`);
    if (report.ok) {
        lines.push(`Pushed ${report.candidate} to origin master. CI and Pages have not reported yet: check \`just ci ${report.candidate}\`.`);
    } else {
        lines.push(`Failed at: ${report.failedStage}${report.pushed ? ' (the push itself succeeded)' : ' (nothing was pushed)'}`, report.message);
    }
    lines.push(`Log: ${report.logPath}`);
    return lines.join('\n');
}

async function cli(argv, options = {}) {
    let values;
    try {
        ({values} = parseArgs({args: argv, options: {recipe: {type: 'string'}, base: {type: 'string'}, commits: {type: 'string'}}}));
    } catch (error) {
        console.error(`${error.message}\n${USAGE}`);
        process.exitCode = 2;
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
        commits: values.commits?.split(',').map(id => id.trim()).filter(Boolean),
        signal: controller.signal,
    });
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
    (report.ok ? console.log : console.error)(formatReport(report));
    process.exitCode = report.exitCode;
}

if (require.main === module) cli(process.argv.slice(2));

module.exports = {PRODUCTION_ORIGINS, RECIPES, cli, formatReport, publish, spawnExec};
