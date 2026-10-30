import {describe, expect, it} from 'vitest';
import {orderBackToFront} from './jsxDepthOrder';

describe('orderBackToFront', () => {
    it('orders a known configuration farthest first with ties by ascending index', () => {
        const depths = [5, 9, 1, 9, 5, -3, 9.5];
        expect(Array.from(orderBackToFront(depths))).toEqual([6, 1, 3, 0, 4, 2, 5]);
    });

    it('handles empty, single and all-equal inputs', () => {
        expect(Array.from(orderBackToFront([]))).toEqual([]);
        expect(Array.from(orderBackToFront([3]))).toEqual([0]);
        expect(Array.from(orderBackToFront([2, 2, 2]))).toEqual([0, 1, 2]);
    });

    it('stays correct above the 65535-drawable packed-key limit', () => {
        const n = 70000;
        const depths = Array.from({length: n}, (_, i) => (i * 7919) % 1000);
        const order = orderBackToFront(depths);
        expect(order).toHaveLength(n);
        expect(new Set(order).size).toBe(n);
        let ordered = true;
        for (let k = 1; k < n; k++) {
            const a = order[k - 1], b = order[k];
            if (!(depths[a] > depths[b] || (depths[a] === depths[b] && a < b))) ordered = false;
        }
        expect(ordered).toBe(true);
    });

    it('matches a comparator sort on random depths below the limit', () => {
        let seed = 12345;
        const rnd = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        const depths = Array.from({length: 5000}, () => rnd() * 40 - 20);
        const expected = depths.map((_, i) => i).sort((a, b) => depths[b] - depths[a] || a - b);
        expect(Array.from(orderBackToFront(depths))).toEqual(expected);
    });
});
