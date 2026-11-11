import {describe, expect, test} from 'vitest';
import {eulerPoint, expSeriesPartial} from '../analysis/eulerCircle';
import {
    accelerationScale, ANGLE_RANGE, OMEGA_RANGE, applyEulerCircleAction, DEFAULT_EULER_CIRCLE_STATE, deriveEulerCircle, exactTrig, exactValueOf, insideSeriesView, nextAngle,
    parseEulerCircleState, serializeEulerCircleState, snapDragAngle, typedAngle, typedDegree, typedFlag, typedMode, typedOmega, typedSecondAngle, snapDragSecondAngle, VELOCITY_SCALE,
} from './eulerCircleModel';

const state = DEFAULT_EULER_CIRCLE_STATE;

describe('defaults and parse', () => {
    test('the default is theta = pi/6, omega = 2, N = 5, velocity shown', () => {
        expect(state).toEqual({degrees: 30, omega: 2, degree: 5, velocity: true, acceleration: false, mode: 'motion', b: 45});
        expect(VELOCITY_SCALE).toBe(0.4);
        expect(accelerationScale(2)).toBeCloseTo(0.225, 12);
    });

    test('the drawn acceleration arrow is 0,9 long for every omega: its tip stays on the point side of the centre', () => {
        for (let omega = OMEGA_RANGE.min; omega <= OMEGA_RANGE.max; omega++) {
            const d = deriveEulerCircle({...state, omega, degrees: 135});
            const scale = accelerationScale(omega);
            expect(scale * Math.hypot(d.acceleration.re, d.acceleration.im)).toBeCloseTo(0.9, 12);
            const tip = {re: d.position.re + scale * d.acceleration.re, im: d.position.im + scale * d.acceleration.im};
            expect(tip.re * d.position.re + tip.im * d.position.im).toBeGreaterThan(0); // not past the centre
        }
    });

    test('serialize and parse round trip every state on the corners of the ranges', () => {
        for (const degrees of [0, 1, 359, 360]) {
            for (const omega of [1, 4]) {
                for (const degree of [1, 30]) {
                    const s = {degrees, omega, degree, velocity: degrees % 2 === 0, acceleration: omega === 4, mode: omega === 4 ? 'product' as const : 'motion' as const, b: degrees === 360 ? 0 : 355};
                    expect(parseEulerCircleState(serializeEulerCircleState(s))).toEqual({ok: true, value: s});
                }
            }
        }
    });

    test('unknown fields are dropped; each wrong field is refused with its code, range and step', () => {
        const parsed = parseEulerCircleState({...state, extra: 1});
        expect(parsed).toEqual({ok: true, value: state});
        const err = (patch: Record<string, unknown>) => {
            const r = parseEulerCircleState({...state, ...patch});
            return r.ok ? undefined : r.error;
        };
        expect(parseEulerCircleState(null)).toEqual({ok: false, error: {field: 'state', reason: 'not-an-object'}});
        expect(parseEulerCircleState([1])).toEqual({ok: false, error: {field: 'state', reason: 'not-an-object'}});
        expect(err({degrees: 361})).toEqual({field: 'degrees', reason: 'out-of-range', min: 0, max: 360, step: 1});
        expect(err({degrees: -1})?.reason).toBe('out-of-range');
        expect(err({degrees: 30.5})).toEqual({field: 'degrees', reason: 'off-grid', min: 0, max: 360, step: 1});
        expect(err({degrees: NaN})?.reason).toBe('not-finite');
        expect(err({degrees: '30'})?.reason).toBe('not-finite');
        expect(err({degrees: undefined})?.reason).toBe('missing');
        expect(err({omega: 0})).toEqual({field: 'omega', reason: 'out-of-range', min: 1, max: 4, step: 1});
        expect(err({omega: 5})?.reason).toBe('out-of-range');
        expect(err({degree: 31})).toEqual({field: 'degree', reason: 'out-of-range', min: 1, max: 30, step: 1});
        expect(err({degree: 2.5})?.reason).toBe('off-grid');
        expect(err({velocity: 'yes'})).toEqual({field: 'velocity', reason: 'not-boolean'});
        expect(err({acceleration: undefined})).toEqual({field: 'acceleration', reason: 'missing'});
    });

    test('typed values are refused, never rounded or clamped; -0 is stored as 0', () => {
        expect(typedAngle(360)).toEqual({ok: true, value: 360});
        expect(typedAngle(-0)).toEqual({ok: true, value: 0});
        expect(Object.is((typedAngle(-0) as {value: number}).value, 0)).toBe(true);
        expect(typedAngle(30.4).ok).toBe(false);
        expect(typedAngle(361).ok).toBe(false);
        expect(typedOmega(4.5).ok).toBe(false);
        expect(typedDegree(0).ok).toBe(false);
        expect(typedFlag(1, 'velocity')).toEqual({ok: false, error: {field: 'velocity', reason: 'not-boolean'}});
    });
});

