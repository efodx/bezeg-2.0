/**
 * Mobius maps, circle inversion and generalized circles of the extended complex plane. Pure mathematics: no React, JSXGraph or
 * localization imports, and no dependence on graph state, so the triangle-geometry inversion lesson can reuse it.
 *
 * Conventions:
 * - A Mobius map is w = (a z + b) / (c z + d) with a d - b c != 0. The point at infinity is not a `Complex`; results that can be
 *   the point at infinity or a pole are typed (`pole`, `infinity`) and never carry NaN or Infinity as a number.
 * - Exact decisions. Operands live on the 0.05 grid (`src/analysis/complex.ts`, ADR 0029 section 3). Every discrete outcome
 *   (a d - b c = 0, c z + d = 0, |z - c| = r, |a| < 1, "passes through the pole", "the image is a line", equal points) is decided on
 *   integers in units of 1/20 whenever all of its inputs are on the grid, never by a tolerance. The only tolerance is the one
 *   already used by `complex.ts` to recognise a grid value despite floating-point noise (1e-9 of a step). For inputs that are not
 *   on the grid (composed maps, images) the same predicate is the exact comparison of doubles with zero, and results that depend
 *   on it report `exact: false`.
 * - A generalized circle is the real form A|z|^2 + conj(B) z + B conj(z) + C = 0 with A, C real, B complex and |B|^2 > A C. It is
 *   a line exactly when A = 0. The coefficients are homogeneous: only their ratios matter, so a circle built from grid data
 *   carries integer coefficients (scaled by 400) and a result is reduced by the gcd of its integer coefficients.
 * - The image of a generalized circle under w = M z uses H' = N* H N with H = [[A, B], [conj B, C]] and N = adj(M); inversion is
 *   the anti-holomorphic case: conjugate the source first (B becomes conj B), then apply the Mobius map u -> c + r^2 / (u - conj c).
 *   With integer inputs the entries of H' are integers, bounded far below 2^53 on the whole grid domain (see
 *   `complexMobius.test.ts`); if a bound is ever exceeded the computation falls back to doubles and reports `exact: false`.
 */

import {Complex, complexMultiply} from './complex';

/** Grid points per unit; see `complex.ts`. */
const GRID_PER_UNIT = 20;
/** Floating-point noise (in grid steps) absorbed when recognising a grid value; the same rule as `complex.ts`. */
const GRID_NOISE = 1e-9;

/** The largest |coordinate| of a dragged point, centre or coefficient, in grid units: 2 / 0.05. */
export const GRID_COORDINATE_UNITS_MAX = 40;
/** The largest radius of a source circle in grid units: 4 / 0.05. The radius lives on the same grid but may exceed the coordinate range. */
export const GRID_RADIUS_UNITS_MAX = 80;

const plusZero = (value: number): number => value === 0 ? 0 : value;
const complex = (re: number, im: number): Complex => ({re: plusZero(re), im: plusZero(im)});
const isFiniteComplex = (z: Complex): boolean => Number.isFinite(z.re) && Number.isFinite(z.im);

/** The integer k with value = k / 20, or `undefined` when the value is not on the grid (or not finite). */
function gridUnits(value: number): number | undefined {
    if (!Number.isFinite(value)) return undefined;
    const units = value * GRID_PER_UNIT;
    const rounded = Math.round(units);
    return Math.abs(units - rounded) <= GRID_NOISE ? plusZero(rounded) : undefined;
}

/** The pair of grid units of a complex number, or `undefined` unless both coordinates are on the grid. */
export function complexUnits(z: Complex): Complex | undefined {
    const re = gridUnits(z.re);
    const im = gridUnits(z.im);
    return re === undefined || im === undefined ? undefined : {re, im};
}

/** True when both coordinates are on the 0.05 grid (any magnitude; the integer arithmetic below guards its own range). */
export const isGridComplex = (z: Complex): boolean => complexUnits(z) !== undefined;

