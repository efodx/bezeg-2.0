import {describe, expect, it} from 'vitest';
import {GRID_COORD_LIMIT, type GridPoint} from './grid';
import {orient} from './predicates';
import {Rational, RationalPoint} from './rational';
import {
    centroid, circumcentre, circumradius, circumradiusSquared, classifyTriangle, countDistinctPoints, eulerLine,
    eulerLineFromCentres, incentre, inradius, locate, ninePointCircle, ninePoints, orthocentre,
    type EulerLine, type ExactCentre, type LocatedPoint, type NinePoints,
} from './triangle';

const p = (x: number, y: number): GridPoint => ({x, y});
const q = (x: number, y: number, dx = 1, dy = 1): RationalPoint =>
    new RationalPoint(Rational.of(x, dx), Rational.of(y, dy));
const R = (n: number, d = 1) => Rational.of(n, d);

const DEFAULT = [p(0, 0), p(7, 0), p(2, 5)] as const;
const OBTUSE = [p(0, 0), p(7, 0), p(1, 1)] as const;
const RIGHT = [p(0, 0), p(4, 0), p(0, 3)] as const;
const COLLINEAR = [p(0, 0), p(1, 1), p(3, 3)] as const;
const ISOSCELES6 = [p(0, 0), p(6, 0), p(3, 5)] as const;
const NEAR_EQUILATERAL = [p(0, 0), p(8, 0), p(4, 7)] as const;

function located(result: ExactCentre): LocatedPoint {
    if (result.kind !== 'point') throw new Error('expected a point');
    return result;
}

function nine(result: ReturnType<typeof ninePoints>): NinePoints {
    if (result.kind !== 'points') throw new Error('expected nine points');
    return result;
}

function line(result: ReturnType<typeof eulerLine>): EulerLine {
    if (result === undefined || result.kind !== 'line') throw new Error('expected an Euler line');
    return result;
}

function squaredDistance(u: RationalPoint, v: RationalPoint): Rational {
    const d = u.sub(v);
    return d.dot(d);
}

function expectPoint(point: RationalPoint, x: [number, number], y: [number, number]) {
    expect(point.x.format()).toBe(R(...x).format());
    expect(point.y.format()).toBe(R(...y).format());
}

/** Enumerates unordered triples of the points of a `size` x `size` window (an independent iteration of all shapes). */
function windowTriples(size: number, offset: number): Array<[GridPoint, GridPoint, GridPoint]> {
    const points: GridPoint[] = [];
    for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) points.push(p(x + offset, y + offset));
    const triples: Array<[GridPoint, GridPoint, GridPoint]> = [];
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            for (let k = j + 1; k < points.length; k++) triples.push([points[i], points[j], points[k]]);
        }
    }
    return triples;
}

/** Independent classification oracle: compare the squared longest side with the sum of the other two (Pythagoras). */
function shapeBySides(a: GridPoint, b: GridPoint, c: GridPoint): 'acute' | 'right' | 'obtuse' {
    const sq = (u: GridPoint, v: GridPoint) => (u.x - v.x) ** 2 + (u.y - v.y) ** 2;
    const sides = [sq(b, c), sq(c, a), sq(a, b)].sort((s, t) => s - t);
    const excess = sides[2] - sides[0] - sides[1];
    return excess > 0 ? 'obtuse' : excess === 0 ? 'right' : 'acute';
}

