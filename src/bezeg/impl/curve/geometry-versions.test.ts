import {PolynomialBezierCurve} from './polynomial-bezier-curve';
import {RationalBezierCurve} from './rational-bezier-curve';
import {C1QuadraticBezierSpline} from './C1QuadraticBezierSpline';
import {G1QuadraticBezierSpline} from './G1QuadraticBezierSpline';
import {GenericBezierSpline} from './GenericBezierSpline';
import {PhBezierCurve} from './ph-bezier-curve';
import {PointImpl} from '../point/point-impl';
import {FixedPoint} from '../point/fixed-point';
import {Point} from '../../api/point/point';
import {nextVersion, VOLATILE} from '../versioning';

const coords = [[-4, -3], [-3, 3], [3, 3], [4, -3], [6, 1], [7, -2]];
const pts = (n = 4, dx = 0) => coords.slice(0, n).map(([x, y]) => new PointImpl(x + dx, y));
const pt = (curve: {getPoints(): Point[]}, i: number) => curve.getPoints()[i] as PointImpl;
const samples = [0, 0.13, 0.5, 0.77, 1];

function expectSameEvaluation(a: { eval(t: number): Point }, b: { eval(t: number): Point }) {
    samples.forEach(t => {
        expect(a.eval(t).X()).toBeCloseTo(b.eval(t).X(), 10);
        expect(a.eval(t).Y()).toBeCloseTo(b.eval(t).Y(), 10);
    });
}

describe('point versions', () => {
    test('every coordinate change of a numeric point bumps its version monotonically', () => {
        const p = new PointImpl(1, 2);
        const versions = [p.version()];
        p.setX(3);
        versions.push(p.version());
        p.setY(4);
        versions.push(p.version());
        p.setCoordinates(5, 6);
        versions.push(p.version());
        versions.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(versions[i]));
    });

    test('function-backed points without dependencies are volatile and always recomputed', () => {
        let calls = 0;
        const p = new PointImpl(() => ++calls, 0);
        expect(p.version()).toBe(VOLATILE);
        p.X();
        p.X();
        expect(calls).toBe(2);
        expect(new FixedPoint(() => [1, 2]).version()).toBe(VOLATILE);
    });

    test('computed points with dependencies cache until a dependency changes', () => {
        let calls = 0;
        const source = new PointImpl(1, 1);
        const derived = new PointImpl(() => {
            calls++;
            return source.X() * 2;
        }, () => 0, [source]);
        const fixed = new FixedPoint(() => [source.X(), source.Y()], [source]);

        expect(derived.X()).toBe(2);
        expect(derived.X()).toBe(2);
        expect(calls).toBe(1);
        source.setX(5);
        expect(derived.X()).toBe(10);
        expect(calls).toBe(2);
        expect(fixed.X()).toBe(5);
        source.setCoordinates(7, 8);
        expect([fixed.X(), fixed.Y()]).toEqual([7, 8]);
    });

    test('a computed point depending on a volatile input stays volatile', () => {
        const volatile = new PointImpl(() => 1, 0);
        const derived = new PointImpl(() => volatile.X(), 0, [volatile]);
        expect(derived.version()).toBe(VOLATILE);
    });
});

