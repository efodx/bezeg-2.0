import {describe, expect, it} from 'vitest';
import {circleInversion} from '../analysis/complexMobius';
import {
    angleBetween, circlePoint, circumcircle, intersectCircles, intersectLineCircle, invertExact, isCircle, isLine,
    lineThrough, lineValue, powerOfPoint, thalesDot,
    type Circle, type CircleCircleIntersection, type GeneralizedCircle, type Line, type LineCircleIntersection,
} from './circle';
import type {GridPoint} from './grid';
import {Rational, RationalPoint} from './rational';

const R = (n: number, d = 1) => Rational.of(n, d);
const pt = (x: number, y: number, dx = 1, dy = 1) => new RationalPoint(R(x, dx), R(y, dy));
const circle = (cx: number, cy: number, r2: number): Circle => ({centre: pt(cx, cy), r2: R(r2)});
const grid = (x: number, y: number): GridPoint => ({x, y});
const deg = (radians: number) => radians * 180 / Math.PI;

/** Deterministic generator (mulberry32). */
function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Hand/Python-derived data (script outside the repo, exact Fractions): T1 triangle A(0,0) B(7,0) C(2,5).
const A = grid(0, 0);
const B = grid(7, 0);
const C = grid(2, 5);
const T1_CIRCLE: Circle = {centre: pt(7, 3, 2, 2), r2: R(29, 2)};
const T1_LATTICE: readonly (readonly [number, number])[] = [[0, 0], [0, 3], [2, -2], [2, 5], [5, -2], [5, 5], [7, 0], [7, 3]];

function twoPoints(result: LineCircleIntersection | CircleCircleIntersection) {
    if (result.kind !== 'two') throw new Error(`expected two points, got ${result.kind}`);
    return result.points;
}

describe('circle and line types', () => {
    it('tells circles from lines', () => {
        const shapes: GeneralizedCircle[] = [circle(0, 0, 1), {kind: 'line', a: R(1), b: R(0), c: R(2)}];
        expect(shapes.map(isCircle)).toEqual([true, false]);
        expect(shapes.map(isLine)).toEqual([false, true]);
    });

    it('builds the line through two points exactly and rejects coincident points', () => {
        const line = lineThrough(pt(0, 0), pt(1, 1));
        if (line.kind !== 'line') throw new Error('expected a line');
        expect(lineValue(line, pt(5, 5)).isZero()).toBe(true);
        expect(lineValue(line, pt(1, 0)).sign()).not.toBe(0);
        expect(lineValue(line, pt(1, 0)).sign()).toBe(-lineValue(line, pt(0, 1)).sign());
        expect(lineThrough(pt(3, 4), pt(3, 4)).kind).toBe('degenerate');
    });

    it('treats the triangle kernel circumcircle as the same exact circle', () => {
        const result = circumcircle(A, B, C);
        if (result.kind !== 'circle') throw new Error('expected a circle');
        expect(result.centre.equals(T1_CIRCLE.centre)).toBe(true);
        expect(result.r2.equals(T1_CIRCLE.r2)).toBe(true);
        expect(circumcircle(grid(0, 0), grid(1, 1), grid(3, 3)).kind).toBe('degenerate');
    });
});

