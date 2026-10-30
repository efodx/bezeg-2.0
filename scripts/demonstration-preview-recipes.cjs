// Capture-only choreography. Labels are the shipped Slovenian controls, never React/graph internals.
const assert = require('node:assert/strict');
const {waitForSurfaceViewDrawn} = require('./surface-view-evidence.cjs');
const button = (label, count = 1) => ({kind: 'button', label, count});
const toggle = (label, value = true) => ({kind: 'toggle', label, value});
const field = (label, value, kind = 'range', index = 0) => ({kind, label, value, index});
const polygon = toggle('Kontrolni poligon');
const targets = {
    bernstein: ['Four cubic Bernstein functions over the unit interval', [button('Povečaj število', 2)], [-0.12, 1.12, 1.12, -0.12]],
    'complex-multiplication': ['The unchanged multiplication by i, product and arguments revealed', [button('Pokaži zmnožek'), button('Pokaži argumente')], [-2, 2.3, 2, -1.6]],
    bezier: ['Asymmetric original cubic with its control polygon', [polygon], [-5, 4.5, 4.5, -4]],
    decasteljau: ['Separated interpolation levels at the original interior parameter', [toggle('Celotna krivulja'), polygon]],
    'decasteljau-alternative': ['Component curves and interpolation at t=0.5', []],
    affine: ['Original curve and polygon; supported rotations are shown in motion', [polygon], [-4.2, 3.8, 4.2, -3.8]],
    subdivision: ['Pre-Subdivide construction at the split parameter, with both coloured portions and supporting polygon', [polygon]],
    'repeated-subdivision': ['Original curve and coarse polygon before exact successive refinement', [], [-5, 4.5, 4.5, -4]],
    extrapolation: ['Polynomial curve at the interval boundary t=1, with its control polygon', [field('Parameter ekstrapolacije t', 1), polygon], [-5, 4.5, 4.5, -6]],
    elevation: ['Original cubic polygon; exact one-degree elevation is shown in motion', [toggle('Pokaži nove točke na kontrolnem poligonu', false), polygon], [-5, 4.3, 5, -3.5]],
    rational: ['Unselected rational curve at w₁=2, with four fixed controls and the supporting polygon', [polygon, button('Krivulja1'), toggle('Uteži'), field('Vrednost uteži', 2, 'number'), button('Prekliči izbiro')]],
    'rational-decasteljau': ['Weighted interpolation levels and R(t) at t=0.5', [field('Parameter t', 0.5)]],
    'rational-elevation': ['Original rational cubic with weights; exact one-degree elevation is shown in motion', [polygon, button('Krivulja1'), toggle('Uteži'), button('Prekliči izbiro')], [-5, 4.3, 5, -3.5]],
    'rational-extrapolation': ['Rational curve at the interval boundary t=1, with its control polygon and weights', [field('Parameter ekstrapolacije t', 1), polygon, button('Krivulja1'), toggle('Uteži'), button('Prekliči izbiro')], [-5, 4.5, 4.5, -4]],
    'rational-subdivision': ['Original rational curve at t=0.5 with supporting polygons and weights before one exact Subdiviziraj action', [field('Parameter subdivizije t', 0.5), polygon, button('Krivulja1'), toggle('Uteži'), button('Prekliči izbiro')]],
    farin: ['Original unequal weights divide the control edges at Farin points', [polygon, toggle('Farinove Točke'), toggle('Uteži')]],
    circle: ['Complete three-arc circle with supporting polygons', [polygon, {...polygon,index:1}, {...polygon,index:2}]],
    'spline-cn': ['Original spline and supporting join polygons', [polygon]],
    'spline-c1': ['Central join, midpoint construction and supporting polygon', [polygon], [-4.6, 4.2, 4.6, -4.2]],
    'spline-c2': ['Central C2 join, computed construction points and adjacent supporting polygon', [polygon], [-5.1, 3, 5.2, -3.8]],
    'spline-g1': ['Non-neutral continuity parameter and shared tangent direction', [polygon, field('Parameter b 1', 0.65)], [-6.5, 4, 5.5, -5]],
    'spline-g1-symmetric': ['All three joins use non-midpoint parameters and unequal join legs', [polygon, field('Parameter b 1', 0.2), field('Parameter b 2', 0.2), field('Parameter b 3', 0.2)]],
    'ph-cubic': ['Original PH curve with three moderate offsets', [toggle('Odmiki krivulje'), button('Povečaj število', 2), field('Razdalja odmika d', 0.35)]],
    'ph-quintic': ['Original PH curve with three useful cusp-free offsets', [toggle('Odmiki krivulje'), button('Povečaj število', 2), field('Razdalja odmika d', 0.15)]],
    'spline-parameterization': ['Original interpolation points and modest sampling count', [field('Parameter α', 0.7), field('Število točk', 12)]],
    'weighted-parameterization': ['Non-neutral alpha exposes uneven sample density', [field('Parameter α', 0.25)]],
    'uniform-parameterization': ['Weighted parameterization checkpoint with ten interior markers; the clip compares this with uniform arc-length spacing', [field('Izberi parametrizacijo', 'alpha', 'select'), field('Število točk', 10)]],
    'linear-function': ['Unchanged line with its slope triangle', [], [-0.8, 6.5, 3, -1.5]],
    'exponential-function': ['Original growth region and reference points', [], [-1.5, 5, 2.5, -0.6]],
    'trigonometric-functions': ['One recognizable sine cycle and coordinate context', [], [-0.6, 1.8, 6.8, -1.8]],
    continuity: ['Actual jump and distinct open and closed endpoints', [], [-2.3, 4.3, 3.2, -1]],
    derivative: ['Distinct tangent and nearby secant on the original quadratic', [toggle('Prikaži tangento (natančna mejna premica)')], [-0.4, 5, 2.5, -1]],
    'definite-integral': ['Six coarse left rectangles distinguish approximation from integrand', [field('Število podintervalov n', 6)], [-0.3, 4.8, 2.4, -0.5]],
    'area-between-curves': ['Both intersections and the genuine shaded region', [field('Meja b', 3.2, 'number')], [0.1, 5, 3.9, -0.5]],
    'arc-length': ['Original arc and visibly coarse two-segment approximation', [], [-0.4, 2, 3.6, -0.7]],
    bisection: ['First exact halving with midpoint and discarded half before further narrowing', [button('Naslednji korak')], [0.85, 2.3, 2.15, -1.25]],
    'mean-value': ['Shallower tangent and fixed secant before the matching-point discovery', [field('Točka dotika c', 0.5, 'number')], [-0.3, 4.8, 2.4, -0.5]],
    accumulation: ['Accumulation function revealed beside integrand and signed area', [button('Pokaži akumulacijo A')], [-0.5, 2.6, 6.5, -1.4]],
    darboux: ['Coarse lower and upper sums on the unchanged interval', [], [-0.3, 4.8, 2.4, -0.5]],
    extrema: ['Classification revealed for the original quadratic interval', [button('Pokaži klasifikacijo')], [-1.4, 4.8, 2.4, -1.8]],
    convexity: ['Chord, tangent and convex curve before revealing the second-derivative conclusion', [], [-1.4, 3, 1.9, -1]],
    taylor: ['Exponential and quadratic Taylor polynomial with visible error away from the fixed center', [field('Stopnja n', 2, 'number')], [-2.6, 5, 2.2, -1.4]],
    sequence: ['Certified reciprocal tail before tightening epsilon and moving its threshold', [button('Naslednji korak', 15), field('Širina pasu ε', 0.3, 'number'), field('Prag N', 5, 'number'), button('Pokaži certifikat')], [0, 1.2, 18, -0.2]],
    'uniform-convergence': ['Original power sequence, limit and epsilon band at n=5', [button('Pokaži supremum')], [-0.08, 1.1, 0.9, -0.15]],
    'fixed-point': ['First exact cobweb step before feeding successive outputs back as inputs', [button('Naslednji korak')], [-0.15, 1.2, 1.2, -0.15]],
    'patch-tensor': ['Default bicubic dome, fitted to the preview frame, with control net, boundary curves and iso-curves', [button('Ponastavi pogled')]],
    'patch-decasteljau': ['Default bicubic dome, fitted to the preview frame, in the de Casteljau workspace with control net, boundary curves and iso-curves', [button('Ponastavi pogled')]],
    'patch-derivatives': ['Default bicubic dome, fitted to the preview frame, in the derivatives workspace with control net, boundary curves and iso-curves', [button('Ponastavi pogled')]],
    'patch-subdivision': ['Default bicubic dome, fitted to the preview frame, split at u0 = 0.4 in the subdivision workspace with the two piece nets, the cut curve and the iso-curves', [button('Ponastavi pogled')]],
    'patch-joins': ['Default C1 join of two bicubic patches, fitted to the preview frame, in the joins workspace with both control nets, the shared boundary, the two cross-boundary derivative arrows and the iso-curves', [button('Ponastavi pogled')]],
    'patch-triangular': ['Default cubic triangular patch, fitted to the preview frame, with control net, boundary curves and iso-curves', [button('Ponastavi pogled')]],
};

