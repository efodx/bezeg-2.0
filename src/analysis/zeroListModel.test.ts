import {describe, expect, it} from 'vitest';
import {addZero, checkZeroList, moveZero, removeZero, setZeroMultiplicity, snapZero, zeroListDegree, zeroListSpec} from './zeroListModel';

const L = (...e: [number, 1 | 2 | 3][]) => e.map(([z, m]) => ({z, m}));

describe('snapZero', () => {
    it('snaps to one decimal without -0 or float noise, so equal positions compare with ===', () => {
        expect(snapZero(0.30000000000000004)).toBe(0.3);
        expect(Object.is(snapZero(-0.01), 0)).toBe(true);
        expect(snapZero(0.1 + 0.2)).toBe(snapZero(0.3));
        expect(snapZero(1.26)).toBe(1.3);
    });
});

describe('checkZeroList', () => {
    it('accepts a valid list and merges equal zeros adding multiplicities', () => {
        expect(checkZeroList(L([1, 1], [1, 2]))).toEqual({ok: true, zeros: L([1, 3])});
    });
    it('rejects a merge above multiplicity 3', () => {
        expect(checkZeroList(L([1, 2], [1, 2]))).toEqual({ok: false, issue: {kind: 'merge', z: 1, max: 3}});
    });
    it('refuses degree 6 and accepts degree 5 (cap is not off by one)', () => {
        expect(checkZeroList(L([1, 3], [2, 3]), 5)).toEqual({ok: false, issue: {kind: 'degree', max: 5}});
        expect(checkZeroList(L([1, 3], [2, 2]), 5).ok).toBe(true);
    });
    it('rejects off-grid, out-of-range, bad multiplicity and wrong shapes', () => {
        expect(checkZeroList(L([0.25, 1]))).toMatchObject({ok: false, issue: {kind: 'zero-grid'}});
        expect(checkZeroList(L([100, 1]))).toMatchObject({ok: false, issue: {kind: 'zero-range'}});
        expect(checkZeroList([{z: 1, m: 4}])).toMatchObject({ok: false, issue: {kind: 'multiplicity'}});
        expect(checkZeroList([{z: 1, m: 1.5}])).toMatchObject({ok: false, issue: {kind: 'multiplicity'}});
        expect(checkZeroList('x')).toEqual({ok: false, issue: undefined});
        expect(checkZeroList([{z: '1', m: 1}])).toEqual({ok: false, issue: undefined});
        expect(checkZeroList([null])).toEqual({ok: false, issue: undefined});
    });
});

describe('moveZero', () => {
    it('snaps the target and keeps the slot', () => {
        expect(moveZero(L([-2, 1], [1, 2]), 1, 1.26)).toEqual({ok: true, zeros: L([-2, 1], [1.3, 2])});
    });
    it('merges onto another zero: the other keeps its slot, multiplicities add, event reported', () => {
        expect(moveZero(L([-2, 1], [1, 2]), 0, 1.04)).toEqual({ok: true, zeros: L([1, 3]), event: {kind: 'merged', z: 1, m: 3}});
        expect(moveZero(L([-2, 1], [1, 1], [3, 1]), 2, -2)).toMatchObject({ok: true, zeros: L([-2, 2], [1, 1]), event: {kind: 'merged', m: 2}});
    });
    it('refuses a merge above 3 and an out-of-range move; same place is the same list', () => {
        expect(moveZero(L([0, 2], [1, 2]), 0, 1)).toMatchObject({ok: false, issue: {kind: 'merge'}});
        expect(moveZero(L([0, 1]), 0, 50)).toMatchObject({ok: false, issue: {kind: 'zero-range'}});
        const zs = L([0, 1]);
        expect(moveZero(zs, 0, 0.01)).toEqual({ok: true, zeros: zs});
    });
});

describe('multiplicity, add, remove', () => {
    it('applies the degree cap exactly', () => {
        const zs = L([-3, 1], [-1, 2], [2, 2]); // degree 5
        expect(setZeroMultiplicity(zs, 0, 2, 5)).toMatchObject({ok: false, issue: {kind: 'degree', max: 5}});
        expect(setZeroMultiplicity(zs, 1, 1, 5).ok).toBe(true);
        expect(setZeroMultiplicity(zs, 0, 4, 5)).toMatchObject({ok: false, issue: {kind: 'multiplicity'}});
        expect(addZero(zs, 5)).toMatchObject({ok: false, issue: {kind: 'degree'}});
        const added = addZero(L([-3, 1], [-1, 2], [2, 1]), 5);
        expect(added.ok && zeroListDegree(added.zeros)).toBe(5);
        expect(added.ok && added.zeros[3]).toEqual({z: 0, m: 1});
    });
    it('removes and builds a sorted spec', () => {
        expect(removeZero(L([3, 1], [-1, 2]), 0)).toEqual({ok: true, zeros: L([-1, 2])});
        expect(zeroListSpec(2, L([3, 1], [-1, 2])).zeros.map(e => e.z)).toEqual([-1, 3]);
    });
});
