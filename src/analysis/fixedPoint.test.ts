import {
    FIXED_POINT_EXAMPLE_IDS, FIXED_POINT_EXAMPLES, FIXED_POINT_MAX_DIGITS, FIXED_POINT_MAX_STEPS, FIXED_POINT_MIN_DIGITS,
    fixedPointExample, fixedPointHistory, fixedPointHundredths, fixedPointTolerance, isFixedPointDigits, isFixedPointExampleId,
    isFixedPointStart, isFixedPointStepCount,
} from './fixedPoint';
import {
    DEFAULT_FIXED_POINT_MODEL, defaultFixedPointModel, fixedPointCanAdvance, FixedPointModel, fixedPointTransition,
    normalizeFixedPointModel, parseFixedPointModel,
} from './fixedPointModel';

/** The Dottie number, the fixed point of cos, hard-coded as an independent reference (not computed by the module). */
const DOTTIE = 0.7390851332151607;
/** cos 1 and sin 1, hard-coded. */
const COS_1 = 0.5403023058681398;
const SIN_1 = 0.8414709848078965;

describe('fixed-point examples', () => {
    test('lists the closed catalog with hard-coded values', () => {
        expect(FIXED_POINT_EXAMPLE_IDS).toEqual(['affine', 'cosine', 'reflection']);
        const {affine, cosine, reflection} = FIXED_POINT_EXAMPLES;
        expect([0, 1, 2].map(affine.value)).toEqual([0.5, 1, 1.5]);
        expect(cosine.value(0)).toBe(1);
        expect(cosine.value(1)).toBeCloseTo(COS_1, 15);
        expect([0, 0.25, 1].map(reflection.value)).toEqual([1, 0.75, 0]);
        expect([[affine.a, affine.b], [cosine.a, cosine.b], [reflection.a, reflection.b]]).toEqual([[0, 2], [0, 1], [0, 1]]);
        for (const id of FIXED_POINT_EXAMPLE_IDS) {
            const example = fixedPointExample(id);
            expect(example.id).toBe(id);
            expect(example.plain).not.toBe('');
            expect(example.latex).not.toContain('\\(');
            expect(isFixedPointStart(id, example.defaultX0)).toBe(true);
        }
        expect(affine.defaultX0).toBe(0);
    });

    test('recognises only the listed ids', () => {
        expect(FIXED_POINT_EXAMPLE_IDS.every(isFixedPointExampleId)).toBe(true);
        expect(['cos', '', 'Affine', null, 1, undefined].some(isFixedPointExampleId)).toBe(false);
        expect(() => fixedPointExample('nope' as never)).toThrow(RangeError);
    });

    test('contraction factors: affine 1/2, cosine sin 1 < 1, reflection none', () => {
        expect(FIXED_POINT_EXAMPLES.affine.q).toBe(0.5);
        expect(FIXED_POINT_EXAMPLES.cosine.q).toBeCloseTo(SIN_1, 15);
        expect(FIXED_POINT_EXAMPLES.cosine.q).toBeLessThan(1);
        expect(FIXED_POINT_EXAMPLES.reflection.q).toBeUndefined();
        for (const id of FIXED_POINT_EXAMPLE_IDS) {
            expect(FIXED_POINT_EXAMPLES[id].hypotheses.contraction?.q).toBe(FIXED_POINT_EXAMPLES[id].q);
        }
    });

    test('hypotheses data: closed interval, self-map with image inside the interval, contraction reason or its absence', () => {
        for (const id of FIXED_POINT_EXAMPLE_IDS) {
            const example = FIXED_POINT_EXAMPLES[id];
            const h = example.hypotheses;
            expect(h.interval).toEqual({a: example.a, b: example.b, closed: true});
            expect(h.selfMap.image.lo).toBeGreaterThanOrEqual(example.a);
            expect(h.selfMap.image.hi).toBeLessThanOrEqual(example.b);
            expect(h.selfMap.reason).toBeTruthy();
            expect(h.selfMap.imageLatex).not.toContain('\\(');
        }
        expect(FIXED_POINT_EXAMPLES.affine.hypotheses.selfMap.image).toEqual({lo: 0.5, hi: 1.5});
        expect(FIXED_POINT_EXAMPLES.cosine.hypotheses.selfMap.image.lo).toBeCloseTo(COS_1, 15);
        expect(FIXED_POINT_EXAMPLES.cosine.hypotheses.selfMap.image.hi).toBe(1);
        expect(FIXED_POINT_EXAMPLES.reflection.hypotheses.contraction).toBeNull();
        expect(FIXED_POINT_EXAMPLES.reflection.hypotheses.noContractionReason).toBe('derivative-modulus-one');
        expect(FIXED_POINT_EXAMPLES.affine.hypotheses.noContractionReason).toBeUndefined();
        expect(FIXED_POINT_EXAMPLES.cosine.hypotheses.contraction?.reason).toBe('sine-derivative-bound');
    });

    test('the self-map really maps sample points of the interval into it', () => {
        for (const id of FIXED_POINT_EXAMPLE_IDS) {
            const example = FIXED_POINT_EXAMPLES[id];
            for (let i = 0; i <= 100; i++) {
                const y = example.value(example.a + (example.b - example.a) * i / 100);
                expect(y).toBeGreaterThanOrEqual(example.a - 1e-15);
                expect(y).toBeLessThanOrEqual(example.b + 1e-15);
            }
        }
    });

    test('the derivative bound holds: sampled |T(x) - T(y)| <= q |x - y| for the contractions', () => {
        for (const id of ['affine', 'cosine'] as const) {
            const example = FIXED_POINT_EXAMPLES[id];
            const q = example.q ?? NaN;
            for (let i = 0; i <= 40; i++) {
                for (let j = 0; j <= 40; j++) {
                    const x = example.a + (example.b - example.a) * i / 40;
                    const y = example.a + (example.b - example.a) * j / 40;
                    expect(Math.abs(example.value(x) - example.value(y))).toBeLessThanOrEqual(q * Math.abs(x - y) + 1e-15);
                }
            }
        }
    });

    test('domain guards', () => {
        expect(fixedPointHundredths(0.07)).toBe(7);
        expect(fixedPointHundredths(1.99)).toBe(199);
        expect(fixedPointHundredths(0.29)).toBe(29);
        expect([0.005, 0.123, NaN, Infinity, '0.1', null, undefined].map(fixedPointHundredths)).toEqual(Array(7).fill(undefined));
        expect([isFixedPointStart('affine', 0), isFixedPointStart('affine', 2), isFixedPointStart('affine', 1.99)]).toEqual([true, true, true]);
        expect([-0.01, 2.01, 0.123, NaN, '1', null].some(x => isFixedPointStart('affine', x))).toBe(false);
        expect([isFixedPointStart('cosine', 1), isFixedPointStart('cosine', 1.01), isFixedPointStart('reflection', 0.5)]).toEqual([true, false, true]);
        expect(isFixedPointStart('nope' as never, 0)).toBe(false);
        expect([0, 1, 60].every(isFixedPointStepCount)).toBe(true);
        expect([-1, 0.5, 61, NaN, Infinity, '2', null].some(isFixedPointStepCount)).toBe(false);
        expect([1, 3, 8].every(isFixedPointDigits)).toBe(true);
        expect([0, 9, 2.5, NaN, '3', null, undefined].some(isFixedPointDigits)).toBe(false);
        expect([FIXED_POINT_MAX_STEPS, FIXED_POINT_MIN_DIGITS, FIXED_POINT_MAX_DIGITS]).toEqual([60, 1, 8]);
        expect([1, 3, 8].map(fixedPointTolerance)).toEqual([0.1, 0.001, 1e-8]);
        expect(() => fixedPointTolerance(0)).toThrow(RangeError);
    });
});