// Surface demonstrations (`view: 'surface'`) are framed by a camera, not a board window. The camera is the one the
// route's default Preset ships (patchPresetCollections.ts; bicubic dome target [0, 0, 1.25], cubic triangular net target [0, 0, 1], az -0.9, el 0.5) with the
// distance "Ponastavi pogled" fits to the 360:220 preview host; the capture asserts the live view has exactly this camera.
const surfaceCameras = {
    'patch-tensor': {az: -0.9, el: 0.5, distance: 8.167849250854438, target: [0, 0, 1.25]},
    // Both tensor-patch workspaces start from the same default bicubic dome Preset as `patch-tensor`.
    'patch-decasteljau': {az: -0.9, el: 0.5, distance: 8.167849250854438, target: [0, 0, 1.25]},
    'patch-derivatives': {az: -0.9, el: 0.5, distance: 8.167849250854438, target: [0, 0, 1.25]},
    'patch-subdivision': {az: -0.9, el: 0.5, distance: 8.167849250854438, target: [0, 0, 1.25]},
    // Two patches side by side: fitCameraTo over both nets at the 360:220 host, the fit "Ponastavi pogled" (resetView) makes.
    'patch-joins': {az: -0.9, el: 0.5, distance: 13.877168517348197, target: [1.5, 0, 0]},
    'patch-triangular': {az: -0.9, el: 0.5, distance: 7.373018307821979, target: [0, 0, 1]},
};
// Surfaces whose default scene publishes no editable control points: `patch-subdivision` shows the piece nets instead
// (the original points are not editable then, so the view's scene has `points: []`). The count is declared, not assumed;
// every other surface must publish at least one. The camera is still the one fitted to the original net, whose convex
// hull contains both piece nets, so the pieces are framed too.
const surfaceControlPointCounts = {'patch-subdivision': 0};
// Projected control points must clear the frame edge by this many CSS pixels, so no control sphere is cropped.
const SURFACE_FRAME_MARGIN_PX = 6;

