import {
    barycentricEvaluate, barycentricWeights, bezierCurvePoint, chebyshevNodes, curveParameters, equispacedNodes, INTERPOLATION_DEGREE_MAX,
    interpolationErrorSample, interpolationFunction, lagrangeBasis, lagrangeCurvePoint, RUNGE_TABLE, rungeMaxError,
} from './interpolation';

/** Independent oracle: the textbook product formula for the Lagrange basis. */
const naiveBasis = (nodes: number[], j: number, x: number): number =>
    nodes.reduce((product, xk, k) => (k === j ? product : product * (x - xk) / (nodes[j] - xk)), 1);
const naiveEvaluate = (nodes: number[], values: number[], x: number): number =>
    nodes.reduce((sum, _, j) => sum + values[j] * naiveBasis(nodes, j, x), 0);

const close = (actual: number, expected: number, relative: number) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(relative * Math.max(1, Math.abs(expected)));

const rel = (actual: number, expected: number, tolerance: number) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance * Math.abs(expected));

describe('barycentric Lagrange', () => {
    const nodes = [-1, -0.3, 0.2, 0.9, 1.7];
    const values = [2, -1, 0.5, 3, -2];

    it('agrees with the naive Lagrange product formula', () => {
        for (let i = 0; i <= 40; i++) {
            const x = -1.5 + (i * 3.5) / 40 + 0.0137;
            close(barycentricEvaluate(nodes, values, x), naiveEvaluate(nodes, values, x), 1e-12);
            lagrangeBasis(nodes, x).forEach((l, j) => close(l, naiveBasis(nodes, j, x), 1e-12));
        }
    });

    it('is exact at the nodes and the basis is cardinal', () => {
        nodes.forEach((x, j) => {
            expect(barycentricEvaluate(nodes, values, x)).toBe(values[j]);
            expect(lagrangeBasis(nodes, x)).toEqual(nodes.map((_, k) => (k === j ? 1 : 0)));
        });
    });

    it('has partition of unity', () => {
        for (const x of [-3, -0.5, 0.05, 1.1, 4]) close(lagrangeBasis(nodes, x).reduce((s, l) => s + l, 0), 1, 1e-12);
    });

    it('reproduces polynomials of degree <= n', () => {
        const polys: Array<(x: number) => number> = [() => 4, x => 2 * x - 1, x => x * x - 3 * x + 0.5, x => x ** 3 - x, x => x ** 4 - 2 * x ** 3 + x - 7];
        polys.forEach(p => {
            for (let i = 0; i < 25; i++) {
                const x = -2 + i * 0.17;
                close(barycentricEvaluate(nodes, nodes.map(p), x), p(x), 1e-12);
            }
        });
    });

    it('rejects duplicate, empty and non-finite nodes and bad arguments', () => {
        expect(() => barycentricWeights([0, 1, 1])).toThrow(RangeError);
        expect(() => barycentricWeights([])).toThrow(RangeError);
        expect(() => barycentricWeights([0, NaN])).toThrow(RangeError);
        expect(() => barycentricWeights([0, Infinity])).toThrow(RangeError);
        expect(() => barycentricEvaluate([0, 1], [1], 0.5)).toThrow(RangeError);
        expect(() => barycentricEvaluate([0, 1], [1, 2], NaN)).toThrow(RangeError);
        expect(() => lagrangeBasis([0, 1], NaN)).toThrow(RangeError);
        expect(() => lagrangeBasis([0, 0], 0.5)).toThrow(RangeError);
        expect(() => barycentricWeights(equispacedNodes(40, 0, 1e-9))).toThrow(RangeError);
    });
});

describe('node sets', () => {
    it('equispaced nodes include the ends', () => {
        expect(equispacedNodes(4, -1, 1)).toEqual([-1, -0.5, 0, 0.5, 1]);
        expect(equispacedNodes(0, 0, 2)).toEqual([1]);
    });

    it('Chebyshev nodes match the closed form mapped to [a, b]', () => {
        for (const n of [0, 1, 5, 10, 20]) {
            const nodes = chebyshevNodes(n, 2, 6);
            expect(nodes).toHaveLength(n + 1);
            nodes.forEach((x, j) => close(x, 4 + 2 * Math.cos(((2 * j + 1) * Math.PI) / (2 * n + 2)), 1e-14));
            expect(Math.min(...nodes)).toBeGreaterThan(2);
            expect(Math.max(...nodes)).toBeLessThan(6);
        }
        expect(chebyshevNodes(1, -1, 1)[0]).toBeCloseTo(Math.SQRT1_2, 14);
    });

    it('rejects bad degree and interval', () => {
        expect(() => equispacedNodes(-1, 0, 1)).toThrow(RangeError);
        expect(() => chebyshevNodes(1.5, 0, 1)).toThrow(RangeError);
        expect(() => chebyshevNodes(2, 1, 1)).toThrow(RangeError);
        expect(() => equispacedNodes(2, 0, NaN)).toThrow(RangeError);
    });
});

