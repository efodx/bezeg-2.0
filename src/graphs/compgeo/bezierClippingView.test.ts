import {clipBezierPair, clipFold, ClipPoint, ClipRange, ClipTrace, INITIAL_CLIP_STATE} from '../../bezeg/impl/kernels/bezier-clipping';
import {stateAt} from '../../compgeo/trace';
import {aliveRanges, clippingStepView, discardedRanges, fatLineStrip} from './bezierClippingView';

const A: ClipPoint[] = [[0, 0], [2, 4], [4, 0]];
const B: ClipPoint[] = [[0, 3], [2, -1], [4, 3]];
const TANGENT: ClipPoint[] = [[0, 4], [2, 0], [4, 4]];
const OFFSET: ClipPoint[] = [[0, 4.5], [2, 0.5], [4, 4.5]];
const TOL = 1e-6;

const runOf = (b: ClipPoint[], tolerance = TOL) => clipBezierPair(A, b, {tolerance}).trace;
const range = (r: ClipRange | null | undefined, lo: number, hi: number, digits = 9) => {
    expect(r).toBeTruthy();
    expect(r![0]).toBeCloseTo(lo, digits);
    expect(r![1]).toBeCloseTo(hi, digits);
};

test('crossing pair, first clip: the fat line of B, the band, the distances of A and the clipped range, from first principles', () => {
    const trace = runOf(B);
    expect(trace[1].kind).toBe('clip');
    const view = clippingStepView(trace, 1, TOL, A, B)!;
    // B has chord (4, 0) from (0, 3): normal (0, 1); the signed distances of B's points are y - 3 = 0, -4, 0.
    expect([view.pair, view.target, view.source, view.preview]).toEqual([0, 'A', 'B', false]);
    expect(view.fatLine.origin).toEqual([0, 3]);
    expect(view.fatLine.normal[0]).toBeCloseTo(0, 12);
    expect(view.fatLine.normal[1]).toBeCloseTo(1, 12);
    expect([view.fatLine.dmin, view.fatLine.dmax]).toEqual([-4, 0]);
    expect(view.band[0]).toBeCloseTo(-4, 10);
    expect(view.band[1]).toBeCloseTo(0, 10);
    // A's distances are y - 3 = -3, 1, -3 at t = 0, 1/2, 1; the hull meets -4 <= d <= 0 at both ends, so nothing is cut.
    expect(view.distance.map(p => p.t)).toEqual([0, 0.5, 1]);
    expect(view.distance.map(p => p.d)).toEqual([-3, 1, -3]);
    range(view.clippedLocal, 0, 1, 12);
    range(view.clippedGlobal, 0, 1, 12);
});

test('crossing pair, clip of B against the left half of A: the band 0 to 1/sqrt 2 cuts B to [1/6, 3/4]', () => {
    const trace = runOf(B);
    expect([trace[2].kind, trace[3].kind, trace[3].payload.pair, trace[3].payload.target]).toEqual(['split', 'clip', 1, 'B']);
    const view = clippingStepView(trace, 3, TOL, A, B)!;
    // A on [0, 1/2] has the net (0,0), (1,2), (2,2): chord (2, 2), normal (-1, 1)/sqrt 2, distances 0, 1/sqrt 2, 0.
    const r = Math.SQRT1_2;
    expect([view.target, view.source]).toEqual(['B', 'A']);
    range(view.sourceRange, 0, 0.5, 12);
    expect(view.fatLine.normal[0]).toBeCloseTo(-r, 12);
    expect(view.fatLine.normal[1]).toBeCloseTo(r, 12);
    expect(view.fatLine.dmin).toBeCloseTo(0, 12);
    expect(view.fatLine.dmax).toBeCloseTo(r, 12);
    // B's distances to that chord: (3, -3, -1)/sqrt 2 at t = 0, 1/2, 1. The hull edges meet d = 1/sqrt 2 at t = 1/6 and 1/2,
    // and d = 0 at t = 1/4 and 3/4, so the hull meets the band for t from 1/6 to 3/4.
    [3, -3, -1].forEach((v, i) => expect(view.distance[i].d * Math.SQRT2).toBeCloseTo(v, 12));
    range(view.clippedLocal, 1 / 6, 3 / 4, 10);
    range(view.clippedGlobal, 1 / 6, 3 / 4, 10);
    range(trace[3].payload.bRange, 1 / 6, 3 / 4, 10);
});

