import {describe, expect, it} from 'vitest';
import {Rational, RationalPoint} from '../rational';
import {SWEEP_MAX_SEGMENTS} from './limits';
import {
    bruteForceIntersections,
    compareAtSweep,
    lowerEndpoint,
    segmentIntersection,
    upperEndpoint,
    type Segment,
} from './segments';

const R = (n: number, d = 1) => Rational.of(n, d);
const P = (xn: number, xd: number, yn: number, yd: number) => new RationalPoint(R(xn, xd), R(yn, yd));
const seg = (ax: number, ay: number, bx: number, by: number): Segment => ({a: {x: ax, y: ay}, b: {x: bx, y: by}});
const fmt = (p: RationalPoint) => `(${p.x.format()},${p.y.format()})`;

/** Spec C2 default example: s0..s3. */
const C2: readonly Segment[] = [seg(0, 0, 6, 4), seg(0, 4, 6, 0), seg(1, -1, 2, 5), seg(4, 5, 5, -1)];

/** The five crossings in event order, with the two segments through each and the spec's order just after the event. */
const C2_CROSSINGS = [
    {at: P(33, 20, 29, 10), left: 2, right: 1}, // s1 s2 -> [2,1,3,0]
    {at: P(87, 20, 29, 10), left: 0, right: 3}, // s0 s3 -> [2,1,0,3]
    {at: P(3, 1, 2, 1), left: 0, right: 1}, // s0 s1 -> [2,0,1,3]
    {at: P(21, 16, 7, 8), left: 0, right: 2}, // s0 s2 -> [0,2,1,3]
    {at: P(75, 16, 7, 8), left: 3, right: 1}, // s1 s3 -> [0,2,3,1]
] as const;

describe('upperEndpoint / lowerEndpoint', () => {
    it('order by the sweep event order: higher first, ties by smaller x', () => {
        expect(upperEndpoint(seg(0, 0, 6, 4))).toEqual({x: 6, y: 4});
        expect(lowerEndpoint(seg(0, 0, 6, 4))).toEqual({x: 0, y: 0});
        expect(upperEndpoint(seg(5, -1, 4, 5))).toEqual({x: 4, y: 5});
        expect(lowerEndpoint(seg(5, -1, 4, 5))).toEqual({x: 5, y: -1});
    });

    it('takes the left endpoint of a horizontal segment as the upper one', () => {
        expect(upperEndpoint(seg(3, 1, -2, 1))).toEqual({x: -2, y: 1});
        expect(lowerEndpoint(seg(3, 1, -2, 1))).toEqual({x: 3, y: 1});
        expect(upperEndpoint(seg(-2, 1, 3, 1))).toEqual({x: -2, y: 1});
    });

    it('takes the higher endpoint of a vertical segment as the upper one', () => {
        expect(upperEndpoint(seg(2, 0, 2, 4))).toEqual({x: 2, y: 4});
        expect(lowerEndpoint(seg(2, 4, 2, 0))).toEqual({x: 2, y: 0});
    });
});

