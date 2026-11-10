import {describe, expect, it} from 'vitest';
import {intersectLineCircle, lineThrough, lineValue, type Line} from './circle';
import {Rational, RationalPoint} from './rational';
import {
    angleBetweenDirections, angleBetweenLines, distance, distanceSquared, explicitForm, footOfPerpendicular,
    interceptForm, intersectLines, normalizeLine, parallel, perpendicular, project, sameLine,
} from './lineForms';

const R = (n: number, d = 1) => Rational.of(n, d);
const P = (x: number, y: number) => RationalPoint.fromGrid({x, y});
const line = (a: number, b: number, c: number): Line => ({kind: 'line', a: R(a), b: R(b), c: R(c)});
const through = (p: RationalPoint, q: RationalPoint): Line => {
    const l = lineThrough(p, q);
    if (l.kind !== 'line') throw new Error('degenerate');
    return l;
};
const triple = (l: Line) => [l.a, l.b, l.c].map((r) => r.format()).join(',');

/** Seeded deterministic generator (mulberry32). */
function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const next = rng(20261110);
const coord = () => Math.floor(next() * 17) - 8;

/** Hand-written integer determinant: sign of (Q-P) x (X-P) for grid P, Q and rational X, no lineValue. */
function sideDet(p: {x: number; y: number}, q: {x: number; y: number}, X: RationalPoint): bigint {
    const dx = BigInt(q.x - p.x);
    const dy = BigInt(q.y - p.y);
    const left = dx * (X.y.num - BigInt(p.y) * X.y.den) * X.x.den;
    const right = dy * (X.x.num - BigInt(p.x) * X.x.den) * X.y.den;
    return left - right;
}
/** Integer dot of (X - T) with the grid direction (Q-P); zero means perpendicular. */
function perpDot(p: {x: number; y: number}, q: {x: number; y: number}, F: RationalPoint, t: {x: number; y: number}): bigint {
    const dx = BigInt(q.x - p.x);
    const dy = BigInt(q.y - p.y);
    return (BigInt(t.x) * F.x.den - F.x.num) * dx * F.y.den + (BigInt(t.y) * F.y.den - F.y.num) * dy * F.x.den;
}

const l1 = () => through(P(-2, 1), P(4, 4));

describe('L1 forms', () => {
    it('matches the checked numbers', () => {
        const raw = l1();
        expect(triple(raw)).toBe('3,-6,-12');
        expect(triple(normalizeLine(raw))).toBe('1,-2,-4');
        const e = explicitForm(raw);
        if (e.vertical) throw new Error('not vertical');
        expect(e.k.format()).toBe('1/2');
        expect(e.n.format()).toBe('2');
        const ic = interceptForm(raw);
        expect(ic?.m.format()).toBe('-4');
        expect(ic?.n.format()).toBe('2');
    });
    it('vertical line is accepted and never divides by zero', () => {
        const v = through(P(3, -1), P(3, 5));
        expect(triple(normalizeLine(v))).toBe('1,0,3');
        const e = explicitForm(v);
        expect(e.vertical).toBe(true);
        if (e.vertical) expect(e.x0.format()).toBe('3');
        expect(interceptForm(v)).toBeUndefined();
    });
    it('missing intercepts give undefined', () => {
        expect(interceptForm(line(1, -1, 0))).toBeUndefined(); // through the origin, both 0
        expect(interceptForm(line(0, 1, 2))).toBeUndefined(); // parallel to x axis
        expect(interceptForm(line(1, 0, 2))).toBeUndefined(); // parallel to y axis
        expect(interceptForm(line(0, 1, 0))).toBeUndefined();
    });
    it('normalizes signs, fractions and the horizontal line', () => {
        expect(triple(normalizeLine(line(-3, 6, 12)))).toBe('1,-2,-4');
        expect(triple(normalizeLine(line(0, -2, 4)))).toBe('0,1,-2');
        const frac: Line = {kind: 'line', a: R(1, 2), b: R(-1), c: R(-2)};
        expect(triple(normalizeLine(frac))).toBe('1,-2,-4');
        expect(() => normalizeLine(line(0, 0, 1))).toThrow(RangeError);
    });
    it('equal lines from different point pairs have equal normalized triples', () => {
        const a = normalizeLine(through(P(-8, -8), P(-2, -6)));
        const b = normalizeLine(through(P(-2, -6), P(4, -4)));
        expect(triple(a)).toBe(triple(b));
        expect(interceptForm(a)?.n.format()).toBe('-16/3');
        expect(interceptForm(b)?.n.format()).toBe('-16/3');
    });
    it('counter-example: unnormalized doubles give different intercepts for one line', () => {
        const dbl = (p: [number, number], q: [number, number]) => {
            const k = (q[1] - p[1]) / (q[0] - p[0]);
            return p[1] - k * p[0]; // y-intercept from the double slope through p
        };
        const first = dbl([-8, -8], [-2, -6]);
        const second = dbl([-2, -6], [4, -4]);
        // Spec L1: -5.333333333333334 against -5.333333333333333 for the same line.
        expect(first).toBe(-5.333333333333334);
        expect(second).toBe(-5.333333333333333);
        expect(first).not.toBe(second);
    });
    it('normalization is idempotent (property)', () => {
        for (let i = 0; i < 300; i++) {
            const p = P(coord(), coord());
            const q = P(coord(), coord());
            const l = lineThrough(p, q);
            if (l.kind !== 'line') continue;
            const once = normalizeLine(l);
            expect(triple(normalizeLine(once))).toBe(triple(once));
            expect(sameLine(l, once)).toBe(true);
        }
    });
});

