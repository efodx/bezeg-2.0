import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import type {LabelPlacement} from '../functions/BaseFunctionGraph';
import {GraphPalette} from '../styles/GraphPalette';
import type {Vec2} from '../../linear/matrix2';
import {
    ARROW_LENGTH, DRAW_LIMIT, IterationView, lineThroughOrigin, orbitPolyline, parabolaPolyline, STABILITY_TRIANGLE, TRACE_DET_VIEW, TraceDetView,
} from './iterationScene';
import {ITERATE_STEP_MAX} from '../../linear/linearMapModel';
import {lineSamples, nameBox, PlacedLabels, pxFrame} from '../legend/pointNamePlacement';
import {sampleLine, type PxBox} from '../legend/boardLabelPlacement';
import {closedPolyline, type LinearMapGraphMode, type Polyline} from './linearMapScene';

/**
 * The board objects of the iterate and tracedet modes (Batch D, lessons L6 and L7), separate from `LinearMapGraph` to keep it small.
 * The graph passes closures over its model and its host helpers; this module creates the objects, registers each one with `own`, and
 * returns the two handles it makes. Nothing here reads a handle while creating it.
 */

export const ITERATION_COLORS = {
    orbit: '#2468a2',
    unit: '#bd6047',
    dominant: '#2f7a4d',
    other: '#7a5ca0',
    parabola: '#5e6c77',
    triangle: '#2468a2',
    triangleFill: '#d6e4ee',
    flow: '#2f7a4d',
    flowFill: '#dcebd8',
    handle: '#bd6047',
} as const;

/** The fixed drawing attributes of the three tracedet shapes (the widths come from the board); the legend kinds are derived from them. */
export const TRACE_DET_DRAWING = {
    parabola: {strokeColor: ITERATION_COLORS.parabola, dash: 4},
    triangle: {strokeColor: ITERATION_COLORS.triangle, fillColor: ITERATION_COLORS.triangleFill, fillOpacity: 0.7},
    flow: {strokeColor: ITERATION_COLORS.flow, dash: 3, fillColor: ITERATION_COLORS.flowFill, fillOpacity: 0.55},
} as const;

/**
 * The legend swatch that matches a drawing: a dashed outline round a pale face is `dashed`, a dashed line `dashed-line`. A pale face with
 * a solid outline has no swatch of its own; `line` (the solid outline in the shape's colour) is the closest, and the legend text names the face.
 */
export function legendKindFor(drawing: { readonly dash?: number; readonly fillOpacity?: number }): 'dashed' | 'dashed-line' | 'line' {
    if (drawing.dash) return drawing.fillOpacity ? 'dashed' : 'dashed-line';
    return 'line';
}

export interface IterationBoardContext {
    readonly board: JXG.Board;
    own<T>(object: T): T;
    readonly mode: () => LinearMapGraphMode;
    readonly step: () => number;
    readonly iteration: () => IterationView;
    readonly traceDet: () => TraceDetView;
    /** Names a drawn object for the declaration's legend (`BaseGraph.drawnObject`). */
    readonly mark?: (id: string, element: unknown) => void;
    readonly start: () => Vec2;
    readonly strokeWidth: () => number;
    readonly thin: () => number;
    readonly markerSize: () => number;
    readonly fontSize: () => number;
    readonly fixedPointAttributes: object;
    readonly handleAttributes: object;
    readonly pointLabel: (placement: LabelPlacement, distance: number, visible: () => boolean) => object;
    /** A drag of the start handle: snaps and stores the start, returns the stored vector. */
    readonly dragStart: (x: number, y: number) => Vec2 | undefined;
    /** A drag of the (tau, delta) handle: snaps, stores the companion matrix, returns the stored (tau, delta). */
    readonly dragTraceDet: (tau: number, delta: number) => Vec2 | undefined;
    readonly text: {
        readonly triangle: () => string;
        readonly flow: () => string;
        readonly parabola: () => string;
    };
}

export interface IterationHandles {
    readonly startHandle: JXG.Point;
    readonly tdHandle: JXG.Point;
}

type CurveLike = {updateDataArray: () => void; dataX: number[]; dataY: number[]};

