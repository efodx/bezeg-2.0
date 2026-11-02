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
import {BoardXY, toBoard} from './notablePointsModel';

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
export function activeEulerExampleId(id: EulerExampleId | undefined, points: readonly GridPoint[]): EulerExampleId | undefined {
    if (id === undefined) return undefined;
    const example = eulerExample(id);
    return points.length === 3 && example.points.every((p, i) => p.x === points[i].x && p.y === points[i].y) ? id : undefined;
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

/** Analyses the first three points; fewer give `missing`. Throws RangeError only for points outside the grid range. */
export function analyseEulerLine(points: readonly GridPoint[]): EulerAnalysis {
    if (points.length < 3) return {kind: 'missing', have: points.length};
    const [a, b, c] = points as readonly [GridPoint, GridPoint, GridPoint];
    const vertices = [a, b, c] as const;
    if (orientValue(a, b, c) === 0) return {kind: 'degenerate', vertices};
    const o = circumcentre(a, b, c);
    const h = orthocentre(a, b, c);
    const nine = ninePoints(a, b, c);
    const bigR = circumradius(a, b, c);
    if (o.kind !== 'point' || h.kind !== 'point' || nine.kind !== 'points' || bigR.kind !== 'value') {
        throw new Error('a proper triangle must have all centres');
    }
    const g = centroid(a, b, c).point;
    const hg2 = squaredLength(g, h.point);
    const go2 = squaredLength(o.point, g);
    const kinds: readonly NinePointKind[] = ['midpoint', 'foot', 'vertexMidpoint'];
    return {
        kind: 'triangle', vertices, h: view(h.point), g: view(g), o: view(o.point), n: view(nine.circle.centre),
        r2Quarter: nine.circle.r2, nine,
        ninePoints: nine.all.map((p, i) => ({...view(p), kind: kinds[Math.floor(i / 3)], index: i % 3})),
        line: eulerLineFromCentres(g, o.point, h.point),
        collinear: g.sub(o.point).cross(h.point.sub(o.point)).isZero(),
        ratioHolds: hg2.equals(Rational.of(4).mul(go2)),
        hg: Math.sqrt(hg2.toNumber()), go: Math.sqrt(go2.toNumber()), ho: Math.sqrt(squaredLength(o.point, h.point).toNumber()),
        circumradius: bigR.value, halfCircumradius: bigR.value / 2,
    };
}
