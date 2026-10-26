// Capture only the exact prepared initial scenes from a complete generated inventory.
// node scripts/capture-guided-example-previews.cjs path/to/guided-example-inventory.json [--id curve-parameter]
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const demonstrations = require('../tests/smoke-catalog.cjs');
const {recipes, settle} = require('./demonstration-preview-recipes.cjs');
const {presentBoard, hashFile, pngDimensions} = require('./capture-demonstration-previews.cjs');
const {digestBuild, digestInputs} = require('./commands.cjs');
const {validateInventory, verifyEvidence, validateRetained, validatePublishedSet} = require('./guided-example-preview-api.cjs');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'src/images/learning/examples');
const appBaseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4387/bezeg-2.0').replace(/\/$/, '');
const frame = {width: 420, height: 260};
const viewport = {width: 1440, height: 920};
const deviceScaleFactor = 2;
const manifestPath = path.join(destination, 'manifest.json');
const workedParabolaId = 'splines.worked-join.spline-c1.parabola-derivatives';

function captureRecipeForEntry(entry, recipe) {
    if (entry.id !== workedParabolaId) return recipe;
    // The shared spline-c1 catalog window is useful for its broad construction view,
    // but this authored worked parabola has a much smaller exact fixture view.
    // Fit its own finite scene with equal unit scales and leave the shared recipe intact.
    return {...recipe, framing: {kind: 'finite-geometry-fit'}};
}

function presentationHelpers() {
    return [presentBoard, inspectBoard, isViewportSpanningHorizontalCurve, isCameraScaledCurve,
        isSameGraphOnOverlap, assertPresentationGeometryStable, hideGuidedLessonOverlay, captureRecipeForEntry];
}

function presentationFingerprint({recipeFraming = [], entryFraming = [], helpers = presentationHelpers()} = {}) {
    return crypto.createHash('sha256')
        .update(helpers.map(helper => helper.toString()).join('\0'))
        .update(hashFile(path.join(__dirname, 'capture-demonstration-previews.cjs')))
        .update(hashFile(path.join(__dirname, 'guided-example-preview-api.cjs')))
        .update(JSON.stringify({frame, viewport, deviceScaleFactor, recipeFraming, entryFraming}))
        .digest('hex');
}

function parseArgs(argv) {
    const [inventoryPath, ...rest] = argv;
    assert.ok(inventoryPath && !inventoryPath.startsWith('--'), 'Usage: node scripts/capture-guided-example-previews.cjs <inventory.json> [--id <id>]');
    const ids = [];
    for (let index = 0; index < rest.length; index++) {
        if (rest[index] !== '--id' || !rest[index + 1]) throw new Error(`Unknown or incomplete option: ${rest[index]}`);
        ids.push(rest[++index]);
    }
    const envIds = process.env.PREVIEW_EXAMPLE_IDS?.split(',').map(value => value.trim()).filter(Boolean) || [];
    assert.ok(!ids.length || !envIds.length, 'Choose either --id or PREVIEW_EXAMPLE_IDS, not both');
    return {inventoryPath: path.resolve(process.cwd(), inventoryPath), ids: ids.length ? ids : envIds};
}

function readInventory(file) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return validateInventory(Array.isArray(parsed) ? parsed : parsed.examples);
}

function fingerprintInventory(inventory) {
    const hash = crypto.createHash('sha256');
    for (const entry of [...inventory].sort((a, b) => a.id.localeCompare(b.id))) {
        hash.update(JSON.stringify({id: entry.id, demonstrationId: entry.demonstrationId, path: entry.path,
            sceneFingerprint: entry.sceneFingerprint, actions: entry.actions || [], expected: entry.expected || null}));
        hash.update('\0');
    }
    return hash.digest('hex');
}