function divide(numerator: Complex, denominator: Complex): Complex | undefined {
    const modulusSquared = denominator.re * denominator.re + denominator.im * denominator.im;
    if (modulusSquared === 0) return undefined;
    const result = complex(
        (numerator.re * denominator.re + numerator.im * denominator.im) / modulusSquared,
        (numerator.im * denominator.re - numerator.re * denominator.im) / modulusSquared,
    );
    return isFiniteComplex(result) ? result : undefined;
}

/**
 * The difference z - w. For two grid values it is computed from the integer grid units, so equal grid points give exactly 0 even
 * when their doubles differ by floating-point noise (0.1 + 0.2 against 0.3).
 */
function subtract(z: Complex, w: Complex): Complex {
    const u = complexUnits(z);
    const v = complexUnits(w);
    if (u && v) return complex((u.re - v.re) / GRID_PER_UNIT, (u.im - v.im) / GRID_PER_UNIT);
    return complex(z.re - w.re, z.im - w.im);
}
const conjugate = (z: Complex): Complex => complex(z.re, -z.im);
const negate = (z: Complex): Complex => complex(-z.re, -z.im);
const isExactZero = (z: Complex): boolean => z.re === 0 && z.im === 0;

// ---------------------------------------------------------------------------------------------------------------------------
// Mobius maps
// ---------------------------------------------------------------------------------------------------------------------------

/** The map w = (a z + b) / (c z + d). Valid maps have a d - b c != 0 (`validateMobius`). */
export interface Mobius {
    readonly a: Complex;
    readonly b: Complex;
    readonly c: Complex;
    readonly d: Complex;
}

export type MobiusInvalidReason = 'degenerate' | 'not-finite';
export type MobiusValidation = {readonly kind: 'valid'} | {readonly kind: 'invalid'; readonly reason: MobiusInvalidReason};

/** The determinant a d - b c. Exact for grid coefficients (`complexMultiply` works in integer grid units there). */
export function mobiusDeterminant(m: Mobius): Complex {
    const ad = complexMultiply(m.a, m.d);
    const bc = complexMultiply(m.b, m.c);
    return complex(ad.re - bc.re, ad.im - bc.im);
}

/**
 * Rejects a map with a non-finite coefficient (`not-finite`) or with a d - b c = 0 (`degenerate`: the map would be constant or
 * undefined). The zero test is exact: on integers in grid units for grid coefficients, the double comparison with 0 otherwise.
 */
export function validateMobius(m: Mobius): MobiusValidation {
    if (![m.a, m.b, m.c, m.d].every(isFiniteComplex)) return {kind: 'invalid', reason: 'not-finite'};
    const a = complexUnits(m.a);
    const b = complexUnits(m.b);
    const c = complexUnits(m.c);
    const d = complexUnits(m.d);
    if (a && b && c && d) {
        const re = a.re * d.re - a.im * d.im - (b.re * c.re - b.im * c.im);
        const im = a.re * d.im + a.im * d.re - (b.re * c.im + b.im * c.re);
        return re === 0 && im === 0 ? {kind: 'invalid', reason: 'degenerate'} : {kind: 'valid'};
    }
    const determinant = mobiusDeterminant(m);
    if (!isFiniteComplex(determinant)) return {kind: 'invalid', reason: 'not-finite'};
    return isExactZero(determinant) ? {kind: 'invalid', reason: 'degenerate'} : {kind: 'valid'};
}

export type MobiusImagePoint = {readonly kind: 'point'; readonly point: Complex} | {readonly kind: 'pole'};

/**
 * Whether c z + d = 0 exactly (z is the pole -d/c). Integer arithmetic in grid units when z, c, d are on the grid, the exact
 * comparison of the doubles otherwise. A map with c = 0 has its pole at infinity: no finite z is a pole.
 */