describe('power of a point (acceptance 1)', () => {
    it('is exact on the T5 secant example: P = (0,0), centre (5,0), radius 3 gives 16', () => {
        const power = powerOfPoint(pt(0, 0), circle(5, 0, 9));
        expect(power.equals(R(16))).toBe(true);
        expect(powerOfPoint(pt(5, 0), circle(5, 0, 9)).equals(R(-9))).toBe(true);
        expect(powerOfPoint(pt(8, 0), circle(5, 0, 9)).isZero()).toBe(true);
    });

    it('keeps a rational remainder exact', () => {
        // |(1/3,1/2) - (0,0)|^2 - 1/7 = 1/9 + 1/4 - 1/7 = (28 + 63 - 36)/252 = 55/252
        const power = powerOfPoint(pt(1, 1, 3, 2), {centre: pt(0, 0), r2: R(1, 7)});
        expect(power.equals(R(55, 252))).toBe(true);
    });

    it('makes power times orient an integer on every point of a 41 x 41 window for the T1 triangle', () => {
        const orientValue = 35n; // (7-0)(5-0) - (0-0)(2-0)
        let zeros = 0;
        for (let x = -20; x <= 20; x++) {
            for (let y = -20; y <= 20; y++) {
                const power = powerOfPoint(pt(x, y), T1_CIRCLE);
                const scaled = power.mul(Rational.fromBigInt(orientValue));
                expect(scaled.den).toBe(1n);
                // Stronger for T1: O = (7/2, 3/2) and R^2 = 29/2 make the power x^2 + y^2 - 7x - 3y, an integer,
                // so a grid point off the circle is at least 1 away in power.
                expect(power.den).toBe(1n);
                if (scaled.isZero()) zeros++;
                else expect(Math.abs(power.toNumber())).toBeGreaterThanOrEqual(1);
            }
        }
        // The eight lattice points listed in the spec are the only grid points on the circle in the window.
        expect(zeros).toBe(T1_LATTICE.length);
        for (const [x, y] of T1_LATTICE) expect(powerOfPoint(pt(x, y), T1_CIRCLE).isZero()).toBe(true);
    });

    it('is exact off the circle', () => {
        // |(1,1) - (7/2,3/2)|^2 - 29/2 = 25/4 + 1/4 - 29/2 = -8
        expect(powerOfPoint(pt(1, 1), T1_CIRCLE).equals(R(-8))).toBe(true);
    });
});

describe('line-circle intersection (acceptance 2)', () => {
    it('returns the two secant points (2,0) and (8,0) with product 16 for the T5 example', () => {
        const axis = lineThrough(pt(0, 0), pt(1, 0));
        if (axis.kind !== 'line') throw new Error('expected a line');
        const [first, second] = twoPoints(intersectLineCircle(axis, circle(5, 0, 9)));
        expect(first.inexact).toBe(true);
        expect(first.x).toBeCloseTo(2, 14);
        expect(first.y).toBeCloseTo(0, 14);
        expect(second.x).toBeCloseTo(8, 14);
        expect(second.y).toBeCloseTo(0, 14);
        expect(first.x * second.x).toBeCloseTo(16, 12);
    });

    it('orders the points along the line direction (-b, a)', () => {
        const diagonal = lineThrough(pt(0, 0), pt(1, 1));
        if (diagonal.kind !== 'line') throw new Error('expected a line');
        const [first, second] = twoPoints(intersectLineCircle(diagonal, circle(0, 0, 2)));
        expect(first.x).toBeCloseTo(-1, 14);
        expect(first.y).toBeCloseTo(-1, 14);
        expect(second.x).toBeCloseTo(1, 14);
        expect(second.y).toBeCloseTo(1, 14);
    });

    it('decides tangent and none exactly, with the exact tangent point', () => {
        const unit = circle(0, 0, 1);
        const vertical = (c: Rational): Line => ({kind: 'line', a: R(1), b: R(0), c});
        const tangent = intersectLineCircle(vertical(R(1)), unit);
        if (tangent.kind !== 'tangent') throw new Error('expected tangent');
        expect(tangent.exact.equals(pt(1, 0))).toBe(true);
        expect(tangent.point).toEqual({x: 1, y: 0, inexact: true});
        // Tangent at a rational foot: line 3x + 4y = 5 touches the unit circle at (3/5, 4/5).
        const slanted = intersectLineCircle({kind: 'line', a: R(3), b: R(4), c: R(5)}, unit);
        if (slanted.kind !== 'tangent') throw new Error('expected tangent');
        expect(slanted.exact.equals(pt(3, 4, 5, 5))).toBe(true);
        expect(intersectLineCircle({kind: 'line', a: R(0), b: R(1), c: R(4)}, circle(5, 0, 9)).kind).toBe('none');
        expect(intersectLineCircle({kind: 'line', a: R(0), b: R(1), c: R(3)}, circle(5, 0, 9)).kind).toBe('tangent');
    });

    it('stays exact where doubles cannot tell the cases apart', () => {
        const unit = circle(0, 0, 1);
        const scale = 10n ** 20n;
        const line = (offset: bigint): Line => ({kind: 'line', a: R(1), b: R(0), c: Rational.fromBigInt(scale + offset, scale)});
        expect(intersectLineCircle(line(-1n), unit).kind).toBe('two');
        expect(intersectLineCircle(line(0n), unit).kind).toBe('tangent');
        expect(intersectLineCircle(line(1n), unit).kind).toBe('none');
    });

    it('rejects a line without a normal and a circle with negative squared radius', () => {
        expect(() => intersectLineCircle({kind: 'line', a: R(0), b: R(0), c: R(1)}, circle(0, 0, 1))).toThrow(RangeError);
        expect(() => intersectLineCircle({kind: 'line', a: R(1), b: R(0), c: R(0)}, circle(0, 0, -1))).toThrow(RangeError);
    });
});

