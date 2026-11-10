/**
 * Circle construction kernel (spec: circle-geometry-lessons.md "Circle construction kernel"; ADR 0045 sections 2-3).
 * Tangents from a point, radical axis and centre, the Apollonius locus and the common tangents of two circles. Pure
 * TypeScript on top of `circle.ts`, `rational.ts` and `grid.ts`; no React, JSXGraph or board state.
 *
 * Inputs. Points and circle centres are integer grid points (`GridPoint`, rejected with a RangeError otherwise). A circle
 * is a `Circle` (`centre`, `r2`) with `r2 > 0` and `16 r2` an integer, which holds for every radius that is a multiple of
 * 1/4. `makeCircle(centre, radius)` builds the `RadiusCircle` that `commonTangents` needs (`radius` a positive multiple of
 * 1/4 and `r2 = radius^2` exactly). The Apollonius parameter is `m = k^2` with `k` a positive multiple of 1/2.
 *
 * Exactness. Every discrete decision (inside / on / outside, the number of common tangents, concentric, coaxal, parallel,
 * the Apollonius line / circle) is an exact rational sign or equality; there is no epsilon. Chords, axes, centres of
 * similarity, Apollonius circles and the lines through exact contact points are exact rationals. Points of contact and
 * tangent lines that need a square root are doubles and carry `inexact: true`. Degenerate configurations return a status;
 * nothing is NaN or infinite.
 */
import {assertGridPoint, GRID_COORD_LIMIT, type GridPoint} from './grid';
import {intersectCircles, intersectLineCircle, powerOfPoint, type Circle, type InexactXY, type Line} from './circle';
import {Rational, RationalPoint} from './rational';

const ONE = Rational.ONE;
const TWO = Rational.of(2);
const SIXTEEN = 16n;
const LIMIT = BigInt(GRID_COORD_LIMIT);

/** A circle with its radius kept next to `r2 = radius^2`. */
export interface RadiusCircle extends Circle {
    readonly radius: Rational;
}

/** A line `a x + b y = c` with a unit normal in doubles (distance of `(x, y)` is `|a x + b y - c|`). */
export interface InexactLine {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly inexact: true;
}

function absBig(v: bigint): bigint {
    return v < 0n ? -v : v;
}

function isqrt(n: bigint): bigint {
    if (n < 2n) return n;
    let x = BigInt(Math.floor(Math.sqrt(Number(n))));
    while (x * x > n) x -= 1n;
    while ((x + 1n) * (x + 1n) <= n) x += 1n;
    return x;
}

function assertGridRational(point: RationalPoint, name: string): void {
    for (const v of [point.x, point.y]) {
        if (v.den !== 1n || absBig(v.num) > LIMIT) {
            throw new RangeError(`${name} must have integer coordinates with |c| <= ${GRID_COORD_LIMIT}`);
        }
    }
}

function assertKernelCircle(circle: Circle, name: string): void {
    assertGridRational(circle.centre, `${name} centre`);
    if (circle.r2.sign() <= 0) throw new RangeError(`${name} needs a positive radius`);
    if (SIXTEEN % circle.r2.den !== 0n) throw new RangeError(`${name} radius must be a multiple of 1/4`);
}

/** The circle with a grid centre and a positive radius that is a multiple of 1/4; `r2 = radius^2` is exact. */
export function makeCircle(centre: GridPoint, radius: Rational): RadiusCircle {
    assertGridPoint(centre, 'centre');
    if (radius.sign() <= 0) throw new RangeError('the radius must be positive');
    if (radius.mul(Rational.of(4)).den !== 1n) throw new RangeError('the radius must be a multiple of 1/4');
    return {centre: RationalPoint.fromGrid(centre), r2: radius.mul(radius), radius};
}

function line(a: Rational, b: Rational, c: Rational): Line {
    return {kind: 'line', a, b, c};
}

