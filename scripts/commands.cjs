'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const LOG_DIR_NAME = '.command-logs';
const STAMP_NAME = '.bezeg-build-provenance.json';
const TAIL_LIMIT = 16 * 1024;

function collectFiles(root, relative = '') {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return [];
    return fs.readdirSync(absolute, {withFileTypes: true}).flatMap(entry => {
        const child = path.join(relative, entry.name);
        if (entry.isDirectory()) return collectFiles(root, child);
        if (entry.isFile()) return [child];
        return [];
    });
}

function hashFiles(root, files) {
    const hash = crypto.createHash('sha256');
    for (const relative of [...files].sort()) {
        const absolute = path.join(root, relative);
        hash.update(relative.replaceAll(path.sep, '/'));
        hash.update('\0');
        hash.update(fs.readFileSync(absolute));
        hash.update('\0');
    }
    return hash.digest('hex');
}

function inputFiles(root) {
    const files = [];
    for (const dir of ['src', 'public']) files.push(...collectFiles(root, dir));
    for (const name of fs.readdirSync(root)) {
        if (/^(package\.json|package-lock\.json|npm-shrinkwrap\.json|index\.html|vite\.config\.[^/]+|tsconfig[^/]*\.json|\.browserslistrc|\.nvmrc|\.env(?:\..*)?)$/.test(name)) {
            const absolute = path.join(root, name);
            if (fs.statSync(absolute).isFile()) files.push(name);
        }
    }
    return files;
}

function digestInputs(root) {
    const hash = crypto.createHash('sha256');
    hash.update(hashFiles(root, inputFiles(root)));
    for (const key of Object.keys(process.env).filter(name => name === 'NODE_ENV' || name.startsWith('VITE_')).sort()) {
        hash.update(`\0${key}=${process.env[key]}`);
    }
    return hash.digest('hex');
}

function digestBuild(root) {
    const files = collectFiles(root, 'build');
    if (!files.length) throw new Error('Build output is missing or empty. Run `just build`.');
    return hashFiles(root, files);
}

async function gitState(root) {
    const [revision, status] = await Promise.all([gitOutput(root, ['rev-parse', 'HEAD']), gitOutput(root, ['status', '--porcelain'], 4096)]);
    const dirty = status.length > 0;
    return {revision, dirty};
}

