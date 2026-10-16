import {
    argumentSum, Complex, COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_MIN, COMPLEX_EXAMPLE_IDS, COMPLEX_MAX_OPERAND_MODULUS, COMPLEX_MAX_PRODUCT_MODULUS,
    complexArgument, complexExampleOperands, ComplexExampleId, complexModulus, complexMultiply, complexToPolar, isComplexCoordinate, isComplexExampleId,
    isComplexOperand, polarToComplex, snapComplexCoordinate, snapPolarToGrid,
} from './complex';
import {COMPLEX_EXAMPLE_MODELS, complexModelOperands, DEFAULT_COMPLEX_MODEL, parseComplexModel} from './complexModel';

const TWO_PI = 2 * Math.PI;
const c = (re: number, im: number): Complex => ({re, im});

/** Grid values k / 20 for k in [-40, 40], optionally every `stride` units. */
const gridValues = (stride = 1): number[] => {
    const values: number[] = [];
    for (let k = -40; k <= 40; k += stride) values.push(k / 20);
    return values;
};
const gridPoints = (stride: number): Complex[] => gridValues(stride).flatMap(re => gridValues(stride).map(im => c(re, im)));

/** Independent reference: the difference of two angles is a multiple of 2 pi exactly when its cosine is 1 and its sine is 0. */
const congruentModTwoPi = (a: number, b: number, tolerance = 1e-9): boolean =>
    Math.abs(Math.cos(a - b) - 1) < tolerance && Math.abs(Math.sin(a - b)) < tolerance;

describe('complex coordinate domain', () => {
    it('accepts the corners and every 0.05 grid point', () => {
        expect(COMPLEX_COORDINATE_MIN).toBe(-2);
        expect(COMPLEX_COORDINATE_MAX).toBe(2);
        for (const v of gridValues()) expect(isComplexCoordinate(v)).toBe(true);
    });

    it('tolerates floating-point noise but rejects off-grid, out-of-range and non-numeric values', () => {
        expect(isComplexCoordinate(0.1 + 0.2)).toBe(true);
        expect(isComplexCoordinate(0.07)).toBe(false);
        expect(isComplexCoordinate(0.025)).toBe(false);
        expect(isComplexCoordinate(2.05)).toBe(false);
        expect(isComplexCoordinate(-2.05)).toBe(false);
        expect(isComplexCoordinate(Infinity)).toBe(false);
        expect(isComplexCoordinate(NaN)).toBe(false);
        expect(isComplexCoordinate('1')).toBe(false);
        expect(isComplexCoordinate(null)).toBe(false);
        expect(isComplexCoordinate(undefined)).toBe(false);
    });

    it('snaps to the nearest grid point, never produces -0 and does not clamp', () => {
        expect(snapComplexCoordinate(0.30000000000000004)).toBe(0.3);
        expect(snapComplexCoordinate(0.74)).toBe(0.75);
        expect(Object.is(snapComplexCoordinate(-0.0000001), 0)).toBe(true);
        expect(snapComplexCoordinate(2.5)).toBe(2.5);
        expect(isComplexCoordinate(snapComplexCoordinate(2.5))).toBe(false);
        expect(() => snapComplexCoordinate(NaN)).toThrow(RangeError);
    });

    it('bounds every operand modulus and product modulus', () => {
        let maxOperand = 0;
        for (const z of gridPoints(1)) maxOperand = Math.max(maxOperand, complexModulus(z));
        expect(maxOperand).toBeCloseTo(COMPLEX_MAX_OPERAND_MODULUS, 12);
        expect(COMPLEX_MAX_OPERAND_MODULUS ** 2).toBeCloseTo(COMPLEX_MAX_PRODUCT_MODULUS, 12);
        expect(complexModulus(complexMultiply(c(2, 2), c(2, 2)))).toBeCloseTo(COMPLEX_MAX_PRODUCT_MODULUS, 12);
    });
});