function lineEquals(p: Line, q: Line): boolean {
    // Same set of points: the coefficient triples are proportional (both normals are nonzero).
    return p.a.mul(q.b).equals(p.b.mul(q.a)) && p.a.mul(q.c).equals(p.c.mul(q.a)) && p.b.mul(q.c).equals(p.c.mul(q.b));
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. Tangents from a point
// ---------------------------------------------------------------------------------------------------------------------

export type TangentsFromResult =
    | { readonly status: 'inside'; readonly power: Rational }
    | { readonly status: 'on'; readonly power: Rational; readonly point: RationalPoint; readonly line: Line }
    | {
    readonly status: 'outside';
    readonly power: Rational;
    /** Squared tangent length; equal to `power`. */
    readonly tangentLengthSquared: Rational;
    /** `sqrt(power)`, a double. */
    readonly tangentLength: number;
    /** The exact chord of contact `(P - O) . (X - O) = r2`. */
    readonly chord: Line;
    /** The points of contact, inexact; ordered along the direction `(-b, a)` of the chord. */
    readonly contacts: readonly [InexactXY, InexactXY];
};

function tangentsFromRational(p: RationalPoint, circle: Circle): TangentsFromResult {
    const power = powerOfPoint(p, circle);
    const sign = power.sign();
    if (sign < 0) return {status: 'inside', power};
    const d = p.sub(circle.centre);
    if (sign === 0) return {status: 'on', power, point: p, line: line(d.x, d.y, d.dot(p))};
    const chord = line(d.x, d.y, circle.r2.add(d.dot(circle.centre)));
    const hit = intersectLineCircle(chord, circle);
    // The discriminant of the chord is r2 * power, positive here.
    if (hit.kind !== 'two') throw new Error('the chord of contact of an outside point must cut the circle twice');
    return {
        status: 'outside',
        power,
        tangentLengthSquared: power,
        tangentLength: Math.sqrt(power.toNumber()),
        chord,
        contacts: hit.points,
    };
}

/** Tangents from the grid point `p` to `circle`: none inside, one (exact) on the circle, two outside. */
export function tangentsFrom(p: GridPoint, circle: Circle): TangentsFromResult {
    assertGridPoint(p, 'p');
    assertKernelCircle(circle, 'circle');
    return tangentsFromRational(RationalPoint.fromGrid(p), circle);
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. Radical axis and radical centre
// ---------------------------------------------------------------------------------------------------------------------

export type RadicalAxisResult =
    | { readonly status: 'line'; readonly line: Line }
    | { readonly status: 'concentric' }
    | { readonly status: 'coincident' };

function axisOf(c1: Circle, c2: Circle): RadicalAxisResult {
    const e = c2.centre.sub(c1.centre);
    if (e.x.isZero() && e.y.isZero()) return c1.r2.equals(c2.r2) ? {status: 'coincident'} : {status: 'concentric'};
    const n1 = c1.centre.dot(c1.centre);
    const n2 = c2.centre.dot(c2.centre);
    return {status: 'line', line: line(TWO.mul(e.x), TWO.mul(e.y), n2.sub(n1).sub(c2.r2).add(c1.r2))};
}

/** The exact line of equal power `2 (O2 - O1) . X = |O2|^2 - |O1|^2 - r2_2 + r2_1`, or the concentric / coincident status. */
export function radicalAxis(c1: Circle, c2: Circle): RadicalAxisResult {
    assertKernelCircle(c1, 'first circle');
    assertKernelCircle(c2, 'second circle');
    return axisOf(c1, c2);
}

export type RadicalCentreResult =
    /** Two of the circles are concentric (or equal), so there is no axis for that pair. */
    | { readonly status: 'concentric' }
    /** Collinear centres, parallel but different axes: no radical centre. */
    | { readonly status: 'parallel' }
    /** Collinear centres and one common axis (for example circles through the same two points). */
    | { readonly status: 'coaxal'; readonly axis: Line }
    | { readonly status: 'centre'; readonly point: RationalPoint; readonly power: Rational };

/** Radical centre of three circles with the common power there, or `parallel` / `coaxal` for collinear centres. */
export function radicalCentre(c1: Circle, c2: Circle, c3: Circle): RadicalCentreResult {
    assertKernelCircle(c1, 'first circle');
    assertKernelCircle(c2, 'second circle');
    assertKernelCircle(c3, 'third circle');
    const first = axisOf(c1, c2);
    const second = axisOf(c1, c3);
    if (first.status !== 'line' || second.status !== 'line') return {status: 'concentric'};
    const cross = c2.centre.sub(c1.centre).cross(c3.centre.sub(c1.centre));
    if (cross.isZero()) {
        return lineEquals(first.line, second.line) ? {status: 'coaxal', axis: first.line} : {status: 'parallel'};
    }
    const l1 = first.line;
    const l2 = second.line;
    const det = l1.a.mul(l2.b).sub(l1.b.mul(l2.a));
    const point = new RationalPoint(
        l1.c.mul(l2.b).sub(l1.b.mul(l2.c)).div(det),
        l1.a.mul(l2.c).sub(l1.c.mul(l2.a)).div(det),
    );
    return {status: 'centre', point, power: powerOfPoint(point, c1)};
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. Apollonius locus
// ---------------------------------------------------------------------------------------------------------------------

export type ApolloniusResult =
    /** `A = B`: the locus is not defined. */
    | { readonly status: 'degenerate' }
    /** `m = 1`: the perpendicular bisector of `AB`. `internal` is the midpoint. */
    | { readonly status: 'line'; readonly line: Line; readonly internal: RationalPoint }
    | {
    readonly status: 'circle';
    readonly circle: Circle;
    readonly k: Rational;
    /** The division point of `AB` with `PA = k PB`, `(A + k B) / (1 + k)`. */
    readonly internal: RationalPoint;
    /** The external division point `(A - k B) / (1 - k)`; internal and external are the ends of a diameter. */
    readonly external: RationalPoint;
};

/** `k` with `m = k^2` and `k` a positive multiple of 1/2; throws a RangeError for any other `m`. */
function ratioOf(m: Rational): Rational {
    const four = m.mul(Rational.of(4));
    if (m.sign() <= 0 || four.den !== 1n) throw new RangeError('m must be k^2 with k a positive multiple of 1/2');
    const j = isqrt(four.num);
    if (j * j !== four.num) throw new RangeError('m must be k^2 with k a positive multiple of 1/2');
    return Rational.fromBigInt(j, 2n);
}

/** The locus `|PA|^2 = m |PB|^2`: the exact bisector for `m = 1`, otherwise the exact circle. Never divides by `m - 1 = 0`. */
export function apolloniusLocus(a: GridPoint, b: GridPoint, m: Rational): ApolloniusResult {
    assertGridPoint(a, 'a');
    assertGridPoint(b, 'b');
    const k = ratioOf(m);
    const pa = RationalPoint.fromGrid(a);
    const pb = RationalPoint.fromGrid(b);
    if (pa.equals(pb)) return {status: 'degenerate'};
    const e = pb.sub(pa);
    const internal = pa.add(e.scale(k.div(ONE.add(k))));
    if (m.equals(ONE)) {
        return {status: 'line', line: line(TWO.mul(e.x), TWO.mul(e.y), pb.dot(pb).sub(pa.dot(pa))), internal};
    }
    const mm1 = m.sub(ONE);
    const centre = pb.scale(m).sub(pa).scale(ONE.div(mm1));
    const r2 = m.mul(e.dot(e)).div(mm1.mul(mm1));
    const external = pa.add(e.scale(k.div(k.sub(ONE))));
    return {status: 'circle', circle: {centre, r2}, k, internal, external};
}

/** Exact membership test `|PA|^2 = m |PB|^2`. */
export function apolloniusContains(a: GridPoint, b: GridPoint, m: Rational, p: RationalPoint): boolean {
    assertGridPoint(a, 'a');
    assertGridPoint(b, 'b');
    ratioOf(m);
    const pa = p.sub(RationalPoint.fromGrid(a));
    const pb = p.sub(RationalPoint.fromGrid(b));
    return pa.dot(pa).equals(m.mul(pb.dot(pb)));
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. Common tangents
// ---------------------------------------------------------------------------------------------------------------------

export interface CommonTangent {
    readonly kind: 'external' | 'internal';
    /** Exact for a tangent at an exact point of contact, otherwise an inexact unit-normal line. */
    readonly line: Line | InexactLine;
    readonly exact: boolean;
    /** The points of contact on the first and the second circle. */
    readonly contacts: readonly [InexactXY, InexactXY];
}

export type CommonTangentsResult =
    /** Equal circles: infinitely many common tangents, none are listed. */
    | { readonly status: 'coincident' }
    | {
    readonly status: 'ok';
    readonly count: 0 | 1 | 2 | 3 | 4;
    /** `(r1 O2 - r2 O1) / (r1 - r2)`, `null` for equal radii (the external tangents are then parallel). */
    readonly externalCentre: RationalPoint | null;
    /** `(r2 O1 + r1 O2) / (r1 + r2)`. */
    readonly internalCentre: RationalPoint;
    readonly tangents: readonly CommonTangent[];
};

function assertRadiusCircle(circle: RadiusCircle, name: string): void {
    assertKernelCircle(circle, name);
    if (circle.radius.sign() <= 0 || circle.radius.mul(Rational.of(4)).den !== 1n || !circle.radius.mul(circle.radius).equals(circle.r2)) {
        throw new RangeError(`${name} needs a radius that is a multiple of 1/4 with r2 = radius^2`);
    }
}

function double(p: RationalPoint): { x: number; y: number } {
    return {x: p.x.toNumber(), y: p.y.toNumber()};
}

function contact(x: number, y: number): InexactXY {
    return {x, y, inexact: true};
}

/** The tangents from a centre of similarity to the first circle, with their contacts on the second by the dilation. */
function homothetyTangents(
    kind: 'external' | 'internal',
    centre: RationalPoint,
    ratio: number,
    c1: RadiusCircle,
): CommonTangent[] {
    const t = tangentsFromRational(centre, c1);
    if (t.status !== 'outside') throw new Error('a centre of similarity of separated or crossing circles is outside');
    const o = double(c1.centre);
    const s = double(centre);
    const r = c1.radius.toNumber();
    return t.contacts.map((t1) => {
        let nx = (t1.x - o.x) / r;
        let ny = (t1.y - o.y) / r;
        const len = Math.hypot(nx, ny);
        nx /= len;
        ny /= len;
        const line: InexactLine = {a: nx, b: ny, c: nx * o.x + ny * o.y + r, inexact: true};
        const t2 = contact(s.x + ratio * (t1.x - s.x), s.y + ratio * (t1.y - s.y));
        return {kind, line, exact: false, contacts: [t1, t2] as const};
    });
}

/** The two external tangents of equal circles: parallel to the line of centres at distance `r`. */
function parallelTangents(c1: RadiusCircle, c2: RadiusCircle): CommonTangent[] {
    const o1 = double(c1.centre);
    const o2 = double(c2.centre);
    const d = Math.hypot(o2.x - o1.x, o2.y - o1.y);
    const px = -(o2.y - o1.y) / d;
    const py = (o2.x - o1.x) / d;
    const r = c1.radius.toNumber();
    return [1, -1].map((s) => {
        const nx = s * px;
        const ny = s * py;
        const line: InexactLine = {a: nx, b: ny, c: nx * o1.x + ny * o1.y + r, inexact: true};
        return {
            kind: 'external' as const,
            line,
            exact: false,
            contacts: [contact(o1.x + r * nx, o1.y + r * ny), contact(o2.x + r * nx, o2.y + r * ny)] as const,
        };
    });
}

/** The tangent perpendicular to the line of centres through the exact point of contact of touching circles. */
function contactTangent(kind: 'external' | 'internal', c1: Circle, c2: Circle, at: RationalPoint): CommonTangent {
    const e = c2.centre.sub(c1.centre);
    const p = double(at);
    return {kind, line: line(e.x, e.y, e.dot(at)), exact: true, contacts: [contact(p.x, p.y), contact(p.x, p.y)]};
}

/**
 * The common tangents of two circles with grid centres and radii that are multiples of 1/4. The count is decided by
 * `intersectCircles` and the sign of `k = d^2 - r1^2 - r2^2`: two intersections give 2; tangency gives 3 (external
 * contact, `k > 0`) or 1 (internal contact, `k < 0`); an internally tangent pair labels its single tangent `external`
 * (its contact point is the external centre of similarity); no intersection gives 4 (separated) or 0 (nested, concentric).
 */
export function commonTangents(c1: RadiusCircle, c2: RadiusCircle): CommonTangentsResult {
    assertRadiusCircle(c1, 'first circle');
    assertRadiusCircle(c2, 'second circle');
    const inter = intersectCircles(c1, c2);
    if (inter.kind === 'coincident') return {status: 'coincident'};
    const e = c2.centre.sub(c1.centre);
    const k = e.dot(e).sub(c1.r2).sub(c2.r2);
    const r1 = c1.radius;
    const r2 = c2.radius;
    const equalRadii = r1.equals(r2);
    const internalCentre = c1.centre.scale(r2).add(c2.centre.scale(r1)).scale(ONE.div(r1.add(r2)));
    const externalCentre = equalRadii
        ? null
        : c2.centre.scale(r1).sub(c1.centre.scale(r2)).scale(ONE.div(r1.sub(r2)));
    const ratio = r2.div(r1).toNumber();
    const tangents: CommonTangent[] = [];
    const external = (): CommonTangent[] =>
        externalCentre === null ? parallelTangents(c1, c2) : homothetyTangents('external', externalCentre, ratio, c1);
    const internal = (): CommonTangent[] => homothetyTangents('internal', internalCentre, -ratio, c1);
    if (inter.kind === 'two') {
        tangents.push(...external());
    } else if (inter.kind === 'tangent') {
        if (k.sign() > 0) {
            tangents.push(...external(), contactTangent('internal', c1, c2, inter.exact));
        } else {
            tangents.push(contactTangent('external', c1, c2, inter.exact));
        }
    } else if (k.sign() > 0) {
        tangents.push(...external(), ...internal());
    }
    return {
        status: 'ok',
        count: tangents.length as 0 | 1 | 2 | 3 | 4,
        externalCentre,
        internalCentre,
        tangents,
    };
}
