import {
    analyzeExtrema, EXTREMA_EXAMPLE_IDS, EXTREMA_X_MAX, EXTREMA_X_MIN, extremaExample, isExtremaExampleId, isExtremaX,
} from './extrema';
import {DEFAULT_EXTREMA_MODEL, EXTREMA_EXAMPLE_MODELS, parseExtremaModel} from './extremaModel';

const analyze = (id: Parameters<typeof extremaExample>[0], a: number, b: number) => analyzeExtrema(extremaExample(id), a, b);
const xs = (id: Parameters<typeof extremaExample>[0], a: number, b: number) => analyze(id, a, b).candidates.map(c => c.x);

describe('extrema examples', () => {
    test('lists the four examples with undelimited latex', () => {
        expect(EXTREMA_EXAMPLE_IDS).toEqual(['square', 'cube', 'abs', 'sine']);
        expect(EXTREMA_EXAMPLE_IDS.every(isExtremaExampleId)).toBe(true);
        expect(['x', '', null, 1].some(isExtremaExampleId)).toBe(false);
        for (const id of EXTREMA_EXAMPLE_IDS) expect(extremaExample(id).latex).not.toContain('\\(');
    });

    test('derivative is undefined at the corner, never NaN', () => {
        const abs = extremaExample('abs');
        expect([abs.derivative(-2), abs.derivative(3)]).toEqual([-1, 1]);
        expect(abs.derivative(0)).toBeUndefined();
        expect(abs.derivative(-0)).toBeUndefined();
        expect(extremaExample('square').derivative(3)).toBe(6);
        expect(extremaExample('cube').derivative(-2)).toBe(12);
    });

    test('range guard', () => {
        expect(isExtremaX(EXTREMA_X_MIN) && isExtremaX(EXTREMA_X_MAX) && isExtremaX(0)).toBe(true);
        expect([-4.01, 4.01, NaN, Infinity, '1', null].some(isExtremaX)).toBe(false);
    });
});

describe('x^2 on [-1, 2]', () => {
    const r = analyze('square', -1, 2);
    test('candidates -1, 0, 2 with the right kinds', () => {
        expect(r.candidates.map(c => [c.x, c.kind])).toEqual([[-1, 'endpoint'], [0, 'stationary'], [2, 'endpoint']]);
    });
    test('derivative signs per piece', () => {
        expect(r.pieces).toEqual([{from: -1, to: 0, sign: -1}, {from: 0, to: 2, sign: 1}]);
    });
    test('classification relative to the interval', () => {
        expect(r.candidates.map(c => c.local)).toEqual(['localMaximum', 'localMinimum', 'localMaximum']);
        expect([r.globalMinimum, r.globalMinimumAt, r.globalMaximum, r.globalMaximumAt]).toEqual([0, [0], 4, [2]]);
        expect(r.candidates[0].isGlobalMaximum).toBe(false);
    });
});

describe('x^3 on [-1, 1]', () => {
    const r = analyze('cube', -1, 1);
    test('0 is stationary and neither a local minimum nor maximum', () => {
        const zero = r.candidates[1];
        expect([zero.x, zero.kind, zero.derivative, zero.local]).toEqual([0, 'stationary', 0, 'neither']);
        expect(r.pieces.map(p => p.sign)).toEqual([1, 1]);
    });
    test('endpoints are the global extrema', () => {
        expect([r.globalMinimum, r.globalMinimumAt, r.globalMaximum, r.globalMaximumAt]).toEqual([-1, [-1], 1, [1]]);
        expect(r.candidates.map(c => c.local)).toEqual(['localMinimum', 'neither', 'localMaximum']);
    });
});

describe('|x| on [-1, 1]', () => {
    const r = analyze('abs', -1, 1);
    test('0 is a corner, undefined derivative, global minimum', () => {
        const zero = r.candidates[1];
        expect([zero.x, zero.kind, zero.derivative, zero.local, zero.isGlobalMinimum]).toEqual([0, 'corner', undefined, 'localMinimum', true]);
        expect(r.globalMinimumAt).toEqual([0]);
    });
    test('endpoints tie as global maximum', () => {
        expect([r.globalMaximum, r.globalMaximumAt]).toEqual([1, [-1, 1]]);
        expect(r.pieces.map(p => p.sign)).toEqual([-1, 1]);
    });
});

