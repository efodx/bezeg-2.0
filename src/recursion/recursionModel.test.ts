import {
    C_RANGE, cosineFixedPoint, DEFAULT_COBWEB_STATE, DEFAULT_GROWTH_STATE, deriveCobweb, M_RANGE, parseCobwebState, parseGrowthState, serializeCobwebState,
    deriveGrowth, GrowthState, serializeGrowthState, snapDragInteger, startRange, typedInteger, withMap, X_RANGE, CobwebState,
} from './recursionModel';
import {iterate} from './iteration';

const state = (patch: Partial<CobwebState>): CobwebState => ({...DEFAULT_COBWEB_STATE, ...patch});
const points = (patch: Partial<CobwebState>) => deriveCobweb(state(patch)).iteration.points;
const failure = (data: unknown) => {
    const result = parseCobwebState(data);
    if (result.ok) throw new Error('expected a rejection');
    return result.error;
};

describe('cobweb state: Preset round trip and actionable errors', () => {
    test('the default state is the first example of RG2 and survives a JSON round trip', () => {
        const stored = JSON.parse(JSON.stringify(serializeCobwebState(DEFAULT_COBWEB_STATE)));
        expect(stored).toEqual({map: 'affine', M: 10, C: 10, R: 15, X: 0, step: 0});
        const parsed = parseCobwebState(stored);
        expect(parsed.ok && parsed.value).toEqual(DEFAULT_COBWEB_STATE);
    });

    test('a stored step and every map round trip; playback and derived fields are neither stored nor read', () => {
        for (const map of ['affine', 'cosine', 'logistic'] as const) {
            const original = state({map, M: -16, C: 90, R: 29, X: map === 'logistic' ? 99 : map === 'cosine' ? -200 : -1000, step: 60});
            const stored = JSON.parse(JSON.stringify(serializeCobwebState(original)));
            expect(Object.keys(stored).sort()).toEqual(['C', 'M', 'R', 'X', 'map', 'step']);
            const parsed = parseCobwebState(stored);
            expect(parsed.ok && parsed.value).toEqual(original);
        }
        // A Preset made with a playing flag or a classification opens paused with the derived part recomputed.
        const reopened = parseCobwebState({...DEFAULT_COBWEB_STATE, step: 7, playing: true, kind: 'repelling', fixedPoint: 99, points: [1]});
        expect(reopened.ok && reopened.value).toEqual({...DEFAULT_COBWEB_STATE, step: 7});
        expect(reopened.ok && 'playing' in reopened.value).toBe(false);
    });

    test('the edges of every range are accepted', () => {
        for (const patch of [{M: -60}, {M: 60}, {C: -100}, {C: 100}, {R: 5}, {R: 29}, {X: -1000}, {X: 1000}, {step: 0}, {step: 60}]) {
            expect(parseCobwebState(state(patch)).ok).toBe(true);
        }
        expect(parseCobwebState(state({map: 'logistic', X: 1})).ok).toBe(true);
        expect(parseCobwebState(state({map: 'logistic', X: 99})).ok).toBe(true);
    });

    test.each([
        [{M: 61}, 'M', 'out-of-range'], [{M: -61}, 'M', 'out-of-range'], [{C: 101}, 'C', 'out-of-range'], [{R: 4}, 'R', 'out-of-range'],
        [{R: 30}, 'R', 'out-of-range'], [{X: 1001}, 'X', 'out-of-range'], [{map: 'cosine', X: 201}, 'X', 'out-of-range'], [{map: 'cosine', X: -201}, 'X', 'out-of-range'],[{step: 61}, 'step', 'out-of-range'], [{step: -1}, 'step', 'out-of-range'],
        [{M: 1.5}, 'M', 'off-grid'], [{X: 0.5}, 'X', 'off-grid'], [{step: 2.5}, 'step', 'off-grid'],
        [{M: NaN}, 'M', 'not-finite'], [{C: Infinity}, 'C', 'not-finite'], [{M: '10' as unknown as number}, 'M', 'not-finite'],
        [{map: 'cubic' as unknown as 'affine'}, 'map', 'unknown-value'],
        [{map: 'logistic', X: 0}, 'X', 'inconsistent'], [{map: 'logistic', X: 100}, 'X', 'inconsistent'], [{map: 'logistic', X: -5}, 'X', 'inconsistent'],
    ] as const)('%j is refused with field %s and reason %s, naming the allowed values', (patch, field, reason) => {
        const error = failure({...DEFAULT_COBWEB_STATE, ...patch});
        expect(error.field).toBe(field);
        expect(error.reason).toBe(reason);
        expect(error.message).toMatch(/\d|one of/);
        expect(error.message).toContain(field);
    });

    test('a missing field and a non-object are refused by name', () => {
        const {step: _step, ...withoutStep} = DEFAULT_COBWEB_STATE;
        expect(failure(withoutStep)).toMatchObject({field: 'step', reason: 'missing'});
        expect(failure({...DEFAULT_COBWEB_STATE, map: null})).toMatchObject({field: 'map', reason: 'missing'});
        for (const bad of [null, undefined, 3, 'affine', [], [1, 2]]) expect(failure(bad)).toMatchObject({field: 'state', reason: 'not-an-object'});
    });

    test('the logistic message says the start is strictly between 0 and 1', () => {
        expect(failure(state({map: 'logistic', X: 0})).message).toMatch(/between 0 and 1/);
    });
});

