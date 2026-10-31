import {describe, expect, it} from 'vitest';
import {GRID_COORD_LIMIT, type GridPoint} from './grid';
import {INCIRCLE_FAST_LIMIT, incircle, incircleValue, orient} from './predicates';

const P = (x: number, y: number): GridPoint => ({x, y});
const sign = (value: bigint): -1 | 0 | 1 => (value > 0n ? 1 : value < 0n ? -1 : 0);

/**
 * Independent exact reference: circumcentre as a bigint numerator over a common denominator, then squared distances
 * compared (no determinant expansion). With B = b-a, C = c-a, D = 2(Bx Cy - By Cx) and the centre u = N / D relative to
 * a, point q (relative to a) is strictly inside iff |q|^2 - 2 q.u < 0, i.e. D^2 |q|^2 - 2 D (q.N) < 0 (D^2 > 0).
 * The result is +1 inside / -1 outside for counter-clockwise abc (D > 0) and flips for clockwise abc.
 */
function refIncircle(a: GridPoint, b: GridPoint, c: GridPoint, d: GridPoint): -1 | 0 | 1 {
    const [bx, by, cx, cy, qx, qy] = [b.x - a.x, b.y - a.y, c.x - a.x, c.y - a.y, d.x - a.x, d.y - a.y].map(BigInt);
    const D = 2n * (bx * cy - by * cx);
    const b2 = bx * bx + by * by;
    const c2 = cx * cx + cy * cy;
    const Nx = cy * b2 - by * c2;
    const Ny = bx * c2 - cx * b2;
    const insideness = D * D * (qx * qx + qy * qy) - 2n * D * (qx * Nx + qy * Ny); // < 0 strictly inside
    const ccwSide = sign(-insideness);
    return D > 0n ? ccwSide : ccwSide === 0 ? 0 : ccwSide === 1 ? -1 : 1;
}

/** The same cofactor expansion in plain doubles, used to show that doubles lose exactness above the bound. */
function naiveDouble(a: GridPoint, b: GridPoint, c: GridPoint, d: GridPoint): number {
    const ax = a.x - d.x, ay = a.y - d.y, bx = b.x - d.x, by = b.y - d.y, cx = c.x - d.x, cy = c.y - d.y;
    return (ax * ax + ay * ay) * (bx * cy - by * cx)
        - (bx * bx + by * by) * (ax * cy - ay * cx)
        + (cx * cx + cy * cy) * (ax * by - ay * bx);
}

/** Deterministic generator so the sweep is reproducible. */
function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
}

function randomPoints(rand: () => number, range: number, count: number): GridPoint[] {
    const coord = () => Math.round((rand() * 2 - 1) * range);
    return Array.from({length: count}, () => P(coord(), coord()));
}

describe('incircle sample values (spec B3 example 1)', () => {
    const a = P(0, 0), b = P(4, 0), c = P(5, 3), d = P(0, 2);

    it('d is strictly inside the circle through abc: +64', () => {
        expect(incircleValue(a, b, c, d)).toBe(64n);
        expect(incircle(a, b, c, d)).toBe(1);
    });

    it('the mirror test of the other triangle (acd against b) is +64: ac is illegal from both sides', () => {
        expect(incircleValue(a, c, d, b)).toBe(64n);
    });

    it('after the flip to bd both counter-clockwise tests are -64', () => {
        expect(orient(a, b, d)).toBe(1);
        expect(orient(b, c, d)).toBe(1);
        expect(incircleValue(a, b, d, c)).toBe(-64n);
        expect(incircleValue(b, c, d, a)).toBe(-64n);
        expect(incircle(a, b, d, c)).toBe(-1);
        expect(incircle(b, c, d, a)).toBe(-1);
    });
});

describe('incircle cocircular quadruples are 0', () => {
    it('unit square', () => {
        const [a, b, c, d] = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
        expect(incircleValue(a, b, c, d)).toBe(0n);
        expect(incircle(a, b, c, d)).toBe(0);
    });

    it('symmetric trapezoid', () => {
        const [a, b, c, d] = [P(0, 0), P(8, 0), P(9, 5), P(-1, 5)];
        expect(incircleValue(a, b, c, d)).toBe(0n);
        expect(incircle(a, b, c, d)).toBe(0);
    });

    it('a square at the grid limit (BigInt path) is cocircular too', () => {
        const h = GRID_COORD_LIMIT;
        const [a, b, c, d] = [P(-h, -h), P(h, -h), P(h, h), P(-h, h)];
        expect(incircleValue(a, b, c, d)).toBe(0n);
        expect(incircle(a, b, c, d)).toBe(0);
    });
});

