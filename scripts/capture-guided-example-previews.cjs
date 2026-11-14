// Capture guided-example card media from a complete generated inventory: the exact prepared start scene, or the
// authored highlight recipe state (frame + learner-equivalent steps) when the entry carries a highlight recipe.
// node scripts/capture-guided-example-previews.cjs path/to/guided-example-inventory.json [--id curve-parameter] [--family <a key of chapterFamilies>]
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const {applyControlStep, applyExploreStep} = require('./guided-example-control-steps.cjs');
const demonstrations = require('../tests/smoke-catalog.cjs');
const {recipes, settle} = require('./demonstration-preview-recipes.cjs');
const {presentBoard, hashFile, pngDimensions} = require('./capture-demonstration-previews.cjs');
const {digestBuild, digestInputs} = require('./commands.cjs');
const {validateInventory, verifyEvidence, validateRetained, validatePublishedSet, validateSurfacePresentation,
    parseGuidedProgress, navigationDirection, verifyHighlight, recipeRecord} = require('./guided-example-preview-api.cjs');
const {readPublishedSurfaceEvidence, validateSurfaceEvidence, verifySurfaceHighlight} = require('./guided-example-surface-evidence.cjs');

const root = path.resolve(__dirname, '..');
const defaultDestination = path.join(root, 'src/images/learning/examples');
const appBaseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4387/bezeg-2.0').replace(/\/$/, '');
const frame = {width: 420, height: 260};
const viewport = {width: 1440, height: 920};
const deviceScaleFactor = 2;
const workedParabolaId = 'splines.worked-join.spline-c1.parabola-derivatives';
const degenerateVoronoiId = 'triangulations-voronoi.voronoi-degenerate.voronoi-degenerate';
const inversionPowerId = 'triangle-geometry.inversion.inversion';
const fortuneCardId = 'sweep-algorithms.fortune.fortune';
const linearCompositionCardId = 'linear-maps.composition-affine.linear-map';

const binomialExpansionId = 'combinatorics.binomial-theorem.lattice-paths';
// The kinematics circles: the board's own frame puts the circle under the screen-anchored caption rows, so these two cards take a window that sets the circle below them (the capture widens a requested window by about a quarter about its centre).
const kinematicsCircleWindows = {
    'kinematics.speed-and-parametrization.curve-kinematics': [-2.75, 2.7, 2.75, -0.7],
    'kinematics.circular-motion.curve-kinematics': [-3.77, 3.07, 3.77, -1.59],
};

// The waves cards: the board's screen-anchored caption rows take the top of the 840x520 card (about 250 px for the sum, 205 for the beats, 285 for the standing wave, whose last row is the long resolution note),
// so each card gets a window that sets its plot (and, for the sum, the phasor circle) below them and fills the width. The capture widens a requested window by 28 percent about its centre; these are those windows shrunk back.
const wavesSumCardId = 'waves.superposition-and-phase.waves';
const wavesWindows = {
    'waves.superposition-and-phase.waves': [-0.449, 3.81, 0.921, -0.7],
    'waves.beats.waves': [0.125, 5.95, 1.875, -1.51],
    'waves.standing-waves.waves': [0.125, 10.37, 1.875, -1.23],
};

// The descent cards: the screen-anchored caption rows stack down the left of the 840x520 card (six or seven rows, the race rows reaching about 290 px down), so each card gets a window that sets its figure in the
// free right part, at one common scale in x and y. The capture widens a requested window by 28 percent about its centre; these are those windows shrunk back.
const descentWindows = {
    'mechanical-curves.race-the-tracks.mechanics-descent': [-2.385, 0.345, 2.865, -2.905],
    'mechanical-curves.drag-the-track.mechanics-descent': [-4.352, 1.664, 3.852, -3.414],
    'mechanical-curves.tautochrone.mechanics-descent': [-2.370, 0.717, 2.678, -2.409],
};

// The simulation cards: the captions sit in plot units (rows 0.1 to 0.11 apart), so at the default capture size, where both axes get one scale, they overlap and the figure is a thin strip. Each card takes the window of
// its own mode's frame (the Galton board: x from -0.8 to 10.8, y from 1.28 to -1.14; the coin frequency at 10 tosses: x from -0.15 to 1.15, y from 1.55 to -1.47), which keeps the unequal x and y scales of the graph.
// The capture widens a requested window by 28 percent about its centre; these are those windows shrunk back.
const randomnessWindows = {
    'randomness.galton-board.prob-simulation': [0.469, 1.015, 9.531, -0.875],
    'randomness.law-of-large-numbers.prob-simulation': [-0.008, 1.22, 1.008, -1.14],
};

// The growth cards: the board frames each panel in its own window (the sequence panel: x from -0.7 to 7.2, y from 17.55 to -1.3 for the six terms up to 13; the one-year interest panel: x from -0.12 to 1.05,
// y from 1682.03 to -84.1), which has unequal x and y scales; the default capture size gives both axes one scale and the figure becomes a thin strip off the centre, under overlapping captions.
// The capture widens a requested window by 28 percent about its centre; these are those windows shrunk back.
const recursionWindows = {
    'recursion.sequences.recursion-growth': [0.164, 15.488, 6.336, 0.762],
    'recursion.compound-interest.recursion-growth': [0.008, 1488.863, 0.922, 109.069],
};

// The linear-programming card: the board lays eight caption rows over the top two thirds of the card and its own opening frame (made on a larger board, a view of about 120 units) shrinks the region to a dot, under the captions.
// The window keeps equal units (the card is 840 x 520 pixels: 28 pixels a unit) and puts the region with its handle and labels in the strip below the captions, centred on x = 2.
// The capture widens a requested window by 28 percent about its centre; this is that window shrunk back.
const levelSetsWindows = {
    'level-sets.linear-programming.linear-program': [-9.72, 15.64, 13.72, 1.131],
};