describe('classification', () => {
    it('matches the spec examples', () => {
        expect(classifyTriangle(...DEFAULT)).toEqual({kind: 'proper', shape: 'acute'});
        expect(classifyTriangle(...OBTUSE)).toEqual({kind: 'proper', shape: 'obtuse'});
        expect(classifyTriangle(...RIGHT)).toEqual({kind: 'proper', shape: 'right'});
        expect(classifyTriangle(...COLLINEAR)).toEqual({kind: 'degenerate'});
    });

    it('reports coincident vertices as degenerate in every arrangement', () => {
        expect(classifyTriangle(p(2, 2), p(2, 2), p(2, 2)).kind).toBe('degenerate');
        expect(classifyTriangle(p(2, 2), p(2, 2), p(5, 1)).kind).toBe('degenerate');
        expect(classifyTriangle(p(5, 1), p(2, 2), p(2, 2)).kind).toBe('degenerate');
        expect(classifyTriangle(p(2, 2), p(5, 1), p(2, 2)).kind).toBe('degenerate');
    });

    it('agrees with the side-length (Pythagoras) oracle for every window triangle and every vertex order', () => {
        for (const [a, b, c] of windowTriples(5, -2)) {
            for (const [u, v, w] of [[a, b, c], [b, c, a], [c, a, b], [a, c, b], [c, b, a], [b, a, c]]) {
                const result = classifyTriangle(u, v, w);
                if (orient(a, b, c) === 0) expect(result).toEqual({kind: 'degenerate'});
                else expect(result).toEqual({kind: 'proper', shape: shapeBySides(a, b, c)});
            }
        }
    });

    it('is exact at the largest coordinates, where a right angle is one lattice step from acute or obtuse', () => {
        const m = GRID_COORD_LIMIT;
        expect(classifyTriangle(p(-m, -m), p(m, -m), p(-m, m))).toEqual({kind: 'proper', shape: 'right'});
        expect(classifyTriangle(p(-m, -m), p(m, -m), p(-m + 1, m))).toEqual({kind: 'proper', shape: 'acute'});
        expect(classifyTriangle(p(-m + 1, -m), p(m, -m), p(-m, m))).toEqual({kind: 'proper', shape: 'obtuse'});
    });
});

describe('exact centres with inside/on/outside', () => {
    it('gives the default triangle exact fractions, all inside', () => {
        const g = centroid(...DEFAULT);
        expectPoint(g.point, [3, 1], [5, 3]);
        expect(g.position).toBe('inside');
        const o = located(circumcentre(...DEFAULT));
        expectPoint(o.point, [7, 2], [3, 2]);
        expect(o.position).toBe('inside');
        const h = located(orthocentre(...DEFAULT));
        expectPoint(h.point, [2, 1], [2, 1]);
        expect(h.position).toBe('inside');
        expect(circumradiusSquared(...DEFAULT)).toEqual({kind: 'value', value: R(29, 2)});
    });

    it('gives the obtuse example outside centres', () => {
        const g = centroid(...OBTUSE);
        expectPoint(g.point, [8, 3], [1, 3]);
        expect(g.position).toBe('inside');
        const o = located(circumcentre(...OBTUSE));
        expectPoint(o.point, [7, 2], [-5, 2]);
        expect(o.position).toBe('outside');
        const h = located(orthocentre(...OBTUSE));
        expectPoint(h.point, [1, 1], [6, 1]);
        expect(h.position).toBe('outside');
    });

    it('gives the right example the hypotenuse midpoint and the right-angle vertex, both on the boundary', () => {
        const o = located(circumcentre(...RIGHT));
        expectPoint(o.point, [2, 1], [3, 2]);
        expect(o.position).toBe('on');
        const h = located(orthocentre(...RIGHT));
        expectPoint(h.point, [0, 1], [0, 1]);
        expect(h.position).toBe('on');
        expect(circumradiusSquared(...RIGHT)).toEqual({kind: 'value', value: R(25, 4)});
        expect(centroid(...RIGHT).position).toBe('inside');
    });

    it('is on only for right triangles, inside only for acute, outside only for obtuse (circumcentre and orthocentre)', () => {
        const expected = {acute: 'inside', right: 'on', obtuse: 'outside'} as const;
        for (const [a, b, c] of windowTriples(5, 0)) {
            const shape = classifyTriangle(a, b, c);
            if (shape.kind === 'degenerate') continue;
            expect(located(circumcentre(a, b, c)).position).toBe(expected[shape.shape]);
            expect(located(orthocentre(a, b, c)).position).toBe(expected[shape.shape]);
            expect(centroid(a, b, c).position).toBe('inside');
        }
    });

    it('is independent of vertex order', () => {
        const [a, b, c] = DEFAULT;
        for (const [u, v, w] of [[b, c, a], [c, a, b], [a, c, b], [c, b, a], [b, a, c]]) {
            expect(located(circumcentre(u, v, w)).point.equals(located(circumcentre(a, b, c)).point)).toBe(true);
            expect(located(orthocentre(u, v, w)).point.equals(located(orthocentre(a, b, c)).point)).toBe(true);
            expect(centroid(u, v, w).point.equals(centroid(a, b, c).point)).toBe(true);
        }
    });

    it('locates arbitrary rational points: interior, edge, vertex and exterior', () => {
        const [a, b, c] = DEFAULT;
        expect(locate(a, b, c, q(3, 1))).toBe('inside');
        expect(locate(a, b, c, q(7, 0, 2))).toBe('on');
        expect(locate(a, b, c, q(0, 0))).toBe('on');
        expect(locate(a, b, c, q(-1, 1))).toBe('outside');
        // Same point with the opposite orientation of the triangle.
        expect(locate(a, c, b, q(3, 1))).toBe('inside');
        expect(locate(a, c, b, q(-1, 1))).toBe('outside');
        // Collinear with an edge but beyond its end: outside, not on.
        expect(locate(a, b, c, q(8, 0))).toBe('outside');
    });

    it('does not pretend a degenerate triangle has an inside', () => {
        expect(() => locate(...COLLINEAR, q(0, 1))).toThrow(RangeError);
    });
});

