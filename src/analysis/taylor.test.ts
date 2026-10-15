import {
    geometricConvergenceInterval, isInsideGeometricConvergence, isTaylorCenter, isTaylorDegree, isTaylorExampleId, isTaylorX,
    TAYLOR_DEGREE_MAX, TAYLOR_DEGREE_MIN, TAYLOR_EXAMPLE_IDS, taylorAbsoluteError, taylorCoefficient, taylorErrorBound, taylorExample,
    TaylorExample, TaylorExampleId, taylorFunctionValue, taylorPolynomial, taylorSignedError,
} from './taylor';
import {DEFAULT_TAYLOR_MODEL, parseTaylorModel, TAYLOR_EXAMPLE_MODELS} from './taylorModel';

const exp = taylorExample('exp');
const sine = taylorExample('sine');
const geometric = taylorExample('geometric');
const flat = taylorExample('flat');

const degrees = Array.from({length: TAYLOR_DEGREE_MAX - TAYLOR_DEGREE_MIN + 1}, (_, n) => n + TAYLOR_DEGREE_MIN);
const linspace = (min: number, max: number, count: number): number[] =>
    Array.from({length: count}, (_, i) => (min === max || i === count - 1 ? max : min + ((max - min) * i) / (count - 1)));

/** Independent references: written separately from the module (own factorials, own recurrences, own derivative cycle). */
const reference = {
    /** sum_{k<=n} (x-c)^k e^c / k! by the term recurrence term_k = term_{k-1} (x-c) / k. */
    expPartial(c: number, n: number, x: number): number {
        let term = Math.exp(c);
        let sum = term;
        for (let k = 1; k <= n; k++) {
            term = (term * (x - c)) / k;
            sum += term;
        }
        return sum;
    },
    /** sum_{k<=n} d_k (x-c)^k / k! for sin about c, with explicit powers and factorials. */
    sinePartial(c: number, n: number, x: number): number {
        let sum = 0;
        let power = 1;
        let factorial = 1;
        for (let k = 0; k <= n; k++) {
            if (k > 0) {
                power *= x - c;
                factorial *= k;
            }
            const d = [Math.sin(c), Math.cos(c), -Math.sin(c), -Math.cos(c)][k % 4];
            sum += (d * power) / factorial;
        }
        return sum;
    },
    /** The remainder as the convergent tail series sum_{k>n} d_k (x-c)^k / k! (no cancellation, so tiny errors stay accurate). */
    expTail(c: number, n: number, x: number): number {
        let term = Math.exp(c);
        for (let k = 1; k <= n; k++) term = (term * (x - c)) / k;
        let tail = 0;
        for (let k = n + 1; k <= n + 80; k++) {
            term = (term * (x - c)) / k;
            tail += term;
        }
        return tail;
    },
    sineTail(c: number, n: number, x: number): number {
        const d = (k: number) => [Math.sin(c), Math.cos(c), -Math.sin(c), -Math.cos(c)][k % 4];
        let power = 1;
        let factorial = 1;
        for (let k = 1; k <= n; k++) {
            power *= x - c;
            factorial *= k;
        }
        let tail = 0;
        for (let k = n + 1; k <= n + 80; k++) {
            power *= x - c;
            factorial *= k;
            tail += (d(k) * power) / factorial;
        }
        return tail;
    },
    /** 1/(1-x) - sum_{k<=n} (x-c)^k / (1-c)^(k+1) = r^(n+1) / (1-x) with r = (x-c)/(1-c) (geometric series identity). */
    geometricError(c: number, n: number, x: number): number {
        return ((x - c) / (1 - c)) ** (n + 1) / (1 - x);
    },
    geometricPartial(c: number, n: number, x: number): number {
        let sum = 0;
        for (let k = 0; k <= n; k++) sum += (x - c) ** k / (1 - c) ** (k + 1);
        return sum;
    },
};

const centersOf = (example: TaylorExample) => linspace(example.centerMin, example.centerMax, example.centerMin === example.centerMax ? 1 : 9);
const pointsOf = (example: TaylorExample) => linspace(example.xMin, example.xMax, 25);

