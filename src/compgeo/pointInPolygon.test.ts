import {describe, expect, it} from 'vitest';
import type {GridPoint} from './grid';
import {
    classifyPoint,
    NOTCHED_PENTAGON,
    PENTAGRAM_VERTICES,
    rayCrossings,
    type PointClassification,
} from './pointInPolygon';
import {orientValue, polygonSimplicity} from './predicates';
import {strictlyInsidePolygon} from './polygonMeasures';
import {Rational} from './rational';

const p = (x: number, y: number): GridPoint => ({x, y});
const poly = (...c: [number, number][]) => c.map(([x, y]) => p(x, y));
const HULL = poly([-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]);
const PENTAGRAM_TIPS = [p(0, 9), p(-9, 3), p(-5, -7), p(5, -7), p(9, 3)];

/** Deterministic LCG so failures reproduce. */
function rng(seed: number) {
    let s = seed >>> 0;
    return (n: number) => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return (s >>> 8) % n;
    };
}

function off(c: PointClassification) {
    if (c.location !== 'off-boundary') throw new Error('expected off-boundary');
    return c;
}

function randomPolygon(r: (n: number) => number, extent: number): GridPoint[] {
    const count = 3 + r(10); // 3..12 vertices
    return Array.from({length: count}, () => p(r(2 * extent + 1) - extent, r(2 * extent + 1) - extent));
}

function gcd(a: number, b: number): number {
    while (b !== 0) [a, b] = [b, a % b];
    return a;
}

/** Every lattice point of the closed edge ab by gcd stepping. */
function edgeLatticePoints(a: GridPoint, b: GridPoint): GridPoint[] {
    const g = gcd(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    if (g === 0) return [a];
    return Array.from({length: g + 1}, (_, k) => p(a.x + ((b.x - a.x) / g) * k, a.y + ((b.y - a.y) / g) * k));
}

/** Angle-sum winding number: the turn angles of the vectors q->v_i, q->v_(i+1) over 2 pi, rounded. */
function angleSumWinding(q: GridPoint, v: readonly GridPoint[]): number {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
        const a = v[i];
        const b = v[(i + 1) % v.length];
        const [ax, ay, bx, by] = [a.x - q.x, a.y - q.y, b.x - q.x, b.y - q.y];
        sum += Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    }
    return Math.round(sum / (2 * Math.PI)) + 0; // + 0 turns -0 into 0
}

function boxPoints(v: readonly GridPoint[], margin: number): GridPoint[] {
    const xs = v.map((q) => q.x);
    const ys = v.map((q) => q.y);
    const out: GridPoint[] = [];
    for (let y = Math.min(...ys) - margin; y <= Math.max(...ys) + margin; y++) {
        for (let x = Math.min(...xs) - margin; x <= Math.max(...xs) + margin; x++) out.push(p(x, y));
    }
    return out;
}

