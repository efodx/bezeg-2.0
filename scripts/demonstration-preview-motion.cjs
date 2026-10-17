const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const crypto = require('node:crypto');
const {recipes, applyRecipe, applyAction, settle} = require('./demonstration-preview-recipes.cjs');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const motionIds = ['repeated-subdivision','bisection','bezier','affine','elevation','rational-elevation','decasteljau','derivative','farin','weighted-parameterization','complex-multiplication','accumulation'];
const frameCount = 96;
const sampleRate = 24;
const backgroundPixel = [255, 253, 245];
const affineSteps = [0,1,2,3,2,1,0];
const affineHolds = [18,10,10,20,10,10,18];
const near = (actual, expected, message) => assert.ok(Math.abs(actual-expected)<1e-8, message);

// Shared timing: 12 holds, 71 moving frames (phase 0 to 1), 13 holds. Frames 13..82 move.
const holdStart = 12, moveFrames = 71;
const movePhase = i => Math.max(0, Math.min(1, (i - holdStart) / moveFrames));
// Frame nearest the sin² peak (phase 0.5 falls at frame 47.5, rounded down to a sample).
const peakFrame = Math.floor(holdStart + moveFrames / 2);
// Pointer drags use sin² out and back: 0 at the start, 1 mid-move, 0 at the end.
const sin2OutAndBack = i => Math.sin(Math.PI * movePhase(i)) ** 2;
// Parameter sweeps visit each spec's waypoints in order, each leg with a sin² ease (zero speed at every waypoint).
// Waypoints, control step and start live in the spec (motionSpecs[id].sweep); the runner has no route-specific values.
const snapToStep = (value, step) => {
    const decimals = (String(step).split('.')[1] || '').length;
    return Number((Math.round(value / step) * step).toFixed(decimals));
};
function sweepValue(i, spec) {
    const {waypoints, step} = spec.sweep;
    const scaled = movePhase(i) * (waypoints.length - 1);
    const leg = Math.min(waypoints.length - 2, Math.floor(scaled));
    const local = scaled - leg;
    const eased = (1 - Math.cos(Math.PI * local)) / 2;
    return snapToStep(waypoints[leg] + (waypoints[leg + 1] - waypoints[leg]) * eased, step);
}
// Catalog 'square' function f(x) = x² (src/analysis/functions.ts) and its derivative, used by the derivative invariants.
const squareValue = x => x * x;
// Slovenian decimal text as formatNumber(value, 'sl', 2) renders it (trailing zeros trimmed, comma separator).
const slovenianDecimal = value => value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');

/** Pure de Casteljau levels for a control polygon at parameter t (level 1 first, the curve point last). */
function deCasteljauLevels(controls, t) {
    let level = controls.map(({x, y}) => ({x, y}));
    const levels = [];
    while (level.length > 1) {
        level = level.slice(0, -1).map((p, i) => ({x: (1 - t) * p.x + t * level[i + 1].x, y: (1 - t) * p.y + t * level[i + 1].y}));
        levels.push(level);
    }
    return levels;
}
/** Independent Bernstein evaluation of the full curve at t, used to check the final construction point. */
function bernsteinPoint(controls, t) {
    const n = controls.length - 1;
    const binomial = (a, b) => { let r = 1; for (let k = 1; k <= b; k++) r = r * (a - b + k) / k; return r; };
    return controls.reduce((acc, p, k) => {
        const b = binomial(n, k) * t ** k * (1 - t) ** (n - k);
        return {x: acc.x + b * p.x, y: acc.y + b * p.y};
    }, {x: 0, y: 0});
}
const pathHash = paths => crypto.createHash('sha256').update(paths.join('\n')).digest('hex');
/** Pure rational Bézier evaluation at t from control points and weights (independent of the runtime's evaluator). */
function rationalPoint(controls, weights, t) {
    const n = controls.length - 1;
    const binomial = (a, b) => { let r = 1; for (let k = 1; k <= b; k++) r = r * (a - b + k) / k; return r; };
    let x = 0, y = 0, total = 0;
    controls.forEach((p, k) => {
        const b = binomial(n, k) * t ** k * (1 - t) ** (n - k) * weights[k];
        x += b * p.x; y += b * p.y; total += b;
    });
    return {x: x / total, y: y / total};
}

// Farin glider (edge 1, between p1 and p2): its Value v is the position on the edge, v = ratio / (1 + ratio) with ratio = w2 / w1.
// Effective weights chain as in JXGRationalBezierCurve.showFarinPoints: w0 = 1, w(k+1) = w(k) * v_k / (1 - v_k).
const farinParameterTs = [0.1, 0.37, 0.5, 0.81, 0.93];
const farinValue = (v0, displacement) => v0 + displacement * (motionSpecs.farin.glider.target - v0);
const farinPoint = (slider, v) => ({x: slider.p1.x + v * (slider.p2.x - slider.p1.x), y: slider.p1.y + v * (slider.p2.y - slider.p1.y)});
function farinEffectiveWeights(values) {
    const weights = [1];
    for (const v of values) weights.push(weights.at(-1) * (v / (1 - v)));
    return weights;
}
const farinWeightText = (k, weight) => `$$w_{${k}}=${weight.toFixed(2)}$$`;

// Alpha reparameterization used by the weighted-parameterization route: φ_α(t) = (1-α) t / (α(1-t) + (1-α) t), α = 1/2 is the identity.
// Independent copy of alphaParameterization in src/graphs/curves/parametrisations/AlphaParamBezierCurveGraph.tsx (scripts cannot import TS).
const alphaParameterizationValue = (alpha, t) => (1 - alpha) * t / (alpha * (1 - t) + (1 - alpha) * t);
// The route's markers are the curve at φ_α(k/(count+1)), k = 1..count (generateParamPoints), evaluated with the Bernstein form.
function weightedParameterizationMarkers(controls, alpha, count) {
    return Array.from({length: count}, (_, k) => bernsteinPoint(controls, alphaParameterizationValue(alpha, (k + 1) / (count + 1))));
}

// Caption text for the complex board, as src/analysis/complexFormat.ts writes it: a true minus sign, the Slovenian decimal comma,
// coordinates to four decimals with trailing zeros trimmed, and arguments to three decimals. Independent copy (scripts cannot import TS).
const complexMinus = '\u2212';
const complexNumber = (value, decimals) => {
    if (Math.abs(value) < 0.5 * 10 ** -decimals) return '0';
    const body = Math.abs(value).toFixed(decimals).replace(/\.?0+$/, '').replace('.', ',');
    return (value < 0 ? complexMinus : '') + body;
};
function complexText({x, y}) {
    const real = complexNumber(x, 4), imaginary = complexNumber(y, 4);
    if (imaginary === '0') return real;
    const negative = imaginary.startsWith(complexMinus), magnitude = negative ? imaginary.slice(1) : imaginary;
    const part = `${magnitude === '1' ? '' : magnitude}i`;
    if (real === '0') return negative ? `${complexMinus}${part}` : part;
    return `${real} ${negative ? complexMinus : '+'} ${part}`;
}
/** The caption lines that must appear on the board: the operands and the product. */
function complexCaptionLines(z, w, product) {
    return [`z = ${complexText(z)}, w = ${complexText(w)}`, `zw = ${complexText(product)}`];
}
/** The 3-decimal arguments of the nonzero values, checked only when the caption's argument line is shown (the narrow-board policy hides it). */
function complexArgumentLines(z, w, product) {
    return [z, w, product].filter(c => c.x !== 0 || c.y !== 0).map(c => complexNumber(Math.atan2(c.y, c.x), 3));
}

// accumulation: A(x) = integral from a to x of f(t) dt for the catalog 'sin' (f = sin, F = -cos, src/analysis/functions.ts).
// The drag handler rounds x to the 0.01 grid and clamps it to [-7, 7], then cleanNumber (src/graphs/functions/BaseFunctionGraph.tsx,
// slidingPoint and cleanNumber). The reference integral below uses composite Simpson's rule on sin, not F, so it is independent of the route.
const accumulationStartX = 2, accumulationAmplitude = 2.5;
const accumulationSnap = value => {
    const grid = Math.max(-7, Math.min(7, Math.round(value / 0.01) * 0.01 + 0));
    return Math.round(grid * 1e9) / 1e9 + 0;
};
function accumulationReference(a, x, n = 2000) {
    const h = (x - a) / n;
    let sum = Math.sin(a) + Math.sin(x);
    for (let k = 1; k < n; k++) sum += Math.sin(a + k * h) * (k % 2 ? 4 : 2);
    return sum * h / 3;
}
/** formatNumber(value, 'sl', 4) from src/analysis/format.ts: 4 decimals, trailing zeros dropped, decimal comma, true minus sign. */
function formatSlNumber(value) {
    if (!Number.isFinite(value)) return '—';
    const fixed = value.toFixed(4);
    const trimmed = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
    const negative = trimmed.startsWith('-');
    const unsigned = negative ? trimmed.slice(1) : trimmed;
    if (/^0(\.0*)?$/.test(unsigned)) return '0';
    const text = unsigned.replace('.', ',');
    return negative ? `−${text}` : text;
}
/** The board caption line that shows A(x) (accumulation_board_value in sl.ts). */
const accumulationReadoutLine = (a, x) => `A(x) = ${formatSlNumber(accumulationReference(a, x))} (s predznakom)`;

