import {
    isUniformDomainPoint, isUniformEpsilon, isUniformExampleId, isUniformN, isUniformR, isUniformX, UNIFORM_EXAMPLE_IDS, UNIFORM_MAX_N,
    UNIFORM_THRESHOLD_CAP, uniformExample, uniformLimit, uniformLimitHasJump, uniformLimitPieces, uniformPointwiseError,
    uniformPointwiseThreshold, uniformSupremum, uniformTerm, uniformThreshold,
} from './uniformConvergence';
import {
    changeUniformR, DEFAULT_UNIFORM_MODEL, parseUniformConvergenceModel, UNIFORM_EXAMPLE_MODELS,
} from './uniformConvergenceModel';

const power = uniformExample('power');
const scaled = uniformExample('scaled');

/** Grids written independently of the module: integer counts, converted to numbers by one division. */
const rValues = Array.from({length: 19}, (_, i) => (i + 2) * 5 / 100);
const epsilonValues = Array.from({length: 100}, (_, i) => (i + 1) / 100);
const xValuesUpTo = (r: number): number[] => Array.from({length: Math.round(r * 100) + 1}, (_, i) => i / 100);

/**
 * Exact (a/b)^n < e/100 by repeated BigInt multiplication, written without `**` or logarithms:
 * a^n * 100 < e * b^n.
 */
function fractionPowerBelow(a: number, b: number, e100: number, n: number): boolean {
    let numerator = BigInt(1);
    let denominator = BigInt(1);
    for (let k = 0; k < n; k++) {
        numerator *= BigInt(a);
        denominator *= BigInt(b);
    }
    return numerator * BigInt(100) < BigInt(e100) * denominator;
}

describe('uniform convergence domains', () => {
    test('constants and example ids', () => {
        expect(UNIFORM_EXAMPLE_IDS).toEqual(['power', 'scaled']);
        expect(UNIFORM_MAX_N).toBe(50);
        expect(isUniformExampleId('power')).toBe(true);
        expect(isUniformExampleId('scaled')).toBe(true);
        expect(isUniformExampleId('sine')).toBe(false);
        expect(isUniformExampleId(undefined)).toBe(false);
    });

    test('r accepts the whole 0.05 grid in [0.1, 1] and nothing else', () => {
        for (const r of rValues) expect(isUniformR(r)).toBe(true);
        expect(rValues).toHaveLength(19);
        for (const r of [0, 0.05, 0.12, 0.8000001, 1.05, 1.0001, -0.5, NaN, Infinity, '0.8', null, undefined]) expect(isUniformR(r)).toBe(false);
    });

    test('n accepts integers 1..50 only', () => {
        for (const n of [1, 2, 25, 50]) expect(isUniformN(n)).toBe(true);
        for (const n of [0, 51, -1, 1.5, NaN, Infinity, '3', undefined]) expect(isUniformN(n)).toBe(false);
    });

    test('epsilon accepts the 0.01 grid in [0.01, 1] and rejects epsilon <= 0, off-grid and larger values', () => {
        for (const e of epsilonValues) expect(isUniformEpsilon(e)).toBe(true);
        for (const e of [0, -0.01, -1, 0.005, 0.015, 1.01, 2, NaN, Infinity, '0.1', undefined]) expect(isUniformEpsilon(e)).toBe(false);
    });

    test('x lies on the 0.01 grid in [0, r]; x > r and off-grid points are rejected', () => {
        for (const r of rValues) for (const x of xValuesUpTo(r)) expect(isUniformX(r, x)).toBe(true);
        expect(isUniformX(0.8, 0.81)).toBe(false);
        expect(isUniformX(0.8, 1)).toBe(false);
        expect(isUniformX(0.1, 0.11)).toBe(false);
        expect(isUniformX(1, 1.01)).toBe(false);
        expect(isUniformX(0.8, -0.01)).toBe(false);
        expect(isUniformX(0.8, 0.555)).toBe(false);
        expect(isUniformX(0.8, NaN)).toBe(false);
        expect(isUniformX(0.8, '0.5')).toBe(false);
        expect(isUniformX(0.77, 0.5)).toBe(false); // r itself is not valid
        expect(isUniformX(undefined, 0)).toBe(false);
    });

    test('the continuous domain point accepts any real in [0, r]', () => {
        expect(isUniformDomainPoint(0.8, 0.3333)).toBe(true);
        expect(isUniformDomainPoint(0.8, 0.8)).toBe(true);
        expect(isUniformDomainPoint(0.8, 0.8000001)).toBe(false);
        expect(isUniformDomainPoint(0.8, -1e-9)).toBe(false);
        expect(isUniformDomainPoint(0.77, 0.5)).toBe(false);
    });
});

