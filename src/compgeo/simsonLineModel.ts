/**
 * Model of the Simson line graph (spec triangle-geometry-lessons T4; task triangle-geometry/07 F2a; ADR 0030 section 2).
 * Pure TypeScript: it turns three grid vertices and a point P into the numbers and the board geometry the graph shows,
 * using only the Simson kernel (`simson.ts`) and the circle kernel (`circle.ts`). No NaN or infinity leaves this file: a
 * collinear or coincident triple gives `degenerate`, a missing vertex gives `missing`, and a coordinate beyond
 * `BOARD_COORDINATE_CAP` is `board: undefined`.
 *
 * Two modes. `exact`: P' is a grid point; "on the circumcircle" is the exact `powerOfPoint(P') = 0` and collinearity of
 * the feet is the exact `pedalOrient = 0`; the power, the feet and the foot-triangle area divided by S stay `Rational`.
 * `glider`: P lies at `R (1 + epsilon)` from O at the angle `t` (degrees here, radians in the kernel); the feet are doubles
 * and collinearity is `pedalAreaInexact(...).collinear`, a tolerance (`SIMSON_GLIDER_TOLERANCE`) and never an equality.
 */
import {GridPoint, isGridPoint} from './grid';
import {orientValue} from './predicates';
import {Rational, RationalPoint} from './rational';
import {circumcircle, powerOfPoint} from './circle';
import {feet, gliderPoint, pedalAreaInexact, pedalOrient} from './simson';
import {BOARD_COORDINATE_CAP, BoardXY, toBoard} from './notablePointsModel';
import {normaliseDegrees} from './inscribedAngleModel';

export type SimsonMode = 'glider' | 'exact';
export type SimsonExampleId = 'default' | 'grid-on-circle' | 'grid-off-circle' | 'vertex';

/** The discrete offsets of the glider from the circle, relative to R (spec T4 acceptance 3). */
export const SIMSON_OFFSETS = [-0.2, -0.05, -0.01, -0.001, 0, 0.001, 0.01, 0.05, 0.2] as const;
export type SimsonOffset = typeof SIMSON_OFFSETS[number];

export function isSimsonOffset(value: unknown): value is SimsonOffset {
    return typeof value === 'number' && (SIMSON_OFFSETS as readonly number[]).includes(value);
}

export function isSimsonMode(value: unknown): value is SimsonMode {
    return value === 'glider' || value === 'exact';
}

/** The inputs besides the vertices: `t` in degrees, the offset index into `SIMSON_OFFSETS` by value, and the exact point. */
export interface SimsonSettings {
    readonly mode: SimsonMode;
    readonly t: number;
    readonly epsilon: number;
    readonly pPrime: GridPoint;
}

export type Triple = readonly [GridPoint, GridPoint, GridPoint];

export interface SimsonExample extends SimsonSettings {
    readonly id: SimsonExampleId;
    readonly points: Triple;
}

const T1: Triple = [{x: 0, y: 0}, {x: 7, y: 0}, {x: 2, y: 5}];

/** The checked examples of spec T4: the T1 triangle with a glider, a lattice point on the circle, one off it, and a vertex. */
export const SIMSON_EXAMPLES: readonly SimsonExample[] = [
    {id: 'default', points: T1, mode: 'glider', t: 60, epsilon: 0, pPrime: {x: 2, y: -2}},
    {id: 'grid-on-circle', points: T1, mode: 'exact', t: 60, epsilon: 0, pPrime: {x: 2, y: -2}},
    {id: 'grid-off-circle', points: T1, mode: 'exact', t: 60, epsilon: 0, pPrime: {x: 6, y: 4}},
    {id: 'vertex', points: T1, mode: 'exact', t: 60, epsilon: 0, pPrime: {x: 7, y: 0}},
];

export function isSimsonExampleId(value: unknown): value is SimsonExampleId {
    return SIMSON_EXAMPLES.some(example => example.id === value);
}

export function simsonExample(id: SimsonExampleId): SimsonExample {
    const found = SIMSON_EXAMPLES.find(example => example.id === id);
    if (!found) throw new RangeError(`unknown example "${id}"`);
    return found;
}

export const DEFAULT_SIMSON_SETTINGS: SimsonSettings = {mode: 'glider', t: 60, epsilon: 0, pPrime: {x: 2, y: -2}};

/**
 * The stored example id if the vertices, the mode and (in exact mode) P' are still exactly that example's; otherwise
 * undefined (a custom scene). The glider's t and offset are the continuous controls and do not leave the example.
 */
