'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {validateSurfaceEvidence} = require('./guided-example-surface-evidence.cjs');
const {sections, evaluateTensor, evaluateTriangle, expectedSamples, validatePatchInventory, generatePatchGuidedExampleInventory} = require('./patch-guided-example-expectations.cjs');

const view3d = {az: 0.72, el: 0.48, distance: 5.5, target: {x: 0.5, y: 0.5, z: 0.5}};
function tensorFixture() { return {kind: 'tensor', m: 1, n: 1, net: [
    {x: 0, y: 0, z: 0}, {x: 0, y: 1, z: 0}, {x: 1, y: 0, z: 0}, {x: 1, y: 1, z: 1},
]}; }
function triangleFixture() {
    const net = [];
    for (let i = 3; i >= 0; i--) for (let j = 3 - i; j >= 0; j--) {
        const k = 3 - i - j;
        net.push({i, j, k, x: i / 3, y: j / 3, z: i === 1 && j === 1 && k === 1 ? 4.5 : 0});
    }
    return {kind: 'triangular', n: 3, net};
}
function makeRegistry() {
    return Object.fromEntries(sections.map(section => {
        const patch = section === 'triangular-patches' || section === 'square-vs-triangular' ? triangleFixture() : tensorFixture();
        const demonstrationId = section.includes('triangular') ? 'patch-triangular' : section === 'tensor-joins' ? 'patch-joins' : 'patch-tensor';
        const actions = section === 'tensor-joins'
            ? [{kind: 'prepared-scene'}, {kind: 'patch-join-scene', scene: 'join-c0-kink'}]
            : [{kind: 'prepared-scene', sceneId: `${section}-fixture`, source: 'lesson-patch-fixture', patch, view3d}];
        const steps = section === 'tensor-joins'
            ? ['join-c0-kink', 'join-c1', 'join-g1', 'join-teapot'].map((scene, index) => ({id: `${section}-step-${index + 1}`, scene: {actions: [
                {kind: 'prepared-scene'}, {kind: 'patch-join-scene', scene: scene === 'join-g1' ? 'join-c1' : scene},
                ...(scene === 'join-g1' ? [{kind: 'patch-join-mode', mode: 'g1', alpha: 2}] : []),
            ]}}))
            : [{id: `${section}-step`, scene: {actions}}];
        return [section, {demonstrationId, steps}];
    }));
}
const joinScene = [['TensorProductBezierPatch', {m: 1, n: 1, net: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
    state: {...view3d, camera: {az: -0.9, el: 0.5, distance: 8, target: [0.5, 0.5, 0.5]},
        mB: 1, nB: 1, netB: [[1, 0, 0], [1, 1, 0], [2, 0, 1], [2, 1, 1]]}}]];
const c1Scene = structuredClone(joinScene);
c1Scene[0][1].state.camera.distance = 12;
const g1Scene = structuredClone(c1Scene);
g1Scene[0][1].state.camera.distance = 18;
g1Scene[0][1].state.netB[2][2] = 3;
g1Scene[0][1].state.netB[3][2] = 3;
const options = {joinScenes: {'join-c0-kink': joinScene, 'join-c1': c1Scene, 'join-g1': g1Scene,
    'join-teapot': [['TensorProductBezierPatch', {m: 1, n: 1, net: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
        state: {...view3d, camera: {az: -0.9, el: 0.5, distance: 8, target: [0.5, 0.5, 0.5]}, joinCapstone: 'teapot'}}]]},
    teapotPatches: Array.from({length: 32}, () => Array.from({length: 4}, (_, i) =>
        Array.from({length: 4}, (_, j) => [i / 3, j / 3, i === 1 && j === 1 ? 0.5 : 0]))),
    pathForSection: section => {
    const demo = makeRegistry()[section].demonstrationId;
    const suffix = demo.slice('patch-'.length);
    return `/bezeg-2.0/patches/${suffix}?example=lesson.bezier-patches.${section}.${demo}`;
}};

test('independent Bernstein sums preserve tensor and triangular fixture meaning', () => {
    assert.deepEqual(evaluateTensor(tensorFixture(), 0.5, 0.5), [0.5, 0.5, 0.25]);
    const centroid = evaluateTriangle(triangleFixture(), 1 / 3, 1 / 3);
    assert.ok(centroid.every((value, index) => Math.abs(value - [1 / 3, 1 / 3, 1][index]) < 1e-14));
});

