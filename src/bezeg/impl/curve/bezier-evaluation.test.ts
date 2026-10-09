import {PolynomialBezierCurve} from './polynomial-bezier-curve';
import {RationalBezierCurve} from './rational-bezier-curve';
import {PointImpl} from '../point/point-impl';
import {geometryCache} from '../../cache/GeometryCache';
import {Point} from '../../api/point/point';
import {C1QuadraticBezierSpline} from './C1QuadraticBezierSpline';
import {PhBezierCurve} from './ph-bezier-curve';

const coordinates = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const points = (values = coordinates) => values.map(([x, y]) => new PointImpl(x, y));
const parameters = [-0.2, 0, 0.01, 0.25, 0.5, 0.79, 1, 1.2];

// Independent Bernstein reference; not the implementation's interpolation recurrence.
function reference(control: Point[], t: number, weights = control.map(() => 1)): number[] {
    const n = control.length - 1;
    let binomial = 1, x = 0, y = 0, denominator = 0;
    for (let i = 0; i <= n; i++) {
        if (i > 0) binomial *= (n - i + 1) / i;
        const coefficient = binomial * (1 - t) ** (n - i) * t ** i * weights[i];
        x += coefficient * control[i].X();
        y += coefficient * control[i].Y();
        denominator += coefficient;
    }
    return [x / denominator, y / denominator];
}

function close(actual: Point, expected: number[]) {
    // Mixed 1e-10 tolerance accommodates independent arithmetic at degree 7 and extrapolation.
    [actual.X(), actual.Y()].forEach((value, i) => {
        expect(Math.abs(value - expected[i])).toBeLessThanOrEqual(1e-10 * Math.max(1, Math.abs(expected[i])));
    });
}

beforeEach(() => geometryCache.invalidate());

test('direct geometry mutations refresh evaluation without graph coordination', () => {
    const curve = new PolynomialBezierCurve(points());
    const before = curve.eval(0.5).X();

    curve.getPoints()[1].setX(curve.getPoints()[1].X() + 1);

    expect(curve.eval(0.5).X()).not.toBe(before);
});

test('zero-valued function coordinates remain cached within a revision', () => {
    let evaluations = 0;
    const point = new PointImpl(() => {
        evaluations += 1;
        return 0;
    }, () => 0);

    expect(point.X()).toBe(0);
    expect(point.X()).toBe(0);
    expect(evaluations).toBe(1);

    geometryCache.invalidate();
    expect(point.X()).toBe(0);
    expect(evaluations).toBe(2);
});

test.each([coordinates, [[0, 0]], [[0, 0], [1, 2]],
    [[-4, -3], [-3, 3], [-2, -1], [-1, 4], [1, -4], [2, 1], [3, 3], [4, -3]]].map(values => [values]))('polynomial evaluation matches Bernstein for %j', values => {
    const curve = new PolynomialBezierCurve(points(values));
    parameters.forEach(t => {
        close(curve.eval(t), reference(curve.getPoints(), t));
        const scheme = curve.decasteljauScheme(t);
        close(curve.eval(t), [scheme[scheme.length - 1][0].X(), scheme[scheme.length - 1][0].Y()]);
    });
});

test.each([[1, 2, 1, 1], [2, 2, 2, 2], [1, 0, 2, 1], [1, -0.1, 2, 1]].map(weights => [weights]))('rational evaluation matches weighted Bernstein for %j', weights => {
    const curve = new RationalBezierCurve(points(), weights);
    parameters.forEach(t => {
        const scheme = curve.decasteljauScheme(t);
        const end = scheme[scheme.length - 1][0];
        if (Number.isFinite(end.X()) && Number.isFinite(end.Y())) {
            close(curve.eval(t), reference(curve.getPoints(), t, weights));
            close(curve.eval(t), [end.X(), end.Y()]);
        } else {
            // Existing recurrence can encounter a zero intermediate weight even when
            // the final Bernstein denominator is nonzero (e.g. zero weights at endpoints).
            expect(curve.eval(t).X()).toBe(end.X());
            expect(curve.eval(t).Y()).toBe(end.Y());
        }
    });
});

test('equal rational weights match polynomial evaluation', () => {
    const polynomial = new PolynomialBezierCurve(points());
    const rational = new RationalBezierCurve(points(), [3, 3, 3, 3]);
    parameters.forEach(t => close(rational.eval(t), [polynomial.eval(t).X(), polynomial.eval(t).Y()]));
});