describe('L2 parallel, perpendicular, same', () => {
    it('checked numbers', () => {
        const n = normalizeLine(l1());
        const L = line(2, 1, 4); // 2x + y = 4 passes through T=(3,-2)
        expect(lineValue(L, P(3, -2)).isZero()).toBe(true);
        expect(perpendicular(n, L)).toBe(true);
        expect(parallel(n, line(1, -2, 3))).toBe(true);
        expect(sameLine(n, line(1, -2, 3))).toBe(false);
        expect(sameLine(n, line(-3, 6, 12))).toBe(true);
    });
    it('vertical and horizontal are perpendicular; a line is parallel to itself', () => {
        expect(perpendicular(line(1, 0, 3), line(0, 1, 7))).toBe(true);
        expect(parallel(line(1, 0, 3), line(0, 1, 7))).toBe(false);
        expect(parallel(l1(), l1())).toBe(true);
    });
    it('no tolerance: nearly parallel integer lines are not parallel', () => {
        expect(parallel(line(1000000, 999999, 0), line(999999, 999998, 0))).toBe(false);
        expect(parallel(line(1000000, 1000000, 0), line(1, 1, 5))).toBe(true);
    });
    it('exact predicates agree with brute-force on all grid directions', () => {
        for (let a1 = -3; a1 <= 3; a1++) for (let b1 = -3; b1 <= 3; b1++) {
            if (a1 === 0 && b1 === 0) continue;
            for (let a2 = -3; a2 <= 3; a2++) for (let b2 = -3; b2 <= 3; b2++) {
                if (a2 === 0 && b2 === 0) continue;
                for (let c1 = 0; c1 <= 2; c1++) for (let c2 = 0; c2 <= 2; c2++) {
                    const A = line(a1, b1, c1);
                    const B = line(a2, b2, c2);
                    expect(parallel(A, B)).toBe(a1 * b2 - a2 * b1 === 0);
                    expect(perpendicular(A, B)).toBe(a1 * a2 + b1 * b2 === 0);
                    // Same line: all 2x2 minors of the two triples vanish.
                    const same = a1 * b2 - a2 * b1 === 0 && a1 * c2 - a2 * c1 === 0 && b1 * c2 - b2 * c1 === 0;
                    expect(sameLine(A, B)).toBe(same);
                }
            }
        }
    });
    it('no tolerance: huge coefficients with cross product -1 are not parallel', () => {
        // Slope angles of these lines agree to about 1e-18 in doubles; the exact cross product is -1.
        expect(parallel(line(1000000000, 999999999, 0), line(999999999, 999999998, 0))).toBe(false);
        expect(parallel(line(1000000000, -1, 0), line(1000000000, 0, 0))).toBe(false);
    });
});

