import {PhBezierCurve} from './ph-bezier-curve';
import {PointImpl} from '../point/point-impl';

const presets: Array<[string, number[], number[][]]> = [
    ['cubic', [-4.2, -2], [[-3.5, -1.7], [-2.6, 1.7]]],
    ['quintic', [1, -1], [[-3.3, 0], [0.2, -4], [2, -3.2]]],
];

const build = (start: number[], w: number[][]) =>
    new PhBezierCurve([new PointImpl(start[0], start[1])], w.map(([x, y]) => new PointImpl(x, y)));

/** |r'(t)| from the control points via the Bezier derivative n * sum dP_k B_k^{n-1}(t). */
function speed(curve: PhBezierCurve, t: number): number {
    const p = curve.getPoints();
    const n = p.length - 1;
    let binomial = 1, x = 0, y = 0;
    for (let k = 0; k < n; k++) {
        if (k > 0) binomial *= (n - 1 - k + 1) / k;
        const b = binomial * (1 - t) ** (n - 1 - k) * t ** k;
        x += b * (p[k + 1].X() - p[k].X());
        y += b * (p[k + 1].Y() - p[k].Y());
    }
    return n * Math.hypot(x, y);
}

function simpson(f: (t: number) => number, a: number, b: number, intervals = 4000): number {
    const h = (b - a) / intervals;
    let sum = f(a) + f(b);
    for (let i = 1; i < intervals; i++) sum += f(a + i * h) * (i % 2 ? 4 : 2);
    return sum * h / 3;
}

describe.each(presets)('PH arc length (%s default preset)', (_name, start, w) => {
    test('s(0) = 0 and s is monotone increasing', () => {
        const curve = build(start, w);
        expect(curve.s(0)).toBeCloseTo(0, 12);
        let previous = curve.s(0);
        for (let i = 1; i <= 200; i++) {
            const value = curve.s(i / 200);
            expect(value).toBeGreaterThan(previous);
            previous = value;
        }
    });

    test('sigma(t) equals |r\'(t)|', () => {
        const curve = build(start, w);
        for (let i = 0; i <= 50; i++) {
            const t = i / 50;
            expect(Math.abs(curve.sigma(t) - speed(curve, t))).toBeLessThanOrEqual(1e-9);
        }
    });

    test('s(1) equals the numerical integral of |r\'(t)|', () => {
        const curve = build(start, w);
        const expected = simpson(t => speed(curve, t), 0, 1);
        expect(Math.abs(curve.s(1) - expected)).toBeLessThanOrEqual(1e-6);
        expect(curve.arcLength()).toBe(curve.s(1));
        // Intermediate values too: s(t) = integral of speed on [0, t].
        expect(Math.abs(curve.s(0.37) - simpson(t => speed(curve, t), 0, 0.37))).toBeLessThanOrEqual(1e-6);
    });
});

describe('PH arc length freshness', () => {
    test('s(1) updates when w is replaced or a w point is moved', () => {
        const curve = build(presets[0][1], presets[0][2]);
        const before = curve.arcLength();

        curve.w = [new PointImpl(-1, 0), new PointImpl(1, 1)];
        const replaced = curve.arcLength();
        expect(replaced).not.toBeCloseTo(before, 3);
        expect(Math.abs(replaced - simpson(t => speed(curve, t), 0, 1))).toBeLessThanOrEqual(1e-6);

        const moved = new PointImpl(2, 0);
        curve.w = [new PointImpl(-1, 0), moved];
        const beforeMove = curve.arcLength();
        moved.setCoordinates(4, 3);
        const afterMove = curve.arcLength();
        expect(afterMove).not.toBeCloseTo(beforeMove, 3);
        expect(Math.abs(afterMove - simpson(t => speed(curve, t), 0, 1))).toBeLessThanOrEqual(1e-6);
    });

    test('replacing w with a different number of points rebuilds the curve like a fresh one', () => {
        const [, start, cubicW] = presets[0];
        const [, , quinticW] = presets[1];
        const curve = build(start, cubicW);
        curve.setOffsetCurveNumber(2);
        curve.arcLength(); // warm the s / sigma caches at degree 3

        curve.w = quinticW.map(([x, y]) => new PointImpl(x, y));
        const fresh = build(start, quinticW);
        fresh.setOffsetCurveNumber(2);

        expect(curve.degree).toBe(5);
        expect(curve.getPoints()).toHaveLength(6);
        expect(curve.getOffsetCurves()).toHaveLength(2);
        expect(curve.arcLength()).toBeCloseTo(fresh.arcLength(), 12);
        for (const t of [0, 0.3, 0.77, 1]) {
            expect(curve.eval(t).X()).toBeCloseTo(fresh.eval(t).X(), 12);
            expect(curve.eval(t).Y()).toBeCloseTo(fresh.eval(t).Y(), 12);
            expect(curve.sigma(t)).toBeCloseTo(fresh.sigma(t), 12);
            expect(curve.getOffsetCurves()[1].eval(t).X()).toBeCloseTo(fresh.getOffsetCurves()[1].eval(t).X(), 12);
        }
    });

    test('a hodograph drag followed by a cache invalidation is reflected', () => {
        const w = presets[1][2].map(([x, y]) => new PointImpl(x, y));
        const curve = new PhBezierCurve([new PointImpl(1, -1)], w);
        const before = curve.arcLength();
        w[1].setCoordinates(0.2, -6);
        expect(curve.arcLength()).toBeGreaterThan(before);
    });
});