describe('degenerate triangles', () => {
    const degenerate = {kind: 'degenerate'};
    const cases: Array<[string, GridPoint, GridPoint, GridPoint]> = [
        ['collinear', ...COLLINEAR],
        ['coincident pair', p(1, 1), p(1, 1), p(4, 2)],
        ['all coincident', p(-3, 2), p(-3, 2), p(-3, 2)],
    ];

    it.each(cases)('returns typed degenerate results, never NaN or infinity (%s)', (_name, a, b, c) => {
        expect(circumcentre(a, b, c)).toEqual(degenerate);
        expect(orthocentre(a, b, c)).toEqual(degenerate);
        expect(circumradiusSquared(a, b, c)).toEqual(degenerate);
        expect(ninePointCircle(a, b, c)).toEqual(degenerate);
        expect(ninePoints(a, b, c)).toEqual(degenerate);
        expect(eulerLine(a, b, c)).toEqual(degenerate);
        expect(incentre(a, b, c)).toEqual(degenerate);
        expect(inradius(a, b, c)).toEqual(degenerate);
        expect(circumradius(a, b, c)).toEqual(degenerate);
    });

    it.each(cases)('still has a centroid, on the spanned segment (%s)', (_name, a, b, c) => {
        const g = centroid(a, b, c);
        expect(g.position).toBe('on');
        expect(g.point.x.den).toBeGreaterThan(0n);
        expect(g.point.x.equals(R(a.x + b.x + c.x, 3))).toBe(true);
        expect(g.point.y.equals(R(a.y + b.y + c.y, 3))).toBe(true);
    });
});

