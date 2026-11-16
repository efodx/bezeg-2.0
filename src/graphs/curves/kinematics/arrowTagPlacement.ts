/**
 * Pixel placement of the arrow tags of the kinematics graph. Each tag takes the cheapest spot from a bounded ring of candidates round its own
 * arrow tip (6 rings x 8 directions = 48 per tag, 4 tags at most). A spot is refused when it overlaps a tag placed before, covers an arrowhead or the
 * moving point, or lies nearer another tip than its own; it is penalised on a shaft, over the captions, and beyond the board. Pure: boxes are in
 * pixels from the board's top left corner, y down.
 */
import type {PxBox} from "../../legend/boardLabelPlacement";

export interface TagItem {
    readonly id: string;
    /** The arrow tip in px. */
    readonly tip: readonly [number, number];
    readonly w: number;
    readonly h: number;
}

export interface TagContext {
    readonly width: number;
    readonly height: number;
    /** The moving point in px. */
    readonly point: readonly [number, number];
    /** Arrow shafts as runs of sample points in px (a tag may touch them at a cost). */
    readonly samples: ReadonlyArray<readonly [number, number]>;
    /** The caption stack, which no tag should cover. */
    readonly block?: PxBox;
    /** The strips of the axis numbers: a tag takes them only when nothing else is free. */
    readonly strips?: readonly PxBox[];
}

/** Clearance round the moving point (marker 5 px) and round an arrowhead (a triangle about 8 px long), in pixels. */
export const POINT_CLEAR_PX = 8;
export const HEAD_CLEAR_PX = 9;
const RINGS = [0, 6, 12, 20, 30, 44];
const MARGIN_PX = 4;
const REFUSED = 1000;

/** The distance of a box from a point, in pixels (zero inside). */
export const boxGap = (box: PxBox, [x, y]: readonly [number, number]): number => Math.hypot(Math.max(box.x0 - x, 0, x - box.x1), Math.max(box.y0 - y, 0, y - box.y1));

const overlaps = (a: PxBox, b: PxBox): boolean => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

export function placeArrowTags(items: readonly TagItem[], ctx: TagContext): Record<string, PxBox> {
    const result: Record<string, PxBox> = {};
    const placed: PxBox[] = [];
    for (const item of items) {
        const {w, h, tip: [ax, ay]} = item;
        let best: PxBox | undefined;
        let bestCost = Infinity;
        RINGS.forEach((ring, ringIndex) => {
            const d = 5 + ring;
            const spots: ReadonlyArray<readonly [number, number]> = [
                [ax + d, ay - d - h + 4], [ax + d, ay - h / 2], [ax - d - w, ay - d - h + 4], [ax - d - w, ay - h / 2],
                [ax - w / 2, ay - d - h], [ax + d, ay + d - 4], [ax - d - w, ay + d - 4], [ax - w / 2, ay + d],
            ];
            spots.forEach(([x0, y0], index) => {
                const box: PxBox = {x0, y0, x1: x0 + w, y1: y0 + h};
                let cost = ringIndex * 2 + index * 0.25;
                if (box.x0 < MARGIN_PX || box.y0 < MARGIN_PX || box.x1 > ctx.width - MARGIN_PX || box.y1 > ctx.height - MARGIN_PX) cost += 200;
                if (ctx.block && overlaps(box, ctx.block)) cost += 400;
                for (const strip of ctx.strips ?? []) if (overlaps(box, strip)) cost += 3;
                if (boxGap(box, ctx.point) < POINT_CLEAR_PX) cost += REFUSED;
                for (const other of items) {
                    if (boxGap(box, other.tip) < HEAD_CLEAR_PX) cost += REFUSED;
                    // Nearest its own tip, unless the two tips coincide (then no spot can tell them apart).
                    if (other !== item && Math.hypot(other.tip[0] - ax, other.tip[1] - ay) > 1 && boxGap(box, other.tip) <= boxGap(box, item.tip) + 0.5) cost += REFUSED;
                }
                for (const earlier of placed) if (overlaps(box, earlier)) cost += REFUSED;
                for (const [x, y] of ctx.samples) if (x >= box.x0 - 1 && x <= box.x1 + 1 && y >= box.y0 - 1 && y <= box.y1 + 1) cost += 4;
                if (cost < bestCost) { bestCost = cost; best = box; }
            });
        });
        if (best) { result[item.id] = best; placed.push(best); }
    }
    return result;
}
