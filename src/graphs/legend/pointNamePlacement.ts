import {sampleLine, type LabelItem, type PxBox} from "./boardLabelPlacement";

/**
 * Pixel placement of point and line names that must stay beside their own marker (first written for the projective graphs; see
 * docs/specs/lesson-graph-label-collisions.md, "Closeness outranks thin lines"). A graph gives the names in priority order, the drawn
 * markers and strokes; `placeNames` returns a box per name; a JSXGraph label (anchored in the middle) takes the offset from its element's
 * pixel position to the centre of its box. One computation is shared by every label of one board state (`PlacedLabels`).
 * `boardLabelPlacement.ts` is the other placement: it keeps texts off drawn lines first and suits captions and long texts.
 */

/** The board's px frame: the corner, the scale and the canvas size; undefined while the board has no size. */
export interface PxFrame {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly toPx: (x: number, y: number) => readonly [number, number];
}

/** What one placement is computed from, all in px from the board's top left corner (y down). */
export interface PlacementInput {
    /** The names in priority order (the first has the pick of the spots). */
    readonly items: readonly LabelItem[];
    /** The drawn points: centre and radius. */
    readonly markers: ReadonlyArray<readonly [number, number, number]>;
    /** The drawn lines and curves, sampled. */
    readonly samples: ReadonlyArray<readonly [number, number]>;
    /** Other texts of the board a name must not cover. */
    readonly blocks?: readonly PxBox[];
}

interface BoardLike {
    readonly canvasWidth: number;
    readonly canvasHeight: number;
    readonly unitX: number;
    readonly unitY: number;
    getBoundingBox(): number[];
}

export function pxFrame(board: BoardLike): PxFrame | undefined {
    if (!(board.canvasWidth > 0) || !(board.canvasHeight > 0)) return undefined;
    const [left, top] = board.getBoundingBox();
    const ux = Number.isFinite(board.unitX) && board.unitX > 0 ? board.unitX : 1;
    const uy = Number.isFinite(board.unitY) && board.unitY > 0 ? board.unitY : 1;
    return {left, top, width: board.canvasWidth, height: board.canvasHeight, toPx: (x, y) => [(x - left) * ux, (top - y) * uy]};
}

/** The size of a typeset name (px) at the label font size: about 0.62 em a glyph, a prime or a subscript counting as half a glyph. */
export function nameBox(name: string, fontPx: number): {w: number; h: number} {
    let glyphs = 0;
    for (const ch of name) glyphs += /[′'₀-₉]/.test(ch) ? 0.5 : 1;
    return {w: Math.ceil(glyphs * fontPx * 0.62 + 6), h: Math.ceil(fontPx * 1.2 + 4)};
}

/** The axis tick labels (a drawn axis number each) as soft obstacles. */
export function tickStrips(board: unknown): PxBox[] {
    type Tick = {evalVisProp(name: string): unknown; plaintext?: string; coords?: {scrCoords: number[]}};
    const axes = (board as {defaultAxes?: {x?: {defaultTicks?: {labels?: Tick[]}}; y?: {defaultTicks?: {labels?: Tick[]}}}}).defaultAxes;
    const strips: PxBox[] = [];
    for (const [axis, ticks] of [["x", axes?.x?.defaultTicks?.labels], ["y", axes?.y?.defaultTicks?.labels]] as const) {
        for (const tick of ticks ?? []) {
            const [, sx, sy] = tick.coords?.scrCoords ?? [];
            if (!tick.evalVisProp("visible") || !Number.isFinite(sx) || !Number.isFinite(sy) || !tick.plaintext) continue;
            const w = tick.plaintext.length * 7 + 4, h = 14;
            strips.push(axis === "x" ? {x0: sx - w / 2, y0: sy, x1: sx + w / 2, y1: sy + h} : {x0: sx - w, y0: sy - h / 2, x1: sx, y1: sy + h / 2});
        }
    }
    return strips;
}

/** A straight line (two data points) as px samples over the board, and anchors along the visible part for a name that may sit anywhere on it. */
export function lineSamples(frame: PxFrame, p: readonly [number, number], q: readonly [number, number]): Array<readonly [number, number]> {
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (!(length > 0)) return [];
    const reach = 80 / length;
    const at = (t: number) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] as const;
    const [a, b] = [at(-reach), at(reach)];
    return sampleLine([a[0], b[0]], [a[1], b[1]], frame.toPx, frame.width, frame.height, 2, 1500);
}

/** The anchors a name may take along sampled line points: near each end first, then inwards. */
export function anchorsAlong(samples: ReadonlyArray<readonly [number, number]>, fractions: readonly number[] = [0.06, 0.94, 0.16, 0.84, 0.3, 0.7]): Array<readonly [number, number]> {
    if (samples.length === 0) return [];
    return fractions.map(f => samples[Math.min(samples.length - 1, Math.round(f * (samples.length - 1)))]);
}

const overlap = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** The distance (px) from a point to the nearest edge of a box (0 inside it). */
export const distanceToBox = (b: PxBox, x: number, y: number): number => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));

