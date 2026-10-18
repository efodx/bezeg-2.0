const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const crypto = require('node:crypto');
const {recipes, applyRecipe, applyAction, settle} = require('./demonstration-preview-recipes.cjs');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const motionIds = ['repeated-subdivision','bisection','bezier','affine','elevation','rational-elevation','decasteljau','decasteljau-alternative','derivative','farin','weighted-parameterization','complex-multiplication','accumulation','ph-cubic','ph-quintic','subdivision','spline-g1','trigonometric-functions','darboux','definite-integral'];
const frameCount = 96;
const sampleRate = 24;
const backgroundPixel = [255, 253, 245];
// Stepped clips: one fixed recipe-window camera, one hold per checkpoint, 96 frames in total. Each checkpoint is one settled route state.
// `checkpoints` are the values the evidence records (affine: supported rotation steps; darboux: n; definite-integral: n).
const steppedHolds = [18,10,10,20,10,10,18];
const steppedClips = {
    affine: {checkpoints: [0,1,2,3,2,1,0], holds: steppedHolds},
    darboux: {checkpoints: [4,8,16,32,16,8,4], holds: steppedHolds},
    'definite-integral': {checkpoints: [6,12,24,48,24,12,6], holds: steppedHolds},
};
const affineSteps = steppedClips.affine.checkpoints;
const affineHolds = steppedClips.affine.holds;
// Catalog square function f(x) = x² on [0, 2] (the darboux and definite-integral recipes).
const squareOnInterval = x => x * x;
const near = (actual, expected, message) => assert.ok(Math.abs(actual-expected)<1e-8, message);