export function isMobiusPole(m: Mobius, z: Complex): boolean {
    const c = complexUnits(m.c);
    const d = complexUnits(m.d);
    const u = complexUnits(z);
    if (c && d && u) {
        const re = c.re * u.re - c.im * u.im + GRID_PER_UNIT * d.re;
        const im = c.re * u.im + c.im * u.re + GRID_PER_UNIT * d.im;
        return re === 0 && im === 0;
    }
    const denominator = complexMultiply(m.c, z);
    return denominator.re + m.d.re === 0 && denominator.im + m.d.im === 0;
}

/**
 * w = (a z + b) / (c z + d). Returns `pole` when c z + d = 0 (decided by `isMobiusPole`; w would be the point at infinity) and also
 * when the quotient overflows the doubles, so no NaN or Infinity is ever returned. Assumes a valid map; a degenerate map is
 * constant (where defined) and is not rejected here.
 */
export function mobiusApply(m: Mobius, z: Complex): MobiusImagePoint {
    if (isMobiusPole(m, z)) return {kind: 'pole'};
    const numerator = complexMultiply(m.a, z);
    const denominator = complexMultiply(m.c, z);
    const w = divide(
        complex(numerator.re + m.b.re, numerator.im + m.b.im),
        complex(denominator.re + m.d.re, denominator.im + m.d.im),
    );
    return w ? {kind: 'point', point: w} : {kind: 'pole'};
}

/** c = 0, decided in grid units when c is on the grid (as `validateMobius` and `isMobiusPole` do), exactly otherwise. */
function isZeroCoefficient(c: Complex): boolean {
    const units = complexUnits(c);
    return units ? units.re === 0 && units.im === 0 : isExactZero(c);
}

export type MobiusInfinityImage ={readonly kind: 'point'; readonly point: Complex} | {readonly kind: 'infinity'};

/** The image of the point at infinity: a / c, or `infinity` when c = 0 (an affine map fixes infinity). */
export function mobiusImageOfInfinity(m: Mobius): MobiusInfinityImage {
    if (isZeroCoefficient(m.c)) return {kind: 'infinity'};
    const w = divide(m.a, m.c);
    return w ? {kind: 'point', point: w} : {kind: 'infinity'};
}

/** The pole -d/c (the point sent to infinity), or `infinity` when c = 0 (the pole is the point at infinity itself). */
export function mobiusPole(m: Mobius): MobiusInfinityImage {
    if (isZeroCoefficient(m.c)) return {kind: 'infinity'};
    const point = divide(negate(m.d), m.c);
    return point ? {kind: 'point', point} : {kind: 'infinity'};
}

/**
 * The composition f after g: (f o g)(z) = f(g(z)), the matrix product F G. Exact for grid coefficients, but the products are
 * multiples of 1/400, off the 0.05 grid, so later decisions on a composite (validity, poles) take the double path. Lessons
 * that need exact decisions apply the factors one after the other instead.
 */
export function mobiusCompose(f: Mobius, g: Mobius): Mobius {
    const sum = (x: Complex, y: Complex): Complex => complex(x.re + y.re, x.im + y.im);
    return {
        a: sum(complexMultiply(f.a, g.a), complexMultiply(f.b, g.c)),
        b: sum(complexMultiply(f.a, g.b), complexMultiply(f.b, g.d)),
        c: sum(complexMultiply(f.c, g.a), complexMultiply(f.d, g.c)),
        d: sum(complexMultiply(f.c, g.b), complexMultiply(f.d, g.d)),
    };
}

/** The inverse map, the adjugate (d, -b, -c, a): exact (only negations), and valid exactly when `m` is. */
export function mobiusInverse(m: Mobius): Mobius {
    return {a: m.d, b: negate(m.b), c: negate(m.c), d: m.a};
}

export type MobiusThroughThreeResult =
    | {readonly kind: 'map'; readonly map: Mobius}
    | {readonly kind: 'rejected'; readonly reason: 'equal-points' | 'not-finite'};