describe('classifyPoint: the spec examples', () => {
    it('notched pentagon: (3,1) and (1,3) are inside with winding 1 under both rules, (3,3) in the notch is outside', () => {
        for (const q of [p(3, 1), p(1, 3)]) {
            expect(classifyPoint(q, NOTCHED_PENTAGON)).toMatchObject({
                location: 'off-boundary', winding: 1, evenOdd: 'inside', nonzero: 'inside',
            });
        }
        expect(classifyPoint(p(3, 3), NOTCHED_PENTAGON)).toMatchObject({
            location: 'off-boundary', winding: 0, evenOdd: 'outside', nonzero: 'outside',
        });
    });

    it('reports the crossing count: (3,1) crosses once, (3,3) twice', () => {
        expect(off(classifyPoint(p(3, 1), NOTCHED_PENTAGON)).crossings).toBe(1);
        expect(off(classifyPoint(p(3, 3), NOTCHED_PENTAGON)).crossings).toBe(2);
    });

    it('PENTAGRAM_VERTICES are five distinct lattice points forming a self-intersecting polygon', () => {
        expect(PENTAGRAM_VERTICES).toHaveLength(5);
        for (const v of PENTAGRAM_VERTICES) {
            expect(Number.isInteger(v.x) && Number.isInteger(v.y)).toBe(true);
        }
        expect(new Set(PENTAGRAM_VERTICES.map((v) => `${v.x},${v.y}`)).size).toBe(5);
        expect(polygonSimplicity(PENTAGRAM_VERTICES, true).simple).toBe(false);
    });

    it('pentagram: the centre has winding 2 (even-odd outside, nonzero inside); a point in each tip has winding 1', () => {
        expect(classifyPoint(p(0, 0), PENTAGRAM_VERTICES)).toMatchObject({
            location: 'off-boundary', crossings: 2, winding: 2, evenOdd: 'outside', nonzero: 'inside',
        });
        for (const tip of PENTAGRAM_TIPS) {
            expect(classifyPoint(tip, PENTAGRAM_VERTICES)).toMatchObject({
                location: 'off-boundary', winding: 1, evenOdd: 'inside', nonzero: 'inside',
            });
        }
    });

    it('pentagram: the centre is at least 4 grid units and each tip point at least 1.9 units from every edge', () => {
        const n = PENTAGRAM_VERTICES.length;
        const clearance = (q: GridPoint) => Math.min(...PENTAGRAM_VERTICES.map((a, i) => {
            const b = PENTAGRAM_VERTICES[(i + 1) % n];
            // Distance to the segment, not the line: the tip points lie near other edges' extensions.
            const t = Math.max(0, Math.min(1, ((q.x - a.x) * (b.x - a.x) + (q.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2)));
            return Math.hypot(a.x + t * (b.x - a.x) - q.x, a.y + t * (b.y - a.y) - q.y);
        }));
        expect(clearance(p(0, 0))).toBeGreaterThanOrEqual(4);
        for (const tip of PENTAGRAM_TIPS) expect(clearance(tip)).toBeGreaterThanOrEqual(1.9);
        // Sanity of the helper itself: the line-distance of the centre to the first edge agrees with orientValue.
        const [a, b] = PENTAGRAM_VERTICES;
        expect(Math.abs(orientValue(a, b, p(0, 0))) / Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(4);
    });
});

describe('rayCrossings', () => {
    it('lists counted edges in order with direction and the exact crossing x', () => {
        // Ray y = 3 from (1,3): edge 1 (6,0)->(6,4) up at x = 6, edge 2 (6,4)->(3,2) down at x = 9/2, edge 3 (3,2)->(0,4) up at x = 3/2.
        const {crossings, touching} = rayCrossings(p(1, 3), NOTCHED_PENTAGON);
        expect(crossings.map((c) => [c.edge, c.direction, c.x.format()])).toEqual([[1, 1, '6'], [2, -1, '9/2'], [3, 1, '3/2']]);
        for (const c of crossings) expect(c.x).toBeInstanceOf(Rational);
        expect(touching).toEqual([]);
    });

    it('a ray through a vertex counts the vertex with the edge above it only', () => {
        // Ray y = 2 from (1,2) passes the notch vertex (3,2): edge 2 ends there from above, edge 3 leaves upward, so both
        // count (the vertex is "just below" the ray) and cancel in the winding number.
        const {crossings, touching} = rayCrossings(p(1, 2), NOTCHED_PENTAGON);
        expect(crossings.map((c) => [c.edge, c.direction, c.x.format()])).toEqual([[1, 1, '6'], [2, -1, '3'], [3, 1, '3']]);
        expect(touching).toEqual([]);
    });

    it('a vertex touched from below is not counted and both its edges are reported as touching', () => {
        const peak = poly([0, 0], [4, 2], [8, 0]);
        const {crossings, touching} = rayCrossings(p(-1, 2), peak);
        expect(crossings).toEqual([]);
        expect(touching.map((t) => [t.edge, t.points])).toEqual([[0, [p(4, 2)]], [1, [p(4, 2)]]]);
        expect(off(classifyPoint(p(-1, 2), peak))).toMatchObject({crossings: 0, winding: 0});
    });

    it('a horizontal edge on the ray is never counted and is reported with both endpoints', () => {
        const low = rayCrossings(p(-1, 0), NOTCHED_PENTAGON);
        expect(low.crossings.map((c) => [c.edge, c.direction])).toEqual([[1, 1], [4, -1]]);
        expect(low.touching.map((t) => [t.edge, t.points])).toEqual([[0, [p(0, 0), p(6, 0)]]]);
    });

    it('classifyPoint uses the same counted edges', () => {
        const r = rng(3);
        for (let t = 0; t < 100; t++) {
            const v = randomPolygon(r, 4);
            for (const q of boxPoints(v, 1)) {
                const c = classifyPoint(q, v);
                if (c.location === 'boundary') continue;
                const rc = rayCrossings(q, v).crossings;
                expect(c.crossings).toBe(rc.length);
                expect(c.winding).toBe(rc.reduce((s, x) => s + x.direction, 0));
            }
        }
    });
});

describe('classifyPoint: boundary', () => {
    it('every lattice point of every edge, and every vertex, is on the boundary', () => {
        const r = rng(11);
        const polygons = [NOTCHED_PENTAGON, HULL, PENTAGRAM_VERTICES, ...Array.from({length: 150}, () => randomPolygon(r, 6))];
        for (const v of polygons) {
            for (let i = 0; i < v.length; i++) {
                for (const q of edgeLatticePoints(v[i], v[(i + 1) % v.length])) {
                    expect(classifyPoint(q, v)).toEqual({location: 'boundary'});
                }
            }
        }
    });

    it('a point off an edge is not on the boundary', () => {
        const triangle = poly([0, 0], [6, 0], [3, 3]);
        expect(classifyPoint(p(3, 1), triangle).location).toBe('off-boundary');
        expect(classifyPoint(p(3, 0), triangle)).toEqual({location: 'boundary'});
    });
});

describe('classifyPoint: degenerate polygons are handled, not thrown', () => {
    it('no vertices: outside everywhere', () => {
        expect(classifyPoint(p(0, 0), [])).toMatchObject({location: 'off-boundary', crossings: 0, winding: 0, evenOdd: 'outside', nonzero: 'outside'});
    });

    it('one vertex: boundary at it, outside elsewhere', () => {
        expect(classifyPoint(p(1, 1), [p(1, 1)])).toEqual({location: 'boundary'});
        expect(classifyPoint(p(0, 1), [p(1, 1)])).toMatchObject({location: 'off-boundary', winding: 0, nonzero: 'outside'});
    });

    it('two vertices: boundary on the segment, winding 0 and an even count elsewhere', () => {
        const seg = [p(0, 0), p(4, 4)];
        expect(classifyPoint(p(2, 2), seg)).toEqual({location: 'boundary'});
        for (const q of boxPoints(seg, 2)) {
            const c = classifyPoint(q, seg);
            if (c.location === 'off-boundary') expect([c.winding, c.crossings % 2]).toEqual([0, 0]);
        }
    });

    it('collinear vertices (zero doubled area): boundary on the line segment, outside elsewhere', () => {
        const line = poly([0, 0], [2, 2], [4, 4]);
        expect(classifyPoint(p(3, 3), line)).toEqual({location: 'boundary'});
        expect(classifyPoint(p(3, 2), line)).toMatchObject({location: 'off-boundary', winding: 0, nonzero: 'outside'});
    });

    it('a zero-area bow tie keeps nonzero winding off the boundary', () => {
        const bow = poly([0, 0], [4, 4], [4, 0], [0, 4]); // lobes of equal area and opposite sign
        const right = off(classifyPoint(p(3, 2), bow)).winding;
        const left = off(classifyPoint(p(1, 2), bow)).winding;
        expect(Math.abs(right)).toBe(1);
        expect(left).toBe(-right);
    });
});

describe('acceptance 2: a ray through a vertex gives the same answer as a nearby ray', () => {
    /**
     * Exact formulation. For a query q on the horizontal through a vertex (q off the boundary), scale the polygon and
     * q by S = 1024 (larger than every edge's |dx|) and lift q by one scaled unit, giving q' = (S q.x, S q.y + 1),
     * which is q moved up by the dyadic 1/1024. Then q' is off the boundary and its ray meets no vertex. The
     * classification of q (crossings, winding and both rules) must equal that of q', evaluated exactly at the finer
     * grid scale: the half-open rule means "a vertex on the ray lies just below it", i.e. the ray is lifted.
     */
    const S = 1024;
    const scaled = (v: readonly GridPoint[]) => v.map((q) => p(q.x * S, q.y * S));

    function check(v: readonly GridPoint[], margin: number): number {
        const fine = scaled(v);
        const xs = v.map((q) => q.x);
        let tested = 0;
        for (const vertex of v) {
            for (let x = Math.min(...xs) - margin; x <= Math.max(...xs) + margin; x++) {
                const q = p(x, vertex.y);
                const coarse = classifyPoint(q, v);
                if (coarse.location === 'boundary') continue;
                const nearby = classifyPoint(p(q.x * S, q.y * S + 1), fine);
                expect(nearby, `q=${q.x},${q.y}`).toEqual(coarse);
                tested++;
            }
        }
        return tested;
    }

    it('holds over every vertex of the notched pentagon, the hull and the pentagram', () => {
        expect(check(NOTCHED_PENTAGON, 2)).toBeGreaterThan(20);
        expect(check(HULL, 2)).toBeGreaterThan(20);
        expect(check(PENTAGRAM_VERTICES, 2)).toBeGreaterThan(40);
    });

    it('holds over every vertex of random polygons', () => {
        const r = rng(2024);
        let tested = 0;
        for (let t = 0; t < 200; t++) tested += check(randomPolygon(r, 5), 1);
        expect(tested).toBeGreaterThan(2000);
    });
});

describe('winding number against the angle-sum reference', () => {
    it('matches on random grid polygons of up to 12 vertices at every off-boundary lattice point of their box', () => {
        const r = rng(99);
        let tested = 0;
        for (let t = 0; t < 400; t++) {
            const v = randomPolygon(r, 4);
            for (const q of boxPoints(v, 1)) {
                const c = classifyPoint(q, v);
                if (c.location === 'boundary') continue;
                expect(c.winding, `polygon ${JSON.stringify(v)} q=${q.x},${q.y}`).toBe(angleSumWinding(q, v));
                // Acceptance 5: odd crossing count equals odd winding number.
                expect(Math.abs(c.winding) % 2).toBe(c.crossings % 2);
                tested++;
            }
        }
        expect(tested).toBeGreaterThan(10_000);
    });

    it('matches on the examples, including parity of crossings', () => {
        for (const v of [NOTCHED_PENTAGON, HULL, PENTAGRAM_VERTICES]) {
            for (const q of boxPoints(v, 2)) {
                const c = classifyPoint(q, v);
                if (c.location === 'boundary') continue;
                expect(c.winding).toBe(angleSumWinding(q, v));
                expect(Math.abs(c.winding) % 2).toBe(c.crossings % 2);
            }
        }
    });

    it('agrees with strictlyInsidePolygon (nonzero rule, off the boundary) on simple polygons', () => {
        const r = rng(5150);
        const polygons = [NOTCHED_PENTAGON, HULL];
        while (polygons.length < 152) {
            const v = randomPolygon(r, 5);
            if (polygonSimplicity(v, true).simple) polygons.push(v);
        }
        for (const v of polygons) {
            for (const q of boxPoints(v, 1)) {
                const c = classifyPoint(q, v);
                const inside = c.location === 'off-boundary' && c.nonzero === 'inside';
                expect(strictlyInsidePolygon(q, v), `polygon ${JSON.stringify(v)} q=${q.x},${q.y}`).toBe(inside);
                if (c.location === 'off-boundary') expect(c.evenOdd).toBe(c.nonzero);
            }
        }
    });
});
