'use strict';

// Machine-wide test slots: heavy runner commands from every checkout and worktree on this computer share a few slots, so
// concurrent agents queue instead of oversubscribing CPU and memory. The budget is derived from the current machine;
// set BEZEG_TEST_SLOTS and/or BEZEG_TEST_WORKERS (per slot) as user environment variables to override it per machine.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const RESERVED_THREADS = 2; // left for the desktop, IDE and browser
// Desktop, IDE, browser or a game (6 GB), plus the agent sessions that launch the runs: measured 2026-10-31, ten
// Claude Code sessions held 3.2 GB. With the old 6 GB reserve a 16 GB machine got two slots, filled its memory and
// paged until single tests took minutes and timed out.
const RESERVED_MEMORY_GB = 9;
const MEMORY_PER_WORKER_GB = 1.5; // measured 2026-10-31: Vitest jsdom workers peak at 0.8-1.7 GB in the full suite
const MIN_WORKERS_PER_SLOT = 3; // below this a run gets too little parallelism to be worth sharing the machine
const MAX_SLOTS = 3; // matches the three-worker concurrency cap in docs/agent-workflow.md
const FILTERED_UNIT_WORKERS = 2; // a path-filtered unit run skips the queue, so it must stay small next to a slot holder
const STALE_MS = 2 * 60 * 60 * 1000; // longer than any check or smoke run
// Slots cap test runners, but typecheck, lint and filtered unit runs from several agents start beside them. When
// available memory runs out, Windows signals critical pressure and Claude Code stops the background commands of idle
// sessions (seen 2026-11-01 several times an hour). So every heavy command also waits until it leaves this much free.
const MEMORY_FLOOR_GB = 2;
const COMMAND_MEMORY_GB = {typecheck: 1.5, lint: 1, build: 1.5, 'check-localization': 1.5, smoke: 1.5, 'smoke-built': 1.5, 'smoke-lesson': 1.5};
// What the gate expects one Vitest worker to reach. Measured 2026-11-01 with the board hook in src/setupTests.ts: a
// file's peak is 0.3 GB at the median and 1.2 GB at most (2.3 GB before the hook).
const GATE_GB_PER_WORKER = 1;
const RAMP_MS = 60_000; // a run reaches most of its memory within a minute, so starts are spaced to read it
const MAX_MEMORY_WAIT_MS = 20 * 60 * 1000; // then start anyway, warned: a busy desktop must not block work forever
const GB = 1024 ** 3;

