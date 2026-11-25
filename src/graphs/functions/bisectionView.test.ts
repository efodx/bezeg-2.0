import {describe, expect, test} from 'vitest';
import {bisectionHistory} from '../../analysis/bisection';
import {MAX_HEIGHT_RATIO, bisectionFollowView} from './bisectionView';

describe('the bisection follow view', () => {
    test('a steep function does not make the box many times higher than wide, and the axis stays inside it', () => {
        const [left, top, right, bottom] = bisectionFollowView(bisectionHistory('cubic', -1.5, 2, 0));
        expect(top - bottom).toBeLessThanOrEqual((right - left) * MAX_HEIGHT_RATIO * 1.5);
        expect(top).toBeGreaterThan(0);
        expect(bottom).toBeLessThan(0);
    });
});
