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
import {checkQuadratureModel, parseQuadratureModel} from "../../analysis/quadratureModel";
import {checkEulerModel, EulerModel, parseEulerModel} from "../../analysis/eulerModel";
import {eulerFileMessage} from "./eulerMessages";
import {quadratureFileMessage} from "./quadratureMessages";
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
import {checkFourierCoefficientsModel, DEFAULT_FOURIER_COEFFICIENTS_MODEL, type FourierCoefficientsModel, parseFourierCoefficientsModel} from "../../analysis/fourierCoefficientsModel";
import {fourierCoefficientsFileMessage} from "./fourierCoefficientsMessages";
import {checkEpicycleModel, defaultEpicycleModel, type EpicycleModel, parseEpicycleModel} from "../../analysis/epicycleModel";
import {epicycleFileMessage} from "./epicycleMessages";
import {checkRungeModel, parseRungeModel} from "../../analysis/rungeInterpolationModel";
import {rungeFileMessage} from "./rungeInterpolationMessages";
import {checkLeastSquaresModel, DEFAULT_LEAST_SQUARES_MODEL, LeastSquaresModel, parseLeastSquaresModel} from "../../analysis/leastSquaresModel";
import {leastSquaresFileMessage} from "./leastSquaresMessages";
import {checkDensityAreaModel, parseDensityAreaModel} from "../../analysis/densityAreaModel";
import {checkBinomialNormalModel, parseBinomialNormalModel} from "../../analysis/binomialNormalModel";
import {binomialNormalFileMessage} from "./binomialNormalMessages";
import {checkCltModel, DEFAULT_CLT_MODEL, parseCltModel} from "../../analysis/cltModel";
import {cltFileMessage} from "./cltMessages";
import {checkSummaryModel, DEFAULT_SUMMARY_MODEL, parseSummaryModel} from "../../analysis/summaryStatisticsModel";
import {summaryFileMessage} from "./summaryStatisticsMessages";
import {checkCorrelationModel, DEFAULT_CORRELATION_MODEL, parseCorrelationModel} from "../../analysis/correlationModel";
import {correlationFileMessage} from "./correlationMessages";
import {densityAreaFileMessage} from "./densityAreaMessages";
import {checkSequenceModel, parseSequenceModel} from "../../analysis/sequenceModel";
import {checkDarbouxModel, parseDarbouxModel} from "../../analysis/darbouxModel";
import {darbouxFileMessage} from "./darbouxMessages";
import {checkAccumulationModel, parseAccumulationModel} from "../../analysis/accumulationModel";
import {accumulationFileMessage} from "./accumulationMessages";
import {checkFunctionTransformationModel, parseFunctionTransformationModel} from "../../analysis/functionTransformationModel";
import {functionTransformationFileMessage} from "./functionTransformationMessages";
import {checkFunctionInverseModel, parseFunctionInverseModel} from "../../analysis/functionInverseModel";
import {functionInverseFileMessage} from "./functionInverseMessages";
import {checkPolynomialZerosModel, parsePolynomialZerosModel, PolynomialZerosModel} from "../../analysis/polynomialZerosModel";
import {checkRationalFunctionModel, parseRationalFunctionModel, RationalFunctionModel} from "../../analysis/rationalFunctionModel";
import {checkZeroList} from "../../analysis/zeroListModel";
import {rationalFunctionFileMessage} from "./rationalFunctionMessages";
import {checkGeometricSeriesModel, parseGeometricSeriesModel} from "../../analysis/geometricSeriesModel";
import {geometricSeriesFileMessage} from "./geometricSeriesMessages";
import {checkConicFocalModel, parseConicFocalModel, type ConicFocalModel} from "../../analysis/conicFocalModel";
import {conicFocalFileMessage} from "./conicFocalMessages";
import {polynomialZerosFileMessage} from "./polynomialZerosMessages";
import {zeroListFileMessage} from "./zeroListMessages";
import {checkSceneState, isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";

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
/** The model module names the rule a rejected quadrature model broke; this only localizes it. */
const diagnoseQuadrature: Diagnosis = data => {
    const check = checkQuadratureModel(data);
    return check.ok || check.issue === undefined ? undefined : quadratureFileMessage(check.issue);
};
/** The model module names the rule a rejected Euler model broke; this only localizes it. */
const diagnoseEuler: Diagnosis = data => {
    const check = checkEulerModel(data);
    return check.ok || check.issue === undefined ? undefined : eulerFileMessage(check.issue);
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
    return check.ok || check.issue === undefined ? undefined : uniformConvergenceFileMessage(check.issue);
};
/** The model module names the rule a rejected Fourier series model broke; this only localizes it. */
const diagnoseFourierSeries: Diagnosis = data => {
    const check = checkFourierSeriesModel(data);
    return check.ok || check.issue === undefined ? undefined : fourierSeriesFileMessage(check.issue);
};
/** The model module names the rule a rejected Fourier coefficients model broke; this only localizes it. */
const diagnoseFourierCoefficients: Diagnosis = data => {
    const check = checkFourierCoefficientsModel(data);
    return check.ok || check.issue === undefined ? undefined : fourierCoefficientsFileMessage(check.issue);
};
/**
 * The Fourier coefficients scene state holds the model, whose `values`, `selected` and `selections` the shared flat scene-state
 * rule rejects. Whenever any model field is present, the model fields are checked together by the model's own rules (missing
 * fields take the defaults), so a scalar-only state such as `{scale: "x"}` is rejected too; the remaining fields go through
 * `checkSceneState`. The model itself is still restored from the Preset data.
 */
const FOURIER_COEFFICIENTS_FIELDS = Object.keys(DEFAULT_FOURIER_COEFFICIENTS_MODEL) as (keyof FourierCoefficientsModel)[];
const fourierCoefficientsCollection = (): PresetCollection<FourierCoefficientsModel> => {
    const base = functionCollection("fourier-coefficients", parseFourierCoefficientsModel, diagnoseFourierCoefficients);
    return Object.freeze({
        ...base,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const rest = Object.fromEntries(Object.entries(graphState).filter(([key]) => !["values", "selected", "selections"].includes(key)));
            const present = Object.fromEntries(FOURIER_COEFFICIENTS_FIELDS.filter(field => graphState[field] !== undefined).map(field => [field, graphState[field]]));
            if (Object.keys(present).length > 0) {
                const check = checkFourierCoefficientsModel({...DEFAULT_FOURIER_COEFFICIENTS_MODEL, ...present});
                if (!check.ok) return check.issue === undefined ? message("invalid_state") : fourierCoefficientsFileMessage(check.issue);
            }
            return checkSceneState(rest);
        },
    });
};
/** The model module names the rule a rejected Runge interpolation model broke; this only localizes it. */
const diagnoseRunge: Diagnosis = data => {
    const check = checkRungeModel(data);
    return check.ok || check.issue === undefined ? undefined : rungeFileMessage(check.issue);
};
/** The model module names the rule a rejected least-squares model broke; this only localizes it. */
const diagnoseLeastSquares: Diagnosis = data => {
    const check = checkLeastSquaresModel(data);
    return check.ok || check.issue === undefined ? undefined : leastSquaresFileMessage(check.issue);
};
/**
 * The function graph stores its model in the scene state too, and the least-squares model has a `points` list, which the shared
 * flat scene-state rule rejects. The list is checked by the model's own point rules (any valid list, degree 1); the other
 * fields go through `checkSceneState`. The model itself is still restored from the Preset data.
 */
