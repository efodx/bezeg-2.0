// Repeatable workflow evaluation: compose a sandbox from a pinned app commit, current tooling and a task spec,
// then grade the result with the solution commit's held-back tests. See tools/agent-eval/README.md.
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {resolveNpmCli} = require('../../scripts/commands.cjs');

const ROOT = path.resolve(__dirname, '../..');
const MANIFEST = path.join(__dirname, 'tasks.json');
const SIZES = {S: 'S', M: 'M', L: 'L', small: 'S', medium: 'M', large: 'L'};
const RUNNER = "require('./scripts/commands.cjs').cli(process.argv.slice(1))";
const SANDBOX_NOTE = [
    'Evaluation sandbox: this repository is a history-free snapshot used for a repeatable workflow evaluation.',
    'It has no remote. Commit verified work locally on the current branch and skip fetch, rebase and push steps.',
    'Do not read other checkouts of this project. Otherwise work exactly as you normally would under AGENTS.md, including delegation.',
].join(' ');

function validateManifest(manifest) {
    const problems = [];
    if (!Array.isArray(manifest.tooling) || !manifest.tooling.length) problems.push('tooling must list repository paths');
    if (!Array.isArray(manifest.tasks) || !manifest.tasks.length) problems.push('tasks must not be empty');
    const ids = new Set();
    for (const task of manifest.tasks || []) {
        const name = task.id || '(missing id)';
        if (!/^[a-z0-9-]+$/.test(task.id || '')) problems.push(`${name}: id must be kebab-case`);
        if (ids.has(task.id)) problems.push(`${name}: duplicate id`);
        ids.add(task.id);
        if (!['S', 'M', 'L'].includes(task.size)) problems.push(`${name}: size must be S, M or L`);
        for (const key of ['base', 'solution']) if (!/^[0-9a-f]{40}$/.test(task[key] || '')) problems.push(`${name}: ${key} must be a full commit SHA`);
        if (typeof task.prompt !== 'string' || !task.prompt.trim()) problems.push(`${name}: prompt is required`);
        if (!Array.isArray(task.spec)) problems.push(`${name}: spec must be a list of paths`);
        if (!Array.isArray(task.hidden) || !task.hidden.some(test => test.tier === 'contract')) problems.push(`${name}: needs at least one contract test`);
        for (const test of task.hidden || []) {
            if (!['contract', 'reference'].includes(test.tier)) problems.push(`${name}: ${test.path} tier must be contract or reference`);
            if (!['unit', 'smoke'].includes(test.kind)) problems.push(`${name}: ${test.path} kind must be unit or smoke`);
        }
    }
    if (!ids.has(manifest.defaultTask)) problems.push('defaultTask must name a task');
    if (problems.length) throw new Error(`Invalid ${path.relative(ROOT, MANIFEST)}:\n- ${problems.join('\n- ')}`);
    return manifest;
}

