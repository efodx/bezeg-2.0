/**
 * Pixel placement of the De Casteljau scheme labels `p_i^r` (r >= 1) on boards wide enough for it. Pure: no JSXGraph, boxes in pixels from the
 * board's top left corner (y down). The result point goes first, then the levels from high to low; each label keeps its previous spot
 * (relative to its point) while that spot is still nearly as good as the best one (`LabelItem.prefer`), so labels do not hop while `t` runs.
 */
import {placeLpLabels, type LabelItem, type PxBox} from "../../legend/boardLabelPlacement";

/** Boards narrower than this keep the fixed `decasteljauLabelLayout`. */
export const SCHEME_LABEL_MIN_BOARD_PX = 480;

export interface SchemeLabelPoint {
    readonly id: string;
    /** The scheme level r (1 ... n-1); the result point has the highest. */
    readonly level: number;
    readonly index: number;
    /** The point's position in px. */
    readonly x: number;
    readonly y: number;
    /** The label's size in px. */
    readonly w: number;
    readonly h: number;
}

export interface SchemeLabelRequest {
    readonly width: number;
    readonly height: number;
    readonly points: readonly SchemeLabelPoint[];
    /** Every drawn point: centre and radius in px. */
    readonly markers: ReadonlyArray<readonly [number, number, number]>;
    /** Points along the control polygon, the scheme segments and the curve. */
    readonly samples: ReadonlyArray<readonly [number, number]>;
    /** Axis tick label boxes. */
    readonly strips: readonly PxBox[];
    /** Boxes no text may take: the labels that do not move (control points). */
    readonly occupied: readonly PxBox[];
    readonly axisX?: number;
    readonly axisY?: number;
    /** The top left offset of each label's box from its point on the previous update. */
    readonly previous?: ReadonlyMap<string, readonly [number, number]>;
}

export interface SchemeLabelPlacement {
    readonly box: PxBox;
    /** Top left of the box minus the point, in px (y down): remembered as the next `previous`. */
    readonly from: readonly [number, number];
    /** The JSXGraph label offset for `anchorX/Y: "middle"`: box centre minus the point, y up. */
    readonly offset: readonly [number, number];
}

/** Estimated label size when the board has not measured it yet (the default label measures about 22 x 26 px at the default font size). */
export function estimatedSchemeLabelSize(fontSize: number): readonly [number, number] {
    return [Math.round(fontSize * 1.1), Math.round(fontSize * 1.3)];
}

export function placeSchemeLabels(request: SchemeLabelRequest): Map<string, SchemeLabelPlacement> {
    const ordered = [...request.points].sort((a, b) => b.level - a.level || a.index - b.index);
    const items: LabelItem[] = ordered.map(p => ({id: p.id, ax: p.x, ay: p.y, w: p.w, h: p.h, prefer: request.previous?.get(p.id)}));
    const boxes = placeLpLabels(items, {
        width: request.width, height: request.height, markers: request.markers, samples: request.samples,
        strips: request.strips, blocks: request.occupied, axisX: request.axisX, axisY: request.axisY,
    });
    const out = new Map<string, SchemeLabelPlacement>();
    for (const p of ordered) {
        const box = boxes[p.id];
        if (!box) continue;
        out.set(p.id, {
            box,
            from: [box.x0 - p.x, box.y0 - p.y],
            offset: [(box.x0 + box.x1) / 2 - p.x, -((box.y0 + box.y1) / 2 - p.y)],
        });
    }
    return out;
}
