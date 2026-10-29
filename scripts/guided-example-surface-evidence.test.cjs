'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {validateSurfaceEvidence} = require('./guided-example-surface-evidence.cjs');

function fixture(kind = 'tensor') {
    const sample = [0.25, -0.5, 0.75];
    const camera = {az: 0.4, el: 0.7, distance: 8, target: [0, 0, 0]};
    const owner = {id: `${kind}-owner-0`, kind, geometrySamples: [sample]};
    return {
        webglContextType: 'webgl2',
        framing: {width: 360, height: 220, camera, points: [{id: 'P00', x: 142, y: 103, inFrustum: true}]},
        renderedOwners: [owner],
        expected: {camera: {...camera, target: [...camera.target]}, owners: [{id: owner.id, kind, geometrySamples: [[...sample]]}]},
    };
}

test('accepts valid unit evidence records for supported patch owner families', () => {
    for (const kind of ['tensor', 'triangular', 'join', 'teapot']) {
        const result = validateSurfaceEvidence(fixture(kind));
        assert.deepEqual(result.ownerIds, [`${kind}-owner-0`]);
        assert.equal(result.view, 'surface');
    }
});

test('accepts the teapot scene contract with no control points and 32 explicit owners', () => {
    const e = fixture('teapot');
    e.framing.points = [];
    e.renderedOwners = Array.from({length: 32}, (_, index) => ({
        id: `teapot-patch-${index}`,
        kind: 'teapot',
        geometrySamples: [[index, index + 0.25, index + 0.5]],
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