describe('product', () => {
    it('computes (1 + i) i = -1 + i', () => {
        expect(complexMultiply(c(1, 1), c(0, 1))).toEqual(c(-1, 1));
    });

    it('computes other hand-checked products', () => {
        expect(complexMultiply(c(1, 1), c(1, 1))).toEqual(c(0, 2)); // (1 + i)^2 = 2i
        expect(complexMultiply(c(2, 1), c(1, -2))).toEqual(c(4, -3)); // 2 - 4i + i - 2i^2
        expect(complexMultiply(c(0, 1), c(0, 1))).toEqual(c(-1, 0)); // i^2 = -1
        expect(complexMultiply(c(1.5, -0.5), c(0.5, 0.25))).toEqual(c(0.875, 0.125)); // 0.75 + 0.375i - 0.25i - 0.125 i^2
    });

    it('multiplication by 1 preserves every point and by -1 negates it (rotation by pi)', () => {
        for (const z of gridPoints(1)) {
            expect(complexMultiply(z, c(1, 0))).toEqual({re: z.re + 0, im: z.im + 0});
            expect(complexMultiply(z, c(-1, 0))).toEqual({re: -z.re + 0, im: -z.im + 0});
        }
    });

    it('multiplication by -1 rotates the argument by pi modulo 2 pi', () => {
        for (const z of gridPoints(1)) {
            const before = complexArgument(z);
            const after = complexArgument(complexMultiply(z, c(-1, 0)));
            if (before === undefined) {
                expect(after).toBeUndefined();
            } else {
                expect(after).toBeDefined();
                expect(congruentModTwoPi(after as number, before + Math.PI)).toBe(true);
            }
        }
    });

    it('multiplication by a positive real scales without rotating', () => {
        for (const z of gridPoints(2)) {
            const product = complexMultiply(z, c(2, 0));
            expect(product).toEqual({re: 2 * z.re + 0, im: 2 * z.im + 0});
            expect(complexArgument(product)).toBe(complexArgument(z));
        }
    });

    it('|zw| = |z||w| over a grid of operands, against independent values', () => {
        const points = gridPoints(5); // multiples of 0.25 in [-2, 2]: 17 x 17 points, 83521 pairs
        for (const z of points) {
            for (const w of points) {
                const expected = Math.sqrt((z.re * z.re + z.im * z.im) * (w.re * w.re + w.im * w.im));
                expect(complexModulus(complexMultiply(z, w))).toBeCloseTo(expected, 12);
            }
        }
    });

    it('|zw| = |z||w| for finer, irregular grid pairs', () => {
        let seed = 12345;
        const next = () => {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return seed / 2147483648;
        };
        const randomCoordinate = () => Math.round(next() * 80 - 40) / 20;
        for (let i = 0; i < 5000; i++) {
            const z = c(randomCoordinate(), randomCoordinate());
            const w = c(randomCoordinate(), randomCoordinate());
            expect(complexModulus(complexMultiply(z, w))).toBeCloseTo(complexModulus(z) * complexModulus(w), 12);
        }
    });

    it('is commutative on the grid', () => {
        const points = gridPoints(7);
        for (const z of points) for (const w of points) expect(complexMultiply(z, w)).toEqual(complexMultiply(w, z));
    });

    it('is exact on the grid: exact zero imaginary parts stay zero, with no sign artifacts', () => {
        // (1 - 2i)(-0.2 - 0.4i)... = -0.2 - 0.4i + 0.4i + 0.8 i^2 -> imaginary part exactly 0 in integer units
        const exactlyReal = complexMultiply(c(1, -2), c(-0.2, -0.4));
        expect(Object.is(exactlyReal.im, 0)).toBe(true);
        expect(exactlyReal.re).toBeCloseTo(-1.0, 15);
        expect(complexArgument(exactlyReal)).toBe(Math.PI);
    });

    it('works for off-grid operands with the plain formula', () => {
        const product = complexMultiply(c(Math.SQRT1_2, Math.SQRT1_2), c(Math.SQRT1_2, -Math.SQRT1_2));
        expect(product.re).toBeCloseTo(1, 15);
        expect(product.im).toBeCloseTo(0, 15);
    });
});