describe('inexact doubles', () => {
    it('matches the default example to 5 decimals and labels the results inexact', () => {
        const i = incentre(...DEFAULT);
        if (i.kind !== 'point') throw new Error('expected a point');
        expect(i.inexact).toBe(true);
        expect(i.position).toBe('inside');
        expect(i.x).toBeCloseTo(2.65705, 5);
        expect(i.y).toBeCloseTo(1.79891, 5);
        const r = inradius(...DEFAULT);
        if (r.kind !== 'value') throw new Error('expected a value');
        expect(r.inexact).toBe(true);
        expect(r.value).toBeCloseTo(1.79891, 5);
        // Side AB lies on the x-axis, so the incentre's y equals the inradius.
        expect(Math.abs(i.y - r.value)).toBeLessThan(1e-12);
        const big = circumradius(...DEFAULT);
        if (big.kind !== 'value') throw new Error('expected a value');
        expect(big.inexact).toBe(true);
        expect(big.value).toBeCloseTo(3.80789, 5);
    });

    it('matches the right example: R = 5/2, r = 1, incentre (1,1)', () => {
        const i = incentre(...RIGHT);
        if (i.kind !== 'point') throw new Error('expected a point');
        expect(i.x).toBeCloseTo(1, 12);
        expect(i.y).toBeCloseTo(1, 12);
        const r = inradius(...RIGHT);
        if (r.kind !== 'value') throw new Error('expected a value');
        expect(r.value).toBeCloseTo(1, 12);
        const big = circumradius(...RIGHT);
        if (big.kind !== 'value') throw new Error('expected a value');
        expect(big.value).toBeCloseTo(2.5, 12);
    });

    it('has R = abc/(4S) agree with sqrt of the exact R^2 to 1e-12 relative over the window and at large coordinates', () => {
        const m = GRID_COORD_LIMIT;
        const triples = [...windowTriples(5, -2), [p(-m, -m), p(m, -m + 1), p(m - 3, m)] as [GridPoint, GridPoint, GridPoint]];
        for (const [a, b, c] of triples) {
            const exact = circumradiusSquared(a, b, c);
            const double = circumradius(a, b, c);
            if (exact.kind === 'degenerate') {
                expect(double).toEqual({kind: 'degenerate'});
                continue;
            }
            if (double.kind !== 'value') throw new Error('expected a value');
            const root = Math.sqrt(exact.value.toNumber());
            expect(Math.abs(double.value - root) / root).toBeLessThan(1e-12);
        }
    });

    it('gives finite values for a needle-thin triangle', () => {
        const m = GRID_COORD_LIMIT;
        const a = p(-m, 0);
        const b = p(m, 1);
        const c = p(0, 0);
        const values = [incentre(a, b, c), inradius(a, b, c), circumradius(a, b, c)];
        for (const v of values) {
            const numbers = v.kind === 'point' ? [v.x, v.y] : v.kind === 'value' ? [v.value] : [];
            expect(numbers.length).toBeGreaterThan(0);
            for (const n of numbers) expect(Number.isFinite(n)).toBe(true);
        }
    });
});

describe('spec examples with exact fractions', () => {
    it('has the nine-point circle of the default triangle: N = (11/4, 7/4), r2 = 29/8', () => {
        const circle = ninePointCircle(...DEFAULT);
        if (circle.kind !== 'circle') throw new Error('expected a circle');
        expectPoint(circle.centre, [11, 4], [7, 4]);
        expect(circle.r2.equals(R(29, 8))).toBe(true);
    });

    it('has the T3 near-equilateral values H = (4, 16/7), O = (4, 33/14), |HO| = 1/14, R = 4.64286', () => {
        const h = located(orthocentre(...NEAR_EQUILATERAL)).point;
        const o = located(circumcentre(...NEAR_EQUILATERAL)).point;
        expectPoint(h, [4, 1], [16, 7]);
        expectPoint(o, [4, 1], [33, 14]);
        expect(squaredDistance(h, o).equals(R(1, 196))).toBe(true);
        const radius = circumradius(...NEAR_EQUILATERAL);
        if (radius.kind !== 'value') throw new Error('expected a value');
        expect(radius.value).toBeCloseTo(4.64286, 5);
    });
});