test('teapot sampling pins density eight and filters collapsed cusp faces before Float32 upload', () => {
    const curved = {kind: 'tensor', m: 3, n: 3, net: []};
    const cusp = {kind: 'tensor', m: 3, n: 3, net: []};
    for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++) {
        curved.net.push({x: i / 3, y: j / 3, z: (i * j + i * i) / 9});
        cusp.net.push({x: i / 3, y: i === 0 ? j * 5e-13 : j / 3, z: (i * j + i * i) / 9});
    }
    const teapotMesh = {coincidentTolerance: 1e-12, float32: true, roundSamples: true};
    assert.notDeepEqual(expectedSamples(curved, 8, teapotMesh), expectedSamples(curved, 16, teapotMesh),
        'eight-cell teapot sampling selects different first/middle/last owner faces than density sixteen');
    assert.notDeepEqual(expectedSamples(cusp, 8), expectedSamples(cusp, 8, {coincidentTolerance: 1e-12}),
        'near-coincident cusp faces are dropped using the teapot scene tolerance before renderer upload');
});

test('patch inventory preserves step cameras while deriving geometry from authored join modes', () => {
    const inventory = generatePatchGuidedExampleInventory(makeRegistry(), options);
    assert.equal(inventory.examples.length, 11);
    assert.equal(inventory.examples[0].path, '/bezeg-2.0/patches/tensor?example=lesson.bezier-patches.curve-to-patch.patch-tensor');
    assert.equal(inventory.examples.at(-1).path, '/bezeg-2.0/patches/triangular?example=lesson.bezier-patches.square-vs-triangular.patch-triangular');
    assert.throws(() => generatePatchGuidedExampleInventory(makeRegistry(), {joinScene}), /published section route resolver/);
    assert.match(inventory.examples[0].sceneFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(inventory.examples.at(-1).expected.surface.owners[0].kind, 'triangular');
    const joins = inventory.examples.find(item => item.id.includes('.tensor-joins.'));
    assert.equal(joins.steps.length, 4);
    assert.deepEqual(joins.steps.map(item => item.expected.surface.owners[0].kind), ['join', 'join', 'join', 'teapot']);
    assert.equal(joins.steps[1].expected.surface.camera.distance, 12);
    assert.equal(joins.steps[2].expected.surface.camera.distance, 12,
        'G1 mode changes geometry but retains the camera from the preceding C1 scene action');
    assert.notEqual(joins.steps[2].expected.surface.camera.distance, g1Scene[0][1].state.camera.distance,
        'the G1 geometry preset camera is not the camera active after the lesson mode action');
    assert.equal(joins.steps[3].expected.surface.owners.length, 32);
    assert.notDeepEqual(joins.steps[1].expected.surface.owners[1].geometrySamples,
        joins.steps[2].expected.surface.owners[1].geometrySamples, 'G1 samples come from the alpha=2 derived join net');
    assert.ok(joins.steps[3].expected.surface.owners.every(owner => owner.geometrySamples.length === 3),
        'every teapot patch has independent numeric samples');
    assert.throws(() => validatePatchInventory({examples: []}), /Expected 11 patch examples/);
    const missingOwners = structuredClone(inventory);
    missingOwners.examples[0].expected.surface.owners = [];
    assert.throws(() => validatePatchInventory(missingOwners), /missing expected surface owners/);
});

test('join expectations use an authored view override without changing preset cameras', () => {
    const registry = makeRegistry();
    const override = {az: 0.1, el: 0.8, distance: 20.5, target: {x: 1.5, y: 0, z: 1.25}};
    registry['tensor-joins'].steps[0].scene.actions.find(action => action.kind === 'patch-join-scene').view3d = override;
    const inventory = generatePatchGuidedExampleInventory(registry, options);
    const camera = inventory.examples.find(item => item.id.includes('.tensor-joins.')).expected.surface.camera;
    assert.deepEqual(camera, {...override, target: [1.5, 0, 1.25]});
});

test('surface expectations reject a mutated sample and a camera mismatch', () => {
    const entry = generatePatchGuidedExampleInventory(makeRegistry(), options).examples[1];
    const expected = structuredClone(entry.expected.surface);
    const renderedOwners = structuredClone(expected.owners);
    const framing = {width: 800, height: 600, camera: structuredClone(expected.camera), points: [],
        meshBounds: {left: 10, top: 10, right: 790, bottom: 590, inFrustum: true}};
    const base = {framing, webglContextType: 'webgl2', renderedOwners, expected};
    assert.doesNotThrow(() => validateSurfaceEvidence(base));
    const wrongSample = structuredClone(expected);
    wrongSample.owners[0].geometrySamples[0][2] += 0.1;
    assert.throws(() => validateSurfaceEvidence({...base, expected: wrongSample}), /geometry sample 0 differs/);
    const wrongCamera = structuredClone(expected);
    wrongCamera.camera.distance += 1;
    assert.throws(() => validateSurfaceEvidence({...base, expected: wrongCamera}), /camera differs/);
});
