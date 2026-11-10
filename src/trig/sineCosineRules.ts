/**
 * TR3 (sine rule via the circumcircle) and TR4 (cosine rule) helpers on integer-grid triangles. Discrete decisions are exact
 * (`Rational`, `bigint`): the antipode, the Thales dot product, the squared sides, the dot product and its sign. Side
 * lengths, angles and ratios are doubles. Collinear or coincident vertices give `degenerate` and no numbers.
 * Sides: `a = |BC|`, `b = |CA|`, `c = |AB|`; the angle at a vertex is measured with `angleBetween` (atan2).
 */
import {angleBetween, circumcircle, thalesDot} from '../compgeo/circle';
import {assertGridPoint, type GridPoint} from '../compgeo/grid';
import {Rational, RationalPoint} from '../compgeo/rational';
import {classifyTriangle, type Degenerate, type TriangleShape} from '../compgeo/triangle';

const DEGENERATE: Degenerate = Object.freeze({kind: 'degenerate'});

export interface SineRule {
    readonly kind: 'proper';
    readonly sides: { readonly a: number; readonly b: number; readonly c: number };
    /** Radians, from `angleBetween`. */
    readonly angles: { readonly A: number; readonly B: number; readonly C: number };
    /** Exact squared circumradius. */
    readonly r2: Rational;
    readonly circumcentre: RationalPoint;
    /** Computed `2R`. */
    readonly twoR: number;
    /** Computed `a / sin A`, `b / sin B`, `c / sin C`. */
    readonly ratios: readonly [number, number, number];
    /** Exact antipode `A' = 2 O - B` of `B` on the circumcircle. */
    readonly antipode: RationalPoint;
    /** Exact `(B - C) . (A' - C)`; zero for every grid triangle (Thales). */
    readonly thalesAtC: Rational;
    /** Exact test `(B - A) . (C - A) = 0`; then `A' = C` and `a` is the diameter. */
    readonly rightAtA: boolean;
}

function xy(p: GridPoint): { x: number; y: number } {
    return {x: p.x, y: p.y};
}

const dist = (p: GridPoint, q: GridPoint) => Math.hypot(p.x - q.x, p.y - q.y);

export function sineRule(A: GridPoint, B: GridPoint, C: GridPoint): Degenerate | SineRule {
    assertGridPoint(A, 'A');
    assertGridPoint(B, 'B');
    assertGridPoint(C, 'C');
    const circle = circumcircle(A, B, C);
    if (circle.kind !== 'circle') return DEGENERATE;
    const [a, b, c] = [dist(B, C), dist(C, A), dist(A, B)];
    const angleA = angleBetween(xy(A), xy(B), xy(C));
    const angleB = angleBetween(xy(B), xy(C), xy(A));
    const angleC = angleBetween(xy(C), xy(A), xy(B));
    // A proper (non-collinear) triangle has no zero arm, so none is undefined; guard instead of casting.
    if (angleA === undefined || angleB === undefined || angleC === undefined) return DEGENERATE;
    const angles = {A: angleA, B: angleB, C: angleC};
    const rb = RationalPoint.fromGrid(B);
    const rc = RationalPoint.fromGrid(C);
    const antipode = circle.centre.scale(Rational.of(2)).sub(rb);
    return {
        kind: 'proper',
        sides: {a, b, c},
        angles,
        r2: circle.r2,
        circumcentre: circle.centre,
        twoR: 2 * Math.sqrt(circle.r2.toNumber()),
        ratios: [a / Math.sin(angles.A), b / Math.sin(angles.B), c / Math.sin(angles.C)],
        antipode,
        thalesAtC: thalesDot(rc, rb, antipode),
        rightAtA: thalesDot(RationalPoint.fromGrid(A), rb, rc).isZero(),
    };
}

/**
 * Angle at the antipode in the triangle `B A' C` (equals `A`, or `pi - A` when `A'` lies on the other arc), or `undefined`
 * when `A' = C` (right angle at `A`: no auxiliary triangle).
 */
export function angleAtAntipode(rule: SineRule, C: GridPoint, B: GridPoint): number | undefined {
    return angleBetween({x: rule.antipode.x.toNumber(), y: rule.antipode.y.toNumber()}, xy(B), xy(C));
}

export interface CosineRule {
    readonly kind: 'proper';
    /** Exact squared sides. */
    readonly a2: bigint;
    readonly b2: bigint;
    readonly c2: bigint;
    /** Exact `CA . CB`. */
    readonly dot: bigint;
    /** `a^2 + b^2 - 2 CA.CB`; equals `c2` exactly. */
    readonly rhs: bigint;
    /** The correction `2 CA.CB = 2ab cos C`. */
    readonly correction: bigint;
    /** Sign of the integer dot product: acute, right or obtuse at C. */
    readonly shapeAtC: TriangleShape;
    /** Whole-triangle classification from `classifyTriangle`. */
    readonly triangleShape: TriangleShape;
    /** Computed `cos C = CA.CB / (ab)`. */
    readonly cosC: number;
}

export function cosineRule(A: GridPoint, B: GridPoint, C: GridPoint): Degenerate | CosineRule {
    assertGridPoint(A, 'A');
    assertGridPoint(B, 'B');
    assertGridPoint(C, 'C');
    const cls = classifyTriangle(A, B, C);
    if (cls.kind !== 'proper') return DEGENERATE;
    const [cax, cay, cbx, cby] = [BigInt(A.x - C.x), BigInt(A.y - C.y), BigInt(B.x - C.x), BigInt(B.y - C.y)];
    const [abx, aby] = [BigInt(B.x - A.x), BigInt(B.y - A.y)];
    const a2 = cbx * cbx + cby * cby;
    const b2 = cax * cax + cay * cay;
    const c2 = abx * abx + aby * aby;
    const dot = cax * cbx + cay * cby;
    const shapeAtC: TriangleShape = dot > 0n ? 'acute' : dot === 0n ? 'right' : 'obtuse';
    return {
        kind: 'proper',
        a2, b2, c2, dot,
        rhs: a2 + b2 - 2n * dot,
        correction: 2n * dot,
        shapeAtC,
        triangleShape: cls.shape,
        cosC: Number(dot) / Math.sqrt(Number(a2) * Number(b2)),
    };
}