function positiveInt(raw, name) {
    if (raw === undefined || raw === '') return undefined;
    if (!/^\d+$/.test(raw) || Number(raw) < 1) throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}.`);
    return Number(raw);
}

function machineBudget({threads = os.availableParallelism(), memoryBytes = os.totalmem(), env = process.env} = {}) {
    const memoryGB = memoryBytes / 1024 ** 3;
    const total = Math.max(1, Math.min(threads - RESERVED_THREADS, Math.floor((memoryGB - RESERVED_MEMORY_GB) / MEMORY_PER_WORKER_GB)));
    const slots = positiveInt(env.BEZEG_TEST_SLOTS, 'BEZEG_TEST_SLOTS') ?? Math.min(MAX_SLOTS, Math.max(1, Math.floor(total / MIN_WORKERS_PER_SLOT)));
    const workers = positiveInt(env.BEZEG_TEST_WORKERS, 'BEZEG_TEST_WORKERS') ?? Math.max(1, Math.floor(total / slots));
    return {slots, workers};
}

function alive(pid) {
    try { process.kill(pid, 0); return true; }
    catch (error) { return error.code === 'EPERM'; }
}

function readHolder(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return undefined; }
}

function stale(holder, now) {
    return !holder || !Number.isInteger(holder.pid) || !alive(holder.pid) || now - holder.started > STALE_MS;
}

function tryAcquire(dir, slots, owner, now = Date.now()) {
    fs.mkdirSync(dir, {recursive: true});
    const holders = [];
    for (let index = 1; index <= slots; index += 1) {
        const file = path.join(dir, `slot-${index}.json`);
        // The second attempt retakes a slot whose stale file was just removed.
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                fs.writeFileSync(file, JSON.stringify({...owner, started: now}), {flag: 'wx'});
                return {index, file};
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
            }
            const holder = readHolder(file);
            // An unreadable file is usually still being written; only a crash mid-write leaves one behind for long.
            let abandoned = false;
            if (!holder) {
                try { abandoned = now - fs.statSync(file).mtimeMs > 10_000; }
                catch { /* removed meanwhile */ }
            }
            if (!abandoned && !(holder && stale(holder, now))) {
                if (holder) holders.push(holder);
                break;
            }
            fs.rmSync(file, {force: true});
        }
    }
    return {holders};
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function samePath(a, b) {
    const [left, right] = [path.resolve(a), path.resolve(b)];
    return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

// A live holder running the same command in the same checkout. Its result will answer the duplicate; starting it
// again only doubles the load (seen 2026-10-31: a handler started two full unit runs in one worktree three minutes
// apart, and both crawled for over 15 minutes).
function duplicateHolder(dir, owner, now = Date.now()) {
    let names;
    try { names = fs.readdirSync(dir).filter(name => /^slot-\d+\.json$/.test(name)); }
    catch { return undefined; }
    return names.map(name => readHolder(path.join(dir, name))).find(holder => holder && !stale(holder, now)
        && holder.pid !== owner.pid && holder.command === owner.command && holder.root && owner.root && samePath(holder.root, owner.root));
}

/**
 * Waits for a free slot and returns {index, slots, workers, release}. The slot is released by `release()` or, if the
 * process dies first, by the next waiter's stale-holder check. Throws when the same command already holds a slot in
 * the same checkout.
 */
function slotDir(env = process.env) {
    return env.BEZEG_TEST_SLOT_DIR || path.join(os.tmpdir(), 'bezeg-test-slots');
}

async function acquireSlot({command, root, env = process.env, dir = slotDir(env), pollMs = 2000, stderr = process.stderr} = {}) {
    const {slots, workers} = machineBudget({env});
    const owner = {pid: process.pid, command, root};
    let waitingSince;
    for (;;) {
        const duplicate = duplicateHolder(dir, owner);
        if (duplicate) {
            const started = new Date(duplicate.started).toTimeString().slice(0, 5);
            throw new Error(`\`${command}\` is already running in this checkout (pid ${duplicate.pid}, started ${started}). Wait for it to finish and read its result in .command-logs/ (the log name contains pid ${duplicate.pid}) instead of starting it again.`);
        }
        const result = tryAcquire(dir, slots, owner);
        if (result.file) {
            if (waitingSince) stderr.write(`Got test slot ${result.index}/${slots} after ${((Date.now() - waitingSince) / 1000).toFixed(0)}s.\n`);
            const onExit = () => fs.rmSync(result.file, {force: true});
            process.once('exit', onExit);
            const release = () => { process.removeListener('exit', onExit); onExit(); };
            return {index: result.index, slots, workers, release};
        }
        if (!waitingSince) {
            waitingSince = Date.now();
            const busy = result.holders.map(holder => `${holder.command} in ${path.basename(holder.root || '?')} (pid ${holder.pid})`).join('; ');
            stderr.write(`Waiting for a test slot; all ${slots} busy: ${busy}.\n`);
        }
        await sleep(pollMs);
    }
}

function memoryFloorGB(env = process.env) {
    const raw = env.BEZEG_MEMORY_FLOOR_GB;
    if (raw === undefined || raw === '') return MEMORY_FLOOR_GB;
    if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`BEZEG_MEMORY_FLOOR_GB must be a non-negative number, got ${JSON.stringify(raw)}.`);
    return Number(raw);
}

