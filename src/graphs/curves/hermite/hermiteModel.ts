import {Message, message} from "../../../localization";
import {
    catmullRomSegments, catmullRomTangents, hermiteDerivative, hermitePoint, hermiteToBezier, HermiteSegment,
} from "../../../analysis/hermite";
import {
    curveParameters, INTERPOLATION_POINTS_MAX, INTERPOLATION_POINTS_MIN, ParameterRule, Point2,
} from "../../../analysis/interpolation";

export const HERMITE_COORDINATE_LIMIT = 1000;
export const HERMITE_TENSION_MIN = 0;
export const HERMITE_TENSION_MAX = 2;
/**
 * At least every Catmull-Rom tangent the caps allow: the largest is the uniform end tangent tension (P_1 - P_0), up to
 * 2 * 2000 = 4000 per component (interior uniform tangents halve the span; chord tangents are at most the tension). So a switch to
 * Hermite mode copies the tangents exactly and the curve does not change.
 */
export const HERMITE_TANGENT_LIMIT = HERMITE_TENSION_MAX * 2 * HERMITE_COORDINATE_LIMIT;
export const HERMITE_TENSION_STEP = 0.05;

export type HermiteMode = 'catmull-rom' | 'hermite';
export type {ParameterRule};

/** Preset data of the Hermite and Catmull-Rom Demonstration (lesson I3). `tangents` are the Hermite-mode global derivatives m_i. */
export interface HermitePresetData {
    readonly points: readonly (readonly [number, number])[];
    readonly mode: HermiteMode;
    /** One global-parameter derivative per point; used in Hermite mode, stored (and ignored) in Catmull-Rom mode. */
    readonly tangents: readonly (readonly [number, number])[];
    readonly parameterRule: ParameterRule;
    readonly tension: number;
    readonly showTangents: boolean;
    readonly showBezier: boolean;
}

const freezePair = (p: readonly [number, number]) => Object.freeze([p[0], p[1]] as const);

/** Default lesson scene; its stored tangents are the Catmull-Rom tangents of the points: (1,2), (1.5,1.5), (1.5,-1), (1,-3). */
export const DEFAULT_HERMITE_PRESET: HermitePresetData = Object.freeze({
    points: Object.freeze([[0, 0], [1, 2], [3, 3], [4, 0]].map(p => freezePair(p as [number, number]))),
    mode: 'catmull-rom',
    tangents: Object.freeze([[1, 2], [1.5, 1.5], [1.5, -1], [1, -3]].map(p => freezePair(p as [number, number]))),
    parameterRule: 'uniform',
    tension: 1,
    showTangents: true,
    showBezier: false,
});

export const isParameterRule = (value: unknown): value is ParameterRule => value === 'uniform' || value === 'chord';
export const isHermiteMode = (value: unknown): value is HermiteMode => value === 'catmull-rom' || value === 'hermite';

/** The fields a chain is computed from. */
export interface ChainInput {
    readonly points: readonly Point2[];
    readonly mode: HermiteMode;
    readonly tangents: readonly Point2[];
    readonly parameterRule: ParameterRule;
    readonly tension: number;
}

export interface HermiteChain {
    /** Global parameters t_i (t_0 = 0). */
    readonly parameters: number[];
    /** Global-parameter derivative at each point: what the tangent arrows show. */
    readonly tangents: Point2[];
    /** Segment i on the local parameter u in [0, 1], local tangents h_i m. */
    readonly segments: HermiteSegment[];
}

/** The index i (pair i - 1, i) of the first consecutive points that coincide or get the same parameter, or undefined. */
export function firstCoincidentPair(points: readonly Point2[], rule: ParameterRule): number | undefined {
    const t = curveParameters(points, rule);
    for (let i = 1; i < points.length; i++) {
        if (!(t[i] > t[i - 1]) || (points[i][0] === points[i - 1][0] && points[i][1] === points[i - 1][1])) return i;
    }
    return undefined;
}

/** Builds the chain; throws a RangeError when consecutive points coincide (the kernel's zero-chord rule). */
export function hermiteChain(input: ChainInput): HermiteChain {
    const {points, mode, tangents, parameterRule, tension} = input;
    if (mode === 'catmull-rom') {
        const segments = catmullRomSegments(points, parameterRule, tension);
        return {parameters: curveParameters(points, parameterRule), tangents: catmullRomTangents(points, parameterRule, tension), segments};
    }
    // The Catmull-Rom call is the kernel's coincidence check for both rules.
    catmullRomTangents(points, parameterRule, 1);
    const parameters = curveParameters(points, parameterRule);
    const segments = points.slice(0, -1).map((p0, i): HermiteSegment => {
        const h = parameters[i + 1] - parameters[i];
        return {p0, p1: points[i + 1], m0: [h * tangents[i][0], h * tangents[i][1]], m1: [h * tangents[i + 1][0], h * tangents[i + 1][1]]};
    });
    return {parameters, tangents: tangents.map(m => [m[0], m[1]] as Point2), segments};
}