function inspectBoard(page) {
    return page.evaluate(() => {
        const container = document.querySelector('#jgbox');
        const board = Object.values(window.JXG?.boards || {}).find(item => item.container === container?.id || item.containerObj === container);
        if (!board) throw new Error('route-owned JSXGraph board is missing');
        const visible = Object.values(board.objects || {}).filter(object => {
            if (!object?.rendNode?.isConnected || object.visProp?.visible === false || object.visProp?.visible === 'false') return false;
            const style = getComputedStyle(object.rendNode);
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
        });
        const points = visible.filter(object => object.elType === 'point').map(object => {
            const coords = object.coords?.usrCoords;
            return coords?.length >= 3 && Math.abs(coords[0]) > 1e-12 ? [coords[1] / coords[0], coords[2] / coords[0]] : null;
        }).filter(Boolean).map(point => point.map(value => Number(value.toFixed(7)))).sort((a,b) => a[0] - b[0] || a[1] - b[1]);
        const curveObjects = visible.filter(object => ['curve', 'functiongraph'].includes(object.elType) && typeof object.X === 'function' && typeof object.Y === 'function')
            .map(object => {
                const samples = [0, 0.5, 1].map(t => [Number(object.X(t).toFixed(6)), Number(object.Y(t).toFixed(6))]);
                const points = Array.isArray(object.dataX) && Array.isArray(object.dataY) && object.dataX.length === object.dataY.length
                    ? object.dataX.map((x, index) => [x, object.dataY[index]]).filter(point => point.every(Number.isFinite))
                    : [];
                return {id: object.id, samples, points};
            });
        const curves = curveObjects.map(object => object.samples).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        const types = visible.reduce((counts, object) => (counts[object.elType] = (counts[object.elType] || 0) + 1, counts), {});
        return {visibleCount: visible.length, points, curves, curveData: curveObjects, types, boundingBox: board.getBoundingBox(), unitScale: [board.unitX, board.unitY]};
    });
}

function isSameGraphOnOverlap(before, after) {
    if (!before || !after || before.id !== after.id || !Array.isArray(before.points) || !Array.isArray(after.points)
        || before.points.length < 2 || after.points.length < 2) return false;
    const direction = points => Math.sign(points.at(-1)[0] - points[0][0]);
    const beforeDirection = direction(before.points), afterDirection = direction(after.points);
    if (!beforeDirection || beforeDirection !== afterDirection) return false;
    const bounds = points => [Math.min(...points.map(point => point[0])), Math.max(...points.map(point => point[0]))];
    const beforeBounds = bounds(before.points), afterBounds = bounds(after.points);
    const left = Math.max(beforeBounds[0], afterBounds[0]);
    const right = Math.min(beforeBounds[1], afterBounds[1]);
    if (!(right > left)) return false;
    const interpolate = (points, x) => {
        for (let index = 1; index < points.length; index++) {
            const a = points[index - 1], b = points[index];
            if (x < Math.min(a[0], b[0]) || x > Math.max(a[0], b[0])) continue;
            if (a[0] === b[0]) return a[1];
            return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0]));
        }
        return undefined;
    };
    return [0, 0.25, 0.5, 0.75, 1].every(fraction => {
        const x = left + (right - left) * fraction;
        const beforeY = interpolate(before.points, x), afterY = interpolate(after.points, x);
        return Number.isFinite(beforeY) && Number.isFinite(afterY)
            && Math.abs(beforeY - afterY) <= 1e-4 * Math.max(1, Math.abs(beforeY), Math.abs(afterY));
    });
}

function isViewportSpanningHorizontalCurve(samples, box) {
    if (!Array.isArray(samples) || samples.length !== 3 || !Array.isArray(box) || box.length !== 4) return false;
    const [left, , right] = box;
    if (![left, right, ...samples.flat()].every(Number.isFinite) || right <= left) return false;
    const expectedX = [left, (left + right) / 2, right];
    return samples.every(([x, y], index) => Math.abs(x - expectedX[index]) <= 1e-5 && Math.abs(y - samples[0][1]) <= 1e-6);
}