describe('affine iteration (x + 1)/2 on [0, 2] from 0', () => {
    test('x_k = 1 - 2^-k exactly, for every k up to 53', () => {
        const h = fixedPointHistory('affine', 0, 20, 8, {thresholdStops: false});
        expect(h.step).toBe(20);
        h.points.forEach((p, k) => {
            expect(p.k).toBe(k);
            expect(p.x).toBe(1 - Math.pow(2, -k));
        });
        const long = fixedPointHistory('affine', 0, 53, 8, {thresholdStops: false});
        expect(long.points[53].x).toBe(1 - Math.pow(2, -53));
        expect(long.termination).toBeUndefined();
    });

    test('steps are the cobweb pairs (x_{k-1}, x_k)', () => {
        const h = fixedPointHistory('affine', 0, 4, 8);
        expect(h.steps.map(s => [s.index, s.from, s.to])).toEqual([[1, 0, 0.5], [2, 0.5, 0.75], [3, 0.75, 0.875], [4, 0.875, 0.9375]]);
        expect(h.current).toBe(h.points[4]);
        expect(h.termination).toBeUndefined();
        expect(h.cycle).toBeUndefined();
    });

    test('bounds: a priori 2^-k and a posteriori 2^-k, equal to the true error 1 - x_k', () => {
        const h = fixedPointHistory('affine', 0, 12, 8);
        expect(h.q).toBe(0.5);
        h.points.forEach((p, k) => {
            const error = 1 - p.x;
            expect(error).toBe(Math.pow(2, -k));
            expect(p.aPriori).toBe(Math.pow(2, -k));
            if (k === 0) {
                expect(p.aPosteriori).toBeUndefined();
                expect(p.delta).toBeUndefined();
            } else {
                expect(p.aPosteriori).toBe(Math.pow(2, -k));
                expect(p.delta).toBe(Math.pow(2, -k));
            }
            expect(p.aPriori).toBeGreaterThanOrEqual(error);
        });
    });

    test('a start other than 0: the a priori bound uses |x_1 - x_0| and contains the true error', () => {
        const h = fixedPointHistory('affine', 2, 10, 8, {thresholdStops: false});
        // x_k = 1 + 2^-k exactly, error 2^-k, |x_1 - x_0| = 1/2... T(2) = 1.5.
        h.points.forEach((p, k) => {
            expect(p.x).toBe(1 + Math.pow(2, -k));
            expect(p.aPriori).toBe(Math.pow(2, -k) / 0.5 * 0.5);
            expect(p.aPriori).toBeGreaterThanOrEqual(Math.abs(p.x - 1));
        });
    });

    test('threshold stop: the first k with a posteriori bound < 10^-d (independent: 2^-k < 10^-d)', () => {
        const expected: Record<number, number> = {1: 4, 2: 7, 3: 10, 4: 14, 5: 17, 6: 20, 7: 24, 8: 27};
        for (let d = 1; d <= 8; d++) {
            const h = fixedPointHistory('affine', 0, FIXED_POINT_MAX_STEPS, d);
            expect(h.termination).toBe('threshold');
            expect(h.step).toBe(expected[d]);
            expect(Math.pow(2, -h.step)).toBeLessThan(Math.pow(10, -d));
            expect(Math.pow(2, -(h.step - 1))).toBeGreaterThanOrEqual(Math.pow(10, -d));
            expect(h.current.aPosteriori).toBeLessThan(h.tolerance);
            expect(h.fixedPoint).toBeUndefined();
        }
    });

    test('a request beyond the threshold is cut to the threshold step', () => {
        const exact = fixedPointHistory('affine', 0, 10, 3);
        expect(exact.termination).toBe('threshold');
        expect(fixedPointHistory('affine', 0, 9, 3).termination).toBeUndefined();
        expect(fixedPointHistory('affine', 0, 40, 3)).toEqual(exact);
    });

    test('floating-point stagnation is reported as stagnation, not as a fixed point (threshold off)', () => {
        const h = fixedPointHistory('affine', 0, FIXED_POINT_MAX_STEPS, 8, {thresholdStops: false});
        expect(h.points[54].x).toBe(1);
        expect(h.points[53].x).toBe(1 - Math.pow(2, -53));
        expect(h.termination).toBe('stagnation');
        expect(h.step).toBe(55);
        expect(h.fixedPoint).toBeUndefined();
        expect(h.current.delta).toBe(0);
        expect(fixedPointHistory('affine', 0, 54, 8, {thresholdStops: false}).termination).toBeUndefined();
    });

    test('x0 = 1 equals the fixed point exactly: reported as the fixed point with no steps', () => {
        const h = fixedPointHistory('affine', 1, 10, 3);
        expect(h).toMatchObject({termination: 'fixed-point', fixedPoint: 1, step: 0});
        expect(h.steps).toEqual([]);
        expect(h.current.x).toBe(1);
    });

    test('x0 = 1.99 and 0.01 are near, not at, the fixed point and iterate normally', () => {
        for (const x0 of [0.99, 1.01]) {
            const h = fixedPointHistory('affine', x0, 3, 8);
            expect(h.fixedPoint).toBeUndefined();
            expect(h.termination).toBeUndefined();
            expect(h.step).toBe(3);
        }
    });

    test('is deterministic and a prefix of any longer history', () => {
        const short = fixedPointHistory('affine', 0.5, 4, 5);
        expect(fixedPointHistory('affine', 0.5, 4, 5)).toEqual(short);
        const longer = fixedPointHistory('affine', 0.5, 9, 5);
        expect(longer.points.slice(0, 5).map(p => p.x)).toEqual(short.points.map(p => p.x));
        expect(longer.steps.slice(0, 4)).toEqual(short.steps);
    });
});