describe('sin x', () => {
    test('on [-4, 4]: stationary points +-pi/2, global extrema 1 and -1', () => {
        const r = analyze('sine', -4, 4);
        expect(r.candidates.map(c => c.kind)).toEqual(['endpoint', 'stationary', 'stationary', 'endpoint']);
        expect(r.candidates[1].x).toBeCloseTo(-Math.PI / 2, 12);
        expect(r.candidates[2].x).toBeCloseTo(Math.PI / 2, 12);
        // sin(-4) = 0.7568..., sin(4) = -0.7568...; the interior extrema beat both endpoints.
        expect(r.globalMaximum).toBeCloseTo(1, 12);
        expect(r.globalMaximumAt).toEqual([r.candidates[2].x]);
        expect(r.globalMinimum).toBeCloseTo(-1, 12);
        expect(r.globalMinimumAt).toEqual([r.candidates[1].x]);
        expect(r.pieces.map(p => p.sign)).toEqual([-1, 1, -1]);
        expect(r.candidates.map(c => c.local)).toEqual(['localMaximum', 'localMinimum', 'localMaximum', 'localMinimum']);
    });

    test('on [0, pi]: both endpoints tie at the global minimum 0', () => {
        const r = analyze('sine', 0, Math.PI);
        expect(r.candidates.map(c => c.kind)).toEqual(['endpoint', 'stationary', 'endpoint']);
        expect(r.globalMinimumAt).toEqual([0, Math.PI]);
        expect(r.globalMaximumAt).toEqual([Math.PI / 2]);
        expect(r.globalMaximum).toBeCloseTo(1, 12);
        expect(r.candidates.map(c => c.local)).toEqual(['localMinimum', 'localMaximum', 'localMinimum']);
    });

    test('an endpoint at pi/2 is the stationary candidate, not a duplicate', () => {
        const r = analyze('sine', Math.PI / 2, 3);
        expect(r.candidates).toHaveLength(2);
        expect(r.candidates[0].kind).toBe('endpoint');
        expect(r.candidates[0].derivative).toBe(0);
        expect(r.candidates[0].local).toBe('localMaximum');
    });
});

describe('critical point coinciding with an endpoint', () => {
    test('x^2 on [0, 2]: 0 appears once, an endpoint with derivative 0', () => {
        const r = analyze('square', 0, 2);
        expect(r.candidates.map(c => [c.x, c.kind, c.derivative])).toEqual([[0, 'endpoint', 0], [2, 'endpoint', 4]]);
        expect(r.candidates.map(c => c.local)).toEqual(['localMinimum', 'localMaximum']);
    });
    test('|x| on [0, 1]: the corner endpoint has no derivative', () => {
        const r = analyze('abs', 0, 1);
        expect(xs('abs', 0, 1)).toEqual([0, 1]);
        expect(r.candidates[0].derivative).toBeUndefined();
        expect(r.candidates[0].kind).toBe('endpoint');
    });
    test('x^3 on [-1, 0]: stationary endpoint 0 is the global maximum', () => {
        const r = analyze('cube', -1, 0);
        expect(r.candidates.map(c => c.x)).toEqual([-1, 0]);
        expect(r.globalMaximumAt).toEqual([0]);
    });
    test('an interval avoiding the critical point has endpoints only', () => {
        expect(xs('square', 1, 2)).toEqual([1, 2]);
        expect(analyze('square', 1, 2).pieces).toEqual([{from: 1, to: 2, sign: 1}]);
    });
});

describe('analyzeExtrema input', () => {
    test('throws unless a < b', () => {
        const square = extremaExample('square');
        expect(() => analyzeExtrema(square, 1, 1)).toThrow(RangeError);
        expect(() => analyzeExtrema(square, 2, 1)).toThrow(RangeError);
        expect(() => analyzeExtrema(square, NaN, 1)).toThrow(RangeError);
    });
});

describe('extrema model', () => {
    test('default is x^2 on [-1, 2], not revealed', () => {
        expect(DEFAULT_EXTREMA_MODEL).toEqual({example: 'square', a: -1, b: 2, revealed: false});
        expect(EXTREMA_EXAMPLE_MODELS.square).toBe(DEFAULT_EXTREMA_MODEL);
        expect(EXTREMA_EXAMPLE_MODELS.cube).toMatchObject({a: -1, b: 1});
        expect(EXTREMA_EXAMPLE_MODELS.abs).toMatchObject({a: -1, b: 1});
        expect(EXTREMA_EXAMPLE_MODELS.sine).toMatchObject({a: -4, b: 4});
    });

    test('every example model parses and round-trips through JSON', () => {
        for (const id of EXTREMA_EXAMPLE_IDS) {
            const model = EXTREMA_EXAMPLE_MODELS[id];
            expect(model.example).toBe(id);
            expect(parseExtremaModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
        }
    });

    test('drops unknown properties', () => {
        expect(parseExtremaModel({example: 'abs', a: -1, b: 1, revealed: true, extra: 1}))
            .toEqual({example: 'abs', a: -1, b: 1, revealed: true});
    });

    test('rejects invalid data instead of clamping', () => {
        const ok = {example: 'square', a: -1, b: 2, revealed: false};
        for (const bad of [
            null, undefined, 3, 'x', [], {},
            {...ok, a: 2}, {...ok, a: 2, b: 2}, {...ok, a: -4.5}, {...ok, b: 4.01}, {...ok, a: NaN}, {...ok, b: Infinity},
            {...ok, a: '0'}, {...ok, example: 'tan'}, {...ok, example: undefined}, {...ok, revealed: 'true'}, {...ok, revealed: 1},
            {example: 'square', a: -1, b: 2},
        ]) expect(parseExtremaModel(bad)).toBeUndefined();
    });
});
