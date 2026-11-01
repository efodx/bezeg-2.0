const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {hashFile} = require('./capture-demonstration-previews.cjs');
const {validateSurfaceEvidence} = require('./guided-example-surface-evidence.cjs');
const {validateControlStep, validateStepOrder} = require('./guided-example-control-steps.cjs');

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const graphGeometryTypes = new Set(['curve', 'functiongraph', 'circle', 'point', 'line', 'segment', 'arrow',
    'polygon', 'arc', 'sector', 'ellipse', 'conic', 'spline', 'turtle']);

const RECIPE_STEP_KINDS = new Set(['goto-frame', 'frame-action', 'explore', 'select-tab', 'set-control']);
const CHECK_FIELDS = ['types', 'curveCount', 'points', 'curves'];

function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).filter(key => value[key] !== undefined).sort()
            .map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function sha256Of(value) {
    return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

/** Fingerprint of a resolved highlight recipe; any edit to frame, steps, expectChange or checks changes it. */
function recipeFingerprint(recipe) {
    return sha256Of(recipe);
}

const isPosition = value => value && Number.isInteger(value.step) && value.step >= 0 && Number.isInteger(value.frame) && value.frame >= 0;

/** Validates a resolved recipe (what the inventory carries). Start recipes are always explicit. */
function validateRecipe(id, recipe) {
    assert.ok(recipe && typeof recipe === 'object' && !Array.isArray(recipe),
        `${id}: missing recipe; every inventory entry must state recipe {kind:'start'} or a highlight recipe explicitly`);
    if (recipe.kind === 'start') {
        assert.deepEqual(Object.keys(recipe), ['kind'], `${id}: a start recipe must not carry frame, steps or checks`);
        return recipe;
    }
    assert.equal(recipe.kind, 'highlight', `${id}: unknown recipe kind ${JSON.stringify(recipe.kind)} (expected "start" or "highlight")`);
    assert.ok(typeof recipe.frame === 'string' && recipe.frame, `${id}: highlight recipe needs a target frame id`);
    assert.ok(isPosition(recipe.position), `${id}: highlight recipe frame ${recipe.frame} is not resolved to a lesson position; regenerate the inventory`);
    assert.ok(Array.isArray(recipe.steps), `${id}: highlight recipe steps must be an array`);
    for (const [index, step] of recipe.steps.entries()) {
        assert.ok(step && RECIPE_STEP_KINDS.has(step.kind), `${id}: recipe step ${index + 1} has unknown kind ${JSON.stringify(step?.kind)}`);
        if (step.kind === 'explore') {
            assert.deepEqual(Object.keys(step), ['kind'], `${id}: recipe step ${index + 1} explore takes no other fields`);
            continue;
        }
        if (step.kind === 'select-tab' || step.kind === 'set-control') {
            validateControlStep(id, step, `recipe step ${index + 1}`);
            continue;
        }
        assert.ok(typeof step.frame === 'string' && isPosition(step.position), `${id}: recipe step ${index + 1} is not resolved to a lesson frame`);
        if (step.kind === 'frame-action') assert.ok(typeof step.label === 'string' && step.label, `${id}: recipe step ${index + 1} needs the frame action button label`);
    }
    validateStepOrder(id, recipe.steps);
    assert.equal(typeof recipe.expectChange, 'boolean', `${id}: highlight recipe must state expectChange true or false`);
    assert.ok(recipe.checks && typeof recipe.checks === 'object' && CHECK_FIELDS.some(field => recipe.checks[field] !== undefined),
        `${id}: highlight recipe needs at least one expected-geometry check (types, curveCount, points or curves)`);
    validateExpected(id, recipe.checks);
    return recipe;
}

function validateRecipeFingerprint(entry) {
    assert.ok(typeof entry.recipeFingerprint === 'string' && /^[a-f0-9]{64}$/i.test(entry.recipeFingerprint),
        `${entry.id}: recipeFingerprint must be a SHA-256 hash of its recipe`);
    assert.equal(entry.recipeFingerprint, recipeFingerprint(entry.recipe),
        `${entry.id}: recipeFingerprint does not match the recipe; regenerate the inventory`);
}

function parseGuidedProgress(text) {
    const match = /Korak\s+(\d+)\s+od\s+(\d+)\s*·\s*Okvir\s+(\d+)\s+od\s+(\d+)/.exec(String(text));
    if (!match) return undefined;
    return {step: Number(match[1]) - 1, frame: Number(match[3]) - 1, steps: Number(match[2]), frames: Number(match[4])};
}

/** Which navigation button moves from the current guided-lesson position towards the target, or null when there. */
function navigationDirection(current, target) {
    if (current.step === target.step && current.frame === target.frame) return null;
    return current.step < target.step || (current.step === target.step && current.frame < target.frame) ? 'next' : 'back';
}

/** Order-independent signature of the observable board state (element types, points, sampled curves). */
function boardSignature(evidence) {
    return sha256Of({types: evidence.types || {}, points: evidence.points || [], curves: evidence.curves || []});
}

/**
 * Checks the board after a highlight recipe and returns the manifest record. `startEvidence` is the board of the
 * prepared start scene, `resultEvidence` the board after the steps settled.
 */
function verifyHighlight(entry, startEvidence, resultEvidence) {
    const recipe = entry.recipe;
    assert.equal(recipe?.kind, 'highlight', `${entry.id}: verifyHighlight needs a highlight recipe`);
    const result = verifyEvidence({...entry, expected: recipe.checks}, resultEvidence);
    const startSignature = boardSignature(startEvidence), resultSignature = boardSignature(resultEvidence);
    const changed = startSignature !== resultSignature;
    if (recipe.expectChange) assert.ok(changed,
        `${entry.id}: recipe expects the board to change from the start scene, but the highlight state is identical; check the steps`);
    else assert.ok(!changed, `${entry.id}: recipe states the board stays as in the start scene, but the highlight state differs`);
    return {frame: recipe.frame, position: recipe.position, steps: recipe.steps, expectChange: recipe.expectChange,
        startFingerprint: startSignature, resultFingerprint: resultSignature, changedFromStart: changed,
        checks: result.checks.map(name => ({name, passed: true})), evidence: {visibleElementCount: result.visibleElementCount,
            visibleElementTypes: result.visibleElementTypes, visiblePointCount: result.visiblePointCount}};
}

/** Recipe part of a manifest record. */
function recipeRecord(entry, highlight) {
    return {recipe: entry.recipe, recipeFingerprint: entry.recipeFingerprint, ...(highlight ? {highlight} : {}),
        ...(highlight ? {viewport: {width: 1440, height: 920}, deviceScaleFactor: 2} : {})};
}

function validateHighlightCapture(entry, capture) {
    const highlight = capture.highlight;
    assert.ok(highlight && typeof highlight === 'object', `${entry.id}: highlight capture evidence is missing`);
    assert.deepEqual(highlight.steps, entry.recipe.steps, `${entry.id}: recorded highlight steps differ from the recipe`);
    assert.equal(highlight.frame, entry.recipe.frame, `${entry.id}: recorded highlight frame differs from the recipe`);
    for (const key of ['startFingerprint', 'resultFingerprint']) {
        assert.match(highlight[key] || '', /^[a-f0-9]{64}$/i, `${entry.id}: highlight ${key} is missing`);
    }
    assert.equal(highlight.changedFromStart, highlight.startFingerprint !== highlight.resultFingerprint,
        `${entry.id}: highlight change record disagrees with its fingerprints`);
    if (entry.recipe.expectChange) assert.ok(highlight.changedFromStart,
        `${entry.id}: recipe expects a board change but the captured highlight equals the start scene`);
    assert.ok(Array.isArray(highlight.checks) && highlight.checks.length > 0 && highlight.checks.every(check => check?.passed === true),
        `${entry.id}: highlight geometry checks are missing or failed`);
    assert.ok(highlight.evidence?.visibleElementCount > 0, `${entry.id}: captured highlight board is empty`);
    assert.deepEqual(capture.viewport, {width: 1440, height: 920}, `${entry.id}: highlight capture viewport is not recorded`);
    assert.equal(capture.deviceScaleFactor, 2, `${entry.id}: highlight capture scale is not recorded`);
}

/** Recipe and fingerprint agreement between an inventory entry and a prior capture record. */
function assertCaptureMatchesRecipe(entry, capture) {
    assert.equal(capture.recipeFingerprint, entry.recipeFingerprint,
        `${entry.id}: recipe changed since capture (or the capture predates recipes); recapture this image`);
    assert.deepEqual(capture.recipe, entry.recipe, `${entry.id}: recorded recipe differs from the current recipe; recapture this image`);
    if (entry.recipe.kind === 'highlight') validateHighlightCapture(entry, capture);
}

function validateInventory(inventory) {
    assert.ok(Array.isArray(inventory) && inventory.length > 0, 'Guided-example inventory must be a nonempty array');
    const ids = new Set();
    for (const entry of inventory) {
        assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), 'Inventory entries must be objects');
        assert.ok(typeof entry.id === 'string' && idPattern.test(entry.id), 'Each example needs a stable id');
        assert.ok(!ids.has(entry.id), `Duplicate guided-example id: ${entry.id}`);
        ids.add(entry.id);
        assert.ok(typeof entry.demonstrationId === 'string' && idPattern.test(entry.demonstrationId), `${entry.id}: missing demonstrationId`);
        assert.ok(typeof entry.path === 'string', `${entry.id}: missing canonical path`);
        const target = new URL(entry.path, 'https://bezeg.invalid');
        assert.equal(target.origin, 'https://bezeg.invalid', `${entry.id}: path must be relative to the canonical site`);
        assert.ok(target.pathname.startsWith('/bezeg-2.0/'), `${entry.id}: path must include the /bezeg-2.0 deployment prefix`);
        const exampleQueries = target.searchParams.getAll('example');
        assert.equal(exampleQueries.length, 1, `${entry.id}: path must contain exactly one ?example query`);
        assert.ok(exampleQueries[0], `${entry.id}: path must identify its prepared ?example scene`);
        assert.equal(target.searchParams.size, 1, `${entry.id}: capture path must not mix example identity with other scene queries`);
        assert.equal(exampleQueries[0].split('.').at(-1), entry.demonstrationId,
            `${entry.id}: example identity must end with demonstrationId ${entry.demonstrationId}`);
        assert.ok(!target.hash, `${entry.id}: capture path must not include a fragment`);
        assert.ok(typeof entry.sceneFingerprint === 'string' && /^[a-f0-9]{64}$/i.test(entry.sceneFingerprint),
            `${entry.id}: sceneFingerprint must be a SHA-256 hash of its prepared scene and actions`);
        validateRecipe(entry.id, entry.recipe);
        validateRecipeFingerprint(entry);
        if (entry.actions !== undefined) assert.ok(Array.isArray(entry.actions), `${entry.id}: actions must be an array`);
        if (entry.expected !== undefined) validateExpected(entry.id, entry.expected);
    }
    return inventory;
}

