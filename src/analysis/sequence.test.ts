import {
    isSequenceEpsilon, isSequenceExampleId, isSequenceLimit, isSequenceTerms, isSequenceThreshold, isTermInBand,
    SEQUENCE_EPSILON_MAX, SEQUENCE_EPSILON_MIN, SEQUENCE_EXAMPLE_IDS, SEQUENCE_EXAMPLES, SEQUENCE_LIMIT_MAX, SEQUENCE_LIMIT_MIN,
    SEQUENCE_MAX_STEPS, SEQUENCE_MAX_TERMS, SEQUENCE_THRESHOLD_MAX, SequenceCertificate, sequenceCertificate, sequenceDistance,
    sequenceEpsilonHundredths, SequenceExampleId, sequenceExample, sequenceMinThreshold, sequenceTerm, sequenceThresholdWorks,
} from './sequence';
import {
    canAdvanceSequence, DEFAULT_SEQUENCE_MODEL, defaultSequenceModel, nextSequenceStep, parseSequenceModel, resetSequenceTerms,
    SEQUENCE_EXAMPLE_MODELS, SequenceModel,
} from './sequenceModel';

/** Every grid epsilon as [hundredths, double]. */
const GRID = Array.from({length: 200}, (_, i) => [i + 1, (i + 1) / 100] as const);

const certify = (example: SequenceExampleId, epsilon: number, limit: number, threshold: number, terms = 10): SequenceCertificate =>
    sequenceCertificate({example, epsilon, limit, threshold, terms});

describe('sequence examples', () => {
    test('lists the closed catalog with hard-coded terms', () => {
        expect(SEQUENCE_EXAMPLE_IDS).toEqual(['reciprocal', 'alternating-reciprocal', 'alternating-sign', 'natural']);
        expect([1, 2, 4, 5].map(n => sequenceTerm('reciprocal', n))).toEqual([1, 0.5, 0.25, 0.2]);
        expect([1, 2, 3, 4].map(n => sequenceTerm('alternating-reciprocal', n))).toEqual([-1, 0.5, -1 / 3, 0.25]);
        expect([1, 2, 3, 4, 101].map(n => sequenceTerm('alternating-sign', n))).toEqual([-1, 1, -1, 1, -1]);
        expect([1, 7, 40].map(n => sequenceTerm('natural', n))).toEqual([1, 7, 40]);
        for (const id of SEQUENCE_EXAMPLE_IDS) {
            expect(sequenceExample(id).id).toBe(id);
            expect(SEQUENCE_EXAMPLES[id].plain).not.toBe('');
            expect(SEQUENCE_EXAMPLES[id].latex).not.toContain('\\(');
        }
        expect(SEQUENCE_EXAMPLES.reciprocal.limit).toBe(0);
        expect(SEQUENCE_EXAMPLES['alternating-reciprocal'].limit).toBe(0);
        expect(SEQUENCE_EXAMPLES['alternating-sign'].limit).toBeUndefined();
        expect(SEQUENCE_EXAMPLES.natural.limit).toBeUndefined();
    });

    test('recognises only the listed ids and valid indices', () => {
        expect(SEQUENCE_EXAMPLE_IDS.every(isSequenceExampleId)).toBe(true);
        expect(['', 'Reciprocal', 'sign', null, 1, undefined].some(isSequenceExampleId)).toBe(false);
        expect(() => sequenceExample('nope' as never)).toThrow(RangeError);
        for (const n of [0, -1, 1.5, NaN, Infinity]) expect(() => sequenceTerm('reciprocal', n)).toThrow(RangeError);
    });

    test('the distance to a candidate limit', () => {
        expect(sequenceDistance('reciprocal', 4, 0)).toBe(0.25);
        expect(sequenceDistance('reciprocal', 4, 1)).toBe(0.75);
        expect(sequenceDistance('alternating-reciprocal', 1, 0.5)).toBe(1.5);
        expect(sequenceDistance('alternating-sign', 2, -1)).toBe(2);
        expect(sequenceDistance('natural', 10, 2)).toBe(8);
        expect(() => sequenceDistance('natural', 10, NaN)).toThrow(RangeError);
    });

    test('domain constants and guards', () => {
        expect([SEQUENCE_EPSILON_MIN, SEQUENCE_EPSILON_MAX, SEQUENCE_LIMIT_MIN, SEQUENCE_LIMIT_MAX, SEQUENCE_THRESHOLD_MAX, SEQUENCE_MAX_TERMS])
            .toEqual([0.01, 2, -2, 2, 1000, 40]);
        expect(SEQUENCE_MAX_STEPS).toBe(39);
        // The whole grid is accepted, in the doubles the user interface produces (k / 100 and the decimal literal).
        expect(GRID.every(([, eps]) => isSequenceEpsilon(eps))).toBe(true);
        expect([0.01, 0.07, 0.29, 0.58, 1.1, 1.15, 2].every(isSequenceEpsilon)).toBe(true);
        // Zero, negative, off-grid, out-of-range and non-numeric epsilon are rejected, not clamped.
        expect([0, -0.1, -0.01, 0.005, 0.015, 0.1001, 0.001, 2.01, 2.5, 100, NaN, Infinity, -Infinity, '0.1', null, undefined].some(isSequenceEpsilon)).toBe(false);
        expect([-2, 0, 0.12, 0.9, 0.1 + 0.2, 2].every(isSequenceLimit)).toBe(true);
        // Off-grid limits are rejected, never rounded: 1e-10 is not 0 and 0.995 is not 1.
        expect([-2.01, 2.01, NaN, Infinity, '0', null, 0.123, 0.005, 1e-10, -1e-10, 0.995, 0.3333].some(isSequenceLimit)).toBe(false);
        expect([1, 11, 1000].every(isSequenceThreshold)).toBe(true);
        expect([0, -1, 1.5, 1001, NaN, '3', null].some(isSequenceThreshold)).toBe(false);
        expect([1, 40].every(isSequenceTerms)).toBe(true);
        expect([0, 41, 2.5, NaN, '3', undefined].some(isSequenceTerms)).toBe(false);
    });
});

