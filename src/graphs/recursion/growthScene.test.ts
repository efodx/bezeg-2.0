import {at, barsPath, chord, interestBox, logBox, sameBox, sampleCurve, sequenceBox} from './growthScene';

describe('bars', () => {
    test('one closed rectangle per value from 0, bars k = 1, 2 apart by a NaN pair', () => {
        const {x, y} = barsPath([3, -2], 0.4);
        expect(x.slice(0, 5)).toEqual([0.6, 0.6, 1.4, 1.4, 0.6]);
        expect(y.slice(0, 5)).toEqual([0, 3, 3, 0, 0]);
        expect([x[5], y[5]]).toEqual([NaN, NaN]);
        expect(x.slice(6)).toEqual([1.6, 1.6, 2.4, 2.4, 1.6]);
        expect(y.slice(6)).toEqual([0, -2, -2, 0, 0]);
    });

    test('the top of each bar is the value', () => {
        const values = [3, 5, 7, 9];
        const {x, y} = barsPath(values);
        values.forEach((value, index) => {
            const at0 = index * 6;
            expect(y[at0 + 1]).toBe(value);
            expect(y[at0 + 2]).toBe(value);
            expect((x[at0] + x[at0 + 2]) / 2).toBeCloseTo(index + 1, 12);
        });
    });
});

describe('windows keep the data inside and leave room for the captions', () => {
    test('sequence: positive terms sit between 0 and the top, with a margin above for three caption rows', () => {
        const [xmin, ymax, xmax, ymin] = sequenceBox([3, 5, 7, 21], null);
        expect(ymin).toBeLessThan(0);
        expect(ymax).toBeGreaterThan(21 * 1.3);
        expect(xmin).toBeLessThan(0);
        expect(xmax).toBeGreaterThan(4.5);
        const caption = at([xmin, ymax, xmax, ymin], 0.1, 0.79).y;
        expect(caption).toBeGreaterThan(21);
    });

    test('sequence: negative terms and the limit are inside; a limit above the terms raises the top', () => {
        const negative = sequenceBox([-5, -3], null);
        expect(negative[3]).toBeLessThan(-5);
        expect(negative[1]).toBeGreaterThan(0);
        const limit = sequenceBox([3, 1.5], 6);
        expect(limit[1]).toBeGreaterThan(6);
        expect(sequenceBox([0, 0], null)[1]).toBeGreaterThan(sequenceBox([0, 0], null)[3]);
    });

    test('interest: the largest value is below the legend rows, the origin of time is left of the axis', () => {
        const box = interestBox([1500, 1628.89, 1647.01, 1648.72], 10);
        expect(box[0]).toBeLessThan(0);
        expect(box[3]).toBeLessThan(0);
        expect(box[1]).toBeGreaterThan(1648.72 * 1.5);
        expect(at(box, 0.1, 0.79).y).toBeGreaterThan(1648.72);
    });

    test('log: the points, with 0 on the axis, are inside; negative logarithms get room below', () => {
        const box = logBox([0, 1, 2], [Math.log(1000), 7, 7.1]);
        expect(box[1]).toBeGreaterThan(7.1);
        expect(box[3]).toBeLessThan(0);
        const low = logBox([0, 1], [-2, -1]);
        expect(low[3]).toBeLessThan(-2);
        expect(low[2]).toBeGreaterThan(1);
    });

    test('at() maps fractions to the window and sameBox compares by value', () => {
        expect(at([-2, 4, 6, -4], 0, 0)).toEqual({x: -2, y: -4});
        expect(at([-2, 4, 6, -4], 1, 1)).toEqual({x: 6, y: 4});
        expect(at([-2, 4, 6, -4], 0.5, 0.5)).toEqual({x: 2, y: 0});
        expect(sameBox([1, 2, 3, 4], [1, 2, 3, 4])).toBe(true);
        expect(sameBox([1, 2, 3, 4], [1, 2, 3, 5])).toBe(false);
        expect(sameBox(undefined, [1, 2, 3, 4])).toBe(false);
    });
});

describe('curves', () => {
    test('sampleCurve covers both ends, evenly', () => {
        const {x, y} = sampleCurve(t => 2 * t, 0, 10, 5);
        expect(x).toEqual([0, 2.5, 5, 7.5, 10]);
        expect(y).toEqual([0, 5, 10, 15, 20]);
        expect(sampleCurve(t => t, 0, 1).x).toHaveLength(80);
    });

    test('the chord joins the first and the last point', () => {
        expect(chord([0, 1, 2], [1, 5, 9])).toEqual({x: [0, 2], y: [1, 9]});
    });
});