/** The curves and texts: created before the square, the Bezier curves and the basis handles, so these layers lie under them. */
export function createIterationCurves(ctx: IterationBoardContext): void {
    const {board} = ctx;
    const iterating = () => ctx.mode() === 'iterate';
    const tracing = () => ctx.mode() === 'tracedet';

    const polyline = (points: () => Polyline, attributes: object, id?: string) => {
        const element = ctx.own(board.create('curve', [[], []], {highlight: false, fixed: true, withLabel: false, ...attributes}));
        const curve = element as unknown as CurveLike;
        curve.updateDataArray = () => {
            const {x, y} = points();
            curve.dataX = x;
            curve.dataY = y;
        };
        if (id) ctx.mark?.(id, element);
    };
    const fixedText = (x: number | (() => number), y: number, text: () => string, anchorX: string, anchorY: string, color: string) =>
        ctx.own(board.create('text', [x, y, text], {
            fixed: true, highlight: false, anchorX, anchorY, fontSize: ctx.fontSize, strokeColor: color, visible: tracing,
        }));

    // ---- iterate: the orbit, the eigen-lines, the normalised iterate ------------------------------------------------
    polyline(() => lineThroughOrigin(iterating() ? ctx.iteration().otherLine : undefined),
        {strokeColor: ITERATION_COLORS.other, strokeWidth: ctx.thin, dash: 3, visible: iterating}, 'other');
    polyline(() => lineThroughOrigin(iterating() ? ctx.iteration().dominantLine : undefined),
        {strokeColor: ITERATION_COLORS.dominant, strokeWidth: ctx.strokeWidth, visible: iterating}, 'dominant');
    polyline(() => iterating() ? orbitPolyline(ctx.iteration(), ctx.step()) : {x: [], y: []},
        {strokeColor: ITERATION_COLORS.orbit, strokeWidth: ctx.thin, dash: 2, visible: iterating});
    polyline(() => {
        const unit = iterating() ? unitOf(ctx) : undefined;
        return unit ? {x: [0, ARROW_LENGTH * unit[0]], y: [0, ARROW_LENGTH * unit[1]]} : {x: [], y: []};
    }, {strokeColor: ITERATION_COLORS.unit, strokeWidth: ctx.strokeWidth, lastArrow: {type: 2, size: 6}, visible: iterating}, 'unit');

    // ---- tracedet: the parabola, the triangle, the stable-flow quadrant --------------------------------------------
    const [left, top, right] = TRACE_DET_VIEW;
    polyline(() => closedPolyline([[left, 0], [0, 0], [0, top], [left, top]]), {...TRACE_DET_DRAWING.flow, strokeWidth: ctx.thin, visible: tracing}, 'td-flow');
    polyline(() => closedPolyline(STABILITY_TRIANGLE), {...TRACE_DET_DRAWING.triangle, strokeWidth: ctx.strokeWidth, visible: tracing}, 'td-triangle');
    polyline(() => parabolaPolyline(), {...TRACE_DET_DRAWING.parabola, strokeWidth: ctx.strokeWidth, visible: tracing}, 'td-parabola');
    placedTriangleName(ctx);
    // The label starts inside the quadrant, but never left of the board's live edge: a narrow board shows less than the quadrant.
    fixedText(() => Math.max(left + 0.3, board.getBoundingBox()[0] + 8 / board.unitX), top - 0.3, ctx.text.flow, 'left', 'top', ITERATION_COLORS.flow);
    fixedText(6.4, 8.5, ctx.text.parabola, 'left', 'top', ITERATION_COLORS.parabola);
    fixedText(right - 0.3, 0.3, () => 'τ', 'right', 'bottom', GraphPalette.pointOutline);
    fixedText(0.3, top - 0.3, () => 'δ', 'left', 'top', GraphPalette.pointOutline);
}

/** The points and the two handles: created after the basis handles, so those keep their place among the board's points. */
export function createIterationPoints(ctx: IterationBoardContext): IterationHandles {
    const {board} = ctx;
    const iterating = () => ctx.mode() === 'iterate';
    const tracing = () => ctx.mode() === 'tracedet';

    // The iterates 1..30 (the start is the handle). One is shown when the step has reached it and it is near enough to draw.
    const iterateAt = (k: number): Vec2 => ctx.iteration().orbit.points[Math.min(k, ctx.iteration().orbit.steps)];
    const shown = (k: number) => iterating() && k <= ctx.step() && k <= ctx.iteration().orbit.steps
        && Math.max(Math.abs(iterateAt(k)[0]), Math.abs(iterateAt(k)[1])) <= DRAW_LIMIT;
    for (let k = 1; k <= ITERATE_STEP_MAX; k++) {
        const iterate = ctx.own(board.create('point', [() => iterateAt(k)[0], () => iterateAt(k)[1]], {
            ...ctx.fixedPointAttributes, name: () => `$$A^{${k}}v_0$$`,
            label: ctx.pointLabel('above-right', 0.9, () => shown(k) && k === ctx.step()), size: ctx.markerSize,
            fillColor: ITERATION_COLORS.orbit, highlightFillColor: ITERATION_COLORS.orbit, strokeColor: ITERATION_COLORS.orbit,
            fixed: true, visible: () => shown(k),
        }));
        if (k === 1) ctx.mark?.('iterates', iterate);
    }

    // ---- the handles --------------------------------------------------------------------------------------------------
    const start = ctx.start();
    const startHandle = ctx.own(board.create('point', [start[0], start[1]], {
        ...ctx.handleAttributes, name: '$$v_0$$', label: ctx.pointLabel('above-left', 1.1, iterating), size: ctx.markerSize,
        fillColor: ITERATION_COLORS.orbit, highlightFillColor: ITERATION_COLORS.orbit, visible: iterating,
    })) as JXG.Point;
    bindMovablePointCursor(startHandle, board);
    startHandle.on('drag', () => {
        if (!Number.isFinite(startHandle.X()) || !Number.isFinite(startHandle.Y())) return;
        const stored = ctx.dragStart(startHandle.X(), startHandle.Y());
        if (stored) startHandle.moveTo([stored[0], stored[1]]);
    });

    const td = ctx.traceDet();
    const tdHandle = ctx.own(board.create('point', [td.tau, td.delta], {
        ...ctx.handleAttributes, name: '$$(\\tau,\\delta)$$', label: ctx.pointLabel('above-right', 1.1, tracing), size: ctx.markerSize,
        fillColor: ITERATION_COLORS.handle, highlightFillColor: ITERATION_COLORS.handle, visible: tracing,
    })) as JXG.Point;
    ctx.mark?.('td-point', tdHandle);
    bindMovablePointCursor(tdHandle, board);
    tdHandle.on('drag', () => {
        if (!Number.isFinite(tdHandle.X()) || !Number.isFinite(tdHandle.Y())) return;
        const stored = ctx.dragTraceDet(tdHandle.X(), tdHandle.Y());
        if (stored) tdHandle.moveTo([stored[0], stored[1]]);
    });
    return {startHandle, tdHandle};
}