describe('uniform convergence values, limits and pointwise errors', () => {
    test('terms against hand values', () => {
        expect(uniformTerm(power, 0.8, 5, 0.8)).toBeCloseTo(0.32768, 12);
        expect(uniformTerm(power, 1, 3, 0.5)).toBe(0.125);
        expect(uniformTerm(power, 0.8, 1, 0.5)).toBe(0.5);
        expect(uniformTerm(scaled, 1, 4, 0.5)).toBe(0.125);
        expect(uniformTerm(scaled, 1, 5, 1)).toBe(0.2);
        expect(uniformTerm(power, 0.8, 7, 0.3333)).toBeCloseTo(0.3333 ** 7, 15);
    });

    test('limits: x^n tends to 0 for x < 1 and to 1 at x = 1; x/n tends to 0', () => {
        for (const x of [0, 0.5, 0.99]) expect(uniformLimit(power, 1, x)).toBe(0);
        expect(uniformLimit(power, 1, 1)).toBe(1);
        for (const x of [0, 0.3, 1]) expect(uniformLimit(scaled, 1, x)).toBe(0);
        expect(uniformLimit(power, 0.8, 0.8)).toBe(0);
    });

    test('pointwise error is 0 at x = 0 and at x = 1 for every n', () => {
        for (let n = 1; n <= UNIFORM_MAX_N; n++) {
            expect(uniformPointwiseError(power, 1, n, 0)).toBe(0);
            expect(uniformPointwiseError(power, 1, n, 1)).toBe(0);
            expect(uniformPointwiseError(scaled, 1, n, 0)).toBe(0);
        }
    });

    test('pointwise error matches hand values', () => {
        expect(uniformPointwiseError(power, 1, 2, 0.5)).toBe(0.25);
        expect(uniformPointwiseError(power, 0.8, 5, 0.8)).toBeCloseTo(0.32768, 12);
        expect(uniformPointwiseError(scaled, 1, 8, 0.5)).toBe(0.0625);
    });

    test('rejects arguments outside the domains', () => {
        expect(() => uniformTerm(power, 0.8, 5, 0.81)).toThrow(RangeError);
        expect(() => uniformTerm(power, 0.8, 5, -0.1)).toThrow(RangeError);
        expect(() => uniformTerm(power, 0.8, 0, 0.5)).toThrow(RangeError);
        expect(() => uniformTerm(power, 0.8, 51, 0.5)).toThrow(RangeError);
        expect(() => uniformTerm(power, 0.8, 1.5, 0.5)).toThrow(RangeError);
        expect(() => uniformTerm(power, 0.77, 5, 0.5)).toThrow(RangeError);
        expect(() => uniformLimit(power, 0.8, 1)).toThrow(RangeError);
        expect(() => uniformPointwiseError(scaled, 0.5, 3, 0.6)).toThrow(RangeError);
        expect(() => uniformPointwiseError(scaled, 0.5, 3, NaN)).toThrow(RangeError);
    });
});

describe('limit function pieces', () => {
    test('x^n on [0, 1]: the segment y = 0 open at 1 and the isolated point (1, 1), never joined', () => {
        expect(uniformLimitPieces(power, 1)).toEqual([
            {kind: 'segment', y: 0, from: 0, to: 1, closedTo: false},
            {kind: 'point', x: 1, y: 1},
        ]);
        expect(uniformLimitHasJump(power, 1)).toBe(true);
    });

    test('x^n on [0, r], r < 1, and x/n: one closed segment y = 0 and no jump', () => {
        expect(uniformLimitPieces(power, 0.8)).toEqual([{kind: 'segment', y: 0, from: 0, to: 0.8, closedTo: true}]);
        expect(uniformLimitPieces(scaled, 1)).toEqual([{kind: 'segment', y: 0, from: 0, to: 1, closedTo: true}]);
        for (const r of rValues) {
            expect(uniformLimitHasJump(scaled, r)).toBe(false);
            expect(uniformLimitHasJump(power, r)).toBe(r === 1);
        }
    });

    test('the pieces agree with the pointwise limit on the grid', () => {
        for (const r of rValues) for (const example of [power, scaled]) {
            const pieces = uniformLimitPieces(example, r);
            for (const x of xValuesUpTo(r)) {
                const point = pieces.find(piece => piece.kind === 'point' && piece.x === x);
                const segment = pieces.find(piece => piece.kind === 'segment' && x >= piece.from && (x < piece.to || (piece.closedTo && x === piece.to)));
                const expected = (point ?? segment)!.y;
                expect(uniformLimit(example, r, x)).toBe(expected);
                // exactly one piece describes each domain point
                expect(Number(point !== undefined) + Number(segment !== undefined)).toBe(1);
            }
        }
    });
});