const leastSquaresCollection = (): PresetCollection<LeastSquaresModel> => {
    const base = functionCollection("interp-least-squares", parseLeastSquaresModel, diagnoseLeastSquares);
    return Object.freeze({
        ...base,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {points, ...rest} = graphState;
            if (points !== undefined) {
                const check = checkLeastSquaresModel({...DEFAULT_LEAST_SQUARES_MODEL, degree: 1, points});
                if (!check.ok) return check.issue === undefined ? message("invalid_state") : leastSquaresFileMessage(check.issue);
            }
            return checkSceneState(rest);
        },
    });
};
/** The model module names the rule a rejected density-area model broke; this only localizes it. */
const diagnoseDensityArea: Diagnosis = data => {
    const check = checkDensityAreaModel(data);
    return check.ok || check.issue === undefined ? undefined : densityAreaFileMessage(check.issue);
};
/** The model module names the rule a rejected binomial-normal model broke; this only localizes it. */
const diagnoseBinomialNormal: Diagnosis = data => {
    const check = checkBinomialNormalModel(data);
    return check.ok || check.issue === undefined ? undefined : binomialNormalFileMessage(check.issue);
};

/** The model module names the rule a rejected central-limit-theorem model broke; this only localizes it. */
const diagnoseClt: Diagnosis = data => {
    const check = checkCltModel(data);
    return check.ok || check.issue === undefined ? undefined : cltFileMessage(check.issue);
};

