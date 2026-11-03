/**
 * The board objects of the running Fortune sweep (task sweep-algorithms/23): sweep line, beach line, breakpoints, traced
 * half-edges, scheduled and cancelled circles with their lowest points, and the vertices found so far. Everything is
 * created once per kind, reused across steps and drags (data and positions are updated in place; surplus objects are
 * removed), and removed by `dispose`. Doubles only: the drawing never feeds back into the kernel.
 *
 * The beach line is one JSXGraph curve (every arc's fixed-count samples concatenated), updated in place. Chosen over one
 * curve per arc by measurement (docs/reviews/sweep-algorithms/23-perf.md).
 */
import type {RationalBox} from '../../compgeo/voronoi';
import {GraphPalette} from '../styles/GraphPalette';
import {CIRCLE_SAMPLES, type CircleDraw, type FortuneView, type Pt} from './fortuneGeometry';

export interface FortuneSweepHandle {
    update(view: FortuneView, box: RationalBox): void;
    /** Empties every pool (the finished diagram is drawn by the Voronoi drawing instead). */
    clear(): void;
    /** Removes every board object; a second call does nothing. */
    dispose(): void;
}

interface Position {
    x: number;
    y: number;
}

/** Stroke width of the current event's objects: thicker than the sweep line (2), the beach line and the traces (3). */
const CURRENT_WIDTH = 5;

type DataCurve = JXG.Curve & {updateDataArray: () => void; dataX: number[]; dataY: number[]};

function refresh(element: JXG.GeometryElement): void {
    const renderable = element as JXG.GeometryElement & {updateRenderer?: () => unknown};
    element.update();
    renderable.updateRenderer?.();
}

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

