import {describe, expect, it} from 'vitest';
import {angleBetween, intersectLineCircle, type Circle, type Line} from '../compgeo/circle';
import {Rational, RationalPoint} from '../compgeo/rational';
import {
    solveTriangle,
    ssaCount,
    triangleFromSolution,
    type SolvedTriangle,
    type SolveResult,
    type SolveSpec,
} from './triangleSolver';

const deg = (r: number) => (r * 180) / Math.PI;
const near = (x: number, y: number, tol = 1e-12) => Math.abs(x - y) <= tol * Math.max(1, Math.abs(x), Math.abs(y));

function one(result: SolveResult): SolvedTriangle {
    if (result.kind !== 'one') throw new Error(`expected one, got ${result.kind}`);
    return result.triangle;
}

/** Sides by distance, angles by angleBetween, area by shoelace and by Heron, all from the vertices. */
function expectReconstructs(t: SolvedTriangle): void {
    const {A, B, C} = triangleFromSolution(t);
    const d = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y);
    const [a, b, c] = [d(B, C), d(C, A), d(A, B)];
    expect(near(a, t.a)).toBe(true);
    expect(near(b, t.b)).toBe(true);
    expect(near(c, t.c)).toBe(true);
    expect(near(angleBetween(A, B, C) as number, t.angleA)).toBe(true);
    expect(near(angleBetween(B, C, A) as number, t.angleB)).toBe(true);
    expect(near(angleBetween(C, A, B) as number, t.angleC)).toBe(true);
    const shoelace = Math.abs(A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) / 2;
    const s = (a + b + c) / 2;
    const heron = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    expect(near(shoelace, t.area)).toBe(true);
    // Heron is ill-conditioned for slivers; a relative 1e-9 floor on the product is enough to compare.
    expect(near(heron, t.area, 1e-9)).toBe(true);
    expect(near(t.angleA + t.angleB + t.angleC, Math.PI)).toBe(true);
}

function expectNoNaN(value: unknown): void {
    expect(JSON.stringify(value, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'BAD' : v))).not.toContain('BAD');
}

describe('TR5 default numbers', () => {
    it('SSS 5,6,7', () => {
        const t = one(solveTriangle({type: 'sss', a: 5, b: 6, c: 7}));
        expect(deg(t.angleA)).toBeCloseTo(44.4153, 4);
        expect(deg(t.angleB)).toBeCloseTo(57.1217, 4);
        expect(deg(t.angleC)).toBeCloseTo(78.463, 4);
        expect(t.area).toBeCloseTo(Math.sqrt(216), 12);
        expectReconstructs(t);
    });

    it('SAS b=5, c=7, A=60', () => {
        const t = one(solveTriangle({type: 'sas', b: 5, c: 7, angleA: 60}));
        expect(t.a * t.a).toBeCloseTo(39, 12);
        expect(t.a).toBeCloseTo(6.245, 3);
        expect(deg(t.angleB)).toBeCloseTo(43.8979, 4);
        expect(deg(t.angleC)).toBeCloseTo(76.1021, 4);
        expectReconstructs(t);
    });

    it('ASA A=40, B=60, c=8 (AAS by the angle sum)', () => {
        const t = one(solveTriangle({type: 'asa', angleA: 40, angleB: 60, c: 8}));
        expect(deg(t.angleC)).toBeCloseTo(80, 10);
        expect(t.a).toBeCloseTo(5.22163, 5);
        expect(t.b).toBeCloseTo(7.03508, 5);
        expectReconstructs(t);
    });

    it('SSA A=30, b=8: a=5 two, a=4 tangent, a=3.5 none, a=8 one, a=9 one', () => {
        const two = solveTriangle({type: 'ssa', a: 5, b: 8, angleA: 30});
        if (two.kind !== 'two') throw new Error('expected two');
        const [t1, t2] = two.triangles;
        expect(t1.c).toBeCloseTo(6.9282 + 3, 4);
        expect(t2.c).toBeCloseTo(6.9282 - 3, 4);
        expect(deg(t1.angleB)).toBeCloseTo(53.1301, 4);
        expect(deg(t1.angleC)).toBeCloseTo(96.8699, 4);
        expect(deg(t2.angleB)).toBeCloseTo(126.8699, 4);
        expect(deg(t2.angleC)).toBeCloseTo(23.1301, 4);
        expect(near(deg(t1.angleB) + deg(t2.angleB), 180, 1e-12)).toBe(true);
        expectReconstructs(t1);
        expectReconstructs(t2);

        const tangent = solveTriangle({type: 'ssa', a: 4, b: 8, angleA: 30});
        if (tangent.kind !== 'one') throw new Error('expected one');
        expect(tangent.tangent).toBe(true);
        expect(deg(tangent.triangle.angleB)).toBeCloseTo(90, 10);
        expect(tangent.triangle.c).toBeCloseTo(4 * Math.sqrt(3), 12);
        expectReconstructs(tangent.triangle);

        expect(solveTriangle({type: 'ssa', a: 3.5, b: 8, angleA: 30})).toEqual({kind: 'none', reason: 'a-below-height'});

        const eq = one(solveTriangle({type: 'ssa', a: 8, b: 8, angleA: 30}));
        expect(deg(eq.angleB)).toBeCloseTo(30, 10);
        expect(deg(eq.angleC)).toBeCloseTo(120, 10);
        expect(eq.c).toBeCloseTo(13.85641, 5);
        expectReconstructs(eq);

        const nine = one(solveTriangle({type: 'ssa', a: 9, b: 8, angleA: 30}));
        expect(nine.c).toBeGreaterThan(0);
        expectReconstructs(nine);
    });
});

