'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {readPublishedSurfaceEvidence, validateSurfaceEvidence} = require('./guided-example-surface-evidence.cjs');

function fixture(kind = 'tensor') {
    const sample = [0.25, -0.5, 0.75];
    const camera = {az: 0.4, el: 0.7, distance: 8, target: [0, 0, 0]};
    const samples = [sample, [0.3, -0.4, 0.8], [0.4, -0.3, 0.9]];
    const owner = {id: `${kind}-owner-0`, kind, geometrySamples: samples};
    return {
        webglContextType: 'webgl2',
        framing: {width: 360, height: 220, camera, points: [{id: 'P00', x: 142, y: 103, inFrustum: true}]},
        renderedOwners: [owner],
        expected: {camera: {...camera, target: [...camera.target]}, owners: [{id: owner.id, kind, geometrySamples: samples.map(point => [...point])}]},
    };
}

test('accepts valid unit evidence records for supported patch owner families', () => {
    for (const kind of ['tensor', 'triangular', 'join', 'teapot']) {
        const result = validateSurfaceEvidence(fixture(kind));
        assert.deepEqual(result.ownerIds, [`${kind}-owner-0`]);
        assert.equal(result.view, 'surface');
    }
});

test('reads published owner JSON from the route host with the existing WebGL context', async () => {
    const owner = {id: 'tensor-patch-0', kind: 'tensor', geometrySamples: [[0, 1, 2]]};
    const gl = {};
    globalThis.WebGL2RenderingContext = function WebGL2RenderingContext() {};
    try {
        Object.setPrototypeOf(gl, WebGL2RenderingContext.prototype);
        const attrs = {'data-surface-framing': JSON.stringify({width: 420, height: 260}),
            'data-rendered-surface-owners': JSON.stringify([owner])};
        const host = {getAttribute: name => attrs[name] || null, querySelector: () => ({getContext: () => gl})};
        const page = {locator: () => ({evaluate: callback => callback(host)})};
        assert.deepEqual(await readPublishedSurfaceEvidence(page), {
            framing: {width: 420, height: 260}, webglContextType: 'webgl2', renderedOwners: [owner],
        });
        delete attrs['data-rendered-surface-owners'];
        await assert.rejects(readPublishedSurfaceEvidence(page), /missing published data-rendered-surface-owners/);
        attrs['data-rendered-surface-owners'] = '{';
        await assert.rejects(readPublishedSurfaceEvidence(page), /malformed published data-rendered-surface-owners/);
    } finally { delete globalThis.WebGL2RenderingContext; }
});

test('accepts the teapot scene contract with no control points and 32 explicit owners', () => {
    const e = fixture('teapot');
    e.framing.points = [];
    e.renderedOwners = Array.from({length: 32}, (_, index) => ({
        id: `teapot-patch-${index}`,
        kind: 'teapot',
        geometrySamples: [[index, index + 0.25, index + 0.5], [index + 1, index + 1.25, index + 1.5], [index + 2, index + 2.25, index + 2.5]],
    }));
    e.expected.owners = e.renderedOwners.map(owner => ({
        id: owner.id,
        kind: owner.kind,
        geometrySamples: owner.geometrySamples.map(sample => [...sample]),
    }));
    const result = validateSurfaceEvidence(e);
    assert.equal(result.ownerIds.length, 32);
    assert.deepEqual(result.ownerIds, e.expected.owners.map(owner => owner.id));

    const incomplete = fixture('teapot');
    incomplete.framing.points = [];
    incomplete.renderedOwners = e.renderedOwners.slice(0, 31);
    incomplete.expected.owners = e.expected.owners.slice(0, 31);
    assert.throws(() => validateSurfaceEvidence(incomplete), /complete teapot owner evidence/);
});

test('rejects absent WebGL, framing, camera, owners, or owner geometry', () => {
    for (const mutate of [
        e => { e.webglContextType = null; },
        e => { e.framing = null; },
        e => { e.framing.camera = null; },
        e => { e.renderedOwners = []; },
        e => { e.renderedOwners[0].geometrySamples = []; },
        e => { e.expected.owners = []; },
    ]) {
        const e = fixture(); mutate(e);
        assert.throws(() => validateSurfaceEvidence(e), /Invalid guided surface evidence/);
    }
});

test('rejects nonfinite samples, owner count or identity, and unexpected geometry/camera', () => {
    const mutations = [
        e => { e.renderedOwners[0].geometrySamples[0][1] = Infinity; },
        e => { e.expected.owners[0].geometrySamples[0][0] = NaN; },
        e => { e.renderedOwners.push({...e.renderedOwners[0], id: 'extra'}); },
        e => { e.expected.owners[0].id = 'different-owner'; },
        e => { e.renderedOwners[0].geometrySamples[0][2] += 0.1; },
        e => { e.expected.camera.az += 0.1; },
    ];
    for (const mutate of mutations) {
        const e = fixture(); mutate(e);
        assert.throws(() => validateSurfaceEvidence(e), /Invalid guided surface evidence/);
    }
});

test('rejects nonfinite published frame coordinates and projected camera values', () => {
    for (const mutate of [
        e => { e.framing.points[0].x = NaN; },
        e => { e.framing.camera.distance = Infinity; },
    ]) {
        const e = fixture(); mutate(e);
        assert.throws(() => validateSurfaceEvidence(e), /Invalid guided surface evidence/);
    }
});
