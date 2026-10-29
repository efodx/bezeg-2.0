'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const sections = ['curve-to-patch', 'bilinear-patch', 'control-net', 'boundary-iso-curves', 'tensor-decasteljau',
    'properties', 'tensor-derivatives', 'tensor-subdivision', 'tensor-joins', 'triangular-patches', 'square-vs-triangular'];

function choose(n, k) {
    let result = 1;
    for (let i = 1; i <= k; i++) result = result * (n - i + 1) / i;
    return result;
}
function bernstein(n, i, t) { return choose(n, i) * t ** i * (1 - t) ** (n - i); }
function evaluateTensor(fixture, u, v) {
    const rows = fixture.m + 1, columns = fixture.n + 1;
    assert.equal(fixture.net.length, rows * columns, 'tensor fixture net length differs from degree');
    return [0, 1, 2].map(axis => fixture.net.reduce((sum, p, index) => {
        const i = Math.floor(index / columns), j = index % columns;
        return sum + bernstein(fixture.m, i, u) * bernstein(fixture.n, j, v) * p[['x', 'y', 'z'][axis]];
    }, 0));
}
function evaluateTriangle(fixture, u, v) {
    const w = 1 - u - v;
    assert.ok(u >= 0 && v >= 0 && w >= 0, 'triangle sample is outside simplex');
    const n = fixture.n;
    const indices = [];
    for (let i = n; i >= 0; i--) for (let j = n - i; j >= 0; j--) indices.push([i, j, n - i - j]);
    return [0, 1, 2].map(axis => fixture.net.reduce((sum, p, index) => {
        const [i, j, k] = indices[index];
        const coefficient = choose(n, i) * choose(n - i, j) * u ** i * v ** j * w ** k;
        return sum + coefficient * p[['x', 'y', 'z'][axis]];
    }, 0));
}
function sceneFingerprint(demoId, step) {
    assert.ok(step?.scene && Array.isArray(step.scene.actions) && step.scene.actions.length, `${demoId}: missing prepared actions`);
    return crypto.createHash('sha256').update(JSON.stringify({demonstrationId: demoId, stepId: step.id,
        actions: step.scene.actions, firstFrame: step.frames?.[0] ?? null})).digest('hex');
}
function fixtureAction(step) { return step.scene.actions.find(action => action.kind === 'prepared-scene' && action.source === 'lesson-patch-fixture'); }
function expectedSamples(fixture, density = 16, options = {}) {
    assert.ok(Number.isInteger(density) && density > 0, 'mesh sample density must be a positive integer');
    if (fixture.kind === 'tensor') {
        const vertices = [];
        for (let i = 0; i <= density; i++) for (let j = 0; j <= density; j++) vertices.push([i / density, j / density]);
        const faces = [], stride = density + 1;
        for (let i = 0; i < density; i++) for (let j = 0; j < density; j++) {
            const a = i * stride + j, b = a + stride, c = b + 1, d = a + 1;
            faces.push([a, b, d], [b, c, d]);
        }
        return sampleDrawableFaces(vertices, faces, evaluateTensor, fixture, options);
    }
    const params = new Map();
    const lookup = new Map();
    for (let i = 0; i <= density; i++) for (let j = 0; j <= density - i; j++) {
        const key = `${i},${j}`;
        lookup.set(key, params.size);
        params.set(params.size, [i / density, j / density]);
    }
    const faces = [];
    for (let i = 0; i < density; i++) for (let j = 0; j < density - i; j++) {
        const a = lookup.get(`${i},${j}`), b = lookup.get(`${i + 1},${j}`), c = lookup.get(`${i},${j + 1}`);
        faces.push([a, b, c]);
        if (i + j <= density - 2) faces.push([b, lookup.get(`${i + 1},${j + 1}`), c]);
    }
    return sampleDrawableFaces([...params.values()], faces, evaluateTriangle, fixture, options);
}
function sampleDrawableFaces(parameters, faces, evaluator, fixture, {coincidentTolerance = 0, float32 = false, roundSamples = false} = {}) {
    const drawable = faces.flatMap(face => {
        const xyz = face.map(index => evaluator(fixture, ...parameters[index]));
        const near = (a, b) => a.every((value, axis) => Math.abs(value - b[axis]) <= coincidentTolerance);
        if (coincidentTolerance > 0 && (near(xyz[0], xyz[1]) || near(xyz[1], xyz[2]) || near(xyz[0], xyz[2]))) return [];
        const vertices = float32 ? xyz.map(point => point.map(Math.fround)) : xyz;
        const ab = vertices[1].map((value, axis) => value - vertices[0][axis]);
        const ac = vertices[2].map((value, axis) => value - vertices[0][axis]);
        const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
        return Math.hypot(...cross) > 0 ? [face] : [];
    });
    assert.ok(drawable.length > 0, `${fixture.kind}: authored fixture has no drawable mesh triangles`);
    return [...new Set([0, Math.floor(drawable.length / 2), drawable.length - 1])].map(index => {
        const sample = evaluator(fixture, ...parameters[drawable[index][0]]);
        return roundSamples ? sample.map(Math.fround) : sample;
    });
}
function joinAction(step) {
    return step.scene.actions.find(action => action.kind === 'patch-join-scene');
}
function expectedSurface(step, sectionId, options = {}) {
    if (sectionId === 'tensor-joins') {
        const sceneAction = joinAction(step);
        assert.ok(sceneAction, `${sectionId}: step ${step.id} is missing its authored join-scene action`);
        const modeAction = step.scene.actions.find(action => action.kind === 'patch-join-mode');
        const geometrySceneId = modeAction?.mode === 'g1' ? 'join-g1' : sceneAction.scene;
        const raw = options.joinScenes?.[geometrySceneId];
        assert.ok(raw, `${sectionId}: missing authored ${geometrySceneId} join fixture`);
        const cameraRaw = options.joinScenes?.[sceneAction.scene];
        assert.ok(cameraRaw, `${sectionId}: missing authored ${sceneAction.scene} camera fixture`);
        const [, dto] = raw[0];
        const [, cameraDto] = cameraRaw[0];
        const view = sceneAction.view3d;
        const camera = view ? {az: view.az, el: view.el, distance: view.distance,
            target: view.target ? [view.target.x, view.target.y, view.target.z] : [...cameraDto.state.camera.target]} : cameraDto.state.camera;
        if (modeAction?.mode === 'g1') assert.equal(modeAction.alpha, 2, `${sectionId}: G1 lesson must use alpha=2`);
        if (geometrySceneId === 'join-teapot') {
            assert.equal(dto.state.joinCapstone, 'teapot', `${sectionId}: teapot step must select the Utah teapot`);
            assert.equal(options.teapotPatches?.length, 32, `${sectionId}: expected all 32 authored Utah teapot patches`);
            return {camera: {az: camera.az, el: camera.el, distance: camera.distance, target: [...camera.target]}, owners:
                options.teapotPatches.map((net, index) => ({id: `teapot-patch-${index}`, kind: 'teapot',
                    geometrySamples: expectedSamples({kind: 'tensor', m: 3, n: 3,
                        net: net.flat().map(([x, y, z]) => ({x, y, z}))}, 8,
                    {coincidentTolerance: 1e-12, float32: true, roundSamples: true})})),
            geometryTolerance: 1e-6, cameraTolerance: 1e-6};
        }
        const rows = Array.from({length: dto.m + 1}, (_, i) => dto.net.slice(i * (dto.n + 1), (i + 1) * (dto.n + 1)));
        const rowsB = Array.from({length: dto.state.mB + 1}, (_, i) => dto.state.netB.slice(i * (dto.state.nB + 1), (i + 1) * (dto.state.nB + 1)));
        const fixture = net => ({kind: 'tensor', m: net.length - 1, n: net[0].length - 1,
            net: net.flat().map(([x, y, z]) => ({x, y, z}))});
        return {camera: {az: camera.az, el: camera.el, distance: camera.distance, target: [...camera.target]}, owners: [
            {id: 'join-patch-a', kind: 'join', geometrySamples: expectedSamples(fixture(rows))},
            {id: 'join-patch-b', kind: 'join', geometrySamples: expectedSamples(fixture(rowsB))},
        ], geometryTolerance: 1e-6, cameraTolerance: 1e-6};
    }
    const prepared = fixtureAction(step);
    assert.ok(prepared, `${sectionId}: expected an authored lesson patch fixture`);
    const fixture = prepared.patch;
    const owner = fixture.kind === 'triangular'
        ? {id: 'triangular-patch-0', kind: 'triangular', geometrySamples: expectedSamples(fixture)}
        : {id: 'tensor-patch-0', kind: 'tensor', geometrySamples: expectedSamples(fixture)};
    const view = prepared.view3d;
    assert.ok(view, `${sectionId}: prepared fixture must carry its authored camera`);
    const camera = {az: view.az, el: view.el, distance: view.distance, target: [view.target.x, view.target.y, view.target.z]};
    // Comparison overlays a tensor net and boundary curves but only its triangular mesh owns a drawable surface.
    if (sectionId === 'square-vs-triangular') {
        assert.equal(owner.kind, 'triangular');
        return {camera, owners: [owner], geometryTolerance: 1e-6, cameraTolerance: 1e-6};
    }
    return {camera, owners: [owner], geometryTolerance: 1e-6, cameraTolerance: 1e-6};
}
function validatePatchInventory(inventory, expectedCount = sections.length) {
    assert.ok(Array.isArray(inventory?.examples) && inventory.examples.length === expectedCount, `Expected ${expectedCount} patch examples`);
    const ids = new Set();
    for (const item of inventory.examples) {
        assert.ok(item && typeof item.id === 'string' && !ids.has(item.id), 'Patch inventory IDs must be present and unique');
        ids.add(item.id);
        assert.ok(item.path && new URL(item.path, 'https://bezeg.invalid').searchParams.get('example'), `${item.id}: missing canonical URL`);
        assert.match(item.sceneFingerprint || '', /^[a-f0-9]{64}$/, `${item.id}: missing scene fingerprint`);
        const surface = item.expected?.surface;
        assert.ok(surface && Array.isArray(surface.owners) && surface.owners.length, `${item.id}: missing expected surface owners`);
        assert.ok(surface.owners.every(owner => owner.id && owner.kind && owner.geometrySamples?.length === 3
            && owner.geometrySamples.every(p => p.length === 3 && p.every(Number.isFinite))), `${item.id}: malformed expected owner samples`);
        assert.ok(surface.camera && Number.isFinite(surface.camera.distance) && surface.camera.target?.length === 3,
            `${item.id}: missing expected camera`);
        assert.ok(Array.isArray(item.steps) && item.steps.length > 0, `${item.id}: missing per-step surface expectations`);
        for (const [index, step] of item.steps.entries()) {
            const stepSurface = step.expected?.surface;
            assert.ok(step.stepId && stepSurface?.owners?.length, `${item.id}: step ${index + 1} is missing expected surface owners`);
            assert.ok(stepSurface.owners.every(owner => owner.geometrySamples?.length === 3
                && owner.geometrySamples.every(p => p.length === 3 && p.every(Number.isFinite))),
            `${item.id}: step ${index + 1} is missing independent numeric geometry samples`);
            assert.ok(stepSurface.camera && Number.isFinite(stepSurface.camera.distance) && stepSurface.camera.target?.length === 3,
                `${item.id}: step ${index + 1} is missing expected camera`);
        }
    }
    return inventory;
}
function generatePatchGuidedExampleInventory(registry, options = {}) {
    const examples = [];
    for (const sectionId of sections) {
        const lesson = registry[sectionId];
        assert.ok(lesson, `${sectionId}: missing section-owned lesson`);
        const step = lesson.steps?.[0];
        assert.ok(step, `${sectionId}: missing initial lesson step`);
        const id = `bezier-patches.${sectionId}.${lesson.demonstrationId}`;
        assert.equal(typeof options.pathForSection, 'function', 'Patch inventory requires the published section route resolver');
        const path = options.pathForSection(sectionId);
        const stepExpectations = lesson.steps.map(step => ({stepId: step.id, expected: {surface: expectedSurface(step, sectionId, options)}}));
        examples.push({id, demonstrationId: lesson.demonstrationId, path, sceneFingerprint: sceneFingerprint(lesson.demonstrationId, step),
            actions: step.scene.actions.map(action => `${action.kind}: ${JSON.stringify(action)}`),
            expected: stepExpectations[0].expected, steps: stepExpectations});
    }
    return validatePatchInventory({examples});
}

module.exports = {sections, evaluateTensor, evaluateTriangle, expectedSamples, expectedSurface, validatePatchInventory, generatePatchGuidedExampleInventory};
