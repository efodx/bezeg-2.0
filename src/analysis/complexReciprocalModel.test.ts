import {
    COMPLEX_RECIPROCAL_EXAMPLE_IDS, COMPLEX_RECIPROCAL_EXAMPLE_MODELS, DEFAULT_COMPLEX_RECIPROCAL_MODEL, isInversionRadius, parseComplexReciprocalModel,
    reciprocalModelPoints, snapInversionRadius,
} from './complexReciprocalModel';
import {complexConjugate, complexDivide, complexReciprocal, isOnUnitCircle} from './complexReciprocal';

const valid = {...DEFAULT_COMPLEX_RECIPROCAL_MODEL};

test('the default and every example are valid models with every reveal hidden', () => {
    expect(DEFAULT_COMPLEX_RECIPROCAL_MODEL).toEqual({
        example: 'outside', zRe: 1, zIm: 1, wRe: 2, wIm: 1, reciprocalVisible: false, quotientVisible: false, circleVisible: false, centreRe: 0.5, centreIm: 0, radius: 1,
    });
    for (const id of COMPLEX_RECIPROCAL_EXAMPLE_IDS) {
        const model = COMPLEX_RECIPROCAL_EXAMPLE_MODELS[id];
        expect(model.example).toBe(id);
        expect(parseComplexReciprocalModel(model), id).toEqual(model);
        expect([model.reciprocalVisible, model.quotientVisible, model.circleVisible]).toEqual([false, false, false]);
    }
});

test('the examples match the checked values of the spec', () => {
    const at = (id: typeof COMPLEX_RECIPROCAL_EXAMPLE_IDS[number]) => {
        const {z, w} = reciprocalModelPoints(COMPLEX_RECIPROCAL_EXAMPLE_MODELS[id]);
        return {z, w, reciprocal: complexReciprocal(z), quotient: complexDivide(w, z)};
    };
    expect(at('outside').reciprocal).toEqual({re: 0.5, im: -0.5});
    expect(at('inside').reciprocal).toEqual({re: 1, im: -1});
    const onCircle = at('unit-circle');
    expect(isOnUnitCircle(onCircle.z)).toBe(true);
    const conjugate = complexConjugate(onCircle.z);
    expect(onCircle.reciprocal!.re).toBeCloseTo(conjugate.re, 12);
    expect(onCircle.reciprocal!.im).toBeCloseTo(conjugate.im, 12);
    // (2 + i) / (1 - i) = 0.5 + 1.5 i
    const division = at('division');
    expect(division.quotient!.re).toBeCloseTo(0.5, 12);
    expect(division.quotient!.im).toBeCloseTo(1.5, 12);
    expect(at('zero').reciprocal).toBeUndefined();
    expect(at('zero').quotient).toBeUndefined();
});

test('parsing snaps noise on the grid, drops unknown properties and returns exact grid values', () => {
    const parsed = parseComplexReciprocalModel({...valid, zRe: 0.30000000000000004, radius: 0.15000000000000002, extra: 1});
    expect(parsed).toEqual({...valid, zRe: 0.3, radius: 0.15});
    expect(parsed).not.toHaveProperty('extra');
    expect(Object.is(parseComplexReciprocalModel({...valid, zIm: -0})!.zIm, -0)).toBe(false);
});

test('parsing rejects, never clamps, every field outside its domain and any missing field', () => {
    const bad: unknown[] = [
        null, undefined, [], 'text', 7, {},
        {...valid, example: 'cubic'}, {...valid, example: undefined},
        {...valid, zRe: 2.05}, {...valid, zIm: -2.5}, {...valid, wRe: 0.123}, {...valid, wIm: '1'}, {...valid, wIm: Number.NaN}, {...valid, wRe: Infinity},
        {...valid, centreRe: 2.5}, {...valid, centreIm: 0.01},
        {...valid, radius: 0}, {...valid, radius: -1}, {...valid, radius: 2.05}, {...valid, radius: 0.07}, {...valid, radius: Number.NaN}, {...valid, radius: '1'},
        {...valid, reciprocalVisible: 'yes'}, {...valid, quotientVisible: 1}, {...valid, circleVisible: null},
    ];
    for (const entry of bad) expect(parseComplexReciprocalModel(entry), JSON.stringify(entry)).toBeUndefined();
    for (const field of Object.keys(valid)) {
        const without: Record<string, unknown> = {...valid};
        delete without[field];
        expect(parseComplexReciprocalModel(without), field).toBeUndefined();
    }
});

test('the radius is a multiple of 0.05 in [0.05, 2]', () => {
    for (const radius of [0.05, 0.1, 1, 1.95, 2, 0.30000000000000004]) expect(isInversionRadius(radius), String(radius)).toBe(true);
    for (const radius of [0, 0.04, 2.05, -0.05, 0.075, Number.NaN, Infinity, '1', undefined]) expect(isInversionRadius(radius), String(radius)).toBe(false);
    expect(snapInversionRadius(0.3000001)).toBe(0.3);
    expect(() => snapInversionRadius(Number.NaN)).toThrow(RangeError);
});