describe('per-curve evaluation cache', () => {
    test('moving a control point invalidates that curve only', () => {
        const a = new PolynomialBezierCurve(pts());
        const b = new PolynomialBezierCurve(pts());
        const aBefore = a.eval(0.5);
        const bBefore = b.eval(0.5);
        expect(a.eval(0.5)).toBe(aBefore);
        expect(b.eval(0.5)).toBe(bBefore);

        pt(a, 1).setCoordinates(-3, 10);

        const aAfter = a.eval(0.5);
        expect(aAfter).not.toBe(aBefore);
        expect(aAfter.Y()).not.toBeCloseTo(aBefore.Y(), 6);
        expect(b.eval(0.5)).toBe(bBefore);
    });

    test('a point shared by two curves invalidates both, an unrelated drag invalidates neither', () => {
        const shared = new PointImpl(0, 0);
        const a = new PolynomialBezierCurve([shared, new PointImpl(1, 2), new PointImpl(2, 0)]);
        const b = new PolynomialBezierCurve([new PointImpl(-2, 0), new PointImpl(-1, 2), shared]);
        const unrelated = new PointImpl(9, 9);
        const aBefore = a.eval(0.3);
        const bBefore = b.eval(0.7);

        unrelated.setCoordinates(1, 1);
        expect(a.eval(0.3)).toBe(aBefore);
        expect(b.eval(0.7)).toBe(bBefore);

        shared.setCoordinates(0, 5);
        expect(a.eval(0.3)).not.toBe(aBefore);
        expect(b.eval(0.7)).not.toBe(bBefore);
    });

    test('structural changes invalidate: add, remove, replace, transform', () => {
        const curve = new PolynomialBezierCurve(pts());
        let last = curve.eval(0.4);
        const changed = () => {
            const next = curve.eval(0.4);
            expect(next).not.toBe(last);
            last = next;
        };
        curve.addPoint(new PointImpl(5, 5));
        changed();
        curve.removePoint(curve.getPoints()[1]);
        changed();
        curve.setPoints(pts(3));
        changed();
        curve.moveFor(1, 1);
        changed();
        expect(curve.eval(0.4)).toBe(last);
    });

    test('curves over a point backed by a foreign implementation are never cached', () => {
        let y = 0;
        const foreign: Point = {
            X: () => 1, Y: () => y, setX: () => undefined, setY: () => undefined,
            isXFunction: () => false, isYFunction: () => false,
        };
        const curve = new PolynomialBezierCurve([new PointImpl(0, 0), foreign, new PointImpl(2, 0)]);
        const first = curve.eval(0.5).Y();
        y = 4;
        expect(curve.eval(0.5).Y()).not.toBeCloseTo(first, 6);
    });

    test('rational weight changes invalidate and unchanged weights keep the cache', () => {
        const curve = new RationalBezierCurve(pts(), [1, 2, 1, 1]);
        const other = new RationalBezierCurve(pts(), [1, 2, 1, 1]);
        const before = curve.eval(0.5);
        const otherBefore = other.eval(0.5);
        expect(curve.eval(0.5)).toBe(before);

        curve.setWeights([1, 5, 1, 1]);
        const after = curve.eval(0.5);
        expect(after).not.toBe(before);
        expect(after.Y()).toBeGreaterThan(before.Y());
        expect(other.eval(0.5)).toBe(otherBefore);

        let w = 2;
        curve.setReactiveWeights([() => 1, () => w, () => 1, () => 1]);
        const reactive = curve.eval(0.5).Y();
        w = 6;
        expect(curve.eval(0.5).Y()).toBeGreaterThan(reactive);
    });
});

