import {HULL_ALGORITHMS, hullPredicateTotals, parseHullAlgorithm, parseHullStep, runHullTrace} from './hullTraceRun';
import {HULL_TRACE_SAMPLE_1} from './HullTraceGraph';

test('the algorithm and step parsers accept only the saved shapes', () => {
    for (const id of HULL_ALGORITHMS) expect(parseHullAlgorithm(id)).toBe(id);
    for (const bad of ['', 'monotone', undefined, null, 3, {}]) expect(parseHullAlgorithm(bad)).toBeUndefined();
    expect(parseHullStep(4)).toBe(4);
    expect(parseHullStep(-2.5)).toBe(-2.5);
    for (const bad of ['3', NaN, Infinity, undefined, null]) expect(parseHullStep(bad)).toBeUndefined();
});

test('sample 1 totals are 23, 504 and 35, and every run ends in done with the same hull', () => {
    const points = HULL_TRACE_SAMPLE_1.points;
    expect(hullPredicateTotals(points)).toEqual({'monotone-chain': 23, 'slow-edge-test': 504, 'gift-wrapping': 35});
    for (const id of HULL_ALGORITHMS) {
        const run = runHullTrace(id, points);
        expect(run.view(run.length - 1)).toMatchObject({done: true, hull: [5, 2, 1, 3, 4]});
        expect(run.view(0).done).toBe(false);
        expect(run.clamp(1e9)).toBe(run.length - 1);
        expect(run.clamp(-3)).toBe(0);
        expect(run.clamp(NaN)).toBe(0);
        expect(run.event(run.length - 1)?.predicateCount).toBe(run.totalPredicates);
    }
});

test('input a trace refuses gives an empty run instead of a throw', () => {
    const tooMany = Array.from({length: 41}, (_, i) => ({x: i, y: i * i % 7}));
    const run = runHullTrace('monotone-chain', tooMany);
    expect(run.length).toBe(0);
    expect(run.clamp(5)).toBe(0);
    expect(run.event(0)).toBeUndefined();
    expect(run.view(0).hull).toBeNull();
});