describe('typed input is refused, a drag snaps', () => {
    test('typedInteger converts a value on the grid to its integer', () => {
        const slope = typedInteger(-0.8, 20, M_RANGE, 'm');
        expect(slope.ok && slope.value).toBe(-16);
        const start = typedInteger(0.07, 100, X_RANGE, 'x0');
        expect(start.ok && start.value).toBe(7);
        const zero = typedInteger(-0, 100, X_RANGE, 'x0');
        expect(zero.ok && Object.is(zero.value, 0)).toBe(true);
    });

    test('out of range, off the grid and not finite are refused, never clamped', () => {
        expect(typedInteger(3.05, 20, M_RANGE, 'm')).toMatchObject({ok: false, error: {reason: 'out-of-range'}});
        expect(typedInteger(-10.1, 10, C_RANGE, 'c')).toMatchObject({ok: false, error: {reason: 'out-of-range'}});
        expect(typedInteger(0.123, 100, X_RANGE, 'x0')).toMatchObject({ok: false, error: {reason: 'off-grid'}});
        expect(typedInteger(NaN, 100, X_RANGE, 'x0')).toMatchObject({ok: false, error: {reason: 'not-finite'}});
        expect(typedInteger(1, 100, startRange('logistic'), 'x0')).toMatchObject({ok: false, error: {reason: 'out-of-range'}});
        expect(typedInteger(0.99, 100, startRange('logistic'), 'x0')).toMatchObject({ok: true, value: 99});
    });

    test('a drag rounds to the grid and clamps into the range', () => {
        expect(snapDragInteger(0.4349, 100, X_RANGE)).toBe(43);
        expect(snapDragInteger(25, 100, X_RANGE)).toBe(1000);
        expect(snapDragInteger(-0.001, 100, X_RANGE)).toBe(0);
        expect(Object.is(snapDragInteger(-0.001, 100, X_RANGE), 0)).toBe(true);
        expect(snapDragInteger(0, 100, startRange('logistic'))).toBe(1);
        expect(snapDragInteger(Infinity, 100, X_RANGE)).toBeUndefined();
    });

    test('withMap keeps a start inside the new range and moves one outside it to the map default', () => {
        expect(withMap(state({X: -300}), 'logistic').X).toBe(10);
        expect(withMap(state({X: 55}), 'logistic').X).toBe(55);
        expect(withMap(state({X: 500}), 'cosine').X).toBe(0);
        expect(withMap(state({X: -200}), 'cosine').X).toBe(-200);
        expect(withMap(state({map: 'logistic', X: 10}), 'affine').X).toBe(10);
        const same = state({});
        expect(withMap(same, 'affine')).toBe(same);
    });
});

