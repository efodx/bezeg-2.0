const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');
const {adoptAgentBranch, claudeProjectKey, claudeRequestCost, claudeUsage, codexUsage, exportRevision, findTask, loadManifest, profileClaudeTranscript, validateManifest, verdict} = require('./agent_eval.cjs');

const sha = 'a'.repeat(40);
const task = (extra = {}) => ({id: 'demo', size: 'M', base: sha, solution: sha, prompt: 'Do it.', spec: [], hidden: [{path: 'a.test.ts', tier: 'contract', kind: 'unit'}], ...extra});
const assistant = (id, usage, timestamp = '2026-10-24T10:00:00Z') => JSON.stringify({type: 'assistant', timestamp, message: {id, usage}});
const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'agent-eval-'));

test('the checked-in manifest is valid and defaults to the medium task', () => {
    const manifest = loadManifest();
    assert.equal(findTask(manifest).size, 'M');
    assert.deepEqual(['S', 'M', 'L'].map(size => findTask(manifest, size).size), ['S', 'M', 'L']);
    assert.equal(findTask(manifest, 'large').id, findTask(manifest, 'L').id);
    assert.throws(() => findTask(manifest, 'XL'), /Unknown task "XL"/);
});

test('manifest validation names every problem', () => {
    assert.doesNotThrow(() => validateManifest({defaultTask: 'demo', tooling: ['AGENTS.md'], tasks: [task()]}));
    const broken = {defaultTask: 'missing', tooling: [], tasks: [task({size: 'XL', base: 'abc', hidden: [{path: 'x', tier: 'reference', kind: 'e2e'}]})]};
    assert.throws(() => validateManifest(broken), error => [/tooling must list/, /size must be S, M or L/, /base must be a full commit SHA/, /needs at least one contract test/, /kind must be unit or smoke/, /defaultTask must name a task/]
        .every(pattern => pattern.test(error.message)));
});

test('Claude transcripts count each message once and weight cache use', () => {
    const usage = {input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5};
    const text = [assistant('m1', usage, '2026-10-24T10:00:00Z'), assistant('m1', usage), assistant('m2', {input_tokens: 50, output_tokens: 1}, '2026-10-24T10:05:00Z'), 'not json'].join('\n');
    const profile = profileClaudeTranscript(text);
    assert.deepEqual({requests: profile.requests, input: profile.inputTokens, output: profile.outputTokens, peak: profile.peakRequestInput}, {requests: 2, input: 1160, output: 6, peak: 1110});
    assert.equal(profile.weightedInput, 100 * 1.25 + 1000 * 0.1 + 10 + 25 + 50 + 5);
    assert.deepEqual([profile.first, profile.last], ['2026-10-24T10:00:00Z', '2026-10-24T10:05:00Z']);
});

test('Claude request cost prices each token class by model family', () => {
    const usage = {input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 1e6, cache_creation_input_tokens: 2e6,
        cache_creation: {ephemeral_5m_input_tokens: 1e6, ephemeral_1h_input_tokens: 1e6}};
    assert.equal(claudeRequestCost('claude-opus-5-5', usage), 4 + 20 + 0.2 + 5 + 8);
    assert.equal(claudeRequestCost('claude-sonnet-5-5', usage), 2 + 10 + 0.2 + 2.5 + 4);
    assert.equal(claudeRequestCost('claude-sonnet-5-5', {cache_creation_input_tokens: 1e6}), 2.5, 'writes without a TTL split count as 5-minute writes');
    assert.equal(claudeRequestCost('unknown-model', usage), 0);
});

test('a hidden test source must exist', () => {
    const missing = task({hidden: [{path: 'a.test.ts', tier: 'contract', kind: 'unit', source: 'tools/agent-eval/hidden/none.cjs'}]});
    assert.throws(() => validateManifest({defaultTask: 'demo', tooling: ['AGENTS.md'], tasks: [missing]}), /source tools\/agent-eval\/hidden\/none\.cjs does not exist/);
});

test('grading adopts the single branch that extends an untouched sandbox branch', () => {
    const repo = tempDir();
    const git = (...args) => require('node:child_process').execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {cwd: repo, encoding: 'utf8'}).trim();
    const commit = (file, message) => { fs.writeFileSync(path.join(repo, file), message); git('add', file); git('commit', '--quiet', '-m', message); };
    git('init', '--quiet', '-b', 'master');
    commit('a.txt', 'tooling');
    git('tag', 'eval-start');
    git('branch', 'agent');
    git('branch', 'stale');
    git('checkout', '--quiet', 'agent');
    commit('b.txt', 'work');
    git('checkout', '--quiet', 'master');
    assert.deepEqual(adoptAgentBranch(repo), {branch: 'agent'});
    assert.equal(git('log', '-1', '--format=%s'), 'work');
    assert.equal(adoptAgentBranch(repo), null, 'a sandbox branch with commits is graded as is');

    git('reset', '--quiet', '--hard', 'eval-start');
    git('checkout', '--quiet', '-b', 'second');
    commit('c.txt', 'other');
    git('checkout', '--quiet', 'master');
    assert.deepEqual(adoptAgentBranch(repo), {skipped: ['agent', 'second']});
    assert.equal(git('log', '-1', '--format=%s'), 'tooling');
});