function captureRecipeForEntry(entry, recipe) {
    if (Object.hasOwn(levelSetsWindows, entry.id)) return {...recipe, framing: {kind: 'coordinate-window', window: levelSetsWindows[entry.id]}};
    if (Object.hasOwn(recursionWindows, entry.id)) return {...recipe, framing: {kind: 'coordinate-window', window: recursionWindows[entry.id]}};
    if (Object.hasOwn(randomnessWindows, entry.id)) return {...recipe, framing: {kind: 'coordinate-window', window: randomnessWindows[entry.id]}};
    if (Object.hasOwn(descentWindows, entry.id)) return {...recipe, framing: {kind: 'coordinate-window', window: descentWindows[entry.id]}};
    if (Object.hasOwn(wavesWindows, entry.id)) return {...recipe, framing: {kind: 'coordinate-window', window: wavesWindows[entry.id]}};
    if (Object.hasOwn(kinematicsCircleWindows, entry.id)) return {...recipe, framing: {kind: 'coordinate-window', window: kinematicsCircleWindows[entry.id]}};
    // The expansion card opens the fixed box of the lattice board (bars at y 10.5 to 17.5, labels from y 1.2, captions to y 24.5), which the shared paths window around (2, 2) leaves off the card.
    if (entry.id === binomialExpansionId) return {...recipe, framing: {kind: 'coordinate-window', window: [-1.5, 24.5, 37.6, 0.3]}};
    if (entry.id !== workedParabolaId && entry.id !== degenerateVoronoiId && entry.id !== inversionPowerId && entry.id !== linearCompositionCardId && !entry.id.startsWith('curve-geometry.')) return recipe;
    // The shared spline-c1 catalog window is useful for its broad construction view,
    // but this authored worked parabola has a much smaller exact fixture view.
    // Curve geometry posters likewise frame another scene than the lesson opening a card shows:
    // the comb poster's window, chosen for the C1 spline, leaves the card's cubic a fifth of the frame.
    // The degenerate Voronoi poster frames the Trapez example, which leaves the lesson's opening site (1,-5) off the card.
    // The inversion power poster window leaves the circle's far intersection (8,0) off the card.
    // The linear-map poster window frames the basis mode, which leaves the composition card's image curve and T(P_i) off the card.
    // Fit the card's own finite scene with equal unit scales and leave the shared recipe intact.
    return {...recipe, framing: {kind: 'finite-geometry-fit'}};
}

function presentationHelpers() {
    return [presentBoard, inspectBoard, captureSurfaceExample, resizeSurfaceCaptureHost, prepareSurfaceCaptureFrame,
        isViewportSpanningHorizontalCurve, isCameraScaledCurve, isOpeningSweepLine, isViewportGeneratedInWindow,
        isSameGraphOnOverlap, assertPresentationGeometryStable, hideGuidedLessonOverlay, captureRecipeForEntry,
        reachFrame, applyHighlightRecipe, readPublishedSurfaceEvidence, validateSurfaceEvidence, verifySurfaceHighlight, assertSurfaceRecipeSteps];
}

function presentationFingerprint({recipeFraming = [], entryFraming = [], helpers = presentationHelpers()} = {}) {
    return crypto.createHash('sha256')
        .update(helpers.map(helper => helper.toString()).join('\0'))
        .update(hashFile(path.join(__dirname, 'capture-demonstration-previews.cjs')))
        .update(hashFile(path.join(__dirname, 'guided-example-preview-api.cjs')))
        .update(hashFile(path.join(__dirname, 'guided-example-surface-evidence.cjs')))
        .update(JSON.stringify({frame, viewport, deviceScaleFactor, recipeFraming, entryFraming}))
        .digest('hex');
}