// Shared timing: 12 holds, 71 moving frames (phase 0 to 1), 13 holds. Frames 13..82 move.
const holdStart = 12, moveFrames = 71;
const movePhase = i => Math.max(0, Math.min(1, (i - holdStart) / moveFrames));
// Frame nearest the sin² peak (phase 0.5 falls at frame 47.5, rounded down to a sample).
const peakFrame = Math.floor(holdStart + moveFrames / 2);
// Rendered curves with path data; a curve whose d attribute is missing or empty hashes as '' and must not count as present.
const countPaths = paths => paths.filter(d => typeof d === 'string' && d.length > 0).length;
// Pointer drags use sin² out and back: 0 at the start, 1 mid-move, 0 at the end.
const sin2OutAndBack = i => Math.sin(Math.PI * movePhase(i)) ** 2;
// Parameter sweeps visit each spec's waypoints in order, each leg with a sin² ease (zero speed at every waypoint).
// Waypoints, control step and start live in the spec (motionSpecs[id].sweep); the runner has no route-specific values.
// Grid values are origin + k·step (origin defaults to 0, so every existing clip snaps to multiples of its step as before).
// Ranges whose minimum is off the multiples of the step (spline-g1 starts at 0.01 with step 0.0299) set sweep.origin to that minimum.
const snapToStep = (value, step, origin = 0) => {
    const decimals = Math.max((String(step).split('.')[1] || '').length, (String(origin).split('.')[1] || '').length);
    return Number((origin + Math.round((value - origin) / step) * step).toFixed(decimals));
};
function sweepValue(i, spec) {
    const {waypoints, step, origin = 0} = spec.sweep;
    const scaled = movePhase(i) * (waypoints.length - 1);
    const leg = Math.min(waypoints.length - 2, Math.floor(scaled));
    const local = scaled - leg;
    const eased = (1 - Math.cos(Math.PI * local)) / 2;
    return snapToStep(waypoints[leg] + (waypoints[leg + 1] - waypoints[leg]) * eased, step, origin);
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

// PH offset clips. The PH curve is the polynomial Bézier of its visible control points (p0..p3 cubic, p0..p5 quintic). Its offset at
// signed distance d is the rational Bézier phOffsetRational(p, sigmas, d) of src/bezeg/impl/curve/ph-math.ts, built on the same parameter t,
// so the offset point O(t) lies over B(t) at distance |d| along the right normal (sign conventions are checked, not assumed, in the sweep).
// Independent copies below (scripts cannot import TS): Bernstein derivative and signed curvature of the polynomial Bézier.
const bernsteinDerivativePoint = (controls, t) => {
    const n = controls.length - 1;
    return bernsteinPoint(controls.slice(1).map((p, k) => ({x: n * (p.x - controls[k].x), y: n * (p.y - controls[k].y)})), t);
};
/** Signed curvature κ(t) = (B' × B'') / |B'|³ of the polynomial Bézier at t. */
function bernsteinCurvature(controls, t) {
    const n = controls.length - 1;
    const d1 = controls.slice(1).map((p, k) => ({x: n * (p.x - controls[k].x), y: n * (p.y - controls[k].y)}));
    const d2 = d1.slice(1).map((p, k) => ({x: (n - 1) * (p.x - d1[k].x), y: (n - 1) * (p.y - d1[k].y)}));
    const a = bernsteinPoint(d1, t), b = bernsteinPoint(d2, t);
    return (a.x * b.y - a.y * b.x) / Math.hypot(a.x, a.y) ** 3;
}
/**
 * Minimum radius of curvature on each offset side over t in [0, 1] (4000 samples). The offset at signed distance d along the right
 * normal has a cusp where d·κ(t) = -1, so the d < 0 side is limited by positive curvature and the d > 0 side by negative curvature.
 * A side with no such curvature has radius Infinity. The 4000-sample grid can miss a sharp curvature peak, so a radius can be overestimated.
 * That is immaterial for ph-cubic: its d < 0 side has no positive curvature (R = Infinity) and κ on its d > 0 side is far below 1/0.35
 * (R = 3.644, which 4000 and 40000 samples agree on to 1e-7).
 */
function phOffsetRadii(controls, samples = 4000) {
    let negative = Infinity, positive = Infinity;
    for (let i = 0; i <= samples; i++) {
        const k = bernsteinCurvature(controls, i / samples);
        if (k > 0) negative = Math.min(negative, 1 / k);
        else if (k < 0) positive = Math.min(positive, -1 / k);
    }
    return {negative, positive};
}
/**
 * Offset waypoints for the d sweep from the recipe value d0. If the radius on the d < 0 side stays at least 1.5·d0, the offset passes through
 * the curve to the other side: [d0, -d0, d0]. Otherwise it stops at the curve: [d0, 0, d0].
 */
function phOffsetWaypoints(controls, d0) {
    return phOffsetRadii(controls).negative >= 1.5 * d0 ? [d0, -d0, d0] : [d0, 0, d0];
}
/** Board reads for the PH offset clips: every visible curve, sampled at 41 parameters over its own interval (the check tells the two apart). */
const phOffsetObserve = page => page.locator('#jgbox').evaluate(container => {
    const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
    const curves = Object.values(b.objects).filter(o => o.elType === 'curve' && o.visProp?.visible !== false && o.rendNode);
    return {curves: curves.map(o => {
        const min = o.minX(), max = o.maxX();
        const samples = Array.from({length: 41}, (_, k) => { const s = min + (max - min) * k / 40; return {x: o.X(s), y: o.Y(s)}; });
        return {min, max, d: o.rendNode.getAttribute('d') || '', samples};
    })};
});
// The offset readout writes negatives with a true minus sign (U+2212), as the complex formatter does, and a decimal comma.
const phReadoutText = value => slovenianDecimal(value).replace('-', '−');
/** Offset distance from the range's aria-valuetext (U+2212 sign, Slovenian decimal comma), which must equal the input. */
function phReportedDistance(sample) {
    const d = Number(sample.actual.readout.replace('−', '-').replace(',', '.'));
    assert.ok(Number.isFinite(d) && Math.abs(d - sample.actual.input) < 1e-9, `Reported d differs from the input at frame ${sample.index}`);
    return d;
}
/** Indices of the board curves that lie on the PH polynomial (all 41 parameters within 1e-9). The offset never does for d != 0. */
function phCurveCandidates(sample, controls) {
    return sample.observed.curves.map((_, k) => k).filter(k => sample.observed.curves[k].samples.every((p, j) => {
        const q = bernsteinPoint(controls, j / 40);
        return Math.hypot(p.x - q.x, p.y - q.y) < 1e-9;
    }));
}
/** Side sign sign(B' × (O − B)) · sign(d) of the offset; it must be the same at all 41 parameters of a frame with d != 0. */
function phOffsetSide(sample, controls, offsetIndex) {
    const d = phReportedDistance(sample);
    const sides = sample.observed.curves[offsetIndex].samples.map((p, k) => {
        const B = bernsteinPoint(controls, k / 40), D = bernsteinDerivativePoint(controls, k / 40);
        return Math.sign(D.x * (p.y - B.y) - D.y * (p.x - B.x)) * Math.sign(d);
    });
    assert.ok(sides.every(s => s !== 0 && s === sides[0]), `Offset side is not constant over the parameter at frame ${sample.index}`);
    return sides[0];
}
/**
 * Per-frame check of a PH offset sweep. Control points: every board point (none is draggable) equals frame 0 in identity and position.
 * The PH curve is the board curve on the polynomial Bézier, identified at frame 0 and asserted unchanged; the offset is the other curve.
 */
function phOffsetSweepCheck(sample, previous, first, spec) {
    const i = sample.index, d = phReportedDistance(sample), abs = Math.abs(d);
    assert.ok(sample.pathCount > 0, `Curve paths missing from the snapshot at frame ${i}`);
    assert.equal(sample.points.length, first.points.length, `Point count changed at frame ${i}`);
    sample.points.forEach((p, j) => {
        assert.equal(p.id, first.points[j].id, `Point identity changed at frame ${i}`);
        assert.ok(Math.abs(p.x - first.points[j].x) < 1e-9 && Math.abs(p.y - first.points[j].y) < 1e-9, `Control point moved at frame ${i}`);
    });
    const controls = sample.points.map(({x, y}) => ({x, y}));
    const firstControls = first.points.map(({x, y}) => ({x, y}));
    assert.equal(sample.observed.curves.length, 2, `Expected one PH curve and one offset curve at frame ${i}`);
    sample.observed.curves.forEach(c => assert.ok(c.min === 0 && c.max === 1, `Curve interval differs from [0,1] at frame ${i}`));
    const firstOn = phCurveCandidates(first, firstControls);
    assert.equal(firstOn.length, 1, 'Exactly one board curve must be the PH polynomial at the recipe frame');
    const ph = firstOn[0], off = 1 - ph;
    const on = phCurveCandidates(sample, controls);
    assert.ok(on.includes(ph), `PH curve differs from its Bezier at frame ${i}`);
    if (abs > 1e-12) assert.deepEqual(on, [ph], `Offset curve coincides with the PH curve at frame ${i}`);
    assert.equal(sample.observed.curves[ph].d, first.observed.curves[ph].d, `PH curve path changed at frame ${i}`);
    if (previous) {
        const changed = sample.observed.curves[off].d !== previous.observed.curves[off].d;
        if (previous.scheduled !== sample.scheduled) assert.ok(changed, `Offset path did not change at frame ${i}`);
        else assert.ok(!changed, `Offset path changed while d held at frame ${i}`);
    }
    // No cusp at the reported d, and the schedule is the radius rule applied to these control points.
    const radius = phOffsetRadii(controls);
    const limit = d < 0 ? radius.negative : radius.positive;
    assert.ok(abs < limit, `Offset reaches a cusp: |d| = ${abs} is not below the radius ${limit} at frame ${i}`);
    assert.deepEqual(spec.sweep.waypoints, phOffsetWaypoints(controls, spec.sweep.start), `Schedule differs from the radius rule at frame ${i}`);
    // Offset points at 41 parameters: |O - B| = |d| (this includes O = B at d = 0), O - B perpendicular to B', and a fixed side.
    const side = abs > 1e-12 ? phOffsetSide(first, firstControls, off) : null;
    sample.observed.curves[off].samples.forEach((p, k) => {
        const B = bernsteinPoint(controls, k / 40), D = bernsteinDerivativePoint(controls, k / 40);
        const v = {x: p.x - B.x, y: p.y - B.y}, speed = Math.hypot(D.x, D.y);
        assert.ok(Math.abs(Math.hypot(v.x, v.y) - abs) < 1e-9, `Offset distance differs from |d| at frame ${i}, parameter ${k}`);
        assert.ok(Math.abs(v.x * D.x + v.y * D.y) / speed < 1e-9, `Offset is not perpendicular to B' at frame ${i}, parameter ${k}`);
        if (side !== null) assert.equal(Math.sign(D.x * v.y - D.y * v.x) * Math.sign(d), side, `Offset side differs at frame ${i}, parameter ${k}`);
    });
    if (i === frameCount - 1) assert.equal(sample.capture.sha256, first.capture.sha256, 'Non-seamless loop: last PNG differs from the recipe frame');
}

/** Capture the two live coloured pieces and their shared split point in the pre-Subdivide scene. */
const subdivisionObserve = page => page.locator('#jgbox').evaluate(container => {
    const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
    const curves = Object.values(b.objects).filter(o => o.elType === 'curve' && o.visProp?.visible !== false && o.rendNode && getComputedStyle(o.rendNode).display !== 'none');
    return {curves: curves.map(o => {
        const min = o.minX(), max = o.maxX();
        return {min,max,start:{x:o.X(min),y:o.Y(min)},end:{x:o.X(max),y:o.Y(max)},
            samples:Array.from({length:21},(_,j)=>{const s=min+(max-min)*j/20;return {x:o.X(s),y:o.Y(s)};}),stroke:getComputedStyle(o.rendNode).stroke,
            d:o.rendNode.getAttribute('d') || ''};
    })};
});
function subdivisionSweepCheck(sample, previous, first, spec) {
    const i=sample.index, t=sample.actual.input;
    assert.equal(sample.points.length,first.points.length,`Point count changed at frame ${i}`);
    const controls=sample.controls.map(({x,y})=>({x,y}));
    const levels=deCasteljauLevels(controls,t);
    const construction=sample.points.filter(p=>!p.draggable).map(({x,y})=>({x,y}));
    assertPointSet(construction,levels.flat(),`De Casteljau interpolation construction differs at frame ${i}`);
    const split=bernsteinPoint(controls,t);
    assert.ok(levels.at(-1).every(p=>Math.hypot(p.x-split.x,p.y-split.y)<1e-9),`Split point differs from B(t) at frame ${i}`);
    const portions=sample.observed.curves;
    assert.equal(portions.length,2,`Expected two coloured portions before Subdivide at frame ${i}`);
    assert.notEqual(portions[0].stroke,portions[1].stroke,`Both portions must retain distinct colours at frame ${i}`);
    const matches=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y)<1e-8;
    assert.ok(matches(portions[0].start,controls[0])&&matches(portions[0].end,split),`First portion does not run from P0 to B(t) at frame ${i}`);
    assert.ok(matches(portions[1].start,split)&&matches(portions[1].end,controls.at(-1)),`Second portion does not run from B(t) to Pn at frame ${i}`);
    portions.forEach((portion,part)=>portion.samples.forEach((p,j)=>{
        const s=j/20,u=part===0?t*s:t+(1-t)*s,expected=bernsteinPoint(controls,u);
        assert.ok(matches(p,expected),`Portion ${part+1} leaves the unchanged base curve at frame ${i}, local parameter ${s}`);
    }));
    if(previous&&previous.scheduled!==sample.scheduled) {
        assert.notEqual(sample.observed.curves[0].d,previous.observed.curves[0].d,`First portion did not change at frame ${i}`);
        assert.notEqual(sample.observed.curves[1].d,previous.observed.curves[1].d,`Second portion did not change at frame ${i}`);
    }
    if(i===frameCount-1)assert.equal(sample.capture.sha256,first.capture.sha256,'Non-seamless loop: last pre-Subdivide PNG differs from the recipe frame');
}

