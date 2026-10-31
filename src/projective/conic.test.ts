import {describe, expect, it} from 'vitest';
import {equal, hom, isIdeal, lineAtInfinity, point} from './homogeneous';
import {
    classify,
    conic,
    determinantSign,
    discriminant,
    intersectLine,
    matrix,
    onConic,
    pointsAtInfinity,
    polar,
    pole,
    side,
    tangentPoints,
    type Conic,
} from './conic';

// Oracles are hand-computed numbers from docs/tasks/projective-conics/02-conic-kernel.md and the spec (K3, K5),
// or formulas written out here (the 3x3 determinant by cofactor expansion on plain bigints).
const ellipse = conic(9, 0, 25, 0, 0, -225); // 9x^2 + 25y^2 = 225
const circle = conic(1, 0, 1, 0, 0, -1);
const parabola = conic(0, 0, 1, -4, 0, 0); // y^2 = 4x
const hyperbola = conic(16, 0, -9, 0, 0, -144);

/** det of the doubled matrix 2M by explicit expansion; equals 8 det M. */
function det8(c: Conic): bigint {
    const [A, B, C, D, E, F] = c;
    return 2n * A * (2n * C * 2n * F - E * E) - B * (B * 2n * F - E * D) + D * (B * E - 2n * C * D);
}

describe('classify', () => {
    it.each([
        ['ellipse', ellipse, 'ellipse'],
        ['circle', circle, 'circle'],
        ['parabola', parabola, 'parabola'],
        ['hyperbola', hyperbola, 'hyperbola'],
        ['line pair xy', conic(0, 1, 0, 0, 0, 0), 'line-pair'],
        ['parallel lines x^2-1', conic(1, 0, 0, 0, 0, -1), 'parallel-lines'],
        ['double line x^2', conic(1, 0, 0, 0, 0, 0), 'double-line'],
        ['point x^2+y^2', conic(1, 0, 1, 0, 0, 0), 'point'],
        ['empty x^2+y^2+1', conic(1, 0, 1, 0, 0, 1), 'empty'],
        ['empty x^2+1', conic(1, 0, 0, 0, 0, 1), 'empty'],
        ['rotated ellipse x^2+xy+y^2=3', conic(1, 1, 1, 0, 0, -3), 'ellipse'],
        ['line pair x^2-y^2', conic(1, 0, -1, 0, 0, 0), 'line-pair'],
    ] as const)('%s', (_name, c, type) => {
        expect(classify(c)).toBe(type);
    });

    it('is independent of the overall sign', () => {
        expect(classify([-1n, 0n, -1n, 0n, 0n, -1n])).toBe('empty');
        expect(classify([-9n, 0n, -25n, 0n, 0n, 225n])).toBe('ellipse');
        expect(classify([-1n, 0n, 0n, 0n, 0n, 1n])).toBe('parallel-lines');
    });

    it('K5 family at c = 2, 1, 0: determinant -1 (-8 for 2M), types and discriminants', () => {
        const family = (c: number) => conic(1, 0, c * c - 1, 0, 2 * c, 1);
        const cases: [number, string, bigint][] = [
            [2, 'ellipse', -12n],
            [1, 'parabola', 0n],
            [0, 'hyperbola', 4n],
        ];
        for (const [c, type, disc] of cases) {
            expect(classify(family(c))).toBe(type);
            expect(discriminant(family(c))).toBe(disc);
            expect(det8(family(c))).toBe(-8n);
            expect(determinantSign(family(c))).toBe(-1);
        }
        // c = 1/2 scaled by 4: hyperbola
        expect(classify(conic(4, 0, -3, 0, 4, 4))).toBe('hyperbola');
    });

    it('rejects the zero conic and non-integers', () => {
        expect(() => conic(0, 0, 0, 0, 0, 0)).toThrow(RangeError);
        expect(() => conic(0.5, 0, 0, 0, 0, 1)).toThrow(RangeError);
    });

    it('matrix is the doubled symmetric matrix', () => {
        expect(matrix(conic(1, 2, 3, 4, 5, 6))).toEqual([
            [2n, 2n, 4n],
            [2n, 6n, 5n],
            [4n, 5n, 12n],
        ]);
    });
});

describe('onConic and side', () => {
    it('ellipse regions decided exactly', () => {
        expect(onConic(ellipse, point(5, 0))).toBe(true);
        expect(onConic(ellipse, hom(20, 9, 5))).toBe(true); // (4, 9/5)
        expect(side(ellipse, hom(5, 21, 5))).toBe('outside'); // 1/25 + 441/225 = 2 > 1
        expect(side(ellipse, point(0, 0))).toBe('inside');
        expect(side(ellipse, hom(20, 9, 5))).toBe('on');
        // a point 1e-18 beyond the curve is still decided: x = 5 + 1e-18
        expect(side(ellipse, hom(5n * 10n ** 18n + 1n, 0n, 10n ** 18n))).toBe('outside');
        expect(side(ellipse, hom(5n * 10n ** 18n - 1n, 0n, 10n ** 18n))).toBe('inside');
    });

    it('hyperbola and parabola interiors contain the foci', () => {
        expect(side(hyperbola, point(5, 0))).toBe('inside'); // focus (5,0) of 16x^2-9y^2=144
        expect(side(hyperbola, point(0, 5))).toBe('outside');
        expect(side(parabola, point(1, 0))).toBe('inside'); // focus of y^2 = 4x
        expect(side(parabola, point(0, 5))).toBe('outside');
    });

    it('degenerate conics have no inside', () => {
        expect(side(conic(0, 1, 0, 0, 0, 0), point(1, 1))).toBe('degenerate');
    });
});

