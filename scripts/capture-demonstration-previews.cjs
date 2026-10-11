// Regenerate the production catalog's graph previews from unmodified default routes:
// node scripts/capture-demonstration-previews.cjs
// The generator opens every route in an empty browser context and captures only
// its live JSXGraph board. It never imports, mounts, or configures a graph itself.
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const demonstrations = require('../tests/smoke-catalog.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'src/images/demonstrations/catalog');
const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:3012/bezeg-2.0';
const viewport = {width: 1440, height: 850};
const frame = {width: 360, height: 220};
const deviceScaleFactor = 2;
const locale = 'sl-SI';
const colorScheme = 'light';
const paddingFraction = 0.12;
const coordinateContextRoutes = new Set([
    'bernstein',
    'linear-function',
    'exponential-function',
    'trigonometric-functions',
    'continuity',
]);

function pngDimensions(file) {
    const data = fs.readFileSync(file);
    assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a', `${path.basename(file)} is not a PNG`);
    return {width: data.readUInt32BE(16), height: data.readUInt32BE(20)};
}

function hashFile(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function main() {
    assert.equal(demonstrations.length, 30, `Expected 30 route defaults; found ${demonstrations.length}`);
    assert.equal(new Set(demonstrations.map(demonstration => demonstration.id)).size, demonstrations.length,
        'Demonstration IDs must be unique');
    assert.equal(new Set(demonstrations.map(demonstration => demonstration.path)).size, demonstrations.length,
        'Demonstration paths must be unique');
    fs.mkdirSync(output, {recursive: true});

    const graphSourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
    const browser = await chromium.launch({headless: true});
    const browserVersion = browser.version();
    const captures = [];
    let expectedDimensions;

    try {
        for (const demonstration of demonstrations) {
            const context = await browser.newContext({
                viewport,
                deviceScaleFactor,
                locale,
                colorScheme,
                reducedMotion: 'reduce',
                timezoneId: 'Europe/Ljubljana',
            });
            await context.addInitScript(() => {
                // The default route scene is required; remove any accidental browser preset.
                localStorage.clear();
                sessionStorage.clear();
            });
            const page = await context.newPage();
            page.setDefaultNavigationTimeout(90_000);
            page.setDefaultTimeout(30_000);
            const pageErrors = [];
            page.on('pageerror', error => pageErrors.push(error.message));

            try {
                await page.goto(`${baseUrl}${demonstration.path.slice('/bezeg-2.0'.length)}`, {
                    waitUntil: 'domcontentloaded',
                });
                assert.equal(new URL(page.url()).pathname, demonstration.path,
                    `${demonstration.id} did not stay on its exact metadata route`);
                assert.equal(new URL(page.url()).search, '', `${demonstration.id} unexpectedly has query settings`);

                const boardLocator = page.locator('#jgbox');
                await boardLocator.waitFor({state: 'visible'});
                await page.waitForFunction(() => {
                    const container = document.querySelector('#jgbox');
                    const board = Object.values(window.JXG?.boards || {}).find(candidate =>
                        candidate.container === container?.id || candidate.containerObj === container);
                    if (!container || !board || container.clientWidth < 300 || container.clientHeight < 300) return false;
                    return Object.values(board.objects || {}).some(object => {
                        if (!['curve', 'line'].includes(object.elType) || object.visProp?.visible === false || object.visProp?.visible === 'false') return false;
                        const node = object.rendNode;
                        if (!node?.isConnected || !(node.getAttribute?.('d') || node.getAttribute?.('x1'))) return false;
                        const style = getComputedStyle(node);
                        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
                    });
                });

                await page.waitForFunction(() => window.MathJax?.startup?.promise, {timeout: 30_000});
                await page.evaluate(async () => {
                    await window.MathJax.startup.promise;
                    await window.MathJax.typesetPromise();
                    await document.fonts.ready;
                });

                const scene = await boardLocator.evaluate(async (container, options) => {
                    const board = Object.values(window.JXG.boards).find(candidate =>
                        candidate.container === container.id || candidate.containerObj === container);
                    if (!board) throw new Error('Could not find the route-owned JSXGraph board');

                    const keepCoordinateContext = options.keepCoordinateContext;
                    const axes = [board.defaultAxes?.x, board.defaultAxes?.y].filter(Boolean);
                    const ticks = axes.map(axis => axis.defaultTicks).filter(Boolean);
                    const gridObjects = Object.values(board.objects || {}).filter(object => object.elType === 'grid');
                    const axisGridObjects = new Set([...axes, ...ticks, ...(board.grids || []), ...gridObjects]);
                    ticks.forEach(tick => (tick.labels || []).forEach(label => axisGridObjects.add(label)));
                    const includeContextDependents = object => {
                        Object.keys(object?.childElements || {}).forEach(id => {
                            const child = board.objects[id];
                            if (child && !axisGridObjects.has(child)) {
                                axisGridObjects.add(child);
                                includeContextDependents(child);
                            }
                        });
                    };
                    [...axisGridObjects].forEach(includeContextDependents);
                    if (!keepCoordinateContext) {
                        axisGridObjects.forEach(object => object.setAttribute({visible: false}));
                        ticks.forEach(tick => tick.setAttribute({visible: false, label: {visible: false}}));
                        ticks.forEach(tick => (tick.labels || []).forEach(label => label.setAttribute({visible: false})));
                    }

                    const typography = document.createElement('style');
                    typography.textContent = '#jgbox .JXGtext, #jgbox .smart-label-point2, #jgbox .smart-label-point2 * { font-size: 11px !important; line-height: 1.2 !important; } #jgbox .JXGtext mjx-container, #jgbox .smart-label-point2 mjx-container { font-size: 100% !important; }';
                    document.head.appendChild(typography);

                    // Resize only the captured board and use equal user-unit scales so geometric
                    // constructions (especially circles) keep their mathematical proportions.
                    container.style.setProperty('border', '0px', 'important');
                    container.style.setProperty('width', options.frame.width + 'px', 'important');
                    container.style.setProperty('height', options.frame.height + 'px', 'important');
                    container.style.setProperty('min-width', options.frame.width + 'px', 'important');
                    container.style.setProperty('max-width', options.frame.width + 'px', 'important');
                    container.style.setProperty('min-height', options.frame.height + 'px', 'important');
                    container.style.setProperty('max-height', options.frame.height + 'px', 'important');
                    board.resizeContainer(options.frame.width, options.frame.height, true, true);
                    board.setBoundingBox(board.getBoundingBox(), true, 'update');
                    board.fullUpdate();
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                    const boardRect = container.getBoundingClientRect();
                    const originX = board.origin.scrCoords[1];
                    const originY = board.origin.scrCoords[2];
                    const ranges = [];
                    const contentObjects = [];
                    const isVisible = object => {
                        if (!object || object.visProp?.visible === false || object.visProp?.visible === 'false') return false;
                        const node = object.rendNode;
                        if (!node?.isConnected) return false;
                        const style = getComputedStyle(node);
                        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
                    };
                    const addUserPoint = (x, y) => {
                        if (Number.isFinite(x) && Number.isFinite(y)) ranges.push({minX: x, maxX: x, minY: y, maxY: y});
                    };

                    Object.values(board.objects || {}).forEach(object => {
                        if (!isVisible(object)) return;
                        const isContextElement = axisGridObjects.has(object) ||
                            ['axis', 'ticks', 'grid'].includes(object.elType);
                        if (isContextElement) return;

                        const node = object.rendNode;
                        const rect = node.getBoundingClientRect();
                        const points = [
                            [(rect.left - boardRect.left - originX) / board.unitX,
                                (originY - (rect.top - boardRect.top)) / board.unitY],
                            [(rect.right - boardRect.left - originX) / board.unitX,
                                (originY - (rect.top - boardRect.top)) / board.unitY],
                            [(rect.left - boardRect.left - originX) / board.unitX,
                                (originY - (rect.bottom - boardRect.top)) / board.unitY],
                            [(rect.right - boardRect.left - originX) / board.unitX,
                                (originY - (rect.bottom - boardRect.top)) / board.unitY],
                        ];
                        const xs = points.map(point => point[0]).filter(Number.isFinite);
                        const ys = points.map(point => point[1]).filter(Number.isFinite);
                        if (xs.length && ys.length && (rect.width > 0 || rect.height > 0)) {
                            ranges.push({
                                minX: Math.min(...xs), maxX: Math.max(...xs),
                                minY: Math.min(...ys), maxY: Math.max(...ys),
                            });
                        }
                        if (object.elType === 'point' && object.coords?.usrCoords?.length >= 3) {
                            const coords = object.coords.usrCoords;
                            if (Number.isFinite(coords[0]) && Math.abs(coords[0]) > 1e-12) {
                                addUserPoint(coords[1] / coords[0], coords[2] / coords[0]);
                            }
                        }
                        contentObjects.push(object);
                    });

                    if (!ranges.length) throw new Error('No visible construction bounds found for route capture');
                    const sceneBounds = {
                        minX: Math.min(...ranges.map(range => range.minX)),
                        maxX: Math.max(...ranges.map(range => range.maxX)),
                        minY: Math.min(...ranges.map(range => range.minY)),
                        maxY: Math.max(...ranges.map(range => range.maxY)),
                    };
                    const fitBounds = bounds => {
                        const sceneWidth = Math.max(bounds.maxX - bounds.minX, 1e-6);
                        const sceneHeight = Math.max(bounds.maxY - bounds.minY, 1e-6);
                        const paddedWidth = sceneWidth * (1 + options.paddingFraction * 2);
                        const paddedHeight = sceneHeight * (1 + options.paddingFraction * 2);
                        const aspectRatio = options.frame.width / options.frame.height;
                        const frameHeight = Math.max(paddedHeight, paddedWidth / aspectRatio);
                        const frameWidth = frameHeight * aspectRatio;
                        const centerX = (bounds.minX + bounds.maxX) / 2;
                        const centerY = (bounds.minY + bounds.maxY) / 2;
                        return [
                            centerX - frameWidth / 2,
                            centerY + frameHeight / 2,
                            centerX + frameWidth / 2,
                            centerY - frameHeight / 2,
                        ];
                    };
                    const unionBounds = (left, right) => ({
                        minX: Math.min(left.minX, right.minX),
                        maxX: Math.max(left.maxX, right.maxX),
                        minY: Math.min(left.minY, right.minY),
                        maxY: Math.max(left.maxY, right.maxY),
                    });
                    const measureRenderedTextBounds = () => {
                        const textRanges = [];
                        const currentBoardRect = container.getBoundingClientRect();
                        const currentOriginX = board.origin.scrCoords[1];
                        const currentOriginY = board.origin.scrCoords[2];
                        // Axis/tick labels are viewport context, not scene annotations; exclude them
                        // from fitting so the edge ticks do not recursively move the coordinate frame.
                        const labelNodes = contentObjects.filter(object => object.elType === 'text' && isVisible(object))
                            .map(object => object.rendNode);
                        labelNodes.forEach(node => {
                            const rect = node.getBoundingClientRect();
                            const points = [
                                [(rect.left - currentBoardRect.left - currentOriginX) / board.unitX,
                                    (currentOriginY - (rect.top - currentBoardRect.top)) / board.unitY],
                                [(rect.right - currentBoardRect.left - currentOriginX) / board.unitX,
                                    (currentOriginY - (rect.top - currentBoardRect.top)) / board.unitY],
                                [(rect.left - currentBoardRect.left - currentOriginX) / board.unitX,
                                    (currentOriginY - (rect.bottom - currentBoardRect.top)) / board.unitY],
                                [(rect.right - currentBoardRect.left - currentOriginX) / board.unitX,
                                    (currentOriginY - (rect.bottom - currentBoardRect.top)) / board.unitY],
                            ];
                            const xs = points.map(point => point[0]).filter(Number.isFinite);
                            const ys = points.map(point => point[1]).filter(Number.isFinite);
                            if (xs.length && ys.length && (rect.width > 0 || rect.height > 0)) {
                                textRanges.push({
                                    minX: Math.min(...xs), maxX: Math.max(...xs),
                                    minY: Math.min(...ys), maxY: Math.max(...ys),
                                });
                            }
                        });
                        if (!textRanges.length) return sceneBounds;
                        return {
                            minX: Math.min(...textRanges.map(range => range.minX)),
                            maxX: Math.max(...textRanges.map(range => range.maxX)),
                            minY: Math.min(...textRanges.map(range => range.minY)),
                            maxY: Math.max(...textRanges.map(range => range.maxY)),
                        };
                    };
                    const isWithinBoard = bounds => {
                        const currentBox = board.getBoundingBox();
                        return bounds.minX >= currentBox[0] - 1e-6 &&
                            bounds.maxX <= currentBox[2] + 1e-6 &&
                            bounds.minY >= currentBox[3] - 1e-6 &&
                            bounds.maxY <= currentBox[1] + 1e-6;
                    };
                    const aspectRatio = options.frame.width / options.frame.height;
                    const initialTargetBounds = fitBounds(sceneBounds);
                    board.setBoundingBox(initialTargetBounds, true, 'update');
                    board.fullUpdate();
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                    // Fixed-pixel text grows in user-unit bounds as the board zooms. Refit at most
                    // three times from the unchanged scene bounds plus rendered construction text.
                    // This preserves labels without allowing axis ticks or unbounded curves to
                    // drive geometric-route framing.
                    let finalSceneBounds = sceneBounds;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        const renderedTextBounds = measureRenderedTextBounds();
                        finalSceneBounds = unionBounds(sceneBounds, renderedTextBounds);
                        if (isWithinBoard(renderedTextBounds)) break;
                        board.setBoundingBox(fitBounds(finalSceneBounds), true, 'update');
                        board.fullUpdate();
                        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    }
                    finalSceneBounds = unionBounds(sceneBounds, measureRenderedTextBounds());
                    const finalRect = container.getBoundingClientRect();
                    const finalStyle = getComputedStyle(container);
                    const frameLeft = finalRect.left + parseFloat(finalStyle.borderLeftWidth);
                    const frameTop = finalRect.top + parseFloat(finalStyle.borderTopWidth);
                    const frameRight = frameLeft + container.clientWidth;
                    const frameBottom = frameTop + container.clientHeight;
                    const outOfFrameElements = contentObjects.filter(object =>
                        isVisible(object) && !(keepCoordinateContext && ['curve', 'line'].includes(object.elType))
                    ).flatMap(object => {
                        const rect = object.rendNode.getBoundingClientRect();
                        if (rect.width <= 0 && rect.height <= 0) return [];
                        if (rect.left < frameLeft - 1 || rect.right > frameRight + 1 ||
                            rect.top < frameTop - 1 || rect.bottom > frameBottom + 1) {
                            return [{id: object.id, elType: object.elType, bounds: [rect.left, rect.top, rect.right, rect.bottom]}];
                        }
                        return [];
                    });
                    const finalLabels = contentObjects.filter(object => object.elType === 'text' && isVisible(object));
                    finalLabels.forEach(label => {
                        const rect = label.rendNode.getBoundingClientRect();
                        if (rect.width <= 0 && rect.height <= 0) return;
                        if (rect.left < frameLeft - 1 || rect.right > frameRight + 1 ||
                            rect.top < frameTop - 1 || rect.bottom > frameBottom + 1) {
                            outOfFrameElements.push({
                                id: label.id,
                                elType: 'rendered-label',
                                bounds: [rect.left, rect.top, rect.right, rect.bottom],
                            });
                        }
                    });
                    const visible = Object.values(board.objects || {}).filter(isVisible);
                    const visibleTypes = visible.reduce((counts, object) => {
                        counts[object.elType] = (counts[object.elType] || 0) + 1;
                        return counts;
                    }, {});
                    return {
                        width: container.clientWidth,
                        height: container.clientHeight,
                        boundingBox: board.getBoundingBox(),
                        sceneBounds: finalSceneBounds,
                        paddingFraction: options.paddingFraction,
                        aspectRatio,
                        unitScale: [board.unitX, board.unitY],
                        visibleElementCount: visible.length,
                        visibleElementTypes: visibleTypes,
                        framedElementCount: contentObjects.length,
                        finalLabelCount: finalLabels.length,
                        outOfFrameElements,
                        renderedLabelCount: contentObjects.filter(object => object.elType === 'text' && isVisible(object)).length,
                        mathJaxLabelCount: container.querySelectorAll('mjx-container').length,
                        axesAndGrid: keepCoordinateContext ? 'retain' : 'hide',
                        boundsPolicy: 'finite visible objects and point coordinates; excludes axes, ticks, and grid; up to three text-aware refits; coordinate-route curves may extend beyond the viewport',
                    };
                }, {frame, paddingFraction, keepCoordinateContext: coordinateContextRoutes.has(demonstration.id)});

                assert.deepEqual([scene.width, scene.height], [frame.width, frame.height],
                    demonstration.id + ' did not resize to the 360:220 preview frame');
                assert.ok(scene.visibleElementCount > 0, `${demonstration.id} has no visible board elements`);
                assert.ok(scene.framedElementCount > 0, demonstration.id + ' has no framed construction elements');
                assert.deepEqual(scene.outOfFrameElements, [],
                    demonstration.id + ' has rendered construction outside the fitted board: ' + JSON.stringify(scene.outOfFrameElements));
                assert.ok(scene.boundingBox.every(Number.isFinite), demonstration.id + ' produced non-finite board bounds');
                assert.ok(scene.sceneBounds.minX >= scene.boundingBox[0] - 1e-6 &&
                    scene.sceneBounds.maxX <= scene.boundingBox[2] + 1e-6 &&
                    scene.sceneBounds.minY >= scene.boundingBox[3] - 1e-6 &&
                    scene.sceneBounds.maxY <= scene.boundingBox[1] + 1e-6,
                demonstration.id + ' fitted board does not enclose the visible scene');
                assert.ok(Math.abs(scene.unitScale[0] - scene.unitScale[1]) < 1e-8,
                    demonstration.id + ' changed equal x/y scale');
                assert.deepEqual(pageErrors, [], `${demonstration.id} raised a browser error`);

                const fileName = `${demonstration.id}.png`;
                const filePath = path.join(output, fileName);
                const clip = await boardLocator.evaluate(container => {
                    const rect = container.getBoundingClientRect();
                    const style = getComputedStyle(container);
                    return {
                        x: rect.left + parseFloat(style.borderLeftWidth),
                        y: rect.top + parseFloat(style.borderTopWidth),
                        width: container.clientWidth,
                        height: container.clientHeight,
                    };
                });
                assert.deepEqual([clip.width, clip.height], [frame.width, frame.height],
                    demonstration.id + ' clip does not match the preview frame');
                await page.screenshot({path: filePath, clip, animations: 'disabled', caret: 'hide', scale: 'device'});
                const dimensions = pngDimensions(filePath);
                assert.deepEqual(dimensions, {
                    width: frame.width * deviceScaleFactor,
                    height: frame.height * deviceScaleFactor,
                }, demonstration.id + ' did not capture at the expected 2x preview resolution');
                if (!expectedDimensions) expectedDimensions = dimensions;
                assert.deepEqual(dimensions, expectedDimensions,
                    `${demonstration.id} differs from the common capture dimensions ${JSON.stringify(expectedDimensions)}`);
                captures.push({
                    id: demonstration.id,
                    path: demonstration.path,
                    file: fileName,
                    sha256: hashFile(filePath),
                    image: dimensions,
                    axesAndGrid: scene.axesAndGrid,
                    framing: {
                        frameCssPixels: frame,
                        aspectRatio: scene.aspectRatio,
                        paddingFraction: scene.paddingFraction,
                        boundsPolicy: scene.boundsPolicy,
                        sceneBounds: scene.sceneBounds,
                        boardBoundingBox: scene.boundingBox,
                        framedElementCount: scene.framedElementCount,
                        finalLabelCount: scene.finalLabelCount,
                        outOfFrameElements: scene.outOfFrameElements,
                    },
                    board: {
                        width: scene.width,
                        height: scene.height,
                        visibleElementCount: scene.visibleElementCount,
                        visibleElementTypes: scene.visibleElementTypes,
                        renderedLabelCount: scene.renderedLabelCount,
                        mathJaxLabelCount: scene.mathJaxLabelCount,
                    },
                });
                console.log('Captured ' + demonstration.id + ': ' + dimensions.width + '×' + dimensions.height +
                    ', axes/grid ' + scene.axesAndGrid + ', ' + scene.framedElementCount + ' framed objects');
            } finally {
                await context.close();
            }
        }
    } finally {
        await browser.close();
    }

    assert.deepEqual(Array.from(coordinateContextRoutes).filter(id => !demonstrations.some(item => item.id === id)), [],
        'Coordinate-context policy references an unknown route');
    assert.deepEqual(captures.map(capture => capture.id), demonstrations.map(demonstration => demonstration.id),
        'Capture order and exhaustive route metadata no longer match');
    const manifest = {
        generator: 'scripts/capture-demonstration-previews.cjs',
        graphSourceRevision,
        capture: {
            source: 'live #jgbox from each Demonstration metadata route',
            routeMetadata: 'src/demonstrations.ts (validated by tests/smoke-catalog.cjs)',
            scene: 'fresh browser context with empty local/session storage; exact route without query; route default preset; capture-time board resize, axes/grid visibility, and bounding box only',
            viewport,
            frameCssPixels: frame,
            deviceScaleFactor,
            locale,
            colorScheme,
            reducedMotion: 'reduce',
            timezoneId: 'Europe/Ljubljana',
            baseUrl,
            browserVersion,
            coordinateContextRoutes: Array.from(coordinateContextRoutes),
            geometricRoutes: 'hide default axes, ticks, and grid',
            coordinateContext: 'retain default axes, ticks, and grid for Bernstein and function demonstrations',
            paddingFraction,
            frameAspectRatio: frame.width / frame.height,
            scalePolicy: 'equal user-unit scale to preserve geometric proportions',
            typography: 'capture-only 11px JSXGraph text and rational smart-label font; source content unchanged',
            containment: 'finite construction objects and their text annotations stay within the board; axis/tick labels are context; unbounded coordinate-route curves are viewport-clipped by JSXGraph',
            boundsPolicy: 'finite visible objects and point coordinates; excludes axes, ticks, and grid; up to three text-aware refits; coordinate-route curves may extend beyond the viewport',
        },
        image: expectedDimensions,
        captures,
    };
    fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    const importEntries = captures.map(({id}) => {
        const localName = `preview_${id.replace(/[^a-zA-Z0-9_$]/g, '_')}`;
        return {id, localName};
    });
    const previewMap = [
        '// Generated by scripts/capture-demonstration-previews.cjs; do not edit by hand.',
        "import type {DemonstrationId} from './demonstrations';",
        ...importEntries.map(({id, localName}) => `import ${localName} from './images/demonstrations/catalog/${id}.png';`),
        '',
        'export const demonstrationPreviewAssets: Record<DemonstrationId, string> = {',
        ...importEntries.map(({id, localName}) => `    '${id}': ${localName},`),
        '};',
        '',
    ].join('\n');
    fs.writeFileSync(path.join(root, 'src/demonstrationPreviewAssets.ts'), previewMap);
    console.log('Wrote ' + captures.length + ' 360:220 default-scene captures and manifest for ' + graphSourceRevision + '.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