describe('incircle symmetries', () => {
    const cases: [GridPoint, GridPoint, GridPoint, GridPoint][] = [
        [P(0, 0), P(4, 0), P(5, 3), P(0, 2)],
        [P(-3, 2), P(7, -1), P(4, 9), P(1, 1)],
        [P(-3000, 2000), P(7000, -1000), P(4000, 9000), P(100, 100)], // above 2^11
        [P(-GRID_COORD_LIMIT, 5), P(GRID_COORD_LIMIT, -7), P(3, GRID_COORD_LIMIT), P(-9, -12)],
    ];

    it.each(cases)('clockwise abc negates the sign, a swap negates the value, rotation keeps it (%j)', (a, b, c, d) => {
        expect(orient(a, b, c)).not.toBe(0);
        const value = incircleValue(a, b, c, d);
        expect(value).not.toBe(0n);
        expect(incircleValue(a, c, b, d)).toBe(-value);
        expect(incircleValue(c, b, a, d)).toBe(-value);
        expect(incircleValue(b, a, c, d)).toBe(-value);
        expect(incircleValue(b, c, a, d)).toBe(value);
        expect(incircleValue(c, a, b, d)).toBe(value);
        expect(incircle(a, c, b, d)).toBe(-incircle(a, b, c, d));
    });
});

describe('incircle against the exact rational reference', () => {
    const ranges = [3, 40, INCIRCLE_FAST_LIMIT - 1, INCIRCLE_FAST_LIMIT, INCIRCLE_FAST_LIMIT + 1, 2 ** 13, 2 ** 18, GRID_COORD_LIMIT];

    it.each(ranges)('random quadruples with |c| <= %i agree with the reference', range => {
        const rand = lcg(1000 + range);
        const points = randomPoints(rand, range, 4 * 400);
        for (let i = 0; i < points.length; i += 4) {
            const [a, b, c, d] = points.slice(i, i + 4);
            if (orient(a, b, c) === 0) {
                expect(() => incircle(a, b, c, d)).toThrow(RangeError);
                continue;
            }
            const expected = refIncircle(a, b, c, d);
            expect(incircle(a, b, c, d), JSON.stringify([a, b, c, d])).toBe(expected);
            expect(sign(incircleValue(a, b, c, d))).toBe(expected);
        }
    });

    it('exhaustive small grid: every d around fixed triangles, both orientations', () => {
        const triangles: [GridPoint, GridPoint, GridPoint][] = [
            [P(0, 0), P(4, 0), P(5, 3)],
            [P(-2, -1), P(3, -2), P(0, 4)],
            [P(0, 0), P(3, 1), P(1, 3)],
        ];
        for (const [a, b, c] of triangles) {
            for (let x = -8; x <= 8; x++) {
                for (let y = -8; y <= 8; y++) {
                    const d = P(x, y);
                    expect(incircle(a, b, c, d)).toBe(refIncircle(a, b, c, d));
                    expect(incircle(a, c, b, d)).toBe(refIncircle(a, c, b, d));
                }
            }
        }
    });

    it('a cocircular square slid across the fast-path bound keeps the value exactly 0', () => {
        for (let shift = INCIRCLE_FAST_LIMIT - 4; shift <= INCIRCLE_FAST_LIMIT + 4; shift++) {
            const q = [P(0, 0), P(2, 0), P(2, 2), P(0, 2)].map(p => P(p.x + shift, p.y));
            expect(incircleValue(q[0], q[1], q[2], q[3])).toBe(0n);
            expect(incircle(q[0], q[1], q[2], q[3])).toBe(0);
        }
    });

    it('the sample is translation invariant across the fast-path bound', () => {
        for (const shift of [0, INCIRCLE_FAST_LIMIT - 5, INCIRCLE_FAST_LIMIT - 1, INCIRCLE_FAST_LIMIT, INCIRCLE_FAST_LIMIT + 1]) {
            const [a, b, c, d] = [P(shift, 0), P(shift + 4, 0), P(shift + 5, 3), P(shift, 2)];
            expect(incircleValue(a, b, c, d)).toBe(64n);
            expect(incircle(a, b, c, d)).toBe(1);
        }
    });
});