describe('modulus and principal argument', () => {
    it('reports known arguments', () => {
        expect(complexArgument(c(1, 0))).toBe(0);
        expect(complexArgument(c(0, 1))).toBeCloseTo(Math.PI / 2, 15);
        expect(complexArgument(c(0, -1))).toBeCloseTo(-Math.PI / 2, 15);
        expect(complexArgument(c(-1, 0))).toBe(Math.PI);
        expect(complexArgument(c(1, 1))).toBeCloseTo(Math.PI / 4, 15);
        expect(complexArgument(c(-1, 1))).toBeCloseTo((3 * Math.PI) / 4, 15);
        expect(complexArgument(c(-1, -1))).toBeCloseTo((-3 * Math.PI) / 4, 15);
    });

    it('keeps the argument in (-pi, pi] for every grid point, with a negative real axis giving pi (also from -0)', () => {
        for (const z of gridPoints(1)) {
            const argument = complexArgument(z);
            if (z.re === 0 && z.im === 0) continue;
            expect(argument).toBeDefined();
            expect(argument as number).toBeGreaterThan(-Math.PI);
            expect(argument as number).toBeLessThanOrEqual(Math.PI);
        }
        expect(complexArgument(c(-1, -0))).toBe(Math.PI);
        expect(complexArgument(c(-0.5, 0))).toBe(Math.PI);
    });

    it('is undefined for 0 and for -0, never 0 or NaN', () => {
        expect(complexArgument(c(0, 0))).toBeUndefined();
        expect(complexArgument(c(-0, -0))).toBeUndefined();
        expect(complexArgument(c(-0, 0))).toBeUndefined();
        expect(complexToPolar(c(0, 0))).toBeUndefined();
    });

    it('has modulus 0 only for 0', () => {
        expect(complexModulus(c(0, 0))).toBe(0);
        expect(complexModulus(c(3, 4))).toBe(5);
        expect(complexModulus(c(-3, 4))).toBe(5);
    });
});

