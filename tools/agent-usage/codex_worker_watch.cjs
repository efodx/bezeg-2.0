#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_BUDGET = 150_000;
const DEFAULT_MARGIN = 15_000;
const EXIT = Object.freeze({
  below_threshold: 0,
  handoff_required: 0,
  completed: 10,
  unavailable: 11,
  idle: 12,
  error: 1,
});

function usage() {
  return `Usage: node codex_worker_watch.cjs (--agent-path <canonical-path> | --self) [options]

Watch one Codex child rollout or the calling session and emit one JSON status event.
The worker parent defaults to CODEX_THREAD_ID. --self watches the exact session
metadata ID from CODEX_THREAD_ID (or --thread-id for fixtures). --once prints a
bounded self snapshot. Long-running self watches ignore idle timeouts while the
handler waits on workers, and stop on completion, handoff, telemetry timeout,
or error. This is cooperative signaling, not a hard token cap.

Options:
  --parent-thread-id <id>  Exact parent thread ID (default: CODEX_THREAD_ID)
  --agent-path <path>      Exact canonical child agent path (required)
  --sessions-root <path>   Sessions directory (default: CODEX_HOME/sessions or ~/.codex/sessions)
  --budget <tokens>        Budget before margin (default: 150000)
  --margin <tokens>        Signal margin (default: 15000)
  --until <tokens>         Explicit positive input-token threshold; overrides budget/margin
  --interval <seconds>    Poll interval (default: 1)
  --timeout <seconds>     Missing/no-usage telemetry timeout (default: 60)
  --idle-timeout <seconds> Stop after no rollout growth (default: 300)
  --self                   Watch the calling session instead of a child
  --thread-id <id>         Explicit session ID, available only with --self
  --once                   Return one bounded self status snapshot
  --help                   Show this help

Exit codes: 0 handoff_required, 10 completed/aborted, 11 unavailable,
12 idle, 1 runtime error, 2 invalid arguments. Self snapshots return 0 for
below_threshold or handoff_required, 11 when telemetry is unavailable, and 1
for errors. A long-running self watch exits 10 when its turn completes.`;
}

function positiveNumber(raw, flag, { integer = false } = {}) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    throw new Error(`${flag} must be a positive ${integer ? 'integer' : 'number'}`);
  }
  return value;
}