// Memory a command needs before it may start; unit runs and checks need one worker and then fit their workers.
function commandMemoryGB(command) {
    return COMMAND_MEMORY_GB[command] ?? GATE_GB_PER_WORKER;
}

// Workers that fit the memory available at admission, never more than the slot allows.
function fitWorkers(workers, freeGB, env = process.env) {
    const floor = memoryFloorGB(env);
    if (floor === 0) return workers;
    return Math.max(1, Math.min(workers, Math.floor((freeGB - floor) / GATE_GB_PER_WORKER)));
}

/**
 * Waits until starting `command` keeps available memory above the floor, and spaces starts machine-wide: an admitted
 * run marks the gate for RAMP_MS, so the next reading includes the memory that run grows into. Returns {freeGB}.
 * BEZEG_MEMORY_FLOOR_GB=0 turns the gate off.
 */
async function admitByMemory({command, env = process.env, dir = slotDir(env), freeBytes = os.freemem, now = Date.now, pollMs = 5000, maxWaitMs = MAX_MEMORY_WAIT_MS, stderr = process.stderr} = {}) {
    const floor = memoryFloorGB(env);
    if (floor === 0) return {freeGB: freeBytes() / GB};
    const needGB = commandMemoryGB(command);
    const marker = path.join(dir, 'memory-ramp.json');
    fs.mkdirSync(dir, {recursive: true});
    const since = now();
    let reported = '';
    for (;;) {
        const time = now();
        const ramping = readHolder(marker);
        const busy = ramping && Number.isInteger(ramping.pid) && ramping.pid !== process.pid && alive(ramping.pid) && time - ramping.started < RAMP_MS;
        const freeGB = freeBytes() / GB;
        const fits = freeGB - needGB >= floor;
        const timedOut = time - since >= maxWaitMs;
        if (!busy && (fits || timedOut)) {
            fs.writeFileSync(marker, JSON.stringify({pid: process.pid, command, started: time}));
            // Two waiters can pass at once; the one whose mark was overwritten waits for the other's ramp.
            if (readHolder(marker)?.pid === process.pid) {
                if (!fits) stderr.write(`Starting ${command} after ${Math.round((time - since) / 60000)} min without enough memory: ${freeGB.toFixed(1)} GB available.\n`);
                else if (reported) stderr.write(`Memory available for ${command} after ${((time - since) / 1000).toFixed(0)}s.\n`);
                return {freeGB};
            }
            continue;
        }
        // Report each reason once; the free-memory figure changes on every poll and would repeat the line.
        const reason = busy ? `ramp ${ramping.pid}` : 'memory';
        if (reason !== reported) {
            stderr.write(busy
                ? `Waiting for ${ramping.command} (pid ${ramping.pid}) to finish starting before reading free memory.\n`
                : `Waiting for memory: ${command} needs about ${needGB} GB above the ${floor} GB floor; ${freeGB.toFixed(1)} GB available.\n`);
            reported = reason;
        }
        await sleep(pollMs);
    }
}

// Lower priority is inherited by children spawned afterwards, so test workers never starve the desktop or a game.
// BEZEG_TEST_PRIORITY=idle runs them only on otherwise idle CPU; =normal keeps normal priority.
function lowerPriority(env = process.env) {
    const {PRIORITY_BELOW_NORMAL, PRIORITY_LOW} = os.constants.priority;
    const level = {'below-normal': PRIORITY_BELOW_NORMAL, idle: PRIORITY_LOW, normal: undefined}[env.BEZEG_TEST_PRIORITY || 'below-normal'];
    if (level === undefined) return;
    try { os.setPriority(level); }
    catch { /* not permitted on this platform: run at normal priority */ }
}

module.exports = {FILTERED_UNIT_WORKERS, acquireSlot, admitByMemory, fitWorkers, lowerPriority, machineBudget, memoryFloorGB, tryAcquire};