describe('arguments add under multiplication', () => {
    it('arg zw is congruent to arg z + arg w modulo 2 pi for every nonzero grid pair', () => {
        const points = gridPoints(5).filter(z => z.re !== 0 || z.im !== 0);
        for (const z of points) {
            for (const w of points) {
                const product = complexArgument(complexMultiply(z, w)) as number;
                const sum = (complexArgument(z) as number) + (complexArgument(w) as number);
                expect(product).toBeDefined();
                expect(congruentModTwoPi(product, sum)).toBe(true);
            }
        }
    });

    it('the reduced sum equals the principal argument of the product (boundary cases included)', () => {
        const points = gridPoints(4).filter(z => z.re !== 0 || z.im !== 0); // multiples of 0.2, including both axes and diagonals
        const failures: string[] = [];
        for (const z of points) {
            for (const w of points) {
                const result = argumentSum(z, w)!;
                const product = complexArgument(complexMultiply(z, w)) as number;
                const inRange = result.reduced > -Math.PI && result.reduced <= Math.PI;
                const reducedFlag = Math.abs(result.reduced - result.sum) > 1;
                if (Math.abs(result.reduced - product) > 1e-9 || !inRange || result.wasReduced !== reducedFlag) {
                    failures.push(`${JSON.stringify(z)} ${JSON.stringify(w)}`);
                }
            }
        }
        expect(failures).toEqual([]);
    });

    it('does not flag a reduction when the sum already lies in (-pi, pi]', () => {
        const result = argumentSum(c(1, 1), c(0, 1)); // pi/4 + pi/2 = 3pi/4
        expect(result!.wasReduced).toBe(false);
        expect(result!.sum).toBeCloseTo((3 * Math.PI) / 4, 15);
        expect(result!.reduced).toBe(result!.sum);
        const general = argumentSum(c(1, 1), c(1, 1)); // pi/2
        expect(general!.wasReduced).toBe(false);
        expect(general!.reduced).toBeCloseTo(Math.PI / 2, 15);
    });

    it('flags a reduction when the sum exceeds pi: arg z = 3pi/4, arg w = pi/2', () => {
        const result = argumentSum(c(-1, 1), c(0, 1));
        expect(result!.sum).toBeCloseTo((5 * Math.PI) / 4, 15);
        expect(result!.reduced).toBeCloseTo((-3 * Math.PI) / 4, 15);
        expect(result!.wasReduced).toBe(true);
        expect(complexMultiply(c(-1, 1), c(0, 1))).toEqual(c(-1, -1)); // (-1 + i) i = -i - 1
        expect(complexArgument(c(-1, -1))).toBeCloseTo(result!.reduced, 15);
    });

    it('flags a reduction when the sum falls below -pi', () => {
        const result = argumentSum(c(-1, -1), c(0, -1)); // -3pi/4 - pi/2 = -5pi/4
        expect(result!.sum).toBeCloseTo((-5 * Math.PI) / 4, 15);
        expect(result!.reduced).toBeCloseTo((3 * Math.PI) / 4, 15);
        expect(result!.wasReduced).toBe(true);
    });

    it('keeps a sum of exactly pi at pi and maps -pi to pi (flagged)', () => {
        const atPi = argumentSum(c(-1, 1), c(1, 1)); // 3pi/4 + pi/4 = pi
        expect(atPi!.reduced).toBe(Math.PI);
        expect(atPi!.wasReduced).toBe(false);
        const atMinusPi = argumentSum(c(1, -1), c(-1, -1)); // -pi/4 - 3pi/4 = -pi
        expect(atMinusPi!.reduced).toBe(Math.PI);
        expect(atMinusPi!.wasReduced).toBe(true);
        const minusI = argumentSum(c(0, -1), c(0, -1)); // -pi/2 - pi/2 = -pi exactly
        expect(minusI!.reduced).toBe(Math.PI);
        expect(minusI!.wasReduced).toBe(true);
    });

    it('reduces a sum of 2 pi to 0, the argument of the product 1', () => {
        const result = argumentSum(c(-1, 0), c(-1, 0));
        expect(result!.sum).toBeCloseTo(TWO_PI, 15);
        expect(result!.reduced).toBeCloseTo(0, 12);
        expect(result!.wasReduced).toBe(true);
        expect(complexArgument(complexMultiply(c(-1, 0), c(-1, 0)))).toBe(0);
    });

    it('is undefined when either operand is 0', () => {
        expect(argumentSum(c(0, 0), c(1, 1))).toBeUndefined();
        expect(argumentSum(c(1, 1), c(0, 0))).toBeUndefined();
        expect(argumentSum(c(0, 0), c(0, 0))).toBeUndefined();
    });
});

describe('a zero operand', () => {
    it('gives the product 0 with an undefined argument and modulus 0', () => {
        for (const z of gridPoints(1)) {
            for (const zero of [c(0, 0), c(-0, 0)]) {
                const left = complexMultiply(z, zero);
                const right = complexMultiply(zero, z);
                for (const product of [left, right]) {
                    expect(Object.is(product.re, 0)).toBe(true);
                    expect(Object.is(product.im, 0)).toBe(true);
                    expect(complexModulus(product)).toBe(0);
                    expect(complexArgument(product)).toBeUndefined();
                }
            }
        }
    });
});

