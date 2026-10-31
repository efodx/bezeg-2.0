/**
 * Exact conic kernel on BigInt coefficients (ADR 0033 section 1; spec K3, K5).
 *
 * A conic is the integer coefficient list [A, B, C, D, E, F] of A x^2 + B xy + C y^2 + D xw + E yw + F w^2, up to a
 * non-zero scalar. Its symmetric matrix is M = [[A, B/2, D/2], [B/2, C, E/2], [D/2, E/2, F]]. To stay in integers this
 * module works with 2M (`matrix`); the sign of det(2M) equals the sign of det(M).
 *
 * Every discrete decision (type, on/inside/outside, number of intersections, rationality of the intersections) is made
 * in BigInt. Doubles appear only in the `approx` views of irrational intersections, with a stated tolerance.
 * Callers never receive NaN or Infinity, and the zero triple never escapes: degenerate cases are typed statuses.
 * The five-point solver (`conicFromFivePoints`) sits at the end of the module.
 */
import {fractionToNumber, isIdeal, isZero, lineAtInfinity, normalize, type Hom} from './homogeneous';

export type Conic = readonly [bigint, bigint, bigint, bigint, bigint, bigint];
export type Matrix3 = readonly [Hom, Hom, Hom];

export type ConicType =
    | 'ellipse'
    | 'circle'
    | 'parabola'
    | 'hyperbola'
    | 'line-pair'
    | 'parallel-lines'
    | 'double-line'
    | 'point'
    | 'empty';

export type SideResult = 'inside' | 'on' | 'outside' | 'degenerate';

/** Absolute coordinate error bound claimed for `approx` points on inputs of moderate size (coordinates below 1e3). */
export const IRRATIONAL_TOLERANCE = 1e-9;

export type ApproxPoint =
    | {readonly kind: 'finite'; readonly x: number; readonly y: number}
    | {readonly kind: 'ideal'; readonly dx: number; readonly dy: number};

export type LineIntersection =
    | {readonly status: 'none'}
    | {readonly status: 'tangent'; readonly point: Hom}
    | {readonly status: 'two'; readonly points: readonly [Hom, Hom]}
    /** Two real intersections that are not rational: approximations only, within `tolerance`. */
    | {readonly status: 'irrational'; readonly approx: readonly [ApproxPoint, ApproxPoint]; readonly tolerance: number}
    /** The whole line lies on the conic (it is a component of a degenerate conic). */
    | {readonly status: 'contained'};

export type PolarResult = {readonly status: 'ok'; readonly line: Hom} | {readonly status: 'indeterminate'};
export type PoleResult = {readonly status: 'ok'; readonly point: Hom} | {readonly status: 'singular'};

export type TangentPointsResult =
    | {readonly status: 'degenerate'}
    | {readonly status: 'inside'}
    | {readonly status: 'on'; readonly point: Hom}
    | {readonly status: 'outside'; readonly tangency: LineIntersection};

function toBigInt(n: number | bigint, name: string): bigint {
    if (typeof n === 'bigint') return n;
    if (!Number.isSafeInteger(n)) throw new RangeError(`${name} must be a safe integer, got ${n}`);
    return BigInt(n);
}

function abs(n: bigint): bigint {
    return n < 0n ? -n : n;
}

function gcd(a: bigint, b: bigint): bigint {
    a = abs(a);
    b = abs(b);
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
}

function sign(n: bigint): -1 | 0 | 1 {
    return n < 0n ? -1 : n > 0n ? 1 : 0;
}

/** Floor square root of a non-negative BigInt. */
export function isqrt(n: bigint): bigint {
    if (n < 0n) throw new RangeError('isqrt of a negative number');
    if (n < 2n) return n;
    let x = 1n << BigInt((n.toString(2).length + 1) >> 1);
    for (;;) {
        const y = (x + n / x) >> 1n;
        if (y >= x) return x;
        x = y;
    }
}

/** A conic from integer coefficients, divided by their gcd with the first non-zero coefficient positive. */
export function conic(
    A: number | bigint,
    B: number | bigint,
    C: number | bigint,
    D: number | bigint,
    E: number | bigint,
    F: number | bigint,
): Conic {
    const c = [
        toBigInt(A, 'A'),
        toBigInt(B, 'B'),
        toBigInt(C, 'C'),
        toBigInt(D, 'D'),
        toBigInt(E, 'E'),
        toBigInt(F, 'F'),
    ];
    const g = c.reduce(gcd, 0n);
    if (g === 0n) throw new RangeError('the zero conic is not a conic');
    const first = c.find((v) => v !== 0n) as bigint;
    const s = first < 0n ? -g : g;
    return c.map((v) => v / s) as unknown as Conic;
}

