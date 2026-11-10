import {classifyEigen} from './eigen2';
import {
    collapses, dominantDirection, iterationOutcome, lineAngleDegrees, modulusRatio, orbit, ORBIT_MAX_STEPS,
    ORBIT_OVERFLOW_NORM, SETTLED_ANGLE_DEGREES, startsOnOtherEigenvector,
} from './iterate2';
import {apply, IDENTITY, LINEAR_MAP_EXAMPLES, Mat2, multiply, Vec2} from './matrix2';

const ex = LINEAR_MAP_EXAMPLES;
const E = ex['eigen-default'];
const R = ex['quarter-turn'];
const S = ex.shear;
const Q: Mat2 = [[0, 3], [3, 0]];
const SPIRAL: Mat2 = [[1, -1], [1, 1]];
const angle = (p: Vec2) => Math.atan2(p[1], p[0]) * 180 / Math.PI;
const norm = (p: Vec2) => Math.hypot(p[0], p[1]);

/** A^n v0 by a chain of `multiply` (independent of orbit's repeated `apply`). */
function powerApply(m: Mat2, n: number, v: Vec2): Vec2 {
    let power: Mat2 = IDENTITY;
    for (let k = 0; k < n; k++) power = multiply(m, power);
    return apply(power, v);
}

describe('orbit against multiply chains and the closed form', () => {
    const v0: Vec2 = [1, 0];
    const result = orbit(E, v0, 12);

    it('equals the multiply chain, exactly (integers for n <= 8)', () => {
        for (let n = 0; n <= 12; n++) {
            expect(result.points[n]).toEqual(powerApply(E, n, v0));
        }
        for (let n = 0; n <= 8; n++) {
            expect(Number.isInteger(result.points[n][0]) && Number.isInteger(result.points[n][1])).toBe(true);
        }
    });

    it('equals (2/3) 5^n (1,1) + (1/3) 2^n (1,-2)', () => {
        for (let n = 0; n <= 8; n++) {
            const x = (2 * 5 ** n + 2 ** n) / 3;
            const y = (2 * 5 ** n - 2 * 2 ** n) / 3;
            expect(result.points[n]).toEqual([x, y]);
        }
    });

    it('lists the checked iterates and angles', () => {
        expect(result.points[1]).toEqual([4, 2]);
        expect(result.points[2]).toEqual([18, 14]);
        expect(result.points[3]).toEqual([86, 78]);
        expect(result.points[5]).toEqual([2094, 2062]);
        expect(angle(result.points[1])).toBeCloseTo(26.57, 2);
        expect(angle(result.points[2])).toBeCloseTo(37.87, 2);
        expect(angle(result.points[3])).toBeCloseTo(42.21, 2);
        expect(angle(result.points[5])).toBeCloseTo(44.559, 3);
    });

    it('reads the dominant direction, angle errors, ratio and stretches', () => {
        expect(result.dominantDirection?.[0]).toBeCloseTo(Math.SQRT1_2, 12);
        expect(result.dominantDirection?.[1]).toBeCloseTo(Math.SQRT1_2, 12);
        expect(result.modulusRatio).toBeCloseTo(0.4, 12);
        const errors = result.angleErrors as number[];
        expect(errors[4]).toBeCloseTo(1.107, 3);
        expect(errors[5]).toBeCloseTo(0.441, 3);
        expect(errors[8]).toBeCloseTo(0.0282, 4);
        for (let n = 4; n < 12; n++) expect(errors[n + 1] / errors[n]).toBeGreaterThan(0.3);
        for (let n = 4; n < 12; n++) expect(errors[n + 1] / errors[n]).toBeLessThan(0.41);
        expect(errors.findIndex((e) => e < SETTLED_ANGLE_DEGREES)).toBe(5);
        expect(errors.findIndex((e) => e < 0.01)).toBe(10);
        const stretches = result.stretches as number[];
        [[1, 5.099], [2, 5.091], [3, 5.044], [4, 5.0185], [8, 5.0005]].forEach(([n, value]) => {
            expect(stretches[n]).toBeCloseTo(value, 3);
        });
    });

    it('matches independent angle and stretch values to 1e-10', () => {
        for (let n = 0; n <= 10; n++) {
            const [x, y] = powerApply(E, n, v0);
            const [x2, y2] = powerApply(E, n + 1, v0);
            expect(result.angleErrors[n]).toBeCloseTo(Math.abs(45 - Math.atan2(y, x) * 180 / Math.PI), 10);
            expect(result.stretches[n]).toBeCloseTo(Math.sqrt((x2 * x2 + y2 * y2) / (x * x + y * y)), 10);
        }
    });
});

