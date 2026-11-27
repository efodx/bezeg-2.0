import {describe, expect, test} from 'vitest';
import {focusFrame, openingFrame} from './cobwebFocus';
import {VIEW_BOXES} from './cobwebScene';

const MAPS = ['affine', 'cosine', 'logistic'] as const;

describe('the focus frame of the cobweb board', () => {
    test('holds the origin and the points, is at least the least span wide and high, and stays inside the window of the map', () => {
        for (const map of MAPS) {
            const [wl, wt, wr, wb] = VIEW_BOXES[map];
            const point: [number, number] = [(wl + wr) / 2 + 0.3, (wb + wt) / 2 + 0.2];
            const [left, top, right, bottom] = focusFrame(map, [point]);
            expect(left).toBeLessThanOrEqual(Math.min(0, point[0]));
            expect(right).toBeGreaterThanOrEqual(Math.max(0, point[0]));
            expect(bottom).toBeLessThanOrEqual(Math.min(0, point[1]));
            expect(top).toBeGreaterThanOrEqual(Math.max(0, point[1]));
            expect(left).toBeGreaterThanOrEqual(wl - 1e-12);
            expect(right).toBeLessThanOrEqual(wr + 1e-12);
            expect(bottom).toBeGreaterThanOrEqual(wb - 1e-12);
            expect(top).toBeLessThanOrEqual(wt + 1e-12);
        }
    });

    test('the opening frames are tighter than the window of the map, and the same box every time', () => {
        for (const map of MAPS) {
            const [l, t, r, b] = openingFrame(map);
            const [wl, wt, wr, wb] = VIEW_BOXES[map];
            expect(r - l).toBeLessThan((wr - wl) * 0.8);
            expect(t - b).toBeLessThan((wt - wb) * 0.8);
            expect(openingFrame(map)).toEqual([l, t, r, b]);
        }
    });
});