describe('Taylor examples', () => {
    test('lists e^x, sin x, 1/(1 - x) and the flat function', () => {
        expect(TAYLOR_EXAMPLE_IDS).toEqual(['exp', 'sine', 'geometric', 'flat']);
        expect(TAYLOR_EXAMPLE_IDS.every(isTaylorExampleId)).toBe(true);
        expect(['sin', '', 'Exp', null, 1, undefined].some(isTaylorExampleId)).toBe(false);
        expect(TAYLOR_EXAMPLE_IDS.map(id => taylorExample(id).id)).toEqual([...TAYLOR_EXAMPLE_IDS]);
    });

    test('latex is undelimited', () => {
        for (const id of TAYLOR_EXAMPLE_IDS) {
            expect(taylorExample(id).latex).not.toContain('\\(');
            expect(taylorExample(id).latex).not.toContain('\\[');
        }
    });

    test('documented domains', () => {
        expect([exp.centerMin, exp.centerMax, exp.xMin, exp.xMax]).toEqual([-2, 2, -3, 3]);
        expect([sine.centerMin, sine.centerMax, sine.xMin, sine.xMax]).toEqual([-4, 4, -7, 7]);
        expect([geometric.centerMin, geometric.centerMax, geometric.xMin, geometric.xMax]).toEqual([-1, 0.5, -2, 0.95]);
        expect([flat.centerMin, flat.centerMax, flat.xMin, flat.xMax]).toEqual([0, 0, -1, 3]);
        expect(geometric.centerMax).toBeLessThan(1);
        expect(geometric.xMax).toBeLessThan(1);
    });

    test('degree domain 0..10, integers only', () => {
        expect([TAYLOR_DEGREE_MIN, TAYLOR_DEGREE_MAX]).toEqual([0, 10]);
        expect([0, 1, 10].every(isTaylorDegree)).toBe(true);
        expect([-1, 11, 1.5, NaN, Infinity, '3', null, undefined].some(isTaylorDegree)).toBe(false);
    });

    test('domain guards', () => {
        expect(isTaylorCenter(exp, 2) && isTaylorCenter(exp, -2)).toBe(true);
        expect([2.01, NaN, Infinity, '0', null].some(v => isTaylorCenter(exp, v))).toBe(false);
        expect(isTaylorCenter(flat, 0)).toBe(true);
        expect(isTaylorCenter(flat, 0.1) || isTaylorCenter(flat, -0.1)).toBe(false);
        expect(isTaylorX(geometric, 0.95) && isTaylorX(geometric, -2)).toBe(true);
        expect(isTaylorX(geometric, 0.96) || isTaylorX(geometric, 1) || isTaylorX(geometric, -2.01)).toBe(false);
    });

    test('rejects arguments outside the domains instead of clamping', () => {
        expect(() => taylorPolynomial(exp, 2.5, 1, 0)).toThrow(RangeError);
        expect(() => taylorPolynomial(exp, 0, 11, 0)).toThrow(RangeError);
        expect(() => taylorPolynomial(exp, 0, 1.5, 0)).toThrow(RangeError);
        expect(() => taylorPolynomial(exp, 0, 1, 3.5)).toThrow(RangeError);
        expect(() => taylorPolynomial(flat, 0.5, 1, 0)).toThrow(RangeError);
        expect(() => taylorPolynomial(geometric, 0, 1, 1)).toThrow(RangeError);
        expect(() => taylorErrorBound(geometric, 0.9, 1, 0)).toThrow(RangeError);
        expect(() => taylorSignedError(sine, 0, 1, 8)).toThrow(RangeError);
        expect(() => taylorAbsoluteError(sine, 0, -1, 1)).toThrow(RangeError);
        expect(() => taylorFunctionValue(geometric, 1)).toThrow(RangeError);
        expect(() => taylorCoefficient(exp, 0, 12)).toThrow(RangeError);
        expect(() => taylorCoefficient(exp, 0, 1.5)).toThrow(RangeError);
        expect(() => taylorCoefficient(exp, 0, -1)).toThrow(RangeError);
    });
});

