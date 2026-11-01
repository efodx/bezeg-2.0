import {describe, expect, it} from 'vitest';
import {powerOfPoint, type Circle} from './circle';
import type {GridPoint} from './grid';
import {Rational, RationalPoint} from './rational';
import {feet, gliderPoint, pedalAreaInexact, pedalOrient, SIMSON_GLIDER_TOLERANCE, type Feet} from './simson';

const R = (n: number, d = 1) => Rational.of(n, d);
const pt = (x: number, y: number, dx = 1, dy = 1) => new RationalPoint(R(x, dx), R(y, dy));
const grid = (x: number, y: number): GridPoint => ({x, y});

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

// Python-derived data (exact Fractions, script outside the repo): T1 triangle A(0,0) B(7,0) C(2,5), S = 35/2, O = (7/2,3/2), R^2 = 29/2.
const A = grid(0, 0);
const B = grid(7, 0);
const C = grid(2, 5);
const CIRCLE: Circle = {centre: pt(7, 3, 2, 2), r2: R(29, 2)};
const LATTICE: readonly (readonly [number, number])[] = [[0, 0], [0, 3], [2, -2], [2, 5], [5, -2], [5, 5], [7, 0], [7, 3]];

function footsOf(p: RationalPoint, a = A, b = B, c = C): Feet {
    const result = feet(p, a, b, c);
    if (result.kind !== 'feet') throw new Error('expected feet');
    return result;
}

function det(p: RationalPoint, a = A, b = B, c = C): Rational {
    const result = pedalOrient(p, a, b, c);
    if (result.kind !== 'value') throw new Error('expected a value');
    return result.value;
}

function expectFeet(result: Feet, expected: readonly (readonly [Rational, Rational])[]): void {
    expect(result.feet.map(f => [f.x.format(), f.y.format()])).toEqual(expected.map(([x, y]) => [x.format(), y.format()]));
}

describe('feet of the perpendiculars (acceptance 3)', () => {
    it('matches the two feet triples listed for T4, in the order bc, ca, ab', () => {
        const p = footsOf(pt(2, -2));
        expectFeet(p, [[R(11, 2), R(3, 2)], [R(-12, 29), R(-30, 29)], [R(2), R(0)]]);
        expect(p.distinctCount).toBe(3);
        expect(p.coincident).toEqual([]);
        expectFeet(footsOf(pt(0, 3)), [[R(2), R(5)], [R(30, 29), R(75, 29)], [R(0), R(0)]]);
    });

    it('gives orient exactly 0 for each of the eight lattice points of the circumcircle', () => {
        expect(LATTICE).toHaveLength(8);
        for (const [x, y] of LATTICE) {
            expect(powerOfPoint(pt(x, y), CIRCLE).isZero()).toBe(true);
            expect(det(pt(x, y)).isZero()).toBe(true);
        }
    });

    it('reports coinciding feet for a vertex P', () => {
        const atA = footsOf(pt(0, 0));
        expectFeet(atA, [[R(7, 2), R(7, 2)], [R(0), R(0)], [R(0), R(0)]]);
        expect(atA.coincident).toEqual([[1, 2]]);
        expect(atA.distinctCount).toBe(2);
        const atB = footsOf(pt(7, 0));
        expectFeet(atB, [[R(7), R(0)], [R(28, 29), R(70, 29)], [R(7), R(0)]]);
        expect(atB.coincident).toEqual([[0, 2]]);
        const atC = footsOf(pt(2, 5));
        expectFeet(atC, [[R(2), R(5)], [R(2), R(5)], [R(2), R(0)]]);
        expect(atC.coincident).toEqual([[0, 1]]);
        for (const p of [pt(0, 0), pt(7, 0), pt(2, 5)]) expect(det(p).isZero()).toBe(true);
    });

    it('draws the feet on the side LINES, outside the segment when needed', () => {
        // (-12/29, -30/29) lies on line CA but outside the segment (negative coordinates, the segment is in the first quadrant).
        const result = footsOf(pt(2, -2));
        expect(result.feet[1].x.sign()).toBe(-1);
        expect(result.feet[1].y.sign()).toBe(-1);
    });

    it('puts every foot on its line with a perpendicular direction, for arbitrary rational P', () => {
        const random = seeded(3);
        const sides: readonly (readonly [GridPoint, GridPoint])[] = [[B, C], [C, A], [A, B]];
        for (let i = 0; i < 40; i++) {
            const p = pt(Math.floor(random() * 41) - 20, Math.floor(random() * 41) - 20, 1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6));
            const result = footsOf(p);
            result.feet.forEach((f, index) => {
                const [u, v] = sides[index];
                const direction = RationalPoint.fromGrid(v).sub(RationalPoint.fromGrid(u));
                expect(f.sub(RationalPoint.fromGrid(u)).cross(direction).isZero()).toBe(true);
                expect(p.sub(f).dot(direction).isZero()).toBe(true);
            });
        }
    });

    it('is zero exactly on the circumcircle over a 41 x 41 window, and |orient| = S |power| / (2 R^2) everywhere', () => {
        let zeros = 0;
        const factor = R(35, 2).div(R(2).mul(CIRCLE.r2)); // S / (2 R^2)
        for (let x = -20; x <= 20; x++) {
            for (let y = -20; y <= 20; y++) {
                const value = det(pt(x, y));
                const power = powerOfPoint(pt(x, y), CIRCLE);
                expect(value.isZero()).toBe(power.isZero());
                const absolute = value.sign() < 0 ? value.neg() : value;
                const absolutePower = power.sign() < 0 ? power.neg() : power;
                expect(absolute.equals(factor.mul(absolutePower))).toBe(true);
                if (value.isZero()) zeros++;
            }
        }
        expect(zeros).toBe(LATTICE.length);
    });

    it('gives the exact value 140/29 for the grid point (1,1) off the circle (power -8)', () => {
        expect(det(pt(1, 1)).equals(R(140, 29))).toBe(true);
        expect(powerOfPoint(pt(1, 1), CIRCLE).equals(R(-8))).toBe(true);
    });

    it('returns Degenerate for collinear or coincident vertices and rejects off-grid vertices', () => {
        expect(feet(pt(1, 2), grid(0, 0), grid(1, 1), grid(3, 3)).kind).toBe('degenerate');
        expect(pedalOrient(pt(1, 2), grid(1, 1), grid(1, 1), grid(4, 0)).kind).toBe('degenerate');
        expect(() => feet(pt(1, 2), grid(0.5, 0), B, C)).toThrow(RangeError);
    });
});

