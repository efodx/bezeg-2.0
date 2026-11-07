'use strict';

const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const test = require('node:test');
const {frameSteps, assessFrameSteps, ignoredRatio, MAX_IGNORED_RATIO} = require('./_jump.cjs');

const SIZE = 40;
const BLOCK = 6;

function crc32(buffer) {
    let crc = ~0;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return ~crc >>> 0;
}

function chunk(type, body) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, 'ascii');
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
    return Buffer.concat([head, body, tail]);
}

/** An 8-bit RGB PNG: a white canvas with a dark block at column x, plus optional extra [x, y, grey] pixels. */
function frame(x, extra = []) {
    const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE, 255);
    for (let y = 0; y < SIZE; y++) raw[y * (SIZE * 3 + 1)] = 0;
    const paint = (px, py, value) => {
        for (let c = 0; c < 3; c++) raw[py * (SIZE * 3 + 1) + 1 + px * 3 + c] = value;
    };
    for (let py = 10; py < 10 + BLOCK; py++) for (let px = x; px < x + BLOCK; px++) paint(px, py, 20);
    for (const [px, py, value] of extra) paint(px, py, value);
    const header = Buffer.alloc(13);
    header.writeUInt32BE(SIZE, 0);
    header.writeUInt32BE(SIZE, 4);
    header.set([8, 2, 0, 0, 0], 8);
    return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const range = (from, to) => Array.from({length: to - from + 1}, (_, index) => from + index);
const smooth = range(2, 30).map(x => frame(x));
const held = [...Array(6).fill(frame(2)), ...range(3, 30).map(x => frame(x)), ...Array(6).fill(frame(30))];
// The block moves one column per frame, then jumps 18 columns in one frame.
const cut = [...range(2, 12).map(x => frame(x)), ...range(30, 33).map(x => frame(x))];

test('frameSteps measures the mean absolute difference between neighbouring frames', () => {
    const steps = frameSteps([frame(2), frame(2), frame(3)]);
    assert.equal(steps.length, 2);
    assert.equal(steps[0], 0);
    // One column of the block uncovers and one covers: 2 * 6 pixels, each differing by 235 on every channel.
    assert.ok(Math.abs(steps[1] - (12 * 235) / (SIZE * SIZE)) < 1e-9);
    assert.deepEqual(frameSteps([frame(2)]), []);
});

test('a smooth sequence passes', () => {
    const result = assessFrameSteps(frameSteps(smooth), {});
    assert.equal(result.ok, true);
    assert.ok(Math.abs(result.ratio - 1) < 1e-9, `ratio ${result.ratio}`);
    assert.equal(result.threshold, 3);
});

test('identical hold frames at both ends do not drag the typical step to zero', () => {
    const steps = frameSteps(held);
    assert.ok(steps.filter(step => step === 0).length >= 10);
    const result = assessFrameSteps(steps, {});
    assert.equal(result.ok, true);
    assert.ok(result.typical > 0);
    assert.ok(Math.abs(result.ratio - 1) < 1e-9, `ratio ${result.ratio}`);
});

test('a cut sequence fails', () => {
    const result = assessFrameSteps(frameSteps(cut), {});
    assert.equal(result.ok, false);
    assert.ok(result.ratio > result.threshold, `ratio ${result.ratio}`);
    assert.ok(result.max > result.typical);
});

test('a discrete clip passes even when it cuts', () => {
    assert.equal(assessFrameSteps(frameSteps(cut), {discrete: true}).ok, true);
    assert.equal(assessFrameSteps(frameSteps(cut), {discrete: false}).ok, false);
});

test('a clip with no visible change fails, and so does one that differs only by noise', () => {
    const still = assessFrameSteps(frameSteps(Array(8).fill(frame(2))), {});
    assert.equal(still.ok, false);
    assert.equal(still.typical, 0);
    assert.equal(still.ratio, Infinity);
    const noisy = [frame(2), frame(2, [[30, 30, 250]]), frame(2, [[30, 30, 245]]), frame(2, [[31, 30, 250]])];
    const result = assessFrameSteps(frameSteps(noisy), {});
    assert.ok(result.max > 0 && result.max < 0.05, `max ${result.max}`);
    assert.equal(result.ok, false);
});

test('ignored regions are left out of the mean, and only those pixels', () => {
    const a = frame(2), b = frame(2, [[30, 30, 0], [31, 30, 0]]);
    // Two pixels flip from 255 to 0 on all channels: 2 * 255 * 3 / (3 * SIZE * SIZE) = 510 / 1600 over the whole frame.
    assert.ok(Math.abs(frameSteps([a, b])[0] - (2 * 255) / (SIZE * SIZE)) < 1e-9);
    assert.equal(frameSteps([a, b], {ignore: [{x: 30, y: 30, width: 2, height: 1}]})[0], 0);
    // A mask that misses the changed pixels leaves the step unchanged (the mean is over the other pixels only).
    const away = frameSteps([a, b], {ignore: [{x: 0, y: 0, width: 4, height: 4}]})[0];
    assert.ok(Math.abs(away - (2 * 255) / (SIZE * SIZE - 16)) < 1e-9, `step ${away}`);
});

test('a text flip hidden by the mask no longer counts as a cut, a real cut still does', () => {
    const text = [{x: 30, y: 30, width: 8, height: 8}];
    const big = (i, value) => frame(2 + i, Array.from({length: 64}, (_, k) => [30 + (k % 8), 30 + (k >> 3), value]));
    const flipping = range(0, 20).map(i => big(i, i < 10 ? 255 : 0));
    assert.equal(assessFrameSteps(frameSteps(flipping), {}).ok, false, 'unmasked text flip is read as a cut');
    assert.equal(assessFrameSteps(frameSteps(flipping, {ignore: text}), {}).ok, true, 'masked text flip passes');
    assert.equal(assessFrameSteps(frameSteps(cut, {ignore: text}), {}).ok, false, 'a real cut fails with text masked');
});

test('a mask over the share limit throws', () => {
    assert.equal(MAX_IGNORED_RATIO, 0.25);
    const wide = [{x: 0, y: 0, width: SIZE, height: SIZE / 2}];
    assert.equal(ignoredRatio(SIZE, SIZE, wide), 0.5);
    assert.throws(() => frameSteps([frame(2), frame(3)], {ignore: wide}), /cover 50\.0 percent/);
    assert.doesNotThrow(() => frameSteps([frame(2), frame(3)], {ignore: [{x: 0, y: 0, width: SIZE, height: SIZE / 4}]}));
    assert.equal(ignoredRatio(SIZE, SIZE, [{x: 0, y: 0, width: 10, height: 10}, {x: 5, y: 5, width: 10, height: 10}]), 175 / 1600);
});
