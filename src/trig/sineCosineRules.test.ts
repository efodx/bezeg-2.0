import {describe, expect, it} from 'vitest';
import {circumradiusSquared, classifyTriangle} from '../compgeo/triangle';
import {Rational, RationalPoint} from '../compgeo/rational';
import {angleAtAntipode, cosineRule, sineRule, type SineRule} from './sineCosineRules';

const P = (x: number, y: number) => ({x, y});
const proper = (r: ReturnType<typeof sineRule>): SineRule => {
    if (r.kind !== 'proper') throw new Error('expected proper');
    return r;
};

describe('TR3 sine rule via the circumcircle', () => {
    const A = P(0, 0);
    const B = P(7, 0);
    const C = P(2, 4);

    it('default example numbers', () => {
        const r = proper(sineRule(A, B, C));
        expect(r.sides.a).toBeCloseTo(6.40312, 5);
        expect(r.sides.b).toBeCloseTo(4.47214, 5);
        expect(r.sides.c).toBe(7);
        expect((r.angles.A * 180) / Math.PI).toBeCloseTo(63.4349, 4);
        expect((r.angles.B * 180) / Math.PI).toBeCloseTo(38.6598, 4);
        expect((r.angles.C * 180) / Math.PI).toBeCloseTo(77.9052, 4);
        expect(r.r2.equals(Rational.of(205, 16))).toBe(true);
        expect(r.twoR).toBeCloseTo(7.15891, 5);
        for (const ratio of r.ratios) expect(ratio).toBeCloseTo(7.15891, 5);
        expect(r.circumcentre.equals(new RationalPoint(Rational.of(7, 2), Rational.of(3, 4)))).toBe(true);
    });

    it('the antipode A\' = 2O - B is exact and thalesDot at C is exactly 0', () => {
        const r = proper(sineRule(A, B, C));
        expect(r.antipode.equals(new RationalPoint(Rational.of(0), Rational.of(3, 2)))).toBe(true);
        expect(r.thalesAtC.isZero()).toBe(true);
        expect(r.rightAtA).toBe(false);
        const back = angleAtAntipode(r, C, B) as number;
        const target = r.angles.A;
        expect(Math.min(Math.abs(back - target), Math.abs(back - (Math.PI - target)))).toBeLessThan(1e-12);
    });

    it('over a dense grid: ratios equal 2R to 1e-12, R^2 matches circumradiusSquared, thalesDot is 0, angle at A\' is A or pi-A', () => {
        let checked = 0;
        let rightAtA = 0;
        for (let ax = -3; ax <= 3; ax++) for (let ay = -3; ay <= 3; ay++) {
            for (let bx = -3; bx <= 3; bx++) for (let by = -3; by <= 3; by++) {
                for (let cx = -3; cx <= 3; cx += 2) for (let cy = -3; cy <= 3; cy += 2) {
                    const a = P(ax, ay);
                    const b = P(bx, by);
                    const c = P(cx, cy);
                    const res = sineRule(a, b, c);
                    if (res.kind !== 'proper') continue;
                    checked += 1;
                    for (const ratio of res.ratios) expect(Math.abs(ratio - res.twoR) <= 1e-12 * Math.max(1, res.twoR)).toBe(true);
                    const exact = circumradiusSquared(a, b, c);
                    expect(exact.kind === 'value' && exact.value.equals(res.r2)).toBe(true);
                    expect(res.thalesAtC.isZero()).toBe(true);
                    const back = angleAtAntipode(res, c, b);
                    if (res.rightAtA) {
                        rightAtA += 1;
                        expect(back).toBeUndefined();
                        expect(res.antipode.equals(RationalPoint.fromGrid(c))).toBe(true);
                    } else {
                        const d = Math.min(Math.abs((back as number) - res.angles.A), Math.abs((back as number) - (Math.PI - res.angles.A)));
                        expect(d).toBeLessThan(1e-12);
                    }
                }
            }
        }
        expect(checked).toBeGreaterThan(10000);
        expect(rightAtA).toBeGreaterThan(0);
    });

    it('a right angle at A is a status (a is the diameter), not a degenerate triangle', () => {
        const r = proper(sineRule(P(0, 0), P(4, 0), P(0, 3)));
        expect(r.rightAtA).toBe(true);
        expect(r.antipode.equals(new RationalPoint(Rational.of(0), Rational.of(3)))).toBe(true);
        expect(r.sides.a).toBeCloseTo(r.twoR, 12);
        expect(r.thalesAtC.isZero()).toBe(true);
    });

    it('collinear or coincident vertices are degenerate with no numbers', () => {
        expect(sineRule(P(0, 0), P(1, 1), P(2, 2))).toEqual({kind: 'degenerate'});
        expect(sineRule(P(1, 1), P(1, 1), P(3, 0))).toEqual({kind: 'degenerate'});
        expect(sineRule(P(1, 1), P(1, 1), P(1, 1))).toEqual({kind: 'degenerate'});
    });
});

