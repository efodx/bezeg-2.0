import {message} from "../../localization";
import {isRecord} from "../base/presets/PresetCollection";
import {Conic, ConicType, conicFromFivePoints, FivePointStatus} from "../../projective/conic";
import {collinear, equal, hom, Hom} from "../../projective/homogeneous";
import {rationalArc, RationalArcResult} from "../../projective/rationalArc";
import {deCasteljauInPlace} from "../../bezeg/impl/kernels/bezier-kernels";
import {accept, checkGridPoint, ProjectiveCheck, ProjectiveGridPoint, refuse} from "./projectiveValidation";

/**
 * The state of the five-point graph (K4, spec projective-conics-lessons, ADR 0033). The five points are finite points stored as integer
 * numerators over the fixed denominator 15; a drag or an arrow key moves a point on the 1/5 grid (numerators that are multiples of 3),
 * while the named examples load their exact points (some lie on the 1/15 grid, e.g. 32/15). The arc ends `a`, `b` and the weight point
 * `t` are indices into the five points. Everything discrete is decided in bigint by the projective kernels; doubles appear only in
 * the drawing views and in the sampled deviation check.
 */
export const FIVE_POINT_DENOMINATOR = 15;
/** One grid step of 1/5, in numerators. */
export const FIVE_POINT_STEP = 3;
/** |numerator| <= 150 is a coordinate within +-10, inside the view box. */
export const FIVE_POINT_NUMERATOR_LIMIT = 150;
export const FIVE_POINT_COUNT = 5;
/** Names of the five points on the board, in the inspector and in the status text (both languages). */
export const FIVE_POINT_NAMES = ["A", "B", "C", "D", "E"] as const;
export const FIVE_POINT_EXAMPLE_IDS = ["ellipse", "hyperbola", "parabola", "three-collinear", "four-collinear", "custom"] as const;
export type FivePointExampleId = typeof FIVE_POINT_EXAMPLE_IDS[number];
/** Samples of the deviation check (spec K4 acceptance 3). */
export const DEVIATION_SAMPLES = 200;

export interface FivePointModel {
    readonly example: FivePointExampleId;
    readonly points: readonly ProjectiveGridPoint[];
    /** The arc ends (distinct indices into `points`). */
    readonly a: number;
    readonly b: number;
    /** The third conic point that fixes the weight (distinct from both ends). */
    readonly t: number;
}

const pts = (...numerators: readonly (readonly [number, number])[]): ProjectiveGridPoint[] => numerators.map(([x, y]) => ({x, y}));

/** Coordinates times 15, so (4, 9/5) is (60, 27). */
export const FIVE_POINT_EXAMPLES: Readonly<Record<FivePointExampleId, FivePointModel>> = {
    ellipse: {example: "ellipse", a: 0, b: 1, t: 3, points: pts([75, 0], [0, 45], [-75, 0], [60, 27], [-45, 36])},
    hyperbola: {example: "hyperbola", a: 0, b: 1, t: 2, points: pts([45, 0], [75, 80], [51, 32], [-45, 0], [75, -80])},
    parabola: {example: "parabola", a: 0, b: 1, t: 2, points: pts([0, 0], [60, 60], [15, 30], [15, -30], [60, -60])},
    "three-collinear": {example: "three-collinear", a: 0, b: 1, t: 2, points: pts([0, 0], [15, 15], [30, 30], [45, 0], [0, 60])},
    "four-collinear": {example: "four-collinear", a: 0, b: 1, t: 2, points: pts([0, 0], [15, 15], [30, 30], [45, 45], [0, 60])},
    custom: {example: "custom", a: 0, b: 1, t: 3, points: pts([75, 0], [0, 45], [-75, 0], [60, 27], [-45, 36])},
};

export const DEFAULT_FIVE_POINT_MODEL: FivePointModel = FIVE_POINT_EXAMPLES.ellipse;

/** The view box `[left, top, right, bottom]`; every example's points, control points and Farin points lie inside it. */
export const FIVE_POINT_VIEW_BOX = [-12, 10.5, 12, -10.5] as const;

