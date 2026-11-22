import {getParam, probeWindow, type CountParam, type ParamEntry, type RangeParam} from '../a1/paramRegistry';
import {drawn, settle, type JxgBoard} from '../a19/ghost';

/**
 * a29 overview (ported from a27's fan analysis in ux-challenge/a): set the parameter to its neighbours for a moment,
 * collect the curves that moved, and find the points every neighbour passes through. Slider: two steps each side
 * (about 6% of the range per step); count: one step down and up. The live value is restored.
 */

type Pt = [number, number];
export interface Fan {paths: {d: string; offset: number}[]; pins: {sx: number; sy: number; text: string}[]; sentence: string}

const isCurve = (object: {elType?: string}) => object.elType === 'curve' || object.elType === 'functiongraph';

function polylines(object: unknown, W: number, H: number): Pt[][] {
    const points = (object as {points?: {scrCoords: number[]}[]}).points ?? [];
    const runs: Pt[][] = [];
    let run: Pt[] = [];
    const inside = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && x > -2 && y > -2 && x < W + 2 && y < H + 2;
    let last: Pt | undefined;
    for (const point of points) {
        const [, x, y] = point.scrCoords;
        if (!inside(x, y)) { if (run.length > 1) runs.push(run); run = []; last = undefined; continue; }
        if (last) {
            const steps = Math.min(200, Math.floor(Math.hypot(x - last[0], y - last[1]) / 2));
            for (let k = 1; k <= steps; k++) run.push([last[0] + (x - last[0]) * k / (steps + 1), last[1] + (y - last[1]) * k / (steps + 1)]);
        }
        run.push([x, y]);
        last = [x, y];
    }
    if (run.length > 1) runs.push(run);
    const total = runs.reduce((n, r) => n + r.length, 0);
    const keep = Math.max(1, Math.ceil(total / 900));
    return keep === 1 ? runs : runs.map(r => r.filter((_p, i) => i % keep === 0 || i === r.length - 1));
}

function distance(p: Pt, lines: Pt[][]): number {
    let best = Infinity;
    for (const run of lines) for (let i = 1; i < run.length; i++) {
        const [x1, y1] = run[i - 1], [x2, y2] = run[i];
        const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - x1) * dx + (p[1] - y1) * dy) / l2)) : 0;
        const d = Math.hypot(p[0] - x1 - t * dx, p[1] - y1 - t * dy);
        if (d < best) best = d;
    }
    return best;
}

/** Points every neighbour passes through (local minima of the largest distance, from which the curves part on both sides). */
function common(own: Pt[][], neighbours: Pt[][][], still: {count: number; total: number}): Pt[] {
    const out: Pt[] = [];
    const W = 80;
    for (const run of own) {
        const D = run.map(p => Math.max(...neighbours.map(lines => distance(p, lines))));
        still.count += D.filter(d => d < 1.2).length; still.total += D.length;
        const arc = [0];
        for (let i = 1; i < run.length; i++) arc.push(arc[i - 1] + Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]));
        for (let i = 1; i < run.length - 1; i++) {
            if (D[i] >= 1.2 || D[i] > D[i - 1] || D[i] > D[i + 1]) continue;
            let left = 0, right = 0;
            for (let j = Math.max(0, i - W); j < i; j++) if (arc[j] > 60) left = Math.max(left, D[j]);
            for (let j = i + 1; j <= Math.min(run.length - 1, i + W); j++) if (arc[run.length - 1] - arc[j] > 60) right = Math.max(right, D[j]);
            if (left - D[i] >= 1.5 && right - D[i] >= 1.5) out.push(run[i]);
        }
    }
    return out;
}
const near = (list: Pt[], p: Pt, r: number) => list.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) <= r);

/** `cancelled` is asked between the probe's steps: once true the walk stops, the values are put back, and nothing is returned. */
export function analyse(board: JxgBoard, svg: SVGSVGElement, entry: ParamEntry, cancelled: () => boolean = () => false): Promise<Fan | undefined> {
    return probeWindow(() => walk(board, svg, entry, cancelled));
}