export function createFortuneSweepDrawing(board: JXG.Board, scale: number): FortuneSweepHandle {
    const data = new WeakMap<JXG.Curve, {x: number[]; y: number[]}>();
    const positions = new WeakMap<JXG.GeometryElement, Position>();
    let disposed = false;

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
    const makePoint = (attributes: object): JXG.Point => {
        const pos: Position = {x: 0, y: 0};
        const point = board.create('point', [() => pos.x, () => pos.y], {
            withLabel: false, fixed: true, highlight: false, showInfobox: false, ...attributes,
        }) as JXG.Point;
        positions.set(point, pos);
        return point;
    };
    const place = (point: JXG.Point, at: Pt): void => {
        const pos = positions.get(point) as Position;
        pos.x = at.x * scale;
        pos.y = at.y * scale;
        point.needsUpdate = true;
        refresh(point);
    };

    const sweepLine = makeCurve({
        name: 'fortune-sweep-line', layer: 3, strokeColor: GraphPalette.constructionAccent, strokeWidth: 2,
    });
    const beachLine = makeCurve({name: 'fortune-beach', layer: 4, strokeColor: GraphPalette.primaryCurve, strokeWidth: 3});
    const breakpoints = new Pool<JXG.Point>(board);
    const traces = new Pool<JXG.Curve>(board);
    const circles = new Pool<JXG.Curve>(board);
    const lows = new Pool<JXG.Point>(board);
    const falseCircles = new Pool<JXG.Curve>(board);
    const falseMarks = new Pool<JXG.Point>(board);
    const vertices = new Pool<JXG.Point>(board);
    // The event processed at this step (spec C-7), thickest as in Bentley-Ottmann: a ring on the site, or the executed circle
    // (no longer queued, so not drawn above) with a ring on the vertex it created. Each pool holds zero or one object.
    const currentSites = new Pool<JXG.Point>(board);
    const currentCircles = new Pool<JXG.Curve>(board);
    const currentVertices = new Pool<JXG.Point>(board);

    const circleOutline = (c: CircleDraw): {xs: number[]; ys: number[]} => {
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 0; i <= CIRCLE_SAMPLES; i++) {
            const angle = (2 * Math.PI * i) / CIRCLE_SAMPLES;
            xs.push((c.centre.x + c.radius * Math.cos(angle)) * scale);
            ys.push((c.centre.y + c.radius * Math.sin(angle)) * scale);
        }
        return {xs, ys};
    };

    function update(view: FortuneView, box: RationalBox): void {
        if (disposed) throw new Error('the Fortune drawing is disposed');
        const [minX, maxX, minY, maxY] = [box.minX.toNumber(), box.maxX.toNumber(), box.minY.toNumber(), box.maxY.toNumber()];
        const top = maxY + (maxY - minY);

        setCurve(sweepLine, [minX * scale, maxX * scale], [view.lineY * scale, view.lineY * scale]);

        const xs: number[] = [];
        const ys: number[] = [];
        for (const arc of view.arcs) {
            for (let i = 0; i < arc.xs.length; i++) {
                xs.push(arc.xs[i] * scale);
                ys.push(arc.ys[i] * scale);
            }
        }
        setCurve(beachLine, xs, ys);

        const points = breakpoints.use(view.breakpoints.length, () => makePoint({
            name: 'fortune-breakpoint', layer: 6, face: 'o', size: 4, strokeColor: GraphPalette.selectedControlPointOutline, fillColor: GraphPalette.constructionAccent,
        }));
        view.breakpoints.forEach((bp, k) => place(points[k], bp.at));

        // Half-edges: each from where its trace began (or up to the box for a trace from infinity) to its breakpoint or vertex.
        const segments: {from: Pt; to: Pt}[] = [];
        for (const bp of view.breakpoints) segments.push({from: bp.from ?? {x: bp.at.x, y: top}, to: bp.at});
        for (const done of view.finished) segments.push({from: done.from ?? {x: done.to.x, y: top}, to: done.to});
        const lines = traces.use(segments.length, () => makeCurve({name: 'fortune-trace', layer: 3, strokeColor: GraphPalette.comparisonCurve, strokeWidth: 3}));
        segments.forEach((s, k) => setCurve(lines[k], [s.from.x * scale, s.to.x * scale], [s.from.y * scale, s.to.y * scale]));

        const live = circles.use(view.scheduled.length, () => makeCurve({
            name: 'fortune-circle', layer: 2, strokeColor: GraphPalette.constructionAccent, strokeWidth: 2,
        }));
        view.scheduled.forEach((c, k) => { const o = circleOutline(c); setCurve(live[k], o.xs, o.ys); });
        const lowMarks = lows.use(view.scheduled.length, () => makePoint({
            name: 'fortune-circle-low', layer: 6, face: 'diamond', size: 6, strokeColor: GraphPalette.selectedControlPointOutline, fillColor: GraphPalette.constructionAccent,
        }));
        view.scheduled.forEach((c, k) => place(lowMarks[k], c.low));

        // A cancelled circle (a false alarm): dashed, with a cross at its lowest point, so it differs by shape and not by colour alone.
        const dashed = falseCircles.use(view.cancelled.length, () => makeCurve({
            name: 'fortune-circle-cancelled', layer: 2, strokeColor: GraphPalette.warningText, strokeWidth: 2, dash: 3,
        }));
        view.cancelled.forEach((c, k) => { const o = circleOutline(c); setCurve(dashed[k], o.xs, o.ys); });
        const crosses = falseMarks.use(view.cancelled.length, () => makePoint({
            name: 'fortune-circle-cancelled-mark', layer: 6, face: 'cross', size: 6, strokeColor: GraphPalette.warningText, fillColor: GraphPalette.warningText,
        }));
        view.cancelled.forEach((c, k) => place(crosses[k], c.low));

        const found = vertices.use(view.vertices.length, () => makePoint({
            name: 'fortune-vertex', layer: 7, face: 'square', size: 5, strokeColor: GraphPalette.selectedControlPointOutline, fillColor: GraphPalette.warningText,
        }));
        view.vertices.forEach((v, k) => place(found[k], v));

        const now = view.current;
        const ring = (name: string) => makePoint({
            name, layer: 8, face: 'o', size: 9, strokeColor: GraphPalette.constructionAccent, strokeWidth: CURRENT_WIDTH, fillOpacity: 0, highlightFillOpacity: 0,
        });
        const ringedSite = currentSites.use(now?.kind === 'site' ? 1 : 0, () => ring('fortune-current-site'));
        if (now?.kind === 'site') place(ringedSite[0], now.at);
        const ringedCircle = currentCircles.use(now?.kind === 'circle' ? 1 : 0, () => makeCurve({
            name: 'fortune-current-circle', layer: 2, strokeColor: GraphPalette.constructionAccent, strokeWidth: CURRENT_WIDTH,
        }));
        const ringedVertex = currentVertices.use(now?.kind === 'circle' ? 1 : 0, () => ring('fortune-current-vertex'));
        if (now?.kind === 'circle') {
            const o = circleOutline(now.circle);
            setCurve(ringedCircle[0], o.xs, o.ys);
            place(ringedVertex[0], now.vertex);
        }
    }

    function clear(): void {
        breakpoints.clear();
        traces.clear();
        circles.clear();
        lows.clear();
        falseCircles.clear();
        falseMarks.clear();
        vertices.clear();
        currentSites.clear();
        currentCircles.clear();
        currentVertices.clear();
        setCurve(beachLine, [], []);
        setCurve(sweepLine, [], []);
    }

    function dispose(): void {
        if (disposed) return;
        clear();
        board.removeObject(sweepLine);
        board.removeObject(beachLine);
        disposed = true;
    }

    return {update, clear, dispose};
}
