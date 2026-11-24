import type {Mat2, Vec2} from '../../linear/matrix2';
import type {ViewMark, ViewMarks} from '../base/declare/graphDeclaration';
import type {Polyline} from './linearMapScene';
import type {EigenView} from './eigenScene';
import type {EllipseView} from './ellipseScene';
import type {CompositionView} from './compositionScene';
import {DRAW_LIMIT, iterateAt, orbitPolyline, STABILITY_TRIANGLE, type IterationView, type TraceDetView} from './iterationScene';

/** What the view director needs of the linear map's current mode (task 07). Only the part of the mode in `mode` is read. */
export type LinearMapMarkSource =
    | {readonly mode: 'basis' | 'determinant'; readonly a1: Vec2; readonly a2: Vec2; readonly square: readonly Vec2[]; readonly curve?: readonly Vec2[]}
    | {readonly mode: 'eigen'; readonly eigen: EigenView}
    | {readonly mode: 'ellipse'; readonly ellipse: EllipseView; readonly conicVisible: boolean}
    | {readonly mode: 'composition'; readonly composition: CompositionView}
    | {readonly mode: 'iterate'; readonly matrix: Mat2; readonly iteration: IterationView; readonly start: Vec2; readonly step: number}
    | {readonly mode: 'tracedet'; readonly traceDet: TraceDetView};

const finite = (p: readonly number[]): boolean => p.every(Number.isFinite);
const point = (p: readonly number[]): ViewMark => ({kind: 'point', x: p[0], y: p[1]});
const points = (list: readonly (readonly number[])[]): ViewMark[] => list.filter(finite).map(point);
const polyline = (line: readonly (readonly [number, number])[]): ViewMark[] => {
    const kept = line.filter(finite);
    return kept.length > 1 ? [{kind: 'polyline', points: kept}] : [];
};
const polylineOf = (line: Polyline): ViewMark[] => polyline(line.x.map((x, i) => [x, line.y[i]] as const));

/** The bounding box of the finite points of a polyline, as a mark; none when there are no finite points. */
function boxOf(line: Polyline): ViewMark[] {
    const xs = line.x.filter((x, i) => Number.isFinite(x) && Number.isFinite(line.y[i]));
    const ys = line.y.filter((y, i) => Number.isFinite(y) && Number.isFinite(line.x[i]));
    return xs.length === 0 ? [] : [{kind: 'box', left: Math.min(...xs), right: Math.max(...xs), top: Math.max(...ys), bottom: Math.min(...ys)}];
}

const UNIT_SQUARE: readonly Vec2[] = [[0, 0], [1, 0], [0, 1], [1, 1]];
const UNIT_BOX: ViewMark = {kind: 'box', left: -1, top: 1, right: 1, bottom: -1};

/**
 * The marks of the mode, from its derived numbers (no board reads). `must` is the picture the mode is about (the unit square and its
 * image; the test vector and its image; the image ellipse and its axes; both curves and the pivot; the start and the current iterate;
 * the point (tau, delta)), `nice` the context around it (the eigen-lines, the unit circle, the whole orbit, the stability triangle). The composition mode has no context marks: its grids span the plane.
 * Non-finite points are left out; an iterate beyond the draw limit is not drawn, so it is not a mark.
 */
export function linearMapViewMarks(source: LinearMapMarkSource): ViewMarks {
    switch (source.mode) {
        case 'basis':
        case 'determinant':
            return {must: [...points(UNIT_SQUARE), ...points(source.square), ...points([source.a1, source.a2])], nice: source.curve ? polyline(source.curve.map(p => [p[0], p[1]] as const)) : []};
        case 'eigen': {
            const {v, av, lines} = source.eigen;
            return {must: points([v, av]), nice: [UNIT_BOX, ...points(lines.flatMap(line => [line, [-line[0], -line[1]]]))]};
        }
        case 'ellipse': {
            const {ellipse, conicVisible} = source;
            const tips = conicVisible ? ellipse.conicAxes : [...ellipse.axes, ...ellipse.directions];
            const shown = conicVisible ? ellipse.conic.curve : ellipse.imageCurve;
            return {
                must: [...points(tips.map(t => t.tip)), ...(shown ? boxOf(shown) : [])],
                nice: [UNIT_BOX, ...(shown ? polylineOf(shown) : [])],
            };
        }
        case 'composition': {
            const view = source.composition;
            // The image grid is left out: it spans the plane and would pull the view out.
            return {must: [...points(view.source), ...points(view.image), ...(view.pivotSet ? points([view.pivot, view.pivotImage]) : [])]};
        }
        case 'iterate': {
            const current = iterateAt(source.iteration, source.matrix, source.step).point;
            const drawn = (p: Vec2) => finite(p) && Math.max(Math.abs(p[0]), Math.abs(p[1])) <= DRAW_LIMIT;
            return {must: points([source.start, current].filter(drawn)), nice: polylineOf(orbitPolyline(source.iteration, source.step))};
        }
        case 'tracedet':
            return {must: points([[source.traceDet.tau, source.traceDet.delta]]), nice: polyline([...STABILITY_TRIANGLE, STABILITY_TRIANGLE[0]].map(p => [p[0], p[1]] as const))};
    }
}
