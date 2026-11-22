import JXG from "jsxgraph";
import {VOLATILE} from "../../../bezeg/impl/versioning";

/** What the cache needs of the evaluated curve; a missing `version()` means volatile. */
export interface SamplingSource {
    version?(): number;
}

interface CachedSamples {
    key: string;
    source: SamplingSource;
    points: JXG.Coords[];
}

const installed = new WeakSet<object>();

type PlotElement = JXG.Curve & {
    updateCurve(): JXG.Curve;
    minX(): number;
    maxX(): number;
    points: Array<JXG.Coords & {_t?: number}>;
    numberPoints: number;
    transformations?: unknown[];
};

/**
 * A parametric JSXGraph curve whose parameter interval moves while its geometry does not (the growing and the
 * remaining part of a De Casteljau demonstration) is sampled once over `[0, 1]`; each later update cuts that
 * polyline to the current interval. The cut ends exactly at the evaluator's value at both interval ends, and all
 * interior samples come from the same adaptive plot, so only the geometry, the board view or the plot quality
 * (the key) trigger sampling again.
 *
 * Falls back to JSXGraph's own sampling for a volatile source, an interval outside `[0, 1]` or empty, curve
 * transformations, and a plot that JSXGraph restricted to the visible area. Owns no listener or board object:
 * the override lives and dies with `element`.
 */
export function reuseSamplesAcrossIntervalChanges(element: JXG.Curve, source: () => SamplingSource | undefined): void {
    if (installed.has(element)) return;
    installed.add(element);
    const curve = element as PlotElement;
    const sampleAdaptively = curve.updateCurve;
    if (typeof sampleAdaptively !== "function") return;
    let cache: CachedSamples | undefined;

    curve.updateCurve = function (this: PlotElement): JXG.Curve {
        const current = source();
        const from = this.minX();
        const to = this.maxX();
        const version = current?.version?.() ?? VOLATILE;
        if (!current || version === VOLATILE || this.transformations?.length
            || !(from >= 0 && to <= 1 && from < to)) {
            cache = undefined;
            return sampleAdaptively.call(this);
        }
        const board = this.board;
        const key = [version, ...board.getBoundingBox(), board.canvasWidth, board.canvasHeight, board.updateQuality].join(",");
        if (!cache || cache.source !== current || cache.key !== key) {
            cache = sampleFullInterval(this, sampleAdaptively, current, key);
            if (!cache) return sampleAdaptively.call(this);
        }
        cutTo(this, cache.points, from, to);
        return this;
    };
}

function sampleFullInterval(curve: PlotElement, sample: () => JXG.Curve, source: SamplingSource, key: string): CachedSamples | undefined {
    const {minX, maxX} = curve;
    curve.minX = () => 0;
    curve.maxX = () => 1;
    // The plot records its visible area on a shared object; clear it so a value left by another curve is never read as this plot's.
    const plot = (JXG.Math as unknown as {Plot?: {_visibleArea?: number[]}}).Plot;
    if (plot) plot._visibleArea = undefined;
    try {
        sample.call(curve);
    } finally {
        curve.minX = minX;
        curve.maxX = maxX;
    }
    const area = (JXG.Math as unknown as {Plot?: {_visibleArea?: number[]}}).Plot?._visibleArea;
    const points = curve.points;
    // JSXGraph cuts a plot to the visible area (plus margin) when the curve leaves it; a cut of that is not the whole curve.
    if (!area || area[0] !== 0 || area[1] !== 1 || points.length < 2 || points.some(point => typeof point._t !== "number")) {
        return undefined;
    }
    return {key, source, points: points.slice()};
}

function cutTo(curve: PlotElement, samples: Array<JXG.Coords & {_t?: number}>, from: number, to: number): void {
    const board = curve.board;
    const end = (t: number) => {
        const point = new JXG.Coords(JXG.COORDS_BY_USER, [curve.X(t, true), curve.Y(t, true)], board, false) as JXG.Coords & {_t?: number};
        point._t = t;
        return point;
    };
    const cut: Array<JXG.Coords & {_t?: number}> = [];
    const first = samples.findIndex(sample => sample._t! > from);
    const last = samples.length - 1 - [...samples].reverse().findIndex(sample => sample._t! < to);
    cut.push(samples[0]._t === from ? samples[0] : end(from));
    for (let i = Math.max(first, 0); i <= last && i < samples.length; i++) {
        const t = samples[i]._t!;
        if (t > from && t < to) cut.push(samples[i]);
    }
    cut.push(samples[samples.length - 1]._t === to ? samples[samples.length - 1] : end(to));
    curve.points = cut;
    curve.numberPoints = cut.length;
}