describe('drag snapping', () => {
    test('a dragged point snaps to the nearest whole degree of its direction, whatever its distance', () => {
        const at = (degrees: number, radius = 1) => snapDragAngle(radius * Math.cos(degrees * Math.PI / 180), radius * Math.sin(degrees * Math.PI / 180));
        expect(at(47.3)).toBe(47);
        expect(at(47.6, 3)).toBe(48);
        expect(at(-0.4)).toBe(0);
        expect(at(359.6)).toBe(0);
        expect(at(-30)).toBe(330);
        expect(at(180)).toBe(180);
    });

    test('a non-finite or central position is ignored', () => {
        expect(snapDragAngle(NaN, 1)).toBeUndefined();
        expect(snapDragAngle(1, Infinity)).toBeUndefined();
        expect(snapDragAngle(0, 0)).toBeUndefined();
    });

    test('the playback step goes to the next multiple of 5 and stops at 360', () => {
        expect([0, 3, 5, 358, 360].map(nextAngle)).toEqual([5, 5, 10, 360, 360]);
        expect(ANGLE_RANGE).toEqual({min: 0, max: 360});
    });
});

describe('exact trigonometric values', () => {
    test('defined exactly at the multiples of 30 and 45 degrees and equal to Math.cos and Math.sin to 1e-15', () => {
        for (let d = -720; d <= 720; d++) {
            const exact = exactTrig(d);
            expect(exact !== undefined, `${d}`).toBe(((d % 30) + 30) % 30 === 0 || ((d % 45) + 45) % 45 === 0);
            if (!exact) continue;
            expect(Math.abs(exactValueOf(exact.cos) - Math.cos(d * Math.PI / 180))).toBeLessThan(1e-15);
            expect(Math.abs(exactValueOf(exact.sin) - Math.sin(d * Math.PI / 180))).toBeLessThan(1e-15);
        }
    });

    test('pi/3 is (1/2, sqrt(3)/2) and the axis points are exact integers', () => {
        expect(exactTrig(60)).toEqual({
            cos: {sign: 1, radicand: 1, denominator: 2}, sin: {sign: 1, radicand: 3, denominator: 2},
        });
        expect(exactTrig(225)).toEqual({
            cos: {sign: -1, radicand: 2, denominator: 2}, sin: {sign: -1, radicand: 2, denominator: 2},
        });
        for (const d of [0, 90, 180, 270, 360]) {
            const exact = exactTrig(d)!;
            const p = eulerPoint(d);
            expect(p.exact).toBe(true);
            expect(exactValueOf(exact.cos)).toBe(p.re);
            expect(exactValueOf(exact.sin)).toBe(p.im);
        }
        expect(exactTrig(10)).toBeUndefined();
        expect(exactTrig(30.5)).toBeUndefined();
    });
});