function commandOutput(executable, root, args, maxOutput = 4096) {
    return new Promise((resolve, reject) => {
        const child = spawn(executable, args, {cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8').on('data', value => { if (stdout.length < maxOutput) stdout += value.slice(0, maxOutput - stdout.length); });
        child.stderr.setEncoding('utf8').on('data', value => { if (stderr.length < 4096) stderr += value.slice(0, 4096 - stderr.length); });
        child.once('error', reject);
        child.once('close', code => code === 0 ? resolve(stdout.trim()) : reject(new Error(`${executable} ${args[0]} failed: ${stderr.trim()}`)));
    });
}

function gitOutput(root, args, maxOutput = 4096) {
    return commandOutput('git', root, args, maxOutput);
}

const LESSON_SPEC = 'tests/guided-lessons.smoke.spec.cjs';

function lessonGrep(root, ids) {
    if (!ids.length) throw new Error(`Usage: just smoke-lesson <lesson-id>... [Playwright arguments...]. Ids are the \`id:\` rows of ${LESSON_SPEC}.`);
    const known = new Set([...fs.readFileSync(path.join(root, LESSON_SPEC), 'utf8').matchAll(/\bid: '([a-z0-9-]+)'/g)].map(match => match[1]));
    const unknown = ids.filter(id => !known.has(id));
    if (unknown.length) throw new Error(`Unknown lesson id ${unknown.map(id => JSON.stringify(id)).join(', ')}. Known ids: ${[...known].sort().join(', ')}.`);
    // Playwright joins describe and test titles with spaces; the trailing space keeps `sequence` from matching `sequence-convergence`.
    return `(Lesson|on) (${ids.join('|')}) `;
}

const CATALOG_ENTRY = /^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$/;

function readCatalog(root, language) {
    const entries = new Map();
    for (const line of fs.readFileSync(path.join(root, 'src/localization', `${language}.ts`), 'utf8').split(/\r?\n/)) {
        const match = CATALOG_ENTRY.exec(line);
        if (match) entries.set(match[1], match[2]);
    }
    return entries;
}

function lookupLocalization(root, pattern, limit = 40) {
    let matcher;
    try { matcher = new RegExp(pattern, 'iu'); }
    catch (error) { throw new Error(`Invalid pattern ${JSON.stringify(pattern)}: ${error.message}`); }
    const sl = readCatalog(root, 'sl');
    const en = readCatalog(root, 'en');
    const keys = [...new Set([...sl.keys(), ...en.keys()])].filter(key => matcher.test(key) || matcher.test(sl.get(key) ?? '') || matcher.test(en.get(key) ?? ''));
    const lines = keys.slice(0, limit).flatMap(key => [key, `  sl: ${sl.has(key) ? sl.get(key) : '(missing)'}`, `  en: ${en.has(key) ? en.get(key) : '(missing)'}`]);
    lines.push(keys.length > limit ? `${keys.length} keys match; showing the first ${limit}. Narrow the pattern.` : `${keys.length} ${keys.length === 1 ? 'key matches' : 'keys match'}.`);
    return lines.join('\n');
}

const CI_FAILURE_LINE = /✘|\b(Error|FAIL|failed|Expected|Received|Timeout)\b|^\s+at .*\.(spec|test)\.[cm]?[jt]sx?:\d+/;

async function ciSummary(root, sha, output = commandOutput) {
    const fields = 'databaseId,workflowName,status,conclusion,headSha,displayTitle,createdAt,url';
    const listArgs = ['run', 'list', '--json', fields, '--limit', sha ? '10' : '5', ...(sha ? ['--commit', sha] : ['--branch', 'master'])];
    const runs = JSON.parse(await output('gh', root, listArgs, 64 * 1024) || '[]');
    if (!runs.length) return sha ? `No workflow runs found for ${sha}. Push it first, or check the SHA.` : 'No workflow runs found on master.';
    const lines = runs.map(run => `${run.headSha.slice(0, 7)} ${run.workflowName}: ${run.status === 'completed' ? run.conclusion : run.status} (${run.createdAt}) ${run.url}`);
    // Runs are newest first; a failure already followed by a newer run of its workflow is history, not current state.
    const latest = runs.filter((run, index) => runs.findIndex(other => other.workflowName === run.workflowName) === index);
    const failed = latest.find(run => run.status === 'completed' && run.conclusion === 'failure');
    if (failed) {
        const log = await output('gh', root, ['run', 'view', String(failed.databaseId), '--log-failed'], 512 * 1024);
        const excerpt = log.split(/\r?\n/).filter(line => CI_FAILURE_LINE.test(line)).map(line => line.replace(/^[^\t]*\t[^\t]*\t(\S+Z )?/, '').slice(0, 240));
        lines.push('', `Failure excerpt from run ${failed.databaseId} (${excerpt.length > 40 ? 'first 40 of ' : ''}${excerpt.length} matching lines; full log: gh run view ${failed.databaseId} --log-failed):`, ...excerpt.slice(0, 40));
    }
    return lines.join('\n');
}

function logPath(root) {
    const dir = path.join(root, LOG_DIR_NAME);
    fs.mkdirSync(dir, {recursive: true});
    const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
    return path.join(dir, `${stamp}-${process.pid}-${crypto.randomBytes(4).toString('hex')}.log`);
}

function appendTail(previous, chunk) {
    const next = Buffer.concat([previous, chunk]);
    return next.length > TAIL_LIMIT ? next.subarray(next.length - TAIL_LIMIT) : next;
}

function runChild({executable, args = [], cwd, env = process.env, log, verbose = process.env.BEZEG_VERBOSE === '1', stdout = process.stdout, stderr = process.stderr}) {
    return new Promise(resolve => {
        const output = fs.createWriteStream(log, {flags: 'a'});
        let tail = Buffer.alloc(0);
        let warned = false;
        const blockedSinks = new Set();
        let spawnError;
        let requestedSignal;
        let logError;
        let verboseError;
        let outputFinished = false;
        let childResult;
        let settled = false;
        let child;
        const destinationErrorHandlers = new Map();
        const drainHandlers = new Map();
        const resolveOnce = result => {
            if (settled) return;
            settled = true;
            for (const [destination, handler] of destinationErrorHandlers) destination.removeListener('error', handler);
            for (const [sink, handler] of drainHandlers) sink.removeListener('drain', handler);
            resolve(result);
        };
        const resumePipes = () => {
            for (const [sink, handler] of drainHandlers) sink.removeListener('drain', handler);
            drainHandlers.clear();
            blockedSinks.clear();
            child?.stdout?.resume();
            child?.stderr?.resume();
        };
        const settleIfReady = () => {
            if (!childResult) return;
            if (logError) {
                resolveOnce({...childResult, code: childResult.code === 0 ? 1 : childResult.code, error: logError, logError, verboseError, tail: tail.toString('utf8'), warned});
            } else if (verboseError && outputFinished) {
                resolveOnce({...childResult, code: childResult.code === 0 ? 1 : childResult.code, error: verboseError, verboseError, tail: tail.toString('utf8'), warned});
            } else if (outputFinished) {
                resolveOnce({...childResult, tail: tail.toString('utf8'), warned});
            }
        };
        const failVerboseSink = error => {
            verboseError ||= error;
            resumePipes();
            if (child && child.exitCode === null && !child.killed) {
                child.kill('SIGTERM');
                const forceKill = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 500);
                forceKill.unref();
            }
        };
        output.once('finish', () => { outputFinished = true; settleIfReady(); });
        output.once('error', error => {
            logError = error;
            resumePipes();
            if (child && child.exitCode === null && !child.killed) {
                child.kill('SIGTERM');
                const forceKill = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 500);
                forceKill.unref();
            }
            settleIfReady();
        });
        if (verbose) {
            for (const destination of new Set([stdout, stderr])) {
                destinationErrorHandlers.set(destination, failVerboseSink);
                destination.once('error', failVerboseSink);
            }
        }
        output.write(`\n$ ${JSON.stringify([executable, ...args])}\n`);
        try {
            child = spawn(executable, args, {cwd, env, shell: false, windowsHide: true, stdio: ['inherit', 'pipe', 'pipe']});
            if (logError) child.kill('SIGTERM');
        } catch (error) {
            childResult = {code: 127, signal: null, error};
            output.end();
            settleIfReady();
            return;
        }
        const pauseUntilDrain = (sink, stream) => {
            if (blockedSinks.has(sink)) return;
            blockedSinks.add(sink);
            child.stdout.pause();
            child.stderr.pause();
            const onDrain = () => {
                drainHandlers.delete(sink);
                blockedSinks.delete(sink);
                if (blockedSinks.size === 0) {
                    child.stdout.resume();
                    child.stderr.resume();
                }
            };
            drainHandlers.set(sink, onDrain);
            sink.once('drain', onDrain);
        };
        const pipe = (stream, destination) => stream.on('data', chunk => {
            if (!logError && !output.write(chunk)) pauseUntilDrain(output, stream);
            tail = appendTail(tail, chunk);
            if (!warned && /\bwarning\b/i.test(chunk.toString('utf8'))) warned = true;
            if (verbose && !verboseError) {
                try {
                    if (!destination.write(chunk)) pauseUntilDrain(destination, stream);
                } catch (error) { failVerboseSink(error); }
            }
        });
        pipe(child.stdout, stdout);
        pipe(child.stderr, stderr);
        child.once('error', error => { spawnError = error; });
        const forwardSignal = signal => {
            requestedSignal = signal;
            child.kill(signal);
        };
        const handlers = ['SIGINT', 'SIGTERM'].map(signal => [signal, () => forwardSignal(signal)]);
        handlers.forEach(([signal, handler]) => process.once(signal, handler));
        child.once('close', (code, signal) => {
            handlers.forEach(([name, handler]) => process.removeListener(name, handler));
            const actualSignal = signal || requestedSignal;
            const signalCode = actualSignal ? 128 + (os.constants.signals[actualSignal] || 0) : 0;
            childResult = {code: spawnError ? 127 : (actualSignal ? signalCode : (code ?? 128)), signal: actualSignal, error: spawnError};
            if (!logError) output.end();
            settleIfReady();
        });
    });
}