/** As for least squares: the CLT model's `heights` list is checked by the model's own rules, the other fields by `checkSceneState`. */
const checkCltGraphState = (graphState: unknown): Message | undefined => {
    if (!isRecord(graphState)) return message("invalid_state");
    const {heights, ...rest} = graphState;
    if (heights !== undefined) {
        const check = checkCltModel({...DEFAULT_CLT_MODEL, heights});
        if (!check.ok) return check.issue === undefined ? message("invalid_state") : cltFileMessage(check.issue);
    }
    return checkSceneState(rest);
};
const diagnoseSummary: Diagnosis = data => {
    const check = checkSummaryModel(data);
    return check.ok || check.issue === undefined ? undefined : summaryFileMessage(check.issue);
};

/** As for the CLT: the summary model's `values` list is checked by the model's own rules, the other fields by `checkSceneState`. */
const checkSummaryGraphState = (graphState: unknown): Message | undefined => {
    if (!isRecord(graphState)) return message("invalid_state");
    const {values, ...rest} = graphState;
    if (values !== undefined) {
        const check = checkSummaryModel({...DEFAULT_SUMMARY_MODEL, values});
        if (!check.ok) return check.issue === undefined ? message("invalid_state") : summaryFileMessage(check.issue);
    }
    return checkSceneState(rest);
};
const diagnoseCorrelation: Diagnosis = data => {
    const check = checkCorrelationModel(data);
    return check.ok || check.issue === undefined ? undefined : correlationFileMessage(check.issue);
};

/** As for the summary: the correlation model's `points` list is checked by the model's own rules, the other fields by `checkSceneState`. */
const checkCorrelationGraphState = (graphState: unknown): Message | undefined => {
    if (!isRecord(graphState)) return message("invalid_state");
    const {points, ...rest} = graphState;
    if (points !== undefined) {
        const check = checkCorrelationModel({...DEFAULT_CORRELATION_MODEL, points});
        if (!check.ok) return check.issue === undefined ? message("invalid_state") : correlationFileMessage(check.issue);
    }
    return checkSceneState(rest);
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

/** The model module names the rule a rejected inverse-function model broke; this only localizes it. */
const diagnoseFunctionInverse: Diagnosis = data => {
    const check = checkFunctionInverseModel(data);
    return check.ok || check.issue === undefined ? undefined : functionInverseFileMessage(check.issue);
};

/** The model module names the rule a rejected polynomial-zeros model broke; this only localizes it. */
const diagnosePolynomialZeros: Diagnosis = data => {
    const check = checkPolynomialZerosModel(data);
    return check.ok || check.issue === undefined ? undefined : polynomialZerosFileMessage(check.issue);
};

/**
 * The polynomial-zeros graph stores its model in the scene state too, and the model has a `zeros` list, which the shared flat
 * scene-state rule rejects. The list is checked by the zero list rules; the other fields go through `checkSceneState`. The model
 * itself is still restored from the Preset data.
 */
const polynomialZerosCollection = (): PresetCollection<PolynomialZerosModel> => {
    const base = functionCollection("polynomial-zeros", parsePolynomialZerosModel, diagnosePolynomialZeros);
    return Object.freeze({
        ...base,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {zeros, ...rest} = graphState;
            if (zeros !== undefined) {
                const check = checkZeroList(zeros);
                if (!check.ok) return check.issue === undefined ? message("invalid_state") : zeroListFileMessage(check.issue);
            }
            return checkSceneState(rest);
        },
    });
};