function validateExpected(id, expected) {
    assert.ok(expected && typeof expected === 'object' && !Array.isArray(expected), `${id}: expected must be an object`);
    if (expected.types !== undefined) {
        assert.ok(expected.types && typeof expected.types === 'object' && !Array.isArray(expected.types), `${id}: expected.types must be an object`);
        for (const [type, count] of Object.entries(expected.types)) {
            assert.ok(type.length > 0 && Number.isInteger(count) && count >= 0, `${id}: invalid expected element count for ${type}`);
        }
    }
    for (const field of ['points', 'curves']) if (expected[field] !== undefined) assert.ok(Array.isArray(expected[field]), `${id}: expected.${field} must be an array`);
    if (expected.curveCount !== undefined) assert.ok(Number.isInteger(expected.curveCount) && expected.curveCount >= 0, `${id}: invalid expected curveCount`);
    for (const [index, point] of (expected.points || []).entries()) assert.ok(Array.isArray(point) && point.length === 2 && point.every(Number.isFinite), `${id}: invalid expected.points[${index}]`);
    for (const [index, curve] of (expected.curves || []).entries()) {
        assert.ok(Array.isArray(curve) && curve.length === 3 && curve.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)),
            `${id}: expected.curves[${index}] must contain three finite [x,y] samples`);
    }
    if (expected.surface !== undefined) validateExpectedSurface(id, expected.surface);
}