describe('labels come from the integers (whole grid)', () => {
    test('classification of every M and C on the grid against the rules of the spec, not against the kernel code', () => {
        for (let M = -60; M <= 60; M++) {
            for (const C of [-100, -37, 0, 1, 100]) {
                const d = deriveCobweb(state({M, C}));
                const expectKind = Math.abs(M) < 20 ? 'attracting' : Math.abs(M) > 20 ? 'repelling' : M === -20 ? 'two-cycle' : C === 0 ? 'all-fixed' : 'none';
                expect(d.kind).toBe(expectKind);
                expect(d.shape).toBe(M === 0 ? 'degenerate' : M > 0 ? 'staircase' : 'spiral');
                expect(d.exact).toBe(true);
                if (M === 20) expect(d.fixedPoint).toBeNull();
                else {
                    // x* = c/(1 - m): the fixed point satisfies x = m x + c.
                    const m = M / 20;
                    const c = C / 10;
                    expect(d.fixedPoint!).toBeCloseTo(m * d.fixedPoint! + c, 9);
                    expect(d.fixedPoint!).toBeCloseTo(c / (1 - m), 9);
                    expect(d.fixedExact).toBeDefined();
                    expect(Number(d.fixedExact!.num) * (20 - M) === Number(d.fixedExact!.den) * 2 * C).toBe(true);
                }
            }
        }
    });

    test('the slope is m = M/20, a multiple of 1/20', () => {
        expect(deriveCobweb(state({M: -16})).slope).toBeCloseTo(-0.8, 12);
        expect(deriveCobweb(state({M: 20})).slope).toBe(1);
    });

    test('the label does not change with the number of steps drawn', () => {
        const kinds = [0, 1, 5, 60].map(step => deriveCobweb(state({M: -20, C: 60, X: 100, step})).kind);
        expect(new Set(kinds)).toEqual(new Set(['two-cycle']));
    });
});

describe('affine hand values of RG2', () => {
    test('m = 0,5, c = 1, x0 = 0 climbs 0; 1; 1,5; 1,75; 1,875 towards 2', () => {
        expect(points({step: 4})).toEqual([0, 1, 1.5, 1.75, 1.875]);
        expect(deriveCobweb(state({})).fixedPoint).toBe(2);
    });

    test('m = -0,8, c = 9, x0 = 1: 1; 8,2; 2,44; 7,048; 3,3616 spiral round 5', () => {
        const p = points({M: -16, C: 90, X: 100, step: 4 });
        [1, 8.2, 2.44, 7.048, 3.3616].forEach((value, i) => expect(p[i]).toBeCloseTo(value, 10));
        const d = deriveCobweb(state({M: -16, C: 90, X: 100}));
        expect(d.fixedPoint).toBe(5);
        expect(d.shape).toBe('spiral');
        expect(d.kind).toBe('attracting');
    });

    test('m = -1,2, c = 10, x0 = 4,6 spirals away from 50/11', () => {
        const p = points({M: -24, C: 100, X: 460, step: 3});
        [4.6, 4.48, 4.624, 4.4512].forEach((value, i) => expect(p[i]).toBeCloseTo(value, 10));
        const d = deriveCobweb(state({M: -24, C: 100, X: 460}));
        expect(d.kind).toBe('repelling');
        expect(d.fixedExact).toEqual({num: 50n, den: 11n});
        expect(d.fixedPoint!).toBeCloseTo(50 / 11, 12);
    });

    test('m = 1,5, c = -1, x0 = 2,1 leaves 2: 2,1; 2,15; 2,225', () => {
        const p = points({M: 30, C: -10, X: 210, step: 2});
        [2.1, 2.15, 2.225].forEach((value, i) => expect(p[i]).toBeCloseTo(value, 12));
        expect(deriveCobweb(state({M: 30, C: -10, X: 210})).fixedPoint).toBe(2);
    });

    test('m = -1, c = 6, x0 = 1 is the 2-cycle 1, 5, 1, 5 round 3, labelled from M alone', () => {
        const d = deriveCobweb(state({M: -20, C: 60, X: 100, step: 5}));
        expect(d.iteration.points).toEqual([1, 5, 1, 5, 1, 5]);
        expect(d.kind).toBe('two-cycle');
        expect(d.fixedPoint).toBe(3);
    });

    test('the closed form x* + m^n (x0 - x*) agrees with the drawn iterates', () => {
        const d = deriveCobweb(state({M: -16, C: 90, X: 100, step: 30}));
        const star = 5;
        d.iteration.points.forEach((x, n) => expect(x).toBeCloseTo(star + Math.pow(-0.8, n) * (1 - star), 9));
    });

    test('M = 20: C = 0 fixes every point, otherwise each step adds c (an arithmetic sequence, no fixed point)', () => {
        const fixed = deriveCobweb(state({M: 20, C: 0, X: 250, step: 3}));
        expect(fixed.kind).toBe('all-fixed');
        expect(fixed.fixedPoint).toBeNull();
        expect(fixed.iteration.points).toEqual([2.5, 2.5, 2.5, 2.5]);
        const shifted = deriveCobweb(state({M: 20, C: 5, X: 0, step: 3}));
        expect(shifted.kind).toBe('none');
        expect(shifted.iteration.points).toEqual([0, 0.5, 1, 1.5]);
    });

    test('M = 0 is degenerate: the first step lands on c', () => {
        const d = deriveCobweb(state({M: 0, C: 30, X: -400, step: 2}));
        expect(d.shape).toBe('degenerate');
        expect(d.iteration.points).toEqual([-4, 3, 3]);
        expect(d.fixedPoint).toBe(3);
    });

    test('the drawn steps are the from and to of the iteration', () => {
        const d = deriveCobweb(state({step: 4}));
        expect(d.iteration.steps.map(s => [s.from, s.to])).toEqual([[0, 1], [1, 1.5], [1.5, 1.75], [1.75, 1.875]]);
    });
});

