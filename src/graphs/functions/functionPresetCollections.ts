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
import {checkRootFindingModel, parseRootFindingModel} from "../../analysis/rootFindingModel";
import {rootFindingFileMessage} from "./rootFindingMessages";
import {checkMeanValueModel, parseMeanValueModel} from "../../analysis/meanValueModel";
import {meanValueFileMessage} from "./meanValueMessages";
import {checkExtremaModel, parseExtremaModel} from "../../analysis/extremaModel";
import {extremaFileMessage} from "./extremaMessages";
import {sequenceFileMessage} from "./sequenceMessages";
import {checkConvexityModel, parseConvexityModel} from "../../analysis/convexityModel";
import {convexityFileMessage} from "./convexityMessages";
import {checkTaylorModel, parseTaylorModel} from "../../analysis/taylorModel";
import {taylorFileMessage} from "./taylorMessages";
import {checkFixedPointModel, parseFixedPointModel} from "../../analysis/fixedPointModel";
import {fixedPointFileMessage} from "./fixedPointMessages";
import {checkUniformConvergenceModel, parseUniformConvergenceModel} from "../../analysis/uniformConvergenceModel";
import {uniformConvergenceFileMessage} from "./uniformConvergenceMessages";
import {checkFourierSeriesModel, parseFourierSeriesModel} from "../../analysis/fourierSeriesModel";
import {fourierSeriesFileMessage} from "./fourierSeriesMessages";
import {checkComplexModel, parseComplexModel} from "../../analysis/complexModel";
import {complexFileMessage} from "../complex/complexMessages";
import {checkSequenceModel, parseSequenceModel} from "../../analysis/sequenceModel";
import {checkDarbouxModel, parseDarbouxModel} from "../../analysis/darbouxModel";
import {darbouxFileMessage} from "./darbouxMessages";
import {checkAccumulationModel, parseAccumulationModel} from "../../analysis/accumulationModel";
import {accumulationFileMessage} from "./accumulationMessages";
import {checkFunctionTransformationModel, parseFunctionTransformationModel} from "../../analysis/functionTransformationModel";
import {functionTransformationFileMessage} from "./functionTransformationMessages";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";

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
/** The model module names the rule a rejected root-finding model broke; this only localizes it. */
const diagnoseRootFinding: Diagnosis = data => {
    const check = checkRootFindingModel(data);
    return check.ok || check.issue === undefined ? undefined : rootFindingFileMessage(check.issue);
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
/** The model module names the rule a rejected uniform convergence model broke; this only localizes it. */
const diagnoseUniformConvergence: Diagnosis = data => {
    const check = checkUniformConvergenceModel(data);
/** The model module names the rule a rejected Fourier series model broke; this only localizes it. */
const diagnoseFourierSeries: Diagnosis = data => {
    const check = checkFourierSeriesModel(data);
    return check.ok || check.issue === undefined ? undefined : fourierSeriesFileMessage(check.issue);
};
    return check.ok || check.issue === undefined ? undefined : uniformConvergenceFileMessage(check.issue);
};
const diagnoseComplex: Diagnosis = data => {
    const check = checkComplexModel(data);
    return check.ok || check.issue === undefined ? undefined : complexFileMessage(check.issue);
};
/** The model module names the rule a rejected fixed-point model broke; this only localizes it. */
const diagnoseFixedPoint: Diagnosis = data => {
    const check = checkFixedPointModel(data);
    return check.ok || check.issue === undefined ? undefined : fixedPointFileMessage(check.issue);
};

/** The model module names the rule a rejected transformation model broke; this only localizes it. */
const diagnoseFunctionTransformation: Diagnosis = data => {
    const check = checkFunctionTransformationModel(data);
    return check.ok || check.issue === undefined ? undefined : functionTransformationFileMessage(check.issue);
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
    "root-finding": functionCollection("root-finding", parseRootFindingModel, diagnoseRootFinding),
    "mean-value": functionCollection("mean-value", parseMeanValueModel, diagnoseMeanValue),
    "fourier-series": functionCollection("fourier-series", parseFourierSeriesModel, diagnoseFourierSeries),
    accumulation: functionCollection("accumulation", parseAccumulationModel, diagnoseAccumulation),
    darboux: functionCollection("darboux", parseDarbouxModel, diagnoseDarboux),
    extrema: functionCollection("extrema", parseExtremaModel, diagnoseExtrema),
    convexity: functionCollection("convexity", parseConvexityModel, diagnoseConvexity),
    taylor: functionCollection("taylor", parseTaylorModel, diagnoseTaylor),
    sequence: functionCollection("sequence", parseSequenceModel, diagnoseSequence),
    "uniform-convergence": functionCollection("uniform-convergence", parseUniformConvergenceModel, diagnoseUniformConvergence),
    "complex-multiplication": functionCollection("complex-multiplication", parseComplexModel, diagnoseComplex),
    "fixed-point": functionCollection("fixed-point", parseFixedPointModel, diagnoseFixedPoint),
    "function-transformation": functionCollection("function-transformation", parseFunctionTransformationModel, diagnoseFunctionTransformation),
} as const;