describe('analytic supremum error', () => {
    test('power on [0, r], r < 1: r^n attained at x = r (0.8^5 = 0.32768)', () => {
        const s = uniformSupremum(power, 0.8, 5);
        expect(s.value).toBeCloseTo(0.32768, 12);
        expect(s.attained).toBe(true);
        expect(s.at).toBe(0.8);
        expect(uniformSupremum(power, 0.5, 3).value).toBe(0.125);
        expect(uniformSupremum(power, 0.5, 10).value).toBeCloseTo(1 / 1024, 15);
        expect(uniformSupremum(power, 0.9, 2).value).toBeCloseTo(0.81, 12);
        expect(uniformSupremum(power, 0.1, 4).value).toBeCloseTo(0.0001, 15);
    });

    test('power on [0, 1]: supremum 1 for every n, not attained, approached near x = 1', () => {
        for (let n = 1; n <= UNIFORM_MAX_N; n++) {
            expect(uniformSupremum(power, 1, n)).toEqual({value: 1, attained: false, at: 1});
        }
    });

    test('the "not attained" claim holds: every grid error on [0, 1] is below 1 while points near 1 get close', () => {
        for (const n of [1, 5, 20, 50]) {
            for (const x of xValuesUpTo(1)) expect(uniformPointwiseError(power, 1, n, x)).toBeLessThan(1);
            expect(uniformPointwiseError(power, 1, n, 1)).toBe(0);
        }
        // sup is a least upper bound: some point has error above 1 - 1/1000 (x = 1 - 1e-5 for n = 50).
        expect(uniformTerm(power, 1, 50, 1 - 1e-5)).toBeGreaterThan(0.999);
    });

    test('scaled: r/n attained at x = r', () => {
        expect(uniformSupremum(scaled, 1, 4)).toEqual({value: 0.25, attained: true, at: 1});
        expect(uniformSupremum(scaled, 0.5, 5)).toEqual({value: 0.1, attained: true, at: 0.5});
        expect(uniformSupremum(scaled, 0.8, 8).value).toBeCloseTo(0.1, 15);
        for (const r of rValues) for (const n of [1, 3, 17, 50]) {
            const s = uniformSupremum(scaled, r, n);
            expect(s.value).toBeCloseTo(r / n, 15);
            expect(s.at).toBe(r);
            // attained: the error at x = r is the supremum
            expect(uniformPointwiseError(scaled, r, n, r)).toBe(s.value);
        }
    });

    test('the supremum bounds the pointwise error on the grid and is attained exactly when claimed', () => {
        for (const example of [power, scaled]) for (const r of [0.1, 0.5, 0.8, 0.95, 1]) for (const n of [1, 2, 7, 50]) {
            const s = uniformSupremum(example, r, n);
            let max = 0;
            for (const x of xValuesUpTo(r)) {
                const error = uniformPointwiseError(example, r, n, x);
                max = Math.max(max, error);
                expect(error).toBeLessThanOrEqual(s.value + 1e-15);
            }
            if (s.attained) expect(uniformPointwiseError(example, r, n, s.at)).toBeCloseTo(s.value, 15);
            else expect(max).toBeLessThan(s.value);
        }
    });

    test('rejects invalid r and n', () => {
        expect(() => uniformSupremum(power, 0.77, 5)).toThrow(RangeError);
        expect(() => uniformSupremum(power, 0.8, 0)).toThrow(RangeError);
        expect(() => uniformSupremum(power, 0.8, 51)).toThrow(RangeError);
        expect(() => uniformSupremum(scaled, 1.05, 5)).toThrow(RangeError);
    });
});

