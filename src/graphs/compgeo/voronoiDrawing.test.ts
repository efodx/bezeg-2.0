import {JSXGraph} from 'jsxgraph';
import {installBoardShims} from '../base/realGraphTestHarness';
import {Rational, RationalPoint} from '../../compgeo/rational';
import type {GridPoint} from '../../compgeo/grid';
import {clipCell, voronoiFromDelaunay, type RationalBox, type VoronoiDiagram} from '../../compgeo/voronoi';
import {
    boxContains, clipToBox, createVoronoiDrawing, edgeInBox, frame, type VoronoiDrawOptions, type VoronoiDrawingHandle,
} from './voronoiDrawing';

// Task 18. The drawing takes only a `VoronoiDiagram`; these tests build values with the kernel (as a caller would) and by
// hand. The Delaunay code is used here to make inputs, never inside the module.
beforeAll(installBoardShims);

const P = (x: number, y: number): GridPoint => ({x, y});
const pts = (list: readonly (readonly [number, number])[]): GridPoint[] => list.map(([x, y]) => P(x, y));
const Q = (xn: number, xd: number, yn: number, yd: number) => new RationalPoint(Rational.of(xn, xd), Rational.of(yn, yd));
const box = (a: number, b: number, c: number, d: number): RationalBox =>
    ({minX: Rational.of(a), minY: Rational.of(b), maxX: Rational.of(c), maxY: Rational.of(d)});
const ALL: VoronoiDrawOptions = {cells: true, edges: true, vertices: true};

function build(points: readonly GridPoint[]): VoronoiDiagram {
    const outcome = voronoiFromDelaunay(points);
    if (!outcome.ok) throw new Error(`unexpected refusal ${outcome.refusal.kind}`);
    return outcome.value;
}

interface Shown {
    name?: string;
    X?: () => number;
    Y?: () => number;
    dataX?: number[];
    dataY?: number[];
    plaintext?: string;
    visProp?: Record<string, unknown>;
}

let board: JXG.Board;
let container: HTMLDivElement;
let handle: VoronoiDrawingHandle;
let baseline: number;

