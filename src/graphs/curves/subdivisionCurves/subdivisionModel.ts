import {Message, message} from "../../../localization";
import {FOUR_POINT_DEFAULT_W, MAX_SUBDIVISION_ROUNDS, SubdivisionRule, subdivisionRounds} from "../../../analysis/subdivision";
import {uniformQuadraticSegment} from "../../../bezeg/impl/curve/bspline";

export {MAX_SUBDIVISION_ROUNDS};
export type {SubdivisionRule};

/** The animation id lesson `animation` actions for the subdivision rounds will be addressed to (wired by the registration slice). */
export const SUBDIVISION_ANIMATION_ID = 'interp-subdivision-rounds';

export const SUBDIVISION_POINTS_MIN = 2;
export const SUBDIVISION_POINTS_MAX = 8;
export const SUBDIVISION_CLOSED_POINTS_MIN = 3;
export const SUBDIVISION_COORDINATE_LIMIT = 1000;
/** Time between two playback rounds. */
export const SUBDIVISION_STEP_INTERVAL_MS = 800;

export type Row = readonly [number, number];

/** Preset data of the subdivision Demonstration (lesson I5). Stages are derived from the polygon and never stored. */
export interface SubdivisionPresetData {
    readonly points: readonly Row[];
    readonly closed: boolean;
    readonly rule: SubdivisionRule;
    /** Revealed rounds, 0..MAX_SUBDIVISION_ROUNDS. */
    readonly round: number;
    readonly showLimit: boolean;
}

const freezeRow = (p: readonly [number, number]): Row => Object.freeze([p[0], p[1]] as const);

/** Default lesson scene: the open polygon of spec I5, Chaikin, round 0, limit overlay hidden. */
export const DEFAULT_SUBDIVISION_PRESET: SubdivisionPresetData = Object.freeze({
    points: Object.freeze([[0, 0], [1, 2], [3, 3], [4, 0]].map(p => freezeRow(p as [number, number]))),
    closed: false,
    rule: 'chaikin',
    round: 0,
    showLimit: false,
});

export const isSubdivisionRule = (value: unknown): value is SubdivisionRule => value === 'chaikin' || value === 'four-point';

export const isRound = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_SUBDIVISION_ROUNDS;

const isPair = (value: unknown): boolean => Array.isArray(value) && value.length === 2
    && value.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= SUBDIVISION_COORDINATE_LIMIT);

/** The localized reason this data cannot be drawn, or undefined when it can: shape, counts, ranges and enums. */
export function subdivisionRejection(data: SubdivisionPresetData): Message | undefined {
    const {points, closed} = data;
    if (!Array.isArray(points)) return message("invalid_value", {value0: "points"});
    if (points.length < SUBDIVISION_POINTS_MIN || points.length > SUBDIVISION_POINTS_MAX) {
        return message("subdiv_points_range", {value0: SUBDIVISION_POINTS_MIN, value1: SUBDIVISION_POINTS_MAX});
    }
    if (!points.every(isPair)) return message("subdiv_coordinate_invalid", {value0: SUBDIVISION_COORDINATE_LIMIT});
    if (typeof closed !== 'boolean') return message("invalid_option", {value0: "closed"});
    if (closed && points.length < SUBDIVISION_CLOSED_POINTS_MIN) return message("subdiv_closed_needs_three");
    if (!isSubdivisionRule(data.rule)) return message("invalid_value", {value0: "rule"});
    if (!isRound(data.round)) return message("subdiv_round_invalid", {value0: MAX_SUBDIVISION_ROUNDS});
    if (typeof data.showLimit !== 'boolean') return message("invalid_option", {value0: "showLimit"});
    return undefined;
}

export interface StageInput {
    readonly points: readonly Row[];
    readonly closed: boolean;
    readonly rule: SubdivisionRule;
    readonly round: number;
}

let cachedInput: StageInput | undefined;
let cachedKey: unknown[] | undefined;
let cachedStage: number[][] = [];

/**
 * The polygon shown after `round` rounds: the last of `subdivisionRounds`, recomputed only when the points, closed flag,
 * rule or round change (by identity). Empty when the data cannot be subdivided (never thrown into a draw callback).
 */
export function stageOf(input: StageInput): readonly (readonly number[])[] {
    const key = [input.points, input.closed, input.rule, input.round];
    if (cachedInput && cachedKey && key.every((value, i) => value === cachedKey![i])) return cachedStage;
    let stage: number[][];
    try {
        const stages = subdivisionRounds(input.points, input.closed, input.rule, input.round, FOUR_POINT_DEFAULT_W);
        stage = stages[stages.length - 1];
    } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        stage = [];
    }
    cachedInput = input;
    cachedKey = key;
    cachedStage = stage;
    return stage;
}

const mid = (a: readonly number[], b: readonly number[]): number[] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/**
 * The Chaikin limit curve as a sampled polyline: the uniform quadratic B-spline (`uniformQuadraticSegment` on every
 * consecutive triple, wrapping when closed). An open polygon keeps its end points under Chaikin, so the limit also has the
 * straight pieces from P_0 to the midpoint of P_0 P_1 and from the midpoint of P_{n-2} P_{n-1} to P_{n-1}; with two points
 * it is the segment itself. `samples` is the number of intervals per piece (at least 1).
 */
export function chaikinLimitPolyline(points: readonly (readonly number[])[], closed: boolean, samples = 16): number[][] {
    const n = points.length;
    if (n < (closed ? SUBDIVISION_CLOSED_POINTS_MIN : SUBDIVISION_POINTS_MIN)) return [];
    const quadratic = (a: readonly number[], b: readonly number[], c: readonly number[]) => {
        const piece: number[][] = [];
        for (let k = 0; k <= samples; k++) piece.push(uniformQuadraticSegment(a, b, c, k / samples));
        return piece;
    };
    if (closed) {
        const line: number[][] = [];
        for (let i = 0; i < n; i++) line.push(...quadratic(points[(i + n - 1) % n], points[i], points[(i + 1) % n]));
        return line;
    }
    if (n === 2) return [[...points[0]], [...points[1]]];
    const line: number[][] = [[...points[0]], mid(points[0], points[1])];
    for (let i = 0; i + 2 < n; i++) line.push(...quadratic(points[i], points[i + 1], points[i + 2]));
    line.push(mid(points[n - 2], points[n - 1]), [...points[n - 1]]);
    return line;
}

/** The view that shows the polygon with a margin. */
export const subdivisionViewBox = (points: readonly Row[]): [number, number, number, number] => {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const width = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const height = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const margin = Math.max(width, height) * 0.3;
    return [Math.min(...xs) - margin, Math.max(...ys) + margin, Math.max(...xs) + margin, Math.min(...ys) - margin];
};
