import {clipBezierPair, clipFold, ClipPairView, ClipPoint, ClipState, INITIAL_CLIP_STATE} from '../../bezeg/impl/kernels/bezier-clipping';
import {stateAt} from '../../compgeo/trace';
import {hullsSeparated} from '../../compgeo/hullSeparation';
import {bezierClippingReadout, CLIP_TABLE_MAX_ROWS, clipStatus, clipTable, widestAliveWidth} from './bezierClippingReadout';

const A: ClipPoint[] = [[0, 0], [2, 4], [4, 0]];
const B: ClipPoint[] = [[0, 3], [2, -1], [4, 3]];
const TANGENT: ClipPoint[] = [[0, 4], [2, 0], [4, 4]];
const OFFSET: ClipPoint[] = [[0, 4.5], [2, 0.5], [4, 4.5]];
const FAR: ClipPoint[] = [[0, 10], [2, 14], [4, 10]];

const point = ([x, y]: ClipPoint) => ({x, y});
const apart = (b: ClipPoint[]) => hullsSeparated(A.map(point), b.map(point)).separated;
/** The final state of a run, folded from its trace. */
function finalState(b: ClipPoint[], tolerance: number): ClipState {
    const {trace} = clipBezierPair(A, b, {tolerance});
    return stateAt(trace, trace.length - 1, clipFold(tolerance), INITIAL_CLIP_STATE);
}
const view = (pair: number, aRange: [number, number], bRange: [number, number]): ClipPairView => ({pair, depth: 0, target: 'A', aRange, bRange});

test('before the first clip the status is the hull test: overlapping offset pair at step 0, separated for a genuinely apart pair', () => {
    expect(apart(OFFSET)).toBe(false);
    expect(apart(FAR)).toBe(true);
    expect(clipStatus(INITIAL_CLIP_STATE, apart(OFFSET))).toBe('overlapping');
    expect(clipStatus(INITIAL_CLIP_STATE, apart(FAR))).toBe('separated');
    const {trace} = clipBezierPair(A, OFFSET, {tolerance: 1e-6});
    expect(clipStatus(stateAt(trace, 0, clipFold(1e-6), INITIAL_CLIP_STATE), false)).toBe('overlapping');
});

test('after the first clip the kernel status shows, whatever the hulls say', () => {
    const running = {...INITIAL_CLIP_STATE, clipCount: 1};
    expect(clipStatus(running, false)).toBe('running');
    expect(clipStatus(running, true)).toBe('running');
    const crossing = finalState(B, 1e-6);
    expect([crossing.status, crossing.results.length]).toEqual(['found', 2]);
    expect(clipStatus(crossing, false)).toBe('found');
    const offset = finalState(OFFSET, 1e-6);
    expect(clipStatus(offset, false)).toBe('empty');
    expect(clipStatus(offset, true)).toBe('empty');
});

test('limit: the tangent pair at 10^-10 reaches the cap, or a constructed limit state reads limit', () => {
    const tangent = finalState(TANGENT, 1e-10);
    const state: ClipState = tangent.status === 'limit' ? tangent : {...INITIAL_CLIP_STATE, clipCount: 200, status: 'limit', unresolved: [view(1, [0.4, 0.6], [0.4, 0.6])]};
    expect(clipStatus(state, false)).toBe('limit');
    expect(clipStatus(state, true)).toBe('limit');
});

test('the widest alive width is the widest range of the active and unresolved pairs over both curves; none alive has none', () => {
    const state: ClipState = {
        ...INITIAL_CLIP_STATE, clipCount: 5,
        active: [view(1, [0, 0.5], [0.25, 0.3])],
        unresolved: [view(2, [0.5, 0.625], [0.1, 0.7])],
        results: [{aRange: [0, 1], bRange: [0, 1]}],
    };
    // Widths 0.5, 0.05 | 0.125, 0.6: the result is not alive, so its width 1 does not count.
    expect(widestAliveWidth(state)).toBeCloseTo(0.6, 12);
    expect(widestAliveWidth({...state, unresolved: []})).toBeCloseTo(0.5, 12);
    expect(widestAliveWidth(finalState(B, 1e-6))).toBeNull();
    expect(bezierClippingReadout(state, false)).toMatchObject({status: 'running', clipCount: 5});
    expect(bezierClippingReadout(finalState(B, 1e-6), false).widest).toBeNull();
});

test('the crossing result lists the two roots at 0.25 and 0.75, results first', () => {
    const {rows, further} = clipTable(finalState(B, 1e-6));
    expect([rows.length, further]).toEqual([2, 0]);
    expect(rows.map(r => r.kind)).toEqual(['result', 'result']);
    expect(rows.map(r => (r.aRange[0] + r.aRange[1]) / 2).map(v => Math.round(v * 1000) / 1000)).toEqual([0.25, 0.75]);
});

test('the table shows at most eight rows, results first, and counts the rest', () => {
    const live = (n: number, offset = 0) => Array.from({length: n}, (_, i) => view(offset + i, [i / 20, i / 20 + 0.01], [0, 0.01]));
    const state: ClipState = {...INITIAL_CLIP_STATE, results: [{aRange: [0.25, 0.25], bRange: [0.75, 0.75]}], active: live(7, 1), unresolved: live(5, 10)};
    const {rows, further} = clipTable(state);
    expect(CLIP_TABLE_MAX_ROWS).toBe(8);
    expect(rows).toHaveLength(8);
    expect(further).toBe(13 - 8);
    expect(rows[0].kind).toBe('result');
    expect(rows.slice(1).every(r => r.kind === 'active')).toBe(true);
    // Exactly eight entries show no "further" row; nine show one.
    expect(clipTable({...INITIAL_CLIP_STATE, active: live(8)})).toMatchObject({further: 0});
    expect(clipTable({...INITIAL_CLIP_STATE, active: live(9)}).further).toBe(1);
    expect(clipTable({...INITIAL_CLIP_STATE, active: live(9)}).rows).toHaveLength(8);
});
