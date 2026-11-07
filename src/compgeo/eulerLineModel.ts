/**
 * Model of the Euler line and nine-point circle graph (spec triangle-geometry-lessons T3; task triangle-geometry/06).
 * Pure TypeScript: it turns three grid vertices into the exact numbers and the board geometry the graph shows, using only
 * the triangle kernel (`triangle.ts`). No NaN or infinity leaves this file: a collinear or coincident triple gives
 * `degenerate`, a missing vertex gives `missing`, and a coordinate beyond `BOARD_COORDINATE_CAP` is `board: undefined`.
 *
 * H, G, O, N (nine-point centre) and R^2/4 are `Rational`. The two decisions of the theorem, "O, G, H are collinear" and
 * "HG = 2 GO", are made exactly (orientation sign and squared lengths as rationals); the distances are doubles for display.
 */
import {GridPoint} from './grid';
import {orientValue} from './predicates';
import {Rational, RationalPoint} from './rational';
import {centroid, circumcentre, circumradius, EulerLine, eulerLineFromCentres, NinePoints, ninePoints, orthocentre} from './triangle';
import {BoardXY, scaleRational, scaleRationalPoint, toBoard} from './notablePointsModel';

export type EulerExampleId = 'default' | 'right' | 'isosceles' | 'near-equilateral' | 'degenerate';

export interface EulerExample {
    readonly id: EulerExampleId;
    readonly points: readonly [GridPoint, GridPoint, GridPoint];
}

/** The checked examples of spec T3 (default scalene acute, right, isosceles, near-equilateral, collinear). */
export const EULER_EXAMPLES: readonly EulerExample[] = [
    {id: 'default', points: [{x: 0, y: 0}, {x: 7, y: 0}, {x: 2, y: 5}]},
    {id: 'right', points: [{x: 0, y: 0}, {x: 4, y: 0}, {x: 0, y: 3}]},
    {id: 'isosceles', points: [{x: 0, y: 0}, {x: 6, y: 0}, {x: 3, y: 5}]},
    {id: 'near-equilateral', points: [{x: 0, y: 0}, {x: 8, y: 0}, {x: 4, y: 7}]},
    {id: 'degenerate', points: [{x: 0, y: 0}, {x: 1, y: 1}, {x: 3, y: 3}]},
];

export function isEulerExampleId(value: unknown): value is EulerExampleId {
    return EULER_EXAMPLES.some(example => example.id === value);
}

export function eulerExample(id: EulerExampleId): EulerExample {
    const found = EULER_EXAMPLES.find(example => example.id === id);
    if (!found) throw new RangeError(`unknown example "${id}"`);
    return found;
}

/** The stored example id if the vertices are still exactly that example's; otherwise undefined (a custom triangle). */
export function activeEulerExampleId(id: EulerExampleId | undefined, points: readonly GridPoint[], exponent = 0): EulerExampleId | undefined {
    if (id === undefined) return undefined;
    const example = eulerExample(id);
    const scale = 2 ** exponent;
    // The example is named in board units; the vertices are grid points, one step being 2^exponent board units.
    return points.length === 3 && example.points.every((p, i) => p.x === points[i].x * scale && p.y === points[i].y * scale) ? id : undefined;
}

/** An exact point with its board coordinates (undefined beyond the cap). */
export interface EulerPointView {
    readonly point: RationalPoint;
    readonly board: BoardXY | undefined;
}

export type NinePointKind = 'midpoint' | 'foot' | 'vertexMidpoint';

export interface NinePointView extends EulerPointView {
    readonly kind: NinePointKind;
    /** 0..2 within its kind (the side or vertex it belongs to). */
    readonly index: number;
}

