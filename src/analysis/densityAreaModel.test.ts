import {
    checkDensityAreaModel, DEFAULT_DENSITY_AREA_MODEL, DENSITY_BOUND_LIMIT, DENSITY_EXAMPLES, DENSITY_FILL_STRIPS, DENSITY_MU_LIMIT,
    DENSITY_SIGMA_MAX, DENSITY_SIGMA_MIN, DensityAreaModel, densityAreaFill, densityAreaView, densityExampleOf, fitDensityView,
    parseDensityAreaModel, setDensityBound, setDensityMu, setDensitySigma,
} from './densityAreaModel';
import {normalPdf} from './distributions';

const model = (mu: number, sigma: number, a: number, b: number): DensityAreaModel => ({mu, sigma, a, b});
const probability = (m: DensityAreaModel) => densityAreaView(m).probability;
/** The shoelace area of a closed polygon. */
const shoelace = ({x, y}: { x: number[]; y: number[] }) => {
    let sum = 0;
    for (let i = 0; i < x.length - 1; i++) sum += x[i] * y[i + 1] - x[i + 1] * y[i];
    return Math.abs(sum) / 2;
};

describe('the spec values (P1), to the displayed digits', () => {
    test.each([[1, 0.68269], [2, 0.9545], [3, 0.9973]])('P(mu - k sigma <= X <= mu + k sigma) for k = %i is %f', (k, expected) => {
        expect(probability(model(0, 1, -k, k))).toBeCloseTo(expected, 5);
    });

    test('N(100, 15): P(85 <= X <= 130) = Phi(2) - Phi(-1) = 0.81859', () => {
        const view = densityAreaView(DENSITY_EXAMPLES.iq);
        expect(view.probability).toBeCloseTo(0.81859, 5);
        expect(view.probability).toBeCloseTo(0.81859461412, 9);
        expect(view.za).toBe(-1);
        expect(view.zb).toBe(2);
    });

    test('the default is N(0, 1) with a = -1, b = 1', () => {
        expect(DEFAULT_DENSITY_AREA_MODEL).toEqual({mu: 0, sigma: 1, a: -1, b: 1});
        expect(probability(DEFAULT_DENSITY_AREA_MODEL)).toBeCloseTo(0.68269, 5);
    });
});

test('the area within mu +- k sigma does not change with mu and sigma', () => {
    for (const [mu, sigma] of [[0, 1], [100, 15], [-37.5, 0.1], [200, 20], [3, 7.3]]) {
        expect(probability(model(mu, sigma, mu - sigma, mu + sigma)), `${mu},${sigma}`).toBeCloseTo(0.682689492137, 10);
        expect(probability(model(mu, sigma, mu - 2 * sigma, mu + 2 * sigma)), `${mu},${sigma}`).toBeCloseTo(0.954499736104, 10);
    }
});

test('a very wide interval reads 1', () => {
    expect(probability(model(0, 1, -DENSITY_BOUND_LIMIT, DENSITY_BOUND_LIMIT))).toBe(1);
    expect(probability(model(100, 15, -50, 250))).toBeCloseTo(1, 12);
});

test('far tails keep their digits: P(Z > 6) is 9.8659e-10, not 0 by cancellation', () => {
    const reference = 9.8658764503769e-10;
    const tail = probability(model(0, 1, 6, DENSITY_BOUND_LIMIT));
    expect(tail).toBeGreaterThan(0);
    expect(tail / reference).toBeCloseTo(1, 9);
    // the left tail by symmetry
    expect(probability(model(0, 1, -DENSITY_BOUND_LIMIT, -6)) / reference).toBeCloseTo(1, 9);
});

describe('the interval kinds', () => {
    test('a = b: probability 0, kind point', () => {
        const view = densityAreaView(model(0, 1, 0.5, 0.5));
        expect(view.kind).toBe('point');
        expect(view.probability).toBe(0);
    });

    test('a > b: probability 0, kind reversed, nothing to draw', () => {
        const m = model(0, 1, 1, -1);
        expect(densityAreaView(m).kind).toBe('reversed');
        expect(probability(m)).toBe(0);
        expect(densityAreaFill(m)).toEqual({x: [], y: []});
        expect(densityAreaFill(model(0, 1, 0.5, 0.5))).toEqual({x: [], y: []});
    });

    test('a very thin interval (under 2 % of sigma) is flagged and still has its tiny area', () => {
        const view = densityAreaView(model(0, 1, 0, 0.01));
        expect(view.kind).toBe('thin');
        expect(view.probability).toBeCloseTo(0.01 * normalPdf(0.005), 6);
        expect(densityAreaView(model(0, 1, 0, 0.02)).kind).toBe('interval');
        expect(densityAreaView(model(0, 20, 0, 0.39)).kind).toBe('thin');
        expect(densityAreaView(model(0, 20, 0, 0.41)).kind).toBe('interval');
    });
});