/** The doubled symmetric matrix 2M, as rows. */
export function matrix(c: Conic): Matrix3 {
    const [A, B, C, D, E, F] = c;
    return [
        [2n * A, B, D],
        [B, 2n * C, E],
        [D, E, 2n * F],
    ];
}

function dot(r: Hom, p: Hom): bigint {
    return r[0] * p[0] + r[1] * p[1] + r[2] * p[2];
}

function mulVec(m: Matrix3, p: Hom): Hom {
    return [dot(m[0], p), dot(m[1], p), dot(m[2], p)];
}

function det(m: Matrix3): bigint {
    return (
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    );
}

/** The form value A x^2 + ... at a point (or any homogeneous vector). Exact. */
export function evaluate(c: Conic, p: Hom): bigint {
    const [x, y, w] = p;
    return c[0] * x * x + c[1] * x * y + c[2] * y * y + c[3] * x * w + c[4] * y * w + c[5] * w * w;
}

/** The bilinear form p^T (2M) q: twice the polarization of the form. */
export function bilinear2(c: Conic, p: Hom, q: Hom): bigint {
    return dot(mulVec(matrix(c), q), p);
}

/** Sign of det(M): the 3x3 determinant of the conic, exact. */
export function determinantSign(c: Conic): -1 | 0 | 1 {
    return sign(det(matrix(c)));
}

/** B^2 - 4AC, exact. */
export function discriminant(c: Conic): bigint {
    return c[1] * c[1] - 4n * c[0] * c[2];
}

function rank(c: Conic): 1 | 2 | 3 {
    const m = matrix(c);
    if (det(m) !== 0n) return 3;
    for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                for (let l = k + 1; l < 3; l++) {
                    if (m[i][k] * m[j][l] - m[i][l] * m[j][k] !== 0n) return 2;
                }
            }
        }
    }
    return 1;
}

/**
 * The real type, from the exact determinant, the rank and the sign of B^2 - 4AC.
 * Det != 0: B^2-4AC < 0 is an ellipse (a circle when B = 0 and A = C) if real, empty if det(M)(A+C) > 0;
 * = 0 a parabola; > 0 a hyperbola. Det = 0, rank 2: B^2-4AC > 0 two lines meeting in a finite point; < 0 one real
 * point (two complex lines); = 0 parallel lines, or empty when the principal minors sum to a positive value.
 * Rank 1 is a double line.
 *
 * 'empty' is the affine reading: no real point in the affine plane. A rank-2 'empty' conic (two conjugate complex
 * parallel lines, such as x^2 + w^2) still has one real projective point, its ideal singular point; it is not a
 * 'point', which is always finite here and drawn as a marker.
 *
 * A rank-2 conic whose quadratic part vanishes (A = B = C = 0) is w(Dx + Ey + Fw): the line at infinity together
 * with one finite line, which meet in the ideal point of that line. Projectively this is a real line pair, so it is
 * 'line-pair', not 'parallel-lines' (it has only one finite line). Its minors sum is -(D^2 + E^2) < 0, so it is
 * always real.
 */
export function classify(c: Conic): ConicType {
    const disc = discriminant(c);
    const r = rank(c);
    if (r === 3) {
        if (disc > 0n) return 'hyperbola';
        if (disc === 0n) return 'parabola';
        // A+C and det(M) have opposite signs exactly when the ellipse is real.
        if (sign(c[0] + c[2]) * determinantSign(c) > 0) return 'empty';
        return c[1] === 0n && c[0] === c[2] ? 'circle' : 'ellipse';
    }
    if (r === 1) return 'double-line';
    if (disc > 0n) return 'line-pair';
    if (c[0] === 0n && c[1] === 0n && c[2] === 0n) return 'line-pair';
    if (disc < 0n) return 'point';
    // Rank 2 with B^2 = 4AC: parallel lines. Real iff the sum of the principal minors m00 + m11 of 2M is negative.
    const m = matrix(c);
    const m00 = m[1][1] * m[2][2] - m[1][2] * m[2][1];
    const m11 = m[0][0] * m[2][2] - m[0][2] * m[2][0];
    return m00 + m11 < 0n ? 'parallel-lines' : 'empty';
}

const SMOOTH: readonly ConicType[] = ['ellipse', 'circle', 'parabola', 'hyperbola'];

/** True for a non-degenerate real conic (ellipse, circle, parabola, hyperbola). */
export function isSmooth(c: Conic): boolean {
    return SMOOTH.includes(classify(c));
}

/** True when the point satisfies the equation. Exact. */
export function onConic(c: Conic, p: Hom): boolean {
    return evaluate(c, p) === 0n;
}