const recipes = Object.fromEntries(Object.entries(targets).map(([id, [intent, actions, window]]) => [id, {
    id, intent, actions, checkpoint: actions.length ? 'after-explicit-setup' : 'keep-default',
    framing: surfaceCameras[id] ? {kind: 'surface-view', camera: surfaceCameras[id], controlPointCount: surfaceControlPointCounts[id]}
        : window ? {kind: 'coordinate-window', window} : {kind: 'finite-geometry-fit'},
    annotations: surfaceCameras[id] ? 'retain-surface-view-native-labels'
        : id.startsWith('rational') || id === 'farin' ? 'retain-weight-text-hide-point-names' : 'hide-point-names-retain-concept-text',
}]));

function sameCamera(a, b, tolerance = 1e-9) {
    return [a.az - b.az, a.el - b.el, a.distance - b.distance, ...a.target.map((v, i) => v - b.target[i])].every(d => Math.abs(d) <= tolerance);
}

/** Every projected control point lies inside the frame, clear of its edges by the margin. Returns the offenders. */
function pointsOutsideFrame(points, width, height, margin = SURFACE_FRAME_MARGIN_PX) {
    return points.filter(p => !(Number.isFinite(p.x) && Number.isFinite(p.y) && p.inFrustum !== false &&
        p.x >= margin && p.x <= width - margin && p.y >= margin && p.y <= height - margin)).map(p => p.id);
}

