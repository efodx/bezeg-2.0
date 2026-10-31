import {describe, expect, it} from 'vitest';
import {quarterEllipseBezier, rationalQuadraticPoint, sampleRationalQuadratic} from '../analysis/conic';
import {conic, type Conic} from './conic';
import {hom} from './homogeneous';
import {rationalArc, type RationalArcResult} from './rationalArc';

// Oracles are the hand-computed K4 numbers (spec K4; task 04): the arc (5,0)-(0,3) of 9x^2 + 25y^2 = 225 has P1 = (5,3),
// w = sqrt(2)/2 (the S6 bridge weight, also read from `quarterEllipseBezier` in src/analysis/conic.ts), Farin points
// (5, 1.2426) and (2.0711, 3); the hyperbola 16x^2 - 9y^2 = 144 from (3,0) to (5,16/3) has P1 = (3,2), w = 2/sqrt(3) and
// denominator zeros -1.366 and 2.366; the parabola y^2 = 4x from (0,0) to (4,4) has P1 = (0,2) and w = 1. Independent
// checks: the unit circle arc from (1,0) to (3/5,4/5) has w = cos(theta/2) with theta = atan2(4,3), so w^2 = 4/5; the
// weight does not depend on which point of the arc is the third point; and the distance of the sampled arc from the
// conic is the first-order distance |F| / |grad F|.

const ellipse = conic(9, 0, 25, 0, 0, -225);
const hyperbola = conic(16, 0, -9, 0, 0, -144);
const parabola = conic(0, 0, 1, -4, 0, 0);
const circle = conic(1, 0, 1, 0, 0, -1);

function ok(r: RationalArcResult) {
    if (r.status !== 'ok') throw new Error(`expected ok, got ${r.status}`);
    return r;
}

/** First-order distance of a point from the conic: |F| / |grad F|, from the float coefficients. */
function distance(c: Conic, x: number, y: number): number {
    const [A, B, C, D, E, F] = c.map(Number);
    const f = A * x * x + B * x * y + C * y * y + D * x + E * y + F;
    const gx = 2 * A * x + B * y + D;
    const gy = B * x + 2 * C * y + E;
    return Math.abs(f) / Math.hypot(gx, gy);
}

function maxDeviation(c: Conic, r: ReturnType<typeof ok>, count = 200): number {
    const [p0, p1, p2] = r.controlPoints;
    let worst = 0;
    for (const p of sampleRationalQuadratic([p0, p1, p2], [r.weights[0], r.weights[1], r.weights[2]], count - 1)) {
        worst = Math.max(worst, distance(c, p.x, p.y));
    }
    return worst;
}

const E_A = hom(5, 0, 1);
const E_B = hom(0, 3, 1);
const E_THIRD = hom(20, 9, 5); // (4, 9/5)

