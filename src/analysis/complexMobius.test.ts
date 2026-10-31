import {Complex, complexMultiply} from './complex';
import {
    circleFromCentreRadius, circleInversion, circlePosition, crossRatio, describeGeneralizedCircle, discAutomorphism,
    GeneralizedCircle, GeneralizedCircleImage, GRID_COORDINATE_UNITS_MAX, GRID_RADIUS_UNITS_MAX, inversionImage, isIntegerForm,
    isMobiusPole, lineThroughPoints, Mobius, mobiusApply, mobiusCompose, mobiusDeterminant, mobiusImage, mobiusImageOfInfinity,
    mobiusInverse, mobiusPole, mobiusThroughThree, validateMobius,
} from './complexMobius';

const c = (re: number, im: number): Complex => ({re, im});
const I = c(0, 1);
const ONE = c(1, 0);
const ZERO = c(0, 0);
const TOLERANCE = 1e-12;

const near = (actual: Complex, expected: Complex, tolerance = TOLERANCE): void => {
    expect(Math.abs(actual.re - expected.re)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(actual.im - expected.im)).toBeLessThanOrEqual(tolerance);
};
const modulus = (z: Complex): number => Math.hypot(z.re, z.im);
const conj = (z: Complex): Complex => c(z.re, -z.im);
const sub = (z: Complex, w: Complex): Complex => c(z.re - w.re, z.im - w.im);
const divideBy = (z: Complex, w: Complex): Complex => {
    const d = w.re * w.re + w.im * w.im;
    return c((z.re * w.re + z.im * w.im) / d, (z.im * w.re - z.re * w.im) / d);
};
const point = (result: {readonly kind: string}): Complex => {
    expect(result.kind).toBe('point');
    return (result as unknown as {point: Complex}).point;
};
const apply = (m: Mobius, z: Complex): Complex => point(mobiusApply(m, z));
const image = (result: {readonly kind: string}): GeneralizedCircleImage => {
    expect(result.kind).toBe('image');
    return result as GeneralizedCircleImage;
};
const finiteCircle = (g: GeneralizedCircle): boolean => [g.A, g.B.re, g.B.im, g.C].every(Number.isFinite);

/** Deterministic generator (mulberry32). */
function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const randomInt = (random: () => number, low: number, high: number): number => low + Math.floor(random() * (high - low + 1));
const gridComplex = (random: () => number): Complex => c(randomInt(random, -40, 40) / 20, randomInt(random, -40, 40) / 20);

/** Distance from `w` to the circle or line described by `g`, an independent check of the image formulas. */
function distanceToShape(g: GeneralizedCircle, w: Complex): number {
    const shape = describeGeneralizedCircle(g);
    expect(shape).toBeDefined();
    if (shape!.kind === 'circle') return Math.abs(modulus(sub(w, shape!.centre)) - shape!.radius);
    const offset = sub(w, shape!.point);
    return Math.abs(offset.re * -shape!.direction.im + offset.im * shape!.direction.re);
}

const CAYLEY: Mobius = {a: ONE, b: c(0, -1), c: ONE, d: I};
const SECOND: Mobius = {a: c(2, 1), b: c(-1, 0.5), c: c(0.3, -1), d: c(1, 2)};
const RECIPROCAL: Mobius = {a: ZERO, b: ONE, c: ONE, d: ZERO};