/** Chapter-owned destinations: a subdirectory under the examples root, the chapter's id prefix and its route. A family may mix board and surface entries: each entry dispatches on its Demonstration's view. */
const chapterFamilies = {
    // Before patches: its Coons entry is also on a patches route, and the first match names the family a retained run must use.
    'advanced-bezier': {label: 'advanced-bezier', idPrefix: 'advanced-bezier.', route: /^\/bezeg-2\.0\/(?:bezier\/(?:reduction|arc-length|clipping)|patches\/coons)(?:\/|$)/, routeText: '/bezeg-2.0/bezier/reduction, /bezeg-2.0/bezier/arc-length, /bezeg-2.0/bezier/clipping or /bezeg-2.0/patches/coons'},
    patches: {label: 'patch', idPrefix: 'bezier-patches.', route: /^\/bezeg-2\.0\/patches(?:\/|$)/, routeText: '/bezeg-2.0/patches'},
    'linear-maps': {label: 'linear-maps', idPrefix: 'linear-maps.', route: /^\/bezeg-2\.0\/linear-map(?:\/|$)/, routeText: '/bezeg-2.0/linear-map'},
    'complex-maps': {label: 'complex-maps', idPrefix: 'complex-maps.', route: /^\/bezeg-2\.0\/complex-(?:reciprocal|roots)(?:\/|$)/, routeText: '/bezeg-2.0/complex-reciprocal or /bezeg-2.0/complex-roots'},
    'numerical-methods': {label: 'numerical-methods', idPrefix: 'numerical-methods.', route: /^\/bezeg-2\.0\/analysis\/(?:root-finding|quadrature|euler-method)(?:\/|$)/, routeText: '/bezeg-2.0/analysis/root-finding, /bezeg-2.0/analysis/quadrature or /bezeg-2.0/analysis/euler-method'},
    'school-function-graphs': {label: 'school-function-graphs', idPrefix: 'school-function-graphs.', route: /^\/bezeg-2\.0\/functions\/(?:transformations|inverse|polynomial-zeros|rational-functions|geometric-series|conics)(?:\/|$)/, routeText: '/bezeg-2.0/functions/transformations, /inverse, /polynomial-zeros, /rational-functions, /geometric-series or /conics'},
    'fourier-series': {label: 'fourier-series', idPrefix: 'fourier-series.', route: /^\/bezeg-2\.0\/analysis\/(?:fourier-(?:series|coefficients)|epicycles)(?:\/|$)/, routeText: '/bezeg-2.0/analysis/fourier-series, /bezeg-2.0/analysis/fourier-coefficients or /bezeg-2.0/analysis/epicycles'},
    // Routes come from the family's registered Demonstration rows (loadFamilyIdentities), never a hand-written list.
    'projective-conics': {label: 'projective-conics', idPrefix: 'projective-conics.', identities: {module: '/src/graphs/projective/registration.ts', rows: 'projectiveDemonstrationRows'}},
    'curve-geometry': {label: 'curve-geometry', idPrefix: 'curve-geometry.', route: /^\/bezeg-2\.0\/curve-geometry\/(?:parametric|curvature|comb|evolute|offset|envelope)(?:\/|$)/, routeText: '/bezeg-2.0/curve-geometry/parametric, /curvature, /comb, /evolute, /offset or /envelope'},
    'convexity-hulls': {label: 'convexity-hulls', idPrefix: 'convexity-hulls.', route: /^\/bezeg-2\.0\/compgeo\/(?:orientation|polygon-area|point-in-polygon|convex-hull|hull-robustness|bezier-hulls)(?:\/|$)/, routeText: '/bezeg-2.0/compgeo/orientation, /polygon-area, /point-in-polygon, /convex-hull, /hull-robustness or /bezier-hulls'},
    'triangulations-voronoi': {label: 'triangulations-voronoi', idPrefix: 'triangulations-voronoi.', route: /^\/bezeg-2\.0\/compgeo\/(?:ear-clipping|point-set-triangulation|delaunay|voronoi|voronoi-degenerate)(?:\/|$)/, routeText: '/bezeg-2.0/compgeo/ear-clipping, /point-set-triangulation, /delaunay, /voronoi or /voronoi-degenerate'},
    'sweep-algorithms': {label: 'sweep-algorithms', idPrefix: 'sweep-algorithms.', route: /^\/bezeg-2\.0\/compgeo\/(?:interval-sweep|segment-intersections|monotone-partition|monotone-triangulation|fortune)(?:\/|$)/, routeText: '/bezeg-2.0/compgeo/interval-sweep, /segment-intersections, /monotone-partition, /monotone-triangulation or /fortune'},
    interpolation: {label: 'interpolation', idPrefix: 'interpolation.', route: /^\/bezeg-2\.0\/interpolation\/(?:lagrange|hermite|runge|least-squares|subdivision)(?:\/|$)/, routeText: '/bezeg-2.0/interpolation/lagrange, /hermite, /runge, /least-squares or /subdivision'},
    probability: {label: 'probability', idPrefix: 'probability.', route: /^\/bezeg-2\.0\/probability\/(?:density|binomial-normal|clt|summary|correlation)(?:\/|$)/, routeText: '/bezeg-2.0/probability/density, /binomial-normal, /clt, /summary or /correlation'},
    'b-splines': {label: 'b-splines', idPrefix: 'b-splines.', route: /^\/bezeg-2\.0\/bspline\/(?:basis|deboor|insertion|extraction|nurbs|blossom)(?:\/|$)/, routeText: '/bezeg-2.0/bspline/basis, /deboor, /insertion, /extraction, /nurbs or /blossom'},
    'phase-portraits': {label: 'phase-portraits', idPrefix: 'phase-portraits.', identities: {module: '/src/graphs/dynamics/registration.ts', rows: 'dynamicsDemonstrationRows'}},
    'analytic-lines': {label: 'analytic-lines', idPrefix: 'analytic-lines.', identities: {module: '/src/graphs/lines/registration.ts', rows: 'lineDemonstrationRows'}},
    combinatorics: {label: 'combinatorics', idPrefix: 'combinatorics.', identities: {module: '/src/graphs/combinatorics/registration.ts', rows: 'combinatoricsDemonstrationRows'}},
    'circle-geometry': {label: 'circle-geometry', idPrefix: 'circle-geometry.', identities: {module: '/src/graphs/compgeo/circleConstruction/registration.ts', rows: 'circleConstructionDemonstrationRows'}},
    waves: {label: 'waves', idPrefix: 'waves.', identities: {module: '/src/graphs/functions/waves/registration.ts', rows: 'wavesDemonstrationRows'}},
    'mechanical-curves': {label: 'mechanical-curves', idPrefix: 'mechanical-curves.', identities: {module: '/src/graphs/mechanics/registration.ts', rows: 'mechanicsDemonstrationRows'}},
    randomness: {label: 'randomness', idPrefix: 'randomness.', identities: {module: '/src/graphs/random/registration.ts', rows: 'randomDemonstrationRows'}},
    'level-sets': {label: 'level-sets', idPrefix: 'level-sets.', identities: {module: '/src/graphs/levelsets/registration.ts', rows: 'levelSetsDemonstrationRows'}},
    solids: {label: 'solids', idPrefix: 'solids.', identities: {module: '/src/graphs/solids/registration.ts', rows: 'solidsDemonstrationRows'}},
    recursion: {label: 'recursion', idPrefix: 'recursion.', identities: {module: '/src/graphs/recursion/registration.ts', rows: 'recursionDemonstrationRows'}},
    kinematics: {label: 'kinematics', idPrefix: 'kinematics.', identities: {module: '/src/graphs/curves/kinematics/registration.ts', rows: 'kinematicsDemonstrationRows'}},
    isometries: {label: 'isometries', idPrefix: 'isometries.', identities: {module: '/src/graphs/isometry/registration.ts', rows: 'isometryDemonstrationRows'}},
    trigonometry: {label: 'trigonometry', idPrefix: 'trigonometry.', identities: {module: '/src/graphs/trig/registration.ts', rows: 'trigDemonstrationRows'}},
    'triangle-geometry': {label: 'triangle-geometry', idPrefix: 'triangle-geometry.', route: /^\/bezeg-2\.0\/(?:triangle-centres|inscribed-angle|euler-line|simson-line|inversion)(?:\/|$)/, routeText: '/bezeg-2.0/triangle-centres, /inscribed-angle, /euler-line, /simson-line or /inversion'},
};

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Defines `route` and `routeText` on a registration-backed family from its Demonstration row paths. */
function applyFamilyRoutes(info, paths) {
    assert.ok(paths.length > 0 && paths.every(item => typeof item === 'string' && item.startsWith('/')), `${info.label}: registered Demonstration rows have no usable paths`);
    const route = new RegExp(`^(?:${paths.map(escapeRegExp).join('|')})(?:/|$)`);
    Object.defineProperties(info, {route: {value: route, configurable: true, enumerable: true}, routeText: {value: paths.join(', '), configurable: true, enumerable: true}});
}