function isCameraScaledCurve(before, after, initialUnitScale, presentedUnitScale) {
    if (!Array.isArray(initialUnitScale) || !Array.isArray(presentedUnitScale)
        || initialUnitScale.length !== 2 || presentedUnitScale.length !== 2
        || ![...initialUnitScale, ...presentedUnitScale].every(value => Number.isFinite(value) && value > 0)) return false;
    if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length || !before.length) return false;
    // Camera-sized construction curves may change user coordinates during framing.
    // Permit that only when each sampled point stays fixed in screen pixels on both axes.
    const pixelTolerance = 0.05;
    const pixelStable = before.every((point, index) => Array.isArray(point) && Array.isArray(after[index])
        && point.length === 2 && after[index].length === 2
        && point.every((value, axis) => Number.isFinite(value) && Number.isFinite(after[index][axis])
            && Math.abs(value * initialUnitScale[axis] - after[index][axis] * presentedUnitScale[axis]) <= pixelTolerance));
    if (pixelStable) return true;

    // Curves capped to a fixed user-space radius can shrink below their uncapped
    // camera scale. Keep the narrower prior exception for isotropic origin arcs.
    const [beforeX, beforeY] = initialUnitScale;
    const [afterX, afterY] = presentedUnitScale;
    const isotropic = (x, y) => Math.abs(x - y) <= 1e-6 * Math.max(x, y);
    if (!isotropic(beforeX, beforeY) || !isotropic(afterX, afterY)) return false;
    const cameraRatio = beforeX / afterX;
    const radii = samples => samples.map(([x, y]) => Math.hypot(x, y));
    const beforeRadii = radii(before), afterRadii = radii(after);
    const circular = values => values.every(value => value > 1e-5)
        && Math.max(...values) - Math.min(...values) <= 1e-3 * Math.max(...values);
    if (!circular(beforeRadii) || !circular(afterRadii)) return false;
    const denominator = before.reduce((sum, point) => sum + point.reduce((sub, value) => sub + value * value, 0), 0);
    if (denominator <= 1e-10) return false;
    const scale = before.reduce((sum, point, index) => sum + point.reduce((sub, value, axis) => sub + value * after[index][axis], 0), 0) / denominator;
    const cameraScaleRange = [Math.min(1, cameraRatio) - 1e-5, Math.max(1, cameraRatio) + 1e-5];
    const sameArc = before.every((point, index) => point.every((value, axis) => Math.abs(after[index][axis] - value * scale) <= 2e-6));
    return sameArc && scale >= cameraScaleRange[0] && scale <= cameraScaleRange[1];
}

function assertPresentationGeometryStable(initial, presented, exampleId = 'capture') {
    assert.deepEqual(presented.points, initial.points, 'capture presentation changed point geometry');
    assert.equal(presented.curves.length, initial.curves.length, 'capture presentation changed curve count');
    for (let index = 0; index < initial.curves.length; index++) {
        const before = initial.curves[index];
        const after = presented.curves[index];
        if (JSON.stringify(before) === JSON.stringify(after)) continue;
        const cameraDrivenHorizontal = isViewportSpanningHorizontalCurve(before, initial.boundingBox)
            && isViewportSpanningHorizontalCurve(after, presented.boundingBox)
            && before.every((point, sample) => Math.abs(point[1] - after[sample][1]) <= 1e-6);
        const cameraScaledConstruction = isCameraScaledCurve(before, after, initial.unitScale, presented.unitScale);
        const beforeData = initial.curveData?.find(curve => JSON.stringify(curve.samples) === JSON.stringify(before));
        const afterData = presented.curveData?.find(curve => JSON.stringify(curve.samples) === JSON.stringify(after));
        const sameFunctionOnOverlap = isSameGraphOnOverlap(beforeData, afterData);
        if (!cameraDrivenHorizontal && !cameraScaledConstruction && !sameFunctionOnOverlap) {
            throw new Error(`${exampleId}: capture presentation changed curve geometry at index ${index}; before=${JSON.stringify(before)}; after=${JSON.stringify(after)}; unitScale=${JSON.stringify(initial.unitScale)}->${JSON.stringify(presented.unitScale)}; boundingBox=${JSON.stringify(initial.boundingBox)}->${JSON.stringify(presented.boundingBox)}`);
        }
    }
}

