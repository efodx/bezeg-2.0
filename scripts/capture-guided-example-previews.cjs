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
        const curves = visible.filter(object => ['curve', 'functiongraph'].includes(object.elType) && typeof object.X === 'function' && typeof object.Y === 'function')
            .map(object => [0, 0.5, 1].map(t => [Number(object.X(t).toFixed(6)), Number(object.Y(t).toFixed(6))]))
            .sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        const types = visible.reduce((counts, object) => (counts[object.elType] = (counts[object.elType] || 0) + 1, counts), {});
        return {visibleCount: visible.length, points, curves, types};
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
    const scene = await presentBoard(board, demonstration, recipe, {frame});
    const presented = await inspectBoard(page);
    assert.deepEqual(presented.points, initial.points, `${entry.id}: capture presentation changed point geometry`);
    assert.deepEqual(presented.curves, initial.curves, `${entry.id}: capture presentation changed curve geometry`);
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
            renderedLabelCount: scene.renderedLabelCount, finalLabelCount: scene.finalLabelCount,
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
    const fingerprints = {inventory: fingerprintInventory(inventory), presentation: crypto.createHash('sha256')
        .update(presentBoard.toString()).update(hashFile(path.join(__dirname, 'capture-demonstration-previews.cjs')))
        .update(JSON.stringify({frame, viewport, deviceScaleFactor, recipeFraming})).digest('hex'),
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
            const recipe = recipes[entry.demonstrationId];
            assert.ok(recipe, `${entry.id}: no capture-only framing recipe for ${entry.demonstrationId}`);
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
            presentation: 'existing presentBoard capture-only camera, label sizing and construction-stroke treatment'}, captures: allCaptures};
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Wrote ${allCaptures.length} guided-example previews to ${path.relative(root, destination)}.`);
}

module.exports = {parseArgs, readInventory, fingerprintInventory, inspectBoard, entryBundles, verifyServedBuild, captureExample};
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
