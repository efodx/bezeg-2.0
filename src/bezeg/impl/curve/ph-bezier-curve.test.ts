import {PhBezierCurve} from './ph-bezier-curve';
import {PointImpl} from '../point/point-impl';
import {geometryCache} from '../../cache/GeometryCache';

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

    test('a hodograph drag followed by a cache invalidation is reflected', () => {
        const w = presets[1][2].map(([x, y]) => new PointImpl(x, y));
        const curve = new PhBezierCurve([new PointImpl(1, -1)], w);
        const before = curve.arcLength();
        w[1].setCoordinates(0.2, -6);
        geometryCache.invalidate();
        expect(curve.arcLength()).toBeGreaterThan(before);
    });
});