describe('Taylor coefficients', () => {
    test('closed forms at easy centers', () => {
        const factorials = [1, 1, 2, 6, 24, 120, 720];
        factorials.forEach((f, k) => expect(taylorCoefficient(exp, 0, k)).toBe(1 / f));
        expect([0, 1, 2, 3, 4, 5].map(k => taylorCoefficient(sine, 0, k))).toEqual([0, 1, 0, -1 / 6, 0, 1 / 120]);
        expect([0, 1, 2, 3].map(k => taylorCoefficient(geometric, 0, k))).toEqual([1, 1, 1, 1]);
        expect([0, 1, 2, 3].map(k => taylorCoefficient(geometric, 0.5, k))).toEqual([2, 4, 8, 16]);
        expect(taylorCoefficient(exp, 1, 3)).toBeCloseTo(Math.E / 6, 14);
    });

    test('sine coefficients follow the cycle sin, cos, -sin, -cos over k!', () => {
        const c = 1.3;
        const factorials = [1, 1, 2, 6, 24, 120, 720, 5040];
        const cycle = [Math.sin(c), Math.cos(c), -Math.sin(c), -Math.cos(c)];
        for (let k = 0; k <= 7; k++) expect(taylorCoefficient(sine, c, k)).toBeCloseTo(cycle[k % 4] / factorials[k], 14);
    });

    test('no negative zero from the sine cycle', () => {
        expect(Object.is(taylorCoefficient(sine, 0, 2), 0)).toBe(true);
        expect(Object.is(taylorCoefficient(sine, 0, 6), 0)).toBe(true);
    });

    test('coefficients 1 and 2 agree with finite differences of f (independent of the closed forms)', () => {
        const cases: Array<[TaylorExample, number[]]> = [[exp, [-1.5, 0, 1.2]], [sine, [-3, 0.7, 2.5]], [geometric, [-0.8, 0, 0.4]]];
        const h = 1e-3;
        for (const [example, centers] of cases) {
            for (const c of centers) {
                const first = (example.value(c + h) - example.value(c - h)) / (2 * h);
                const second = (example.value(c + h) - 2 * example.value(c) + example.value(c - h)) / (h * h) / 2;
                expect(taylorCoefficient(example, c, 1)).toBeCloseTo(first, 4);
                expect(taylorCoefficient(example, c, 2)).toBeCloseTo(second, 4);
            }
        }
    });

    test('flat function: every coefficient at the center 0 is zero', () => {
        for (let k = 0; k <= TAYLOR_DEGREE_MAX + 1; k++) expect(Object.is(taylorCoefficient(flat, 0, k), 0)).toBe(true);
    });
});

describe('Taylor polynomial of e^x about 0', () => {
    test('T_1(1) = 2, T_3(1) = 8/3, T_6(1) = 1957/720', () => {
        expect(taylorPolynomial(exp, 0, 1, 1)).toBe(2);
        expect(taylorPolynomial(exp, 0, 3, 1)).toBeCloseTo(8 / 3, 14);
        expect(Math.abs(taylorPolynomial(exp, 0, 3, 1) - 8 / 3)).toBeLessThan(1e-14);
        expect(Math.abs(taylorPolynomial(exp, 0, 6, 1) - 1957 / 720)).toBeLessThan(1e-14);
        expect(taylorPolynomial(exp, 0, 0, 1)).toBe(1);
    });

    test('the signed error is e - T_n and positive here, the absolute error its magnitude', () => {
        expect(taylorSignedError(exp, 0, 1, 1)).toBeCloseTo(Math.E - 2, 14);
        expect(taylorSignedError(exp, 0, 3, 1)).toBeCloseTo(Math.E - 8 / 3, 14);
        expect(taylorAbsoluteError(exp, 0, 3, 1)).toBe(Math.abs(taylorSignedError(exp, 0, 3, 1)));
    });

    test('T_n(c) = f(c) and T_n agrees with an independent partial sum for every example', () => {
        for (const c of centersOf(exp)) {
            expect(taylorPolynomial(exp, c, 4, c)).toBe(Math.exp(c));
            for (const x of pointsOf(exp)) for (const n of degrees) {
                const expected = reference.expPartial(c, n, x);
                expect(Math.abs(taylorPolynomial(exp, c, n, x) - expected)).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(expected)));
            }
        }
        for (const c of centersOf(sine)) for (const x of pointsOf(sine)) for (const n of degrees) {
            const expected = reference.sinePartial(c, n, x);
            expect(Math.abs(taylorPolynomial(sine, c, n, x) - expected)).toBeLessThanOrEqual(1e-10 * Math.max(1, Math.abs(expected)));
        }
        for (const c of centersOf(geometric)) for (const x of pointsOf(geometric)) for (const n of degrees) {
            const expected = reference.geometricPartial(c, n, x);
            expect(Math.abs(taylorPolynomial(geometric, c, n, x) - expected)).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(expected)));
        }
    });

    test('sine about 0: T_3 and T_5 are x - x^3/6 and x - x^3/6 + x^5/120', () => {
        expect(taylorPolynomial(sine, 0, 3, 1)).toBeCloseTo(1 - 1 / 6, 14);
        expect(taylorPolynomial(sine, 0, 5, 1)).toBeCloseTo(1 - 1 / 6 + 1 / 120, 14);
        expect(taylorPolynomial(sine, 0, 4, 1)).toBeCloseTo(taylorPolynomial(sine, 0, 3, 1), 15);
    });
});

