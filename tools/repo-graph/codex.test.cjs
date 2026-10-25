'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {SCHEMA, validate, cacheKey, invoke, decode} = require('./codex.cjs');
const source = {id: 'a', text: 'Dispose the board and listener on unmount.'};
const valid = () => ({tags: [{sourceId: 'a', concept: 'board-disposal', kind: 'responsibility',
  quote: 'Dispose the board', rationale: 'Explicit lifetime ownership'}], relations: []});
test('rejects fabricated, short, deleted, malformed evidence and incompatible extraction mode', () => {
  assert.deepEqual(validate(valid(), [source], 'tags'), valid());
  for (const mutate of [v => v.tags[0].sourceId = 'deleted', v => v.tags[0].quote = 'not in source',
    v => v.tags[0].quote = 'board', v => v.tags[0].kind = 'probability', v => v.tags[0].concept = '',
    v => v.extra = true]) {
    const value = valid(); mutate(value);
    assert.throws(() => validate(value, [source], 'tags'), /Invalid semantic/);
  }
  assert.throws(() => validate(valid(), [source], 'pairs'));
  const tooMany = valid(); tooMany.tags = Array.from({length: 5}, () => valid().tags[0]);
  assert.throws(() => validate(tooMany, [source], 'tags'), /Invalid semantic/);
  assert.equal(SCHEMA.properties.tags.maxItems, 4);
  assert.equal(SCHEMA.properties.relations.maxItems, 3);
});

test('authentication shares the invocation deadline and cannot count as an inference call', () => {
  let calls = 0;
  assert.throws(() => invoke([source], {timeoutMs: 5, run() {
    calls++;
    const start = performance.now(); while (performance.now() - start < 8) { /* deterministic fake slow auth */ }
    return {status: 0, stdout: 'Logged in using ChatGPT'};
  }}), error => /deadline/.test(error.message) && error.metrics.modelCalls === 0);
  assert.equal(calls, 1);
});

test('wire evidence IDs resolve to exact source text and cannot fabricate quotes or endpoints', () => {
  const wire = {tags: [{sourceId: 's0', concept: 'board-disposal', kind: 'responsibility', quote: 0, rationale: 'Explicit disposal'}], relations: []};
  assert.equal(decode(wire, [source], 'tags').tags[0].quote, source.text);
  assert.equal(decode(wire, [source], 'tags').tags[0].sourceId, source.id);
  for (const changed of [{...wire.tags[0], sourceId: 'board-disposal'}, {...wire.tags[0], quote: 15}, {...wire.tags[0], quote: 'Dispose the board'}]) {
    assert.throws(() => decode({tags: [changed], relations: []}, [source], 'tags'));
  }
});
test('cache identity ignores paths/IDs but includes exact source, mode and model', () => {
  const key = cacheKey([source], 'tags', 'gpt-6-luna');
  assert.equal(key, cacheKey([{...source, id: 'moved', path: 'new.ts'}], 'tags', 'gpt-6-luna'));
  assert.notEqual(key, cacheKey([{...source, text: source.text + '\n'}], 'tags', 'gpt-6-luna'));
  assert.notEqual(key, cacheKey([source], 'pairs', 'gpt-6-luna'));
  assert.notEqual(key, cacheKey([source], 'tags', 'different'));
});
test('adapter requires ChatGPT authentication and rejects unexpected tool execution', () => {
  let calls = 0;
  assert.throws(() => invoke([source], {run() { calls++; return {status: 0, stdout: 'Logged in using an API key'}; }}), /ChatGPT login/);
  assert.equal(calls, 1);
  const run = (binary, args, options) => {
    if (args[0] === 'login') return {status: 0, stdout: 'Logged in using ChatGPT'};
    assert.equal(options.env.OPENAI_API_KEY, undefined);
    assert.ok(args.includes('--ignore-user-config'));
    assert.ok(args.includes('--output-schema'));
    for (const setting of ['features.shell_tool=false', 'forced_login_method="chatgpt"',
      'features.apps=false', 'features.multi_agent=false', 'features.plugins=false', 'features.view_image=false']) assert.ok(args.includes(setting));
    const events = [{type: 'item.completed', item: {type: 'command_execution'}},
      {type: 'item.completed', item: {type: 'agent_message', text: JSON.stringify(valid())}},
      {type: 'turn.completed', usage: {input_tokens: 100}}];
    return {status: 0, stdout: events.map(e => JSON.stringify(e)).join('\n')};
  };
  assert.throws(() => invoke([source], {run}), /unexpected tool/);
  assert.equal(SCHEMA.additionalProperties, false);
});

test('runtime errors, malformed events and incomplete turns retain elapsed time and unknown usage', () => {
  for (const failure of [{status: 1, stderr: 'failed'}, {status: null, error: new Error('timeout')},
    {status: 0, stdout: 'invalid event'}, {status: 0, stdout: ''}]) {
    assert.throws(() => invoke([source], {run(binary, args) {
      return args[0] === 'login' ? {status: 0, stdout: 'Logged in using ChatGPT'} : failure;
    }}), error => typeof error.metrics?.elapsedMs === 'number' && error.metrics.usage === null);
  }
});