describe('I1 curve through points', () => {
    const P: Array<[number, number]> = [[0, 0], [1, 2], [3, 3], [4, 0]];

    it('reproduces the spec defaults', () => {
        const t = curveParameters(P);
        expect(t).toEqual([0, 1, 2, 3]);
        const mid = lagrangeCurvePoint(P, t, 1.5);
        [-1 / 16, 9 / 16, 9 / 16, -1 / 16].forEach((w, j) => close(mid.weights[j], w, 1e-14));
        close(mid.point[0], 2, 1e-14);
        close(mid.point[1], 2.8125, 1e-14);
        const bez = bezierCurvePoint(P, 0.5);
        [1 / 8, 3 / 8, 3 / 8, 1 / 8].forEach((w, j) => close(bez.weights[j], w, 1e-14));
        close(bez.point[0], 2, 1e-14);
        close(bez.point[1], 1.875, 1e-14);
        const half = lagrangeCurvePoint(P, t, 0.5).weights;
        [0.3125, 0.9375, -0.3125, 0.0625].forEach((w, j) => close(half[j], w, 1e-14));
    });

    it('passes through every point for both parametrisations', () => {
        for (const rule of ['uniform', 'chord'] as const) {
            const t = curveParameters(P, rule);
            P.forEach((p, j) => {
                expect(lagrangeCurvePoint(P, t, t[j]).point).toEqual(p);
            });
        }
    });

    it('reproduces polynomial data of degree <= n', () => {
        const T = [0, 1, 2, 3, 4];
        const cubic: Array<[number, number]> = T.map(s => [s * s, s ** 3 - 2 * s]);
        for (const s of [0.3, 1.7, 3.9]) {
            const q = lagrangeCurvePoint(cubic, T, s).point;
            close(q[0], s * s, 1e-12);
            close(q[1], s ** 3 - 2 * s, 1e-12);
        }
    });

    it('chord-length parameters are cumulative distances', () => {
        expect(curveParameters([[0, 0], [3, 4], [3, 10]], 'chord')).toEqual([0, 5, 11]);
    });

    it('leaves the control polygon hull on the default while Bezier stays inside', () => {
        const t = curveParameters(P);
        let top = -Infinity;
        for (let i = 0; i <= 300; i++) top = Math.max(top, lagrangeCurvePoint(P, t, i / 100).point[1]);
        expect(top).toBeGreaterThan(3.03);
        for (let i = 0; i <= 20; i++) expect(bezierCurvePoint(P, i / 20).point[1]).toBeLessThanOrEqual(3);
    });

    it('rejects coincident parameters, bad counts and non-finite points', () => {
        const dup: Array<[number, number]> = [[0, 0], [0, 0], [1, 1]];
        expect(() => lagrangeCurvePoint(dup, curveParameters(dup, 'chord'), 0.5)).toThrow(RangeError);
        expect(() => curveParameters([[0, 0]])).toThrow(RangeError);
        expect(() => curveParameters(Array.from({length: 13}, (_, i): [number, number] => [i, i]))).toThrow(RangeError);
        expect(() => curveParameters([[0, 0], [NaN, 1]])).toThrow(RangeError);
    });
});

describe('I2 Runge table', () => {
    it('reproduces the spec table to four significant figures', () => {
        RUNGE_TABLE.forEach(row => {
            rel(rungeMaxError('runge', 'equispaced', row.degree).maxError, row.equispaced, 1e-3);
            rel(rungeMaxError('runge', 'chebyshev', row.degree).maxError, row.chebyshev, 1e-3);
        });
        rel(rungeMaxError('runge', 'equispaced', 15).maxError, 2.107561, 5e-5);
        rel(rungeMaxError('runge', 'equispaced', 20).maxError, 59.8223, 5e-5);
        rel(rungeMaxError('runge', 'chebyshev', 15).maxError, 0.083107, 5e-5);
        rel(rungeMaxError('runge', 'chebyshev', 20).maxError, 0.0153337, 5e-5);
        expect(Math.abs(rungeMaxError('runge', 'equispaced', 15).argMax)).toBeCloseTo(0.9631, 3);
        close(rungeMaxError('runge', 'equispaced', 10).maxError, 1.91566, 1e-5);
        close(rungeMaxError('runge', 'chebyshev', 10).maxError, 0.10915, 1e-4);
    });

    it('locates the equispaced maximum near the ends and reproduces the extra spec numbers', () => {
        expect(Math.abs(rungeMaxError('runge', 'equispaced', 10).argMax)).toBeCloseTo(0.9402, 3);
        expect(Math.abs(rungeMaxError('runge', 'equispaced', 20).argMax)).toBeCloseTo(0.975, 2);
        close(rungeMaxError('runge', 'chebyshev', 5).maxError, 0.556, 2e-3);
        close(rungeMaxError('runge', 'equispaced', 5).maxError, 0.433, 2e-3);
    });

    it('equispaced error grows while Chebyshev error decays', () => {
        const degrees = [10, 15, 20, 30];
        const eq = degrees.map(n => rungeMaxError('runge', 'equispaced', n).maxError);
        const ch = degrees.map(n => rungeMaxError('runge', 'chebyshev', n).maxError);
        for (let i = 1; i < degrees.length; i++) {
            expect(eq[i]).toBeGreaterThan(eq[i - 1]);
            expect(ch[i]).toBeLessThan(ch[i - 1]);
        }
    });

    it('samples the error curve, is zero for polynomials and capped in degree', () => {
        const s = interpolationErrorSample(x => x ** 3, equispacedNodes(3, -1, 1), -1, 1, 101);
        expect(s.xs).toHaveLength(101);
        expect(s.errors).toHaveLength(101);
        expect(s.maxError).toBeLessThan(1e-13);
        expect(s.xs[0]).toBe(-1);
        expect(s.xs[1]).toBeCloseTo(-0.98, 14);
        expect(s.xs[100]).toBe(1);
        expect(rungeMaxError('sine', 'chebyshev', 10).maxError).toBeLessThan(1e-9);
        expect(interpolationFunction('abs')(-2)).toBe(2);
        expect(() => rungeMaxError('runge', 'equispaced', INTERPOLATION_DEGREE_MAX + 1)).toThrow(RangeError);
        expect(() => interpolationErrorSample(x => x, [0, 1], 0, 1, 1)).toThrow(RangeError);
    });
});