describe('Euler line', () => {
    it('matches the T3 default: H=(2,2), G=(3,5/3), O=(7/2,3/2), H-G = 2(G-O)', () => {
        const e = line(eulerLine(...DEFAULT));
        expectPoint(e.orthocentre, [2, 1], [2, 1]);
        expectPoint(e.centroid, [3, 1], [5, 3]);
        expectPoint(e.circumcentre, [7, 2], [3, 2]);
        const hg = e.orthocentre.sub(e.centroid);
        const go = e.centroid.sub(e.circumcentre);
        expectPoint(hg, [-1, 1], [1, 3]);
        expect(hg.equals(go.scale(R(2)))).toBe(true);
        expect(e.centroid.sub(e.circumcentre).cross(e.orthocentre.sub(e.circumcentre)).isZero()).toBe(true);
        expect(Math.sqrt(squaredDistance(e.orthocentre, e.centroid).toNumber())).toBeCloseTo(1.05409, 5);
        expect(Math.sqrt(squaredDistance(e.centroid, e.circumcentre).toNumber())).toBeCloseTo(0.52705, 5);
        expectPoint(e.direction, [-3, 2], [1, 2]);
    });

    it('is undefined exactly when H = O, tested on given centres', () => {
        const g = q(1, 2, 1, 3);
        const o = q(1, 2, 1, 3);
        expect(eulerLineFromCentres(g, o, q(1, 2, 1, 3))).toBeUndefined();
        const proper = eulerLineFromCentres(g, o, q(1, 2, 2, 3));
        expect(proper?.kind).toBe('line');
        expect(proper?.direction.equals(q(-1, 0, 2))).toBe(true);
    });

    it('shows the near-equilateral line: direction exact (0, -1/14), unstable only visually', () => {
        const e = line(eulerLine(...NEAR_EQUILATERAL));
        expect(e.direction.x.isZero()).toBe(true);
        expect(e.direction.y.equals(R(-1, 14))).toBe(true);
        expect(e.centroid.sub(e.circumcentre).cross(e.orthocentre.sub(e.circumcentre)).isZero()).toBe(true);
    });

    it('is never undefined for a lattice triangle in the window (no lattice triangle is equilateral)', () => {
        for (const [a, b, c] of windowTriples(7, -3)) {
            if (orient(a, b, c) === 0) expect(eulerLine(a, b, c)).toEqual({kind: 'degenerate'});
            else expect(eulerLine(a, b, c)?.kind).toBe('line');
        }
    });
});

describe('nine points', () => {
    it('has the T3 default points, including the foot (2,0) and the midpoint (2,7/2) of CH', () => {
        const n = nine(ninePoints(...DEFAULT));
        expect(n.all).toHaveLength(9);
        expectPoint(n.feet[2], [2, 1], [0, 1]);
        expectPoint(n.vertexMidpoints[2], [2, 1], [7, 2]);
        expectPoint(n.midpoints[0], [9, 2], [5, 2]);
        expectPoint(n.circle.centre, [11, 4], [7, 4]);
        expect(n.circle.r2.equals(R(29, 8))).toBe(true);
        expect(Math.sqrt(n.circle.r2.toNumber())).toBeCloseTo(1.90394, 5);
    });

    it('counts 9, 5, 8, 8 distinct points for the T3 examples', () => {
        expect(nine(ninePoints(...DEFAULT)).distinctCount).toBe(9);
        expect(nine(ninePoints(...RIGHT)).distinctCount).toBe(5);
        expect(nine(ninePoints(...ISOSCELES6)).distinctCount).toBe(8);
        expect(nine(ninePoints(...NEAR_EQUILATERAL)).distinctCount).toBe(8);
    });

    it('counts 4 distinct points for the isosceles right triangle (hand-derived: (0,0), (1,0), (0,1), (1,1))', () => {
        expect(nine(ninePoints(p(0, 0), p(2, 0), p(0, 2))).distinctCount).toBe(4);
    });

    it('counts distinct rational points by value, not by representation', () => {
        expect(countDistinctPoints([q(1, 2, 2, 4), q(2, 4, 4, 8), q(0, 1)])).toBe(2);
    });

    it('puts each of the nine points exactly at squared distance R^2/4 from N', () => {
        for (const triangle of [DEFAULT, OBTUSE, RIGHT, ISOSCELES6, NEAR_EQUILATERAL]) {
            const n = nine(ninePoints(...triangle));
            for (const point of n.all) expect(squaredDistance(point, n.circle.centre).equals(n.circle.r2)).toBe(true);
        }
    });

    it('has altitude feet that are perpendicular projections and on their side lines', () => {
        const [a, b, c] = DEFAULT;
        const n = nine(ninePoints(a, b, c));
        const sides: Array<[GridPoint, GridPoint, GridPoint]> = [[a, b, c], [b, c, a], [c, a, b]];
        sides.forEach(([apex, u, v], i) => {
            const foot = n.feet[i];
            const direction = RationalPoint.fromGrid(v).sub(RationalPoint.fromGrid(u));
            expect(foot.sub(RationalPoint.fromGrid(u)).cross(direction).isZero()).toBe(true);
            expect(foot.sub(RationalPoint.fromGrid(apex)).dot(direction).isZero()).toBe(true);
        });
    });
});