const samePoint = (a: ProjectiveGridPoint, b: ProjectiveGridPoint): boolean => a.x === b.x && a.y === b.y;

/** Whether a model still has exactly the values of its named example (`custom` never matches). */
export const matchesExample = (model: FivePointModel): boolean => {
    const named = FIVE_POINT_EXAMPLES[model.example];
    return model.example !== "custom" && model.a === named.a && model.b === named.b && model.t === named.t
        && model.points.every((p, i) => samePoint(p, named.points[i]));
};

export const serializeFivePointModel = (model: FivePointModel): FivePointModel => ({
    example: model.example, a: model.a, b: model.b, t: model.t, points: model.points.map(p => ({x: p.x, y: p.y})),
});

const FIVE_POINT_KEYS: readonly string[] = ["example", "a", "b", "t", "points"];

const checkIndex = (value: unknown, field: string): ProjectiveCheck<number> => {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value >= FIVE_POINT_COUNT) {
        return refuse(message("projective_k2_invalid_index_range", {value0: field, value1: FIVE_POINT_COUNT - 1}));
    }
    return accept(value);
};

/** Checks imported data field by field; the refusal names the field and the repair. */
export function parseFivePointModel(data: unknown): ProjectiveCheck<FivePointModel> {
    if (!isRecord(data)) return refuse(message("projective_invalid_not_an_object"));
    const unknown = Object.keys(data).find(key => !FIVE_POINT_KEYS.includes(key));
    if (unknown !== undefined) return refuse(message("projective_invalid_unknown_key", {value0: unknown, value1: FIVE_POINT_KEYS.join(", ")}));
    const example = FIVE_POINT_EXAMPLE_IDS.find(id => id === data.example);
    if (example === undefined) return refuse(message("projective_invalid_unknown_example", {value0: FIVE_POINT_EXAMPLE_IDS.join(", ")}));
    if (!Array.isArray(data.points) || data.points.length !== FIVE_POINT_COUNT) {
        return refuse(message("projective_invalid_field_missing", {value0: "points"}));
    }
    const points: ProjectiveGridPoint[] = [];
    for (let i = 0; i < FIVE_POINT_COUNT; i++) {
        const checked = checkGridPoint(data.points[i], `points[${i}]`, FIVE_POINT_NUMERATOR_LIMIT);
        if (!checked.ok) return checked;
        points.push(checked.value);
    }
    const a = checkIndex(data.a, "a");
    if (!a.ok) return a;
    const b = checkIndex(data.b, "b");
    if (!b.ok) return b;
    const t = checkIndex(data.t, "t");
    if (!t.ok) return t;
    if (a.value === b.value || t.value === a.value || t.value === b.value) return refuse(message("projective_five_point_invalid_distinct"));
    const model = serializeFivePointModel({example, points, a: a.value, b: b.value, t: t.value});
    // A named example whose values were edited is a custom set-up, so the example buttons never claim a wrong state.
    return accept(example === "custom" || matchesExample(model) ? model : {...model, example: "custom"});
}

// ---- Exact scene ---------------------------------------------------------------------------------------------------

export type FivePointStatusKind =
    | "ok" | "line-pair" | "pencil-collinear" | "pencil-repeated" | "invalid"
    | "split-needed" | "complementary-arc" | "no-real-weight" | "arc-invalid";

export interface FivePointScene {
    readonly points: readonly Hom[];
    readonly status: FivePointStatus;
    readonly type?: ConicType;
    readonly conic?: Conic;
    /** The rational arc of a `unique` conic between the chosen ends. */
    readonly arc?: RationalArcResult;
    readonly kind: FivePointStatusKind;
    /** Indices of the collinear triple named for a line pair, or of the collinear quadruple (or more) for a pencil. */
    readonly collinearSet: readonly number[];
    /** The first repeated pair, when the pencil comes from coincident points. */
    readonly repeated?: readonly [number, number];
    /** Largest first-order distance of the arc samples to the conic (`undefined` unless the arc is `ok`). */
    readonly deviation?: number;
}