/** One config row per continuous clip. Bézier stays the pointer-drag reference; decasteljau is a parameter sweep. */
const motionSpecs = {
    bezier: {
        mode: 'pointer-drag', controlCount: 4,
        start: ctx => ctx.points[1],
        path: (moved, displacement) => ({x: moved.x + 1.8 * displacement, y: moved.y + 2.1 * displacement}),
        // Coordinate editor restore: the moved control point is set back to its exact start coordinates.
        restore: async (page, ctx) => {
            const moved = ctx.points[1];
            await applyAction(page,{kind:'button',label:'Krivulja1'});
            await page.locator('.point-coordinate-editor summary').click();
            await page.getByLabel('p1 x',{exact:true}).fill(String(moved.x));
            await page.getByLabel('p1 y',{exact:true}).fill(String(moved.y));
            await page.getByRole('button',{name:'Uporabi koordinate',exact:true}).click();
            await applyAction(page,{kind:'button',label:'Prekliči izbiro'});
        },
        check(sample, previous, first) {
            const i = sample.index, originals = first.points.filter(p => p.draggable), moved = originals[1];
            for (const original of originals) {
                const actual = sample.points.find(p => p.id === original.id);
                assert.ok(actual);
                const expected = original.id === moved.id ? sample.target : original;
                // Known weakness, inherited from the original Bézier preview: the dragged point may sit up to 0.035 units
                // from its scheduled target while moving (1e-9 at rest). Tightening it needs re-verification of the drag path.
                const tolerance = original.id === moved.id && i > holdStart && i < holdStart + moveFrames ? 0.035 : 1e-9;
                assert.ok(Math.abs(actual.x - expected.x) < tolerance && Math.abs(actual.y - expected.y) < tolerance, `Unexpected control-point position at sample ${i}: ${JSON.stringify({actual, expected})}`);
            }
            assert.deepEqual(sample.strokeWidths, first.strokeWidths, `Stroke widths compounded at sample ${i}`);
            if (i === peakFrame) assert.notEqual(sample.curvePathHash, first.curvePathHash, 'Pointer motion did not recompute the real curve');
            if (i === frameCount - 1) assert.equal(sample.curvePathHash, first.curvePathHash, 'The original curve must return exactly');
        },
        schedule: {kind: 'sin2-out-and-back', phase: 'clamp((frame-12)/71)', displacement: 'sin²(π·phase)',
            zeroDisplacementFrames: '0-12 and 83-95', movingFrames: '13-82', press: 13, release: 83,
            restore: 'coordinate editor (exact)'},
        invariants: ['Only the dragged control point changes position during the drag', 'Other control points stay within 1e-9 of their start',
            'Curve path recomputes from the moved point and returns exactly to the start', 'Stroke widths do not compound across frames'],
    },
    decasteljau: {
        mode: 'parameter-sweep', controlCount: 5,
        control: {label: 'Parameter t', kind: 'range'},
        sweep: {
            waypoints: [0.5, 1, 0, 0.5], step: 0.01, start: 0.5,
            readout: {text: value => `t = ${value.toFixed(2)}`,
                read: ({page}) => page.evaluate(() => document.querySelector('.decasteljau-animation-heading output')?.textContent ?? null)},
            check(sample, previous, first) {
                const {controls, actual: {input: value}} = sample;
                // Intermediate points and the construction end are compared with pure evaluations at the reported t.
                const levels = deCasteljauLevels(controls, value).flat();
                const observed = sample.points.filter(p => !p.draggable).map(({x, y}) => ({x, y}));
                // The observed construction end must lie on the full curve (Bernstein evaluation at the reported t).
                const final = bernsteinPoint(controls, value);
                assert.ok(observed.some(p => Math.abs(p.x - final.x) < 1e-9 && Math.abs(p.y - final.y) < 1e-9), `Final point leaves the full curve at frame ${sample.index}`);
                assertPointSet(observed, levels, `Intermediate point differs from pure de Casteljau at frame ${sample.index}`);
                if (previous) {
                    if (previous.scheduled !== sample.scheduled) assert.notEqual(sample.curvePathHash, previous.curvePathHash, `Partial-curve path did not change at frame ${sample.index}`);
                    else assert.equal(sample.curvePathHash, previous.curvePathHash, `Partial-curve path changed while t held at frame ${sample.index}`);
                }
                // Seam: the sweep returns to the recipe state, so the last source PNG must equal the first (as for the other clips).
                if (sample.index === frameCount - 1) assert.equal(sample.capture.sha256, first.capture.sha256, 'Non-seamless loop: last PNG differs from the recipe frame');
            },
        },
        // Budget order: no point labels are visible to remove, the full 0-1 range is the lesson, so only the encoder
        // quality changes. Measured on the poster-fit camera: CRF 10 gave 451017 bytes (over the 300 KiB ceiling),
        // CRF 24 gave 353457, CRF 26 323167, CRF 28 295631 (limit 307200).
        crf: 28,
        encoderBudget: 'CRF 28 instead of CRF 10: CRF 10 gave about 451 KB, over the 300 KiB ceiling; no point labels are visible to remove; full 0-1 range kept',
        schedule: {kind: 'piecewise-sin2', waypoints: [0.5, 1, 0, 0.5], phase: 'clamp((frame-12)/71)',
            zeroDisplacementFrames: '0-12 and 83-95 (t holds at 0.5)', movingFrames: '13-82',
            legs: 'three equal phase thirds, each eased by (1 - cos πx)/2 from one waypoint to the next', step: 0.01,
            input: 'keyboard ArrowRight/ArrowLeft on the Parameter t range, incremental from the previous frame'},
        invariants: ['Control points unchanged (1e-9)', 'Intermediate de Casteljau points equal a pure evaluation at the reported t (1e-9)',
            'Final construction point equals the full-curve Bernstein point at t (1e-9)', 'Input value and graph readout equal the snapped target every frame',
            'Partial-curve path changes whenever t changes and is unchanged while t holds', 'Camera fixed: every frame geometry lies inside the poster-fit window',
            'First and last frames equal the recipe state'],
    },
    derivative: {
        mode: 'parameter-sweep', controlCount: 1,
        // The point P=(x0, f(x0)) is the only draggable point; the sweep moves the step h, never P.
        control: {label: 'Korak h', kind: 'range'},
        sweep: {
            // Recipe h = 1 (DEFAULT_DERIVATIVE_MODEL, src/analysis/derivativeModel.ts) to 0.05 and back; the excluded band |h| < 0.01 is never reached.
            waypoints: [1, 0.05, 1], step: 0.01, start: 1,
            fixed: {x0: 1},
            readout: {text: slovenianDecimal,
                read: ({range}) => range.getAttribute('aria-valuetext')},
            // Board reads (the accepted evidence path, as boardSnapshot does): P, Q, the secant through them and the dashed tangent.
            observe: page => page.locator('#jgbox').evaluate(container => {
                const board = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
                const objects = Object.values(board.objects);
                const named = name => objects.find(o => o.elType === 'point' && o.name === name);
                const P = named('$$P$$'), Q = named('$$Q$$');
                const secant = objects.find(o => o.elType === 'line' && o.point1 === P && o.point2 === Q);
                // Exactly one dashed, visible, rendered line is the tangent; anything else is a board change to review.
                const dashed = objects.filter(o => o.visProp?.visible !== false && o.visProp?.dash === 2 && o.rendNode);
                if (dashed.length !== 1) throw new Error(`Expected exactly one dashed tangent, found ${dashed.length}`);
                const tangent = dashed[0];
                // The tangent is a line; two sampled values give its slope and intercept exactly.
                const at0 = tangent.Y(0), at1 = tangent.Y(1);
                const {stdform} = secant;
                return {P: {x: P.X(), y: P.Y()}, Q: {x: Q.X(), y: Q.Y()},
                    secant: {stdform: [...stdform]}, tangent: {slope: at1 - at0, intercept: at0}};
            }),
            check(sample, previous, first, spec) {
                const x0 = spec.sweep.fixed.x0;
                const h = sample.actual.input, o = sample.observed, i = sample.index;
                assert.ok(o, `Derivative frame ${i} has no board observation`);
                assert.ok(Math.abs(h) >= 0.01 - 1e-9 && h >= -2 && h <= 2, `Step ${h} entered the excluded band or left [-2, 2] at frame ${i}`);
                assert.ok(Math.abs(o.P.x - x0) < 1e-9 && Math.abs(o.P.y - squareValue(x0)) < 1e-9, `Base point x0 moved at frame ${i}`);
                assert.ok(Math.abs(o.Q.x - (x0 + h)) < 1e-9, `Q is not at x0 + h at frame ${i}`);
                assert.ok(Math.abs(o.Q.y - squareValue(o.Q.x)) < 1e-9, `Q is off the graph at frame ${i}`);
                // The secant stdform a*x + b*y + c = 0 gives slope -a/b; it must equal the difference quotient at the reported h.
                const [c, a, b] = o.secant.stdform, slope = -a / b, intercept = -c / b;
                const quotient = (squareValue(x0 + h) - squareValue(x0)) / h;
                assert.ok(Math.abs(slope - quotient) < 1e-9, `Secant slope differs from the difference quotient at frame ${i}`);
                assert.ok(Math.abs(slope * x0 + intercept - squareValue(x0)) < 1e-9, `Secant does not pass through P at frame ${i}`);
                assert.ok(Math.abs(o.tangent.slope - 2 * x0) < 1e-9, `Tangent slope differs from f'(x0) at frame ${i}`);
                assert.ok(Math.abs(o.tangent.slope - first.observed.tangent.slope) < 1e-9 && Math.abs(o.tangent.intercept - first.observed.tangent.intercept) < 1e-9,
                    `Tangent moved at frame ${i}`);
                // The tangent of f at x0 touches the graph at P: slope·x0 + intercept = f(x0).
                assert.ok(Math.abs(o.tangent.slope * x0 + o.tangent.intercept - squareValue(x0)) < 1e-9, `Tangent does not pass through P at frame ${i}`);
                // The path hash is only meaningful when the snapshot holds the function path; an empty snapshot hashes the same every frame.
                assert.ok(sample.pathCount > 0, `Function path missing from the snapshot at frame ${i}`);
                assert.equal(sample.curvePathHash, first.curvePathHash, `Function or tangent path changed at frame ${i}`);
                if (i === frameCount - 1) assert.equal(sample.capture.sha256, first.capture.sha256, 'Last frame PNG differs from the recipe frame');
            },
        },
        // Budget order: the moving board text (difference quotient) is retained concept text under the recipe's
        // annotation policy and point names are already hidden, so no label is removed; the 0.05 end of the path is the
        // specified amplitude, so it is kept. Measured on the same frames: CRF 10 gave 382591 bytes (over 300 KiB),
        // CRF 22 gave 250909, CRF 28 gave 199124 (limit 307200). CRF 22 is the highest quality under the ceiling.
        crf: 22,
        encoderBudget: 'CRF 22 instead of CRF 10: CRF 10 gave 382591 bytes, over the 300 KiB ceiling; the moving quotient text is retained concept text and the 0.05 amplitude is specified, so only the encoder setting changed (CRF 22: 250909 bytes)',
        schedule: {kind: 'piecewise-sin2', waypoints: [1, 0.05, 1], phase: 'clamp((frame-12)/71)',
            zeroDisplacementFrames: '0-12 and 83-95 (h holds at the recipe value 1)', movingFrames: '13-82',
            legs: 'two equal phase halves, each eased by (1 - cos πx)/2 from one waypoint to the next (0.05 at the middle of the move)', step: 0.01,
            input: 'keyboard ArrowLeft/ArrowRight on the "Korak h" range, incremental from the previous frame; P and the function are never touched',
            window: 'recipe coordinate window [-0.4, 5, 2.5, -1]'},
        invariants: ['x0 and the function unchanged: base point P stays at (1, f(1)) and the function/tangent path hash is identical in every frame',
            'Q = x0 + h lies on the graph (1e-9)', 'Secant slope equals the difference quotient (f(x0+h) - f(x0)) / h at the reported h (1e-9)',
            'Tangent fixed: same line every frame with slope f\'(x0) (1e-9)', 'Step stays inside [-2, 2] with |h| >= 0.01',
            'Input value and aria-valuetext equal the snapped target every frame', 'First and last frames equal the recipe state (identical PNG)'],
    },
    farin: {
        mode: 'pointer-drag', controlCount: 4, presentEachFrame: false,
        // The full settle() re-typesets MathJax on every frame; with the moving weight labels that crashed the renderer
        // at about frame 31. Two animation frames are enough here: the labels are plain board text updated by JSXGraph.
        settle: page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
        pressSettle: page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
        // The glider of edge p1-p2 (the interior control edge) starts at v = 1/3 (ratio 1/2, weights [1, 2, 1, 1]) and moves to v = 0.7 (0.8 was 328205 bytes at CRF 10, over the 300 KiB ceiling; 0.75 kept the curve on the w2 label at its peak, see encoderBudget).
        // JSXGraph slider snapWidth is -1 (no snapping), so the glider follows the pointer continuously. The tolerance (1e-6 of the
        // edge parameter) only covers round-off in the board-to-screen-to-board mapping of the pointer. Measured glider error is
        // about 1.6e-7, so 1e-6 leaves only a 6x margin; keep it, and tighten only after re-measuring on a new capture.
        glider: {edge: 1, target: 0.7, tolerance: 1e-6},
        crf: 14,
        encoderBudget: 'amplitude 0.7 instead of 0.8 and CRF 14 instead of CRF 10: at 0.8 and CRF 10 the clip was 328205 bytes, at 0.75 and CRF 10 321279 bytes (both over 300 KiB), and at 0.75 and CRF 20 210184 bytes; 0.7 (CRF 14) gave 259057 bytes; 0.7 also keeps the curve off the w2 weight label at its peak (0.75 did not); all weight text and labels kept',
        observe: page => page.locator('#jgbox').evaluate((container, ts) => {
            const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
            const objects = Object.values(b.objects);
            // Sorted by edge position (p1 along the polygon), not board insertion order, so index j is control edge j.
            // check() verifies each slider's p1/p2 against controls[j], controls[j+1], so a wrong order fails there.
            const sliders = objects.filter(o => o.elType === 'slider')
                .map(s => ({v: s.Value(), p1: {x: s.point1.X(), y: s.point1.Y()}, p2: {x: s.point2.X(), y: s.point2.Y()}}))
                .sort((a, b) => a.p1.x - b.p1.x || a.p1.y - b.p1.y);
            const weights = [];
            objects.filter(o => o.elType === 'text' && /^\$\$w_\{\d\}=/.test(o.plaintext || '')).forEach(o => {
                weights[Number(/w_\{(\d)\}/.exec(o.plaintext)[1])] = o.plaintext;
            });
            const curve = objects.find(o => o.elType === 'curve');
            return {sliders, weights, curve: ts.map(t => ({x: curve.X(t), y: curve.Y(t)}))};
        }, farinParameterTs),
        start: ctx => farinPoint(ctx.observed.sliders[1], ctx.observed.sliders[1].v),
        path: (moved, displacement, ctx) => {
            const slider = ctx.observed.sliders[1];
            return farinPoint(slider, farinValue(slider.v, displacement));
        },
        scheduled: (ctx, displacement) => ({v: farinValue(ctx.observed.sliders[1].v, displacement)}),
        // Restore: Farin points off (weights become plain numbers), weight number fields w1..w3 set to the recipe's exact 2, 1, 1,
        // then Farin points on again, which rebuilds the three gliders from those weights. The field does not commit a typed value
        // that equals its rounded display (w2 released at 1.0042 shows "1,00"), so each weight first takes a different value.
        restore: async page => {
            const setWeight = async value => {
                await applyAction(page,{kind:'number',label:'Vrednost uteži',value:value+4});
                await applyAction(page,{kind:'number',label:'Vrednost uteži',value});
            };
            await applyAction(page,{kind:'toggle',label:'Farinove Točke',value:false});
            await applyAction(page,{kind:'button',label:'Krivulja1'});
            await setWeight(2);
            await applyAction(page,{kind:'button',label:'Naslednja utež'});
            await setWeight(1);
            await applyAction(page,{kind:'button',label:'Naslednja utež'});
            await setWeight(1);
            await applyAction(page,{kind:'button',label:'Prejšnja utež'});
            await applyAction(page,{kind:'button',label:'Prejšnja utež'});
            await applyAction(page,{kind:'button',label:'Prekliči izbiro'});
            await applyAction(page,{kind:'toggle',label:'Farinove Točke',value:true});
        },
        check(sample, previous, first, spec) {
            const i = sample.index, edge = spec.glider.edge, {tolerance} = spec.glider;
            const v0 = first.observed.sliders[edge].v, scheduledV = farinValue(v0, sin2OutAndBack(i));
            assert.ok(Math.abs(sample.scheduled.v - scheduledV) < 1e-12, `Scheduled glider differs from the sin² schedule at frame ${i}`);
            const originals = first.points.filter(p => p.draggable);
            const controls = originals.map(o => sample.points.find(p => p.id === o.id));
            assert.equal(sample.points.filter(p => p.draggable).length, spec.controlCount, `Wrong control point count at frame ${i}`);
            originals.forEach((o, k) => assert.ok(Math.abs(controls[k].x - o.x) < 1e-9 && Math.abs(controls[k].y - o.y) < 1e-9, `Control point moved at frame ${i}`));
            sample.observed.sliders.forEach((slider, j) => {
                const fixed = first.observed.sliders[j];
                // The glider stays attached to its own control edge.
                assert.ok(['p1', 'p2'].every(key => Math.abs(slider[key].x - controls[j + (key === 'p2' ? 1 : 0)].x) < 1e-9 && Math.abs(slider[key].y - controls[j + (key === 'p2' ? 1 : 0)].y) < 1e-9),
                    `Glider ${j} detached from its control edge at frame ${i}`);
                if (j === edge) assert.ok(Math.abs(slider.v - scheduledV) < tolerance, `Glider off its scheduled ratio at frame ${i}: observed ${slider.v}, scheduled ${scheduledV}`);
                else assert.ok(Math.abs(slider.v - fixed.v) < 1e-9, `Non-dragged ratio changed at frame ${i}`);
            });
            const effective = farinEffectiveWeights(sample.observed.sliders.map(s => s.v));
            effective.forEach((w, k) => assert.equal(sample.observed.weights[k], farinWeightText(k, w), `Weight text differs from the effective weight at frame ${i}`));
            assert.equal(sample.observed.weights.length, 4, `Wrong weight label count at frame ${i}`);
            const controlPoints = controls.map(({x, y}) => ({x, y}));
            farinParameterTs.forEach((t, k) => {
                const expected = rationalPoint(controlPoints, effective, t), actual = sample.observed.curve[k];
                assert.ok(Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.y - expected.y) < 1e-9, `Curve differs from the rational evaluation at frame ${i}`);
            });
            if (previous) {
                if (previous.scheduled.v !== sample.scheduled.v) assert.notEqual(sample.curvePathHash, previous.curvePathHash, `Curve path did not change while the glider moved at frame ${i}`);
                else assert.equal(sample.curvePathHash, previous.curvePathHash, `Curve path changed while the glider held at frame ${i}`);
            }
            if (i === frameCount - 1) {
                // The SVG path string keeps float round-off from the restored glider values, so the seam compares the curve samples.
                sample.observed.curve.forEach((p, k) => assert.ok(Math.abs(p.x - first.observed.curve[k].x) < 1e-9 && Math.abs(p.y - first.observed.curve[k].y) < 1e-9,
                    'Non-seamless loop: last curve differs from the recipe state'));
                assert.equal(sample.capture.sha256, first.capture.sha256, 'Non-seamless loop: last PNG differs from the recipe frame');
            }
        },
        schedule: {kind: 'sin2-out-and-back', phase: 'clamp((frame-12)/71)', displacement: 'sin²(π·phase)',
            zeroDisplacementFrames: '0-12 and 83-95', movingFrames: '13-82', press: 13, release: 83,
            target: 'glider of edge p1-p2: v = 1/3 -> 0.7 -> 1/3 (ratio 1/2 -> 7/3 -> 1/2)',
            input: 'pointer press on the glider at its start position, moved in board coordinates mapped to screen every frame, released',
            restore: 'Farin points off; weight number fields w1, w2, w3 set to exact 2, 1, 1; Farin points on (exact rebuild of the gliders)'},
        invariants: ['Control points unchanged (1e-9)', 'Glider stays on its control edge and at the scheduled ratio (tolerance 1e-6 in edge parameter)',
            'Only the dragged edge ratio changes; the other two ratios stay unchanged (1e-9)',
            'Each weight label equals the effective weight derived from the glider values, formatted to two decimals (exact string)',
            'Curve equals the pure rational Bézier evaluation from control points and effective weights (1e-9) at five parameters',
            'Curve path changes whenever the glider moves and is unchanged while it holds; the last frame path and PNG equal the recipe frame',
            'First and last frames equal the recipe state'],
    },
    'weighted-parameterization': {
        mode: 'parameter-sweep', controlCount: 4,
        control: {label: 'Parameter α', kind: 'range'},
        sweep: {
            // Recipe α = 0.25 (scripts/demonstration-preview-recipes.cjs) to 0.75 and back: one full cycle.
            waypoints: [0.25, 0.75, 0.25], step: 0.01, start: 0.25,
            markerCount: 10,
            readout: {text: slovenianDecimal,
                read: ({range}) => range.getAttribute('aria-valuetext')},
            check(sample, previous, first, spec) {
                const i = sample.index;
                // The reported α is read from the slider's own readout (aria-valuetext, Slovenian decimal comma), not from the schedule.
                const reported = Number(sample.actual.readout.replace(',', '.'));
                assert.ok(Number.isFinite(reported) && Math.abs(reported - sample.actual.input) < 1e-9, `Reported α differs from the input at frame ${i}`);
                // The curve path is the same Bézier in every frame; it must be present, or an empty snapshot would hash the same.
                assert.ok(sample.pathCount > 0, `Curve path missing from the snapshot at frame ${i}`);
                assert.equal(sample.curvePathHash, first.curvePathHash, `Curve path changed at frame ${i}`);
                // Markers are the non-draggable board points; each equals B(φ_α(t_k)) at the reported α, t_k = k/(count+1).
                const markers = sample.points.filter(p => !p.draggable).map(({x, y}) => ({x, y}));
                const expected = weightedParameterizationMarkers(sample.controls.map(({x, y}) => ({x, y})), reported, spec.sweep.markerCount);
                assertPointSet(markers, expected, `Parameter marker differs from B(φ_α(t_k)) at frame ${i}`);
                if (i === frameCount - 1) assert.equal(sample.capture.sha256, first.capture.sha256, 'Non-seamless loop: last PNG differs from the recipe frame');
            },
        },
        // Budget order not needed: the default encoder setting already fits. Measured on the poster-fit camera: CRF 10 gave 167065 bytes,
        // CRF 14 143262, CRF 18 124545, CRF 22 110983 (limit 307200). No label is removed and the full 0-1 range of the sweep is kept.
        crf: 10,
        encoderBudget: 'CRF 10 (the encoder default): 167065 bytes, under the 300 KiB ceiling, so no label, amplitude or encoder reduction was needed; full 0.25-0.75 cycle kept',
        schedule: {kind: 'piecewise-sin2', waypoints: [0.25, 0.75, 0.25], phase: 'clamp((frame-12)/71)',
            zeroDisplacementFrames: '0-12 and 83-95 (α holds at the recipe value 0.25)', movingFrames: '13-82',
            legs: 'two equal phase halves, each eased by (1 - cos πx)/2 from one waypoint to the next (0.75 at the middle of the move)', step: 0.01,
            input: 'keyboard ArrowRight/ArrowLeft on the "Parameter α" range, incremental from the previous frame',
            window: 'none: finite-geometry poster fit, fixed for every frame'},
        invariants: ['Curve path hash identical in every frame (the snapshot holds the curve path)', 'Control points unchanged (1e-9)',
            'Each of the 10 parameter markers equals B(φ_α(t_k)) at the reported α, t_k = k/11 (1e-9)',
            'Reported α (aria-valuetext) equals the input and the snapped target every frame', 'Only α changes; the camera is the poster fit in every frame',
            'First and last frames equal the recipe state (identical PNG)'],
    },
    accumulation: {
        mode: 'pointer-drag', controlCount: 2,
        // Re-presented every frame: presentBoard sets the curve stroke inline once, and JSXGraph updates (the signed-area fill has a 1px stroke function) drop it; re-presenting keeps every frame at the poster stroke widths.
        settle: page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
        pressSettle: page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
        // Recipe state: a = 0, x = 2 (model default). x moves out and back by 2.5 with the shared sin² profile: its peak is x = 4.5,
        // inside the recipe window (x from -0.5 to 6.5) and [-7, 7], so no smaller amplitude was needed.
        startX: accumulationStartX, amplitude: accumulationAmplitude,
        start: ctx => ctx.points.find(p => p.name === '$$x$$'),
        path: (moved, displacement) => ({x: moved.x + accumulationAmplitude * displacement, y: moved.y}),
        // Exact restore after release through the "Točka x" number field (the drag already ends on the grid point 2).
        restore: async page => {
            await applyAction(page,{kind:'number',label:'Točka x',value:accumulationStartX});
        },
        // Board text (A(x) caption), the function graph f and the signed-area fill paths. Paths are reduced here so the manifest stays small.
        // JSXGraph draws function graphs more coarsely while a pointer is held (measured: 257 vertices during the drag, 1025 at rest), so the
        // f path is checked geometrically in every frame (each rendered vertex lies on y = sin x, same x extent) and by exact path hash at rest.
        observe: async page => {
            const raw = await page.locator('#jgbox').evaluate(container => {
                const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
                const visible = Object.values(b.objects).filter(o => o.visProp?.visible !== false && o.rendNode);
                const curves = visible.filter(o => o.elType === 'curve');
                // Filled curves are the signed-area stretches (the only curves with their own updateDataArray; every function graph has fillopacity 1 by default, so opacity cannot tell them apart); the function graph is the unfilled curve through (1, sin 1).
                const filled = o => Object.prototype.hasOwnProperty.call(o, 'updateDataArray');
                const fn = curves.find(o => !filled(o) && Math.abs(o.Y(1) - Math.sin(1)) < 1e-9);
                const d = fn ? fn.rendNode.getAttribute('d') || '' : '';
                const sx = b.unitX, sy = b.unitY, ox = b.origin.scrCoords[1], oy = b.origin.scrCoords[2];
                const board = [...d.matchAll(/(-?[\d.]+(?:e-?\d+)?) (-?[\d.]+(?:e-?\d+)?)/g)].map(m => [(+m[1] - ox) / sx, (oy - +m[2]) / sy]);
                return {
                    text: visible.filter(o => o.elType === 'text').map(o => o.rendNode.textContent).join('\n'),
                    functionPath: d,
                    functionVertices: board.length,
                    functionMaxDeviation: board.reduce((m, [x, y]) => Math.max(m, Math.abs(y - Math.sin(x))), 0),
                    functionMinX: board.reduce((m, [x]) => Math.min(m, x), Infinity),
                    functionMaxX: board.reduce((m, [x]) => Math.max(m, x), -Infinity),
                    regionPath: curves.filter(filled).map(o => o.rendNode.getAttribute('d') || '').join('\n'),
                };
            });
            return {text: raw.text, functionPathLength: raw.functionPath.length, functionPathHash: pathHash([raw.functionPath]),
                functionVertices: raw.functionVertices, functionMaxDeviation: raw.functionMaxDeviation,
                functionMinX: raw.functionMinX, functionMaxX: raw.functionMaxX,
                regionPathLength: raw.regionPath.length, regionPathHash: pathHash([raw.regionPath])};
        },
        schedule: {kind: 'sin2-out-and-back', phase: 'clamp((frame-12)/71)', displacement: 'sin²(π·phase)', target: 'x = 2 + 2.5·displacement, y = 0',
            snapping: 'drag rounds x to 0.01 and clamps to [-7, 7] (slidingPoint, cleanNumber); the check uses the same rule on the scheduled target',
            zeroDisplacementFrames: '0-12 (x holds at 2)', settledFrames: '83-95 (x holds at 2)', movingFrames: '13-82', peakFrame: 47, press: 13, release: 83,
            restore: 'number field "Točka x" = 2 after release (exact)',
            input: 'pointer drag of the x point along the axis (y = 0), one press and one release; a and f are never touched'},
        // The tangent to A crosses the upper-left corner at frame 31 (the corner is not background there), so the background sample is (40,40), which is background in all 96 source frames (checked on the frames).
        backgroundSample: {x: 40, y: 40},
        // The negative signed-area fill appears once x passes π, so strokes are compared per element (assertStrokesUnchanged).
        newStrokesAllowed: true,
        crf: 25,
        encoderBudget: 'CRF 25: 301595 B on the 96 source frames, the lowest CRF under the 307200 B ceiling (CRF 24 317061, CRF 23 324339, CRF 22 332143, CRF 18 370680, CRF 14 419425); no label, amplitude or camera change was made (point names are hidden by the existing capture policy, the caption is the only text)',
        invariants: ['a unchanged (1e-9)', 'x equals the 0.01-grid-snapped scheduled target (1e-9) and stays on the axis',
            'A(x) caption equals the composite-Simpson integral of sin from a to the reported x, formatted to the 4-decimal display (sl); the caption lies outside the recipe camera, as in the poster',
            'Visible A(x) point equals (x, cos a − cos x) and the f(x) point equals (x, sin x) (1e-9)',
            'Function graph of f present in every frame: every rendered vertex on y = sin x (1e-9) with the recipe x extent, and the path hash equal to the recipe at rest (frames 0 and 83-95)', 'Signed-area region path changes in every frame where x changes',
            'Final x equals the starting 2 exactly (restore through the number field); final PNG equals the recipe PNG'],
        check(sample, previous, first, spec) {
            const i = sample.index;
            const named = (s, name) => {
                const p = s.points.find(q => q.name === name);
                assert.ok(p, `Missing ${name} at frame ${s.index}`);
                return {x: p.x, y: p.y};
            };
            assert.equal(sample.points.filter(p => p.draggable).length, spec.controlCount, `Wrong operand count at frame ${i}`);
            const a = named(sample, '$$a$$'), x = named(sample, '$$x$$');
            const a0 = named(first, '$$a$$'), x0 = named(first, '$$x$$');
            assert.ok(Math.abs(a.x - a0.x) < 1e-9 && Math.abs(a.y - a0.y) < 1e-9, `a moved at frame ${i}`);
            assert.ok(Math.abs(x.y) < 1e-9, `x left the axis at frame ${i}`);
            assert.ok(Math.abs(x0.x - spec.startX) < 1e-9, `The recipe must start at x = ${spec.startX}, found ${x0.x}`);
            const expected = accumulationSnap(sample.target.x);
            assert.ok(Math.abs(x.x - expected) < 1e-9, `x ${x.x} differs from the snapped target ${expected} at frame ${i}`);
            // The caption lies outside the recipe camera, so the visible A(x) is the point on the accumulation graph:
            // (x, A(x)) with A(x) = ∫_a^x sin t dt = cos a − cos x, and the integrand point (x, sin x).
            const accumulated = named(sample, '$$A(x)$$'), integrand = named(sample, '$$f(x)$$');
            assert.ok(Math.abs(accumulated.x - x.x) < 1e-9 && Math.abs(accumulated.y - (Math.cos(a.x) - Math.cos(x.x))) < 1e-9, `A(x) point differs from cos a − cos x at frame ${i}`);
            assert.ok(Math.abs(integrand.x - x.x) < 1e-9 && Math.abs(integrand.y - Math.sin(x.x)) < 1e-9, `f(x) point differs from sin x at frame ${i}`);
            const [left, , right] = recipes.accumulation.framing.window;
            assert.ok(x.x >= left && x.x <= right, `x ${x.x} leaves the recipe window at frame ${i}`);
            assert.ok(sample.observed, `No observed board evidence at frame ${i}`);
            const line = accumulationReadoutLine(a.x, x.x);
            assert.ok(sample.observed.text.includes(line), `Readout lacks "${line}" at frame ${i}: ${JSON.stringify(sample.observed.text)}`);
            const f = sample.observed, f0 = first.observed;
            assert.ok(f.functionVertices > 0, `Function graph path missing at frame ${i}`);
            assert.ok(f.functionMaxDeviation < 1e-9, `Function graph vertex leaves y = sin x by ${f.functionMaxDeviation} at frame ${i}`);
            assert.ok(Math.abs(f.functionMinX - f0.functionMinX) < 1e-9 && Math.abs(f.functionMaxX - f0.functionMaxX) < 1e-9, `Function graph x extent changed at frame ${i}`);
            if (i === 0 || i >= spec.schedule.release) assert.equal(f.functionPathHash, f0.functionPathHash, `Function graph path (at rest) changed at frame ${i}`);
            assert.ok(sample.observed.regionPathLength > 0, `Signed-area region missing at frame ${i}`);
            if (previous && named(previous, '$$x$$').x !== x.x) {
                assert.notEqual(sample.observed.regionPathHash, previous.observed.regionPathHash, `Signed-area region did not change when x changed at frame ${i}`);
            }
            if (i === peakFrame) assert.ok(x.x - x0.x > 2, `x did not move out at the peak (frame ${i})`);
            if (i === frameCount - 1) {
                assert.ok(x.x === x0.x, `Final x ${x.x} differs from the starting x ${x0.x}`);
                assert.equal(sample.capture.sha256, first.capture.sha256, 'Non-seamless loop: last PNG differs from the recipe frame');
            }
        },
    },
    'complex-multiplication': {
        mode: 'pointer-drag', controlCount: 2, presentEachFrame: false,
        // Two animation frames around the press and each frame, as farin does: JSXGraph must process the press and the drag before the capture.
        settle: page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
        pressSettle: page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
        // Monotone ease 0 -> 1 over the move frames; the w point rides the unit circle from i (theta = pi/2) through one full turn.
        progress: i => (1 - Math.cos(Math.PI * movePhase(i))) / 2,
        // The w point (square) is the only operand that moves. Its pointer target is the exact circle point; the board's drag handler
        // rounds it to the 0.05 grid (snapComplexCoordinate in src/analysis/complex.ts), and the check uses that rounded value.
        start: ctx => ctx.points.find(p => p.name === '$$w$$'),
        path: (moved, progress) => {
            const theta = Math.PI / 2 + 2 * Math.PI * progress;
            return {x: Math.cos(theta), y: Math.sin(theta)};
        },
        // Exact restore after release through the Re w and Im w number fields (the drag already ends on the grid point i).
        restore: async page => {
            await applyAction(page,{kind:'number',label:'Re w',value:0});
            await applyAction(page,{kind:'number',label:'Im w',value:1});
        },
        // Board text: the operand, product and argument lines, read from the caption's rendered text.
        observe: page => page.locator('#jgbox').evaluate(container => {
            const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
            return {text: Object.values(b.objects).filter(o => o.elType === 'text' && o.rendNode).map(o => o.rendNode.textContent).join('\n')};
        }),
        // Recipe's coordinate window (equal units) is the camera; the whole circle, z and the product were checked to lie inside it.
        schedule: {kind: 'monotone-ease', phase: 'clamp((frame-12)/71)', progress: '(1 - cos(π·phase))/2', theta: 'π/2 + 2π·progress',
            zeroDisplacementFrames: '0-12 (w holds at i)', settledFrames: '83-95 (w holds at i)', movingFrames: '13-82', press: 13, release: 83,
            restore: 'number fields Re w = 0 and Im w = 1 after release (exact)',
            input: 'pointer drag of the w square on the board, one press and one release'},
        // Encoder: CRF 14 as in farin (see encoderBudget for the measured sizes).
        crf: 14,
        encoderBudget: 'CRF 14: 297310 B on the 96 source frames, the lowest CRF under the 307200 B ceiling (CRF 13 309149, CRF 12 324011, CRF 10 350903); no label, amplitude or camera change was made',
        invariants: ['z unchanged (1e-9)', 'w equals the 0.05-grid-rounded circle point at the scheduled theta (1e-9)',
            'Product point equals z·w from the reported z and w (1e-9)', 'Caption operand and product text equal the reported values (argument line checked when shown)',
            'Final w equals the starting i exactly (restore through the Re w and Im w fields)', 'Only w changes; the product follows w',
            'First and last source frames equal the recipe state'],
        check(sample, previous, first, spec) {
            const i = sample.index;
            const named = (s, name) => {
                const p = s.points.find(q => q.name === name);
                assert.ok(p, `Missing ${name} at frame ${s.index}`);
                return {x: p.x, y: p.y};
            };
            assert.equal(sample.points.filter(p => p.draggable).length, spec.controlCount, `Wrong operand count at frame ${i}`);
            const z = named(sample, '$$z$$'), w = named(sample, '$$w$$'), product = named(sample, '$$zw$$');
            const z0 = named(first, '$$z$$'), w0 = named(first, '$$w$$');
            assert.ok(Math.abs(z.x - z0.x) < 1e-9 && Math.abs(z.y - z0.y) < 1e-9, `z moved at frame ${i}`);
            const snap = value => Math.round(value * 20) / 20 + 0;
            const expected = {x: snap(sample.target.x), y: snap(sample.target.y)};
            assert.ok(Math.abs(w.x - expected.x) < 1e-9 && Math.abs(w.y - expected.y) < 1e-9, `w ${JSON.stringify(w)} differs from the snapped target ${JSON.stringify(expected)} at frame ${i}`);
            const zw = {x: z.x * w.x - z.y * w.y, y: z.x * w.y + z.y * w.x};
            assert.ok(Math.abs(product.x - zw.x) < 1e-9 && Math.abs(product.y - zw.y) < 1e-9, `Product ${JSON.stringify(product)} differs from z·w ${JSON.stringify(zw)} at frame ${i}`);
            if (i === peakFrame) assert.ok(Math.abs(w.x - w0.x) + Math.abs(w.y - w0.y) > 0.5, 'w did not move at the peak');
            assert.ok(sample.observed, `No caption evidence at frame ${i}`);
            const text = sample.observed.text;
            for (const line of complexCaptionLines(z, w, product)) assert.ok(text.includes(line), `Caption lacks "${line}" at frame ${i}: ${JSON.stringify(text)}`);
            // The argument line is hidden below COMPACT_BOARD_WIDTH (existing policy); when shown, its angles must match the reported values.
            if (text.includes('arg:')) for (const angle of complexArgumentLines(z, w, product)) assert.ok(text.includes(angle), `Argument text lacks ${angle} at frame ${i}`);
            if (i === frameCount - 1) {
                assert.ok(w0.x === 0 && w0.y === 1, 'The starting w must be i');
                assert.ok(w.x === w0.x && w.y === w0.y, `Final w ${JSON.stringify(w)} differs from the starting i`);
            }
            if (i === frameCount - 1) assert.equal(sample.capture.sha256, first.capture.sha256, 'Non-seamless loop: last PNG differs from the recipe frame');
        },
    },
};