function validateExpectedSurface(id, surface) {
    assert.ok(surface && typeof surface === 'object' && !Array.isArray(surface), `${id}: expected.surface must be an object`);
    assert.ok(Array.isArray(surface.owners) && surface.owners.length > 0, `${id}: expected.surface.owners must be nonempty authored evidence`);
    const kinds = new Set(['tensor', 'triangular', 'join', 'teapot']);
    const ids = new Set();
    for (const [index, owner] of surface.owners.entries()) {
        assert.ok(owner && typeof owner === 'object' && typeof owner.id === 'string' && owner.id.length > 0,
            `${id}: expected.surface.owners[${index}] needs an exact owner id`);
        assert.ok(!ids.has(owner.id), `${id}: duplicate expected surface owner ${owner.id}`);
        ids.add(owner.id);
        assert.ok(kinds.has(owner.kind), `${id}: unsupported expected surface owner kind for ${owner.id}`);
        assert.ok(Array.isArray(owner.geometrySamples) && owner.geometrySamples.length === 3
            && owner.geometrySamples.every(sample => Array.isArray(sample) && sample.length === 3 && sample.every(Number.isFinite)),
        `${id}: expected surface owner ${owner.id} needs three finite authored xyz samples`);
    }
    const camera = surface.camera;
    assert.ok(camera && [camera.az, camera.el, camera.distance].every(Number.isFinite) && camera.distance > 0
        && Array.isArray(camera.target) && camera.target.length === 3 && camera.target.every(Number.isFinite),
    `${id}: expected.surface.camera must include finite az, el, distance and xyz target`);
    for (const field of ['cameraTolerance', 'geometryTolerance']) {
        if (surface[field] !== undefined) assert.ok(Number.isFinite(surface[field]) && surface[field] >= 0,
            `${id}: expected.surface.${field} must be a nonnegative finite number`);
    }
}

