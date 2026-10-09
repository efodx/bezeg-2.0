import ElevationGraph from './ElevationGraph';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
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
