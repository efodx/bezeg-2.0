import {describe, expect, test} from 'vitest';
import {reductionOf} from './ReductionOverlay';

// Expected values were produced by the pre-extraction code path (the same kernel calls inline in ReductionOverlay.result()).
const SYMMETRIC = [[0, 0], [1, 3], [3, 3], [4, 0]];
const SKEWED = [[0, 0], [2, 5], [5, -1], [6, 2]];

const CASES = [
    {name: 'symmetric fixed', rows: SYMMETRIC, mode: 'fixed' as const, quadratic: [[0, 0], [2, 4.5], [4, 0]], maxError: 0.09622499175000021, l2: 0.06900655593423544, bound: 0.3333333333333337},
    {name: 'symmetric free', rows: SYMMETRIC, mode: 'free' as const, quadratic: [[-0.1, 0], [2, 4.5], [4.1, 0]], maxError: 0.10000000000000053, l2: 0.03779644730092275, bound: 0.30000000000000027},
    {name: 'skewed fixed', rows: SKEWED, mode: 'fixed' as const, quadratic: [[0, 0], [3.75, 2.5], [6, 2]], maxError: 0.9730150122493766, l2: 0.6977856131397105, bound: 3.3706247360261146},
    {name: 'skewed free', rows: SKEWED, mode: 'free' as const, quadratic: [[-0.15, 1], [3.75, 2.5], [6.15, 1]], maxError: 1.0111874208078349, l2: 0.382192920619193, bound: 3.0335622624235032},
];

describe('reductionOf pins the degree-reduction numbers', () => {
    test.each(CASES)('$name', ({rows, mode, quadratic, maxError, l2, bound}) => {
        const result = reductionOf(rows, mode)!;
        result.quadratic.forEach((point, i) => point.forEach((value, k) => expect(value).toBeCloseTo(quadratic[i][k], 12)));
        expect(result.maxError).toBeCloseTo(maxError, 12);
        expect(result.l2).toBeCloseTo(l2, 12);
        expect(result.bound).toBeCloseTo(bound, 12);
    });

    test('anything but four finite points has no reduction', () => {
        expect(reductionOf(undefined, 'fixed')).toBeUndefined();
        expect(reductionOf(SYMMETRIC.slice(0, 3), 'free')).toBeUndefined();
        expect(reductionOf([[0, 0], [1, NaN], [3, 3], [4, 0]], 'fixed')).toBeUndefined();
    });
});