describe('epsilon grid and exact threshold', () => {
    test('hundredths round trip for every grid value', () => {
        for (const [k, eps] of GRID) expect(sequenceEpsilonHundredths(eps)).toBe(k);
        expect(sequenceEpsilonHundredths(0.07)).toBe(7);
        expect(sequenceEpsilonHundredths(0.075)).toBeUndefined();
    });

    test('N_min is the least integer N with N * k > 100, for every grid epsilon', () => {
        for (const [k, eps] of GRID) {
            // Independent search: the smallest N with N * k > 100 in integers.
            let expected = 1;
            while (expected * k <= 100) expected += 1;
            const nMin = sequenceMinThreshold(eps);
            expect(nMin).toBe(expected);
            // N_min epsilon > 1 >= (N_min - 1) epsilon, in integers (hundredths).
            expect(nMin * k).toBeGreaterThan(100);
            expect((nMin - 1) * k).toBeLessThanOrEqual(100);
            expect(sequenceThresholdWorks(eps, nMin)).toBe(true);
            if (nMin > 1) expect(sequenceThresholdWorks(eps, nMin - 1)).toBe(false);
        }
    });

    test('known values, including epsilon where 1 / epsilon is an integer', () => {
        expect(sequenceMinThreshold(0.1)).toBe(11);
        expect(sequenceMinThreshold(0.01)).toBe(101);
        expect(sequenceMinThreshold(0.5)).toBe(3);
        expect(sequenceMinThreshold(0.25)).toBe(5);
        expect(sequenceMinThreshold(1)).toBe(2);
        expect(sequenceMinThreshold(1.01)).toBe(1);
        expect(sequenceMinThreshold(2)).toBe(1);
        expect(sequenceMinThreshold(0.07)).toBe(15);
        expect(() => sequenceMinThreshold(0)).toThrow(RangeError);
        expect(() => sequenceMinThreshold(-1)).toThrow(RangeError);
        expect(() => sequenceMinThreshold(0.015)).toThrow(RangeError);
        expect(() => sequenceThresholdWorks(0.1, 0)).toThrow(RangeError);
    });
});