describe('dependent curves observe source changes', () => {
    test('elevation shares end points with its source and a fresh subdivision follows the source', () => {
        const source = new PolynomialBezierCurve(pts());
        const elevated = source.elevate();
        const [left] = source.subdivide(0.4);
        const endBefore = elevated.eval(1).Y();
        const leftBefore = left.eval(0.5).Y();

        pt(source, 3).setCoordinates(4, 8);

        expect(elevated.eval(1).Y()).toBe(8);
        expect(elevated.eval(1).Y()).not.toBeCloseTo(endBefore, 6);
        const [leftAfter, right] = source.subdivide(0.4);
        expect(leftAfter.eval(0.5).Y()).toBeCloseTo(source.eval(0.2).Y(), 10);
        expect(leftAfter.eval(0.5).Y()).not.toBeCloseTo(leftBefore, 6);
        expect(right.eval(1).Y()).toBe(8);
        // subdivision agrees with the source after the move
        expect(right.eval(0.5).Y()).toBeCloseTo(source.eval(0.4 + 0.6 * 0.5).Y(), 10);
    });

    test('rational elevation reflects weight and point edits made before elevating', () => {
        const source = new RationalBezierCurve(pts(), [1, 2, 1, 1]);
        source.eval(0.5);
        source.setWeights([1, 3, 2, 1]);
        pt(source, 2).setCoordinates(3, 6);
        const elevated = source.elevate();
        expectSameEvaluation(elevated, source);
    });

    test('C1, G1 and generic spline segments observe free point, alpha and b changes', () => {
        const make = (dx: number) => [
            new C1QuadraticBezierSpline(pts(6, dx)),
            new G1QuadraticBezierSpline(pts(5, dx)),
            new GenericBezierSpline(pts(6, dx), 3, 2),
        ];
        const splines = make(0);
        const total = (s: { eval(t: number): Point }) => samples.reduce((acc, t) => acc + s.eval(t).Y(), 0);
        const before = splines.map(total);
        splines.forEach((s, i) => expect(total(s)).toBe(before[i]));

        splines.forEach(s => pt(s, 1).setCoordinates(-3, 9));
        const reference = make(0);
        reference.forEach(s => pt(s, 1).setCoordinates(-3, 9));
        splines.forEach((s, i) => {
            expect(total(s)).not.toBeCloseTo(before[i], 6);
            expectSameEvaluation(s, reference[i]);
        });

        // alpha changes the knot spacing used by the computed points
        splines.forEach(s => s.setAlpha(0.5));
        reference.forEach(s => s.setAlpha(0.5));
        splines.forEach((s, i) => expectSameEvaluation(s, reference[i]));

        const g1 = splines[1] as G1QuadraticBezierSpline;
        const g1Reference = reference[1] as G1QuadraticBezierSpline;
        g1.eval(0.5);
        g1.setB(0, 2.5);
        g1Reference.setB(0, 2.5);
        expectSameEvaluation(g1, g1Reference);
        expect(g1.getNonFreePoints()[0].X()).toBeCloseTo(g1Reference.getNonFreePoints()[0].X(), 12);
    });

    test('moving a free spline point leaves an unrelated spline cached', () => {
        const a = new GenericBezierSpline(pts(6), 3, 2);
        const b = new GenericBezierSpline(pts(6), 3, 2);
        const bBefore = b.eval(0.5);
        a.eval(0.5);
        pt(a, 2).setCoordinates(3, 7);
        expect(b.eval(0.5)).toBe(bBefore);
    });

    test('PH curve evaluation and offsets follow hodograph and distance changes', () => {
        const w = [new PointImpl(-3.5, -1.7), new PointImpl(-2.6, 1.7)];
        const curve = new PhBezierCurve([new PointImpl(-4.2, -2)], w);
        const other = new PolynomialBezierCurve(pts());
        const otherBefore = other.eval(0.5);
        const before = curve.eval(0.6);
        const offsetBefore = curve.getOffsetCurves()[0].eval(0.6);

        w[1].setCoordinates(0.5, 3);
        expect(curve.eval(0.6).X()).not.toBeCloseTo(before.X(), 6);
        const fresh = new PhBezierCurve([new PointImpl(-4.2, -2)], [new PointImpl(-3.5, -1.7), new PointImpl(0.5, 3)]);
        expectSameEvaluation(curve, fresh);
        expectSameEvaluation(curve.getOffsetCurves()[0], fresh.getOffsetCurves()[0]);

        curve.setOffsetCurveDistance(0.9);
        fresh.setOffsetCurveDistance(0.9);
        expect(curve.getOffsetCurves()[0].eval(0.6).X()).not.toBeCloseTo(offsetBefore.X(), 6);
        expectSameEvaluation(curve.getOffsetCurves()[0], fresh.getOffsetCurves()[0]);
        expect(other.eval(0.5)).toBe(otherBefore);
    });
});