describe('cosine iteration on [0, 1]', () => {
    test('first iterates from 0: 1, cos 1, cos cos 1', () => {
        const h = fixedPointHistory('cosine', 0, 3, 8);
        expect(h.points.map(p => p.x)[0]).toBe(0);
        expect(h.points[1].x).toBe(1);
        expect(h.points[2].x).toBeCloseTo(COS_1, 15);
        expect(h.points[3].x).toBeCloseTo(0.8575532158463934, 12);
        expect(h.q).toBeCloseTo(SIN_1, 15);
    });

    test('all iterates stay in [0, 1] and tend to the Dottie number', () => {
        const h = fixedPointHistory('cosine', 0, FIXED_POINT_MAX_STEPS, 8, {thresholdStops: false});
        for (const p of h.points) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(1);
        }
        expect(Math.abs(h.current.x - DOTTIE)).toBeLessThan(1e-4);
        expect(Math.abs(DOTTIE - Math.cos(DOTTIE))).toBeLessThan(1e-15);
    });

    test('both bounds are at least the true error against the reference at every step up to the stop', () => {
        for (const x0 of [0, 0.5, 1, 0.74, 0.3]) {
            for (const d of [1, 3, 8]) {
                const h = fixedPointHistory('cosine', x0, FIXED_POINT_MAX_STEPS, d);
                expect(h.step).toBeGreaterThan(0);
                for (const p of h.points) {
                    const error = Math.abs(p.x - DOTTIE);
                    expect(p.aPriori).toBeGreaterThanOrEqual(error);
                    if (p.k >= 1) expect(p.aPosteriori).toBeGreaterThanOrEqual(error);
                }
            }
        }
    });

    test('threshold stop: the first step whose a posteriori bound is < 10^-d, with the true error below 10^-d', () => {
        for (const d of [1, 2, 3]) {
            const h = fixedPointHistory('cosine', 0, FIXED_POINT_MAX_STEPS, d);
            expect(h.termination).toBe('threshold');
            expect(h.current.aPosteriori).toBeLessThan(Math.pow(10, -d));
            expect(Math.abs(h.current.x - DOTTIE)).toBeLessThan(Math.pow(10, -d));
            // Independent recomputation of the stopping step.
            const q = SIN_1;
            let x = 0, k = 0, stop = -1;
            while (stop < 0 && k < FIXED_POINT_MAX_STEPS) {
                const nextX = Math.cos(x);
                k += 1;
                if (q / (1 - q) * Math.abs(nextX - x) < Math.pow(10, -d)) stop = k;
                x = nextX;
            }
            expect(h.step).toBe(stop);
            expect(h.points[h.step - 1].aPosteriori === undefined || h.points[h.step - 1].aPosteriori as number >= Math.pow(10, -d)).toBe(true);
        }
    });

    test('hard-coded stopping steps for d = 1..8 from 0 (the bound is conservative: the true error is far below it)', () => {
        const stops = [11, 16, 22, 28, 34, 40, 45, 51];
        stops.forEach((stop, i) => {
            const d = i + 1;
            const h = fixedPointHistory('cosine', 0, FIXED_POINT_MAX_STEPS, d);
            expect(h.termination).toBe('threshold');
            expect(h.step).toBe(stop);
            expect(Math.abs(h.current.x - DOTTIE)).toBeLessThan(h.current.aPosteriori as number);
        });
    });

    test('a request one step short of the threshold is still running', () => {
        expect(fixedPointHistory('cosine', 0, 50, 8).termination).toBeUndefined();
        expect(fixedPointHistory('cosine', 0, 51, 8).termination).toBe('threshold');
    });

    test('the iteration limit is reported when the tolerance is not reached: the limit is the stop for the slowly converging cosine start with threshold off', () => {
        const h = fixedPointHistory('cosine', 0, FIXED_POINT_MAX_STEPS, 8, {thresholdStops: false});
        expect(h.termination).toBe('iteration-limit');
        expect(h.step).toBe(FIXED_POINT_MAX_STEPS);
        expect(fixedPointHistory('cosine', 0, FIXED_POINT_MAX_STEPS - 1, 8, {thresholdStops: false}).termination).toBeUndefined();
    });

    test('no start is declared the fixed point, even one close to the Dottie number', () => {
        for (const x0 of [0.73, 0.74, 0.75]) {
            const h = fixedPointHistory('cosine', x0, 5, 8);
            expect(h.fixedPoint).toBeUndefined();
            expect(h.termination).toBeUndefined();
        }
        expect(FIXED_POINT_EXAMPLES.cosine.exactFixedPoint).toBeUndefined();
    });
});

