import {
    COMB_MAX_COUNT,
    COMB_MIN_COUNT,
    combAtJoin,
    DerivativeSource,
    polynomialBezierSource,
    sampleComb,
    Vec2,
} from "../../../bezeg/impl/curve/curvature";

/** Bounds of the comb gain: the slider, the lesson action and the Preset check share them. */
export const COMB_GAIN_MIN = 0.1;
export const COMB_GAIN_MAX = 6;

/** Half length of the cross-bar that marks a clipped tooth, as a fraction of the span's length scale. */
export const CLIP_MARK_HALF_LENGTH = 0.04;

/** Control rows of every Bezier span, in order; a single Bezier curve is one span. */
export type SpanRows = ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;

/** The curvatures either side of one interior join (the end of span `index` and the start of span `index + 1`). */
export interface CombJoin {
    /** Zero based; join `index` lies between span `index` and span `index + 1`. */
    index: number;
    point: Vec2;
    kappaLeft: number | undefined;
    kappaRight: number | undefined;
    /** kappaRight - kappaLeft; undefined when a side is singular. Never negative zero. */
    jump: number | undefined;
}

/**
 * Flat drawing arrays for the three comb curves. Each curve lists one run per tooth (base, tip) or per span, with a NaN
 * separator, so JSXGraph breaks the stroke there.
 */
export interface CombGeometry {
    teethX: number[];
    teethY: number[];
    /** The line through the tooth tips; broken at every span end and wherever a singular sample was omitted. */
    tipX: number[];
    tipY: number[];
    /** One short cross-bar (two end points and a NaN) at the tip of every clipped tooth. */
    clippedX: number[];
    clippedY: number[];
    joins: CombJoin[];
    toothCount: number;
    clippedCount: number;
}

const clampCount = (value: number) => Math.min(COMB_MAX_COUNT, Math.max(COMB_MIN_COUNT, Math.round(value)));

/** The number of teeth per span: the requested count is shared across the spans (ADR 0041). */
export function teethPerSpan(count: number, spans: number): number {
    return clampCount((Number.isFinite(count) ? count : COMB_MIN_COUNT) / Math.max(1, spans));
}

const noNegativeZero = (value: number | undefined) => value === 0 ? 0 : value;

/**
 * The comb of a curve made of Bezier spans. Every curvature quantity comes from the curvature kernel (`sampleComb`,
 * `combAtJoin`); this function only lays the results out as drawing arrays. kappa does not depend on the parameter, so each
 * span is evaluated on its own [0, 1]. Teeth are sampled per span, so none straddles a knot: both end teeth of a join are
 * drawn and a jump shows as two teeth at one base.
 */
export function computeComb(spans: SpanRows, count: number, gain: number): CombGeometry {
    const geometry: CombGeometry = {teethX: [], teethY: [], tipX: [], tipY: [], clippedX: [], clippedY: [], joins: [], toothCount: 0, clippedCount: 0};
    const sources: Array<DerivativeSource | undefined> = spans.map(rows => rows.length >= 2 ? polynomialBezierSource(rows) : undefined);
    // One visible maximum for the whole curve, so a short span is not clipped earlier than its neighbours.
    const maxLength = sources.reduce((largest, source) => Math.max(largest, source?.scale ?? 0), 0);
    const perSpan = teethPerSpan(count, spans.length);
    const step = 1 / (perSpan - 1);

    sources.forEach(source => {
        if (!source) return;
        let previousT = -Infinity;
        sampleComb(source, 0, 1, perSpan, gain, maxLength).forEach(tooth => {
            // A gap wider than one sample step means singular samples were omitted: break the tip line there.
            if (tooth.t - previousT > 1.5 * step && geometry.tipX.length > 0 && !Number.isNaN(geometry.tipX[geometry.tipX.length - 1])) {
                geometry.tipX.push(NaN);
                geometry.tipY.push(NaN);
            }
            previousT = tooth.t;
            geometry.teethX.push(tooth.base[0], tooth.tip[0], NaN);
            geometry.teethY.push(tooth.base[1], tooth.tip[1], NaN);
            geometry.tipX.push(tooth.tip[0]);
            geometry.tipY.push(tooth.tip[1]);
            geometry.toothCount++;
            if (tooth.clipped) {
                const dx = tooth.tip[0] - tooth.base[0], dy = tooth.tip[1] - tooth.base[1];
                const length = Math.hypot(dx, dy) || 1;
                const h = CLIP_MARK_HALF_LENGTH * source.scale / length;
                geometry.clippedX.push(tooth.tip[0] + dy * h, tooth.tip[0] - dy * h, NaN);
                geometry.clippedY.push(tooth.tip[1] - dx * h, tooth.tip[1] + dx * h, NaN);
                geometry.clippedCount++;
            }
        });
        // The span end: a gap before it (or none at all) and then the break between spans.
        const last = geometry.tipX.length - 1;
        if (last >= 0 && !Number.isNaN(geometry.tipX[last])) {
            geometry.tipX.push(NaN);
            geometry.tipY.push(NaN);
        }
    });

    sources.slice(0, -1).forEach((left, index) => {
        const right = sources[index + 1];
        if (!left || !right) return;
        const {kappaLeft, kappaRight, jump} = combAtJoin({source: left, t: 1}, {source: right, t: 0});
        geometry.joins.push({
            index, point: left.at(1).point,
            kappaLeft: noNegativeZero(kappaLeft), kappaRight: noNegativeZero(kappaRight), jump: noNegativeZero(jump),
        });
    });
    return geometry;
}

/** The join with the largest |jump|; joins with an undefined jump are not ranked. Undefined when no join has a jump. */
export function largestJoin(joins: readonly CombJoin[]): CombJoin | undefined {
    let best: CombJoin | undefined;
    for (const join of joins) {
        if (join.jump === undefined) continue;
        if (!best || Math.abs(join.jump) > Math.abs(best.jump!)) best = join;
    }
    return best;
}