/** The default bridge: a temporary Vite server loads only the named cheap metadata module and is closed in `finally`. */
async function loadViteModules(modules) {
    const {createServer} = await import('vite');
    const server = await createServer({configFile: path.join(root, 'vite.config.mts'), server: {middlewareMode: true}, appType: 'custom'});
    try {
        return await Promise.all(modules.map(module => server.ssrLoadModule(module)));
    } finally {
        await server.close();
    }
}

/** Resolves `route` of every registration-backed family (`identities`), in one bounded metadata load. Call before `assertInventoryFamily`. */
async function loadFamilyIdentities(loadModules = loadViteModules) {
    const backed = Object.values(chapterFamilies).filter(info => info.identities);
    if (!backed.length) return;
    const modules = await loadModules(backed.map(info => info.identities.module));
    backed.forEach((info, index) => {
        const rows = modules[index]?.[info.identities.rows];
        assert.ok(Array.isArray(rows), `${info.label}: ${info.identities.module} does not export ${info.identities.rows}`);
        applyFamilyRoutes(info, rows.map(row => row.path));
    });
}

function parseArgs(argv) {
    const [inventoryPath, ...rest] = argv;
    assert.ok(inventoryPath && !inventoryPath.startsWith('--'), `Usage: node scripts/capture-guided-example-previews.cjs <inventory.json> [--id <id>] [--family ${Object.keys(chapterFamilies).join('|')}]`);
    const ids = [];
    let family = 'retained';
    for (let index = 0; index < rest.length; index++) {
        if (rest[index] === '--id' && rest[index + 1]) ids.push(rest[++index]);
        else if (rest[index] === '--family' && rest[index + 1]) {
            assert.equal(family, 'retained', '--family may be specified only once');
            family = rest[++index];
            assert.ok(Object.hasOwn(chapterFamilies, family), `Unsupported capture family: ${family}`);
        } else throw new Error(`Unknown or incomplete option: ${rest[index]}`);
    }
    const envIds = process.env.PREVIEW_EXAMPLE_IDS?.split(',').map(value => value.trim()).filter(Boolean) || [];
    assert.ok(!ids.length || !envIds.length, 'Choose either --id or PREVIEW_EXAMPLE_IDS, not both');
    return {inventoryPath: path.resolve(process.cwd(), inventoryPath), ids: ids.length ? ids : envIds, family};
}

function destinationForFamily(family) {
    if (family === 'retained') return defaultDestination;
    assert.ok(Object.hasOwn(chapterFamilies, family), `Unsupported capture family: ${family}`);
    return path.join(defaultDestination, family);
}

const entryPathname = entry => new URL(entry.path, 'https://bezeg.invalid').pathname;
function familyRoute(info) {
    assert.ok(info.route, `${info.label}: family routes are not loaded; await loadFamilyIdentities() first`);
    return info.route;
}
const belongsToFamily = (entry, info) => entry.id.startsWith(info.idPrefix) || familyRoute(info).test(entryPathname(entry));

function assertInventoryFamily(inventory, family) {
    if (family === 'retained') {
        for (const [name, info] of Object.entries(chapterFamilies)) {
            assert.ok(!inventory.some(entry => belongsToFamily(entry, info)),
                `${info.label[0].toUpperCase()}${info.label.slice(1)} inventories require explicit --family ${name} to protect the retained manifest`);
        }
        return;
    }
    assert.ok(Object.hasOwn(chapterFamilies, family), `Unsupported capture family: ${family}`);
    const info = chapterFamilies[family];
    assert.ok(inventory.length > 0 && inventory.every(entry => entry.id.startsWith(info.idPrefix) && familyRoute(info).test(entryPathname(entry))),
        `The ${family} destination requires a ${info.label} inventory (${info.idPrefix}* ids on ${info.routeText})`);
}

function captureOutputPath(destination, id) {
    return path.join(destination, `${id}.png`);
}

function readInventory(file) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return validateInventory(Array.isArray(parsed) ? parsed : parsed.examples);
}

/** Serialized identity of one inventory entry; start recipes are omitted so pre-recipe fingerprints stay unchanged. */
function entryIdentity(entry) {
    return JSON.stringify({id: entry.id, demonstrationId: entry.demonstrationId, path: entry.path,
        sceneFingerprint: entry.sceneFingerprint, actions: entry.actions || [], expected: entry.expected || null,
        recipe: entry.recipe?.kind === 'highlight' ? entry.recipeFingerprint : undefined});
}

