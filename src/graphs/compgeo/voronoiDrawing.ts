/**
 * Board drawing of a `VoronoiDiagram` (spec triangulation-voronoi-lessons.md "Voronoi drawing", B4; task
 * triangulation-voronoi/18). Reused by the Delaunay duality graphs (19, 20) and, later, Fortune's graph.
 *
 * Input contract: only a `VoronoiDiagram`, the site points, a view box (exact rationals, in grid units) and options.
 * This file imports nothing from Delaunay or triangulation code and never recomputes the diagram. Every decision here
 * (which part of an edge lies in the box, which side of a clipped cell is open, which vertex is inside) is made on exact
 * rationals; rationals become doubles only when coordinates are handed to the board, and no decision compares them.
 *
 * Ownership: `createVoronoiDrawing` returns a handle that owns every board object it creates (cell fills, one batched
 * edge curve, vertex markers, "continues" markers). `update` reuses them and trims the surplus; `dispose` removes all.
 * The drawing registers no event listeners, so nothing besides the objects has to be released.
 */
import {clipCell, type RationalBox, type VoronoiDiagram, type VoronoiEdge} from '../../compgeo/voronoi';
import {Rational, RationalPoint} from '../../compgeo/rational';
import type {GridPoint} from '../../compgeo/grid';
import {constructionLevelColor, GraphPalette} from '../styles/GraphPalette';

export interface VoronoiDrawOptions {
    readonly cells: boolean;
    readonly edges: boolean;
    readonly vertices: boolean;
    /** Site index of the cell to emphasise, if any. */
    readonly highlightCell?: number;
}

export interface VoronoiDrawingStats {
    /** Edges whose part inside the box has positive length, by kind (zero when edges are switched off). */
    readonly segments: number;
    readonly rays: number;
    readonly lines: number;
    /** Vertex markers drawn (vertices inside the box), and how many of them have degree 4 or more. */
    readonly vertexMarkers: number;
    readonly highDegreeMarkers: number;
    /** "Continues" markers: exactly the open sides reported by `clipCell`, summed over the cells (zero when cells are off). */
    readonly continuesMarkers: number;
    readonly openCells: number;
    readonly closedCells: number;
    readonly cellPolygons: number;
}

export interface VoronoiDrawingHandle {
    update(diagram: VoronoiDiagram, points: readonly GridPoint[], box: RationalBox, options: VoronoiDrawOptions): VoronoiDrawingStats;
    /** Removes every board object the drawing created; a second call does nothing. */
    dispose(): void;
}

const half = Rational.of(1, 2);
const quarter = Rational.of(1, 4);

const maxOf = (a: Rational, b: Rational): Rational => (a.compare(b) >= 0 ? a : b);
const minOf = (a: Rational, b: Rational): Rational => (a.compare(b) <= 0 ? a : b);

/**
 * A box (grid units, exact) that contains every vertex and every site with a margin of a quarter of the larger extent,
 * and at least one grid unit, so it is never degenerate. Circumcentres outside the hull or the initial view are
 * included. The caller owns the Reset view control and decides when to apply the frame.
 */
export function frame(diagram: VoronoiDiagram, points: readonly GridPoint[]): RationalBox {
    const all: RationalPoint[] = [...points.map(p => RationalPoint.fromGrid(p)), ...diagram.vertices.map(v => v.point)];
    if (all.length === 0) {
        return {minX: Rational.of(-1), minY: Rational.of(-1), maxX: Rational.of(1), maxY: Rational.of(1)};
    }
    let minX = all[0].x;
    let maxX = all[0].x;
    let minY = all[0].y;
    let maxY = all[0].y;
    for (const p of all) {
        minX = minOf(minX, p.x);
        maxX = maxOf(maxX, p.x);
        minY = minOf(minY, p.y);
        maxY = maxOf(maxY, p.y);
    }
    const margin = maxOf(Rational.ONE, maxOf(maxX.sub(minX), maxY.sub(minY)).mul(quarter));
    return {minX: minX.sub(margin), minY: minY.sub(margin), maxX: maxX.add(margin), maxY: maxY.add(margin)};
}