/**
 * Inside, on or outside, from the exact sign of the form: inside (no real tangents from the point) iff
 * form * det(M) > 0, which for an ellipse is form < 0, for a hyperbola the region containing the foci, and for a
 * parabola the region containing the focus. Ideal points are classified the same way. A degenerate conic has no
 * inside: the result is 'degenerate'.
 */
export function side(c: Conic, p: Hom): SideResult {
    if (isZero(p)) throw new RangeError('the zero triple is not a point');
    if (!isSmooth(c)) return 'degenerate';
    const v = evaluate(c, p);
    if (v === 0n) return 'on';
    return sign(v) * determinantSign(c) > 0 ? 'inside' : 'outside';
}

/** The polar line of a point: (2M) p, normalized. Indeterminate when p is the singular point of a degenerate conic. */
export function polar(c: Conic, p: Hom): PolarResult {
    if (isZero(p)) throw new RangeError('the zero triple is not a point');
    const l = mulVec(matrix(c), p);
    return isZero(l) ? {status: 'indeterminate'} : {status: 'ok', line: normalize(l)};
}

function adjugate(m: Matrix3): Matrix3 {
    const cof = (r: number, s: number): bigint => {
        const [a, b] = [0, 1, 2].filter((i) => i !== r);
        const [c, d] = [0, 1, 2].filter((i) => i !== s);
        return ((r + s) % 2 === 0 ? 1n : -1n) * (m[a][c] * m[b][d] - m[a][d] * m[b][c]);
    };
    // adj = transpose of the cofactor matrix.
    return [
        [cof(0, 0), cof(1, 0), cof(2, 0)],
        [cof(0, 1), cof(1, 1), cof(2, 1)],
        [cof(0, 2), cof(1, 2), cof(2, 2)],
    ];
}

/** The pole of a line: (2M)^-1 l, through the adjugate, normalized. Singular for a degenerate conic. */
export function pole(c: Conic, line: Hom): PoleResult {
    if (isZero(line)) throw new RangeError('the zero triple is not a line');
    const m = matrix(c);
    if (det(m) === 0n) return {status: 'singular'};
    return {status: 'ok', point: normalize(mulVec(adjugate(m), line))};
}

function cross(a: Hom, b: Hom): Hom {
    return normalize([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
}

/** Two distinct points spanning a line. */
function basis(line: Hom): readonly [Hom, Hom] {
    const units: Hom[] = [
        [1n, 0n, 0n],
        [0n, 1n, 0n],
        [0n, 0n, 1n],
    ];
    const pts = units.map((e) => cross(line, e)).filter((p) => !isZero(p));
    for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
            if (!isZero(cross(pts[i], pts[j]))) return [pts[i], pts[j]];
        }
    }
    throw new RangeError('the zero triple is not a line');
}

/** The normalized point l*u + m*v. */
export function combine(l: bigint, u: Hom, m: bigint, v: Hom): Hom {
    return normalize([l * u[0] + m * v[0], l * u[1] + m * v[1], l * u[2] + m * v[2]]);
}

function toDouble(n: bigint): number {
    return fractionToNumber({num: n, den: 1n});
}

function approxPoint(l: number, u: Hom, m: number, v: Hom, ideal: boolean): ApproxPoint {
    const scale = Math.max(Math.abs(l), Math.abs(m)) || 1;
    const ls = l / scale;
    const ms = m / scale;
    // one common scale for u and v, so the combination l u + m v is unchanged up to that factor
    const sc = Math.max(...u.map((n) => Math.abs(toDouble(n))), ...v.map((n) => Math.abs(toDouble(n)))) || 1;
    const comb = (k: 0 | 1 | 2) => (ls * toDouble(u[k])) / sc + (ms * toDouble(v[k])) / sc;
    const [x, y, w] = [comb(0), comb(1), comb(2)];
    if (ideal) {
        const s = Math.max(Math.abs(x), Math.abs(y)) || 1;
        return {kind: 'ideal', dx: x / s, dy: y / s};
    }
    return {kind: 'finite', x: x / w, y: y / w};
}

/**
 * The intersections of a conic with a line, found from the binary quadratic of the conic restricted to the line.
 * Rational roots give exact homogeneous points. Two real irrational roots give a typed `irrational` result with double
 * approximations (`tolerance` stated); rationality is decided by the exact discriminant being a perfect square.
 * Irrational points are ideal only on the line at infinity itself.
 */
