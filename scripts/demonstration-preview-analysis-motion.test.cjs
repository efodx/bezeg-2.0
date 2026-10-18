'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {createAnalysisMotionSpecs, analysisMotionIds} = require('./demonstration-preview-analysis-motion.cjs');

const specs = createAnalysisMotionSpecs({assert});

test('analysis motion specs cover all assigned demonstrations with loopable supported inputs', () => {
    assert.deepEqual(Object.keys(specs).sort(), [...analysisMotionIds].sort());
    for (const [id, spec] of Object.entries(specs)) {
        assert.equal(spec.mode, 'parameter-sweep', `${id} mode`);
        assert.ok(Number.isInteger(spec.controlCount) && spec.controlCount >= 0, `${id} control count`);
        assert.equal(spec.control.kind, ['exponential-function', 'continuity', 'arc-length'].includes(id) ? 'range' : 'number', `${id} uses its supported control`);
        assert.ok(spec.control.label, `${id} has an accessible control label`);
        assert.ok(spec.sweep.step > 0, `${id} has a positive input step`);
        assert.equal(spec.sweep.waypoints[0], spec.sweep.start, `${id} starts at the recipe value`);
        assert.equal(spec.sweep.waypoints.at(-1), spec.sweep.start, `${id} returns to the recipe value`);
        assert.equal(typeof spec.sweep.observe, 'function', `${id} observes rendered board geometry`);
        assert.equal(typeof spec.sweep.check, 'function', `${id} asserts its independent math`);
        assert.equal(typeof spec.sweep.readout.read, 'function', `${id} reads its input value`);
        assert.equal(typeof spec.sweep.readout.matches, 'function', `${id} checks its readout`);
        assert.ok(Array.isArray(spec.invariants) && spec.invariants.length >= 3, `${id} records serializable invariants`);
        assert.ok(spec.invariants.every(item => typeof item === 'string'), `${id} invariants are serializable`);
        assert.match(spec.encoderBudget, /300 KiB|307200/);
    }
});

test('analysis sweep targets retain meaningful discrete changes and the exact area recipe origin', () => {
    assert.deepEqual(specs['arc-length'].sweep.waypoints, [2, 12, 2]);
    assert.deepEqual(specs.taylor.sweep.waypoints, [2, 8, 2]);
    assert.deepEqual(specs['uniform-convergence'].sweep.waypoints, [5, 25, 5]);
    assert.deepEqual(specs.sequence.sweep.waypoints, [0.1, 0.3, 0.1]);
    assert.deepEqual(specs['area-between-curves'].sweep.waypoints, [3.2, 2, 3.2]);
    assert.equal(specs['area-between-curves'].sweep.start, 3.2);
});

test('exponential sweep rejects a rendered curve that disagrees with aˣ', () => {
    const spec = specs['exponential-function'];
    const xs = Array.from({length: 17}, (_, i) => 2 * i / 16);
    const sample = {
        index: 20,
        actual: {input: 2},
        curvePathHash: 'path',
        capture: {sha256: 'frame'},
        observed: {
            inputValues: [{label: spec.control.label, value: '2'}],
            points: [{x: 0, y: 1}, {x: 1, y: 2}],
            curves: [{samples: xs.map(x => ({x, y: 2 ** x}))}],
        },
    };
    spec.sweep.check(sample, null, sample, spec);
    sample.observed.curves[0].samples[8].y = 4;
    assert.throws(() => spec.sweep.check(sample, null, sample, spec), /independent formula/);
});
