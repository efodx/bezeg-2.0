'use strict';

const OWNER_KINDS = new Set(['tensor', 'triangular', 'join', 'teapot']);
const TEAPOT_PATCH_COUNT = 32;

function fail(message) { throw new Error(`Invalid guided surface evidence: ${message}`); }
function finiteTuple(value, where) {
    if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) fail(`${where} must be a finite xyz tuple`);
}

/** Read the existing route-owned DOM evidence from a Playwright page. */
async function readPublishedSurfaceEvidence(page) {
    return page.locator('#jgbox').evaluate(host => {
        const raw = host.getAttribute('data-surface-framing');
        if (!raw) throw new Error('Invalid guided surface evidence: missing published data-surface-framing');
        let framing;
        try { framing = JSON.parse(raw); }
        catch { throw new Error('Invalid guided surface evidence: malformed published data-surface-framing'); }
        const ownersRaw = host.getAttribute('data-rendered-surface-owners');
        if (!ownersRaw) throw new Error('Invalid guided surface evidence: missing published data-rendered-surface-owners');
        let renderedOwners;
        try { renderedOwners = JSON.parse(ownersRaw); }
        catch { throw new Error('Invalid guided surface evidence: malformed published data-rendered-surface-owners'); }
        const canvas = host.querySelector('canvas');
        const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        if (!gl) throw new Error('Invalid guided surface evidence: missing WebGL context');
        const isWebgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        return {framing, webglContextType: isWebgl2 ? 'webgl2' : 'webgl', renderedOwners};
    });
}

/** Validate evidence read from a live surface route; this function never derives evidence from image pixels. */
function validateSurfaceEvidence({framing, webglContextType, renderedOwners, expected}) {
    if (!['webgl', 'webgl2', 'experimental-webgl'].includes(webglContextType)) fail('missing WebGL context');
    if (!framing || !Number.isFinite(framing.width) || !Number.isFinite(framing.height) || framing.width <= 0 || framing.height <= 0) fail('missing or invalid published framing');
    const camera = framing.camera;
    if (!camera || ![camera.az, camera.el, camera.distance].every(Number.isFinite) || camera.distance <= 0) fail('missing or invalid published camera');
    finiteTuple(camera.target, 'published camera target');
    if (!Array.isArray(framing.points)) fail('published framing has no projected control points');
    if (framing.points.length === 0) {
        const completeTeapotOwners = expected?.owners?.length === TEAPOT_PATCH_COUNT &&
            renderedOwners?.length === TEAPOT_PATCH_COUNT &&
            expected.owners.every(owner => owner?.kind === 'teapot' && Array.isArray(owner.geometrySamples) && owner.geometrySamples.length > 0) &&
            renderedOwners.every(owner => owner?.kind === 'teapot' && Array.isArray(owner.geometrySamples) && owner.geometrySamples.length > 0);
        if (!completeTeapotOwners) fail('published framing has no projected control points or complete teapot owner evidence');
    }
    framing.points.forEach((point, index) => {
        if (!point || typeof point.id !== 'string' || !point.id || ![point.x, point.y].every(Number.isFinite)
            || typeof point.inFrustum !== 'boolean') fail(`projected point ${index} is invalid`);
    });
    if (!expected || !Array.isArray(expected.owners) || expected.owners.length === 0) fail('expected owners are empty');
    if (!Array.isArray(renderedOwners) || renderedOwners.length === 0) fail('rendered owners are empty');
    if (renderedOwners.length !== expected.owners.length) fail(`expected ${expected.owners.length} rendered owners, received ${renderedOwners.length}`);
    const byId = new Map();
    for (const owner of renderedOwners) {
        if (!owner || !OWNER_KINDS.has(owner.kind) || typeof owner.id !== 'string' || !owner.id) fail('rendered owner lacks a supported kind or identity');
        if (byId.has(owner.id)) fail(`duplicate rendered owner ${owner.id}`);
        if (!Array.isArray(owner.geometrySamples) || owner.geometrySamples.length !== 3) fail(`owner ${owner.id} must publish three geometry samples`);
        owner.geometrySamples.forEach((sample, index) => finiteTuple(sample, `owner ${owner.id} geometry sample ${index}`));
        byId.set(owner.id, owner);
    }
    const expectedIds = new Set();
    const tolerance = expected.geometryTolerance ?? 1e-6;
    if (!Number.isFinite(tolerance) || tolerance < 0) fail('geometry tolerance is invalid');
    for (const wanted of expected.owners) {
        if (!wanted || !OWNER_KINDS.has(wanted.kind) || !Array.isArray(wanted.geometrySamples) || wanted.geometrySamples.length !== 3) fail('expected owner geometry must contain three samples or use an unsupported kind');
        if (typeof wanted.id !== 'string' || !wanted.id || expectedIds.has(wanted.id)) fail('expected owner identities are missing or duplicated');
        expectedIds.add(wanted.id);
        const actual = byId.get(wanted.id);
        if (!actual || actual.kind !== wanted.kind) fail(`missing expected owner ${wanted.id}`);
        if (actual.geometrySamples.length !== wanted.geometrySamples.length) fail(`owner ${wanted.id} geometry sample count differs`);
        wanted.geometrySamples.forEach((sample, index) => {
            finiteTuple(sample, `expected owner ${wanted.id} geometry sample ${index}`);
            if (sample.some((coordinate, axis) => Math.abs(coordinate - actual.geometrySamples[index][axis]) > tolerance)) fail(`owner ${wanted.id} geometry sample ${index} differs`);
        });
    }
    if (!expected.camera || !Number.isFinite(expected.cameraTolerance ?? 1e-6) || (expected.cameraTolerance ?? 1e-6) < 0) fail('expected camera is missing or invalid');
    finiteTuple(expected.camera.target, 'expected camera target');
    const cameraTolerance = expected.cameraTolerance ?? 1e-6;
    const cameraValues = camera => [camera.az, camera.el, camera.distance, ...camera.target];
    const wantedCamera = cameraValues(expected.camera);
    const actualCamera = cameraValues(camera);
    if (wantedCamera.length !== actualCamera.length || !wantedCamera.every(Number.isFinite) || wantedCamera.some((value, index) => Math.abs(value - actualCamera[index]) > cameraTolerance)) fail('published camera differs from expected camera');
    return {view: 'surface', webglContextType, frame: {width: framing.width, height: framing.height}, camera,
        ownerIds: [...byId.keys()], renderedOwners: renderedOwners.map(owner => ({id: owner.id, kind: owner.kind,
            geometrySamples: owner.geometrySamples.map(sample => [...sample])})),
        projectedControlPoints: framing.points.map(point => ({id: point.id, x: point.x, y: point.y, inFrustum: point.inFrustum}))};
}

module.exports = {readPublishedSurfaceEvidence, validateSurfaceEvidence};