// Quadratic G1 spline (src/bezeg/impl/curve/G1QuadraticBezierSpline.ts): N2 = P2 + b1·(P2 − P1), N3 = P3 + b2·(P3 − N2). Independent copy.
function g1ComputedPoints(P, b1, b2) {
    const N2 = {x: P[2].x + b1 * (P[2].x - P[1].x), y: P[2].y + b1 * (P[2].y - P[1].y)};
    const N3 = {x: P[3].x + b2 * (P[3].x - N2.x), y: P[3].y + b2 * (P[3].y - N2.y)};
    return {N2, N3};
}
/** G1 at a join: next − joint = ratio·(joint − prev) with ratio > 0, so the tangent direction is shared (1e-9). */
function assertG1Join(prev, joint, next, ratio, message) {
    assert.ok(ratio > 0, `${message}: ratio must be positive`);
    assert.ok(Math.abs((next.x - joint.x) - ratio * (joint.x - prev.x)) < 1e-9 && Math.abs((next.y - joint.y) - ratio * (joint.y - prev.y)) < 1e-9, message);
}
/**
 * Per-frame check of the G1 spline sweep. Controls P0..P4 are the draggable points in index order (assertSweepFrame checks identity and
 * position against frame 0). b1 is the reported aria-valuetext (decimal comma, float noise) and must equal the input; b2 is the second
 * range's readout, unchanged from frame 0. The two computed points are compared as a set, so the board order does not matter.
 */
function g1SplineSweepCheck(sample, previous, first, spec) {
    const i = sample.index;
    const b1 = Number(String(sample.actual.readout).replace(',', '.'));
    assert.ok(Number.isFinite(b1) && Math.abs(b1 - sample.actual.input) < 1e-9, `Reported b1 differs from the input at frame ${i}`);
    assert.equal(sample.observed.b2, first.observed.b2, `b2 changed from frame 0 at frame ${i}`);
    const b2 = Number(String(sample.observed.b2).replace(',', '.'));
    assert.ok(Number.isFinite(b2), `b2 readout is not a number at frame ${i}`);
    const P = sample.controls.map(({x, y}) => ({x, y}));
    assert.equal(P.length, 5, `Expected P0..P4 at frame ${i}`);
    const {N2, N3} = g1ComputedPoints(P, b1, b2);
    const computed = sample.points.filter(p => !p.draggable).map(({x, y}) => ({x, y}));
    assertPointSet(computed, [N2, N3], `Computed control points differ from {N2, N3} at frame ${i}`);
    assertG1Join(P[1], P[2], N2, b1, `G1 fails at join P2 at frame ${i}`);
    assertG1Join(N2, P[3], N3, b2, `G1 fails at join P3 at frame ${i}`);
    assert.ok(sample.pathCount > 0, `Curve path missing from the snapshot at frame ${i}`);
    if (previous) {
        if (previous.scheduled !== sample.scheduled) assert.notEqual(sample.curvePathHash, previous.curvePathHash, `Curve path did not change while b1 moved at frame ${i}`);
        else assert.equal(sample.curvePathHash, previous.curvePathHash, `Curve path changed while b1 held at frame ${i}`);
    }
    if (i === frameCount - 1) assert.equal(sample.capture.sha256, first.capture.sha256, 'Non-seamless loop: last PNG differs from the recipe frame');
}