function resolveNpmCli({execPath = process.execPath, env = process.env, pathValue = env.PATH || ''} = {}) {
    const candidates = [
        env.npm_execpath,
        path.resolve(path.dirname(execPath), 'node_modules/npm/bin/npm-cli.js'),
        path.resolve(path.dirname(path.dirname(execPath)), 'lib/node_modules/npm/bin/npm-cli.js'),
        path.resolve(path.dirname(path.dirname(execPath)), 'node_modules/npm/bin/npm-cli.js'),
    ].filter(Boolean);
    for (const directory of pathValue.split(path.delimiter).filter(Boolean)) {
        candidates.push(path.join(directory, 'npm'), path.join(directory, 'npm-cli.js'));
    }
    candidates.push('/usr/share/nodejs/npm/bin/npm-cli.js');
    const found = candidates.map(candidate => {
        try { return fs.realpathSync(candidate); }
        catch { return candidate; }
    }).find(candidate => fs.existsSync(candidate) && candidate.endsWith('.js'));
    return found;
}

function npmCliPath() {
    const found = resolveNpmCli();
    if (!found) throw new Error('Could not locate npm-cli.js. Run this command from the project Node installation that includes npm.');
    return found;
}

function localTool(root, name) {
    const entry = {typescript: 'tsc', eslint: 'eslint.js'}[name] || name;
    const file = path.join(root, 'node_modules', name, 'bin', entry);
    if (!fs.existsSync(file)) throw new Error(`Local ${name} is missing. Install project dependencies, then retry.`);
    return file;
}