/**
 * The map T with T(z1) = 0, T(z2) = 1, T(z3) = infinity: T(z) = (z - z1)(z2 - z3) / ((z - z3)(z2 - z1)). Equal points (exact: grid
 * units, or double equality) are rejected, since then a d - b c = (z2 - z3)(z2 - z1)(z1 - z3) vanishes.
 */
export function mobiusThroughThree(z1: Complex, z2: Complex, z3: Complex): MobiusThroughThreeResult {
    if (![z1, z2, z3].every(isFiniteComplex)) return {kind: 'rejected', reason: 'not-finite'};
    if (isExactZero(subtract(z1, z2)) || isExactZero(subtract(z2, z3)) || isExactZero(subtract(z1, z3))) {
        return {kind: 'rejected', reason: 'equal-points'};
    }
    const p = subtract(z2, z3);
    const q = subtract(z2, z1);
    return {
        kind: 'map',
        map: {a: p, b: negate(complexMultiply(z1, p)), c: q, d: negate(complexMultiply(z3, q))},
    };
}

export type CrossRatioResult =
    | {readonly kind: 'value'; readonly value: Complex}
    | {readonly kind: 'infinity'}
    | {readonly kind: 'undefined'};

/**
 * The cross-ratio (z1, z2; z3, z4) = (z1 - z3)(z2 - z4) / ((z1 - z4)(z2 - z3)). It is `infinity` when the denominator vanishes but
 * the numerator does not (z1 = z4 or z2 = z3), and `undefined` when both vanish (three coinciding points). It is invariant under
 * every Mobius map and real exactly for four concyclic or collinear points.
 */
export function crossRatio(z1: Complex, z2: Complex, z3: Complex, z4: Complex): CrossRatioResult {
    const numerator = complexMultiply(subtract(z1, z3), subtract(z2, z4));
    const denominator = complexMultiply(subtract(z1, z4), subtract(z2, z3));
    if (isExactZero(denominator)) return isExactZero(numerator) ? {kind: 'undefined'} : {kind: 'infinity'};
    const value = divide(numerator, denominator);
    return value ? {kind: 'value', value} : {kind: 'infinity'};
}

export type DiscAutomorphismResult =
    | {readonly kind: 'map'; readonly map: Mobius}
    | {readonly kind: 'rejected'; readonly reason: 'off-grid' | 'on-circle' | 'outside-disc' | 'not-finite'};

/**
 * phi_a(z) = e^{i theta} (z - a) / (1 - conj(a) z), the automorphism of the open unit disc sending a to 0. The condition |a| < 1 is
 * decided exactly: p^2 + q^2 < 400 on the grid units (p, q) of a. A value off the grid is rejected (`off-grid`) rather than
 * decided by a tolerance; |a| = 1 gives `on-circle` and |a| > 1 gives `outside-disc` (the map would be constant or flip the disc).
 * a = 0 is allowed and gives the rotation e^{i theta} z. The inverse of the map with theta = 0 is the map with parameter -a.
 */