function loadManifest(file = MANIFEST) {
    return validateManifest(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function findTask(manifest, key) {
    const wanted = key || manifest.defaultTask;
    const task = manifest.tasks.find(entry => entry.id === wanted || (SIZES[wanted] && entry.size === SIZES[wanted]));
    if (!task) throw new Error(`Unknown task ${JSON.stringify(wanted)}. Use one of: ${manifest.tasks.map(entry => `${entry.id} (${entry.size})`).join(', ')}.`);
    return task;
}

function git(cwd, args, {env = {}, input, encoding = 'utf8'} = {}) {
    const result = childProcess.spawnSync('git', args, {cwd, env: {...process.env, ...env}, input, encoding, maxBuffer: 1 << 30});
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr || result.error).trim()}`);
    return result.stdout;
}

// Writes a revision's files (or only `paths`) into dest without touching the source repository's index or history.
function exportRevision(repo, revision, dest, paths) {
    if (paths && !paths.length) return;
    const index = path.join(os.tmpdir(), `agent-eval-index-${crypto.randomUUID()}`);
    const env = {GIT_INDEX_FILE: index};
    const prefix = `${path.resolve(dest).replaceAll('\\', '/')}/`;
    try {
        git(repo, ['read-tree', revision], {env});
        if (!paths) return git(repo, ['checkout-index', '--all', '--force', `--prefix=${prefix}`], {env});
        const files = git(repo, ['ls-tree', '-r', '-z', '--name-only', revision, '--', ...paths]);
        if (files) git(repo, ['checkout-index', '--force', '-z', '--stdin', `--prefix=${prefix}`], {env, input: files});
    } finally {
        fs.rmSync(index, {force: true});
    }
}

function resolveWorkflow(source = 'HEAD') {
    const dir = path.resolve(source);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return {kind: 'directory', source: dir, description: `files from ${dir}`};
    const revision = git(ROOT, ['rev-parse', '--verify', `${source}^{commit}`]).trim();
    return {kind: 'revision', source, revision, description: `${source} (${revision.slice(0, 12)})`};
}

// Replaces each tooling path wholesale, so files removed from current tooling are removed from the sandbox too.
function overlayTooling(tooling, workflow, repo) {
    for (const entry of tooling) fs.rmSync(path.join(repo, entry), {recursive: true, force: true});
    if (workflow.kind === 'revision') return exportRevision(ROOT, workflow.revision, repo, tooling);
    for (const entry of tooling) {
        const from = path.join(workflow.source, entry);
        if (fs.existsSync(from)) fs.cpSync(from, path.join(repo, entry), {recursive: true});
    }
}

function stamp(date = new Date()) {
    return date.toISOString().replace(/\.\d+Z$/, '').replaceAll(/[-:]/g, '').replace('T', '-');
}

function commitAll(repo, message) {
    git(repo, ['add', '--all']);
    git(repo, ['commit', '--quiet', '--allow-empty', '--no-verify', '-m', message]);
}

function setup(key, {state = 'base', workflow: workflowSource, root, install = true, log = console.log} = {}) {
    const manifest = loadManifest();
    const task = findTask(manifest, key);
    const workflow = resolveWorkflow(workflowSource);
    const runsRoot = path.resolve(root || process.env.AGENT_EVAL_ROOT || path.join(os.homedir(), 'agent-eval-runs'));
    const runDir = path.join(runsRoot, `${task.id}-${state === 'reference' ? 'reference-' : ''}${stamp()}`);
    const repo = path.join(runDir, 'repo');
    if (fs.existsSync(runDir)) throw new Error(`${runDir} already exists.`);
    fs.mkdirSync(repo, {recursive: true});

    const appRevision = state === 'reference' ? task.solution : task.base;
    exportRevision(ROOT, appRevision, repo);
    if (state !== 'reference') exportRevision(ROOT, task.solution, repo, task.spec);
    git(repo, ['init', '--quiet', '--initial-branch=master']);
    git(repo, ['config', 'user.name', 'Agent eval']);
    git(repo, ['config', 'user.email', 'agent-eval@localhost']);
    commitAll(repo, `eval base: ${task.id} app at ${appRevision.slice(0, 12)} (${state})`);
    overlayTooling(manifest.tooling, workflow, repo);
    commitAll(repo, `eval tooling: ${workflow.description}`);
    git(repo, ['tag', 'eval-start']);

    const prompt = `${SANDBOX_NOTE}\n\n${task.prompt}\n`;
    fs.writeFileSync(path.join(runDir, 'prompt.md'), prompt);
    const run = {
        task: task.id, size: task.size, class: task.class, state, base: task.base, solution: task.solution, appRevision,
        workflow: {kind: workflow.kind, source: workflow.source, revision: workflow.revision}, createdAt: new Date().toISOString(), repo,
    };
    fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify(run, null, 4)}\n`);
    if (install) {
        log('Installing dependencies (npm ci)...');
        const npmCli = resolveNpmCli();
        if (!npmCli) throw new Error('Could not locate npm-cli.js; run from the Node installation that includes npm.');
        const result = childProcess.spawnSync(process.execPath, [npmCli, 'ci', '--prefer-offline', '--no-audit', '--no-fund'], {cwd: repo, stdio: 'inherit'});
        if (result.status !== 0) throw new Error(`npm ci failed in ${repo}`);
    }
    log(`Run ${path.basename(runDir)} (${task.size}, ${state}) with tooling from ${workflow.description}.`);
    log(`  sandbox: ${repo}`);
    log(`  prompt:  ${path.join(runDir, 'prompt.md')}`);
    return {runDir, repo, run, prompt};
}

function runner(repo, args) {
    const started = Date.now();
    const result = childProcess.spawnSync(process.execPath, ['--eval', RUNNER, ...args], {cwd: repo, encoding: 'utf8', maxBuffer: 1 << 28});
    const lines = `${result.stdout || ''}`.trim().split(/\r?\n/).filter(Boolean);
    return {
        command: args.join(' '), passed: result.status === 0, seconds: Math.round((Date.now() - started) / 100) / 10,
        summary: lines.at(-1) || String(result.error || '').trim(), errorTail: result.status === 0 ? undefined : `${result.stderr || ''}`.trim().slice(-2000),
    };
}

