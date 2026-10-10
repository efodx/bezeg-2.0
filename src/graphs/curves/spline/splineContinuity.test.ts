import {GenericBezierSpline} from '../../../bezeg/impl/curve/GenericBezierSpline';
import {C1QuadraticBezierSpline} from '../../../bezeg/impl/curve/C1QuadraticBezierSpline';
import {C2QubicBezierSpline} from '../../../bezeg/impl/curve/C2QubicBezierSpline';
import {BezierSpline} from '../../../bezeg/impl/curve/bezier-spline';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

// Route defaults. The importer reads only the first two numbers of a point, so the
// three-number entries [-1.5, -2, 5] (Cn) and [1, -2, 5] (C2) render as [-1.5, -2] and [1, -2].
const CN = [[-3, 2], [-4, 0.5], [-3.5, -1], [-1.5, -2], [0.5, 0], [2.5, 1.5], [4, -2]];
const C1 = [[-4, 3], [-4, -3], [-1, -3], [-1, 3], [3, 3], [4, -3]];
const C2 = [[-2.7, 1.8], [-4.7, 0.35], [-4.3, -3], [1, -2], [0.2, 1.8], [4, 1], [4.5, -2.3]];

const model = (pts: number[][]) => pts.map(([x, y]) => new PointImpl(x, y));
const cn = (degree: number, continuity: number, pts = CN) => new GenericBezierSpline(model(pts), degree, continuity);
const c1 = (pts = C1) => new C1QuadraticBezierSpline(model(pts));
const c2 = (pts = C2) => new C2QubicBezierSpline(model(pts));

const spans = (spline: BezierSpline): number[] => {
    const u: number[] = (spline as any).getU();
    return u.slice(1).map((value, i) => value - u[i]);
};
const pieces = (spline: BezierSpline) => spline.getUnderlyingCurves().map(c => c.getPoints().map(p => [p.X(), p.Y()]));

const binom = (n: number, k: number): number => k === 0 ? 1 : binom(n, k - 1) * (n - k + 1) / k;
const fall = (n: number, k: number) => { let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; };

/** k-th derivative with respect to the global parameter at the start or end of a piece (n!/(n-k)! * forward difference / span^k). */
function derivative(points: number[][], k: number, span: number, atEnd: boolean): number[] {
    const n = points.length - 1;
    const first = atEnd ? n - k : 0;
    const result = [0, 0];
    for (let j = 0; j <= k; j++) {
        const sign = (k - j) % 2 === 0 ? 1 : -1;
        for (let d = 0; d < 2; d++) result[d] += sign * binom(k, j) * points[first + j][d];
    }
    return result.map(v => v * fall(n, k) / span ** k);
}

const junctionGap = (spline: BezierSpline, junction: number, k: number) => {
    const all = pieces(spline), s = spans(spline);
    const left = derivative(all[junction], k, s[junction], true);
    const right = derivative(all[junction + 1], k, s[junction + 1], false);
    return Math.hypot(left[0] - right[0], left[1] - right[1]);
};

const junctions = (spline: BezierSpline) => pieces(spline).length - 1;

describe('junction spans on the route defaults (alpha = 0)', () => {
    test('every piece spans 1/(number of pieces) for Cn, C1 and C2', () => {
        for (const spline of [cn(2, 1), cn(3, 2), c1(), c2()]) {
            const s = spans(spline);
            s.forEach(v => expect(v).toBeCloseTo(1 / s.length, 12));
        }
    });

    test('piece counts of the route defaults', () => {
        expect(pieces(cn(2, 1)).length).toBe(5);
        expect(pieces(c1()).length).toBe(4);
        expect(pieces(c2()).length).toBe(4);
    });
});

describe('C1 quadratic spline', () => {
    test.each([[0], [1]])('first derivatives agree at every junction (alpha %p)', alpha => {
        const spline = c1();
        spline.setAlpha(alpha);
        expect(junctions(spline)).toBe(3);
        for (let j = 0; j < junctions(spline); j++) expect(junctionGap(spline, j, 1)).toBeLessThan(1e-9);
    });

    test('uniform knots put the derived junction points at segment midpoints', () => {
        const spline = c1();
        const derived = spline.getNonFreePoints();
        expect(derived.length).toBe(3);
        derived.forEach((p, i) => {
            expect(p.X()).toBeCloseTo((C1[i + 1][0] + C1[i + 2][0]) / 2, 12);
            expect(p.Y()).toBeCloseTo((C1[i + 1][1] + C1[i + 2][1]) / 2, 12);
        });
    });

    test('second derivatives generally differ (the spline is C1, not C2)', () => {
        const spline = c1();
        const gaps = Array.from({length: junctions(spline)}, (_, j) => junctionGap(spline, j, 2));
        expect(Math.max(...gaps)).toBeGreaterThan(1e-3);
    });

    test('moving a control point changes only nearby pieces', () => {
        const before = pieces(c1());
        const moved = C1.map(p => [...p]);
        moved[0] = [-5, 4];
        const afterFirst = pieces(c1(moved));
        expect(afterFirst[0]).not.toEqual(before[0]);
        afterFirst.slice(1).forEach((piece, i) => expect(piece).toEqual(before[i + 1]));

        const movedLast = C1.map(p => [...p]);
        movedLast[5] = [5, 2];
        const afterLast = pieces(c1(movedLast));
        expect(afterLast[3]).not.toEqual(before[3]);
        afterLast.slice(0, 3).forEach((piece, i) => expect(piece).toEqual(before[i]));
    });
});

