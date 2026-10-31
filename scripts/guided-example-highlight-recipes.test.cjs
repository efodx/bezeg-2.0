const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const api = require('./guided-example-preview-api.cjs');
const {validateInventory, validateRecipe, validatePublishedSet, validateRetained, recipeFingerprint, parseGuidedProgress,
    navigationDirection, verifyHighlight, recipeRecord} = api;
const {resolveRecipe, withRecipe} = require('./generate-guided-example-inventory.cjs');
const {reachFrame, applyHighlightRecipe, fingerprintInventory} = require('./capture-guided-example-previews.cjs');

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const root = path.resolve(__dirname, '..');

// A lesson with steps of 2, 1 and 2 frames; frames "weights" and "result" carry authored actions.
const lesson = {steps: [
    {id: 's1', frames: [{id: 'intro'}, {id: 'weights', action: {label: {sl: 'Povečaj utež', en: 'Raise weight'}, action: {kind: 'weight'}}}]},
    {id: 's2', frames: [{id: 'middle'}]},
    {id: 's3', action: {label: {sl: 'Pokaži rezultat', en: 'Show result'}, action: {kind: 'result'}}, frames: [{id: 'tail'}, {id: 'result'}]},
]};
const authored = (overrides = {}) => ({kind: 'highlight', frame: 'weights', steps: [{kind: 'frame-action'}], expectChange: true,
    checks: {types: {curve: 1}, curveCount: 1}, ...overrides});
const entryWith = (recipe, overrides = {}) => ({...withRecipe({id: 'foundations.sample', demonstrationId: 'bernstein',
    path: '/bezeg-2.0/bernstein?example=family.foundations.sample.bernstein', sceneFingerprint: digest('scene')}, recipe), ...overrides});
const board = (curve, extra = {}) => ({visibleCount: 2, types: {curve: 1, point: 1}, points: [[0, 0]], curves: [curve], ...extra});
const lineA = [[0, 0], [0.5, 0.5], [1, 1]], lineB = [[0, 0], [0.5, 0.2], [1, 1]];

test('a recipe resolves frame ids and frame actions against the example lesson and an omitted recipe is an explicit start', () => {
    assert.deepEqual(resolveRecipe('x', lesson, undefined), {kind: 'start'});
    const resolved = resolveRecipe('x', lesson, authored({steps: [{kind: 'frame-action'}, {kind: 'goto-frame', frame: 'result'}, {kind: 'frame-action'}]}));
    assert.deepEqual(resolved.position, {step: 0, frame: 1});
    assert.deepEqual(resolved.steps.map(step => [step.kind, step.frame, step.label]),
        [['frame-action', 'weights', 'Povečaj utež'], ['goto-frame', 'result', undefined], ['frame-action', 'result', 'Pokaži rezultat']]);
    assert.deepEqual(resolved.steps[1].position, {step: 2, frame: 1});
    // Fingerprint is carried into the entry and changes with every recipe field.
    const base = withRecipe({id: 'x'}, resolved).recipeFingerprint;
    for (const change of [{expectChange: false}, {checks: {types: {curve: 2}}}, {steps: [{kind: 'frame-action'}, {kind: 'frame-action'}]}, {frame: 'intro', steps: []}]) {
        assert.notEqual(withRecipe({id: 'x'}, resolveRecipe('x', lesson, authored(change))).recipeFingerprint, base, JSON.stringify(change));
    }
});