function parseArgs(argv, env = process.env, home = os.homedir()) {
  const opts = { interval: 1, timeout: 60, idleTimeout: 300, budget: DEFAULT_BUDGET, margin: DEFAULT_MARGIN };
  const valueFlags = new Map([
    ['--parent-thread-id', 'parentThreadId'], ['--agent-path', 'agentPath'],
    ['--sessions-root', 'sessionsRoot'], ['--budget', 'budget'], ['--margin', 'margin'],
    ['--until', 'until'], ['--interval', 'interval'], ['--timeout', 'timeout'],
    ['--idle-timeout', 'idleTimeout'], ['--thread-id', 'threadId'],
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--help' || flag === '-h') return { help: true };
    if (flag === '--self') { opts.self = true; continue; }
    if (flag === '--once') { opts.once = true; continue; }
    const key = valueFlags.get(flag);
    if (!key) throw new Error(`unknown option: ${flag}`);
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
    const value = argv[++i];
    if (['budget', 'margin'].includes(key)) opts[key] = positiveNumber(value, flag, { integer: true });
    else if (['until'].includes(key)) opts[key] = positiveNumber(value, flag, { integer: true });
    else if (['interval', 'timeout', 'idleTimeout'].includes(key)) opts[key] = positiveNumber(value, flag);
    else opts[key] = value;
  }
  if (opts.self) {
    if (opts.parentThreadId || opts.agentPath) throw new Error('--self conflicts with worker selectors --parent-thread-id and --agent-path');
    opts.threadId ||= env.CODEX_THREAD_ID;
    if (!opts.threadId) throw new Error('--self requires CODEX_THREAD_ID or --thread-id');
    if (opts.once) opts.timeout = 0;
  } else {
    if (opts.threadId) throw new Error('--thread-id is only available with --self');
    if (opts.once) throw new Error('--once is only available with --self');
    opts.parentThreadId ||= env.CODEX_THREAD_ID;
    if (!opts.parentThreadId) throw new Error('--parent-thread-id or CODEX_THREAD_ID is required');
    if (!opts.agentPath) throw new Error('--agent-path is required');
  }
  if (!opts.self && (!/^\/(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/{2})[^\s]+$/.test(opts.agentPath) ||
      opts.agentPath.includes('\\') || opts.agentPath.endsWith('/'))) {
    throw new Error('--agent-path must be a canonical absolute slash path');
  }
  const codexHome = env.CODEX_HOME || path.join(home, '.codex');
  opts.sessionsRoot = path.resolve(opts.sessionsRoot || path.join(codexHome, 'sessions'));
  opts.threshold = opts.until ?? (opts.self ? 150_000 : opts.budget - opts.margin);
  if (opts.threshold <= 0) throw new Error('budget minus margin must be positive');
  return opts;
}

function firstLineMetadata(filePath, fileSystem) {
  const fd = fileSystem.openSync(filePath, 'r');
  try {
    const chunk = Buffer.alloc(1024 * 1024);
    const bytes = fileSystem.readSync(fd, chunk, 0, chunk.length, 0);
    const content = chunk.subarray(0, bytes).toString('utf8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      let event;
      try { event = JSON.parse(line); } catch { continue; }
      if (event.type === 'session_meta' || event.type === 'session_metadata') return event.payload || {};
    }
    return null;
  } finally {
    fileSystem.closeSync(fd);
  }
}

function metadataMatches(meta, parentThreadId, agentPath) {
  const parent = meta.parent_thread_id ?? meta.parentThreadId ?? meta.parent_id ?? meta.parentId;
  const agent = meta.agent_path ?? meta.agentPath;
  if (parent !== parentThreadId || typeof agent !== 'string') return false;
  return agent === agentPath;
}

function metadataSessionId(meta) {
  // `id` is the rollout's own session identity. Older metadata may omit it;
  // only then fall back to session_id (or its camel-case spelling). In some
  // nested agent sessions, session_id names a parent while id names the agent.
  if (typeof meta.id === 'string' && meta.id.length > 0) return { kind: 'found', id: meta.id };
  for (const key of ['session_id', 'sessionId']) {
    if (typeof meta[key] === 'string' && meta[key].length > 0) return { kind: 'found', id: meta[key] };
  }
  return { kind: 'missing' };
}

function discoverSelfRollout(sessionsRoot, threadId, fileSystem = fs) {
  const candidates = [];
  function walk(directory) {
    const entries = fileSystem.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && /^rollout-.*\.jsonl$/i.test(entry.name)) candidates.push(fullPath);
    }
  }
  try { walk(sessionsRoot); }
  catch (error) {
    if (error.code === 'ENOENT') return { kind: 'missing', detail: `sessions root not found: ${sessionsRoot}` };
    return { kind: 'error', detail: `cannot scan sessions root: ${error.message}` };
  }
  const matches = [];
  for (const candidate of candidates) {
    try {
      const meta = firstLineMetadata(candidate, fileSystem);
      if (!meta) continue;
      const identity = metadataSessionId(meta);
      if (identity.id === threadId) matches.push(candidate);
    } catch (error) { return { kind: 'error', detail: `cannot read rollout metadata ${candidate}: ${error.message}` }; }
  }
  if (!matches.length) return { kind: 'missing', detail: 'no rollout matched the exact session metadata ID' };
  if (matches.length > 1) return { kind: 'ambiguous', detail: `multiple rollouts matched the exact session ID (${matches.length})` };
  return { kind: 'found', path: matches[0] };
}