function assertPointSet(actual, expected, message) {
    assert.equal(actual.length, expected.length, `${message} (count)`);
    const used = new Set();
    for (const e of expected) {
        const index = actual.findIndex((p, j) => !used.has(j) && Math.abs(p.x - e.x) < 1e-9 && Math.abs(p.y - e.y) < 1e-9);
        assert.ok(index >= 0, `${message}: ${JSON.stringify(e)}`);
        used.add(index);
    }
}

/** Generic per-frame checks shared by the capture loop and the offline evidence check. Route invariants live in spec.sweep.check. */
function assertSweepFrame(sample, previous, first, spec) {
    const scheduled = sweepValue(sample.index, spec);
    assert.equal(sample.scheduled, scheduled, `Scheduled target differs from the recorded schedule at frame ${sample.index}`);
    assert.ok(Math.abs(sample.actual.input - scheduled) < 1e-9, `Input value differs from target at frame ${sample.index}`);
    assert.equal(sample.actual.readout, spec.sweep.readout.text(scheduled), `Graph readout differs from target at frame ${sample.index}`);
    assert.equal(sample.controls.length, spec.controlCount, 'Wrong control point count');
    first.controls.forEach((p, j) => {
        assert.equal(sample.controls[j].id, p.id, `Control point identity changed at frame ${sample.index}`);
        assert.ok(Math.abs(sample.controls[j].x - p.x) < 1e-9 && Math.abs(sample.controls[j].y - p.y) < 1e-9, `Fixed control point moved at frame ${sample.index}`);
    });
    spec.sweep.check(sample, previous, first, spec);
}