describe('certificate for convergent examples with the true limit', () => {
    test.each(['reciprocal', 'alternating-reciprocal'] as const)('%s: N_min works for every n >= N_min, N_min - 1 fails (whole grid)', id => {
        for (const [k, eps] of GRID) {
            let nMin = 1;
            while (nMin * k <= 100) nMin += 1;
            const result = certify(id, eps, 0, nMin);
            expect(result).toMatchObject({kind: 'certified', nMin, thresholdWorks: true});
            // |a_n - 0| < epsilon at n = N_min and well beyond it (the bound 1/n <= 1/N_min is also what the formula proves).
            for (let n = nMin; n <= nMin + 400; n += 1) expect(sequenceDistance(id, n, 0)).toBeLessThan(eps);
            if (nMin > 1) {
                expect(result).toMatchObject({lastFailingIndex: nMin - 1});
                expect(sequenceDistance(id, nMin - 1, 0)).toBeGreaterThanOrEqual(eps);
                const fails = certify(id, eps, 0, nMin - 1);
                expect(fails).toMatchObject({kind: 'threshold-fails', nMin, thresholdWorks: false, failingIndex: nMin - 1});
            } else {
                expect((result as {lastFailingIndex?: number}).lastFailingIndex).toBeUndefined();
            }
        }
    });

    test('a failing threshold reports the first failing index n = N with distance >= epsilon', () => {
        for (const [k, eps] of GRID) {
            for (const threshold of [1, 2, 5, 10, 11, 50, 100, 101, 102]) {
                const result = certify('reciprocal', eps, 0, threshold, 40);
                if (threshold * k > 100) {
                    expect(result.kind).toBe('certified');
                } else {
                    expect(result).toMatchObject({kind: 'threshold-fails', failingIndex: threshold});
                    expect(sequenceDistance('reciprocal', threshold, 0)).toBeGreaterThanOrEqual(eps);
                }
            }
        }
    });

    test('the lesson example: epsilon 0.1 needs N = 11, N = 10 fails at n = 10', () => {
        expect(certify('reciprocal', 0.1, 0, 11)).toMatchObject({kind: 'certified', nMin: 11, lastFailingIndex: 10});
        expect(certify('reciprocal', 0.1, 0, 10)).toMatchObject({kind: 'threshold-fails', nMin: 11, failingIndex: 10});
        expect(certify('reciprocal', 0.1, 0, 5)).toMatchObject({kind: 'threshold-fails', failingIndex: 5});
        // The boundary term 1/10 is exactly epsilon = 0.1: not inside the open band.
        expect(isTermInBand('reciprocal', 10, 0, 0.1)).toBe(false);
        expect(isTermInBand('reciprocal', 11, 0, 0.1)).toBe(true);
    });

    test('isTermInBand agrees with the integer rule across the grid for L = 0 and with the distance elsewhere', () => {
        for (const [k, eps] of GRID) {
            for (const n of [1, 2, 3, 10, 11, 50, 99, 100, 101]) {
                expect(isTermInBand('reciprocal', n, 0, eps)).toBe(n * k > 100);
                expect(isTermInBand('alternating-reciprocal', n, 0, eps)).toBe(n * k > 100);
            }
        }
        // Away from the limit the plain distance decides: |1/3 - 0.5| = 1/6 = 0.1666...
        expect(isTermInBand('reciprocal', 2, 0.5, 0.01)).toBe(true);
        expect(isTermInBand('reciprocal', 100, 0.5, 0.1)).toBe(false);
        expect(isTermInBand('reciprocal', 3, 0.5, 0.16)).toBe(false);
        expect(isTermInBand('reciprocal', 3, 0.5, 0.17)).toBe(true);
        expect(isTermInBand('natural', 2, 2, 0.01)).toBe(true);
        expect(() => isTermInBand('reciprocal', 2, 0.123, 0.1)).toThrow(RangeError);
        expect(() => isTermInBand('reciprocal', 2, 1e-10, 0.1)).toThrow(RangeError);
        expect(() => isTermInBand('reciprocal', 2, 0, 0.015)).toThrow(RangeError);
    });

    test('thresholds beyond the shown terms are reported, never truncated', () => {
        const beyond = certify('reciprocal', 0.01, 0, 101, 40);
        expect(beyond).toMatchObject({kind: 'certified', nMin: 101, thresholdBeyondTerms: true, nMinBeyondTerms: true});
        const within = certify('reciprocal', 0.1, 0, 11, 40);
        expect(within).toMatchObject({kind: 'certified', nMin: 11, thresholdBeyondTerms: false, nMinBeyondTerms: false});
        // The verdict does not depend on the window.
        for (const terms of [1, 5, 10, 11, 12, 40]) {
            const result = certify('reciprocal', 0.1, 0, 11, terms);
            expect(result.kind).toBe('certified');
            expect(result.thresholdBeyondTerms).toBe(11 > terms);
            expect((result as {nMinBeyondTerms: boolean}).nMinBeyondTerms).toBe(11 > terms);
        }
        // N = terms is within the shown terms, N = terms + 1 is not.
        expect(certify('reciprocal', 0.5, 0, 3, 3).thresholdBeyondTerms).toBe(false);
        expect(certify('reciprocal', 0.5, 0, 3, 2).thresholdBeyondTerms).toBe(true);
        // A failing threshold keeps its failing index even when the window is shorter.
        expect(certify('reciprocal', 0.01, 0, 1000, 1)).toMatchObject({kind: 'certified', thresholdBeyondTerms: true});
        expect(certify('reciprocal', 0.01, 0, 100, 1)).toMatchObject({kind: 'threshold-fails', failingIndex: 100, thresholdBeyondTerms: true});
    });

    test('a candidate other than the limit gets no certificate and says so', () => {
        for (const id of ['reciprocal', 'alternating-reciprocal'] as const) {
            for (const [, eps] of GRID.filter(([k]) => k % 17 === 0)) {
                for (const limit of [-2, -0.5, -0.01, 0.01, 0.1, 1, 2]) {
                    for (const threshold of [1, 11, 101, 1000]) {
                        expect(certify(id, eps, limit, threshold)).toMatchObject({kind: 'not-the-limit', actualLimit: 0});
                    }
                }
            }
        }
        expect(certify('reciprocal', 0.1, -0, 11).kind).toBe('certified');
    });
});

