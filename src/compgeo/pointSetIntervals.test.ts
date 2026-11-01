import {describe, expect, it} from 'vitest';
import {
    addInterval, addPoint, intervalLetter, intervalsOf, movePoint, nudgePoint, parsePointSetModel, PointSetModel, removeInterval,
    removePoint, reverseVertices, setMode,
} from './pointSetModel';

const pts = (...xy: number[][]) => xy.map(([x, y]) => ({x, y}));
const model = (r: ReturnType<typeof addPoint>): PointSetModel => {
    if (!r.ok) throw new Error(r.reason);
    return r.model;
};

describe('intervals mode', () => {
    const empty: PointSetModel = {mode: 'intervals', points: [], closed: false, gridStepExponent: 0};
    const withIntervals = (...ab: number[][]): PointSetModel =>
        ab.reduce((m, [a, b]) => model(addInterval(m, a, b)), empty);
    const rowsHold = (m: PointSetModel) => m.points.every((p, i) => p.y === (i >> 1) + 1);

    it('adds intervals on rows 1, 2, ... and intervalsOf sorts each pair', () => {
        const m = withIntervals([4, -2], [0, 3], [5, 5]);
        expect(m.points).toEqual(pts([4, 1], [-2, 1], [0, 2], [3, 2], [5, 3], [5, 3]));
        expect(intervalsOf(m)).toEqual([{lo: -2, hi: 4}, {lo: 0, hi: 3}, {lo: 5, hi: 5}]);
        expect(intervalsOf({...m, mode: 'segments'})).toEqual([]);
        expect([0, 1, 9].map(intervalLetter)).toEqual(['a', 'b', 'j']);
    });

    it('removing an interval moves the later intervals up one row', () => {
        const m = withIntervals([0, 1], [2, 3], [4, 5]);
        expect(model(removeInterval(m, 0)).points).toEqual(pts([2, 1], [3, 1], [4, 2], [5, 2]));
        expect(model(removePoint(m, 3)).points).toEqual(pts([0, 1], [1, 1], [4, 2], [5, 2]));
        expect(removeInterval(m, 3)).toEqual({ok: false, reason: 'index'});
        expect(removeInterval(m, -1)).toEqual({ok: false, reason: 'index'});
    });

    it('keeps the row invariant after move, nudge, remove and setMode', () => {
        let m = withIntervals([0, 1], [2, 3], [4, 5]);
        m = model(movePoint(m, 3, {x: 9, y: 77}));
        expect(m.points[3]).toEqual({x: 9, y: 2});
        m = model(nudgePoint(m, 4, 2, 5));
        expect(m.points[4]).toEqual({x: 6, y: 3});
        expect(rowsHold(m)).toBe(true);
        expect(model(nudgePoint(m, 4, 0, 1)).points).toEqual(m.points);
        const converted = setMode({mode: 'points', closed: false, gridStepExponent: 0, points: pts([1, 7], [2, 8], [3, 9])}, 'intervals');
        expect(converted.points).toEqual(pts([1, 1], [2, 1]));
        expect(setMode(converted, 'points').points).toEqual(converted.points);
        expect(reverseVertices(m)).toBe(m);
    });

    it('refuses with the existing reasons and never clips', () => {
        const opts = {coordinateLimit: 1024};
        expect(addInterval(empty, 0, 1025, opts)).toEqual({ok: false, reason: 'range'});
        expect(addInterval(empty, -1025, 0, opts)).toEqual({ok: false, reason: 'range'});
        expect(addInterval(empty, 0, 1024, opts).ok).toBe(true);
        let m = empty;
        for (let i = 0; i < 10; i++) m = model(addInterval(m, i, i + 1, opts));
        expect(addInterval(m, 0, 1, opts)).toEqual({ok: false, reason: 'limit'});
        expect(addInterval(m, 0, 1, {intervalLimit: 11}).ok).toBe(true);
        expect(movePoint(m, 0, {x: 1025, y: 1}, opts)).toEqual({ok: false, reason: 'range'});
        expect(nudgePoint(withIntervals([1024, 1024]), 0, 1, 0, opts)).toEqual({ok: false, reason: 'range'});
        expect(movePoint(m, 20, {x: 0, y: 0}, opts)).toEqual({ok: false, reason: 'index'});
        expect(addInterval({...empty, mode: 'polygon'}, 0, 1)).toEqual({ok: false, reason: 'mode'});
        expect(removeInterval({...empty, mode: 'polygon'}, 0)).toEqual({ok: false, reason: 'mode'});
        expect(addPoint(empty, {x: 0, y: 0})).toEqual({ok: false, reason: 'mode'});
    });

    it('parse accepts only with allowIntervals, refuses odd counts, wrong rows, too many and out of range', () => {
        const good = {mode: 'intervals', points: pts([0, 1], [3, 1], [1, 2], [2, 2])};
        expect(parsePointSetModel(good)).toEqual({ok: false, reason: 'unknown-mode'});
        expect(parsePointSetModel(good, {allowSegments: true})).toEqual({ok: false, reason: 'unknown-mode'});
        expect(parsePointSetModel(good, {allowIntervals: true})).toEqual({
            ok: true, model: {mode: 'intervals', points: pts([0, 1], [3, 1], [1, 2], [2, 2]), closed: false, gridStepExponent: 0},
        });
        const opts = {allowIntervals: true};
        expect(parsePointSetModel({mode: 'intervals', points: pts([0, 1])}, opts)).toEqual({ok: false, reason: 'odd-interval-endpoints'});
        expect(parsePointSetModel({mode: 'intervals', points: pts([0, 1], [3, 2])}, opts)).toEqual({ok: false, reason: 'interval-row-mismatch'});
        expect(parsePointSetModel({mode: 'intervals', points: pts([0, 0], [3, 0])}, opts)).toEqual({ok: false, reason: 'interval-row-mismatch'});
        const eleven = Array.from({length: 22}, (_, i) => ({x: i, y: (i >> 1) + 1}));
        expect(parsePointSetModel({mode: 'intervals', points: eleven}, opts)).toEqual({ok: false, reason: 'too-many-points', limit: 20});
        expect(parsePointSetModel({mode: 'intervals', points: pts([2000, 1], [3, 1])}, {...opts, coordinateLimit: 1024}))
            .toEqual({ok: false, reason: 'coordinate-out-of-range', bound: 1024});
    });
});