describe('inputs and statuses', () => {
    it('rejects inputs outside the grid', () => {
        const bad: SolveSpec[] = [
            {type: 'sss', a: 5.1, b: 6, c: 7},
            {type: 'sss', a: 0, b: 6, c: 7},
            {type: 'sss', a: 12.25, b: 6, c: 7},
            {type: 'sss', a: Number.NaN, b: 6, c: 7},
            {type: 'sas', b: 5, c: 7, angleA: 60.5},
            {type: 'sas', b: 5, c: 7, angleA: 0},
            {type: 'asa', angleA: 40, angleB: 180, c: 8},
            {type: 'asa', angleA: 40, angleB: 60, c: Infinity},
            {type: 'ssa', a: 5, b: 8, angleA: 180},
            {type: 'ssa', a: 5, b: 13, angleA: 30},
        ];
        for (const spec of bad) expect(solveTriangle(spec)).toEqual({kind: 'none', reason: 'out-of-grid'});
        expect(ssaCount(5, 8, 30.5)).toBeUndefined();
        expect(ssaCount(5, 8, 180)).toBeUndefined();
    });

    it('impossible and flat data give a status and no numbers, never NaN', () => {
        expect(solveTriangle({type: 'sss', a: 1, b: 2, c: 4})).toEqual({kind: 'none', reason: 'triangle-inequality'});
        expect(solveTriangle({type: 'sss', a: 1, b: 2, c: 3})).toEqual({kind: 'degenerate'});
        expect(solveTriangle({type: 'asa', angleA: 100, angleB: 80, c: 3})).toEqual({kind: 'none', reason: 'angle-sum'});
        expect(solveTriangle({type: 'asa', angleA: 100, angleB: 90, c: 3})).toEqual({kind: 'none', reason: 'angle-sum'});
        expect(solveTriangle({type: 'ssa', a: 3, b: 8, angleA: 100})).toEqual({kind: 'none', reason: 'a-not-greater-than-b'});
        expect(solveTriangle({type: 'ssa', a: 8, b: 8, angleA: 90})).toEqual({kind: 'none', reason: 'a-not-greater-than-b'});
        expect(solveTriangle({type: 'ssa', a: 2, b: 8, angleA: 77})).toEqual({kind: 'none', reason: 'a-below-height'});
    });

    it('no NaN or non-finite number in any result over the extreme grid corners', () => {
        const sides = [0.25, 0.5, 6, 11.75, 12];
        const angles = [1, 2, 29, 30, 31, 89, 90, 91, 150, 178, 179];
        for (const a of sides) for (const b of sides) {
            for (const c of sides) expectNoNaN(solveTriangle({type: 'sss', a, b, c}));
            for (const A of angles) {
                expectNoNaN(solveTriangle({type: 'ssa', a, b, angleA: A}));
                expectNoNaN(solveTriangle({type: 'sas', b: a, c: b, angleA: A}));
                for (const B of angles) expectNoNaN(solveTriangle({type: 'asa', angleA: A, angleB: B, c: a}));
            }
        }
    });

    it('every solved triangle over a coarse grid is re-measured from its vertices to 1e-12', () => {
        for (let a = 1; a <= 48; a += 5) for (let b = 1; b <= 48; b += 7) {
            for (let c = 1; c <= 48; c += 6) {
                const r = solveTriangle({type: 'sss', a: a / 4, b: b / 4, c: c / 4});
                if (r.kind === 'one') expectReconstructs(r.triangle);
            }
            for (let A = 1; A <= 179; A += 11) {
                const sas = solveTriangle({type: 'sas', b: a / 4, c: b / 4, angleA: A});
                expectReconstructs(one(sas));
                const ssa = solveTriangle({type: 'ssa', a: a / 4, b: b / 4, angleA: A});
                if (ssa.kind === 'one') expectReconstructs(ssa.triangle);
                if (ssa.kind === 'two') ssa.triangles.forEach(expectReconstructs);
                const asa = solveTriangle({type: 'asa', angleA: A, angleB: ((A * 3) % 170) + 1, c: a / 4});
                if (asa.kind === 'one') expectReconstructs(asa.triangle);
            }
        }
    });
});

/**
 * Independent oracle: the positive roots c of f(c) = c^2 - 2 b cos(A) c + b^2 - a^2 (the circle of radius a about C meets the
 * ray from A) counted as sign changes of f on a scan of step 0.05, below the closest two-root separation on the grid
 * (about 0.09). It is valid only where the case gap exceeds its resolution; see `oracleDecides`.
 */