describe('band membership at the boundary is exact', () => {
    // |a_n - L| = epsilon on the grid must be outside the open band, whatever the doubles say (|1 - 0.9| is 0.0999... in floating point).
    test('alternating-sign: a term at distance exactly epsilon is outside, one hundredth more is inside', () => {
        expect(isTermInBand('alternating-sign', 2, 0.9, 0.11)).toBe(true);
        expect(isTermInBand('alternating-sign', 2, 0.9, 0.1)).toBe(false);
        for (const [l100, e100] of [[90, 10], [-90, 10], [7, 93], [-7, 93], [30, 70], [55, 45], [-100, 200]]) {
            const limit = l100 / 100;
            // a = 1 is at distance |100 - l100| hundredths, a = -1 at |-100 - l100|.
            expect(isTermInBand('alternating-sign', 2, limit, e100 / 100)).toBe(Math.abs(100 - l100) < e100);
            expect(isTermInBand('alternating-sign', 1, limit, e100 / 100)).toBe(Math.abs(-100 - l100) < e100);
        }
        expect(certify('alternating-sign', 1.01, 0.01, 5).kind).toBe('oscillating');
        expect(certify('alternating-sign', 1.02, 0.01, 5).kind).toBe('epsilon-satisfied');
        expect(certify('alternating-sign', 1.1, 0.1, 5)).toMatchObject({kind: 'oscillating', farthestDistance: 1.1});
        expect(certify('alternating-sign', 1.1, 0.09, 5).kind).toBe('epsilon-satisfied');
    });

    test('reciprocal and alternating-reciprocal: boundary terms for a limit off the true limit', () => {
        // 1/n - 0.3 against epsilon: 1/5 is at 0.1 from 0.3, 1/4 at 0.05.
        expect(isTermInBand('reciprocal', 5, 0.3, 0.1)).toBe(false);
        expect(isTermInBand('reciprocal', 5, 0.3, 0.11)).toBe(true);
        expect(isTermInBand('reciprocal', 4, 0.3, 0.05)).toBe(false);
        expect(isTermInBand('reciprocal', 4, 0.3, 0.06)).toBe(true);
        // 1/10 - 0.2 = -0.1: distance 0.1.
        expect(isTermInBand('reciprocal', 10, 0.2, 0.1)).toBe(false);
        expect(isTermInBand('reciprocal', 10, 0.2, 0.11)).toBe(true);
        // (-1)^n / n: a_3 = -1/3 and a_4 = 1/4 against L = -0.3 and L = 0.3.
        expect(isTermInBand('alternating-reciprocal', 4, 0.3, 0.05)).toBe(false);
        expect(isTermInBand('alternating-reciprocal', 4, 0.3, 0.06)).toBe(true);
        expect(isTermInBand('alternating-reciprocal', 5, -0.3, 0.1)).toBe(false);
        expect(isTermInBand('alternating-reciprocal', 5, -0.3, 0.11)).toBe(true);
        expect(isTermInBand('alternating-reciprocal', 5, 0.3, 0.5)).toBe(false);
        expect(isTermInBand('alternating-reciprocal', 5, 0.3, 0.51)).toBe(true);
    });

    test('natural: a_n = L + epsilon is outside, and the exit index is exact on the grid', () => {
        expect(isTermInBand('natural', 3, 2, 1)).toBe(false);
        expect(isTermInBand('natural', 3, 2, 1.01)).toBe(true);
        expect(isTermInBand('natural', 1, 2, 1)).toBe(false);
        expect(certify('natural', 1, 2, 1)).toMatchObject({kind: 'divergent', exitIndex: 4});
        expect(certify('natural', 0.99, 2, 1)).toMatchObject({exitIndex: 3});
        expect(certify('natural', 0.07, 0.93, 1)).toMatchObject({exitIndex: 2});
        expect(certify('natural', 0.07, 0.92, 1)).toMatchObject({exitIndex: 1});
    });

    test('the integer rule agrees with exact rational arithmetic for every example over the grid', () => {
        for (const id of SEQUENCE_EXAMPLE_IDS) {
            for (const l100 of [-200, -137, -90, -1, 0, 1, 25, 50, 90, 133, 200]) {
                for (const [e100, eps] of GRID.filter(([k]) => k % 7 === 0)) {
                    for (const n of [1, 2, 3, 4, 5, 9, 10, 11, 20, 39, 40]) {
                        const [p, q] = SEQUENCE_EXAMPLES[id].fraction(n);
                        expect(isTermInBand(id, n, l100 / 100, eps)).toBe(Math.abs(100 * p - l100 * q) < e100 * q);
                    }
                }
            }
        }
    });
});