test('previews: start, split and output show the clip that comes next; the done step shows none', () => {
    const trace = runOf(B);
    const start = clippingStepView(trace, 0, TOL, A, B)!;
    expect([start.preview, start.pair, start.target, start.clippedLocal, start.clippedGlobal]).toEqual([true, 0, 'A', null, null]);
    expect(start.fatLine.dmin).toBe(-4);
    // After the split (event 2) the first child, pair 1, clips B next; its fat line is the one of event 3.
    const split = clippingStepView(trace, 2, TOL, A, B)!;
    const clip = clippingStepView(trace, 3, TOL, A, B)!;
    expect([split.preview, split.pair, split.target]).toEqual([true, 1, 'B']);
    expect(split.fatLine).toEqual(clip.fatLine);
    expect(split.distance).toEqual(clip.distance);
    expect(split.clippedLocal).toBeNull();
    expect(clippingStepView(trace, trace.length - 1, TOL, A, B)).toBeNull();
    // A step beyond the run clamps to the last one.
    expect(clippingStepView(trace, trace.length + 10, TOL, A, B)).toBeNull();
    expect(clippingStepView([], 0, TOL, A, B)).toBeNull();
});

test('offset pair: the discard step has no clipped range and takes its ranges from the live pair', () => {
    const trace = runOf(OFFSET);
    const index = trace.findIndex(e => e.kind === 'discard');
    expect(index).toBeGreaterThan(0);
    const view = clippingStepView(trace, index, TOL, A, OFFSET)!;
    expect([view.preview, view.clippedLocal, view.clippedGlobal]).toEqual([false, null, null]);
    const before = stateAt(trace, index - 1, clipFold(TOL), INITIAL_CLIP_STATE).active.find(v => v.pair === trace[index].payload.pair)!;
    expect(view.targetRange).toEqual(view.target === 'A' ? before.aRange : before.bRange);
    expect(view.sourceRange).toEqual(view.target === 'A' ? before.bRange : before.aRange);
});

const tile = (alive: ClipRange[], discarded: ClipRange[]) => {
    const all = [...alive, ...discarded].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    let at = 0;
    for (const [lo, hi] of all) {
        expect(lo).toBeLessThanOrEqual(hi);
        expect(lo).toBeCloseTo(at, 12);
        at = hi;
    }
    expect(at).toBeCloseTo(1, 12);
    // alive ranges are disjoint, as are discarded ones
    for (const list of [alive, discarded]) list.forEach((r, i) => { if (i > 0) expect(r[0]).toBeGreaterThan(list[i - 1][1]); });
};

describe.each([['crossing', B], ['tangent', TANGENT], ['offset', OFFSET]] as const)('%s run, every step', (_name, other) => {
    const trace: ClipTrace = runOf([...other]);
    const fold = clipFold(TOL);

    test('alive and discarded ranges tile [0, 1] on both curves', () => {
        for (let step = 0; step < trace.length; step++) {
            const state = stateAt(trace, step, fold, INITIAL_CLIP_STATE);
            for (const curve of ['A', 'B'] as const) tile(aliveRanges(state, curve), discardedRanges(state, curve));
        }
    });

    test('the clipped local range mapped back is the payload range after the clip; a discard clips nothing', () => {
        let clips = 0;
        for (let step = 0; step < trace.length; step++) {
            const event = trace[step];
            const view = clippingStepView(trace, step, TOL, A, [...other]);
            if (event.kind === 'clip') {
                clips++;
                expect(view?.clippedGlobal).toBeTruthy();
                const after = event.payload.target === 'A' ? event.payload.aRange : event.payload.bRange;
                expect(view!.clippedGlobal![0]).toBeCloseTo(after[0], 12);
                expect(view!.clippedGlobal![1]).toBeCloseTo(after[1], 12);
                expect(view!.target).toBe(event.payload.target);
            } else if (event.kind === 'discard') {
                expect(view?.clippedLocal).toBeNull();
            } else if (view) {
                expect(view.preview).toBe(true);
            }
        }
        if (_name !== 'offset') expect(clips).toBeGreaterThan(0);
    });
});

test('the tangent run needs several times the clips of the crossing run (fixture for the view tests)', () => {
    const clips = (trace: ClipTrace) => trace.filter(e => e.kind === 'clip' || e.kind === 'discard').length;
    expect(clips(runOf(TANGENT))).toBeGreaterThanOrEqual(3 * clips(runOf(B)));
});

test('the fat line strip is bounded by the band offsets and extends the source net along the chord by a quarter on each side', () => {
    const line = {origin: [0, 3] as const, normal: [0, 1] as const, dmin: -4, dmax: 0};
    // the source net spans x from 0 to 4 along the chord direction (1, 0): the strip runs from x = -1 to x = 5
    const corners = fatLineStrip(line, B);
    expect(corners.map(c => c.map(v => Math.round(v * 1e9) / 1e9 + 0))).toEqual([[-1, -1], [5, -1], [5, 3], [-1, 3]]);
    // a net of one point repeated has no extent: a unit pad on each side
    const dot = fatLineStrip({origin: [0, 0], normal: [0, 1], dmin: 0, dmax: 0}, [[0, 0], [0, 0]]);
    expect(dot.map(c => c[0])).toEqual([-1, 1, 1, -1]);
});