async function hideGuidedLessonOverlay(page) {
    return page.evaluate(() => {
        const layers = [...document.querySelectorAll('.guided-lesson-layer')];
        if (layers.length !== 1) throw new Error(`expected one guided-lesson overlay layer, found ${layers.length}`);
        layers[0].style.visibility = 'hidden';
        if (getComputedStyle(layers[0]).visibility !== 'hidden') throw new Error('guided-lesson overlay remains visible during capture');
        return true;
    });
}

function entryBundles(html) {
    return [...new Set([...html.matchAll(/(?:src|href)="([^"]+\.(?:m?js|css)(?:\?[^"]*)?)"/g)].map(match => match[1]))]
        .filter(ref => /(?:^|\/)assets\/[^/]+\.(?:m?js|css)(?:\?|$)/.test(ref));
}

async function verifyServedBuild(build) {
    assert.equal(digestBuild(root), build.output, 'Local build bytes differ from the build provenance stamp; run `just build`');
    const localHtml = fs.readFileSync(path.join(root, 'build/index.html'), 'utf8');
    const localRefs = entryBundles(localHtml);
    assert.ok(localRefs.length, 'Local production HTML has no Vite entry bundles');
    const shellUrl = `${appBaseUrl}/`;
    const shell = await fetch(shellUrl);
    assert.ok(shell.ok, `Production preview shell failed: ${shell.status} ${shellUrl}`);
    const servedHtml = await shell.text();
    const servedRefs = entryBundles(servedHtml);
    assert.deepEqual(servedRefs.map(ref => path.basename(new URL(ref, shell.url).pathname)).sort(),
        localRefs.map(ref => path.basename(new URL(ref, 'http://local/').pathname)).sort(), 'Served entry bundle set differs from local production build');
    const bundles = [];
    for (const ref of servedRefs) {
        const name = path.basename(new URL(ref, shell.url).pathname);
        const localPath = path.join(root, 'build/assets', name);
        assert.ok(fs.existsSync(localPath), `Local build entry bundle is missing: ${name}`);
        const localSha256 = crypto.createHash('sha256').update(fs.readFileSync(localPath)).digest('hex');
        const url = new URL(ref, shell.url).toString();
        const response = await fetch(url);
        assert.ok(response.ok, `Served entry bundle failed: ${response.status} ${url}`);
        const servedSha256 = crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
        assert.equal(servedSha256, localSha256, `Served bytes do not match local production build: ${name}`);
        bundles.push({name, url, sha256: servedSha256, matchesLocalBuild: true});
    }
    return {shellUrl: shell.url, stampRevision: build.revision, stampDirty: build.dirty,
        localOutputHash: build.output, localOutputHashVerified: true, bundles};
}

async function captureExample(page, entry, demonstration, recipe, browserVersion, servedBuild, build, sourceRevision) {
    const target = new URL(entry.path, new URL(appBaseUrl).origin).toString();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(target, {waitUntil: 'domcontentloaded'});
    const requested = new URL(target);
    assert.equal(new URL(page.url()).pathname, requested.pathname, `${entry.id}: wrong route`);
    assert.equal(new URL(page.url()).search, requested.search, `${entry.id}: wrong example identity`);
    const board = page.locator('#jgbox');
    await board.waitFor({state: 'visible'});
    const previous = page.locator('.guided-lesson-nav-back');
    await previous.waitFor({state: 'visible'});
    assert.equal(await previous.isDisabled(), true, `${entry.id}: URL did not open the initial guided-example frame`);
    const progress = await page.locator('.guided-lesson-progress').innerText();
    assert.match(progress, /Korak 1 od \d+\s*·\s*Okvir 1 od \d+/, `${entry.id}: capture did not begin on step 1, frame 1`);
    await settle(page);
    const initial = await inspectBoard(page);
    verifyEvidence(entry, initial);
    await page.waitForTimeout(250);
    const settled = await inspectBoard(page);
    assert.deepEqual(settled, initial, `${entry.id}: board changed after initial-frame settling; refusing a later or animated frame`);
    assert.equal(page.url(), target, `${entry.id}: route or example identity changed before capture`);
    await page.evaluate(async () => { await document.fonts.ready; });
    const guidedLessonOverlayHidden = await hideGuidedLessonOverlay(page);
    const scene = await presentBoard(board, demonstration, recipe, {frame});
    const presented = await inspectBoard(page);
    assertPresentationGeometryStable(initial, presented, entry.id);
    const sceneEvidence = verifyEvidence(entry, presented);
    assert.deepEqual([scene.width, scene.height], [frame.width, frame.height], `${entry.id}: frame size`);
    assert.ok(scene.framedElementCount > 0, `${entry.id}: no framed board geometry`);
    assert.deepEqual(scene.outOfFrameElements, [], `${entry.id}: cropped board labels or geometry`);
    assert.deepEqual(pageErrors, [], `${entry.id}: browser runtime errors`);
    const file = `${entry.id}.png`;
    const output = path.join(destination, file);
    await page.screenshot({path: output, clip: await board.evaluate(container => {
        const rect = container.getBoundingClientRect(); const style = getComputedStyle(container);
        return {x: rect.left + parseFloat(style.borderLeftWidth), y: rect.top + parseFloat(style.borderTopWidth), width: container.clientWidth, height: container.clientHeight};
    }), animations: 'disabled', caret: 'hide', scale: 'device'});
    const dimensions = pngDimensions(output);
    assert.deepEqual(dimensions, {width: frame.width * deviceScaleFactor, height: frame.height * deviceScaleFactor});
    return {id: entry.id, demonstrationId: entry.demonstrationId, path: entry.path, sceneFingerprint: entry.sceneFingerprint,
        actions: entry.actions || [], file, width: dimensions.width, height: dimensions.height, sha256: hashFile(output),
        scene: sceneEvidence, initialFrame: {firstFrame: true, backNavigationDisabled: true, stableAcrossMs: 250,
            preparedBoardEvidence: verifyEvidence(entry, initial)},
        framing: {boardOnly: true, width: frame.width, height: frame.height, scale: deviceScaleFactor,
            equalUserUnits: scene.unitScale && Math.abs(scene.unitScale[0] - scene.unitScale[1]) < 1e-8,
            renderedLabelCount: scene.renderedLabelCount, finalLabelCount: scene.finalLabelCount, guidedLessonOverlayHidden,
            visibleElementTypesAfterPresentation: scene.visibleElementTypes},
        captureEvidence: {browserVersion, servedBuildVerified: true, buildRevision: build.revision,
            sourceRevision, pageErrors}};
}

async function main(argv = process.argv.slice(2)) {
    const {inventoryPath, ids} = parseArgs(argv);
    const inventory = readInventory(inventoryPath);
    const inventoryIds = inventory.map(entry => entry.id);
    const selectedIds = ids.length ? [...new Set(ids)] : inventoryIds;
    assert.equal(selectedIds.length, ids.length || inventoryIds.length, 'Duplicate selected guided-example id');
    for (const id of selectedIds) assert.ok(inventoryIds.includes(id), `Unknown guided-example id: ${id}`);
    const stampPath = path.join(root, '.bezeg-build-provenance.json');
    assert.ok(fs.existsSync(stampPath), 'Build provenance is missing; run `just build` before capture');
    const build = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
    const servedBuild = await verifyServedBuild(build);
    const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
    const sourceState = execFileSync('git', ['status', '--porcelain', '--', 'src/learning', 'src/graphs', 'src/demonstrations.ts', 'src/Routes.tsx'], {cwd: root, encoding: 'utf8'}).trim();
    const recipeFraming = [...new Set(inventory.map(entry => entry.demonstrationId))].sort().map(id => ({id, framing: recipes[id]?.framing}));
    const entryFraming = inventory.map(entry => ({id: entry.id, demonstrationId: entry.demonstrationId,
        framing: captureRecipeForEntry(entry, recipes[entry.demonstrationId])?.framing}));
    const fingerprints = {inventory: fingerprintInventory(inventory),
        presentation: presentationFingerprint({recipeFraming, entryFraming}),
    buildOutput: build.output, buildInputs: build.inputs || digestInputs(root)};
    const previousManifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {captures: []};
    const retained = validateRetained(inventory, previousManifest, destination, selectedIds, fingerprints);
    fs.mkdirSync(destination, {recursive: true});
    const browser = await chromium.launch({headless: true, ...(process.env.PREVIEW_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.PREVIEW_BROWSER_EXECUTABLE_PATH} : {})});
    const captures = [];
    try {
        for (const entry of inventory.filter(item => selectedIds.includes(item.id))) {
            const demonstration = demonstrations.find(item => item.id === entry.demonstrationId);
            assert.ok(demonstration, `${entry.id}: unknown demonstrationId ${entry.demonstrationId}`);
            const sharedRecipe = recipes[entry.demonstrationId];
            assert.ok(sharedRecipe, `${entry.id}: no capture-only framing recipe for ${entry.demonstrationId}`);
            const recipe = captureRecipeForEntry(entry, sharedRecipe);
            const context = await browser.newContext({viewport, deviceScaleFactor, locale: 'sl-SI', colorScheme: 'light'});
            try {
                const page = await context.newPage();
                page.setDefaultNavigationTimeout(90_000);
                captures.push(await captureExample(page, entry, demonstration, recipe, browser.version(), servedBuild, build, sourceRevision));
                console.log(`${entry.id}: ${captures.at(-1).width}x${captures.at(-1).height} sha256=${captures.at(-1).sha256}`);
            } finally { await context.close(); }
        }
    } finally { await browser.close(); }
    const allCaptures = [...retained, ...captures].sort((a, b) => inventoryIds.indexOf(a.id) - inventoryIds.indexOf(b.id));
    validatePublishedSet(inventory, allCaptures, destination);
    const manifest = {version: 1, generator: 'scripts/capture-guided-example-previews.cjs', sourceRevision,
        sourceTree: 'prepared scene/action fingerprints come from the complete generated inventory; source/build revision is recorded separately',
        sourceStateDirty: Boolean(sourceState), buildStamp: build, servedBuild, appBaseUrl,
        browserVersion: browser.version(), locale: 'sl-SI', colorScheme: 'light', fingerprints,
        capture: {cleanContextPerExample: true, boardOnly: true, frame, viewport, deviceScaleFactor,
            sceneSource: 'exact canonical /bezeg-2.0 route and ?example query; no controls/actions changed',
            initialFrame: 'first guided-lesson frame with previous disabled and stable prepared board across 250 ms',
            guidedLessonOverlay: 'capture-only visibility hidden before framing; first frame and scene remain untouched',
            presentation: 'existing presentBoard capture-only camera, label sizing and construction-stroke treatment', entryFraming}, captures: allCaptures};
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Wrote ${allCaptures.length} guided-example previews to ${path.relative(root, destination)}.`);
}

module.exports = {parseArgs, readInventory, fingerprintInventory, inspectBoard, isViewportSpanningHorizontalCurve,
    isCameraScaledCurve, isSameGraphOnOverlap, assertPresentationGeometryStable, hideGuidedLessonOverlay, entryBundles,
    verifyServedBuild, captureRecipeForEntry, presentationHelpers, presentationFingerprint, captureExample};
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