describe('no certificate for alternating-sign', () => {
    test('never a certificate for any epsilon, limit, threshold or window', () => {
        for (const [, eps] of GRID) {
            for (const limit of [-2, -1.5, -1, -0.5, 0, 0.25, 0.5, 1, 1.5, 2]) {
                for (const threshold of [1, 2, 41, 1000]) {
                    for (const terms of [1, 2, 20, 40]) {
                        const result = certify('alternating-sign', eps, limit, threshold, terms);
                        expect(['certified', 'threshold-fails', 'not-the-limit', 'divergent']).not.toContain(result.kind);
                        expect(result.thresholdBeyondTerms).toBe(threshold > terms);
                    }
                }
            }
        }
    });

    test('epsilon <= 1: some term is at distance >= epsilon from every L, at both parities of indices beyond every N', () => {
        for (const [k, eps] of GRID.filter(([k]) => k <= 100)) {
            for (const limit of [-2, -1, -0.3, 0, 0.3, 1, 2]) {
                const result = certify('alternating-sign', eps, limit, 7);
                expect(result).toMatchObject({kind: 'oscillating', reason: 'two-values-outside-band'});
                // Independent check by evaluating the terms: beyond any N one of two consecutive terms is outside the band.
                for (const start of [7, 8, 500, 501]) {
                    const outside = [start, start + 1].some(n => !isTermInBand('alternating-sign', n, limit, eps));
                    expect(outside).toBe(true);
                }
                expect(k).toBeLessThanOrEqual(100);
            }
        }
    });

    test('epsilon > 1: the band can contain every term, which satisfies this one epsilon only', () => {
        // L = 0: both +-1 are at distance 1 < epsilon.
        for (const [, eps] of GRID.filter(([k]) => k > 100)) {
            expect(certify('alternating-sign', eps, 0, 1)).toMatchObject({kind: 'epsilon-satisfied', reason: 'band-contains-every-term'});
            for (let n = 1; n <= 60; n += 1) expect(isTermInBand('alternating-sign', n, 0, eps)).toBe(true);
        }
        // L = 1, epsilon = 1.5: the term -1 is at distance 2 >= 1.5, so no band satisfaction; with L = 0.4 it is 1.4 < 1.5.
        expect(certify('alternating-sign', 1.5, 1, 5)).toMatchObject({kind: 'oscillating', farthestDistance: 2});
        expect(certify('alternating-sign', 1.5, 0.4, 5)).toMatchObject({kind: 'epsilon-satisfied'});
        // 1 + |L| = epsilon exactly: the open band excludes the boundary term.
        expect(certify('alternating-sign', 1.5, 0.5, 5).kind).toBe('oscillating');
        expect(certify('alternating-sign', 1.5, -0.5, 5).kind).toBe('oscillating');
        expect(certify('alternating-sign', 1.07, 0.07, 5).kind).toBe('oscillating');
        expect(isTermInBand('alternating-sign', 2, 0.5, 1.5)).toBe(true);
        expect(isTermInBand('alternating-sign', 1, 0.5, 1.5)).toBe(false);
        // epsilon = 2 with L = 2: |-1 - 2| = 3 >= 2.
        expect(certify('alternating-sign', 2, 2, 1).kind).toBe('oscillating');
        expect(certify('alternating-sign', 2, 0.5, 1).kind).toBe('epsilon-satisfied');
    });
});

