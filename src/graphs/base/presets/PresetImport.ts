import {message, LocalizedError, Message} from "../../../localization";
import {parseLinearModel} from "../../../analysis/linearModel";
import {parseExponentialModel} from "../../../analysis/exponentialModel";
import {parseTrigonometricModel} from "../../../analysis/trigonometricModel";
import {parseContinuityModel} from "../../../analysis/continuityModel";
import {parseDerivativeModel} from "../../../analysis/derivativeModel";
import {parseRiemannModel} from "../../../analysis/riemannModel";
import {parseAreaBetweenModel} from "../../../analysis/areaBetweenModel";
import {parseArcLengthModel} from "../../../analysis/arcLengthModel";
import {parseBisectionModel} from "../../../analysis/bisectionModel";
import {parseMeanValueModel} from "../../../analysis/meanValueModel";
// Existing collection keys and DTO names are a file contract, independent of the graph renderer.
const collectionIds = ["bernstein-graph", "bezier-curve", "decasteljau", "decasteljau2", "subdivision-1", "affine-transform", "elevation-graph",
    "bezier-extrapolation", "bezier-subdivision", "rational-bezier", "rational-bezier-farin", "rational-decasteljau",
    "rational-bezier-elevation", "rational-bezier-extrapolation", "rational-bezier-subdivision", "cubic-ph",
    "quintic-ph-graph", "c1-spline-graph", "c2-spline", "cn-spline", "g1-spline-graph",
    "g1-symmetric-spline-graph", "g1-spline", "alpha-param", "uniform-graph", "alfaparametrizacije", "linear-function", "exponential-function", "trigonometric-function", "piecewise-continuity", "derivative", "definite-integral", "area-between-curves", "arc-length", "bisection", "mean-value"];
// Function demonstrations store a validated model object, not a list of curves.
const functionModelParsers: Record<string, (data: unknown) => unknown> = {"preset-linear-function": parseLinearModel, "preset-exponential-function": parseExponentialModel,
    "preset-trigonometric-function": parseTrigonometricModel, "preset-piecewise-continuity": parseContinuityModel, "preset-derivative": parseDerivativeModel,
    "preset-definite-integral": parseRiemannModel, "preset-area-between-curves": parseAreaBetweenModel, "preset-arc-length": parseArcLengthModel, "preset-bisection": parseBisectionModel, "preset-mean-value": parseMeanValueModel};
const curveTypes = ["JSXBezierCurve", "JSXRationalBezierCurve", "JSXPHBezierCurve", "JSXGenericSplineCurve",
    "JSXQuadraticC1SplineCurve", "JSXQubicC2SplineCurve", "JSXQuadraticG1SplineCurve", "JSXSymmetricQuadraticG1SplineCurve"];
const isObject = (value: any): value is Record<string, any> => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: any) => typeof value === "number" && Number.isFinite(value);
/** Mean value data with numeric a, b and c that break a < c < b: the one function-data error that deserves its own explanation. */
const misorderedMeanValue = (data: any) => isObject(data) && [data.a, data.b, data.c].every(finite) && !(data.a < data.c && data.c < data.b);
const fail = (detail: Message): never => { throw new LocalizedError(message("unsupported_file_export_presets_from_bezeg_and_check_the_data", {value0: detail})); };
function points(value: any) {
    return Array.isArray(value) && value.length > 0 && value.every(point => Array.isArray(point) && point.length === 2 && point.every(finite));
}
function state(value: any) {
    if (!isObject(value)) { fail(message("invalid_state")); }
    Object.entries(value).forEach(([key, item]) => {
        if (typeof item === "number" && !finite(item)) { fail(message("invalid_number", {value0: key})); }
        if (/^(show|is|allow|hide|labelAll|curveSelected|initialized)/.test(key) && typeof item !== "boolean") { fail(message("invalid_option", {value0: key})); }
        if (typeof item !== "number" && typeof item !== "boolean" && typeof item !== "string") { fail(message("invalid_value", {value0: key})); }
        if (/^(subdivisionT|decasteljauT|extrapolationT|d|offsetCurveNumber|selectedCurveOption|n|degree|continuity|numberOfPoints|alpha|t|v)$/.test(key) && !finite(item)) { fail(message("invalid_parameter", {value0: key})); }
    });
    if (value.offsetCurveNumber !== undefined && (!Number.isInteger(value.offsetCurveNumber) || value.offsetCurveNumber < 1)) { fail(message("invalid_number_of_offsets")); }
    if (value.selectedCurveOption !== undefined && ![0, 1, 2].includes(value.selectedCurveOption)) { fail(message("invalid_editing_mode")); }
    if (value.n !== undefined && (!Number.isInteger(value.n) || value.n < 1)) {fail(message("invalid_polynomial_degree"));}
    if (value.numberOfPoints !== undefined && (!Number.isInteger(value.numberOfPoints) || value.numberOfPoints < 0)) {fail(message("invalid_number_of_points"));}
}
function curve(value: any) {
    if (!Array.isArray(value) || value.length !== 2 || !curveTypes.includes(value[0]) || !isObject(value[1])) { fail(message("unknown_curve_type")); }
    const [type, dto] = value;
    if (!points(dto.points)) { fail(message("control_points_must_be_pairs_of_finite_numbers")); }
    if (type === "JSXRationalBezierCurve" && (!Array.isArray(dto.weights) || dto.weights.length !== dto.points.length || !dto.weights.every(finite))) { fail(message("weights_do_not_match_the_points")); }
    if (type === "JSXPHBezierCurve" && (dto.points.length !== 1 || !points(dto.hodographs) || ![2, 3].includes(dto.hodographs.length))) { fail(message("invalid_ph_curve_hodograph")); }
    if (type === "JSXGenericSplineCurve" && (!Number.isInteger(dto.degree) || dto.degree < 1 || !Number.isInteger(dto.continuity) || dto.continuity < 0 || dto.continuity >= dto.degree)) { fail(message("invalid_spline_degree_or_continuity")); }
    if (dto.state !== undefined) { state(dto.state); }
    if (dto.state !== undefined) {
        const required = ["showingJxgPoints", "showingControlPolygon", "showingConvexHull"];
        if (["JSXBezierCurve", "JSXRationalBezierCurve", "JSXPHBezierCurve"].includes(type)) {
            required.push("subdivisionT", "decasteljauT", "extrapolationT", "showingDecasteljauScheme");
        }
        if (type === "JSXPHBezierCurve") {required.push("offsetCurveNumber", "d", "showOffsetCurve", "showOffsetCurveControlPoints");}
        if (required.some(key => dto.state[key] === undefined)) {fail(message("incomplete_curve_state"));}
    }
}

