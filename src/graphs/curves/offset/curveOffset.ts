import {
    curvatureAt,
    cuspParameters,
    offsetPoint,
    offsetSpeedFactor,
    polynomialBezierSource,
    Vec2,
} from "../../../bezeg/impl/curve/curvature";

/** Sample count of the offset trace: the slider bounds and the default. */
export const OFFSET_SAMPLES_MIN = 64;
export const OFFSET_SAMPLES_MAX = 512;
export const OFFSET_SAMPLES_DEFAULT = 128;

type Rows = ReadonlyArray<ReadonlyArray<number>>;

/** Flat drawing arrays; a NaN pair separates runs, so JSXGraph breaks the stroke. */
export interface OffsetTrace {
    x: number[];
    y: number[];
}

/** 1 + d*kappa at each sample parameter t; `factor` is NaN at a singular sample. */
export interface SpeedFactorSamples {
    t: number[];
    factor: number[];
}

export interface OffsetCusp {
    t: number;
    point: Vec2;
}

function usable(controlPoints: Rows, d: number, samples: number): boolean {
    return controlPoints.length >= 2 && Number.isFinite(d) && Number.isFinite(samples) && samples >= 1;
}

function parameters(samples: number): number[] {
    const n = Math.floor(samples);
    return n === 1 ? [0] : Array.from({length: n}, (_, i) => i / (n - 1));
}

/**
 * The right-normal offset (the kernel's `offsetPoint`) of the polynomial Bezier curve at `samples` evenly spaced
 * parameters of [0, 1]. A NaN pair marks only a singular sample (r' = 0). The trace does not break at a cusp: the
 * offset is continuous there, only not regular. Empty for fewer than two control points or a non-finite d.
 */
export function offsetTrace(controlPoints: Rows, d: number, samples = OFFSET_SAMPLES_DEFAULT): OffsetTrace {
    const x: number[] = [];
    const y: number[] = [];
    if (!usable(controlPoints, d, samples)) return {x, y};
    const source = polynomialBezierSource(controlPoints);
    let pendingBreak = false;
    for (const t of parameters(samples)) {
        const {point, d1, d2} = source.at(t);
        const c = curvatureAt(d1, d2, source.scale);
        if (c.kind !== 'regular') {
            pendingBreak = x.length > 0;
            continue;
        }
        if (pendingBreak) {
            x.push(NaN);
            y.push(NaN);
            pendingBreak = false;
        }
        const o = offsetPoint(point, c.normal, d);
        x.push(o[0]);
        y.push(o[1]);
    }
    return {x, y};
}

/** t and 1 + d*kappa at each sample, NaN where the curve is singular; for plotting the speed factor. */
export function speedFactorSamples(controlPoints: Rows, d: number, samples = OFFSET_SAMPLES_DEFAULT): SpeedFactorSamples {
    const t: number[] = [];
    const factor: number[] = [];
    if (!usable(controlPoints, d, samples)) return {t, factor};
    const source = polynomialBezierSource(controlPoints);
    for (const ti of parameters(samples)) {
        const {d1, d2} = source.at(ti);
        const c = curvatureAt(d1, d2, source.scale);
        t.push(ti);
        factor.push(c.kind === 'regular' ? offsetSpeedFactor(c.kappa, d) : NaN);
    }
    return {t, factor};
}

/** Cusps of the offset (zeros of 1 + d*kappa, tangential ones included) with their offset points, by increasing t. */
export function offsetCusps(controlPoints: Rows, d: number, samples = OFFSET_SAMPLES_DEFAULT): OffsetCusp[] {
    if (!usable(controlPoints, d, samples)) return [];
    const source = polynomialBezierSource(controlPoints);
    const cusps: OffsetCusp[] = [];
    for (const t of cuspParameters(source, parameters(samples), d)) {
        const {point, d1, d2} = source.at(t);
        const c = curvatureAt(d1, d2, source.scale);
        if (c.kind === 'regular') cusps.push({t, point: offsetPoint(point, c.normal, d)});
    }
    return cusps;
}