/** The model module names the rule a rejected geometric-series model broke; this only localizes it. */
const diagnoseGeometricSeries = (data: unknown): Message | undefined => {
    const check = checkGeometricSeriesModel(data);
    return check.ok ? undefined : geometricSeriesFileMessage(check.issue);
};

/** The model module names the rule a rejected conic view broke; this only localizes it. */
const diagnoseConicFocal = (data: unknown): Message | undefined => {
    const check = checkConicFocalModel(data);
    return check.ok ? undefined : conicFocalFileMessage(check.issue);
};

const diagnoseRationalFunction: Diagnosis = data => {
    const check = checkRationalFunctionModel(data);
    return check.ok || check.issue === undefined ? undefined : rationalFunctionFileMessage(check.issue);
};

/** Like the polynomial-zeros collection, with two zero lists (`numerator`, `denominator`) in the scene state. */
const rationalFunctionCollection = (): PresetCollection<RationalFunctionModel> => {
    const base = functionCollection("rational-function", parseRationalFunctionModel, diagnoseRationalFunction);
    return Object.freeze({
        ...base,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {numerator, denominator, ...rest} = graphState;
            for (const list of [numerator, denominator]) {
                if (list === undefined) continue;
                const check = checkZeroList(list);
                if (!check.ok) return check.issue === undefined ? message("invalid_state") : zeroListFileMessage(check.issue);
            }
            return checkSceneState(rest);
        },
    });
};

/**
 * A function Demonstration stores its validated model object as Preset data. The model parser decides validity; the
 * diagnosis only explains a rejection the parser made.
 */
export function functionCollection<M>(key: string, parse: (data: unknown) => M | undefined, diagnose?: Diagnosis,
                                diagnoseAny?: (data: unknown) => Message | undefined): PresetCollection<M> {
    return Object.freeze({
        key,
        check(data: unknown): PresetDataCheck<M> {
            const model = parse(data);
            if (model !== undefined) return {data: model};
            return {rejection: (diagnoseAny?.(data) ?? (isRecord(data) ? diagnose?.(data) : undefined)) ?? message("invalid_function_data")};
        },
    });
}

/**
 * The conic collection: the stored scene state mirrors the model, whose `weight` is null while the matched weight is used. The
 * general scene check accepts only numbers, booleans and strings, so a null weight is allowed here and the rest is checked as
 * usual; the Preset data stays authoritative.
 */
function conicFocalCollection(): PresetCollection<ConicFocalModel> {
    const base = functionCollection("conic-focal", parseConicFocalModel, undefined, diagnoseConicFocal);
    return Object.freeze({
        ...base,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {weight, ...rest} = graphState;
            if (weight !== undefined && weight !== null && typeof weight !== "number") return message("invalid_value", {value0: "weight"});
            return checkSceneState(rest);
        },
    });
}

/**
 * The Euler collection: the stored scene state mirrors the model, whose `revealed` is null while all steps show. The general scene
 * check accepts only numbers, booleans and strings, so null is allowed here and the rest is checked as usual; the Preset data
 * stays authoritative (`figurePresetGraphState`).
 */
function eulerCollection(): PresetCollection<EulerModel> {
    const base = functionCollection("euler", parseEulerModel, diagnoseEuler);
    return Object.freeze({
        ...base,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {revealed, ...rest} = graphState;
            if (revealed !== undefined && revealed !== null && typeof revealed !== "number") return message("invalid_value", {value0: "revealed"});
            return checkSceneState(rest);
        },
    });
}

