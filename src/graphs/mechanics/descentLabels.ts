import type {LabelItem, PxBox} from "../legend/boardLabelPlacement";
import {distanceToBox, placeNames, type PlacementInput} from "../legend/pointNamePlacement";

/** The size of a plain text at 14 px, measured in the browser: 8 px a letter or digit, 4 px a space or punctuation mark, 21 px high with its padding. */
export const textBox = (content: string): {w: number; h: number} => ({w: [...content].reduce((sum, ch) => sum + (/[\s,;:.()]/.test(ch) ? 4 : 8), 2), h: 21});

/** A text to place: the shared name item, and for a curve name the curve's samples (px), which the kept spot must stay beside. */
export interface TrackItem extends LabelItem {
    readonly curve?: ReadonlyArray<readonly [number, number]>;
}

/** Where a text was placed, with the anchor it was placed from and the drawn samples under it then. */
export interface Spot {
    readonly box: PxBox;
    readonly ax: number;
    readonly ay: number;
    readonly under: number;
}

/** The spots of one placement by item id; the next placement prefers them. Boxes and numbers only: no board reference. */
export type Spots = Record<string, Spot>;

const overlap = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const samplesUnder = (samples: PlacementInput["samples"], c: PxBox) => samples.filter(([x, y]) => x >= c.x0 + 3 && x <= c.x1 - 3 && y >= c.y0 + 4 && y <= c.y1 - 4).length;

/**
 * The shared name placement (`placeNames`), item by item in priority order, with a spot kept while it stays valid: a text keeps the spot it had
 * (a handle's text moves with its handle) while it is clear of the other texts, markers, tick labels and blocks, still beside its own marker or curve and
 * under no more drawn line than before. A dragged handle so moves its texts without hopping them between free spots.
 */
export function placeStable(input: PlacementInput & {readonly items: readonly TrackItem[]}, size: {readonly width: number; readonly height: number},
                            strips: readonly PxBox[], previous: Spots): Spots {
    const out: Spots = {};
    const placed: PxBox[] = [];
    for (const item of input.items) {
        const prev = previous[item.id];
        const own = input.markers.find(([mx, my]) => Math.hypot(mx - item.ax, my - item.ay) < 1);
        let kept: PxBox | undefined;
        if (prev) {
            const dx = own ? item.ax - prev.ax : 0, dy = own ? item.ay - prev.ay : 0;
            const c: PxBox = {x0: prev.box.x0 + dx, y0: prev.box.y0 + dy, x1: prev.box.x1 + dx, y1: prev.box.y1 + dy};
            const inside = c.x0 >= 2 && c.y0 >= 2 && c.x1 <= size.width - 2 && c.y1 <= size.height - 2;
            const clear = !placed.some(o => overlap(c, o)) && !(input.blocks ?? []).some(b => overlap(c, b)) && !strips.some(b => overlap(c, b))
                && !input.markers.some(m => m !== own && distanceToBox(c, m[0], m[1]) < m[2]);
            const beside = own
                ? distanceToBox(c, own[0], own[1]) - own[2] <= 18 && input.markers.every(m => m === own || Math.hypot((c.x0 + c.x1) / 2 - m[0], (c.y0 + c.y1) / 2 - m[1]) > Math.hypot((c.x0 + c.x1) / 2 - own[0], (c.y0 + c.y1) / 2 - own[1]))
                : (item.curve ?? []).some(([x, y]) => distanceToBox(c, x, y) <= 16);
            if (inside && clear && beside && samplesUnder(input.samples, c) <= prev.under + 3) kept = c;
        }
        if (!kept) {
            const fresh = placeNames({items: [item], markers: input.markers, samples: input.samples, blocks: [...(input.blocks ?? []), ...placed]}, size, strips)[item.id];
            if (!fresh) continue;
            kept = fresh;
        }
        placed.push(kept);
        out[item.id] = {box: kept, ax: item.ax, ay: item.ay, under: samplesUnder(input.samples, kept)};
    }
    return out;
}