test('unknown frames, missing actions, unknown kinds and empty checks are rejected with actionable messages', () => {
    assert.throws(() => resolveRecipe('x', lesson, authored({frame: 'nope'})), /unknown frame "nope"; lesson frames are: intro, weights/);
    assert.throws(() => resolveRecipe('x', lesson, authored({steps: [{kind: 'goto-frame', frame: 'nope'}]})), /recipe step 1 names unknown frame/);
    assert.throws(() => resolveRecipe('x', lesson, authored({frame: 'intro'})), /recipe step 1 presses the action of frame "intro", which has no authored action/);
    assert.throws(() => resolveRecipe('x', lesson, authored({steps: [{kind: 'drag'}]})), /unknown kind "drag"/);
    assert.throws(() => resolveRecipe('x', lesson, {kind: 'whatever'}), /unknown recipe kind/);
    assert.throws(() => resolveRecipe('x', lesson, authored({checks: {}})), /at least one expected-geometry check/);
    assert.throws(() => resolveRecipe('x', lesson, authored({expectChange: undefined})), /expectChange true or false/);
    assert.throws(() => resolveRecipe('x', {steps: [{id: 'a', frames: [{id: 'dup'}, {id: 'dup'}]}]}, authored({frame: 'dup', steps: []})), /ambiguous/);
});

test('inventory validation requires an explicit recipe, a matching fingerprint and rejects an empty inventory', () => {
    const entry = entryWith({kind: 'start'});
    assert.doesNotThrow(() => validateInventory([entry]));
    const {recipe: _recipe, recipeFingerprint: _fingerprint, ...withoutRecipe} = entry;
    assert.throws(() => validateInventory([withoutRecipe]), /missing recipe/);
    assert.throws(() => validateInventory([{...entry, recipeFingerprint: digest('other')}]), /does not match the recipe/);
    assert.throws(() => validateInventory([{...entry, recipe: {kind: 'start', frame: 'x'}}]), /start recipe must not carry/);
    assert.throws(() => validateInventory([]), /nonempty array/);
});

test('the completeness gates fail on an empty inventory', () => {
    assert.throws(() => validatePublishedSet([], [], '.'), /completeness gate cannot pass on an empty inventory/);
    assert.throws(() => validateRetained([], {captures: []}, '.', [], {}), /completeness gate cannot pass on an empty inventory/);
});

test('the fingerprint of a start entry is unchanged by recipes while a highlight recipe changes it', () => {
    const start = entryWith({kind: 'start'});
    const legacy = (({recipe: _recipe, recipeFingerprint: _fingerprint, ...rest}) => rest)(start);
    assert.equal(fingerprintInventory([start]), fingerprintInventory([legacy]));
    const highlight = entryWith(resolveRecipe('x', lesson, authored()));
    const edited = entryWith(resolveRecipe('x', lesson, authored({checks: {types: {curve: 2}}})));
    assert.notEqual(fingerprintInventory([highlight]), fingerprintInventory([start]));
    assert.notEqual(fingerprintInventory([highlight]), fingerprintInventory([edited]));
});

test('guided progress parsing and navigation direction follow the lesson order', () => {
    assert.deepEqual(parseGuidedProgress('Korak 2 od 3 · Okvir 1 od 2'), {step: 1, frame: 0, steps: 3, frames: 2});
    assert.equal(parseGuidedProgress('Lekcija je končana'), undefined);
    assert.equal(navigationDirection({step: 0, frame: 1}, {step: 1, frame: 0}), 'next');
    assert.equal(navigationDirection({step: 1, frame: 0}, {step: 0, frame: 1}), 'back');
    assert.equal(navigationDirection({step: 1, frame: 0}, {step: 1, frame: 0}), null);
});

