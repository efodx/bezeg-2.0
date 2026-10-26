// Refresh the six reader figures from their exact, authored activity URLs:
// node scripts/capture-chapter-figures.cjs
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const demonstrations = require('../tests/smoke-catalog.cjs');
const {recipes, settle} = require('./demonstration-preview-recipes.cjs');
const {presentBoard, hashFile, pngDimensions} = require('./capture-demonstration-previews.cjs');
const {digestBuild} = require('./commands.cjs');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'src/images/learning/bezier');
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4387/bezeg-2.0').replace(/\/$/, '');
const frame = {width: 360, height: 220};
const deviceScaleFactor = 2;
const activities = [
    {id: 'shape-control', demonstrationId: 'bezier', url: '/bezier/curve?chapter=bezier-curves&activity=shape-control', actions: ['prepare bezier-default', 'show control-polygon', 'hide convex-hull'], expectedControls: [[-4,-3],[-3,2],[2,2],[3,-2]], expectedCurveCount: 1, expectedCurves: [[[-4,-3],[-0.5,0.875],[3,-2]]], checks: ['cubic-curve', 'four-control-points', 'control-polygon']},
    {id: 'curve-parameter', demonstrationId: 'decasteljau', url: '/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter', actions: ['prepare decasteljau-quartic', 'show decasteljau-scheme', 'show decasteljau-full-curve', 'set t=0.5', 'pause animation'], expectedControls: [[-4,-3],[-3,2],[0,3],[3,2],[4,-3]], expectedCurveCount: 2, expectedCurves: [[[-4,-3],[0,1.75],[4,-3]]], checks: ['quartic-controls', 'decasteljau-levels', 'parameter-0.5']},
    {id: 'repeated-interpolation', demonstrationId: 'decasteljau', url: '/bezier/decasteljau?chapter=bezier-curves&activity=repeated-interpolation', actions: ['prepare decasteljau-quartic', 'show decasteljau-scheme', 'show decasteljau-full-curve', 'set t=0.5', 'pause animation'], expectedControls: [[-4,-3],[-3,2],[0,3],[3,2],[4,-3]], expectedCurveCount: 2, expectedCurves: [[[-4,-3],[0,1.75],[4,-3]]], checks: ['quartic-controls', 'decasteljau-levels', 'parameter-0.5']},
    {id: 'blending-coefficients', demonstrationId: 'bernstein', url: '/bernstein?chapter=bezier-curves&activity=blending-coefficients', actions: ['prepare bernstein-default', 'set degree=2', 'hide stacked-area'], expectedCurveCount: 3, expectedCurves: [[[0,1],[0.5,0.25],[1,0]], [[0,0],[0.5,0.5],[1,0]], [[0,0],[0.5,0.25],[1,1]]], checks: ['three-visible-degree-two-basis-functions']},
    {id: 'geometric-bounds', demonstrationId: 'bezier', url: '/bezier/curve?chapter=bezier-curves&activity=geometric-bounds', actions: ['prepare bezier-default', 'show control-polygon', 'show convex-hull', 'hide decasteljau-scheme'], expectedControls: [[-4,-3],[-3,2],[2,2],[3,-2]], expectedCurveCount: 1, expectedCurves: [[[-4,-3],[-0.5,0.875],[3,-2]]], checks: ['cubic-curve', 'four-control-points', 'control-polygon', 'convex-hull']},
    {id: 'transform-shape', demonstrationId: 'affine', url: '/bezier/affine?chapter=bezier-curves&activity=transform-shape', actions: ['prepare affine-default', 'show control-polygon'], expectedControls: [[-3,2],[0,-2],[1,2],[3,-2]], expectedCurveCount: 1, expectedCurves: [[[-3,2],[0.375,0],[3,-2]]], checks: ['original-affine-cubic', 'four-control-points', 'control-polygon']},
];

function close(a, b) { return Math.abs(a - b) < 1e-7; }
function containsPoint(points, expected) { return points.some(point => close(point[0], expected[0]) && close(point[1], expected[1])); }
function verify(activity, evidence) {
    assert.ok(evidence.visibleCount > 0, `${activity.id}: empty board`);
    if (activity.expectedControls) for (const point of activity.expectedControls) {
        assert.ok(containsPoint(evidence.points, point), `${activity.id}: missing authored point ${point}`);
    }
    if (activity.expectedCurveCount) assert.equal(evidence.curves.length, activity.expectedCurveCount,
        `${activity.id}: expected ${activity.expectedCurveCount} visible basis curves; got ${evidence.types.curve || 0}`);
    assert.ok((evidence.types.curve || 0) > 0, `${activity.id}: no visible curves`);
    for (const expected of activity.expectedCurves || []) assert.ok(evidence.curves.some(curve =>
        expected.every((sample, index) => sample.every((value, axis) => close(curve[index][axis], value)))),
    `${activity.id}: missing expected live curve samples ${JSON.stringify(expected)}`);
    if (activity.checks.includes('decasteljau-levels')) {
        const middlePoints = [[-3.5,-0.5],[-1.5,2.5],[1.5,2.5],[3.5,-0.5],[-2.5,1],[0,2.5],[2.5,1],[-1.25,1.75],[1.25,1.75],[0,1.75]];
        for (const point of middlePoints) assert.ok(containsPoint(evidence.points, point), `${activity.id}: missing t=0.5 interpolation point ${point}`);
    }
    if (activity.checks.includes('convex-hull')) assert.ok((evidence.types.polygon || 0) > 0,
        `${activity.id}: authored convex hull is not a visible polygon`);
    if (activity.checks.includes('control-polygon')) assert.ok((evidence.types.line || 0) > 0 || (evidence.types.segment || 0) > 0 || (evidence.types.polygon || 0) > 0,
        `${activity.id}: no visible control polygon lines; observed ${JSON.stringify(evidence.types)}`);
    return {visibleElementCount: evidence.visibleCount, visibleElementTypes: evidence.types, visiblePointCount: evidence.points.length,
        checkedControlPoints: activity.expectedControls || [], sampledVisibleCurves: evidence.curves, checks: activity.checks};
}