describe('pointwise threshold N(x, epsilon)', () => {
    test('hand values for x^n', () => {
        // 0.5^3 = 0.125 >= 0.1 > 0.5^4 = 0.0625
        expect(uniformPointwiseThreshold(power, 1, 0.5, 0.1)).toEqual({kind: 'threshold', n: 4});
        // 0.8^10 = 0.1074 >= 0.1 > 0.8^11 = 0.0859
        expect(uniformPointwiseThreshold(power, 1, 0.8, 0.1)).toEqual({kind: 'threshold', n: 11});
        // 0.8^5 = 0.32768 < 0.33 but 0.8^4 = 0.4096
        expect(uniformPointwiseThreshold(power, 0.8, 0.8, 0.33)).toEqual({kind: 'threshold', n: 5});
        // 0.99^458 > 0.01 > 0.99^459
        expect(uniformPointwiseThreshold(power, 1, 0.99, 0.01)).toEqual({kind: 'threshold', n: 459});
        // eps = 1: x < 1 gives x^1 < 1
        expect(uniformPointwiseThreshold(power, 1, 0.99, 1)).toEqual({kind: 'threshold', n: 1});
    });

    test('equality is not enough: 0.1^2 = 0.01 is not below 0.01, 0.5^2 = 0.25 is not below 0.25', () => {
        expect(uniformPointwiseThreshold(power, 1, 0.1, 0.01)).toEqual({kind: 'threshold', n: 3});
        expect(uniformPointwiseThreshold(power, 1, 0.5, 0.25)).toEqual({kind: 'threshold', n: 3});
        expect(uniformPointwiseThreshold(power, 1, 0.2, 0.04)).toEqual({kind: 'threshold', n: 3});
        expect(uniformPointwiseThreshold(power, 1, 0.1, 0.1)).toEqual({kind: 'threshold', n: 2});
    });

    test('x = 0 and x = 1: the error is 0 for every n, so N = 1', () => {
        for (const e of epsilonValues) {
            expect(uniformPointwiseThreshold(power, 1, 0, e)).toEqual({kind: 'threshold', n: 1});
            expect(uniformPointwiseThreshold(power, 1, 1, e)).toEqual({kind: 'threshold', n: 1});
            expect(uniformPointwiseThreshold(scaled, 1, 0, e)).toEqual({kind: 'threshold', n: 1});
        }
    });

    test('x^n: N works at n and fails at n - 1, over the whole (x, epsilon) grid, by exact integer arithmetic', () => {
        let maxN = 0;
        for (let x100 = 1; x100 <= 99; x100++) for (let e100 = 1; e100 <= 100; e100++) {
            const result = uniformPointwiseThreshold(power, 1, x100 / 100, e100 / 100);
            expect(result.kind).toBe('threshold');
            if (result.kind !== 'threshold') continue;
            maxN = Math.max(maxN, result.n);
            expect(fractionPowerBelow(x100, 100, e100, result.n)).toBe(true);
            if (result.n > 1) expect(fractionPowerBelow(x100, 100, e100, result.n - 1)).toBe(false);
        }
        expect(maxN).toBe(459);
    });

    test('x^n: agrees with the floating-point power where the margin is not razor thin', () => {
        for (let x100 = 1; x100 <= 99; x100++) for (const e of [0.01, 0.07, 0.1, 0.33, 0.5, 0.99]) {
            const result = uniformPointwiseThreshold(power, 1, x100 / 100, e);
            if (result.kind !== 'threshold') throw new Error('unexpected cap');
            const x = x100 / 100;
            const atN = x ** result.n;
            if (Math.abs(atN - e) > 1e-9) expect(atN).toBeLessThan(e);
            if (result.n > 1 && Math.abs(x ** (result.n - 1) - e) > 1e-9) expect(x ** (result.n - 1)).toBeGreaterThan(e);
        }
    });

    test('N(x) grows without bound as x -> 1 and is non-decreasing in x', () => {
        for (const e of [0.01, 0.1, 0.5]) {
            let previous = 1;
            for (let x100 = 1; x100 <= 99; x100++) {
                const result = uniformPointwiseThreshold(power, 1, x100 / 100, e);
                if (result.kind !== 'threshold') throw new Error('unexpected cap');
                expect(result.n).toBeGreaterThanOrEqual(previous);
                previous = result.n;
            }
        }
    });

    test('x^n on [0, r] with r < 1: the thresholds stay below the uniform threshold', () => {
        for (const r of rValues.filter(value => value < 1)) for (const e of epsilonValues) {
            const shared = uniformThreshold(power, r, e);
            if (shared.kind !== 'threshold') throw new Error('expected a shared threshold');
            for (const x of xValuesUpTo(r)) {
                const pointwise = uniformPointwiseThreshold(power, r, x, e);
                if (pointwise.kind !== 'threshold') throw new Error('unexpected cap');
                expect(pointwise.n).toBeLessThanOrEqual(shared.n);
            }
        }
    });

    test('reports "beyond cap" instead of searching on', () => {
        expect(uniformPointwiseThreshold(power, 1, 0.99, 0.01, 100)).toEqual({kind: 'beyond-cap', cap: 100});
        expect(uniformPointwiseThreshold(power, 1, 0.99, 0.01, 458)).toEqual({kind: 'beyond-cap', cap: 458});
        expect(uniformPointwiseThreshold(power, 1, 0.99, 0.01, 459)).toEqual({kind: 'threshold', n: 459});
        expect(uniformPointwiseThreshold(power, 1, 0.5, 0.1, 3)).toEqual({kind: 'beyond-cap', cap: 3});
        expect(uniformPointwiseThreshold(power, 1, 0.5, 0.1, 4)).toEqual({kind: 'threshold', n: 4});
        expect(UNIFORM_THRESHOLD_CAP).toBeGreaterThan(459);
        expect(() => uniformPointwiseThreshold(power, 1, 0.5, 0.1, 0)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(power, 1, 0.5, 0.1, 2.5)).toThrow(RangeError);
    });

    test('x/n: floor(x / epsilon) + 1, checked by integer reasoning over the whole grid', () => {
        for (let x100 = 0; x100 <= 100; x100++) for (let e100 = 1; e100 <= 100; e100++) {
            const result = uniformPointwiseThreshold(scaled, 1, x100 / 100, e100 / 100);
            if (result.kind !== 'threshold') throw new Error('expected a threshold');
            const n = result.n;
            // x / n < eps  <=>  x100 < n * e100 (integers);  n works and n - 1 does not (n - 1 = 0 is excluded)
            expect(x100 < n * e100).toBe(true);
            if (n > 1) expect(x100 < (n - 1) * e100).toBe(false);
        }
        expect(uniformPointwiseThreshold(scaled, 1, 0.5, 0.1)).toEqual({kind: 'threshold', n: 6});
        expect(uniformPointwiseThreshold(scaled, 1, 0.3, 0.1)).toEqual({kind: 'threshold', n: 4}); // 0.3/3 = 0.1 is not below 0.1
        expect(uniformPointwiseThreshold(scaled, 1, 0.07, 0.07)).toEqual({kind: 'threshold', n: 2});
    });

    test('rejects x > r, off-grid x, epsilon <= 0, off-grid epsilon and a non-grid r', () => {
        expect(() => uniformPointwiseThreshold(power, 0.8, 0.81, 0.1)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(power, 0.8, 1, 0.1)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(power, 1, 0.555, 0.1)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(power, 1, -0.01, 0.1)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(power, 1, 0.5, 0)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(power, 1, 0.5, -0.1)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(power, 1, 0.5, 0.005)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(power, 1, 0.5, 1.01)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(power, 1, 0.5, NaN)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(scaled, 0.77, 0.5, 0.1)).toThrow(RangeError);
        expect(() => uniformPointwiseThreshold(scaled, 0.5, 0.6, 0.1)).toThrow(RangeError);
    });
});