describe('rationalArc: the K4 default ellipse arc', () => {
    const r = ok(rationalArc(ellipse, E_A, E_B, E_THIRD));

    it('acceptance 3: P1 is the pole of the chord, (5,3)', () => {
        expect(r.points[1]).toEqual(hom(5, 3, 1));
        expect(r.controlPoints[0]).toEqual({x: 5, y: 0});
        expect(r.controlPoints[1]).toEqual({x: 5, y: 3});
        expect(r.controlPoints[2]).toEqual({x: 0, y: 3});
    });

    it('acceptance 3: w = sqrt(2)/2 to 1e-12, w^2 = 1/2 exactly, irrational', () => {
        expect(Math.abs(r.weight - Math.SQRT2 / 2)).toBeLessThan(1e-12);
        expect(r.weightSquared).toEqual({num: 1n, den: 2n});
        expect(r.weightExact).toBeNull();
        expect(r.weights).toEqual([1, r.weight, 1]);
    });

    it('acceptance 3: equals the S6 bridge in src/analysis/conic.ts', () => {
        const bridge = quarterEllipseBezier(5, 3);
        expect(Math.abs(r.weight - bridge.weights[1])).toBeLessThan(1e-12);
        expect(r.controlPoints).toEqual(bridge.points);
        // The existing evaluator on the bridge and on this arc agree at every sample.
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const a = rationalQuadraticPoint(bridge.points, bridge.weights, t);
            const b = rationalQuadraticPoint(r.controlPoints as never, r.weights as never, t);
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1e-12);
        }
    });

    it('acceptance 3: Farin points (5, 1.2426), (2.0711, 3) and the shoulder (3.5355, 2.1213)', () => {
        expect(r.farinPoints[0].x).toBeCloseTo(5, 12);
        expect(r.farinPoints[0].y).toBeCloseTo(1.2426, 4);
        expect(r.farinPoints[1].x).toBeCloseTo(2.0711, 4);
        expect(r.farinPoints[1].y).toBeCloseTo(3, 12);
        expect(r.shoulder.x).toBeCloseTo(3.5355, 4);
        expect(r.shoulder.y).toBeCloseTo(2.1213, 4);
        const mid = rationalQuadraticPoint(r.controlPoints as never, r.weights as never, 0.5);
        expect(Math.hypot(mid.x - r.shoulder.x, mid.y - r.shoulder.y)).toBeLessThan(1e-12);
    });

    it('acceptance 3: no denominator zeros for w < 1 (an ellipse arc stays finite)', () => {
        expect(r.denominatorZeros).toEqual([]);
    });

    it('acceptance 4: 200 samples of the evaluated arc lie within 1e-9 of the conic', () => {
        expect(maxDeviation(ellipse, r)).toBeLessThan(1e-9);
    });

    it('another point of the arc gives the same weight', () => {
        const other = ok(rationalArc(ellipse, E_A, E_B, hom(15, 12, 5))); // (3, 12/5)
        expect(other.weightSquared).toEqual({num: 1n, den: 2n});
    });
});

describe('rationalArc: the weight is independent of the third point and of the end order', () => {
    it('hyperbola: two further arc points give the same w^2 = 4/3', () => {
        const a = hom(3, 0, 1);
        const b = hom(15, 16, 3); // (5, 16/3)
        for (const third of [hom(15, 12, 4), hom(87, 80, 21)]) {
            const r = ok(rationalArc(hyperbola, a, b, third));
            expect(r.weightSquared).toEqual({num: 4n, den: 3n});
        }
        const swapped = ok(rationalArc(hyperbola, b, a, hom(15, 12, 4)));
        expect(swapped.weightSquared).toEqual({num: 4n, den: 3n});
        expect(swapped.points[1]).toEqual(hom(3, 2, 1));
        expect(swapped.points[0]).toEqual(b);
    });

    it('circle: the arc (1,0) to (3/5,4/5) has w^2 = 4/5 = cos^2(theta/2)', () => {
        const r = ok(rationalArc(circle, hom(1, 0, 1), hom(3, 4, 5), hom(4, 3, 5)));
        expect(r.weightSquared).toEqual({num: 4n, den: 5n});
        const theta = Math.atan2(4, 3);
        expect(Math.abs(r.weight - Math.cos(theta / 2))).toBeLessThan(1e-14);
        expect(maxDeviation(circle, r)).toBeLessThan(1e-9);
    });
});

describe('rationalArc: the hyperbola and the parabola', () => {
    const a = hom(3, 0, 1);
    const b = hom(15, 16, 3);
    const third = hom(15, 12, 4); // (15/4, 3), on 16x^2 - 9y^2 = 144 between the ends

    it('acceptance 3: P1 = (3,2), w = 2/sqrt(3) > 1', () => {
        const r = ok(rationalArc(hyperbola, a, b, third));
        expect(r.points[1]).toEqual(hom(3, 2, 1));
        expect(Math.abs(r.weight - 2 / Math.sqrt(3))).toBeLessThan(1e-12);
        expect(r.weight).toBeGreaterThan(1);
        expect(r.weightExact).toBeNull();
    });

    it('acceptance 3: the denominator zeros are -1.366 and 2.366, outside [0,1]', () => {
        const r = ok(rationalArc(hyperbola, a, b, third));
        expect(r.denominatorZeros).toHaveLength(2);
        expect(r.denominatorZeros[0]).toBeCloseTo(-1.366, 3);
        expect(r.denominatorZeros[1]).toBeCloseTo(2.366, 3);
        // They really are zeros of the denominator (1-t)^2 + 2 w t (1-t) + t^2.
        for (const t of r.denominatorZeros) {
            expect(Math.abs((1 - t) ** 2 + 2 * r.weight * t * (1 - t) + t * t)).toBeLessThan(1e-12);
        }
    });

    it('acceptance 4: 200 samples stay within 1e-9 of the hyperbola', () => {
        expect(maxDeviation(hyperbola, ok(rationalArc(hyperbola, a, b, third)))).toBeLessThan(1e-9);
    });

    it('acceptance 3: parabola y^2 = 4x gives w = 1 exactly, P1 = (0,2), shoulder (1,2)', () => {
        const r = ok(rationalArc(parabola, hom(0, 0, 1), hom(4, 4, 1), hom(1, 2, 1)));
        expect(r.points[1]).toEqual(hom(0, 2, 1));
        expect(r.weight).toBe(1);
        expect(r.weightSquared).toEqual({num: 1n, den: 1n});
        expect(r.weightExact).toEqual({num: 1n, den: 1n});
        expect(r.denominatorZeros).toEqual([]);
        expect(r.shoulder).toEqual({x: 1, y: 2});
        expect(maxDeviation(parabola, r)).toBeLessThan(1e-9);
    });
});

