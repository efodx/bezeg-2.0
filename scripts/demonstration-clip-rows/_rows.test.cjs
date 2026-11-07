'use strict';
// Tests of the row contract: the schema (_schema.cjs), the state check (assessPathSteps and assessRowState) and the offline
// evidence check (assertRowEvidence, reached through assertMotionEvidence) on the stored records of the three published rows.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {validateRow, validateRows, validateRowAgainstRecipes} = require('./_schema.cjs');
const {assessPathSteps, SCHEDULE_STEP_LIMIT} = require('./_jump.cjs');
const {assessRowState, SURFACE_TOLERANCE, boardDragTolerance} = require('./_driver.cjs');
const {rows, rowsById} = require('./index.cjs');
const {assertMotionEvidence} = require('../demonstration-preview-motion.cjs').testSupport;

const clone = value => JSON.parse(JSON.stringify(value));
const rejects = (mutate, base, pattern) => {
    const row = clone(base);
    mutate(row);
    assert.throws(() => validateRow(row), pattern);
};

const sweep = rowsById['curve-offset'], drag = rowsById.reduction, surface = rowsById['patch-coons'];
const discrete = {id: 'x-discrete', motion: 'discrete-exact-steps', control: {kind: 'stepper', label: 'Povečaj n', step: 1}, path: [0, 1, 2, 0], lessonQuote: 'q', discreteReason: 'The stepper is an integer.'};

test('the shipped rows are valid and ids are unique', () => {
    assert.ok(rows.length >= 3);
    assert.doesNotThrow(() => validateRows(clone(rows)));
    assert.doesNotThrow(() => validateRow(discrete));
    assert.throws(() => validateRows([clone(sweep), clone(sweep)]), /duplicate row id curve-offset/);
});