function fingerprintInventory(inventory) {
    const hash = crypto.createHash('sha256');
    for (const entry of [...inventory].sort((a, b) => a.id.localeCompare(b.id))) {
        hash.update(entryIdentity(entry));
        hash.update('\0');
    }
    return hash.digest('hex');
}

/** Per-entry fingerprints, so a partial run can ignore changes to the ids it recaptures. */
function fingerprintEntries(inventory) {
    return Object.fromEntries(inventory.map(entry => [entry.id, crypto.createHash('sha256').update(entryIdentity(entry)).digest('hex')]));
}

function inspectBoard(page) {
    return page.evaluate(() => {
        const container = document.querySelector('#jgbox');
        const board = Object.values(window.JXG?.boards || {}).find(item => item.container === container?.id || item.containerObj === container);
        if (!board) throw new Error('route-owned JSXGraph board is missing');
        const visible = Object.values(board.objects || {}).filter(object => {
            if (!object?.rendNode?.isConnected || object.visProp?.visible === false || object.visProp?.visible === 'false') return false;
            // A data curve with no points draws nothing (the simulation graph keeps one curve per layer, also the empty ones); it is no visible curve and has no samples.
            if (object.elType === 'curve' && Array.isArray(object.dataX) && object.dataX.length === 0) return false;
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
                return {id: object.id, samples, points, viewportGenerated: object.viewportGenerated === true};
            });
        const curves = curveObjects.map(object => object.samples).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        const types = visible.reduce((counts, object) => (counts[object.elType] = (counts[object.elType] || 0) + 1, counts), {});
        return {visibleCount: visible.length, points, curves, curveData: curveObjects, types, boundingBox: board.getBoundingBox(), unitScale: [board.unitX, board.unitY]};
    });
}

/**
 * With `boxes` (the bounding boxes before and after the presentation resize), only abscissas where both graphs lie inside the vertical
 * range both boxes share are compared: a plotter that clamps what leaves the view to a view-relative height (the function graphs of the
 * Functions stream) draws off-screen pieces that differ between two views, and those never reach the image.
 */
function isSameGraphOnOverlap(before, after, boxes) {
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
    const agree = (beforeY, afterY) => Number.isFinite(beforeY) && Number.isFinite(afterY)
        && Math.abs(beforeY - afterY) <= 1e-4 * Math.max(1, Math.abs(beforeY), Math.abs(afterY));
    if (!boxes) {
        return [0, 0.25, 0.5, 0.75, 1].every(fraction => {
            const x = left + (right - left) * fraction;
            return agree(interpolate(before.points, x), interpolate(after.points, x));
        });
    }
    const low = Math.max(...boxes.map(box => box[3])), high = Math.min(...boxes.map(box => box[1]));
    const onScreen = y => Number.isFinite(y) && y >= low && y <= high;
    const compared = Array.from({length: 41}, (_, index) => left + (right - left) * index / 40).map(x => [interpolate(before.points, x), interpolate(after.points, x), x])
        .filter(([beforeY, afterY]) => onScreen(beforeY) && onScreen(afterY));
    // The two views sample the function on different abscissas, so linear interpolation differs by far less than a pixel; 1e-3 of the shared height is about 0.6 px at capture scale.
    const tolerance = 1e-3 * (high - low);
    // Beside a pole the curve is so steep that linear interpolation on two sampling grids differs by more than the height tolerance while the
    // curves are under a pixel apart horizontally: also accept a before value that the other view reaches within the same horizontal distance.
    const xTolerance = 1e-3 * (right - left);
    const nearby = (x, beforeY) => {
        const values = [x - xTolerance, x, x + xTolerance].map(sample => interpolate(after.points, sample)).filter(Number.isFinite);
        return values.length > 0 && beforeY >= Math.min(...values) - tolerance && beforeY <= Math.max(...values) + tolerance;
    };
    return compared.length >= 5 && compared.every(([beforeY, afterY, x]) => agree(beforeY, afterY) || Math.abs(beforeY - afterY) <= tolerance
        || nearby(x, beforeY));
}

function isViewportSpanningHorizontalCurve(samples, box) {
    if (!Array.isArray(samples) || samples.length !== 3 || !Array.isArray(box) || box.length !== 4) return false;
    const [left, , right] = box;
    if (![left, right, ...samples.flat()].every(Number.isFinite) || right <= left) return false;
    const expectedX = [left, (left + right) / 2, right];
    return samples.every(([x, y], index) => Math.abs(x - expectedX[index]) <= 1e-5 && Math.abs(y - samples[0][1]) <= 1e-6);
}

/**
 * Fortune's sweep line before its first event is drawn at the top of the view's grid box (`lineY: level ?? maxY`), so its height and ends follow
 * the camera. What the opening scene means is only that the line is above every site, so that is what must hold on both sides of the presentation.
 */