describe('segmentIntersection classification', () => {
    const point = (s: Segment, t: Segment) => {
        const c = segmentIntersection(s, t);
        expect(c.kind).toBe('point');
        return c.kind === 'point' ? fmt(c.point) : '';
    };

    it('finds a proper crossing with exact rational coordinates', () => {
        expect(point(seg(0, 0, 6, 4), seg(1, -1, 2, 5))).toBe('(21/16,7/8)');
        expect(point(seg(0, 0, 4, 4), seg(0, 4, 4, 0))).toBe('(2,2)');
    });

    it('reports none for disjoint segments, including those whose lines cross', () => {
        expect(segmentIntersection(seg(0, 0, 1, 1), seg(3, 0, 0, 3)).kind).toBe('none');
        expect(segmentIntersection(seg(0, 0, 1, 0), seg(2, 0, 3, 0)).kind).toBe('none'); // collinear, apart
        expect(segmentIntersection(seg(0, 0, 4, 0), seg(1, 1, 3, 1)).kind).toBe('none'); // parallel
    });

    it('treats a shared endpoint as a point', () => {
        expect(point(seg(0, 0, 2, 2), seg(2, 2, 4, 0))).toBe('(2,2)');
        expect(point(seg(0, 0, 2, 2), seg(0, 0, 4, 0))).toBe('(0,0)');
    });

    it('treats an endpoint on the interior of the other segment as a point', () => {
        expect(point(seg(0, 0, 4, 0), seg(2, 0, 2, 3))).toBe('(2,0)'); // T contact, horizontal host
        expect(point(seg(2, 3, 2, 0), seg(0, 0, 4, 0))).toBe('(2,0)'); // order of arguments does not matter
        expect(point(seg(0, 0, 4, 4), seg(1, 1, 5, -3))).toBe('(1,1)');
    });

    it('handles vertical segments', () => {
        expect(point(seg(2, 0, 2, 4), seg(0, 2, 4, 2))).toBe('(2,2)');
        expect(point(seg(2, 0, 2, 4), seg(0, 0, 4, 3))).toBe('(2,3/2)');
        expect(segmentIntersection(seg(2, 0, 2, 4), seg(3, 0, 3, 4)).kind).toBe('none');
        expect(segmentIntersection(seg(2, 0, 2, 4), seg(0, 5, 4, 5)).kind).toBe('none');
    });

    it('reports collinear segments sharing positive length as overlap, regardless of direction', () => {
        expect(segmentIntersection(seg(0, 0, 4, 0), seg(2, 0, 6, 0)).kind).toBe('overlap');
        expect(segmentIntersection(seg(4, 0, 0, 0), seg(6, 0, 2, 0)).kind).toBe('overlap');
        expect(segmentIntersection(seg(0, 0, 4, 4), seg(1, 1, 2, 2)).kind).toBe('overlap'); // containment
        expect(segmentIntersection(seg(2, 0, 2, 4), seg(2, 2, 2, 7)).kind).toBe('overlap'); // vertical
        expect(segmentIntersection(seg(0, 0, 4, 4), seg(0, 0, 4, 4)).kind).toBe('overlap'); // identical
    });

    it('reports collinear segments meeting only end to end as a point, not an overlap', () => {
        expect(point(seg(0, 0, 2, 2), seg(2, 2, 5, 5))).toBe('(2,2)');
        expect(point(seg(2, 0, 2, 2), seg(2, 2, 2, 5))).toBe('(2,2)');
    });

    it('treats a zero-length segment as the point it is', () => {
        expect(point(seg(1, 1, 1, 1), seg(0, 0, 2, 2))).toBe('(1,1)');
        expect(segmentIntersection(seg(1, 2, 1, 2), seg(0, 0, 2, 2)).kind).toBe('none');
        expect(point(seg(3, 3, 3, 3), seg(3, 3, 3, 3))).toBe('(3,3)');
        expect(segmentIntersection(seg(3, 3, 3, 3), seg(3, 4, 3, 4)).kind).toBe('none');
    });
});

describe('bruteForceIntersections: C2 default example', () => {
    const result = bruteForceIntersections(C2);

    it('finds the five crossings with exact rationals, in event order, two segments each', () => {
        expect(result.points.map((p) => fmt(p.point))).toEqual(C2_CROSSINGS.map((c) => fmt(c.at)));
        expect(result.points.map((p) => [...p.segments])).toEqual([[1, 2], [0, 3], [0, 1], [0, 2], [1, 3]]);
        expect(result.overlaps).toEqual([]);
    });

    it('leaves the pair s2 s3 unreported: they do not meet', () => {
        expect(segmentIntersection(C2[2], C2[3]).kind).toBe('none');
    });
});

describe('compareAtSweep at the C2 crossings', () => {
    it.each(C2_CROSSINGS.map((c, i) => [i, c] as const))('crossing %i orders the pair as the status after the event', (_i, c) => {
        const {x: x0, y} = c.at;
        const l = C2[c.left];
        const r = C2[c.right];
        expect(compareAtSweep(l, r, y, x0)).toBe(-1);
        expect(compareAtSweep(r, l, y, x0)).toBe(1);
    });

    it('orders the same pair the other way strictly above the crossing (the swap)', () => {
        for (const c of C2_CROSSINGS) {
            const above = c.at.y.add(R(1, 1000));
            const l = C2[c.left];
            const r = C2[c.right];
            expect(compareAtSweep(r, l, above, c.at.x)).toBe(-1);
            expect(compareAtSweep(l, r, above, c.at.x)).toBe(1);
        }
    });

    it('orders by exact x when there is no tie, and is antisymmetric', () => {
        // At y = 4.5 the active segments are s2 (x = 1 + 5.5/6 ...) and s3; s2 is left of s3.
        expect(compareAtSweep(C2[2], C2[3], R(9, 2), R(2))).toBe(-1);
        expect(compareAtSweep(C2[3], C2[2], R(9, 2), R(2))).toBe(1);
        expect(compareAtSweep(C2[0], C2[0], R(1), R(0))).toBe(0);
    });

    it('rejects a segment that does not reach the sweep height', () => {
        expect(() => compareAtSweep(C2[0], C2[2], R(9, 2), R(0))).toThrow(RangeError); // s0 tops out at y = 4
    });
});

