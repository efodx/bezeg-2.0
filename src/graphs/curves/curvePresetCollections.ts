import {message, Message} from "../../localization";
import {checkSceneState, isFiniteNumber, isIntegerAtLeast, isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {CurveTypeName, isCurveTypeName} from "./object/curveTypeNames";
import {EVOLUTE_TRACE_MODES} from "../../learning/model";
import {COMB_MAX_COUNT, COMB_MIN_COUNT} from "../../bezeg/impl/curve/curvature";
import {COMB_GAIN_MAX, COMB_GAIN_MIN} from "./comb/curveComb";
import {OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_MIN} from "./object/JXGPHBezierCurve";
import {OFFSET_SAMPLES_MAX, OFFSET_SAMPLES_MIN} from "./offset/curveOffset";
import {ENVELOPE_LINES_MAX, ENVELOPE_LINES_MIN} from "./envelope/curveEnvelope";
import {ARC_MOVER_MODES, ARC_PIECES_MAX, ARC_PIECES_MIN} from "./arclength/arcLengthModel";

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
    /** The curve type every curve of the collection has, or the types any of its curves may have (the comb Demonstration). */
    readonly type: CurveTypeName | readonly CurveTypeName[];
    /** A PH collection holds exactly one curve with this many hodograph control points (2: cubic, 3: quintic). */
    readonly hodographs?: 2 | 3;
    /** Every curve has exactly this many control points (the degree reduction Demonstration's cubic). */
    readonly pointCount?: number;
    /** The scene is described by its scene state alone, so a Preset may hold no curves. */
    readonly allowEmpty?: boolean;
    /** Rules for the fields this Demonstration adds to the scene state, on top of {@link checkSceneState}. */
    readonly graphState?: (state: Record<string, unknown>) => Message | undefined;
}

export function curveCollection(key: string, rules: CurveCollectionRules): PresetCollection<CurveCollectionPresetData> {
    const check = (data: unknown): Message | undefined => {
        if (!Array.isArray(data)) return message("invalid_curve_data");
        for (const entry of data) {
            const invalid = checkCurve(entry);
            if (invalid) return invalid;
        }
        if (!rules.allowEmpty && data.length === 0) return message("preset_has_no_curve");
        const accepted: readonly CurveTypeName[] = typeof rules.type === "string" ? [rules.type] : rules.type;
        if (data.some(entry => !accepted.includes(entry[0]))) return message("curve_type_does_not_match_collection", {value0: `preset-${key}`});
        if (rules.pointCount !== undefined && data.some(entry => entry[1].points.length !== rules.pointCount)) return message("reduction_preset_needs_four_points");
        if (rules.hodographs !== undefined && (data.length !== 1 || data[0][1].hodographs.length !== rules.hodographs)) {
            return message("ph_preset_has_an_incorrect_degree_or_number_of_curves");
        }
        return undefined;
    };
    const {graphState} = rules;
    return Object.freeze({
        key,
        check(data: unknown): PresetDataCheck<CurveCollectionPresetData> {
            const rejection = check(data);
            // Every entry was checked above against its curve type's DTO rules.
            return rejection ? {rejection} : {data: data as CurveCollectionPresetData};
        },
        ...(graphState ? {
            checkGraphState(state: unknown): Message | undefined {
                return checkSceneState(state) ?? (isRecord(state) ? graphState(state) : undefined);
            },
        } : {}),
    });
}

const bezier = (key: string) => curveCollection(key, {type: "JSXBezierCurve"});
const rational = (key: string) => curveCollection(key, {type: "JSXRationalBezierCurve"});

/** The curvature overlay's collection (lesson L2): a Bézier curve with the standard rules, under its own key. */
export const curvatureCurvePresetCollection = bezier("curve-curvature");
/** The evolute Demonstration's collection (lesson L4): a Bézier curve with the standard rules, under its own key. */
export const evoluteCurvePresetCollection = curveCollection("curve-evolute", {
    type: "JSXBezierCurve",
    graphState: ({curvatureT, evoluteTrace, evoluteNormalShown}) => {
        if (curvatureT !== undefined && !(isFiniteNumber(curvatureT) && curvatureT >= 0 && curvatureT <= 1)) return message("invalid_parameter", {value0: "curvatureT"});
        if (evoluteTrace !== undefined && !EVOLUTE_TRACE_MODES.some(mode => mode === evoluteTrace)) return message("invalid_option", {value0: "evoluteTrace"});
        if (evoluteNormalShown !== undefined && typeof evoluteNormalShown !== "boolean") return message("invalid_option", {value0: "evoluteNormalShown"});
        return undefined;
    },
});