describe('polar and pole (K3)', () => {
    const P = hom(5, 21, 5); // (1, 21/5)
    const T1 = hom(20, 9, 5); // (4, 9/5)
    const T2 = hom(-15, 12, 5); // (-3, 12/5)

    it('polar of P is x/25 + 7y/15 = 1, i.e. 3x + 35y - 75 = 0, through T1 and T2', () => {
        const r = polar(ellipse, P);
        if (r.status !== 'ok') throw new Error('expected ok');
        expect(equal(r.line, hom(3, 35, -75))).toBe(true);
        for (const t of [T1, T2]) {
            expect(r.line[0] * t[0] + r.line[1] * t[1] + r.line[2] * t[2]).toBe(0n);
        }
    });

    it('tangents at T1 and T2 meet at P: the polar of T is the tangent', () => {
        const t1 = polar(ellipse, T1);
        const t2 = polar(ellipse, T2);
        if (t1.status !== 'ok' || t2.status !== 'ok') throw new Error('expected ok');
        // 4x/25 + y/5 = 1 -> 4x + 5y - 25 = 0 ; -3x/25 + 4y/15 = 1 -> -9x + 20y - 75 = 0
        expect(equal(t1.line, hom(4, 5, -25))).toBe(true);
        expect(equal(t2.line, hom(-9, 20, -75))).toBe(true);
        for (const l of [t1.line, t2.line]) expect(l[0] * P[0] + l[1] * P[1] + l[2] * P[2]).toBe(0n);
    });

    it('polar of (1,0,0) is x = 0; pole of the line at infinity is the centre', () => {
        const r = polar(ellipse, hom(1, 0, 0));
        if (r.status !== 'ok') throw new Error('expected ok');
        expect(equal(r.line, hom(1, 0, 0))).toBe(true);
        const c = pole(ellipse, lineAtInfinity());
        if (c.status !== 'ok') throw new Error('expected ok');
        expect(equal(c.point, point(0, 0))).toBe(true);
        const shifted = conic(9, 0, 25, -18, -50, -191); // 9(x-1)^2 + 25(y-1)^2 = 225, centre (1,1)
        const c2 = pole(shifted, lineAtInfinity());
        if (c2.status !== 'ok') throw new Error('expected ok');
        expect(equal(c2.point, point(1, 1))).toBe(true);
    });

    it('parabola: pole of the line at infinity is the ideal point of its axis', () => {
        const r = pole(parabola, lineAtInfinity());
        if (r.status !== 'ok') throw new Error('expected ok');
        expect(isIdeal(r.point)).toBe(true);
        expect(equal(r.point, hom(1, 0, 0))).toBe(true);
    });

    it('pole inverts polar, and degenerate conics are reported', () => {
        let checked = 0;
        for (const c of [ellipse, hyperbola, parabola, conic(1, 1, 1, 0, 0, -3)]) {
            for (const p of [point(2, 3), hom(1, 2, 0), hom(7, -3, 5), point(0, 0)]) {
                const l = polar(c, p);
                if (l.status !== 'ok') continue;
                const back = pole(c, l.line);
                expect(back.status === 'ok' && equal(back.point, p)).toBe(true);
                checked++;
            }
        }
        expect(checked).toBe(16);
        expect(pole(conic(0, 1, 0, 0, 0, 0), point(1, 1)).status).toBe('singular');
        expect(polar(conic(0, 1, 0, 0, 0, 0), point(0, 0)).status).toBe('indeterminate');
    });
});