describe('logistic classification and values of RG4', () => {
    test('r = 1,5 from 0,1 climbs 0,1; 0,135; 0,17516; 0,21672 towards 1/3, slope 0,5', () => {
        const d = deriveCobweb(state({map: 'logistic', R: 15, X: 10, step: 3}));
        [0.1, 0.135, 0.1751625].forEach((value, i) => expect(d.iteration.points[i]).toBeCloseTo(value, 7));
        expect(d.iteration.points[3]).toBeCloseTo(0.21672, 4);
        expect(d.kind).toBe('attracting');
        expect(d.shape).toBe('staircase');
        expect(d.slope).toBeCloseTo(0.5, 12);
        expect(d.fixedPoint!).toBeCloseTo(1 / 3, 12);
        expect(d.fixedExact).toEqual({num: 1n, den: 3n});
    });

    test('r = 2,5: 0,1; 0,225; 0,4359375; the fixed point 3/5 with slope -0,5 (spiral)', () => {
        const d = deriveCobweb(state({map: 'logistic', R: 25, X: 10, step: 2}));
        [0.1, 0.225, 0.4359375].forEach((value, i) => expect(d.iteration.points[i]).toBeCloseTo(value, 10));
        expect(d.slope).toBeCloseTo(-0.5, 12);
        expect(d.shape).toBe('spiral');
        expect(d.fixedExact).toEqual({num: 3n, den: 5n});
    });

    test('r = 2,9: the fixed point is 19/29 = 0,655172 and the slope -0,9', () => {
        const d = deriveCobweb(state({map: 'logistic', R: 29, X: 10, step: 1}));
        expect(d.fixedExact).toEqual({num: 19n, den: 29n});
        expect(d.fixedPoint!).toBeCloseTo(0.6551724137931, 10);
        expect(d.slope).toBeCloseTo(-0.9, 12);
        expect(d.iteration.points[1]).toBeCloseTo(0.261, 12);
        // after 60 steps it is within 0.9^60 (about 2e-3) of the limit, a number checked against the closed bound.
        const late = deriveCobweb(state({map: 'logistic', R: 29, X: 10, step: 60})).iteration.points[60];
        expect(Math.abs(late - 19 / 29)).toBeLessThan(0.05);
    });

    test('extinction for R <= 9, the slope-one case R = 10, attracting from R = 11, and r = 2 has slope 0', () => {
        for (let R = 5; R <= 29; R++) {
            const d = deriveCobweb(state({map: 'logistic', R, X: 10}));
            expect(d.kind).toBe(R <= 9 ? 'extinction' : R === 10 ? 'extinction-slope-one' : 'attracting');
            // oracle by the derivative of the map at the limit: r at 0, 2 - r at 1 - 1/r.
            const r = R / 10;
            expect(d.slope!).toBeCloseTo(R <= 10 ? r : 2 - r, 12);
            expect(d.fixedPoint!).toBeCloseTo(R <= 10 ? 0 : 1 - 1 / r, 12);
            expect(d.shape).toBe(R === 20 ? 'degenerate' : (R <= 10 || R < 20) ? 'staircase' : 'spiral');
        }
    });
});