async function inspectBoard(page) {
    return page.evaluate(() => {
        const container = document.querySelector('#jgbox');
        const board = Object.values(window.JXG?.boards || {}).find(item => item.container === container?.id || item.containerObj === container);
        if (!board) throw new Error('activity board is missing');
        const visible = Object.values(board.objects || {}).filter(object => {
            if (!object?.rendNode?.isConnected || object.visProp?.visible === false || object.visProp?.visible === 'false') return false;
            const style = getComputedStyle(object.rendNode);
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
        });
        const points = visible.filter(object => object.elType === 'point').map(object => {
            const coords = object.coords?.usrCoords;
            return coords?.length >= 3 && Math.abs(coords[0]) > 1e-12 ? [coords[1] / coords[0], coords[2] / coords[0]] : null;
        }).filter(Boolean).sort((a,b) => a[0] - b[0] || a[1] - b[1]);
        const curves = visible.filter(object => object.elType === 'curve' && typeof object.X === 'function' && typeof object.Y === 'function')
            .map(object => [0, 0.5, 1].map(t => [Number(object.X(t).toFixed(6)), Number(object.Y(t).toFixed(6))]))
            .sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        const types = visible.reduce((counts, object) => (counts[object.elType] = (counts[object.elType] || 0) + 1, counts), {});
        return {visibleCount: visible.length, points, curves, types};
    });
}