export function discAutomorphism(a: Complex, theta: number): DiscAutomorphismResult {
    if (!isFiniteComplex(a) || !Number.isFinite(theta)) return {kind: 'rejected', reason: 'not-finite'};
    const units = complexUnits(a);
    if (!units) return {kind: 'rejected', reason: 'off-grid'};
    const sizeSquared = units.re * units.re + units.im * units.im;
    const limit = GRID_PER_UNIT * GRID_PER_UNIT;
    if (sizeSquared > limit) return {kind: 'rejected', reason: 'outside-disc'};
    if (sizeSquared === limit) return {kind: 'rejected', reason: 'on-circle'};
    const rotation = complex(Math.cos(theta), Math.sin(theta));
    return {
        kind: 'map',
        map: {a: rotation, b: negate(complexMultiply(rotation, a)), c: negate(conjugate(a)), d: {re: 1, im: 0}},
    };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Circle inversion
// ---------------------------------------------------------------------------------------------------------------------------

export type InversionResult = {readonly kind: 'point'; readonly point: Complex} | {readonly kind: 'pole'};
export type CirclePosition = 'inside' | 'on' | 'outside';

/**
 * Where z lies with respect to the circle of centre c and radius r: `inside`, `on` or `outside`, decided exactly on integers
 * ((zx - cx)^2 + (zy - cy)^2 against s^2 in grid units). `undefined` unless z, c and r are all on the grid.
 */
export function circlePosition(z: Complex, centre: Complex, radius: number): CirclePosition | undefined {
    const u = complexUnits(z);
    const c = complexUnits(centre);
    const s = gridUnits(radius);
    if (!u || !c || s === undefined) return undefined;
    const distanceSquared = (u.re - c.re) ** 2 + (u.im - c.im) ** 2;
    const radiusSquared = s * s;
    return distanceSquared < radiusSquared ? 'inside' : distanceSquared > radiusSquared ? 'outside' : 'on';
}

/**
 * Inversion in the circle of centre c and radius r > 0: z -> c + r^2 / conj(z - c) = c + r^2 (z - c) / |z - c|^2. It is an
 * involution, fixes the circle pointwise, swaps inside and outside, preserves the size of angles and reverses their orientation
 * (it is anti-conformal). The centre has no image (`pole`); so does a quotient that overflows. On the grid a point exactly on the
 * circle (decided in integer grid units) is returned unchanged, so "fixes the circle" is exact rather than a rounding result.
 * Throws RangeError for a radius that is not a positive finite number (a programming error, not user input).
 */
export function circleInversion(z: Complex, centre: Complex, radius: number): InversionResult {
    if (!(radius > 0) || !Number.isFinite(radius)) throw new RangeError('The radius of inversion must be a positive finite number.');
    const offset = subtract(z, centre);
    if (isExactZero(offset)) return {kind: 'pole'};
    if (circlePosition(z, centre, radius) === 'on') return {kind: 'point', point: complex(z.re, z.im)};
    const factor = (radius * radius) / (offset.re * offset.re + offset.im * offset.im);
    const point = complex(centre.re + factor * offset.re, centre.im + factor * offset.im);
    return isFiniteComplex(point) ? {kind: 'point', point} : {kind: 'pole'};
}

// ---------------------------------------------------------------------------------------------------------------------------
// Generalized circles
// ---------------------------------------------------------------------------------------------------------------------------

/**
 * The circle or line A|z|^2 + conj(B) z + B conj(z) + C = 0, with A, C real and |B|^2 > A C (a real circle or a line, never a
 * point or the empty set). The coefficients are homogeneous: scaling all of them by a nonzero real describes the same set. It is a
 * line exactly when A = 0. Construct with `circleFromCentreRadius` or `lineThroughPoints`; results of images are canonical
 * (A > 0, or for a line the first nonzero coordinate of B positive; reduced by the integer gcd when exact).
 */
export interface GeneralizedCircle {
    readonly A: number;
    readonly B: Complex;
    readonly C: number;
}

/** True when every coefficient is a safe integer, so the form is an exact integer description. */
export const isIntegerForm = (g: GeneralizedCircle): boolean =>
    [g.A, g.B.re, g.B.im, g.C].every(Number.isSafeInteger);

/**
 * The circle of centre c and radius r > 0, or `undefined` for a non-finite centre or a radius that is not positive and finite.
 * With a centre and radius on the grid (units p + q i and s) the coefficients are the exact integers
 * (A, B, C) = (400, -20 (p + q i), p^2 + q^2 - s^2): the form 400 (|z|^2 - conj(c) z - c conj(z) + |c|^2 - r^2). Otherwise the
 * doubles (1, -c, |c|^2 - r^2).
 */
export function circleFromCentreRadius(centre: Complex, radius: number): GeneralizedCircle | undefined {
    if (!isFiniteComplex(centre) || !(radius > 0) || !Number.isFinite(radius)) return undefined;
    const c = complexUnits(centre);
    const s = gridUnits(radius);
    if (c && s !== undefined && s > 0) {
        return {A: GRID_PER_UNIT * GRID_PER_UNIT, B: complex(-GRID_PER_UNIT * c.re, -GRID_PER_UNIT * c.im), C: c.re * c.re + c.im * c.im - s * s};
    }
    return {A: 1, B: negate(centre), C: centre.re * centre.re + centre.im * centre.im - radius * radius};
}

/**
 * The line through two distinct points, or `undefined` for equal or non-finite points. The normal is n = i (q - p); the form is
 * 2 Re(conj(n) z) + C = 0 with C = -2 Re(conj(n) p). Grid points give exact integers: with grid units (nx, ny) of the normal and
 * (px, py) of p, B = 20 (nx + ny i) and C = -2 (nx px + ny py).
 */
export function lineThroughPoints(p: Complex, q: Complex): GeneralizedCircle | undefined {
    if (!isFiniteComplex(p) || !isFiniteComplex(q) || isExactZero(subtract(p, q))) return undefined;
    const pu = complexUnits(p);
    const qu = complexUnits(q);
    if (pu && qu) {
        const nx = -(qu.im - pu.im);
        const ny = qu.re - pu.re;
        return {A: 0, B: complex(GRID_PER_UNIT * nx, GRID_PER_UNIT * ny), C: plusZero(-2 * (nx * pu.re + ny * pu.im))};
    }
    const n = complex(-(q.im - p.im), q.re - p.re);
    return {A: 0, B: n, C: plusZero(-2 * (n.re * p.re + n.im * p.im))};
}

export type GeneralizedCircleShape =
    | {readonly kind: 'circle'; readonly centre: Complex; readonly radius: number}
    | {readonly kind: 'line'; readonly point: Complex; readonly direction: Complex};

/**
 * The geometry of a generalized circle: centre -B/A and radius sqrt(|B|^2 - A C) / |A| for A != 0; for a line the point nearest the
 * origin, -C B / (2 |B|^2), and the unit direction i B / |B|. The discriminant |B|^2 - A C is computed in exact integers when the
 * form is an integer form. Returns `undefined` if the form does not describe a real circle or line (|B|^2 <= A C, or B = 0 for a
 * line) or the numbers are not finite.
 */
export function describeGeneralizedCircle(g: GeneralizedCircle): GeneralizedCircleShape | undefined {
    const discriminant = isIntegerForm(g)
        ? Number(BigInt(g.B.re) ** 2n + BigInt(g.B.im) ** 2n - BigInt(g.A) * BigInt(g.C))
        : g.B.re * g.B.re + g.B.im * g.B.im - g.A * g.C;
    if (!(discriminant > 0) || !Number.isFinite(discriminant)) return undefined;
    if (g.A === 0) {
        const bSquared = g.B.re * g.B.re + g.B.im * g.B.im;
        const size = Math.sqrt(bSquared);
        const point = complex(-g.C * g.B.re / (2 * bSquared), -g.C * g.B.im / (2 * bSquared));
        const direction = complex(-g.B.im / size, g.B.re / size);
        return isFiniteComplex(point) && isFiniteComplex(direction) ? {kind: 'line', point, direction} : undefined;
    }
    const centre = complex(-g.B.re / g.A, -g.B.im / g.A);
    const radius = Math.sqrt(discriminant) / Math.abs(g.A);
    return isFiniteComplex(centre) && Number.isFinite(radius) ? {kind: 'circle', centre, radius} : undefined;
}

export interface GeneralizedCircleImage {
    readonly kind: 'image';
    /** The image, as a canonical generalized circle (all coefficients finite). */
    readonly circle: GeneralizedCircle;
    /** `line` exactly when A' = 0. */
    readonly shape: 'circle' | 'line';
    /**
     * Whether the source passes through the pole of the map (the centre of the inversion): A' = 0 when c != 0 (A' = Q(-d/c) |c|^2),
     * and for a map with c = 0, whose pole is the point at infinity, whether the source is a line (a line passes through infinity).
     */
    readonly throughPole: boolean;
    /** True when the status above was decided in exact integer arithmetic; false means the doubles fallback (not grid data). */
    readonly exact: boolean;
}
export type GeneralizedCircleImageResult =
    | GeneralizedCircleImage
    | {readonly kind: 'invalid'; readonly reason: 'degenerate-map' | 'not-finite'};

function gcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) [x, y] = [y, x % y];
    return x;
}

