'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { discoverRollout, parseArgs, processLine, runWatcher, usageInput } = require('./codex_worker_watch.cjs');

const script = path.join(__dirname, 'codex_worker_watch.cjs');

function tempRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-watch-')); }
function event(type, payload) { return JSON.stringify({ type, payload }); }
function metadata(parent = 'parent-1', agent = '/tmp/agents/a') {
  return event('session_meta', { parent_thread_id: parent, agent_path: agent });
}
function usage(tokens, total = 999999) {
  return event('event_msg', { type: 'token_count', info: {
    last_token_usage: tokens == null ? null : { input_tokens: tokens }, total_token_usage: { input_tokens: total },
  } });
}
function rollout(root, name = 'rollout-one.jsonl', body = '') {
  const filePath = path.join(root, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${metadata()}\n${body}`);
  return filePath;
}
function options(root, extras = {}) {
  return { parentThreadId: 'parent-1', agentPath: '/tmp/agents/a', sessionsRoot: root,
    threshold: 50, interval: 0.01, timeout: 0.3, idleTimeout: 0.08, ...extras };
}

test('discovery requires exact parent and canonical agent path and rejects ambiguous matches', () => {
  const root = tempRoot();
  rollout(root, 'rollout-parent.jsonl', '');
  const mismatchParent = path.join(root, 'rollout-wrong-parent.jsonl');
  fs.writeFileSync(mismatchParent, `${metadata('other-parent')}\n`);
  const mismatchAgent = path.join(root, 'rollout-wrong-agent.jsonl');
  fs.writeFileSync(mismatchAgent, `${metadata('parent-1', '/tmp/agents/other')}\n`);
  assert.equal(discoverRollout(root, 'parent-1', '/tmp/agents/a').kind, 'found');
  rollout(root, 'rollout-duplicate.jsonl');
  assert.equal(discoverRollout(root, 'parent-1', '/tmp/agents/a').kind, 'ambiguous');
  fs.rmSync(root, { recursive: true, force: true });
});

test('uses last request input only, ignores cumulative totals and null or malformed usage', () => {
  const state = { threshold: 100, hasUsage: false, lastInputTokens: null, crossed: false, terminal: null };
  processLine(usage(20, 900000), state);
  processLine(usage(null), state);
  processLine(event('event_msg', { type: 'token_count', info: { last_token_usage: { input_tokens: '200' } } }), state);
  assert.equal(state.lastInputTokens, 20);
  assert.equal(state.crossed, false);
  assert.equal(usageInput(JSON.parse(usage(100))) , 100);
});

test('latches an exact threshold crossing even when later usage falls after compaction', () => {
  const state = { threshold: 50, hasUsage: false, lastInputTokens: null, crossed: false, terminal: null };
  processLine(usage(49), state);
  processLine(usage(50), state);
  processLine(usage(9), state);
  assert.equal(state.lastInputTokens, 9);
  assert.equal(state.crossed, true);
  assert.equal(state.crossedInputTokens, 50);
});

test('correlates a terminal event with the active task identity when both are present', () => {
  const state = { threshold: 50, hasUsage: true, lastInputTokens: 12, crossed: false, crossedInputTokens: null,
    terminal: null, turnIdentity: { key: 'task_id', value: 'current' } };
  processLine(event('event_msg', { type: 'task_complete', task_id: 'older' }), state);
  assert.equal(state.terminal, null);
  processLine(event('event_msg', { type: 'task_complete', task_id: 'current' }), state);
  assert.equal(state.terminal, 'completed');
});

test('polls the selected rollout and parses a JSON line split across writes', async () => {
  const root = tempRoot();
  const filePath = rollout(root);
  const promise = runWatcher(options(root));
  await new Promise((resolve) => setTimeout(resolve, 25));
  const partial = usage(50).slice(0, 70);
  fs.appendFileSync(filePath, `${partial}`);
  await new Promise((resolve) => setTimeout(resolve, 25));
  fs.appendFileSync(filePath, `${usage(50).slice(70)}\n`);
  const result = await promise;
  assert.equal(result.event, 'handoff_required');
  assert.equal(result.observed_input_tokens, 50);
  assert.equal(result.threshold_input_tokens, 50);
  assert.equal(result.threshold, 50);
  assert.equal(result.rollout_path, filePath);
  fs.rmSync(root, { recursive: true, force: true });
});

test('ignores crossings and completion from earlier turns in a resumed rollout', async () => {
  const root = tempRoot();
  rollout(root, 'rollout-resumed.jsonl', [
    event('turn_context', { turn_id: 'old' }), usage(90), event('event_msg', { type: 'task_complete' }),
    event('turn_context', { turn_id: 'current' }), usage(12),
  ].join('\n') + '\n');
  const result = await runWatcher(options(root));
  assert.equal(result.event, 'idle');
  assert.equal(result.observed_input_tokens, 12);
  fs.rmSync(root, { recursive: true, force: true });
});

test('uses task_started over repeated turn_context records and lets completed current turn win', async () => {
  const root = tempRoot();
  rollout(root, 'rollout-resumed.jsonl', [
    event('event_msg', { type: 'task_started', task_id: 'old' }), usage(90), event('event_msg', { type: 'task_complete' }),
    event('event_msg', { type: 'task_started', task_id: 'current' }), event('turn_context', { turn_id: 'context-refresh' }),
    usage(90), event('event_msg', { type: 'task_complete' }),
  ].join('\n') + '\n');
  const result = await runWatcher(options(root));
  assert.equal(result.event, 'completed');
  assert.equal(result.reason, 'completed');
  assert.equal(result.threshold_input_tokens, 90);
  fs.rmSync(root, { recursive: true, force: true });
});

test('a context after an older terminal identifies the current turn when task_started is absent', async () => {
  const root = tempRoot();
  rollout(root, 'rollout-context-only.jsonl', [
    event('event_msg', { type: 'task_started', task_id: 'old' }), usage(90), event('event_msg', { type: 'task_complete' }),
    event('turn_context', { turn_id: 'current' }), usage(12),
  ].join('\n') + '\n');
  const result = await runWatcher(options(root));
  assert.equal(result.event, 'idle');
  assert.equal(result.observed_input_tokens, 12);
  fs.rmSync(root, { recursive: true, force: true });
});

test('resets old completion when a new turn starts in the same polling batch', async () => {
  const root = tempRoot();
  const filePath = rollout(root, 'rollout-batch-turns.jsonl', `${event('event_msg', { type: 'task_started', task_id: 'old' })}\n${usage(12)}\n`);
  const promise = runWatcher(options(root));
  await new Promise((resolve) => setTimeout(resolve, 25));
  fs.appendFileSync(filePath, [
    event('event_msg', { type: 'task_complete' }), event('event_msg', { type: 'task_started', task_id: 'current' }),
    event('turn_context', { turn_id: 'current-context' }), usage(8),
  ].join('\n') + '\n');
  const result = await promise;
  assert.equal(result.event, 'idle');
  assert.equal(result.observed_input_tokens, 8);
  fs.rmSync(root, { recursive: true, force: true });
});

test('returns completed below threshold and preserves aborted turn reason', async () => {
  for (const [terminal, reason] of [['task_complete', 'completed'], ['turn_aborted', 'aborted']]) {
    const root = tempRoot();
    rollout(root, 'rollout-done.jsonl', [event('turn_context', {}), usage(12), event('event_msg', { type: terminal })].join('\n') + '\n');
    const result = await runWatcher(options(root));
    assert.equal(result.event, 'completed');
    assert.equal(result.reason, reason);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('distinguishes missing telemetry, ambiguous identity, unreadable metadata, and idle rollout', async () => {
  const missing = tempRoot();
  const unavailable = await runWatcher(options(missing, { timeout: 0.03 }));
  assert.equal(unavailable.event, 'unavailable');
  assert.equal(unavailable.observed_input_tokens, null);
  fs.rmSync(missing, { recursive: true, force: true });

  const ambiguousRoot = tempRoot();
  rollout(ambiguousRoot, 'rollout-a.jsonl');
  rollout(ambiguousRoot, 'rollout-b.jsonl');
  assert.equal((await runWatcher(options(ambiguousRoot))).event, 'error');
  fs.rmSync(ambiguousRoot, { recursive: true, force: true });

  const unreadableRoot = tempRoot();
  rollout(unreadableRoot);
  const brokenFs = Object.create(fs);
  brokenFs.openSync = () => { const error = new Error('access denied'); error.code = 'EACCES'; throw error; };
  const unreadable = await runWatcher(options(unreadableRoot), { fs: brokenFs });
  assert.equal(unreadable.event, 'error');
  assert.match(unreadable.reason, /access denied/);
  fs.rmSync(unreadableRoot, { recursive: true, force: true });

  const idleRoot = tempRoot();
  rollout(idleRoot, 'rollout-idle.jsonl', `${usage(12)}\n`);
  const idle = await runWatcher(options(idleRoot));
  assert.equal(idle.event, 'idle');
  fs.rmSync(idleRoot, { recursive: true, force: true });

  const noUsageRoot = tempRoot();
  rollout(noUsageRoot, 'rollout-no-usage.jsonl', `${event('event_msg', { type: 'unknown' })}\n`);
  const noUsage = await runWatcher(options(noUsageRoot, { timeout: 0.03 }));
  assert.equal(noUsage.event, 'unavailable');
  assert.equal(noUsage.observed_input_tokens, null);
  fs.rmSync(noUsageRoot, { recursive: true, force: true });
});

test('validates CLI arguments, derives defaults, and emits JSON for terminal events', () => {
  const defaults = parseArgs(['--agent-path', '/tmp/agents/a'], { CODEX_THREAD_ID: 'p' }, '/tmp/home');
  assert.equal(defaults.threshold, 135000);
  assert.equal(defaults.sessionsRoot, path.resolve('/tmp/home/.codex/sessions'));
  assert.equal(defaults.agentPath, '/tmp/agents/a');
  assert.equal(parseArgs(['--agent-path', '/tmp/a', '--until', '5'], { CODEX_THREAD_ID: 'p' }).threshold, 5);
  assert.throws(() => parseArgs(['--agent-path', '/tmp/a', '--interval', '0'], { CODEX_THREAD_ID: 'p' }), /positive/);
  assert.throws(() => parseArgs(['--agent-path', '/tmp/a', '--until', '0'], { CODEX_THREAD_ID: 'p' }), /positive/);
  assert.throws(() => parseArgs(['--agent-path', '/tmp/a', '--until', '12.5'], { CODEX_THREAD_ID: 'p' }), /integer/);
  assert.throws(() => parseArgs(['--agent-path', 'relative/path'], { CODEX_THREAD_ID: 'p' }), /canonical absolute slash path/);
  assert.throws(() => parseArgs(['--agent-path', '/tmp/a/'], { CODEX_THREAD_ID: 'p' }), /canonical absolute slash path/);
  const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /handoff_required/);
  const invalid = spawnSync(process.execPath, [script, '--agent-path', '/tmp/a', '--timeout', '0'], { encoding: 'utf8' });
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /positive/);
  const root = tempRoot();
  rollout(root, 'rollout-cli.jsonl', `${usage(5)}\n`);
  const terminal = spawnSync(process.execPath, [script, '--agent-path', '/tmp/agents/a', '--sessions-root', root, '--until', '5'], {
    encoding: 'utf8', env: { ...process.env, CODEX_THREAD_ID: 'parent-1' },
  });
  assert.equal(terminal.status, 0);
  assert.equal(terminal.stdout.trim().split(/\r?\n/).length, 1);
  assert.equal(JSON.parse(terminal.stdout).event, 'handoff_required');
  fs.rmSync(root, { recursive: true, force: true });
});