beforeEach(() => {
    container = document.createElement('div');
    container.id = `voronoi-drawing-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    board = JSXGraph.initBoard(container.id, {
        boundingbox: [-20, 20, 20, -20], axis: false, showCopyright: false, showNavigation: false, renderer: 'svg',
    });
    baseline = board.objectsList.length;
    handle = createVoronoiDrawing(board);
});

afterEach(() => {
    handle.dispose();
    JSXGraph.freeBoard(board);
    container.remove();
});

const objects = (): Shown[] => board.objectsList as unknown as Shown[];
const named = (name: string): Shown[] => objects().filter(o => o.name === name);

/** Open sides of every cell as `clipCell` reports them (the independent count the markers must equal). */
function openSides(diagram: VoronoiDiagram, points: readonly GridPoint[], b: RationalBox): number {
    return diagram.cells.reduce((sum, cell) => sum + clipCell(diagram, points, cell.site, b).open.filter(Boolean).length, 0);
}

const B2 = pts([[0, 0], [8, 0], [9, 6], [4, 8], [-1, 5], [3, 3], [6, 3]]);
const B4_VERTICES: readonly RationalPoint[] = [
    Q(4, 1, -1, 1), Q(1, 3, 8, 3), Q(91, 10, 29, 10), Q(9, 2, -1, 6), Q(85, 14, 83, 14), Q(21, 11, 64, 11), Q(9, 2, 53, 10),
];

describe('the B4 example (seven points of B2)', () => {
    const diagram = build(B2);

    it('draws 7 vertex markers at the spec vertices, 8 segments, 5 rays, 5 open cells with markers and 2 closed', () => {
        const b = frame(diagram, B2);
        const stats = handle.update(diagram, B2, b, ALL);
        expect(stats).toMatchObject({segments: 8, rays: 5, lines: 0, vertexMarkers: 7, highDegreeMarkers: 0, openCells: 5, closedCells: 2, cellPolygons: 7});
        const markers = named('voronoi-vertex').map(o => [o.X?.(), o.Y?.()]);
        expect(markers).toHaveLength(7);
        for (const v of B4_VERTICES) {
            expect(markers.some(([x, y]) => Math.abs((x as number) - v.x.toNumber()) < 1e-12 && Math.abs((y as number) - v.y.toNumber()) < 1e-12)).toBe(true);
        }
        expect(named('voronoi-continues')).toHaveLength(stats.continuesMarkers);
        expect(stats.continuesMarkers).toBe(openSides(diagram, B2, b));
        expect(stats.continuesMarkers).toBeGreaterThanOrEqual(5);
        expect(named('voronoi-cell')).toHaveLength(7);
        expect(named('voronoi-edges')).toHaveLength(1);
    });

    it('extends every ray away from the remaining sites: the end point is equidistant from the pair and no site is nearer', () => {
        const b = frame(diagram, B2);
        let rays = 0;
        for (const edge of diagram.edges) {
            const piece = edgeInBox(diagram, edge, b);
            expect(piece).toBeDefined();
            const [i, j] = edge.sites;
            for (const end of piece ?? []) {
                const dist = (s: number) => end.sub(RationalPoint.fromGrid(B2[s])).dot(end.sub(RationalPoint.fromGrid(B2[s])));
                expect(dist(i).equals(dist(j))).toBe(true);
                B2.forEach((_, s) => expect(dist(s).compare(dist(i))).toBeGreaterThanOrEqual(0));
            }
            if (edge.kind === 'ray') {
                rays++;
                const [from, to] = piece as [RationalPoint, RationalPoint];
                const v = diagram.vertices[edge.vertex].point;
                expect(from.equals(v)).toBe(true);
                // The far end lies on the box boundary, in the stored direction.
                const onBoundary = to.x.equals(b.minX) || to.x.equals(b.maxX) || to.y.equals(b.minY) || to.y.equals(b.maxY);
                expect(onBoundary).toBe(true);
                const d = to.sub(from);
                expect(d.x.mul(Rational.fromInt(edge.direction.y)).equals(d.y.mul(Rational.fromInt(edge.direction.x)))).toBe(true);
                expect(d.dot(new RationalPoint(Rational.fromInt(edge.direction.x), Rational.fromInt(edge.direction.y))).sign()).toBe(1);
            }
        }
        expect(rays).toBe(5);
    });

    it('frame contains every vertex and every site', () => {
        const b = frame(diagram, B2);
        for (const v of diagram.vertices) expect(boxContains(b, v.point)).toBe(true);
        for (const p of B2) expect(boxContains(b, RationalPoint.fromGrid(p))).toBe(true);
    });
});

describe('five collinear sites', () => {
    const line = pts([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
    const diagram = build(line);

    it('draws four full lines, no vertex markers, and every strip cell open', () => {
        const b = frame(diagram, line);
        const stats = handle.update(diagram, line, b, ALL);
        expect(stats).toMatchObject({segments: 0, rays: 0, lines: 4, vertexMarkers: 0, openCells: 5, closedCells: 0});
        expect(named('voronoi-vertex')).toHaveLength(0);
        expect(stats.continuesMarkers).toBe(openSides(diagram, line, b));
        expect(stats.continuesMarkers).toBeGreaterThanOrEqual(5);
    });
});

describe('a diagram built without the Delaunay code', () => {
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

    it('draws exactly like the Delaunay-built value for the same sites', () => {
        const b = box(-6, -6, 12, 12);
        const statsHand = handle.update(handBuilt, points, b, ALL);
        const dataOf = () => objects().filter(o => o.dataX).map(o => [o.name, o.dataX, o.dataY]);
        const handData = JSON.stringify(dataOf());
        const markers = JSON.stringify(named('voronoi-continues').map(o => [o.plaintext, o.X?.(), o.Y?.()]));
        const statsBuilt = handle.update(build(points), points, b, ALL);
        expect(statsBuilt).toEqual(statsHand);
        expect(statsHand).toMatchObject({rays: 3, vertexMarkers: 1, openCells: 3});
        expect(JSON.stringify(dataOf())).toBe(handData);
        expect(JSON.stringify(named('voronoi-continues').map(o => [o.plaintext, o.X?.(), o.Y?.()]))).toBe(markers);
    });
});

describe('zooming and panning', () => {
    const diagram = build(B2);

    it('keeps one marker per open side and every clipped polygon vertex inside the box, at every zoom', () => {
        const boxes = [frame(diagram, B2), box(-100, -100, 100, 100), box(0, 0, 9, 8), box(2, 2, 5, 5), box(-3, -2, 4, 3), box(7, 4, 30, 30)];
        for (const b of boxes) {
            const stats = handle.update(diagram, B2, b, ALL);
            expect(stats.continuesMarkers).toBe(openSides(diagram, B2, b));
            expect(named('voronoi-continues')).toHaveLength(stats.continuesMarkers);
            for (const cell of diagram.cells) {
                for (const p of clipCell(diagram, B2, cell.site, b).polygon) expect(boxContains(b, p)).toBe(true);
            }
        }
    });

    it('clips the same cell consistently: zooming out then back gives the same polygon and the same drawn data', () => {
        const near = box(-3, -2, 12, 10);
        handle.update(diagram, B2, near, ALL);
        const first = JSON.stringify(named('voronoi-cell').map(o => o.dataX));
        handle.update(diagram, B2, box(-100, -100, 100, 100), ALL);
        handle.update(diagram, B2, near, ALL);
        expect(JSON.stringify(named('voronoi-cell').map(o => o.dataX))).toBe(first);
    });

    it('draws no vertex marker outside the box, and no edge or cell for a box far from the diagram', () => {
        const stats = handle.update(diagram, B2, box(1000, 1000, 1001, 1001), ALL);
        expect(stats.vertexMarkers).toBe(0);
        expect(stats.segments).toBe(0);
        expect(stats.rays).toBe(0);
    });
});

describe('options and degree four', () => {
    it('draws cells, edges and vertices only when asked, and emphasises the highlighted cell', () => {
        const diagram = build(B2);
        const b = frame(diagram, B2);
        const off = {cells: false, edges: false, vertices: false};
        expect(handle.update(diagram, B2, b, off)).toMatchObject({segments: 0, vertexMarkers: 0, continuesMarkers: 0, cellPolygons: 0});
        expect(objects().length).toBe(baseline);
        handle.update(diagram, B2, b, {...off, vertices: true});
        expect(named('voronoi-vertex')).toHaveLength(7);
        expect(named('voronoi-edges')).toHaveLength(0);
        expect(named('voronoi-cell')).toHaveLength(0);
        handle.update(diagram, B2, b, {...off, edges: true});
        expect(named('voronoi-edges')).toHaveLength(1);
        expect(named('voronoi-vertex')).toHaveLength(0);
        handle.update(diagram, B2, b, {...off, cells: true, highlightCell: 5});
        const opacities = named('voronoi-cell').map(o => o.visProp?.fillopacity as number);
        expect(opacities).toHaveLength(7);
        expect(opacities.filter(o => o > 0.3)).toHaveLength(1);
        handle.update(diagram, B2, b, {...off, cells: true});
        expect(named('voronoi-cell').filter(o => (o.visProp?.fillopacity as number) > 0.3)).toHaveLength(0);
    });

    it('marks a vertex of degree four with a different shape, not only a colour', () => {
        const square = pts([[0, 0], [2, 0], [2, 2], [0, 2]]);
        const diagram = build(square);
        const stats = handle.update(diagram, square, frame(diagram, square), ALL);
        expect(stats).toMatchObject({vertexMarkers: 1, highDegreeMarkers: 1});
        const marker = named('voronoi-vertex-degree4')[0];
        expect(marker.visProp?.face).toBe('diamond');
        expect(marker.visProp?.size).toBeGreaterThan(4);
    });
});

describe('ownership and disposal', () => {
    it('reuses its objects on redraw instead of leaking them', () => {
        const diagram = build(B2);
        const b = frame(diagram, B2);
        handle.update(diagram, B2, b, ALL);
        const before = objects().slice();
        for (let i = 0; i < 5; i++) handle.update(diagram, B2, b, ALL);
        expect(objects().length).toBe(before.length);
        expect(objects().every((o, k) => o === before[k])).toBe(true);
    });

    it('trims surplus objects when the diagram shrinks', () => {
        handle.update(build(B2), B2, frame(build(B2), B2), ALL);
        const small = pts([[0, 0], [4, 0], [0, 4]]);
        handle.update(build(small), small, frame(build(small), small), ALL);
        expect(named('voronoi-cell')).toHaveLength(3);
        expect(named('voronoi-vertex')).toHaveLength(1);
    });

    it('dispose leaves no board objects, and a second call is harmless', () => {
        const diagram = build(B2);
        handle.update(diagram, B2, frame(diagram, B2), ALL);
        expect(objects().length).toBeGreaterThan(baseline);
        handle.dispose();
        expect(objects().length).toBe(baseline);
        expect(() => handle.dispose()).not.toThrow();
        expect(objects().length).toBe(baseline);
        expect(() => handle.update(diagram, B2, frame(diagram, B2), ALL)).toThrow();
    });
});

describe('box arithmetic', () => {
    it('frame is never degenerate and grows to include a far circumcentre', () => {
        const flat = pts([[0, 0], [1, 0], [2, 0]]);
        const b = frame(build(flat), flat);
        expect(b.minX.compare(b.maxX)).toBe(-1);
        expect(b.minY.compare(b.maxY)).toBe(-1);
        const sliver = pts([[0, 0], [1000, 1], [-1000, 1]]);
        const diagram = build(sliver);
        const sb = frame(diagram, sliver);
        diagram.vertices.forEach(v => expect(boxContains(sb, v.point)).toBe(true));
    });

    it('clipToBox keeps exact rationals and drops pieces that miss the box or touch it in a point', () => {
        const b = box(0, 0, 10, 10);
        const origin = Q(1, 3, 1, 3);
        const piece = clipToBox(origin, new RationalPoint(Rational.of(1), Rational.of(0)), Rational.ZERO, undefined, b);
        expect(piece?.[0].equals(origin)).toBe(true);
        expect(piece?.[1].equals(Q(10, 1, 1, 3))).toBe(true);
        expect(clipToBox(Q(-1, 1, 5, 1), new RationalPoint(Rational.of(-1), Rational.of(0)), Rational.ZERO, undefined, b)).toBeUndefined();
        expect(clipToBox(Q(10, 1, 5, 1), new RationalPoint(Rational.of(1), Rational.of(0)), Rational.ZERO, undefined, b)).toBeUndefined();
        const full = clipToBox(Q(5, 1, 5, 1), new RationalPoint(Rational.of(1), Rational.of(1)), undefined, undefined, b);
        expect(full?.map(p => `${p.x.format()},${p.y.format()}`)).toEqual(['0,0', '10,10']);
    });
});