export function activeSimsonExampleId(id: SimsonExampleId | undefined, points: readonly GridPoint[], settings: SimsonSettings): SimsonExampleId | undefined {
    if (id === undefined) return undefined;
    const example = simsonExample(id);
    const same = points.length === 3 && example.points.every((p, i) => p.x === points[i].x && p.y === points[i].y);
    if (!same || example.mode !== settings.mode) return undefined;
    if (example.mode === 'exact' && (example.pPrime.x !== settings.pPrime.x || example.pPrime.y !== settings.pPrime.y)) return undefined;
    return id;
}

/** The status of the feet. `collinear-within` is glider mode at offset 0: P is on the circle by construction, so the residue of at most
 * `SIMSON_GLIDER_TOLERANCE` is rounding and learners read plain "collinear" with area 0 (owner decision 2026-11-02, spec T4 acceptance 2);
 * only `collinear-exact` says exact. */
export type SimsonStatus = 'collinear-exact' | 'collinear-within' | 'not-collinear' | 'coincident';

export const FOOT_NAMES = ['D', 'E', 'F'] as const;

/** A foot: its double coordinates (finite), the exact rational in exact mode, and its board place (undefined beyond the cap). */
export interface FootView {
    readonly name: typeof FOOT_NAMES[number];
    readonly x: number;
    readonly y: number;
    readonly exact: RationalPoint | undefined;
    readonly board: BoardXY | undefined;
}

export interface SimsonPointView {
    readonly x: number;
    readonly y: number;
    readonly exact: RationalPoint | undefined;
    readonly board: BoardXY | undefined;
}

export interface SimsonExactReadout {
    /** `powerOfPoint(P')`: negative inside, zero on the circle. */
    readonly power: Rational;
    readonly onCircle: boolean;
    /** `pedalOrient`: twice the signed area of the foot triangle. */
    readonly orient: Rational;
    /** Foot-triangle area divided by S, exact: |pedalOrient| / |orient(A, B, C)|. */
    readonly areaRatio: Rational;
    readonly distinctCount: number;
}

export interface SimsonGliderReadout {
    readonly epsilon: number;
    /** Foot-triangle area divided by S (doubles). */
    readonly relative: number;
    readonly area: number;
}

export type SimsonAnalysis =
    | {readonly kind: 'missing'; readonly have: number}
    | {readonly kind: 'degenerate'; readonly vertices: Triple}
    | {
        readonly kind: 'triangle';
        readonly mode: SimsonMode;
        readonly vertices: Triple;
        /** The circumcentre O, exact. */
        readonly centre: RationalPoint;
        readonly centreBoard: BoardXY | undefined;
        /** R^2, exact; `radius` is its square root in doubles. */
        readonly r2: Rational;
        readonly radius: number;
        /** The glider P (glider mode) or the grid point P' (exact mode). */
        readonly p: SimsonPointView;
        readonly feet: readonly [FootView, FootView, FootView];
        readonly collinear: boolean;
        readonly status: SimsonStatus;
        /** The two distinct feet farthest apart, whose line is the Simson line; undefined if no such pair. */
        readonly linePair: readonly [number, number] | undefined;
        /** The line through `linePair` as board points; undefined if there is no pair or a foot is beyond the cap. */
        readonly line: {readonly from: BoardXY; readonly to: BoardXY} | undefined;
        readonly exact: SimsonExactReadout | undefined;
        readonly glider: SimsonGliderReadout | undefined;
    };

type Triangle = Extract<SimsonAnalysis, {kind: 'triangle'}>;

/** A finite pair within the cap as board doubles, or undefined. */
export function boardOf(x: number, y: number): BoardXY | undefined {
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= BOARD_COORDINATE_CAP && Math.abs(y) <= BOARD_COORDINATE_CAP ? {x, y} : undefined;
}

function abs(value: Rational): Rational {
    return value.sign() < 0 ? value.neg() : value;
}

/** Foot of the perpendicular from `p` to the line `uv`, in doubles (the kernel's own version is not exported). */
function footDouble(p: {x: number; y: number}, u: GridPoint, v: GridPoint): {x: number; y: number} {
    const dx = v.x - u.x;
    const dy = v.y - u.y;
    const k = ((p.x - u.x) * dx + (p.y - u.y) * dy) / (dx * dx + dy * dy);
    return {x: u.x + k * dx, y: u.y + k * dy};
}

function footView(index: 0 | 1 | 2, x: number, y: number, exact: RationalPoint | undefined): FootView {
    return {name: FOOT_NAMES[index], x, y, exact, board: boardOf(x, y)};
}

/** The pair of feet farthest apart (in doubles), skipping equal feet; undefined if all coincide. */
function farthestPair(feetViews: readonly FootView[]): readonly [number, number] | undefined {
    let best: readonly [number, number] | undefined;
    let bestDistance = 0;
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]] as const) {
        const distance = Math.hypot(feetViews[i].x - feetViews[j].x, feetViews[i].y - feetViews[j].y);
        if (distance > bestDistance) { best = [i, j]; bestDistance = distance; }
    }
    return best;
}