function entryBundles(html) {
    return [...new Set([...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(match => match[1]))]
        .filter(ref => /(?:^|\/)assets\/[^/]+\.(?:m?js|css)(?:\?|$)/.test(ref));
}

async function verifyServedBuild(build) {
    assert.equal(digestBuild(root), build.output, 'Local build bytes differ from the build provenance stamp');
    const localHtml = fs.readFileSync(path.join(root, 'build/index.html'), 'utf8');
    const localRefs = entryBundles(localHtml);
    assert.ok(localRefs.length, 'Local production HTML has no Vite entry bundles');
    const shellUrl = `${baseUrl}/`;
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

async function main() {
    fs.mkdirSync(destination, {recursive: true});
    const stampPath = path.join(root, '.bezeg-build-provenance.json');
    assert.ok(fs.existsSync(stampPath), 'Build provenance is missing; run `just build` before capture');
    const build = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
    const servedBuild = await verifyServedBuild(build);
    const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
    const browser = await chromium.launch({headless: true, ...(process.env.PREVIEW_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.PREVIEW_BROWSER_EXECUTABLE_PATH} : {})});
    const browserVersion = browser.version();
    const captures = [];
    try {
        for (const activity of activities) {
            const demonstration = demonstrations.find(item => item.id === activity.demonstrationId);
            assert.ok(demonstration, `${activity.id}: missing demonstration metadata`);
            const recipe = recipes[activity.demonstrationId];
            assert.ok(recipe, `${activity.id}: missing presentation recipe`);
            const context = await browser.newContext({viewport: {width: 1440, height: 920}, deviceScaleFactor, locale: 'sl-SI', colorScheme: 'light'});
            try {
                const page = await context.newPage();
                page.setDefaultNavigationTimeout(90_000);
                const pageErrors = [];
                page.on('pageerror', error => pageErrors.push(error.message));
                const target = `${baseUrl}${activity.url}`;
                await page.goto(target, {waitUntil: 'domcontentloaded'});
                assert.equal(new URL(page.url()).pathname, `/bezeg-2.0${activity.url.split('?')[0]}`, `${activity.id}: wrong route`);
                assert.equal(new URL(page.url()).search, `?${activity.url.split('?')[1]}`, `${activity.id}: wrong activity query`);
                const boardLocator = page.locator('#jgbox');
                await boardLocator.waitFor({state: 'visible'});
                await page.locator('.chapter-activity-context .activity-context-primary:not(:disabled)').waitFor({state: 'visible'});
                await page.waitForFunction(expected => {
                    const container = document.querySelector('#jgbox');
                    const board = Object.values(window.JXG?.boards || {}).find(item => item.container === container?.id || item.containerObj === container);
                    if (!board) return false;
                    const visible = Object.values(board.objects || {}).filter(object => {
                        if (!object?.rendNode?.isConnected || object.visProp?.visible === false || object.visProp?.visible === 'false') return false;
                        const style = getComputedStyle(object.rendNode);
                        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
                    });
                    const points = visible.filter(object => object.elType === 'point').map(object => {
                        const coords = object.coords?.usrCoords;
                        return coords?.length >= 3 && Math.abs(coords[0]) > 1e-12 ? [coords[1] / coords[0], coords[2] / coords[0]] : null;
                    }).filter(Boolean);
                    const has = point => points.some(candidate => Math.abs(candidate[0] - point[0]) < 1e-7 && Math.abs(candidate[1] - point[1]) < 1e-7);
                    return visible.some(object => object.elType === 'curve') && expected.controls.every(has) &&
                        (!expected.midpointConstruction || expected.midpointConstruction.every(has)) &&
                        (!expected.curveCount || visible.filter(object => object.elType === 'curve').length === expected.curveCount);
                }, {controls: activity.expectedControls || [], midpointConstruction: activity.checks.includes('decasteljau-levels') ? [[-3.5,-0.5],[-1.5,2.5],[1.5,2.5],[3.5,-0.5],[-2.5,1],[0,2.5],[2.5,1],[-1.25,1.75],[1.25,1.75],[0,1.75]] : null, curveCount: activity.expectedCurveCount}, {timeout: 30_000});
                await settle(page);
                await page.waitForFunction(() => window.MathJax?.startup?.promise, {timeout: 30_000});
                await page.evaluate(async () => { await window.MathJax.startup.promise; await window.MathJax.typesetPromise(); await document.fonts.ready; });
                const inspected = await inspectBoard(page);
                const checked = verify(activity, inspected);
                assert.deepEqual(pageErrors, [], `${activity.id}: browser runtime errors`);
                const scene = await presentBoard(boardLocator, demonstration, recipe, {frame});
                const presentedEvidence = await inspectBoard(page);
                assert.deepEqual(presentedEvidence.points, inspected.points, `${activity.id}: capture presentation changed point geometry`);
                assert.deepEqual(presentedEvidence.curves, inspected.curves, `${activity.id}: capture presentation changed curve geometry`);
                verify(activity, presentedEvidence);
                assert.deepEqual([scene.width, scene.height], [frame.width, frame.height], `${activity.id}: capture frame size`);
                assert.ok(scene.framedElementCount > 0, `${activity.id}: no framed board geometry`);
                assert.deepEqual(scene.outOfFrameElements, [], `${activity.id}: cropped board labels or geometry`);
                const file = `${activity.id}.png`;
                const output = path.join(destination, file);
                await page.screenshot({path: output, clip: await boardLocator.evaluate(container => {
                    const rect = container.getBoundingClientRect(); const style = getComputedStyle(container);
                    return {x: rect.left + parseFloat(style.borderLeftWidth), y: rect.top + parseFloat(style.borderTopWidth), width: container.clientWidth, height: container.clientHeight};
                }), animations: 'disabled', caret: 'hide', scale: 'device'});
                const dimensions = pngDimensions(output);
                assert.deepEqual(dimensions, {width: frame.width * deviceScaleFactor, height: frame.height * deviceScaleFactor});
                captures.push({id: activity.id, url: target, demonstrationId: activity.demonstrationId, actions: activity.actions, file, width: dimensions.width, height: dimensions.height,
                    sha256: hashFile(output), scene: checked, framing: {boardOnly: true, width: frame.width, height: frame.height, scale: deviceScaleFactor,
                        equalUserUnits: scene.unitScale && Math.abs(scene.unitScale[0] - scene.unitScale[1]) < 1e-8,
                        renderedLabelCount: scene.renderedLabelCount, finalLabelCount: scene.finalLabelCount,
                        visibleElementTypesAfterPresentation: scene.visibleElementTypes}});
                console.log(`${activity.id}: ${dimensions.width}x${dimensions.height} sha256=${captures.at(-1).sha256}`);
            } finally { await context.close(); }
        }
    } finally { await browser.close(); }
    const manifest = {version: 1, generator: 'scripts/capture-chapter-figures.cjs', sourceRevision,
        sourceTree: 'captures record this checkout revision; activity URLs and source actions are listed per asset', buildStamp: build, servedBuild,
        baseUrl, browserVersion, locale: 'sl-SI', colorScheme: 'light', capture: {cleanContextPerActivity: true,
            boardOnly: true, frame, deviceScaleFactor, sceneSource: 'exact chapter activity query URL; no manually applied graph state',
            presentation: 'existing presentBoard capture-only camera, label sizing and construction-stroke treatment'}, captures};
    fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Wrote ${captures.length} chapter activity figures to ${path.relative(root, destination)}.`);
}

module.exports = {activities, verify};
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