async function walk(board: JxgBoard, svg: SVGSVGElement, entry: ParamEntry, cancelled: () => boolean): Promise<Fan | undefined> {
    const W = svg.clientWidth, H = svg.clientHeight;
    const key = entry.key;
    let offsets: number[];
    let goTo: (offset: number) => Promise<void>;
    let sources: number;
    if (entry.kind === 'range') {
        const v0 = entry.value, span = entry.max - entry.min;
        const delta = Math.max(entry.step, span * 0.06);
        offsets = [-2, -1, 1, 2].filter(k => entry.cyclic !== undefined || (v0 + k * delta >= entry.min - 1e-9 && v0 + k * delta <= entry.max + 1e-9));
        if (offsets.length < 2) return undefined;
        goTo = offset => settle(board, () => {
            const current = getParam(key) as RangeParam | undefined;
            if (!current) return;
            let value = v0 + offset * delta;
            if (entry.cyclic !== undefined) value = ((value - entry.min) % span + span) % span + entry.min;
            current.setRaw(value);
        });
        sources = 2;
    } else {
        offsets = [-1, 1];
        let at = 0;
        // Counts step one at a time, each step settled so the next reads the new value; a bound stops the walk.
        goTo = async offset => {
            while (at !== offset) {
                const direction = at < offset ? 1 : -1;
                let moved = false;
                await settle(board, () => {
                    const current = getParam(key) as CountParam | undefined;
                    moved = !!current && (direction > 0 ? current.plus() : current.minus());
                });
                if (!moved) return;
                at += direction;
            }
        };
        sources = 1;
    }
    const steppy = (lines: Pt[][]) => {
        const all = lines.flat();
        const walls = lines.reduce((n, r) => n + r.slice(1).filter((p, i) => Math.abs(p[0] - r[i][0]) < 0.05 && Math.abs(p[1] - r[i][1]) > 0.2).length, 0);
        return all.length > 0 && walls / all.length > 0.15;
    };
    const curves = drawn(board).filter(isCurve).filter(object => !steppy(polylines(object, W, H)));
    const shape = (id: string) => svg.querySelector(`[id="${CSS.escape(id)}"]`);
    const base = new Map(curves.map(object => [object.id, {d: object.rendNode!.getAttribute('d') ?? '', lines: polylines(object, W, H)}]));
    const neighbours: {offset: number; shapes: Map<string, {d: string; lines: Pt[][]}>}[] = [];
    try {
        for (const k of offsets) {
            await goTo(k);
            if (cancelled()) break;
            const shapes = new Map<string, {d: string; lines: Pt[][]}>();
            for (const object of curves) {
                const node = shape(object.rendNode!.id);
                const d = node?.getAttribute('d') ?? '';
                if (node && d !== base.get(object.id)?.d) shapes.set(object.id, {d, lines: polylines(object, W, H)});
            }
            neighbours.push({offset: k, shapes});
        }
    } finally {
        await goTo(0);
    }
    if (cancelled()) return undefined;
    const moved = curves.filter(object => neighbours.some(n => n.shapes.has(object.id)) && (base.get(object.id)?.lines.length ?? 0) > 0);
    if (!moved.length) return undefined;
    const [, ox, oy] = board.origin?.scrCoords ?? [1, 0, 0];
    const unitX = board.unitX ?? 1, unitY = board.unitY ?? 1;
    const decimals = (unit: number) => unit >= 400 ? 3 : unit >= 90 ? 2 : 1;
    const fmt = (value: number, unit: number) => {
        const nice = Math.round(value * 10) / 10;
        const v = Math.abs(value - nice) * unit < 2 ? nice : Number(value.toFixed(decimals(unit)));
        return (Object.is(v, -0) ? 0 : v).toLocaleString('sl-SI', {maximumFractionDigits: 3}).replace('-', '−');
    };
    const fmtX = (value: number, unit: number) => {
        const k = Math.round(value / (Math.PI / 2));
        if (k !== 0 && Math.abs(k) <= 12 && Math.abs(value - k * Math.PI / 2) * unit < 2 && Math.abs(value - Math.round(value * 10) / 10) * unit >= 1) {
            const sign = k < 0 ? '−' : '', n = Math.abs(k);
            return n % 2 === 0 ? `${sign}${n === 2 ? '' : n / 2}π` : `${sign}${n === 1 ? '' : n}π/2`;
        }
        return fmt(value, unit);
    };
    const pins: Fan['pins'] = [];
    const still = {count: 0, total: 0};
    let grows = false;
    for (const object of moved) {
        const own = base.get(object.id)!.lines;
        const others = neighbours.filter(n => n.shapes.has(object.id)).map(n => n.shapes.get(object.id)!.lines);
        if (others.length < sources) continue;
        const length = (lines: Pt[][]) => lines.reduce((n, r) => n + r.slice(1).reduce((m, q, i) => m + Math.hypot(q[0] - r[i][0], q[1] - r[i][1]), 0), 0);
        const lengths = neighbours.filter(n => n.shapes.has(object.id)).map(n => [n.offset, length(n.shapes.get(object.id)!.lines)] as const).sort((x, y) => x[0] - y[0]);
        if (lengths.length >= 2 && Math.abs(lengths[lengths.length - 1][1] - lengths[0][1]) > 0.1 * length(own)) grows = true;
        for (const p of common(own, others, still)) {
            if (near(pins.map(q => [q.sx, q.sy] as Pt), p, 10)) continue;
            if (p[0] < 4 || p[1] < 4 || p[0] > W - 4 || p[1] > H - 4) continue;
            pins.push({sx: p[0], sy: p[1], text: `(${fmtX((p[0] - ox) / unitX, unitX)}; ${fmt((oy - p[1]) / unitY, unitY)})`});
        }
    }
    // Owner (2026-11-21): no interpretive statements ("graf gre vedno skozi …"); the fan and its pins speak for themselves.
    void grows;
    const sentence = 'sosednje vrednosti';
    const paths = neighbours.flatMap(n => [...n.shapes.values()].map(s => ({d: s.d, offset: n.offset})));
    return {paths, pins: pins.slice(0, 8), sentence};
}
