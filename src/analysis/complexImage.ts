import type {Complex} from './complex';

/**
 * Adaptive polyline sampler for the image of a parametrised curve under a complex map.
 *
 * HEURISTIC: the sampler can miss features narrower than the minimum-depth spacing
 * (`(t1 - t0) / 2^MIN_DEPTH`): a spike, loop or pole excursion that lies entirely between two
 * minimum-depth samples and is symmetric about their midpoint is invisible to the midpoint-to-chord
 * test. It is a drawing aid, not a proof that the polyline follows the curve everywhere.
 */

/** Visible rectangle in board units. */
export interface ImageView {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
}

/** A point of the polyline in board coordinates (re = x, im = y). */
export type ImagePoint = Complex;

/** Maps a real parameter to a board point, or undefined where the map is undefined (e.g. at a pole). */
export type ImageFunction = (t: number) => Complex | undefined;

/** Every parameter interval is split at least this many times: 2^MIN_DEPTH uniform intervals. */
export const MIN_DEPTH = 6;
/** No interval is split more than this many times, which bounds the work at 2^MAX_DEPTH intervals. */
export const MAX_DEPTH = 14;
/**
 * Points outside the view enlarged by this fraction of the view size on every side are treated as
 * out-of-view excursions: they are not kept and they end the current run. The margin keeps the
 * cut-off outside the visible area.
 */
export const VIEW_MARGIN_FRACTION = 0.5;

interface Sample {
    /** The point when finite, otherwise undefined. */
    p: Complex | undefined;
    /** True when the point is finite and inside the margin box. */
    keep: boolean;
}

const isFinitePoint = (p: Complex | undefined): p is Complex =>
    p !== undefined && Number.isFinite(p.re) && Number.isFinite(p.im);

/** Distance from `m` to the segment `a`-`b`. */
function distanceToSegment(m: Complex, a: Complex, b: Complex): number {
    const dx = b.re - a.re;
    const dy = b.im - a.im;
    const len2 = dx * dx + dy * dy;
    const s = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((m.re - a.re) * dx + (m.im - a.im) * dy) / len2));
    return Math.hypot(m.re - (a.re + s * dx), m.im - (a.im + s * dy));
}

/**
 * Samples `f` on `[t0, t1]` and returns polyline runs in board units.
 *
 * Bisection: the interval is split to MIN_DEPTH, then further while the distance of the parameter
 * midpoint's image to the chord of the end images exceeds `tolerance` (board units), or while
 * validity differs between the ends and the midpoint (so a gap or view boundary is located), up to
 * MAX_DEPTH. Intervals whose three points are all out of view or all undefined are not refined.
 *
 * Runs are split at undefined or non-finite values and at points outside the view margin
 * (see VIEW_MARGIN_FRACTION); consecutive samples of a run are always adjacent in the final
 * parameter subdivision, so no segment crosses a gap. Runs of a single point are dropped.
 * Returns [] for a non-finite or empty parameter range or a non-positive tolerance.
 */
export function sampleImage(
    f: ImageFunction,
    t0: number,
    t1: number,
    tolerance: number,
    view: ImageView,
): Complex[][] {
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || !(t1 > t0) || !(tolerance > 0)) return [];
    const mx = (view.xMax - view.xMin) * VIEW_MARGIN_FRACTION;
    const my = (view.yMax - view.yMin) * VIEW_MARGIN_FRACTION;
    const inBox = (p: Complex) =>
        p.re >= view.xMin - mx && p.re <= view.xMax + mx && p.im >= view.yMin - my && p.im <= view.yMax + my;
    const evaluate = (t: number): Sample => {
        let value: Complex | undefined;
        try {
            value = f(t);
        } catch {
            value = undefined;
        }
        const p = isFinitePoint(value) ? value : undefined;
        return {p, keep: p !== undefined && inBox(p)};
    };

    const out: Sample[] = [];
    const refine = (ta: number, a: Sample, tb: number, b: Sample, depth: number) => {
        if (depth < MAX_DEPTH) {
            const tm = ta + (tb - ta) / 2;
            if (tm > ta && tm < tb) {
                const m = evaluate(tm);
                if (depth < MIN_DEPTH || needsSplit(a, m, b)) {
                    refine(ta, a, tm, m, depth + 1);
                    refine(tm, m, tb, b, depth + 1);
                    return;
                }
            }
        }
        out.push(b);
    };
    const needsSplit = (a: Sample, m: Sample, b: Sample): boolean => {
        const allUndefined = a.p === undefined && m.p === undefined && b.p === undefined;
        const noneKept = !a.keep && !m.keep && !b.keep;
        if (allUndefined || noneKept) return false;
        if (a.p === undefined || m.p === undefined || b.p === undefined) return true;
        if (a.keep !== m.keep || m.keep !== b.keep) return true;
        return distanceToSegment(m.p, a.p, b.p) > tolerance;
    };

    const first = evaluate(t0);
    out.push(first);
    refine(t0, first, t1, evaluate(t1), 0);

    const runs: Complex[][] = [];
    let run: Complex[] = [];
    const flush = () => {
        if (run.length >= 2) runs.push(run);
        run = [];
    };
    for (const s of out) {
        if (s.keep && s.p) run.push(s.p);
        else flush();
    }
    flush();
    return runs;
}