describe('circle-circle intersection (acceptance 2)', () => {
    it('finds the two points of the T5 angle example, right of the directed line of centres first', () => {
        const [right, left] = twoPoints(intersectCircles(circle(3, 0, 1), circle(3, 1, 1)));
        expect(right.x).toBeCloseTo(3 + Math.sqrt(3) / 2, 14);
        expect(right.y).toBeCloseTo(0.5, 14);
        expect(left.x).toBeCloseTo(3 - Math.sqrt(3) / 2, 14);
        expect(left.x).toBeCloseTo(2.134, 3);
        expect(left.y).toBeCloseTo(0.5, 14);
        // Radii to the common point meet at 60 degrees (equilateral triangle of centres and point).
        const angle = angleBetween(left, {x: 3, y: 0}, {x: 3, y: 1});
        expect(deg(angle ?? NaN)).toBeCloseTo(60, 12);
    });

    it('decides external and internal tangency exactly', () => {
        const external = intersectCircles(circle(0, 0, 1), circle(2, 0, 1));
        const internal = intersectCircles(circle(0, 0, 4), circle(1, 0, 1));
        if (external.kind !== 'tangent' || internal.kind !== 'tangent') throw new Error('expected tangents');
        expect(external.exact.equals(pt(1, 0))).toBe(true);
        expect(internal.exact.equals(pt(2, 0))).toBe(true);
    });

    it('decides tangency of circles with irrational radii exactly (radii sqrt2 and sqrt8, centres 3sqrt2 apart)', () => {
        const tangent = intersectCircles(circle(0, 0, 2), circle(3, 3, 8));
        if (tangent.kind !== 'tangent') throw new Error('expected tangent');
        expect(tangent.exact.equals(pt(1, 1))).toBe(true);
        expect(intersectCircles(circle(0, 0, 2), circle(3, 3, 9)).kind).toBe('two');
        expect(intersectCircles(circle(0, 0, 2), circle(3, 3, 7)).kind).toBe('none');
    });

    it('reports none for separated and nested circles, and handles concentric ones', () => {
        expect(intersectCircles(circle(0, 0, 1), circle(3, 0, 1)).kind).toBe('none');
        expect(intersectCircles(circle(0, 0, 9), circle(1, 0, 1)).kind).toBe('none');
        expect(intersectCircles(circle(0, 0, 9), circle(0, 0, 1)).kind).toBe('none');
        expect(intersectCircles(circle(1, 1, 5), circle(1, 1, 5)).kind).toBe('coincident');
    });

    it('puts every returned point on both circles to double precision', () => {
        const first = circle(1, 2, 13);
        const second = circle(-2, 5, 20);
        for (const point of twoPoints(intersectCircles(first, second))) {
            expect((point.x - 1) ** 2 + (point.y - 2) ** 2).toBeCloseTo(13, 12);
            expect((point.x + 2) ** 2 + (point.y - 5) ** 2).toBeCloseTo(20, 12);
        }
    });
});

