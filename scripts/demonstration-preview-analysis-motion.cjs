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
        const inputValues = [...document.querySelectorAll('input[role="spinbutton"], input[type="range"], input[type="checkbox"], select')].map(e => ({
            label: [...(e.labels || [])].map(l => l.textContent.trim()).join(' ').trim() || e.getAttribute('aria-label') || '',
            value: e.type === 'checkbox' ? String(e.checked) : e.value,
        }));
        const statusKinds = Object.fromEntries(['sequence', 'uniform', 'mean-value', 'extrema', 'fixed-point']
            .map(prefix => [prefix, [...document.querySelectorAll(`[data-${prefix}-status]`)].map(e => e.getAttribute(`data-${prefix}-status`))]));
        return {curves, points, lines, readouts, inputValues, statusKinds};
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
function numbersInText(value) { return (String(value).match(/[−-]?\d+(?:[,.]\d+)?/g) || []).map(parseLocalized); }

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

    const reapplyFiveSteps = async page => {
        assert.equal(typeof helpers.applyAction, 'function', 'Fixed-point capture needs the shared supported-action helper');
        await helpers.applyAction(page, {kind: 'button', label: 'Naslednji korak', count: 5});
    };
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

    specs['fixed-point'] = schedule('Začetek x₀', 0, [0, 0.8, 0], 0.01, 0,
        page => observeBoard(page, samples(0, 2)),
        (sample, previous, first) => {
            const x0 = input(sample), expected = Array.from({length: 6}, (_, k) => 1 + (x0 - 1) / 2 ** k);
            matchingFunction(sample.observed.curves, x => (x + 1) / 2, samples(0, 2), 'Fixed-point map T(x)=(x+1)/2', assert);
            for (let k = 0; k <= 5; k++) assert.ok(sample.observed.points.some(p => close(p.x, expected[k], 1e-7) && close(p.y, expected[k], 1e-7)),
                `Cobweb iterate x_${k} does not match T^${k}(x₀) at frame ${sample.index}`);
            assert.equal(sample.observed.readouts.step, '5', `Fixed-point iteration count is not five at frame ${sample.index}`);
            assert.ok(Math.abs(expected[5] - 1) <= Math.abs(x0 - 1) / 32 + 1e-9, `Five-step contraction bound failed at frame ${sample.index}`);
            if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Fixed-point loop is not seamless');
        }, {afterChange: reapplyFiveSteps});

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
        spec.invariants = [invariantDescriptions[id], `Every accessible input except “${spec.control.label}” stays fixed (the linear endpoint y₂ is derived from k).`, 'The final frame returns to the exact recipe state; first and last frame hashes are checked.'];
        spec.encoderBudget = measuredEncoderBudgets[id];
    }
    return specs;
}

module.exports = {createAnalysisMotionSpecs, analysisMotionIds: ids};
