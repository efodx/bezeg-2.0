import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import type {LabelPlacement} from '../functions/BaseFunctionGraph';
import type {Vec2} from '../../linear/matrix2';
import {ITERATION_COLORS} from './iterationBoard';
import {lineThroughOrigin} from './iterationScene';
import type {Polyline} from './linearMapScene';

/**
 * The board objects of the eigen mode (lesson L3): the unit circle, the eigen-direction lines, the test vector v and its image Av.
 * Separate from `LinearMapGraph` as `iterationBoard` is; the graph passes closures over its model and host helpers, every object is
 * registered with `own`, and the only handle (the tip of v) is returned.
 */

export const EIGEN_COLORS = {
    circle: '#7a8a94',
    vector: ITERATION_COLORS.orbit,
    image: ITERATION_COLORS.unit,
    line: '#0e8f8f',
} as const;

export interface EigenBoardContext {
    readonly board: JXG.Board;
    own<T>(object: T): T;
    readonly active: () => boolean;
    readonly v: () => Vec2;
    readonly av: () => Vec2;
    readonly lines: () => readonly Vec2[];
    readonly strokeWidth: () => number;
    readonly thin: () => number;
    readonly markerSize: () => number;
    readonly fixedPointAttributes: object;
    readonly handleAttributes: object;
    readonly pointLabel: (placement: LabelPlacement | (() => LabelPlacement), distance: number, visible: () => boolean) => object;
    /** Where the labels of v and Av sit: beyond the tips, stepping aside from the a1 and a2 labels. */
    readonly vPlacement: () => LabelPlacement;
    readonly avPlacement: () => LabelPlacement;
    /** A drag of the tip of v: projects onto the circle, stores the angle, returns the stored unit vector. */
    readonly dragTip: (x: number, y: number) => Vec2 | undefined;
}

type CurveLike = {updateDataArray: () => void; dataX: number[]; dataY: number[]};

const EMPTY: Polyline = {x: [], y: []};

export function createEigenCurves(ctx: EigenBoardContext): void {
    const {board} = ctx;
    const polyline = (points: () => Polyline, attributes: object) => {
        const curve = ctx.own(board.create('curve', [[], []], {highlight: false, fixed: true, withLabel: false, ...attributes})) as unknown as CurveLike;
        curve.updateDataArray = () => {
            const {x, y} = points();
            curve.dataX = x;
            curve.dataY = y;
        };
    };
    ctx.own(board.create('circle', [[0, 0], 1], {
        strokeColor: EIGEN_COLORS.circle, strokeWidth: ctx.thin, fillOpacity: 0, fixed: true, highlight: false, withLabel: false,
        visible: ctx.active,
    }));
    // One curve per possible line, so a hidden second line leaves no stale data.
    for (const index of [0, 1]) {
        polyline(() => ctx.active() ? lineThroughOrigin(ctx.lines()[index]) : EMPTY,
            {strokeColor: EIGEN_COLORS.line, strokeWidth: ctx.strokeWidth, dash: index === 0 ? 0 : 3, visible: ctx.active});
    }
    const arrow = (to: () => Vec2, color: string) => polyline(() => {
        const [x, y] = to();
        return ctx.active() && (x !== 0 || y !== 0) ? {x: [0, x], y: [0, y]} : EMPTY;
    }, {strokeColor: color, strokeWidth: ctx.strokeWidth, lastArrow: {type: 2, size: 6}, visible: ctx.active});
    arrow(ctx.av, EIGEN_COLORS.image);
    arrow(ctx.v, EIGEN_COLORS.vector);
}

/** The tip of v (the handle, kept on the circle) and the tip of Av (a labelled fixed point). */
export function createEigenPoints(ctx: EigenBoardContext): JXG.Point {
    const {board} = ctx;
    ctx.own(board.create('point', [() => ctx.av()[0], () => ctx.av()[1]], {
        ...ctx.fixedPointAttributes, name: '$$Av$$', label: ctx.pointLabel(ctx.avPlacement, 0.9, ctx.active), size: ctx.markerSize,
        fillColor: EIGEN_COLORS.image, highlightFillColor: EIGEN_COLORS.image, strokeColor: EIGEN_COLORS.image, fixed: true, visible: ctx.active,
    }));
    const v = ctx.v();
    const tip = ctx.own(board.create('point', [v[0], v[1]], {
        ...ctx.handleAttributes, name: '$$v$$', label: ctx.pointLabel(ctx.vPlacement, 1.1, ctx.active), size: ctx.markerSize,
        fillColor: EIGEN_COLORS.vector, highlightFillColor: EIGEN_COLORS.vector, visible: ctx.active,
    })) as JXG.Point;
    bindMovablePointCursor(tip, board);
    tip.on('drag', () => {
        if (!Number.isFinite(tip.X()) || !Number.isFinite(tip.Y())) return;
        const stored = ctx.dragTip(tip.X(), tip.Y());
        if (stored) tip.moveTo([stored[0], stored[1]]);
    });
    return tip;
}