describe('reflection 1 - x on [0, 1]', () => {
    test('two-cycle x0, 1 - x0, x0, ... exactly, for every grid start (integer hundredths)', () => {
        for (let n = 0; n <= 100; n++) {
            if (n === 50) continue;
            const x0 = n / 100;
            const h = fixedPointHistory('reflection', x0, 10, 3);
            h.points.forEach((p, k) => expect(p.x).toBe(k % 2 === 0 ? n / 100 : (100 - n) / 100));
            expect(h.cycle).toEqual({first: n / 100, second: (100 - n) / 100});
            expect(h.fixedPoint).toBeUndefined();
        }
        // The naive float 1 - (1 - 0.07) is not 0.07; the module still returns exactly 0.07.
        expect(1 - (1 - 0.07)).not.toBe(0.07);
        expect(fixedPointHistory('reflection', 0.07, 2, 3).points[2].x).toBe(0.07);
    });

    test('no bound, no contraction factor, no divergence claim; the cycle is reported once x_2 = x_0', () => {
        const h = fixedPointHistory('reflection', 0.2, 6, 3);
        expect(h.q).toBeUndefined();
        for (const p of h.points) {
            expect(p.aPriori).toBeUndefined();
            expect(p.aPosteriori).toBeUndefined();
        }
        expect(h.hypotheses.contraction).toBeNull();
        expect(h.termination).toBeUndefined();
        expect(h.cycle).toEqual({first: 0.2, second: 0.8});
        expect(Object.keys(h).some(key => /diverg/i.test(key))).toBe(false);
        expect(fixedPointHistory('reflection', 0.2, 1, 3).cycle).toBeUndefined();
        expect(fixedPointHistory('reflection', 0.2, 0, 3).cycle).toBeUndefined();
    });

    test('the threshold never fires; playback runs to the iteration limit', () => {
        const h = fixedPointHistory('reflection', 0.2, FIXED_POINT_MAX_STEPS, 1);
        expect(h.termination).toBe('iteration-limit');
        expect(h.step).toBe(FIXED_POINT_MAX_STEPS);
        expect(h.cycle).toEqual({first: 0.2, second: 0.8});
    });

    test('x0 = 1/2 equals the fixed point exactly: no steps, no cycle', () => {
        const h = fixedPointHistory('reflection', 0.5, 7, 3);
        expect(h).toMatchObject({termination: 'fixed-point', fixedPoint: 0.5, step: 0});
        expect(h.cycle).toBeUndefined();
        expect(h.steps).toEqual([]);
    });

    test('the endpoints 0 and 1 swap', () => {
        expect(fixedPointHistory('reflection', 0, 3, 3).points.map(p => p.x)).toEqual([0, 1, 0, 1]);
        expect(fixedPointHistory('reflection', 1, 3, 3).points.map(p => p.x)).toEqual([1, 0, 1, 0]);
    });
});

