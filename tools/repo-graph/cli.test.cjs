'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const graph = require('./structural.cjs');
const {cli} = require('./cli.cjs');

function capture(action) {
  const log = console.log, write = process.stdout.write;
  let output = '';
  console.log = value => { output += `${value}\n`; };
  process.stdout.write = value => { output += value; return true; };
  try { action(); } finally { console.log = log; process.stdout.write = write; }
  return output;
}

test('public commands plan, pause and query without authentication or implicit model work', t => {
  const state = path.resolve(__dirname, '../../.repo-graph');
  fs.mkdirSync(state, {recursive: true});
  const root = fs.mkdtempSync(path.join(state, 'cli-test-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true, maxRetries: 5, retryDelay: 100}));
  const put = (name, text) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, text); };
  const git = (...args) => execFileSync('git', args, {cwd: root, stdio: 'ignore'});
  git('init', '-q'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Fixture');
  put('tsconfig.json', '{"compilerOptions":{"target":"ES2020"},"include":["src"]}');
  put('.gitignore', '.repo-graph/\n');
  put('src/scene.ts', 'export function commitScene() { return "scene state updates synchronously"; }\n');
  git('add', '-A'); git('commit', '-qm', 'fixture');
  const built = JSON.parse(capture(() => cli(['build'], root)));
  assert.ok(built.nodes > 0);
  const plan = JSON.parse(capture(() => cli(['enrich', '--path', 'src/scene.ts', '--model', 'offline'], root)));
  assert.equal(plan.modelCalls, 0);
  assert.ok(plan.potentialCalls > 0);
  const paused = JSON.parse(capture(() => cli(['enrich', '--passage', plan.jobs[0].ids[0], '--model', 'offline', '--execute', '--max-calls', '0'], root)));
  assert.equal(paused.modelCalls, 0);
  assert.equal(paused.invocationAttempts, 0);
  assert.ok(paused.semantic.pending > 0);
  const packet = capture(() => cli(['query', 'scene', '--max-chars', '1500'], root));
  assert.ok(packet.length <= 1500);
  assert.match(packet, /src\/scene.ts:1-1/);
  assert.match(packet, /hash:/);
  assert.throws(() => cli(['enrich', '--execute', '--path', 'src/scene.ts'], root), /requires --model/);
  assert.throws(() => cli(['enrich', '--execute', '--model', 'offline', '--max-calls', '5'], root), /limits exceeded/);
  put('src/scene.ts', 'export const changed = true;\n');
  assert.throws(() => cli(['query', 'scene'], root), /stale/);
  assert.equal(JSON.parse(capture(() => cli(['status'], root))).freshness.includes('stale'), true);
});