/** True iff `p` lies in the closed box (exact). */
export function boxContains(box: RationalBox, p: RationalPoint): boolean {
    return p.x.compare(box.minX) >= 0 && p.x.compare(box.maxX) <= 0 && p.y.compare(box.minY) >= 0 && p.y.compare(box.maxY) <= 0;
}

/**
 * The part of `origin + t * direction` with `t` in `[lo, hi]` (an absent bound is unbounded) that lies in the box, or
 * undefined when it is empty or a single point. Exact (Liang-Barsky on rationals).
 */
export function clipToBox(
    origin: RationalPoint, direction: RationalPoint, lo: Rational | undefined, hi: Rational | undefined, box: RationalBox,
): [RationalPoint, RationalPoint] | undefined {
    let from = lo;
    let to = hi;
    const axes: [Rational, Rational, Rational, Rational][] = [
        [origin.x, direction.x, box.minX, box.maxX],
        [origin.y, direction.y, box.minY, box.maxY],
    ];
    for (const [o, d, min, max] of axes) {
        if (d.sign() === 0) {
            if (o.compare(min) < 0 || o.compare(max) > 0) return undefined;
            continue;
        }
        let t1 = min.sub(o).div(d);
        let t2 = max.sub(o).div(d);
        if (d.sign() < 0) [t1, t2] = [t2, t1];
        from = from === undefined ? t1 : maxOf(from, t1);
        to = to === undefined ? t2 : minOf(to, t2);
    }
    if (from === undefined || to === undefined || from.compare(to) >= 0) return undefined;
    return [origin.add(direction.scale(from)), origin.add(direction.scale(to))];
}

const integerDirection = (d: {readonly x: number; readonly y: number}): RationalPoint =>
    new RationalPoint(Rational.fromInt(d.x), Rational.fromInt(d.y));

/** The drawn extent of one edge inside the box: both ends are exact points; undefined if it does not reach the box. */
export function edgeInBox(diagram: VoronoiDiagram, edge: VoronoiEdge, box: RationalBox): [RationalPoint, RationalPoint] | undefined {
    switch (edge.kind) {
        case 'segment': {
            const a = diagram.vertices[edge.from].point;
            return clipToBox(a, diagram.vertices[edge.to].point.sub(a), Rational.ZERO, Rational.ONE, box);
        }
        case 'ray':
            return clipToBox(diagram.vertices[edge.vertex].point, integerDirection(edge.direction), Rational.ZERO, undefined, box);
        case 'line':
            return clipToBox(edge.point, integerDirection(edge.direction), undefined, undefined, box);
    }
}

/** The arrow for an open side lying on a box side (exact comparison with the box coordinates). */
function continuesGlyph(a: RationalPoint, b: RationalPoint, box: RationalBox): string {
    if (a.y.equals(box.minY) && b.y.equals(box.minY)) return '↓';
    if (a.y.equals(box.maxY) && b.y.equals(box.maxY)) return '↑';
    if (a.x.equals(box.minX) && b.x.equals(box.minX)) return '←';
    return '→';
}

/** Objects of one kind, reused across updates; the surplus is removed from the board. */
class Pool<T extends JXG.GeometryElement> {
    private readonly items: T[] = [];

    constructor(private readonly board: JXG.Board) {
    }

    get size(): number {
        return this.items.length;
    }

    use(count: number, create: () => T): T[] {
        while (this.items.length < count) this.items.push(create());
        while (this.items.length > count) this.board.removeObject(this.items.pop() as T);
        return this.items;
    }

    clear(): void {
        this.use(0, () => { throw new Error('unreachable'); });
    }
}

/** JSXGraph's own update-then-render pair for one element (the typings declare `updateRenderer` only on some element classes). */
function refresh(element: JXG.GeometryElement): void {
    const renderable = element as JXG.GeometryElement & {updateRenderer?: () => unknown};
    element.update();
    renderable.updateRenderer?.();
}

interface Position {
    x: number;
    y: number;
    glyph: string;
}

type DataCurve = JXG.Curve & { updateDataArray: () => void; dataX: number[]; dataY: number[] };

