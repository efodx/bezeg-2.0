import {
    bandClipInterval, bezierFatLine, CLIP_MARGIN_FACTOR, ClipPairView, ClipPoint, ClipRange, ClipState, clipFold, clipScale, ClipTarget,
    ClipTrace, DistancePoint, distanceControlPoints, FatLine, INITIAL_CLIP_STATE, subNet,
} from "../../bezeg/impl/kernels/bezier-clipping";
import {clampTraceIndex, stateAt} from "../../compgeo/trace";

/**
 * What the Bezier clipping graph shows for one step of a run (advanced Bezier D2, AB-B-2a1): pure, no JSXGraph or React, so the
 * board overlays and the inspector's distance inset read the same numbers. All geometry is in the units of the nets passed in.
 */
export interface ClippingStepView {
    /** The pair of the kernel that is clipped (or about to be). */
    pair: number;
    /** The curve that is clipped, and the curve whose fat line clips it. */
    target: ClipTarget;
    source: ClipTarget;
    /** True when the step performs no clip (start, split, output, limit): the view previews the clip that comes next. */
    preview: boolean;
    /** The global range of the target before the clip, and the global range of the source that gives the fat line. */
    targetRange: ClipRange;
    sourceRange: ClipRange;
    /** The fat line of the source's sub-net (cut from the original net), with the kernel's margin rule. */
    fatLine: FatLine;
    /** The band the hull must meet: the fat line widened by the kernel's discard margin on both sides. */
    band: ClipRange;
    /** The control points of the signed distance of the target's sub-net BEFORE the clip. */
    distance: DistancePoint[];
    /** The source's sub-net (the points the fat line is the band of). */
    sourceNet: ClipPoint[];
    /** The kept range in the target's local parameter [0, 1]; null when the clip discards everything, or on a preview. */
    clippedLocal: ClipRange | null;
    /** The same range in the target's global parameter (what the event's payload holds after the clip); null as above. */
    clippedGlobal: ClipRange | null;
}

/**
 * The view of step `step` of `trace` (clamped), or null when the step shows no clip: the run is empty, or nothing is alive.
 * Payload ranges are the ranges AFTER the event, so a `clip` or `discard` event takes the pre-clip ranges of its pair from the
 * fold of the previous step. Any other step previews the clip of the pair processed next (the kernel works depth first).
 */
export function clippingStepView(trace: ClipTrace, step: number, tolerance: number, netA: readonly ClipPoint[], netB: readonly ClipPoint[]): ClippingStepView | null {
    if (trace.length === 0) return null;
    const index = clampTraceIndex(trace, step);
    const fold = clipFold(tolerance);
    const event = trace[index];
    const acting = event.kind === "clip" || event.kind === "discard";
    let pair: ClipPairView | undefined;
    if (acting) {
        pair = stateAt(trace, index - 1, fold, INITIAL_CLIP_STATE).active.find(v => v.pair === event.payload.pair);
    } else {
        const next = trace[index + 1];
        if (!next || (next.kind !== "clip" && next.kind !== "discard")) return null;
        pair = stateAt(trace, index, fold, INITIAL_CLIP_STATE).active.find(v => v.pair === next.payload.pair);
    }
    if (!pair) return null;
    const target = acting ? event.payload.target : pair.target;
    const clipA = target === "A";
    const targetRange = clipA ? pair.aRange : pair.bRange;
    const sourceRange = clipA ? pair.bRange : pair.aRange;
    const margin = CLIP_MARGIN_FACTOR * clipScale(netA, netB);
    const sourceNet = subNet(clipA ? netB : netA, sourceRange[0], sourceRange[1]);
    const fatLine = bezierFatLine(sourceNet, margin);
    const distance = distanceControlPoints(subNet(clipA ? netA : netB, targetRange[0], targetRange[1]), fatLine);
    const band: ClipRange = [fatLine.dmin - margin, fatLine.dmax + margin];
    const clippedLocal = acting ? bandClipInterval(distance, band[0], band[1]) : null;
    const width = targetRange[1] - targetRange[0];
    const clippedGlobal: ClipRange | null = clippedLocal && [
        Math.max(targetRange[0], targetRange[0] + width * clippedLocal[0]),
        Math.min(targetRange[1], targetRange[0] + width * clippedLocal[1]),
    ];
    return {pair: pair.pair, target, source: clipA ? "B" : "A", preview: !acting, targetRange, sourceRange, fatLine, band, distance, sourceNet,
        clippedLocal, clippedGlobal};
}

/** Sorts and merges ranges that overlap or touch exactly. */
function mergeRanges(ranges: readonly ClipRange[]): ClipRange[] {
    const merged: [number, number][] = [];
    for (const [lo, hi] of [...ranges].sort((p, q) => p[0] - q[0])) {
        const last = merged[merged.length - 1];
        if (last && lo <= last[1]) last[1] = Math.max(last[1], hi);
        else merged.push([lo, hi]);
    }
    return merged;
}

/** The parameter ranges of `curve` that are still alive in `state`: active pairs, results and unresolved pairs, merged. */
export function aliveRanges(state: ClipState, curve: ClipTarget): ClipRange[] {
    const range = (view: {aRange: ClipRange; bRange: ClipRange}) => curve === "A" ? view.aRange : view.bRange;
    return mergeRanges([...state.active, ...state.results, ...state.unresolved].map(range));
}

/** The complement of the alive ranges in [0, 1]: what the run has discarded. Together they tile [0, 1]. */
export function discardedRanges(state: ClipState, curve: ClipTarget): ClipRange[] {
    const out: ClipRange[] = [];
    let at = 0;
    for (const [lo, hi] of aliveRanges(state, curve)) {
        if (lo > at) out.push([at, lo]);
        at = Math.max(at, hi);
    }
    if (at < 1) out.push([at, 1]);
    return out;
}

/**
 * The four corners of the fat line drawn as a strip: between the lines at the band offsets, parallel to the chord, and along the
 * chord direction from the extent of `points` (the source's sub-net) extended by a quarter of that extent on both sides.
 */
export function fatLineStrip(line: FatLine, points: readonly ClipPoint[]): ClipPoint[] {
    const along: ClipPoint = [line.normal[1], -line.normal[0]];
    const s = points.map(p => along[0] * (p[0] - line.origin[0]) + along[1] * (p[1] - line.origin[1]));
    const extent = Math.max(...s) - Math.min(...s);
    const pad = extent > 0 ? extent / 4 : 1;
    const [s0, s1] = [Math.min(...s) - pad, Math.max(...s) + pad];
    const corner = (position: number, offset: number): ClipPoint =>
        [line.origin[0] + along[0] * position + line.normal[0] * offset, line.origin[1] + along[1] * position + line.normal[1] * offset];
    return [corner(s0, line.dmin), corner(s1, line.dmin), corner(s1, line.dmax), corner(s0, line.dmax)];
}
