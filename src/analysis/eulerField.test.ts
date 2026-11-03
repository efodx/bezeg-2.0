import {fieldGrid, fieldMarks, FIELD_MARK_PX} from './eulerField';
import {EULER_EXAMPLE_IDS, EULER_FIELD_MAX, eulerExample} from './odeEuler';

const size = {widthPx: 900, heightPx: 600};
const window = {xMin: -2, xMax: 4, yMin: -1.5, yMax: 3.5};

describe('the slope marks of the field', () => {
    test('are one NaN-separated polyline: two points and a NaN per sample', () => {
        const marks = fieldMarks(eulerExample('exponential'), window, size);
        expect(marks.x).toHaveLength(marks.y.length);
        expect(marks.x).toHaveLength(3 * marks.cols * marks.rows);
        marks.x.forEach((value, index) => expect(Number.isNaN(value)).toBe(index % 3 === 2));
        marks.y.forEach((value, index) => expect(Number.isNaN(value)).toBe(index % 3 === 2));
    });

    test('the slope of each mark equals F at the cell centre (data units), for every example', () => {
        for (const id of EULER_EXAMPLE_IDS) {
            const example = eulerExample(id);
            const marks = fieldMarks(example, window, size);
            for (let k = 0; k < marks.x.length; k += 3) {
                const centreX = (marks.x[k] + marks.x[k + 1]) / 2;
                const centreY = (marks.y[k] + marks.y[k + 1]) / 2;
                const slope = (marks.y[k + 1] - marks.y[k]) / (marks.x[k + 1] - marks.x[k]);
                expect(slope, `${id} at ${centreX},${centreY}`).toBeCloseTo(example.F(centreX, centreY), 8);
            }
        }
    });

    test('every mark has the same length in pixels and points right', () => {
        const marks = fieldMarks(eulerExample('linear-relaxation'), window, size);
        const pxPerX = size.widthPx / (window.xMax - window.xMin);
        const pxPerY = size.heightPx / (window.yMax - window.yMin);
        for (let k = 0; k < marks.x.length; k += 3) {
            expect(Math.hypot((marks.x[k + 1] - marks.x[k]) * pxPerX, (marks.y[k + 1] - marks.y[k]) * pxPerY)).toBeCloseTo(FIELD_MARK_PX, 8);
            expect(marks.x[k + 1]).toBeGreaterThan(marks.x[k]);
        }
    });

    test('a steep field gives finite marks of the same length', () => {
        const marks = fieldMarks(eulerExample('blow-up'), {xMin: -1, xMax: 1, yMin: -900, yMax: 900}, size);
        expect(marks.y.every((value, index) => index % 3 === 2 || Number.isFinite(value))).toBe(true);
        expect(marks.x.every((value, index) => index % 3 === 2 || Number.isFinite(value))).toBe(true);
    });

    test('an empty window or board is refused', () => {
        const example = eulerExample('exponential');
        expect(() => fieldMarks(example, {...window, xMax: window.xMin}, size)).toThrow(RangeError);
        expect(() => fieldMarks(example, window, {widthPx: 0, heightPx: 300})).toThrow(RangeError);
    });
});

describe('the grid', () => {
    test('has at most the kernel limit in each direction, follows the width and then the aspect', () => {
        for (const [widthPx, heightPx] of [[100, 80], [900, 600], [1920, 1080], [4000, 4000], [300, 3000], [20, 20]]) {
            const {cols, rows} = fieldGrid({widthPx, heightPx});
            expect(cols).toBeGreaterThanOrEqual(1);
            expect(rows).toBeGreaterThanOrEqual(1);
            expect(cols).toBeLessThanOrEqual(EULER_FIELD_MAX);
            expect(rows).toBeLessThanOrEqual(EULER_FIELD_MAX);
        }
        expect(fieldGrid({widthPx: 1920, heightPx: 1080})).toEqual({cols: 40, rows: 23});
        expect(fieldGrid({widthPx: 900, heightPx: 600}).cols).toBe(26);
    });
});
