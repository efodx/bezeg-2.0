import {classifyEigen, discriminantSign, EIGEN_PARALLEL_TOLERANCE, exactlyParallel, isApproximatelyParallel, parallelSine} from './eigen2';
import {apply, discriminant, LINEAR_MAP_EXAMPLES, Mat2} from './matrix2';

const ex = LINEAR_MAP_EXAMPLES;
const E = ex['eigen-default'];
const R = ex['quarter-turn'];
const S = ex.shear;
const C = ex.singular;
const rad = (deg: number) => deg * Math.PI / 180;
const deg = (r: number) => r * 180 / Math.PI;

function expectDistinct(m: Mat2) {
    const result = classifyEigen(m);
    if (result.kind !== 'distinct-real') {
        throw new Error(`expected distinct-real, got ${result.kind}`);
    }
    return result;
}

describe('classifyEigen classes', () => {
    it('decides each class by the exact sign of the discriminant', () => {
        expect(classifyEigen(E).kind).toBe('distinct-real');
        expect(classifyEigen(R).kind).toBe('complex');
        expect(classifyEigen(S)).toMatchObject({kind: 'repeated', repeated: 'defective'});
        expect(classifyEigen([[2, 0], [0, 2]])).toMatchObject({kind: 'repeated', repeated: 'scalar', eigenvalue: 2});
        expect(classifyEigen([[0, 0], [0, 0]])).toMatchObject({kind: 'repeated', repeated: 'scalar', eigenvalue: 0});
        expect(classifyEigen([[-1, 0], [0, -1]])).toMatchObject({kind: 'repeated', repeated: 'scalar', eigenvalue: -1});
    });

    it('agrees with the matrix2 discriminant on every quarter-grid matrix in a small box', () => {
        const values = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
        for (const a of values) for (const b of values) for (const c of values) for (const d of values) {
            expect(discriminantSign([[a, b], [c, d]])).toBe(Math.sign(discriminant([[a, b], [c, d]])) + 0);
        }
    });

    it('is exact where a tolerance would be wrong: a tiny positive discriminant stays positive', () => {
        // tau = 2, det = 15/16 - 1/16 * ... : a=d=1, b*c = 1/16 gives Delta = 4 - 4(1 - 1/16) = 1/4 > 0
        expect(classifyEigen([[1, 0.25], [0.25, 1]]).kind).toBe('distinct-real');
        // b*c = -1/16 gives Delta = -1/4 < 0
        expect(classifyEigen([[1, 0.25], [-0.25, 1]]).kind).toBe('complex');
        // b*c = 0 and a = d: Delta = 0
        expect(classifyEigen([[1, 0], [0.25, 1]])).toMatchObject({repeated: 'defective'});
    });

    it('rejects entries off the quarter grid', () => {
        expect(() => classifyEigen([[0.1, 0], [0, 1]])).toThrow(RangeError);
        expect(() => classifyEigen([[NaN, 0], [0, 1]])).toThrow(RangeError);
    });
});