describe('dense-grid identities over a 7 x 7 window', () => {
    const triples = windowTriples(7, -3);

    it('covers at least 10^4 triangles', () => {
        expect(triples.length).toBeGreaterThanOrEqual(10_000);
    });

    it('satisfies every exact identity on every proper triangle', () => {
        let proper = 0;
        for (const [a, b, c] of triples) {
            if (orient(a, b, c) === 0) continue;
            proper++;
            const [pa, pb, pc] = [RationalPoint.fromGrid(a), RationalPoint.fromGrid(b), RationalPoint.fromGrid(c)];
            const o = located(circumcentre(a, b, c)).point;
            const h = located(orthocentre(a, b, c)).point;
            const g = centroid(a, b, c).point;
            const r2 = circumradiusSquared(a, b, c);
            if (r2.kind !== 'value') throw new Error('expected a value');

            // Circumcentre: equidistant from the three vertices, at squared distance R^2.
            expect(squaredDistance(o, pa).equals(r2.value)).toBe(true);
            expect(squaredDistance(o, pb).equals(r2.value)).toBe(true);
            expect(squaredDistance(o, pc).equals(r2.value)).toBe(true);
            // The denominator divides 2 * orient.
            const twice = BigInt(2 * Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)));
            expect(twice % o.x.den).toBe(0n);
            expect(twice % o.y.den).toBe(0n);
            // Orthocentre: altitude definition, three dot products.
            expect(h.sub(pa).dot(pb.sub(pc)).isZero()).toBe(true);
            expect(h.sub(pb).dot(pc.sub(pa)).isZero()).toBe(true);
            expect(h.sub(pc).dot(pa.sub(pb)).isZero()).toBe(true);
            // Euler line: collinear and HG = 2 GO.
            expect(g.sub(o).cross(h.sub(o)).isZero()).toBe(true);
            expect(squaredDistance(h, g).equals(squaredDistance(g, o).mul(R(4)))).toBe(true);
            // Centroid is the average.
            expect(g.scale(R(3)).equals(pa.add(pb).add(pc))).toBe(true);
            // Nine points on the circle with centre (O+H)/2 and squared radius R^2/4.
            const n = nine(ninePoints(a, b, c));
            expect(n.circle.centre.scale(R(2)).equals(o.add(h))).toBe(true);
            expect(n.circle.r2.mul(R(4)).equals(r2.value)).toBe(true);
            for (const point of n.all) expect(squaredDistance(point, n.circle.centre).equals(n.circle.r2)).toBe(true);
            expect(n.distinctCount).toBeGreaterThanOrEqual(4);
            expect(n.distinctCount).toBeLessThanOrEqual(9);
        }
        expect(proper).toBeGreaterThan(10_000 * 0.8);
    });

    it('puts the incentre at equal distance (to 1e-12) from the three side lines, never compared with ===', () => {
        for (const [a, b, c] of triples) {
            const i = incentre(a, b, c);
            const r = inradius(a, b, c);
            if (orient(a, b, c) === 0) {
                expect(i.kind).toBe('degenerate');
                continue;
            }
            if (i.kind !== 'point' || r.kind !== 'value') throw new Error('expected values');
            const distance = (u: GridPoint, v: GridPoint) =>
                Math.abs((v.x - u.x) * (i.y - u.y) - (v.y - u.y) * (i.x - u.x)) / Math.hypot(v.x - u.x, v.y - u.y);
            const d = [distance(a, b), distance(b, c), distance(c, a)];
            expect(Math.abs(d[0] - d[1])).toBeLessThan(1e-12);
            expect(Math.abs(d[1] - d[2])).toBeLessThan(1e-12);
            expect(Math.abs(d[0] - r.value)).toBeLessThan(1e-12);
            // Strictly inside: all three oriented distances have the triangle's sign.
            const side = (u: GridPoint, v: GridPoint) => Math.sign((v.x - u.x) * (i.y - u.y) - (v.y - u.y) * (i.x - u.x));
            const t = orient(a, b, c);
            expect([side(a, b), side(b, c), side(c, a)]).toEqual([t, t, t]);
        }
    });
});