// Temporarily replaces the given paths with the solution commit's versions, restoring the agent's files afterwards.
function withHiddenFiles(repo, solution, paths, action) {
    const saved = paths.map(file => {
        const absolute = path.join(repo, file);
        return {absolute, original: fs.existsSync(absolute) ? fs.readFileSync(absolute) : null};
    });
    try {
        for (const [index, file] of paths.entries()) {
            fs.mkdirSync(path.dirname(saved[index].absolute), {recursive: true});
            fs.writeFileSync(saved[index].absolute, git(ROOT, ['show', `${solution}:${file}`], {encoding: 'buffer'}));
        }
        return action();
    } finally {
        for (const {absolute, original} of saved) {
            if (original === null) fs.rmSync(absolute, {force: true});
            else fs.writeFileSync(absolute, original);
        }
    }
}

function claudeProjectKey(dir) {
    return path.resolve(dir).replace(/[^A-Za-z0-9]/g, '-');
}

function emptyTotals() {
    return {sessions: 0, requests: 0, inputTokens: 0, outputTokens: 0, peakRequestInput: 0, weightedInput: 0};
}

function profileClaudeTranscript(text) {
    const seen = new Set();
    const profile = {requests: 0, inputTokens: 0, outputTokens: 0, peakRequestInput: 0, weightedInput: 0, first: null, last: null};
    for (const line of text.split(/\r?\n/)) {
        let entry;
        try { entry = JSON.parse(line); } catch { continue; }
        if (entry.timestamp) {
            profile.first ||= entry.timestamp;
            profile.last = entry.timestamp;
        }
        const message = entry.message || {};
        if (entry.type !== 'assistant' || !message.usage || seen.has(message.id)) continue;
        seen.add(message.id);
        const usage = message.usage;
        const input = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
        profile.requests += 1;
        profile.inputTokens += input;
        profile.outputTokens += usage.output_tokens || 0;
        profile.peakRequestInput = Math.max(profile.peakRequestInput, input);
        // Same relative price as tools/agent-usage/claude_turn_usage.py.
        profile.weightedInput += (usage.cache_creation_input_tokens || 0) * 1.25 + (usage.cache_read_input_tokens || 0) * 0.1
            + (usage.input_tokens || 0) + (usage.output_tokens || 0) * 5;
    }
    return profile;
}

function addProfile(totals, profile, span) {
    totals.sessions += 1;
    for (const key of ['requests', 'inputTokens', 'outputTokens', 'weightedInput']) totals[key] += profile[key];
    totals.peakRequestInput = Math.max(totals.peakRequestInput, profile.peakRequestInput);
    if (profile.first && (!span.first || profile.first < span.first)) span.first = profile.first;
    if (profile.last && (!span.last || profile.last > span.last)) span.last = profile.last;
}

// Claude names a project folder after its working directory; sandbox worktrees extend that name.
function claudeUsage(repo, projectsDir = path.join(os.homedir(), '.claude', 'projects')) {
    const key = claudeProjectKey(repo);
    const usage = {handler: emptyTotals(), worker: emptyTotals()};
    const span = {first: null, last: null};
    if (!fs.existsSync(projectsDir)) return {...usage, ...span};
    for (const name of fs.readdirSync(projectsDir)) {
        if (name !== key && !name.startsWith(`${key}-`)) continue;
        const project = path.join(projectsDir, name);
        for (const entry of fs.readdirSync(project, {withFileTypes: true})) {
            if (entry.isFile() && entry.name.endsWith('.jsonl')) {
                addProfile(usage.handler, profileClaudeTranscript(fs.readFileSync(path.join(project, entry.name), 'utf8')), span);
            }
            const subagents = path.join(project, entry.name, 'subagents');
            if (entry.isDirectory() && fs.existsSync(subagents)) {
                for (const file of fs.readdirSync(subagents).filter(file => file.endsWith('.jsonl'))) {
                    addProfile(usage.worker, profileClaudeTranscript(fs.readFileSync(path.join(subagents, file), 'utf8')), span);
                }
            }
        }
    }
    return {...usage, ...span};
}