describe('uniform threshold (shared N)', () => {
    test('power, r < 1: least n with r^n < epsilon, exact over the whole grid', () => {
        for (const r of rValues.filter(value => value < 1)) {
            const r20 = Math.round(r * 20);
            for (let e100 = 1; e100 <= 100; e100++) {
                const result = uniformThreshold(power, r, e100 / 100);
                expect(result.kind).toBe('threshold');
                if (result.kind !== 'threshold') continue;
                expect(fractionPowerBelow(r20, 20, e100, result.n)).toBe(true);
                if (result.n > 1) expect(fractionPowerBelow(r20, 20, e100, result.n - 1)).toBe(false);
                // the supremum r^n at the threshold is below epsilon (floating point, away from ties)
                if (Math.abs(r ** result.n - e100 / 100) > 1e-9) expect(uniformSupremum(power, r, Math.min(result.n, UNIFORM_MAX_N)).value < e100 / 100).toBe(result.n <= UNIFORM_MAX_N);
            }
        }
    });

    test('hand values: 0.8^n < 0.1 first at n = 11 (0.8^10 = 0.1074); 0.5^n < 0.01 at n = 7 (0.5^6 = 0.0156, 0.5^7 = 0.0078)', () => {
        expect(uniformThreshold(power, 0.8, 0.1)).toEqual({kind: 'threshold', n: 11});
        expect(uniformThreshold(power, 0.5, 0.01)).toEqual({kind: 'threshold', n: 7});
        expect(uniformThreshold(power, 0.5, 0.25)).toEqual({kind: 'threshold', n: 3}); // 0.5^2 = 0.25 is not below 0.25
        expect(uniformThreshold(power, 0.8, 1)).toEqual({kind: 'threshold', n: 1});
        expect(uniformThreshold(power, 0.95, 0.01)).toEqual({kind: 'threshold', n: 90}); // 0.95^89 = 0.0104, 0.95^90 = 0.0099
    });

    test('power on [0, 1]: no shared N for any epsilon <= 1', () => {
        for (const e of epsilonValues) expect(uniformThreshold(power, 1, e)).toEqual({kind: 'none'});
    });

    test('scaled: floor(r / epsilon) + 1, checked by integer reasoning over the whole grid', () => {
        for (const r of rValues) {
            const r20 = Math.round(r * 20);
            for (let e100 = 1; e100 <= 100; e100++) {
                const result = uniformThreshold(scaled, r, e100 / 100);
                if (result.kind !== 'threshold') throw new Error('expected a threshold');
                const n = result.n;
                // r / n < eps  <=>  5 r20 / n < e100  <=>  5 r20 < n e100
                expect(5 * r20 < n * e100).toBe(true);
                if (n > 1) expect(5 * r20 < (n - 1) * e100).toBe(false);
            }
        }
        expect(uniformThreshold(scaled, 1, 0.1)).toEqual({kind: 'threshold', n: 11});
        expect(uniformThreshold(scaled, 1, 0.01)).toEqual({kind: 'threshold', n: 101});
        expect(uniformThreshold(scaled, 1, 1)).toEqual({kind: 'threshold', n: 2}); // 1/1 = 1 is not below 1
        expect(uniformThreshold(scaled, 0.5, 0.25)).toEqual({kind: 'threshold', n: 3}); // 0.5/2 = 0.25 is not below 0.25
        expect(uniformThreshold(scaled, 0.1, 1)).toEqual({kind: 'threshold', n: 1});
    });

    test('N(epsilon) of the supremum bounds every pointwise threshold, and for x/n it is attained at x = r', () => {
        for (const r of [0.3, 0.8, 1]) for (const e of [0.01, 0.1, 0.5, 1]) {
            const shared = uniformThreshold(scaled, r, e);
            if (shared.kind !== 'threshold') throw new Error('expected a threshold');
            for (const x of xValuesUpTo(r)) {
                const pointwise = uniformPointwiseThreshold(scaled, r, x, e);
                if (pointwise.kind !== 'threshold') throw new Error('unexpected cap');
                expect(pointwise.n).toBeLessThanOrEqual(shared.n);
            }
            expect(uniformPointwiseThreshold(scaled, r, r, e)).toEqual(shared);
        }
    });

    test('rejects invalid r and epsilon', () => {
        expect(() => uniformThreshold(power, 0.77, 0.1)).toThrow(RangeError);
        expect(() => uniformThreshold(power, 0.8, 0)).toThrow(RangeError);
        expect(() => uniformThreshold(power, 0.8, -0.1)).toThrow(RangeError);
        expect(() => uniformThreshold(scaled, 1, 1.01)).toThrow(RangeError);
        expect(() => uniformThreshold(scaled, 1, 0.025)).toThrow(RangeError);
        expect(() => uniformThreshold(scaled, 0.05, 0.1)).toThrow(RangeError);
    });
});