function assertSweepEvidence(motion, spec) {
    assert.equal(motion.samples.length, frameCount, 'Sweep needs one sample per frame');
    const first = motion.samples[0], last = motion.samples[frameCount - 1];
    assert.equal(first.scheduled, spec.sweep.start, 'Sweep must start at the recipe value');
    let previous = null;
    motion.samples.forEach((sample, i) => {
        assert.equal(sample.index, i);assert.equal(sample.time, i / sampleRate);
        assertSweepFrame(sample, previous, first, spec);
        previous = sample;
    });
    assert.equal(last.scheduled, first.scheduled, 'Sweep must end at the recipe parameter');
    assert.equal(last.curvePathHash, first.curvePathHash, 'Last frame path must equal the recipe state');
    assert.equal(last.actual.readout, first.actual.readout, 'Last readout must equal the recipe state');
    last.points.forEach((p, j) => {
        assert.ok(Math.abs(p.x - first.points[j].x) < 1e-9 && Math.abs(p.y - first.points[j].y) < 1e-9, 'Non-seamless loop: last frame differs from first');
    });
}

/** Observed pointer drags (per-frame board observations): the spec's own per-frame check, run offline over the saved samples. */
function assertDragEvidence(motion, spec) {
    assert.equal(motion.samples.length, frameCount, 'Pointer drag needs one sample per frame');
    const first = motion.samples[0];
    let previous = null;
    motion.samples.forEach((sample, i) => {
        assert.equal(sample.index, i); assert.equal(sample.time, i / sampleRate);
        spec.check(sample, previous, first, spec);
        previous = sample;
    });
}