export type EulerAnalysis =
    | {readonly kind: 'missing'; readonly have: number}
    | {readonly kind: 'degenerate'; readonly vertices: readonly [GridPoint, GridPoint, GridPoint]}
    | {
        readonly kind: 'triangle';
        readonly vertices: readonly [GridPoint, GridPoint, GridPoint];
        readonly h: EulerPointView;
        readonly g: EulerPointView;
        readonly o: EulerPointView;
        /** Nine-point centre, the midpoint of OH. */
        readonly n: EulerPointView;
        /** R^2 / 4, the squared radius of the nine-point circle. */
        readonly r2Quarter: Rational;
        readonly nine: NinePoints;
        readonly ninePoints: readonly NinePointView[];
        /** The line through O, G, H; undefined exactly when H = O (equilateral). */
        readonly line: EulerLine | undefined;
        /** Exact: orient(O, G, H) = 0. */
        readonly collinear: boolean;
        /** Exact: HG^2 = 4 GO^2. */
        readonly ratioHolds: boolean;
        /** Doubles, finite. */
        readonly hg: number;
        readonly go: number;
        readonly ho: number;
        readonly circumradius: number;
        /** R / 2, the nine-point radius. */
        readonly halfCircumradius: number;
    };

function view(point: RationalPoint): EulerPointView {
    return {point, board: toBoard(point)};
}

function squaredLength(from: RationalPoint, to: RationalPoint): Rational {
    const d = to.sub(from);
    return d.dot(d);
}

/** Analyses the first three grid points; fewer give `missing`. Results are board units (grid step 2^exponent). Throws RangeError only for points outside the grid range. */
export function analyseEulerLine(points: readonly GridPoint[], exponent = 0): EulerAnalysis {
    if (points.length < 3) return {kind: 'missing', have: points.length};
    const [a, b, c] = points as readonly [GridPoint, GridPoint, GridPoint];
    const s = 2 ** exponent;
    const vertex = (p: GridPoint): GridPoint => (exponent === 0 ? p : {x: p.x * s, y: p.y * s});
    const vertices = [vertex(a), vertex(b), vertex(c)] as const;
    if (orientValue(a, b, c) === 0) return {kind: 'degenerate', vertices};
    const o = circumcentre(a, b, c);
    const h = orthocentre(a, b, c);
    const nine = ninePoints(a, b, c);
    const bigR = circumradius(a, b, c);
    if (o.kind !== 'point' || h.kind !== 'point' || nine.kind !== 'points' || bigR.kind !== 'value') {
        throw new Error('a proper triangle must have all centres');
    }
    const g = centroid(a, b, c).point;
    // The decisions are made exactly on the grid; scaling by a power of two changes none of them.
    const hg2 = squaredLength(g, h.point);
    const go2 = squaredLength(o.point, g);
    const collinear = g.sub(o.point).cross(h.point.sub(o.point)).isZero();
    const ratioHolds = hg2.equals(Rational.of(4).mul(go2));
    const hoLength = Math.sqrt(squaredLength(o.point, h.point).toNumber());
    const sc = (p: RationalPoint) => scaleRationalPoint(p, exponent);
    const gs = sc(g), os = sc(o.point), hs = sc(h.point);
    const kinds: readonly NinePointKind[] = ['midpoint', 'foot', 'vertexMidpoint'];
    const scaledNine: NinePoints = exponent === 0 ? nine : {
        ...nine,
        midpoints: [sc(nine.midpoints[0]), sc(nine.midpoints[1]), sc(nine.midpoints[2])],
        feet: [sc(nine.feet[0]), sc(nine.feet[1]), sc(nine.feet[2])],
        vertexMidpoints: [sc(nine.vertexMidpoints[0]), sc(nine.vertexMidpoints[1]), sc(nine.vertexMidpoints[2])],
        all: nine.all.map(sc),
        circle: {centre: sc(nine.circle.centre), r2: scaleRational(nine.circle.r2, 2 * exponent)},
    };
    return {
        kind: 'triangle', vertices, h: view(hs), g: view(gs), o: view(os), n: view(scaledNine.circle.centre),
        r2Quarter: scaledNine.circle.r2, nine: scaledNine,
        ninePoints: scaledNine.all.map((p, i) => ({...view(p), kind: kinds[Math.floor(i / 3)], index: i % 3})),
        line: eulerLineFromCentres(gs, os, hs),
        collinear,
        ratioHolds,
        hg: Math.sqrt(hg2.toNumber()) * s, go: Math.sqrt(go2.toNumber()) * s, ho: hoLength * s,
        circumradius: bigR.value * s, halfCircumradius: bigR.value * s / 2,
    };
}