describe('no certificate for natural', () => {
    test('never a certificate, whatever the window, epsilon, limit or threshold', () => {
        for (const [, eps] of GRID) {
            for (const limit of [-2, -1, 0, 0.5, 1, 2]) {
                for (const threshold of [1, 3, 40, 41, 1000]) {
                    for (const terms of [1, 40]) {
                        const result = certify('natural', eps, limit, threshold, terms);
                        expect(result).toMatchObject({kind: 'divergent', reason: 'terms-leave-every-band'});
                        expect(result.thresholdBeyondTerms).toBe(threshold > terms);
                    }
                }
            }
        }
    });

    test('the exit index is the least n from which every term exceeds L + epsilon', () => {
        for (const [, eps] of GRID) {
            for (const limit of [-2, -0.99, -0.5, 0, 0.5, 0.99, 1, 2]) {
                const result = certify('natural', eps, limit, 5) as {exitIndex: number};
                const edge = limit + eps;
                // Every n >= exitIndex has a_n - L >= epsilon; the previous index (when it exists) does not exceed the band.
                for (const n of [result.exitIndex, result.exitIndex + 1, result.exitIndex + 100]) expect(n - limit).toBeGreaterThanOrEqual(eps - 1e-9);
                expect(result.exitIndex).toBeGreaterThanOrEqual(1);
                if (result.exitIndex > 1) expect(result.exitIndex - 1 - edge).toBeLessThanOrEqual(1e-9);
            }
        }
        expect(certify('natural', 0.5, 0, 1)).toMatchObject({exitIndex: 1});
        expect(certify('natural', 1, 1, 1)).toMatchObject({exitIndex: 3});
        expect(certify('natural', 2, 2, 1)).toMatchObject({exitIndex: 5});
        expect(certify('natural', 0.01, -2, 1)).toMatchObject({exitIndex: 1});
    });
});

describe('certificate input validation', () => {
    test('rejects invalid epsilon, limit, threshold and terms instead of clamping', () => {
        for (const eps of [0, -0.1, 0.005, 2.01, NaN, Infinity]) expect(() => certify('reciprocal', eps, 0, 5)).toThrow(RangeError);
        for (const limit of [-2.5, 2.5, NaN, 0.123, 1e-10]) expect(() => certify('reciprocal', 0.1, limit, 5)).toThrow(RangeError);
        for (const threshold of [0, 1001, 2.5, NaN, -3]) expect(() => certify('reciprocal', 0.1, 0, threshold)).toThrow(RangeError);
        for (const terms of [0, 41, 1.5]) expect(() => certify('reciprocal', 0.1, 0, 5, terms)).toThrow(RangeError);
        expect(() => certify('nope' as never, 0.1, 0, 5)).toThrow(RangeError);
    });
});

