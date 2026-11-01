import {describe, expect, it} from 'vitest';
import {delaunayTriangulation} from './delaunay';
import type {GridPoint} from './grid';
import {incircleValue, orient} from './predicates';
import {Rational, RationalPoint} from './rational';
import {circumcentre} from './triangle';
import {edges as triangulationEdges} from './triangulation';
import {
    clipCell, dualEdges, nearestSites, voronoiFromDelaunay,
    type RationalBox, type VoronoiDiagram,
} from './voronoi';

const P = (x: number, y: number): GridPoint => ({x, y});
const pts = (list: readonly (readonly [number, number])[]): GridPoint[] => list.map(([x, y]) => P(x, y));
const Q = (xn: number, xd: number, yn: number, yd: number): RationalPoint =>
    new RationalPoint(Rational.of(xn, xd), Rational.of(yn, yd));
const fmt = (p: RationalPoint): string => `${p.x.format()},${p.y.format()}`;
const box = (x0: number, y0: number, x1: number, y1: number): RationalBox =>
    ({minX: Rational.of(x0), minY: Rational.of(y0), maxX: Rational.of(x1), maxY: Rational.of(y1)});

/** Deterministic LCG so failures reproduce. */
function rng(seed: number) {
    let s = seed >>> 0;
    return (n: number) => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return (s >>> 8) % n;
    };
}

/** Random distinct points, each added only if no three are collinear and no four cocircular (checked exactly). */
function generalPositionSet(random: (n: number) => number, n: number, size: number): GridPoint[] | null {
    const result: GridPoint[] = [];
    for (let attempt = 0; result.length < n && attempt < 80; attempt++) {
        const p = P(random(size), random(size));
        let ok = true;
        for (let i = 0; i < result.length && ok; i++) {
            if (result[i].x === p.x && result[i].y === p.y) ok = false;
            for (let j = i + 1; j < result.length && ok; j++) {
                if (orient(result[i], result[j], p) === 0) {
                    ok = false;
                    break;
                }
                for (let k = j + 1; k < result.length && ok; k++) {
                    if (orient(result[i], result[j], result[k]) === 0) continue;
                    if (incircleValue(result[i], result[j], result[k], p) === 0n) ok = false;
                }
            }
        }
        if (ok) result.push(p);
    }
    return result.length === n ? result : null;
}

function build(points: readonly GridPoint[]): VoronoiDiagram {
    const outcome = voronoiFromDelaunay(points);
    if (!outcome.ok) throw new Error(`unexpected refusal ${outcome.refusal.kind}`);
    return outcome.value;
}

const pairKey = (a: number, b: number): string => `${Math.min(a, b)}-${Math.max(a, b)}`;

/**
 * Derives the dual from the Delaunay structure (not from the builder): every segment is an interior Delaunay edge with
 * the same site pair and every ray or line a hull edge. In general position the correspondence is exact; with
 * cocircular sites the interior edges missing a segment must have equal circumcentres at both ends. Returns problems.
 */
