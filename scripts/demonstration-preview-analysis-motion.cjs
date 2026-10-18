// Capture-only analysis motion specifications. Runtime controls and route defaults remain untouched.
'use strict';

const nodeAssert = require('node:assert/strict');

const ids = [
    'linear-function', 'exponential-function', 'continuity', 'area-between-curves', 'arc-length', 'mean-value',
    'extrema', 'convexity', 'taylor', 'sequence', 'uniform-convergence', 'fixed-point',
];

const close = (actual, expected, tolerance = 1e-7) => Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance;
const parseLocalized = value => {
    const superscriptDigit = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-'};
    const normalized = String(value).trim().replace(/[−–]/g, '-').replace(',', '.')
        .replace(/[×·]\s*10([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g, (_, power) => `e${[...power].map(char => superscriptDigit[char] || char).join('')}`);
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
    const number = normalized.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i);
    return number ? Number(number[0]) : Number.NaN;
};
const valueReadout = {
    text: value => String(value),
    matches: (shown, value) => close(parseLocalized(shown), value, 1e-8),
    read: async ({range}) => {
        const accessible = await range.getAttribute('aria-valuetext');
        return accessible ?? await range.inputValue();
    },
};

/** Capture function/curve samples and named points without depending on JSXGraph object IDs. */
function observeBoard(page, xValues) {
    return page.locator('#jgbox').evaluate((container, xs) => {
        const board = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
        const objects = Object.values(board.objects).filter(o => o.visProp?.visible !== false && o.rendNode);
        const finite = value => Number.isFinite(value) ? value : null;
        const curves = objects.filter(o => o.elType === 'curve').map(o => {
            const lo = typeof o.minX === 'function' ? o.minX() : 0;
            const hi = typeof o.maxX === 'function' ? o.maxX() : 1;
            return {
                id: o.id,
                name: o.name,
                samples: Array.from({length: 65}, (_, i) => {
                    const t = lo + (hi - lo) * i / 64;
                    return {x: finite(o.X(t)), y: finite(o.Y(t))};
                }),
                dataSamples: Array.isArray(o.dataX) && Array.isArray(o.dataY)
                    ? o.dataX.map((x, i) => ({x: finite(x), y: finite(o.dataY[i])})) : [],
            };
        });
        const points = objects.filter(o => ['point', 'glider'].includes(o.elType)).map(o => ({
            name: o.name, x: finite(o.X()), y: finite(o.Y()), visible: o.visProp?.visible !== false,
        }));
        const lines = objects.filter(o => ['line', 'segment'].includes(o.elType)).map(o => {
            const line = {name: o.name, type: o.elType};
            if (Array.isArray(o.stdform)) line.stdform = [...o.stdform].map(finite);
            if (o.point1 && o.point2) line.ends = [o.point1, o.point2].map(p => ({x: finite(p.X()), y: finite(p.Y())}));
            return line;
        });
        const readouts = Object.fromEntries([...document.querySelectorAll('[data-readout]')]
            .map(e => [e.dataset.readout, e.querySelector('dd')?.textContent?.trim() ?? '']));
        const reveals = Object.fromEntries([...document.querySelectorAll('[data-revealed]')]
            .map(e => [e.dataset.action, e.getAttribute('data-revealed')]));
        const inputValues = [...document.querySelectorAll('input[role="spinbutton"], input[type="range"], input[type="checkbox"], select')].map(e => ({
            label: [...(e.labels || [])].map(l => l.textContent.trim()).join(' ').trim() || e.getAttribute('aria-label') || '',
            value: e.type === 'checkbox' ? String(e.checked) : e.value,
        }));
        const statusKinds = Object.fromEntries(['sequence', 'uniform', 'mean-value', 'extrema', 'fixed-point']
            .map(prefix => [prefix, [...document.querySelectorAll(`[data-${prefix}-status]`)].map(e => e.getAttribute(`data-${prefix}-status`))]));
        return {curves, points, lines, readouts, reveals, inputValues, statusKinds};
    }, xValues);
}

function matchingFunction(curves, fn, xs, label, assert) {
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const matches = curves.filter(curve => {
        const data = curve.samples.filter(p => p.y !== null && p.x !== null && p.x >= minX - 1e-8 && p.x <= maxX + 1e-8);
        return data.length >= 8 && data.every(p => close(p.y, fn(p.x), 2e-6));
    });
    assert.ok(matches.length > 0, `${label} geometry does not match its independent formula`);
    return matches;
}

function sineArcLengthReference(parts = 4096) {
    const a = 0, b = Math.PI, h = (b - a) / parts;
    const f = x => Math.sqrt(1 + Math.cos(x) ** 2);
    let sum = f(a) + f(b);
    for (let i = 1; i < parts; i++) sum += (i % 2 ? 4 : 2) * f(a + i * h);
    return sum * h / 3;
}

function input(sample) { return Number(sample.actual.input); }
const normalizeInputLabel = label => String(label).replace(/,\s*(?:vrednost|value)$/i, '');
function inputValue(sample, label) {
    const value = sample.observed.inputValues.find(item => normalizeInputLabel(item.label) === normalizeInputLabel(label))?.value;
    return parseLocalized(value);
}
function numbersInText(value) { return (String(value).match(/[−-]?\d+(?:[,.]\d+)?/g) || []).map(parseLocalized); }
const exactSteps = (checkpoints, holds, phases, camera, invariants) => ({
    mode: 'discrete-exact-steps', checkpoints, holds,
    schedule: {kind: 'discrete-exact-steps', checkpoints: checkpoints.map(({value}) => value), holds, phases,
        camera, resetBoundary: phases.find(phase => phase.kind === 'reset')?.checkpoint,
        resetFrame: holds.slice(0, -1).reduce((sum, hold) => sum + hold, 0)},
    invariants: [...invariants, 'Each checkpoint is a supported settled exact state with a dedicated hold; discrete states are not interpolated.',
        'The explicit reset returns to the poster recipe state; its boundary is recorded separately from mathematical iteration.'],
});

/**
 * The handler injects its shared capture helpers. Formula checks below are deliberately local copies of the documented examples,
 * so they do not import the runtime model or evaluator that produced the geometry.
 */
function createAnalysisMotionSpecs(helpers = {}) {
    const assert = helpers.assert || nodeAssert;
    const schedule = (label, start, waypoints, step, controlCount, observe, check, options = {}) => {
        const {fixed = {}, origin = 0, checkControls, afterChange, derivedInputLabels = [], kind = 'number', backgroundSample = {x: 40, y: 40}} = options;
        return {
        mode: 'parameter-sweep', controlCount, backgroundSample,
        control: {label, kind},
        sweep: {start, waypoints, step, origin, fixed, derivedInputLabels, readout: valueReadout, observe, ...(afterChange ? {afterChange} : {}),
            check(sample, previous, first, spec) {
                const allowedChanges = new Set([label, ...derivedInputLabels].map(value => value.replace(/,\s*(?:vrednost|value)$/i, '')));
                const unchangedInputs = values => values.filter(item => !allowedChanges.has(item.label.replace(/,\s*(?:vrednost|value)$/i, '')));
                assert.deepEqual(unchangedInputs(sample.observed.inputValues), unchangedInputs(first.observed.inputValues),
                    `An input other than ${label} changed at frame ${sample.index}`);
                check(sample, previous, first, spec);
            }, ...(checkControls ? {checkControls} : {})},
        schedule: {kind: 'piecewise-sin2', waypoints, step, origin,
            input: `${kind === 'range' ? 'range slider' : 'number field'} “${label}”`, returnToRecipe: true},
        };
    };
    const samples = (lo, hi) => Array.from({length: 17}, (_, i) => lo + (hi - lo) * i / 16);

    const specs = {
        'linear-function': {
            ...schedule('Naklon k', 2, [2, -0.5, 2], 0.1, 2,
                page => observeBoard(page, samples(-0.8, 3)),
                (sample, previous, first) => {
                    const o = sample.observed, k = input(sample);
                    const p1 = o.points.find(p => /P_?1/.test(p.name || ''));
                    const p2 = o.points.find(p => /P_?2/.test(p.name || ''));
                    assert.ok(p1 && p2, 'Linear construction points are missing');
                    const slope = (p2.y - p1.y) / (p2.x - p1.x);
                    assert.ok(close(slope, k, 1e-9), `Point-defined line slope differs from k at frame ${sample.index}`);
                    assert.ok(close(p1.y, k * p1.x + 1, 1e-9) && close(p2.y, k * p2.x + 1, 1e-9), `Line intercept changed at frame ${sample.index}`);
                    const line = o.lines.find(l => l.type === 'line' && l.stdform);
                    assert.ok(line, 'Rendered line equation is missing');
                    const [c, a, b] = line.stdform;
                    assert.ok(close(-a / b, k, 1e-8) && close(-c / b, 1, 1e-8), `Rendered line differs from y = kx + 1 at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Linear loop is not seamless');
                }, {checkControls: sample => {
                    const k = input(sample);
                    const expected = [{x: 0, y: 1}, {x: 2, y: 2 * k + 1}];
                    assert.equal(sample.controls.length, 2, 'Linear line must retain two defining control points');
                    expected.forEach((p, i) => {
                        assert.ok(close(sample.controls[i].x, p.x, 1e-9) && close(sample.controls[i].y, p.y, 1e-9),
                            `Linear defining point ${i + 1} does not match the swept slope`);
                    });
                    assert.ok(sample.observed.points.some(p => /P_?1/.test(p.name || '') && close(p.x, 0) && close(p.y, 1)),
                        'Linear fixed point P1 must remain at (0,1)');
                }, derivedInputLabels: ['y₂']}),
        },
        'exponential-function': {
            ...schedule('Osnova a', 2, [2, 0.5, 2], 0.05, 1,
                page => observeBoard(page, samples(-1.5, 2.5)),
                (sample, previous, first) => {
                    const a = input(sample), xs = sample.observed.curves.flatMap(c => c.samples.map(p => p.x));
                    const checks = matchingFunction(sample.observed.curves, x => a ** x, xs, 'Exponential', assert);
                    assert.ok(checks.length === 1, `Expected one visible exponential curve at frame ${sample.index}`);
                    assert.ok(sample.observed.points.some(p => close(p.x, 0) && close(p.y, 1)), 'Exponential curve must pass through (0,1)');
                    assert.ok(sample.observed.points.some(p => close(p.x, 1) && close(p.y, a)), `Point (1,a) disagrees with base at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Exponential loop is not seamless');
                }, {kind: 'range', checkControls: sample => {
                    const a = input(sample);
                    assert.equal(sample.controls.length, 1, 'Exponential demonstration must retain its one draggable reference point');
                    assert.ok(close(sample.controls[0].x, 0, 1e-9) && close(sample.controls[0].y, 1, 1e-9),
                        `Exponential fixed point (0,1) moved at frame ${sample.index}`);
                }}),
        },
        continuity: {
            ...schedule('Parameter a', 1, [1, 1.5, 1], 0.05, 0,
                page => observeBoard(page, samples(-2, 3)),
                (sample, previous, first) => {
                    const a = input(sample), points = sample.observed.points.filter(p => close(p.x, 1, 1e-8));
                    assert.ok(points.some(p => close(p.y, a, 1e-8)), `Closed value at x=1 is not a at frame ${sample.index}`);
                    assert.ok(points.some(p => close(p.y, 3 - a, 1e-8)), `Right-hand limit at x=1 is not 3-a at frame ${sample.index}`);
                    const expectedJump = Math.abs(3 - 2 * a);
                    assert.ok(close(Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)), expectedJump, 1e-8), `Join gap differs from |3-2a| at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Continuity loop is not seamless');
                }, {kind: 'range'}),
        },
        'area-between-curves': {
            ...schedule('Meja b', 3.2, [3.2, 2, 3.2], 0.01, 4,
                page => observeBoard(page, samples(0.1, 3.9)),
                (sample, previous, first) => {
                    const b = input(sample), xs = sample.observed.curves.flatMap(c => c.samples.map(p => p.x));
                    matchingFunction(sample.observed.curves, x => (x - 2) ** 2, xs, 'Lower area curve', assert);
                    matchingFunction(sample.observed.curves, x => 3 - (x - 2) ** 2, xs, 'Upper area curve', assert);
                    assert.ok(b >= 2 && b < 2 + Math.sqrt(1.5), `Right bound crossed the curve intersection at frame ${sample.index}`);
                    const crossings = sample.observed.points.filter(p => close(p.x, 2 + Math.sqrt(1.5), 2e-6) && close(p.y, 1.5, 2e-6));
                    assert.ok(crossings.length > 0, 'Fixed curve intersection is missing');
                    const a = 2 - Math.sqrt(1.5);
                    const signedArea = 3 * (b - a) - (2 / 3) * ((b - 2) ** 3 - (a - 2) ** 3);
                    assert.ok(close(parseLocalized(sample.observed.readouts.signed), signedArea, 6e-5), `Signed area readout differs from its antiderivative at frame ${sample.index}`);
                    assert.ok(close(parseLocalized(sample.observed.readouts.unsigned), Math.abs(signedArea), 6e-5), `Unsigned area readout differs from ∫|g-f| at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Area loop is not seamless');
                }, {checkControls: sample => {
                    const points = sample.observed.points;
                    const a = points.find(p => /(?:\$\$)?a(?:\$\$)?/.test(p.name || ''));
                    const bPoint = points.find(p => /(?:\$\$)?b(?:\$\$)?/.test(p.name || ''));
                    assert.ok(a && close(a.x, 2 - Math.sqrt(1.5), 1e-8) && close(a.y, 0, 1e-8), 'Fixed left bound a moved');
                    assert.ok(bPoint && close(bPoint.x, input(sample), 1e-8) && close(bPoint.y, 0, 1e-8), 'Moving right bound b is off the x-axis');
                    assert.equal(sample.controls.length, 4, 'Area construction point count changed');
                }}),
        },
        'arc-length': {
            ...schedule('Število daljic n', 2, [2, 12, 2], 1, 2,
                page => observeBoard(page, samples(0, Math.PI)),
                (sample, previous, first) => {
                    const n = input(sample), curves = sample.observed.curves;
                    assert.ok(Number.isInteger(n) && n >= 2 && n <= 12, `Segment count is not a supported integer at frame ${sample.index}`);
                    matchingFunction(curves, Math.sin, samples(0, Math.PI), 'Arc function sin(x)', assert);
                    const candidates = curves.filter(c => c.dataSamples.length >= n + 1);
                    const polyline = candidates.find(c => {
                        const pts = c.dataSamples.filter(p => p.x !== null && p.y !== null);
                        if (pts.length !== n + 1) return false;
                        return pts.every(p => p && close(p.y, Math.sin(p.x), 2e-4));
                    });
                    assert.ok(polyline, `Polyline vertices are not on sin(x) at frame ${sample.index}`);
                    const vertices = polyline.dataSamples.filter(p => p.x !== null && p.y !== null);
                    const length = vertices.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - vertices[i].x, p.y - vertices[i].y), 0);
                    assert.ok(close(parseLocalized(sample.observed.readouts.polyline), length, 2e-4), `Polyline length readout is not its chord sum at frame ${sample.index}`);
                    assert.ok(close(parseLocalized(sample.observed.readouts.arc), sineArcLengthReference(), 2e-4), `Exact arc-length readout differs from ∫√(1+cos²x) dx at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Arc-length loop is not seamless');
                }, {kind: 'range', checkControls: sample => {
                    assert.equal(sample.controls.length, 2, 'Arc endpoints must remain visible and fixed');
                    assert.ok(sample.controls.some(p => close(p.x, 0, 1e-9) && close(p.y, 0, 1e-9))
                        && sample.controls.some(p => close(p.x, Math.PI, 1e-9) && close(p.y, 0, 1e-9)),
                    'Arc endpoints A=(0,0), B=(π,0) moved during the segment-count sweep');
                }}),
        },
        'mean-value': {
            ...schedule('Točka dotika c', 1, [1, 1.8, 1], 0.1, 3,
                page => observeBoard(page, samples(0, 2)),
                (sample, previous, first) => {
                    const c = input(sample), curves = sample.observed.curves;
                    const xs = samples(0, 2);
                    matchingFunction(curves, x => x * x, xs, 'Mean-value function', assert);
                    const linearCandidates = curves.filter(curve => {
                        const points = curve.samples.filter(p => p.y !== null && p.x >= 0 && p.x <= 2);
                        return points.length >= 8 && points.every(p => close(p.y, 2 * p.x, 2e-6) || close(p.y, 2 * c * p.x - c * c, 2e-6));
                    });
                    assert.ok(linearCandidates.length >= 2, `Secant/tangent construction missing at frame ${sample.index}`);
                    const secant = curves.find(curve => {
                        const points = curve.samples.filter(p => p.y !== null && p.x >= 0 && p.x <= 2);
                        return points.length >= 8 && points.every(p => close(p.y, 2 * p.x, 2e-6));
                    });
                    const tangent = curves.find(curve => {
                        const points = curve.samples.filter(p => p.y !== null && p.x >= 0 && p.x <= 2);
                        return points.length >= 8 && points.every(p => close(p.y, 2 * c * p.x - c * c, 2e-6));
                    });
                    assert.ok(secant && tangent, `Secant or tangent does not match its independent equation at frame ${sample.index}`);
                    assert.ok(close(parseLocalized(sample.observed.readouts['secant-slope']), 2, 5e-5), `Secant readout differs from slope 2 at frame ${sample.index}`);
                    assert.ok(close(parseLocalized(sample.observed.readouts['tangent-slope']), 2 * c, 5e-5), `Tangent readout differs from 2c at frame ${sample.index}`);
                    assert.ok(close(parseLocalized(sample.observed.readouts.difference), 2 * c - 2, 5e-5), `Slope difference readout is incorrect at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Mean-value loop is not seamless');
                }, {checkControls: sample => {
                    const c = input(sample), xs = sample.controls.map(p => p.x).sort((a, b) => a - b);
                    assert.equal(xs.length, 3, 'Mean-value interval and tangent points must remain defined');
                    [0, c, 2].forEach((expected, i) => assert.ok(close(xs[i], expected, 1e-9), `Mean-value axis control ${i} moved`));
                    assert.ok(sample.controls.every(p => close(p.y, 0, 1e-9)), 'Mean-value controls left the x-axis');
                }}),
        },
        extrema: {
            ...schedule('Levo krajišče a', -1, [-1, 1, -1], 0.1, 2,
                page => observeBoard(page, samples(-1.4, 2.4)),
                (sample, previous, first) => {
                    const a = input(sample), xs = samples(-1, 2);
                    matchingFunction(sample.observed.curves, x => x * x, xs, 'Extrema function x²', assert);
                    const endpoints = sample.observed.points.filter(p => close(p.x, a, 1e-8) && close(p.y, a * a, 1e-7));
                    assert.ok(endpoints.length > 0, `Left endpoint (a,a²) missing at frame ${sample.index}`);
                    if (a < 0) assert.ok(sample.observed.points.some(p => close(p.x, 0) && close(p.y, 0)), 'Interior minimum at zero should remain in interval');
                    const minValues = numbersInText(sample.observed.readouts['global-minimum']);
                    const maxValues = numbersInText(sample.observed.readouts['global-maximum']);
                    const expectedMinimum = a <= 0 ? [0, 0] : [a * a, a];
                    assert.ok(expectedMinimum.every((v, i) => close(minValues[i], v, 6e-5)), `Global minimum readout is incorrect at frame ${sample.index}`);
                    assert.ok([4, 2].every((v, i) => close(maxValues[i], v, 6e-5)), `Global maximum readout is incorrect at frame ${sample.index}`);
                    assert.ok(a < 2, `Interval order changed at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Extrema loop is not seamless');
                }, {checkControls: sample => {
                    const a = input(sample), xs = sample.controls.map(p => p.x).sort((x, y) => x - y);
                    assert.equal(xs.length, 2, 'Extrema interval needs two endpoints');
                    assert.ok(close(xs[0], a, 1e-9) && close(xs[1], 2, 1e-9), 'Extrema interval endpoint moved off [a,2]');
                    assert.ok(sample.controls.every(p => close(p.y, 0, 1e-9)), 'Extrema interval endpoint left the x-axis');
                }}),
            variableStrokes: true,
            crf: 26,
        },
        convexity: {
            ...schedule('Točka dotika tangente t', 0.5, [0.5, 1.4, 0.5], 0.1, 3,
                page => observeBoard(page, samples(-1, 1.5)),
                (sample, previous, first) => {
                    const x = input(sample), o = sample.observed;
                    matchingFunction(o.curves, t => t * t, samples(-1, 1.5), 'Convexity function x²', assert);
                    assert.ok(x >= -1 && x <= 1.5, `Comparison point left the chord interval at frame ${sample.index}`);
                    const chord = (1.5 - 1) * x + 1.5;
                    assert.ok(x * x <= chord + 1e-9, `Convex graph lies above its endpoint chord at frame ${sample.index}`);
                    assert.ok(o.points.some(p => close(p.x, x, 1e-8) && close(p.y, x * x, 1e-7)), `Comparison point is not (x,x²) at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Convexity loop is not seamless');
                }, {checkControls: sample => {
                    const t = input(sample), xs = sample.controls.map(p => p.x).sort((x, y) => x - y);
                    assert.equal(xs.length, 3, 'Convexity chord and comparison point must remain defined');
                    [-1, t, 1.5].forEach((expected, i) => assert.ok(close(xs[i], expected, 1e-9), `Convexity axis control ${i} moved`));
                    assert.ok(sample.controls.every(p => close(p.y, 0, 1e-9)), 'Convexity control left the x-axis');
                }}),
        },
        taylor: {
            ...schedule('Stopnja n', 2, [2, 8, 2], 1, 2,
                page => observeBoard(page, samples(-1.5, 2.2)),
                (sample, previous, first) => {
                    const n = input(sample), xs = samples(-1.5, 2.2);
                    const factorial = k => k < 2 ? 1 : k * factorial(k - 1);
                    const polynomial = x => Array.from({length: n + 1}, (_, k) => x ** k / factorial(k)).reduce((a, b) => a + b, 0);
                    matchingFunction(sample.observed.curves, Math.exp, xs, 'Taylor target eˣ', assert);
                    matchingFunction(sample.observed.curves, polynomial, xs, `Taylor polynomial T_${n}`, assert);
                    const nearCenter = sample.observed.curves.flatMap(c => c.samples).filter(p => Math.abs(p.x) <= 0.05 && p.y !== null);
                    assert.ok(nearCenter.length >= 2, 'Taylor target and polynomial samples must cover their shared center');
                    assert.ok(close(parseLocalized(sample.observed.readouts.polynomial), polynomial(1), 6e-5), `Taylor polynomial readout is wrong at frame ${sample.index}`);
                    assert.ok(close(parseLocalized(sample.observed.readouts.function), Math.E, 6e-5), `Taylor function readout is wrong at frame ${sample.index}`);
                    const errorShown = parseLocalized(sample.observed.readouts['absolute-error']);
                    const expectedError = Math.abs(Math.E - polynomial(1));
                    assert.ok(close(errorShown, expectedError, Math.max(5e-8, expectedError * 0.005)),
                        `Taylor error readout ${errorShown} differs from ${expectedError} at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Taylor loop is not seamless');
                }, {checkControls: sample => {
                    assert.equal(sample.controls.length, 2, 'Taylor center and evaluation points must remain fixed');
                    assert.ok(sample.controls.some(p => close(p.x, 0, 1e-9) && close(p.y, 0, 1e-9))
                        && sample.controls.some(p => close(p.x, 1, 1e-9) && close(p.y, 0, 1e-9)),
                    'Taylor center/evaluation x-axis points moved');
                }}),
        },
        sequence: {
            ...schedule('Širina pasu ε', 0.1, [0.1, 0.3, 0.1], 0.01, 0,
                page => observeBoard(page, samples(0, 18)),
                (sample, previous, first) => {
                    const epsilon = input(sample), points = sample.observed.points.filter(p => Number.isInteger(p.x) && p.x >= 1 && p.x <= 16);
                    for (let n = 1; n <= 16; n++) assert.ok(points.some(p => close(p.x, n) && close(p.y, 1 / n)), `Term a_${n}=1/${n} missing at frame ${sample.index}`);
                    assert.ok(epsilon >= 0.1 && epsilon <= 0.3, `Epsilon outside sweep range at frame ${sample.index}`);
                    const nMin = Math.floor(1 / epsilon) + 1;
                    assert.equal(sample.observed.readouts['n-min'], String(nMin), `N_min readout is not floor(1/ε)+1 at frame ${sample.index}`);
                    const certified = 5 * epsilon > 1;
                    assert.equal(sample.observed.statusKinds.sequence.includes('certified'), certified,
                        `Certificate verdict does not match 5ε > 1 at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Sequence loop is not seamless');
                }),
        },
        'uniform-convergence': {
            ...schedule('Indeks n', 5, [5, 25, 5], 1, 1,
                page => observeBoard(page, samples(0, 0.8)),
                (sample, previous, first) => {
                    const n = input(sample), xs = samples(0, 0.8);
                    assert.ok(Number.isInteger(n) && n >= 5 && n <= 25, `Uniform index outside integer sweep at frame ${sample.index}`);
                    const functions = matchingFunction(sample.observed.curves, x => x ** n, xs, 'Uniform-convergence term xⁿ', assert);
                    assert.ok(functions.length === 1, `Expected one visible term curve at frame ${sample.index}`);
                    const supremum = 0.8 ** n;
                    const visibleSamples = functions[0].samples.filter(point => point.y !== null && point.x !== null);
                    const edge = visibleSamples.reduce((best, point) => Math.abs(point.x - 0.8) < Math.abs(best.x - 0.8) ? point : best);
                    assert.ok(Math.abs(edge.x - 0.8) <= 0.04 && close(edge.y, edge.x ** n, 2e-6),
                        `Term curve edge sample (${edge.x},${edge.y}) does not approach rⁿ at frame ${sample.index}`);
                    assert.ok(close(parseLocalized(sample.observed.readouts.supremum), supremum, 1e-4), `Displayed supremum is not rⁿ at frame ${sample.index}`);
                    if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Uniform-convergence loop is not seamless');
                }, {checkControls: sample => {
                    assert.equal(sample.controls.length, 1, 'Uniform-convergence evaluation point count changed');
                    assert.ok(close(sample.controls[0].x, 0.5, 1e-9) && close(sample.controls[0].y, 0, 1e-9),
                        'Uniform-convergence pointwise evaluation x=0.5 moved during n sweep');
                }}),
        },
    };

    const assertUnchangedInputs = (sample, first, allowedLabels) => {
        const allowed = new Set(allowedLabels.map(normalizeInputLabel));
        const fixed = observed => observed.inputValues.filter(item => !allowed.has(normalizeInputLabel(item.label)));
        assert.deepEqual(fixed(sample.observed), fixed(first.observed), `An input outside ${[...allowed].join(', ')} changed at checkpoint ${sample.checkpoint}`);
    };
    specs['arc-length'] = {
        ...exactSteps([
            ...[2, 4, 6, 8, 12].map(value => ({value, phase: value === 12 ? 'discovery-hold' : 'refine', actions: [{kind: 'range', label: 'Število daljic n', value}]})),
            {value: 2, phase: 'reset', actions: [{kind: 'range', label: 'Število daljic n', value: 2}]},
        ], [12, 10, 10, 12, 30, 22], [
            {name: 'coarse', checkpoint: 2, frames: 12}, {name: 'refine', checkpoint: 4, frames: 10},
            {name: 'refine', checkpoint: 6, frames: 10}, {name: 'refine', checkpoint: 8, frames: 12},
            {name: 'fine approximation', checkpoint: 12, frames: 30}, {name: 'reset', kind: 'reset', checkpoint: 2, frames: 22},
        ], [-0.4, 2, 3.6, -0.7], ['Polyline vertices lie on sin(x), endpoints remain (0,0) and (π,0), and the polygon readout equals the independent chord sum; the exact length is an independent Simpson integral.']),
        controlCount: 2, backgroundSample: {x: 40, y: 40},
        observe: page => observeBoard(page, samples(0, Math.PI)),
        checkStep(sample, first) {
            const n = Number(sample.checkpoint), curves = sample.observed.curves;
            assertUnchangedInputs(sample, first, ['Število daljic n']);
            assert.ok(Number.isInteger(n) && n >= 2 && n <= 12, `Segment count is not an exact supported state: ${n}`);
            matchingFunction(curves, Math.sin, samples(0, Math.PI), 'Arc function sin(x)', assert);
            const polyline = curves.find(c => c.dataSamples.length === n + 1 && c.dataSamples.every(p => p.x !== null && p.y !== null && close(p.y, Math.sin(p.x), 2e-4)));
            assert.ok(polyline, `Polyline vertices are not on sin(x) at n=${n}`);
            const vertices = polyline.dataSamples;
            assert.ok(close(vertices[0].x, 0, 2e-6) && close(vertices[0].y, 0, 2e-6)
                && close(vertices.at(-1).x, Math.PI, 2e-6) && close(vertices.at(-1).y, 0, 2e-6), 'Arc endpoints changed');
            const length = vertices.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - vertices[i].x, p.y - vertices[i].y), 0);
            assert.ok(close(parseLocalized(sample.observed.readouts.polyline), length, 2e-4), `Polygon readout is not its chord sum at n=${n}`);
            assert.ok(close(parseLocalized(sample.observed.readouts.arc), sineArcLengthReference(), 2e-4), 'Exact arc length differs from independent Simpson integral');
        },
    };
    specs.taylor = {
        ...exactSteps([
            ...[2, 3, 4].map(value => ({value, phase: value === 4 ? 'discovery-hold' : 'degree', actions: [{kind: 'number', label: 'Stopnja n', value}]})),
            {value: 2, phase: 'reset', actions: [{kind: 'number', label: 'Stopnja n', value: 2}]},
        ], [24, 24, 36, 12], [
            {name: 'degree 2', checkpoint: 2, frames: 24}, {name: 'degree 3', checkpoint: 3, frames: 24},
            {name: 'degree 4 payoff with remaining error', checkpoint: 4, frames: 36},
            {name: 'reset', kind: 'reset', checkpoint: 2, frames: 12},
        ], [-2.6, 5, 2.2, -1.4], ['The visible approximation is Tₙ(x)=Σₖ₌₀ⁿ xᵏ/k! for exact integer degrees; center 0 and evaluation point 1 stay fixed, and readouts match e and the independently computed remainder.']),
        controlCount: 2, backgroundSample: {x: 40, y: 40},
        observe: page => observeBoard(page, samples(-2.6, 2.2)),
        checkStep(sample, first) {
            const n = Number(sample.checkpoint), xs = samples(-1.5, 2.2);
            assertUnchangedInputs(sample, first, ['Stopnja n']);
            assert.ok(Number.isInteger(n) && n >= 2 && n <= 8, `Taylor degree must be an exact supported state: ${n}`);
            const factorial = k => k < 2 ? 1 : k * factorial(k - 1);
            const polynomial = x => Array.from({length: n + 1}, (_, k) => x ** k / factorial(k)).reduce((a, b) => a + b, 0);
            matchingFunction(sample.observed.curves, Math.exp, xs, 'Taylor target eˣ', assert);
            matchingFunction(sample.observed.curves, polynomial, xs, `Taylor polynomial T_${n}`, assert);
            assert.ok(close(parseLocalized(sample.observed.readouts.polynomial), polynomial(1), 6e-5), `Taylor polynomial readout is wrong at n=${n}`);
            assert.ok(close(parseLocalized(sample.observed.readouts.function), Math.E, 6e-5), 'Taylor target readout differs from e');
            const errorShown = parseLocalized(sample.observed.readouts['absolute-error']), expectedError = Math.abs(Math.E - polynomial(1));
            assert.ok(close(errorShown, expectedError, Math.max(5e-8, expectedError * 0.005)), `Taylor remainder is wrong at n=${n}`);
            assert.ok(sample.observed.points.some(p => close(p.x, 0) && close(p.y, 0)) && sample.observed.points.some(p => close(p.x, 1) && close(p.y, 0)),
                'Taylor center and evaluation point must stay at 0 and 1');
        },
    };
    specs['uniform-convergence'] = {
        ...exactSteps([
            ...[5, 8, 11, 16, 25].map(value => ({value, phase: value === 11 ? 'supremum-enters-band' : 'increase-index', actions: [{kind: 'number', label: 'Indeks n', value}]})),
            {value: 5, phase: 'reset', actions: [{kind: 'number', label: 'Indeks n', value: 5}]},
        ], [14, 12, 26, 14, 16, 14], [
            {name: 'outside band', checkpoint: 5, frames: 14}, {name: 'decay', checkpoint: 8, frames: 12},
            {name: 'supremum enters band', checkpoint: 11, frames: 26}, {name: 'smaller error', checkpoint: 16, frames: 14},
            {name: 'fine index', checkpoint: 25, frames: 16}, {name: 'reset', kind: 'reset', checkpoint: 5, frames: 14},
        ], [-0.08, 1.1, 0.9, -0.15], ['For fixed domain [0,0.8], fₙ(x)=xⁿ and sup|fₙ|=0.8ⁿ. The same n applies across the whole domain; the epsilon band and selected point remain fixed.']),
        controlCount: 1, backgroundSample: {x: 40, y: 40},
        observe: page => observeBoard(page, samples(0, 0.8)),
        checkStep(sample, first) {
            const n = Number(sample.checkpoint), xs = samples(0, 0.8), o = sample.observed;
            assertUnchangedInputs(sample, first, ['Indeks n']);
            assert.ok(Number.isInteger(n) && n >= 5 && n <= 25, `Uniform index must be an exact supported state: ${n}`);
            const functions = matchingFunction(o.curves, x => x ** n, xs, 'Uniform-convergence term xⁿ', assert);
            assert.equal(functions.length, 1, `Expected one visible power curve at n=${n}`);
            assert.ok(close(parseLocalized(o.readouts.supremum), 0.8 ** n, 1e-4), `Displayed supremum is not 0.8ⁿ at n=${n}`);
            assert.ok(o.points.some(p => close(p.x, 0.5, 1e-9) && close(p.y, 0, 1e-9)), 'Pointwise comparison control at x=0.5 moved');
        },
    };

    const sequenceCheckStep = (sample, first) => {
        const epsilon = inputValue(sample, 'Širina pasu ε'), threshold = inputValue(sample, 'Prag N');
        assertUnchangedInputs(sample, first, ['Širina pasu ε', 'Prag N']);
        assert.ok(epsilon > 0 && threshold >= 1 && Number.isInteger(threshold), 'Sequence checkpoint needs positive ε and integer N');
        const points = sample.observed.points.filter(p => Number.isInteger(p.x) && p.x >= 1 && p.x <= 16);
        for (let n = 1; n <= 16; n++) assert.ok(points.some(p => close(p.x, n) && close(p.y, 1 / n)), `Term a_${n}=1/${n} missing at checkpoint ${sample.checkpoint}`);
        const nMin = Math.floor(100 / Math.round(epsilon * 100)) + 1;
        assert.equal(Number(sample.observed.readouts['n-min']), nMin, `N_min is not floor(1/ε)+1 at ε=${epsilon}`);
        const certified = threshold * Math.round(epsilon * 100) > 100;
        assert.equal(sample.observed.statusKinds.sequence.includes('certified'), certified,
            `Certificate verdict does not match Nε > 1 at ε=${epsilon}, N=${threshold}`);
        assert.equal(sample.observed.statusKinds.sequence.includes('threshold-fails'), !certified,
            `Failure state does not match Nε ≤ 1 at ε=${epsilon}, N=${threshold}`);
    };
    specs.sequence = {
        ...exactSteps([
            {value: 'ε=.3,N=5', phase: 'setup', actions: [{kind: 'number', label: 'Širina pasu ε', value: 0.3}, {kind: 'number', label: 'Prag N', value: 5}]},
            {value: 'ε=.1,N=5', phase: 'tighten-epsilon', actions: [{kind: 'number', label: 'Širina pasu ε', value: 0.1}, {kind: 'number', label: 'Prag N', value: 5}]},
            {value: 'ε=.1,N=11', phase: 'increase-threshold', actions: [{kind: 'number', label: 'Širina pasu ε', value: 0.1}, {kind: 'number', label: 'Prag N', value: 11}]},
            {value: 'ε=.3,N=5', phase: 'reset', actions: [{kind: 'number', label: 'Širina pasu ε', value: 0.3}, {kind: 'number', label: 'Prag N', value: 5}]},
        ], [18, 18, 34, 26], [
            {name: 'setup', checkpoint: 'ε=.3,N=5', frames: 18},
            {name: 'narrow epsilon', checkpoint: 'ε=.1,N=5', frames: 18},
            {name: 'raise N', checkpoint: 'ε=.1,N=11', frames: 34},
            {name: 'reset', kind: 'reset', checkpoint: 'ε=.3,N=5', frames: 26},
        ], [0, 1.2, 18, -0.2], ['aₙ=1/n, L=0, and the 16 displayed terms stay fixed; N_min=floor(1/ε)+1; the all-tail certificate is exactly Nε>1.']),
        controlCount: 0, backgroundSample: {x: 40, y: 40},
        observe: page => observeBoard(page, samples(0, 18)),
        checkStep: sequenceCheckStep,
    };

    const meanValueCheckStep = (sample, first) => {
        const c = inputValue(sample, 'Točka dotika c'), observed = sample.observed;
        assertUnchangedInputs(sample, first, ['Točka dotika c']);
        const intervalCurves = observed.curves.map(curve => ({curve, points: curve.samples.filter(p => p.x !== null && p.y !== null && p.x >= 0 && p.x <= 2)}))
            .filter(item => item.points.length >= 8);
        const follows = fn => intervalCurves.some(item => item.points.every(p => close(p.y, fn(p.x), 2e-6)));
        assert.ok(follows(x => x * x), 'Mean-value function must remain f(x)=x²');
        assert.ok(follows(x => 2 * x), 'Fixed interval secant must remain y=2x');
        assert.ok(follows(x => 2 * c * x - c ** 2), `Tangent at c=${c} must be y=2cx−c²`);
        assert.ok(close(parseLocalized(observed.readouts['secant-slope']), 2, 5e-5), 'Secant slope readout must stay 2');
        assert.ok(close(parseLocalized(observed.readouts['tangent-slope']), 2 * c, 5e-5), 'Tangent slope readout must equal 2c');
        assert.ok(close(parseLocalized(observed.readouts.difference), 2 * c - 2, 5e-5), 'Slope difference must equal 2c−2');
        if (sample.phase === 'match-revealed') {
            assert.ok(close(c, 1, 1e-9), 'Matching-point construction may only be revealed at c=1');
            assert.equal(observed.reveals['toggle-matches'], 'true', 'Matching-point construction must be revealed at the payoff');
            assert.ok(observed.points.some(p => close(p.x, 1, 1e-8) && close(p.y, 1, 1e-8)), 'Matching point (1,1) is missing at the payoff');
        } else if (observed.reveals) {
            assert.notEqual(observed.reveals['toggle-matches'], 'true', `Matching construction is prematurely revealed in ${sample.phase}`);
        }
    };
    specs['mean-value'] = {
        ...exactSteps([
            {value: 0.5, phase: 'shallow', actions: [{kind: 'number', label: 'Točka dotika c', value: 0.5}]},
            {value: 1, phase: 'matching-hidden', actions: [{kind: 'number', label: 'Točka dotika c', value: 1}]},
            {value: 1.5, phase: 'steeper', actions: [{kind: 'number', label: 'Točka dotika c', value: 1.5}]},
            {value: 1, phase: 'match-revealed', actions: [{kind: 'number', label: 'Točka dotika c', value: 1}, {kind: 'button', label: 'Pokaži ujemajočo točko'}]},
            {value: 0.5, phase: 'reset', actions: [{kind: 'number', label: 'Točka dotika c', value: 0.5}]},
        ], [14, 10, 10, 50, 12], [
            {name: 'shallow tangent', checkpoint: 0.5, frames: 14},
            {name: 'matching tangent', checkpoint: 1, frames: 10},
            {name: 'steeper tangent', checkpoint: 1.5, frames: 10},
            {name: 'reveal parallel match', checkpoint: 1, frames: 50},
            {name: 'reset', kind: 'reset', checkpoint: 0.5, frames: 12},
        ], [-0.3, 4.8, 2.4, -0.5], ['For f(x)=x² on [0,2], secant slope is 2 and tangent slope is 2c; equality occurs only at c=1. The secant remains fixed.']),
        controlCount: 3, backgroundSample: {x: 40, y: 40},
        observe: page => observeBoard(page, samples(0, 2)),
        checkStep: meanValueCheckStep,
    };

    const fixedPointCheckStep = (sample, first) => {
        const x0 = inputValue(sample, 'Začetek x₀'), k = Number(sample.observed.readouts.step);
        assertUnchangedInputs(sample, first, []);
        assert.equal(x0, 0, 'Fixed-point start stays fixed at x₀=0');
        assert.ok(Number.isInteger(k) && k >= 0 && k <= 5, 'Fixed-point checkpoint must be an exact step from 0 to 5');
        matchingFunction(sample.observed.curves, x => (x + 1) / 2, samples(0, 2), 'Fixed-point map T(x)=(x+1)/2', assert);
        const iterates = [x0];
        for (let i = 0; i < 5; i++) iterates.push((iterates.at(-1) + 1) / 2);
        for (let i = 0; i <= k; i++) {
            assert.ok(sample.observed.points.some(p => close(p.x, iterates[i], 1e-7) && close(p.y, iterates[i], 1e-7)),
                `Diagonal iterate x_${i} is not T^${i}(x₀)`);
        }
        const expectedCobweb = [{x: x0, y: x0}, {x: x0, y: x0}];
        for (let i = 0; i < k; i++) {
            expectedCobweb.push({x: iterates[i], y: iterates[i + 1]}, {x: iterates[i + 1], y: iterates[i + 1]});
        }
        const cobweb = sample.observed.curves.find(curve => curve.dataSamples.length === expectedCobweb.length);
        assert.ok(cobweb, `Cobweb must contain the start and exactly ${k} constructed steps`);
        expectedCobweb.forEach((expected, i) => assert.ok(close(cobweb.dataSamples[i].x, expected.x, 1e-7)
            && close(cobweb.dataSamples[i].y, expected.y, 1e-7), `Cobweb point ${i} differs from the independent iterate sequence`));
        assert.ok(Math.abs(iterates[k] - 1) <= 2 ** -k + 1e-12, `Contraction estimate fails at step ${k}`);
    };
    specs['fixed-point'] = {
        ...exactSteps([
            {value: 1, phase: 'poster-setup', actions: []},
            {value: 2, phase: 'iterate', actions: [{kind: 'button', label: 'Naslednji korak', count: 1}]},
            {value: 3, phase: 'iterate', actions: [{kind: 'button', label: 'Naslednji korak', count: 2}]},
            {value: 4, phase: 'iterate', actions: [{kind: 'button', label: 'Naslednji korak', count: 3}]},
            {value: 5, phase: 'discovery-hold', actions: [{kind: 'button', label: 'Naslednji korak', count: 4}]},
            {value: 1, phase: 'reset', actions: []},
        ], [16, 12, 12, 16, 24, 16], [
            {name: 'poster setup', checkpoint: 1, frames: 16}, {name: 'iterate 2', checkpoint: 2, frames: 12},
            {name: 'iterate 3', checkpoint: 3, frames: 12}, {name: 'iterate 4', checkpoint: 4, frames: 16},
            {name: 'discovery hold', checkpoint: 5, frames: 24}, {name: 'reset', kind: 'reset', checkpoint: 1, frames: 16},
        ], [-0.15, 1.2, 1.2, -0.15], ['Each staircase vertex is T iterated from x₀=0 under T(x)=(x+1)/2; after k steps |xₖ−1|=2⁻ᵏ. Iterates are exact held states.']),
        controlCount: 0, backgroundSample: {x: 40, y: 40},
        observe: page => observeBoard(page, samples(0, 2)),
        checkStep: fixedPointCheckStep,
    };

    const invariantDescriptions = {
        'linear-function': 'The line points and rendered equation satisfy y = kx + 1 for the reported k; only k and its dependent endpoint y-coordinate change.',
        'exponential-function': 'The rendered curve and reference point satisfy f(x) = a^x for the reported base a.',
        continuity: 'At x = 1, the closed value is a and the right-hand limit is 3 − a; their separation is |3 − 2a|.',
        'area-between-curves': 'The fixed curves are (x − 2)^2 and 3 − (x − 2)^2; signed and unsigned area readouts match the antiderivative up to b.',
        'arc-length': 'Polyline vertices lie on sin(x); the polygon readout equals their chord sum and the arc readout equals an independent Simpson integral.',
        'mean-value': 'For f(x) = x² on [0,2], the secant slope is 2, the tangent at c has slope 2c, and their difference is 2c − 2.',
        extrema: 'The interval endpoints are (a,a²) and (2,4), with the interior minimum at (0,0) exactly when 0 belongs to [a,2].',
        convexity: 'For f(x) = x² on [−1,1.5], each comparison point lies below the endpoint chord.',
        taylor: 'The visible polynomial is Σ(k=0..n) x^k/k! and its readouts at x = 1 match e and the absolute remainder.',
        sequence: 'The terms are a_n = 1/n and N_min = floor(1/ε)+1; the displayed certificate matches the independent 5ε > 1 criterion.',
        'uniform-convergence': 'The visible term is x^n on [0,0.8] and the displayed supremum error equals 0.8^n.',
        'fixed-point': 'For T(x) = (x+1)/2, the five shown iterates satisfy x_k = 1 + (x₀−1)/2^k and the contraction bound.',
    };
    const measuredEncoderBudgets = {
        'linear-function': 'CRF 10 (existing default): diagnostic capture 301116 B, below 307200 B. Kept the full k = 2 → −0.5 → 2 sweep; its 1.98% headroom leaves little room to increase complexity.',
        'exponential-function': 'CRF 10 (existing default): diagnostic capture 298210 B, below 307200 B. Kept the full base = 2 → 0.5 → 2 sweep; 8990 B headroom is sufficient.',
        continuity: 'CRF 10 (existing default): diagnostic capture 247844 B, below 307200 B. Kept the full jump-closing parameter sweep.',
        'area-between-curves': 'CRF 10 (existing default): diagnostic capture 136150 B, below 307200 B. Kept both fixed curves, both intersections, and the full bound sweep.',
        'arc-length': 'CRF 10 (existing default): diagnostic capture 227659 B, below 307200 B. Kept all 2–12 exact segment-count states.',
        'mean-value': 'CRF 10 (existing default): diagnostic capture 201781 B, below 307200 B. Kept the full tangency sweep and secant/tangent readouts.',
        extrema: 'CRF 26 (within the existing encoder): CRF 10 produced 428874 B and CRF 18 produced 340597 B, both over 307200 B; CRF 26 produced 267783 B. The full interval sweep is kept because it shows when the global minimum moves to the left endpoint.',
        convexity: 'CRF 10 (existing default): diagnostic capture 168176 B, below 307200 B. Kept the full comparison-point sweep and fixed chord.',
        taylor: 'CRF 10 (existing default): diagnostic capture 95013 B, below 307200 B. Kept all degrees 2–8 and the full function/polynomial comparison.',
        sequence: 'CRF 10 (existing default): diagnostic capture 212545 B, below 307200 B. Kept all 16 terms, epsilon band, and actual certificate verdict.',
        'uniform-convergence': 'CRF 10 (existing default): diagnostic capture 187442 B, below 307200 B. Kept all indices 5–25 and the displayed supremum.',
        'fixed-point': 'CRF 10 (existing default): diagnostic capture 259344 B, below 307200 B. Kept the 0 → 0.8 → 0 start sweep with five exact iteration steps.',
    };
    for (const [id, spec] of Object.entries(specs)) {
        if (spec.mode === 'parameter-sweep') spec.invariants = [invariantDescriptions[id],
            `Every accessible input except “${spec.control.label}” stays fixed (the linear endpoint y₂ is derived from k).`,
            'The final frame returns to the exact recipe state; first and last frame hashes are checked.'];
        spec.encoderBudget = spec.mode === 'discrete-exact-steps'
            ? `Existing CRF 10 baseline was ${measuredEncoderBudgets[id]}; revised exact checkpoints require a new encode and 300 KiB validation.`
            : measuredEncoderBudgets[id];
    }
    return specs;
}

module.exports = {createAnalysisMotionSpecs, analysisMotionIds: ids};