describe('PH similarity transforms', () => {
    const boxCenter = (curve: PhBezierCurve) => {
        const [minX, maxX, minY, maxY] = curve.getBoundingBox();
        return [(minX + maxX) / 2, (minY + maxY) / 2];
    };
    const centroid = (curve: PhBezierCurve) => {
        const p = curve.getPoints();
        return [p.reduce((s, q) => s + q.X(), 0) / p.length, p.reduce((s, q) => s + q.Y(), 0) / p.length];
    };

    test.each([0.5, 0.8, 1.2, 2])('scale(%s) scales by that factor about the bounding-box center', factor => {
        const curve = build(presets[1][1], presets[1][2]);
        const [cx, cy] = boxCenter(curve);
        const [minX, maxX, minY, maxY] = curve.getBoundingBox();
        const length = curve.arcLength();
        curve.scale(factor);
        const [nx, ny] = boxCenter(curve);
        expect(nx).toBeCloseTo(cx, 9);
        expect(ny).toBeCloseTo(cy, 9);
        const [a, b, c, d] = curve.getBoundingBox();
        expect(b - a).toBeCloseTo(factor * (maxX - minX), 9);
        expect(d - c).toBeCloseTo(factor * (maxY - minY), 9);
        expect(curve.arcLength()).toBeCloseTo(factor * length, 9);
        // still a PH curve: sigma is the speed
        for (const t of [0, 0.4, 1]) {
            expect(Math.abs(curve.sigma(t) - speed(curve, t))).toBeLessThanOrEqual(1e-9);
        }
    });

    test.each([0.3, 1, -2])('rotate(%s) keeps centroid and arc length and turns the start tangent', theta => {
        const curve = build(presets[1][1], presets[1][2]);
        const [cx, cy] = centroid(curve);
        const length = curve.arcLength();
        const [p0, p1] = curve.getPoints();
        const angle = Math.atan2(p1.Y() - p0.Y(), p1.X() - p0.X());
        curve.rotate(theta);
        const [nx, ny] = centroid(curve);
        expect(nx).toBeCloseTo(cx, 9);
        expect(ny).toBeCloseTo(cy, 9);
        expect(curve.arcLength()).toBeCloseTo(length, 9);
        const [q0, q1] = curve.getPoints();
        const turned = Math.atan2(q1.Y() - q0.Y(), q1.X() - q0.X()) - angle;
        expect(Math.cos(turned)).toBeCloseTo(Math.cos(theta), 9);
        expect(Math.sin(turned)).toBeCloseTo(Math.sin(theta), 9);
    });
});

describe('PH tk', () => {
    test('t_k reaches arc length k * ds and is increasing', () => {
        const curve = build(presets[0][1], presets[0][2]);
        const ds = curve.arcLength() / 10;
        let t = 0;
        for (let k = 1; k <= 9; k++) {
            const next = curve.tk(t, ds, k);
            expect(next).toBeGreaterThan(t);
            expect(curve.s(next)).toBeCloseTo(k * ds, 6);
            t = next;
        }
    });

    test('returns the previous parameter instead of NaN where the speed is zero (cusp)', () => {
        // w(t) = t, so r'(0) = 0 and the curve starts with a cusp.
        const curve = build([0, 0], [[0, 0], [1, 0]]);
        expect(curve.sigma(0)).toBeCloseTo(0, 12);
        expect(curve.tk(0, 0.1, 1)).toBe(0);
    });
});