// ---------------------------------------------------------------------------------------------------------------------------
describe('Mobius maps: apply, compose, inverse, determinant, three-point form', () => {
    it('computes the determinant exactly and rejects ad - bc = 0 with a typed reason', () => {
        near(mobiusDeterminant(CAYLEY), c(0, 2), 0);
        expect(validateMobius(CAYLEY)).toEqual({kind: 'valid'});
        // Proportional rows: (a, b) = 2 (c, d) on the grid, including a value (0.1 + 0.2) that is not the double 0.3.
        const degenerate: Mobius = {a: c(0.6, 0), b: c(0.2, 0.4), c: c(0.1 + 0.2, 0), d: c(0.1, 0.2)};
        expect(validateMobius(degenerate)).toEqual({kind: 'invalid', reason: 'degenerate'});
        expect(validateMobius({a: ZERO, b: ZERO, c: ZERO, d: ZERO})).toEqual({kind: 'invalid', reason: 'degenerate'});
        expect(validateMobius({...CAYLEY, a: c(Number.NaN, 0)})).toEqual({kind: 'invalid', reason: 'not-finite'});
        // One grid step off the degenerate case is valid, however small the determinant is.
        expect(validateMobius({a: c(0.65, 0), b: c(0.2, 0.4), c: c(0.3, 0), d: c(0.1, 0.2)}).kind).toBe('valid');
        expect(mobiusImage(degenerate, circleFromCentreRadius(ZERO, 1)!)).toEqual({kind: 'invalid', reason: 'degenerate-map'});
    });

    it('applies the map and returns typed pole and infinity results, never NaN or Infinity', () => {
        near(apply(CAYLEY, ZERO), c(-1, 0));
        near(apply(CAYLEY, ONE), c(0, -1));
        near(apply(CAYLEY, c(-1, 0)), I);
        expect(mobiusApply(CAYLEY, c(0, -1))).toEqual({kind: 'pole'});
        expect(isMobiusPole(CAYLEY, c(0, -1))).toBe(true);
        expect(isMobiusPole(CAYLEY, c(0, -0.95))).toBe(false);
        expect(mobiusPole(CAYLEY)).toEqual({kind: 'point', point: c(0, -1)});
        near(point(mobiusImageOfInfinity(CAYLEY)), ONE);
        // c = 0: an affine map has its pole and the image of infinity at infinity.
        const affine: Mobius = {a: c(1, 1), b: ONE, c: ZERO, d: ONE};
        expect(mobiusImageOfInfinity(affine)).toEqual({kind: 'infinity'});
        expect(mobiusPole(affine)).toEqual({kind: 'infinity'});
        near(apply(affine, ONE), c(2, 1));
        // The pole decision is exact on the grid even when the double of the dragged value is noisy.
        expect(isMobiusPole({a: ONE, b: ZERO, c: c(0.1 + 0.2, 0), d: c(-0.3, 0)}, ONE)).toBe(true);
        // An overflowing quotient is a pole result, not Infinity.
        const huge = mobiusApply({a: c(1e300, 0), b: ZERO, c: ZERO, d: c(1e-300, 0)}, c(1e10, 0));
        expect(huge).toEqual({kind: 'pole'});
    });

    it('composes in the order f after g and inverts by the adjugate (round trip 1e-12)', () => {
        const random = seeded(7);
        let checked = 0;
        for (let trial = 0; trial < 300; trial++) {
            const f: Mobius = {a: gridComplex(random), b: gridComplex(random), c: gridComplex(random), d: gridComplex(random)};
            const g: Mobius = {a: gridComplex(random), b: gridComplex(random), c: gridComplex(random), d: gridComplex(random)};
            if (validateMobius(f).kind !== 'valid' || validateMobius(g).kind !== 'valid') continue;
            const z = c(randomInt(random, -40, 40) / 20 + 0.0123, randomInt(random, -40, 40) / 20 - 0.0371);
            const gz = mobiusApply(g, z);
            const fgz = gz.kind === 'point' ? mobiusApply(f, gz.point) : undefined;
            const composed = mobiusApply(mobiusCompose(f, g), z);
            if (!fgz || fgz.kind !== 'point' || composed.kind !== 'point' || modulus(fgz.point) > 1e3) continue;
            near(composed.point, fgz.point, 1e-9 * (1 + modulus(fgz.point)));
            const back = mobiusApply(mobiusInverse(f), fgz.point);
            if (gz.kind === 'point' && modulus(gz.point) < 1e3 && back.kind === 'point') {
                near(back.point, gz.point, 1e-9 * (1 + modulus(gz.point)));
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(150);
        // Exact on the grid: the inverse composed with the map is a scalar matrix (identity up to scale).
        const identity = mobiusCompose(mobiusInverse(SECOND), SECOND);
        near(identity.b, ZERO, 1e-15);
        near(identity.c, ZERO, 1e-15);
        near(identity.a, identity.d, 1e-15);
        near(identity.a, mobiusDeterminant(SECOND), 1e-15);
    });

    it('builds the map sending z1, z2, z3 to 0, 1, infinity and rejects equal points', () => {
        const result = mobiusThroughThree(ZERO, ONE, c(-1, 0));
        expect(result.kind).toBe('map');
        const map = (result as {map: Mobius}).map;
        // T(z) = 2z / (z + 1)
        near(apply(map, c(0.5, 0)), c(2 / 3, 0));
        near(apply(map, ZERO), ZERO);
        near(apply(map, ONE), ONE);
        expect(mobiusApply(map, c(-1, 0))).toEqual({kind: 'pole'});
        expect(isMobiusPole(map, c(-1, 0))).toBe(true);
        expect(validateMobius(map)).toEqual({kind: 'valid'});
        const random = seeded(3);
        for (let trial = 0; trial < 100; trial++) {
            const [z1, z2, z3] = [gridComplex(random), gridComplex(random), gridComplex(random)];
            const found = mobiusThroughThree(z1, z2, z3);
            if (found.kind !== 'map') continue;
            near(apply(found.map, z1), ZERO, 1e-12);
            near(apply(found.map, z2), ONE, 1e-12);
            expect(mobiusApply(found.map, z3)).toEqual({kind: 'pole'});
            expect(validateMobius(found.map)).toEqual({kind: 'valid'});
        }
        expect(mobiusThroughThree(ONE, ONE, ZERO)).toEqual({kind: 'rejected', reason: 'equal-points'});
        expect(mobiusThroughThree(ZERO, ONE, ZERO)).toEqual({kind: 'rejected', reason: 'equal-points'});
        expect(mobiusThroughThree(ONE, ZERO, ZERO)).toEqual({kind: 'rejected', reason: 'equal-points'});
        // Equal on the grid although the doubles differ.
        expect(mobiusThroughThree(c(0.1 + 0.2, 0), c(0.3, 0), ONE)).toEqual({kind: 'rejected', reason: 'equal-points'});
        expect(mobiusThroughThree(ZERO, ONE, c(Number.POSITIVE_INFINITY, 0))).toEqual({kind: 'rejected', reason: 'not-finite'});
    });
});

// ---------------------------------------------------------------------------------------------------------------------------
describe('circle inversion', () => {
    const centres = [ZERO, c(0.5, -0.25), c(-1.5, 1)];
    const radii = [0.5, 1, 1.75];

    it('inverts in the unit circle: 1/z is the conjugate of the inversion (M1 numbers)', () => {
        near(point(circleInversion(c(1, 1), ZERO, 1)), c(0.5, 0.5));
        near(point(circleInversion(c(0.5, 0.5), ZERO, 1)), c(1, 1));
        near(conj(point(circleInversion(c(1, 1), ZERO, 1))), c(0.5, -0.5));
        near(apply(RECIPROCAL, c(1, 1)), c(0.5, -0.5));
        near(apply(RECIPROCAL, c(0.5, 0.5)), c(1, -1));
        near(apply(RECIPROCAL, c(0.6, 0.8)), c(0.6, -0.8));
        near(complexMultiply(c(2, 1), apply(RECIPROCAL, c(1, -1))), c(0.5, 1.5));
        // Over the whole grid: 1/z = conj(inversion(z)), and z = 0 is the pole in both.
        let checked = 0;
        for (let p = -40; p <= 40; p++) {
            for (let q = -40; q <= 40; q++) {
                const z = c(p / 20, q / 20);
                if (p === 0 && q === 0) {
                    expect(circleInversion(z, ZERO, 1)).toEqual({kind: 'pole'});
                    expect(mobiusApply(RECIPROCAL, z)).toEqual({kind: 'pole'});
                    continue;
                }
                near(apply(RECIPROCAL, z), conj(point(circleInversion(z, ZERO, 1))));
                checked++;
            }
        }
        expect(checked).toBe(81 * 81 - 1);
    });

    it('returns the pole at the centre and is an involution (1e-12) on a grid of points', () => {
        for (const centre of centres) {
            for (const radius of radii) {
                expect(circleInversion(centre, centre, radius)).toEqual({kind: 'pole'});
                for (let p = -40; p <= 40; p += 3) {
                    for (let q = -40; q <= 40; q += 3) {
                        const z = c(p / 20 + 0.011, q / 20 - 0.017);
                        const once = circleInversion(z, centre, radius);
                        const twice = circleInversion(point(once), centre, radius);
                        near(point(twice), z, TOLERANCE);
                    }
                }
            }
        }
        expect(() => circleInversion(ONE, ZERO, 0)).toThrow(RangeError);
        expect(() => circleInversion(ONE, ZERO, -1)).toThrow(RangeError);
        expect(() => circleInversion(ONE, ZERO, Number.NaN)).toThrow(RangeError);
    });

    it('fixes exactly the points of the circle, decided in grid units, and swaps inside and outside', () => {
        // 3-4-5 points: exactly on the circle of radius 1 and 2.5 about suitable centres, with noisy doubles in the input.
        expect(circlePosition(c(0.6, 0.8), ZERO, 1)).toBe('on');
        expect(circlePosition(c(0.6, 0.8000000000000002), ZERO, 1)).toBe('on');
        expect(circlePosition(c(0.1 + 0.2 + 0.3, 0.8), ZERO, 1)).toBe('on');
        expect(circlePosition(c(0.65, 0.8), ZERO, 1)).toBe('outside');
        expect(circlePosition(c(0.55, 0.8), ZERO, 1)).toBe('inside');
        expect(circlePosition(c(0.6123456, 0.8), ZERO, 1)).toBeUndefined();
        expect(circlePosition(ZERO, ZERO, 1.01)).toBeUndefined();
        const exactFixed = circleInversion(c(0.6, 0.8), ZERO, 1);
        expect(exactFixed).toEqual({kind: 'point', point: c(0.6, 0.8)});
        // Every grid point of every grid circle in the sample: on the circle <=> returned unchanged exactly; inside <=> outside.
        let onCount = 0;
        for (const centre of centres) {
            for (const radius of [0.25, 0.5, 1, 1.5]) {
                for (let p = -40; p <= 40; p++) {
                    for (let q = -40; q <= 40; q++) {
                        const z = c(p / 20, q / 20);
                        const position = circlePosition(z, centre, radius)!;
                        const result = circleInversion(z, centre, radius);
                        if (result.kind === 'pole') {
                            expect(z).toEqual(centre);
                            continue;
                        }
                        const imagePosition = circlePosition(c(Math.round(result.point.re * 20) / 20, Math.round(result.point.im * 20) / 20), centre, radius);
                        if (position === 'on') {
                            onCount++;
                            expect(result.point).toEqual(z);
                        } else {
                            const distance = modulus(sub(result.point, centre));
                            expect(position === 'inside' ? distance > radius : distance < radius).toBe(true);
                            expect(imagePosition).toBeDefined();
                        }
                    }
                }
            }
        }
        expect(onCount).toBeGreaterThan(20);
    });

    it('reverses orientation: directions 1 and i at 0.5+0.5i turn from +90 to -90 degrees', () => {
        const z0 = c(0.5, 0.5);
        const epsilon = 1e-6;
        const differential = (direction: Complex): Complex => {
            const forward = point(circleInversion(c(z0.re + epsilon * direction.re, z0.im + epsilon * direction.im), ZERO, 1));
            const backward = point(circleInversion(c(z0.re - epsilon * direction.re, z0.im - epsilon * direction.im), ZERO, 1));
            return c((forward.re - backward.re) / (2 * epsilon), (forward.im - backward.im) / (2 * epsilon));
        };
        const turn = (from: Complex, to: Complex): number => {
            const quotient = divideBy(to, from);
            return Math.atan2(quotient.im, quotient.re);
        };
        const before = turn(ONE, I);
        const after = turn(differential(ONE), differential(I));
        expect(before).toBeCloseTo(Math.PI / 2, 12);
        expect(after).toBeCloseTo(-Math.PI / 2, 7);
        // The size of the angle is kept for another pair of directions and another centre and radius.
        const other = (direction: Complex): Complex => {
            const centre = c(0.5, -0.25);
            const zz = c(-0.4, 0.9);
            const f = point(circleInversion(c(zz.re + epsilon * direction.re, zz.im + epsilon * direction.im), centre, 1.5));
            const b = point(circleInversion(c(zz.re - epsilon * direction.re, zz.im - epsilon * direction.im), centre, 1.5));
            return c((f.re - b.re) / (2 * epsilon), (f.im - b.im) / (2 * epsilon));
        };
        const d1 = c(1, 0.5);
        const d2 = c(-0.3, 1);
        expect(turn(other(d1), other(d2))).toBeCloseTo(-turn(d1, d2), 7);
    });
});

// ---------------------------------------------------------------------------------------------------------------------------
describe('generalized circles: constructors, images, exact decisions and the integer range', () => {
    it('builds exact integer forms from grid data and recovers their geometry', () => {
        const circle = circleFromCentreRadius(c(1, 0.5), 0.5)!;
        // 400 (|z|^2 - conj(c) z - c conj(z) + |c|^2 - r^2) with c = (20 + 10i)/20 and r = 10/20.
        expect(circle).toEqual({A: 400, B: c(-20 * 20, -20 * 10), C: 20 * 20 + 10 * 10 - 10 * 10});
        expect(isIntegerForm(circle)).toBe(true);
        const shape = describeGeneralizedCircle(circle)!;
        expect(shape.kind).toBe('circle');
        near((shape as {centre: Complex}).centre, c(1, 0.5), 1e-15);
        expect((shape as {radius: number}).radius).toBeCloseTo(0.5, 15);
        const line = lineThroughPoints(ZERO, ONE)!;
        expect(line).toEqual({A: 0, B: c(0, 400), C: 0});
        const lineShape = describeGeneralizedCircle(lineThroughPoints(c(0, 1), c(1, 1))!)!;
        expect(lineShape.kind).toBe('line');
        near((lineShape as {point: Complex}).point, I, 1e-15);
        expect(Math.abs((lineShape as {direction: Complex}).direction.re)).toBe(1);
        // Rejected inputs are `undefined`, never NaN.
        expect(lineThroughPoints(ONE, c(0.5 + 0.5, 0))).toBeUndefined();
        expect(lineThroughPoints(ONE, c(Number.NaN, 0))).toBeUndefined();
        expect(circleFromCentreRadius(ZERO, 0)).toBeUndefined();
        expect(circleFromCentreRadius(ZERO, Number.POSITIVE_INFINITY)).toBeUndefined();
        // Off-grid data is accepted as a double form and is not an integer form.
        const offGrid = circleFromCentreRadius(c(0.123, 0.456), 0.789)!;
        expect(isIntegerForm(offGrid)).toBe(false);
        expect((describeGeneralizedCircle(offGrid) as {radius: number}).radius).toBeCloseTo(0.789, 12);
    });

    it('agrees with the map applied to sampled source points (random grid maps, circles and lines)', () => {
        const random = seeded(11);
        let circleChecks = 0;
        let lineChecks = 0;
        let inversionChecks = 0;
        for (let trial = 0; trial < 600; trial++) {
            const m: Mobius = {a: gridComplex(random), b: gridComplex(random), c: gridComplex(random), d: gridComplex(random)};
            if (validateMobius(m).kind !== 'valid') continue;
            const useLine = random() < 0.4;
            const centre = gridComplex(random);
            const radiusUnits = randomInt(random, 1, GRID_RADIUS_UNITS_MAX);
            const other = gridComplex(random);
            const source = useLine ? lineThroughPoints(centre, other) : circleFromCentreRadius(centre, radiusUnits / 20);
            if (!source) continue;
            const result = image(mobiusImage(m, source));
            expect(result.exact).toBe(true);
            expect(finiteCircle(result.circle)).toBe(true);
            expect(result.shape === 'line').toBe(result.circle.A === 0);
            for (let k = 0; k < 16; k++) {
                const t = (k + 0.37) / 16;
                const sample = useLine
                    ? c(centre.re + (other.re - centre.re) * (t * 6 - 3), centre.im + (other.im - centre.im) * (t * 6 - 3))
                    : c(centre.re + radiusUnits / 20 * Math.cos(2 * Math.PI * t), centre.im + radiusUnits / 20 * Math.sin(2 * Math.PI * t));
                const mapped = mobiusApply(m, sample);
                if (mapped.kind !== 'point' || modulus(mapped.point) > 40) continue;
                expect(distanceToShape(result.circle, mapped.point)).toBeLessThan(1e-9);
                if (useLine) lineChecks++; else circleChecks++;
            }
            // Inversion with the same source and a random grid centre and radius.
            const inversionCentre = gridComplex(random);
            const inversionRadius = randomInt(random, 1, GRID_RADIUS_UNITS_MAX) / 20;
            const inverted = image(inversionImage(source, inversionCentre, inversionRadius));
            expect(inverted.exact).toBe(true);
            for (let k = 0; k < 16; k++) {
                const t = (k + 0.37) / 16;
                const sample = useLine
                    ? c(centre.re + (other.re - centre.re) * (t * 6 - 3), centre.im + (other.im - centre.im) * (t * 6 - 3))
                    : c(centre.re + radiusUnits / 20 * Math.cos(2 * Math.PI * t), centre.im + radiusUnits / 20 * Math.sin(2 * Math.PI * t));
                const mapped = circleInversion(sample, inversionCentre, inversionRadius);
                if (mapped.kind !== 'point' || modulus(mapped.point) > 40) continue;
                expect(distanceToShape(inverted.circle, mapped.point)).toBeLessThan(1e-9);
                inversionChecks++;
            }
        }
        expect(circleChecks).toBeGreaterThan(1000);
        expect(lineChecks).toBeGreaterThan(500);
        expect(inversionChecks).toBeGreaterThan(1500);
    });

    it('decides "passes through the pole" and "image is a line" exactly, on every grid circle (pole -i)', () => {
        let lines = 0;
        for (let p = -40; p <= 40; p++) {
            for (let q = -40; q <= 40; q += 1) {
                const centre = c(p / 20, q / 20);
                for (let s = 1; s <= GRID_RADIUS_UNITS_MAX; s += 3) {
                    const source = circleFromCentreRadius(centre, s / 20)!;
                    const result = image(mobiusImage(CAYLEY, source));
                    const onCircle = circlePosition(c(0, -1), centre, s / 20) === 'on';
                    if (result.shape !== (onCircle ? 'line' : 'circle') || result.throughPole !== onCircle || !result.exact) {
                        throw new Error(`pole decision wrong at centre ${p},${q} radius ${s}`);
                    }
                    if (onCircle) lines++;
                }
            }
        }
        expect(lines).toBeGreaterThan(100);
    });

    it('treats lines through the pole, affine maps (pole at infinity) and unit steps off the pole', () => {
        // Lines and the pole -i: a line through two grid points passes through the pole iff the integer cross product vanishes.
        const random = seeded(5);
        let through = 0;
        for (let trial = 0; trial < 3000; trial++) {
            const p = gridComplex(random);
            const q = random() < 0.3 ? c(0, -1 + randomInt(random, -3, 3) / 20 * (random() < 0.5 ? 0 : 1)) : gridComplex(random);
            const line = lineThroughPoints(p, q);
            if (!line) continue;
            const onLine = Math.round((q.re - p.re) * 20) * Math.round((-1 - p.im) * 20) - Math.round((q.im - p.im) * 20) * Math.round((0 - p.re) * 20) === 0;
            const result = image(mobiusImage(CAYLEY, line));
            expect(result.throughPole).toBe(onLine);
            expect(result.shape).toBe(onLine ? 'line' : 'circle');
            if (onLine) through++;
        }
        expect(through).toBeGreaterThan(100);
        // c = 0: circles stay circles, lines stay lines; the "pole" is the point at infinity.
        const affine: Mobius = {a: c(1, 1), b: c(0.5, 0), c: ZERO, d: c(2, -1)};
        const circleImage = image(mobiusImage(affine, circleFromCentreRadius(c(1, 1), 2)!));
        expect(circleImage).toMatchObject({shape: 'circle', throughPole: false, exact: true});
        const lineImage = image(mobiusImage(affine, lineThroughPoints(ZERO, c(1, 1))!));
        expect(lineImage).toMatchObject({shape: 'line', throughPole: true, exact: true});
        expect(mobiusImageOfInfinity(affine)).toEqual({kind: 'infinity'});
        // Inversion: the image is a line exactly when the source passes through the centre.
        expect(image(inversionImage(circleFromCentreRadius(c(0.5, 0), 0.5)!, ZERO, 1))).toMatchObject({shape: 'line', throughPole: true});
        expect(image(inversionImage(circleFromCentreRadius(c(0.5, 0), 0.55)!, ZERO, 1))).toMatchObject({shape: 'circle', throughPole: false});
        expect(image(inversionImage(lineThroughPoints(c(1, 0), c(1, 1))!, ZERO, 1))).toMatchObject({shape: 'circle'});
        expect(image(inversionImage(lineThroughPoints(c(-1, 1), c(1, -1))!, ZERO, 1))).toMatchObject({shape: 'line'});
        expect(inversionImage(circleFromCentreRadius(ONE, 1)!, ZERO, 0)).toEqual({kind: 'invalid', reason: 'not-finite'});
    });

    it('keeps every integer below 2^53 over the whole grid domain (range test against a BigInt reference)', () => {
        // Analytic bound. Moduli of grid entries: coordinates |k| <= 40 units, radius s <= 80 units.
        const m = GRID_COORDINATE_UNITS_MAX;
        const s = GRID_RADIUS_UNITS_MAX;
        const pointModulus = m * Math.SQRT2;
        const formBound = Math.max(
            400, 20 * pointModulus, m * m * 2 + s * s,                  // circle: A, |B|, |C| = |p^2 + q^2 - s^2|
            20 * 2 * m * Math.SQRT2, 2 * (2 * m * Math.SQRT2) * pointModulus,  // line: |B| = 20 |n|, |C| = 2 |n . p|
        );
        const mobiusEntry = pointModulus;                                    // |d|, |b|, |c|, |a| in units
        const inversionEntry = Math.max(20 * pointModulus, s * s + 2 * m * m, 400);
        // |H'_ij| <= 4 |N|^2 max|H|, and every partial sum of the transformation is bounded by 2 * 4 * |N|^2 max|H| as well.
        const bound = (entry: number): number => 2 * 4 * entry * entry * formBound;
        const mobiusBound = bound(mobiusEntry);
        const inversionBound = bound(inversionEntry);
        expect(mobiusBound).toBeLessThan(2 ** 53);
        expect(inversionBound).toBeLessThan(2 ** 53);
        // The hand estimate for Mobius maps in the spec is about 2e7; the sound bound is larger but still far below 2^53.
        expect(mobiusBound).toBeLessThan(1e9);
        expect(inversionBound).toBeLessThan(1e13);

        // BigInt reference on extreme data: all combinations of coordinate extremes.
        type BC = {re: bigint; im: bigint};
        const bmul = (x: BC, y: BC): BC => ({re: x.re * y.re - x.im * y.im, im: x.re * y.im + x.im * y.re});
        const badd = (x: BC, y: BC): BC => ({re: x.re + y.re, im: x.im + y.im});
        const bconj = (x: BC): BC => ({re: x.re, im: -x.im});
        const big = (re: number, im: number): BC => ({re: BigInt(re), im: BigInt(im)});
        const babs = (x: bigint): bigint => x < 0n ? -x : x;
        const bgcd = (x: bigint, y: bigint): bigint => { x = babs(x); y = babs(y); while (y) [x, y] = [y, x % y]; return x; };
        let maxSeen = 0n;
        const track = (...values: BC[]): void => { for (const v of values) maxSeen = [maxSeen, babs(v.re), babs(v.im)].reduce((a, b) => a > b ? a : b); };
        const referenceImage = (n: BC[], A: bigint, B: BC, C: bigint): [bigint, bigint, bigint, bigint] => {
            const [n11, n12, n21, n22] = n;
            const H11 = {re: A, im: 0n}; const H22 = {re: C, im: 0n}; const H21 = bconj(B);
            const K11 = badd(bmul(H11, n11), bmul(B, n21)); const K12 = badd(bmul(H11, n12), bmul(B, n22));
            const K21 = badd(bmul(H21, n11), bmul(H22, n21)); const K22 = badd(bmul(H21, n12), bmul(H22, n22));
            const A2 = badd(bmul(bconj(n11), K11), bmul(bconj(n21), K21));
            const B2 = badd(bmul(bconj(n11), K12), bmul(bconj(n21), K22));
            const C2 = badd(bmul(bconj(n12), K12), bmul(bconj(n22), K22));
            track(K11, K12, K21, K22, A2, B2, C2);
            let g = bgcd(bgcd(A2.re, B2.re), bgcd(B2.im, C2.re));
            if (g === 0n) g = 1n;
            const sign = A2.re !== 0n ? (A2.re > 0n ? 1n : -1n) : B2.re !== 0n ? (B2.re > 0n ? 1n : -1n) : B2.im !== 0n ? (B2.im > 0n ? 1n : -1n) : 1n;
            const f = sign * 1n;
            return [A2.re * f / g, B2.re * f / g, B2.im * f / g, C2.re * f / g];
        };
        const extremes = [-m, 0, m];
        const sources: GeneralizedCircle[] = [];
        for (const px of [-m, m]) for (const py of [-m, m]) for (const radius of [1, s]) sources.push(circleFromCentreRadius(c(px / 20, py / 20), radius / 20)!);
        sources.push(lineThroughPoints(c(-2, -2), c(2, 2))!, lineThroughPoints(c(-2, 2), c(2, -2))!, lineThroughPoints(c(-2, -2), c(2, -1.95))!, lineThroughPoints(c(2, -2), c(-2, 2))!);
        let compared = 0;
        for (const source of sources) {
            const A = BigInt(source.A); const B = big(source.B.re, source.B.im); const C = BigInt(source.C);
            // Mobius: every coefficient component in {-40, 0, 40} (the extremes of the domain, in grid units).
            for (const ar of extremes) for (const ai of extremes) for (const br of extremes) for (const bi of extremes) {
                for (const cr of extremes) for (const ci of extremes) for (const dr of [-m, m]) for (const di of [-m, m]) {
                    const map: Mobius = {a: c(ar / 20, ai / 20), b: c(br / 20, bi / 20), c: c(cr / 20, ci / 20), d: c(dr / 20, di / 20)};
                    if (validateMobius(map).kind !== 'valid') continue;
                    const result = image(mobiusImage(map, source));
                    expect(result.exact).toBe(true);
                    const [rA, rBr, rBi, rC] = referenceImage([big(dr, di), big(-br, -bi), big(-cr, -ci), big(ar, ai)], A, B, C);
                    expect([result.circle.A, result.circle.B.re, result.circle.B.im, result.circle.C]).toEqual([Number(rA), Number(rBr), Number(rBi), Number(rC)]);
                    compared++;
                }
            }
            // Inversion: extreme centre and radius.
            for (const px of [-m, 0, m]) for (const py of [-m, 0, m]) for (const radius of [1, 40, s]) {
                const result = image(inversionImage(source, c(px / 20, py / 20), radius / 20));
                expect(result.exact).toBe(true);
                const mu = [big(20 * px, 20 * py), big(radius * radius - px * px - py * py, 0), big(400, 0), big(-20 * px, 20 * py)];
                const n = [mu[3], {re: -mu[1].re, im: -mu[1].im}, {re: -mu[2].re, im: -mu[2].im}, mu[0]];
                const [rA, rBr, rBi, rC] = referenceImage(n, A, bconj(B), C);
                expect([result.circle.A, result.circle.B.re, result.circle.B.im, result.circle.C]).toEqual([Number(rA), Number(rBr), Number(rBi), Number(rC)]);
                compared++;
            }
        }
        expect(compared).toBeGreaterThan(20000);
        // The reference's largest intermediate value (before gcd reduction) respects the analytic bounds and 2^53.
        expect(maxSeen < BigInt(2 ** 53)).toBe(true);
        expect(Number(maxSeen)).toBeLessThanOrEqual(Math.max(mobiusBound, inversionBound));

        // Beyond the safe range the computation falls back to doubles and says so instead of claiming exactness.
        const unsafe = image(mobiusImage(CAYLEY, {A: 2 ** 52, B: c(2 ** 52, 1), C: 2 ** 52 + 1}));
        expect(unsafe.exact).toBe(false);
        expect(finiteCircle(unsafe.circle)).toBe(true);
    });

    it('reports exact: false for non-grid maps and sources and still returns finite coefficients', () => {
        const composed: Mobius = {a: c(0.123, 0), b: ONE, c: ZERO, d: c(1.1, 0.3)};
        const viaComposed = image(mobiusImage(composed, circleFromCentreRadius(ZERO, 1)!));
        expect(viaComposed.exact).toBe(false);
        expect(finiteCircle(viaComposed.circle)).toBe(true);
        const offGrid = image(mobiusImage(CAYLEY, circleFromCentreRadius(c(0.123, 0.456), 0.789)!));
        expect(offGrid.exact).toBe(false);
        expect(finiteCircle(offGrid.circle)).toBe(true);
    });
});

// ---------------------------------------------------------------------------------------------------------------------------
describe('checked numbers of M4 and M5', () => {
    /** Centre and radius of the circle through three points, independent of the H' formulas. */
    function circumcircle(p: Complex, q: Complex, r: Complex): {centre: Complex; radius: number} {
        const d = 2 * (p.re * (q.im - r.im) + q.re * (r.im - p.im) + r.re * (p.im - q.im));
        const sp = p.re ** 2 + p.im ** 2;
        const sq = q.re ** 2 + q.im ** 2;
        const sr = r.re ** 2 + r.im ** 2;
        const centre = c((sp * (q.im - r.im) + sq * (r.im - p.im) + sr * (p.im - q.im)) / d, (sp * (r.re - q.re) + sq * (p.re - r.re) + sr * (q.re - p.re)) / d);
        return {centre, radius: modulus(sub(p, centre))};
    }
    const onCircle = (centre: Complex, radius: number, count = 24): Complex[] =>
        Array.from({length: count}, (_, k) => c(centre.re + radius * Math.cos(2 * Math.PI * (k + 0.3) / count), centre.im + radius * Math.sin(2 * Math.PI * (k + 0.3) / count)));

    it('Cayley map: determinant, pole, image of infinity and the real line', () => {
        near(mobiusDeterminant(CAYLEY), c(0, 2), 0);
        near(point(mobiusPole(CAYLEY)), c(0, -1));
        near(point(mobiusImageOfInfinity(CAYLEY)), ONE);
        near(apply(CAYLEY, ZERO), c(-1, 0));
        near(apply(CAYLEY, ONE), c(0, -1));
        near(apply(CAYLEY, c(-1, 0)), I);
        const realLine = image(mobiusImage(CAYLEY, lineThroughPoints(ZERO, ONE)!));
        expect(realLine.shape).toBe('circle');
        const shape = describeGeneralizedCircle(realLine.circle)!;
        near((shape as {centre: Complex}).centre, ZERO, 1e-15);
        expect((shape as {radius: number}).radius).toBeCloseTo(1, 14);
        // The unit circle passes through the pole -i and becomes the imaginary axis.
        const unit = image(mobiusImage(CAYLEY, circleFromCentreRadius(ZERO, 1)!));
        expect(unit).toMatchObject({shape: 'line', throughPole: true, exact: true});
        expect(unit.circle.B.im).toBe(0);
        expect(unit.circle.C).toBe(0);
        expect(unit.circle.A).toBe(0);
        near(apply(CAYLEY, ONE), c(0, -1));
        near(apply(CAYLEY, c(-1, 0)), I);
        for (const z of onCircle(ZERO, 1)) {
            const mapped = mobiusApply(CAYLEY, z);
            if (mapped.kind === 'point') expect(Math.abs(mapped.point.re)).toBeLessThan(1e-12);
        }
    });

    it('Cayley map: |z - 1| = 1/2 goes to the circle of centre -1/7 - 8/7 i and radius 4/7', () => {
        const result = image(mobiusImage(CAYLEY, circleFromCentreRadius(ONE, 0.5)!));
        expect(result).toMatchObject({shape: 'circle', throughPole: false, exact: true});
        const shape = describeGeneralizedCircle(result.circle)! as {centre: Complex; radius: number};
        near(shape.centre, c(-1 / 7, -8 / 7));
        expect(Math.abs(shape.radius - 4 / 7)).toBeLessThanOrEqual(TOLERANCE);
        // Images of the four named points and of 24 more source points lie at distance 4/7 of the centre.
        for (const z of [c(1.5, 0), c(1, 0.5), c(0.5, 0), c(1, -0.5), ...onCircle(ONE, 0.5)]) {
            const w = apply(CAYLEY, z);
            expect(Math.abs(modulus(sub(w, c(-1 / 7, -8 / 7))) - 4 / 7)).toBeLessThanOrEqual(TOLERANCE);
            expect(Math.abs(modulus(sub(w, c(-1 / 7, -8 / 7))) - 0.5714285714285714)).toBeLessThanOrEqual(TOLERANCE);
        }
    });

    it('second example: determinant, pole, image of infinity and the unit circle', () => {
        near(mobiusDeterminant(SECOND), c(-0.2, 3.85), 1e-15);
        expect(validateMobius(SECOND)).toEqual({kind: 'valid'});
        // pole = -(1 + 2i)/(0.3 - i) = (1.7 - 1.6i)/1.09, off the grid
        const pole = point(mobiusPole(SECOND));
        near(pole, c(1.7 / 1.09, -1.6 / 1.09));
        expect(Math.abs(pole.re - 1.5596)).toBeLessThan(5e-5);
        expect(Math.abs(pole.im + 1.4679)).toBeLessThan(5e-5);
        expect(modulus(pole)).toBeCloseTo(2.1418, 4);
        expect(isMobiusPole(SECOND, pole)).toBe(false);
        // The grid points around it are not poles; the status reports a distance.
        expect(isMobiusPole(SECOND, c(1.55, -1.45))).toBe(false);
        const infinityImage = point(mobiusImageOfInfinity(SECOND));
        near(infinityImage, c(-0.4 / 1.09, 2.3 / 1.09));
        expect(Math.abs(infinityImage.re + 0.3670)).toBeLessThan(5e-5);
        expect(Math.abs(infinityImage.im - 2.1101)).toBeLessThan(5e-5);
        const unit = image(mobiusImage(SECOND, circleFromCentreRadius(ZERO, 1)!));
        expect(unit).toMatchObject({shape: 'circle', throughPole: false, exact: true});
        const shape = describeGeneralizedCircle(unit.circle)! as {centre: Complex; radius: number};
        // Independent: circumcircle of three image points.
        const reference = circumcircle(apply(SECOND, ONE), apply(SECOND, I), apply(SECOND, c(-1, 0)));
        near(shape.centre, reference.centre);
        expect(Math.abs(shape.radius - reference.radius)).toBeLessThanOrEqual(TOLERANCE);
        // The numbers quoted in the research note, to their printed digits.
        expect(Math.abs(shape.centre.re - 0.1023)).toBeLessThan(5e-5);
        expect(Math.abs(shape.centre.im - 0.0512)).toBeLessThan(5e-5);
        expect(Math.abs(shape.radius - 0.98598)).toBeLessThan(5e-6);
        for (const z of onCircle(ZERO, 1, 36)) {
            expect(Math.abs(modulus(sub(apply(SECOND, z), shape.centre)) - shape.radius)).toBeLessThanOrEqual(TOLERANCE);
        }
    });

    it('phi_0.5: values and the circle |z| = 0.5 going to centre -0.4, radius 0.4', () => {
        const result = discAutomorphism(c(0.5, 0), 0);
        expect(result.kind).toBe('map');
        const phi = (result as {map: Mobius}).map;
        near(apply(phi, c(0.5, 0)), ZERO);
        near(apply(phi, ZERO), c(-0.5, 0));
        near(apply(phi, ONE), ONE);
        near(apply(phi, c(-1, 0)), c(-1, 0));
        near(apply(phi, I), c(-0.8, 0.6));
        expect(modulus(apply(phi, I))).toBeCloseTo(1, 14);
        const half = image(mobiusImage(phi, circleFromCentreRadius(ZERO, 0.5)!));
        expect(half).toMatchObject({shape: 'circle', throughPole: false, exact: true});
        const shape = describeGeneralizedCircle(half.circle)! as {centre: Complex; radius: number};
        near(shape.centre, c(-0.4, 0));
        expect(Math.abs(shape.radius - 0.4)).toBeLessThanOrEqual(TOLERANCE);
        for (const z of onCircle(ZERO, 0.5)) {
            expect(Math.abs(modulus(sub(apply(phi, z), c(-0.4, 0))) - 0.4)).toBeLessThanOrEqual(TOLERANCE);
        }
        // a = 0 is allowed and is the rotation e^{i theta} z.
        const rotation = (discAutomorphism(ZERO, Math.PI / 2) as {map: Mobius}).map;
        near(apply(rotation, ONE), I);
    });

    it('phi_a with a = 0.3 + 0.4i: phi(a) = 0 and the identity value 0.3525', () => {
        const a = c(0.3, 0.4);
        const phi = (discAutomorphism(a, 0) as {map: Mobius}).map;
        near(apply(phi, a), ZERO);
        const z = c(0.2, 0.7);
        const oneMinusAz = sub(ONE, complexMultiply(conj(a), z));
        const lhs = modulus(oneMinusAz) ** 2 - modulus(sub(z, a)) ** 2;
        const rhs = (1 - modulus(a) ** 2) * (1 - modulus(z) ** 2);
        expect(Math.abs(lhs - 0.3525)).toBeLessThanOrEqual(TOLERANCE);
        expect(Math.abs(rhs - 0.3525)).toBeLessThanOrEqual(TOLERANCE);
        // |phi| = 1 on the circle, < 1 inside, across the grid.
        let inside = 0;
        let onUnit = 0;
        for (let p = -40; p <= 40; p++) {
            for (let q = -40; q <= 40; q++) {
                const position = circlePosition(c(p / 20, q / 20), ZERO, 1);
                if (position === 'outside') continue;
                const w = apply(phi, c(p / 20, q / 20));
                if (position === 'on') {
                    expect(Math.abs(modulus(w) - 1)).toBeLessThanOrEqual(TOLERANCE);
                    onUnit++;
                } else {
                    expect(modulus(w)).toBeLessThan(1);
                    inside++;
                }
            }
        }
        expect(onUnit).toBeGreaterThan(8);
        expect(inside).toBeGreaterThan(1000);
        // Also on a fine circle of non-grid points.
        for (const z of onCircle(ZERO, 1, 90)) expect(Math.abs(modulus(apply(phi, z)) - 1)).toBeLessThanOrEqual(TOLERANCE);
    });
});

// ---------------------------------------------------------------------------------------------------------------------------
describe('cross-ratio and disc automorphisms', () => {
    it('matches the checked cross-ratios (0.5 + 0.25i and 0.25) before and after the Cayley map', () => {
        const four = [ZERO, ONE, c(-1, 0), c(0, 2)] as const;
        const before = crossRatio(...four);
        expect(before.kind).toBe('value');
        near((before as {value: Complex}).value, c(0.5, 0.25), 1e-15);
        const after = crossRatio(...(four.map(z => apply(CAYLEY, z)) as [Complex, Complex, Complex, Complex]));
        near((after as {value: Complex}).value, c(0.5, 0.25), 1e-15);
        const real = crossRatio(ZERO, ONE, c(-1, 0), c(2, 0));
        near((real as {value: Complex}).value, c(0.25, 0), 1e-15);
        const realAfter = crossRatio(...([ZERO, ONE, c(-1, 0), c(2, 0)].map(z => apply(CAYLEY, z)) as [Complex, Complex, Complex, Complex]));
        expect(Math.abs((realAfter as {value: Complex}).value.im)).toBeLessThan(1e-14);
        near((realAfter as {value: Complex}).value, c(0.25, 0), 1e-14);
        // Coincidences are typed, not NaN.
        expect(crossRatio(ONE, ZERO, I, ONE)).toEqual({kind: 'infinity'});
        expect(crossRatio(ONE, ZERO, ONE, ONE)).toEqual({kind: 'undefined'});
        expect(crossRatio(c(0.1 + 0.2, 0), ZERO, I, c(0.3, 0))).toEqual({kind: 'infinity'});
    });

    it('is invariant under random Mobius maps within 1e-9 relative (1000 seeded quadruples)', () => {
        const random = seeded(1);
        const maps = [CAYLEY, SECOND, (discAutomorphism(c(0.3, 0.4), 0.7) as {map: Mobius}).map, RECIPROCAL];
        let checked = 0;
        let worst = 0;
        while (checked < 1000) {
            const quadruple = [0, 1, 2, 3].map(() => c(random() * 4 - 2, random() * 4 - 2)) as [Complex, Complex, Complex, Complex];
            const separated = quadruple.every((p, i) => quadruple.every((q, j) => i === j || modulus(sub(p, q)) > 0.05));
            if (!separated) continue;
            const map = maps[checked % maps.length];
            const mapped = quadruple.map(z => mobiusApply(map, z));
            if (!mapped.every(r => r.kind === 'point')) continue;
            const mappedPoints = mapped.map(r => (r as {point: Complex}).point) as [Complex, Complex, Complex, Complex];
            const original = crossRatio(...quadruple);
            const transformed = crossRatio(...mappedPoints);
            expect(original.kind).toBe('value');
            expect(transformed.kind).toBe('value');
            const x = (original as {value: Complex}).value;
            const y = (transformed as {value: Complex}).value;
            worst = Math.max(worst, modulus(sub(x, y)) / modulus(x));
            checked++;
        }
        expect(worst).toBeLessThan(1e-9);
    });

    it('gives a real cross-ratio for concyclic quadruples (1e-9) and a non-real one otherwise', () => {
        const random = seeded(2);
        for (let trial = 0; trial < 200; trial++) {
            const centre = c(random() * 2 - 1, random() * 2 - 1);
            const radius = 0.3 + random();
            const angles = [0, 1, 2, 3].map(() => random() * 2 * Math.PI);
            const points = angles.map(t => c(centre.re + radius * Math.cos(t), centre.im + radius * Math.sin(t))) as [Complex, Complex, Complex, Complex];
            if (!points.every((p, i) => points.every((q, j) => i === j || modulus(sub(p, q)) > 0.05))) continue;
            const result = crossRatio(...points) as {kind: 'value'; value: Complex};
            expect(result.kind).toBe('value');
            expect(Math.abs(result.value.im)).toBeLessThanOrEqual(1e-9 * modulus(result.value));
        }
        const off = crossRatio(ZERO, ONE, c(-1, 0), c(0, 2)) as {value: Complex};
        expect(Math.abs(off.value.im)).toBeGreaterThan(0.1);
    });

    it('rejects |a| >= 1 exactly in grid units and composes with the parameter -a as the inverse', () => {
        expect(discAutomorphism(c(0.6, 0.8), 0)).toEqual({kind: 'rejected', reason: 'on-circle'});
        expect(discAutomorphism(c(0.6, 0.8000000000000002), 0)).toEqual({kind: 'rejected', reason: 'on-circle'});
        expect(discAutomorphism(c(1, 0), 0)).toEqual({kind: 'rejected', reason: 'on-circle'});
        expect(discAutomorphism(c(0.65, 0.8), 0)).toEqual({kind: 'rejected', reason: 'outside-disc'});
        expect(discAutomorphism(c(2, 2), 0)).toEqual({kind: 'rejected', reason: 'outside-disc'});
        expect(discAutomorphism(c(0.55, 0.8), 0).kind).toBe('map');
        expect(discAutomorphism(c(0.95, 0.3), 0).kind).toBe('map');
        expect(discAutomorphism(c(0.123, 0), 0)).toEqual({kind: 'rejected', reason: 'off-grid'});
        expect(discAutomorphism(c(0.3, 0), Number.NaN)).toEqual({kind: 'rejected', reason: 'not-finite'});
        expect(discAutomorphism(ZERO, 0).kind).toBe('map');
        // Exhaustive: the accepted grid points are exactly those with p^2 + q^2 < 400.
        for (let p = -40; p <= 40; p++) {
            for (let q = -40; q <= 40; q++) {
                expect(discAutomorphism(c(p / 20, q / 20), 0).kind === 'map').toBe(p * p + q * q < 400);
            }
        }
        // phi_a followed by phi_-a (theta = 0) is the identity within 1e-12, and so is the adjugate inverse.
        const random = seeded(9);
        let checked = 0;
        for (let trial = 0; trial < 200; trial++) {
            const a = c(randomInt(random, -14, 14) / 20, randomInt(random, -14, 14) / 20);
            const forward = discAutomorphism(a, 0);
            const backward = discAutomorphism(c(-a.re, -a.im), 0);
            if (forward.kind !== 'map' || backward.kind !== 'map') continue;
            const z = c(random() * 2 - 1, random() * 2 - 1);
            near(apply(backward.map, apply(forward.map, z)), z);
            near(apply(forward.map, apply(backward.map, z)), z);
            near(apply(mobiusInverse(forward.map), apply(forward.map, z)), z);
            const composed = mobiusCompose(backward.map, forward.map);
            const identityValue = apply(composed, z);
            near(identityValue, z);
            checked++;
        }
        expect(checked).toBeGreaterThan(150);
    });
});

// ---------------------------------------------------------------------------------------------------------------------------
describe('a source circle driven through the pole: line versus visible circle, nothing non-finite', () => {
    const pole = c(0, -1);

    it('one grid step either side of the pole is a visible circle; through it is a line', () => {
        const through = image(mobiusImage(CAYLEY, circleFromCentreRadius(ZERO, 1)!));
        const inner = image(mobiusImage(CAYLEY, circleFromCentreRadius(ZERO, 0.95)!));
        const outer = image(mobiusImage(CAYLEY, circleFromCentreRadius(ZERO, 1.05)!));
        expect(through).toMatchObject({shape: 'line', throughPole: true, exact: true});
        expect(inner).toMatchObject({shape: 'circle', throughPole: false, exact: true});
        expect(outer).toMatchObject({shape: 'circle', throughPole: false, exact: true});
        for (const result of [through, inner, outer]) expect(finiteCircle(result.circle)).toBe(true);
        for (const result of [inner, outer]) {
            const shape = describeGeneralizedCircle(result.circle)! as {centre: Complex; radius: number};
            expect(Number.isFinite(shape.radius) && shape.radius > 0).toBe(true);
            // The image really is the circle of the sampled images.
            for (let k = 0; k < 24; k++) {
                const t = 2 * Math.PI * (k + 0.2) / 24;
                const radius = result === inner ? 0.95 : 1.05;
                const mapped = apply(CAYLEY, c(radius * Math.cos(t), radius * Math.sin(t)));
                expect(distanceToShape(result.circle, mapped)).toBeLessThan(1e-9);
            }
        }
        // A line one step from the pole is an ordinary circle; the line through it is a line. Same for the neighbouring grid lines.
        const lineAt = (y: number) => image(mobiusImage(CAYLEY, lineThroughPoints(c(-1, y), c(1, y))!));
        expect(lineAt(-1)).toMatchObject({shape: 'line', throughPole: true});
        expect(lineAt(-0.95)).toMatchObject({shape: 'circle', throughPole: false});
        expect(lineAt(-1.05)).toMatchObject({shape: 'circle', throughPole: false});
        // The inversion analogue: a circle through the centre becomes a line, one step off stays a circle.
        const inversionSource = (radius: number) => image(inversionImage(circleFromCentreRadius(c(0.5, 0), radius)!, ZERO, 1));
        expect(inversionSource(0.5)).toMatchObject({shape: 'line'});
        expect(inversionSource(0.45)).toMatchObject({shape: 'circle'});
        expect(inversionSource(0.55)).toMatchObject({shape: 'circle'});
    });

    it('sweeping a circle across the view through the pole never yields NaN or Infinity', () => {
        let lines = 0;
        let circles = 0;
        const maps: Mobius[] = [CAYLEY, SECOND, RECIPROCAL, {a: ONE, b: ZERO, c: ZERO, d: ONE}];
        for (const map of maps) {
            for (let q = -40; q <= 40; q++) {
                for (let s = 1; s <= 80; s += 1) {
                    const centre = c(0, q / 20);
                    const result = image(mobiusImage(map, circleFromCentreRadius(centre, s / 20)!));
                    expect(finiteCircle(result.circle)).toBe(true);
                    const shape = describeGeneralizedCircle(result.circle);
                    expect(shape).toBeDefined();
                    if (shape!.kind === 'circle') {
                        circles++;
                        expect(Number.isFinite(shape!.radius) && Number.isFinite(shape!.centre.re) && Number.isFinite(shape!.centre.im)).toBe(true);
                    } else {
                        lines++;
                        expect(Number.isFinite(shape!.point.re) && Number.isFinite(shape!.direction.re)).toBe(true);
                    }
                    expect(result.shape).toBe(shape!.kind);
                }
            }
        }
        expect(lines).toBeGreaterThan(5);
        expect(circles).toBeGreaterThan(8000);
        // Pole-adjacent source points: exactly the pole is a typed pole result, its neighbours are finite points.
        expect(mobiusApply(CAYLEY, pole)).toEqual({kind: 'pole'});
        for (const neighbour of [c(0.05, -1), c(-0.05, -1), c(0, -0.95), c(0, -1.05)]) {
            const w = point(mobiusApply(CAYLEY, neighbour));
            expect(Number.isFinite(w.re) && Number.isFinite(w.im)).toBe(true);
            expect(modulus(w)).toBeGreaterThan(10);
        }
        // Inversion: sweeping the source across the centre.
        for (let p = -40; p <= 40; p++) {
            for (let s = 1; s <= 80; s += 1) {
                const result = image(inversionImage(circleFromCentreRadius(c(p / 20, 0), s / 20)!, ZERO, 1));
                expect(finiteCircle(result.circle)).toBe(true);
                expect(result.shape === 'line').toBe(circlePosition(ZERO, c(p / 20, 0), s / 20) === 'on');
            }
        }
    });
});

describe('noisy grid zero in c', () => {
    it('treats a grid zero carrying rounding noise as c = 0, like validateMobius', () => {
        const noisyZero = c(0.1 + 0.2 - 0.3, 0);
        expect(noisyZero.re).not.toBe(0);
        const m: Mobius = {a: ONE, b: ONE, c: noisyZero, d: ONE};
        expect(mobiusPole(m)).toEqual({kind: 'infinity'});
        expect(mobiusImageOfInfinity(m)).toEqual({kind: 'infinity'});
    });
});
