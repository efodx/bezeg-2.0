'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {createAnalysisMotionSpecs, analysisMotionIds} = require('./demonstration-preview-analysis-motion.cjs');

const specs = createAnalysisMotionSpecs({assert});

test('analysis motion specs cover each assigned demonstration with supported controls and an exact reset', () => {
    assert.deepEqual(Object.keys(specs).sort(), [...analysisMotionIds].sort());
    for (const [id, spec] of Object.entries(specs)) {
        assert.ok(['parameter-sweep', 'discrete-exact-steps'].includes(spec.mode), `${id} mode`);
        assert.ok(Number.isInteger(spec.controlCount) && spec.controlCount >= 0, `${id} control count`);
        if (spec.mode === 'parameter-sweep') {
            assert.equal(spec.control.kind, ['exponential-function', 'continuity'].includes(id) ? 'range' : 'number', `${id} uses its supported control`);
            assert.ok(spec.control.label, `${id} has an accessible control label`);
            assert.ok(spec.sweep.step > 0, `${id} has a positive input step`);
            assert.equal(spec.sweep.waypoints[0], spec.sweep.start, `${id} starts at the recipe value`);
            assert.equal(spec.sweep.waypoints.at(-1), spec.sweep.start, `${id} returns to the recipe value`);
            assert.equal(typeof spec.sweep.observe, 'function', `${id} observes rendered board geometry`);
            assert.equal(typeof spec.sweep.check, 'function', `${id} asserts its independent math`);
            assert.equal(typeof spec.sweep.readout.read, 'function', `${id} reads its input value`);
            assert.equal(typeof spec.sweep.readout.matches, 'function', `${id} checks its readout`);
        } else {
            assert.equal(spec.checkpoints.length, spec.holds.length, `${id} has one hold per checkpoint`);
            assert.equal(spec.holds.reduce((sum, hold) => sum + hold, 0), 96, `${id} holds cover the clip`);
            assert.equal(spec.checkpoints[0].value, spec.checkpoints.at(-1).value, `${id} resets to its poster checkpoint`);
            assert.equal(spec.checkpoints.at(-1).phase, 'reset', `${id} records its reset boundary`);
            assert.equal(typeof spec.observe, 'function', `${id} observes rendered geometry`);
            assert.equal(typeof spec.checkStep, 'function', `${id} checks exact checkpoint math`);
        }
        assert.ok(Array.isArray(spec.invariants) && spec.invariants.length >= 3, `${id} records serializable invariants`);
        assert.ok(spec.invariants.every(item => typeof item === 'string'), `${id} invariants are serializable`);
        assert.match(spec.encoderBudget, /300 KiB|307200/);
    }
});

test('analysis timelines preserve exact integer states, phase order and the area recipe origin', () => {
    assert.deepEqual(specs['arc-length'].checkpoints.map(({value}) => value), [2, 4, 6, 8, 12, 2]);
    assert.deepEqual(specs.taylor.checkpoints.map(({value}) => value), [2, 3, 4, 2]);
    assert.deepEqual(specs['uniform-convergence'].checkpoints.map(({value}) => value), [5, 8, 11, 16, 25, 5]);
    assert.deepEqual(specs['area-between-curves'].sweep.waypoints, [3.2, 2, 3.2]);
    assert.equal(specs['area-between-curves'].sweep.start, 3.2);
    assert.deepEqual(specs.sequence.checkpoints.map(({value}) => value), ['ε=.3,N=5', 'ε=.1,N=5', 'ε=.1,N=11', 'ε=.3,N=5']);
    assert.deepEqual(specs['mean-value'].checkpoints.map(({value}) => value), [0.5, 1, 1.5, 1, 0.5]);
    assert.deepEqual(specs['fixed-point'].checkpoints.map(({value}) => value), [1, 2, 3, 4, 5, 1]);
    assert.equal(specs['fixed-point'].checkpoints[4].actions[0].count, 4, 'Each fixed-point state replays the full prefix from the step-1 recipe');
    assert.equal(specs['sequence'].checkpoints[2].actions[0].value, 0.1, 'Sequence N=11 state reapplies the narrowed epsilon');
    for (const id of ['arc-length', 'taylor', 'uniform-convergence', 'sequence', 'mean-value', 'fixed-point']) {
        assert.equal(specs[id].schedule.resetFrame, 96 - specs[id].holds.at(-1), `${id} records its reset boundary`);
    }
});