describe('Lagrange remainder bound', () => {
    test('known values', () => {
        // e^x about 0, n = 3, x = 1: M = e, bound e / 4!.
        expect(taylorErrorBound(exp, 0, 3, 1)).toEqual({kind: 'bound', value: Math.E / 24});
        // x < c uses M = e^c: c = 1, x = 0, n = 0: e * 1 / 1!.
        const left = taylorErrorBound(exp, 1, 0, 0);
        expect(left.kind === 'bound' && left.value).toBeCloseTo(Math.E, 14);
        // sin: M = 1, bound |x - c|^(n+1) / (n+1)!.
        expect(taylorErrorBound(sine, 0, 3, 2)).toEqual({kind: 'bound', value: 16 / 24});
        // 1/(1 - x) about 0 at x = 0.5: M = (n+1)!/(0.5)^(n+2), so the bound is 0.5^(n+1) / 0.5^(n+2) = 2.
        const geo = taylorErrorBound(geometric, 0, 3, 0.5);
        expect(geo.kind === 'bound' && geo.value).toBeCloseTo(2, 13);
        // x < c: the maximum of f^(n+1) sits at c, so 1 - max(c, x) = 1 - c.
        const geoLeft = taylorErrorBound(geometric, 0.5, 2, -1);
        expect(geoLeft.kind === 'bound' && geoLeft.value).toBeCloseTo(1.5 ** 3 / 0.5 ** 4, 12);
        expect(taylorErrorBound(exp, 1, 4, 1)).toEqual({kind: 'bound', value: 0});
    });

    test('the flat function offers no bound and says why', () => {
        for (const n of degrees) for (const x of [-1, 0, 1, 3]) {
            expect(taylorErrorBound(flat, 0, n, x)).toEqual({kind: 'unavailable', reason: 'no-derivative-bound'});
        }
    });

    /**
     * The naive error f - T_n subtracts two numbers of size |f|, so it carries rounding noise of a few ulps of the largest
     * term involved. The tolerance 1e-12 * max(1, |f|, |T_n|) is orders of magnitude above that noise (at most about
     * 1e-14 relative here) and orders below any error that could signal a wrong bound.
     */
    test('bound >= naive |f - T_n| (independent partial sums) over a grid of centers, degrees and points', () => {
        for (const [example, partial] of [[exp, reference.expPartial], [sine, reference.sinePartial], [geometric, reference.geometricPartial]] as const) {
            for (const c of centersOf(example)) for (const x of pointsOf(example)) for (const n of degrees) {
                const f = example.id === 'exp' ? Math.exp(x) : example.id === 'sine' ? Math.sin(x) : 1 / (1 - x);
                const error = Math.abs(f - partial(c, n, x));
                const bound = taylorErrorBound(example, c, n, x);
                if (bound.kind !== 'bound') throw new Error('expected a bound');
                const tolerance = 1e-12 * Math.max(1, Math.abs(f), Math.abs(partial(c, n, x)));
                expect(error).toBeLessThanOrEqual(bound.value + tolerance);
            }
        }
    });

    /**
     * The tail series (or the closed geometric remainder) has no cancellation, so tiny errors are accurate and the check is
     * tight: the bound must contain them up to a 1e-9 relative slack that only absorbs the roundoff of the bound itself.
     */
    test('bound >= tail-series / closed-form remainder, with no cancellation noise', () => {
        const remainders: Array<[TaylorExample, (c: number, n: number, x: number) => number]> = [
            [exp, reference.expTail], [sine, reference.sineTail], [geometric, reference.geometricError],
        ];
        for (const [example, remainder] of remainders) {
            for (const c of centersOf(example)) for (const x of pointsOf(example)) for (const n of degrees) {
                const bound = taylorErrorBound(example, c, n, x);
                if (bound.kind !== 'bound') throw new Error('expected a bound');
                expect(Math.abs(remainder(c, n, x))).toBeLessThanOrEqual(bound.value * (1 + 1e-9));
            }
        }
    });

    test('the bound is not vacuous: it stays within a modest factor of the error where the error is not tiny', () => {
        // e^x about 0, x = 1: actual error e - T_3(1) = 0.0516, bound e/24 = 0.1133.
        const actual = taylorAbsoluteError(exp, 0, 3, 1);
        const bound = taylorErrorBound(exp, 0, 3, 1);
        expect(bound.kind === 'bound' && bound.value / actual).toBeLessThan(3);
    });

    test('1/(1 - x) with x < c still satisfies the bound', () => {
        for (const [c, x] of [[0.5, -2], [0.5, 0], [0, -1.5], [-0.5, -2], [0.25, -0.75]] as const) {
            for (const n of degrees) {
                const bound = taylorErrorBound(geometric, c, n, x);
                if (bound.kind !== 'bound') throw new Error('expected a bound');
                expect(Math.abs(reference.geometricError(c, n, x))).toBeLessThanOrEqual(bound.value * (1 + 1e-12));
                expect(taylorAbsoluteError(geometric, c, n, x)).toBeLessThanOrEqual(bound.value * (1 + 1e-9) + 1e-12);
            }
        }
    });
});