/** The point with numerators `p` as an exact homogeneous triple `[x, y, 15]` (reduced). */
export const pointOf = (p: ProjectiveGridPoint): Hom => hom(p.x, p.y, FIVE_POINT_DENOMINATOR);

/** Evaluates the conic form `A x^2 + B xy + C y^2 + D x + E y + F` and its gradient in doubles. */
function conicValue(c: Conic, x: number, y: number): {q: number; gradient: number} {
    const [A, B, C, D, E, F] = c.map(Number);
    const q = A * x * x + B * x * y + C * y * y + D * x + E * y + F;
    const gx = 2 * A * x + B * y + D;
    const gy = B * x + 2 * C * y + E;
    return {q, gradient: Math.hypot(gx, gy)};
}

/** The first-order distance |Q(p)| / |grad Q(p)| of a point to the conic. */
export const conicDistance = (c: Conic, x: number, y: number): number => {
    const {q, gradient} = conicValue(c, x, y);
    return gradient === 0 ? Math.abs(q) : Math.abs(q) / gradient;
};

/** The point of the rational quadratic arc at `t`, evaluated by the shared de Casteljau kernel with weights [1, w, 1]. */
export function arcPoint(arc: Extract<RationalArcResult, {status: "ok"}>, t: number): readonly [number, number] {
    const rows = arc.controlPoints.map(p => [p.x, p.y]);
    deCasteljauInPlace(t, rows, [...arc.weights]);
    return [rows[0][0], rows[0][1]];
}

/** Maximum first-order distance of `samples` points of the arc (t = i / (samples - 1)) to the exact conic. */
export function arcDeviation(c: Conic, arc: Extract<RationalArcResult, {status: "ok"}>, samples: number = DEVIATION_SAMPLES): number {
    let worst = 0;
    for (let i = 0; i < samples; i++) {
        const [x, y] = arcPoint(arc, i / (samples - 1));
        worst = Math.max(worst, conicDistance(c, x, y));
    }
    return worst;
}

/** Evaluates the whole scene exactly. */
export function evaluateFivePoint(model: FivePointModel): FivePointScene {
    const points = model.points.map(pointOf);
    const solved = conicFromFivePoints(points as unknown as readonly [Hom, Hom, Hom, Hom, Hom]);
    let repeated: readonly [number, number] | undefined;
    for (let i = 0; i < FIVE_POINT_COUNT && !repeated; i++) {
        for (let j = i + 1; j < FIVE_POINT_COUNT; j++) if (equal(points[i], points[j])) { repeated = [i, j]; break; }
    }
    // Collinear points: the largest set lying on one line through two distinct points (a triple for a line pair).
    let collinearSet: number[] = [];
    for (let i = 0; i < FIVE_POINT_COUNT; i++) {
        for (let j = i + 1; j < FIVE_POINT_COUNT; j++) {
            if (equal(points[i], points[j])) continue;
            const on = points.map((_, k) => k).filter(k => collinear(points[i], points[j], points[k]));
            if (on.length > collinearSet.length) collinearSet = on;
        }
    }
    const base = {points, status: solved.status, type: solved.type, conic: solved.conic, collinearSet, repeated};
    if (solved.status === "line-pair") return {...base, kind: "line-pair", collinearSet: collinearSet.slice(0, 3)};
    if (solved.status === "pencil") return {...base, kind: repeated ? "pencil-repeated" : "pencil-collinear"};
    if (solved.status === "invalid") return {...base, kind: "invalid"};
    const arc = rationalArc(solved.conic!, points[model.a], points[model.b], points[model.t]);
    const kind: FivePointStatusKind = arc.status === "ok" ? "ok" : arc.status === "invalid" ? "arc-invalid" : arc.status;
    return {...base, arc, kind, deviation: arc.status === "ok" ? arcDeviation(solved.conic!, arc) : undefined};
}

// ---- Last unique conic (acceptance 6) --------------------------------------------------------------------------------

/**
 * The points of the last position whose conic was unique, or `undefined` when there has been none. It is state (not derivable from
 * the current model): a drag through a degenerate position keeps drawing that conic, marked stale.
 */