describe('degenerate example: four segments through (2,2)', () => {
    const a = seg(0, 0, 4, 4);
    const b = seg(0, 4, 4, 0);
    const c = seg(0, 2, 4, 2);
    const d = seg(2, 0, 2, 4);
    const x0 = R(2);
    const y = R(2);

    it('gives one point with all four segments', () => {
        const result = bruteForceIntersections([a, b, c, d]);
        expect(result.points).toHaveLength(1);
        expect(fmt(result.points[0].point)).toBe('(2,2)');
        expect(result.points[0].segments).toEqual([0, 1, 2, 3]);
        expect(result.overlaps).toEqual([]);
    });

    it('gives one point with three segments without d', () => {
        const result = bruteForceIntersections([a, b, c]);
        expect(result.points.map((p) => [...p.segments])).toEqual([[0, 1, 2]]);
    });

    it('orders the block just below the line: a, d, b, then horizontal c last', () => {
        // Just below y = 2: b has x = 2 + eps, d has x = 2, a has x = 2 - eps, c is horizontal.
        // So left to right just below: a, d, b, and the horizontal c is placed last by rule.
        const all = [a, b, c, d];
        const sorted = [...all].sort((p, q) => compareAtSweep(p, q, y, x0));
        expect(sorted).toEqual([a, d, b, c]);
    });

    it('compares vertical with sloped segments by slope sign and with the horizontal by the horizontal-last rule', () => {
        expect(compareAtSweep(d, a, y, x0)).toBe(1); // a leans right going up: just below, a is left of d
        expect(compareAtSweep(d, b, y, x0)).toBe(-1);
        expect(compareAtSweep(c, d, y, x0)).toBe(1);
        expect(compareAtSweep(c, c, y, x0)).toBe(0);
    });

    it('rejects a horizontal segment that does not contain the event point', () => {
        expect(() => compareAtSweep(c, a, y, R(5))).toThrow(RangeError);
    });
});

/** Segment set with endpoint contact, T contact, collinear overlap and a vertical crossing, checked together. */
describe('bruteForceIntersections: mixed degenerate set', () => {
    const set: Segment[] = [
        seg(0, 0, 4, 0), // 0 horizontal
        seg(2, 0, 2, 3), // 1 vertical, endpoint on the interior of 0
        seg(3, 0, 6, 0), // 2 overlaps 0 on [3,4]
        seg(2, 3, 5, 3), // 3 shares endpoint (2,3) with 1
    ];

    it('classifies every pair', () => {
        const result = bruteForceIntersections(set);
        expect(result.overlaps).toEqual([[0, 2]]);
        expect(result.points.map((p) => [fmt(p.point), [...p.segments]])).toEqual([
            ['(2,3)', [1, 3]],
            ['(2,0)', [0, 1]],
        ]);
    });

    it('lists overlapping partners in a point that a third segment touches', () => {
        // Segments 0 and 1 overlap on [3,4]; a vertical from (3,0) touches both at (3,0).
        const result = bruteForceIntersections([seg(0, 0, 4, 0), seg(3, 0, 6, 0), seg(3, 0, 3, 5)]);
        expect(result.overlaps).toEqual([[0, 1]]);
        expect(result.points.map((p) => [fmt(p.point), [...p.segments]])).toEqual([['(3,0)', [0, 1, 2]]]);
    });
});

// ---------------------------------------------------------------------------------------------------------------
// Random cross-check against an independent parametric solve in rationals (does not call segments.ts).
// ---------------------------------------------------------------------------------------------------------------

type Oracle = { kind: 'none' } | { kind: 'overlap' } | { kind: 'point'; x: Rational; y: Rational };

/** P + t R meets Q + u S: solve the 2x2 system by Cramer's rule, or project onto the common line when parallel. */
function oracle(s: Segment, t: Segment): Oracle {
    const px = R(s.a.x), py = R(s.a.y), rx = R(s.b.x - s.a.x), ry = R(s.b.y - s.a.y);
    const qx = R(t.a.x), qy = R(t.a.y), sx = R(t.b.x - t.a.x), sy = R(t.b.y - t.a.y);
    const det = rx.mul(sy).sub(ry.mul(sx));
    const dx = qx.sub(px), dy = qy.sub(py);
    const inUnit = (v: Rational) => v.compare(R(0)) >= 0 && v.compare(R(1)) <= 0;
    if (!det.isZero()) {
        const tt = dx.mul(sy).sub(dy.mul(sx)).div(det);
        const uu = dx.mul(ry).sub(dy.mul(rx)).div(det);
        if (!inUnit(tt) || !inUnit(uu)) return {kind: 'none'};
        return {kind: 'point', x: px.add(tt.mul(rx)), y: py.add(tt.mul(ry))};
    }
    if (!dx.mul(ry).sub(dy.mul(rx)).isZero()) return {kind: 'none'}; // parallel, different lines
    const rr = rx.mul(rx).add(ry.mul(ry));
    const t0 = dx.mul(rx).add(dy.mul(ry)).div(rr);
    const t1 = t0.add(sx.mul(rx).add(sy.mul(ry)).div(rr));
    const lo0 = t0.compare(t1) <= 0 ? t0 : t1;
    const hi0 = t0.compare(t1) <= 0 ? t1 : t0;
    const lo = lo0.compare(R(0)) >= 0 ? lo0 : R(0);
    const hi = hi0.compare(R(1)) <= 0 ? hi0 : R(1);
    const c = lo.compare(hi);
    if (c > 0) return {kind: 'none'};
    if (c === 0) return {kind: 'point', x: px.add(lo.mul(rx)), y: py.add(lo.mul(ry))};
    return {kind: 'overlap'};
}

