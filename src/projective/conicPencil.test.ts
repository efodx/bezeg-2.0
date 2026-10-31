import {describe, expect, it} from 'vitest';
import {equal, hom, isIdeal, point} from './homogeneous';
import {conic} from './conic';
import {DIRECTION_BOUND, DIRECTION_TABLE, DIRECTION_TABLE_SIZE, secondIntersection} from './conicPencil';

const ellipse = conic(9, 0, 25, 0, 0, -225);
const hyperbola = conic(16, 0, -9, 0, 0, -144);

describe('pencil parameter (ADR 0033 section 2)', () => {
    it('9x^2+25y^2=225, Q0=(5,0), direction (1,m): s = -90/(9+25m^2), point Q0 + s(1,m)', () => {
        for (const m of [-7, -3, -1, 0, 1, 2, 5, 13]) {
            const r = secondIntersection(ellipse, point(5, 0), [1, m]);
            if (r.status !== 'ok' || r.s === null) throw new Error(`expected ok for m=${m}`);
            const den = 9 + 25 * m * m;
            expect(r.s.num * BigInt(den)).toBe(-90n * r.s.den);
            expect(r.s.den > 0n).toBe(true);
            // point = (5 + s, m s), exactly: (5 den - 90, -90 m, den)
            expect(equal(r.point, hom(5 * den - 90, -90 * m, den))).toBe(true);
            expect(r.ideal).toBe(false);
        }
    });

    it('scales with the direction: (p,q) gives s = -90p/(9p^2+25q^2)', () => {
        const r = secondIntersection(ellipse, point(5, 0), [2, 4]);
        if (r.status !== 'ok' || r.s === null) throw new Error('expected ok');
        expect(r.s.num * 436n).toBe(-180n * r.s.den);
    });

    it('s does not depend on the representative of Q0: (10 : 0 : 2) gives the same s as (5, 0)', () => {
        // Direction (1, 1): s = -90/(9 + 25) = -45/17, point (5 - 45/17, -45/17) = (40, -45, 17).
        const r = secondIntersection(ellipse, hom(10, 0, 2), [1, 1]);
        if (r.status !== 'ok' || r.s === null) throw new Error('expected ok');
        expect([r.s.num, r.s.den]).toEqual([-45n, 17n]);
        expect(equal(r.point, hom(40, -45, 17))).toBe(true);
        const neg = secondIntersection(ellipse, hom(-10, 0, -2), [1, 1]);
        expect(neg.status === 'ok' && neg.s !== null && [neg.s.num, neg.s.den]).toEqual([-45n, 17n]);
    });

    it('an ideal Q0 spans the line at infinity with any other direction: the other ideal point, s = null', () => {
        // 16x^2 - 9y^2 = 144 meets the line at infinity in (3 : 4 : 0) and (3 : -4 : 0).
        const r = secondIntersection(hyperbola, hom(3, 4, 0), [1, 0]);
        if (r.status !== 'ok') throw new Error('expected ok');
        expect(r.s).toBeNull();
        expect(r.ideal).toBe(true);
        expect(equal(r.point, hom(3, -4, 0))).toBe(true);
    });

    it('the tangent direction returns Q0 itself', () => {
        const r = secondIntersection(ellipse, point(5, 0), [0, 1]);
        expect(r.status === 'tangent' && equal(r.point, point(5, 0))).toBe(true);
    });

    it('an asymptotic direction gives the ideal point', () => {
        for (const dir of [
            [3, 4],
            [3, -4],
        ] as const) {
            const r = secondIntersection(hyperbola, point(3, 0), dir);
            if (r.status !== 'ok') throw new Error('expected ok');
            expect(r.ideal).toBe(true);
            expect(isIdeal(r.point)).toBe(true);
            expect(r.s).toBeNull();
            expect(equal(r.point, hom(dir[0], dir[1], 0))).toBe(true);
        }
    });

    it('statuses: not on the conic, contained line, degenerate ideal direction', () => {
        expect(secondIntersection(ellipse, point(1, 1), [1, 0]).status).toBe('not-on-conic');
        const pair = conic(0, 1, 0, 0, 0, 0); // xy = 0
        expect(secondIntersection(pair, point(0, 0), [1, 0]).status).toBe('contained');
        expect(secondIntersection(pair, hom(1, 0, 0), [1, 0]).status).toBe('degenerate-direction');
        expect(() => secondIntersection(ellipse, point(5, 0), [0, 0])).toThrow(RangeError);
    });
});

describe('direction table', () => {
    it('exports its size and covers every primitive line direction in the box exactly once', () => {
        expect(DIRECTION_TABLE_SIZE).toBe(DIRECTION_TABLE.length);
        const seen = new Set(DIRECTION_TABLE.map(([p, q]) => `${p},${q}`));
        expect(seen.size).toBe(DIRECTION_TABLE_SIZE);
        const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b));
        let expected = 0;
        for (let p = -DIRECTION_BOUND; p <= DIRECTION_BOUND; p++) {
            for (let q = 0; q <= DIRECTION_BOUND; q++) {
                if (g(p, q) !== 1) continue;
                if (q > 0 || p > 0) {
                    expected++;
                    expect(seen.has(`${p},${q}`)).toBe(true);
                } else {
                    expect(seen.has(`${p},${q}`)).toBe(false);
                }
            }
        }
        expect(DIRECTION_TABLE_SIZE).toBe(expected);
    });

    it('is sorted by angle in [0, pi), so a keyboard step turns the line monotonically', () => {
        for (let i = 1; i < DIRECTION_TABLE.length; i++) {
            const [a, b] = [DIRECTION_TABLE[i - 1], DIRECTION_TABLE[i]];
            expect(Math.atan2(a[1], a[0])).toBeLessThan(Math.atan2(b[1], b[0]));
        }
        expect(DIRECTION_TABLE[0]).toEqual([1, 0]);
    });
});