/** The curvature comb's collection (lesson L3): a cubic Bézier curve or a quadratic C1, cubic C2 or quadratic G1 spline. */
export const curveCombPresetCollection = curveCollection("curve-comb", {
    type: ["JSXBezierCurve", "JSXQuadraticC1SplineCurve", "JSXQubicC2SplineCurve", "JSXQuadraticG1SplineCurve"],
    graphState: ({combShown, combGain, combCount}) => {
        if (combShown !== undefined && typeof combShown !== "boolean") return message("invalid_option", {value0: "combShown"});
        if (combGain !== undefined && !(isFiniteNumber(combGain) && combGain >= COMB_GAIN_MIN && combGain <= COMB_GAIN_MAX)) return message("invalid_parameter", {value0: "combGain"});
        if (combCount !== undefined && !(isIntegerAtLeast(combCount, COMB_MIN_COUNT) && combCount <= COMB_MAX_COUNT)) return message("invalid_parameter", {value0: "combCount"});
        return undefined;
    },
});

/** The offset Demonstration's collection (lesson L5): a Bézier curve (the parabola) or a PH curve, with the offset display state. */
export const curveOffsetPresetCollection = curveCollection("curve-offset", {
    type: ["JSXBezierCurve", "JSXPHBezierCurve"],
    graphState: ({offsetD, offsetSamples, offsetShown, offsetCuspsShown, offsetSpeedPlotShown}) => {
        if (offsetD !== undefined && !(isFiniteNumber(offsetD) && offsetD >= OFFSET_DISTANCE_MIN && offsetD <= OFFSET_DISTANCE_MAX)) return message("invalid_parameter", {value0: "offsetD"});
        if (offsetSamples !== undefined && !(isIntegerAtLeast(offsetSamples, OFFSET_SAMPLES_MIN) && offsetSamples <= OFFSET_SAMPLES_MAX)) return message("invalid_parameter", {value0: "offsetSamples"});
        if (offsetShown !== undefined && typeof offsetShown !== "boolean") return message("invalid_option", {value0: "offsetShown"});
        if (offsetCuspsShown !== undefined && typeof offsetCuspsShown !== "boolean") return message("invalid_option", {value0: "offsetCuspsShown"});
        if (offsetSpeedPlotShown !== undefined && typeof offsetSpeedPlotShown !== "boolean") return message("invalid_option", {value0: "offsetSpeedPlotShown"});
        return undefined;
    },
});

/** The envelope Demonstration's collection (lesson L6): a Bézier curve of any degree, with the envelope display state. */
export const curveEnvelopePresetCollection = curveCollection("curve-envelope", {
    type: "JSXBezierCurve",
    graphState: ({envelopeT, envelopeLineCount, envelopeLinesShown, envelopeCurveShown, envelopeTouchShown}) => {
        if (envelopeT !== undefined && !(isFiniteNumber(envelopeT) && envelopeT >= 0 && envelopeT <= 1)) return message("invalid_parameter", {value0: "envelopeT"});
        if (envelopeLineCount !== undefined && !(isIntegerAtLeast(envelopeLineCount, ENVELOPE_LINES_MIN) && envelopeLineCount <= ENVELOPE_LINES_MAX)) return message("invalid_parameter", {value0: "envelopeLineCount"});
        if (envelopeLinesShown !== undefined && typeof envelopeLinesShown !== "boolean") return message("invalid_option", {value0: "envelopeLinesShown"});
        if (envelopeCurveShown !== undefined && typeof envelopeCurveShown !== "boolean") return message("invalid_option", {value0: "envelopeCurveShown"});
        if (envelopeTouchShown !== undefined && typeof envelopeTouchShown !== "boolean") return message("invalid_option", {value0: "envelopeTouchShown"});
        return undefined;
    },
});

/** The degree reduction Demonstration's collection (advanced lesson D1): a cubic Bézier curve (exactly four points) with the reduction mode and display state. */
export const reductionPresetCollection = curveCollection("reduction", {
    type: "JSXBezierCurve",
    pointCount: 4,
    graphState: ({reductionMode, reductionShown, reductionElevationShown}) => {
        if (reductionMode !== undefined && reductionMode !== "fixed" && reductionMode !== "free") return message("invalid_option", {value0: "reductionMode"});
        if (reductionShown !== undefined && typeof reductionShown !== "boolean") return message("invalid_option", {value0: "reductionShown"});
        if (reductionElevationShown !== undefined && typeof reductionElevationShown !== "boolean") return message("invalid_option", {value0: "reductionElevationShown"});
        return undefined;
    },
});

