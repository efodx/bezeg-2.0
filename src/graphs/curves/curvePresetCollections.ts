import {message, Message} from "../../localization";
import {checkSceneState, isFiniteNumber, isIntegerAtLeast, isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {CurveTypeName, isCurveTypeName} from "./object/curveTypeNames";

/**
 * One stored curve: control points, with weights (rational), the PH generating point and hodograph points, or spline
 * settings by type, and the adapter state. The stored field names are a file contract.
 */
export interface CurveDto {
    readonly points: ReadonlyArray<ReadonlyArray<number>>;
    readonly weights?: ReadonlyArray<number>;
    readonly hodographs?: ReadonlyArray<ReadonlyArray<number>>;
    readonly degree?: number;
    readonly continuity?: number;
    readonly state?: Readonly<Record<string, unknown>>;
}

/** Preset data of a curve collection: `[curve type, curve DTO]` pairs, see `ClassMapper`. */
export type CurveCollectionPresetData = ReadonlyArray<readonly [CurveTypeName, CurveDto]>;

/**
 * Curve-state fields an adapter's `importState` applies unconditionally, so a state without them would leave the curve with
 * an undefined parameter. Display switches are not required: a missing switch is read as off, as the adapters import it, so
 * shorter states written by earlier releases or seeded by tests still load (rational curves do not import `decasteljauT`).
 */
const REQUIRED_PARAMETERS: Readonly<Record<CurveTypeName, readonly string[]>> = {
    JSXBezierCurve: ["subdivisionT", "decasteljauT", "extrapolationT"],
    JSXPHBezierCurve: ["subdivisionT", "decasteljauT", "extrapolationT"],
    JSXRationalBezierCurve: ["subdivisionT", "extrapolationT"],
    JSXGenericSplineCurve: [],
    JSXQuadraticC1SplineCurve: [],
    JSXQubicC2SplineCurve: [],
    JSXQuadraticG1SplineCurve: [],
    JSXSymmetricQuadraticG1SplineCurve: [],
};
const G1_TYPES: readonly CurveTypeName[] = ["JSXQuadraticG1SplineCurve", "JSXSymmetricQuadraticG1SplineCurve"];

function isPointList(value: unknown): value is number[][] {
    return Array.isArray(value) && value.length > 0
        && value.every(point => Array.isArray(point) && point.length === 2 && point.every(isFiniteNumber));
}

/**
 * The adapter state a curve stores. G1 splines also store `b`, one positive shape parameter per junction (the ratio of
 * the derivatives meeting there; a quadratic G1 spline through `p` points has `p - 3` junctions).
 */
function checkCurveState(type: CurveTypeName, pointCount: number, fields: unknown): Message | undefined {
    const g1 = G1_TYPES.includes(type);
    const invalid = checkSceneState(fields, g1 ? ["b"] : []);
    if (invalid || !isRecord(fields)) return invalid ?? message("invalid_state");
    if (g1 && fields.b !== undefined) {
        const b = fields.b;
        const junctions = Math.max(0, pointCount - 3);
        if (!Array.isArray(b) || b.length !== junctions || !b.every(value => isFiniteNumber(value) && value > 0)) return message("invalid_g1_spline_parameters");
    }
    if (REQUIRED_PARAMETERS[type].some(key => fields[key] === undefined)) return message("incomplete_curve_state");
    return undefined;
}

/** One `[type, dto]` entry, checked by the rules of its curve type. */
function checkCurve(entry: unknown): Message | undefined {
    if (!Array.isArray(entry) || entry.length !== 2 || !isCurveTypeName(entry[0]) || !isRecord(entry[1])) return message("unknown_curve_type");
    const type: CurveTypeName = entry[0];
    const dto: Record<string, unknown> = entry[1];
    if (!isPointList(dto.points)) return message("control_points_must_be_pairs_of_finite_numbers");
    const {points, weights, hodographs, degree, continuity} = dto;
    if (type === "JSXRationalBezierCurve" && (!Array.isArray(weights) || weights.length !== points.length || !weights.every(isFiniteNumber))) {
        return message("weights_do_not_match_the_points");
    }
    if (type === "JSXPHBezierCurve" && (points.length !== 1 || !isPointList(hodographs) || ![2, 3].includes(hodographs.length))) return message("invalid_ph_curve_hodograph");
    if (type === "JSXGenericSplineCurve" && (!isIntegerAtLeast(degree, 1) || !isIntegerAtLeast(continuity, 0) || continuity >= degree)) {
        return message("invalid_spline_degree_or_continuity");
    }
    return dto.state === undefined ? undefined : checkCurveState(type, points.length, dto.state);
}

interface CurveCollectionRules {
    /** The curve type every curve of the collection has. */
    readonly type: CurveTypeName;
    /** A PH collection holds exactly one curve with this many hodograph control points (2: cubic, 3: quintic). */
    readonly hodographs?: 2 | 3;
    /** The scene is described by its scene state alone, so a Preset may hold no curves. */
    readonly allowEmpty?: boolean;
}

function curveCollection(key: string, rules: CurveCollectionRules): PresetCollection<CurveCollectionPresetData> {
    const check = (data: unknown): Message | undefined => {
        if (!Array.isArray(data)) return message("invalid_curve_data");
        for (const entry of data) {
            const invalid = checkCurve(entry);
            if (invalid) return invalid;
        }
        if (!rules.allowEmpty && data.length === 0) return message("preset_has_no_curve");
        if (data.some(entry => entry[0] !== rules.type)) return message("curve_type_does_not_match_collection", {value0: `preset-${key}`});
        if (rules.hodographs !== undefined && (data.length !== 1 || data[0][1].hodographs.length !== rules.hodographs)) {
            return message("ph_preset_has_an_incorrect_degree_or_number_of_curves");
        }
        return undefined;
    };
    return Object.freeze({
        key,
        check(data: unknown): PresetDataCheck<CurveCollectionPresetData> {
            const rejection = check(data);
            // Every entry was checked above against its curve type's DTO rules.
            return rejection ? {rejection} : {data: data as CurveCollectionPresetData};
        },
    });
}

const bezier = (key: string) => curveCollection(key, {type: "JSXBezierCurve"});
const rational = (key: string) => curveCollection(key, {type: "JSXRationalBezierCurve"});

/**
 * The Preset collections of the curve Demonstrations, by Demonstration id. Collections of one curve type share their
 * rules; a collection differs only in its key, and PH collections in their degree.
 */
export const curvePresetCollections = {
    bernstein: curveCollection("bernstein-graph", {type: "JSXBezierCurve", allowEmpty: true}),
    bezier: bezier("bezier-curve"),
    decasteljau: bezier("decasteljau"),
    "decasteljau-alternative": bezier("decasteljau2"),
    affine: bezier("affine-transform"),
    subdivision: bezier("subdivision-1"),
    "repeated-subdivision": bezier("bezier-subdivision"),
    extrapolation: bezier("bezier-extrapolation"),
    elevation: bezier("elevation-graph"),
    "weighted-parameterization": bezier("alpha-param"),
    rational: rational("rational-bezier"),
    "rational-decasteljau": rational("rational-decasteljau"),
    "rational-elevation": rational("rational-bezier-elevation"),
    "rational-extrapolation": rational("rational-bezier-extrapolation"),
    "rational-subdivision": rational("rational-bezier-subdivision"),
    farin: rational("rational-bezier-farin"),
    "ph-cubic": curveCollection("cubic-ph", {type: "JSXPHBezierCurve", hodographs: 2}),
    "ph-quintic": curveCollection("quintic-ph-graph", {type: "JSXPHBezierCurve", hodographs: 3}),
    "uniform-parameterization": curveCollection("uniform-graph", {type: "JSXPHBezierCurve", hodographs: 3}),
    "spline-cn": curveCollection("cn-spline", {type: "JSXGenericSplineCurve"}),
    "spline-c1": curveCollection("c1-spline-graph", {type: "JSXQuadraticC1SplineCurve"}),
    "spline-c2": curveCollection("c2-spline", {type: "JSXQubicC2SplineCurve"}),
    "spline-g1": curveCollection("g1-spline-graph", {type: "JSXQuadraticG1SplineCurve"}),
    "spline-g1-symmetric": curveCollection("g1-symmetric-spline-graph", {type: "JSXSymmetricQuadraticG1SplineCurve"}),
    "spline-parameterization": curveCollection("alfaparametrizacije", {type: "JSXQubicC2SplineCurve"}),
} as const;

/**
 * Accepted file collections that no Demonstration declares. `g1-spline` belonged to the affine G1 spline graph, which no
 * route rendered and which was removed on 2026-10-12 (commit 63af46b); a file exported by an earlier release may still
 * hold it, so it imports into storage unchanged although nothing reads it.
 */
export const legacyCurvePresetCollections = [
    curveCollection("g1-spline", {type: "JSXQuadraticG1SplineCurve"}),
] as const;
