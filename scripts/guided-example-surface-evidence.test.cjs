'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {readPublishedSurfaceEvidence, validateSurfaceEvidence} = require('./guided-example-surface-evidence.cjs');
const {fakeSurfaceHost} = require('./surface-view-fixture.cjs');

function fixture(kind = 'tensor') {
    const sample = [0.25, -0.5, 0.75];
    const camera = {az: 0.4, el: 0.7, distance: 8, target: [0, 0, 0]};
    const samples = [sample, [0.3, -0.4, 0.8], [0.4, -0.3, 0.9]];
    const owner = {id: `${kind}-owner-0`, kind, geometrySamples: samples};
    return {
        surfaceRenderer: 'jsx-svg',
        framing: {width: 360, height: 220, camera, meshBounds: {left: 50, top: 40, right: 300, bottom: 190, inFrustum: true},
            points: [{id: 'P00', x: 142, y: 103, inFrustum: true}]},
        renderedOwners: [owner],
        expected: {camera: {...camera, target: [...camera.target]}, owners: [{id: owner.id, kind, geometrySamples: samples.map(point => [...point])}]},
    };
}

test('accepts valid unit evidence records for supported patch owner families', () => {
    for (const kind of ['tensor', 'triangular', 'join']) {
        const result = validateSurfaceEvidence(fixture(kind));
        assert.deepEqual(result.ownerIds, [`${kind}-owner-0`]);
        assert.equal(result.meshBounds.inFrustum, true);
        assert.equal(result.view, 'surface');
    }
});

test('reads published owner JSON from a route host whose SVG surface view is drawn', async () => {
    const owner = {id: 'tensor-patch-0', kind: 'tensor', geometrySamples: [[0, 1, 2]]};
    {
        const attrs = {'data-surface-framing': JSON.stringify({width: 420, height: 260,
            meshBounds: {left: 4, top: 5, right: 400, bottom: 250, inFrustum: true}}),
            'data-rendered-surface-owners': JSON.stringify([owner])};
        const host = fakeSurfaceHost({attrs});
        const page = {locator: () => ({evaluate: callback => callback(host)})};
        assert.deepEqual(await readPublishedSurfaceEvidence(page), {
            framing: {width: 420, height: 260, meshBounds: {left: 4, top: 5, right: 400, bottom: 250, inFrustum: true}},
            renderedOwners: [owner], surfaceRenderer: 'jsx-svg',
        });
        delete attrs['data-rendered-surface-owners'];
        await assert.rejects(readPublishedSurfaceEvidence(page), /missing published data-rendered-surface-owners/);
        attrs['data-rendered-surface-owners'] = '{';
        await assert.rejects(readPublishedSurfaceEvidence(page), /malformed published data-rendered-surface-owners/);
        const blank = fakeSurfaceHost({attrs, shapes: [{points: ''}]});
        await assert.rejects(readPublishedSurfaceEvidence({locator: () => ({evaluate: callback => callback(blank)})}), /not drawn by the JSXGraph SVG surface view: .*no drawn polygon/);
        const missing = fakeSurfaceHost({attrs, view: null});
        await assert.rejects(readPublishedSurfaceEvidence({locator: () => ({evaluate: callback => callback(missing)})}), /no \[data-jsx-surface-view\] element/);
    }
});

test('accepts point-free teapot and subdivision scenes with independently expected rendered owners', () => {
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

    const subdivision = fixture('tensor');
    subdivision.framing.points = [];
    assert.equal(validateSurfaceEvidence(subdivision).ownerIds.length, 1);

    const incomplete = fixture('teapot');
    incomplete.framing.points = [];
    incomplete.renderedOwners = e.renderedOwners.slice(0, 31);
    incomplete.expected.owners = e.expected.owners.slice(0, 31);
    assert.throws(() => validateSurfaceEvidence(incomplete), /all 32 expected and rendered patch owners/);
});

test('rejects an undrawn surface renderer, absent framing, camera, owners, or owner geometry', () => {
    for (const mutate of [
        e => { e.surfaceRenderer = null; },
        e => { e.surfaceRenderer = 'webgl2'; },
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
        e => { e.framing.meshBounds.right = Infinity; },
    ]) {
        const e = fixture(); mutate(e);
        assert.throws(() => validateSurfaceEvidence(e), /Invalid guided surface evidence/);
    }
});