function assertMotionEvidence(motion) {
    assert.ok(Array.isArray(motion.samples));
    assert.equal(motion.frameCount,frameCount);assert.equal(motion.sampleRate,sampleRate);
    assert.equal(motion.duration,4);
    if(motion.mode==='parameter-sweep') {
        const spec=motionSpecs[motion.id];
        assert.ok(spec && spec.mode==='parameter-sweep','Parameter sweep evidence needs a sweep configuration');
        assertSweepEvidence(motion,spec);
        return;
    }
    if(motion.mode==='pointer-drag' && motionSpecs[motion.id]) {
        assertDragEvidence(motion,motionSpecs[motion.id]);
        return;
    }
    if(['repeated-subdivision','bisection'].includes(motion.id)) {
        assert.equal(motion.samples.length,3);
        motion.samples.forEach((sample,i)=>{
            assert.equal(sample.checkpoint,motion.id==='bisection'?i+1:i);
            assert.equal(sample.firstFrame,i*32);assert.equal(sample.holdFrames,32);
            assert.deepEqual(sample.state.box,motion.camera);
            if(motion.id==='bisection')assert.equal(sample.state.readouts.step,String(i+1));
            else assert.equal(sample.state.curves,2**i);
        });
    } else if(motion.id==='affine') {
        assert.equal(motion.samples.length,affineSteps.length);
        const original=motion.samples[0].state.points;
        assert.equal(original.length,4);
        const center=original.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4}),{x:0,y:0});
        let firstFrame=0;
        motion.samples.forEach((sample,i)=>{
            assert.equal(sample.checkpoint,affineSteps[i]);assert.equal(sample.firstFrame,firstFrame);assert.equal(sample.holdFrames,affineHolds[i]);firstFrame+=sample.holdFrames;
            assert.deepEqual(sample.state.box,motion.camera);assert.equal(sample.state.points.length,4);
            const theta=affineSteps[i]*Math.PI/10;
            original.forEach((p,j)=>{
                near(sample.state.points[j].x,center.x+(p.x-center.x)*Math.cos(theta)-(p.y-center.y)*Math.sin(theta),'Incorrect supported affine rotation');
                near(sample.state.points[j].y,center.y+(p.x-center.x)*Math.sin(theta)+(p.y-center.y)*Math.cos(theta),'Incorrect supported affine rotation');
            });
        });
        assert.notDeepEqual(motion.samples[0].state.paths,motion.samples[3].state.paths);
    } else {
        assert.ok(['elevation','rational-elevation'].includes(motion.id));
        assert.equal(motion.samples.length,3);
        motion.samples.forEach((sample,i)=>{
            assert.equal(sample.checkpoint,[0,1,0][i]);assert.equal(sample.firstFrame,[0,24,72][i]);assert.equal(sample.holdFrames,[24,48,24][i]);
            assert.deepEqual(sample.state.box,motion.camera);
        });
        assertRepresentation(motion.samples[0].state,motion.samples[1].state,motion.id==='rational-elevation');
        assert.deepEqual(motion.samples[0].state.points.map(({x,y})=>({x,y})),motion.samples[2].state.points.map(({x,y})=>({x,y})));
    }
}