/** Deterministic LCG so a failing seed reproduces. */
function rng(seed: number): (n: number) => number {
    let s = seed;
    return (n) => {
        s = (s * 1103515245 + 12345) % 2147483648;
        return Math.floor((s / 2147483648) * n);
    };
}

function randomSet(next: (n: number) => number, count: number, range: number): Segment[] {
    const out: Segment[] = [];
    while (out.length < count) {
        const s = seg(next(range), next(range), next(range), next(range));
        if (s.a.x !== s.b.x || s.a.y !== s.b.y) out.push(s); // non-degenerate, as the lessons require
    }
    return out;
}

function onBoth(s: Segment, p: RationalPoint): boolean {
    const a = RationalPoint.fromGrid(s.a);
    const b = RationalPoint.fromGrid(s.b);
    if (!b.sub(a).cross(p.sub(a)).isZero()) return false;
    const within = (v: Rational, u: Rational, w: Rational) => {
        const [lo, hi] = u.compare(w) <= 0 ? [u, w] : [w, u];
        return lo.compare(v) <= 0 && v.compare(hi) <= 0;
    };
    return within(p.x, a.x, b.x) && within(p.y, a.y, b.y);
}

describe('random grid segment sets', () => {
    it('agrees with the independent parametric solve and puts every point on both segments', () => {
        const next = rng(20261101);
        let points = 0, overlaps = 0, nones = 0;
        for (let trial = 0; trial < 150; trial++) {
            const range = trial % 3 === 0 ? 5 : trial % 3 === 1 ? 9 : 40; // small ranges force degeneracies
            const set = randomSet(next, 2 + next(SWEEP_MAX_SEGMENTS - 1), range);
            expect(set.length).toBeLessThanOrEqual(SWEEP_MAX_SEGMENTS);
            for (let i = 0; i < set.length; i++) {
                for (let j = i + 1; j < set.length; j++) {
                    const got = segmentIntersection(set[i], set[j]);
                    const want = oracle(set[i], set[j]);
                    expect(got.kind, `trial ${trial} pair ${i},${j}`).toBe(want.kind);
                    if (got.kind === 'point' && want.kind === 'point') {
                        expect(got.point.x.equals(want.x) && got.point.y.equals(want.y), `trial ${trial} pair ${i},${j}`).toBe(true);
                        expect(onBoth(set[i], got.point) && onBoth(set[j], got.point)).toBe(true);
                        expect(segmentIntersection(set[j], set[i]).kind).toBe('point');
                        points++;
                    } else if (got.kind === 'overlap') overlaps++;
                    else nones++;
                }
            }
        }
        // The generator must actually exercise every case.
        expect(points).toBeGreaterThan(200);
        expect(overlaps).toBeGreaterThan(0);
        expect(nones).toBeGreaterThan(200);
    });

    it('brute force lists exactly the oracle points, each with exactly the segments through it', () => {
        const next = rng(77);
        for (let trial = 0; trial < 60; trial++) {
            const set = randomSet(next, 2 + next(SWEEP_MAX_SEGMENTS - 1), trial % 2 === 0 ? 5 : 12);
            const result = bruteForceIntersections(set);
            const expectedKeys = new Set<string>();
            const expectedOverlaps: [number, number][] = [];
            for (let i = 0; i < set.length; i++) {
                for (let j = i + 1; j < set.length; j++) {
                    const want = oracle(set[i], set[j]);
                    if (want.kind === 'point') expectedKeys.add(`${want.x.format()},${want.y.format()}`);
                    if (want.kind === 'overlap') expectedOverlaps.push([i, j]);
                }
            }
            expect(new Set(result.points.map((p) => `${p.point.x.format()},${p.point.y.format()}`))).toEqual(expectedKeys);
            expect(result.points).toHaveLength(expectedKeys.size);
            expect(result.overlaps).toEqual(expectedOverlaps);
            for (const p of result.points) {
                expect(p.segments).toEqual(set.flatMap((s, k) => (onBoth(s, p.point) ? [k] : [])));
                expect(p.segments.length).toBeGreaterThanOrEqual(2);
            }
        }
    });
});
