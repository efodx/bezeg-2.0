import RationalElevationGraph from './RationalElevationGraph';
import {RationalBezierCurve} from '../../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

const points = () => [[-4, -3], [-3, 3], [3, 3], [4, -3]].map(([x, y]) => new PointImpl(x, y));
const curve = () => new RationalBezierCurve(points(), [1, 2, 1, 1]);

test('owns degree elevation as a typed lesson action', () => {
    const graph = Object.create(RationalElevationGraph.prototype) as any;
    graph.elevate = vi.fn();

    graph.applyLessonAction({kind: 'degree-elevation'});

    expect(graph.elevate).toHaveBeenCalledTimes(1);
});

test('rational elevation produces the worked weights and points', () => {
    const elevated = curve().elevate();
    const w = elevated.getWeights();
    [1, 7 / 4, 3 / 2, 1, 1].forEach((v, i) => expect(w[i]).toBeCloseTo(v, 10));

    const expected = [[-4, -3], [-22 / 7, 15 / 7], [-1, 3], [13 / 4, 3 / 2], [4, -3]];
    const p = elevated.getPoints();
    expect(p).toHaveLength(5);
    expected.forEach(([x, y], i) => {
        expect(p[i].X()).toBeCloseTo(x, 10);
        expect(p[i].Y()).toBeCloseTo(y, 10);
    });
    // Differs from the unweighted blend of P0 and P1.
    expect(Math.abs(p[1].X() - -3.25)).toBeGreaterThan(0.1);
    expect(Math.abs(p[1].Y() - 1.5)).toBeGreaterThan(0.1);
});

test('rational elevation preserves the curve after one and two elevations', () => {
    const original = curve();
    const once = original.elevate();
    const twice = once.elevate();
    [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].forEach(t => {
        [once, twice].forEach(c => {
            expect(c.eval(t).X()).toBeCloseTo(original.eval(t).X(), 10);
            expect(c.eval(t).Y()).toBeCloseTo(original.eval(t).Y(), 10);
        });
    });
    expect(twice.getPoints()).toHaveLength(6);
});

test('elevation uses the effective (reactive) weights, not stale stored ones', () => {
    const stale = new RationalBezierCurve(points(), [1, 1, 1, 1]);
    stale.setReactiveWeights([() => 1, () => 2, () => 1, () => 1]);
    const elevated = stale.elevate();
    const reference = curve().elevate();
    elevated.getWeights().forEach((w, i) => expect(w).toBeCloseTo(reference.getWeights()[i], 10));
    elevated.getPoints().forEach((p, i) => {
        expect(p.X()).toBeCloseTo(reference.getPoints()[i].X(), 10);
        expect(p.Y()).toBeCloseTo(reference.getPoints()[i].Y(), 10);
    });
    [0, 0.3, 0.5, 1].forEach(t => {
        expect(elevated.eval(t).X()).toBeCloseTo(stale.eval(t).X(), 10);
        expect(elevated.eval(t).Y()).toBeCloseTo(stale.eval(t).Y(), 10);
    });
});