/** The model module names the rule a rejected epicycle model broke; this only localizes it. */
const diagnoseEpicycle: Diagnosis = data => {
    const check = checkEpicycleModel(data);
    return check.ok || check.issue === undefined ? undefined : epicycleFileMessage(check.issue);
};
/**
 * The epicycle scene state holds the model, whose `vertices` and `spans` lists the shared flat scene-state rule rejects. Whenever
 * any model field is present, the fields are checked together by the model's own rules (missing fields take the default example),
 * and the remaining fields go through `checkSceneState`. The model itself is still restored from the Preset data. Not yet in the
 * Demonstration map below: the route and the catalog entry come later.
 */
const EPICYCLE_FIELDS: readonly string[] = Object.keys(defaultEpicycleModel());
export const epicyclePresetCollection: PresetCollection<EpicycleModel> = (() => {
    const base = functionCollection("epicycle", parseEpicycleModel, diagnoseEpicycle);
    return Object.freeze({
        ...base,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const rest = Object.fromEntries(Object.entries(graphState).filter(([key]) => !EPICYCLE_FIELDS.includes(key)));
            const present = Object.fromEntries(EPICYCLE_FIELDS.filter(field => graphState[field] !== undefined).map(field => [field, graphState[field]]));
            if (Object.keys(present).length > 0) {
                const check = checkEpicycleModel({...defaultEpicycleModel(), ...present});
                if (!check.ok) return check.issue === undefined ? message("invalid_state") : epicycleFileMessage(check.issue);
            }
            return checkSceneState(rest);
        },
    });
})();

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
    quadrature: functionCollection("quadrature", parseQuadratureModel, diagnoseQuadrature),
    euler: eulerCollection(),
    "mean-value": functionCollection("mean-value", parseMeanValueModel, diagnoseMeanValue),
    accumulation: functionCollection("accumulation", parseAccumulationModel, diagnoseAccumulation),
    darboux: functionCollection("darboux", parseDarbouxModel, diagnoseDarboux),
    extrema: functionCollection("extrema", parseExtremaModel, diagnoseExtrema),
    convexity: functionCollection("convexity", parseConvexityModel, diagnoseConvexity),
    taylor: functionCollection("taylor", parseTaylorModel, diagnoseTaylor),
    sequence: functionCollection("sequence", parseSequenceModel, diagnoseSequence),
    "uniform-convergence": functionCollection("uniform-convergence", parseUniformConvergenceModel, diagnoseUniformConvergence),
    "fourier-series": functionCollection("fourier-series", parseFourierSeriesModel, diagnoseFourierSeries),
    "fourier-coefficients": fourierCoefficientsCollection(),
    epicycles: epicyclePresetCollection,
    "interp-runge": functionCollection("interp-runge", parseRungeModel, diagnoseRunge),
    "interp-least-squares": leastSquaresCollection(),
    "prob-density": functionCollection("prob-density", parseDensityAreaModel, diagnoseDensityArea),
    "prob-binomial-normal": functionCollection("prob-binomial-normal", parseBinomialNormalModel, diagnoseBinomialNormal),
    "prob-clt": Object.freeze({...functionCollection("prob-clt", parseCltModel, diagnoseClt), checkGraphState: checkCltGraphState}),
    "prob-summary": Object.freeze({...functionCollection("prob-summary", parseSummaryModel, diagnoseSummary), checkGraphState: checkSummaryGraphState}),
    "prob-correlation": Object.freeze({...functionCollection("prob-correlation", parseCorrelationModel, diagnoseCorrelation), checkGraphState: checkCorrelationGraphState}),
    "fixed-point": functionCollection("fixed-point", parseFixedPointModel, diagnoseFixedPoint),
    "function-transformation": functionCollection("function-transformation", parseFunctionTransformationModel, diagnoseFunctionTransformation),
    "polynomial-zeros": polynomialZerosCollection(),
    "rational-function": rationalFunctionCollection(),
    "function-inverse": functionCollection("function-inverse", parseFunctionInverseModel, diagnoseFunctionInverse),
    "geometric-series": functionCollection("geometric-series", parseGeometricSeriesModel, undefined, diagnoseGeometricSeries),
    "conic-focal": conicFocalCollection(),
} as const;