describe('large coordinates', () => {
    it('stays exact at the range limit', () => {
        const m = GRID_COORD_LIMIT;
        const a = p(-m, -m);
        const b = p(m, -m + 1);
        const c = p(m - 3, m);
        const o = located(circumcentre(a, b, c)).point;
        const r2 = circumradiusSquared(a, b, c);
        if (r2.kind !== 'value') throw new Error('expected a value');
        for (const v of [a, b, c]) expect(squaredDistance(o, RationalPoint.fromGrid(v)).equals(r2.value)).toBe(true);
        const h = located(orthocentre(a, b, c)).point;
        const [pa, pb, pc] = [RationalPoint.fromGrid(a), RationalPoint.fromGrid(b), RationalPoint.fromGrid(c)];
        expect(h.sub(pa).dot(pb.sub(pc)).isZero()).toBe(true);
        expect(h.sub(pb).dot(pc.sub(pa)).isZero()).toBe(true);
    });

    it('reports a far circumcentre exactly for a needle-thin triangle', () => {
        const o = located(circumcentre(p(0, 0), p(1000, 1), p(2000, 3)));
        expect(o.point.x.den > 0n && o.point.y.den > 0n).toBe(true);
        const [d0, d1, d2] = [p(0, 0), p(1000, 1), p(2000, 3)].map(v => squaredDistance(o.point, RationalPoint.fromGrid(v)));
        expect(d0.equals(d1) && d1.equals(d2)).toBe(true);
        expect(o.position).toBe('outside');
    });
});

describe('input rejection', () => {
    const good = p(1, 2);
    const bad: Array<[string, unknown]> = [
        ['non-integer', p(0.5, 0)],
        ['NaN', p(Number.NaN, 0)],
        ['Infinity', p(0, Number.POSITIVE_INFINITY)],
        ['above the range', p(GRID_COORD_LIMIT + 1, 0)],
        ['below the range', p(0, -GRID_COORD_LIMIT - 1)],
        ['unsafe integer', p(2 ** 60, 0)],
        ['null', null],
        ['undefined', undefined],
        ['string coordinates', {x: '1', y: '2'}],
        ['missing coordinate', {x: 1}],
    ];
    const functions: Array<[string, (a: GridPoint, b: GridPoint, c: GridPoint) => unknown]> = [
        ['classifyTriangle', classifyTriangle], ['centroid', centroid], ['circumcentre', circumcentre],
        ['orthocentre', orthocentre], ['circumradiusSquared', circumradiusSquared], ['ninePointCircle', ninePointCircle],
        ['ninePoints', ninePoints], ['eulerLine', eulerLine], ['incentre', incentre], ['inradius', inradius],
        ['circumradius', circumradius],
        ['locate', (a, b, c) => locate(a, b, c, q(0, 1))],
    ];

    for (const [fname, fn] of functions) {
        it(`${fname} throws RangeError for every bad vertex in every position`, () => {
            for (const [, value] of bad) {
                const v = value as GridPoint;
                expect(() => fn(v, good, p(5, 1))).toThrow(RangeError);
                expect(() => fn(good, v, p(5, 1))).toThrow(RangeError);
                expect(() => fn(good, p(5, 1), v)).toThrow(RangeError);
            }
        });
    }

    it('rejects a bad vertex even when the other two coincide (degenerate does not bypass validation)', () => {
        expect(() => classifyTriangle(p(0.5, 0), good, good)).toThrow(RangeError);
        expect(() => centroid(good, good, p(GRID_COORD_LIMIT + 1, 0))).toThrow(RangeError);
    });

    it('accepts the range limit itself', () => {
        const m = GRID_COORD_LIMIT;
        expect(() => classifyTriangle(p(m, m), p(-m, m), p(m, -m))).not.toThrow();
        expect(() => circumcentre(p(m, m), p(-m, m), p(m, -m))).not.toThrow();
    });
});
