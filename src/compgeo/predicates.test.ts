import {GRID_COORD_LIMIT, type GridPoint} from './grid';
import {onSegment, orient, orientValue, polygonSimplicity, segmentIntersection} from './predicates';

const P = (x: number, y: number): GridPoint => ({x, y});

/** Independent BigInt determinant, written as the expanded polynomial rather than the product-of-differences form. */
function refOrient(a: GridPoint, b: GridPoint, c: GridPoint): bigint {
    const [ax, ay, bx, by, cx, cy] = [a.x, a.y, b.x, b.y, c.x, c.y].map(BigInt);
    return ax * by - ay * bx + bx * cy - by * cx + cx * ay - cy * ax;
}

function refSign(value: bigint): -1 | 0 | 1 {
    return value > 0n ? 1 : value < 0n ? -1 : 0;
}

/** Deterministic pseudo-random generator so failures are reproducible. */
function mulberry32(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('orientValue / orient', () => {
    it('equals the BigInt reference for every triple on [-3,3]^2', () => {
        const points: GridPoint[] = [];
        for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) points.push(P(x, y));
        let count = 0;
        for (const a of points) for (const b of points) for (const c of points) {
            const expected = refOrient(a, b, c);
            if (BigInt(orientValue(a, b, c)) !== expected || orient(a, b, c) !== refSign(expected)) {
                throw new Error(`mismatch at ${JSON.stringify([a, b, c])}`);
            }
            count++;
        }
        expect(count).toBe(49 ** 3);
    });

    it('equals the BigInt reference for random triples near the coordinate bound', () => {
        const random = mulberry32(2025);
        const near = () => {
            const offset = Math.floor(random() * 64);
            return (random() < 0.5 ? -1 : 1) * (GRID_COORD_LIMIT - offset);
        };
        for (let k = 0; k < 20000; k++) {
            const a = P(near(), near());
            const b = P(near(), near());
            const c = P(near(), near());
            const expected = refOrient(a, b, c);
            expect(BigInt(orientValue(a, b, c))).toBe(expected);
            expect(orient(a, b, c)).toBe(refSign(expected));
        }
    });

    it('negates when two arguments are swapped, and is invariant under cyclic rotation', () => {
        const random = mulberry32(7);
        const coord = () => Math.floor(random() * 2 * GRID_COORD_LIMIT) - GRID_COORD_LIMIT;
        for (let k = 0; k < 2000; k++) {
            const a = P(coord(), coord());
            const b = P(coord(), coord());
            const c = P(coord(), coord());
            const v = orientValue(a, b, c);
            expect(orientValue(b, a, c)).toBe(-v + 0);
            expect(orientValue(a, c, b)).toBe(-v + 0);
            expect(orientValue(c, b, a)).toBe(-v + 0);
            expect(orientValue(b, c, a)).toBe(v);
            expect(orientValue(c, a, b)).toBe(v);
        }
    });

    it('is exact with all coordinates at +-2^25', () => {
        const L = GRID_COORD_LIMIT;
        const corners = [P(-L, -L), P(L, -L), P(L, L), P(-L, L)];
        for (const a of corners) for (const b of corners) for (const c of corners) {
            expect(BigInt(orientValue(a, b, c))).toBe(refOrient(a, b, c));
        }
        // Largest possible magnitude: twice the area of a right triangle spanning the full square is (2L)^2 = 2^52.
        expect(orientValue(P(-L, -L), P(L, -L), P(L, L))).toBe(2 ** 52);
        expect(orientValue(P(-L, -L), P(L, L), P(L, -L))).toBe(-(2 ** 52));
        // Near-collinear at the bound: a slope-one line with one point nudged by one unit.
        expect(orientValue(P(-L, -L), P(L, L), P(L - 1, L))).toBe(2 * L);
        expect(orient(P(-L, -L), P(L, L), P(0, 0))).toBe(0);
    });

    it('returns +0, not -0', () => {
        expect(Object.is(orientValue(P(0, 0), P(1, 0), P(2, 0)), 0)).toBe(true);
        expect(Object.is(orientValue(P(0, 0), P(-1, 0), P(2, 0)), 0)).toBe(true);
    });

    it('rejects points outside the exact grid', () => {
        const ok = P(0, 0);
        const bad: GridPoint[] = [
            P(GRID_COORD_LIMIT + 1, 0), P(0, -GRID_COORD_LIMIT - 1), P(0.5, 0), P(0, NaN), P(Infinity, 0),
            P(2 ** 53, 0),
        ];
        for (const b of bad) {
            expect(() => orientValue(b, ok, ok)).toThrow(RangeError);
            expect(() => orientValue(ok, b, ok)).toThrow(RangeError);
            expect(() => orientValue(ok, ok, b)).toThrow(RangeError);
            expect(() => orient(ok, ok, b)).toThrow(RangeError);
        }
        expect(() => orientValue(P(GRID_COORD_LIMIT, 0), ok, ok)).not.toThrow();
    });

    it('reproduces the lesson A1 values for p=(0,0), q=(4,0)', () => {
        const p = P(0, 0);
        const q = P(4, 0);
        expect(orientValue(p, q, P(3, 2))).toBe(8);
        expect(orientValue(p, q, P(3, -2))).toBe(-8);
        expect(orientValue(p, q, P(2, 0))).toBe(0);
        expect(orient(p, q, P(3, 2))).toBe(1);
        expect(orient(p, q, P(3, -2))).toBe(-1);
        expect(orient(p, q, P(2, 0))).toBe(0);
    });
});