test('the schema rejects each broken row with an actionable message', () => {
    rejects(row => { row.extra = 1; }, sweep, /exactly the fields/);
    rejects(row => { row.motion = 'wobble'; }, sweep, /motion must be one of/);
    rejects(row => { row.path = [-0.5]; }, sweep, /at least two waypoints/);
    rejects(row => { row.path = [-0.5, -0.15]; }, sweep, /must end at its start value/);
    rejects(row => { row.control.step = 0; }, sweep, /control\.step must be the control's step/);
    rejects(row => { row.discreteReason = 'because'; }, sweep, /discreteReason must be null/);
    rejects(row => { row.discreteReason = null; }, discrete, /must say why smooth motion is impossible/);
    rejects(row => { row.path = [1, 2, 0]; }, discrete, /first checkpoint is the poster scene/);
    rejects(row => { row.path = [0, 1, 2]; }, discrete, /must be 0 presses/);
    rejects(row => { row.path = [0, 0, 0]; }, discrete, /never presses the button/);
    rejects(row => { row.path = [0, 1]; }, discrete, /3 to 8 cumulative press counts/);
    rejects(row => { row.path = [[1.33, 2.67], [1.33, 3.3]]; }, drag, /must end where it started/);
    rejects(row => { row.control.kind = 'slider'; }, drag, /control\.kind must be point or surface-point/);
    rejects(row => { row.path = [[1, 1], [-16, -12], [1, 1]]; }, surface, /begins at \[0, 0\]/);
    const fine = Object.assign(clone(drag), {fineGrid: -8});
    assert.doesNotThrow(() => validateRow(fine));
    for (const bad of [0, 1, -9, -2.5, '-8']) rejects(row => { row.fineGrid = bad; }, fine, /fineGrid must be an integer from -8 to -1/);
    rejects(row => { row.fineGrid = -8; }, sweep, /fineGrid only applies to a pointer-drag row/);
    rejects(row => { row.control.kind = 'surface-point'; row.path = [[0, 0], [1, 1], [0, 0]]; }, fine, /fineGrid only applies to a board point/);
});

test('the state check follows the schedule and names the failure', () => {
    const scheduled = Array.from({length: 20}, (_, i) => i * 0.1);
    assert.equal(assessPathSteps({scheduled, observed: scheduled, tolerance: 1e-9}).ok, true);
    const off = scheduled.map((v, i) => i === 7 ? v + 0.5 : v);
    const deviating = assessPathSteps({scheduled, observed: off, tolerance: 1e-9});
    assert.equal(deviating.ok, false);
    assert.equal(deviating.worstFrame, 7);
    assert.match(deviating.reason, /discrete-exact-steps/);
    const jumpy = scheduled.map((v, i) => i === 10 ? v + 3 : v > 1 ? v + 3 : v);
    const cut = assessPathSteps({scheduled: jumpy, observed: jumpy, tolerance: 1e-9});
    assert.equal(cut.ok, false);
    assert.ok(cut.scheduleRatio > SCHEDULE_STEP_LIMIT);
    assert.match(cut.reason, /step .*x the typical step/);
    assert.equal(assessPathSteps({scheduled: [1, 1, 1], observed: [1, 1, 1], tolerance: 1e-9}).reason, 'the schedule never moves');
    assert.throws(() => assessPathSteps({scheduled: [1, 2], observed: [1], tolerance: 0}), /equal-length/);
    // Coordinate pairs are compared by distance.
    assert.equal(assessPathSteps({scheduled: [[0, 0], [1, 0], [2, 0]], observed: [[0, 0], [1, 0.5], [2, 0]], tolerance: 0.1}).ok, false);
});

test('the discrete state check needs the exact value at every frame and every checkpoint', () => {
    const samples = [0, 0, 1, 1, 2, 2, 0, 0].map((n, i) => ({checkpoint: [0, 0, 1, 1, 2, 2, 3, 3][i], target: n, actual: {input: n}, curvePathHash: `h${n}`, points: []}));
    assert.equal(assessRowState(discrete, samples, false).ok, true);
    const wrong = clone(samples);
    wrong[3].actual.input = 2;
    const failed = assessRowState(discrete, wrong, false);
    assert.equal(failed.ok, false);
    assert.match(failed.reason, /frame 3 shows 2 but its checkpoint expects 1/);
    const missing = samples.filter(s => s.checkpoint !== 2);
    assert.match(assessRowState(discrete, missing, false).reason, /a checkpoint has no frames/);
});

// The stored evidence of the published rows, as assertRowEvidence re-checks it offline.
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../demonstration-previews/manifest.json'), 'utf8'));
const stored = id => clone(manifest.motions.find(motion => motion.id === id));
const records = ['curve-offset', 'reduction', 'patch-coons'];

test('the stored evidence of every published row passes', () => {
    for (const id of records) assert.doesNotThrow(() => assertMotionEvidence(stored(id)), id);
});

test('assertRowEvidence names each broken contract', () => {
    const broken = (id, mutate, pattern) => {
        const motion = stored(id);
        mutate(motion);
        assert.throws(() => assertMotionEvidence(motion), pattern);
    };
    broken('curve-offset', m => { m.row.path = [-0.5, -0.2, -0.5]; }, /captured from an older row/);
    broken('curve-offset', m => { m.samples.at(-1).capture.sha256 = 'a'.repeat(64); }, /last frame differs from the first/);
    broken('curve-offset', m => { m.samples[40].cameraBox = m.samples[40].cameraBox.map(v => v + 1); }, /camera moved at frame 40/);
    broken('curve-offset', m => { m.samples[40].actual.input += 0.2; }, /control shows/);
    broken('curve-offset', m => { m.samples.forEach(s => { s.capture.sha256 = m.samples[0].capture.sha256; }); }, /only 1 distinct frames/);
    broken('curve-offset', m => { delete m.ignored; }, /missing the stored ignored text regions/);
    broken('curve-offset', m => { m.ignored.rects = [{x: 0, y: 0, width: 720, height: 440}]; }, /over the 25 percent limit/);
    broken('curve-offset', m => { m.ignored.ratio = 0.5; }, /stored ignored ratio .* is stale/);
    broken('curve-offset', m => { m.jump.steps[50] = m.jump.steps[50] * 20 + 5; }, /frames jump \(largest step .*text regions ignored/);
    broken('curve-offset', m => { m.jump.max += 1; }, /stored jump assessment is stale/);
    broken('curve-offset', m => { m.jump.steps.pop(); }, /missing stored frame steps/);
    broken('reduction', m => { m.samples[30].actual.x += 0.5; }, /not under the pointer|state check failed/);
    broken('patch-coons', m => { m.cameraHeld = false; }, /holds its camera/);
    broken('patch-coons', m => { m.samples[10].cameraSurface = {...m.samples[10].cameraSurface, az: m.samples[10].cameraSurface.az + 0.1}; }, /camera moved at frame 10/);
});

test('R1: an input change with an unchanged board fails at capture rule and offline', () => {
    const motion = stored('curve-offset');
    const i = motion.samples.findIndex((s, k) => k > 0 && s.actual.input !== motion.samples[k - 1].actual.input);
    assert.ok(i > 0);
    assert.equal(assessRowState(sweep, motion.samples, false).ok, true);
    motion.samples[i].curvePathHash = motion.samples[i - 1].curvePathHash;
    motion.samples[i].points = motion.samples[i - 1].points;
    const state = assessRowState(sweep, motion.samples, false);
    assert.equal(state.ok, false);
    assert.match(state.reason, new RegExp(`did not respond to the control at frame ${i}:`));
    assert.throws(() => assertMotionEvidence(motion), /did not respond to the control at frame/);
    // The discrete rule is the same.
    const frames = [0, 1].map(k => ({checkpoint: k, target: k, actual: {input: k}, curvePathHash: 'h', points: []}));
    assert.match(assessRowState({...discrete, path: [0, 1]}, frames, false).reason, /did not respond to the control at frame 1/);
});

test('a board drag may sit one thousandth of a CSS pixel from the pointer, no more', () => {
    const motion = stored('orientation');
    const perPixel = (motion.camera[2] - motion.camera[0]) / (motion.width / 2);
    assert.ok(Math.abs(boardDragTolerance(motion) - perPixel * 0.001) < 1e-12);
    assert.doesNotThrow(() => assertMotionEvidence(motion));
    motion.samples[40].actual.x += perPixel * 0.0005;
    motion.pathState = assessRowState(motion.row, motion.samples, false); // the stored state check is derived from the samples
    assert.doesNotThrow(() => assertMotionEvidence(motion));
    motion.samples[40].actual.x += perPixel * 0.0095;
    assert.throws(() => assertMotionEvidence(motion), /the point is not under the pointer at frame 40/);
});

test('R2 and R3: the surface tolerance is 0.05 px and follows the control kind, not the stored camera', () => {
    assert.equal(SURFACE_TOLERANCE, 0.05);
    const motion = stored('patch-coons');
    assert.equal(assessRowState(surface, motion.samples, true).ok, true);
    motion.samples[40].actual.x += 0.06;
    assert.equal(assessRowState(surface, motion.samples, true).ok, false);
    assert.throws(() => assertMotionEvidence(motion), /state check failed|not under the pointer/);
    // A tampered camera (still a valid surface camera, held in every frame) changes nothing: the tolerance follows control.kind.
    const retarget = (dx) => {
        const motion = stored('patch-coons');
        motion.camera = {...motion.camera, az: motion.camera.az + 0.1};
        motion.samples.forEach(s => { s.cameraSurface = motion.camera; });
        motion.samples[40].actual.x += dx;
        return motion;
    };
    assert.throws(() => assertMotionEvidence(retarget(0.06)), /state check failed|not under the pointer/);
    assert.throws(() => assertMotionEvidence(retarget(0.04)), /stored state check is stale/);
});

test('R5: a row id must be a Demonstration with a recipe and its control must suit the view', () => {
    const {recipes} = require('../demonstration-preview-recipes.cjs');
    for (const row of rows) assert.doesNotThrow(() => validateRowAgainstRecipes(row, recipes));
    assert.throws(() => validateRowAgainstRecipes({...clone(sweep), id: 'no-such-demonstration'}, recipes), /row no-such-demonstration: the id is not a Demonstration with a capture recipe/);
    assert.throws(() => validateRowAgainstRecipes({...clone(drag), id: 'patch-coons'}, recipes), /row patch-coons: control.kind "point" does not suit the surface view/);
    assert.throws(() => validateRowAgainstRecipes({...clone(surface), id: 'reduction'}, recipes), /row reduction: control.kind "surface-point" does not suit the board view/);
});

test('the row checker rejects what capture would only find later', () => {
    const {checkRow} = require('./_check.cjs');
    const lessons = [{file: 'lesson.ts', text: 'Premakni drsnik.'}];
    const entry = {
        controls: [
            {kind: 'slider', name: 'Razdalja d', min: '-3', max: '3', value: '-0.5', disabled: false},
            {kind: 'slider', name: 'Napetost', min: '0', max: '2', value: '1', disabled: true},
            {kind: 'button', name: 'Povečaj', disabled: false},
        ],
        draggablePoints: [{name: '$$p_{1}$$', x: 1, y: 2}],
    };
    const row = {lessonQuote: 'Premakni drsnik.', control: {kind: 'slider', label: 'Razdalja d'}, path: [-0.5, 0, -0.5]};
    const problems = change => checkRow({...row, ...change}, entry, lessons).problems.join('\n');
    assert.equal(problems({}), '');
    assert.match(problems({lessonQuote: 'Premakni drsnik levo.'}), /not exact lesson text/);
    assert.match(problems({control: {kind: 'slider', label: 'Neznano'}}), /no slider or number control/);
    assert.match(problems({control: {kind: 'slider', label: 'Napetost'}, path: [1, 1.5, 1]}), /is disabled/);
    assert.match(problems({path: [-0.5, 4, -0.5]}), /leaves the range/);
    assert.match(problems({control: {kind: 'stepper', label: 'Zmanjšaj'}, path: [0, 1, 0]}), /no enabled button/);
    assert.match(checkRow(row, undefined, lessons).problems.join('\n'), /not in route-probe/);
});
