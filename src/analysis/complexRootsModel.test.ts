import {
    COMPLEX_ROOTS_EXAMPLE_IDS, COMPLEX_ROOTS_EXAMPLE_MODELS, complexIntegerPower, DEFAULT_COMPLEX_ROOTS_MODEL, parseComplexRootsModel, rootsModelPoints,
    solvesRootEquation,
} from './complexRootsModel';
import {nthRoots} from './complexRoots';
import {complexModulus} from './complex';

const valid = {...DEFAULT_COMPLEX_ROOTS_MODEL};

test('the default and every example are valid models with every reveal hidden', () => {
    expect(DEFAULT_COMPLEX_ROOTS_MODEL).toEqual({
        example: 'two-i', wRe: 0, wIm: 2, degree: 3, rootsVisible: false, polygonVisible: false, testVisible: false, zRe: 1, zIm: 0.5,
    });
    for (const id of COMPLEX_ROOTS_EXAMPLE_IDS) {
        const model = COMPLEX_ROOTS_EXAMPLE_MODELS[id];
        expect(model.example).toBe(id);
        expect(parseComplexRootsModel(model), id).toEqual(model);
        expect([model.rootsVisible, model.polygonVisible, model.testVisible]).toEqual([false, false, false]);
    }
});

test('the examples match the checked values of the spec', () => {
    const roots = (id: typeof COMPLEX_ROOTS_EXAMPLE_IDS[number]) => {
        const model = COMPLEX_ROOTS_EXAMPLE_MODELS[id];
        return nthRoots(rootsModelPoints(model).w, model.degree);
    };
    // w = 2i, n = 3: the angles of the spec's 8i example (30, 150 and 270 degrees), radius 2^(1/3)
    const cubes = roots('two-i');
    if (cubes.kind !== 'roots') throw new Error('expected roots');
    expect(cubes.radius).toBeCloseTo(Math.cbrt(2), 12);
    expect(cubes.roots.map(root => Math.round((root.argument * 180) / Math.PI))).toEqual([30, 150, -90]);
    // w = 1 + i, n = 3: modulus 2^(1/6), first root at 15 degrees
    const plusI = roots('one-plus-i');
    if (plusI.kind !== 'roots') throw new Error('expected roots');
    expect(plusI.radius).toBeCloseTo(2 ** (1 / 6), 12);
    expect(plusI.roots[0].argument).toBeCloseTo(Math.PI / 12, 12);
    // w = -1, n = 2: roots i and -i, the argument of w is exactly pi
    const negative = roots('negative-real');
    if (negative.kind !== 'roots') throw new Error('expected roots');
    expect(negative.argument).toBe(Math.PI);
    expect(negative.roots[0].point.re).toBeCloseTo(0, 12);
    expect(negative.roots[0].point.im).toBeCloseTo(1, 12);
    expect(negative.roots[1].point.im).toBeCloseTo(-1, 12);
    // w = 0 has the one root 0 with multiplicity n
    expect(roots('zero')).toMatchObject({kind: 'zero', multiplicity: 3});
});

test('the roots of every example cube back to w, and a grid z solves the equation exactly when it is a root', () => {
    for (const id of COMPLEX_ROOTS_EXAMPLE_IDS) {
        const model = COMPLEX_ROOTS_EXAMPLE_MODELS[id];
        const {w} = rootsModelPoints(model);
        const result = nthRoots(w, model.degree);
        if (result.kind !== 'roots') continue;
        for (const root of result.roots) {
            const power = complexIntegerPower(root.point, model.degree);
            expect(complexModulus({re: power.re - w.re, im: power.im - w.im}), id).toBeLessThan(1e-12 * Math.max(1, complexModulus(w)));
            expect(solvesRootEquation(root.point, w, model.degree), id).toBe(true);
        }
    }
    expect(complexIntegerPower({re: 1, im: 1}, 4)).toEqual({re: -4, im: 0});
    expect(complexIntegerPower({re: 0.5, im: -0.25}, 1)).toEqual({re: 0.5, im: -0.25});
    expect(solvesRootEquation({re: 1, im: 0}, {re: 1, im: 0}, 8)).toBe(true);
    expect(solvesRootEquation({re: 0, im: 1}, {re: 1, im: 0}, 4)).toBe(true);
    expect(solvesRootEquation({re: 1, im: 0.05}, {re: 1, im: 0}, 4)).toBe(false);
    expect(solvesRootEquation({re: 0, im: 0}, {re: 0, im: 0}, 5)).toBe(true);
});

test('parsing snaps noise on the grid, drops unknown properties and returns exact grid values', () => {
    const parsed = parseComplexRootsModel({...valid, wRe: 0.30000000000000004, extra: 1});
    expect(parsed).toEqual({...valid, wRe: 0.3});
    expect(parsed).not.toHaveProperty('extra');
    expect(Object.is(parseComplexRootsModel({...valid, zIm: -0})!.zIm, -0)).toBe(false);
});

test('parsing rejects, never clamps, every field outside its domain and any missing field', () => {
    const bad: unknown[] = [
        null, undefined, [], 'text', 7, {},
        {...valid, example: 'cubic'}, {...valid, example: undefined},
        {...valid, wRe: 2.05}, {...valid, wIm: -2.5}, {...valid, zRe: 0.123}, {...valid, zIm: '1'}, {...valid, zIm: Number.NaN}, {...valid, zRe: Infinity},
        {...valid, degree: 1}, {...valid, degree: 9}, {...valid, degree: 2.5}, {...valid, degree: '3'}, {...valid, degree: Number.NaN}, {...valid, degree: 0},
        {...valid, rootsVisible: 'yes'}, {...valid, polygonVisible: 1}, {...valid, testVisible: null},
    ];
    for (const entry of bad) expect(parseComplexRootsModel(entry), JSON.stringify(entry)).toBeUndefined();
    for (const field of Object.keys(valid)) {
        const without: Record<string, unknown> = {...valid};
        delete without[field];
        expect(parseComplexRootsModel(without), field).toBeUndefined();
    }
    for (const degree of [2, 3, 8]) expect(parseComplexRootsModel({...valid, degree})?.degree).toBe(degree);
});
