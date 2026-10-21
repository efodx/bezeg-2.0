/**
 * The curve family's Preset collection rules: shared DTO rules per curve type, the curve type and count each collection
 * expects, and the G1 shape parameters. Exercised both directly (the graph's import) and through the file importer.
 */
import {preflightPresetImport} from "../base/presets/PresetImport";
import {LocalizedError, Message} from "../../localization";
import {curvePresetCollections, legacyCurvePresetCollections} from "./curvePresetCollections";
beforeEach(() => localStorage.clear());

const preflightRejection = (key: string, data: unknown): Message | undefined => {
    try {
        preflightPresetImport(JSON.stringify({[`preset-${key}`]: {data: [{id: "stored", data}]}}));
        return undefined;
    } catch (error) {
        if (!(error instanceof LocalizedError)) throw error;
        const detail = error.description.params.value0;
        return typeof detail === "object" ? detail : undefined;
    }
};

test.each([
    {data: []},
    {data: [["JSXBezierCurve", {points: [[0, 0], [1, 1]]}]]},
    {data: [["JSXPHBezierCurve", {points: [[0, 0]], hodographs: [[1, 0], [1, 1], [0, 1]]}]]},
    {data: [["JSXPHBezierCurve", {points: [[0, 0]], hodographs: [[1, 0], [1, 1]], state: {}}]]}
])("rejects data that would fail the cubic PH demonstration: %j", invalid => {
    expect(() => preflightPresetImport(JSON.stringify({"preset-cubic-ph": {data: [{id: "PH", ...invalid}]}}))).toThrow();
    expect(localStorage.length).toBe(0);
});

test("supports exported PH state with the historically optional lines flag absent", () => {
    const ph = {points: [[0, 0]], hodographs: [[1, 0], [1, 1]], state: {
        showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false,
        subdivisionT: .5, decasteljauT: .5, extrapolationT: 1.2, showingDecasteljauScheme: false,
        offsetCurveNumber: 1, d: .2, showOffsetCurve: false, showOffsetCurveControlPoints: false
    }};
    expect(() => preflightPresetImport(JSON.stringify({"preset-cubic-ph": {data: [{id: "PH", data: [["JSXPHBezierCurve", ph]]}]}}))).not.toThrow();
});

const g1State = (b: unknown) => ({showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, b});
const g1Points = [[-4, -1], [-2, 2], [0, 0], [2, -2], [4, 1]];

test.each([curvePresetCollections["spline-g1"], curvePresetCollections["spline-g1-symmetric"], legacyCurvePresetCollections[0]])
    ("%s: a G1 spline stores one positive shape parameter b per junction", collection => {
        const type = collection.key === "g1-symmetric-spline-graph" ? "JSXSymmetricQuadraticG1SplineCurve" : "JSXQuadraticG1SplineCurve";
        const valid = [[type, {points: g1Points, state: g1State([1, 0.5])}]];
        expect(collection.check(valid)).toEqual({data: valid});
        expect(preflightRejection(collection.key, valid)).toBeUndefined();
        for (const b of [[1], [1, 0.5, 2], [1, 0], [1, -0.5], [1, "2"], [1, null], 1]) {
            const invalid = [[type, {points: g1Points, state: g1State(b)}]];
            expect(collection.check(invalid), JSON.stringify(b)).toEqual({rejection: {key: "invalid_g1_spline_parameters", params: {}}});
            expect(preflightRejection(collection.key, invalid)).toEqual({key: "invalid_g1_spline_parameters", params: {}});
        }
    });

test("only G1 splines store an array in their curve state", () => {
    const data = [["JSXQubicC2SplineCurve", {points: g1Points, state: g1State([1, 0.5])}]];
    expect(curvePresetCollections["spline-c2"].check(data)).toEqual({rejection: {key: "invalid_value", params: {value0: "b"}}});
});

test.each([
    ["bezier", [["JSXRationalBezierCurve", {points: [[0, 0], [1, 1]], weights: [1, 1]}]], "curve_type_does_not_match_collection"],
    ["rational", [["JSXRationalBezierCurve", {points: [[0, 0], [1, 1]], weights: [1]}]], "weights_do_not_match_the_points"],
    ["spline-cn", [["JSXGenericSplineCurve", {points: [[0, 0], [1, 1]], degree: 2, continuity: 2}]], "invalid_spline_degree_or_continuity"],
    ["ph-quintic", [["JSXPHBezierCurve", {points: [[0, 0]], hodographs: [[1, 0], [1, 1]]}]], "ph_preset_has_an_incorrect_degree_or_number_of_curves"],
    ["bezier", [], "preset_has_no_curve"],
    ["bezier", "[]", "invalid_curve_data"],
] as const)("%s: the graph's import and the file importer reject %j with the same diagnosis", (id, data, key) => {
    const checked = curvePresetCollections[id].check(data);
    expect("rejection" in checked && checked.rejection.key).toBe(key);
    expect(preflightRejection(curvePresetCollections[id].key, data)).toEqual("rejection" in checked ? checked.rejection : undefined);
});

test("the Bernstein collection may hold no curves: its scene is its scene state", () => {
    expect(curvePresetCollections.bernstein.check([])).toEqual({data: []});
});

test("a shorter curve state written before the full state loads: missing display switches read as off", () => {
    const seeded = [["JSXRationalBezierCurve", {points: [[-4, -3], [-3, 3], [3, 3], [4, -3]], weights: [1, 2, 1, 1],
        state: {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, subdivisionT: 0.5,
            extrapolationT: 1.2, showingWeights: false, weightNumber: 1, showingFarinPoints: true}}]];
    expect(curvePresetCollections["rational-elevation"].check(seeded)).toEqual({data: seeded});
    expect(preflightRejection("rational-bezier-elevation", seeded)).toBeUndefined();
    const withoutParameter = [["JSXBezierCurve", {points: [[0, 0], [1, 1]], state: {subdivisionT: 0.5, extrapolationT: 1.2}}]];
    expect(curvePresetCollections.bezier.check(withoutParameter)).toEqual({rejection: {key: "incomplete_curve_state", params: {}}});
});