describe('cosine', () => {
    test('the fixed point of cos is 0,7390851332 and the slope -sin x* is -0,67361, labelled computed (not exact)', () => {
        const d = deriveCobweb(state({map: 'cosine', X: 0}));
        expect(d.fixedPoint!).toBeCloseTo(0.7390851332151607, 12);
        expect(d.slope!).toBeCloseTo(-0.6736120291832148, 12);
        expect(d.exact).toBe(false);
        expect(d.kind).toBe('local-attracting');
        expect(Math.abs(d.slope!)).toBeLessThan(1);
        expect(cosineFixedPoint()).toBe(d.fixedPoint);
    });

    test('the iterates from 0 reach 0,722102 at step 8 and the fixed point at step 60', () => {
        expect(points({map: 'cosine', X: 0, step: 8})[8]).toBeCloseTo(0.722102, 6);
        expect(points({map: 'cosine', X: 0, step: 60})[60]).toBeCloseTo(0.7390851332, 8);
        expect(points({map: 'cosine', X: 0, step: 1})[1]).toBe(1);
    });
});

describe('growth state', () => {
    test('the default is the checked example and round trips', () => {
        expect(DEFAULT_GROWTH_STATE).toMatchObject({a1: 3, d: 2, capital: 1000, rate: 10, years: 10, y0: 1000, logQ: 105});
        const parsed = parseGrowthState(JSON.parse(JSON.stringify(serializeGrowthState(DEFAULT_GROWTH_STATE))));
        expect(parsed.ok && parsed.value).toEqual(DEFAULT_GROWTH_STATE);
    });

    test('rate 10 is 5 % and logQ 105 is 1,05: the scales of the stored integers', () => {
        expect(DEFAULT_GROWTH_STATE.rate / 200).toBeCloseTo(0.05, 12);
        expect(DEFAULT_GROWTH_STATE.logQ / 100).toBeCloseTo(1.05, 12);
        expect(DEFAULT_GROWTH_STATE.q / 10).toBe(2);
    });

    test('unknown fields are dropped, every panel, kind, model and compounding count round trips', () => {
        for (const panel of ['sequence', 'interest', 'log'] as const) {
            for (const parts of [1, 2, 4, 12, 365]) {
                const original = {...DEFAULT_GROWTH_STATE, panel, parts, kind: 'geometric' as const, logModel: 'power' as const, q: 5};
                const parsed = parseGrowthState({...original, playing: true, sum: 12});
                expect(parsed.ok && parsed.value).toEqual(original);
            }
        }
    });

    test.each([
        [{panel: 'table'}, 'panel', 'unknown-value'], [{kind: 'harmonic'}, 'kind', 'unknown-value'], [{logModel: 'log'}, 'logModel', 'unknown-value'],
        [{a1: 101}, 'a1', 'out-of-range'], [{d: -21}, 'd', 'out-of-range'], [{q: 31}, 'q', 'out-of-range'], [{n: 0}, 'n', 'out-of-range'], [{n: 31}, 'n', 'out-of-range'],
        [{capital: 0}, 'capital', 'out-of-range'], [{rate: 0}, 'rate', 'out-of-range'], [{rate: 81}, 'rate', 'out-of-range'], [{years: 41}, 'years', 'out-of-range'],
        [{parts: 3}, 'parts', 'unknown-value'], [{parts: 1000000}, 'parts', 'unknown-value'], [{y0: 0}, 'y0', 'out-of-range'], [{logQ: 49}, 'logQ', 'out-of-range'],
        [{logQ: 301}, 'logQ', 'out-of-range'], [{rate: 2.5}, 'rate', 'off-grid'], [{years: NaN}, 'years', 'not-finite'],
    ] as const)('%j is refused with field %s and reason %s', (patch, field, reason) => {
        const result = parseGrowthState({...DEFAULT_GROWTH_STATE, ...patch});
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatchObject({field, reason});
    });

    test('a missing field and a non-object are refused', () => {
        const {years: _years, ...rest} = DEFAULT_GROWTH_STATE;
        const missing = parseGrowthState(rest);
        expect(!missing.ok && missing.error).toMatchObject({field: 'years', reason: 'missing'});
        expect(parseGrowthState('x')).toMatchObject({ok: false, error: {reason: 'not-an-object'}});
    });
});