// Trigonometric clip (src/analysis/trigonometric.ts): f(x) = A·sin(ω·x + φ) + B. The phase φ is inside the argument, so the phase shift is −φ/ω.
// phaseAsPi and formatWithPi are independent copies of the runtime's phaseAsPi and formatWithPi (src/graphs/functions readouts).
const trigMinus = '−';
/** The phase's aria-valuetext: a multiple of π/12 written as a multiple of π ("π/2", "−π/4", "0", "π"). */
function phaseAsPiText(phi) {
    const step = Math.PI / 12, steps = Math.round(phi / step);
    assert.ok(Math.abs(phi - steps * step) < 1e-9, `Phase ${phi} is not a multiple of pi/12`);
    if (steps === 0) return '0';
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b)), divisor = gcd(Math.abs(steps), 12);
    const numerator = Math.abs(steps) / divisor, denominator = 12 / divisor;
    return `${steps < 0 ? trigMinus : ''}${numerator === 1 ? '' : numerator}π${denominator === 1 ? '' : `/${denominator}`}`;
}
/** The φ readout (dl "phi"): the number with two decimals and a decimal comma, plus the exact multiple of π when it has one. */
function phiReadoutText(phi) {
    const fixed = phi.toFixed(2), trimmed = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
    const number = /^-?0(\.0*)?$/.test(trimmed) ? '0' : (trimmed.startsWith('-') ? trigMinus + trimmed.slice(1) : trimmed).replace('.', ',');
    const pi = Math.abs(phi / (Math.PI / 12) - Math.round(phi / (Math.PI / 12))) < 1e-9 ? phaseAsPiText(phi) : null;
    return pi === null || pi === '0' ? number : `${number} (${pi})`;
}
/** Board reads for the trigonometric clip: A, ω, B from their range inputs, the equation and φ readouts, and 81 samples of every curve. */
const trigObserve = async page => {
    const number = async label => Number(await page.getByLabel(label, {exact: true}).inputValue());
    const values = {A: await number('Amplituda A'), omega: await number('Frekvenca ω'), B: await number('Srednja črta B')};
    const equation = await page.locator('[data-readout="equation"] dd').textContent();
    const phi = await page.locator('[data-readout="phi"] dd').textContent();
    const curves = await page.locator('#jgbox').evaluate(container => {
        const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
        const finite = v => Number.isFinite(v) ? v : null;
        return Object.values(b.objects).filter(o => o.elType === 'curve' && o.rendNode).map(o => {
            const min = o.minX(), max = o.maxX();
            return {id: o.id, dash: o.visProp?.dash, samples: Array.from({length: 81}, (_, k) => {
                const s = min + (max - min) * k / 80;
                return {x: finite(o.X(s)), y: finite(o.Y(s))};
            })};
        });
    });
    return {values, equation, phi, curves};
};
/**
 * Per-frame check of the trigonometric sweep. A, ω, B and the equation are the frame-0 values; the φ readout is the text of the input;
 * the one solid function curve (dash 0, all samples finite, the others are dashed or empty) equals A·sin(ω·x + φ) + B at every sample
 * in the recipe window (1e-9), with at least 21 of them.
 */