describe('Thales and the inscribed angle (acceptance 5)', () => {
    const O = new RationalPoint(R(4), R(3));
    const THALES: Circle = {centre: O, r2: R(25)};
    const P0 = pt(0, 0);
    const P1 = pt(8, 6);

    it('gives exact dot product 0 for every lattice point on the circle with diameter (0,0)-(8,6)', () => {
        const lattice: RationalPoint[] = [];
        for (let x = -5; x <= 15; x++) {
            for (let y = -5; y <= 15; y++) {
                if (powerOfPoint(pt(x, y), THALES).isZero()) lattice.push(pt(x, y));
            }
        }
        expect(lattice).toHaveLength(12); // (4 +- 5, 3), (4, 3 +- 5), (4 +- 3, 3 +- 4), (4 +- 4, 3 +- 3)
        for (const point of lattice) expect(thalesDot(point, P0, P1).isZero()).toBe(true);
        expect(lattice.some(point => point.equals(pt(1, 7)))).toBe(true);
        expect(thalesDot(pt(1, 7), P0, P1).isZero()).toBe(true);
    });

    it('is nonzero for lattice points off the circle (the test is not vacuous)', () => {
        expect(thalesDot(pt(1, 1), P0, P1).equals(R(-12))).toBe(true); // (-1)(7) + (-1)(5)
        expect(thalesDot(pt(4, 3), P0, P1).equals(R(-25))).toBe(true);
    });

    it('reproduces the three T2 angles of the T1 triangle to 1e-4 degrees', () => {
        const O1 = {x: 3.5, y: 1.5};
        expect(deg(angleBetween({x: 2, y: 5}, {x: 0, y: 0}, {x: 7, y: 0}) ?? NaN)).toBeCloseTo(66.8014, 4);
        expect(deg(angleBetween(O1, {x: 0, y: 0}, {x: 7, y: 0}) ?? NaN)).toBeCloseTo(133.6028, 4);
        // (2,-2) is a lattice point of the circumcircle on the other side of AB from C.
        expect(deg(angleBetween({x: 2, y: -2}, {x: 0, y: 0}, {x: 7, y: 0}) ?? NaN)).toBeCloseTo(113.1986, 4);
    });

    it('halves the central angle over 100 glider positions on the major arc and takes the supplement on the minor arc', () => {
        const centre = {x: 3.5, y: 1.5};
        const a = {x: 0, y: 0};
        const b = {x: 7, y: 0};
        const central = angleBetween(centre, a, b);
        if (central === undefined) throw new Error('central angle must exist');
        const random = seeded(11);
        let major = 0;
        let minor = 0;
        for (let guard = 0; guard < 10000 && (major < 100 || minor < 20); guard++) {
            const p = circlePoint(T1_CIRCLE, random() * 2 * Math.PI);
            const inscribed = angleBetween(p, a, b);
            if (inscribed === undefined) continue;
            if (p.y > 0 && major < 100) {
                major++;
                expect(Math.abs(2 * inscribed - central)).toBeLessThan(1e-12);
            } else if (p.y < 0 && minor < 20) {
                minor++;
                expect(Math.abs(inscribed - (Math.PI - central / 2))).toBeLessThan(1e-12);
            }
        }
        expect([major, minor]).toEqual([100, 20]);
    });

    it('is a right angle for every position on a diameter circle and undefined at a chord end', () => {
        const random = seeded(5);
        for (let i = 0; i < 50; i++) {
            const p = circlePoint(THALES, random() * 2 * Math.PI);
            const angle = angleBetween(p, {x: 0, y: 0}, {x: 8, y: 6});
            if (angle !== undefined) expect(Math.abs(angle - Math.PI / 2)).toBeLessThan(1e-12);
        }
        expect(angleBetween({x: 0, y: 0}, {x: 0, y: 0}, {x: 1, y: 0})).toBeUndefined();
        expect(angleBetween({x: 1, y: 0}, {x: 1, y: 0}, {x: 0, y: 0})).toBeUndefined();
    });

    it('rejects non-finite glider parameters', () => {
        expect(() => circlePoint(THALES, Number.NaN)).toThrow(RangeError);
        expect(circlePoint(THALES, 0)).toEqual({x: 9, y: 3, inexact: true});
    });
});