describe('polar and Cartesian forms', () => {
    it('converts known values both ways', () => {
        const polar = complexToPolar(c(1, 1))!;
        expect(polar.modulus).toBeCloseTo(Math.SQRT2, 15);
        expect(polar.argument).toBeCloseTo(Math.PI / 4, 15);
        const z = polarToComplex(2, Math.PI / 2);
        expect(z.re).toBeCloseTo(0, 15);
        expect(z.im).toBeCloseTo(2, 15);
        const negative = polarToComplex(1, Math.PI);
        expect(negative.re).toBeCloseTo(-1, 15);
        expect(negative.im).toBeCloseTo(0, 15);
    });

    it('round-trips every nonzero grid point', () => {
        for (const z of gridPoints(1)) {
            const polar = complexToPolar(z);
            if (polar === undefined) continue;
            const back = polarToComplex(polar.modulus, polar.argument);
            expect(back.re).toBeCloseTo(z.re, 12);
            expect(back.im).toBeCloseTo(z.im, 12);
        }
    });

    it('refuses polar input without a positive modulus or a finite argument', () => {
        expect(() => polarToComplex(0, 1)).toThrow(RangeError);
        expect(() => polarToComplex(-1, 1)).toThrow(RangeError);
        expect(() => polarToComplex(NaN, 1)).toThrow(RangeError);
        expect(() => polarToComplex(1, Infinity)).toThrow(RangeError);
    });
});

describe('polar input snapped to the Cartesian grid', () => {
    it('reproduces every nonzero grid operand from its exact polar form', () => {
        for (const w of gridPoints(1)) {
            const polar = complexToPolar(w);
            if (polar === undefined) continue;
            expect(snapPolarToGrid(polar.modulus, polar.argument)).toEqual({re: w.re + 0, im: w.im + 0});
        }
    });

    it('reproduces every nonzero grid operand from its polar form rounded to two decimals', () => {
        for (const w of gridPoints(1)) {
            const polar = complexToPolar(w);
            if (polar === undefined) continue;
            const rounded = snapPolarToGrid(Math.round(polar.modulus * 100) / 100, Math.round(polar.argument * 100) / 100);
            expect(rounded).toEqual({re: w.re + 0, im: w.im + 0});
        }
    });

    it('snaps an off-grid polar input to the nearest grid point', () => {
        expect(snapPolarToGrid(1, 0)).toEqual(c(1, 0));
        expect(snapPolarToGrid(1, Math.PI / 2)).toEqual(c(0, 1));
        expect(snapPolarToGrid(Math.SQRT2, Math.PI / 4)).toEqual(c(1, 1));
        expect(snapPolarToGrid(1, Math.PI)).toEqual(c(-1, 0));
        expect(snapPolarToGrid(1, 0.3)).toEqual(c(0.95, 0.3)); // (0.9553, 0.2955)
        expect(snapPolarToGrid(1, -Math.PI / 2)).toEqual(c(0, -1));
    });

    it('accepts an argument outside (-pi, pi]: it is only an angle', () => {
        expect(snapPolarToGrid(1, Math.PI / 2 + TWO_PI)).toEqual(c(0, 1));
        expect(snapPolarToGrid(1, -3 * Math.PI)).toEqual(c(-1, 0));
    });

    it('rejects, never clamps, an input that names no in-domain operand', () => {
        expect(snapPolarToGrid(3, 0)).toBeUndefined(); // 3 is outside [-2, 2]
        expect(snapPolarToGrid(2.9, Math.PI / 4)).toBeUndefined(); // (2.05, 2.05) snaps outside
        expect(snapPolarToGrid(0.01, 1)).toBeUndefined(); // would snap to the origin
        expect(snapPolarToGrid(0.02, 0)).toBeUndefined();
        expect(snapPolarToGrid(0, 1)).toBeUndefined();
        expect(snapPolarToGrid(-1, 1)).toBeUndefined();
        expect(snapPolarToGrid(NaN, 1)).toBeUndefined();
        expect(snapPolarToGrid(1, NaN)).toBeUndefined();
        expect(snapPolarToGrid(Infinity, 1)).toBeUndefined();
        expect(snapPolarToGrid(1, Infinity)).toBeUndefined();
    });

    it('accepts the corner modulus 2 sqrt 2 at pi/4', () => {
        expect(snapPolarToGrid(COMPLEX_MAX_OPERAND_MODULUS, Math.PI / 4)).toEqual(c(2, 2));
    });

    it('never returns -0', () => {
        const result = snapPolarToGrid(1, Math.PI / 2)!;
        expect(Object.is(result.re, 0)).toBe(true);
        const down = snapPolarToGrid(1, -Math.PI)!;
        expect(Object.is(down.im, 0)).toBe(true);
    });
});