describe('failure cases', () => {
    it('quarter turn: angles 0, 90, 180, -90, 0 (period 4), no dominant direction', () => {
        const result = orbit(R, [1, 0], 8);
        expect(result.points.slice(0, 5).map((p) => angle(p) + 0)).toEqual([0, 90, 180, -90, 0]);
        expect(result.points[4][0]).toBe(1);
        expect(result.points[4][1] + 0).toBe(0);
        expect(result.dominantDirection).toBeUndefined();
        expect(result.angleErrors.every((e) => e === undefined)).toBe(true);
        expect(iterationOutcome(R)).toBe('rotating');
    });

    it('spiral: 45 degrees and a factor sqrt 2 per step', () => {
        const result = orbit(SPIRAL, [1, 0], 6);
        [0, 1, 2, 3, 4].forEach((n) => {
            expect(angle(result.points[n])).toBeCloseTo(45 * n, 10);
            expect(norm(result.points[n])).toBeCloseTo(Math.SQRT2 ** n, 10);
        });
        expect(result.points[4]).toEqual([-4, 0]);
        expect(iterationOutcome(SPIRAL)).toBe('rotating');
        expect(result.modulusRatio).toBe(1);
    });

    it('equal moduli: Q flip-flops between the axes, but stays on its eigenvector (1,1)', () => {
        expect(orbit(Q, [1, 0], 3).points).toEqual([[1, 0], [0, 3], [9, 0], [0, 27]]);
        expect(orbit(Q, [1, 1], 2).points).toEqual([[1, 1], [3, 3], [9, 9]]);
        expect(iterationOutcome(Q)).toBe('equal-moduli');
        expect(orbit(Q, [1, 0], 3).dominantDirection).toBeUndefined();
        expect(orbit(Q, [1, 0], 3).modulusRatio).toBe(1);
    });

    it('start on the other eigenvector stays on the line of lambda = 2 (exact), also the perturbed start is slow', () => {
        expect(orbit(E, [1, -2], 3).points).toEqual([[1, -2], [2, -4], [4, -8], [8, -16]]);
        expect(startsOnOtherEigenvector(E, [1, -2])).toBe(true);
        expect(startsOnOtherEigenvector(E, [-0.5, 1])).toBe(true);
        expect(startsOnOtherEigenvector(E, [1, 1])).toBe(false); // the dominant eigenvector
        expect(startsOnOtherEigenvector(E, [1, 0])).toBe(false); // not an eigenvector
        expect(startsOnOtherEigenvector(E, [0, 0])).toBe(false);
        const perturbed = orbit(E, [1 + 1e-6, -2 + 1e-6], 40);
        const errors = perturbed.angleErrors as number[];
        expect(errors.findIndex((e) => e < SETTLED_ANGLE_DEGREES)).toBe(20);
    });

    it('shear: angle arctan(1/n), convergence like 1/n', () => {
        const result = orbit(S, [0, 1], 100);
        expect(result.points[10]).toEqual([10, 1]);
        const rad = (180 / Math.PI);
        expect(result.angleErrors[1]).toBeCloseTo(45, 10);
        expect(result.angleErrors[10]).toBeCloseTo(Math.atan(1 / 10) * rad, 10);
        expect(result.angleErrors[10]).toBeCloseTo(5.71, 2);
        expect(result.angleErrors[100]).toBeCloseTo(0.573, 3);
        expect(iterationOutcome(S)).toBe('defective');
        expect(result.modulusRatio).toBe(1);
    });

    it('nilpotent and zero matrices collapse; the zero vector has no angle', () => {
        const nilpotent: Mat2 = [[0, 1], [0, 0]];
        expect(collapses(nilpotent)).toBe(true);
        expect(collapses([[0, 0], [0, 0]])).toBe(true);
        expect(collapses(S)).toBe(false);
        expect(collapses([[1, 0], [0, 0]])).toBe(false);
        const result = orbit(nilpotent, [1, 1], 3);
        expect(result.points).toEqual([[1, 1], [1, 0], [0, 0], [0, 0]]);
        expect(result.collapsed).toBe(true);
        expect(result.dominantDirection).toBeUndefined();
        expect(result.stretches[2]).toBeUndefined();
        expect(lineAngleDegrees([0, 0], [1, 0])).toBeUndefined();
    });

    it('a negative dominant eigenvalue converges as a line while the vector flips sign', () => {
        const negative: Mat2 = [[-3, 0], [0, 1]];
        const result = orbit(negative, [1, 1], 4);
        expect(result.dominantDirection).toEqual([1, 0]);
        expect(result.points[1][0]).toBe(-3);
        expect(result.points[2][0]).toBe(9);
        expect(result.angleErrors[4]).toBeLessThan(result.angleErrors[1] as number);
    });
});