test.each([false, true])('subdivision and degree elevation preserve shape (rational=%s)', rational => {
    const curve = rational ? new RationalBezierCurve(points(), [1, 2, 1, 1]) : new PolynomialBezierCurve(points());
    const elevated = curve.elevate();
    const [left, right] = curve.subdivide(0.37);
    [0, 0.13, 0.5, 0.82, 1].forEach(t => {
        close(elevated.eval(t), [curve.eval(t).X(), curve.eval(t).Y()]);
        close(left.eval(t), [curve.eval(0.37 * t).X(), curve.eval(0.37 * t).Y()]);
        close(right.eval(t), [curve.eval(0.37 + 0.63 * t).X(), curve.eval(0.37 + 0.63 * t).Y()]);
    });
});

test('existing revision invalidation covers edits, transforms, replacement and point counts', () => {
    const curve = new PolynomialBezierCurve(points());
    const verify = () => {
        geometryCache.invalidate();
        close(curve.eval(0.43), reference(curve.getPoints(), 0.43));
        expect(curve.eval(0.43)).toBe(curve.eval(0.43));
    };
    verify();
    curve.getPoints()[1].setX(2);
    verify();
    curve.moveFor(0.2, -0.3);
    verify();
    curve.addPoint(new PointImpl(5, 1));
    verify();
    curve.removePoint(curve.getPoints()[0]);
    verify();
    curve.setPoints(points([[0, 0], [2, 3]]));
    verify();
});

test('reactive coordinates and numeric/reactive weights refresh after revision changes', () => {
    let x = 0, weight = 2;
    const control = points();
    control[1] = new PointImpl(() => x, () => x * 2);
    const curve = new RationalBezierCurve(control, [1, 2, 1, 1]);
    close(curve.eval(0.43), reference(control, 0.43, [1, 2, 1, 1]));
    x = 3;
    curve.setWeights([1, 3, 1, 1]);
    geometryCache.invalidate();
    close(curve.eval(0.43), reference(control, 0.43, [1, 3, 1, 1]));
    curve.setReactiveWeights([() => 1, () => weight, () => 1, () => 1]);
    geometryCache.invalidate();
    close(curve.eval(0.43), reference(control, 0.43, [1, weight, 1, 1]));
    weight = 4;
    x = 0;
    geometryCache.invalidate();
    close(curve.eval(0.43), reference(control, 0.43, [1, weight, 1, 1]));
});

test('five-point polynomial scratch rows refresh function-backed coordinates', () => {
    let x = 0;
    const control = points([[-4, -3], [-2, 1], [0, 2], [2, 1], [4, -3]]);
    control[2] = new PointImpl(() => x, () => x * 2);
    const curve = new PolynomialBezierCurve(control);

    close(curve.eval(0.43), reference(control, 0.43));
    x = 3;
    geometryCache.invalidate();
    close(curve.eval(0.43), reference(control, 0.43));
});

test('five-point rational scratch rows refresh function-backed coordinates and weights', () => {
    let x = 0, weight = 2;
    const control = points([[-4, -3], [-2, 1], [0, 2], [2, 1], [4, -3]]);
    control[2] = new PointImpl(() => x, () => x * 2);
    const weights = [1, 2, 1, 1, 3];
    const curve = new RationalBezierCurve(control, weights);
    curve.setReactiveWeights([() => 1, () => 2, () => weight, () => 1, () => 3]);

    close(curve.eval(0.43), reference(control, 0.43, [1, 2, weight, 1, 3]));
    x = 3;
    weight = 4;
    geometryCache.invalidate();
    close(curve.eval(0.43), reference(control, 0.43, [1, 2, weight, 1, 3]));
});

test('singular intermediate rational weights preserve existing nonfinite behavior', () => {
    const curve = new RationalBezierCurve(points(), [1, -1, 1, 1]);
    const scheme = curve.decasteljauScheme(0.5);
    const end = scheme[scheme.length - 1][0];
    expect(Number.isNaN(end.X())).toBe(true);
    expect(Number.isNaN(curve.eval(0.5).X())).toBe(true);
    expect(Number.isNaN(curve.eval(0.5).Y())).toBe(true);
});

test('spline and PH consumers retain evaluation against their construction', () => {
    const spline = new C1QuadraticBezierSpline(points());
    close(spline.eval(0), coordinates[0]);
    close(spline.eval(1), coordinates[3]);
    [0.1, 0.5, 0.9].forEach(t => {
        const p = spline.eval(t);
        expect(Number.isFinite(p.X()) && Number.isFinite(p.Y())).toBe(true);
    });
    const ph = new PhBezierCurve([new PointImpl(0, 0)], points([[1, 0], [0.8, 0.4], [1, 0.2]]));
    parameters.forEach(t => {
        const scheme = ph.decasteljauScheme(t);
        const end = scheme[scheme.length - 1][0];
        close(ph.eval(t), [end.X(), end.Y()]);
        ph.getOffsetCurves().forEach(offset => close(offset.eval(t), reference(offset.getPoints(), t, (offset as RationalBezierCurve).getWeights())));
    });
});