export type PresetImportPlan = {collections: Record<string, any>, replacements: string[]};
export function preflightPresetImport(contents: string, storage: Storage = window.localStorage): PresetImportPlan {
    let parsed: any;
    try { parsed = JSON.parse(contents); } catch { return fail(message("invalid_json")); }
    if (!isObject(parsed) || Object.keys(parsed).length === 0) { fail(message("missing_preset_collections")); }
    for (const [key, collection] of Object.entries(parsed as Record<string, any>)) {
        if (!collectionIds.some(id => key === `preset-${id}`)) { fail(message("unknown_collection", {value0: key})); }
        if (!isObject(collection) || !Array.isArray(collection.data)) { fail(message("invalid_collection", {value0: key})); }
        const names = new Set<string>();
        for (const preset of collection.data) {
            if (!isObject(preset) || typeof preset.id !== "string" || !preset.id.trim() || names.has(preset.id)) { fail(message("missing_or_duplicate_preset_name")); }
            names.add(preset.id);
            if (preset.boardState !== undefined) {
                const box = preset.boardState?.boundingBox;
                if (!Array.isArray(box) || box.length !== 4 || !box.every(finite) || box[0] >= box[2] || box[1] <= box[3]) { fail(message("invalid_graph_bounds")); }
            }
            if (preset.graphState !== undefined) { state(preset.graphState); }
            if (preset.data !== undefined && functionModelParsers[key]) {
                if (functionModelParsers[key](preset.data) === undefined) {
                    if (key === "preset-mean-value" && misorderedMeanValue(preset.data)) { fail(message("invalid_mean_value_order")); }
                    fail(message("invalid_function_data"));
                }
            } else if (preset.data !== undefined) {
                if (!Array.isArray(preset.data)) { fail(message("invalid_curve_data")); }
                preset.data.forEach(curve);
                if (key !== "preset-bernstein-graph" && preset.data.length === 0) {fail(message("preset_has_no_curve"));}
                const splineTypes: Record<string, string> = {
                    "preset-c1-spline-graph": "JSXQuadraticC1SplineCurve", "preset-c2-spline": "JSXQubicC2SplineCurve",
                    "preset-cn-spline": "JSXGenericSplineCurve", "preset-g1-spline-graph": "JSXQuadraticG1SplineCurve",
                    "preset-g1-symmetric-spline-graph": "JSXSymmetricQuadraticG1SplineCurve", "preset-g1-spline": "JSXQuadraticG1SplineCurve", "preset-alfaparametrizacije": "JSXQubicC2SplineCurve"
                };
                const expected = ["preset-cubic-ph", "preset-quintic-ph-graph", "preset-uniform-graph"].includes(key) ? "JSXPHBezierCurve"
                    : splineTypes[key] ?? (key.startsWith("preset-rational-") ? "JSXRationalBezierCurve" : "JSXBezierCurve");
                if (preset.data.some((entry: any) => entry[0] !== expected)) {fail(message("curve_type_does_not_match_collection", {value0: key}));}
                if (expected === "JSXPHBezierCurve" && (preset.data.length !== 1 || preset.data[0][1].hodographs.length !== (key === "preset-cubic-ph" ? 2 : 3))) {fail(message("ph_preset_has_an_incorrect_degree_or_number_of_curves"));}
            }
        }
    }
    return {collections: parsed, replacements: Object.keys(parsed).filter(key => storage.getItem(key) !== null)};
}

export function commitPresetImport(plan: PresetImportPlan, storage: Storage = window.localStorage) {
    // Revalidate at the write boundary, and restore the previous values if storage fails.
    const checked = preflightPresetImport(JSON.stringify(plan.collections), storage);
    const previous = Object.keys(checked.collections).map(key => [key, storage.getItem(key)] as const);
    try {
        Object.entries(checked.collections).forEach(([key, value]) => storage.setItem(key, JSON.stringify(value)));
    } catch {
        previous.forEach(([key, value]) => value === null ? storage.removeItem(key) : storage.setItem(key, value));
        throw new LocalizedError(message("cannot_save_presets_free_browser_storage_space_and_try_again"));
    }
}
