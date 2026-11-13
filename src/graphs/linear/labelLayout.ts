import type {Mat2, Vec2} from '../../linear/matrix2';
import type {LabelPlacement} from '../functions/BaseFunctionGraph';
import type {CompositionView} from './compositionScene';
import {outwardPlacement, type EigenView} from './eigenScene';
import type {EllipseView, LabelledTip} from './ellipseScene';

/**
 * One greedy label placement shared by the eigen and ellipse modes of the linear-map graph. The labels are placed in priority order
 * (the caller sorts the requests); each tries the cell beyond its point (away from the origin), then the other cells, and skips a
 * cell whose label would leave the board, overlap a placed label or an axis tick label, or whose anchor lies within `NEAR_PX` of a
 * placed label's anchor. When no cell is free the one with the smallest penalty is taken. Pure TypeScript: the sizes are estimates in
 * pixels (the real text is drawn by the board), converted to units with the current pixel size, so it is recomputed with the view box.
 */

/** About 0,6 units at the nominal 50 pixels per unit; the distance (in pixels) under which two label anchors count as close. */
export const NEAR_PX = 30;

export interface LabelRequest {
    readonly id: string;
    /** The point the label belongs to. */
    readonly anchor: Vec2;
    /** The LaTeX name, used only to estimate the width of the label. */
    readonly name: string;
    /** The label distance factor of `pointLabel` (6 px and half a font size per unit). */
    readonly distance: number;
}

export interface LabelBoard {
    /** [left, top, right, bottom] in units. */
    readonly box: readonly [number, number, number, number];
    readonly widthPx: number;
    readonly heightPx: number;
    readonly fontSize: number;
}

export interface Rect {readonly left: number; readonly right: number; readonly bottom: number; readonly top: number}

const CELLS: Record<LabelPlacement, readonly [number, number]> = {
    above: [0, 1], 'above-right': [1, 1], right: [1, 0], 'below-right': [1, -1],
    below: [0, -1], 'below-left': [-1, -1], left: [-1, 0], 'above-left': [-1, 1],
};
const RING: readonly LabelPlacement[] = ['above', 'above-right', 'right', 'below-right', 'below', 'below-left', 'left', 'above-left'];

/** The cells ordered by the angular distance from `first`, alternating sides. */
export function cellOrder(first: LabelPlacement): LabelPlacement[] {
    const start = RING.indexOf(first);
    const order: LabelPlacement[] = [first];
    for (let step = 1; step <= 4; step++) {
        order.push(RING[(start + step) % 8]);
        if (step < 4) order.push(RING[(start - step + 8) % 8]);
    }
    return order;
}

/** The visible length of a LaTeX name in characters: commands count as one, the markup is dropped. */
export function nameLength(name: string): number {
    return name.replace(/\$/g, '').replace(/\\[A-Za-z]+/g, 'x').replace(/[_{}^\\]/g, '').length + 1;
}

const overlaps = (a: Rect, b: Rect): boolean => a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top;

/** The box of a label in a cell, in units (the offsets are those of `pointLabel`). */
export function labelRect(request: LabelRequest, cell: LabelPlacement, board: LabelBoard): Rect {
    const [h, v] = CELLS[cell];
    const upx = (board.box[2] - board.box[0]) / board.widthPx;
    const upy = (board.box[1] - board.box[3]) / board.heightPx;
    const width = nameLength(request.name) * board.fontSize * 0.75;
    const height = board.fontSize * 1.25;
    const dx = h * 6 * request.distance;
    // The rendered label sits higher than the bare offset (its box is padded), about 1,5 font sizes further out above or below.
    const dy = v * (0.5 * request.distance + 1.5) * board.fontSize;
    const [x0, x1] = h > 0 ? [dx, dx + width] : h < 0 ? [dx - width, dx] : [-width / 2, width / 2];
    const [y0, y1] = v > 0 ? [dy, dy + height] : v < 0 ? [dy - height, dy] : [-height / 2, height / 2];
    return {
        left: request.anchor[0] + x0 * upx, right: request.anchor[0] + x1 * upx,
        bottom: request.anchor[1] + y0 * upy, top: request.anchor[1] + y1 * upy,
    };
}

/** The tick labels along the axes (integers, or every few when the board is wide), as boxes in units. */
export function tickRects(board: LabelBoard): Rect[] {
    const [l, t, r, b] = board.box;
    const upx = (r - l) / board.widthPx;
    const upy = (t - b) / board.heightPx;
    const step = Math.max(1, Math.ceil((r - l) / 12));
    const rects: Rect[] = [];
    const width = 2 * board.fontSize * 0.6;
    const height = board.fontSize * 1.25;
    for (let k = Math.ceil(l / step) * step; k <= r; k += step) {
        if (k === 0) continue;
        rects.push({left: k - width / 2 * upx, right: k + width / 2 * upx, top: -2 * upy, bottom: -(2 + height) * upy});
    }
    for (let k = Math.ceil(b / step) * step; k <= t; k += step) {
        if (k === 0) continue;
        rects.push({left: -(4 + width) * upx, right: -4 * upx, bottom: k - height / 2 * upy, top: k + height / 2 * upy});
    }
    return rects;
}


interface Candidate {
    readonly cell: LabelPlacement;
    readonly rect: Rect;
    readonly center: Vec2;
    readonly outside: boolean;
    readonly tickHits: number;
    /** The other labelled points (about 7 px boxes) the label would cover. */
    readonly pointHits: number;
}

const SEARCH_LIMIT = 4000;

