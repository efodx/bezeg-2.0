const test = require('node:test');
const assert = require('node:assert/strict');
const {createMotionEvidenceValidator, motionSpecs, motionIds} = require('./demonstration-preview-motion.cjs').testSupport;
const captureApi = require('./demonstration-preview-capture-api.cjs');

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

test('capture consumers receive only motion generation and coverage queries', () => {
    assert.deepEqual(Object.keys(captureApi).sort(), ['assertMotionEvidence', 'generateMotions', 'isRecipeAligned', 'motionIds', 'recipeAlignedMotionIds']);
    assert.equal(captureApi.motionIds.length, 45);
    assert.equal(captureApi.motionIds.length, new Set(captureApi.motionIds).size);
    assert.equal(typeof captureApi.generateMotions, 'function');
    assert.equal(typeof captureApi.assertMotionEvidence, 'function');
    assert.equal('bernsteinPoint' in captureApi, false);
    assert.deepEqual([...captureApi.recipeAlignedMotionIds()].sort(), Object.entries(motionSpecs)
        .filter(([, spec]) => spec.recipeAligned).map(([id]) => id).sort());
    const start = motionSpecs.decasteljau.sweep.start;
    assert.equal(Object.isFrozen(motionSpecs.decasteljau.sweep), true);
    assert.equal(Object.isFrozen(motionSpecs.decasteljau.sweep.waypoints), true);
    assert.equal(Reflect.set(motionSpecs.decasteljau.sweep, 'start', start + 0.1), false);
    assert.equal(motionSpecs.decasteljau.sweep.start, start, 'Nested production timeline data must be immutable');
    assert.throws(() => captureApi.assertMotionEvidence({id: 'not-a-motion', samples: []}), /undefined !== 96/);
});

test('generic checkpoint evidence rejects camera drift, missing holds, wrong math and a nonseamless loop', () => {
    const id = 'checkpoint-runner-test';
    const fixtureSpec = {
        checkpoints: [{value: 2}, {value: 4}, {value: 2}], holds: [24, 48, 24],
        checkStep(sample) {assert.equal(sample.observed.square, sample.checkpoint ** 2);},
    };
    const validateFixture = createMotionEvidenceValidator({[id]: fixtureSpec});
    fixtureSpec.checkpoints[1].value = 9;
    assert.equal(Object.hasOwn(motionSpecs, id), false, 'Fixture must not be added to the production registry');
    const fixture = () => ({
        id, mode: 'discrete-exact-steps', frameCount: 96, sampleRate: 24, duration: 4, camera: [-1, 1, 1, -1],
        samples: [2, 4, 2].map((value, index) => ({
            checkpoint: value, firstFrame: [0, 24, 72][index], holdFrames: [24, 48, 24][index],
            state: {box: [-1, 1, 1, -1]}, capture: {sha256: value === 2 ? 'recipe' : 'changed'},
            observed: {square: value ** 2},
        })),
    });
    assert.doesNotThrow(() => validateFixture(fixture()));
    const rounded = fixture(); rounded.samples[1].state.box[0] += 1e-14;
    assert.doesNotThrow(() => validateFixture(rounded));
    let motion = fixture(); motion.samples[1].state.box[0] = -2;
    assert.throws(() => validateFixture(motion), /Camera/);
    motion = fixture(); motion.samples[1].holdFrames = 47;
    assert.throws(() => validateFixture(motion), /hold/);
    motion = fixture(); motion.samples[1].observed.square = 15;
    assert.throws(() => validateFixture(motion));
    motion = fixture(); motion.samples[2].capture.sha256 = 'different';
    assert.throws(() => validateFixture(motion), /recipe PNG/);
    assert.equal(Object.hasOwn(motionSpecs, id), false, 'Evidence validation must leave the production registry intact');
});