describe('Taylor series versus the finite polynomial', () => {
    test('1/(1 - x) about 0 at x = -1.5: the error grows with the degree (exactly 1.5^(n+1) / 2.5)', () => {
        let previous = -Infinity;
        for (const n of degrees) {
            const error = taylorAbsoluteError(geometric, 0, n, -1.5);
            expect(error).toBeGreaterThan(previous);
            expect(Math.abs(error - 1.5 ** (n + 1) / 2.5)).toBeLessThanOrEqual(1e-12 * Math.max(1, error));
            previous = error;
        }
        // The signed error alternates: f - T_n = (-1.5)^(n+1) / 2.5.
        expect(taylorSignedError(geometric, 0, 0, -1.5)).toBeCloseTo(-1.5 / 2.5, 14);
        expect(taylorSignedError(geometric, 0, 1, -1.5)).toBeCloseTo(2.25 / 2.5, 14);
    });

    test('1/(1 - x) about 0 inside the convergence interval: the error shrinks with the degree', () => {
        let previous = Infinity;
        for (const n of degrees) {
            const error = taylorAbsoluteError(geometric, 0, n, 0.5);
            expect(error).toBeLessThan(previous);
            previous = error;
        }
    });

    test('geometric convergence interval |x - c| < 1 - c', () => {
        expect(geometricConvergenceInterval(0)).toEqual({from: -1, to: 1});
        expect(geometricConvergenceInterval(0.5)).toEqual({from: 0, to: 1});
        expect(geometricConvergenceInterval(-1)).toEqual({from: -3, to: 1});
        expect(() => geometricConvergenceInterval(1)).toThrow(RangeError);
        expect(() => geometricConvergenceInterval(NaN)).toThrow(RangeError);
        expect([isInsideGeometricConvergence(0, -0.5), isInsideGeometricConvergence(0, 0.9)]).toEqual([true, true]);
        expect([isInsideGeometricConvergence(0, -1.5), isInsideGeometricConvergence(0, -1), isInsideGeometricConvergence(0.5, 0)]).toEqual([false, false, false]);
        expect(isInsideGeometricConvergence(0.5, 0.01)).toBe(true);
        // Agrees with |x - c| < 1 - c on a grid.
        for (const c of centersOf(geometric)) for (const x of pointsOf(geometric)) {
            expect(isInsideGeometricConvergence(c, x)).toBe(Math.abs(x - c) < 1 - c);
        }
    });

    test('series behavior is recorded separately from the polynomial', () => {
        expect(exp.seriesBehavior).toBe('converges-everywhere');
        expect(sine.seriesBehavior).toBe('converges-everywhere');
        expect(geometric.seriesBehavior).toBe('converges-in-interval');
        expect(flat.seriesBehavior).toBe('converges-to-zero');
    });

    test('flat function: T_n = 0 for every degree and f(1) = e^-1 > 0', () => {
        for (const n of degrees) for (const x of linspace(-1, 3, 17)) expect(taylorPolynomial(flat, 0, n, x)).toBe(0);
        expect(taylorFunctionValue(flat, 1)).toBe(Math.exp(-1));
        expect(taylorFunctionValue(flat, 1)).toBeGreaterThan(0);
        expect(taylorSignedError(flat, 0, 10, 1)).toBe(Math.exp(-1));
        expect(taylorAbsoluteError(flat, 0, 0, 3)).toBeCloseTo(Math.exp(-1 / 3), 15);
        // f = 0 for x <= 0, where T_n is exact, and positive for every x > 0.
        for (const x of [-1, -0.001, 0]) expect(taylorSignedError(flat, 0, 5, x)).toBe(0);
        for (const x of [0.01, 0.1, 0.5, 2, 3]) expect(taylorFunctionValue(flat, x)).toBeGreaterThan(0);
    });
});