describe('incircle fast path and BigInt fallback', () => {
    // Coordinates in (2^12, 2^13]: the double expansion rounds here, so a fast-path bound above 2^12 returns the wrong
    // value (found by search; exact 89510125238, the rounded double expansion gives 89510125240).
    const crafted: [GridPoint, GridPoint, GridPoint, GridPoint] = [P(-7514, -4492), P(6237, -4157), P(-6616, -6120), P(6467, -266)];

    it('doubles lose exactness above the bound while incircleValue stays exact', () => {
        const [a, b, c, d] = crafted;
        expect(BigInt(naiveDouble(a, b, c, d))).not.toBe(89510125238n);
        expect(incircleValue(a, b, c, d)).toBe(89510125238n);
        expect(incircleValue(b, c, a, d)).toBe(89510125238n);
    });

    it('a value beyond 2^53 is exact, so the BigInt path ran above the bound', () => {
        const a = P(GRID_COORD_LIMIT, 1), b = P(-GRID_COORD_LIMIT, 3), c = P(7, -GRID_COORD_LIMIT), d = P(11, 13);
        const value = incircleValue(a, b, c, d);
        expect(value > 2n ** 100n).toBe(true);
        expect(Number.isSafeInteger(Number(value))).toBe(false);
        // The same determinant by the first-row cofactor expansion, independent of the code's lift-column order.
        const [ax, ay, bx, by, cx, cy] = [a.x - d.x, a.y - d.y, b.x - d.x, b.y - d.y, c.x - d.x, c.y - d.y].map(BigInt);
        const [la, lb, lc] = [ax * ax + ay * ay, bx * bx + by * by, cx * cx + cy * cy];
        const det = ax * (by * lc - lb * cy) - ay * (bx * lc - lb * cx) + la * (bx * cy - by * cx);
        expect(value).toBe(det);
    });

    it('the double path is exact at the extreme corners of the 2^11 box', () => {
        const h = INCIRCLE_FAST_LIMIT;
        const corners = [P(-h, -h), P(h, -h), P(h, h), P(-h, h)];
        expect(incircleValue(corners[0], corners[1], corners[2], corners[3])).toBe(0n);
        const [a, b, c, d] = [P(-h, -h), P(h, -h), P(h, h - 1), P(-h, h)];
        const naive = naiveDouble(a, b, c, d);
        expect(Number.isSafeInteger(naive)).toBe(true);
        expect(incircleValue(a, b, c, d)).toBe(BigInt(naive));
        expect(incircle(a, b, c, d)).toBe(refIncircle(a, b, c, d));
    });
});

describe('incircle input validation', () => {
    const [a, b, c, d] = [P(0, 0), P(4, 0), P(5, 3), P(0, 2)];

    it('collinear a, b, c throws a RangeError (no circle)', () => {
        expect(() => incircle(P(0, 0), P(1, 1), P(2, 2), d)).toThrow(RangeError);
        expect(() => incircle(P(0, 0), P(0, 0), P(2, 2), d)).toThrow(RangeError);
        expect(() => incircle(P(-GRID_COORD_LIMIT, 0), P(0, 0), P(GRID_COORD_LIMIT, 0), d)).toThrow(RangeError);
    });

    it('non-grid input throws as orient does, for every argument', () => {
        const bad = [P(0.5, 0), P(Number.NaN, 0), P(0, Infinity), P(GRID_COORD_LIMIT + 1, 0), P(2 ** 53, 0)];
        for (const p of bad) {
            expect(() => orient(p, b, c)).toThrow(RangeError);
            expect(() => incircle(p, b, c, d)).toThrow(RangeError);
            expect(() => incircle(a, p, c, d)).toThrow(RangeError);
            expect(() => incircle(a, b, p, d)).toThrow(RangeError);
            expect(() => incircle(a, b, c, p)).toThrow(RangeError);
            expect(() => incircleValue(a, b, c, p)).toThrow(RangeError);
        }
    });

    it('incircleValue itself does not reject collinear a, b, c (only incircle does)', () => {
        expect(typeof incircleValue(P(0, 0), P(1, 1), P(2, 2), P(0, 1))).toBe('bigint');
    });
});