/** Segment index and local parameter u of the global parameter t (clamped to the chain). */
export function locate(chain: HermiteChain, t: number): {index: number; u: number} {
    const last = chain.segments.length - 1;
    let index = 0;
    while (index < last && t >= chain.parameters[index + 1]) index++;
    const h = chain.parameters[index + 1] - chain.parameters[index];
    return {index, u: Math.min(1, Math.max(0, (t - chain.parameters[index]) / h))};
}

export const chainPoint = (chain: HermiteChain, t: number): [number, number] => {
    const {index, u} = locate(chain, t);
    return hermitePoint(chain.segments[index], u);
};

/** Derivative with respect to the global parameter t (local derivative divided by h_i). */
export const chainDerivative = (chain: HermiteChain, t: number): [number, number] => {
    const {index, u} = locate(chain, t);
    const h = chain.parameters[index + 1] - chain.parameters[index];
    const d = hermiteDerivative(chain.segments[index], u);
    return [d[0] / h, d[1] / h];
};

/** Bezier control points of every segment: P_i, P_i + h_i m_i / 3, P_{i+1} - h_i m_{i+1} / 3, P_{i+1}. */
export const chainBezier = (chain: HermiteChain): [Point2, Point2, Point2, Point2][] => chain.segments.map(hermiteToBezier);

const clampTangent = (value: number) => Math.min(HERMITE_TANGENT_LIMIT, Math.max(-HERMITE_TANGENT_LIMIT, value));

/** The current Catmull-Rom tangents (tension applied), clamped to the tangent limit so they can be stored as Hermite tangents. */
export function catmullRomStored(points: readonly Point2[], rule: ParameterRule, tension: number): (readonly [number, number])[] {
    return catmullRomTangents(points, rule, tension).map(m => [clampTangent(m[0]), clampTangent(m[1])] as const);
}

const isPair = (value: unknown, limit: number): boolean => Array.isArray(value) && value.length === 2
    && value.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit);

/** The localized reason this data cannot be drawn, or undefined when it can: counts, ranges, enums and coincident points. */
export function hermiteRejection(data: HermitePresetData): Message | undefined {
    const {points, tangents} = data;
    if (!Array.isArray(points) || points.length < INTERPOLATION_POINTS_MIN || points.length > INTERPOLATION_POINTS_MAX) {
        return message("interp_points_range", {value0: INTERPOLATION_POINTS_MIN, value1: INTERPOLATION_POINTS_MAX});
    }
    if (!points.every(p => isPair(p, HERMITE_COORDINATE_LIMIT))) return message("interp_coordinate_invalid", {value0: HERMITE_COORDINATE_LIMIT});
    if (!Array.isArray(tangents) || tangents.length !== points.length || !tangents.every(m => isPair(m, HERMITE_TANGENT_LIMIT))) {
        return message("hermite_tangent_invalid", {value0: HERMITE_TANGENT_LIMIT});
    }
    if (!isHermiteMode(data.mode)) return message("invalid_value", {value0: "mode"});
    if (!isParameterRule(data.parameterRule)) return message("invalid_value", {value0: "parameterRule"});
    if (typeof data.tension !== 'number' || !Number.isFinite(data.tension) || data.tension < HERMITE_TENSION_MIN || data.tension > HERMITE_TENSION_MAX) {
        return message("invalid_parameter", {value0: "tension"});
    }
    const pair = firstCoincidentPair(points, data.parameterRule);
    if (pair !== undefined) return message("hermite_coincident_points", {value0: pair, value1: pair + 1});
    try {
        hermiteChain(data);
    } catch (error) {
        if (error instanceof RangeError) return message("hermite_coincident_points", {value0: 1, value1: 2});
        throw error;
    }
    return undefined;
}

/** The view that shows the points and their tangent arrows with a margin. */
export const hermiteViewBox = (points: readonly Point2[], tangents: readonly Point2[] = []): [number, number, number, number] => {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    tangents.forEach((m, i) => { xs.push(points[i][0] + m[0]); ys.push(points[i][1] + m[1]); });
    const width = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const height = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const margin = Math.max(width, height) * 0.3;
    return [Math.min(...xs) - margin, Math.max(...ys) + margin, Math.max(...xs) + margin, Math.min(...ys) - margin];
};