/** Canonical homogeneous scale: reduce by the integer gcd (exact case), and fix the sign so A > 0, or for a line the first nonzero coordinate of B > 0. */
function canonicalize(A: number, B: Complex, C: number, exact: boolean): GeneralizedCircle {
    let scale = 1;
    if (exact) {
        scale = gcd(gcd(A, B.re), gcd(B.im, C));
        if (scale === 0) scale = 1;
    }
    const sign = A !== 0 ? Math.sign(A) : B.re !== 0 ? Math.sign(B.re) : B.im !== 0 ? Math.sign(B.im) : 1;
    // Multiply by the sign first and divide by the (integer) gcd last: both steps are exact for safe integers.
    const rescale = (x: number): number => plusZero((x * sign) / scale);
    return {A: rescale(A), B: complex(rescale(B.re), rescale(B.im)), C: rescale(C)};
}

/**
 * H' = N* H N for the matrix N = [[n11, n12], [n21, n22]], computed in exact integer arithmetic when every input is a safe
 * integer and every partial sum stays below 2^53; otherwise plain doubles.
 */
function transformForm(n: readonly [Complex, Complex, Complex, Complex], source: GeneralizedCircle): {circle: GeneralizedCircle; exact: boolean} | undefined {
    const [n11, n12, n21, n22] = n;
    let peak = 0;
    const times = (x: Complex, y: Complex): Complex => {
        peak = Math.max(peak, Math.abs(x.re * y.re) + Math.abs(x.im * y.im), Math.abs(x.re * y.im) + Math.abs(x.im * y.re));
        return {re: x.re * y.re - x.im * y.im, im: x.re * y.im + x.im * y.re};
    };
    const plus = (x: Complex, y: Complex): Complex => {
        peak = Math.max(peak, Math.abs(x.re) + Math.abs(y.re), Math.abs(x.im) + Math.abs(y.im));
        return {re: x.re + y.re, im: x.im + y.im};
    };
    const real = (x: number): Complex => ({re: x, im: 0});
    const H11 = real(source.A);
    const H12 = source.B;
    const H21 = conjugate(source.B);
    const H22 = real(source.C);
    // K = H N
    const K11 = plus(times(H11, n11), times(H12, n21));
    const K12 = plus(times(H11, n12), times(H12, n22));
    const K21 = plus(times(H21, n11), times(H22, n21));
    const K22 = plus(times(H21, n12), times(H22, n22));
    // H' = N* K
    const A = plus(times(conjugate(n11), K11), times(conjugate(n21), K21));
    const B = plus(times(conjugate(n11), K12), times(conjugate(n21), K22));
    const C = plus(times(conjugate(n12), K12), times(conjugate(n22), K22));
    if (![A, B, C].every(isFiniteComplex) || !Number.isFinite(peak)) return undefined;
    const integerInputs = isIntegerForm(source) && n.every(entry => Number.isSafeInteger(entry.re) && Number.isSafeInteger(entry.im));
    const exact = integerInputs && peak <= Number.MAX_SAFE_INTEGER;
    // A' and C' are real for a Hermitian H; the imaginary parts are zero in exact arithmetic and rounding noise otherwise.
    return {circle: canonicalize(A.re, B, C.re, exact), exact};
}

