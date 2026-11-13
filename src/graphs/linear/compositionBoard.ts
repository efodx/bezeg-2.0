import type {LabelPlacement} from '../functions/BaseFunctionGraph';
import type {Vec2} from '../../linear/matrix2';
import {CompositionView, translationSegment} from './compositionScene';
import {bezierPoint, type Polyline} from './linearMapScene';

/**
 * The board objects of the composition mode (Batch C, lesson L5), separate from `LinearMapGraph`: the faint image of A, the image of the
 * source grid under the whole affine map, the fixture Bezier curve and its image, the translation vector and the pivot. The graph passes
 * closures over its model; this module creates the objects, registers each with `own`, and returns the pivot handle.
 */

export const COMPOSITION_COLORS = {
    gridA: '#8fae9c',
    gridImage: '#7ba6bc',
    source: '#2f6f5e',
    image: '#bd6047',
    translation: '#7a5ca0',
    pivot: '#7a5ca0',
} as const;

export interface CompositionBoardContext {
    readonly board: JXG.Board;
    own<T>(object: T): T;
    readonly active: () => boolean;
    readonly view: () => CompositionView;
    readonly pivotSet: () => boolean;
    readonly strokeWidth: () => number;
    readonly thin: () => number;
    readonly markerSize: () => number;
    readonly fixedPointAttributes: object;
    readonly handleAttributes: object;
    /** The cell of a label by layout id, from the shared greedy placement. */
    readonly placement: (id: string) => LabelPlacement;
    readonly pointLabel: (placement: LabelPlacement | (() => LabelPlacement), distance: number, visible: () => boolean) => object;
    /** A drag of the pivot handle: snaps and stores the pivot, returns the stored point. */
    readonly dragPivot: (x: number, y: number) => Vec2 | undefined;
}

type CurveLike = {updateDataArray: () => void; dataX: number[]; dataY: number[]};

/** The curves, drawn above the two grids of the graph and below its points. */
export function createCompositionCurves(ctx: CompositionBoardContext): void {
    const {board} = ctx;
    const polyline = (points: () => Polyline, attributes: object) => {
        const curve = ctx.own(board.create('curve', [[], []], {highlight: false, fixed: true, withLabel: false, ...attributes})) as unknown as CurveLike;
        curve.updateDataArray = () => {
            const {x, y} = ctx.active() ? points() : {x: [], y: []};
            curve.dataX = x;
            curve.dataY = y;
        };
    };
    polyline(() => ctx.view().gridA, {strokeColor: COMPOSITION_COLORS.gridA, strokeOpacity: 0.45, strokeWidth: ctx.thin, dash: 2, visible: ctx.active});
    polyline(() => ctx.view().gridImage, {strokeColor: COMPOSITION_COLORS.gridImage, strokeOpacity: 0.68, strokeWidth: ctx.thin, visible: ctx.active});
    polyline(() => translationSegment(ctx.view()), {
        strokeColor: COMPOSITION_COLORS.translation, strokeWidth: ctx.strokeWidth, lastArrow: {type: 2, size: 6},
        visible: () => ctx.active() && (ctx.view().translation[0] !== 0 || ctx.view().translation[1] !== 0),
    });
    const bezier = (controls: () => readonly Vec2[], color: string) =>
        ctx.own(board.create('curve', [
            (s: number) => bezierPoint(controls(), s)[0], (s: number) => bezierPoint(controls(), s)[1], 0, 1,
        ], {strokeColor: color, strokeWidth: ctx.strokeWidth, highlight: false, fixed: true, withLabel: false, visible: ctx.active}));
    bezier(() => ctx.view().source, COMPOSITION_COLORS.source);
    bezier(() => ctx.view().image, COMPOSITION_COLORS.image);
}

/** The control points of the two curves and the pivot handle; the handle is the one returned. */
export function createCompositionPoints(ctx: CompositionBoardContext): JXG.Point {
    const {board} = ctx;
    // The cells come from the shared greedy placement (`labelLayout`), by id `p0`..`p3`, `t0`..`t3` and `c`.
    const controlPoint = (list: () => readonly Vec2[], i: number, color: string, name: string, id: string) =>
        ctx.own(board.create('point', [() => list()[i][0], () => list()[i][1]], {
            ...ctx.fixedPointAttributes, name, label: ctx.pointLabel(() => ctx.placement(id), 0.9, ctx.active), size: ctx.markerSize,
            fillColor: color, highlightFillColor: color, strokeColor: color, fixed: true, visible: ctx.active,
        }));
    for (let i = 0; i < 4; i++) {
        controlPoint(() => ctx.view().source, i, COMPOSITION_COLORS.source, `$$P_${i}$$`, `p${i}`);
        controlPoint(() => ctx.view().image, i, COMPOSITION_COLORS.image, `$$T(P_${i})$$`, `t${i}`);
    }
    const shown = () => ctx.active() && ctx.pivotSet();
    const pivot = ctx.view().pivot;
    const handle = ctx.own(board.create('point', [pivot[0], pivot[1]], {
        ...ctx.handleAttributes, name: '$$c$$', label: ctx.pointLabel(() => ctx.placement('c'), 1.1, shown), size: ctx.markerSize,
        fillColor: COMPOSITION_COLORS.pivot, highlightFillColor: COMPOSITION_COLORS.pivot, visible: shown,
    })) as JXG.Point;
    handle.on('drag', () => {
        if (!Number.isFinite(handle.X()) || !Number.isFinite(handle.Y())) return;
        const stored = ctx.dragPivot(handle.X(), handle.Y());
        if (stored) handle.moveTo([stored[0], stored[1]]);
    });
    return handle;
}