describe('PH inputs version', () => {
    const build = () => {
        const w = [new PointImpl(-3.5, -1.7), new PointImpl(-2.6, 1.7)];
        return {w, base: new PointImpl(-4.2, -2)};
    };

    test('version is not volatile for numeric w, and repeated eval returns the cached point', () => {
        const {w, base} = build();
        const curve = new PhBezierCurve([base], w);
        expect(curve.version()).not.toBe(VOLATILE);
        const first = curve.eval(0.3);
        expect(curve.eval(0.3)).toBe(first);
        const offset = curve.getOffsetCurves()[0];
        expect((offset as RationalBezierCurve).version()).not.toBe(VOLATILE);
        const offsetFirst = offset.eval(0.3);
        expect(offset.eval(0.3)).toBe(offsetFirst);
    });

    test('every mutation path of w, the base point and transforms changes derived control points', () => {
        const {w, base} = build();
        const curve = new PhBezierCurve([base], w);
        const snapshot = () => curve.getPoints().map(p => [p.X(), p.Y()]).flat().concat(curve.eval(0.4).X(), curve.eval(0.4).Y());
        const step = (mutate: () => void) => {
            const version = curve.version();
            const before = snapshot();
            mutate();
            expect(curve.version()).toBeGreaterThan(version);
            const after = snapshot();
            expect(after).not.toEqual(before);
            const fresh = new PhBezierCurve([new PointImpl(base.X(), base.Y())], curve.w.map(q => new PointImpl(q.X(), q.Y())));
            fresh.setOffsetCurveDistance(curve.getOffsetCurveDistance());
            expectSameEvaluation(curve, fresh);
        };
        step(() => w[1].setCoordinates(0.5, 3));
        step(() => w[0].setX(-1));
        step(() => w[0].setY(2));
        step(() => base.setCoordinates(1, 1));
        step(() => { curve.w = [new PointImpl(-1, 0.5), new PointImpl(1, 2)]; });
        step(() => curve.moveFor(1, 2));
        step(() => curve.rotate(0.4));
        step(() => curve.scale(1.5));
    });

    test('offset distance and count changes are observed by cached offset points', () => {
        const {w, base} = build();
        const curve = new PhBezierCurve([base], w);
        const offset = curve.getOffsetCurves()[0];
        const before = offset.eval(0.5).Y();
        curve.setOffsetCurveDistance(1.1);
        expect(offset.eval(0.5).Y()).not.toBeCloseTo(before, 6);
    });

    test('a foreign hodograph point keeps the PH curve volatile and fresh', () => {
        let y = 1;
        const foreign: Point = {
            X: () => -2.6, Y: () => y, setX: () => undefined, setY: () => undefined,
            isXFunction: () => false, isYFunction: () => false,
        };
        const curve = new PhBezierCurve([new PointImpl(-4.2, -2)], [new PointImpl(-3.5, -1.7), foreign]);
        expect(curve.version()).toBe(VOLATILE);
        const before = curve.eval(0.6).Y();
        y = 4;
        expect(curve.eval(0.6).Y()).not.toBeCloseTo(before, 6);
    });
});

describe('O(1) version reads between mutations', () => {
    function countingDependency() {
        const state = {reads: 0, version: nextVersion()};
        return {
            state,
            dependency: {version: () => { state.reads++; return state.version; }},
            bump: () => { state.version = nextVersion(); },
        };
    }

    test('a computed point does not rescan its dependencies until a stamp is taken', () => {
        const {state, dependency, bump} = countingDependency();
        let value = 1;
        const p = new PointImpl(() => value, 0, [dependency]);
        expect(p.X()).toBe(1);
        const reads = state.reads;
        for (let i = 0; i < 10; i++) {
            p.version();
            p.X();
        }
        expect(state.reads).toBe(reads);

        value = 2;
        bump();
        expect(p.X()).toBe(2);
        expect(state.reads).toBeGreaterThan(reads);
    });

    test('mutations of unrelated objects rescan once but observe nothing new', () => {
        const {state, dependency} = countingDependency();
        const p = new PointImpl(() => 1, 0, [dependency]);
        const v = p.version();
        new PointImpl(0, 0).setX(1);
        const reads = state.reads;
        expect(p.version()).toBe(v);
        expect(p.version()).toBe(v);
        expect(state.reads).toBe(reads + 1);
    });

    test('curve versions are memoized and still observe point moves, structure and volatility', () => {
        const a = new PointImpl(0, 0);
        const spy = countingDependency();
        const curve = new PolynomialBezierCurve([a, new PointImpl(1, 1), new PointImpl(() => 2, 0, [spy.dependency])]);
        const v = curve.version();
        const reads = spy.state.reads;
        curve.version();
        curve.eval(0.5);
        expect(spy.state.reads).toBe(reads);

        a.setX(3);
        expect(curve.version()).toBeGreaterThan(v);
        const v2 = curve.version();
        curve.addPoint(new PointImpl(4, 4));
        expect(curve.version()).toBeGreaterThan(v2);

        const volatileCurve = new PolynomialBezierCurve([a, new PointImpl(() => 1, 0)]);
        expect(volatileCurve.version()).toBe(VOLATILE);
        expect(volatileCurve.version()).toBe(VOLATILE);
    });

    test('PH inputs version is memoized and a hodograph drag is still observed', () => {
        const w = [new PointImpl(-3.5, -1.7), new PointImpl(-2.6, 1.7)];
        const curve = new PhBezierCurve([new PointImpl(-4.2, -2)], w);
        const first = curve.eval(0.4);
        expect(curve.eval(0.4)).toBe(first);
        const v = curve.version();
        expect(curve.version()).toBe(v);
        w[0].setCoordinates(-1, 1);
        expect(curve.version()).toBeGreaterThan(v);
        expect(curve.eval(0.4)).not.toBe(first);
    });
});