test('highlight verification fails on an unchanged board when change is expected, an empty board and failed geometry checks', () => {
    const entry = entryWith(resolveRecipe('x', lesson, authored({checks: {types: {curve: 1}, curves: [lineB]}})));
    const record = verifyHighlight(entry, board(lineA), board(lineB));
    assert.equal(record.changedFromStart, true);
    assert.notEqual(record.startFingerprint, record.resultFingerprint);
    assert.deepEqual(record.checks.map(check => check.passed), [true, true]);
    assert.throws(() => verifyHighlight(entry, board(lineB), board(lineB)), /expects the board to change from the start scene, but the highlight state is identical/);
    assert.throws(() => verifyHighlight(entry, board(lineA), {visibleCount: 0, types: {}, points: [], curves: []}), /empty board/);
    assert.throws(() => verifyHighlight(entry, board(lineA), board(lineA)), /missing prepared curve samples|expects the board to change/);
    assert.throws(() => verifyHighlight(entryWith(resolveRecipe('x', lesson, authored({checks: {types: {curve: 3}}}))), board(lineA), board(lineB)), /expected 3 visible curve/);
    const keep = entryWith(resolveRecipe('x', lesson, authored({expectChange: false})));
    assert.equal(verifyHighlight(keep, board(lineA), board(lineA)).changedFromStart, false);
    assert.throws(() => verifyHighlight(keep, board(lineA), board(lineB)), /stays as in the start scene, but the highlight state differs/);
});

test('published captures fail when the recipe changed since capture, the highlight record is invalid, or a file is missing or edited', t => {
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'guided-example-highlight-'));
    t.after(() => fs.rmSync(destination, {recursive: true, force: true}));
    const entry = entryWith(resolveRecipe('x', lesson, authored()));
    const highlight = verifyHighlight(entry, board(lineA), board(lineB));
    const capture = {id: entry.id, demonstrationId: entry.demonstrationId, path: entry.path, sceneFingerprint: entry.sceneFingerprint,
        ...recipeRecord(entry, highlight), file: `${entry.id}.png`, sha256: digest('png')};
    assert.throws(() => validatePublishedSet([entry], [capture], destination), /missing preview asset/);
    fs.writeFileSync(path.join(destination, capture.file), 'png');
    assert.doesNotThrow(() => validatePublishedSet([entry], [capture], destination));
    const edited = entryWith(resolveRecipe('x', lesson, authored({checks: {types: {curve: 1}, curveCount: 1, points: [[0, 0]]}})));
    assert.throws(() => validatePublishedSet([edited], [capture], destination), /recipe changed since capture/);
    assert.throws(() => validatePublishedSet([entry], [{...capture, recipeFingerprint: undefined, recipe: undefined}], destination), /recipe changed since capture \(or the capture predates recipes\)/);
    assert.throws(() => validatePublishedSet([entry], [{...capture, recipe: {...capture.recipe, expectChange: false}}], destination), /recorded recipe differs/);
    const unchanged = {...capture, highlight: {...highlight, resultFingerprint: highlight.startFingerprint, changedFromStart: false}};
    assert.throws(() => validatePublishedSet([entry], [unchanged], destination), /expects a board change but the captured highlight equals the start scene/);
    assert.throws(() => validatePublishedSet([entry], [{...capture, highlight: {...highlight, checks: []}}], destination), /geometry checks are missing or failed/);
    assert.throws(() => validatePublishedSet([entry], [{...capture, highlight: {...highlight, evidence: {visibleElementCount: 0}}}], destination), /highlight board is empty/);
    assert.throws(() => validatePublishedSet([entry], [{...capture, highlight: undefined}], destination), /highlight capture evidence is missing/);
    assert.throws(() => validatePublishedSet([entry], [{...capture, deviceScaleFactor: 1}], destination), /capture scale is not recorded/);
    fs.writeFileSync(path.join(destination, capture.file), 'mutated');
    assert.throws(() => validatePublishedSet([entry], [capture], destination), /checksum mismatch/);
});

