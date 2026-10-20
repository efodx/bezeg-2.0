// Regenerate the production catalog's graph previews from explicit capture-only recipes:
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
const {recipes, validateRecipes, applyRecipe, applyAction, settle} = require('./demonstration-preview-recipes.cjs');

const previewCapture = require('./demonstration-preview-capture-api.cjs');
const {generateMotions} = previewCapture;

const root = path.resolve(__dirname, '..');
const publishedOutput = path.join(root, 'src/images/demonstrations/catalog');
const output = path.join(root, '.command-logs', 'preview-staging-' + process.pid);
const mapPath = path.join(output, 'demonstrationPreviewAssets.ts');
const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:3012/bezeg-2.0';
const viewport = {width: 1440, height: 850};
const frame = {width: 360, height: 220};
const deviceScaleFactor = 2;
const locale = 'sl-SI';
const colorScheme = 'light';
const paddingFraction = 0.14;
const captureTextSize = 12;
const captureTextLineHeight = 1.2;
const captureCurveStrokeScale = 1.12;
const captureConstructionStrokeScale = 1.16;

/** Replace only requested clips while retaining source-frame evidence for every existing clip. */
function mergeRecapturedMotions(previous, replacements, replacementIds) {
    const replacementById=new Map(replacements.map(motion=>[motion.id,motion]));
    const ids=new Set(replacementIds);
    assert.equal(replacementById.size,replacements.length,'Duplicate recaptured motion ID');
    assert.ok([...replacementById.keys()].every(id=>ids.has(id)),'Unexpected replacement motion ID');
    const replacementIdsPresent=new Set();
    const merged=previous.map(motion=>{
        if(!ids.has(motion.id))return motion;
        const replacement=replacementById.get(motion.id);
        if(!replacement)return undefined;
        replacementIdsPresent.add(motion.id);
        return replacement;
    }).filter(Boolean);
    for(const replacement of replacements)if(!replacementIdsPresent.has(replacement.id))merged.push(replacement);
    return merged;
}

/** Record the intended poster camera after checking JSXGraph's one-ULP roundoff. */
function alignMotionCameras(captures, motions) {
    for (const motion of motions) {
        const poster = captures.find(capture => capture.id === motion.id);
        assert.ok(poster, `Missing poster camera for ${motion.id}`);
        const camera = poster.framing.boardBoundingBox;
        assert.ok(Array.isArray(motion.camera) && motion.camera.length === 4 && camera.length === 4 &&
            motion.camera.every((value, index) => Number.isFinite(value) && Number.isFinite(camera[index]) && Math.abs(value - camera[index]) < 1e-10),
        `Poster and clip cameras differ: ${motion.id}`);
        // Leave retained records byte-for-byte equivalent when they already match.
        if (motion.camera.some((value, index) => value !== camera[index])) motion.camera = [...camera];
    }
    return motions;
}

/** Keep numeric evidence intact without duplicating SVG paths already covered by hashes. */
function serializeManifest(manifest, compactMotionIds = []) {
    const compact = new Set(compactMotionIds), evidence = [];
    const value = {...manifest, motions: manifest.motions.map(motion => compact.has(motion.id) ? {
        ...motion, samples: motion.samples.map(sample => !sample.observed?.curves ? sample : {
            ...sample, observed: {...sample.observed, curves: sample.observed.curves.map(({d, ...curve}) => curve)},
        }),
    } : motion)};
    // One evidence array per line keeps metadata readable and avoids millions of
    // indentation-only lines. Old records retain every field and numeric sample.
    let json = JSON.stringify(value, (key, item) => {
        if (key !== 'samples' || !Array.isArray(item) || !item[0]?.capture) return item;
        const token = `__BEZEG_FRAME_EVIDENCE_${evidence.length}__`;
        evidence.push([JSON.stringify(token), JSON.stringify(item)]);
        return token;
    }, 2);
    for (const [token, raw] of evidence) json = json.replace(token, () => raw);
    return json + '\n';
}

function pngDimensions(file) {
    const data = fs.readFileSync(file);
    assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a', `${path.basename(file)} is not a PNG`);
    return {width: data.readUInt32BE(16), height: data.readUInt32BE(20)};
}