function insideDir(child, parent) {
    const relative = path.relative(path.resolve(parent).toLowerCase(), path.resolve(child).toLowerCase());
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function profileCodexRollout(text, repo) {
    const lines = text.split(/\r?\n/);
    let meta;
    try { meta = JSON.parse(lines[0]); } catch { return null; }
    if (meta.type !== 'session_meta' || !meta.payload?.cwd || !insideDir(meta.payload.cwd, repo)) return null;
    const profile = {role: meta.payload.parent_thread_id ? 'worker' : 'handler', requests: 0, inputTokens: 0, outputTokens: 0, peakRequestInput: 0, weightedInput: 0, first: meta.timestamp, last: meta.timestamp};
    for (const line of lines) {
        let entry;
        try { entry = JSON.parse(line); } catch { continue; }
        if (entry.timestamp) profile.last = entry.timestamp;
        const info = entry.type === 'event_msg' && entry.payload?.type === 'token_count' ? entry.payload.info : null;
        if (!info?.total_token_usage) continue;
        profile.requests += 1;
        profile.inputTokens = info.total_token_usage.input_tokens || 0;
        profile.outputTokens = info.total_token_usage.output_tokens || 0;
        profile.peakRequestInput = Math.max(profile.peakRequestInput, info.last_token_usage?.input_tokens || 0);
    }
    return profile;
}

function codexUsage(repo, since, sessionsDir = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions')) {
    const usage = {handler: emptyTotals(), worker: emptyTotals()};
    const span = {first: null, last: null};
    const sinceMs = Date.parse(since) || 0;
    const visit = dir => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) visit(file);
            else if (entry.name.endsWith('.jsonl') && fs.statSync(file).mtimeMs >= sinceMs) {
                const profile = profileCodexRollout(fs.readFileSync(file, 'utf8'), repo);
                if (profile) addProfile(usage[profile.role], profile, span);
            }
        }
    };
    visit(sessionsDir);
    for (const totals of Object.values(usage)) delete totals.weightedInput;
    return {...usage, ...span};
}

function gitSummary(repo) {
    const commits = git(repo, ['log', '--format=%h %s', 'eval-start..HEAD']).trim().split('\n').filter(Boolean);
    const status = git(repo, ['status', '--porcelain']).trim().split('\n').filter(Boolean);
    return {
        commits,
        uncommittedPaths: status.length,
        changedSinceStart: git(repo, ['diff', '--shortstat', 'eval-start']).trim() || 'no tracked changes',
    };
}

function grade(runDir, {skipSmoke = false, port = 4300 + Math.floor(Math.random() * 500), log = console.log} = {}) {
    const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
    const task = findTask(loadManifest(), run.task);
    const repo = run.repo;
    const gradedAt = new Date().toISOString();
    const report = {task: task.id, size: task.size, state: run.state, workflow: run.workflow, gradedAt, git: gitSummary(repo), gates: [], hidden: []};

    for (const command of [['typecheck'], ['unit'], ['build']]) {
        log(`gate: ${command.join(' ')}...`);
        report.gates.push(runner(repo, command));
    }
    const buildPassed = report.gates.at(-1).passed;
    const groups = [];
    for (const kind of ['smoke', 'unit']) {
        for (const tier of ['contract', 'reference']) {
            for (const test of task.hidden.filter(entry => entry.kind === kind && entry.tier === tier)) {
                const group = kind === 'smoke' ? null : groups.find(entry => entry.kind === kind && entry.tier === tier);
                if (group) group.tests.push(test);
                else groups.push({kind, tier, tests: [test]});
            }
        }
    }
    for (const group of groups) {
        const files = group.tests.map(test => test.path);
        const entry = {tier: group.tier, kind: group.kind, files};
        if (group.kind === 'smoke' && (skipSmoke || !buildPassed)) {
            report.hidden.push({...entry, skipped: skipSmoke ? 'smoke skipped by --skip-smoke' : 'build failed'});
            continue;
        }
        log(`hidden ${group.tier} ${group.kind}: ${files.join(', ')}...`);
        const args = group.kind === 'smoke' ? ['smoke-built', ...files, ...(group.tests[0].args || []), '--port', String(port)] : ['unit', ...files];
        report.hidden.push({...entry, ...withHiddenFiles(repo, task.solution, files, () => runner(repo, args))});
    }
    report.usage = {claude: claudeUsage(repo), codex: codexUsage(repo, run.createdAt)};
    report.verdict = verdict(report);
    const file = path.join(runDir, `grade-${stamp(new Date(gradedAt))}.json`);
    fs.writeFileSync(file, `${JSON.stringify(report, null, 4)}\n`);
    log(formatReport(report));
    log(`Report: ${file}`);
    return report;
}

function verdict(report) {
    const contract = report.hidden.filter(entry => entry.tier === 'contract');
    const gatesPassed = report.gates.every(gate => gate.passed);
    const contractPassed = contract.every(entry => entry.passed);
    const incomplete = contract.some(entry => entry.skipped);
    if (gatesPassed && contractPassed && !incomplete) return 'accepted';
    if (gatesPassed && contract.every(entry => entry.passed || entry.skipped)) return 'incomplete';
    return 'rejected';
}