function verifyEvidence(entry, evidence) {
    assert.ok(evidence && Number.isInteger(evidence.visibleCount) && evidence.visibleCount > 0, `${entry.id}: empty board`);
    assert.ok(evidence.types && Object.entries(evidence.types).some(([type, count]) => graphGeometryTypes.has(type) && count > 0),
        `${entry.id}: no substantive visible graph geometry (axes, ticks, grids, and text do not count)`);
    const expected = entry.expected || {};
    for (const [type, count] of Object.entries(expected.types || {})) {
        assert.equal(evidence.types[type] || 0, count, `${entry.id}: expected ${count} visible ${type} objects`);
    }
    const curveCount = (evidence.types.curve || 0) + (evidence.types.functiongraph || 0);
    if (expected.curveCount !== undefined) assert.equal(curveCount, expected.curveCount, `${entry.id}: visible curve/functiongraph count`);
    const samples = evidence.curves || [];
    if (curveCount > 0) {
        assert.equal(samples.length, curveCount, `${entry.id}: every visible curve/functiongraph needs numerical samples`);
        assert.ok(samples.every(curve => Array.isArray(curve) && curve.length === 3 && curve.every(point =>
            Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))),
        `${entry.id}: curve evidence must contain three finite [x,y] samples per curve`);
    }
    for (const point of expected.points || []) {
        assert.ok((evidence.points || []).some(candidate => candidate.every((value, axis) => Math.abs(value - point[axis]) < 1e-7)),
            `${entry.id}: missing prepared point ${JSON.stringify(point)}`);
    }
    if ((expected.curves || []).length) {
        assert.ok(samples.length > 0, `${entry.id}: expected numerical curve checks but the board supplied no curve samples`);
        for (const curve of expected.curves) assert.ok(samples.some(candidate => curve.every((point, index) =>
            point.every((value, axis) => Math.abs(value - candidate[index][axis]) < 1e-6))),
        `${entry.id}: missing prepared curve samples ${JSON.stringify(curve)}`);
    }
    return {visibleElementCount: evidence.visibleCount, visibleElementTypes: evidence.types,
        visiblePointCount: (evidence.points || []).length, sampledVisibleCurves: evidence.curves || [],
        checks: [...Object.keys(expected.types || {}).map(type => `type:${type}`), ...(expected.curveCount === undefined ? [] : ['curve-count']),
            ...(expected.points || []).map(point => `point:${point.join(',')}`), ...(expected.curves || []).map(() => 'curve-samples') ]};
}

