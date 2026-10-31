import {
    designMatrix, evaluatePolynomial, fitLine, fitPolynomial, lineResidualSumOfSquares, LEAST_SQUARES_LESSON_DEGREE_MAX,
} from './leastSquares';
import type {Point2} from './interpolation';

// Independent oracle: exact rational Gaussian elimination on the normal equations with BigInt fractions.
type Q = [bigint, bigint];
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const q = (n: bigint, d: bigint = 1n): Q => {
    const g = gcd(n, d) || 1n;
    const s = d < 0n ? -1n : 1n;
    return [s * n / g, s * d / g];
};
const mul = (a: Q, b: Q) => q(a[0] * b[0], a[1] * b[1]);
const sub = (a: Q, b: Q) => q(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const div = (a: Q, b: Q) => q(a[0] * b[1], a[1] * b[0]);
const add = (a: Q, b: Q) => q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const num = (a: Q) => Number(a[0]) / Number(a[1]);

const exactNormalSolve = (points: readonly Point2[], degree: number): Q[] => {
    const size = degree + 1;
    const pw = (x: number, k: number): Q => q(BigInt(x) ** BigInt(k));
    const m: Q[][] = Array.from({length: size}, (_, j) => [
        ...Array.from({length: size}, (_, k) => points.reduce<Q>((s, p) => add(s, pw(p[0], j + k)), q(0n))),
        points.reduce<Q>((s, p) => add(s, mul(pw(p[0], j), q(BigInt(p[1])))), q(0n)),
    ]);
    for (let c = 0; c < size; c++) {
        const pivot = m.findIndex((row, r) => r >= c && row[c][0] !== 0n);
        [m[c], m[pivot]] = [m[pivot], m[c]];
        for (let r = 0; r < size; r++) {
            if (r === c) continue;
            const f = div(m[r][c], m[c][c]);
            m[r] = m[r].map((v, k) => sub(v, mul(f, m[c][k])));
        }
    }
    return m.map((row, i) => div(row[size], row[i]));
};

const near = (actual: number, expected: number, tolerance = 1e-12) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance * Math.max(1, Math.abs(expected)));

const DEFAULT: Point2[] = [[0, 1], [1, 2], [2, 2], [3, 4]];

describe('spec I4 golden values', () => {
    it('best line y = 0.9x + 0.9 with residuals 0.1, 0.2, -0.7, 0.4 and sum of squares 0.7', () => {
        const line = fitLine(DEFAULT);
        near(line.slope, 0.9);
        near(line.intercept, 0.9);
        [0.1, 0.2, -0.7, 0.4].forEach((r, i) => near(line.residuals[i], r));
        near(line.residuals.reduce((s, r) => s + r, 0), 0);
        near(line.residualSumOfSquares, 0.7);
    });

    it('quadratic 1.15 + 0.15x + 0.25x^2 with sum of squares 0.45', () => {
        const fit = fitPolynomial(DEFAULT, 2);
        [1.15, 0.15, 0.25].forEach((c, k) => near(fit.coefficients[k], c));
        near(fit.residualSumOfSquares, 0.45);
    });

    it('cubic interpolates the four points: 1 + 2.5x - 2x^2 + 0.5x^3, residuals zero', () => {
        const fit = fitPolynomial(DEFAULT, 3);
        [1, 2.5, -2, 0.5].forEach((c, k) => near(fit.coefficients[k], c));
        fit.residuals.forEach(r => near(r, 0));
    });

    it('outlier (3,8) gives y = 2.1x + 0.1 with sum of squares 8.7', () => {
        const line = fitLine([[0, 1], [1, 2], [2, 2], [3, 8]]);
        near(line.slope, 2.1);
        near(line.intercept, 0.1);
        near(line.residualSumOfSquares, 8.7);
    });

    it('displays the normal equations A^T A and A^T y for the default line', () => {
        const fit = fitPolynomial(DEFAULT, 1);
        expect(fit.normalMatrix).toEqual([[4, 6], [6, 14]]);
        expect(fit.normalRhs).toEqual([9, 18]);
    });
});