describe('glider tolerance (acceptance 4)', () => {
    const triangles: readonly (readonly [GridPoint, GridPoint, GridPoint])[] = [[A, B, C], [grid(-3, 1), grid(6, -2), grid(1, 8)]];

    it('names the tolerance 1e-9', () => {
        expect(SIMSON_GLIDER_TOLERANCE).toBe(1e-9);
    });

    it('observes a maximum pedal area at least 1e6 times smaller than the tolerance over 2000 seeded glider positions', () => {
        for (const [a, b, c] of triangles) {
            const random = seeded(2026);
            let maxRelative = 0;
            for (let i = 0; i < 2000; i++) {
                const p = gliderPoint(a, b, c, random() * 2 * Math.PI);
                if (p.kind === 'degenerate') throw new Error('proper triangle expected');
                const result = pedalAreaInexact(p, a, b, c);
                if (result.kind !== 'area') throw new Error('expected an area');
                expect(result.collinear).toBe(true);
                expect(result.inexact).toBe(true);
                maxRelative = Math.max(maxRelative, result.relative);
            }
            expect(maxRelative * 1e6).toBeLessThanOrEqual(SIMSON_GLIDER_TOLERANCE);
        }
    });

    it('gives a nonzero area, "not collinear", for the offsets +-0.001, +-0.01, +-0.05, +-0.2 and matches |R^2 - OP^2| / (4 R^2)', () => {
        const expectedPositive: Readonly<Record<string, number>> = {'0.001': 0.0005, '0.01': 0.005025, '0.05': 0.025625, '0.2': 0.11};
        const o = {x: 3.5, y: 1.5};
        const r2 = 14.5;
        for (const epsilon of [0.001, -0.001, 0.01, -0.01, 0.05, -0.05, 0.2, -0.2]) {
            for (const t of [0, 0.7, 2.1, 4.4]) {
                const p = gliderPoint(A, B, C, t, epsilon);
                if (p.kind === 'degenerate') throw new Error('proper triangle expected');
                const result = pedalAreaInexact(p, A, B, C);
                if (result.kind !== 'area') throw new Error('expected an area');
                expect(result.area).toBeGreaterThan(0);
                expect(result.collinear).toBe(false);
                const op2 = (p.x - o.x) ** 2 + (p.y - o.y) ** 2;
                expect(Math.abs(result.relative - Math.abs(r2 - op2) / (4 * r2))).toBeLessThan(1e-13);
                if (epsilon > 0) expect(result.relative).toBeCloseTo(expectedPositive[String(epsilon)], 3);
            }
        }
    });

    it('reads the spec values 0.000500, 0.005025, 0.025625, 0.110 to their printed precision', () => {
        const values = [[0.001, 0.0005, 6], [0.01, 0.005025, 6], [0.05, 0.025625, 6], [0.2, 0.11, 3]] as const;
        for (const [epsilon, expected, digits] of values) {
            const p = gliderPoint(A, B, C, 1.234, epsilon);
            if (p.kind === 'degenerate') throw new Error('proper triangle expected');
            const result = pedalAreaInexact(p, A, B, C);
            if (result.kind !== 'area') throw new Error('expected an area');
            expect(result.relative).toBeCloseTo(expected, digits);
        }
    });

    it('treats a grid point off the circle as not collinear and a degenerate triangle as degenerate', () => {
        const off = pedalAreaInexact({x: 1, y: 1}, A, B, C);
        if (off.kind !== 'area') throw new Error('expected an area');
        expect(off.relative).toBeCloseTo(4 / 29, 14); // exact: area (70/29) over S (35/2)
        expect(off.collinear).toBe(false);
        expect(pedalAreaInexact({x: 1, y: 1}, grid(0, 0), grid(1, 1), grid(3, 3)).kind).toBe('degenerate');
        expect(gliderPoint(grid(0, 0), grid(1, 1), grid(3, 3), 0).kind).toBe('degenerate');
    });

    it('rejects non-finite glider input', () => {
        expect(() => gliderPoint(A, B, C, Number.NaN)).toThrow(RangeError);
        expect(() => gliderPoint(A, B, C, 0, -1)).toThrow(RangeError);
        expect(() => pedalAreaInexact({x: Number.POSITIVE_INFINITY, y: 0}, A, B, C)).toThrow(RangeError);
    });
});