/**
 * The cell of each request, by id; the requests are given in priority order. The first complete assignment in that order, trying
 * each label's cells outward first, wins: first with every rule (inside the board, no overlap, clear of the tick labels and of the other labelled points, not near a
 * placed label), then without the nearness rule, then also ignoring the tick labels and points; a label may thus take a later cell so that a
 * lower-priority one still finds room. When even that fails (a crowded board) the cells with the smallest penalty are taken in turn.
 */
export function placeLabels(requests: readonly LabelRequest[], board: LabelBoard): Record<string, LabelPlacement> {
    const [l, t, r, b] = board.box;
    const upx = (r - l) / board.widthPx;
    const upy = (t - b) / board.heightPx;
    const margin = 2;
    const ticks = tickRects(board);
    const candidates: Candidate[][] = requests.map(request => cellOrder(outwardPlacement(request.anchor)).map(cell => {
        const rect = labelRect(request, cell, board);
        return {
            cell, rect, center: [(rect.left + rect.right) / 2, (rect.bottom + rect.top) / 2] as Vec2,
            outside: !(rect.left >= l + margin * upx && rect.right <= r - margin * upx && rect.bottom >= b + margin * upy && rect.top <= t - margin * upy),
            tickHits: ticks.filter(tick => overlaps(rect, tick)).length,
            pointHits: requests.filter(other => other !== request && overlaps(rect, {
                left: other.anchor[0] - 7 * upx, right: other.anchor[0] + 7 * upx, bottom: other.anchor[1] - 7 * upy, top: other.anchor[1] + 7 * upy,
            })).length,
        };
    }));
    const close = (a: Candidate, c: Candidate) => Math.hypot((a.center[0] - c.center[0]) / upx, (a.center[1] - c.center[1]) / upy) < NEAR_PX;
    const solve = (level: 0 | 1 | 2): Candidate[] | undefined => {
        const chosen: Candidate[] = [];
        let nodes = 0;
        const step = (index: number): boolean => {
            if (index === candidates.length) return true;
            for (const candidate of candidates[index]) {
                if (++nodes > SEARCH_LIMIT) return false;
                if (candidate.outside || (level < 2 && candidate.tickHits + candidate.pointHits > 0)) continue;
                if (chosen.some(other => overlaps(candidate.rect, other.rect) || (level < 1 && close(candidate, other)))) continue;
                chosen.push(candidate);
                if (step(index + 1)) return true;
                chosen.pop();
            }
            return false;
        };
        return step(0) ? chosen : undefined;
    };
    const solution = solve(0) ?? solve(1) ?? solve(2) ?? greedy(candidates);
    const result: Record<string, LabelPlacement> = {};
    requests.forEach((request, i) => { result[request.id] = solution[i].cell; });
    return result;
}

/** The crowded-board fallback: each label takes the cell with the smallest penalty given the labels already placed. */
function greedy(candidates: readonly (readonly Candidate[])[]): Candidate[] {
    const chosen: Candidate[] = [];
    for (const options of candidates) {
        const penalty = (candidate: Candidate) => (candidate.outside ? 1000 : 0) + candidate.tickHits + candidate.pointHits
            + 10 * chosen.filter(other => overlaps(candidate.rect, other.rect)).length;
        chosen.push(options.reduce((best, candidate) => penalty(candidate) < penalty(best) ? candidate : best));
    }
    return chosen;
}

const handleRequests = (matrix: Mat2): LabelRequest[] => [
    {id: 'a1', anchor: [matrix[0][0], matrix[1][0]], name: '$$a_1=Ae_1$$', distance: 1.1},
    {id: 'a2', anchor: [matrix[0][1], matrix[1][1]], name: '$$a_2=Ae_2$$', distance: 1.1},
];

/** The eigen mode's labels in priority order: the handle labels a1, a2, then v and Av. */
export const eigenLabelRequests = (matrix: Mat2, eigen: EigenView): LabelRequest[] => [
    ...handleRequests(matrix),
    {id: 'v', anchor: eigen.v, name: '$$v$$', distance: 1.1},
    {id: 'av', anchor: eigen.av, name: '$$Av$$', distance: 0.9},
];

/**
 * The composition mode's labels in priority order: the pivot c (when stored), then the images T(P_i), then the sources P_i. The ids are
 * `c`, `t0`..`t3` and `p0`..`p3`; the names are those of `compositionBoard`.
 */
export function compositionLabelRequests(view: CompositionView): LabelRequest[] {
    const requests: LabelRequest[] = [];
    if (view.pivotSet) requests.push({id: 'c', anchor: view.pivot, name: '$$c$$', distance: 1.1});
    view.image.forEach((anchor, i) => requests.push({id: `t${i}`, anchor, name: `$$T(P_${i})$$`, distance: 0.9}));
    view.source.forEach((anchor, i) => requests.push({id: `p${i}`, anchor, name: `$$P_${i}$$`, distance: 0.9}));
    return requests;
}

/** The ellipse mode's labels in priority order: a1, a2, then sigma1, sigma2, then v1, v2, then the conic axes (drawn instead of them). */
export function ellipseLabelRequests(matrix: Mat2, ellipse: EllipseView, conicVisible: boolean): LabelRequest[] {
    const requests = handleRequests(matrix);
    const add = (prefix: string, tips: readonly LabelledTip[]) =>
        tips.forEach((tip, i) => requests.push({id: `${prefix}${i + 1}`, anchor: tip.tip, name: tip.name, distance: 0.9}));
    if (conicVisible) add('conic', ellipse.conicAxes);
    else {
        add('sigma', ellipse.axes);
        add('v', ellipse.directions);
    }
    return requests;
}