function fakePage(frameCounts, actions = {}) {
    const state = {step: 0, frame: 0, pressed: [], clicks: 0};
    const atEnd = () => state.step === frameCounts.length - 1 && state.frame === frameCounts[state.step] - 1;
    const control = (selector, role) => ({
        innerText: async () => `Korak ${state.step + 1} od ${frameCounts.length} · Okvir ${state.frame + 1} od ${frameCounts[state.step]}`,
        click: async () => {
            state.clicks++;
            if (selector.includes('nav-next') && !atEnd()) {
                if (state.frame < frameCounts[state.step] - 1) state.frame++; else { state.step++; state.frame = 0; }
            } else if (selector.includes('nav-back') && (state.step || state.frame)) {
                if (state.frame > 0) state.frame--; else { state.step--; state.frame = frameCounts[state.step] - 1; }
            } else if (role) {
                if (actions[`${state.step}.${state.frame}.${role}`] === undefined) throw new Error(`no button "${role}" here`);
                state.pressed.push(role);
            }
        },
        count: async () => (actions[`${state.step}.${state.frame}.${role}`] === undefined ? 0 : 1),
    });
    return {state, evaluate: async () => undefined,
        locator: selector => selector === '.guided-lesson-actions'
            ? {getByRole: (_role, {name}) => control(selector, name)} : control(selector)};
}

test('the runner reaches frames with navigation, applies steps in order, and fails on unreachable frames or failed steps', async () => {
    const entry = entryWith(resolveRecipe('x', lesson, authored({steps: [{kind: 'frame-action'}, {kind: 'goto-frame', frame: 'result'}, {kind: 'frame-action'}]})));
    const actions = {'0.1.Povečaj utež': true, '2.1.Pokaži rezultat': true};
    const page = fakePage([2, 1, 2], actions);
    await applyHighlightRecipe(page, entry);
    assert.deepEqual(page.state.pressed, ['Povečaj utež', 'Pokaži rezultat']);
    assert.deepEqual([page.state.step, page.state.frame], [2, 1]);
    // Going back is supported.
    const back = fakePage([2, 1, 2], {'0.1.Povečaj utež': true});
    await reachFrame(back, 'x', {step: 2, frame: 1});
    await reachFrame(back, 'x', {step: 0, frame: 1});
    assert.deepEqual([back.state.step, back.state.frame], [0, 1]);
    // A frame beyond the end of the lesson as rendered in the browser is unreachable.
    await assert.rejects(() => reachFrame(fakePage([2, 1, 2]), 'x', {step: 5, frame: 0}, 'recipe frame "ghost"'), /recipe frame "ghost" is unreachable/);
    // A missing action button fails the step with the step number and the button label.
    await assert.rejects(() => applyHighlightRecipe(fakePage([2, 1, 2], {}), entry), /recipe step 1 \(frame-action weights\) failed: frame action button "Povečaj utež" is not present exactly once/);
    // A frame-action step on the wrong frame fails instead of pressing something else.
    const wrongFrame = entryWith({...resolveRecipe('x', lesson, authored()), position: {step: 0, frame: 0}});
    await assert.rejects(() => applyHighlightRecipe(fakePage([2, 1, 2], actions), wrongFrame), /recipe step 1 .* failed: lesson is not on frame "weights"/);
});

test('the committed retained and patch manifests still validate against their inventories with explicit start recipes', () => {
    for (const [inventoryFile, destination] of [['docs/reviews/illustrated-chapter-examples/capture-inventory.json', 'src/images/learning/examples'],
        ['docs/reviews/bezier-patches/guided-example-inventory.json', 'src/images/learning/examples/patches']]) {
        const inventory = validateInventory(JSON.parse(fs.readFileSync(path.join(root, inventoryFile), 'utf8')).examples);
        assert.ok(inventory.every(entry => entry.recipe.kind === 'start'), inventoryFile);
        const manifest = JSON.parse(fs.readFileSync(path.join(root, destination, 'manifest.json'), 'utf8'));
        assert.doesNotThrow(() => validatePublishedSet(inventory, manifest.captures, path.join(root, destination)), inventoryFile);
    }
});

test('validateRecipe accepts a minimal start recipe only in its explicit form', () => {
    assert.deepEqual(validateRecipe('x', {kind: 'start'}), {kind: 'start'});
    assert.equal(recipeFingerprint({kind: 'start'}), recipeFingerprint({kind: 'start'}));
});