function assertRepresentation(original, elevated, rational) {
    assert.equal(original.points.length,4);assert.equal(elevated.points.length,5);
    const weights=rational?[1,2,1,1]:[1,1,1,1];
    for(let i=0;i<=4;i++) {
        const left=original.points[Math.max(0,i-1)],right=original.points[Math.min(3,i)];
        const a=i===0?0:i/4*weights[i-1],b=i===4?0:(1-i/4)*weights[i];
        for(const key of ['x','y'])near(elevated.points[i][key],(a*left[key]+b*right[key])/(a+b),'Elevation must use the exact homogeneous control-point formula');
    }
    assert.equal(original.curveSamples.length,1);assert.equal(elevated.curveSamples.length,1);
    original.curveSamples[0].forEach((p,i)=>p.forEach((coordinate,j)=>near(elevated.curveSamples[0][i][j],coordinate,'Elevation must preserve the underlying curve')));
}

async function boardSnapshot(page) {
    return page.locator('#jgbox').evaluate(container => {
        const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
        const visible = Object.values(b.objects).filter(o => o.visProp?.visible !== false && o.visProp?.visible !== 'false' && o.rendNode && getComputedStyle(o.rendNode).visibility !== 'hidden' && getComputedStyle(o.rendNode).display !== 'none');
        return {box: b.getBoundingBox(), scale: [b.unitX, b.unitY], curves: visible.filter(o => o.elType === 'curve').length,
            points: visible.filter(o => o.elType === 'point').map(o => ({id: o.id, name: o.name, x: o.X(), y: o.Y(), fixed: o.visProp.fixed, draggable: o.isDraggable === true})),
            paths: visible.filter(o => o.elType === 'curve').map(o => o.rendNode.getAttribute('d')),
            curveSamples: visible.filter(o => o.elType === 'curve').map(o => Array.from({length:21},(_,i)=>[o.X(i/20),o.Y(i/20)])),
            strokeWidths: visible.filter(o => ['curve','line'].includes(o.elType)).map(o => getComputedStyle(o.rendNode).strokeWidth),
            strokesById: visible.filter(o => ['curve','line'].includes(o.elType)).map(o => [o.id, getComputedStyle(o.rendNode).strokeWidth]),
            readouts: Object.fromEntries([...document.querySelectorAll('[data-readout]')].map(e => [e.dataset.readout, e.querySelector('dd')?.textContent]))};
    });
}