/** The normalised iterate of the current step, if any. */
function unitOf(ctx: IterationBoardContext): Vec2 | undefined {
    const run = ctx.iteration().orbit;
    const p = run.points[Math.min(ctx.step(), run.steps)];
    const norm = Math.hypot(p[0], p[1]);
    return norm === 0 ? undefined : [p[0] / norm, p[1] / norm];
}

/** The text of the handle's label, which sits `above-right` of the handle (see `BaseFunctionGraph.pointLabel`, distance 1.1). */
const HANDLE_LABEL_TEXT = '(τ, δ)';

/**
 * The name of the stability triangle. It leaves the top edge, where the handle's label "(τ, δ)", the parabola and the tick "2" meet it: its box
 * is placed with the shared name layout (`placeNames`) among the handle and its label, the triangle, the parabola, the axes and the tick
 * labels, and follows the handle while it is dragged. The memo holds boxes only, no board object.
 */
function placedTriangleName(ctx: IterationBoardContext): void {
    const {board} = ctx;
    const labels = new PlacedLabels();
    const box = (): PxBox | undefined => {
        const td = ctx.traceDet();
        const fontPx = ctx.fontSize();
        return labels.boxes(board, [td.tau, td.delta, fontPx, ctx.text.triangle()], frame => {
            const toPx = frame.toPx;
            const size = nameBox(ctx.text.triangle(), fontPx);
            const [hx, hy] = toPx(td.tau, td.delta);
            const handleLabel = nameBox(HANDLE_LABEL_TEXT, fontPx);
            const labelBottom = hy - 0.55 * fontPx * 1.1;
            const blocks: PxBox[] = [{x0: hx + 6.6 * 1.1, y0: labelBottom - handleLabel.h, x1: hx + 6.6 * 1.1 + handleLabel.w, y1: labelBottom}];
            const samples: Array<readonly [number, number]> = [];
            for (const line of [closedPolyline(STABILITY_TRIANGLE), parabolaPolyline()]) samples.push(...sampleLine(line.x, line.y, toPx, frame.width, frame.height));
            samples.push(...lineSamples(frame, toPx(0, 0), toPx(1, 0)), ...lineSamples(frame, toPx(0, 0), toPx(0, 1)));
            // The name starts in the open space beside the left edge, above the axis numbers and under the parabola, where no line crosses
            // it; every spot near the top edge has the edge or the parabola through the text. The edge's middle and the vertices are kept
            // for a handle that takes that space.
            const [ax, ay] = toPx(-1.9, 0.45);
            const alts = [toPx(0, 1), toPx(-2, 1), toPx(2, 1), toPx(0, -1)];
            return {items: [{id: 'triangle', ax, ay, alts, ...size}], markers: [[hx, hy, ctx.markerSize()]], samples, blocks};
        }).triangle;
    };
    const centre = (pick: (b: PxBox) => number, fallback: number, axis: 'x' | 'y') => () => {
        const frame = pxFrame(board);
        const b = box();
        if (!frame || !b) return fallback;
        const [left, top] = board.getBoundingBox();
        const px = pick(b);
        return axis === 'x' ? left + px / board.unitX : top - px / board.unitY;
    };
    ctx.own(board.create('text', [centre(b => (b.x0 + b.x1) / 2, 0, 'x'), centre(b => (b.y0 + b.y1) / 2, 1.15, 'y'), ctx.text.triangle], {
        fixed: true, highlight: false, anchorX: 'middle', anchorY: 'middle', fontSize: ctx.fontSize, strokeColor: ITERATION_COLORS.triangle,
        visible: () => ctx.mode() === 'tracedet',
    }));
}