describe('named examples', () => {
    const expected: Record<ComplexExampleId, {w: Complex; product: Complex}> = {
        'rotation-i': {w: c(0, 1), product: c(-1, 1)},
        identity: {w: c(1, 0), product: c(1, 1)},
        negation: {w: c(-1, 0), product: c(-1, -1)},
        scaling: {w: c(2, 0), product: c(2, 2)},
        general: {w: c(1, 1), product: c(0, 2)},
        zero: {w: c(0, 0), product: c(0, 0)},
    };

    it('has the six closed ids', () => {
        expect([...COMPLEX_EXAMPLE_IDS]).toEqual(['rotation-i', 'identity', 'negation', 'scaling', 'general', 'zero']);
        expect(isComplexExampleId('rotation-i')).toBe(true);
        expect(isComplexExampleId('custom')).toBe(false);
        expect(isComplexExampleId(undefined)).toBe(false);
    });

    it('sets both operands in the domain, with the expected products', () => {
        for (const id of COMPLEX_EXAMPLE_IDS) {
            const {z, w} = complexExampleOperands(id);
            expect(z).toEqual(c(1, 1));
            expect(w).toEqual(expected[id].w);
            expect(isComplexOperand(z)).toBe(true);
            expect(isComplexOperand(w)).toBe(true);
            expect(complexMultiply(z, w)).toEqual(expected[id].product);
        }
    });

    it('rotates by pi/2, pi, pi/4 and scales by 2, sqrt 2 as described', () => {
        const rotation = argumentSum(c(1, 1), complexExampleOperands('rotation-i').w)!;
        expect(rotation.sum - (complexArgument(c(1, 1)) as number)).toBeCloseTo(Math.PI / 2, 15);
        const general = complexExampleOperands('general');
        expect(complexModulus(complexMultiply(general.z, general.w))).toBeCloseTo(Math.SQRT2 * Math.SQRT2, 12);
        expect(complexArgument(general.w)).toBeCloseTo(Math.PI / 4, 15);
        expect(complexModulus(complexExampleOperands('scaling').w)).toBe(2);
    });

    it('returns fresh copies', () => {
        const first = complexExampleOperands('rotation-i');
        (first.z as {re: number}).re = 99;
        expect(complexExampleOperands('rotation-i').z.re).toBe(1);
    });
});