describe('derived numbers', () => {
    test('theta = pi/6, omega = 2: t = pi/12, velocity (-1; 1,7320508), speed 2, perpendicular, acceleration -4z', () => {
        const d = deriveEulerCircle(state);
        expect(d.time).toBeCloseTo(Math.PI / 12, 15);
        expect(d.period).toBeCloseTo(Math.PI, 15);
        expect(d.position.re).toBeCloseTo(0.8660254, 7);
        expect(d.position.im).toBeCloseTo(0.5, 15);
        expect(d.velocity.re).toBeCloseTo(-1, 14);
        expect(d.velocity.im).toBeCloseTo(1.7320508, 7);
        expect(d.acceleration.re).toBeCloseTo(-4 * 0.8660254, 6);
        expect(d.acceleration.im).toBeCloseTo(-2, 14);
        expect(d.speed).toBeCloseTo(2, 14);
        expect(d.angleBetween).toBeCloseTo(90, 12);
        expect(d.positionExact).toBe(false);
    });

    test('the velocity agrees with a central difference of the position (h = 1e-6)', () => {
        const h = 1e-6;
        const at = (t: number) => ({re: Math.cos(2 * t), im: Math.sin(2 * t)});
        const t0 = Math.PI / 12;
        const a = at(t0 + h);
        const b = at(t0 - h);
        const d = deriveEulerCircle(state);
        expect(d.velocity.re).toBeCloseTo((a.re - b.re) / (2 * h), 8);
        expect(d.velocity.im).toBeCloseTo((a.im - b.im) / (2 * h), 8);
    });

    test('at the axes the position, velocity and acceleration are exact integers with no -0', () => {
        const d = deriveEulerCircle({...state, degrees: 180, omega: 3});
        expect(d.positionExact).toBe(true);
        expect(d.position).toEqual({re: -1, im: 0});
        expect(d.velocity).toEqual({re: 0, im: -3});
        expect(d.acceleration).toEqual({re: 9, im: 0});
        expect(Object.is(d.velocity.re, 0)).toBe(true);
        expect(Object.is(d.position.im, 0)).toBe(true);
    });

    test('the partial sum is the kernel recurrence; at theta = pi it is outside the view for N = 1 and within 1e-10 of -1 at N = 21', () => {
        const low = deriveEulerCircle({...state, degrees: 180, degree: 1});
        expect(low.partialSum.im).toBeCloseTo(Math.PI, 14);
        expect(low.partialInsideView).toBe(false);
        const high = deriveEulerCircle({...state, degrees: 180, degree: 21});
        expect(high.partialSum).toEqual(expSeriesPartial(Math.PI, 21));
        expect(high.error).toBeLessThan(1e-10);
        expect(high.error).toBeGreaterThan(0);
        expect(high.partialInsideView).toBe(true);
    });

    test('the view limit is 2,4 on each axis, inclusive', () => {
        expect(insideSeriesView({re: 2.4, im: -2.4})).toBe(true);
        expect(insideSeriesView({re: 2.5, im: 0})).toBe(false);
        expect(insideSeriesView({re: 0, im: -2.5})).toBe(false);
        expect(insideSeriesView({re: 2.9, im: 0})).toBe(false);
    });
});

describe('scene actions', () => {
    test('actions applied one after the other each read the state the previous one wrote', () => {
        let s = state;
        const run = (action: Record<string, unknown>) => {
            const r = applyEulerCircleAction(s, {kind: 'euler-circle', ...action});
            expect(r.ok).toBe(true);
            if (r.ok) s = r.value;
        };
        run({operation: 'set-angle', degrees: 60});
        run({operation: 'set-omega', omega: 3});
        run({operation: 'set-degree', degree: 9});
        run({operation: 'set-vectors', acceleration: true, velocity: false});
        run({operation: 'step', count: 2});
        expect(s).toEqual({degrees: 70, omega: 3, degree: 9, velocity: false, acceleration: true, mode: 'motion', b: 45});
        run({operation: 'step', count: 72});
        expect(s.degrees).toBe(360);
    });

    test('an invalid payload is a content error naming the field, and the state is left alone', () => {
        const bad = (action: unknown) => {
            const r = applyEulerCircleAction(state, action);
            return r.ok ? undefined : r.error;
        };
        expect(bad(null)?.reason).toBe('not-an-object');
        expect(bad({operation: 'spin'})).toEqual({field: 'operation', reason: 'missing'});
        expect(bad({operation: 'set-angle', degrees: 400})?.field).toBe('degrees');
        expect(bad({operation: 'set-omega'})?.reason).toBe('missing');
        expect(bad({operation: 'set-degree', degree: 0})?.reason).toBe('out-of-range');
        expect(bad({operation: 'set-vectors'})?.reason).toBe('missing');
        expect(bad({operation: 'set-vectors', velocity: 'no'})?.reason).toBe('not-boolean');
        expect(bad({operation: 'step', count: 0})?.reason).toBe('out-of-range');
    });
});