describe('L4 distance, projection and foot', () => {
    const n = normalizeLine(l1()); // x - 2y = -4
    const T = P(3, -2);
    it('checked numbers', () => {
        expect(distanceSquared(n, T).format()).toBe('121/5');
        expect(distance(n, T)).toBeCloseTo(4.91935, 5);
        expect(distance(n, T)).toBe(Math.sqrt(121 / 5));
        const F = footOfPerpendicular(n, T);
        expect(F.x.format()).toBe('4/5');
        expect(F.y.format()).toBe('12/5');
        expect(project(P(5, -3), P(1, -2)).x.format()).toBe('11/5');
        expect(project(P(5, -3), P(1, -2)).y.format()).toBe('-22/5');
    });
    it('foot for an unnormalized line is the same point', () => {
        expect(footOfPerpendicular(l1(), T).equals(footOfPerpendicular(n, T))).toBe(true);
        expect(distanceSquared(l1(), T).format()).toBe('121/5');
    });
    it('a point on the line has distance 0 and is its own foot', () => {
        const on = P(-4, 0);
        expect(sideDet({x: -2, y: 1}, {x: 4, y: 4}, on)).toBe(0n);
        expect(distanceSquared(n, on).isZero()).toBe(true);
        expect(footOfPerpendicular(n, on).equals(on)).toBe(true);
        expect(distance(n, on)).toBe(0);
    });
    it('projection onto a zero vector throws', () => {
        expect(() => project(P(1, 1), P(0, 0))).toThrow(RangeError);
    });
    it('property: foot on the line, FT perpendicular, distance squared equals |T-F|^2', () => {
        let count = 0;
        for (let i = 0; i < 400; i++) {
            const p = {x: coord(), y: coord()};
            const q = {x: coord(), y: coord()};
            const t = {x: coord(), y: coord()};
            const l = lineThrough(RationalPoint.fromGrid(p), RationalPoint.fromGrid(q));
            if (l.kind !== 'line') continue;
            count++;
            const T0 = RationalPoint.fromGrid(t);
            const F = footOfPerpendicular(l, T0);
            expect(sideDet(p, q, F)).toBe(0n);
            expect(perpDot(p, q, F, t)).toBe(0n);
            expect(distanceSquared(l, T0).equals(T0.sub(F).dot(T0.sub(F)))).toBe(true);
            expect(distanceSquared(l, T0).isZero()).toBe(sideDet(p, q, T0) === 0n);
        }
        expect(count).toBeGreaterThan(300);
    });
    it('property: project is the component along w and the remainder is orthogonal', () => {
        for (let i = 0; i < 200; i++) {
            const v = P(coord(), coord());
            const w = P(coord(), coord());
            if (w.dot(w).isZero()) continue;
            const proj = project(v, w);
            expect(v.sub(proj).dot(w).isZero()).toBe(true);
            expect(proj.cross(w).isZero()).toBe(true);
        }
    });
});