function imageFromMatrix(
    n: readonly [Complex, Complex, Complex, Complex], source: GeneralizedCircle, throughPole: (shapeIsLine: boolean) => boolean,
): GeneralizedCircleImageResult {
    const transformed = transformForm(n, source);
    if (!transformed) return {kind: 'invalid', reason: 'not-finite'};
    const isLine = transformed.circle.A === 0;
    return {kind: 'image', circle: transformed.circle, shape: isLine ? 'line' : 'circle', throughPole: throughPole(isLine), exact: transformed.exact};
}

/** The entries of a Mobius-like matrix in grid units (an exact common scale of 20) when all four are on the grid, else the raw doubles. */
function integerEntries(entries: readonly [Complex, Complex, Complex, Complex]): readonly [Complex, Complex, Complex, Complex] {
    const units = entries.map(complexUnits);
    return units.every(u => u !== undefined) ? units as unknown as readonly [Complex, Complex, Complex, Complex] : entries;
}

/**
 * The image of a generalized circle under w = M z, from H' = N* H N with N = adj(M) (the entries d, -b, -c, a). The image is a
 * line exactly when A' = 0, decided on integers when the map has grid coefficients and the source has integer coefficients (any
 * circle or line built from grid data); then `exact` is true. A degenerate map (a d - b c = 0) gives `invalid`.
 */