describe('invertExact (acceptance 6)', () => {
    const origin = pt(0, 0);
    const r2 = R(4);
    const image = (x: number, y: number) => invertExact(pt(x, y), origin, r2);

    it('reproduces the T5 images for the inversion circle of radius 2', () => {
        expect(image(1, 1).equals(pt(2, 2))).toBe(true);
        expect(image(1, -1).equals(pt(2, -2))).toBe(true);
        expect(image(2, 0).equals(pt(2, 0))).toBe(true);
        expect(image(4, 0).equals(pt(1, 0))).toBe(true);
        expect(image(3, 1).equals(pt(6, 2, 5, 5))).toBe(true);
    });

    it('sends the circle through the centre to a line and the other circle to the circle (3/2,0) radius 1/2', () => {
        const line: Line = {kind: 'line', a: R(1), b: R(0), c: R(2)};
        for (const [x, y] of [[1, 1], [1, -1], [2, 0]]) expect(lineValue(line, image(x, y)).isZero()).toBe(true);
        const target: Circle = {centre: pt(3, 0, 2, 1), r2: R(1, 4)};
        for (const [x, y] of [[2, 0], [4, 0], [3, 1]]) expect(powerOfPoint(image(x, y), target).isZero()).toBe(true);
    });

    it('maps the orthogonal circle (centre (5,0), radius 3) to itself for r^2 = 16', () => {
        const centre = pt(0, 0);
        const own = circle(5, 0, 9);
        expect(invertExact(pt(2, 0), centre, R(16)).equals(pt(8, 0))).toBe(true);
        expect(invertExact(pt(8, 0), centre, R(16)).equals(pt(2, 0))).toBe(true);
        const mapped = invertExact(pt(5, 3), centre, R(16));
        expect(mapped.equals(pt(40, 24, 17, 17))).toBe(true);
        expect(powerOfPoint(mapped, own).isZero()).toBe(true);
    });

    it('works about a centre other than the origin and is an involution', () => {
        const centre = pt(1, 2);
        // (5,2): offset (4,0), |offset|^2 = 16, image = (1,2) + (5/16)(4,0) = (9/4, 2).
        expect(invertExact(pt(5, 2), centre, R(5)).equals(pt(9, 2, 4, 1))).toBe(true);
        // (3,3) lies on the inversion circle (offset (2,1), squared length 5) and is fixed.
        expect(invertExact(pt(3, 3), centre, R(5)).equals(pt(3, 3))).toBe(true);
        const p = pt(-7, 3, 5, 3);
        expect(invertExact(invertExact(p, centre, R(5)), centre, R(5)).equals(p)).toBe(true);
    });

    it('throws for the centre and for a nonpositive squared radius', () => {
        expect(() => invertExact(origin, origin, r2)).toThrow(RangeError);
        expect(() => invertExact(pt(1, 0), origin, R(0))).toThrow(RangeError);
        expect(() => invertExact(pt(1, 0), origin, R(-1))).toThrow(RangeError);
    });

    it('agrees with the double implementation circleInversion to 1e-12', () => {
        const random = seeded(2024);
        const quarter = () => Math.floor(random() * 33) - 16; // multiples of 1/4 in [-4, 4]
        let compared = 0;
        for (let i = 0; i < 300; i++) {
            const cx = quarter();
            const cy = quarter();
            const px = quarter();
            const py = quarter();
            const radius = 1 + Math.floor(random() * 5);
            const exact = (() => {
                try {
                    return invertExact(pt(px, py, 4, 4), pt(cx, cy, 4, 4), R(radius * radius));
                } catch {
                    return undefined;
                }
            })();
            const drawn = circleInversion({re: px / 4, im: py / 4}, {re: cx / 4, im: cy / 4}, radius);
            if (exact === undefined) {
                expect(cx === px && cy === py).toBe(true);
                expect(drawn.kind).toBe('pole');
                continue;
            }
            if (drawn.kind !== 'point') throw new Error('expected a point');
            expect(Math.abs(drawn.point.re - exact.x.toNumber())).toBeLessThan(1e-12);
            expect(Math.abs(drawn.point.im - exact.y.toNumber())).toBeLessThan(1e-12);
            compared++;
        }
        expect(compared).toBeGreaterThan(280);
    });
});
