import {CURVE_PAIR_INITIAL_STATE, curvePairRun, curvePairStateAt} from '../../compgeo/curvePairSubdivision';
import {bezierHullsReadout} from './bezierHullsReadout';
import {CURVE_PAIR_CROSSING} from './CurvePairGraph';

const nets = (points: ReadonlyArray<{x: number; y: number}>) => ({a: points.slice(0, points.length / 2), b: points.slice(points.length / 2)});
const crossing = nets(CURVE_PAIR_CROSSING.points);
/** The offset pair of task 24: the nets never come close, so the run ends after depth 1 with nothing left. */
const offset = nets([[0, 0], [4, 8], [8, 0], [0, 9], [4, 1], [8, 9]].map(([x, y]) => ({x, y})));
const crossingRun = curvePairRun(crossing.a, crossing.b);
const offsetRun = curvePairRun(offset.a, offset.b);
const kinds = (state: Parameters<typeof bezierHullsReadout>[0]) => bezierHullsReadout(state).lines.map(line => line.kind);

test('the first step is a verdict at depth 0: 1 of 1 remains and no end line', () => {
    expect(bezierHullsReadout(curvePairStateAt(crossingRun, 0)).lines).toEqual([
        {kind: 'depth', depth: 0, maxDepth: 4}, {kind: 'kept', kept: 1, of: 1}, {kind: 'tests', tested: 1, discarded: 0},
    ]);
});

test('a split step names the candidates only: no kept, no tests, no verdict line', () => {
    const state = curvePairStateAt(crossingRun, 1);
    expect(state.phase).toBe('split');
    expect(bezierHullsReadout(state).lines).toEqual([{kind: 'depth', depth: 1, maxDepth: 4}, {kind: 'candidates', candidates: 4}]);
});

test('a discard step gives kept of 4^depth and the tested and discarded counts (8 of 256 at depth 4 for the crossing pair)', () => {
    // depth 2 still keeps every candidate (8 of 16), depth 3 tests 32 candidates and discards 24
    expect(bezierHullsReadout(curvePairStateAt(crossingRun, 4)).lines).toEqual([
        {kind: 'depth', depth: 2, maxDepth: 4}, {kind: 'kept', kept: 8, of: 16}, {kind: 'tests', tested: 8, discarded: 0},
    ]);
    expect(bezierHullsReadout(curvePairStateAt(crossingRun, 6)).lines).toEqual([
        {kind: 'depth', depth: 3, maxDepth: 4}, {kind: 'kept', kept: 8, of: 64}, {kind: 'tests', tested: 32, discarded: 24},
    ]);
    const last = curvePairStateAt(crossingRun, crossingRun.length - 1);
    expect(bezierHullsReadout(last).lines.slice(0, 2)).toEqual([{kind: 'depth', depth: 4, maxDepth: 4}, {kind: 'kept', kept: 8, of: 256}]);
});

test('the depth 4 end with pairs left says they remain; a discard step before it has no end line', () => {
    expect(kinds(curvePairStateAt(crossingRun, crossingRun.length - 1))).toEqual(['depth', 'kept', 'tests', 'remaining']);
    expect(kinds(curvePairStateAt(crossingRun, crossingRun.length - 3))).toEqual(['depth', 'kept', 'tests']);
});

test('an empty end says the curves do not meet; it never says remaining', () => {
    const last = curvePairStateAt(offsetRun, offsetRun.length - 1);
    expect(last.kept).toEqual([]);
    expect(kinds(last)).toEqual(['depth', 'kept', 'tests', 'empty']);
    expect(bezierHullsReadout(last).lines[1]).toEqual({kind: 'kept', kept: 0, of: 4 ** last.depth});
});

test('a state with no phase has the depth line only', () => {
    expect(bezierHullsReadout(CURVE_PAIR_INITIAL_STATE).lines).toEqual([{kind: 'depth', depth: 0, maxDepth: 4}]);
});
