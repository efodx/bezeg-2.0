import ElevationGraph from './ElevationGraph';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
import {elevatedControlPoints} from '../object/AbstractJXGBezierCurve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

test('owns degree elevation as a typed lesson action', () => {
    const graph = Object.create(ElevationGraph.prototype) as any;
    graph.elevate = jest.fn();

    graph.applyLessonAction({kind: 'degree-elevation'});

    expect(graph.elevate).toHaveBeenCalledTimes(1);
});

test('the elevation lesson preserves the route default at representative parameters', () => {
    const curve = new PolynomialBezierCurve([
        new PointImpl(-4, -2), new PointImpl(-3, 3), new PointImpl(2, 3), new PointImpl(3, -2),
    ]);
    const elevated = curve.elevate();

    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
        expect(elevated.eval(t).X()).toBeCloseTo(curve.eval(t).X(), 10);
        expect(elevated.eval(t).Y()).toBeCloseTo(curve.eval(t).Y(), 10);
    });
    expect(elevated.getPoints()).toHaveLength(5);
});

const cubic = [[-4, -2], [-3, 3], [2, 3], [3, -2]];
const quartic = [[-5, 1], [-2, 4.5], [0.5, -3], [3, 2], [6, -1.5]];

describe.each([['default cubic', cubic], ['asymmetric quartic', quartic]])('elevated overlay points of the %s', (_name, raw) => {
    const points = raw.map(([x, y]) => new PointImpl(x, y));
    const n1 = points.length;
    const overlay = elevatedControlPoints(points);

    test('lie on the original polygon edges with parameter i/(n+1)', () => {
        expect(overlay).toHaveLength(n1 + 1);
        expect(overlay[0]).toEqual([raw[0][0], raw[0][1]]);
        expect(overlay[n1]).toEqual([raw[n1 - 1][0], raw[n1 - 1][1]]);
        for (let i = 1; i < n1; i++) {
            const [ax, ay] = raw[i - 1];
            const [bx, by] = raw[i];
            const dx = bx - ax, dy = by - ay;
            const [px, py] = overlay[i];
            expect(Math.abs(dx * (py - ay) - dy * (px - ax))).toBeLessThanOrEqual(1e-10);
            const lambda = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
            expect(lambda).toBeGreaterThanOrEqual(0);
            expect(lambda).toBeLessThanOrEqual(1);
            expect(lambda).toBeCloseTo(1 - i / n1, 12);
        }
    });

    test('match the elevated curve and keep the curve unchanged', () => {
        const curve = new PolynomialBezierCurve(points);
        const elevated = curve.elevate();
        elevated.getPoints().forEach((p, i) => {
            expect(p.X()).toBeCloseTo(overlay[i][0], 12);
            expect(p.Y()).toBeCloseTo(overlay[i][1], 12);
        });
        [0, 0.3, 0.7, 1].forEach(t => {
            expect(elevated.eval(t).X()).toBeCloseTo(curve.eval(t).X(), 10);
            expect(elevated.eval(t).Y()).toBeCloseTo(curve.eval(t).Y(), 10);
        });
    });
});

test('overlay coordinates are recomputed from moved control points', () => {
    const points = cubic.map(([x, y]) => new PointImpl(x, y));
    const before = elevatedControlPoints(points);
    points[1] = new PointImpl(-1, 6);
    const after = elevatedControlPoints(points);
    expect(after[1]).not.toEqual(before[1]);
    expect(after[1][0]).toBeCloseTo(0.25 * -4 + 0.75 * -1, 12);
    expect(after[1][1]).toBeCloseTo(0.25 * -2 + 0.75 * 6, 12);
});