/** The offset in effect: a stored value outside `SIMSON_OFFSETS` reads as 0. */
export function resolveOffset(epsilon: number): SimsonOffset {
    return isSimsonOffset(epsilon) ? epsilon : 0;
}

/**
 * Analyses the first three points with the settings; fewer points give `missing`. Throws RangeError only for vertices outside the
 * grid range. A P' that is not a grid point is replaced by the default one (the Preset collection rejects it before).
 */
export function analyseSimson(points: readonly GridPoint[], settings: SimsonSettings): SimsonAnalysis {
    if (points.length < 3) return {kind: 'missing', have: points.length};
    const [a, b, c] = points as Triple;
    const vertices = [a, b, c] as const;
    const orientation = orientValue(a, b, c);
    if (orientation === 0) return {kind: 'degenerate', vertices};
    const circle = circumcircle(a, b, c);
    if (circle.kind !== 'circle') throw new Error('a proper triangle must have a circumcircle');
    const common = {
        kind: 'triangle' as const, mode: settings.mode, vertices, centre: circle.centre, centreBoard: toBoard(circle.centre),
        r2: circle.r2, radius: Math.sqrt(circle.r2.toNumber()),
    };
    const finish = (p: SimsonPointView, feetViews: readonly [FootView, FootView, FootView], collinear: boolean, status: SimsonStatus,
                    exact: SimsonExactReadout | undefined, glider: SimsonGliderReadout | undefined): Triangle => {
        const linePair = collinear ? farthestPair(feetViews) : undefined;
        const from = linePair ? feetViews[linePair[0]].board : undefined;
        const to = linePair ? feetViews[linePair[1]].board : undefined;
        return {...common, p, feet: feetViews, collinear, status, linePair, line: from && to ? {from, to} : undefined, exact, glider};
    };
    if (settings.mode === 'exact') {
        const pPrime = isGridPoint(settings.pPrime) ? settings.pPrime : DEFAULT_SIMSON_SETTINGS.pPrime;
        const exactP = RationalPoint.fromGrid(pPrime);
        const found = feet(exactP, a, b, c);
        const orient = pedalOrient(exactP, a, b, c);
        if (found.kind !== 'feet' || orient.kind !== 'value') throw new Error('a proper triangle must have feet');
        const power = powerOfPoint(exactP, circle);
        const views = found.feet.map((f, i) => footView(i as 0 | 1 | 2, f.x.toNumber(), f.y.toNumber(), f)) as unknown as readonly [FootView, FootView, FootView];
        const collinear = orient.value.isZero();
        const status: SimsonStatus = found.coincident.length > 0 ? 'coincident' : collinear ? 'collinear-exact' : 'not-collinear';
        return finish(
            {x: pPrime.x, y: pPrime.y, exact: exactP, board: boardOf(pPrime.x, pPrime.y)}, views, collinear, status,
            {
                power, onCircle: power.isZero(), orient: orient.value,
                areaRatio: abs(orient.value).div(Rational.fromInt(Math.abs(orientation))), distinctCount: found.distinctCount,
            },
            undefined,
        );
    }
    const epsilon = resolveOffset(settings.epsilon);
    const glider = gliderPoint(a, b, c, normaliseDegrees(settings.t) * Math.PI / 180, epsilon);
    if (glider.kind !== 'point') throw new Error('a proper triangle must have a glider');
    const area = pedalAreaInexact(glider, a, b, c);
    if (area.kind !== 'area') throw new Error('a proper triangle must have a pedal area');
    const doubles = [footDouble(glider, b, c), footDouble(glider, c, a), footDouble(glider, a, b)];
    const views = doubles.map((f, i) => footView(i as 0 | 1 | 2, f.x, f.y, undefined)) as unknown as readonly [FootView, FootView, FootView];
    return finish(
        {x: glider.x, y: glider.y, exact: undefined, board: boardOf(glider.x, glider.y)}, views, area.collinear,
        area.collinear ? 'collinear-within' : 'not-collinear', undefined, {epsilon, relative: area.relative, area: area.area},
    );
}

/** The glider parameter in degrees, [0, 360), from a board position about O; undefined for a degenerate triangle or a non-finite position. */
export function simsonTFromBoard(points: readonly GridPoint[], x: number, y: number): number | undefined {
    if (points.length < 3 || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    const circle = circumcircle(points[0], points[1], points[2]);
    if (circle.kind !== 'circle') return undefined;
    const degrees = Math.atan2(y - circle.centre.y.toNumber(), x - circle.centre.x.toNumber()) * 180 / Math.PI;
    return normaliseDegrees(degrees);
}

/** `t` plus a signed step in degrees, normalised to [0, 360). */
export function stepSimsonT(t: number, deltaDeg: number): number {
    return normaliseDegrees(t + deltaDeg);
}
