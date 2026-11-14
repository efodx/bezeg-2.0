/**
 * Pixel placement of the board texts of the linear program: the vertex coordinates, the objective handle's caption and the constraint
 * names. Each text takes the free spot nearest to its anchor from a bounded ring of candidates, so it clears the markers, the drawn
 * lines, the axes with their numbers, the legend stack and the texts placed before it. Pure: boxes are in pixels from the board's top
 * left corner, y down.
 */

export interface PxBox {readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number}

export interface LabelItem {
    readonly id: string;
    /** The anchor in px. */
    readonly ax: number;
    readonly ay: number;
    readonly w: number;
    readonly h: number;
    /** Other anchors the text may take instead (a constraint name may sit anywhere along its line), tried after the first. */
    readonly alts?: ReadonlyArray<readonly [number, number]>;
}

export interface LayoutContext {
    readonly width: number;
    readonly height: number;
    /** Point markers: centre and radius in px. */
    readonly markers: ReadonlyArray<readonly [number, number, number]>;
    /** Points sampled along the drawn lines, in px. */
    readonly samples: ReadonlyArray<readonly [number, number]>;
    /** Regions a text should avoid (axis number strips). */
    readonly strips: readonly PxBox[];
    /** Regions no text may take (the legend stack). */
    readonly blocks: readonly PxBox[];
    /** The axes' px positions (the lines are one px wide): a text must not lie across them. */
    readonly axisX?: number;
    readonly axisY?: number;
}

const MARKER_CLEAR_PX = 3;
const RINGS = [0, 8, 16, 26];
const MARGIN_PX = 4;

const overlaps = (a: PxBox, b: PxBox): boolean => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** The candidate boxes round the anchors, nearest first, the sides before the corners, with a rank (the cost of a worse spot). */
function candidates(item: LabelItem): Array<{box: PxBox; rank: number}> {
    const {w, h} = item;
    const out: Array<{box: PxBox; rank: number}> = [];
    const anchors: Array<readonly [number, number]> = [[item.ax, item.ay], ...(item.alts ?? [])];
    for (const [ringIndex, ring] of RINGS.entries()) for (const [anchorIndex, [ax, ay]] of anchors.entries()) {
        const d = 7 + ring;
        const at = (x0: number, y0: number): void => { out.push({box: {x0, y0, x1: x0 + w, y1: y0 + h}, rank: ringIndex * 2 + anchorIndex * 0.4 + out.length * 0.01}); };
        at(ax + d, ay - d - h + 4); // up right
        at(ax + d, ay - h / 2); // right
        at(ax - d - w, ay - d - h + 4); // up left
        at(ax - d - w, ay - h / 2); // left
        at(ax - w / 2, ay - d - h); // up
        at(ax + d, ay + d - 4); // down right
        at(ax - d - w, ay + d - 4); // down left
        at(ax - w / 2, ay + d); // down
    }
    return out;
}

function penalty(box: PxBox, rank: number, ctx: LayoutContext, placed: readonly PxBox[]): number {
    let cost = rank;
    if (box.x0 < MARGIN_PX || box.y0 < MARGIN_PX || box.x1 > ctx.width - MARGIN_PX || box.y1 > ctx.height - MARGIN_PX) cost += 200;
    for (const block of ctx.blocks) if (overlaps(box, block)) cost += 400;
    for (const other of placed) if (overlaps(box, other)) cost += 100;
    for (const strip of ctx.strips) if (overlaps(box, strip)) cost += 12;
    if (ctx.axisX !== undefined && box.x0 <= ctx.axisX + 1 && box.x1 >= ctx.axisX - 1) cost += 30;
    if (ctx.axisY !== undefined && box.y0 <= ctx.axisY + 1 && box.y1 >= ctx.axisY - 1) cost += 30;
    for (const [x, y, r] of ctx.markers) {
        const c = r + MARKER_CLEAR_PX;
        if (x + c > box.x0 && x - c < box.x1 && y + c > box.y0 && y - c < box.y1) cost += 60;
    }
    for (const [x, y] of ctx.samples) if (x >= box.x0 - 1 && x <= box.x1 + 1 && y >= box.y0 - 1 && y <= box.y1 + 1) cost += 4;
    return cost;
}

/** Places the items in order (the first has the pick of the spots); an item with no free candidate takes the cheapest. */
export function placeLpLabels(items: readonly LabelItem[], ctx: LayoutContext): Record<string, PxBox> {
    const result: Record<string, PxBox> = {};
    const placed: PxBox[] = [];
    for (const item of items) {
        let best: PxBox | undefined;
        let bestCost = Infinity;
        candidates(item).forEach(({box, rank}) => {
            const cost = penalty(box, rank, ctx, placed);
            if (cost < bestCost) { bestCost = cost; best = box; }
        });
        if (best) { result[item.id] = best; placed.push(best); }
    }
    return result;
}

/** Points along the polyline (data units mapped by `toPx`) every `step` px, those inside the board only; the cost is bounded by `max`. */
export function sampleLine(x: readonly number[], y: readonly number[], toPx: (x: number, y: number) => readonly [number, number],
                           width: number, height: number, step = 5, max = 600): Array<readonly [number, number]> {
    const out: Array<readonly [number, number]> = [];
    for (let i = 0; i + 1 < x.length && out.length < max; i++) {
        const [x0, y0] = toPx(x[i], y[i]);
        const [x1, y1] = toPx(x[i + 1], y[i + 1]);
        if (![x0, y0, x1, y1].every(Number.isFinite)) continue;
        // Cut the segment to the board first so a huge line costs only its visible length.
        let t0 = 0, t1 = 1;
        const dx = x1 - x0, dy = y1 - y0;
        for (const [p, q] of [[-dx, x0], [dx, width - x0], [-dy, y0], [dy, height - y0]] as const) {
            if (p === 0) { if (q < 0) { t0 = 1; t1 = 0; } continue; }
            const r = q / p;
            if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
        }
        if (t0 > t1) continue;
        const length = Math.hypot(dx, dy) * (t1 - t0);
        const count = Math.max(1, Math.ceil(length / step));
        for (let k = 0; k <= count && out.length < max; k++) {
            const t = t0 + ((t1 - t0) * k) / count;
            out.push([x0 + dx * t, y0 + dy * t]);
        }
    }
    return out;
}