export function intersectLine(c: Conic, line: Hom): LineIntersection {
    if (isZero(line)) throw new RangeError('the zero triple is not a line');
    const [u, v] = basis(line);
    const qa = evaluate(c, u);
    const qb = bilinear2(c, u, v);
    const qc = evaluate(c, v);
    if (qa === 0n && qb === 0n && qc === 0n) return {status: 'contained'};
    const D = qb * qb - 4n * qa * qc;
    if (D < 0n) return {status: 'none'};
    if (D === 0n) {
        if (qa !== 0n) return {status: 'tangent', point: combine(-qb, u, 2n * qa, v)};
        return {status: 'tangent', point: u};
    }
    const s = isqrt(D);
    if (s * s === D) {
        if (qa === 0n) return {status: 'two', points: [u, combine(-qc, u, qb, v)]};
        return {status: 'two', points: [combine(-qb + s, u, 2n * qa, v), combine(-qb - s, u, 2n * qa, v)]};
    }
    const root = Math.sqrt(toDouble(D));
    const b = toDouble(qb);
    const q = -(b + (b >= 0 ? root : -root)) / 2;
    const ideal = isIdeal(u) && isIdeal(v);
    return {
        status: 'irrational',
        approx: [approxPoint(q, u, toDouble(qa), v, ideal), approxPoint(toDouble(qc), u, q, v, ideal)],
        tolerance: IRRATIONAL_TOLERANCE,
    };
}

/** The real points at infinity: the intersections with the line at infinity. 0, 1 or 2 ideal points, never complex. */
export function pointsAtInfinity(c: Conic): LineIntersection {
    return intersectLine(c, lineAtInfinity());
}

/**
 * The points of tangency of the tangents from P. Outside: the intersections of the polar with the conic (exact when
 * rational, otherwise 'irrational' with a tolerance). On: P itself. Inside: none. A degenerate conic: 'degenerate'.
 */
export function tangentPoints(c: Conic, p: Hom): TangentPointsResult {
    const s = side(c, p);
    if (s === 'degenerate') return {status: 'degenerate'};
    if (s === 'inside') return {status: 'inside'};
    if (s === 'on') return {status: 'on', point: normalize(p)};
    const pl = polar(c, p);
    if (pl.status !== 'ok') return {status: 'degenerate'};
    return {status: 'outside', tangency: intersectLine(c, pl.line)};
}

export type FivePointStatus = 'unique' | 'line-pair' | 'pencil' | 'invalid';

export interface FivePointResult {
    readonly status: FivePointStatus;
    /** The six signed 5x5 cofactors (-1)^j det(row matrix without column j); all zero for `pencil` and `invalid`. */
    readonly cofactors: readonly [bigint, bigint, bigint, bigint, bigint, bigint];
    /** The unique conic (gcd-reduced, first non-zero coefficient positive); absent for `pencil` and `invalid`. */
    readonly conic?: Conic;
    /** The classification of the unique conic when there is one. */
    readonly type?: ConicType;
}

function detN(m: readonly (readonly bigint[])[]): bigint {
    const n = m.length;
    if (n === 1) return m[0][0];
    let total = 0n;
    for (let j = 0; j < n; j++) {
        if (m[0][j] === 0n) continue;
        const minor = m.slice(1).map((row) => row.filter((_, k) => k !== j));
        total += (j % 2 === 0 ? 1n : -1n) * m[0][j] * detN(minor);
    }
    return total;
}

/**
 * The conic through five points, from the 5 x 6 system with rows (x^2, xy, y^2, xw, yw, w^2): the coefficient of
 * column j is the signed 5 x 5 minor without column j (Cramer). All six minors zero means the rows have rank at most 4,
 * so the conics through the points form a pencil (four collinear points, a repeated point): no unique conic, and no
 * numeric "nearest conic" is ever produced. Otherwise the minors are the unique conic up to scale; it is `unique` when
 * smooth and `line-pair` when it splits into two real lines (including parallel lines). A zero triple among the inputs
 * is `invalid`.
 */
export function conicFromFivePoints(points: readonly [Hom, Hom, Hom, Hom, Hom]): FivePointResult {
    const zero = [0n, 0n, 0n, 0n, 0n, 0n] as const;
    if (points.length !== 5 || points.some(isZero)) return {status: 'invalid', cofactors: zero};
    const rows = points.map(([x, y, w]) => [x * x, x * y, y * y, x * w, y * w, w * w]);
    const cofactors = [0, 1, 2, 3, 4, 5].map((j) => {
        const minor = detN(rows.map((row) => row.filter((_, k) => k !== j)));
        return j % 2 === 0 ? minor : -minor;
    }) as unknown as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
    if (cofactors.every((v) => v === 0n)) return {status: 'pencil', cofactors};
    const c = conic(...cofactors);
    const type = classify(c);
    if (type === 'ellipse' || type === 'circle' || type === 'parabola' || type === 'hyperbola') {
        return {status: 'unique', cofactors, conic: c, type};
    }
    if (type === 'line-pair' || type === 'parallel-lines' || type === 'double-line') {
        return {status: 'line-pair', cofactors, conic: c, type};
    }
    return {status: 'invalid', cofactors, conic: c, type};
}