function checkDuality(points: readonly GridPoint[], diagram: VoronoiDiagram): string[] {
    const problems: string[] = [];
    const outcome = delaunayTriangulation(points);
    if (!outcome.ok) return outcome.refusal.kind === 'degenerate-points' && diagram.edges.every(e => e.kind === 'line')
        && diagram.vertices.length === 0 ? [] : ['no triangulation but not a collinear diagram'];
    const tri = outcome.value;
    const interior = new Map<string, readonly number[]>();
    const hull = new Set<string>();
    for (const e of triangulationEdges(tri)) {
        if (e.interior) interior.set(pairKey(e.a, e.b), e.triangles);
        else hull.add(pairKey(e.a, e.b));
    }
    const finite = new Set<string>();
    const rays = new Set<string>();
    for (const e of diagram.edges) {
        const key = pairKey(e.sites[0], e.sites[1]);
        if (e.kind === 'segment') {
            if (!interior.has(key)) problems.push(`segment ${key} is not an interior Delaunay edge`);
            if (finite.has(key)) problems.push(`segment ${key} repeated`);
            finite.add(key);
        } else if (e.kind === 'ray') {
            if (!hull.has(key)) problems.push(`ray ${key} is not a hull edge`);
            if (rays.has(key)) problems.push(`ray ${key} repeated`);
            rays.add(key);
        } else {
            problems.push(`unexpected line ${key} with a triangulation`);
        }
    }
    for (const key of hull) if (!rays.has(key)) problems.push(`hull edge ${key} has no ray`);
    for (const [key, [t1, t2]] of interior) {
        if (finite.has(key)) continue;
        const centre = (t: number) => {
            const [a, b, c] = tri.triangles[t];
            const result = circumcentre(points[a], points[b], points[c]);
            return result.kind === 'point' ? fmt(result.point) : 'degenerate';
        };
        if (centre(t1) !== centre(t2)) problems.push(`interior edge ${key} has no segment but distinct centres`);
    }
    return problems;
}

/** Every ray: vertex lists both sites, direction perpendicular to the site pair, and its points are nearest to just them. */
function expectRays(points: readonly GridPoint[], diagram: VoronoiDiagram): void {
    for (const e of diagram.edges) {
        if (e.kind !== 'ray') continue;
        const [i, j] = e.sites;
        const v = diagram.vertices[e.vertex];
        expect(v.sites).toContain(i);
        expect(v.sites).toContain(j);
        const dir = RationalPoint.fromGrid(e.direction);
        expect(dir.dot(RationalPoint.fromGrid({x: points[j].x - points[i].x, y: points[j].y - points[i].y})).isZero()).toBe(true);
        for (const t of [1, 2, 40]) {
            expect(nearestSites(points, v.point.add(dir.scale(Rational.of(t))))).toEqual([i, j]);
        }
    }
}

const doubledArea = (polygon: readonly RationalPoint[]): Rational =>
    polygon.reduce((sum, p, k) => sum.add(p.cross(polygon[(k + 1) % polygon.length])), Rational.ZERO);

/** Exact point-in-convex-polygon for a counter-clockwise polygon; `strict` excludes the boundary. */
function contains(polygon: readonly RationalPoint[], q: RationalPoint, strict = false): boolean {
    if (polygon.length < 3) return false;
    return polygon.every((a, k) => {
        const b = polygon[(k + 1) % polygon.length];
        const side = b.sub(a).cross(q.sub(a)).sign();
        return strict ? side > 0 : side >= 0;
    });
}

/** Cells tile the box: exact area sum equals the box area, and every polygon is convex counter-clockwise. */
function expectTiling(diagram: VoronoiDiagram, points: readonly GridPoint[], b: RationalBox): void {
    let total = Rational.ZERO;
    points.forEach((_, site) => {
        const {polygon, open} = clipCell(diagram, points, site, b);
        expect(open).toHaveLength(polygon.length);
        if (polygon.length === 0) return;
        const area = doubledArea(polygon);
        expect(area.sign()).toBe(1);
        polygon.forEach((a, k) => {
            const c = polygon[(k + 1) % polygon.length];
            const d = polygon[(k + 2) % polygon.length];
            expect(c.sub(a).cross(d.sub(c)).sign()).toBeGreaterThanOrEqual(0);
        });
        total = total.add(area);
    });
    const width = b.maxX.sub(b.minX);
    const height = b.maxY.sub(b.minY);
    expect(total.equals(Rational.of(2).mul(width).mul(height))).toBe(true);
}