export type LastUnique = readonly ProjectiveGridPoint[] | undefined;

/** The last-unique record after moving to `model`: its own points when the conic is unique, else the previous record. */
export function nextLastUnique(previous: LastUnique, model: FivePointModel, scene: FivePointScene): LastUnique {
    return scene.status === "unique" ? model.points.map(p => ({x: p.x, y: p.y})) : previous;
}

/** The conic to draw: the current one, or the last unique one with `stale` set when the current position is degenerate. */
export function shownConic(scene: FivePointScene, last: LastUnique): {readonly conic: Conic; readonly stale: boolean} | undefined {
    if (scene.status === "unique" && scene.conic) return {conic: scene.conic, stale: false};
    if (last === undefined) return undefined;
    const old = conicFromFivePoints(last.map(pointOf) as unknown as readonly [Hom, Hom, Hom, Hom, Hom]);
    return old.status === "unique" && old.conic ? {conic: old.conic, stale: true} : undefined;
}

// ---- Extrapolation -------------------------------------------------------------------------------------------------

export interface ParameterInterval {
    readonly lo: number;
    readonly hi: number;
}

/**
 * The parameter intervals outside [0, 1] where the arc is extrapolated, split at the denominator zeros so that no interval contains
 * one (the curve is never joined across a zero). Ends may be infinite; a finite end at 0 or 1 touches the solid arc, an end at a
 * zero is open.
 */
export function extrapolationIntervals(zeros: readonly number[]): ParameterInterval[] {
    const cuts = [...zeros].sort((p, q) => p - q);
    const edges = [-Infinity, ...cuts.filter(z => z < 0), 0, 1, ...cuts.filter(z => z > 1), Infinity];
    const out: ParameterInterval[] = [];
    for (let i = 0; i + 1 < edges.length; i++) {
        if (edges[i] === 0 && edges[i + 1] === 1) continue;
        out.push({lo: edges[i], hi: edges[i + 1]});
    }
    return out;
}

/** `n + 1` parameters in the interval, dense towards the ends (where a zero may sit); infinite ends use an arctangent map. Excludes open zero ends. */
export function intervalSamples(interval: ParameterInterval, zeros: readonly number[], n: number = 60): number[] {
    const {lo, hi} = interval;
    const isZero = (value: number) => zeros.includes(value);
    const out: number[] = [];
    for (let i = 0; i <= n; i++) {
        const s = i / n;
        let value: number;
        if (lo === -Infinity && hi === Infinity) value = Math.tan(Math.PI * (s - 0.5));
        else if (lo === -Infinity) value = hi + Math.tan(Math.PI / 2 * (s - 1));
        else if (hi === Infinity) value = lo + Math.tan(Math.PI / 2 * s);
        else value = lo + (hi - lo) * (1 - Math.cos(Math.PI * s)) / 2;
        if (!Number.isFinite(value)) continue;
        if (i === 0 && isZero(lo)) continue;
        if (i === n && isZero(hi)) continue;
        out.push(value);
    }
    return out;
}

/** Polyline pieces of the extrapolated arc (outside [0, 1]), one array per interval; points beyond `limit` are dropped by a NaN break. */
export function extrapolatedPieces(arc: Extract<RationalArcResult, {status: "ok"}>, limit: number = 40): {x: number[]; y: number[]}[] {
    const pieces: {x: number[]; y: number[]}[] = [];
    for (const interval of extrapolationIntervals(arc.denominatorZeros)) {
        const piece = {x: [] as number[], y: [] as number[]};
        for (const t of intervalSamples(interval, arc.denominatorZeros)) {
            const [x, y] = arcPoint(arc, t);
            if (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= limit && Math.abs(y) <= limit) {
                piece.x.push(x);
                piece.y.push(y);
            } else if (piece.x.length && !Number.isNaN(piece.x[piece.x.length - 1])) {
                piece.x.push(NaN);
                piece.y.push(NaN);
            }
        }
        if (piece.x.length) pieces.push(piece);
    }
    return pieces;
}