describe('Taylor model', () => {
    test('default model is e^x about 0, T_1 at x = 1, bound hidden', () => {
        expect(DEFAULT_TAYLOR_MODEL).toEqual({example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false});
        expect(parseTaylorModel(DEFAULT_TAYLOR_MODEL)).toEqual(DEFAULT_TAYLOR_MODEL);
        expect(TAYLOR_EXAMPLE_MODELS.exp).toBe(DEFAULT_TAYLOR_MODEL);
    });

    test('every example starting model is valid and names its own example', () => {
        for (const id of TAYLOR_EXAMPLE_IDS as readonly TaylorExampleId[]) {
            const model = TAYLOR_EXAMPLE_MODELS[id];
            expect(model.example).toBe(id);
            expect(parseTaylorModel(model)).toEqual(model);
            expect(model.boundVisible).toBe(false);
        }
        expect(TAYLOR_EXAMPLE_MODELS.flat.center).toBe(0);
    });

    test('accepts boundary values and drops unknown properties', () => {
        expect(parseTaylorModel({example: 'geometric', center: 0.5, degree: 10, x: -2, boundVisible: true, extra: 1}))
            .toEqual({example: 'geometric', center: 0.5, degree: 10, x: -2, boundVisible: true});
        expect(parseTaylorModel({example: 'sine', center: -4, degree: 0, x: 7, boundVisible: false}))
            .toEqual({example: 'sine', center: -4, degree: 0, x: 7, boundVisible: false});
        expect(parseTaylorModel({example: 'flat', center: 0, degree: 2, x: 3, boundVisible: false}))
            .toEqual({example: 'flat', center: 0, degree: 2, x: 3, boundVisible: false});
    });

    test('rejects invalid data instead of clamping', () => {
        const good = {example: 'exp', center: 0, degree: 2, x: 1, boundVisible: false};
        const bad: unknown[] = [
            null, undefined, 5, 'exp', [], [good],
            {...good, example: 'tan'}, {...good, example: undefined},
            {...good, center: 2.01}, {...good, center: -2.01}, {...good, center: NaN}, {...good, center: Infinity}, {...good, center: '0'},
            {...good, x: 3.01}, {...good, x: -3.01}, {...good, x: NaN}, {...good, x: -Infinity}, {...good, x: undefined},
            {...good, degree: 11}, {...good, degree: -1}, {...good, degree: 1.5}, {...good, degree: '3'}, {...good, degree: NaN},
            {...good, boundVisible: 'false'}, {...good, boundVisible: 0}, {...good, boundVisible: undefined},
            // flat requires center 0
            {...good, example: 'flat', center: 0.1}, {...good, example: 'flat', center: -1},
            // 1/(1 - x) keeps both points below 1
            {...good, example: 'geometric', center: 0.6}, {...good, example: 'geometric', center: 1}, {...good, example: 'geometric', center: -1.1},
            {...good, example: 'geometric', x: 0.96}, {...good, example: 'geometric', x: 1}, {...good, example: 'geometric', x: 2},
            {...good, example: 'sine', x: 7.1}, {...good, example: 'sine', center: 4.1},
        ];
        for (const data of bad) expect(parseTaylorModel(data)).toBeUndefined();
    });

    test('does not mutate the input', () => {
        const input = {example: 'exp', center: 0, degree: 2, x: 1, boundVisible: true, extra: 'x'};
        const copy = {...input};
        parseTaylorModel(input);
        expect(input).toEqual(copy);
    });
});