function hashFile(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function servedBuildProvenance() {
    const localHtml = fs.readFileSync(path.join(root, 'build/index.html'), 'utf8');
    const servedHtml = await (await fetch(baseUrl + '/')).text();
    const moduleSource = html => html.match(/<script[^>]+src="([^"]*\/assets\/[^"/]+\.js)"/)[1];
    const source = moduleSource(localHtml);
    assert.equal(moduleSource(servedHtml), source, 'Capture server is not serving this production build');
    const file = source.slice(source.indexOf('/assets/') + 1);
    const sha256 = hashFile(path.join(root, 'build', file));
    const response = await fetch(new URL(source, baseUrl));
    assert.ok(response.ok, 'Production module is unavailable');
    const actual = crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
    assert.equal(actual, sha256, 'Capture server module bytes differ from the local production build');
    return {file, sha256};
}

async function presentBoard(boardLocator, demonstration, recipe, configuration = {}) {
    return boardLocator.evaluate(async (container, options) => {
                    const board = Object.values(window.JXG.boards).find(candidate =>
                        candidate.container === container.id || candidate.containerObj === container);
                    if (!board) throw new Error('Could not find the route-owned JSXGraph board');

                    const keepCoordinateContext = options.keepCoordinateContext;
                    // Point names collide at card size. Hide only their route-owned label DOM.
                    Object.values(board.objects || {}).filter(o => o.elType === 'point' && o.label?.rendNode).forEach(o => o.label.rendNode.style.setProperty('display', 'none', 'important'));
                    if (options.window) Object.values(board.objects || {}).filter(o => o.elType === 'text').forEach(o => {
                        const text = o.rendNode?.textContent || '';
                        if (text.length > 65) o.rendNode.style.setProperty('display', 'none', 'important');
                    });
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

                    const typography = document.querySelector('#preview-capture-style') || document.createElement('style');
                    typography.id = 'preview-capture-style';
                    typography.textContent = `#jgbox, #jgbox * { transition:none !important; animation:none !important; } #jgbox .JXGinfobox { display:none !important; } #jgbox .JXGtext, #jgbox .smart-label-point2, #jgbox .smart-label-point2 * { font-size: ${options.captureTextSize}px !important; line-height: ${options.captureTextLineHeight} !important; } #jgbox .JXGtext mjx-container, #jgbox .smart-label-point2 mjx-container { font-size: 100% !important; }`;
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
                    board.setBoundingBox(board.getBoundingBox(), options.equalUnits, 'update');
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

                    // Strengthen only the captured DOM so small previews retain a clear
                    // distinction between the main curve and its supporting construction.
                    // Route state, JSXGraph attributes, and source graph styles stay unchanged.
                    const applyCaptureStrokeTreatment = object => {
                        if (!isVisible(object) || axisGridObjects.has(object) ||
                            ['axis', 'ticks', 'grid'].includes(object.elType) ||
                            !['curve', 'line'].includes(object.elType)) return;
                        const node = object.rendNode;
                        if (!node.dataset.previewBaseStroke) node.dataset.previewBaseStroke = getComputedStyle(node).strokeWidth;
                        if (!node.dataset.previewBaseOpacity) node.dataset.previewBaseOpacity = getComputedStyle(node).opacity || '1';
                        const currentWidth = Number.parseFloat(node.dataset.previewBaseStroke);
                        if (!Number.isFinite(currentWidth) || currentWidth <= 0) return;
                        const scale = object.elType === 'curve'
                            ? options.captureCurveStrokeScale : options.captureConstructionStrokeScale;
                        const minimum = object.elType === 'curve' ? 2 : 1.25;
                        node.style.setProperty('stroke-width', `${Math.max(minimum, currentWidth * scale)}px`);
                        const currentOpacity = Number.parseFloat(node.dataset.previewBaseOpacity);
                        if (Number.isFinite(currentOpacity)) {
                            node.style.setProperty('opacity', String(Math.min(1, currentOpacity * 1.08)));
                        }
                    };
                    Object.values(board.objects || {}).forEach(applyCaptureStrokeTreatment);

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
                    const sceneBounds = options.window ? {minX: options.window[0], maxY: options.window[1], maxX: options.window[2], minY: options.window[3]} : {
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
                        if (!options.equalUnits) return [bounds.minX - sceneWidth * options.paddingFraction, bounds.maxY + sceneHeight * options.paddingFraction,
                            bounds.maxX + sceneWidth * options.paddingFraction, bounds.minY - sceneHeight * options.paddingFraction];
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
                    const initialTargetBounds = options.camera || fitBounds(sceneBounds);
                    board.setBoundingBox(initialTargetBounds, options.equalUnits, 'update');
                    board.fullUpdate();
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                    // Fixed-pixel text grows in user-unit bounds as the board zooms. Refit at most
                    // three times from the unchanged scene bounds plus rendered construction text.
                    // This preserves labels without allowing axis ticks or unbounded curves to
                    // drive geometric-route framing.
                    let finalSceneBounds = sceneBounds;
                    for (let attempt = 0; !options.window && !options.camera && attempt < 3; attempt++) {
                        const renderedTextBounds = measureRenderedTextBounds();
                        finalSceneBounds = unionBounds(sceneBounds, renderedTextBounds);
                        if (isWithinBoard(renderedTextBounds)) break;
                        board.setBoundingBox(fitBounds(finalSceneBounds), options.equalUnits, 'update');
                        board.fullUpdate();
                        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    }
                    finalSceneBounds = options.window ? sceneBounds : unionBounds(sceneBounds, measureRenderedTextBounds());
                    const finalRect = container.getBoundingClientRect();
                    const finalStyle = getComputedStyle(container);
                    const frameLeft = finalRect.left + parseFloat(finalStyle.borderLeftWidth);
                    const frameTop = finalRect.top + parseFloat(finalStyle.borderTopWidth);
                    const frameRight = frameLeft + container.clientWidth;
                    const frameBottom = frameTop + container.clientHeight;
                    const outOfFrameElements = contentObjects.filter(object =>
                        isVisible(object) && !options.window && !(keepCoordinateContext && ['curve', 'line'].includes(object.elType))
                    ).flatMap(object => {
                        const rect = object.rendNode.getBoundingClientRect();
                        if (rect.width <= 0 && rect.height <= 0) return [];
                        if (rect.left < frameLeft - 1 || rect.right > frameRight + 1 ||
                            rect.top < frameTop - 1 || rect.bottom > frameBottom + 1) {
                            return [{id: object.id, elType: object.elType, bounds: [rect.left, rect.top, rect.right, rect.bottom]}];
                        }
                        return [];
                    });
                    // Greedily retain noncolliding existing weight labels; no invented labels or geometry.
                    if (['extrema','convexity'].includes(options.demonstrationId)) {
                        Object.values(board.objects).filter(o => o.elType === 'text').forEach(o => {
                            const rows = [...o.rendNode.children].filter(e => e.tagName === 'DIV');
                            const conclusion = rows.find(e => /globalni min|konveksna na|konkavna na|brez trditve/.test(e.textContent));
                            if (!conclusion) return;
                            o.rendNode.style.removeProperty('display');
                            rows.forEach(row => row.style.setProperty('display', row === conclusion ? 'block' : 'none', 'important'));
                            o.rendNode.style.cssText += ';position:absolute!important;left:12px!important;top:184px!important;width:336px!important;max-width:336px!important;white-space:normal!important;transform:none!important;clip-path:none!important;right:auto!important;bottom:auto!important;background:#fffdf5!important;opacity:1!important;';
                            if(options.demonstrationId==='extrema')o.rendNode.style.setProperty('height','36px','important');
                        });
                    }
                    if (['trigonometric-functions','definite-integral'].includes(options.demonstrationId)) {
                        Object.values(board.objects).filter(o=>o.elType==='text'&&o.rendNode?.textContent.includes('f(x)')).forEach(o=>{
                            o.rendNode.style.cssText += ';position:absolute!important;left:auto!important;right:10px!important;top:8px!important;bottom:auto!important;clip-path:none!important;transform:none!important;background:#fffdf5!important;opacity:1!important;';
                        });
                    }
                    const keptWeightRects = [];
                    const omittedAnnotations = [];
                    contentObjects.filter(o => o.elType === 'text' && isVisible(o) && String(o.visProp?.cssclass).includes('smart-label-point2')).forEach(o => {
                        const r = o.rendNode.getBoundingClientRect();
                        if (keptWeightRects.some(k => r.left < k.right + 5 && r.right > k.left - 5 && r.top < k.bottom + 5 && r.bottom > k.top - 5)) {
                            omittedAnnotations.push({id:o.id,text:o.rendNode.textContent,reason:'weight-label-overlap'});
                            o.rendNode.style.setProperty('display','none','important');
                        } else keptWeightRects.push(r);
                    });
                    const finalLabels = contentObjects.filter(object => object.elType === 'text' && isVisible(object));
                    finalLabels.forEach(label => {
                        if (options.window) return;
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
                        omittedAnnotations,
                        selectedConclusions: Object.values(board.objects).filter(o=>o.elType==='text'&&o.rendNode&&getComputedStyle(o.rendNode).display!=='none').flatMap(o=>[...o.rendNode.children].filter(e=>/globalni min|konveksna na|konkavna na|brez trditve/.test(e.textContent)&&getComputedStyle(e).display!=='none').map(e=>({text:e.textContent,clipPath:getComputedStyle(o.rendNode).clipPath,withinFrame:e.getBoundingClientRect().bottom<=container.getBoundingClientRect().bottom&&e.getBoundingClientRect().top>=container.getBoundingClientRect().top}))),
                        outOfFrameElements,
                        renderedLabelCount: contentObjects.filter(object => object.elType === 'text' && isVisible(object)).length,
                        mathJaxLabelCount: container.querySelectorAll('mjx-container').length,
                        axesAndGrid: keepCoordinateContext ? 'retain' : 'hide',
                        boundsPolicy: 'finite visible objects and point coordinates; excludes axes, ticks, and grid; up to three text-aware refits; coordinate-route curves may extend beyond the viewport',
                    };
                }, {
                    frame: configuration.frame || frame,
                    demonstrationId: demonstration.id,
                    window: configuration.window || recipe.framing.window,
                    camera: configuration.camera,
                    equalUnits: !recipe.framing.window || demonstration.id === 'complex-multiplication' || ['bezier', 'repeated-subdivision', 'affine', 'elevation', 'rational-elevation', 'extrapolation', 'rational-extrapolation'].includes(demonstration.id),
                    paddingFraction,
                    captureTextSize,
                    captureTextLineHeight,
                    captureCurveStrokeScale,
                    captureConstructionStrokeScale,
                    keepCoordinateContext: demonstrations.coordinateContextPolicy(demonstration) === 'retain',
                });

}

async function main() {
    validateRecipes(demonstrations);
    const started = Date.now();
    const servedBuild = await servedBuildProvenance();
    const presentationFingerprint=crypto.createHash('sha256').update(presentBoard.toString())
        .update(hashFile(path.join(__dirname,'demonstration-preview-motion.cjs')))
        .update(hashFile(path.join(__dirname,'demonstration-preview-capture-api.cjs')))
        .update(hashFile(path.join(__dirname,'demonstration-preview-analysis-motion.cjs')))
        .update(hashFile(path.join(__dirname,'demonstration-preview-curve-motion.cjs')))
        .update(hashFile(path.join(__dirname,'demonstration-preview-concept-motion.cjs')))
        .update(hashFile(path.join(__dirname,'demonstration-preview-recipes.cjs')))
        .update(JSON.stringify({viewport,frame,deviceScaleFactor,paddingFraction,captureTextSize,captureTextLineHeight,captureCurveStrokeScale,captureConstructionStrokeScale})).digest('hex');
    assert.ok(demonstrations.length > 0, 'Expected at least one active demonstration route');
    assert.equal(new Set(demonstrations.map(demonstration => demonstration.id)).size, demonstrations.length,
        'Demonstration IDs must be unique');
    assert.equal(new Set(demonstrations.map(demonstration => demonstration.path)).size, demonstrations.length,
        'Demonstration paths must be unique');
    fs.mkdirSync(output, {recursive: true});

    const sourceFiles = execFileSync('git', ['ls-files', 'src/graphs', 'src/bezeg', 'src/analysis', 'src/demonstrations.ts', 'src/Routes.tsx'], {cwd: root, encoding: 'utf8'}).trim().split(/\r?\n/);
    const sourceFingerprint = crypto.createHash('sha256');
    for (const file of sourceFiles) sourceFingerprint.update(file).update(fs.readFileSync(path.join(root, file)));
    const graphSourceFingerprint = sourceFingerprint.digest('hex');
    const graphDirtyFiles = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', ...sourceFiles], {cwd: root, encoding: 'utf8'}).trim().split(/\r?\n/).filter(Boolean);
    const graphSourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
    const launchOptions = {headless: true};
    if (process.env.PREVIEW_BROWSER_EXECUTABLE_PATH) {
        launchOptions.executablePath = path.resolve(process.env.PREVIEW_BROWSER_EXECUTABLE_PATH);
    }
    const browser = await chromium.launch(launchOptions);
    const browserVersion = browser.version();
    const captures = [];
    let motions = [];
    let diagnosticMotions = null;
    let previousGraphSourceRevision=null;
    let previousPresentationFingerprint=null;
    let previousSelectiveRecapture=null;
    let previousCaptureIds=[];
    let previousMotionIds=[];
    const recaptureIds = process.env.PREVIEW_RECAPTURE_IDS?.split(',');
    if(recaptureIds) {
        assert.ok(!process.env.PREVIEW_IDS,'Diagnostic and full-set recapture modes cannot be combined');
        assert.ok(recaptureIds.length && recaptureIds.every(id=>demonstrations.some(d=>d.id===id)),'Unknown recapture ID');
        const previous=JSON.parse(fs.readFileSync(path.join(publishedOutput,'manifest.json'),'utf8'));
        assert.equal(previous.version,2);
        assert.equal(previous.graphSourceFingerprint,graphSourceFingerprint,'Existing captures have different mathematical source; run full generation');
        previousGraphSourceRevision=previous.graphSourceRevision;
        previousPresentationFingerprint=previous.presentationFingerprint ?? null;
        previousSelectiveRecapture=previous.selectiveRecapture ?? null;
        previousCaptureIds=previous.captures.map(c=>c.id);
        previousMotionIds=previous.motions.map(m=>m.id);
        if(previous.presentationFingerprint) assert.ok(previous.presentationFingerprint===presentationFingerprint||process.env.PREVIEW_RECAPTURE_VERIFIED_PRESENTATION==='1',
            'Capture presentation fingerprint changed; run full generation or explicitly verify the selective recapture presentation');
        else assert.equal(process.env.PREVIEW_RECAPTURE_VERIFIED_PRESENTATION,'1','Legacy manifest recapture requires explicit verification that capture presentation is unchanged');
        for(const item of [...previous.captures,...previous.motions]) {
            const file=path.join(publishedOutput,item.file);
            assert.equal(hashFile(file),item.sha256,'Existing output checksum mismatch; run full generation');
            fs.copyFileSync(file,path.join(output,item.file));
        }
        captures.push(...previous.captures.filter(c=>!recaptureIds.includes(c.id)));
        motions=previous.motions;
    }
    let expectedDimensions;

    try {
        for (const demonstration of demonstrations.filter(d => recaptureIds ? recaptureIds.includes(d.id) : !process.env.PREVIEW_IDS || process.env.PREVIEW_IDS.split(',').includes(d.id))) {
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

                const recipe = recipes[demonstration.id];
                const evidence = await applyRecipe(page, recipe);

                await page.waitForFunction(() => window.MathJax?.startup?.promise, {timeout: 30_000});
                await page.evaluate(async () => {
                    await window.MathJax.startup.promise;
                    await window.MathJax.typesetPromise();
                    await document.fonts.ready;
                });

                const scene = await presentBoard(boardLocator, demonstration, recipe);
                // Convexity deliberately reveals the derivative conclusion at the motion payoff;
                // its poster shows the geometric comparison first.
                if (demonstration.id === 'extrema') assert.ok(scene.selectedConclusions.some(c=>c.withinFrame&&c.clipPath==='none'), demonstration.id+' must retain its visible defining conclusion');

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
                assert.ok(recipe.framing.window || Math.abs(scene.unitScale[0] - scene.unitScale[1]) < 1e-8,
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
                    recipe,
                    evidence,
                    posterCheckpoint: recipe.checkpoint,
                    coordinateContextPolicy: demonstrations.coordinateContextPolicy(demonstration),
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
                        omittedAnnotations: scene.omittedAnnotations,
                        selectedConclusions: scene.selectedConclusions,
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
        // Motion diagnostics run only beside a non-publishing PREVIEW_IDS poster diagnostic.
        if (process.env.PREVIEW_MOTION_IDS) {
            assert.ok(process.env.PREVIEW_IDS && !recaptureIds, 'Motion diagnostics require PREVIEW_IDS and cannot publish');
            diagnosticMotions = await generateMotions(browser, demonstrations, output, baseUrl, presentBoard, process.env.PREVIEW_MOTION_IDS.split(','));
        } else if (recaptureIds) {
            const motionRecaptureIds=recaptureIds.filter(id=>previewCapture.motionIds.includes(id));
            if(motionRecaptureIds.length) {
                const replacements=await generateMotions(browser,demonstrations,output,baseUrl,presentBoard,motionRecaptureIds);
                motions=mergeRecapturedMotions(motions,replacements,motionRecaptureIds);
            }
        } else if (!process.env.PREVIEW_IDS) motions = await generateMotions(browser, demonstrations, output, baseUrl, presentBoard);
    } finally {
        await browser.close();
    }

    for (const motion of diagnosticMotions || motions) {
        if (!previewCapture.isRecipeAligned(motion.id)) continue;
        const poster = captures.find(capture => capture.id === motion.id);
        assert.ok(poster, `Missing recipe poster for ${motion.id}`);
        assert.equal(motion.samples[0].capture.sha256, poster.sha256, `${motion.id}: first frame differs from recipe poster`);
        assert.equal(motion.samples.at(-1).capture.sha256, poster.sha256, `${motion.id}: last frame differs from recipe poster`);
    }

    alignMotionCameras(captures, diagnosticMotions || motions);

    if (process.env.PREVIEW_IDS) {
        fs.writeFileSync(path.join(output, 'partial-evidence.json'), JSON.stringify(captures, null, 2));
        if (diagnosticMotions) fs.writeFileSync(path.join(output, 'partial-motions.json'), JSON.stringify(diagnosticMotions, null, 2));
        console.log('Partial diagnostic capture retained in ' + output + '; production assets untouched.');
        return;
    }
    captures.sort((a,b)=>demonstrations.findIndex(d=>d.id===a.id)-demonstrations.findIndex(d=>d.id===b.id));
    assert.deepEqual(captures.map(capture => capture.id), demonstrations.map(demonstration => demonstration.id),
        'Capture order and exhaustive route metadata no longer match');
    const activePreviewFiles = new Set(captures.map(capture => capture.file));
    fs.readdirSync(output).filter(fileName => fileName.endsWith('.png') && !activePreviewFiles.has(fileName))
        .forEach(fileName => fs.unlinkSync(path.join(output, fileName)));
    const manifest = {
        generator: 'scripts/capture-demonstration-previews.cjs',
        version: 2,
        graphSourceRevision,
        graphSourceFingerprint,
        graphDirtyFiles,
        presentationFingerprint,
        servedBuild,
        capture: {
            source: 'live #jgbox from each Demonstration metadata route',
            routeMetadata: 'src/demonstrations.ts (validated by tests/smoke-catalog.cjs)',
            scene: 'fresh browser context with empty local/session storage; exact route without query; route default preset; explicit supported UI recipe setup; capture-only board resize, axes/grid visibility, preview legibility treatment, and bounding box; initial mathematical inputs preserved; supported setup and derived representations recorded per recipe; sole smooth motion exception recorded per sample',
            viewport,
            frameCssPixels: frame,
            deviceScaleFactor,
            locale,
            colorScheme,
            reducedMotion: 'reduce',
            timezoneId: 'Europe/Ljubljana',
            baseUrl,
            browserVersion,
            browserSource: process.env.PREVIEW_BROWSER_EXECUTABLE_PATH ? 'configured executable' : 'Playwright-managed Chromium',
            coordinateContextPolicy: 'per capture: retain axes, ticks, and grid for basics and function families; hide them for other families',
            paddingFraction,
            frameAspectRatio: frame.width / frame.height,
            scalePolicy: 'equal user-unit scale for geometric constructions; explicit independent coordinate windows for analysis',
            typography: `capture-only ${captureTextSize}px JSXGraph text and rational smart-label font with ${captureTextLineHeight} line-height; source content unchanged`,
            strokeTreatment: `capture-only curve strokes scaled ${captureCurveStrokeScale}× and construction strokes scaled ${captureConstructionStrokeScale}× with modest opacity lift; source content unchanged`,
            containment: 'finite construction objects and their text annotations stay within the board; axis/tick labels are context; unbounded coordinate-route curves are viewport-clipped by JSXGraph',
            boundsPolicy: 'finite visible objects and point coordinates; excludes axes, ticks, and grid; up to three text-aware refits; coordinate-route curves may extend beyond the viewport',
        },
        image: expectedDimensions,
        captures,
        motions,
        ...(recaptureIds?{selectiveRecapture:{previousGraphSourceRevision,previousPresentationFingerprint,priorSelectiveRecapture:previousSelectiveRecapture,
            preservedCaptureIds:previousCaptureIds.filter(id=>!recaptureIds.includes(id)),
            preservedMotionIds:previousMotionIds.filter(id=>!recaptureIds.includes(id))}}:{}),
    };
    const compactMotionIds = previewCapture.recipeAlignedMotionIds();
    fs.writeFileSync(path.join(output, 'manifest.json'), serializeManifest(manifest, compactMotionIds));
    const importEntries = captures.map(({id}) => {
        const localName = `preview_${id.replace(/[^a-zA-Z0-9_$]/g, '_')}`;
        return {id, localName};
    });
    assert.equal(new Set(importEntries.map(entry => entry.localName)).size, importEntries.length,
        'Demonstration IDs must produce unique generated import names');
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
    fs.writeFileSync(mapPath, previewMap);
    const motionMap = [
        '// Generated by scripts/capture-demonstration-previews.cjs; do not edit by hand.',
        "import type {DemonstrationId} from './demonstrations';",
        ...motions.map(m => `import motion_${m.id.replaceAll('-', '_')} from './images/demonstrations/catalog/${m.file}?no-inline';`),
        '',
        'export type DemonstrationMotionAsset = {src: string; type: string; duration: number};',
        'export const demonstrationMotionAssets: Partial<Record<DemonstrationId, DemonstrationMotionAsset>> = {',
        ...motions.map(m => `    '${m.id}': {src: motion_${m.id.replaceAll('-', '_')}, type: '${m.type}', duration: ${m.duration}},`),
        '};', '',
    ].join('\n');
    fs.writeFileSync(path.join(output, 'demonstrationMotionAssets.ts'), motionMap);
    require('./publish-demonstration-previews.cjs').publishValidatedSet({
        staging:output,destination:publishedOutput,
        files:[...activePreviewFiles,...motions.map(m=>m.file),'manifest.json'],
        maps:[[mapPath,path.join(root,'src/demonstrationPreviewAssets.ts')],[path.join(output,'demonstrationMotionAssets.ts'),path.join(root,'src/demonstrationMotionAssets.ts')]],
        validate:()=>demonstrations.validateGeneratedPreviews({catalogDirectory:output,mappingPath:mapPath,motionMappingPath:path.join(output,'demonstrationMotionAssets.ts')}),
    });
    console.log('Generation time: ' + ((Date.now() - started) / 1000).toFixed(1) + ' seconds; staging: ' + output);
    console.log('Wrote ' + captures.length + ' 360:220 default-scene captures and manifest for ' + graphSourceRevision + '.');
}

module.exports = {presentBoard, pngDimensions, hashFile, mergeRecapturedMotions, alignMotionCameras, serializeManifest};
if (require.main === module) main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