describe('rationalArc: typed statuses', () => {
    it('acceptance 2: parallel end tangents give split-needed, with no control points or weight', () => {
        // Two ends of a diameter: the chord passes through the centre, so P1 is the point at infinity.
        const r = rationalArc(circle, hom(1, 0, 1), hom(-1, 0, 1), hom(0, 1, 1));
        expect(r).toEqual({status: 'split-needed', reason: 'parallel-tangents'});
        const e = rationalArc(ellipse, hom(5, 0, 1), hom(-5, 0, 1), hom(0, 3, 1));
        expect(e.status).toBe('split-needed');
        // The same holds whatever the third point (even an invalid one) once P1 is ideal.
        expect(rationalArc(circle, hom(1, 0, 1), hom(-1, 0, 1), hom(7, 7, 1)).status).toBe('split-needed');
    });

    it('an ideal end cannot carry weight 1: split-needed', () => {
        const r = rationalArc(hyperbola, hom(3, 4, 0), hom(3, 0, 1), hom(15, 12, 4));
        expect(r).toEqual({status: 'split-needed', reason: 'ideal-end'});
    });

    it('the third point on the complementary arc has no positive weight: complementary-arc', () => {
        expect(rationalArc(ellipse, E_A, E_B, hom(-5, 0, 1)).status).toBe('complementary-arc');
        expect(rationalArc(ellipse, E_A, E_B, hom(-15, 12, 5)).status).toBe('complementary-arc');
    });

    it('ends on different branches of a hyperbola have w^2 < 0: no-real-weight', () => {
        // (3,0) and (-5,16/3) lie on different branches; (5,16/3) is on the branch of the first end.
        expect(rationalArc(hyperbola, hom(3, 0, 1), hom(-15, 16, 3), hom(15, 16, 3)).status).toBe('no-real-weight');
    });

    it('invalid input is typed, never a number', () => {
        expect(rationalArc(ellipse, E_A, E_A, E_B)).toEqual({status: 'invalid', reason: 'coincident-ends'});
        expect(rationalArc(ellipse, hom(10, 0, 2), E_A, E_B)).toEqual({status: 'invalid', reason: 'coincident-ends'});
        expect(rationalArc(ellipse, E_A, E_B, E_A)).toEqual({status: 'invalid', reason: 'third-not-distinct'});
        expect(rationalArc(ellipse, E_A, E_B, E_B)).toEqual({status: 'invalid', reason: 'third-not-distinct'});
        expect(rationalArc(ellipse, E_A, E_B, hom(1, 1, 1))).toEqual({status: 'invalid', reason: 'not-on-conic'});
        expect(rationalArc(ellipse, hom(1, 1, 1), E_B, E_THIRD)).toEqual({status: 'invalid', reason: 'not-on-conic'});
        expect(rationalArc(conic(96, -24, -72, -288, 288, 0), hom(0, 0, 1), hom(1, 1, 1), hom(3, 0, 1))).toEqual({
            status: 'invalid',
            reason: 'degenerate-conic',
        });
        expect(rationalArc(ellipse, E_A, E_B, [0n, 0n, 0n])).toEqual({status: 'invalid', reason: 'zero-triple'});
    });
});