// ----- Brute-force rational reference for segments ---------------------------------------------------------------

type Ref = 'none' | 'proper' | 'touch' | 'overlap';

const cross = (ux: bigint, uy: bigint, vx: bigint, vy: bigint) => ux * vy - uy * vx;
const dot = (ux: bigint, uy: bigint, vx: bigint, vy: bigint) => ux * vx + uy * vy;
const big = (p: GridPoint) => [BigInt(p.x), BigInt(p.y)] as const;

/** Point on a closed segment: collinear and the projection parameter lies in [0, |b-a|^2] (a = b allowed). */
function refPointOnSegment(p: GridPoint, a: GridPoint, b: GridPoint): boolean {
    const [px, py] = big(p);
    const [ax, ay] = big(a);
    const [bx, by] = big(b);
    if (ax === bx && ay === by) return px === ax && py === ay;
    if (cross(bx - ax, by - ay, px - ax, py - ay) !== 0n) return false;
    const t = dot(px - ax, py - ay, bx - ax, by - ay);
    return t >= 0n && t <= dot(bx - ax, by - ay, bx - ax, by - ay);
}

/** Solves a + t r = c + u s with exact rationals t = tn/den, u = un/den (no floating point, no orient/onSegment). */
function refIntersection(a: GridPoint, b: GridPoint, c: GridPoint, d: GridPoint): Ref {
    const [ax, ay] = big(a);
    const [bx, by] = big(b);
    const [cx, cy] = big(c);
    const [dx, dy] = big(d);
    const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
    const abPoint = rx === 0n && ry === 0n;
    const cdPoint = sx === 0n && sy === 0n;
    if (abPoint && cdPoint) return ax === cx && ay === cy ? 'touch' : 'none';
    if (abPoint) return refPointOnSegment(a, c, d) ? 'touch' : 'none';
    if (cdPoint) return refPointOnSegment(c, a, b) ? 'touch' : 'none';
    const den = cross(rx, ry, sx, sy);
    if (den !== 0n) {
        let tn = cross(cx - ax, cy - ay, sx, sy);
        let un = cross(cx - ax, cy - ay, rx, ry);
        let dd = den;
        if (dd < 0n) { dd = -dd; tn = -tn; un = -un; }
        if (tn < 0n || tn > dd || un < 0n || un > dd) return 'none';
        return tn > 0n && tn < dd && un > 0n && un < dd ? 'proper' : 'touch';
    }
    if (cross(cx - ax, cy - ay, rx, ry) !== 0n) return 'none'; // parallel, distinct lines
    const length2 = dot(rx, ry, rx, ry);
    const uc = dot(cx - ax, cy - ay, rx, ry);
    const ud = dot(dx - ax, dy - ay, rx, ry);
    const lo = uc < ud ? (uc > 0n ? uc : 0n) : (ud > 0n ? ud : 0n);
    const hi = uc < ud ? (ud < length2 ? ud : length2) : (uc < length2 ? uc : length2);
    return lo > hi ? 'none' : lo === hi ? 'touch' : 'overlap';
}

function gridPoints(min: number, max: number): GridPoint[] {
    const points: GridPoint[] = [];
    for (let x = min; x <= max; x++) for (let y = min; y <= max; y++) points.push(P(x, y));
    return points;
}