describe('intersectLine', () => {
    it('rational: two points, tangent, none', () => {
        const two = intersectLine(ellipse, hom(0, 1, 0));
        expect(two.status).toBe('two');
        if (two.status === 'two') {
            const [a, b] = two.points;
            const ok =
                (equal(a, point(5, 0)) && equal(b, point(-5, 0))) || (equal(a, point(-5, 0)) && equal(b, point(5, 0)));
            expect(ok).toBe(true);
        }
        const tan = intersectLine(ellipse, hom(1, 0, -5));
        expect(tan.status === 'tangent' && equal(tan.point, point(5, 0))).toBe(true);
        expect(intersectLine(ellipse, hom(1, 0, -6)).status).toBe('none');
    });

    it('irrational intersections are typed, with approximations within the stated tolerance', () => {
        const r = intersectLine(circle, hom(1, -1, 0)); // y = x: (+-sqrt(1/2), +-sqrt(1/2))
        expect(r.status).toBe('irrational');
        if (r.status !== 'irrational') return;
        expect(r.tolerance).toBeGreaterThan(0);
        const h = Math.SQRT1_2;
        const xs = r.approx.map((p) => (p.kind === 'finite' ? p.x : NaN)).sort((a, b) => a - b);
        expect(Math.abs(xs[0] + h)).toBeLessThan(r.tolerance);
        expect(Math.abs(xs[1] - h)).toBeLessThan(r.tolerance);
        for (const p of r.approx) if (p.kind === 'finite') expect(Math.abs(p.x - p.y)).toBeLessThan(r.tolerance);
    });

    it('a perfect-square discriminant is rational', () => {
        const r = intersectLine(conic(1, 0, 1, 0, 0, -25), hom(1, 0, -3)); // x = 3 on x^2+y^2=25: y = +-4
        expect(r.status).toBe('two');
    });

    it('a line inside a degenerate conic is contained', () => {
        expect(intersectLine(conic(0, 1, 0, 0, 0, 0), hom(0, 1, 0)).status).toBe('contained');
    });

    it('K3: irrational tangent points are numeric, the decision outside is exact', () => {
        const r = tangentPoints(circle, point(2, 0)); // tangency points (1/2, +-sqrt(3)/2)
        expect(r.status).toBe('outside');
        if (r.status !== 'outside' || r.tangency.status !== 'irrational') throw new Error('expected irrational');
        const ys = r.tangency.approx.map((p) => (p.kind === 'finite' ? p.y : NaN)).sort((a, b) => a - b);
        expect(Math.abs(ys[0] + Math.sqrt(3) / 2)).toBeLessThan(1e-9);
        expect(Math.abs(ys[1] - Math.sqrt(3) / 2)).toBeLessThan(1e-9);
    });

    it('K3: rational tangent points are exact and the K3 default points are returned', () => {
        const r = tangentPoints(ellipse, hom(5, 21, 5));
        if (r.status !== 'outside' || r.tangency.status !== 'two') throw new Error('expected two');
        const [a, b] = r.tangency.points;
        const T1 = hom(20, 9, 5);
        const T2 = hom(-15, 12, 5);
        expect((equal(a, T1) && equal(b, T2)) || (equal(a, T2) && equal(b, T1))).toBe(true);
        const circ = tangentPoints(conic(1, 0, 1, 0, 0, -9), point(5, 0)); // tangency (9/5, +-12/5)
        expect(circ.status === 'outside' && circ.tangency.status === 'two').toBe(true);
    });

    it('tangentPoints: inside, on, degenerate', () => {
        expect(tangentPoints(ellipse, point(0, 0)).status).toBe('inside');
        const on = tangentPoints(ellipse, point(5, 0));
        expect(on.status === 'on' && equal(on.point, point(5, 0))).toBe(true);
        expect(tangentPoints(conic(0, 1, 0, 0, 0, 0), point(1, 1)).status).toBe('degenerate');
    });
});

describe('pointsAtInfinity', () => {
    it('0, 1 or 2 real ideal points, never complex', () => {
        expect(pointsAtInfinity(ellipse).status).toBe('none');
        expect(pointsAtInfinity(circle).status).toBe('none');
        const par = pointsAtInfinity(parabola);
        expect(par.status === 'tangent' && equal(par.point, hom(1, 0, 0))).toBe(true);
        const hyp = pointsAtInfinity(conic(1, 0, -1, 0, 0, -1)); // x^2 - y^2 = 1: directions (1,1) and (1,-1)
        expect(hyp.status).toBe('two');
        if (hyp.status === 'two') {
            const [a, b] = hyp.points;
            const fwd = equal(a, hom(1, 1, 0)) && equal(b, hom(1, -1, 0));
            const rev = equal(a, hom(1, -1, 0)) && equal(b, hom(1, 1, 0));
            expect(fwd || rev).toBe(true);
            expect(isIdeal(a) && isIdeal(b)).toBe(true);
        }
    });

    it('irrational asymptotic directions are typed, ideal and approximate', () => {
        const r = pointsAtInfinity(conic(1, 0, -2, 0, 0, -2)); // x^2 - 2y^2 = 2: dx/dy = +-sqrt(2)
        expect(r.status).toBe('irrational');
        if (r.status !== 'irrational') return;
        const ratios = r.approx.map((p) => (p.kind === 'ideal' ? p.dx / p.dy : NaN)).sort((a, b) => a - b);
        expect(Math.abs(ratios[0] + Math.SQRT2)).toBeLessThan(1e-9);
        expect(Math.abs(ratios[1] - Math.SQRT2)).toBeLessThan(1e-9);
    });

    it('a conic containing the line at infinity reports it', () => {
        expect(pointsAtInfinity(conic(0, 0, 0, 1, 0, 0)).status).toBe('contained');
    });
});
