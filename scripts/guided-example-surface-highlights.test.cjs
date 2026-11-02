'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {verifySurfaceHighlight, surfaceSignature} = require('./guided-example-surface-evidence.cjs');
const {validateInventory, validateRecipe, recipeFingerprint, assertCaptureMatchesRecipe} = require('./guided-example-preview-api.cjs');
const {resolvePatchRecipe} = require('./generate-guided-example-inventory.cjs');
const {assertSurfaceRecipeSteps} = require('./capture-guided-example-previews.cjs');

const camera = {az: 0.4, el: 0.7, distance: 8, target: [0, 0, 0]};
const samples = [[0.25, -0.5, 0.75], [0.3, -0.4, 0.8], [0.4, -0.3, 0.9]];
const expectedSurface = (shift = 0) => ({camera: {...camera}, owners: [{id: 'tensor-patch-0', kind: 'tensor',
    geometrySamples: samples.map(([x, y, z]) => [x + shift, y, z])}]});
const evidence = (shift = 0) => ({surfaceRenderer: 'jsx-svg', renderedOwners: expectedSurface(shift).owners,
    framing: {width: 360, height: 220, camera: {...camera}, meshBounds: {left: 50, top: 40, right: 300, bottom: 190, inFrustum: true},
        points: [{id: 'P00', x: 142, y: 103, inFrustum: true}]}});
const recipe = (overrides = {}) => ({kind: 'highlight', frame: 'f', position: {step: 0, frame: 0}, steps: [], expectChange: false,
    checks: {surface: expectedSurface()}, ...overrides});
const entry = overrides => ({id: 'bezier-patches.x.patch-tensor', recipe: recipe(overrides)});

test('surface highlight passes when the settled surface equals the checks and the start, expectChange false', () => {
    const highlight = verifySurfaceHighlight(entry(), evidence(), evidence());
    assert.equal(highlight.changedFromStart, false);
    assert.deepEqual(highlight.checks.map(check => check.name), ['owner:tensor-patch-0', 'camera']);
    assert.equal(highlight.evidence.visibleElementCount, 1);
});

test('expectChange is enforced both ways against the start surface', () => {
    assert.throws(() => verifySurfaceHighlight(entry({expectChange: true}), evidence(), evidence()), /expects the surface to change/);
    assert.throws(() => verifySurfaceHighlight(entry({checks: {surface: expectedSurface(0.5)}}), evidence(), evidence(0.5)), /stays as in the start scene/);
    const changed = verifySurfaceHighlight(entry({expectChange: true, checks: {surface: expectedSurface(0.5)}}), evidence(), evidence(0.5));
    assert.equal(changed.changedFromStart, true);
    assert.notEqual(surfaceSignature(evidence()), surfaceSignature(evidence(0.5)));
});

test('surface highlight fails on wrong, missing or empty evidence', () => {
    assert.throws(() => verifySurfaceHighlight(entry(), evidence(), evidence(0.5)), /geometry sample 0 differs/);
    assert.throws(() => verifySurfaceHighlight(entry(), evidence(), {...evidence(), renderedOwners: []}), /rendered owners are empty/);
    assert.throws(() => verifySurfaceHighlight(entry(), evidence(), {...evidence(), renderedOwners: [{...evidence().renderedOwners[0], id: 'other'}]}), /missing expected owner/);
    assert.throws(() => verifySurfaceHighlight(entry(), evidence(), {...evidence(), framing: undefined}), /invalid published framing/);
    assert.throws(() => verifySurfaceHighlight(entry({checks: {types: {curve: 1}}}), evidence(), evidence()), /no checks\.surface/);
    assert.throws(() => verifySurfaceHighlight({id: 'x', recipe: {kind: 'start'}}, evidence(), evidence()), /needs a highlight recipe/);
    const wrongCamera = {...evidence(), framing: {...evidence().framing, camera: {...camera, distance: 9}}};
    assert.throws(() => verifySurfaceHighlight(entry(), evidence(), wrongCamera), /camera differs/);
});