describe('onSegment', () => {
    it('matches the rational reference for every point and segment on [-1,2]^2, including a = b', () => {
        const points = gridPoints(-1, 2);
        let onCount = 0;
        for (const p of points) for (const a of points) for (const b of points) {
            const expected = refPointOnSegment(p, a, b);
            if (onSegment(p, a, b) !== expected) throw new Error(`mismatch ${JSON.stringify([p, a, b])}`);
            if (expected) onCount++;
        }
        expect(onCount).toBeGreaterThan(0);
    });

    it('includes endpoints, excludes collinear points beyond the ends', () => {
        expect(onSegment(P(0, 0), P(0, 0), P(4, 4))).toBe(true);
        expect(onSegment(P(4, 4), P(0, 0), P(4, 4))).toBe(true);
        expect(onSegment(P(2, 2), P(0, 0), P(4, 4))).toBe(true);
        expect(onSegment(P(5, 5), P(0, 0), P(4, 4))).toBe(false);
        expect(onSegment(P(-1, -1), P(0, 0), P(4, 4))).toBe(false);
        expect(onSegment(P(2, 3), P(0, 0), P(4, 4))).toBe(false);
        expect(onSegment(P(3, 3), P(3, 3), P(3, 3))).toBe(true);
        expect(onSegment(P(3, 4), P(3, 3), P(3, 3))).toBe(false);
    });

    it('rejects non-grid points', () => {
        expect(() => onSegment(P(0.5, 0), P(0, 0), P(1, 1))).toThrow(RangeError);
        expect(() => onSegment(P(0, 0), P(GRID_COORD_LIMIT + 1, 0), P(1, 1))).toThrow(RangeError);
    });
});

describe('segmentIntersection', () => {
    it('matches the rational reference for all segment pairs on [0,3]^2 and is symmetric', () => {
        const points = gridPoints(0, 3);
        const tally: Record<Ref, number> = {none: 0, proper: 0, touch: 0, overlap: 0};
        for (const a of points) for (const b of points) for (const c of points) for (const d of points) {
            const expected = refIntersection(a, b, c, d);
            const actual = segmentIntersection(a, b, c, d);
            if (actual !== expected
                || segmentIntersection(c, d, a, b) !== expected
                || segmentIntersection(b, a, d, c) !== expected) {
                throw new Error(`mismatch ${JSON.stringify([a, b, c, d])}: ${actual} vs ${expected}`);
            }
            tally[expected]++;
        }
        // The sweep must actually exercise every outcome.
        expect(tally.none).toBeGreaterThan(0);
        expect(tally.proper).toBeGreaterThan(0);
        expect(tally.touch).toBeGreaterThan(0);
        expect(tally.overlap).toBeGreaterThan(0);
    });

    it('classifies named configurations', () => {
        expect(segmentIntersection(P(0, 0), P(4, 4), P(0, 4), P(4, 0))).toBe('proper');
        expect(segmentIntersection(P(0, 0), P(4, 0), P(2, 0), P(2, 3))).toBe('touch'); // T junction
        expect(segmentIntersection(P(0, 0), P(2, 2), P(2, 2), P(4, 0))).toBe('touch'); // shared endpoint
        expect(segmentIntersection(P(0, 0), P(2, 0), P(2, 0), P(4, 0))).toBe('touch'); // collinear, end to end
        expect(segmentIntersection(P(0, 0), P(3, 0), P(2, 0), P(5, 0))).toBe('overlap');
        expect(segmentIntersection(P(0, 0), P(4, 0), P(1, 0), P(2, 0))).toBe('overlap'); // containment
        expect(segmentIntersection(P(0, 0), P(2, 0), P(3, 0), P(5, 0))).toBe('none'); // collinear, gap
        expect(segmentIntersection(P(0, 0), P(4, 0), P(0, 1), P(4, 1))).toBe('none'); // parallel
        expect(segmentIntersection(P(0, 0), P(1, 1), P(3, 0), P(0, 3))).toBe('none'); // lines cross outside
        expect(segmentIntersection(P(2, 2), P(2, 2), P(0, 0), P(4, 4))).toBe('touch'); // zero length on segment
        expect(segmentIntersection(P(2, 3), P(2, 3), P(0, 0), P(4, 4))).toBe('none');
        expect(segmentIntersection(P(1, 1), P(1, 1), P(1, 1), P(1, 1))).toBe('touch');
        expect(segmentIntersection(P(1, 1), P(1, 1), P(2, 2), P(2, 2))).toBe('none');
    });

    it('agrees with the reference for large segments at the coordinate bound', () => {
        const L = GRID_COORD_LIMIT;
        const cases: [GridPoint, GridPoint, GridPoint, GridPoint][] = [
            [P(-L, -L), P(L, L), P(-L, L), P(L, -L)],
            [P(-L, -L), P(L, L), P(-L, -L + 1), P(L, L)],
            [P(-L, -L), P(L - 1, L), P(L - 1, L), P(L, L)],
            [P(-L, -L), P(L - 1, L), P(-L, -L + 1), P(L, L)],
            [P(-L, -L), P(L, L), P(L - 1, L), P(L, L - 1)],
            [P(-L, -L), P(L, L), P(0, 0), P(L, L)],
        ];
        for (const [a, b, c, d] of cases) expect(segmentIntersection(a, b, c, d)).toBe(refIntersection(a, b, c, d));
        expect(segmentIntersection(...cases[0])).toBe('proper');
        expect(segmentIntersection(...cases[2])).toBe('touch');
        expect(refIntersection(...cases[3])).toBe('proper'); // nearly parallel, yet they do cross
        expect(segmentIntersection(...cases[3])).toBe('proper');
        expect(segmentIntersection(P(-L, -L), P(L - 1, L), P(L, -L), P(L, L))).toBe('none');
        expect(segmentIntersection(...cases[5])).toBe('overlap');
    });

    it('rejects non-grid points', () => {
        expect(() => segmentIntersection(P(0, 0), P(1, 1), P(0, 1), P(NaN, 0))).toThrow(RangeError);
    });
});

