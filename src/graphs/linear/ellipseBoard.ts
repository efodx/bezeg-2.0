import type {LabelPlacement} from '../functions/BaseFunctionGraph';
import type {Vec2} from '../../linear/matrix2';
import {EIGEN_COLORS} from './eigenBoard';
import {ITERATION_COLORS} from './iterationBoard';
import {lineThroughOrigin} from './iterationScene';
import type {LabelledTip} from './ellipseScene';
import type {Polyline} from './linearMapScene';

/**
 * The board objects of the ellipse mode (lesson L4): the unit circle, the image of the circle or the conic of the symmetric part,
 * the labelled axes, the singular directions in the domain and the dashed eigen-directions. Separate from `LinearMapGraph` as
 * `eigenBoard` is; every object is registered with `own`, is visible only while the mode is active, and holds no handle.
 */

export const ELLIPSE_COLORS = {
    circle: EIGEN_COLORS.circle,
    image: ITERATION_COLORS.unit,
    conic: '#7b4fa3',
    direction: ITERATION_COLORS.orbit,
    line: EIGEN_COLORS.line,
} as const;

/** The CSS class of every object of the mode: an ellipse-only marker (the colours are shared with the eigen mode), read by the tests. */
export const ELLIPSE_MARK = 'bezeg-ellipse-mode';

export interface EllipseBoardContext {
    readonly board: JXG.Board;
    own<T>(object: T): T;
    readonly active: () => boolean;
    /** The conic of the symmetric part is shown instead of the image of the circle. */
    readonly conicShown: () => boolean;
    readonly imageCurve: () => Polyline;
    readonly conicCurve: () => Polyline | undefined;
    readonly lines: () => readonly Vec2[];
    /** The labelled semi-axes of the image, the semi-axes of the conic and the singular directions in the domain (at most two each). */
    readonly axes: () => readonly LabelledTip[];
    readonly conicAxes: () => readonly LabelledTip[];
    readonly directions: () => readonly LabelledTip[];
    /** The image of the circle is a single point (the zero matrix): a marker at the origin. */
    readonly pointImage: () => boolean;
    /** The cell of a label by layout id (`sigma1`, `v2`, `conic1`, ...), from the shared greedy placement. */
    readonly placement: (id: string) => LabelPlacement;
    readonly strokeWidth: () => number;
    readonly thin: () => number;
    readonly markerSize: () => number;
    readonly fixedPointAttributes: object;
    readonly pointLabel: (placement: LabelPlacement | (() => LabelPlacement), distance: number, visible: () => boolean) => object;
}

type CurveLike = {updateDataArray: () => void; dataX: number[]; dataY: number[]};

const EMPTY: Polyline = {x: [], y: []};

export function createEllipseObjects(ctx: EllipseBoardContext): void {
    const {board} = ctx;
    const polyline = (points: () => Polyline, attributes: object) => {
        const curve = ctx.own(board.create('curve', [[], []], {highlight: false, fixed: true, withLabel: false, cssClass: ELLIPSE_MARK, ...attributes})) as unknown as CurveLike;
        curve.updateDataArray = () => {
            const {x, y} = points();
            curve.dataX = x;
            curve.dataY = y;
        };
    };
    ctx.own(board.create('circle', [[0, 0], 1], {
        strokeColor: ELLIPSE_COLORS.circle, strokeWidth: ctx.thin, fillOpacity: 0, fixed: true, highlight: false, withLabel: false, cssClass: ELLIPSE_MARK,
        visible: ctx.active,
    }));
    polyline(() => ctx.active() && !ctx.conicShown() ? ctx.imageCurve() : EMPTY,
        {strokeColor: ELLIPSE_COLORS.image, strokeWidth: ctx.strokeWidth, visible: ctx.active});
    polyline(() => (ctx.active() && ctx.conicShown() ? ctx.conicCurve() : undefined) ?? EMPTY,
        {strokeColor: ELLIPSE_COLORS.conic, strokeWidth: ctx.strokeWidth, visible: ctx.active});
    // One curve per possible line, so a hidden second line leaves no stale data.
    for (const index of [0, 1]) {
        polyline(() => ctx.active() ? lineThroughOrigin(ctx.lines()[index]) : EMPTY,
            {strokeColor: ELLIPSE_COLORS.line, strokeWidth: ctx.strokeWidth, dash: 3, visible: ctx.active});
    }
    // The segment from the origin to a tip and the fixed, labelled tip, for the axes and then the domain directions.
    const spoke = (list: () => readonly LabelledTip[], prefix: string, index: number, color: string, shown: () => boolean) => {
        const at = (): Vec2 => list()[index]?.tip ?? [0, 0];
        polyline(() => ctx.active() && shown() && list()[index] ? {x: [0, at()[0]], y: [0, at()[1]]} : EMPTY,
            {strokeColor: color, strokeWidth: ctx.strokeWidth, visible: ctx.active});
        const visible = () => ctx.active() && shown() && list()[index] !== undefined;
        ctx.own(board.create('point', [() => at()[0], () => at()[1]], {
            ...ctx.fixedPointAttributes, name: () => list()[index]?.name ?? '', size: ctx.markerSize,
            label: ctx.pointLabel(() => ctx.placement(`${prefix}${index + 1}`), 0.9, visible),
            fillColor: color, highlightFillColor: color, strokeColor: color, fixed: true, visible, cssClass: ELLIPSE_MARK,
        }));
    };
    for (const index of [0, 1]) spoke(ctx.axes, 'sigma', index, ELLIPSE_COLORS.image, () => !ctx.conicShown());
    for (const index of [0, 1]) spoke(ctx.conicAxes, 'conic', index, ELLIPSE_COLORS.conic, ctx.conicShown);
    for (const index of [0, 1]) spoke(ctx.directions, 'v', index, ELLIPSE_COLORS.direction, () => !ctx.conicShown());
    ctx.own(board.create('point', [0, 0], {
        ...ctx.fixedPointAttributes, name: '', withLabel: false, size: ctx.markerSize, fillColor: ELLIPSE_COLORS.image,
        highlightFillColor: ELLIPSE_COLORS.image, strokeColor: ELLIPSE_COLORS.image, fixed: true, cssClass: ELLIPSE_MARK,
        visible: () => ctx.active() && !ctx.conicShown() && ctx.pointImage(),
    }));
}
