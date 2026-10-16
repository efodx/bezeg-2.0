// Capture-only choreography. Labels are the shipped Slovenian controls, never React/graph internals.
const assert = require('node:assert/strict');
const button = (label, count = 1) => ({kind: 'button', label, count});
const toggle = (label, value = true) => ({kind: 'toggle', label, value});
const field = (label, value, kind = 'range', index = 0) => ({kind, label, value, index});
const polygon = toggle('Kontrolni poligon');
const targets = {
    bernstein: ['Four cubic Bernstein functions over the unit interval', [button('Povečaj število', 2)], [-0.12, 1.12, 1.12, -0.12]],
    'complex-multiplication': ['The unchanged multiplication by i, product and arguments revealed', [button('Pokaži zmnožek'), button('Pokaži argumente')], [-2, 2.3, 2, -1.1]],
    bezier: ['Asymmetric original cubic with its control polygon', [polygon], [-5, 4.5, 4.5, -4]],
    decasteljau: ['Separated interpolation levels at the original interior parameter', [toggle('Celotna krivulja'), polygon]],
    'decasteljau-alternative': ['Component curves and interpolation at t=0.5', []],
    affine: ['Original curve and polygon; supported rotations are shown in motion', [polygon], [-4.2, 3.8, 4.2, -3.8]],
    subdivision: ['Two pieces after one split, with supporting polygons', [polygon, button('Subdiviziraj'), {...polygon,index:1}]],
    'repeated-subdivision': ['Two rounds, four covering pieces and their refined polygons', [button('Subdiviziraj', 2)], [-5, 4.5, 4.5, -4]],
    extrapolation: ['Moderate existing t=1.2 extension', [polygon, button('Ekstrapoliraj')]],
    elevation: ['Original cubic polygon; exact one-degree elevation is shown in motion', [toggle('Pokaži nove točke na kontrolnem poligonu', false), polygon], [-5, 4.3, 5, -3.5]],
    rational: ['Unequal original weights and the supporting polygon', [polygon, button('Krivulja1'), toggle('Uteži'), button('Prekliči izbiro')]],
    'rational-decasteljau': ['Rational interpolation levels with original unequal weights', [toggle('Celotna krivulja'), polygon, button('Krivulja1'), toggle('Uteži'), button('Prekliči izbiro')]],
    'rational-elevation': ['Original rational cubic with weights; exact one-degree elevation is shown in motion', [polygon, button('Krivulja1'), toggle('Uteži'), button('Prekliči izbiro')], [-5, 4.3, 5, -3.5]],
    'rational-extrapolation': ['Moderate rational t=1.2 extension', [polygon, button('Krivulja1'), toggle('Uteži'), button('Prekliči izbiro'), button('Ekstrapoliraj')]],
    'rational-subdivision': ['Two rational pieces with supporting polygons', [polygon, button('Krivulja1'), toggle('Uteži'), button('Prekliči izbiro'), button('Subdiviziraj'), {...polygon,index:1}]],
    farin: ['Original unequal weights divide the control edges at Farin points', [polygon, toggle('Farinove Točke'), toggle('Uteži')]],
    circle: ['Complete three-arc circle with supporting polygons', [polygon, {...polygon,index:1}, {...polygon,index:2}]],
    'spline-cn': ['Original spline and supporting join polygons', [polygon]],
    'spline-c1': ['Midpoint construction and supporting polygon at the joins', [polygon]],
    'spline-c2': ['Construction points and adjacent supporting polygons', [polygon]],
    'spline-g1': ['Non-neutral continuity parameter and shared tangent direction', [polygon, field('Parameter b 1', 0.65)]],
    'spline-g1-symmetric': ['All three joins use non-midpoint parameters and unequal join legs', [polygon, field('Parameter b 1', 0.2), field('Parameter b 2', 0.2), field('Parameter b 3', 0.2)]],
    'ph-cubic': ['Original PH curve with one moderate offset', [toggle('Odmiki krivulje'), field('Razdalja odmika d', 0.35)]],
    'ph-quintic': ['Original PH curve with one small offset at its tight bend', [toggle('Odmiki krivulje'), field('Razdalja odmika d', 0.2)]],
    'spline-parameterization': ['Original interpolation points and modest sampling count', [field('Parameter α', 0.7), field('Število točk', 12)]],
    'weighted-parameterization': ['Non-neutral alpha exposes uneven sample density', [field('Parameter α', 0.25)]],
    'uniform-parameterization': ['Equal-arc-length sampling with ten interior markers', [field('Izberi parametrizacijo', 'uniform', 'select')]],
    'linear-function': ['Unchanged line with its slope triangle', [], [-0.8, 6.5, 3, -0.8]],
    'exponential-function': ['Original growth region and reference points', [], [-1.5, 5, 2.5, -0.6]],
    'trigonometric-functions': ['One recognizable sine cycle and coordinate context', [], [-0.6, 1.8, 6.8, -1.8]],
    continuity: ['Actual jump and distinct open and closed endpoints', [], [-2.3, 4.3, 3.2, -1]],
    derivative: ['Distinct tangent and nearby secant on the original quadratic', [toggle('Prikaži tangento (natančna mejna premica)')], [-0.4, 5, 2.5, -1]],
    'definite-integral': ['Six coarse left rectangles distinguish approximation from integrand', [field('Število podintervalov n', 6)], [-0.3, 4.8, 2.4, -0.5]],
    'area-between-curves': ['Both intersections and the genuine shaded region', [], [0.1, 5, 3.9, -0.5]],
    'arc-length': ['Original arc and visibly coarse two-segment approximation', [], [-0.4, 2, 3.6, -0.7]],
    bisection: ['Three exact bisection steps with current bracket and midpoint', [button('Naslednji korak', 3)], [0.85, 2.3, 2.15, -1.25]],
    'mean-value': ['Matching tangent parallel to the interval secant', [field('Točka dotika c', 1, 'number'), button('Pokaži ujemajočo točko')], [-0.3, 4.8, 2.4, -0.5]],
    accumulation: ['Accumulation function revealed beside integrand and signed area', [button('Pokaži akumulacijo A')], [-0.5, 2.6, 6.5, -1.4]],
    darboux: ['Coarse lower and upper sums on the unchanged interval', [], [-0.3, 4.8, 2.4, -0.5]],
    extrema: ['Classification revealed for the original quadratic interval', [button('Pokaži klasifikacijo')], [-1.4, 4.8, 2.4, -1.8]],
    convexity: ['Second derivative conclusion, chord, curve and comparison point', [button('Pokaži drugi odvod')], [-1.4, 3, 1.9, -1]],
    taylor: ['Original exponential and quadratic Taylor polynomial near zero', [field('Stopnja n', 2, 'number')], [-1.5, 5, 2.2, -0.5]],
    sequence: ['Original reciprocal sequence, epsilon band and threshold', [button('Naslednji korak', 15), button('Pokaži certifikat')], [0, 1.2, 18, -0.2]],
    'uniform-convergence': ['Original power sequence, limit and epsilon band at n=5', [button('Pokaži supremum')], [-0.08, 1.1, 0.9, -0.15]],
    'fixed-point': ['Several exact cobweb steps of the original affine mapping', [button('Naslednji korak', 5)], [-0.15, 1.2, 1.2, -0.15]],
};