describe('product mode', () => {
    test('30 degrees times 45 degrees is (cos 75, sin 75) = (0,2588190; 0,9659258), and the multiplication agrees to 4e-15', () => {
        const d = deriveEulerCircle({...state, degrees: 30, b: 45, mode: 'product'});
        expect(d.product.sumDegrees).toBe(75);
        expect(d.product.point.re).toBeCloseTo(0.258819, 6);
        expect(d.product.point.im).toBeCloseTo(0.9659258, 7);
        expect(d.product.exact).toBeUndefined();
        expect(d.product.pointExact).toBe(false);
    });

    test('the product rule holds on every integer degree and every multiple of 5 of the second angle (4e-15)', () => {
        let worst = 0;
        for (let a = 0; a <= 360; a++) {
            for (let b = 0; b <= 360; b += 5) {
                const p = deriveEulerCircle({...state, degrees: a, b}).product;
                worst = Math.max(worst, Math.hypot(p.point.re - p.byMultiplication.re, p.point.im - p.byMultiplication.im));
            }
        }
        expect(worst).toBeLessThan(4e-15);
    });

    test('e^(i pi) = -1 exactly, the angles add and are reduced modulo 360, exact where exactTrig is exact', () => {
        const pi = deriveEulerCircle({...state, degrees: 180, b: 0}).product;
        expect(pi.point).toEqual({re: -1, im: 0});
        expect(pi.pointExact).toBe(true);
        const wrap = deriveEulerCircle({...state, degrees: 300, b: 90}).product;
        expect([wrap.sumDegrees, wrap.reducedDegrees]).toEqual([390, 30]);
        expect(wrap.exact).toEqual(exactTrig(30));
        const full = deriveEulerCircle({...state, degrees: 360, b: 0}).product;
        expect([full.sumDegrees, full.reducedDegrees, full.point]).toEqual([360, 0, {re: 1, im: 0}]);
    });

    test('the second angle is a multiple of 5 in 0..360: typed values off the grid or the range are refused, a drag snaps', () => {
        expect(typedSecondAngle(355)).toEqual({ok: true, value: 355});
        expect(typedSecondAngle(47)).toEqual({ok: false, error: {field: 'b', reason: 'off-grid', min: 0, max: 360, step: 5}});
        expect(typedSecondAngle(365)).toEqual({ok: false, error: {field: 'b', reason: 'out-of-range', min: 0, max: 360, step: 5}});
        expect(typedSecondAngle(undefined)).toMatchObject({ok: false});
        expect(snapDragSecondAngle(Math.cos(Math.PI * 47 / 180), Math.sin(Math.PI * 47 / 180))).toBe(45);
        expect(snapDragSecondAngle(1, -0.001)).toBe(0);
        expect(snapDragSecondAngle(0, 0)).toBeUndefined();
        expect(typedMode('product')).toEqual({ok: true, value: 'product'});
        expect(typedMode('x')).toMatchObject({ok: false, error: {reason: 'not-mode'}});
    });

    test('parse gives the defaults to a state without the two fields and refuses invalid present ones', () => {
        const {mode, b, ...old} = state;
        expect(mode).toBe('motion');
        expect(b).toBe(45);
        expect(parseEulerCircleState(old)).toEqual({ok: true, value: state});
        expect(parseEulerCircleState({...old, b: 47})).toMatchObject({ok: false, error: {field: 'b', reason: 'off-grid'}});
        expect(parseEulerCircleState({...old, mode: 'both'})).toMatchObject({ok: false, error: {field: 'mode', reason: 'not-mode'}});
    });

    test('scene actions set-b and set-mode apply one after the other, strictly', () => {
        const one = applyEulerCircleAction(state, {operation: 'set-mode', mode: 'product'});
        expect(one).toMatchObject({ok: true, value: {mode: 'product'}});
        if (!one.ok) return;
        expect(applyEulerCircleAction(one.value, {operation: 'set-b', b: 60})).toMatchObject({ok: true, value: {mode: 'product', b: 60}});
        expect(applyEulerCircleAction(one.value, {operation: 'set-b', b: 61})).toMatchObject({ok: false});
        expect(applyEulerCircleAction(one.value, {operation: 'set-mode', mode: 'x'})).toMatchObject({ok: false});
    });
});