async function screenshotBoard(page, file) {
    const clip = await page.locator('#jgbox').evaluate(e => {const r = e.getBoundingClientRect(); return {x:r.left,y:r.top,width:e.clientWidth,height:e.clientHeight};});
    await page.screenshot({path: file, clip, animations:'disabled', caret:'hide', scale:'device'});
    return {file:path.basename(file), sha256:digest(file), width: clip.width * 2, height:clip.height * 2};
}

async function openRoute(browser, demonstration, baseUrl) {
    const context = await browser.newContext({viewport:{width:1440,height:850},deviceScaleFactor:2,locale:'sl-SI',colorScheme:'light',reducedMotion:'reduce',timezoneId:'Europe/Ljubljana'});
    await context.addInitScript(() => {localStorage.clear(); sessionStorage.clear();});
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(baseUrl + demonstration.path.slice('/bezeg-2.0'.length));
    await page.waitForFunction(() => document.querySelector('#jgbox svg') && window.JXG && Object.values(window.JXG.boards).some(b => b.container === 'jgbox' && Object.values(b.objects).some(o => o.elType === 'curve')));
    await settle(page);
    return {page,context};
}

function encode(framesDirectory, output, fps = 24, crf = 10, sample = {x: 0, y: 0}) {
    const ffmpeg = process.env.PREVIEW_FFMPEG || 'ffmpeg';
    const ffprobe = process.env.PREVIEW_FFPROBE || 'ffprobe';
    const inputPattern = path.join(framesDirectory,'%03d.png');
    const settings = ['-y','-loglevel','error','-framerate',String(fps),'-i',inputPattern,'-an','-c:v','libvpx-vp9','-crf',String(crf),'-b:v','0','-pix_fmt','gbrp','-colorspace','rgb','-color_primaries','bt709','-color_trc','iec61966-2-1','-color_range','pc','-row-mt','1',output];
    execFileSync(ffmpeg,settings,{timeout:120000});
    const probe = JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
    const video = probe.streams.find(s => s.codec_type === 'video');
    assert.equal(video.width,720); assert.equal(video.height,440);
    assert.equal(video.pix_fmt,'gbrp','Preserve RGB channels in VP9');
    assert.equal(video.color_range,'pc');
    assert.equal(video.color_space,'gbr');
    assert.equal(video.color_primaries,'bt709');
    assert.equal(video.color_transfer,'iec61966-2-1');
    assert.equal(probe.streams.length,1,'Motion must be silent');
    const duration = Number(probe.format.duration);
    assert.ok(duration >= 2 && duration <= 4);
    const bytes = fs.statSync(output).size;
    assert.ok(bytes <= 300*1024,`Motion over 300KiB: ${bytes}`);
    // Decode one real background pixel from every input and output frame. This runs at
    // the encoder seam so metadata alone cannot make a color-fidelity regression pass.
    const crop = `crop=1:1:${sample.x}:${sample.y}`;
    const sourcePixels = execFileSync(ffmpeg,['-v','error','-framerate',String(fps),'-i',inputPattern,'-vf',crop,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{timeout:120000});
    const decodedPixels = execFileSync(ffmpeg,['-v','error','-i',output,'-vf',crop,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{timeout:120000});
    assert.equal(sourcePixels.length,frameCount*3,'Expected one source background pixel for every frame');
    assert.equal(decodedPixels.length,sourcePixels.length,'Decoded background sample count changed');
    for(let i=0;i<sourcePixels.length;i+=3) {
        assert.deepEqual([...decodedPixels.subarray(i,i+3)],backgroundPixel,`Decoded background changed at frame ${i/3}`);
        assert.deepEqual([...sourcePixels.subarray(i,i+3)],backgroundPixel,`Source background changed at frame ${i/3}`);
    }
    return {file:path.basename(output),sha256:digest(output),type:'video/webm',duration,bytes,width:video.width,height:video.height,codec:video.codec_name,
        pixelFormat:video.pix_fmt,colorRange:video.color_range,colorSpace:video.color_space,colorPrimaries:video.color_primaries,colorTransfer:video.color_transfer,
        backgroundPixel:{rgb:backgroundPixel,checked:sample.x===0&&sample.y===0?'upper-left pixel of every source and decoded frame':`pixel (${sample.x},${sample.y}) of every source and decoded frame`,...(sample.x||sample.y?{x:sample.x,y:sample.y}:{})},
        encoder:execFileSync(ffmpeg,['-version'],{encoding:'utf8'}).split(/\r?\n/)[0], arguments:settings};
}

async function captureHold(page,d,window,presentBoard,directory,firstFrame,holdFrames) {
    const scene=await presentBoard(page.locator('#jgbox'),d,recipes[d.id],{window});
    const state=await boardSnapshot(page);
    assert.ok(Math.abs(state.scale[0]-state.scale[1])<1e-8 || d.id==='bisection','Geometric motion must preserve equal unit scales');
    const captured=await screenshotBoard(page,path.join(directory,String(firstFrame).padStart(3,'0')+'.png'));
    for(let hold=1;hold<holdFrames;hold++)fs.copyFileSync(path.join(directory,captured.file),path.join(directory,String(firstFrame+hold).padStart(3,'0')+'.png'));
    return {firstFrame,holdFrames,capture:captured,state,camera:scene.boundingBox};
}

/**
 * Stroke widths by element: every curve or line visible at the start must keep its width, and none may disappear. Elements that become
 * visible during the drag (the accumulation's negative fill appears once x passes pi) are new geometry, not compounding, so they are not compared.
 */
function assertStrokesUnchanged(state, initial) {
    const now = new Map(state.strokesById);
    for (const [id, width] of initial.strokesById) {
        assert.ok(now.has(id), 'A curve or line visible at the start left the board during the drag');
        assert.equal(now.get(id), width, 'Capture presentation compounded stroke widths');
    }
}

/**
 * Pointer drag: press the handle once, follow the scheduled path mapped to screen every frame, release, then restore the
 * start state through the spec's exact input. Per-frame checks are the spec's own check(), the same one run offline.
 */
async function captureDrag(browser, d, spec, directory, baseUrl, presentBoard) {
    const recipe=recipes[d.id];
    // A coordinate-window recipe keeps its window. A finite-geometry recipe keeps the poster fit, applied once (no per-frame refit).
    const presentation=recipe.framing.kind==='coordinate-window'?{window:recipe.framing.window}:{};
    const sampleEvidence=[];
    const {page,context}=await openRoute(browser,d,baseUrl);
    try {
        await applyRecipe(page,recipe);
        await presentBoard(page.locator('#jgbox'),d,recipe,presentation);
        const initial=await boardSnapshot(page); const fixedBox=initial.box;
        const points=initial.points.filter(p=>p.draggable);
        assert.equal(points.length,spec.controlCount,`Expected the original ${spec.controlCount} draggable control points`);
        const ctx={initial,points,observed:spec.observe?await spec.observe(page):undefined};
        const moved=spec.start(ctx);
        const screen=async(x,y)=>page.locator('#jgbox').evaluate((e,{x,y})=>{const b=Object.values(window.JXG.boards).find(b=>b.container==='jgbox');const r=e.getBoundingClientRect();return {x:r.left+b.origin.scrCoords[1]+b.unitX*x,y:r.top+b.origin.scrCoords[2]-b.unitY*y};},{x,y});
        const start=await screen(moved.x,moved.y);
        let first=null,previous=null;
        for(let i=0;i<frameCount;i++) {
            const phase=movePhase(i);const displacement=spec.progress?spec.progress(i):sin2OutAndBack(i);
            const target=spec.path(moved,displacement,ctx);
            // pressSettle (farin only): let JSXGraph process the hover and the press before the first drag move, or the glider can lag one frame.
            if(i===spec.schedule.press){await page.mouse.move(start.x,start.y);if(spec.pressSettle)await spec.pressSettle(page);await page.mouse.down();if(spec.pressSettle)await spec.pressSettle(page);}
            if(i>spec.schedule.press-1 && i<spec.schedule.release){const at=await screen(target.x,target.y);await page.mouse.move(at.x,at.y);}
            if(i===spec.schedule.release){await page.mouse.up();await spec.restore(page,ctx);}
            await (spec.settle||settle)(page);
            if(process.env.PREVIEW_SAMPLE_DELAY_MS)await page.waitForTimeout(Number(process.env.PREVIEW_SAMPLE_DELAY_MS));
            if(spec.presentEachFrame!==false)await presentBoard(page.locator('#jgbox'),d,recipe,presentation);
            const state=await boardSnapshot(page);
            assert.deepEqual(state.box,fixedBox,'Camera changed during the drag');
            if(spec.newStrokesAllowed)assertStrokesUnchanged(state,initial);else assert.deepEqual(state.strokeWidths,initial.strokeWidths,'Capture presentation compounded stroke widths');
            const observed=spec.observe?await spec.observe(page):undefined;
            const captured=await screenshotBoard(page,path.join(directory,String(i).padStart(3,'0')+'.png'));
            const sample={index:i,time:i/24,phase,target,scheduled:spec.scheduled?spec.scheduled(ctx,displacement):target,
                ...(observed?{}:{actual:{id:moved.id,...(({x,y})=>({x,y}))(state.points.find(p=>p.id===moved.id))},
                    fixed:state.points.filter(p=>p.id!==moved.id&&points.some(q=>q.id===p.id)).map(({id,x,y})=>({id,x,y}))}),
                ...(observed?{observed}:{}),
                capture:captured,points:state.points,strokeWidths:state.strokeWidths,curvePathHash:pathHash(state.paths)};
            first??=sample;
            spec.check(sample,previous,first,spec);
            sampleEvidence.push(sample);
            previous=sample;
        }
        await page.mouse.up();
        return {camera:fixedBox,samples:sampleEvidence};
    } finally {await context.close();}
}

/** Parameter sweep: keyboard-step the range input along the schedule, asserting input, readout and construction every frame. */
async function captureSweep(browser, d, spec, directory, baseUrl, presentBoard) {
    const recipe=recipes[d.id];
    const sampleEvidence=[];
    const {page,context}=await openRoute(browser,d,baseUrl);
    try {
        await applyRecipe(page,recipe);
        // The recipe's own window (if any), else the poster's fit, is the camera for every frame. Presenting once keeps frame 0
        // identical to the poster framing; re-presenting with a different fit would change the camera, so no per-frame refit.
        const presentation=recipe.framing.kind==='coordinate-window'?{window:recipe.framing.window}:{};
        const poster=await presentBoard(page.locator('#jgbox'),d,recipe,presentation);
        const initial=await boardSnapshot(page);const fixedBox=initial.box;
        assert.deepEqual(fixedBox,poster.boundingBox,'Poster fit must be the sweep camera');
        const controls0=initial.points.filter(p=>p.draggable);
        assert.equal(controls0.length,spec.controlCount,`Expected ${spec.controlCount} draggable control points`);
        // The range is inside the animation panel behind the inspector tabs; reveal it as applyAction does.
        let control=page.getByLabel(spec.control.label,{exact:true});
        assert.equal(await control.count(),1,`Unsupported or ambiguous range control: ${spec.control.label}`);
        for(const tab of ['Prikaz','Uredi']){if(await control.isVisible())break;await page.getByRole('button',{name:tab,exact:true}).click();}
        assert.ok(await control.isVisible(),`Range control ${spec.control.label} is still hidden after revealing the inspector tabs`);
        const rangeId=await control.getAttribute('id');
        const range=page.locator(`[id=${JSON.stringify(rangeId)}]`);
        const {sweep}=spec;
        let previousValue=Number(await range.inputValue());
        assert.ok(Math.abs(previousValue-sweep.start)<1e-9 && await sweep.readout.read({page,range})===sweep.readout.text(sweep.start),'Sweep must start at the recipe value');
        let previous=null,first=null;
        for(let i=0;i<frameCount;i++) {
            const target=sweepValue(i,spec);
            const steps=Math.round((target-previousValue)/sweep.step);
            if(steps) {
                await range.focus();
                for(let k=0;k<Math.abs(steps);k++)await range.press(steps>0?'ArrowRight':'ArrowLeft');
            }
            await settle(page);
            const value=Number(await range.inputValue());
            const shown=await sweep.readout.read({page,range});
            assert.ok(Math.abs(value-target)<1e-9,`Input ${value} differs from scheduled ${target} at frame ${i}`);
            const state=await boardSnapshot(page);
            assert.deepEqual(state.box,fixedBox,'Camera changed between sweep frames');
            assert.deepEqual(state.strokeWidths,initial.strokeWidths,'Capture presentation compounded stroke widths');
            const controls=state.points.filter(p=>p.draggable);
            for(const p of state.points)assert.ok(p.x>=fixedBox[0]&&p.x<=fixedBox[2]&&p.y<=fixedBox[1]&&p.y>=fixedBox[3],`Point ${p.id} left the fixed camera at frame ${i}`);
            const observed=sweep.observe?await sweep.observe(page):undefined;
            const hash=pathHash(state.paths);
            const captured=await screenshotBoard(page,path.join(directory,String(i).padStart(3,'0')+'.png'));
            const sample={index:i,time:i/24,target,scheduled:target,
                actual:{input:value,readout:shown,steps},
                controls:controls.map(({id,x,y})=>({id,x,y})),
                fixed:controls.map(({id,x,y})=>({id,x,y})),
                capture:captured,points:state.points.map(({id,name,x,y,draggable})=>({id,name,x,y,draggable})),
                strokeWidths:state.strokeWidths,curvePathHash:hash,pathCount:state.paths.length,...(observed?{observed}:{})};
            first??=sample;
            assertSweepFrame(sample,previous,first,spec);
            sampleEvidence.push(sample);
            previous=sample;
            previousValue=value;
        }
        return {camera:fixedBox,samples:sampleEvidence};
    } finally {await context.close();}
}

async function generateMotions(browser, demonstrations, output, baseUrl, presentBoard, selectedIds=motionIds) {
    assert.ok(selectedIds.length && selectedIds.every(id=>motionIds.includes(id)) && new Set(selectedIds).size===selectedIds.length,'Unknown or duplicate motion diagnostic ID');
    const motions=[];
    for (const id of selectedIds) {
        const started=Date.now();
        const d=demonstrations.find(d=>d.id===id);
        const directory=path.join(output,'frames-'+id); fs.mkdirSync(directory,{recursive:true});
        const spec=motionSpecs[id];
        let fixedBox;
        let sampleEvidence=[];
        const record=sample=>{fixedBox ||=sample.state.box;assert.deepEqual(sample.state.box,fixedBox,'Camera changed between exact checkpoints');sampleEvidence.push(sample);};
        if (['repeated-subdivision','bisection'].includes(id)) {
            for(let checkpoint=0;checkpoint<3;checkpoint++) {
                const {page,context}=await openRoute(browser,d,baseUrl);
                try {
                    const steps=id==='bisection'?checkpoint+1:checkpoint;
                    if(steps)await applyAction(page,{kind:'button',label:id==='bisection'?'Naslednji korak':'Subdiviziraj',count:steps});
                    const sample=await captureHold(page,d,recipes[id].framing.window,presentBoard,directory,checkpoint*32,32);
                    if(id==='repeated-subdivision')assert.equal(sample.state.curves,2**steps);
                    else assert.equal(sample.state.readouts.step,String(steps));
                    record({checkpoint:steps,...sample});
                }finally{await context.close();}
            }
        } else if(id==='affine') {
            const {page,context}=await openRoute(browser,d,baseUrl);
            try {
                await applyRecipe(page,recipes[id]);
                let firstFrame=0;
                for(let i=0;i<affineSteps.length;i++) {
                    const actions=[];
                    if(i){const action={kind:'button',label:i<=3?'Rotiraj desno: 18°':'Rotiraj levo: 18°'};await applyAction(page,action);actions.push(action);}
                    record({checkpoint:affineSteps[i],actions,...await captureHold(page,d,recipes[id].framing.window,presentBoard,directory,firstFrame,affineHolds[i])});
                    firstFrame+=affineHolds[i];
                }
            }finally{await context.close();}
        } else if(['elevation','rational-elevation'].includes(id)) {
            for(let checkpoint=0;checkpoint<3;checkpoint++) {
                const {page,context}=await openRoute(browser,d,baseUrl);
                try {
                    await applyRecipe(page,recipes[id]);
                    const actions=[];
                    if(checkpoint===1) {
                        const action={kind:'button',label:id==='elevation'?'↑Dvigni stopnjo':'Dvigni stopnjo'};await applyAction(page,action);actions.push(action);
                        // Elevation replaces the control points; refresh existing weight labels with current indices.
                        if(id==='rational-elevation')for(const action of [{kind:'button',label:'Krivulja1'},{kind:'toggle',label:'Uteži',value:false},{kind:'toggle',label:'Uteži',value:true},{kind:'button',label:'Prekliči izbiro'}]){await applyAction(page,action);actions.push(action);}
                    }
                    await page.mouse.move(10,10);
                    record({checkpoint:checkpoint===1?1:0,actions,...await captureHold(page,d,recipes[id].framing.window,presentBoard,directory,[0,24,72][checkpoint],[24,48,24][checkpoint])});
                }finally{await context.close();}
            }
        } else {
            const result=spec.mode==='pointer-drag'
                ? await captureDrag(browser,d,spec,directory,baseUrl,presentBoard)
                : await captureSweep(browser,d,spec,directory,baseUrl,presentBoard);
            fixedBox=result.camera;sampleEvidence=result.samples;
        }
        const encoded=encode(directory,path.join(output,id+'.webm'),sampleRate,spec?.crf,spec?.backgroundSample);
        const mode=spec?.mode ?? (id==='affine'?'supported-rotation-steps':id.endsWith('elevation')?'exact-degree-elevation':'discrete-exact-steps');
        motions.push({id,...encoded,frameCount,sampleRate,camera:fixedBox,mode,
            ...(spec?{schedule:spec.schedule,invariants:spec.invariants,encoderBudget:spec.encoderBudget}:{}),
            samples:sampleEvidence,sourceFrameHashMeaning:'SHA-256 of lossless PNG inputs; compressed WebM frames are not claimed pixel-identical',generationSeconds:(Date.now()-started)/1000});
        assertMotionEvidence(motions.at(-1));
        console.log(`Encoded ${id}: ${encoded.bytes} bytes, ${encoded.duration}s`);
    }
    return motions;
}

module.exports={generateMotions,boardSnapshot,screenshotBoard,openRoute,encode,assertMotionEvidence,motionIds,motionSpecs,sweepValue,alphaParameterizationValue,weightedParameterizationMarkers,deCasteljauLevels,bernsteinPoint,rationalPoint,farinEffectiveWeights,farinWeightText,farinValue,farinPoint,farinParameterTs,sin2OutAndBack,movePhase,complexCaptionLines,complexText,accumulationReference,accumulationReadoutLine,accumulationSnap,formatSlNumber};
