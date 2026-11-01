import {message, Message} from "../../localization";
import {parseLinearModel} from "../../analysis/linearModel";
import {parseExponentialModel} from "../../analysis/exponentialModel";
import {parseTrigonometricModel} from "../../analysis/trigonometricModel";
import {parseContinuityModel} from "../../analysis/continuityModel";
import {parseDerivativeModel} from "../../analysis/derivativeModel";
import {parseRiemannModel} from "../../analysis/riemannModel";
import {parseAreaBetweenModel} from "../../analysis/areaBetweenModel";
import {parseArcLengthModel} from "../../analysis/arcLengthModel";
import {checkBisectionModel, parseBisectionModel} from "../../analysis/bisectionModel";
import {bisectionFileMessage} from "./bisectionMessages";
import {formatNumber} from "../../analysis/format";
import {checkMeanValueModel, parseMeanValueModel} from "../../analysis/meanValueModel";
import {meanValueFileMessage} from "./meanValueMessages";
import {checkExtremaModel, parseExtremaModel} from "../../analysis/extremaModel";
import {extremaFileMessage} from "./extremaMessages";
import {sequenceFileMessage} from "./sequenceMessages";
import {checkConvexityModel, parseConvexityModel} from "../../analysis/convexityModel";
import {convexityFileMessage} from "./convexityMessages";
import {checkTaylorModel, parseTaylorModel} from "../../analysis/taylorModel";
import {taylorFileMessage} from "./taylorMessages";
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
import {checkSequenceModel, parseSequenceModel} from "../../analysis/sequenceModel";
import {checkDarbouxModel, parseDarbouxModel} from "../../analysis/darbouxModel";
import {darbouxFileMessage} from "./darbouxMessages";
import {checkAccumulationModel, parseAccumulationModel} from "../../analysis/accumulationModel";
import {accumulationFileMessage} from "./accumulationMessages";
import {isFiniteNumber as finite, isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";

/** A range bound as the file contract shows it (an integer, so the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");
/**
 * Function-demonstration data that the collection's parser rejected: the most specific actionable message for the main failure
 * classes of each collection, or undefined to keep the generic invalid_function_data message (wrong type, missing fields, NaN).
 */
type Diagnosis = (data: Readonly<Record<string, unknown>>) => Message | undefined;
/** The model module names the rule a rejected bisection model broke; this only localizes it. */
const diagnoseBisection: Diagnosis = data => {
    const check = checkBisectionModel(data);
    return check.ok || check.issue === undefined ? undefined : bisectionFileMessage(check.issue);
};
const diagnoseMeanValue: Diagnosis = data => {
    const check = checkMeanValueModel(data);
    return check.ok || check.issue === undefined ? undefined : meanValueFileMessage(check.issue);
};
const diagnoseAccumulation: Diagnosis = data => {
    const check = checkAccumulationModel(data);
    return check.ok || check.issue === undefined ? undefined : accumulationFileMessage(check.issue);
};
/** The model module names the rule a rejected Darboux model broke; this only localizes it. */
const diagnoseDarboux: Diagnosis = data => {
    const check = checkDarbouxModel(data);
    return check.ok || check.issue === undefined ? undefined : darbouxFileMessage(check.issue);
};
/** The model module names the rule a rejected extrema model broke; this only localizes it. */
const diagnoseExtrema: Diagnosis = data => {
    const check = checkExtremaModel(data);
    return check.ok || check.issue === undefined ? undefined : extremaFileMessage(check.issue);
};
/** The model module names the rule a rejected convexity model broke; this only localizes it. */
const diagnoseConvexity: Diagnosis = data => {
    const check = checkConvexityModel(data);
    return check.ok || check.issue === undefined ? undefined : convexityFileMessage(check.issue);
};
/** The model module names the rule a rejected Taylor model broke; this only localizes it. */
const diagnoseTaylor: Diagnosis = data => {
    const check = checkTaylorModel(data);
    return check.ok || check.issue === undefined ? undefined : taylorFileMessage(check.issue);
};
/** The model module names the rule a rejected sequence model broke; this only localizes it. */
const diagnoseSequence: Diagnosis = data => {
    const check = checkSequenceModel(data);
    return check.ok || check.issue === undefined ? undefined : sequenceFileMessage(check.issue);
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