export function mobiusImage(m: Mobius, source: GeneralizedCircle): GeneralizedCircleImageResult {
    const validation = validateMobius(m);
    if (validation.kind === 'invalid') return {kind: 'invalid', reason: validation.reason === 'degenerate' ? 'degenerate-map' : 'not-finite'};
    if (!isFiniteComplex(source.B) || !Number.isFinite(source.A) || !Number.isFinite(source.C)) return {kind: 'invalid', reason: 'not-finite'};
    const [a, b, c, d] = integerEntries([m.a, m.b, m.c, m.d]);
    const cIsZero = isExactZero(m.c);
    return imageFromMatrix([d, negate(b), negate(c), a], source, isLine => cIsZero ? source.A === 0 : isLine);
}

/**
 * The image of a generalized circle under inversion in the circle of centre c and radius r > 0. Inversion is anti-holomorphic:
 * the source is conjugated first (B becomes conj B) and the Mobius map u -> (c u + r^2 - |c|^2) / (u - conj c) is applied. The image
 * is a line exactly when the source passes through the centre c (A' = 0), decided on integers for grid data (`exact`). An
 * invalid centre or radius gives `invalid`.
 */
export function inversionImage(source: GeneralizedCircle, centre: Complex, radius: number): GeneralizedCircleImageResult {
    if (!isFiniteComplex(centre) || !(radius > 0) || !Number.isFinite(radius)) return {kind: 'invalid', reason: 'not-finite'};
    if (!isFiniteComplex(source.B) || !Number.isFinite(source.A) || !Number.isFinite(source.C)) return {kind: 'invalid', reason: 'not-finite'};
    const c = complexUnits(centre);
    const s = gridUnits(radius);
    let mu: readonly [Complex, Complex, Complex, Complex];
    if (c && s !== undefined && s > 0) {
        // 400 * [[c, r^2 - |c|^2], [1, -conj(c)]] in grid units p + q i and s.
        mu = [
            complex(GRID_PER_UNIT * c.re, GRID_PER_UNIT * c.im),
            {re: s * s - c.re * c.re - c.im * c.im, im: 0},
            {re: GRID_PER_UNIT * GRID_PER_UNIT, im: 0},
            complex(-GRID_PER_UNIT * c.re, GRID_PER_UNIT * c.im),
        ];
    } else {
        mu = [centre, {re: radius * radius - centre.re * centre.re - centre.im * centre.im, im: 0}, {re: 1, im: 0}, negate(conjugate(centre))];
    }
    const [a, b, cc, d] = mu;
    return imageFromMatrix([d, negate(b), negate(cc), a], {A: source.A, B: conjugate(source.B), C: source.C}, isLine => isLine);
}