describe('polygonSimplicity', () => {
    it('accepts a square and the notched pentagon', () => {
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(4, 4), P(0, 4)], true)).toEqual({simple: true});
        expect(polygonSimplicity([P(0, 0), P(6, 0), P(6, 4), P(3, 2), P(0, 4)], true)).toEqual({simple: true});
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(2, 3)], true)).toEqual({simple: true});
    });

    it('rejects a bow-tie and a pentagram, naming the crossing edges', () => {
        expect(polygonSimplicity([P(0, 0), P(2, 2), P(2, 0), P(0, 2)], true)).toEqual({simple: false, edges: [0, 2]});
        const pentagram = [P(3, 6), P(1, 0), P(6, 4), P(0, 4), P(5, 0)];
        expect(polygonSimplicity(pentagram, true)).toEqual({simple: false, edges: [0, 2]});
    });

    it('rejects a polygon that doubles back along an edge', () => {
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(2, 0)], true)).toEqual({simple: false, edges: [0, 1]});
        // Doubling back at the closing corner (edges n-1 and 0 are adjacent).
        expect(polygonSimplicity([P(2, 0), P(4, 0), P(4, 3), P(6, 0)], true)).toEqual({simple: false, edges: [0, 3]});
    });

    it('rejects a vertex touching a non-adjacent edge', () => {
        // Vertex (2,0) lies in the interior of edge 0.
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(4, 3), P(2, 0), P(0, 3)], true))
            .toEqual({simple: false, edges: [0, 2]});
    });

    it('rejects repeated consecutive vertices, including across the closing edge', () => {
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(4, 0), P(4, 4), P(0, 4)], true))
            .toEqual({simple: false, edges: [1, 1]});
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(4, 4), P(0, 4), P(0, 0)], true))
            .toEqual({simple: false, edges: [4, 4]});
        expect(polygonSimplicity([P(0, 0), P(0, 0)], false)).toEqual({simple: false, edges: [0, 0]});
    });

    it('rejects a closed polygon with fewer than three vertices', () => {
        expect(polygonSimplicity([], true).simple).toBe(false);
        expect(polygonSimplicity([P(0, 0)], true).simple).toBe(false);
        expect(polygonSimplicity([P(0, 0), P(3, 3)], true).simple).toBe(false);
    });

    it('checks an open chain as a polyline', () => {
        expect(polygonSimplicity([], false)).toEqual({simple: true});
        expect(polygonSimplicity([P(1, 1)], false)).toEqual({simple: true});
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(4, 4), P(0, 4)], false)).toEqual({simple: true});
        // The closing segment is not checked for an open chain: as a polygon this vertex list would be non-simple.
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(4, 4), P(0, 4), P(0, 1)], false)).toEqual({simple: true});
        expect(polygonSimplicity([P(0, 0), P(4, 4), P(4, 0), P(0, 4)], false)).toEqual({simple: false, edges: [0, 2]});
        // First and last vertex coincide but the chain is open: the end edges meet, which a polyline forbids.
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(4, 4), P(0, 4), P(0, 0)], false))
            .toEqual({simple: false, edges: [0, 3]});
        expect(polygonSimplicity([P(0, 0), P(4, 0), P(2, 0)], false)).toEqual({simple: false, edges: [0, 1]});
    });

    it('rejects non-grid vertices', () => {
        expect(() => polygonSimplicity([P(0, 0), P(1, 0), P(0.5, 1)], true)).toThrow(RangeError);
    });
});