function npmStep(script, args = []) {
    return {label: script, executable: process.execPath, args: [npmCliPath(), 'run', script, ...(args.length ? ['--', ...args] : [])]};
}

function parsePortArgs(args, fallback) {
    const rest = [...args];
    let port = fallback;
    const idx = rest.indexOf('--port');
    if (idx !== -1) {
        if (idx + 1 >= rest.length || rest.indexOf('--port', idx + 1) !== -1) throw new Error('Use exactly one `--port <number>`.');
        const raw = rest[idx + 1];
        if (!/^\d+$/.test(raw)) throw new Error(`Invalid port ${JSON.stringify(raw)}. Use an integer from 1 to 65535.`);
        port = Number(raw);
        rest.splice(idx, 2);
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid port ${JSON.stringify(port)}. Use an integer from 1 to 65535.`);
    return {port, args: rest};
}

async function assertProvenance(root) {
    const stampFile = path.join(root, STAMP_NAME);
    if (!fs.existsSync(stampFile)) throw new Error('Build provenance is missing. Run `just build` before smoke-built or preview.');
    let stamp;
    try { stamp = JSON.parse(fs.readFileSync(stampFile, 'utf8')); }
    catch { throw new Error('Build provenance is unreadable. Run `just build` before smoke-built or preview.'); }
    if (!stamp || stamp.version !== 1 || typeof stamp.revision !== 'string' || typeof stamp.dirty !== 'boolean' || !/^[a-f0-9]{64}$/.test(stamp.inputs || '') || !/^[a-f0-9]{64}$/.test(stamp.output || '')) {
        throw new Error('Build provenance is invalid. Run `just build` before smoke-built or preview.');
    }
    let inputs;
    let output;
    try { inputs = digestInputs(root); output = digestBuild(root); }
    catch (error) { throw new Error(`${error.message} Run just build before smoke-built or preview.`); }
    if (stamp.inputs !== inputs) throw new Error('Build inputs changed since the last runner build. Run `just build` before smoke-built or preview.');
    if (stamp.output !== output) throw new Error('Build output changed since the last runner build. Run `just build` before smoke-built or preview.');
    return stamp;
}

async function runPlan({root, scope, steps, env = process.env, longLived = false, onStart, provenance}) {
    const log = logPath(root);
    const started = Date.now();
    let result = {code: 0, tail: '', warned: false};
    let warned = false;
    let state;
    if (onStart) {
        try { state = await gitState(root); }
        catch { state = {revision: 'unknown', dirty: 'unknown'}; }
        onStart({log, state});
    }
    for (const step of steps) {
        const full = {...step, cwd: root, env, log, verbose: env.BEZEG_VERBOSE === '1'};
        result = await runChild(full);
        warned ||= result.warned;
        if (result.code !== 0) break;
        if (longLived) break;
    }
    const duration = ((Date.now() - started) / 1000).toFixed(1);
    if (!state) {
        try { state = await gitState(root); }
        catch { state = {revision: 'unknown', dirty: 'unknown'}; }
    }
    const status = result.code === 0 ? (longLived ? 'stopped' : 'passed') : `failed (${result.signal || result.code})`;
    const buildState = provenance ? `; reusing build from revision ${provenance.revision} (${provenance.dirty ? 'dirty' : 'clean'} at build time)` : '';
    process.stdout.write(`${scope}: ${status} in ${duration}s; revision ${state.revision}; ${state.dirty === true ? 'dirty' : state.dirty === false ? 'clean' : 'working tree unknown'}${buildState}; log ${path.relative(root, log)}${warned ? '; warnings present (see log)' : ''}\n`);
    if (result.logError) process.stderr.write(`Could not write the complete run log: ${result.logError.message}\n`);
    else if (result.verboseError) process.stderr.write(`Could not stream verbose output: ${result.verboseError.message}\n`);
    else if (result.error) process.stderr.write(`Could not start child process: ${result.error.message}\n`);
    if (result.code !== 0 && result.tail) process.stderr.write(`\nRecent output:\n${result.tail}\n`);
    return result.code;
}

async function execute(command, rawArgs = [], options = {}) {
    const root = options.root || ROOT;
    const args = [...rawArgs];
    const run = (scope, steps, env = process.env, longLived = false, onStart, provenance) => runPlan({root, scope, steps, env, longLived, onStart, provenance});
    const nodeStep = (label, file, argv = [], env = process.env) => ({label, executable: process.execPath, args: [file, ...argv], env});
    const tsc = () => nodeStep('typecheck', localTool(root, 'typescript'), ['--noEmit', '--pretty', 'false']);
    const lint = argv => nodeStep('lint', localTool(root, 'eslint'), argv.length ? argv : ['.']);
    const build = () => npmStep('build');
    const unit = argv => ({label: 'test', executable: process.execPath, args: [npmCliPath(), 'test', '--', '--run', ...argv]});
    const smokeBuilt = argv => npmStep('test:smoke:built', argv);
    if (command === 'tooling-test') return run('tooling-test', [{label: 'tooling-test', executable: process.execPath, args: ['--test', path.join(root, 'scripts/commands.test.cjs')]}]);
    if (command === 'unit') return run('unit', [unit(args)]);
    if (command === 'typecheck') return run('typecheck', [tsc()]);
    if (command === 'lint') return run('lint', [lint(args)]);
    if (command === 'loc') {
        if (args.length !== 1) throw new Error('Usage: just loc <pattern> (a case-insensitive regex matched against keys and both translations).');
        process.stdout.write(`${lookupLocalization(root, args[0])}\n`);
        return 0;
    }
    if (command === 'ci') {
        if (args.length > 1 || (args[0] && !/^[0-9a-f]{7,40}$/i.test(args[0]))) throw new Error('Usage: just ci [commit-sha]');
        let sha;
        // gh matches only full commit SHAs.
        if (args[0]) {
            try { sha = await gitOutput(root, ['rev-parse', '--verify', '--quiet', `${args[0]}^{commit}`]); }
            catch { throw new Error(`Commit ${args[0]} is not in this checkout. Run \`git fetch origin\` or pass a full SHA.`); }
        }
        process.stdout.write(`${await ciSummary(root, sha)}\n`);
        return 0;
    }
    const buildWithProvenance = async scope => {
        const before = digestInputs(root);
        fs.rmSync(path.join(root, STAMP_NAME), {force: true});
        const code = await run(scope, [build()]);
        if (code !== 0) return code;
        const after = digestInputs(root);
        if (before !== after) {
            process.stderr.write('Build inputs changed while building; provenance was not recorded. Run `just build` again.\n');
            return 1;
        }
        const output = digestBuild(root);
        const state = await gitState(root);
        fs.writeFileSync(path.join(root, STAMP_NAME), `${JSON.stringify({version: 1, revision: state.revision, dirty: state.dirty, inputs: after, output}, null, 2)}\n`);
        return 0;
    };
    if (command === 'build') return buildWithProvenance('build');
    if (command === 'check') {
        const code = await run('check', [tsc(), lint([]), unit([])]);
        return code === 0 ? buildWithProvenance('check build') : code;
    }
    if (command === 'check-localization') {
        const code = await run('check-localization', [tsc()]);
        return code === 0 ? buildWithProvenance('check-localization build') : code;
    }
    if (command === 'smoke' || command === 'smoke-built') {
        const parsed = parsePortArgs(args, Number(process.env.SMOKE_PORT || 4173));
        let provenance;
        if (command === 'smoke-built') provenance = await assertProvenance(root);
        const env = {...process.env, SMOKE_PORT: String(parsed.port)};
        if (command === 'smoke') {
            const code = await buildWithProvenance('smoke build');
            if (code !== 0) return code;
            provenance = await assertProvenance(root);
            return run('smoke', [smokeBuilt(parsed.args)], env, false, undefined, provenance);
        }
        return run('smoke-built', [smokeBuilt(parsed.args)], env, false, undefined, provenance);
    }
    if (command === 'smoke-lesson') {
        const parsed = parsePortArgs(args, Number(process.env.SMOKE_PORT || 4173));
        const firstOption = parsed.args.findIndex(arg => arg.startsWith('-'));
        const ids = firstOption === -1 ? parsed.args : parsed.args.slice(0, firstOption);
        const rest = firstOption === -1 ? [] : parsed.args.slice(firstOption);
        const grep = lessonGrep(root, ids);
        const provenance = await assertProvenance(root);
        return run('smoke-lesson', [smokeBuilt([LESSON_SPEC, '--grep', grep, ...rest])], {...process.env, SMOKE_PORT: String(parsed.port)}, false, undefined, provenance);
    }
    if (command === 'preview') {
        if (args.length > 1) throw new Error('Usage: just preview [port]');
        const parsed = parsePortArgs(args[0] ? ['--port', args[0]] : [], Number(process.env.SMOKE_PORT || 4173));
        const provenance = await assertProvenance(root);
        const previewUrl = `http://127.0.0.1:${parsed.port}/bezeg-2.0`;
        return run('preview', [{label: 'preview', executable: process.execPath, args: [path.join(root, 'scripts/serve-smoke-build.cjs')]}], {...process.env, SMOKE_PORT: String(parsed.port)}, true, ({log, state}) => {
            const dirty = state.dirty === true ? 'dirty' : state.dirty === false ? 'clean' : 'working tree unknown';
            process.stdout.write(`Starting production preview from ${root} at ${previewUrl}; checkout revision ${state.revision} (${dirty}); build revision ${provenance.revision} (${provenance.dirty ? 'dirty' : 'clean'} at build time); log ${path.relative(root, log)}\n`);
        }, provenance);
    }
    throw new Error(`Unknown command ${JSON.stringify(command)}. Use just to list available commands.`);
}

async function main(argv = process.argv.slice(2)) {
    const [command, ...args] = argv;
    if (!command) throw new Error('Missing command. Use just to list available commands.');
    return execute(command, args);
}

function cli(argv) {
    let stdioError = false;
    const handleStdioError = () => { stdioError = true; process.exitCode = 1; };
    process.stdout.on('error', handleStdioError);
    process.stderr.on('error', handleStdioError);
    main(argv).then(code => { process.exitCode = stdioError ? 1 : code; }).catch(error => {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    });
}

if (require.main === module) {
    cli(process.argv.slice(2));
}

module.exports = {appendTail, assertProvenance, ciSummary, cli, digestBuild, digestInputs, execute, hashFiles, inputFiles, lessonGrep, lookupLocalization, main, parsePortArgs, resolveNpmCli, runChild, runPlan};