function discoverRollout(sessionsRoot, parentThreadId, agentPath, fileSystem = fs) {
  const candidates = [];
  function walk(directory) {
    const entries = fileSystem.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && /^rollout-.*\.jsonl$/i.test(entry.name)) candidates.push(fullPath);
    }
  }
  try { walk(sessionsRoot); }
  catch (error) {
    if (error.code === 'ENOENT') return { kind: 'missing', detail: `sessions root not found: ${sessionsRoot}` };
    return { kind: 'error', detail: `cannot scan sessions root: ${error.message}` };
  }
  const matches = [];
  for (const candidate of candidates) {
    try {
      const meta = firstLineMetadata(candidate, fileSystem);
      if (meta && metadataMatches(meta, parentThreadId, agentPath)) matches.push(candidate);
    } catch (error) {
      return { kind: 'error', detail: `cannot read rollout metadata ${candidate}: ${error.message}` };
    }
  }
  if (!matches.length) return { kind: 'missing', detail: 'no rollout matched the exact parent thread ID and agent path' };
  if (matches.length > 1) return { kind: 'ambiguous', detail: `multiple rollouts matched (${matches.length})` };
  return { kind: 'found', path: matches[0] };
}

function terminalKind(event) {
  if (event?.type === 'turn_aborted') return 'aborted';
  if (event?.type !== 'event_msg') return null;
  const type = event.payload?.type;
  if (['task_complete', 'turn_complete', 'turn_aborted', 'turn_failed', 'turn_cancelled'].includes(type)) {
    return type.includes('abort') || type.includes('fail') || type.includes('cancel') ? 'aborted' : 'completed';
  }
  return null;
}

function isTurnStart(event) {
  return event?.type === 'turn_context' ||
    (event?.type === 'event_msg' && ['task_started', 'turn_started'].includes(event.payload?.type));
}

function turnIdentity(event) {
  const payload = event?.payload || {};
  for (const key of ['task_id', 'turn_id']) {
    if (typeof payload[key] === 'string' && payload[key]) return { key, value: payload[key] };
  }
  return null;
}

function resetTurnState(state) {
  state.hasUsage = false;
  state.lastInputTokens = null;
  state.crossed = false;
  state.crossedInputTokens = null;
  state.terminal = null;
  state.turnIdentity = null;
}