describe('complex model', () => {
    const valid = {example: 'rotation-i', zRe: 1, zIm: 1, wRe: 0, wIm: 1, productVisible: false, anglesVisible: true};

    it('defaults to (1 + i) i with everything hidden, and has a model per example', () => {
        expect(DEFAULT_COMPLEX_MODEL).toEqual({example: 'rotation-i', zRe: 1, zIm: 1, wRe: 0, wIm: 1, productVisible: false, anglesVisible: false});
        expect(COMPLEX_EXAMPLE_MODELS['rotation-i']).toEqual(DEFAULT_COMPLEX_MODEL);
        for (const id of COMPLEX_EXAMPLE_IDS) {
            const model = COMPLEX_EXAMPLE_MODELS[id];
            expect(model.example).toBe(id);
            expect(model.productVisible).toBe(false);
            expect(model.anglesVisible).toBe(false);
            expect(parseComplexModel(model)).toEqual(model);
            expect(complexModelOperands(model)).toEqual(complexExampleOperands(id));
        }
    });

    it('round-trips through JSON', () => {
        const model = {...valid, example: 'general', zRe: -1.35, zIm: 0.05, wRe: 2, wIm: -2, productVisible: true};
        expect(parseComplexModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
    });

    it('round-trips every example model through JSON', () => {
        for (const id of COMPLEX_EXAMPLE_IDS) {
            const model = {...COMPLEX_EXAMPLE_MODELS[id], productVisible: true, anglesVisible: true};
            expect(parseComplexModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
        }
    });

    it('accepts the domain corners', () => {
        for (const value of [-2, 2]) {
            expect(parseComplexModel({...valid, zRe: value, zIm: value, wRe: value, wIm: value})).toBeDefined();
        }
    });

    it('drops unknown properties and writes coordinates as exact grid values', () => {
        expect(parseComplexModel({...valid, extra: 1})).toEqual(valid);
        const noisy = parseComplexModel({...valid, zRe: 0.1 + 0.2, wIm: 1.1500000000000001});
        expect(noisy!.zRe).toBe(0.3);
        expect(noisy!.wIm).toBe(1.15);
        expect(Object.is(parseComplexModel({...valid, wRe: -0})!.wRe, 0)).toBe(true);
    });

    it('rejects non-objects and an unknown example', () => {
        expect(parseComplexModel(null)).toBeUndefined();
        expect(parseComplexModel(undefined)).toBeUndefined();
        expect(parseComplexModel(7)).toBeUndefined();
        expect(parseComplexModel('x')).toBeUndefined();
        expect(parseComplexModel([])).toBeUndefined();
        expect(parseComplexModel({})).toBeUndefined();
        expect(parseComplexModel({...valid, example: 'custom'})).toBeUndefined();
        expect(parseComplexModel({...valid, example: undefined})).toBeUndefined();
        expect(parseComplexModel({...valid, example: 1})).toBeUndefined();
    });

    it('rejects an off-grid coordinate in each field', () => {
        for (const field of ['zRe', 'zIm', 'wRe', 'wIm']) {
            expect(parseComplexModel({...valid, [field]: 0.07})).toBeUndefined();
            expect(parseComplexModel({...valid, [field]: 0.025})).toBeUndefined();
        }
    });

    it('rejects an out-of-range coordinate in each field instead of clamping it', () => {
        for (const field of ['zRe', 'zIm', 'wRe', 'wIm']) {
            expect(parseComplexModel({...valid, [field]: 2.05})).toBeUndefined();
            expect(parseComplexModel({...valid, [field]: -2.05})).toBeUndefined();
            expect(parseComplexModel({...valid, [field]: 5})).toBeUndefined();
        }
    });

    it('rejects wrong types and missing fields', () => {
        for (const field of ['zRe', 'zIm', 'wRe', 'wIm']) {
            expect(parseComplexModel({...valid, [field]: '1'})).toBeUndefined();
            expect(parseComplexModel({...valid, [field]: NaN})).toBeUndefined();
            expect(parseComplexModel({...valid, [field]: Infinity})).toBeUndefined();
            expect(parseComplexModel({...valid, [field]: null})).toBeUndefined();
            expect(parseComplexModel({...valid, [field]: undefined})).toBeUndefined();
        }
        for (const field of ['productVisible', 'anglesVisible']) {
            expect(parseComplexModel({...valid, [field]: 'true'})).toBeUndefined();
            expect(parseComplexModel({...valid, [field]: 1})).toBeUndefined();
            expect(parseComplexModel({...valid, [field]: undefined})).toBeUndefined();
        }
        const {zRe: _omitted, ...missing} = valid;
        expect(parseComplexModel(missing)).toBeUndefined();
    });
});