describe('classifyEigen examples', () => {
    it('E: eigenvalues 5 and 2, directions (1,1) and (1,-2), obtuse angle 108.43 degrees', () => {
        const {eigenvalues, eigenvectors, discriminant: delta} = expectDistinct(E);
        expect(delta).toBe(9);
        expect(eigenvalues).toEqual([5, 2]);
        const [u, w] = eigenvectors;
        expect(Math.hypot(...u)).toBeCloseTo(1, 12);
        expect(Math.hypot(...w)).toBeCloseTo(1, 12);
        expect(u[0]).toBeCloseTo(Math.SQRT1_2, 12);
        expect(u[1]).toBeCloseTo(Math.SQRT1_2, 12);
        expect(w[0]).toBeCloseTo(1 / Math.sqrt(5), 12);
        expect(w[1]).toBeCloseTo(-2 / Math.sqrt(5), 12);
        // E(1,1) = (5,5), E(1,-2) = (2,-4), exactly
        expect(apply(E, [1, 1])).toEqual([5, 5]);
        expect(apply(E, [1, -2])).toEqual([2, -4]);
        expect(deg(Math.acos(u[0] * w[0] + u[1] * w[1]))).toBeCloseTo(108.43, 2);
        expect(deg(Math.acos(u[0] * w[0] + u[1] * w[1]))).toBeCloseTo(108.4349488, 6);
    });

    it('eigenvectors satisfy A v = lambda v to 1e-12 for several distinct-real matrices', () => {
        for (const m of [E, ex['non-symmetric'], ex.symmetric, ex.singular, ex['reflection-x'], ex['orientation-reversing']] as Mat2[]) {
            const {eigenvalues, eigenvectors} = expectDistinct(m);
            eigenvalues.forEach((lambda, i) => {
                const image = apply(m, eigenvectors[i]);
                expect(image[0]).toBeCloseTo(lambda * eigenvectors[i][0], 12);
                expect(image[1]).toBeCloseTo(lambda * eigenvectors[i][1], 12);
            });
        }
    });

    it('R: complex, eigenvalues +- i, no real direction', () => {
        expect(classifyEigen(R)).toEqual({kind: 'complex', real: 0, imaginary: 1, discriminant: -4});
    });

    it('rotation by an angle: real part cos, imaginary part sin (quarter-grid check on the 3-4-5 style matrix)', () => {
        // [[0.5,-0.5],[0.5,0.5]]: tau = 1, det = 0.5, Delta = -1 -> 0.5 +- 0.5 i
        expect(classifyEigen([[0.5, -0.5], [0.5, 0.5]])).toEqual({kind: 'complex', real: 0.5, imaginary: 0.5, discriminant: -1});
    });

    it('S: defective, eigenvalue 1, direction (1,0), no division by zero', () => {
        expect(classifyEigen(S)).toEqual({kind: 'repeated', repeated: 'defective', eigenvalue: 1, eigenvector: [1, 0], discriminant: 0});
        const lower = classifyEigen([[1, 0], [1, 1]]);
        expect(lower).toMatchObject({repeated: 'defective', eigenvalue: 1});
        if (lower.kind === 'repeated' && lower.repeated === 'defective') {
            expect(lower.eigenvector).toEqual([0, 1]);
            expect(Number.isFinite(lower.eigenvector[0] + lower.eigenvector[1])).toBe(true);
        }
        const negative = classifyEigen([[-1, 2], [0, -1]]);
        expect(negative).toMatchObject({repeated: 'defective', eigenvalue: -1});
    });

    it('2I, zero and -I are scalar (every direction), -I has lambda = -1', () => {
        for (const [m, lambda] of [[[[2, 0], [0, 2]], 2], [[[0, 0], [0, 0]], 0], [[[-1, 0], [0, -1]], -1]] as const) {
            const result = classifyEigen(m);
            expect(result).toEqual({kind: 'repeated', repeated: 'scalar', eigenvalue: lambda, discriminant: 0});
            expect('eigenvector' in result).toBe(false);
        }
    });

    it('C: eigenvalues 2 and 0, kernel (2,-1), C(2,1) = (4,2)', () => {
        const {eigenvalues, eigenvectors} = expectDistinct(C);
        expect(eigenvalues).toEqual([2, 0]);
        expect(apply(C, [2, 1])).toEqual([4, 2]);
        expect(apply(C, [2, -1])).toEqual([0, 0]);
        const kernel = eigenvectors[1];
        expect(kernel[0]).toBeCloseTo(2 / Math.sqrt(5), 12);
        expect(kernel[1]).toBeCloseTo(-1 / Math.sqrt(5), 12);
        expect(eigenvectors[0][0]).toBeCloseTo(2 / Math.sqrt(5), 12);
        expect(eigenvectors[0][1]).toBeCloseTo(1 / Math.sqrt(5), 12);
    });

    it('a zero eigenvalue and a vertical eigenvector are handled', () => {
        const {eigenvectors} = expectDistinct([[0, 0], [0, 1]]);
        expect(eigenvectors[0]).toEqual([0, 1]);
        expect(eigenvectors[1]).toEqual([1, 0]);
    });
});

describe('parallelSine and exactlyParallel', () => {
    it('the tolerance is the named constant 0.01', () => {
        expect(EIGEN_PARALLEL_TOLERANCE).toBe(0.01);
    });

    it('E: sine about 0.0105 at 44 degrees and 0.0010 at 44.9 degrees', () => {
        expect(Math.abs(parallelSine(E, rad(44)))).toBeCloseTo(0.0105, 4);
        expect(Math.abs(parallelSine(E, rad(44.9)))).toBeCloseTo(0.001, 4);
        expect(isApproximatelyParallel(E, rad(44))).toBe(false);
        expect(isApproximatelyParallel(E, rad(44.9))).toBe(true);
    });

    it('is zero at an eigen-direction, and the window is about +-0.95 degrees', () => {
        expect(parallelSine(E, Math.PI / 4)).toBeCloseTo(0, 15);
        expect(isApproximatelyParallel(E, rad(45 + 0.9))).toBe(true);
        expect(isApproximatelyParallel(E, rad(45 + 1.0))).toBe(false);
        const eigenAngle = Math.atan2(-2, 1);
        expect(parallelSine(E, eigenAngle)).toBeCloseTo(0, 15);
    });

    it('is the signed sine: 1 for the quarter-turn, 0 when A v = 0', () => {
        expect(parallelSine(R, 0.3)).toBeCloseTo(1, 15);
        expect(parallelSine(R, 2)).toBeCloseTo(1, 15);
        expect(parallelSine([[0, 0], [0, 0]], 1)).toBe(0);
    });

    it('exactlyParallel is exact on quarter-grid vectors', () => {
        expect(exactlyParallel([1, 1], E)).toBe(true);
        expect(exactlyParallel([0.25, 0.25], E)).toBe(true);
        expect(exactlyParallel([1, -2], E)).toBe(true);
        expect(exactlyParallel([1, 0], E)).toBe(false);
        expect(exactlyParallel([1, 1.25], E)).toBe(false);
        expect(exactlyParallel([2, -1], C)).toBe(true); // kernel: A v = 0 is parallel in the det sense
        expect(exactlyParallel([1, 0], S)).toBe(true);
        expect(exactlyParallel([3, 7], [[2, 0], [0, 2]])).toBe(true);
        expect(exactlyParallel([1, 0], R)).toBe(false);
    });

    it('exactlyParallel refuses the zero vector and non-grid input', () => {
        expect(exactlyParallel([0, 0], E)).toBe(false);
        expect(() => exactlyParallel([0.1, 1], E)).toThrow(RangeError);
        expect(() => exactlyParallel([Infinity, 1], E)).toThrow(RangeError);
    });
});