describe('TR4 cosine rule', () => {
    it('default example: c^2 = 49, a^2 + b^2 = 61, CA.CB = 6, cos C = 0.2095', () => {
        const r = cosineRule(P(0, 0), P(7, 0), P(2, 4));
        if (r.kind !== 'proper') throw new Error('expected proper');
        expect([r.c2, r.a2 + r.b2, r.dot, r.correction]).toEqual([49n, 61n, 6n, 12n]);
        expect(r.rhs).toBe(49n);
        expect(r.cosC).toBeCloseTo(0.2095, 4);
        expect(r.shapeAtC).toBe('acute');
    });

    it('right triangle (0,0),(4,0),(0,3): correction 0', () => {
        const r = cosineRule(P(4, 0), P(0, 3), P(0, 0));
        if (r.kind !== 'proper') throw new Error('expected proper');
        expect(r.c2).toBe(25n);
        expect(r.a2 + r.b2).toBe(25n);
        expect(r.correction).toBe(0n);
        expect(r.shapeAtC).toBe('right');
    });

    it('c^2 = a^2 + b^2 - 2 CA.CB is an exact integer equality, and the status is the sign of the dot product', () => {
        let checked = 0;
        const seen = new Set<string>();
        for (let ax = -4; ax <= 4; ax++) for (let ay = -4; ay <= 4; ay += 2) {
            for (let bx = -4; bx <= 4; bx += 2) for (let by = -4; by <= 4; by++) {
                for (let cx = -3; cx <= 3; cx++) for (let cy = -3; cy <= 3; cy++) {
                    const A = P(ax, ay);
                    const B = P(bx, by);
                    const C = P(cx, cy);
                    const r = cosineRule(A, B, C);
                    if (classifyTriangle(A, B, C).kind === 'degenerate') {
                        expect(r).toEqual({kind: 'degenerate'});
                        continue;
                    }
                    if (r.kind !== 'proper') throw new Error('expected proper');
                    checked += 1;
                    expect(r.c2).toBe(r.rhs);
                    expect(r.shapeAtC).toBe(r.dot > 0n ? 'acute' : r.dot === 0n ? 'right' : 'obtuse');
                    // Consistent with the whole-triangle classification: an obtuse angle at C makes the triangle obtuse.
                    if (r.shapeAtC === 'obtuse') expect(r.triangleShape).toBe('obtuse');
                    if (r.shapeAtC === 'right') expect(r.triangleShape).toBe('right');
                    seen.add(r.shapeAtC);
                }
            }
        }
        expect(checked).toBeGreaterThan(20000);
        expect(seen.size).toBe(3);
    });

    it('degenerate vertices give a status and no numbers', () => {
        expect(cosineRule(P(0, 0), P(1, 1), P(2, 2))).toEqual({kind: 'degenerate'});
        expect(cosineRule(P(1, 1), P(1, 1), P(1, 1))).toEqual({kind: 'degenerate'});
    });
});
