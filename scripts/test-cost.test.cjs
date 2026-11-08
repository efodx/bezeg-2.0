'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {parseResults, summarize, diff} = require('./test-cost.cjs');

const raw = {
    version: 1,
    projects: {
        '': {files: {'a.test.ts': {failed: false, duration: 2500}, 'b.test.ts': {failed: false, duration: 500}}},
        other: {files: {'a.test.ts': {failed: false, duration: 1000}, 'c.test.ts': {duration: 7000}}},
    },
};

test('parseResults merges projects and converts ms to seconds', () => {
    assert.deepEqual(parseResults(raw), {'a.test.ts': 3.5, 'b.test.ts': 0.5, 'c.test.ts': 7});
});

test('parseResults rejects an unknown shape', () => {
    assert.throws(() => parseResults({version: 1}), /results\.json/);
});

test('summarize sorts slowest first, limits to top N and sums', () => {
    const s = summarize({x: 1, y: 5, z: 3}, 2);
    assert.deepEqual(s.top, [['y', 5], ['z', 3]]);
    assert.equal(s.total, 9);
    assert.equal(s.count, 3);
});

test('diff compares shared files only, lists increases and new slow files', () => {
    const base = {files: {a: 1, b: 4, gone: 2}, total: 7};
    const d = diff({a: 3, b: 3, fresh: 6, tiny: 1}, base, {limit: 10});
    assert.deepEqual(d.increases, [['a', 2]]);
    assert.deepEqual(d.newSlow, [['fresh', 6]]);
    assert.equal(d.totalDelta, 13 - 7);
    assert.equal(d.partial, false);
});

test('diff flags a partial run when the file count is well below the baseline', () => {
    const files = Object.fromEntries(Array.from({length: 10}, (_, i) => [`f${i}`, 1]));
    const d = diff({f0: 2}, {files, total: 10}, {limit: 10});
    assert.equal(d.partial, true);
    assert.deepEqual(d.increases, [['f0', 1]]);
});