function validateRetained(inventory, previousManifest, destination, selectedIds, fingerprints) {
    assert.ok(inventory.length > 0, 'Guided-example inventory is empty; the completeness gate cannot pass on an empty inventory');
    const known = new Map(inventory.map(entry => [entry.id, entry]));
    const selected = new Set(selectedIds);
    for (const id of selected) assert.ok(known.has(id), `Unknown guided-example id: ${id}`);
    if (selected.size === inventory.length && inventory.every(entry => selected.has(entry.id))) return [];
    const previous = previousManifest?.captures || [];
    assert.ok(Array.isArray(previous), 'Existing preview manifest has an invalid captures list');
    const priorIds = new Set();
    for (const capture of previous) {
        assert.ok(capture && typeof capture.id === 'string' && !priorIds.has(capture.id), 'Existing manifest has duplicate or invalid capture IDs');
        priorIds.add(capture.id);
        const entry = known.get(capture.id);
        assert.ok(entry, `Stale mapping in prior manifest: ${capture.id} is absent from the current inventory`);
        assert.equal(capture.file, `${entry.id}.png`, `${entry.id}: stale or unsafe preview filename`);
        assert.equal(capture.demonstrationId, entry.demonstrationId, `${entry.id}: stale demonstration mapping in prior manifest`);
        assert.equal(capture.path, entry.path, `${entry.id}: stale scene URL in prior manifest`);
        assert.equal(capture.sceneFingerprint, entry.sceneFingerprint, `${entry.id}: prepared scene/actions changed; recapture this image`);
        assertCaptureMatchesRecipe(entry, capture);
        if (entry.expected?.surface) validateSurfaceCaptureRecord(entry, capture);
        const file = path.join(destination, capture.file || '');
        assert.ok(capture.file && fs.existsSync(file), `${entry.id}: missing preview asset ${capture.file}`);
        assert.equal(hashFile(file), capture.sha256, `${entry.id}: retained preview checksum differs from its manifest`);
    }
    if (selected.size < inventory.length) {
        assert.equal(previous.length, inventory.length, 'Partial regeneration requires a complete previous inventory; run without --id');
        for (const key of ['inventory', 'presentation', 'buildOutput', 'buildInputs']) {
            assert.equal(previousManifest.fingerprints?.[key], fingerprints[key], `Partial regeneration refused: ${key} fingerprint changed; run without --id`);
        }
    }
    return previous.filter(capture => !selected.has(capture.id));
}

function validatePublishedSet(inventory, captures, destination) {
    assert.ok(inventory.length > 0, 'Guided-example inventory is empty; the completeness gate cannot pass on an empty inventory');
    const byId = new Map(captures.map(capture => [capture.id, capture]));
    assert.equal(byId.size, captures.length, 'Capture manifest contains duplicate IDs');
    for (const entry of inventory) {
        const capture = byId.get(entry.id);
        assert.ok(capture, `${entry.id}: missing preview mapping`);
        assert.equal(capture.demonstrationId, entry.demonstrationId, `${entry.id}: stale demonstration mapping`);
        assert.equal(capture.file, `${entry.id}.png`, `${entry.id}: stale or unsafe preview filename`);
        assert.equal(capture.path, entry.path, `${entry.id}: stale scene URL mapping`);
        assert.equal(capture.sceneFingerprint, entry.sceneFingerprint, `${entry.id}: stale scene fingerprint mapping`);
        assertCaptureMatchesRecipe(entry, capture);
        if (entry.expected?.surface) validateSurfaceCaptureRecord(entry, capture);
        const file = path.join(destination, capture.file || '');
        assert.ok(capture.file && fs.existsSync(file), `${entry.id}: missing preview asset ${capture.file}`);
        assert.equal(hashFile(file), capture.sha256, `${entry.id}: image checksum mismatch`);
    }
    assert.equal(captures.length, inventory.length, 'Capture manifest includes mappings outside the complete inventory');
}

function validateStoredSurfaceEvidence(entry, record, label) {
    assert.ok(record && record.view === 'surface', `${entry.id}: ${label} surface evidence is missing`);
    const validated = validateSurfaceEvidence({
        framing: {width: record.frame?.width, height: record.frame?.height, camera: record.camera,
            points: record.projectedControlPoints, meshBounds: record.meshBounds},
        surfaceRenderer: record.surfaceRenderer, renderedOwners: record.renderedOwners, expected: entry.expected.surface,
    });
    assert.deepEqual(record.ownerIds, validated.ownerIds, `${entry.id}: ${label} owner IDs do not match observed owner samples`);
    return validated;
}