function validateRecipes(demonstrations, registry = recipes) {
    assert.deepEqual(Object.keys(registry).sort(), demonstrations.map(d => d.id).sort(), 'Recipes must exhaustively match shipped IDs');
    for (const [id, recipe] of Object.entries(registry)) {
        assert.equal(recipe.id, id);
        assert.ok(recipe.intent && recipe.annotations && recipe.checkpoint);
        const surface = demonstrations.find(d => d.id === id).view === 'surface';
        assert.ok(surface ? recipe.framing.kind === 'surface-view' : ['coordinate-window', 'finite-geometry-fit'].includes(recipe.framing.kind),
            `${id}: framing kind ${recipe.framing.kind} does not fit a ${surface ? 'surface' : 'board'} demonstration`);
        if (surface) {
            const camera = recipe.framing.camera;
            assert.ok([camera.az, camera.el, camera.distance].every(Number.isFinite) && camera.distance > 0 &&
                Array.isArray(camera.target) && camera.target.length === 3 && camera.target.every(Number.isFinite), `${id}: invalid surface camera`);
        }
        for (const action of recipe.actions) assert.ok(['button', 'toggle', 'range', 'number', 'select'].includes(action.kind), `Unsupported action ${action.kind}`);
    }
}

async function settle(page) {
    await page.evaluate(async () => {
        if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
        if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise();
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
}

async function applyAction(page, action) {
    let control = action.kind === 'button' ? (action.group
        ? page.getByRole('group',{name:action.group,exact:true,includeHidden:true}).getByRole('button',{name:action.label,exact:true,includeHidden:true})
        : page.getByRole('button', {name: action.label, exact: true, includeHidden: true}))
        : page.getByLabel(action.label, {exact: true}).nth(action.index || 0);
    assert.equal(await control.count(), 1, `Unsupported or ambiguous ${action.kind} control: ${action.label}`);
    if (!await control.isVisible()) {
        for (const tab of ['Prikaz', 'Uredi']) {
            await page.getByRole('button', {name: tab, exact: true}).click();
            if (await control.isVisible()) break;
        }
    }
    // Some slider captions include their current value; retain the input's DOM identity.
    if (action.kind !== 'button') {
        const inputId = await control.getAttribute('id');
        if (inputId) control = page.locator(`[id=${JSON.stringify(inputId)}]`);
    }
    if (action.kind === 'button') {
        for (let i = 0; i < (action.count || 1); i++) {
            assert.ok(await control.isEnabled(), `${action.label} unavailable at action ${i + 1}`);
            assert.notEqual(await control.getAttribute('aria-disabled'), 'true', `${action.label} unavailable`);
            await control.click();
            await settle(page);
        }
    } else if (action.kind === 'toggle') {
        await control.setChecked(action.value);
        assert.equal(await control.isChecked(), action.value);
    } else if (action.kind === 'select') {
        await control.selectOption(String(action.value));
        assert.equal(await control.inputValue(), String(action.value));
    } else if (action.kind === 'number') {
        await control.fill(String(action.value));
        await control.press('Tab');
        // NumberInput retains the typed model value but may format its blurred draft.
        // A declared display precision checks that draft; the concept's board check
        // must independently verify the full-precision mathematical coordinate.
        const displayed = action.displayDecimals === undefined ? action.value : Number(action.value.toFixed(action.displayDecimals));
        assert.equal(readLocalizedNumber(await control.inputValue()), displayed);
    } else {
        // Native range keyboard handling is the same supported UI path as pointer dragging.
        const config = await control.evaluate(e => ({min: Number(e.min), max: Number(e.max), step: Number(e.step) || 1}));
        await control.focus();
        await control.press('Home');
        const steps = Math.round((action.value - config.min) / config.step);
        assert.ok(steps >= 0 && action.value <= config.max && steps < 10000, 'Range target out of bounds');
        // Keyboard events are deterministic, unlike a pixel approximation to a range thumb.
        for (let i = 0; i < steps; i++) await control.press('ArrowRight');
        assert.ok(Math.abs(Number(await control.inputValue()) - action.value) <= config.step / 2 + 1e-9, `${action.label} failed to reach ${action.value}`);
    }
    await settle(page);
}

function readLocalizedNumber(value) {
    const normalized = String(value).trim().replace(/\u2212/g, '-').replace(',', '.');
    assert.match(normalized, /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/, `Invalid localized number: ${value}`);
    return Number(normalized);
}

/** The real surface view publishes its framing on the host; a fake view or a failed start does not. */
async function readSurfaceFraming(page) {
    return page.locator('#jgbox').evaluate(host => {
        const raw = host.getAttribute('data-surface-framing');
        return raw ? JSON.parse(raw) : null;
    });
}

async function surfaceOutcome(page, id) {
    const expected = recipes[id].framing.controlPointCount;
    await page.waitForFunction(declared => {
        const host = document.querySelector('#jgbox');
        const raw = host?.getAttribute('data-surface-framing');
        if (!host?.querySelector('[data-jsx-surface-view]') || !raw) return false;
        const count = JSON.parse(raw).points.length;
        return declared === undefined ? count > 0 : count === declared;
    }, expected);
    const drawn = await waitForSurfaceViewDrawn(page);
    const framing = await readSurfaceFraming(page);
    const evidence = await page.locator('#jgbox').evaluate(() => {
        return {
            readouts: Object.fromEntries([...document.querySelectorAll('[data-readout]')].map(e => [e.dataset.readout, e.querySelector('dd')?.textContent])),
            controls: [...document.querySelectorAll('input,select')].filter(e => e.closest('main')).map(e => ({label: e.getAttribute('aria-label') || e.labels?.[0]?.textContent, value: e.value, checked: e.type === 'checkbox' ? e.checked : undefined}))};
    });
    const result = {view: 'surface', ...evidence, surfaceView: drawn.view, svg: drawn.svg, drawables: drawn.drawables, camera: framing.camera, controlPointCount: framing.points.length};
    assertOutcomeEvidence(id, result);
    return result;
}

async function outcome(page, id) {
    const evidence = await page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
        const visible = Object.values(board.objects).filter(o => o.visProp?.visible !== false && o.visProp?.visible !== 'false' && o.rendNode && getComputedStyle(o.rendNode).display !== 'none' && getComputedStyle(o.rendNode).visibility !== 'hidden');
        return {curves: visible.filter(o => o.elType === 'curve').length, lines: visible.filter(o => ['line','segment'].includes(o.elType)).length,
            points: visible.filter(o => ['point', 'glider', 'slider'].includes(o.elType)).map(o => ({type:o.elType, name: o.name, x: o.X(), y: o.Y(), fixed: o.visProp.fixed})),
            text: visible.filter(o => o.elType === 'text').map(o => o.rendNode.textContent),
            readouts: Object.fromEntries([...document.querySelectorAll('[data-readout]')].map(e => [e.dataset.readout, e.querySelector('dd')?.textContent])),
            reveals: Object.fromEntries([...document.querySelectorAll('[data-revealed]')].map(e => [e.dataset.action, e.dataset.revealed])),
            controls: [...document.querySelectorAll('input,select')].filter(e => e.closest('main')).map(e => ({label: e.getAttribute('aria-label') || e.labels?.[0]?.textContent, value: e.value, checked: e.type === 'checkbox' ? e.checked : undefined})),
            curvePaths: visible.filter(o => o.elType === 'curve').map(o => o.rendNode.getAttribute('d'))};
    });
    assertOutcomeEvidence(id, evidence);
    return evidence;
}

