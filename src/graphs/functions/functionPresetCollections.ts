import {message, Message} from "../../localization";
import {parseLinearModel} from "../../analysis/linearModel";
import {parseExponentialModel} from "../../analysis/exponentialModel";
import {parseTrigonometricModel} from "../../analysis/trigonometricModel";
import {parseContinuityModel} from "../../analysis/continuityModel";
import {parseDerivativeModel} from "../../analysis/derivativeModel";
import {parseRiemannModel} from "../../analysis/riemannModel";
import {parseAreaBetweenModel} from "../../analysis/areaBetweenModel";
import {parseArcLengthModel} from "../../analysis/arcLengthModel";
import {parseBisectionModel} from "../../analysis/bisectionModel";
import {
    BISECTION_BOUND_MAX, BISECTION_BOUND_MIN, BISECTION_EXAMPLE_IDS, BISECTION_MAX_STEPS, isBisectionEndpoint, isBisectionExampleId, isBisectionStepCount,
} from "../../analysis/bisection";
import {isMeanValueExampleId, isMeanValueX, isOrdered, MEAN_VALUE_EXAMPLE_IDS, MVT_X_MAX, MVT_X_MIN} from "../../analysis/meanValue";
import {FUNCTION_IDS, isFunctionId} from "../../analysis/functions";
import {formatNumber} from "../../analysis/format";
import {parseMeanValueModel} from "../../analysis/meanValueModel";
import {parseExtremaModel} from "../../analysis/extremaModel";
import {parseConvexityModel} from "../../analysis/convexityModel";
import {CONVEXITY_EXAMPLE_IDS, CONVEXITY_X_MAX, CONVEXITY_X_MIN, isConvexityExampleId, isConvexityInterval, isConvexityX} from "../../analysis/convexity";
import {parseTaylorModel} from "../../analysis/taylorModel";
import {isTaylorCenter, isTaylorDegree, isTaylorExampleId, isTaylorX, TAYLOR_DEGREE_MAX, TAYLOR_DEGREE_MIN, TAYLOR_EXAMPLE_IDS, taylorExample} from "../../analysis/taylor";
import {parseFixedPointModel} from "../../analysis/fixedPointModel";
import {
    FIXED_POINT_EXAMPLE_IDS, FIXED_POINT_MAX_DIGITS, FIXED_POINT_MAX_STEPS, FIXED_POINT_MIN_DIGITS, fixedPointExample, isFixedPointDigits, isFixedPointExampleId, isFixedPointStart,
    isFixedPointStepCount,
} from "../../analysis/fixedPoint";
import {parseUniformConvergenceModel} from "../../analysis/uniformConvergenceModel";
import {
    isUniformEpsilon, isUniformExampleId, isUniformN, isUniformR, isUniformX, UNIFORM_EPSILON_MAX, UNIFORM_EPSILON_MIN, UNIFORM_EXAMPLE_IDS, UNIFORM_MAX_N, UNIFORM_N_MIN,
    UNIFORM_R_MAX, UNIFORM_R_MIN,
} from "../../analysis/uniformConvergence";
import {parseComplexModel} from "../../analysis/complexModel";
import {COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_MIN, COMPLEX_EXAMPLE_IDS, isComplexCoordinate, isComplexExampleId} from "../../analysis/complex";
import {parseSequenceModel} from "../../analysis/sequenceModel";
import {
    isSequenceEpsilon, isSequenceExampleId, isSequenceLimit, isSequenceTerms, isSequenceThreshold, SEQUENCE_EPSILON_MAX, SEQUENCE_EPSILON_MIN, SEQUENCE_EPSILON_STEP,
    SEQUENCE_EXAMPLE_IDS, SEQUENCE_LIMIT_MAX, SEQUENCE_LIMIT_MIN, SEQUENCE_LIMIT_STEP, SEQUENCE_MAX_TERMS, SEQUENCE_TERMS_MIN, SEQUENCE_THRESHOLD_MAX, SEQUENCE_THRESHOLD_MIN,
} from "../../analysis/sequence";
import {EXTREMA_EXAMPLE_IDS, EXTREMA_X_MAX, EXTREMA_X_MIN, isExtremaExampleId, isExtremaX} from "../../analysis/extrema";
import {parseDarbouxModel} from "../../analysis/darbouxModel";
import {DARBOUX_EXAMPLE_IDS, DARBOUX_N_MAX, DARBOUX_N_MIN, DARBOUX_X_MAX, DARBOUX_X_MIN, isDarbouxCount, isDarbouxExampleId, isDarbouxX} from "../../analysis/darboux";
import {parseAccumulationModel} from "../../analysis/accumulationModel";
import {ACCUMULATION_BOUND_MAX, ACCUMULATION_BOUND_MIN, isAccumulationBound} from "../../analysis/accumulation";
import {isFiniteNumber as finite, isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";

/** A range bound as the file contract shows it (an integer, so the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");
/**
 * Function-demonstration data that the collection's parser rejected: the most specific actionable message for the main failure
 * classes of each collection, or undefined to keep the generic invalid_function_data message (wrong type, missing fields, NaN).
 */
type Diagnosis = (data: Readonly<Record<string, unknown>>) => Message | undefined;
const diagnoseBisection: Diagnosis = data => {
    if (!isBisectionExampleId(data.example)) return message("invalid_bisection_example", {value0: BISECTION_EXAMPLE_IDS.join(", ")});
    if (finite(data.a) && finite(data.b)) {
        if (!isBisectionEndpoint(data.a) || !isBisectionEndpoint(data.b)) return message("invalid_bisection_endpoints", {value0: bound(BISECTION_BOUND_MIN), value1: bound(BISECTION_BOUND_MAX)});
        if (!(data.a < data.b)) return message("invalid_bisection_order");
    }
    if (data.step !== undefined && !isBisectionStepCount(data.step)) return message("invalid_bisection_step", {value0: BISECTION_MAX_STEPS});
    return undefined;
};
const diagnoseMeanValue: Diagnosis = data => {
    if (!isMeanValueExampleId(data.example)) return message("invalid_mean_value_example", {value0: MEAN_VALUE_EXAMPLE_IDS.join(", ")});
    const {a, b, c} = data;
    if (finite(a) && finite(b) && finite(c)) {
        if (!isOrdered(a, c, b)) return message("invalid_mean_value_order");
        if (![a, b, c].every(isMeanValueX)) return message("invalid_mean_value_range", {value0: bound(MVT_X_MIN), value1: bound(MVT_X_MAX)});
    }
    if (data.revealed !== undefined && typeof data.revealed !== "boolean") return message("invalid_mean_value_revealed");
    return undefined;
};
const diagnoseAccumulation: Diagnosis = data => {
    if (!isFunctionId(data.fn)) return message("invalid_accumulation_function", {value0: FUNCTION_IDS.join(", ")});
    if ([data.a, data.x].every(finite) && !(isAccumulationBound(data.a) && isAccumulationBound(data.x))) {
        return message("invalid_accumulation_range", {value0: bound(ACCUMULATION_BOUND_MIN), value1: bound(ACCUMULATION_BOUND_MAX)});
    }
    if (data.accumulationVisible !== undefined && typeof data.accumulationVisible !== "boolean") return message("invalid_accumulation_visibility");
    return undefined;
};
const diagnoseDarboux: Diagnosis = data => {
    if (!isDarbouxExampleId(data.example)) return message("invalid_darboux_example", {value0: DARBOUX_EXAMPLE_IDS.join(", ")});
    if ([data.a, data.b].every(finite)) {
        if (!isDarbouxX(data.a) || !isDarbouxX(data.b)) return message("invalid_darboux_range", {value0: bound(DARBOUX_X_MIN), value1: bound(DARBOUX_X_MAX)});
        if (!(data.a < data.b)) return message("invalid_darboux_order");
    }
    if (data.n !== undefined && !isDarbouxCount(data.n)) return message("invalid_darboux_count", {value0: DARBOUX_N_MIN, value1: DARBOUX_N_MAX});
    if ((data.lowerVisible !== undefined && typeof data.lowerVisible !== "boolean") || (data.upperVisible !== undefined && typeof data.upperVisible !== "boolean")) return message("invalid_darboux_visibility");
    return undefined;
};
const diagnoseExtrema: Diagnosis = data => {
    if (!isExtremaExampleId(data.example)) return message("invalid_extrema_example", {value0: EXTREMA_EXAMPLE_IDS.join(", ")});
    if ([data.a, data.b].every(finite)) {
        if (!isExtremaX(data.a) || !isExtremaX(data.b)) return message("invalid_extrema_range", {value0: bound(EXTREMA_X_MIN), value1: bound(EXTREMA_X_MAX)});
        if (!(data.a < data.b)) return message("invalid_extrema_order");
    }
    if (data.revealed !== undefined && typeof data.revealed !== "boolean") return message("invalid_extrema_revealed");
    return undefined;
};
const diagnoseConvexity: Diagnosis = data => {
    if (!isConvexityExampleId(data.example)) return message("invalid_convexity_example", {value0: CONVEXITY_EXAMPLE_IDS.join(", ")});
    const {a, b, t} = data;
    if (finite(a) && finite(b) && finite(t)) {
        if (![a, b, t].every(isConvexityX)) return message("invalid_convexity_range", {value0: bound(CONVEXITY_X_MIN), value1: bound(CONVEXITY_X_MAX)});
        if (!isConvexityInterval(a, b)) return message("invalid_convexity_order");
    }
    if (data.secondDerivativeVisible !== undefined && typeof data.secondDerivativeVisible !== "boolean") return message("invalid_convexity_visibility");
    return undefined;
};
const diagnoseTaylor: Diagnosis = data => {
    if (!isTaylorExampleId(data.example)) return message("invalid_taylor_example", {value0: TAYLOR_EXAMPLE_IDS.join(", ")});
    const example = taylorExample(data.example);
    if (finite(data.center) && !isTaylorCenter(example, data.center)) {
        return example.centerMin === example.centerMax
            ? message("invalid_taylor_center_fixed", {value0: data.example, value1: bound(example.centerMin)})
            : message("invalid_taylor_center", {value0: data.example, value1: bound(example.centerMin), value2: bound(example.centerMax)});
    }
    if (finite(data.degree) && !isTaylorDegree(data.degree)) return message("invalid_taylor_degree", {value0: TAYLOR_DEGREE_MIN, value1: TAYLOR_DEGREE_MAX});
    if (finite(data.x) && !isTaylorX(example, data.x)) return message("invalid_taylor_x", {value0: data.example, value1: bound(example.xMin), value2: bound(example.xMax)});
    if (data.boundVisible !== undefined && typeof data.boundVisible !== "boolean") return message("invalid_taylor_visibility");
    return undefined;
};
const diagnoseSequence: Diagnosis = data => {
    if (!isSequenceExampleId(data.example)) return message("invalid_sequence_example", {value0: SEQUENCE_EXAMPLE_IDS.join(", ")});
    if (finite(data.epsilon) && !isSequenceEpsilon(data.epsilon)) {
        return message("invalid_sequence_epsilon", {value0: bound(SEQUENCE_EPSILON_MIN), value1: bound(SEQUENCE_EPSILON_MAX), value2: bound(SEQUENCE_EPSILON_STEP)});
    }
    if (finite(data.limit) && !isSequenceLimit(data.limit)) return message("invalid_sequence_limit", {value0: bound(SEQUENCE_LIMIT_MIN), value1: bound(SEQUENCE_LIMIT_MAX), value2: bound(SEQUENCE_LIMIT_STEP)});
    if (finite(data.threshold) && !isSequenceThreshold(data.threshold)) {
        return message("invalid_sequence_threshold", {value0: SEQUENCE_THRESHOLD_MIN, value1: SEQUENCE_THRESHOLD_MAX});
    }
    if (finite(data.terms) && !isSequenceTerms(data.terms)) return message("invalid_sequence_terms", {value0: SEQUENCE_TERMS_MIN, value1: SEQUENCE_MAX_TERMS});
    if (data.certificateVisible !== undefined && typeof data.certificateVisible !== "boolean") return message("invalid_sequence_visibility");
    return undefined;
};
const diagnoseUniformConvergence: Diagnosis = data => {
    if (!isUniformExampleId(data.example)) return message("invalid_uniform_example", {value0: UNIFORM_EXAMPLE_IDS.join(", ")});
    if (finite(data.r) && !isUniformR(data.r)) return message("invalid_uniform_r", {value0: bound(UNIFORM_R_MIN), value1: bound(UNIFORM_R_MAX)});
    if (finite(data.n) && !isUniformN(data.n)) return message("invalid_uniform_n", {value0: UNIFORM_N_MIN, value1: UNIFORM_MAX_N});
    if (isUniformR(data.r) && finite(data.x) && !isUniformX(data.r, data.x)) return message("invalid_uniform_x", {value0: bound(data.r)});
    if (finite(data.epsilon) && !isUniformEpsilon(data.epsilon)) return message("invalid_uniform_epsilon", {value0: bound(UNIFORM_EPSILON_MIN), value1: bound(UNIFORM_EPSILON_MAX)});
    if (data.supremumVisible !== undefined && typeof data.supremumVisible !== "boolean") return message("invalid_uniform_visibility");
    return undefined;
};
const complexCoordinateFields = ["zRe", "zIm", "wRe", "wIm"] as const;
const complexVisibilityFields = ["productVisible", "anglesVisible"] as const;
const diagnoseComplex: Diagnosis = data => {
    if (!isComplexExampleId(data.example)) return message("invalid_complex_example", {value0: COMPLEX_EXAMPLE_IDS.join(", ")});
    for (const field of complexCoordinateFields) {
        if (finite(data[field]) && !isComplexCoordinate(data[field])) {
            return message("invalid_complex_coordinate", {value0: field, value1: bound(COMPLEX_COORDINATE_MIN), value2: bound(COMPLEX_COORDINATE_MAX)});
        }
    }
    for (const field of complexVisibilityFields) {
        if (typeof data[field] !== "boolean" && data[field] !== undefined) return message("invalid_complex_visibility", {value0: field});
    }
    return undefined;
};
const diagnoseFixedPoint: Diagnosis = data => {
    if (!isFixedPointExampleId(data.example)) return message("invalid_fixed_point_example", {value0: FIXED_POINT_EXAMPLE_IDS.join(", ")});
    const example = fixedPointExample(data.example);
    if (finite(data.x0) && !isFixedPointStart(data.example, data.x0)) {
        return message("invalid_fixed_point_x0", {value0: data.example, value1: bound(example.a), value2: bound(example.b)});
    }
    if (finite(data.step) && !isFixedPointStepCount(data.step)) return message("invalid_fixed_point_step", {value0: FIXED_POINT_MAX_STEPS});
    if (finite(data.digits) && !isFixedPointDigits(data.digits)) return message("invalid_fixed_point_digits", {value0: FIXED_POINT_MIN_DIGITS, value1: FIXED_POINT_MAX_DIGITS});
    if (data.boundVisible !== undefined && typeof data.boundVisible !== "boolean") return message("invalid_fixed_point_visibility");
    return undefined;
};

/**
 * A function Demonstration stores its validated model object as Preset data. The model parser decides validity; the
 * diagnosis only explains a rejection the parser made.
 */
function functionCollection<M>(key: string, parse: (data: unknown) => M | undefined, diagnose?: Diagnosis): PresetCollection<M> {
    return Object.freeze({
        key,
        check(data: unknown): PresetDataCheck<M> {
            const model = parse(data);
            if (model !== undefined) return {data: model};
            return {rejection: (isRecord(data) ? diagnose?.(data) : undefined) ?? message("invalid_function_data")};
        },
    });
}

/** The Preset collections of the function, Analysis and complex Demonstrations (`BaseFunctionGraph`), by Demonstration id. */
export const functionPresetCollections = {
    "linear-function": functionCollection("linear-function", parseLinearModel),
    "exponential-function": functionCollection("exponential-function", parseExponentialModel),
    "trigonometric-functions": functionCollection("trigonometric-function", parseTrigonometricModel),
    continuity: functionCollection("piecewise-continuity", parseContinuityModel),
    derivative: functionCollection("derivative", parseDerivativeModel),
    "definite-integral": functionCollection("definite-integral", parseRiemannModel),
    "area-between-curves": functionCollection("area-between-curves", parseAreaBetweenModel),
    "arc-length": functionCollection("arc-length", parseArcLengthModel),
    bisection: functionCollection("bisection", parseBisectionModel, diagnoseBisection),
    "mean-value": functionCollection("mean-value", parseMeanValueModel, diagnoseMeanValue),
    accumulation: functionCollection("accumulation", parseAccumulationModel, diagnoseAccumulation),
    darboux: functionCollection("darboux", parseDarbouxModel, diagnoseDarboux),
    extrema: functionCollection("extrema", parseExtremaModel, diagnoseExtrema),
    convexity: functionCollection("convexity", parseConvexityModel, diagnoseConvexity),
    taylor: functionCollection("taylor", parseTaylorModel, diagnoseTaylor),
    sequence: functionCollection("sequence", parseSequenceModel, diagnoseSequence),
    "uniform-convergence": functionCollection("uniform-convergence", parseUniformConvergenceModel, diagnoseUniformConvergence),
    "complex-multiplication": functionCollection("complex-multiplication", parseComplexModel, diagnoseComplex),
    "fixed-point": functionCollection("fixed-point", parseFixedPointModel, diagnoseFixedPoint),
} as const;