describe('the drawn area', () => {
    test('is a closed polygon of the right size: its area is the probability (within trapezoid error)', () => {
        for (const m of [DEFAULT_DENSITY_AREA_MODEL, DENSITY_EXAMPLES.iq, model(5, 0.1, 5.05, 5.2), model(0, 20, -30, 15)]) {
            const fill = densityAreaFill(m);
            expect(fill.x.length).toBe(DENSITY_FILL_STRIPS + 4);
            expect(fill.x[0]).toBe(fill.x[fill.x.length - 1]);
            expect(fill.y[0]).toBe(0);
            expect(shoelace(fill), JSON.stringify(m)).toBeCloseTo(probability(m), 4);
        }
    });

    test('a wide interval is cut to mu +- 10 sigma, so the strips stay fine', () => {
        const fill = densityAreaFill(model(0, 1, -DENSITY_BOUND_LIMIT, DENSITY_BOUND_LIMIT));
        expect(Math.min(...fill.x)).toBe(-10);
        expect(Math.max(...fill.x)).toBe(10);
        expect(shoelace(fill)).toBeCloseTo(1, 5);
    });

    test('an interval entirely beyond mu + 10 sigma draws nothing', () => {
        expect(densityAreaFill(model(0, 1, 11, 12))).toEqual({x: [], y: []});
    });

    test('the fit view shows mu +- 4 sigma and the peak', () => {
        const [left, top, right, bottom] = fitDensityView(DENSITY_EXAMPLES.iq);
        expect(left).toBe(40);
        expect(right).toBe(160);
        expect(top).toBeGreaterThan(normalPdf(100, 100, 15));
        expect(bottom).toBeLessThan(0);
    });
});

describe('validity', () => {
    const valid = {mu: 100, sigma: 15, a: 85, b: 130};

    test('a valid model is accepted and unknown properties are dropped', () => {
        expect(parseDensityAreaModel({...valid, extra: 1})).toEqual(valid);
        expect(parseDensityAreaModel({...valid, a: 130, b: 85})).toEqual({...valid, a: 130, b: 85});
    });

    test.each([
        [{...valid, sigma: 0}, 'sigma'], [{...valid, sigma: -1}, 'sigma'], [{...valid, sigma: 0.09}, 'sigma'], [{...valid, sigma: 21}, 'sigma'],
        [{...valid, sigma: NaN}, 'sigma'], [{...valid, sigma: Infinity}, 'sigma'], [{...valid, sigma: '15'}, 'sigma'],
        [{...valid, mu: NaN}, 'mu'], [{...valid, mu: 201}, 'mu'], [{...valid, mu: undefined}, 'mu'],
        [{...valid, a: NaN}, 'bound'], [{...valid, a: -Infinity}, 'bound'], [{...valid, a: 401}, 'bound'],
        [{...valid, b: Infinity}, 'bound'], [{...valid, b: null}, 'bound'],
    ])('rejects %j with the %s issue; nothing is clamped', (data, kind) => {
        const check = checkDensityAreaModel(data);
        expect(check.ok).toBe(false);
        expect(check.ok ? undefined : check.issue?.kind).toBe(kind);
        expect(parseDensityAreaModel(data)).toBeUndefined();
    });

    test('the issue names the field and the limits', () => {
        expect(checkDensityAreaModel({...valid, b: 500})).toEqual({ok: false, issue: {kind: 'bound', field: 'b', limit: DENSITY_BOUND_LIMIT}});
        expect(checkDensityAreaModel({...valid, sigma: 0})).toEqual({ok: false, issue: {kind: 'sigma', min: DENSITY_SIGMA_MIN, max: DENSITY_SIGMA_MAX}});
        expect(checkDensityAreaModel({...valid, mu: 300})).toEqual({ok: false, issue: {kind: 'mu', limit: DENSITY_MU_LIMIT}});
    });

    test.each([null, undefined, 3, 'x', []])('a non-object %j is rejected with no specific issue', data => {
        expect(checkDensityAreaModel(data)).toEqual({ok: false, issue: undefined});
    });

    test('the limits themselves are accepted', () => {
        for (const m of [model(200, 20, 400, -400), model(-200, 0.1, -400, 400)]) expect(checkDensityAreaModel(m).ok).toBe(true);
    });

    test('the edits refuse out-of-range values with the same issue and return the same model for an unchanged value', () => {
        expect(setDensitySigma(DEFAULT_DENSITY_AREA_MODEL, 0)).toEqual({ok: false, issue: {kind: 'sigma', min: DENSITY_SIGMA_MIN, max: DENSITY_SIGMA_MAX}});
        expect(setDensitySigma(DEFAULT_DENSITY_AREA_MODEL, NaN).ok).toBe(false);
        expect(setDensityMu(DEFAULT_DENSITY_AREA_MODEL, 201).ok).toBe(false);
        expect(setDensityBound(DEFAULT_DENSITY_AREA_MODEL, 'a', Infinity)).toEqual({ok: false, issue: {kind: 'bound', field: 'a', limit: DENSITY_BOUND_LIMIT}});
        const same = setDensityMu(DEFAULT_DENSITY_AREA_MODEL, 0);
        expect(same.ok && same.model).toBe(DEFAULT_DENSITY_AREA_MODEL);
        const moved = setDensityBound(DEFAULT_DENSITY_AREA_MODEL, 'b', 2.5);
        expect(moved.ok && moved.model).toEqual({mu: 0, sigma: 1, a: -1, b: 2.5});
        expect(setDensityBound(DEFAULT_DENSITY_AREA_MODEL, 'a', 3).ok).toBe(true);
    });
});

test('the examples are told apart by mu and sigma', () => {
    expect(densityExampleOf(DEFAULT_DENSITY_AREA_MODEL)).toBe('standard');
    expect(densityExampleOf({...DENSITY_EXAMPLES.iq, a: 0})).toBe('iq');
    expect(densityExampleOf(model(100, 16, 85, 130))).toBeUndefined();
});