describe('fixed-point history validation', () => {
    test('rejects off-grid and out-of-interval starts, bad step counts and bad digits with RangeError', () => {
        expect(() => fixedPointHistory('affine', 0.123, 1, 3)).toThrow(RangeError);
        expect(() => fixedPointHistory('affine', 2.01, 1, 3)).toThrow(RangeError);
        expect(() => fixedPointHistory('cosine', 1.5, 1, 3)).toThrow(RangeError);
        expect(() => fixedPointHistory('reflection', -0.01, 1, 3)).toThrow(RangeError);
        expect(() => fixedPointHistory('affine', NaN, 1, 3)).toThrow(RangeError);
        expect(() => fixedPointHistory('affine', 0, FIXED_POINT_MAX_STEPS + 1, 3)).toThrow(RangeError);
        expect(() => fixedPointHistory('affine', 0, -1, 3)).toThrow(RangeError);
        expect(() => fixedPointHistory('affine', 0, 1.5, 3)).toThrow(RangeError);
        expect(() => fixedPointHistory('affine', 0, 1, 0)).toThrow(RangeError);
        expect(() => fixedPointHistory('affine', 0, 1, 9)).toThrow(RangeError);
        expect(() => fixedPointHistory('affine', 0, 1, 2.5)).toThrow(RangeError);
        expect(() => fixedPointHistory('nope' as never, 0, 1, 3)).toThrow(RangeError);
    });
});

