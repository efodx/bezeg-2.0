import {Rational} from '../../compgeo/rational';
import {boardFrameOf, fitFrame} from './frameFit';

const box = (minX: number, minY: number, maxX: number, maxY: number) =>
    ({minX: Rational.fromInt(minX), minY: Rational.fromInt(minY), maxX: Rational.fromInt(maxX), maxY: Rational.fromInt(maxY)});

test('boardFrameOf scales an exact grid box by the grid step and orders it left, top, right, bottom', () => {
    expect(boardFrameOf(box(-2, -1, 6, 3), 0)).toEqual([-2, 3, 6, -1]);
    expect(boardFrameOf(box(-2, -1, 6, 3), 1)).toEqual([-4, 6, 12, -2]);
    expect(boardFrameOf(box(-2, -1, 6, 3), -1)).toEqual([-1, 1.5, 3, -0.5]);
});

test('fitFrame keeps the frame inside a view of equal axis units at the canvas aspect', () => {
    const [left, top, right, bottom] = fitFrame([0, 4, 8, 0], 800, 400);
    expect([left <= 0, right >= 8, top >= 4, bottom <= 0]).toEqual([true, true, true, true]);
    expect((right - left) / (top - bottom)).toBeCloseTo(2, 6);
    const [l2, t2, r2, b2] = fitFrame([0, 4, 8, 0], 400, 800);
    expect((r2 - l2) / (t2 - b2)).toBeCloseTo(0.5, 6);
});

test('fitFrame without a canvas size returns the frame itself', () => {
    expect(fitFrame([0, 4, 8, 0], 0, 0)).toEqual([0, 4, 8, 0]);
});