describe('C2 cubic spline', () => {
    test.each([[0], [1]])('first and second derivatives agree at every junction (alpha %p)', alpha => {
        const spline = c2();
        spline.setAlpha(alpha);
        expect(junctions(spline)).toBe(3);
        for (let j = 0; j < junctions(spline); j++) {
            expect(junctionGap(spline, j, 1)).toBeLessThan(1e-9);
            expect(junctionGap(spline, j, 2)).toBeLessThan(1e-9);
        }
    });

    test('third derivatives generally differ (the spline is C2, not C3)', () => {
        const spline = c2();
        const gaps = Array.from({length: junctions(spline)}, (_, j) => junctionGap(spline, j, 3));
        expect(Math.max(...gaps)).toBeGreaterThan(1e-3);
    });

    test('moving a control point changes only nearby pieces', () => {
        const before = pieces(c2());
        const first = C2.map(p => [...p]); first[0] = [-3, 3];
        const afterFirst = pieces(c2(first));
        expect(afterFirst[0]).not.toEqual(before[0]);
        expect(afterFirst[2]).toEqual(before[2]);
        expect(afterFirst[3]).toEqual(before[3]);

        const last = C2.map(p => [...p]); last[6] = [5, -3];
        const afterLast = pieces(c2(last));
        expect(afterLast[3]).not.toEqual(before[3]);
        expect(afterLast[0]).toEqual(before[0]);
        expect(afterLast[1]).toEqual(before[1]);
    });
});

describe('Cn spline (degree n, continuity r)', () => {
    // (3, 1) needs 8 points to fill its last piece; the route's 7 points leave a quadratic tail (see the test below).
    const CN8 = [...CN, [5, 0]];
    test.each([[2, 1, CN], [3, 1, CN8], [3, 2, CN], [4, 3, CN]])('degree %p continuity %p: derivatives up to r agree, order r+1 does not', (n, r, points) => {
        const spline = cn(n as number, r as number, points as number[][]);
        spline.getUnderlyingCurves().forEach(piece => expect(piece.getPoints().length).toBe((n as number) + 1));
        const count = junctions(spline);
        expect(count).toBeGreaterThanOrEqual(2);
        let worstNext = 0;
        for (let j = 0; j < count; j++) {
            for (let k = 1; k <= r; k++) expect(junctionGap(spline, j, k)).toBeLessThan(1e-8);
            const right = pieces(spline)[j + 1];
            if (right.length - 1 > r) worstNext = Math.max(worstNext, junctionGap(spline, j, r + 1));
        }
        expect(worstNext).toBeGreaterThan(1e-3);
    });

    test('known limitation: a last piece with fewer than degree+1 points is only G1 (extrapolation assumes degree n)', () => {
        const spline = cn(3, 1);
        const all = pieces(spline), s = spans(spline);
        expect(all[all.length - 1].length).toBe(3);
        expect(junctionGap(spline, 1, 1)).toBeGreaterThan(1);
        // Tangent directions still agree.
        const a = derivative(all[1], 1, s[1], true), b = derivative(all[2], 1, s[2], false);
        expect(a[0] * b[1] - a[1] * b[0]).toBeCloseTo(0, 9);
    });

    test('continuity also holds for non-uniform knots (alpha = 1) using the actual spans', () => {
        const spline = cn(3, 2);
        spline.setAlpha(1);
        for (let j = 0; j < junctions(spline); j++) {
            expect(junctionGap(spline, j, 1)).toBeLessThan(1e-8);
            expect(junctionGap(spline, j, 2)).toBeLessThan(1e-8);
        }
    });

    test('the junction point itself is shared (C0)', () => {
        const all = pieces(cn(3, 1));
        for (let j = 0; j < all.length - 1; j++) expect(all[j][all[j].length - 1]).toEqual(all[j + 1][0]);
    });

    test('changing a free point of one piece changes every later piece but no earlier one (thesis Slika 24)', () => {
        const before = pieces(cn(2, 1));
        const moved = CN.map(p => [...p]); moved[3] = [-1, -3];
        const after = pieces(cn(2, 1, moved));
        expect(after[0]).toEqual(before[0]);
        after.slice(1).forEach((piece, i) => expect(piece).not.toEqual(before[i + 1]));
    });

    test('a locally changed C1 spline leaves later pieces alone (contrast to Cn)', () => {
        const before = pieces(c1());
        const moved = C1.map(p => [...p]); moved[2] = [-1, -4];
        const after = pieces(c1(moved));
        expect(after[3]).toEqual(before[3]);
    });
});