function validateSurfaceCaptureRecord(entry, capture) {
    const scene = validateStoredSurfaceEvidence(entry, capture.scene, 'captured scene');
    validateStoredSurfaceEvidence(entry, capture.initialFrame?.preparedSurfaceEvidence, 'prepared first-frame');
    assert.equal(capture.initialFrame?.firstFrame, true, `${entry.id}: missing first-frame capture evidence`);
    assert.equal(capture.initialFrame?.backNavigationDisabled, true, `${entry.id}: missing initial navigation evidence`);
    assert.equal(capture.initialFrame?.stableAcrossMs, 250, `${entry.id}: missing first-frame stability evidence`);
    const framing = capture.framing;
    assert.ok(framing?.surfaceHostOnly === true && framing.guidedLessonOverlayHidden === true && framing.authoredCameraPreserved === true,
        `${entry.id}: surface presentation evidence is missing`);
    assert.deepEqual([scene.frame.width, scene.frame.height], [framing.width, framing.height], `${entry.id}: surface evidence frame differs from presentation`);
    assert.deepEqual(framing.geometryOwners, scene.ownerIds, `${entry.id}: surface framing owner list differs from observed evidence`);
    assert.ok(Number.isInteger(framing.width) && framing.width > 0 && Number.isInteger(framing.height) && framing.height > 0
        && Number.isInteger(framing.scale) && framing.scale > 0, `${entry.id}: invalid surface capture dimensions`);
    assert.deepEqual([capture.width, capture.height], [framing.width * framing.scale, framing.height * framing.scale],
        `${entry.id}: surface image dimensions do not match capture framing`);
    assert.deepEqual(framing.visibleLabelBounds, capture.scene.visibleLabelBounds, `${entry.id}: visible label bounds differ from scene evidence`);
    validateSurfacePresentation(entry.id, scene.frame, scene.projectedControlPoints, capture.scene.visibleLabelBounds, scene.meshBounds);
    const provenance = capture.captureEvidence;
    assert.ok(provenance && typeof provenance.browserVersion === 'string' && provenance.browserVersion.length > 0
        && provenance.servedBuildVerified === true && typeof provenance.buildRevision === 'string' && provenance.buildRevision.length > 0
        && typeof provenance.sourceRevision === 'string' && provenance.sourceRevision.length > 0
        && Array.isArray(provenance.pageErrors) && provenance.pageErrors.length === 0,
    `${entry.id}: surface capture provenance is missing or invalid`);
}

function validateSurfacePresentation(id, frame, points, visibleLabelBounds, meshBounds) {
    assert.ok(meshBounds && typeof meshBounds.inFrustum === 'boolean'
        && [meshBounds.left, meshBounds.top, meshBounds.right, meshBounds.bottom].every(Number.isFinite)
        && meshBounds.right > meshBounds.left && meshBounds.bottom > meshBounds.top,
    `${id}: projected full-mesh crop bounds are missing or malformed`);
    assert.ok(meshBounds.inFrustum && meshBounds.left >= 0 && meshBounds.top >= 0
        && meshBounds.right <= frame.width && meshBounds.bottom <= frame.height,
    `${id}: projected full-mesh bounds are cropped or behind the camera`);
    assert.ok(Array.isArray(points), `${id}: projected surface points are missing`);
    for (const [index, point] of points.entries()) {
        assert.ok(point && typeof point.id === 'string' && point.id && point.inFrustum === true
            && [point.x, point.y].every(Number.isFinite) && point.x >= 0 && point.y >= 0 && point.x <= frame.width && point.y <= frame.height,
        `${id}: projected surface point ${index} is outside the capture frame or frustum`);
    }
    assert.ok(Array.isArray(visibleLabelBounds), `${id}: visible surface label bounds are missing`);
    const ids = new Set();
    for (const [index, label] of visibleLabelBounds.entries()) {
        assert.ok(label && typeof label.id === 'string' && label.id && !ids.has(label.id), `${id}: visible surface label ${index} has a missing or duplicate identity`);
        ids.add(label.id);
        assert.ok([label.left, label.top, label.right, label.bottom].every(Number.isFinite)
            && label.left >= 0 && label.top >= 0 && label.right <= frame.width && label.bottom <= frame.height
            && label.right > label.left && label.bottom > label.top,
        `${id}: visible surface label ${label.id} is outside the capture frame`);
    }
}

module.exports = {canonicalJson, recipeFingerprint, validateRecipe, parseGuidedProgress, navigationDirection, boardSignature,
    verifyHighlight, recipeRecord, validateHighlightCapture, assertCaptureMatchesRecipe, validateInventory, verifyEvidence, validateRetained, validatePublishedSet, validateExpectedSurface,
    validateSurfaceCaptureRecord, validateSurfacePresentation};
