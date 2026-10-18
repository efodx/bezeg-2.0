const test = require('node:test');
const assert = require('node:assert/strict');
const {assertMotionEvidence, motionSpecs, motionIds} = require('./demonstration-preview-motion.cjs');

test('every shipped demonstration has a configured motion timeline', () => {
    const catalog = require('../tests/smoke-catalog.cjs');
    assert.equal(new Set(motionIds).size, motionIds.length);
    assert.deepEqual([...motionIds].sort(), catalog.map(d => d.id).sort());
    for (const [id, spec] of Object.entries(motionSpecs).filter(([, spec]) => spec.recipeAligned)) {
        assert.equal(typeof spec.schedule?.kind, 'string', `${id} needs a manifest schedule`);
        assert.ok(spec.invariants?.length, `${id} needs documented mathematical invariants`);
        if (spec.checkpoints && spec.conceptStatus !== 'blocked') {
            assert.ok(spec.holds.at(-2)>spec.holds.at(-1),`${id} must emphasize its discovery longer than its reset`);
            assert.equal(spec.schedule.resetFrame,spec.holds.slice(0,-1).reduce((sum,hold)=>sum+hold,0),`${id} must record the real reset frame`);
        }
        if (spec.mode === 'pointer-drag') {
            assert.ok(Number.isInteger(spec.schedule.press) && Number.isInteger(spec.schedule.release), `${id} needs pointer timing`);
            assert.equal(typeof spec.restore, 'function', `${id} needs a supported restore action`);
        }
    }
});

test('generic checkpoint evidence rejects camera drift, missing holds, wrong math and a nonseamless loop', () => {
    const id = 'checkpoint-runner-test';
    motionSpecs[id] = {
        checkpoints: [{value: 2}, {value: 4}, {value: 2}], holds: [24, 48, 24],
        checkStep(sample) {assert.equal(sample.observed.square, sample.checkpoint ** 2);},
    };
    const fixture = () => ({
        id, mode: 'discrete-exact-steps', frameCount: 96, sampleRate: 24, duration: 4, camera: [-1, 1, 1, -1],
        samples: [2, 4, 2].map((value, index) => ({
            checkpoint: value, firstFrame: [0, 24, 72][index], holdFrames: [24, 48, 24][index],
            state: {box: [-1, 1, 1, -1]}, capture: {sha256: value === 2 ? 'recipe' : 'changed'},
            observed: {square: value ** 2},
        })),
    });
    try {
        assert.doesNotThrow(() => assertMotionEvidence(fixture()));
        const rounded = fixture(); rounded.samples[1].state.box[0] += 1e-14;
        assert.doesNotThrow(() => assertMotionEvidence(rounded));
        let motion = fixture(); motion.samples[1].state.box[0] = -2;
        assert.throws(() => assertMotionEvidence(motion), /Camera/);
        motion = fixture(); motion.samples[1].holdFrames = 47;
        assert.throws(() => assertMotionEvidence(motion), /hold/);
        motion = fixture(); motion.samples[1].observed.square = 15;
        assert.throws(() => assertMotionEvidence(motion));
        motion = fixture(); motion.samples[2].capture.sha256 = 'different';
        assert.throws(() => assertMotionEvidence(motion), /recipe PNG/);
    } finally {delete motionSpecs[id];}
});