function isOpeningSweepLine(samples, points) {
    const y = samples[0][1];
    return samples.every(sample => Math.abs(sample[1] - y) <= 1e-6) && points.length > 0 && points.every(point => point[1] < y);
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

// A curve the graph marks as rebuilt for every view (a direction field) changes with the framing by design. Accept it only when both
// captures mark the same board object and its marks after framing are non-empty and inside the presented window.
function isViewportGeneratedInWindow(beforeData, afterData, boundingBox) {
    if (!beforeData?.viewportGenerated || !afterData?.viewportGenerated || beforeData.id !== afterData.id || !Array.isArray(boundingBox)) return false;
    const [left, top, right, bottom] = boundingBox;
    const slack = 1e-9 * Math.max(1, Math.abs(right - left), Math.abs(top - bottom));
    return afterData.points.length > 0 && afterData.points.every(([x, y]) => x >= left - slack && x <= right + slack && y >= bottom - slack && y <= top + slack);
}

// The phasor circle of the waves sum card is drawn about a fixed point of the board (the panel centre, x = -0.36 times the 1 s window, y = 0) with a radius in pixels, so the card, which is smaller than the
// board it was opened on, redraws it smaller about the same centre. Accept it only when every sample keeps its direction from that centre and all offsets shrink by one common factor on both axes.
const wavesPhasorCentre = [-0.36, 0];

function isCircleScaledAboutCentre(before, after, initialUnitScale, presentedUnitScale, centre) {
    if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length || !before.length || ![...initialUnitScale, ...presentedUnitScale].every(value => Number.isFinite(value) && value > 0)) return false;
    const offsets = (samples, unit) => samples.map(point => point.map((value, axis) => (value - centre[axis]) * unit[axis]));
    const from = offsets(before, initialUnitScale), to = offsets(after, presentedUnitScale);
    const factor = Math.hypot(...to[0]) / Math.hypot(...from[0]);
    return Number.isFinite(factor) && factor > 0 && factor <= 1
        && from.every((offset, index) => offset.every((value, axis) => Math.abs(value * factor - to[index][axis]) <= 0.05 + 1e-3 * Math.abs(value)));
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
        const openingSweepLine = exampleId === fortuneCardId && isOpeningSweepLine(before, initial.points) && isOpeningSweepLine(after, presented.points);
        const cameraScaledConstruction = isCameraScaledCurve(before, after, initial.unitScale, presented.unitScale)
            || (exampleId === wavesSumCardId && isCircleScaledAboutCentre(before, after, initial.unitScale, presented.unitScale, wavesPhasorCentre));
        const beforeData = initial.curveData?.find(curve => JSON.stringify(curve.samples) === JSON.stringify(before));
        // Pair by board id: two curves with identical samples (a graph and its coinciding ghost) may swap places in the sorted order.
        const afterData = presented.curveData?.find(curve => beforeData && curve.id === beforeData.id)
            ?? presented.curveData?.find(curve => JSON.stringify(curve.samples) === JSON.stringify(after));
        const sameFunctionOnOverlap = isSameGraphOnOverlap(beforeData, afterData, initial.boundingBox && presented.boundingBox ? [initial.boundingBox, presented.boundingBox] : undefined);
        const viewportField = isViewportGeneratedInWindow(beforeData, afterData, presented.boundingBox);
        if (!cameraDrivenHorizontal && !openingSweepLine && !cameraScaledConstruction && !sameFunctionOnOverlap && !viewportField) {
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

async function resizeSurfaceCaptureHost(page) {
    const host = page.locator('#jgbox');
    await host.waitFor({state: 'visible'});
    await host.evaluate((container, size) => {
        for (const [property, value] of [['border', '0px'], ['width', size.width + 'px'], ['height', size.height + 'px'],
            ['min-width', size.width + 'px'], ['max-width', size.width + 'px'], ['min-height', size.height + 'px'], ['max-height', size.height + 'px']]) {
            container.style.setProperty(property, value, 'important');
        }
    }, frame);
    await page.waitForFunction(size => {
        const raw = document.querySelector('#jgbox')?.getAttribute('data-surface-framing');
        const framing = raw && JSON.parse(raw);
        return !!framing && framing.width === size.width && framing.height === size.height;
    }, frame);
    await settle(page);
}

async function readSurfaceVisibleLabelBounds(page) {
    return page.locator('#jgbox').evaluate(host => {
        const hostRect = host.getBoundingClientRect();
        return [...host.querySelectorAll('[data-label-id]')].filter(label => {
            const style = getComputedStyle(label);
            return !label.hidden && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
        }).map(label => {
            const rect = label.getBoundingClientRect();
            return {id: label.getAttribute('data-label-id'), left: rect.left - hostRect.left, top: rect.top - hostRect.top,
                right: rect.right - hostRect.left, bottom: rect.bottom - hostRect.top};
        });
    });
}

async function prepareSurfaceCaptureFrame(page) {
    await resizeSurfaceCaptureHost(page);
    const evidence = await readPublishedSurfaceEvidence(page);
    const visibleLabelBounds = await readSurfaceVisibleLabelBounds(page);
    validateSurfacePresentation('surface capture', {width: evidence.framing.width, height: evidence.framing.height},
        evidence.framing.points, visibleLabelBounds, evidence.framing.meshBounds);
    return {evidence, visibleLabelBounds};
}

/** A surface lesson has no inspector, so only frame navigation and frame actions can reach a highlight state. */
function assertSurfaceRecipeSteps(entry) {
    for (const [index, step] of entry.recipe.steps.entries()) {
        assert.ok(step.kind === 'goto-frame' || step.kind === 'frame-action',
            `${entry.id}: recipe step ${index + 1} (${step.kind}) is not supported on surface routes; use goto-frame or frame-action`);
    }
}

async function captureSurfaceExample(page, entry, browserVersion, servedBuild, build, sourceRevision, pageErrors, destination) {
    assert.ok(entry.expected?.surface, `${entry.id}: expected.surface authored camera and owner geometry are required`);
    const initial = await readPublishedSurfaceEvidence(page);
    const preparedSurfaceEvidence = validateSurfaceEvidence({...initial, expected: entry.expected.surface});
    await page.waitForTimeout(250);
    const settled = await readPublishedSurfaceEvidence(page);
    assert.deepEqual(settled, initial, `${entry.id}: surface changed after initial-frame settling; refusing a later or animated frame`);
    assert.equal(page.url(), new URL(entry.path, new URL(appBaseUrl).origin).toString(), `${entry.id}: route or example identity changed before capture`);
    let highlighted = initial, highlight;
    if (entry.recipe.kind === 'highlight') {
        assertSurfaceRecipeSteps(entry);
        await applyHighlightRecipe(page, entry);
        highlighted = await readPublishedSurfaceEvidence(page);
        await page.waitForTimeout(250);
        assert.deepEqual(await readPublishedSurfaceEvidence(page), highlighted, `${entry.id}: surface still changing after the recipe steps; refusing an unsettled highlight`);
        highlight = verifySurfaceHighlight(entry, initial, highlighted);
    }
    const expectedSurface = highlight ? entry.recipe.checks.surface : entry.expected.surface;
    await page.evaluate(async () => { await document.fonts.ready; });
    const guidedLessonOverlayHidden = await hideGuidedLessonOverlay(page);
    const {evidence, visibleLabelBounds} = await prepareSurfaceCaptureFrame(page);
    const sceneEvidence = validateSurfaceEvidence({...evidence, expected: expectedSurface});
    assert.deepEqual(evidence.framing.camera, highlighted.framing.camera, `${entry.id}: capture frame sizing changed the authored surface camera`);
    assert.deepEqual([evidence.framing.width, evidence.framing.height], [frame.width, frame.height], `${entry.id}: surface capture frame size`);
    assert.deepEqual(pageErrors, [], `${entry.id}: browser runtime errors`);
    const host = page.locator('#jgbox');
    const clip = await host.evaluate(container => {
        const rect = container.getBoundingClientRect();
        return {x: rect.left, y: rect.top, width: container.clientWidth, height: container.clientHeight};
    });
    assert.deepEqual([clip.width, clip.height], [frame.width, frame.height], `${entry.id}: surface clip does not match capture frame`);
    const file = `${entry.id}.png`;
    const output = captureOutputPath(destination, entry.id);
    await page.screenshot({path: output, clip, animations: 'disabled', caret: 'hide', scale: 'device'});
    const dimensions = pngDimensions(output);
    assert.deepEqual(dimensions, {width: frame.width * deviceScaleFactor, height: frame.height * deviceScaleFactor});
    return {id: entry.id, demonstrationId: entry.demonstrationId, path: entry.path, sceneFingerprint: entry.sceneFingerprint,
        actions: entry.actions || [], ...recipeRecord(entry, highlight), file, width: dimensions.width, height: dimensions.height, sha256: hashFile(output),
        scene: {...sceneEvidence, visibleLabelBounds}, initialFrame: {firstFrame: true, backNavigationDisabled: true, stableAcrossMs: 250,
            preparedSurfaceEvidence},
        framing: {surfaceHostOnly: true, width: frame.width, height: frame.height, scale: deviceScaleFactor, guidedLessonOverlayHidden,
            authoredCameraPreserved: true, geometryOwners: sceneEvidence.ownerIds, visibleLabelBounds},
        captureEvidence: {browserVersion, servedBuildVerified: true, buildRevision: build.revision,
            sourceRevision, pageErrors}};
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

const maxNavigationClicks = 200;

async function readGuidedPosition(page, id, label, after) {
    const text = await page.locator('.guided-lesson-progress').innerText();
    const position = parseGuidedProgress(text);
    assert.ok(position, label
        ? `${id}: ${label} is unreachable (${after || 'at the start'} and the progress text became "${text}"; the lesson ended before the frame)`
        : `${id}: cannot read the guided-lesson position from "${text}"`);
    return position;
}

/** Moves with the lesson's own previous/next buttons until the target frame is current; fails when it cannot be reached. */
async function reachFrame(page, id, target, label = 'frame') {
    assert.ok(target && Number.isInteger(target.step) && Number.isInteger(target.frame), `${id}: ${label} has no resolved lesson position`);
    let current = await readGuidedPosition(page, id, label);
    for (let clicks = 0; navigationDirection(current, target); clicks++) {
        const direction = navigationDirection(current, target);
        assert.ok(clicks < maxNavigationClicks, `${id}: ${label} is unreachable (no progress towards step ${target.step + 1}, frame ${target.frame + 1})`);
        await page.locator(`.guided-lesson-nav-${direction}`).click();
        await settle(page);
        const moved = await readGuidedPosition(page, id, label, `${direction} left step ${current.step + 1}, frame ${current.frame + 1}`);
        assert.ok(moved.step !== current.step || moved.frame !== current.frame,
            `${id}: ${label} is unreachable (${direction} did not leave step ${current.step + 1}, frame ${current.frame + 1}; lesson ended or button disabled)`);
        current = moved;
    }
    assert.deepEqual([current.step, current.frame], [target.step, target.frame], `${id}: ${label} was not reached`);
    return current;
}

/** Reaches the recipe frame, then applies each step as a learner would, waiting for board effects to settle. */
async function applyHighlightRecipe(page, entry) {
    const recipe = entry.recipe;
    assert.equal(recipe?.kind, 'highlight', `${entry.id}: applyHighlightRecipe needs a highlight recipe`);
    await reachFrame(page, entry.id, recipe.position, `recipe frame "${recipe.frame}"`);
    await settle(page);
    for (const [index, step] of recipe.steps.entries()) {
        const where = `recipe step ${index + 1} (${[step.kind, step.frame || step.tab || step.label].filter(Boolean).join(' ')})`;
        try {
            if (step.kind === 'goto-frame') await reachFrame(page, entry.id, step.position, where);
            else if (step.kind === 'explore') await applyExploreStep(page);
            else if (step.kind === 'select-tab' || step.kind === 'set-control') await applyControlStep(page, step);
            else {
                const current = await readGuidedPosition(page, entry.id);
                assert.deepEqual([current.step, current.frame], [step.position.step, step.position.frame],
                    `lesson is not on frame "${step.frame}"; add a goto-frame step before it`);
                const button = page.locator('.guided-lesson-actions').getByRole('button', {name: step.label, exact: true});
                assert.equal(await button.count(), 1, `frame action button "${step.label}" is not present exactly once`);
                await button.click();
            }
            await settle(page);
        } catch (error) {
            throw new Error(`${entry.id}: ${where} failed: ${error.message}`, {cause: error});
        }
    }
}

async function captureExample(page, entry, demonstration, recipe, browserVersion, servedBuild, build, sourceRevision, destination) {
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
    if (demonstration.view === 'surface') {
        return captureSurfaceExample(page, entry, browserVersion, servedBuild, build, sourceRevision, pageErrors, destination);
    }
    const initial = await inspectBoard(page);
    verifyEvidence(entry, initial);
    await page.waitForTimeout(250);
    const settled = await inspectBoard(page);
    // A redraw of the same frame may differ in the last binary digit (the tautochrone board resizes to 105.62499999999999 from 105.625 pixels per unit): compare at nine decimals, which still refuses any real change.
    const roundedBoard = board => JSON.parse(JSON.stringify(board, (_key, value) => (typeof value === 'number' ? Number(value.toFixed(9)) : value)));
    assert.deepEqual(roundedBoard(settled), roundedBoard(initial), `${entry.id}: board changed after initial-frame settling; refusing a later or animated frame`);
    assert.equal(page.url(), target, `${entry.id}: route or example identity changed before capture`);
    let highlighted = initial, highlight;
    if (entry.recipe.kind === 'highlight') {
        await applyHighlightRecipe(page, entry);
        highlighted = await inspectBoard(page);
        await page.waitForTimeout(250);
        assert.deepEqual(await inspectBoard(page), highlighted, `${entry.id}: board still changing after the recipe steps; refusing an unsettled highlight`);
        highlight = verifyHighlight(entry, initial, highlighted);
    }
    await page.evaluate(async () => { await document.fonts.ready; });
    const guidedLessonOverlayHidden = await hideGuidedLessonOverlay(page);
    const scene = await presentBoard(board, demonstration, recipe, {frame});
    const presented = await inspectBoard(page);
    assertPresentationGeometryStable(highlighted, presented, entry.id);
    const sceneEvidence = verifyEvidence(highlight ? {...entry, expected: entry.recipe.checks} : entry, presented);
    assert.deepEqual([scene.width, scene.height], [frame.width, frame.height], `${entry.id}: frame size`);
    assert.ok(scene.framedElementCount > 0, `${entry.id}: no framed board geometry`);
    assert.deepEqual(scene.outOfFrameElements, [], `${entry.id}: cropped board labels or geometry`);
    assert.deepEqual(pageErrors, [], `${entry.id}: browser runtime errors`);
    const file = `${entry.id}.png`;
    const output = captureOutputPath(destination, entry.id);
    await page.screenshot({path: output, clip: await board.evaluate(container => {
        const rect = container.getBoundingClientRect(); const style = getComputedStyle(container);
        return {x: rect.left + parseFloat(style.borderLeftWidth), y: rect.top + parseFloat(style.borderTopWidth), width: container.clientWidth, height: container.clientHeight};
    }), animations: 'disabled', caret: 'hide', scale: 'device'});
    const dimensions = pngDimensions(output);
    assert.deepEqual(dimensions, {width: frame.width * deviceScaleFactor, height: frame.height * deviceScaleFactor});
    return {id: entry.id, demonstrationId: entry.demonstrationId, path: entry.path, sceneFingerprint: entry.sceneFingerprint,
        actions: entry.actions || [], ...recipeRecord(entry, highlight), file, width: dimensions.width, height: dimensions.height, sha256: hashFile(output),
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
    const {inventoryPath, ids, family} = parseArgs(argv);
    const inventory = readInventory(inventoryPath);
    await loadFamilyIdentities();
    assertInventoryFamily(inventory, family);
    const destination = destinationForFamily(family);
    const manifestPath = path.join(destination, 'manifest.json');
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
    const fingerprints = {inventory: fingerprintInventory(inventory), entries: fingerprintEntries(inventory),
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
                captures.push(await captureExample(page, entry, demonstration, recipe, browser.version(), servedBuild, build, sourceRevision, destination));
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
        capture: {cleanContextPerExample: true, capturedHostOnly: true, frame, viewport, deviceScaleFactor,
            sceneSource: 'exact canonical /bezeg-2.0 route and ?example query in a clean context; start recipes change no controls or actions, highlight recipes reach their frame and apply their steps through the lesson navigation and frame action buttons',
            initialFrame: 'first guided-lesson frame with previous disabled and stable prepared board across 250 ms',
            guidedLessonOverlay: 'capture-only visibility hidden before framing; first frame and scene remain untouched',
            presentation: 'JSXGraph uses presentBoard; surface routes resize only the host and validate the authored camera and rendered owner geometry', entryFraming}, captures: allCaptures};
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Wrote ${allCaptures.length} guided-example previews to ${path.relative(root, destination)}.`);
}

module.exports = {loadFamilyIdentities, applyFamilyRoutes, chapterFamilies, reachFrame, applyHighlightRecipe, readGuidedPosition, parseArgs, readInventory, destinationForFamily, assertInventoryFamily, captureOutputPath, fingerprintInventory, fingerprintEntries, inspectBoard, isViewportSpanningHorizontalCurve,
    isCameraScaledCurve, isSameGraphOnOverlap, assertPresentationGeometryStable, hideGuidedLessonOverlay, entryBundles,
    verifyServedBuild, captureRecipeForEntry, captureSurfaceExample, resizeSurfaceCaptureHost, readSurfaceVisibleLabelBounds,
    prepareSurfaceCaptureFrame, presentationHelpers, presentationFingerprint, captureExample, assertSurfaceRecipeSteps};
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