test('sequence checkpoints independently verify the strict all-tail epsilon-N certificate', () => {
    const make = (epsilon, threshold) => ({checkpoint: `ε=${epsilon},N=${threshold}`, phase: 'sequence', observed: {
        inputValues: [{label: 'Širina pasu ε', value: String(epsilon)}, {label: 'Prag N', value: String(threshold)}],
        points: Array.from({length: 16}, (_, i) => ({x: i + 1, y: 1 / (i + 1)})),
        readouts: {'n-min': String(Math.floor(1 / epsilon) + 1)},
        statusKinds: {sequence: [threshold * Math.round(epsilon * 100) > 100 ? 'certified' : 'threshold-fails']},
    }});
    const first = make(0.3, 5);
    specs.sequence.checkStep(first, first);
    specs.sequence.checkStep(make(0.1, 5), first);
    specs.sequence.checkStep(make(0.1, 11), first);
    const wrongVerdict = make(0.1, 10);
    wrongVerdict.observed.statusKinds.sequence = ['certified'];
    assert.throws(() => specs.sequence.checkStep(wrongVerdict, first), /Certificate verdict/);
    const missingTerm = make(0.1, 11);
    missingTerm.observed.points.pop();
    assert.throws(() => specs.sequence.checkStep(missingTerm, first), /Term a_16/);
});

test('mean-value checkpoints verify the fixed secant, tangent formula and delayed reveal', () => {
    const make = (c, phase) => ({phase, observed: {
        curves: [
            ...[x => x * x, x => 2 * x, x => 2 * c * x - c * c].map(fn => ({samples: Array.from({length: 17}, (_, i) => {const x = 2 * i / 16; return {x, y: fn(x)};})})),
        ],
        readouts: {'secant-slope': '2', 'tangent-slope': String(2 * c), difference: String(2 * c - 2)},
        inputValues: [{label: 'Točka dotika c', value: String(c)}],
        reveals: {'toggle-matches': phase === 'match-revealed' ? 'true' : 'false'},
        points: phase === 'match-revealed' ? [{x: 1, y: 1}] : [],
    }});
    const first = make(0.5, 'shallow');
    specs['mean-value'].checkStep(first, first);
    specs['mean-value'].checkStep(make(1, 'match-revealed'), first);
    const incorrect = make(1, 'match-revealed');
    incorrect.observed.curves[2].samples.forEach(p => {p.y = p.x;});
    assert.throws(() => specs['mean-value'].checkStep(incorrect, first), /Tangent at c=1/);
});

test('fixed-point checkpoints verify every exact cobweb segment against independent iteration', () => {
    const iterates = [0];
    for (let i = 0; i < 5; i++) iterates.push((iterates.at(-1) + 1) / 2);
    const segments = [];
    for (let i = 0; i < 5; i++) segments.push(
        {type: 'segment', ends: [{x: iterates[i], y: iterates[i]}, {x: iterates[i], y: iterates[i + 1]}]},
        {type: 'segment', ends: [{x: iterates[i], y: iterates[i + 1]}, {x: iterates[i + 1], y: iterates[i + 1]}]},
    );
    const sample = k => ({checkpoint: k, observed: {
        inputValues: [{label: 'Začetek x₀', value: '0'}], readouts: {step: String(k)},
        curves: [
            {samples: Array.from({length: 17}, (_, i) => {const x = 2 * i / 16; return {x, y: (x + 1) / 2};}), dataSamples: []},
            {samples: [], dataSamples: [{x: 0, y: 0}, {x: 0, y: 0}, ...Array.from({length: k}, (_, i) => [
                {x: iterates[i], y: iterates[i + 1]}, {x: iterates[i + 1], y: iterates[i + 1]},
            ]).flat()]},
        ],
        points: iterates.slice(0, k + 1).map(x => ({x, y: x})), lines: segments.slice(0, k * 2),
    }});
    const first = sample(1);
    for (let k = 1; k <= 5; k++) specs['fixed-point'].checkStep(sample(k), first);
    const incorrect = sample(3);
    incorrect.observed.curves[1].dataSamples.pop();
    assert.throws(() => specs['fixed-point'].checkStep(incorrect, first), /Cobweb must contain/);
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
