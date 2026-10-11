import {formatNumber} from './format';
import {lineEquation, lineThroughPoints, lineValueAt, moveAlongLine, pointsOnLine, slopeTriangle} from './linear';
import {DEFAULT_LINEAR_MODEL, LINEAR_COORDINATE_LIMIT, parseLinearModel} from './linearModel';

test('the lesson example P1(0,1), P2(2,5) gives k = 2 and n = 1', () => {
    const line = lineThroughPoints({x: 0, y: 1}, {x: 2, y: 5});
    expect(line).toEqual({kind: 'line', k: 2, n: 1});
    const triangle = slopeTriangle({x: 0, y: 1}, {x: 2, y: 5});
    expect(triangle).toEqual({dx: 2, dy: 4, corner: {x: 2, y: 1}});
    expect(triangle.dy / triangle.dx).toBe(2);
});

test('the line passes through both points for arbitrary non-vertical pairs', () => {
    const samples = [[-3.7, 2.1, 4.4, -6.25], [0.1, 0.1, 0.2, 0.3], [10, -5, -10, 5], [1, 7, 2, 7], [-0.3, 4, 8.1, -2.2]];
    for (const [x1, y1, x2, y2] of samples) {
        const line = lineThroughPoints({x: x1, y: y1}, {x: x2, y: y2});
        if (line.kind !== 'line') throw new Error('expected a line');
        expect(lineValueAt(line, x1)).toBeCloseTo(y1, 10);
        expect(lineValueAt(line, x2)).toBeCloseTo(y2, 10);
        expect(line.k).toBeCloseTo((y2 - y1) / (x2 - x1), 12);
    }
});

test('equal x-coordinates give a vertical line with no slope, never Infinity or NaN', () => {
    const vertical = lineThroughPoints({x: 1.5, y: -1}, {x: 1.5, y: 3});
    expect(vertical).toEqual({kind: 'vertical', x: 1.5});
    expect(JSON.stringify(vertical)).not.toMatch(/Infinity|NaN|null/);
    expect(moveAlongLine({x: 1.5, y: -1}, {x: 1.5, y: 3}, {k: 2})).toBeUndefined();
    expect(moveAlongLine({x: 1.5, y: -1}, {x: 1.5, y: 3}, {n: 2})).toBeUndefined();
    // floating-point noise from grid snapping must not turn a vertical line into a huge slope
    expect(lineThroughPoints({x: 0.1 + 0.2, y: 0}, {x: 0.3, y: 1}).kind).toBe('vertical');
});

test('coincident points do not determine a line', () => {
    expect(lineThroughPoints({x: 2, y: 2}, {x: 2, y: 2})).toEqual({kind: 'degenerate'});
    expect(moveAlongLine({x: 2, y: 2}, {x: 2, y: 2}, {k: 1})).toBeUndefined();
    expect(lineEquation({kind: 'degenerate'}, 'en')).toBe('');
});

test('changing k or n moves the points along the new line and keeps their x-coordinates', () => {
    const p1 = {x: 0, y: 1};
    const p2 = {x: 2, y: 5};
    // lesson step 3: n = -2 keeping k = 2
    const intercept = moveAlongLine(p1, p2, {n: -2})!;
    expect(intercept).toEqual([{x: 0, y: -2}, {x: 2, y: 2}]);
    // lesson step 4: k = -1/2 keeping n = 1
    const slope = moveAlongLine(p1, p2, {k: -0.5})!;
    expect(slope).toEqual([{x: 0, y: 1}, {x: 2, y: 0}]);
    for (const [moved, expected] of [[intercept, {k: 2, n: -2}], [slope, {k: -0.5, n: 1}]] as const) {
        expect(moved[0].x).toBe(0);
        expect(moved[1].x).toBe(2);
        expect(lineThroughPoints(moved[0], moved[1])).toEqual({kind: 'line', ...expected});
    }
    // both at once, with points not on the y-axis
    const both = moveAlongLine({x: 1, y: 1}, {x: 4, y: 2}, {k: 3, n: -1})!;
    expect(both).toEqual([{x: 1, y: 2}, {x: 4, y: 11}]);
    expect(pointsOnLine({k: 3, n: -1}, 1, 4)).toEqual(both);
});

test('the k and n readouts agree with the formulas for a line in every quadrant arrangement', () => {
    const line = lineThroughPoints({x: -2, y: 3}, {x: 4, y: -3});
    expect(line).toEqual({kind: 'line', k: -1, n: 1});
});

test('formatting uses a decimal comma in Slovenian, a true minus sign and never prints Infinity or NaN', () => {
    expect(formatNumber(2, 'sl')).toBe('2');
    expect(formatNumber(-0.5, 'sl')).toBe('−0,5');
    expect(formatNumber(-0.5, 'en')).toBe('−0.5');
    expect(formatNumber(1.005, 'en', 2)).toMatch(/^1(\.01|)$/);
    expect(formatNumber(-0.0001, 'en')).toBe('0');
    expect(formatNumber(-0, 'sl')).toBe('0');
    expect(formatNumber(Infinity, 'sl')).toBe('—');
    expect(formatNumber(NaN, 'en')).toBe('—');
});

test('equations read naturally', () => {
    expect(lineEquation({kind: 'line', k: 2, n: 1}, 'en')).toBe('y = 2x + 1');
    expect(lineEquation({kind: 'line', k: 2, n: -2}, 'en')).toBe('y = 2x − 2');
    expect(lineEquation({kind: 'line', k: -0.5, n: 1}, 'sl')).toBe('y = −0,5x + 1');
    expect(lineEquation({kind: 'line', k: 1, n: 0}, 'en')).toBe('y = x');
    expect(lineEquation({kind: 'line', k: -1, n: 0}, 'en')).toBe('y = −x');
    expect(lineEquation({kind: 'line', k: 0, n: 3}, 'en')).toBe('y = 3');
    expect(lineEquation({kind: 'line', k: 0, n: 0}, 'en')).toBe('y = 0');
    expect(lineEquation({kind: 'vertical', x: 1}, 'en')).toBe('x = 1');
    expect(lineEquation({kind: 'vertical', x: -1.5}, 'sl')).toBe('x = −1,5');
});

test('model parsing accepts the default and rejects out-of-domain data', () => {
    expect(parseLinearModel(DEFAULT_LINEAR_MODEL)).toEqual({x1: 0, y1: 1, x2: 2, y2: 5});
    expect(parseLinearModel({x1: 1, y1: 2, x2: 3, y2: 4, extra: 'dropped'})).toEqual({x1: 1, y1: 2, x2: 3, y2: 4});
    for (const bad of [null, undefined, 3, 'x', [], {}, {x1: 0, y1: 1, x2: 2}, {x1: 0, y1: 1, x2: 2, y2: NaN},
        {x1: 0, y1: 1, x2: 2, y2: Infinity}, {x1: 0, y1: '1', x2: 2, y2: 3}, {x1: LINEAR_COORDINATE_LIMIT + 1, y1: 0, x2: 0, y2: 0}]) {
        expect(parseLinearModel(bad)).toBeUndefined();
    }
});