/** The arc-length parametrization Demonstration's collection (lesson D3): a Bézier curve or a PH curve, with the display state of the marks, the speed plot and the moving point. */
export const arcLengthParamPresetCollection = curveCollection("arc-length-param", {
    type: ["JSXBezierCurve", "JSXPHBezierCurve"],
    graphState: ({arcPieces, arcEqualTShown, arcEqualArcShown, arcSpeedPlotShown, arcMoverMode, arcMoverPosition}) => {
        if (arcPieces !== undefined && !(isIntegerAtLeast(arcPieces, ARC_PIECES_MIN) && arcPieces <= ARC_PIECES_MAX)) return message("invalid_parameter", {value0: "arcPieces"});
        if (arcEqualTShown !== undefined && typeof arcEqualTShown !== "boolean") return message("invalid_option", {value0: "arcEqualTShown"});
        if (arcEqualArcShown !== undefined && typeof arcEqualArcShown !== "boolean") return message("invalid_option", {value0: "arcEqualArcShown"});
        if (arcSpeedPlotShown !== undefined && typeof arcSpeedPlotShown !== "boolean") return message("invalid_option", {value0: "arcSpeedPlotShown"});
        if (arcMoverMode !== undefined && !ARC_MOVER_MODES.some(mode => mode === arcMoverMode)) return message("invalid_option", {value0: "arcMoverMode"});
        if (arcMoverPosition !== undefined && !(isFiniteNumber(arcMoverPosition) && arcMoverPosition >= 0 && arcMoverPosition <= 1)) return message("invalid_parameter", {value0: "arcMoverPosition"});
        return undefined;
    },
});

/**
 * The Preset collections of the curve Demonstrations, by Demonstration id. Collections of one curve type share their
 * rules; a collection differs only in its key, and PH collections in their degree.
 */
export const curvePresetCollections = {
    bezier: bezier("bezier-curve"),
    decasteljau: bezier("decasteljau"),
    "decasteljau-alternative": bezier("decasteljau2"),
    affine: bezier("affine-transform"),
    subdivision: bezier("subdivision-1"),
    "repeated-subdivision": bezier("bezier-subdivision"),
    extrapolation: bezier("bezier-extrapolation"),
    elevation: bezier("elevation-graph"),
    rational: rational("rational-bezier"),
    "rational-decasteljau": rational("rational-decasteljau"),
    "rational-elevation": rational("rational-bezier-elevation"),
    "rational-extrapolation": rational("rational-bezier-extrapolation"),
    "rational-subdivision": rational("rational-bezier-subdivision"),
    farin: rational("rational-bezier-farin"),
    "spline-cn": curveCollection("cn-spline", {type: "JSXGenericSplineCurve"}),
    "spline-c1": curveCollection("c1-spline-graph", {type: "JSXQuadraticC1SplineCurve"}),
    "spline-c2": curveCollection("c2-spline", {type: "JSXQubicC2SplineCurve"}),
    "spline-g1": curveCollection("g1-spline-graph", {type: "JSXQuadraticG1SplineCurve"}),
    "spline-g1-symmetric": curveCollection("g1-symmetric-spline-graph", {type: "JSXSymmetricQuadraticG1SplineCurve"}),
    "curve-curvature": curvatureCurvePresetCollection,
    "curve-comb": curveCombPresetCollection,
    "curve-evolute": evoluteCurvePresetCollection,
    "curve-offset": curveOffsetPresetCollection,
    "curve-envelope": curveEnvelopePresetCollection,
    "arc-length-param": arcLengthParamPresetCollection,
    reduction: reductionPresetCollection,
} as const;

/**
 * Accepted file collections that no Demonstration declares. `g1-spline` belonged to the affine G1 spline graph, which no
 * route rendered and which was removed on 2026-10-12 (commit 63af46b); a file exported by an earlier release may still
 * hold it, so it imports into storage unchanged although nothing reads it.
 */
export const legacyCurvePresetCollections = [
    curveCollection("g1-spline", {type: "JSXQuadraticG1SplineCurve"}),
] as const;