test('a surface recipe record validates as a capture and a mismatching change record is refused', () => {
    const highlight = verifySurfaceHighlight(entry(), evidence(), evidence());
    const full = recipe();
    const inventoryEntry = {id: 'bezier-patches.x.patch-tensor', recipe: full, recipeFingerprint: recipeFingerprint(full)};
    const capture = {recipe: full, recipeFingerprint: inventoryEntry.recipeFingerprint, highlight, viewport: {width: 1440, height: 920}, deviceScaleFactor: 2};
    assert.doesNotThrow(() => assertCaptureMatchesRecipe(inventoryEntry, capture));
    const flipped = {...capture, highlight: {...highlight, resultFingerprint: surfaceSignature(evidence(0.5)), changedFromStart: true}};
    assert.throws(() => assertCaptureMatchesRecipe(inventoryEntry, flipped), /expects no board change/);
    assert.doesNotThrow(() => validateRecipe('x', full));
    assert.throws(() => validateRecipe('x', {...full, checks: {}}), /needs at least one expected-geometry check/);
});

test('surface routes accept only goto-frame and frame-action recipe steps', () => {
    const steps = [{kind: 'goto-frame', frame: 'a', position: {step: 0, frame: 1}}, {kind: 'frame-action', frame: 'a', position: {step: 0, frame: 1}, label: 'L'}];
    assert.doesNotThrow(() => assertSurfaceRecipeSteps(entry({steps})));
    for (const step of [{kind: 'explore'}, {kind: 'select-tab', tab: 'edit'}, {kind: 'set-control', control: 'checkbox', label: 'a', value: true}]) {
        assert.throws(() => assertSurfaceRecipeSteps(entry({steps: [step]})), /not supported on surface routes/);
    }
});

const lesson = {steps: [{id: 'scene-a', frames: [{id: 'one'}, {id: 'two'}]}, {id: 'scene-b', frames: [{id: 'three'}]}]};
const patchExample = {id: 'bezier-patches.x.patch-tensor', steps: [{stepId: 'scene-a', expected: {surface: expectedSurface()}}, {stepId: 'scene-b', expected: {surface: expectedSurface(1)}}]};
const authored = (frame, surfaceStep, steps = []) => ({kind: 'highlight', frame, steps, expectChange: false, checks: {surfaceStep}});

test('patch recipes resolve checks.surfaceStep to the independently computed expected surface of the final frame step', () => {
    const resolved = resolvePatchRecipe(patchExample, lesson, authored('two', 'scene-a'));
    assert.deepEqual(resolved.checks, {surface: expectedSurface()});
    assert.deepEqual(resolved.position, {step: 0, frame: 1});
    // The step is taken from the frame the lesson ends on after the recipe steps.
    const moved = resolvePatchRecipe(patchExample, lesson, authored('one', 'scene-b', [{kind: 'goto-frame', frame: 'three'}]));
    assert.deepEqual(moved.checks, {surface: expectedSurface(1)});
    assert.deepEqual(resolvePatchRecipe(patchExample, lesson, undefined), {kind: 'start'});
});

test('patch recipes reject a wrong, missing or extra surface check and an unknown frame', () => {
    assert.throws(() => resolvePatchRecipe(patchExample, lesson, authored('one', 'scene-b')), /is not the step "scene-a"/);
    assert.throws(() => resolvePatchRecipe(patchExample, lesson, {...authored('one', 'scene-a'), checks: {curveCount: 1}}), /needs checks\.surfaceStep/);
    assert.throws(() => resolvePatchRecipe(patchExample, lesson, {...authored('one', 'scene-a'), checks: {surfaceStep: 'scene-a', points: [[0, 0]]}}), /may only name surfaceStep/);
    assert.throws(() => resolvePatchRecipe(patchExample, lesson, authored('nope', 'scene-a')), /unknown frame "nope"/);
    assert.throws(() => resolvePatchRecipe({...patchExample, steps: []}, lesson, authored('one', 'scene-a')), /no expected surface was computed/);
});

test('the generated patches inventory carries a surface highlight recipe for every example', () => {
    const file = path.join(__dirname, '..', 'docs/reviews/bezier-patches/guided-example-inventory.json');
    const {examples} = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(examples.length, 11);
    for (const example of examples) {
        assert.equal(example.recipe.kind, 'highlight', example.id);
        const surface = example.steps[example.recipe.position.step].expected.surface;
        assert.deepEqual(example.recipe.checks, {surface}, example.id);
        assert.equal(example.recipe.expectChange, false, example.id);
        assert.equal(example.recipeFingerprint, recipeFingerprint(example.recipe), example.id);
    }
    assert.doesNotThrow(() => validateInventory(examples));
});