function assertOutcomeEvidence(id, evidence) {
    if (evidence?.view === 'surface') {
        assert.ok((evidence.surfaceView === 'board2d' && evidence.svg?.width > 0 && evidence.svg?.height > 0 && evidence.drawables > 0), `${id} surface is not drawn by the JSXGraph SVG surface view`);
        const declared = recipes[id]?.framing.controlPointCount;
        assert.ok((declared === undefined ? evidence.controlPointCount > 0 : evidence.controlPointCount === declared) && evidence.camera && Array.isArray(evidence.camera.target), `${id} missing surface control net or camera`);
        assert.ok(evidence.readouts && Array.isArray(evidence.controls), `${id} missing semantic evidence`);
        return evidence;
    }
    assert.ok(evidence && Array.isArray(evidence.points) && evidence.readouts && evidence.reveals && Array.isArray(evidence.controls), `${id} missing semantic evidence`);
    assert.ok(evidence.curves > 0 || id === 'linear-function' && evidence.lines > 0, `${id} has no visible defining curve/line`);
    if (id === 'bernstein') {
        assert.equal(evidence.curves, 4, 'Cubic Bernstein must show four functions');
    }
    if (id === 'repeated-subdivision') assert.equal(evidence.curves, 1, 'Initial subdivision checkpoint must show the original curve');
    if (id === 'farin') {
        assert.ok(evidence.controls.some(c=>c.label==='Farinove Točke' && c.checked));
        for (const [x,y] of [[-10/3,1],[-1,3],[3.5,0]]) assert.ok(evidence.points.some(p => Math.abs(p.x-x)<1e-8 && Math.abs(p.y-y)<1e-8), `Missing exact Farin division (${x},${y}): ${JSON.stringify(evidence.points)}`);
    }
    if (id === 'bisection') assert.equal(evidence.readouts.step, '1', 'First exact bisection step required');
    if (id === 'fixed-point') assert.equal(evidence.readouts.step, '1', 'First exact cobweb step required');
    if (id === 'mean-value') assert.equal(evidence.readouts.c, '0,5', 'Initial tangent must be shallower than the secant');
    if (id === 'taylor') assert.equal(evidence.readouts.degree, '2');
    const reveals = {accumulation: 'toggle-accumulation', extrema: 'toggle-classification',
        'uniform-convergence': 'toggle-uniform-supremum', sequence: 'toggle-sequence-certificate'};
    if (reveals[id]) assert.equal(evidence.reveals[reveals[id]], 'true', `${id} must reveal its defining result`);
    if (id === 'sequence') assert.equal(evidence.readouts.terms, '16', 'Sixteen reciprocal sequence terms required');
    return evidence;
}

async function applyRecipe(page, recipe) {
    for (const action of recipe.actions) await applyAction(page, action);
    return recipe.framing.kind === 'surface-view' ? surfaceOutcome(page, recipe.id) : outcome(page, recipe.id);
}

module.exports = {recipes, validateRecipes, applyAction, applyRecipe, outcome, settle, assertOutcomeEvidence,
    readSurfaceFraming, sameCamera, pointsOutsideFrame, SURFACE_FRAME_MARGIN_PX};
