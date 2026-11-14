'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {createConceptMotionSpecs, conceptMotionIds} = require('./demonstration-preview-concept-motion.cjs');

const specs = createConceptMotionSpecs({assert, applyAction: async () => {}});
const grid = (lo, hi, fn) => Array.from({length: 65}, (_, i) => {
    const x = lo + (hi - lo) * i / 64;
    return {x, y: fn(x)};
});

test('concept motion factory overrides only accumulation with exact 96-frame sequences', () => {
    assert.deepEqual(Object.keys(specs).sort(), [...conceptMotionIds].sort());
    assert.deepEqual(specs.accumulation.checkpoints.map(({value}) => value), [2, Math.PI, 4, 2]);
    for (const [id, spec] of Object.entries(specs)) {
        assert.equal(spec.mode, 'discrete-exact-steps');
        assert.equal(spec.holds.reduce((sum, value) => sum + value, 0), 96, `${id} hold budget`);
        assert.equal(spec.schedule.resetFrame, 84, `${id} explicit reset boundary`);
        assert.equal(spec.schedule.phases.at(-1).kind, 'reset');
        assert.equal(spec.checkpoints.at(-1).phase, 'reset');
        assert.equal(typeof spec.observe, 'function');
        assert.equal(typeof spec.checkStep, 'function');
        assert.ok(spec.invariants.length >= 3);
    }
    assert.deepEqual(specs.accumulation.checkpoints[1].actions, [{kind: 'number', label: 'Točka x', value: Math.PI, displayDecimals: 4}]);
    assert.equal(specs.convexity, undefined, 'convexity is a lesson-guided row, not a held-state spec');
});

function accumulationSample(x, phase) {
    const area = 1 - Math.cos(x), slope = Math.sin(x);
    const above = x > Math.PI ? 2 : area, below = x > Math.PI ? area - 2 : 0;
    const tangent = u => area + slope * (u - x);
    return {checkpoint: x, phase, observed: {
        inputValues: [{label: 'Spodnja meja a', value: '0'}, {label: 'Točka x', value: String(x)}],
        curves: [Math.sin, u => 1 - Math.cos(u), tangent].map(fn => ({samples: grid(-0.5, 6.5, fn)})),
        points: [{name: '$$x$$', x, y:0}, {name: '$$A(x)$$', x, y: area}, {name: '$$f(x)$$', x, y: slope}],
        readouts: {'signed-integral': String(area), slope: String(slope), 'below-axis': String(below), 'above-axis': String(above)},
        reveals: {'toggle-accumulation': 'true'},
        regions:[[false,0,Math.min(x,Math.PI)],[true,Math.PI,x]].filter(([,a,b])=>b>a).map(([negative,a,b])=>({dash:negative?2:0,
            points:[{x:a,y:0},...grid(a,b,Math.sin),{x:b,y:0}]})),
    }};
}

test('accumulation checkpoints independently enforce the integrand zero, antiderivative and signed negative contribution', () => {
    const first = accumulationSample(2, 'setup');
    specs.accumulation.checkStep(first, first, specs.accumulation);
    specs.accumulation.checkStep(accumulationSample(Math.PI, 'zero-integrand'), first, specs.accumulation);
    const negative = accumulationSample(4, 'negative-contribution');
    specs.accumulation.checkStep(negative, first, specs.accumulation);
    assert.ok(Math.abs((1 - Math.cos(4)) - (2 + (-1 - Math.cos(4)))) < 1e-12);
    const wrongTangent = accumulationSample(4, 'negative-contribution');
    wrongTangent.observed.curves[2].samples[30].y += 0.1;
    assert.throws(() => specs.accumulation.checkStep(wrongTangent, first, specs.accumulation), /Tangent to A/);
    const unsignedContribution = accumulationSample(4, 'negative-contribution');
    unsignedContribution.observed.readouts['below-axis'] = String(1 + Math.cos(4));
    assert.throws(() => specs.accumulation.checkStep(unsignedContribution, first, specs.accumulation), /Below-axis signed contribution/);
    const wrongPositive=accumulationSample(4,'negative-contribution');wrongPositive.observed.readouts['above-axis']='1.5';
    assert.throws(()=>specs.accumulation.checkStep(wrongPositive,first,specs.accumulation),/Positive contribution/);
    const noFill=accumulationSample(4,'negative-contribution');noFill.observed.regions=[];
    assert.throws(()=>specs.accumulation.checkStep(noFill,first,specs.accumulation),/filled region/);
});
