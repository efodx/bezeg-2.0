import {describe, expect, it} from 'vitest';
import {clampTraceIndex, stateAt, type Trace} from './trace';

type K = 'phase' | 'test' | 'done';
const trace: Trace<K, number> = Object.freeze([
    Object.freeze({kind: 'phase' as const, payload: 1, predicateCount: 0, noteKey: 'a'}),
    Object.freeze({kind: 'test' as const, payload: 2, predicateCount: 1, noteKey: 'b'}),
    Object.freeze({kind: 'done' as const, payload: 3, predicateCount: 1, noteKey: 'c'}),
]);
const sum = (s: readonly number[], e: {payload: number}): readonly number[] => Object.freeze([...s, e.payload]);

describe('clampTraceIndex', () => {
    it('clamps to [0, length - 1] and tolerates junk', () => {
        expect(clampTraceIndex(trace, -4)).toBe(0);
        expect(clampTraceIndex(trace, 1)).toBe(1);
        expect(clampTraceIndex(trace, 99)).toBe(2);
        expect(clampTraceIndex(trace, 1.9)).toBe(1);
        expect(clampTraceIndex(trace, Number.NaN)).toBe(0);
        expect(clampTraceIndex(trace, Infinity)).toBe(0);
        expect(clampTraceIndex([], 5)).toBe(0);
    });
});

describe('stateAt', () => {
    const initial: readonly number[] = Object.freeze([]);
    it('folds events 0..i and clamps i', () => {
        expect(stateAt(trace, 0, sum, initial)).toEqual([1]);
        expect(stateAt(trace, 1, sum, initial)).toEqual([1, 2]);
        expect(stateAt(trace, -3, sum, initial)).toEqual([1]);
        expect(stateAt(trace, 50, sum, initial)).toEqual([1, 2, 3]);
    });
    it('is pure: repeatable, does not mutate trace or initial state', () => {
        const before = JSON.stringify(trace);
        const a = stateAt(trace, 2, sum, initial);
        const b = stateAt(trace, 2, sum, initial);
        expect(a).toEqual(b);
        expect(JSON.stringify(trace)).toBe(before);
        expect(initial).toEqual([]);
    });
    it('returns the initial state for an empty trace', () => {
        expect(stateAt([], 0, sum, initial)).toBe(initial);
    });
});