/**
 * Places each name beside its own marker (settled rules of lesson-graph-label-collisions, LC-2 and LC-3): a box whose edge is within 14 px of the
 * marker's edge wins over any farther one even when a thin stroke runs through it; only without such a spot does a name go farther, never past 40 px.
 * Never on another name, another marker, a tick label or a block. A box centre is nearer to its own marker than to any other (markers within 6 px of
 * it excepted); for two markers closer than 16 px each name first tries the side pointing away from the other. A name without a marker at its
 * anchor (a line's) tries its anchors in turn. Names are placed in the order given; one with no free spot keeps the nearest spot clear of names.
 */
export function placeNames(input: PlacementInput, size: {readonly width: number; readonly height: number}, strips: readonly PxBox[]): Record<string, PxBox> {
    const out: Record<string, PxBox> = {};
    const GAPS = [4, 7, 10, 14, 20, 28, 40];
    for (const item of input.items) {
        const anchors: Array<readonly [number, number]> = [[item.ax, item.ay], ...(item.alts ?? [])];
        const own = input.markers.find(([mx, my]) => Math.hypot(mx - item.ax, my - item.ay) < 1);
        const others = input.markers.filter(m => m !== own);
        const rivals = own ? others.filter(([mx, my]) => Math.hypot(mx - own[0], my - own[1]) >= 6) : others;
        const near = own ? rivals.filter(([mx, my]) => Math.hypot(mx - own[0], my - own[1]) < 16) : [];
        const radius = own ? own[2] : 0;
        let best: PxBox | undefined;
        let bestCost = Infinity;
        let fallback: PxBox | undefined;
        let fallbackCost = Infinity;
        anchors.forEach(([ax, ay], ai) => {
            for (const gap of GAPS) for (let k = 0; k < 16; k++) {
                const angle = -Math.PI / 4 + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8); // up right first, then alternately each way round
                const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
                let s = 0;
                const boxAt = (d: number): PxBox => ({x0: ax + dx * d - item.w / 2, y0: ay + dy * d - item.h / 2, x1: ax + dx * d + item.w / 2, y1: ay + dy * d + item.h / 2});
                while (s < 120 && distanceToBox(boxAt(s), ax, ay) < gap + radius) s += 0.5;
                const c = boxAt(s);
                if (c.x0 < 2 || c.y0 < 2 || c.x1 > size.width - 2 || c.y1 > size.height - 2) continue;
                const [cx, cy] = [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2];
                if (Object.values(out).some(o => overlap(c, o))) continue;
                const onMarker = others.some(([mx, my, mr]) => distanceToBox(c, mx, my) < mr);
                const onBlock = (input.blocks ?? []).some(b => overlap(c, b)) || strips.some(b => overlap(c, b));
                const centreDist = Math.hypot(cx - ax, cy - ay);
                const nearer = rivals.every(([mx, my]) => Math.hypot(cx - mx, cy - my) > centreDist);
                let samples = 0;
                for (const [x, y] of input.samples) if (x >= c.x0 + 3 && x <= c.x1 - 3 && y >= c.y0 + 4 && y <= c.y1 - 4) samples++;
                const toward = near.reduce((m, [mx, my]) => Math.max(m, (dx * (mx - ax) + dy * (my - ay)) / Math.max(1, Math.hypot(mx - ax, my - ay))), -1);
                const actual = distanceToBox(c, ax, ay) - radius;
                const base = (actual <= 14 ? 0 : 1000 + actual * 10) + ai * 40 + samples * 0.5 + (toward > 0 ? 40 * toward : 0) + actual * 0.5 + k * 0.05;
                if (onMarker || onBlock || !nearer) {
                    // Not allowed, but the nearest such spot is kept in case nothing else is free.
                    const c2 = base + 1e5 + (onMarker ? 1e4 : 0) + (onBlock ? 1e3 : 0);
                    if (c2 < fallbackCost) { fallbackCost = c2; fallback = c; }
                    continue;
                }
                if (base < bestCost) { bestCost = base; best = c; }
            }
        });
        const chosen = best ?? fallback;
        if (chosen) out[item.id] = chosen;
    }
    return out;
}

export class PlacedLabels {
    private cache?: {readonly frame: string; readonly token: readonly unknown[]; readonly boxes: Record<string, PxBox>};

    /** The boxes of the board state `token` names (compared item by item: the graph's model, the language and the like); the board's frame is added to it. */
    boxes(board: BoardLike & {defaultAxes?: unknown}, token: readonly unknown[], build: (frame: PxFrame) => PlacementInput): Record<string, PxBox> {
        const frame = pxFrame(board);
        if (!frame) return {};
        const key = `${frame.left},${frame.top},${board.unitX},${board.unitY},${frame.width},${frame.height}`;
        const c = this.cache;
        if (c && c.frame === key && c.token.length === token.length && c.token.every((v, i) => v === token[i])) return c.boxes;
        const input = build(frame);
        const strips = tickStrips(board);
        const boxes = placeNames(input, frame, strips);
        this.cache = {frame: key, token, boxes};
        return boxes;
    }

    /** The label offset (px, y up) that puts a middle-anchored label at its box, or `fallback` when the name has none. */
    offset(box: PxBox | undefined, anchor: readonly [number, number], fallback: readonly [number, number]): [number, number] {
        if (!box) return [fallback[0], fallback[1]];
        return [(box.x0 + box.x1) / 2 - anchor[0], anchor[1] - (box.y0 + box.y1) / 2];
    }

    /** Drops the memo (a scene replaced, the graph disposed): it holds no board reference, only boxes. */
    clear(): void {
        this.cache = undefined;
    }
}