describe('L3 angle', () => {
    const deg = (r: number) => (r * 180) / Math.PI;
    it('checked numbers', () => {
        const a = angleBetweenDirections(P(2, 1), P(1, 3));
        expect(a.dot.format()).toBe('5');
        expect(a.cross.format()).toBe('5');
        expect(a.radians).toBe(Math.PI / 4); // atan2 is exact here; acos of the normalized dot is 1 ulp off
        const b = angleBetweenDirections(P(4, 1), P(1, 3));
        expect(b.dot.format()).toBe('7');
        expect(b.cross.format()).toBe('11');
        expect(deg(b.radians)).toBeCloseTo(57.5288, 4);
        expect(deg(angleBetweenDirections(P(2, 1), P(1, 0)).radians)).toBeCloseTo(26.5651, 4);
    });
    it('is acute: a direction and its negative or a supplement give the same angle', () => {
        const base = angleBetweenDirections(P(2, 1), P(1, 3)).radians;
        expect(angleBetweenDirections(P(2, 1), P(-1, -3)).radians).toBe(base);
        expect(angleBetweenDirections(P(-2, -1), P(1, 3)).radians).toBe(base);
        const obtuse = angleBetweenDirections(P(1, 0), P(-1, 1)); // 135 deg between vectors, 45 between lines
        expect(deg(obtuse.radians)).toBeCloseTo(45, 12);
    });
    it('perpendicular only when the integer dot is 0, parallel gives exactly 0', () => {
        const perp = angleBetweenDirections(P(1, 2), P(-2, 1));
        expect(perp.dot.isZero()).toBe(true);
        expect(perp.radians).toBe(Math.PI / 2);
        const par = angleBetweenDirections(P(1, 2), P(-3, -6));
        expect(par.cross.isZero()).toBe(true);
        expect(par.radians).toBe(0);
        const near = angleBetweenDirections(P(1000000, 1), P(-1, 999999));
        expect(near.dot.isZero()).toBe(false);
    });
    it('between lines uses the directions (-b, a)', () => {
        const ang = angleBetweenLines(normalizeLine(l1()), line(2, 1, 4));
        expect(ang.dot.isZero()).toBe(true);
        expect(ang.radians).toBe(Math.PI / 2);
        expect(angleBetweenLines(line(1, -2, -4), line(1, -2, 3)).radians).toBe(0);
        expect(() => angleBetweenDirections(P(0, 0), P(1, 1))).toThrow(RangeError);
    });
    it('atan2 agrees with acos and with a rotation-based angle away from 0 and 90 degrees', () => {
        for (let i = 0; i < 300; i++) {
            const u = P(coord(), coord());
            const v = P(coord(), coord());
            if (u.dot(u).isZero() || v.dot(v).isZero()) continue;
            const r = angleBetweenDirections(u, v);
            const d = deg(r.radians);
            if (d < 1e-6 || Math.abs(d - 90) < 1e-6) continue;
            const ux = u.x.toNumber(), uy = u.y.toNumber(), vx = v.x.toNumber(), vy = v.y.toNumber();
            const cos = Math.abs(ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
            expect(Math.abs(r.radians - Math.acos(cos))).toBeLessThan(1e-12);
            let rot = Math.abs(Math.atan2(vy, vx) - Math.atan2(uy, ux)) % Math.PI;
            if (rot > Math.PI / 2) rot = Math.PI - rot;
            expect(Math.abs(r.radians - rot)).toBeLessThan(1e-12);
        }
    });
});

describe('L5 intersections', () => {
    it('checked numbers', () => {
        const r = intersectLines(line(1, -2, -4), line(2, 1, 4));
        expect(r.kind).toBe('point');
        if (r.kind === 'point') {
            expect(r.point.x.format()).toBe('4/5');
            expect(r.point.y.format()).toBe('12/5');
        }
    });
    it('parallel and same are exact', () => {
        expect(intersectLines(line(1, -2, -4), line(1, -2, 3)).kind).toBe('parallel');
        expect(intersectLines(line(1, -2, -4), line(-3, 6, 12)).kind).toBe('same');
        expect(intersectLines(line(1, 0, 3), line(2, 0, 6)).kind).toBe('same');
        expect(intersectLines(line(0, 1, 3), line(0, 1, 4)).kind).toBe('parallel');
        expect(() => intersectLines(line(0, 0, 1), line(1, 0, 1))).toThrow(RangeError);
    });
    it('property: the intersection satisfies both equations, kinds agree with the predicates', () => {
        for (let i = 0; i < 400; i++) {
            const pts = [0, 1, 2, 3].map(() => ({x: coord(), y: coord()}));
            const A = lineThrough(RationalPoint.fromGrid(pts[0]), RationalPoint.fromGrid(pts[1]));
            const B = lineThrough(RationalPoint.fromGrid(pts[2]), RationalPoint.fromGrid(pts[3]));
            if (A.kind !== 'line' || B.kind !== 'line') continue;
            const r = intersectLines(A, B);
            if (r.kind === 'point') {
                expect(parallel(A, B)).toBe(false);
                expect(sideDet(pts[0], pts[1], r.point)).toBe(0n);
                expect(sideDet(pts[2], pts[3], r.point)).toBe(0n);
            } else {
                expect(parallel(A, B)).toBe(true);
                expect(r.kind === 'same').toBe(sameLine(A, B));
                if (r.kind === 'same') expect(sideDet(pts[0], pts[1], RationalPoint.fromGrid(pts[2]))).toBe(0n);
            }
        }
    });
    describe('line and circle through intersectLineCircle', () => {
        const centre = P(1, 0);
        const L = line(1, -2, -4); // x - 2y = -4
        const circle = (bx: number, by: number) => ({centre, r2: P(bx, by).sub(centre).dot(P(bx, by).sub(centre))});
        it('tangent, none and two points match the checked numbers', () => {
            const t = intersectLineCircle(L, circle(3, 1));
            expect(t.kind).toBe('tangent');
            if (t.kind === 'tangent') {
                expect(t.exact.x.format()).toBe('0');
                expect(t.exact.y.format()).toBe('2');
            }
            expect(intersectLineCircle(L, circle(3, 0)).kind).toBe('none');
            const two = intersectLineCircle(L, circle(3, 2));
            expect(two.kind).toBe('two');
            if (two.kind === 'two') {
                expect(two.points[0].x).toBeCloseTo(-1.549, 3);
                expect(two.points[0].y).toBeCloseTo(1.225, 3);
                expect(two.points[1].x).toBeCloseTo(1.549, 3);
                expect(two.points[1].y).toBeCloseTo(2.775, 3);
            }
        });
        it('agrees with a numeric scan of |p-c|^2-r^2 along the line', () => {
            for (const [bx, by] of [[3, 1], [3, 0], [3, 2]] as const) {
                const c = circle(bx, by);
                const kind = intersectLineCircle(L, c).kind;
                // points on the line: (2t - 4, t); minimum of the quadratic power over t
                let minPower = Infinity;
                for (let t = -20; t <= 20; t += 1 / 64) {
                    const x = 2 * t - 4 - 1;
                    minPower = Math.min(minPower, x * x + t * t - c.r2.toNumber());
                }
                if (kind === 'none') expect(minPower).toBeGreaterThan(0);
                else if (kind === 'tangent') expect(Math.abs(minPower)).toBeLessThan(1e-9);
                else expect(minPower).toBeLessThan(0);
            }
        });
        it('tangent is decided exactly: distanceSquared equals r2', () => {
            for (let i = 0; i < 300; i++) {
                const p = {x: coord(), y: coord()};
                const q = {x: coord(), y: coord()};
                const l = lineThrough(RationalPoint.fromGrid(p), RationalPoint.fromGrid(q));
                if (l.kind !== 'line') continue;
                const cc = {centre: P(coord(), coord()), r2: R(Math.floor(next() * 20))};
                const kind = intersectLineCircle(l, cc).kind;
                const cmp = distanceSquared(l, cc.centre).compare(cc.r2);
                expect(kind).toBe(cmp === 0 ? 'tangent' : cmp < 0 ? 'two' : 'none');
            }
        });
    });
});

describe('exact bigint range', () => {
    it('stays exact for large grid coordinates', () => {
        const big = 2 ** 24;
        const l = through(P(-big, 1), P(big, 3));
        const F = footOfPerpendicular(l, P(7, 9));
        expect(sideDet({x: -big, y: 1}, {x: big, y: 3}, F)).toBe(0n);
    });
});