describe('step cap and overflow', () => {
    const scalar4: Mat2 = [[4, 0], [0, 4]];

    it('stops before the first norm above 1e150 and says so (no Infinity)', () => {
        const result = orbit(scalar4, [1, 0], 400);
        expect(result.overflow).toBe(true);
        expect(result.steps).toBe(249); // 4^249 < 1e150 < 4^250
        expect(result.points).toHaveLength(250);
        expect(result.points.every((p) => Number.isFinite(p[0]) && norm(p) <= ORBIT_OVERFLOW_NORM)).toBe(true);
        expect(result.capped).toBe(false);
    });

    it('does not report overflow when the norm stays within the bound', () => {
        const result = orbit(scalar4, [1, 0], 100);
        expect(result.overflow).toBe(false);
        expect(result.steps).toBe(100);
    });

    it('clamps the request to the step cap', () => {
        const result = orbit(R, [1, 0], ORBIT_MAX_STEPS + 50);
        expect(result.capped).toBe(true);
        expect(result.steps).toBe(ORBIT_MAX_STEPS);
        expect(result.overflow).toBe(false);
    });

    it('overflow is strict: a norm exactly 1e150 is kept, the next one above is not', () => {
        const atBound = orbit(IDENTITY, [1e150, 0], 3);
        expect(atBound.overflow).toBe(false);
        expect(atBound.steps).toBe(3);
        const above = orbit([[2, 0], [0, 2]], [1e150, 0], 3);
        expect(above.overflow).toBe(true);
        expect(above.steps).toBe(0);
    });

    it('a request above the step cap that also overflows sets both flags', () => {
        const result = orbit([[4, 0], [0, 4]], [1, 0], ORBIT_MAX_STEPS + 500);
        expect(result.capped).toBe(true);
        expect(result.overflow).toBe(true);
        expect(result.steps).toBe(249);
    });

    it('rejects a non-finite start vector or one beyond the overflow norm with a RangeError', () => {
        expect(() => orbit(E, [Infinity, 0], 2)).toThrow(RangeError);
        expect(() => orbit(E, [NaN, 1], 2)).toThrow(RangeError);
        expect(() => orbit(E, [1e151, 0], 2)).toThrow(RangeError);
    });

    it('rejects a bad step count and gives no readouts off the quarter grid', () => {
        expect(() => orbit(E, [1, 0], -1)).toThrow(RangeError);
        expect(() => orbit(E, [1, 0], 1.5)).toThrow(RangeError);
        const off = orbit([[0.3, 0], [0, 0.2]], [1, 1], 2);
        expect(off.dominantDirection).toBeUndefined();
        expect(off.modulusRatio).toBeUndefined();
    });
});

describe('iterationOutcome', () => {
    it('names the examples', () => {
        expect(iterationOutcome(E)).toBe('dominant');
        expect(iterationOutcome(R)).toBe('rotating');
        expect(iterationOutcome(Q)).toBe('equal-moduli');
        expect(iterationOutcome(S)).toBe('defective');
        expect(iterationOutcome(ex['scalar-2'])).toBe('scalar');
        expect(iterationOutcome([[0, 0], [0, 0]])).toBe('scalar');
        expect(iterationOutcome([[0, 1], [0, 0]])).toBe('defective');
        expect(iterationOutcome([[1, 0], [0, -1]])).toBe('equal-moduli'); // reflection: eigenvalues 1, -1
        expect(iterationOutcome([[1, 0], [0, 0]])).toBe('dominant'); // eigenvalues 1, 0
    });

    it('throws off the quarter grid', () => {
        expect(() => iterationOutcome([[0.3, 0], [0, 1]])).toThrow(RangeError);
    });

    it('agrees with classifyEigen on a grid of snapped matrices', () => {
        const values = [-4, -3.5, -2, -1.25, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 1.5, 2, 3, 4];
        let checked = 0;
        const seen = new Set<string>();
        for (const a of values) for (const b of values) for (const c of values) for (const d of values) {
            const m: Mat2 = [[a, b], [c, d]];
            const eigen = classifyEigen(m);
            let expected: string;
            if (eigen.kind === 'complex') expected = 'rotating';
            else if (eigen.kind === 'repeated') expected = eigen.repeated;
            else expected = Math.abs(eigen.eigenvalues[0]) === Math.abs(eigen.eigenvalues[1]) ? 'equal-moduli' : 'dominant';
            expect(iterationOutcome(m)).toBe(expected);
            seen.add(expected);
            checked++;
        }
        expect(checked).toBe(values.length ** 4);
        expect([...seen].sort()).toEqual(['defective', 'dominant', 'equal-moduli', 'rotating', 'scalar']);
    });

    it('dominant direction and modulus ratio agree with classifyEigen on the dominant class', () => {
        const values = [-4, -2, -1, -0.5, 0, 0.5, 1, 3];
        for (const a of values) for (const b of values) for (const c of values) for (const d of values) {
            const m: Mat2 = [[a, b], [c, d]];
            if (iterationOutcome(m) !== 'dominant') continue;
            const eigen = classifyEigen(m);
            if (eigen.kind !== 'distinct-real') throw new Error('dominant must be distinct-real');
            const [l1, l2] = eigen.eigenvalues;
            const k = Math.abs(l1) > Math.abs(l2) ? 0 : 1;
            expect(dominantDirection(m)).toEqual(eigen.eigenvectors[k]);
            expect(modulusRatio(m)).toBeCloseTo(Math.abs(eigen.eigenvalues[1 - k]) / Math.abs(eigen.eigenvalues[k]), 12);
        }
    });
});