test('Claude usage covers the sandbox and its worktrees, split into handler and workers', () => {
    const projects = tempDir();
    const repo = path.join(projects, 'runs', 'demo', 'repo');
    const key = claudeProjectKey(repo);
    const write = (file, body) => {
        fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, body);
    };
    write(path.join(projects, key, 'handler.jsonl'), assistant('h', {input_tokens: 100, output_tokens: 1}));
    write(path.join(projects, key, 'handler', 'subagents', 'worker.jsonl'), assistant('w', {input_tokens: 40, output_tokens: 2}));
    write(path.join(projects, `${key}--claude-worktrees-x`, 'tree.jsonl'), assistant('t', {input_tokens: 7, output_tokens: 0}));
    write(path.join(projects, `${key}2`, 'other.jsonl'), assistant('o', {input_tokens: 999, output_tokens: 0}));
    const usage = claudeUsage(repo, projects);
    assert.deepEqual([usage.handler.sessions, usage.handler.inputTokens, usage.worker.sessions, usage.worker.inputTokens], [2, 107, 1, 40]);
});

test('Codex usage matches rollouts by working directory and separates child threads', () => {
    const sessions = tempDir();
    const repo = path.join(sessions, 'sandbox', 'repo');
    const rollout = (name, payload, totals) => fs.writeFileSync(path.join(sessions, name), [
        JSON.stringify({type: 'session_meta', timestamp: '2026-10-24T10:00:00Z', payload}),
        JSON.stringify({type: 'event_msg', timestamp: '2026-10-24T10:01:00Z', payload: {type: 'token_count', info: {total_token_usage: {input_tokens: totals[0] / 2, output_tokens: 1}, last_token_usage: {input_tokens: totals[1]}}}}),
        JSON.stringify({type: 'event_msg', timestamp: '2026-10-24T10:02:00Z', payload: {type: 'token_count', info: {total_token_usage: {input_tokens: totals[0], output_tokens: 3}, last_token_usage: {input_tokens: totals[1] / 2}}}}),
    ].join('\n'));
    rollout('parent.jsonl', {cwd: repo}, [1000, 300]);
    rollout('child.jsonl', {cwd: path.join(repo, 'src'), parent_thread_id: 'p'}, [400, 200]);
    rollout('elsewhere.jsonl', {cwd: path.join(sessions, 'other')}, [5000, 5000]);
    const usage = codexUsage(repo, '2000-01-01T00:00:00Z', sessions);
    assert.deepEqual([usage.handler.inputTokens, usage.handler.peakRequestInput, usage.handler.requests, usage.worker.inputTokens], [1000, 300, 2, 400]);
    assert.equal(usage.handler.weightedInput, undefined);
});

test('revision export writes only the requested paths, and nothing for an empty list', () => {
    const repo = tempDir();
    const git = (...args) => require('node:child_process').execFileSync('git', args, {cwd: repo, encoding: 'utf8'});
    git('init', '--quiet');
    fs.mkdirSync(path.join(repo, 'docs'));
    fs.writeFileSync(path.join(repo, 'docs', 'spec.md'), 'spec');
    fs.writeFileSync(path.join(repo, 'solution.ts'), 'answer');
    git('add', '--all');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--quiet', '-m', 'solution');
    const exported = paths => {
        const dest = tempDir();
        exportRevision(repo, 'HEAD', dest, paths);
        return fs.readdirSync(dest, {recursive: true}).map(file => file.replaceAll('\\', '/')).sort();
    };
    assert.deepEqual(exported(), ['docs', 'docs/spec.md', 'solution.ts']);
    assert.deepEqual(exported(['docs/spec.md']), ['docs', 'docs/spec.md']);
    assert.deepEqual(exported([]), []);
});

test('verdict requires passing gates and every contract test; reference tests are informational', () => {
    const gates = [{passed: true}];
    const contract = passed => ({tier: 'contract', passed});
    assert.equal(verdict({gates, hidden: [contract(true), {tier: 'reference', passed: false}]}), 'accepted');
    assert.equal(verdict({gates, hidden: [contract(true), {tier: 'contract', skipped: 'smoke skipped'}]}), 'incomplete');
    assert.equal(verdict({gates, hidden: [contract(false)]}), 'rejected');
    assert.equal(verdict({gates: [{passed: false}], hidden: [contract(true)]}), 'rejected');
});