const STEP = 0.05;
function oracleCount(a: number, b: number, angleA: number): number {
    const cos = Math.cos((angleA * Math.PI) / 180);
    const cb = 2 * b * cos;
    const k = b * b - a * a;
    const xmax = Math.abs(b * cos) + a + 1;
    let prev = 1e-9 * (1e-9 - cb) + k;
    let count = 0;
    for (let x = STEP; x <= xmax; x += STEP) {
        const f = x * (x - cb) + k;
        if ((f < 0) !== (prev < 0)) count += 1;
        prev = f;
    }
    return count;
}

/** The oracle is trusted only when the discriminant gap a^2 - h^2 is clear of the scan resolution and of rounding. */
function oracleDecides(a: number, b: number, angleA: number): boolean {
    const sin = Math.sin((angleA * Math.PI) / 180);
    const gap = a * a - b * b * sin * sin;
    return Math.abs(gap) > 1e-6 && (gap < 0 || gap > (STEP * STEP) / 4 * 1.5);
}

/** The exact rule written independently, in integers, for the tie angles. */
function integerRule(a4: number, b4: number, angleA: number): number | undefined {
    if (angleA === 30) return 2 * a4 < b4 ? 0 : 2 * a4 === b4 ? 1 : a4 < b4 ? 2 : 1;
    if (angleA === 90 || angleA === 150) return a4 > b4 ? 1 : 0;
    return undefined;
}

describe('SSA count over the whole input grid', () => {
    it('enumerates 48 x 48 x 179 inputs against the oracle and the integer rule', () => {
        const started = performance.now();
        let total = 0;
        let compared = 0;
        let tieChecked = 0;
        const histogram = [0, 0, 0];
        for (let a4 = 1; a4 <= 48; a4++) for (let b4 = 1; b4 <= 48; b4++) {
            for (let A = 1; A <= 179; A++) {
                const a = a4 / 4;
                const b = b4 / 4;
                const count = ssaCount(a, b, A) as 0 | 1 | 2;
                total += 1;
                histogram[count] += 1;
                const exact = integerRule(a4, b4, A);
                if (exact !== undefined) {
                    expect(count, `integer rule a=${a} b=${b} A=${A}`).toBe(exact);
                    tieChecked += 1;
                }
                if (oracleDecides(a, b, A)) {
                    expect(count, `oracle a=${a} b=${b} A=${A}`).toBe(oracleCount(a, b, A));
                    compared += 1;
                }
                // The solver result agrees with the count and holds no NaN.
                if (A % 29 === 1 && a4 % 5 === 1 && b4 % 5 === 2) {
                    const r = solveTriangle({type: 'ssa', a, b, angleA: A});
                    expect(r.kind === 'none' ? 0 : r.kind === 'one' ? 1 : 2).toBe(count);
                    expectNoNaN(r);
                }
            }
        }
        const ms = performance.now() - started;
        console.info(`SSA enumeration: ${total} inputs, ${compared} oracle-compared, ${tieChecked} integer-rule, ${ms.toFixed(0)} ms, counts ${histogram}`);
        expect(total).toBe(412_416);
        expect(compared).toBeGreaterThan(total * 0.9);
        expect(histogram.every(n => n > 0)).toBe(true);
    });

    it('the tie cases A = 30 (2a = b), 90 and 150', () => {
        expect(ssaCount(4, 8, 30)).toBe(1);
        expect(ssaCount(0.25, 0.5, 30)).toBe(1);
        expect(ssaCount(5.75, 11.5, 30)).toBe(1);
        expect(ssaCount(3.75, 8, 30)).toBe(0);
        expect(ssaCount(4.25, 8, 30)).toBe(2);
        expect(ssaCount(8, 8, 90)).toBe(0);
        expect(ssaCount(8.25, 8, 90)).toBe(1);
        expect(ssaCount(8, 8, 150)).toBe(0);
        expect(ssaCount(8.25, 8, 150)).toBe(1);
        expect(ssaCount(9.5, 9.75, 77)).toBe(0); // a is just below h = 9.50011
    });

    it('intersectLineCircle agrees on the rational-direction case C=(4,3), ray along the x-axis', () => {
        const line: Line = {kind: 'line', a: Rational.ZERO, b: Rational.ONE, c: Rational.ZERO};
        const expected = new Map([[2.5, 0], [3, 1], [4, 2], [5, 1], [6, 1]]);
        for (const [a, count] of expected) {
            const circle: Circle = {centre: new RationalPoint(Rational.of(4), Rational.of(3)), r2: Rational.of(Math.round(a * a * 4), 4)};
            const hit = intersectLineCircle(line, circle);
            const xs = hit.kind === 'none' ? [] : hit.kind === 'tangent' ? [hit.point.x] : hit.points.map(p => p.x);
            // The vertex A=(0,0) itself (a = b = 5) is not a solution.
            expect(xs.filter(x => x > 1e-9).length, `a=${a}`).toBe(count);
        }
    });
});