const recipes = Object.fromEntries(Object.entries(targets).map(([id, [intent, actions, window]]) => [id, {
    id, intent, actions, checkpoint: actions.length ? 'after-explicit-setup' : 'keep-default',
    framing: window ? {kind: 'coordinate-window', window} : {kind: 'finite-geometry-fit'},
    annotations: id.startsWith('rational') || id === 'farin' ? 'retain-weight-text-hide-point-names' : 'hide-point-names-retain-concept-text',
}]));

function validateRecipes(demonstrations, registry = recipes) {
    assert.deepEqual(Object.keys(registry).sort(), demonstrations.map(d => d.id).sort(), 'Recipes must exhaustively match shipped IDs');
    for (const [id, recipe] of Object.entries(registry)) {
        assert.equal(recipe.id, id);
        assert.ok(recipe.intent && recipe.annotations && recipe.checkpoint);
        assert.ok(['coordinate-window', 'finite-geometry-fit'].includes(recipe.framing.kind));
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
    let control = action.kind === 'button' ? page.getByRole('button', {name: action.label, exact: true, includeHidden: true})
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
        assert.equal(Number(await control.inputValue()), action.value);
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
    assert.ok(evidence && Array.isArray(evidence.points) && evidence.readouts && evidence.reveals && Array.isArray(evidence.controls), `${id} missing semantic evidence`);
    assert.ok(evidence.curves > 0 || id === 'linear-function' && evidence.lines > 0, `${id} has no visible defining curve/line`);
    if (id === 'bernstein') {
        assert.equal(evidence.curves, 4, 'Cubic Bernstein must show four functions');
    }
    if (id === 'repeated-subdivision') assert.equal(evidence.curves, 4, 'Two subdivision rounds must show four pieces');
    if (id === 'farin') {
        assert.ok(evidence.controls.some(c=>c.label==='Farinove Točke' && c.checked));
        for (const [x,y] of [[-10/3,1],[-1,3],[3.5,0]]) assert.ok(evidence.points.some(p => Math.abs(p.x-x)<1e-8 && Math.abs(p.y-y)<1e-8), `Missing exact Farin division (${x},${y}): ${JSON.stringify(evidence.points)}`);
    }
    if (id === 'bisection') assert.equal(evidence.readouts.step, '3', 'Three supported steps required');
    if (id === 'fixed-point') assert.equal(evidence.readouts.step, '5', 'Five exact cobweb steps required');
    if (id === 'mean-value') assert.equal(evidence.readouts.c, '1', 'Matching tangent must touch at c=1');
    if (id === 'taylor') assert.equal(evidence.readouts.degree, '2');
    const reveals = {accumulation: 'toggle-accumulation', extrema: 'toggle-classification', convexity: 'toggle-second-derivative',
        'uniform-convergence': 'toggle-uniform-supremum', sequence: 'toggle-sequence-certificate', 'mean-value': 'toggle-matches'};
    if (reveals[id]) assert.equal(evidence.reveals[reveals[id]], 'true', `${id} must reveal its defining result`);
    if (id === 'sequence') assert.equal(evidence.readouts.terms, '16', 'Sixteen reciprocal sequence terms required');
    return evidence;
}

async function applyRecipe(page, recipe) {
    for (const action of recipe.actions) await applyAction(page, action);
    return outcome(page, recipe.id);
}

module.exports = {recipes, validateRecipes, applyAction, applyRecipe, outcome, settle, assertOutcomeEvidence};