describe('uniform convergence model', () => {
    test('default model is x^n on [0, 0.8], n = 5, supremum hidden', () => {
        expect(DEFAULT_UNIFORM_MODEL).toEqual({example: 'power', r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false});
        expect(parseUniformConvergenceModel(DEFAULT_UNIFORM_MODEL)).toEqual(DEFAULT_UNIFORM_MODEL);
        expect(UNIFORM_EXAMPLE_MODELS.power).toBe(DEFAULT_UNIFORM_MODEL);
    });

    test('every example starting model is valid, names its example and hides the supremum', () => {
        for (const id of UNIFORM_EXAMPLE_IDS) {
            const model = UNIFORM_EXAMPLE_MODELS[id];
            expect(model.example).toBe(id);
            expect(parseUniformConvergenceModel(model)).toEqual(model);
            expect(model.supremumVisible).toBe(false);
        }
        expect(UNIFORM_EXAMPLE_MODELS.scaled.r).toBe(1);
    });

    test('round-trips through JSON, accepts the boundary values and drops unknown properties', () => {
        for (const model of [DEFAULT_UNIFORM_MODEL, UNIFORM_EXAMPLE_MODELS.scaled, {...DEFAULT_UNIFORM_MODEL, supremumVisible: true}]) {
            expect(parseUniformConvergenceModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
        }
        expect(parseUniformConvergenceModel({example: 'power', r: 1, n: 50, x: 1, epsilon: 0.01, supremumVisible: true, extra: 1}))
            .toEqual({example: 'power', r: 1, n: 50, x: 1, epsilon: 0.01, supremumVisible: true});
        expect(parseUniformConvergenceModel({example: 'scaled', r: 0.1, n: 1, x: 0, epsilon: 1, supremumVisible: false}))
            .toEqual({example: 'scaled', r: 0.1, n: 1, x: 0, epsilon: 1, supremumVisible: false});
        expect(parseUniformConvergenceModel({example: 'power', r: 0.8, n: 5, x: 0.8, epsilon: 0.1, supremumVisible: false})?.x).toBe(0.8);
    });

    test('rejects invalid data instead of clamping', () => {
        const good = {example: 'power', r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false};
        const bad: unknown[] = [
            null, undefined, 5, 'power', [], [good],
            {...good, example: 'sine'}, {...good, example: undefined},
            {...good, r: 0.05}, {...good, r: 1.05}, {...good, r: 0.77}, {...good, r: NaN}, {...good, r: '0.8'}, {...good, r: undefined},
            {...good, n: 0}, {...good, n: 51}, {...good, n: 2.5}, {...good, n: NaN}, {...good, n: '5'},
            {...good, x: 0.81}, {...good, x: 1}, {...good, x: -0.01}, {...good, x: 0.555}, {...good, x: NaN}, {...good, x: Infinity}, {...good, x: undefined},
            {...good, epsilon: 0}, {...good, epsilon: -0.1}, {...good, epsilon: 0.005}, {...good, epsilon: 1.01}, {...good, epsilon: NaN}, {...good, epsilon: undefined},
            {...good, supremumVisible: 'false'}, {...good, supremumVisible: 0}, {...good, supremumVisible: undefined},
            {...good, example: 'scaled', r: 0.5, x: 0.6},
        ];
        for (const data of bad) expect(parseUniformConvergenceModel(data)).toBeUndefined();
    });

    test('does not mutate the input', () => {
        const input = {example: 'power', r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: true, extra: 'x'};
        const copy = {...input};
        parseUniformConvergenceModel(input);
        expect(input).toEqual(copy);
    });

    test('changing r keeps x only while it stays in the domain; otherwise it is refused, never clamped', () => {
        const model = {...DEFAULT_UNIFORM_MODEL, x: 0.6};
        expect(changeUniformR(model, 1)).toEqual({ok: true, model: {...model, r: 1}});
        expect(changeUniformR(model, 0.6)).toEqual({ok: true, model: {...model, r: 0.6}});
        expect(changeUniformR(model, 0.55)).toEqual({ok: false, reason: 'x-outside-domain'});
        expect(changeUniformR(model, 0.1)).toEqual({ok: false, reason: 'x-outside-domain'});
        expect(changeUniformR(model, 0.77)).toEqual({ok: false, reason: 'r-invalid'});
        expect(changeUniformR(model, 1.05)).toEqual({ok: false, reason: 'r-invalid'});
        expect(changeUniformR(model, NaN)).toEqual({ok: false, reason: 'r-invalid'});
        expect(changeUniformR(model, '1')).toEqual({ok: false, reason: 'r-invalid'});
        expect(model.r).toBe(0.8);
    });
});