function formatTotals(name, totals) {
    if (!totals.sessions) return null;
    const weighted = totals.weightedInput === undefined ? '' : `, weighted ${Math.round(totals.weightedInput).toLocaleString('en')}`;
    return `${name}: ${totals.sessions} session(s), ${totals.requests} requests, input ${totals.inputTokens.toLocaleString('en')}, output ${totals.outputTokens.toLocaleString('en')}, peak request ${totals.peakRequestInput.toLocaleString('en')}${weighted}`;
}

function formatReport(report) {
    const lines = [`\n${report.task} (${report.size}, ${report.state}): ${report.verdict.toUpperCase()}`];
    lines.push(`git: ${report.git.commits.length} commit(s), ${report.git.uncommittedPaths} uncommitted path(s), ${report.git.changedSinceStart}`);
    for (const gate of report.gates) lines.push(`gate ${gate.passed ? 'pass' : 'FAIL'}: ${gate.summary}`);
    for (const entry of report.hidden) {
        const state = entry.skipped ? `skipped (${entry.skipped})` : entry.passed ? 'pass' : 'FAIL';
        lines.push(`hidden ${entry.tier} ${entry.kind} ${state}: ${entry.files.join(', ')}`);
    }
    for (const [tool, usage] of Object.entries(report.usage)) {
        const rows = ['handler', 'worker'].map(role => formatTotals(`${tool} ${role}`, usage[role])).filter(Boolean);
        if (rows.length) lines.push(...rows, `${tool} span: ${usage.first} to ${usage.last}`);
    }
    if (!report.usage.claude.handler.sessions && !report.usage.codex.handler.sessions) lines.push('usage: no Claude or Codex sessions found for this sandbox');
    return lines.join('\n');
}

// Grades the reference solution and the untouched base: the reference must pass everything, the base must fail a contract test.
function calibrate(key, options = {}) {
    const results = {};
    for (const state of ['reference', 'base']) {
        const {runDir} = setup(key, {...options, state});
        results[state] = grade(runDir, options);
    }
    const reference = results.reference;
    const referenceOk = reference.gates.every(gate => gate.passed) && reference.hidden.every(entry => entry.passed || entry.skipped);
    const baseDiscriminates = results.base.hidden.some(entry => entry.tier === 'contract' && entry.passed === false);
    const log = options.log || console.log;
    log(`\ncalibration ${findTask(loadManifest(), key).id}: reference ${referenceOk ? 'passes' : 'FAILS'}; base ${baseDiscriminates ? 'fails a contract test' : 'PASSES every contract test'}`);
    return referenceOk && baseDiscriminates;
}

function parseOptions(args) {
    const options = {};
    const positional = [];
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        const value = () => {
            if (index + 1 >= args.length) throw new Error(`${arg} needs a value.`);
            return args[++index];
        };
        if (arg === '--workflow') options.workflow = value();
        else if (arg === '--root') options.root = value();
        else if (arg === '--port') options.port = Number(value());
        else if (arg === '--no-install') options.install = false;
        else if (arg === '--skip-smoke') options.skipSmoke = true;
        else if (arg === '--reference') options.state = 'reference';
        else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}.`);
        else positional.push(arg);
    }
    return {options, positional};
}

const USAGE = `Usage: just eval <command>
  list                                  show tasks (default marked *)
  setup [task|S|M|L] [--workflow <ref|dir>] [--root <dir>] [--no-install] [--reference]
  grade <run-dir> [--skip-smoke] [--port <n>]
  calibrate [task|S|M|L] [--workflow <ref|dir>] [--root <dir>] [--skip-smoke]`;

function main(argv) {
    const [command, ...rest] = argv;
    const {options, positional} = parseOptions(rest);
    if (command === 'list') {
        const manifest = loadManifest();
        for (const task of manifest.tasks) console.log(`${task.id === manifest.defaultTask ? '*' : ' '} ${task.size} ${task.id}: ${task.class}`);
        return 0;
    }
    if (command === 'setup') return setup(positional[0], options) && 0;
    if (command === 'grade') {
        if (!positional[0]) throw new Error('grade needs the run directory printed by setup.');
        return grade(path.resolve(positional[0]), options).verdict === 'accepted' ? 0 : 1;
    }
    if (command === 'calibrate') return calibrate(positional[0], options) ? 0 : 1;
    console.log(USAGE);
    return command ? 2 : 0;
}

function cli(argv) {
    try { process.exitCode = main(argv); }
    catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

if (require.main === module) cli(process.argv.slice(2));

module.exports = {claudeProjectKey, claudeUsage, cli, codexUsage, exportRevision, findTask, formatReport, loadManifest, main, profileClaudeTranscript, profileCodexRollout, validateManifest, verdict};