function usageInput(event) {
  if (event?.type !== 'event_msg' || event.payload?.type !== 'token_count') return null;
  const value = event.payload?.info?.last_token_usage?.input_tokens;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function processLine(line, state) {
  let event;
  try { event = JSON.parse(line); } catch { return; }
  const markerIdentity = turnIdentity(event);
  if (isTurnStart(event)) {
    const sameIdentityKindChanged = markerIdentity && state.turnIdentity &&
      markerIdentity.key === state.turnIdentity.key && markerIdentity.value !== state.turnIdentity.value;
    if (state.terminal || sameIdentityKindChanged) resetTurnState(state);
    if (markerIdentity && !state.turnIdentity) state.turnIdentity = markerIdentity;
  }
  const tokens = usageInput(event);
  if (tokens !== null) {
    state.hasUsage = true;
    state.lastInputTokens = tokens;
    if (tokens >= state.threshold && !state.crossed) {
      state.crossed = true;
      state.crossedInputTokens = tokens;
    }
  }
  const terminal = terminalKind(event);
  const terminalIdentity = turnIdentity(event);
  const mismatchedTerminal = terminalIdentity && state.turnIdentity &&
    terminalIdentity.key === state.turnIdentity.key && terminalIdentity.value !== state.turnIdentity.value;
  if (terminal && !mismatchedTerminal) state.terminal = terminal;
}

function readNewBytes(filePath, offset, fileSystem = fs) {
  const fd = fileSystem.openSync(filePath, 'r');
  try {
    const stat = fileSystem.fstatSync(fd);
    if (stat.size < offset) throw new Error('selected rollout was truncated while being watched');
    const size = stat.size - offset;
    if (size === 0) return { bytes: Buffer.alloc(0), offset };
    const bytes = Buffer.alloc(size);
    const count = fileSystem.readSync(fd, bytes, 0, size, offset);
    return { bytes: bytes.subarray(0, count), offset: offset + count };
  } finally { fileSystem.closeSync(fd); }
}

function makeResult(status, opts, identity, rolloutPath, state, reason) {
  return {
    event: status,
    ...(opts.self ? { self_thread_id: identity.threadId } : {
      parent_thread_id: identity.parentThreadId,
      agent_path: identity.agentPath,
    }),
    observed_input_tokens: state.lastInputTokens ?? state.fallbackInputTokens ?? null,
    ...(state.lastInputTokens == null && state.fallbackInputTokens != null ? { usage_source: 'previous_turn' } : {}),
    threshold_input_tokens: state.crossedInputTokens ?? null,
    threshold: opts.threshold,
    rollout_path: rolloutPath || null,
    ...(reason ? { reason } : {}),
  };
}

async function runWatcher(opts, deps = {}) {
  const fileSystem = deps.fs || fs;
  const now = deps.now || Date.now;
  const sleep = deps.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const identity = opts.self ? { threadId: opts.threadId } : { parentThreadId: opts.parentThreadId, agentPath: opts.agentPath };
  const start = now();
  if (opts.self && opts.once) return selfSnapshot(opts, identity, fileSystem);
  let selected = null;
  while (!selected) {
    const found = opts.self
      ? discoverSelfRollout(opts.sessionsRoot, identity.threadId, fileSystem)
      : discoverRollout(opts.sessionsRoot, identity.parentThreadId, identity.agentPath, fileSystem);
    if (found.kind === 'error' || found.kind === 'ambiguous') {
      return makeResult('error', opts, identity, null, {}, found.detail);
    }
    if (found.kind === 'found') selected = found.path;
    else if (now() - start >= opts.timeout * 1000) {
      return makeResult('unavailable', opts, identity, null, {}, found.detail);
    }
    if (!selected) await sleep(opts.interval * 1000);
  }

  const state = { threshold: opts.threshold, hasUsage: false, lastInputTokens: null, crossed: false, crossedInputTokens: null, terminal: null };
  let offset = 0;
  let pending = Buffer.alloc(0);
  let lastGrowthAt = now();
  const usageDeadline = start + opts.timeout * 1000;
  // A rollout can contain several turns. At attachment, start with the latest
  // turn boundary so a prior completion or token crossing cannot leak forward.
  try {
    const initial = readNewBytes(selected, 0, fileSystem);
    offset = initial.offset;
    const lines = initial.bytes.toString('utf8').split('\n');
    pending = Buffer.from(lines.pop() || '', 'utf8');
    const completeLines = lines;
    let latestTaskStart = -1;
    let latestContext = -1;
    let latestTerminal = -1;
    for (let i = 0; i < completeLines.length; i += 1) {
      try {
        const event = JSON.parse(completeLines[i]);
        if (event?.type === 'event_msg' && event.payload?.type === 'task_started') latestTaskStart = i;
        else if (event?.type === 'turn_context') latestContext = i;
        if (terminalKind(event)) latestTerminal = i;
      } catch { /* skip malformed records */ }
    }
    const activeTaskStart = latestTaskStart > latestTerminal ? latestTaskStart : -1;
    const activeContext = latestContext > latestTerminal ? latestContext : -1;
    const startAt = Math.max(activeTaskStart, activeContext) >= 0
      ? (activeTaskStart >= 0 ? activeTaskStart : activeContext)
      : Math.max(latestTaskStart, latestContext, 0);
    for (const line of completeLines.slice(startAt)) processLine(line, state);
  } catch (error) {
    return makeResult('error', opts, identity, selected, state, `cannot read selected rollout: ${error.message}`);
  }
  if (state.terminal) return makeResult('completed', opts, identity, selected, state, state.terminal);
  if (state.crossed) return makeResult('handoff_required', opts, identity, selected, state);
  while (true) {
    let chunk;
    try {
      const read = readNewBytes(selected, offset, fileSystem);
      chunk = read.bytes;
      offset = read.offset;
    } catch (error) {
      return makeResult('error', opts, identity, selected, state, `cannot read selected rollout: ${error.message}`);
    }
    if (chunk.length) {
      pending = Buffer.concat([pending, chunk]);
      lastGrowthAt = now();
      let newline;
      while ((newline = pending.indexOf(0x0a)) !== -1) {
        processLine(pending.subarray(0, newline).toString('utf8'), state);
        pending = pending.subarray(newline + 1);
      }
    }
    if (state.terminal) return makeResult('completed', opts, identity, selected, state, state.terminal);
    if (state.crossed) return makeResult('handoff_required', opts, identity, selected, state);
    const current = now();
    if (!state.hasUsage && current >= usageDeadline) {
      return makeResult('unavailable', opts, identity, selected, state, 'no valid request input usage telemetry before timeout');
    }
    if (!opts.self && state.hasUsage && current - lastGrowthAt >= opts.idleTimeout * 1000) {
      return makeResult('idle', opts, identity, selected, state, 'rollout did not grow before idle timeout');
    }
    await sleep(opts.interval * 1000);
  }
}

function selfSnapshot(opts, identity, fileSystem = fs) {
  const found = discoverSelfRollout(opts.sessionsRoot, identity.threadId, fileSystem);
  if (found.kind !== 'found') {
    const status = found.kind === 'missing' ? 'unavailable' : 'error';
    return makeResult(status, opts, identity, null, {}, found.detail);
  }
  const state = { threshold: opts.threshold, hasUsage: false, lastInputTokens: null, crossed: false, crossedInputTokens: null, terminal: null };
  try {
    const content = fileSystem.readFileSync(found.path);
    const lines = content.toString('utf8').split('\n');
    if (lines.at(-1) === '') lines.pop();
    let latestTaskStart = -1;
    let latestContext = -1;
    let latestTerminal = -1;
    for (let i = 0; i < lines.length; i += 1) {
      try {
        const event = JSON.parse(lines[i]);
        if (event?.type === 'event_msg' && event.payload?.type === 'task_started') latestTaskStart = i;
        else if (event?.type === 'turn_context') latestContext = i;
        if (terminalKind(event)) latestTerminal = i;
      } catch { /* skip malformed records */ }
    }
    const activeTaskStart = latestTaskStart > latestTerminal ? latestTaskStart : -1;
    const activeContext = latestContext > latestTerminal ? latestContext : -1;
    const startAt = Math.max(activeTaskStart, activeContext) >= 0
      ? (activeTaskStart >= 0 ? activeTaskStart : activeContext)
      : Math.max(latestTaskStart, latestContext, 0);
    for (const line of lines.slice(0, startAt)) {
      let event;
      try { event = JSON.parse(line); } catch { continue; }
      const tokens = usageInput(event);
      if (tokens !== null) state.fallbackInputTokens = tokens;
    }
    for (const line of lines.slice(startAt)) processLine(line, state);
  } catch (error) {
    return makeResult('error', opts, identity, found.path, state, `cannot read selected rollout: ${error.message}`);
  }
  if (!state.hasUsage && state.fallbackInputTokens == null) {
    return makeResult('unavailable', opts, identity, found.path, state, 'no valid request input usage telemetry in latest turn or previous turn');
  }
  if (!state.hasUsage && state.fallbackInputTokens >= opts.threshold) {
    state.crossed = true;
    state.crossedInputTokens = state.fallbackInputTokens;
  }
  return makeResult(state.crossed ? 'handoff_required' : 'below_threshold', opts, identity, found.path, state);
}

async function main(argv = process.argv.slice(2), io = process) {
  let opts;
  try { opts = parseArgs(argv); }
  catch (error) {
    io.stderr.write(`${error.message}\n${usage()}\n`);
    return 2;
  }
  if (opts.help) { io.stdout.write(`${usage()}\n`); return 0; }
  const result = await runWatcher(opts);
  io.stdout.write(`${JSON.stringify(result)}\n`);
  return EXIT[result.event];
}

if (require.main === module) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stdout.write(`${JSON.stringify({ event: 'error', reason: error.message })}\n`);
    process.exitCode = EXIT.error;
  });
}

module.exports = {
  DEFAULT_BUDGET, DEFAULT_MARGIN, EXIT, discoverRollout, isTurnStart, main, metadataMatches,
  discoverSelfRollout, metadataSessionId, parseArgs, processLine, runWatcher, selfSnapshot, terminalKind, usage, usageInput,
};
