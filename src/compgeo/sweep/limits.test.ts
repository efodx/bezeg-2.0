import {describe, expect, it} from 'vitest';
import {
    checkSweepPoint,
    checkSweepPoints,
    SWEEP_COORD_LIMIT,
    SWEEP_MAX_INTERVALS,
    SWEEP_MAX_POLYGON_VERTICES,
    SWEEP_MAX_SEGMENTS,
    SWEEP_MAX_SITES,
} from './limits';

describe('sweep limits', () => {
    it('states the spec constants', () => {
        expect(SWEEP_COORD_LIMIT).toBe(1024);
        expect([SWEEP_MAX_SEGMENTS, SWEEP_MAX_INTERVALS, SWEEP_MAX_POLYGON_VERTICES, SWEEP_MAX_SITES]).toEqual([12, 10, 20, 12]);
    });

    it('accepts 2^10 and refuses 2^10 + 1 with the out-of-range reason', () => {
        expect(checkSweepPoint({x: 2 ** 10, y: -(2 ** 10)})).toEqual({ok: true});
        expect(checkSweepPoint({x: 2 ** 10 + 1, y: 0})).toEqual({ok: false, reason: 'out-of-range'});
        expect(checkSweepPoint({x: 0, y: -(2 ** 10) - 1})).toEqual({ok: false, reason: 'out-of-range'});
    });

    it('refuses non-grid values and non-points with their own reasons', () => {
        for (const bad of [0.5, NaN, Infinity, 2 ** 60, '3', null, undefined]) {
            expect(checkSweepPoint({x: bad, y: 0})).toEqual({ok: false, reason: 'not-grid'});
        }
        expect(checkSweepPoint(null)).toEqual({ok: false, reason: 'not-a-point'});
        expect(checkSweepPoint(3)).toEqual({ok: false, reason: 'not-a-point'});
    });

    it('reports the index of the first offending point in a list', () => {
        expect(checkSweepPoints([{x: 0, y: 0}, {x: 5, y: 1025}, {x: 0.5, y: 0}])).toEqual({ok: false, reason: 'out-of-range', index: 1});
        expect(checkSweepPoints([{x: 0, y: 0}, {x: 1024, y: 1024}])).toEqual({ok: true});
        expect(checkSweepPoints([])).toEqual({ok: true});
    });
});
