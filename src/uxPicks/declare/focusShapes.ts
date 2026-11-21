import type {HullPoint} from "./hull";

type Pt = HullPoint;
type Range = readonly [number, number];

/** What a graph wants in view: sampled into world points for the focus hull. */
export type FocusShape =
    | {kind: 'point'; at: Pt}
    | {kind: 'segment'; from: Pt; to: Pt}
    /** y = f(x) on [from, to]. */
    | {kind: 'curve'; f: (x: number) => number; from: number; to: number; samples?: number}
    /** (x, y) = p(t) on [from, to]. */
    | {kind: 'parametric'; p: (t: number) => Pt; from: number; to: number; samples?: number}
    /** The part of an infinite line through `through` along `direction` for parameters [from, to]. */
    | {kind: 'line'; through: Pt; direction: Pt; from: number; to: number}
    | {kind: 'region'; polygon: readonly Pt[]}
    | {kind: 'disc'; centre: Pt; radius: number; samples?: number}
    /** Horizontal strip y in `y` over x in `over`, or vertical strip x in `x` over y in `over`. */
    | {kind: 'band'; y?: Range; x?: Range; over: Range};

export interface SampleOptions {
    /** Default sample count for curves, parametric curves and discs. */
    samples?: number;
    /** Curve and parametric points are clamped to this y range (e.g. near poles). */
    yRange?: Range;
}

export const DEFAULT_SAMPLES = 24;

const finite = (p: Pt) => Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** Samples t in [from, to] (both ends included); one refinement pass where a step in y exceeds 2.5x the mean step. */
function sampleParam(p: (t: number) => Pt, from: number, to: number, n: number, yRange?: Range): Pt[] {
    if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
    const count = Math.max(2, Math.round(n));
    const ts: number[] = [];
    for (let i = 0; i <= count; i++) ts.push(i === count ? to : from + (to - from) * i / count);
    const evalAt = (t: number): Pt | undefined => {
        const v = p(t);
        if (!finite(v)) return undefined;
        return yRange ? [v[0], Math.min(yRange[1], Math.max(yRange[0], v[1]))] : v;
    };
    const first = ts.map(evalAt);
    let total = 0, steps = 0;
    for (let i = 1; i < first.length; i++) {
        const a = first[i - 1], b = first[i];
        if (a && b) { total += Math.abs(b[1] - a[1]); steps++; }
    }
    const mean = steps ? total / steps : 0;
    const out: Pt[] = [];
    for (let i = 0; i < ts.length; i++) {
        const v = first[i];
        const prev = first[i - 1];
        if (i > 0 && v && prev && Math.abs(v[1] - prev[1]) > 2.5 * mean) {
            for (const k of [0.25, 0.5, 0.75]) {
                const m = evalAt(ts[i - 1] + (ts[i] - ts[i - 1]) * k);
                if (m) out.push(m);
            }
        }
        if (v) out.push(v);
    }
    return out;
}

export function samplePoints(shapes: readonly FocusShape[], opts: SampleOptions = {}): Pt[] {
    const dflt = opts.samples ?? DEFAULT_SAMPLES;
    const out: Pt[] = [];
    for (const s of shapes) {
        switch (s.kind) {
            case 'point':
                out.push(s.at);
                break;
            case 'segment':
                out.push(s.from, s.to);
                break;
            case 'curve':
                out.push(...sampleParam(x => [x, s.f(x)], s.from, s.to, s.samples ?? dflt, opts.yRange));
                break;
            case 'parametric':
                out.push(...sampleParam(s.p, s.from, s.to, s.samples ?? dflt, opts.yRange));
                break;
            case 'line':
                for (const t of [s.from, s.to]) out.push([s.through[0] + t * s.direction[0], s.through[1] + t * s.direction[1]]);
                break;
            case 'region':
                out.push(...s.polygon);
                break;
            case 'disc': {
                const n = Math.max(3, Math.round(s.samples ?? dflt));
                for (let i = 0; i < n; i++) {
                    const a = 2 * Math.PI * i / n;
                    out.push([s.centre[0] + s.radius * Math.cos(a), s.centre[1] + s.radius * Math.sin(a)]);
                }
                break;
            }
            case 'band':
                if (s.y) out.push([s.over[0], s.y[0]], [s.over[1], s.y[0]], [s.over[0], s.y[1]], [s.over[1], s.y[1]]);
                else if (s.x) out.push([s.x[0], s.over[0]], [s.x[0], s.over[1]], [s.x[1], s.over[0]], [s.x[1], s.over[1]]);
                break;
        }
    }
    return out.filter(finite);
}