function trigSweepCheck(sample, previous, first, spec) {
    const i = sample.index, phi = sample.actual.input;
    assert.deepEqual(sample.observed.values, first.observed.values, `A, omega or B changed at frame ${i}`);
    // The equation readout carries φ (f(x) = sin(x + π/12) and so on); with A = 1, ω = 1 and B = 0 it is the only part that may change.
    const phiPart = Math.abs(phi) < 1e-9 ? '' : ` ${phi < 0 ? trigMinus : '+'} ${phaseAsPiText(Math.abs(phi))}`;
    assert.equal(sample.observed.equation, `f(x) = sin(x${phiPart})`, `Equation readout differs from the input at frame ${i}`);
    assert.equal(sample.observed.phi, phiReadoutText(phi), `Phi readout differs from the input at frame ${i}`);
    const {A, omega, B} = sample.observed.values;
    const solid = sample.observed.curves.filter(c => c.dash === 0 && c.samples.every(p => p.x !== null && p.y !== null));
    assert.equal(solid.length, 1, `Expected one solid function curve at frame ${i}`);
    const inWindow = solid[0].samples.filter(p => p.x >= -0.6 && p.x <= 6.8);
    assert.ok(inWindow.length >= 21, `Too few curve samples in the window at frame ${i}`);
    inWindow.forEach(p => assert.ok(Math.abs(p.y - (A * Math.sin(omega * p.x + phi) + B)) < 1e-9, `Curve differs from A·sin(ωx + φ) + B at x = ${p.x}, frame ${i}`));
    assert.ok(sample.pathCount > 0, `Curve paths missing from the snapshot at frame ${i}`);
    if (i === frameCount - 1) assert.equal(sample.capture.sha256, first.capture.sha256, 'Non-seamless loop: last PNG differs from the recipe frame');
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

/**
 * Pure Darboux sums of f on n equal parts of [a, b]. Mirrors darbouxSubintervals and darbouxTotals in src/analysis/darboux.ts, which take
 * the infimum and supremum of each part. Here the min and max of f at the part's two endpoints are used. The endpoint inf/sup is exact
 * only because x² is monotone on [0, 2] (its critical point 0 is the left endpoint of the interval). The runtime (src/analysis/darboux.ts)
 * also adds interior critical points, so this reference must change if the function or the interval changes.
 */
function darbouxReferenceSums(f, a, b, n) {
    const h = (b - a) / n;
    let lower = 0, upper = 0;
    for (let k = 0; k < n; k++) {
        const x0 = a + k * h, x1 = a + (k + 1) * h;
        const values = [f(x0), f(x1)];
        lower += Math.min(...values) * h;
        upper += Math.max(...values) * h;
    }
    return {lower, upper};
}
/** Pure left Riemann sum h·Σ f(a + k·h) for k = 0..n-1. Mirrors riemannSum with method 'left' in src/analysis/riemann.ts. */
function leftRiemannReference(f, a, b, n) {
    const h = (b - a) / n;
    let sum = 0;
    for (let k = 0; k < n; k++) sum += f(a + k * h);
    return sum * h;
}
/** Darboux readouts the board must show at partition count n, formatted with the runtime's 4-decimal Slovenian text. */
function darbouxReadoutExpectation(n) {
    const {lower, upper} = darbouxReferenceSums(squareOnInterval, 0, 2, n);
    return {n: String(n), a: formatSlNumber(0), b: formatSlNumber(2), lower: formatSlNumber(lower), upper: formatSlNumber(upper),
        integral: formatSlNumber(8 / 3), gap: formatSlNumber(upper - lower)};
}
/** Definite-integral readouts the board must show at n subintervals with the left rule. The difference is sum − exact. */
function integralReadoutExpectation(n) {
    const sum = leftRiemannReference(squareOnInterval, 0, 2, n), exact = 8 / 3;
    return {n: String(n), a: formatSlNumber(0), b: formatSlNumber(2), h: formatSlNumber(2 / n), sum: formatSlNumber(sum),
        exact: formatSlNumber(exact), difference: formatSlNumber(sum - exact)};
}
/** Number of supported 2n presses that take the Darboux recipe n = 4 to checkpoint n (the button cannot lower n). */
const darbouxPressCount = n => Math.round(Math.log2(n / 4));
/** Every expected readout must equal the text the board shows, key by key. */
function assertReadouts(actual, expected, label) {
    for (const [key, value] of Object.entries(expected)) assert.equal(actual?.[key], value, `${label}: readout ${key} differs`);
}

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
    'decasteljau-alternative': {
        mode: 'parameter-sweep', controlCount: 5,
        control: {label: 'Parameter t', kind: 'range'},
        sweep: {
            waypoints: [0.5, 1, 0, 0.5], step: 0.01, start: 0.5,
            readout: {text: slovenianDecimal,
                read: ({range}) => range.getAttribute('aria-valuetext')},
            // Board reads: the one visible segment (the connecting segment AB, named e) and its endpoints.
            observe: page => page.locator('#jgbox').evaluate(container => {
                const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
                const segments = Object.values(b.objects).filter(o => o.elType === 'segment' && o.visProp?.visible !== false && o.rendNode);
                if (segments.length !== 1) throw new Error(`Expected exactly one connecting segment, found ${segments.length}`);
                const s = segments[0];
                return {segment: {p1: {x: s.point1.X(), y: s.point1.Y()}, p2: {x: s.point2.X(), y: s.point2.Y()}}};
            }),
            check(sample, previous, first) {
                const i = sample.index, t = sample.actual.input;
                const controls = sample.controls.map(({x, y}) => ({x, y}));
                // Independent evaluations: A and B are the cubic Bernstein points of the two sub-polygons, C the quartic one.
                const A = bernsteinPoint(controls.slice(0, 4), t), B = bernsteinPoint(controls.slice(1), t), C = bernsteinPoint(controls, t);
                assertPointSet(sample.points.filter(p => !p.draggable).map(({x, y}) => ({x, y})), [A, B, C], `Non-draggable points differ from {A, B, C} at frame ${i}`);
                const seg = sample.observed.segment;
                assert.ok(Math.abs(seg.p1.x - A.x) < 1e-9 && Math.abs(seg.p1.y - A.y) < 1e-9, `Segment start differs from A at frame ${i}`);
                assert.ok(Math.abs(seg.p2.x - B.x) < 1e-9 && Math.abs(seg.p2.y - B.y) < 1e-9, `Segment end differs from B at frame ${i}`);
                // C lies on AB at ratio t: (1 - t) A + t B equals the curve point.
                const onSegment = {x: (1 - t) * seg.p1.x + t * seg.p2.x, y: (1 - t) * seg.p1.y + t * seg.p2.y};
                assert.ok(Math.abs(onSegment.x - C.x) < 1e-9 && Math.abs(onSegment.y - C.y) < 1e-9, `Curve point is not at ratio t on segment AB at frame ${i}`);
                if (previous) {
                    if (previous.scheduled !== sample.scheduled) assert.notEqual(sample.curvePathHash, previous.curvePathHash, `Component or partial curve path did not change at frame ${i}`);
                    else assert.equal(sample.curvePathHash, previous.curvePathHash, `Curve path changed while t held at frame ${i}`);
                }
                assert.ok(sample.pathCount > 0, `Curve paths missing from the snapshot at frame ${i}`);
                if (i === frameCount - 1) assert.equal(sample.capture.sha256, first.capture.sha256, 'Non-seamless loop: last PNG differs from the recipe frame');
            },
        },
        // Measured on the diagnostic capture: CRF 10 gave 230508 bytes, under the 307200 B ceiling, so the encoder default is kept.
        crf: 10,
        encoderBudget: 'CRF 10 (encoder default): 230508 bytes measured on the diagnostic capture, under the 300 KiB ceiling, so no encoder reduction was needed',
        schedule: {kind: 'piecewise-sin2', waypoints: [0.5, 1, 0, 0.5], phase: 'clamp((frame-12)/71)',
            zeroDisplacementFrames: '0-12 and 83-95 (t holds at 0.5)', movingFrames: '13-82',
            legs: 'three equal phase thirds, each eased by (1 - cos πx)/2 from one waypoint to the next', step: 0.01,
            input: 'keyboard ArrowRight/ArrowLeft on the Parameter t range, incremental from the previous frame'},
        invariants: ['Control points unchanged (1e-9)', 'A and B equal the cubic Bernstein points of p0..p3 and p1..p4 at the reported t (1e-9)',
            'C equals the quartic Bernstein point of p0..p4 at t (1e-9) and lies on segment AB at ratio t', 'Non-draggable points are exactly {A, B, C}',
            'Segment endpoints equal A and B every frame (exactly one visible connecting segment)',
            'Curve paths change whenever t changes and are unchanged while t holds', 'Input value and aria-valuetext equal the snapped target every frame',
            'First and last frames equal the recipe state (identical PNG)'],
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
    // PH offset clip (Phase 3). The PH curve's control points are visible but not draggable, so controlCount is 0 and the check compares
    // every board point with frame 0. Radii from the control points (phOffsetRadii, 4000 samples): cubic d < 0 side R = Infinity (no positive
    // curvature), which is at least 1.5·0.35 = 0.525, so [d0, -d0, d0]. The grid caveat and the d > 0 side radius are in phOffsetRadii.
    'ph-cubic': {
        mode: 'parameter-sweep', controlCount: 0,
        control: {label: 'Razdalja odmika d', kind: 'range'},
        sweep: {
            waypoints: [0.35, -0.35, 0.35], step: 0.01, start: 0.35,
            readout: {text: phReadoutText, read: ({range}) => range.getAttribute('aria-valuetext')},
            observe: phOffsetObserve,
            check: phOffsetSweepCheck,
        },
        // The full settle crashed the renderer during the sweep (as farin did); two animation frames are enough for this board.
        settle: page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
        crf: 10,
        encoderBudget: 'CRF 10 (the encoder default): 236353 bytes measured on the diagnostic capture, under the 300 KiB ceiling, so no label, amplitude or encoder reduction was needed',
        schedule: {kind: 'piecewise-sin2', waypoints: [0.35, -0.35, 0.35], phase: 'clamp((frame-12)/71)',
            deviation: 'spec table says 0 → recipe → 0; the clip must start and end at the recipe value (poster), so it runs recipe → −recipe → recipe',
            zeroDisplacementFrames: '0-12 and 83-95 (d holds at the recipe value 0.35)', movingFrames: '13-82',
            legs: 'two equal phase halves, each eased by (1 - cos πx)/2 from one waypoint to the next (d = -0.35 at the middle of the move)', step: 0.01,
            input: 'keyboard ArrowRight/ArrowLeft on the "Razdalja odmika d" range, incremental from the previous frame'},
        invariants: ['PH curve path identical in every frame (the polynomial Bézier of the visible points, identified by its evaluation)',
            'Exactly one offset curve; control points unchanged (1e-9)',
            'Offset at 41 parameters: |O - B| = |d| (1e-9), (O - B)·B\' = 0 (1e-9 relative to |B\'|), fixed side sign from frame 0',
            'Offset path changes whenever d changes and is unchanged while d holds; O = B at d = 0',
            'No cusp: |d| below the radius on its side; schedule equals the radius rule', 'Input and aria-valuetext equal the snapped target every frame',
            'First and last frames equal the recipe state (identical PNG)'],
    },
    // Reopened Phase 3: the quintic keeps its original PH curve and one useful offset. The 0.5 recipe distance remains below
    // the measured 0.8004 minimum radius on the negative-distance side; the same measured control points drive every signed-normal check.
    'ph-quintic': {
        mode:'parameter-sweep',controlCount:0,
        control:{label:'Razdalja odmika d',kind:'range'},
        sweep:{waypoints:[0.5,-0.5,0.5],step:0.01,start:0.5,
            readout:{text:phReadoutText,read:({range})=>range.getAttribute('aria-valuetext')},observe:phOffsetObserve,check:phOffsetSweepCheck},
        settle:page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),
        crf:10,
        encoderBudget:'CRF 10 (the encoder default); 247040 bytes measured on the diagnostic capture, under the 300 KiB ceiling',
        schedule:{kind:'piecewise-sin2',waypoints:[0.5,-0.5,0.5],phase:'clamp((frame-12)/71)',zeroDisplacementFrames:'0-12 and 83-95',movingFrames:'13-82',
            legs:'two equal phase halves, each eased by (1 - cos πx)/2; d reaches −0.5 at the midpoint',step:0.01,
            input:'keyboard ArrowRight/ArrowLeft on the "Razdalja odmika d" range, incremental from the previous frame'},
        invariants:['PH quintic curve path identical in every frame; the six fixed Bezier control points do not move (1e-9)',
            'Exactly one offset curve; at 41 parameters |O - B| = |d| and (O - B)·B′ = 0 (1e-9 relative to |B′|), with a fixed signed-normal side',
            'Cusp-free throughout: |d| remains below the sampled minimum radius of curvature on its signed side',
            'Input and graph aria-valuetext equal the snapped target every frame', 'First and last frames equal the recipe state (identical PNG)'],
    },
    // Pre-Subdivide scene: both live curve portions, the de Casteljau construction, and the supporting polygon remain visible as t moves.
    subdivision:{
        mode:'parameter-sweep',controlCount:4,
        control:{label:'Parameter subdivizije t',kind:'range'},
        sweep:{waypoints:[0.5,0.745,0.255,0.5],step:0.0098,origin:0.01,start:0.5,
            // The supported Slider exposes aria-valuetext rounded to two decimals; its inputValue remains checked exactly at the native 0.0098 grid.
            readout:{text:value=>value.toFixed(2).replace('.',','),matches:(shown,value)=>Math.abs(Number(String(shown).replace(',','.'))-value)<0.0050000001,
                read:({range})=>range.getAttribute('aria-valuetext')},observe:subdivisionObserve,check:subdivisionSweepCheck},
        schedule:{kind:'piecewise-sin2',waypoints:[0.5,0.745,0.255,0.5],origin:0.01,step:0.0098,phase:'clamp((frame-12)/71)',
            zeroDisplacementFrames:'0-12 and 83-95 (t holds at 0.50)',movingFrames:'13-82',
            legs:'three equal phase thirds, each eased by (1 - cos πx)/2',
            input:'keyboard ArrowRight/ArrowLeft on the "Parameter subdivizije t" range, snapped exactly to the native 0.0098 step beginning at 0.01; aria-valuetext reports the same value rounded to 0.01'},
        crf:16,
        encoderBudget:'After hiding point names and reducing the split range from 0.01–0.99 to 0.255–0.745, CRF 10 encoded to 382499 bytes; CRF 16 encoded to 279977 bytes and remains readable at card size',
        invariants:['Split point equals pure Bernstein B(t) (1e-9); all six interpolated points match the pure de Casteljau levels (1e-9)',
            'The blue and orange curve portions meet at B(t), run from P0 to B(t) and B(t) to P3, and retain distinct colours',
            'The four original control points stay fixed and no Subdivide action is pressed',
            'Input equals the snapped target every frame; aria-valuetext equals its two-decimal display to within half a display unit',
            'First and last frames equal the pre-Subdivide recipe state (identical PNG)'],
    },
    // Quadratic G1 spline (Phase 3). Independent copy of G1_QUADRATIC_SCHEME in src/bezeg/impl/curve/G1QuadraticBezierSpline.ts:
    // N2 = P2 + b1·(P2 − P1) and N3 = P3 + b2·(P3 − N2). Changing b1 moves N2 and, through the chain, N3 (a deviation from the spec's
    // "only that join's leg changes"; recorded in the Phase 3 table). The second range "Parameter b 2" reads 1 at the recipe (aria-valuetext "1"), not 0.9967.
    'spline-g1': {
        mode: 'parameter-sweep', controlCount: 5,
        control: {label: 'Parameter b 1', kind: 'range'},
        sweep: {
            // Recipe b1 = 0.65 is snapped by the slider to its grid 0.01 + k·0.0299 (the runtime step is (max−min)/100): 0.6379 = 0.01 + 21·0.0299.
            waypoints: [0.6379, 1.5349, 0.2492, 0.6379], origin: 0.01, step: 0.0299, start: 0.6379,
            // Measured union over the schedule (b1 in [0.2492, 1.5349], b2 = 1): N2 = (−2.5 + 1.5·b1, −2.5 − b1) reaches y = −4.04 and
            // N3 reaches y = 2.04; the free points span x −4..3. The poster fit of the recipe state is too small for the whole sweep, and
            // b1 above about 2.5 would push N2 past y = −5. This union window [-6.5, 4, 5.5, -5] is the recipe's coordinate window
            // (scripts/demonstration-preview-recipes.cjs), so the poster and every frame share one camera (no refit).
            readout: {
                text: value => value.toFixed(4).replace('.', ','),
                // The runtime writes float noise into aria-valuetext (for example "0,637900000000000023"); the check parses it and compares to the input at 1e-9.
                matches: (shown, value) => Math.abs(Number(String(shown).replace(',', '.')) - value) < 1e-9,
                read: ({range}) => range.getAttribute('aria-valuetext')},
            observe: page => page.getByLabel('Parameter b 2', {exact: true}).getAttribute('aria-valuetext').then(b2 => ({b2})),
            check: g1SplineSweepCheck,
        },
        crf: 10,
        // CRF 10 (the encoder default) on the final capture with the recipe window: 178611 bytes, under the 300 KiB ceiling, so no label, amplitude or encoder reduction was needed.
        encoderBudget: 'CRF 10 (the encoder default): 178611 bytes measured on the final capture with the recipe window, under the 300 KiB ceiling, so no label, amplitude or encoder reduction was needed',
        schedule: {kind: 'piecewise-sin2', waypoints: [0.6379, 1.5349, 0.2492, 0.6379], origin: 0.01, step: 0.0299, phase: 'clamp((frame-12)/71)',
            zeroDisplacementFrames: '0-12 and 83-95 (b1 holds at the recipe value 0.6379)', movingFrames: '13-82',
            legs: 'three equal phase thirds, each eased by (1 - cos πx)/2 from one waypoint to the next',
            input: 'keyboard ArrowRight/ArrowLeft on the "Parameter b 1" range, incremental from the previous frame',
            window: 'recipe coordinate window [-6.5, 4, 5.5, -5]'},
        invariants: ['Free points P0..P4 unchanged (1e-9)', 'The two computed points equal {N2, N3} from the reported b1 and the b2 readout (1e-9)',
            'G1 at both joins: N2 − P2 = b1·(P2 − P1) and N3 − P3 = b2·(P3 − N2), with b1, b2 > 0 (1e-9)',
            'b2 readout unchanged from frame 0; reported b1 (aria-valuetext, decimal comma, float noise) equals the input (1e-9)',
            'Curve path changes whenever b1 changes and is unchanged while it holds; the last PNG equals the recipe frame'],
    },
    // Trigonometric clip (Phase 3, optional in the spec). The phase φ is the argument's constant term: f(x) = A·sin(ωx + φ) + B, so the
    // shift is −φ/ω. The sweep 0 → π → 0 moves the curve half a period right and back; A = 1, ω = 1, B = 0 hold at the recipe values.
    'trigonometric-functions': {
        mode: 'parameter-sweep', controlCount: 0,
        control: {label: 'Faza φ', kind: 'range'},
        sweep: {
            // Slider grid −π + k·π/12 (the runtime step), so every scheduled value is exact to 1e-15 and the recipe φ = 0 is k = 12.
            waypoints: [0, Math.PI, 0], origin: -Math.PI, step: Math.PI / 12, start: 0,
            readout: {text: phaseAsPiText, read: ({range}) => range.getAttribute('aria-valuetext')},
            observe: trigObserve,
            check: trigSweepCheck,
        },
        // CRF 10 (the encoder default) on the diagnostic capture: 283552 bytes, under the 300 KiB ceiling (307200 B), so no reduction was needed.
        crf: 10,
        encoderBudget: 'CRF 10 (the encoder default): 283552 bytes measured on the diagnostic capture, under the 300 KiB ceiling; no label or amplitude reduction was needed',
        schedule: {kind: 'piecewise-sin2', waypoints: [0, Math.PI, 0], origin: -Math.PI, step: Math.PI / 12, phase: 'clamp((frame-12)/71)',
            deviation: 'spec says −π…π with stepped holds; the recipe value is φ = 0 and the clip must start there, so it runs 0 → π → 0 with sin² legs on the π/12 grid',
            zeroDisplacementFrames: '0-12 and 83-95 (φ holds at the recipe value 0)', movingFrames: '13-82',
            legs: 'two equal phase halves, each eased by (1 - cos πx)/2 from one waypoint to the next (φ = π at the middle of the move)',
            input: 'keyboard ArrowRight/ArrowLeft on the "Faza φ" range, incremental from the previous frame',
            window: 'recipe coordinate window [-0.6, 1.8, 6.8, -1.8]'},
        invariants: ['A, ω, B inputs unchanged (exact); equation readout equals f(x) = sin(x + φ) for the input', 'Phi readout (dl "phi") is the text of the input, with the decimal comma and π multiple',
            'The solid function curve equals A·sin(ωx + φ) + B at the reported φ at every sample in the window (1e-9, at least 21 samples)',
            'Input and aria-valuetext equal the snapped target every frame', 'First and last frames equal the recipe state (identical PNG)'],
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
        // Recipe's coordinate window (equal units) is the camera. Its bottom is -1.6 (was -1.1) because Im(zw) reaches -√2 for z = 1 + i;
        // check() asserts z, w and the product inside it every frame.
        schedule: {kind: 'monotone-ease', phase: 'clamp((frame-12)/71)', progress: '(1 - cos(π·phase))/2', theta: 'π/2 + 2π·progress',
            zeroDisplacementFrames: '0-12 (w holds at i)', settledFrames: '83-95 (w holds at i)', movingFrames: '13-82', press: 13, release: 83,
            restore: 'number fields Re w = 0 and Im w = 1 after release (exact)',
            input: 'pointer drag of the w square on the board, one press and one release'},
        // Encoder: CRF 14 as in farin (see encoderBudget for the measured sizes).
        crf: 14,
        encoderBudget: 'CRF 14: 287913 B with the recipe window bottom at -1.6 (297310 B at -1.1, where the product left the frame; there CRF 13 was 309149, CRF 12 324011, CRF 10 350903, all over the 307200 B ceiling); no label or amplitude change was made',
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
            // |zw| = |z| = √2 sweeps a full circle, so z, w and the product must stay inside the recipe window with room for their markers.
            const [left, top, right, bottom] = recipes['complex-multiplication'].framing.window, margin = 0.15;
            for (const [name, p] of [['z', z], ['w', w], ['zw', product]])
                assert.ok(p.x > left + margin && p.x < right - margin && p.y < top - margin && p.y > bottom + margin, `${name} ${JSON.stringify(p)} leaves the recipe window at frame ${i}`);
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
    // Stepped clips (no sweep): each checkpoint is a settled route state, captured by captureHold; see steppedClips and assertMotionEvidence.
    darboux: {
        mode: 'discrete-exact-steps',
        // The only control is the button that doubles n (n → 2n). No control lowers n, so every checkpoint opens a fresh route, applies the recipe and presses the button k times.
        control: {label: 'Zgosti razdelitev (n → 2n)', kind: 'button'},
        // Measured on the diagnostic capture: CRF 10 (encoder default) gave 90975 bytes, under the 300 KiB ceiling, so no encoder change was needed.
        encoderBudget: 'CRF 10 (encoder default): 90975 bytes measured on the diagnostic capture, under the 300 KiB ceiling',
        schedule: {kind: 'discrete-steps', checkpoints: steppedClips.darboux.checkpoints, presses: steppedClips.darboux.checkpoints.map(darbouxPressCount),
            holds: steppedHolds, camera: 'recipe coordinate window [-0.3, 4.8, 2.4, -0.5]', bounds: 'a = 0 and b = 2 unchanged'},
        invariants: ['Readouts n, lower, upper, integral and gap equal the pure Darboux sums of x² on [0, 2] for the reported n (4-decimal text, Slovenian comma, true minus sign)',
            'Each checkpoint has exactly log2(n/4) button presses from a fresh route; a and b readouts stay 0 and 2',
            'Integral readout equals 8/3 at every checkpoint; gap equals upper − lower',
            'Checkpoints 4, 8, 16, 32, 16, 8, 4 with holds 18, 10, 10, 20, 10, 10, 18 cover 96 frames with one fixed camera',
            'First and last checkpoint PNGs are identical (seam)'],
    },
    'definite-integral': {
        mode: 'discrete-exact-steps',
        // The range "Število podintervalov n" (1..150) is set on a fresh route per checkpoint with a keyboard range action; the recipe's n = 6 is the first checkpoint.
        control: {label: 'Število podintervalov n', kind: 'range'},
        // Measured on the diagnostic capture: CRF 10 (encoder default) gave 90071 bytes, under the 300 KiB ceiling, so no encoder change was needed.
        encoderBudget: 'CRF 10 (encoder default): 90071 bytes measured on the diagnostic capture, under the 300 KiB ceiling',
        schedule: {kind: 'discrete-steps', checkpoints: steppedClips['definite-integral'].checkpoints, holds: steppedHolds,
            camera: 'recipe coordinate window [-0.3, 4.8, 2.4, -0.5]', bounds: 'a = 0, b = 2, function x² and the left rule unchanged'},
        invariants: ['Readouts n, h, sum, exact and difference equal the pure left Riemann sum of x² on [0, 2] for the reported n, with h = 2/n and exact = 8/3 (4-decimal text)',
            'difference equals sum − exact (sign included); a and b readouts stay 0 and 2',
            'Checkpoints 6, 12, 24, 48, 24, 12, 6 with holds 18, 10, 10, 20, 10, 10, 18 cover 96 frames with one fixed camera',
            'First and last checkpoint PNGs are identical (seam)'],
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

/** Readout equality for a sweep: exact text by default; a spec may supply readout.matches(shown, value) when the runtime's text is not the nominal text. */
const readoutShows = (sweep, shown, value) => sweep.readout.matches ? sweep.readout.matches(shown, value) : shown === sweep.readout.text(value);
/** Generic per-frame checks shared by the capture loop and the offline evidence check. Route invariants live in spec.sweep.check. */
function assertSweepFrame(sample, previous, first, spec) {
    const scheduled = sweepValue(sample.index, spec);
    assert.equal(sample.scheduled, scheduled, `Scheduled target differs from the recorded schedule at frame ${sample.index}`);
    assert.ok(Math.abs(sample.actual.input - scheduled) < 1e-9, `Input value differs from target at frame ${sample.index}`);
    assert.ok(readoutShows(spec.sweep, sample.actual.readout, scheduled), `Graph readout differs from target at frame ${sample.index}`);
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

/** Stepped clips: the samples cover the 96 frames in order, each with its checkpoint, first frame and hold, and all share one camera. */
function assertSteppedSequence(motion, stepped) {
    assert.equal(motion.samples.length,stepped.checkpoints.length,`${motion.id}: wrong number of checkpoints`);
    let firstFrame=0;
    motion.samples.forEach((sample,i)=>{
        assert.equal(sample.checkpoint,stepped.checkpoints[i],`${motion.id}: checkpoint ${i} differs`);
        assert.equal(sample.firstFrame,firstFrame,`${motion.id}: first frame of checkpoint ${i} differs`);
        assert.equal(sample.holdFrames,stepped.holds[i],`${motion.id}: hold of checkpoint ${i} differs`);
        firstFrame+=sample.holdFrames;
        assert.deepEqual(sample.state.box,motion.camera,'Camera changed between exact checkpoints');
    });
    assert.equal(firstFrame,frameCount,`${motion.id}: holds must cover every frame`);
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
        assertSteppedSequence(motion,steppedClips.affine);
        const original=motion.samples[0].state.points;
        assert.equal(original.length,4);
        const center=original.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4}),{x:0,y:0});
        motion.samples.forEach((sample,i)=>{
            assert.equal(sample.state.points.length,4);
            const theta=affineSteps[i]*Math.PI/10;
            original.forEach((p,j)=>{
                near(sample.state.points[j].x,center.x+(p.x-center.x)*Math.cos(theta)-(p.y-center.y)*Math.sin(theta),'Incorrect supported affine rotation');
                near(sample.state.points[j].y,center.y+(p.x-center.x)*Math.sin(theta)+(p.y-center.y)*Math.cos(theta),'Incorrect supported affine rotation');
            });
        });
        assert.notDeepEqual(motion.samples[0].state.paths,motion.samples[3].state.paths);
    } else if(motion.id==='darboux'||motion.id==='definite-integral') {
        assertSteppedSequence(motion,steppedClips[motion.id]);
        motion.samples.forEach(sample=>{
            const label=`${motion.id} checkpoint ${sample.checkpoint}`;
            if(motion.id==='darboux') {
                assert.equal(sample.actions?.length,darbouxPressCount(sample.checkpoint),`${label}: wrong number of 2n presses`);
                assertReadouts(sample.state.readouts,darbouxReadoutExpectation(sample.checkpoint),label);
            } else {
                assert.equal(sample.actions?.at(-1)?.value,sample.checkpoint,`${label}: range did not reach n`);
                assertReadouts(sample.state.readouts,integralReadoutExpectation(sample.checkpoint),label);
            }
        });
        assert.equal(motion.samples.at(-1).capture.sha256,motion.samples[0].capture.sha256,`${motion.id}: last checkpoint PNG differs from the first (seam)`);
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
    // Function graphs in the recipe's coordinate window (darboux, definite-integral) keep that window's unequal unit scales; their camera is checked by box.
    assert.ok(Math.abs(state.scale[0]-state.scale[1])<1e-8 || d.id==='bisection' || ['darboux','definite-integral'].includes(d.id),'Geometric motion must preserve equal unit scales');
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
        const initialReadout=await sweep.readout.read({page,range});
        assert.ok(Math.abs(previousValue-sweep.start)<1e-9 && readoutShows(sweep,initialReadout,sweep.start),`Sweep must start at recipe value ${sweep.start}: input=${previousValue}, readout=${initialReadout}`);
        let previous=null,first=null;
        for(let i=0;i<frameCount;i++) {
            const target=sweepValue(i,spec);
            const steps=Math.round((target-previousValue)/sweep.step);
            if(steps) {
                await range.focus();
                for(let k=0;k<Math.abs(steps);k++)await range.press(steps>0?'ArrowRight':'ArrowLeft');
            }
            await (spec.settle||settle)(page);
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
                strokeWidths:state.strokeWidths,curvePathHash:hash,pathCount:countPaths(state.paths),...(observed?{observed}:{})};
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
        } else if(id==='darboux'||id==='definite-integral') {
            // No supported control lowers n, so every checkpoint opens a fresh route, applies the recipe and then reaches its n through supported controls.
            const stepped=steppedClips[id];
            let firstFrame=0;
            for(let i=0;i<stepped.checkpoints.length;i++) {
                const n=stepped.checkpoints[i];
                const {page,context}=await openRoute(browser,d,baseUrl);
                try {
                    await applyRecipe(page,recipes[id]);
                    const actions=[];
                    if(id==='darboux') {
                        for(let press=0;press<darbouxPressCount(n);press++){const action={kind:'button',label:'Zgosti razdelitev (n → 2n)'};await applyAction(page,action);actions.push(action);}
                    } else {
                        const action={kind:'range',label:'Število podintervalov n',value:n};await applyAction(page,action);actions.push(action);
                    }
                    record({checkpoint:n,actions,...await captureHold(page,d,recipes[id].framing.window,presentBoard,directory,firstFrame,stepped.holds[i])});
                    firstFrame+=stepped.holds[i];
                }finally{await context.close();}
            }
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

module.exports={countPaths,generateMotions,boardSnapshot,screenshotBoard,openRoute,encode,assertMotionEvidence,motionIds,motionSpecs,sweepValue,snapToStep,g1ComputedPoints,assertG1Join,phaseAsPiText,phiReadoutText,alphaParameterizationValue,weightedParameterizationMarkers,deCasteljauLevels,bernsteinPoint,bernsteinDerivativePoint,phOffsetRadii,phOffsetWaypoints,rationalPoint,farinEffectiveWeights,farinWeightText,farinValue,farinPoint,farinParameterTs,sin2OutAndBack,movePhase,complexCaptionLines,complexText,accumulationReference,accumulationReadoutLine,accumulationSnap,formatSlNumber,steppedClips,darbouxReferenceSums,leftRiemannReference,darbouxReadoutExpectation,integralReadoutExpectation,darbouxPressCount};