describe('independent oracles', () => {
    const datasets: Point2[][] = [
        DEFAULT,
        [[-2, 3], [-1, -1], [0, 4], [1, 1], [2, 7], [3, -2], [5, 5]],
        [[0, 0], [1, 1], [2, 5], [3, 2], [4, 9], [5, 3], [6, 12], [7, 1]],
    ];

    it('QR coefficients equal the exact rational normal-equation solve for degrees 0..5', () => {
        for (const data of datasets) {
            for (let degree = 0; degree <= Math.min(LEAST_SQUARES_LESSON_DEGREE_MAX, data.length - 1); degree++) {
                const exact = exactNormalSolve(data, degree);
                const fit = fitPolynomial(data, degree);
                exact.forEach((c, k) => near(fit.coefficients[k], num(c), 1e-9));
            }
        }
    });

    it('degree 1 matches closed-form regression formulas', () => {
        const data = datasets[1];
        const n = data.length;
        const mx = data.reduce((s, p) => s + p[0], 0) / n;
        const my = data.reduce((s, p) => s + p[1], 0) / n;
        const sxy = data.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
        const sxx = data.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
        const line = fitLine(data);
        near(line.slope, sxy / sxx);
        near(line.intercept, my - (sxy / sxx) * mx);
    });

    it('residuals are orthogonal to every column of the design matrix', () => {
        for (const data of datasets) {
            for (let degree = 1; degree <= Math.min(LEAST_SQUARES_LESSON_DEGREE_MAX, data.length - 1); degree++) {
                const fit = fitPolynomial(data, degree);
                const design = designMatrix(data.map(p => p[0]), degree);
                for (let j = 0; j <= degree; j++) {
                    const inner = design.reduce((s, row, i) => s + row[j] * fit.residuals[i], 0);
                    const scale = Math.hypot(...design.map(row => row[j])) * Math.hypot(...fit.residuals) + 1;
                    expect(Math.abs(inner)).toBeLessThanOrEqual(1e-10 * scale);
                }
            }
        }
    });

    it('the least-squares line beats nearby lines (minimality)', () => {
        const line = fitLine(datasets[1]);
        for (const [ds, di] of [[0.01, 0], [-0.01, 0], [0, 0.01], [0, -0.01]]) {
            expect(lineResidualSumOfSquares(datasets[1], line.slope + ds, line.intercept + di))
                .toBeGreaterThan(line.residualSumOfSquares);
        }
        near(lineResidualSumOfSquares(datasets[1], line.slope, line.intercept), line.residualSumOfSquares);
    });

    it('recovers a degree-m polynomial exactly from points on it', () => {
        const truth = [2, -3, 0.5, 0.25, -0.125];
        const data: Point2[] = [-3, -2, -1, 0, 1, 2, 3, 4].map(x => [x, evaluatePolynomial(truth, x)]);
        const fit = fitPolynomial(data, 4);
        truth.forEach((c, k) => near(fit.coefficients[k], c, 1e-9));
        near(fit.residualSumOfSquares, 0, 1e-18);
    });

    it('QR stays accurate where the normal equations lose digits (shifted abscissae, degree 3)', () => {
        const truth = [1, 2, -1, 0.5];
        const data: Point2[] = Array.from({length: 8}, (_, i) => {
            const x = 1000 + i;
            return [x, evaluatePolynomial(truth, x - 1000)];
        });
        const fit = fitPolynomial(data, 3);
        // Compare fitted values (the coefficients themselves are ill conditioned in the raw monomial basis).
        data.forEach(p => expect(Math.abs(evaluatePolynomial(fit.coefficients, p[0]) - p[1])).toBeLessThan(1e-3 * Math.abs(p[1])));
        // The condition number of A^T A is the square of that of A: the displayed matrix is huge compared with QR's needs.
        expect(fit.normalMatrix[3][3] / fit.normalMatrix[0][0]).toBeGreaterThan(1e17);
    });
});

describe('invalid input', () => {
    it('rejects fewer than 2 points', () => {
        expect(() => fitLine([[0, 1]])).toThrow(/at least 2/);
        expect(() => fitLine([])).toThrow(RangeError);
    });

    it('rejects vertical data with a reason', () => {
        expect(() => fitLine([[2, 1], [2, 5], [2, 9]])).toThrow(/vertical/);
    });

    it('rejects degree at or above the number of points (underdetermined)', () => {
        expect(() => fitPolynomial(DEFAULT, 4)).toThrow(/underdetermined/);
        expect(() => fitPolynomial([[0, 0], [1, 1]], 2)).toThrow(/underdetermined/);
        expect(() => fitPolynomial([[0, 0], [1, 1]], 1)).not.toThrow();
    });

    it('rejects rank-deficient data (too few distinct x) and bad degrees or values', () => {
        expect(() => fitPolynomial([[0, 0], [0, 1], [1, 1], [1, 2]], 2)).toThrow(/rank deficient/);
        expect(() => fitPolynomial(DEFAULT, -1)).toThrow(RangeError);
        expect(() => fitPolynomial(DEFAULT, 1.5)).toThrow(RangeError);
        expect(() => fitLine([[0, 1], [1, Number.NaN]])).toThrow(/finite/);
    });

    it('rejects numerically dependent columns', () => {
        // x values 1 and 1 + 1e-13 are distinct but the columns 1 and x are numerically parallel.
        expect(() => fitLine([[1, 0], [1 + 1e-13, 1]])).toThrow(/rank deficient/);
    });
});