describe('fixed-point model', () => {
    test('the default model is the affine example from 0 at step 0 with 3 digits and the bound hidden', () => {
        expect(DEFAULT_FIXED_POINT_MODEL).toEqual({example: 'affine', x0: 0, step: 0, digits: 3, boundVisible: false});
        expect(parseFixedPointModel(DEFAULT_FIXED_POINT_MODEL)).toEqual(DEFAULT_FIXED_POINT_MODEL);
        expect(defaultFixedPointModel('reflection')).toEqual({example: 'reflection', x0: 0.2, step: 0, digits: 3, boundVisible: false});
    });

    test('round-trips valid models, including through JSON', () => {
        const models: FixedPointModel[] = [
            {example: 'affine', x0: 2, step: 60, digits: 8, boundVisible: true},
            {example: 'cosine', x0: 0.37, step: 5, digits: 1, boundVisible: false},
            {example: 'reflection', x0: 0.5, step: 0, digits: 4, boundVisible: true},
            {example: 'reflection', x0: 0.07, step: 12, digits: 2, boundVisible: false},
        ];
        for (const model of models) {
            expect(parseFixedPointModel(model)).toEqual(model);
            expect(parseFixedPointModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
        }
    });

    test('drops unknown properties', () => {
        expect(parseFixedPointModel({...DEFAULT_FIXED_POINT_MODEL, history: [1, 2], playing: true})).toEqual(DEFAULT_FIXED_POINT_MODEL);
    });

    test('rejects non-objects and arrays', () => {
        for (const bad of [null, undefined, 1, 'x', true, [], [DEFAULT_FIXED_POINT_MODEL]]) {
            expect(parseFixedPointModel(bad)).toBeUndefined();
        }
    });

    test('rejects unknown examples, off-grid and out-of-interval starts, long steps, bad digits and a non-boolean flag', () => {
        const ok = {example: 'affine', x0: 0, step: 0, digits: 3, boundVisible: false};
        expect(parseFixedPointModel({...ok, example: 'sine'})).toBeUndefined();
        expect(parseFixedPointModel({...ok, example: undefined})).toBeUndefined();
        for (const x0 of [0.123, 0.005, -0.01, 2.01, NaN, Infinity, '1', null, undefined]) expect(parseFixedPointModel({...ok, x0})).toBeUndefined();
        expect(parseFixedPointModel({example: 'cosine', x0: 1.5, step: 0, digits: 3, boundVisible: false})).toBeUndefined();
        expect(parseFixedPointModel({example: 'reflection', x0: 1.01, step: 0, digits: 3, boundVisible: false})).toBeUndefined();
        for (const step of [-1, 0.5, FIXED_POINT_MAX_STEPS + 1, NaN, Infinity, '1', null, undefined]) {
            expect(parseFixedPointModel({...ok, step})).toBeUndefined();
        }
        for (const digits of [0, 9, 2.5, -1, NaN, '3', null, undefined]) expect(parseFixedPointModel({...ok, digits})).toBeUndefined();
        for (const boundVisible of [0, 1, 'true', null, undefined]) expect(parseFixedPointModel({...ok, boundVisible})).toBeUndefined();
    });
});

describe('fixed-point transition', () => {
    const run = (model: FixedPointModel, times: number): { model: FixedPointModel; outcomes: string[] } => {
        const outcomes: string[] = [];
        let current = model;
        for (let i = 0; i < times; i++) {
            const result = fixedPointTransition(current);
            outcomes.push(result.outcome);
            current = result.model;
        }
        return {model: current, outcomes};
    };

    test('k transitions give the model at step k', () => {
        const start = {...DEFAULT_FIXED_POINT_MODEL, boundVisible: true};
        expect(run(start, 5).model).toEqual({...start, step: 5});
        expect(run(start, 5).outcomes).toEqual(Array(5).fill('continue'));
    });

    test('completes at the threshold, then stays put', () => {
        const {model, outcomes} = run(DEFAULT_FIXED_POINT_MODEL, 12);
        expect(model.step).toBe(10);
        expect(outcomes.indexOf('complete')).toBe(9);
        expect(outcomes.slice(10)).toEqual(['complete', 'complete']);
        expect(fixedPointCanAdvance(model)).toBe(false);
        expect(fixedPointTransition(model).model).toBe(model);
    });

    test('completes at the iteration limit for the reflection', () => {
        const start = defaultFixedPointModel('reflection');
        const {model, outcomes} = run(start, 70);
        expect(model.step).toBe(FIXED_POINT_MAX_STEPS);
        expect(outcomes.indexOf('complete')).toBe(FIXED_POINT_MAX_STEPS - 1);
        expect(outcomes.filter(o => o === 'continue')).toHaveLength(FIXED_POINT_MAX_STEPS - 1);
    });

    test('a known fixed point cannot advance and reports complete unchanged', () => {
        const start: FixedPointModel = {...DEFAULT_FIXED_POINT_MODEL, x0: 1};
        expect(fixedPointCanAdvance(start)).toBe(false);
        const result = fixedPointTransition(start);
        expect(result).toEqual({model: start, outcome: 'complete'});
    });

    test('a stored step beyond the termination is normalized', () => {
        expect(normalizeFixedPointModel({...DEFAULT_FIXED_POINT_MODEL, step: 50}).step).toBe(10);
        expect(normalizeFixedPointModel({...DEFAULT_FIXED_POINT_MODEL, x0: 1, step: 7}).step).toBe(0);
        const fine = {...DEFAULT_FIXED_POINT_MODEL, step: 4};
        expect(normalizeFixedPointModel(fine)).toBe(fine);
    });

    test('changing the tolerance changes where the same iteration stops, never the iterates', () => {
        const loose = run({...DEFAULT_FIXED_POINT_MODEL, digits: 1}, 30).model;
        const tight = run({...DEFAULT_FIXED_POINT_MODEL, digits: 6}, 30).model;
        expect(loose.step).toBe(4);
        expect(tight.step).toBe(20);
    });
});