export function createVoronoiDrawing(board: JXG.Board, scale = 1): VoronoiDrawingHandle {
    const fills = new Pool<JXG.Curve>(board);
    const edgeCurves = new Pool<JXG.Curve>(board);
    const vertexMarkers = new Pool<JXG.Point>(board);
    const highMarkers = new Pool<JXG.Point>(board);
    const continues = new Pool<JXG.Text>(board);
    const data = new WeakMap<JXG.Curve, {x: number[]; y: number[]}>();
    const styles = new WeakMap<JXG.Curve, string>();
    // Markers read their position from a mutable record through function coordinates: moving one is then a plain
    // update of that element (`moveTo` would update the whole board for every marker).
    const positions = new WeakMap<JXG.GeometryElement, Position>();
    const makePoint = (style: object): JXG.Point => {
        const pos: Position = {x: 0, y: 0, glyph: ''};
        const point = board.create('point', [() => pos.x, () => pos.y], {
            withLabel: false, fixed: true, highlight: false, layer: 4, ...style,
        }) as JXG.Point;
        positions.set(point, pos);
        return point;
    };
    const placePoint = (point: JXG.Point, x: number, y: number): void => {
        const pos = positions.get(point) as Position;
        pos.x = x;
        pos.y = y;
        point.needsUpdate = true;
        refresh(point);
    };
    const makeText = (): JXG.Text => {
        const pos: Position = {x: 0, y: 0, glyph: ''};
        const text = board.create('text', [() => pos.x, () => pos.y, () => pos.glyph], {
            name: 'voronoi-continues', fixed: true, highlight: false, layer: 5, anchorX: 'middle', anchorY: 'middle',
            fontSize: 16, strokeColor: GraphPalette.label,
        }) as JXG.Text;
        positions.set(text, pos);
        return text;
    };
    let disposed = false;

    const toX = (r: Rational): number => r.toNumber() * scale;
    const toY = toX;

    const makeCurve = (attributes: object): JXG.Curve => {
        const store = {x: [] as number[], y: [] as number[]};
        const curve = board.create('curve', [[], []], {highlight: false, fixed: true, ...attributes}) as DataCurve;
        curve.updateDataArray = function (this: DataCurve) {
            this.dataX = store.x;
            this.dataY = store.y;
        };
        data.set(curve, store);
        return curve;
    };
    const setCurve = (curve: JXG.Curve, xs: number[], ys: number[]): void => {
        const store = data.get(curve) as {x: number[]; y: number[]};
        store.x = xs;
        store.y = ys;
        curve.needsUpdate = true;
        curve.update();
        curve.updateRenderer();
    };

    function update(diagram: VoronoiDiagram, points: readonly GridPoint[], box: RationalBox, options: VoronoiDrawOptions): VoronoiDrawingStats {
        if (disposed) throw new Error('the Voronoi drawing is disposed');
        let segments = 0;
        let rays = 0;
        let lines = 0;
        let openCells = 0;
        let closedCells = 0;
        let cellPolygons = 0;
        const glyphs: {at: RationalPoint; glyph: string}[] = [];

        // Cells: one filled curve per cell with a non-empty clipped polygon.
        if (options.cells) {
            const polygons: {site: number; xs: number[]; ys: number[]}[] = [];
            diagram.cells.forEach(cell => {
                const clipped = clipCell(diagram, points, cell.site, box);
                if (clipped.polygon.length === 0) return;
                const xs = clipped.polygon.map(p => toX(p.x));
                const ys = clipped.polygon.map(p => toY(p.y));
                polygons.push({site: cell.site, xs: [...xs, xs[0]], ys: [...ys, ys[0]]});
                if (clipped.open.some(Boolean)) openCells++; else closedCells++;
                clipped.open.forEach((isOpen, k) => {
                    if (!isOpen) return;
                    const a = clipped.polygon[k];
                    const b = clipped.polygon[(k + 1) % clipped.polygon.length];
                    glyphs.push({at: new RationalPoint(a.x.add(b.x).mul(half), a.y.add(b.y).mul(half)), glyph: continuesGlyph(a, b, box)});
                });
            });
            cellPolygons = polygons.length;
            const curves = fills.use(polygons.length, () => makeCurve({
                name: 'voronoi-cell', layer: 0, strokeWidth: 0, strokeColor: 'none', hasInnerPoints: false,
            }));
            polygons.forEach(({site, xs, ys}, k) => {
                const highlighted = options.highlightCell === site;
                // setAttribute is costly (it re-renders the element), so restyle only when the style changed.
                const style = `${site}|${highlighted}`;
                if (styles.get(curves[k]) !== style) {
                    styles.set(curves[k], style);
                    curves[k].setAttribute({
                        fillColor: constructionLevelColor(site), fillOpacity: highlighted ? 0.45 : 0.14,
                        strokeColor: highlighted ? GraphPalette.selectedControlPointOutline : 'none', strokeWidth: highlighted ? 3 : 0,
                    });
                }
                setCurve(curves[k], xs, ys);
            });
        } else {
            fills.clear();
        }

        // Edges: one batched curve, pieces separated by NaN so the renderer breaks the path.
        if (options.edges) {
            const xs: number[] = [];
            const ys: number[] = [];
            for (const edge of diagram.edges) {
                const piece = edgeInBox(diagram, edge, box);
                if (!piece) continue;
                if (edge.kind === 'segment') segments++; else if (edge.kind === 'ray') rays++; else lines++;
                if (xs.length > 0) { xs.push(NaN); ys.push(NaN); }
                xs.push(toX(piece[0].x), toX(piece[1].x));
                ys.push(toY(piece[0].y), toY(piece[1].y));
            }
            const [curve] = edgeCurves.use(1, () => makeCurve({
                name: 'voronoi-edges', layer: 2, strokeColor: GraphPalette.primaryCurve, strokeWidth: 2.5,
            }));
            setCurve(curve, xs, ys);
        } else {
            edgeCurves.clear();
        }

        // Vertex markers: a plain disc for degree 3, a larger diamond for degree 4 or more (shape, not colour).
        let plain = 0;
        let high = 0;
        if (options.vertices) {
            const inside = diagram.vertices.filter(v => boxContains(box, v.point));
            const low = inside.filter(v => v.sites.length < 4);
            const many = inside.filter(v => v.sites.length >= 4);
            plain = low.length;
            high = many.length;
            const plainStyle = {
                name: 'voronoi-vertex', size: 4, face: 'o', fillColor: GraphPalette.derivedPoint, strokeColor: GraphPalette.selectedControlPointOutline,
            };
            const highStyle = {
                name: 'voronoi-vertex-degree4', size: 7, face: 'diamond', fillColor: GraphPalette.warningText, strokeColor: GraphPalette.selectedControlPointOutline,
            };
            // Degree 4 or more is a diamond and larger, so it is distinguishable without colour.
            const lowMarkers = vertexMarkers.use(low.length, () => makePoint(plainStyle));
            const highMarkersNow = highMarkers.use(many.length, () => makePoint(highStyle));
            low.forEach((v, k) => placePoint(lowMarkers[k], toX(v.point.x), toY(v.point.y)));
            many.forEach((v, k) => placePoint(highMarkersNow[k], toX(v.point.x), toY(v.point.y)));
        } else {
            vertexMarkers.clear();
            highMarkers.clear();
        }

        // "Continues" markers, one per open side of a clipped cell.
        const texts = continues.use(glyphs.length, makeText);
        glyphs.forEach(({at, glyph}, k) => {
            const pos = positions.get(texts[k]) as Position;
            pos.x = toX(at.x);
            pos.y = toY(at.y);
            pos.glyph = glyph;
            texts[k].needsUpdate = true;
            refresh(texts[k]);
        });

        return {
            segments, rays, lines, vertexMarkers: plain + high, highDegreeMarkers: high,
            continuesMarkers: glyphs.length, openCells, closedCells, cellPolygons,
        };
    }

    return {
        update,
        dispose() {
            if (disposed) return;
            disposed = true;
            for (const pool of [fills, edgeCurves, vertexMarkers, highMarkers, continues] as Pool<JXG.GeometryElement>[]) pool.clear();
        },
    };
}