describe('sequence model', () => {
    const model: SequenceModel = {example: 'reciprocal', epsilon: 0.07, limit: 0, threshold: 15, terms: 12, certificateVisible: true};

    test('default models are valid, start with one term and a hidden certificate', () => {
        for (const id of SEQUENCE_EXAMPLE_IDS) {
            const fresh = defaultSequenceModel(id);
            expect(fresh).toEqual(SEQUENCE_EXAMPLE_MODELS[id]);
            expect(fresh).not.toBe(SEQUENCE_EXAMPLE_MODELS[id]);
            expect(parseSequenceModel(fresh)).toEqual(fresh);
            expect(fresh.terms).toBe(1);
            expect(fresh.certificateVisible).toBe(false);
            expect(fresh.example).toBe(id);
            // The default must produce a certificate verdict without throwing.
            expect(() => sequenceCertificate(fresh)).not.toThrow();
        }
        expect(DEFAULT_SEQUENCE_MODEL.example).toBe('reciprocal');
        expect(() => defaultSequenceModel('nope' as never)).toThrow(RangeError);
    });

    test('round trips through JSON and drops unknown properties', () => {
        expect(parseSequenceModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
        expect(parseSequenceModel({...model, extra: 1, history: [1, 2]})).toEqual(model);
        // Every grid epsilon survives a JSON round trip unchanged.
        for (const [, eps] of GRID) expect(parseSequenceModel({...model, epsilon: eps})?.epsilon).toBe(eps);
        // Extreme but valid values.
        expect(parseSequenceModel({...model, epsilon: 2, limit: -2, threshold: 1000, terms: 40})).toBeDefined();
        expect(parseSequenceModel({...model, epsilon: 0.01, limit: 2, threshold: 1, terms: 1, certificateVisible: false})).toBeDefined();
    });

    test('rejects invalid data rather than clamping it', () => {
        const bad: unknown[] = [
            null, undefined, 'x', 3, [], [model],
            {...model, example: 'nope'}, {...model, example: undefined},
            {...model, epsilon: 0}, {...model, epsilon: -0.5}, {...model, epsilon: 0.015}, {...model, epsilon: 2.01}, {...model, epsilon: '0.1'},
            {...model, epsilon: NaN}, {...model, epsilon: undefined},
            {...model, limit: 2.01}, {...model, limit: -2.01}, {...model, limit: 0.123}, {...model, limit: 1e-10}, {...model, limit: NaN}, {...model, limit: '0'}, {...model, limit: undefined},
            {...model, threshold: 0}, {...model, threshold: 1001}, {...model, threshold: 2.5}, {...model, threshold: undefined},
            {...model, terms: 0}, {...model, terms: 41}, {...model, terms: 3.5}, {...model, terms: undefined},
            {...model, certificateVisible: 'yes'}, {...model, certificateVisible: 1}, {...model, certificateVisible: undefined},
        ];
        for (const data of bad) expect(parseSequenceModel(data)).toBeUndefined();
        const {certificateVisible, ...missing} = model;
        expect(certificateVisible).toBe(true);
        expect(parseSequenceModel(missing)).toBeUndefined();
    });
});

describe('sequence transition', () => {
    const start: SequenceModel = {...defaultSequenceModel('reciprocal'), terms: 1};

    test('each step reveals one more term and keeps every other field', () => {
        const step = nextSequenceStep(start);
        expect(step).toEqual({model: {...start, terms: 2}, advanced: true, outcome: 'continue'});
        expect(start.terms).toBe(1);
    });

    test('k steps give terms = 1 + k, complete exactly at the maximum, and the model stays valid', () => {
        let current = start;
        for (let k = 1; k <= SEQUENCE_MAX_STEPS; k += 1) {
            const step = nextSequenceStep(current);
            expect(step.advanced).toBe(true);
            expect(step.model.terms).toBe(1 + k);
            expect(step.outcome).toBe(k === SEQUENCE_MAX_STEPS ? 'complete' : 'continue');
            expect(parseSequenceModel(step.model)).toEqual(step.model);
            current = step.model;
        }
        expect(current.terms).toBe(SEQUENCE_MAX_TERMS);
        expect(canAdvanceSequence(current)).toBe(false);
    });

    test('at the maximum nothing changes and the outcome is complete', () => {
        const full = {...start, terms: SEQUENCE_MAX_TERMS};
        const step = nextSequenceStep(full);
        expect(step.model).toBe(full);
        expect(step).toMatchObject({advanced: false, outcome: 'complete'});
        expect(canAdvanceSequence(start)).toBe(true);
    });

    test('reset returns to one term and keeps the rest', () => {
        const advanced: SequenceModel = {...start, terms: 25, epsilon: 0.3, threshold: 9, certificateVisible: true};
        expect(resetSequenceTerms(advanced)).toEqual({...advanced, terms: 1});
    });
});
