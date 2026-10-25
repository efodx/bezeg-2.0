'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {analyze} = require('./pilot.cjs');

test('no-change cache reuses analysis without calls, remaps renamed IDs, and invalidates edited text', t => {
  const state = path.resolve(__dirname, '../../.repo-graph');
  fs.mkdirSync(state, {recursive: true});
  const cacheDir = fs.mkdtempSync(path.join(state, 'cache-test-'));
  t.after(() => fs.rmSync(cacheDir, {recursive: true, force: true}));
  let calls = 0;
  const run = (binary, args, options) => {
    if (args[0] === 'login') return {status: 0, stdout: 'Logged in using ChatGPT'};
    calls++;
    const sourceId = JSON.parse(options.input.slice(options.input.lastIndexOf('\n') + 1))[0].id;
    const result = {tags: [{sourceId, concept: 'board-disposal', kind: 'responsibility',
      quote: 0, rationale: 'Explicit disposal'}], relations: []};
    return {status: 0, stdout: [{type: 'item.completed', item: {type: 'agent_message', text: JSON.stringify(result)}},
      {type: 'turn.completed', usage: {input_tokens: 200, output_tokens: 30}}].map(e => JSON.stringify(e)).join('\n')};
  };
  const source = {id: 'old.ts#dispose', text: 'Dispose the board and listener on unmount.'};
  const options = {cacheDir, model: 'gpt-6-luna', mode: 'tags', run};
  analyze([source], options);
  assert.equal(calls, 1);
  const hit = analyze([{...source, id: 'renamed.ts#dispose'}], options);
  assert.equal(hit.cacheHit, true);
  assert.equal(hit.result.tags[0].sourceId, 'renamed.ts#dispose');
  assert.equal(calls, 1);
  analyze([{...source, text: source.text + '\nchanged'}], options);
  assert.equal(calls, 2);
  for (const file of fs.readdirSync(cacheDir)) fs.writeFileSync(path.join(cacheDir, file), '{"malformed":true}');
  assert.throws(() => analyze([source], options));
  assert.equal(calls, 2);
});