describe('the iteration limit', () => {
    test('a state at step 60 derives 60 steps and no more', () => {
        const d = deriveCobweb(state({step: 60}));
        expect(d.iteration.steps).toHaveLength(60);
        expect(iterate(d.map, d.x0, 60).points).toEqual(d.iteration.points);
    });
});

describe('derived growth values: the spec numbers (RG1, RG3, RG5)', () => {
    const growth = (patch: Partial<GrowthState>) => deriveGrowth({...DEFAULT_GROWTH_STATE, ...patch});

    test('RG1 arithmetic a1 = 3, d = 2: a10 = 21 and S10 = 120, exact, the rule and the closed form agree', () => {
        const {sequence} = growth({});
        expect(sequence.exact).toBe(true);
        expect(sequence.terms.slice(0, 4)).toEqual([3n, 5n, 7n, 9n]);
        expect(sequence.terms[9]).toBe(21n);
        expect(sequence.nth).toBe(21n);
        expect(sequence.sum).toBe(120n);
        expect(sequence.limit).toBeNull();
    });

    test('RG1 geometric a1 = 3: q = 2 gives 1536 and 3069; q = 1/2 gives S10 = 5,994140625 and the limit 6', () => {
        const two = growth({kind: 'geometric', q: 20}).sequence;
        expect(two.terms.slice(0, 6)).toEqual([3n, 6n, 12n, 24n, 48n, 96n]);
        expect([two.nth, two.sum, two.limit]).toEqual([1536n, 3069n, null]);
        const half = growth({kind: 'geometric', q: 5}).sequence;
        expect(half.exact).toBe(false);
        expect(half.sum).toBe(5.994140625);
        expect(half.nth).toBe(3 / 512);
        expect(half.limit).toBe(6);
    });

    test('the recursion and the closed form agree for every whole-number input up to 30 terms (BigInt), and within 1e-12 for decimals', () => {
        for (const kind of ['arithmetic', 'geometric'] as const) {
            for (const a1 of [-100, -7, 0, 3, 100]) {
                for (const r of kind === 'arithmetic' ? [-20, -1, 0, 7, 20] : [-30, -10, 0, 10, 20, 30]) {
                    for (const n of [1, 2, 10, 30]) {
                        const {sequence} = growth(kind === 'arithmetic' ? {kind, a1, d: r, n} : {kind, a1, q: r, n});
                        expect(sequence.exact).toBe(true);
                        expect(sequence.terms[n - 1]).toBe(sequence.nth);
                        expect(sequence.terms.reduce((a, b) => (a as bigint) + (b as bigint), 0n)).toBe(sequence.sum);
                    }
                }
            }
        }
        for (const q of [-27, -15, -5, 5, 11, 29]) {
            const {sequence} = growth({kind: 'geometric', a1: 7, q, n: 30});
            const last = sequence.terms[29] as number;
            const sum = (sequence.terms as number[]).reduce((a, b) => a + b, 0);
            expect(Math.abs(last - (sequence.nth as number)) / Math.abs(last)).toBeLessThan(1e-12);
            expect(Math.abs(sum - (sequence.sum as number)) / Math.abs(sum)).toBeLessThan(1e-12);
        }
    });

    test('the largest geometric term of the grid, 100 * 3^29, is the exact BigInt', () => {
        const {sequence} = growth({kind: 'geometric', a1: 100, q: 30, n: 30});
        expect(sequence.nth).toBe(100n * 3n ** 29n);
    });

    test('the limit is a1/(1-q) for |q| < 1 only, from the closed form', () => {
        expect(growth({kind: 'geometric', a1: 3, q: -5}).sequence.limit).toBeCloseTo(2, 12);
        expect(growth({kind: 'geometric', a1: 3, q: 0}).sequence.limit).toBe(3);
        for (const q of [10, -10, 11, 30]) expect(growth({kind: 'geometric', q}).sequence.limit).toBeNull();
        expect(growth({kind: 'arithmetic', d: 1}).sequence.limit).toBeNull();
    });

    test('RG3 default: 1000 at 5 % for 10 years, 12 parts', () => {
        const {interest} = growth({});
        expect(interest.p).toBe(0.05);
        expect(interest.simple).toBe(1500);
        expect(interest.compound).toBeCloseTo(1628.894627, 5);
        expect(interest.relative).toBeCloseTo(1647.009498, 5);
        expect(interest.continuous).toBeCloseTo(1648.721271, 5);
        expect(interest.conformal * 100).toBeCloseTo(0.407412, 6);
        expect(Math.abs(interest.conformalValue - interest.compound) / interest.compound).toBeLessThan(1e-9);
        expect(interest.doubling).toBeCloseTo(14.2067, 4);
        expect(interest.ruleOf72).toBeCloseTo(14.4, 12);
        expect(interest.eTable.map(row => row.n)).toEqual([1, 10, 100, 1000, 1000000]);
        expect(interest.eTable.map(row => row.value.toFixed(6))).toEqual(['2.000000', '2.593742', '2.704814', '2.716924', '2.718280']);
    });

    test('the conformal rate reproduces the yearly growth for every offered part count and a spread of rates', () => {
        for (const parts of [1, 2, 4, 12, 365]) {
            for (const rate of [1, 10, 33, 80]) {
                const {interest} = growth({parts, rate, capital: 777, years: 13});
                expect(Math.abs(interest.conformalValue - interest.compound) / interest.compound).toBeLessThan(1e-9);
            }
        }
        // m = 1 is the yearly step: relative equals compound; more parts give more, never more than P e^(pt)
        const yearly = growth({parts: 1}).interest;
        expect(yearly.relative).toBeCloseTo(yearly.compound, 9);
        const daily = growth({parts: 365}).interest;
        expect(daily.relative).toBeGreaterThan(growth({}).interest.relative);
        expect(daily.relative).toBeLessThan(daily.continuous);
    });

    test('RG5 default: y = 1000 * 1,05^n, ln 1,05 = 0,0487902, the slope is the exact difference quotient', () => {
        const {log} = growth({});
        expect(log.ns).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(log.ys[10]).toBeCloseTo(1628.894627, 5);
        expect(log.lnQ).toBeCloseTo(0.0487902, 7);
        expect(log.slope).toBeCloseTo(log.lnQ, 12);
        expect(log.slopeFirst).toBeCloseTo(log.lnQ, 12);
        expect(log.slopeLast).toBeCloseTo(log.lnQ, 12);
        expect(Math.log10(1.05)).toBeCloseTo(0.0211893, 7);
        expect(Math.log10(log.ys[10])).toBeCloseTo(3.211893, 6);
        expect(log.straight).toBe(true);
        expect(Math.exp(log.slope)).toBeCloseTo(1.05, 12);
    });

    test('the slope equals ln q over the whole grid of q and several run lengths', () => {
        for (let logQ = 50; logQ <= 300; logQ += 7) {
            for (const n of [1, 5, 30]) {
                const {log} = growth({logQ, n});
                expect(Math.abs(log.slope - Math.log(logQ / 100))).toBeLessThan(1e-12);
            }
        }
    });

    test('the power model y = y0 n^2 is not a line: the slopes differ, the label comes from the model', () => {
        const {log} = growth({logModel: 'power'});
        expect(log.ns[0]).toBe(1);
        expect(log.ns[log.ns.length - 1]).toBe(11);
        expect(log.ys.slice(0, 3)).toEqual([1000, 4000, 9000]);
        expect(log.slopeFirst).toBeCloseTo(2 * Math.log(2), 12);
        expect(log.slopeLast).toBeCloseTo(2 * Math.log(11 / 10), 12);
        expect(log.slopeFirst).toBeGreaterThan(log.slopeLast * 5);
        expect(log.straight).toBe(false);
    });

    test('every derived number is finite over the corners of the grid', () => {
        for (const patch of [{}, {a1: -100, d: -20, n: 30}, {kind: 'geometric' as const, a1: 100, q: -30, n: 30}, {capital: 100000, rate: 80, years: 40, parts: 365},
            {logQ: 300, y0: 1000, n: 30}, {logQ: 50, y0: 1, n: 30}, {logModel: 'power' as const, n: 30}]) {
            const derived = growth(patch);
            const numbers = [...derived.sequence.terms.map(Number), Number(derived.sequence.nth), Number(derived.sequence.sum), derived.interest.simple, derived.interest.relative,
                derived.interest.continuous, derived.interest.doubling, ...derived.log.lnY, derived.log.slope, derived.log.slopeFirst, derived.log.slopeLast];
            for (const value of numbers) expect(Number.isFinite(value)).toBe(true);
        }
    });
});