const B2 = pts([[0, 0], [8, 0], [9, 6], [4, 8], [-1, 5], [3, 3], [6, 3]]);
/** Spec B4: Delaunay triangle site triple to its exact circumcentre. */
const B4_VERTICES: readonly (readonly [readonly number[], RationalPoint])[] = [
    [[0, 1, 5], Q(4, 1, -1, 1)],
    [[0, 4, 5], Q(1, 3, 8, 3)],
    [[1, 2, 6], Q(91, 10, 29, 10)],
    [[1, 5, 6], Q(9, 2, -1, 6)],
    [[2, 3, 6], Q(85, 14, 83, 14)],
    [[3, 4, 5], Q(21, 11, 64, 11)],
    [[3, 5, 6], Q(9, 2, 53, 10)],
];

describe('voronoiFromDelaunay: the B4 example (seven points of B2)', () => {
    const diagram = build(B2);

    it('has exactly the spec vertices, each listing its three sites', () => {
        expect(diagram.vertices.map(v => `${v.sites.join(',')}:${fmt(v.point)}`).sort())
            .toEqual(B4_VERTICES.map(([sites, p]) => `${sites.join(',')}:${fmt(p)}`).sort());
    });

    it('has 8 segments, 5 rays, and the hull cells unbounded while p5 and p6 are bounded', () => {
        expect(diagram.edges.filter(e => e.kind === 'segment')).toHaveLength(8);
        expect(diagram.edges.filter(e => e.kind === 'ray')).toHaveLength(5);
        expect(diagram.edges.filter(e => e.kind === 'line')).toHaveLength(0);
        expect(diagram.cells.map(c => c.bounded)).toEqual([false, false, false, false, false, true, true]);
        expect(diagram.cells.map(c => c.site)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('puts every vertex at an exact equal distance from its sites with no site nearer', () => {
        for (const v of diagram.vertices) {
            const distances = v.sites.map(s => {
                const d = RationalPoint.fromGrid(B2[s]).sub(v.point);
                return d.dot(d);
            });
            distances.forEach(d => expect(d.equals(distances[0])).toBe(true));
            expect(nearestSites(B2, v.point)).toEqual([...v.sites]);
        }
    });

    it('lets every edge carry points nearest to exactly its two sites, rays pointing away from the others', () => {
        for (const e of diagram.edges) {
            const expected = [...e.sites];
            if (e.kind === 'segment') {
                const a = diagram.vertices[e.from].point;
                const b = diagram.vertices[e.to].point;
                expect(nearestSites(B2, a.add(b).scale(Rational.of(1, 2)))).toEqual(expected);
                for (const s of expected) {
                    expect(diagram.vertices[e.from].sites).toContain(s);
                    expect(diagram.vertices[e.to].sites).toContain(s);
                }
            } else if (e.kind === 'ray') {
                const v = diagram.vertices[e.vertex];
                for (const s of expected) expect(v.sites).toContain(s);
                const dir = RationalPoint.fromGrid(e.direction);
                const [i, j] = e.sites;
                // Perpendicular to the site pair, an integer vector.
                expect(dir.dot(RationalPoint.fromGrid({x: B2[j].x - B2[i].x, y: B2[j].y - B2[i].y})).isZero()).toBe(true);
                for (const t of [1, 2, 5, 40]) {
                    expect(nearestSites(B2, v.point.add(dir.scale(Rational.of(t))))).toEqual(expected);
                }
            }
        }
    });

    it('lists each bounded cell edges counter-clockwise around the cell', () => {
        for (const cell of diagram.cells.filter(c => c.bounded)) {
            const corners = cell.edges.map((e, k) => {
                const next = diagram.edges[cell.edges[(k + 1) % cell.edges.length]];
                const here = diagram.edges[e];
                if (here.kind !== 'segment' || next.kind !== 'segment') throw new Error('bounded cell with a non-segment');
                const shared = [here.from, here.to].filter(v => v === next.from || v === next.to);
                expect(shared).toHaveLength(1);
                return diagram.vertices[shared[0]].point;
            });
            expect(doubledArea(corners).sign()).toBe(1);
        }
    });

    it('matches the clipped polygons: vertices of bounded cells, closed sides, open sides on the box', () => {
        const big = box(-100, -100, 100, 100);
        for (const site of [5, 6]) {
            const {polygon, open} = clipCell(diagram, B2, site, big);
            expect(polygon.map(fmt).sort()).toEqual(
                diagram.vertices.filter(v => v.sites.includes(site)).map(v => fmt(v.point)).sort());
            expect(open.every(o => !o)).toBe(true);
        }
        for (const site of [0, 1, 2, 3, 4]) {
            const {polygon, open} = clipCell(diagram, B2, site, big);
            expect(open.filter(Boolean).length).toBeGreaterThanOrEqual(1);
            polygon.forEach((a, k) => {
                if (!open[k]) return;
                const b = polygon[(k + 1) % polygon.length];
                const onVertical = a.x.equals(b.x) && (a.x.equals(big.minX) || a.x.equals(big.maxX));
                const onHorizontal = a.y.equals(b.y) && (a.y.equals(big.minY) || a.y.equals(big.maxY));
                expect(onVertical || onHorizontal).toBe(true);
            });
        }
        expectTiling(diagram, B2, big);
    });

    it('is dual to the Delaunay triangulation: 8 interior edges, 5 hull edges', () => {
        expect(checkDuality(B2, diagram)).toEqual([]);
        const dual = dualEdges(diagram);
        expect(dual.finite).toHaveLength(8);
        expect(dual.unbounded).toHaveLength(5);
    });
});

describe('duality on random general-position sets', () => {
    it('holds exactly, with Euler edge counts and tiling clipped cells', () => {
        const random = rng(20261101);
        let checked = 0;
        for (let attempt = 0; attempt < 14; attempt++) {
            const n = [3, 4, 5, 8, 12, 20, 30, 40][attempt % 8] + (attempt >= 8 ? 1 : 0);
            const points = generalPositionSet(random, Math.min(n, 40), 600);
            if (points === null) continue;
            const diagram = build(points);
            expect(checkDuality(points, diagram)).toEqual([]);
            const tri = delaunayTriangulation(points);
            if (!tri.ok) throw new Error('general position set has no triangulation');
            const hullCount = triangulationEdges(tri.value).filter(e => !e.interior).length;
            expect(diagram.edges.filter(e => e.kind === 'ray')).toHaveLength(hullCount);
            expect(diagram.edges.filter(e => e.kind === 'segment')).toHaveLength(3 * points.length - 3 - 2 * hullCount);
            expect(diagram.vertices).toHaveLength(2 * points.length - 2 - hullCount);
            expect(diagram.vertices.every(v => v.sites.length === 3)).toBe(true);
            expect(diagram.cells.filter(c => c.bounded)).toHaveLength(points.length - hullCount);
            expectRays(points, diagram);
            expectTiling(diagram, points, box(-1500, -1500, 2100, 2100));
            checked++;
        }
        expect(checked).toBeGreaterThanOrEqual(10);
    });
});

describe('clipCell and nearestSites on query points', () => {
    function queryAgreement(points: readonly GridPoint[], diagram: VoronoiDiagram, b: RationalBox, seed: number, count: number) {
        const random = rng(seed);
        const clipped = points.map((_, site) => clipCell(diagram, points, site, b));
        const x0 = b.minX.toNumber();
        const y0 = b.minY.toNumber();
        const w = b.maxX.toNumber() - x0;
        const h = b.maxY.toNumber() - y0;
        let ties = 0;
        for (let i = 0; i < count; i++) {
            const den = 1 + random(6);
            // Strictly inside the box: numerators are chosen from integers well within it.
            const q = new RationalPoint(
                Rational.of(Math.floor(x0 * den) + 1 + random(Math.floor(w * den) - 2), den),
                Rational.of(Math.floor(y0 * den) + 1 + random(Math.floor(h * den) - 2), den),
            );
            const nearest = nearestSites(points, q);
            if (nearest.length > 1) ties++;
            points.forEach((_, site) => {
                expect(contains(clipped[site].polygon, q)).toBe(nearest.includes(site));
                if (!nearest.includes(site)) expect(contains(clipped[site].polygon, q, true)).toBe(false);
            });
        }
        return ties;
    }

    it('assigns each random rational query to exactly the cells of its nearest sites (B4 and random sets)', () => {
        queryAgreement(B2, build(B2), box(-10, -10, 20, 20), 7, 400);
        const random = rng(99);
        for (let k = 0; k < 4; k++) {
            const points = generalPositionSet(random, 6 + random(20), 60);
            if (points === null) continue;
            queryAgreement(points, build(points), box(-30, -30, 90, 90), 11 + k, 150);
        }
    });

    it('treats a tied query as lying in every tied cell (integer queries on a square)', () => {
        const square = pts([[0, 0], [2, 0], [2, 2], [0, 2]]);
        const ties = queryAgreement(square, build(square), box(-5, -5, 7, 7), 3, 300);
        expect(ties).toBeGreaterThan(0);
        expect(nearestSites(square, Q(1, 1, 1, 1))).toEqual([0, 1, 2, 3]);
    });

    it('nearestSites returns an empty set for no sites and rejects nothing else', () => {
        expect(nearestSites([], Q(0, 1, 0, 1))).toEqual([]);
        expect(nearestSites([P(3, 4)], Q(0, 1, 0, 1))).toEqual([0]);
    });

    it('refuses a degenerate box and an unknown site', () => {
        const diagram = build(B2);
        expect(() => clipCell(diagram, B2, 0, box(1, 1, 1, 5))).toThrow(RangeError);
        expect(() => clipCell(diagram, B2, 7, box(0, 0, 5, 5))).toThrow(RangeError);
    });

    it('marks a box inside a cell open on all four sides and a cell touching the box only at a corner empty', () => {
        const diagram = build(B2);
        const inner = clipCell(diagram, B2, 5, box(3, 3, 4, 4));
        expect(inner.polygon).toHaveLength(4);
        expect(inner.open).toEqual([true, true, true, true]);
        const far = clipCell(diagram, B2, 5, box(100, 100, 101, 101));
        expect(far).toEqual({polygon: [], open: []});
    });
});

describe('degenerate sites', () => {
    it('gives the unit square one vertex of degree four and four rays', () => {
        const points = pts([[0, 0], [1, 0], [1, 1], [0, 1]]);
        const diagram = build(points);
        expect(diagram.vertices.map(v => `${v.sites.join(',')}:${fmt(v.point)}`)).toEqual(['0,1,2,3:1/2,1/2']);
        expect(diagram.edges.map(e => e.kind)).toEqual(['ray', 'ray', 'ray', 'ray']);
        expect(diagram.edges.every(e => e.kind === 'ray' && e.vertex === 0)).toBe(true);
        expect(diagram.cells.every(c => !c.bounded && c.edges.length === 2)).toBe(true);
        expect(checkDuality(points, diagram)).toEqual([]);
        expectTiling(diagram, points, box(-3, -3, 4, 4));
    });

    it('gives five cocircular sites one vertex of degree five and five rays', () => {
        const points = pts([[5, 0], [3, 4], [-3, 4], [-5, 0], [-3, -4]]);
        const diagram = build(points);
        expect(diagram.vertices.map(v => `${v.sites.join(',')}:${fmt(v.point)}`)).toEqual(['0,1,2,3,4:0,0']);
        expect(diagram.edges).toHaveLength(5);
        expect(diagram.edges.every(e => e.kind === 'ray' && e.vertex === 0)).toBe(true);
        expectRays(points, diagram);
        expect(checkDuality(points, diagram)).toEqual([]);
        expectTiling(diagram, points, box(-20, -20, 20, 20));
    });

    it('gives the B5 trapezoid one vertex of degree four', () => {
        const points = pts([[0, 0], [8, 0], [9, 5], [-1, 5]]);
        const diagram = build(points);
        expect(diagram.vertices.map(v => `${v.sites.join(',')}:${fmt(v.point)}`)).toEqual(['0,1,2,3:4,17/5']);
        expect(diagram.edges.filter(e => e.kind === 'ray')).toHaveLength(4);
        expect(diagram.edges).toHaveLength(4);
        expect(checkDuality(points, diagram)).toEqual([]);
        expectTiling(diagram, points, box(-20, -20, 30, 30));
    });

    it('splits into two degree-three vertices joined by a segment one grid step off the circle', () => {
        const points = pts([[0, 0], [8, 0], [9, 6], [-1, 5]]);
        expect(incircleValue(points[0], points[1], points[2], points[3])).not.toBe(0n);
        const diagram = build(points);
        expect(diagram.vertices).toHaveLength(2);
        expect(diagram.vertices.every(v => v.sites.length === 3)).toBe(true);
        const segments = diagram.edges.filter(e => e.kind === 'segment');
        expect(segments).toHaveLength(1);
        expect(diagram.edges.filter(e => e.kind === 'ray')).toHaveLength(4);
        const incident = (v: number) => diagram.edges.filter(e =>
            (e.kind === 'segment' && (e.from === v || e.to === v)) || (e.kind === 'ray' && e.vertex === v)).length;
        expect([incident(0), incident(1)]).toEqual([3, 3]);
        expect(checkDuality(points, diagram)).toEqual([]);
        expectTiling(diagram, points, box(-30, -30, 40, 40));
    });

    it('keeps a collinear hull point: every hull edge gets a ray and the dual still holds', () => {
        const points = pts([[0, 0], [2, 0], [4, 0], [2, 3]]);
        const diagram = build(points);
        expect(diagram.vertices.map(v => fmt(v.point)).sort()).toEqual(['1,3/2', '3,3/2']);
        expect(diagram.edges.filter(e => e.kind === 'ray')).toHaveLength(4);
        expect(diagram.edges.filter(e => e.kind === 'segment')).toHaveLength(1);
        expect(checkDuality(points, diagram)).toEqual([]);
        expectTiling(diagram, points, box(-10, -10, 14, 14));
    });

    it('gives five collinear sites four parallel lines, no vertices and strip cells', () => {
        const points = pts([[2, 2], [0, 0], [4, 4], [1, 1], [3, 3]]);
        const diagram = build(points);
        expect(diagram.vertices).toEqual([]);
        expect(diagram.edges).toHaveLength(4);
        expect(diagram.edges.map(e => e.sites.join('-')).sort()).toEqual(['0-3', '0-4', '1-3', '2-4']);
        for (const e of diagram.edges) {
            if (e.kind !== 'line') throw new Error('expected lines');
            expect(nearestSites(points, e.point)).toEqual([...e.sites]);
            const along = RationalPoint.fromGrid(e.direction);
            expect(nearestSites(points, e.point.add(along.scale(Rational.of(7))))).toEqual([...e.sites]);
            expect(e.direction.x * 1 + e.direction.y * 1).toBe(0); // perpendicular to the (1,1) line
        }
        expect(diagram.cells.every(c => !c.bounded)).toBe(true);
        expect(diagram.cells.map(c => c.edges.length)).toEqual([2, 1, 1, 2, 2]);
        expect(checkDuality(points, diagram)).toEqual([]);
        expectTiling(diagram, points, box(-6, -6, 10, 10));
    });

    it('gives two sites one line, one site one edgeless cell filling the box, no sites an empty value', () => {
        const two = build(pts([[0, 0], [4, 2]]));
        expect(two.vertices).toEqual([]);
        expect(two.edges).toHaveLength(1);
        expect(two.edges[0]).toMatchObject({kind: 'line', sites: [0, 1], direction: {x: -1, y: 2}});
        expect(fmt((two.edges[0] as { point: RationalPoint }).point)).toBe('2,1');
        expectTiling(two, pts([[0, 0], [4, 2]]), box(-5, -5, 5, 5));

        const one = build([P(1, 1)]);
        expect(one.cells).toEqual([{site: 0, edges: [], bounded: false}]);
        const clipped = clipCell(one, [P(1, 1)], 0, box(0, 0, 3, 2));
        expect(clipped.polygon.map(fmt)).toEqual(['0,0', '3,0', '3,2', '0,2']);
        expect(clipped.open).toEqual([true, true, true, true]);

        expect(build([])).toEqual({vertices: [], edges: [], cells: []});
    });

    it('refuses duplicates, invalid points and too many points with a reason', () => {
        expect(voronoiFromDelaunay([P(0, 0), P(1, 0), P(0, 0)])).toEqual({ok: false, refusal: {kind: 'duplicate-point', indices: [0, 2]}});
        expect(voronoiFromDelaunay([P(1, 1), P(1, 1)])).toEqual({ok: false, refusal: {kind: 'duplicate-point', indices: [0, 1]}});
        expect(voronoiFromDelaunay([P(0, 0), P(0.5, 1), P(3, 1)])).toEqual({ok: false, refusal: {kind: 'invalid-point', index: 1}});
        expect(voronoiFromDelaunay(Array.from({length: 41}, (_, i) => P(i, i * i)))).toMatchObject({
            ok: false, refusal: {kind: 'too-many-points'},
        });
    });
});

describe('a diagram built by hand, without the Delaunay code', () => {
    const points = pts([[0, 0], [4, 0], [0, 4]]);
    const handBuilt: VoronoiDiagram = {
        vertices: [{point: Q(2, 1, 2, 1), sites: [0, 1, 2]}],
        edges: [
            {kind: 'ray', sites: [0, 1], vertex: 0, direction: {x: 0, y: -1}},
            {kind: 'ray', sites: [0, 2], vertex: 0, direction: {x: -1, y: 0}},
            {kind: 'ray', sites: [1, 2], vertex: 0, direction: {x: 1, y: 1}},
        ],
        cells: [
            {site: 0, edges: [0, 1], bounded: false},
            {site: 1, edges: [2, 0], bounded: false},
            {site: 2, edges: [1, 2], bounded: false},
        ],
    };

    it('clips every cell exactly and tiles the box', () => {
        const b = box(-4, -4, 10, 10);
        expectTiling(handBuilt, points, b);
        const clipped = clipCell(handBuilt, points, 0, b);
        expect(clipped.polygon.map(fmt)).toEqual(['-4,-4', '2,-4', '2,2', '-4,2']);
        expect(clipped.open).toEqual([true, false, false, true]);
    });

    it('agrees with the value built from Delaunay, clipped and queried through the same functions', () => {
        const built = build(points);
        const b = box(-4, -4, 10, 10);
        points.forEach((_, site) => {
            const a = clipCell(handBuilt, points, site, b);
            const c = clipCell(built, points, site, b);
            expect(a.polygon.map(fmt)).toEqual(c.polygon.map(fmt));
            expect(a.open).toEqual(c.open);
        });
        expect(built.vertices.map(v => fmt(v.point))).toEqual(['2,2']);
        expect(built.edges.map(e => [e.kind, e.sites.join('-'), JSON.stringify((e as { direction?: unknown }).direction)]))
            .toEqual(handBuilt.edges.map(e => [e.kind, e.sites.join('-'), JSON.stringify((e as { direction?: unknown }).direction)]));
        expect(built.cells).toEqual(handBuilt.cells);
        expect(nearestSites(points, Q(1, 1, 1, 1))).toEqual([0]);
    });
});
