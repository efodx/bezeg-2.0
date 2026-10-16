import {commitPresetImport, preflightPresetImport} from "./PresetImport";
import {LocalizedError, setLanguage} from "../../../localization";
const collection = {data: [{id: "Učna krivulja", data: [["JSXBezierCurve", {points: [[0, 0], [1, 2], [3, 0]]}]],
    boardState: {boundingBox: [-5, 5, 5, -5]}, graphState: {initialized: true, selectedCurveOption: 0, curveSelected: false}}]};
const file = () => JSON.stringify({"preset-bezier-curve": collection});
beforeEach(() => localStorage.clear());
afterEach(() => setLanguage("sl"));

test("valid existing-format file imports without changing other storage", () => {
    localStorage.setItem("other-app", "keep");
    const plan = preflightPresetImport(file());
    expect(plan.replacements).toEqual([]);
    expect(localStorage.getItem("preset-bezier-curve")).toBeNull();
    commitPresetImport(plan);
    expect(JSON.parse(localStorage.getItem("preset-bezier-curve")!)).toEqual(collection);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

test("preflight lists replacement collections and does not write", () => {
    localStorage.setItem("preset-bezier-curve", "original");
    const plan = preflightPresetImport(file());
    expect(plan.replacements).toEqual(["preset-bezier-curve"]);
    expect(localStorage.getItem("preset-bezier-curve")).toBe("original");
});

test.each(["{", "[]", "{}", '{"unrelated":{"data":[]}}', '{"preset-bezier-curve":{"data":[{"id":"bad","data":[["unknown",{}]]}]}}',
    '{"preset-bezier-curve":{"data":[{"id":"bad","data":[["JSXBezierCurve",{"points":[["x",0]]}]]}]}}',
    '{"preset-bezier-curve":{"data":[{"id":"bad","data":[["JSXBezierCurve",{"points":[[1e999,0]]}]]}]}}'])
    ("invalid file fails without modifying storage: %s", contents => {
        localStorage.setItem("preset-bezier-curve", "original");
        expect(() => preflightPresetImport(contents)).toThrow();
        expect(localStorage.getItem("preset-bezier-curve")).toBe("original");
    });

test("all collections validate before any write", () => {
    const contents = JSON.stringify({"preset-bezier-curve": collection, "preset-cubic-ph": {data: [{id: "PH", data: [["JSXPHBezierCurve", {points: [[0, 0]], hodographs: [[1, 2]]}]]}]}});
    expect(() => preflightPresetImport(contents)).toThrow();
    expect(localStorage.length).toBe(0);
});

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

test("a failed storage write restores prior collections", () => {
    const values = new Map([["preset-bezier-curve", "original"]]);
    let writes = 0;
    const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { if (++writes === 2) { throw new Error("quota"); } values.set(key, value); },
        removeItem: (key: string) => values.delete(key)
    } as unknown as Storage;
    const plan = preflightPresetImport(JSON.stringify({"preset-bezier-curve": collection, "preset-cubic-ph": {data: []}}), storage);
    expect(() => commitPresetImport(plan, storage)).toThrow("Sprosti prostor");
    expect(values.get("preset-bezier-curve")).toBe("original");
    expect(values.has("preset-cubic-ph")).toBe(false);
});

const linearPreset = (data: unknown) => JSON.stringify({"preset-linear-function": {data: [{id: "Premica", boardState: {boundingBox: [-6, 8, 6, -4]},
    graphState: {initialized: true, x1: 0, y1: 1, x2: 2, y2: 5}, data}]}});

test("linear-function collection imports a model object and keeps other storage untouched", () => {
    const data = {x1: 0, y1: 1, x2: 2, y2: 5};
    localStorage.setItem("other-app", "keep");
    commitPresetImport(preflightPresetImport(linearPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-linear-function")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

test.each([[[]], [null], [{x1: 0, y1: 1, x2: 2}], [{x1: 0, y1: 1, x2: 2, y2: "5"}], [{x1: 0, y1: 1, x2: 2, y2: 1e9}],
    [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("linear-function collection rejects out-of-domain data without writing: %j", data => {
    expect(() => preflightPresetImport(linearPreset(data))).toThrow();
    expect(localStorage.length).toBe(0);
});

test("linear-function collection rejects graph state with a non-number coordinate", () => {
    const contents = JSON.stringify({"preset-linear-function": {data: [{id: "x", graphState: {initialized: true, x1: {}}}]}});
    expect(() => preflightPresetImport(contents)).toThrow();
});

const exponentialPreset = (data: unknown) => JSON.stringify({"preset-exponential-function": {data: [{id: "Osnova", boardState: {boundingBox: [-5, 9, 5, -3]},
    graphState: {initialized: true, a: 2, mirror: false}, data}]}});

test("exponential-function collection imports a model object and keeps other storage untouched", () => {
    const data = {a: 0.5, mirror: true};
    localStorage.setItem("other-app", "keep");
    commitPresetImport(preflightPresetImport(exponentialPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-exponential-function")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

test.each([[[]], [null], [{}], [{a: 0}], [{a: -2}], [{a: "2"}], [{a: 5.5}], [{a: 1e9}], [{a: 2, mirror: "yes"}],
    [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("exponential-function collection rejects out-of-domain data without writing: %j", data => {
    expect(() => preflightPresetImport(exponentialPreset(data))).toThrow();
    expect(localStorage.length).toBe(0);
});

const trigonometricPreset = (data: unknown) => JSON.stringify({"preset-trigonometric-function": {data: [{id: "Osnova", boardState: {boundingBox: [-7, 4, 7, -4]},
    graphState: {initialized: true, fn: "sin", A: 1, omega: 1, phi: 0, B: 0, reference: false}, data}]}});

test("trigonometric-function collection imports a model object and keeps other storage untouched", () => {
    const data = {fn: "tan", A: -2, omega: 0.5, phi: Math.PI / 2, B: 1, reference: true};
    localStorage.setItem("other-app", "keep");
    commitPresetImport(preflightPresetImport(trigonometricPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-trigonometric-function")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validTrig = {fn: "sin", A: 1, omega: 1, phi: 0, B: 0};
test.each([[[]], [null], [{}], [{...validTrig, fn: "sec"}], [{...validTrig, omega: 0}], [{...validTrig, omega: -1}], [{...validTrig, omega: 5}],
    [{...validTrig, A: 4}], [{...validTrig, A: "1"}], [{...validTrig, phi: 4}], [{...validTrig, B: -3.5}], [{...validTrig, reference: "yes"}],
    [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("trigonometric-function collection rejects out-of-domain data without writing: %j", data => {
    expect(() => preflightPresetImport(trigonometricPreset(data))).toThrow();
    expect(localStorage.length).toBe(0);
});

const continuityPreset = (data: unknown) => JSON.stringify({"preset-piecewise-continuity": {data: [{id: "Osnova", boardState: {boundingBox: [-2, 5, 4, -2]},
    graphState: {initialized: true, a: 1}, data}]}});

test("piecewise-continuity collection imports a model object and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    commitPresetImport(preflightPresetImport(continuityPreset({a: 1.5})));
    expect(JSON.parse(localStorage.getItem("preset-piecewise-continuity")!).data[0].data).toEqual({a: 1.5});
    expect(localStorage.getItem("other-app")).toBe("keep");
});

test.each([[[]], [null], [{}], [{a: -0.05}], [{a: 3.05}], [{a: "1"}], [{a: null}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("piecewise-continuity collection rejects out-of-domain data without writing: %j", data => {
    expect(() => preflightPresetImport(continuityPreset(data))).toThrow();
    expect(localStorage.length).toBe(0);
});

const derivativePreset = (data: unknown) => JSON.stringify({"preset-derivative": {data: [{id: "Osnova", boardState: {boundingBox: [-3, 6, 4, -2]},
    graphState: {initialized: true, fn: "square", x0: 1, h: 1, tangent: false}, data}]}});

test("derivative collection imports a model object and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {fn: "sin", x0: -2, h: -0.5, tangent: true};
    commitPresetImport(preflightPresetImport(derivativePreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-derivative")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validDerivative = {fn: "square", x0: 1, h: 1};
test.each([[[]], [null], [{}], [{...validDerivative, fn: "cos"}], [{...validDerivative, x0: 4.5}], [{...validDerivative, x0: "1"}], [{...validDerivative, h: 0}],
    [{...validDerivative, h: 0.005}], [{...validDerivative, h: -0.005}], [{...validDerivative, h: 2.5}], [{...validDerivative, tangent: "yes"}],
    [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("derivative collection rejects out-of-domain data without writing: %j", data => {
    expect(() => preflightPresetImport(derivativePreset(data))).toThrow();
    expect(localStorage.length).toBe(0);
});

const integralPreset = (data: unknown) => JSON.stringify({"preset-definite-integral": {data: [{id: "Osnova", boardState: {boundingBox: [-1.5, 5, 7.5, -2]},
    graphState: {initialized: true, fn: "square", a: 0, b: 2, n: 4, method: "left"}, data}]}});

test("definite-integral collection imports a model object and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {fn: "sin", a: 2, b: -1.5, n: 150, method: "trapezoid"};
    commitPresetImport(preflightPresetImport(integralPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-definite-integral")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validIntegral = {fn: "square", a: 0, b: 2, n: 4, method: "left"};
test.each([[[]], [null], [{}], [{...validIntegral, fn: "cos"}], [{...validIntegral, a: 7.5}], [{...validIntegral, b: "2"}], [{...validIntegral, n: 0}],
    [{...validIntegral, n: 151}], [{...validIntegral, n: 2.5}], [{...validIntegral, method: "upper"}], [{fn: "square", a: 0, b: 2, n: 4}],
    [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("definite-integral collection rejects out-of-domain data without writing: %j", data => {
    expect(() => preflightPresetImport(integralPreset(data))).toThrow();
    expect(localStorage.length).toBe(0);
});

const areaPreset = (data: unknown) => JSON.stringify({"preset-area-between-curves": {data: [{id: "Osnova", boardState: {boundingBox: [-1.3, 4.2, 5.3, -1]},
    graphState: {initialized: true, a: 0.78, b: 3.22, mode: "between"}, data}]}});

test("area-between-curves collection imports a model object and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {a: 4, b: -1, mode: "under-g"};
    commitPresetImport(preflightPresetImport(areaPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-area-between-curves")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validArea = {a: 0, b: 4, mode: "between"};
test.each([[[]], [null], [{}], [{...validArea, mode: "under"}], [{...validArea, a: 5.5}], [{...validArea, b: -1.5}], [{...validArea, b: "4"}], [{a: 0, b: 4}],
    [{...validArea, a: NaN}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("area-between-curves collection rejects out-of-domain data without writing: %j", data => {
    expect(() => preflightPresetImport(areaPreset(data))).toThrow();
    expect(localStorage.length).toBe(0);
});

const arcPreset = (data: unknown) => JSON.stringify({"preset-arc-length": {data: [{id: "Osnova", boardState: {boundingBox: [-0.6, 2.2, 3.8, -1.3]},
    graphState: {initialized: true, a: 0, b: 3.14, n: 2}, data}]}});

test("arc-length collection imports a model object and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {a: 3, b: -2, n: 100};
    commitPresetImport(preflightPresetImport(arcPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-arc-length")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validArc = {a: 0, b: 3, n: 2};
test.each([[[]], [null], [{}], [{...validArc, n: 0}], [{...validArc, n: 101}], [{...validArc, n: 2.5}], [{...validArc, a: 7.5}], [{...validArc, b: -7.5}], [{...validArc, b: "3"}],
    [{a: 0, b: 3}], [{...validArc, a: NaN}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("arc-length collection rejects out-of-domain data without writing: %j", data => {
    expect(() => preflightPresetImport(arcPreset(data))).toThrow();
    expect(localStorage.length).toBe(0);
});

const bisectionPreset = (data: unknown) => JSON.stringify({"preset-bisection": {data: [{id: "Osnova", boardState: {boundingBox: [-2.5, 4, 3.5, -3]},
    graphState: {initialized: true, example: "square-minus-two", a: 1, b: 2, step: 0}, data}]}});

test("bisection collection imports a model object with its iteration step and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {example: "cubic", a: -1.5, b: 2, step: 7};
    commitPresetImport(preflightPresetImport(bisectionPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-bisection")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validBisection = {example: "square-minus-two", a: 1, b: 2, step: 3};
test.each([[[]], [null], [{}], [{...validBisection, example: "quartic"}], [{...validBisection, a: 2}], [{...validBisection, a: 3, b: 2}], [{...validBisection, a: -4.5}],
    [{...validBisection, b: 4.5}], [{...validBisection, a: "1"}], [{...validBisection, step: -1}], [{...validBisection, step: 61}], [{...validBisection, step: 1.5}],
    [{...validBisection, step: "3"}], [{example: "cubic", a: 0, b: 1}], [{...validBisection, a: NaN}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("bisection collection rejects out-of-domain data without writing: %j", data => {
    expect(() => preflightPresetImport(bisectionPreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validBisection, example: "quartic"}, /square-minus-two, sign-step, cubic/],
    [{...validBisection, a: -4.5}, /−4 in 4|between −4 and 4/],
    [{...validBisection, b: 4.5}, /−4 in 4|between −4 and 4/],
    [{...validBisection, a: 2}, /a < b/],
    [{...validBisection, a: 3, b: 2}, /a < b/],
    [{...validBisection, step: -1}, /0 do 60|0 to 60/],
    [{...validBisection, step: 61}, /0 do 60|0 to 60/],
    [{...validBisection, step: 1.5}, /0 do 60|0 to 60/],
    [{...validBisection, step: "3"}, /step/],
])("bisection errors name the example, endpoints or step to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(bisectionPreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(bisectionPreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test("bisection data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validBisection, a: "1"}, {example: "cubic", a: null, b: 1, step: 0}]) {
        expect(() => preflightPresetImport(bisectionPreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

const meanValuePreset = (data: unknown) => JSON.stringify({"preset-mean-value": {data: [{id: "Osnova", boardState: {boundingBox: [-2.5, 5, 4, -2.5]},
    graphState: {initialized: true, example: "square", a: 0, b: 2, c: 0.5, revealed: false}, data}]}});

test("mean value collection imports a model object with its reveal state and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {example: "cube", a: -1, b: 1, c: 0.25, revealed: true};
    commitPresetImport(preflightPresetImport(meanValuePreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-mean-value")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validMeanValue = {example: "square", a: 0, b: 2, c: 0.5, revealed: false};
test.each([[[]], [null], [{}], [{...validMeanValue, example: "quartic"}], [{...validMeanValue, c: 0}], [{...validMeanValue, c: 2}], [{...validMeanValue, c: -1}], [{...validMeanValue, c: 3}],
    [{...validMeanValue, a: 2, b: 0}], [{...validMeanValue, a: 1, b: 1, c: 1}], [{...validMeanValue, a: -4.5}], [{...validMeanValue, b: 4.5}], [{...validMeanValue, a: "0"}],
    [{...validMeanValue, c: NaN}], [{...validMeanValue, revealed: "true"}], [{example: "cube", a: -1, b: 1, c: 0}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("mean value collection rejects out-of-domain and misordered data without writing: %j", data => {
    expect(() => preflightPresetImport(meanValuePreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([[{...validMeanValue, c: 0}], [{...validMeanValue, c: 2}], [{...validMeanValue, a: 2, b: 0}], [{...validMeanValue, a: 1, b: 1, c: 1}]])
("mean value ordering errors say which condition to fix: %j", data => {
    expect(() => preflightPresetImport(meanValuePreset(data))).toThrow(/a < c < b/);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validMeanValue, example: "quartic"}, /square, cube, abs/],
    [{...validMeanValue, a: -4.5}, /−4 in 4|between −4 and 4/],
    [{...validMeanValue, b: 4.5}, /−4 in 4|between −4 and 4/],
    [{...validMeanValue, a: -5, c: 0, b: 5}, /−4 in 4|between −4 and 4/],
    [{...validMeanValue, revealed: "true"}, /revealed/],
    [{...validMeanValue, revealed: 1}, /revealed/],
])("mean value errors name the example, range or field to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(meanValuePreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(meanValuePreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test("mean value data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validMeanValue, a: "0"}, {example: "cube", a: -1, b: 1, c: null}]) {
        expect(() => preflightPresetImport(meanValuePreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

const accumulationPreset = (data: unknown) => JSON.stringify({"preset-accumulation": {data: [{id: "Osnova", boardState: {boundingBox: [-1.2, 3.1, 6.7, -3.1]},
    graphState: {initialized: true, fn: "sin", a: 0, x: 2, accumulationVisible: false}, data}]}});

test("accumulation collection imports a model object with its reveal state and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {fn: "exp", a: -1.5, x: 0.25, accumulationVisible: true};
    commitPresetImport(preflightPresetImport(accumulationPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-accumulation")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validAccumulation = {fn: "sin", a: 0, x: 2, accumulationVisible: false};
test.each([[[]], [null], [{}], [{...validAccumulation, fn: "cos"}], [{...validAccumulation, a: -7.01}], [{...validAccumulation, x: 7.01}], [{...validAccumulation, x: 100}],
    [{...validAccumulation, a: "0"}], [{...validAccumulation, x: NaN}], [{...validAccumulation, accumulationVisible: "true"}], [{fn: "sin", a: 0, x: 2}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("accumulation collection rejects out-of-domain and incomplete data without writing: %j", data => {
    expect(() => preflightPresetImport(accumulationPreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([[{...validAccumulation, a: -7.01}], [{...validAccumulation, x: 7.01}], [{...validAccumulation, a: 50, x: 50}]])
("accumulation range errors name the range to use: %j", data => {
    expect(() => preflightPresetImport(accumulationPreset(data))).toThrow(/−7 in 7|between −7 and 7/);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validAccumulation, fn: "cos"}, /square, sin, exp|sin/],
    [{...validAccumulation, accumulationVisible: "true"}, /accumulationVisible/],
    [{...validAccumulation, accumulationVisible: 1}, /accumulationVisible/],
])("accumulation errors name the function or field to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(accumulationPreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(accumulationPreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije|−7 in 7|between −7 and 7/);
    expect(localStorage.length).toBe(0);
});

test("accumulation data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validAccumulation, a: "0"}, {fn: "sin", a: 0, x: null, accumulationVisible: false}]) {
        expect(() => preflightPresetImport(accumulationPreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

test("the range and function messages are localized and show the supported range from the model constants", () => {
    const attempt = (data: unknown) => { try { preflightPresetImport(accumulationPreset(data)); } catch (error) { return (error as LocalizedError).message; } return ""; };
    setLanguage("en");
    expect(attempt({...validAccumulation, a: -8})).toContain("between −7 and 7");
    expect(attempt({...validAccumulation, fn: "cos"})).toContain("fn must be one of: square, sin, exp");
    setLanguage("sl");
    expect(attempt({...validAccumulation, a: -8})).toContain("med −7 in 7");
    expect(attempt({...validAccumulation, fn: "cos"})).toContain("polje fn mora biti eno od");
});

const darbouxPreset = (data: unknown) => JSON.stringify({"preset-darboux": {data: [{id: "Osnova", boardState: {boundingBox: [-0.8, 5, 3.6, -1.9]},
    graphState: {initialized: true, example: "square", a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: true}, data}]}});

test("darboux collection imports a model object with its visibility and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {example: "sine", a: 0, b: 6.283185307179586, n: 8, lowerVisible: false, upperVisible: true};
    commitPresetImport(preflightPresetImport(darbouxPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-darboux")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validDarboux = {example: "square", a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: true};
test.each([[[]], [null], [{}], [{...validDarboux, example: "quartic"}], [{...validDarboux, a: 2, b: 0}], [{...validDarboux, a: 1, b: 1}], [{...validDarboux, a: -7.01}],
    [{...validDarboux, b: 7.01}], [{...validDarboux, a: "0"}], [{...validDarboux, n: 0}], [{...validDarboux, n: 129}], [{...validDarboux, n: 2.5}], [{...validDarboux, n: -4}],
    [{...validDarboux, n: NaN}], [{...validDarboux, n: "4"}], [{...validDarboux, lowerVisible: "true"}], [{...validDarboux, upperVisible: 1}],
    [{example: "square", a: 0, b: 2, n: 4}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("darboux collection rejects out-of-domain and incomplete data without writing: %j", data => {
    expect(() => preflightPresetImport(darbouxPreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validDarboux, a: 2, b: 0}, /a < b/],
    [{...validDarboux, a: 1, b: 1}, /a < b/],
    [{...validDarboux, n: 0}, /n.*1.*128/],
    [{...validDarboux, n: 129}, /n.*1.*128/],
    [{...validDarboux, n: 2.5}, /n.*1.*128/],
    [{...validDarboux, a: -7.01}, /−7.*7/],
    [{...validDarboux, b: 100}, /−7.*7/],
    [{...validDarboux, example: "cube"}, /square, sine/],
    [{...validDarboux, lowerVisible: "true"}, /lowerVisible/],
    [{...validDarboux, upperVisible: 1}, /upperVisible/],
])("darboux errors say which condition to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(darbouxPreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(darbouxPreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test("darboux data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validDarboux, a: "0"}, {example: "square", a: 0, b: 2, n: 4}]) {
        expect(() => preflightPresetImport(darbouxPreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

test("the darboux messages are localized and show the supported ranges from the model constants", () => {
    const attempt = (data: unknown) => { try { preflightPresetImport(darbouxPreset(data)); } catch (error) { return (error as LocalizedError).message; } return ""; };
    setLanguage("en");
    expect(attempt({...validDarboux, a: 3, b: 1})).toContain("a < b");
    expect(attempt({...validDarboux, n: 200})).toContain("an integer from 1 to 128");
    expect(attempt({...validDarboux, b: 9})).toContain("between −7 and 7");
    setLanguage("sl");
    expect(attempt({...validDarboux, a: 3, b: 1})).toContain("a < b");
    expect(attempt({...validDarboux, n: 200})).toContain("celo število od 1 do 128");
    expect(attempt({...validDarboux, b: 9})).toContain("med −7 in 7");
});

const extremaPreset = (data: unknown) => JSON.stringify({"preset-extrema": {data: [{id: "Osnova", boardState: {boundingBox: [-3, 6.5, 4, -3]},
    graphState: {initialized: true, example: "square", a: -1, b: 2, revealed: false}, data}]}});

test("extrema collection imports a model object with its classification flag and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {example: "sine", a: 0, b: 3.141592653589793, revealed: true};
    commitPresetImport(preflightPresetImport(extremaPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-extrema")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validExtrema = {example: "square", a: -1, b: 2, revealed: false};
test.each([[[]], [null], [{}], [{...validExtrema, example: "quartic"}], [{...validExtrema, a: 2, b: -1}], [{...validExtrema, a: 1, b: 1}], [{...validExtrema, a: -4.01}],
    [{...validExtrema, b: 4.01}], [{...validExtrema, a: "0"}], [{...validExtrema, revealed: "true"}], [{...validExtrema, revealed: 1}],
    [{example: "square", a: -1, b: 2}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("extrema collection rejects out-of-domain and incomplete data without writing: %j", data => {
    expect(() => preflightPresetImport(extremaPreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validExtrema, a: 2, b: -1}, /a < b/],
    [{...validExtrema, a: 1, b: 1}, /a < b/],
    [{...validExtrema, a: -4.01}, /−4.*4/],
    [{...validExtrema, b: 100}, /−4.*4/],
    [{...validExtrema, example: "exp"}, /square, cube, abs, sine/],
    [{...validExtrema, revealed: "true"}, /revealed/],
    [{...validExtrema, revealed: 1}, /revealed/],
])("extrema errors say which condition to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(extremaPreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(extremaPreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test("extrema data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validExtrema, a: "0"}, {example: "square", a: -1, b: 2}]) {
        expect(() => preflightPresetImport(extremaPreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

test("the extrema messages are localized and show the supported range from the model constants", () => {
    const attempt = (data: unknown) => { try { preflightPresetImport(extremaPreset(data)); } catch (error) { return (error as LocalizedError).message; } return ""; };
    setLanguage("en");
    expect(attempt({...validExtrema, a: 3, b: 1})).toContain("a < b");
    expect(attempt({...validExtrema, b: 9})).toContain("between −4 and 4");
    expect(attempt({...validExtrema, revealed: "yes"})).toContain("must be true or false");
    setLanguage("sl");
    expect(attempt({...validExtrema, a: 3, b: 1})).toContain("a < b");
    expect(attempt({...validExtrema, b: 9})).toContain("med −4 in 4");
    expect(attempt({...validExtrema, revealed: "yes"})).toContain("true ali false");
});

const convexityPreset = (data: unknown) => JSON.stringify({"preset-convexity": {data: [{id: "Osnova", boardState: {boundingBox: [-2.6, 4.6, 2.6, -2.2]},
    graphState: {initialized: true, example: "square", a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false}, data}]}});

test("convexity collection imports a model object with its reveal flag and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {example: "cube", a: 0, b: 2, t: 1.8, secondDerivativeVisible: true};
    commitPresetImport(preflightPresetImport(convexityPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-convexity")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
});

const validConvexity = {example: "square", a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false};
test.each([[[]], [null], [{}], [{...validConvexity, example: "sine"}], [{...validConvexity, a: 2, b: -1}], [{...validConvexity, a: 1, b: 1}], [{...validConvexity, a: -2.01}],
    [{...validConvexity, b: 2.01}], [{...validConvexity, t: 2.5}], [{...validConvexity, t: "0"}], [{...validConvexity, a: "0"}], [{...validConvexity, secondDerivativeVisible: "true"}],
    [{...validConvexity, secondDerivativeVisible: 1}], [{example: "square", a: -1, b: 1.5, t: 0.5}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("convexity collection rejects out-of-domain and incomplete data without writing: %j", data => {
    expect(() => preflightPresetImport(convexityPreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validConvexity, a: 2, b: -1}, /a < b/],
    [{...validConvexity, a: 1, b: 1}, /a < b/],
    [{...validConvexity, a: -2.01}, /−2.*2/],
    [{...validConvexity, t: 100}, /−2.*2/],
    [{...validConvexity, example: "exp"}, /square, negSquare, cube, quartic/],
    [{...validConvexity, secondDerivativeVisible: "true"}, /secondDerivativeVisible/],
])("convexity errors say which condition to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(convexityPreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(convexityPreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test("convexity data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validConvexity, a: "0"}, {...validConvexity, t: "0"}, {example: "square", a: -1, b: 1.5, t: 0.5}]) {
        expect(() => preflightPresetImport(convexityPreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

test("the convexity messages are localized and show the supported range from the model constants", () => {
    const attempt = (data: unknown) => { try { preflightPresetImport(convexityPreset(data)); } catch (error) { return (error as LocalizedError).message; } return ""; };
    setLanguage("en");
    expect(attempt({...validConvexity, a: 1.8, b: 1})).toContain("a < b");
    expect(attempt({...validConvexity, t: 9})).toContain("between −2 and 2");
    expect(attempt({...validConvexity, secondDerivativeVisible: "yes"})).toContain("must be true or false");
    setLanguage("sl");
    expect(attempt({...validConvexity, a: 1.8, b: 1})).toContain("a < b");
    expect(attempt({...validConvexity, t: 9})).toContain("med −2 in 2");
    expect(attempt({...validConvexity, secondDerivativeVisible: "yes"})).toContain("true ali false");
});

const taylorPreset = (data: unknown) => JSON.stringify({"preset-taylor": {data: [{id: "Osnova", boardState: {boundingBox: [-3.5, 10, 3.5, -4]},
    graphState: {initialized: true, example: "exp", center: 0, degree: 1, x: 1, boundVisible: false}, data}]}});

test("taylor collection imports a model object with its reveal flag and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {example: "geometric", center: -0.5, degree: 10, x: -2, boundVisible: true};
    commitPresetImport(preflightPresetImport(taylorPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-taylor")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
    // the boundary values of every example are accepted, including the fixed center of the flat function
    for (const boundary of [{example: "exp", center: 2, degree: 0, x: -3}, {example: "sine", center: -4, degree: 10, x: 7}, {example: "geometric", center: 0.5, degree: 3, x: 0.95},
        {example: "flat", center: 0, degree: 5, x: -1}, {example: "flat", center: 0, degree: 5, x: 3}]) {
        expect(() => preflightPresetImport(taylorPreset({...boundary, boundVisible: false}))).not.toThrow();
    }
});

const validTaylor = {example: "exp", center: 0, degree: 1, x: 1, boundVisible: false};
test.each([[[]], [null], [{}], [{...validTaylor, example: "cos"}], [{...validTaylor, center: 2.01}], [{...validTaylor, x: 3.01}], [{...validTaylor, degree: 11}], [{...validTaylor, degree: -1}],
    [{...validTaylor, degree: 2.5}], [{...validTaylor, degree: "1"}], [{...validTaylor, center: "0"}], [{...validTaylor, x: "1"}], [{...validTaylor, boundVisible: "true"}],
    [{...validTaylor, boundVisible: 1}], [{example: "exp", center: 0, degree: 1, x: 1}], [{...validTaylor, example: "flat", center: 0.5}], [{...validTaylor, example: "geometric", x: 1}],
    [{...validTaylor, example: "geometric", center: 0.6}], [{...validTaylor, example: "sine", x: 8}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("taylor collection rejects out-of-domain and incomplete data without writing: %j", data => {
    expect(() => preflightPresetImport(taylorPreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validTaylor, example: "cos"}, /exp, sine, geometric, flat/],
    [{...validTaylor, center: 5}, /exp.*−2.*2/],
    [{...validTaylor, example: "sine", center: 4.5}, /sine.*−4.*4/],
    [{...validTaylor, example: "geometric", center: 1}, /geometric.*−1.*0\.5/],
    [{...validTaylor, example: "flat", center: 0.5}, /flat.*(must be 0|mora biti 0)/],
    [{...validTaylor, x: 4}, /exp.*−3.*3/],
    [{...validTaylor, example: "geometric", x: 1}, /geometric.*−2.*0\.95/],
    [{...validTaylor, degree: 11}, /(integer between|celo število med) 0 (and|in) 10/],
    [{...validTaylor, degree: 1.5}, /(integer between|celo število med) 0 (and|in) 10/],
    [{...validTaylor, boundVisible: "true"}, /boundVisible/],
])("taylor errors say which condition to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(taylorPreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(taylorPreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test("taylor data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validTaylor, center: "0"}, {...validTaylor, x: "1"}, {...validTaylor, degree: "1"}, {example: "exp", center: 0, degree: 1, x: 1}]) {
        expect(() => preflightPresetImport(taylorPreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

test("the taylor messages are localized and show the supported range of the example from the model constants", () => {
    const attempt = (data: unknown) => { try { preflightPresetImport(taylorPreset(data)); } catch (error) { return (error as LocalizedError).message; } return ""; };
    setLanguage("en");
    expect(attempt({...validTaylor, example: "geometric", center: 0.9})).toContain("between −1 and 0.5");
    expect(attempt({...validTaylor, example: "flat", center: 1})).toContain("must be 0");
    expect(attempt({...validTaylor, degree: 12})).toContain("integer between 0 and 10");
    expect(attempt({...validTaylor, boundVisible: "yes"})).toContain("must be true or false");
    setLanguage("sl");
    expect(attempt({...validTaylor, example: "geometric", center: 0.9})).toContain("med −1 in 0.5");
    expect(attempt({...validTaylor, example: "flat", center: 1})).toContain("mora biti 0");
    expect(attempt({...validTaylor, degree: 12})).toContain("celo število med 0 in 10");
    expect(attempt({...validTaylor, boundVisible: "yes"})).toContain("true ali false");
});

const sequencePreset = (data: unknown) => JSON.stringify({"preset-sequence": {data: [{id: "Osnova", boardState: {boundingBox: [-3, 1.5, 43, -1.5]},
    graphState: {initialized: true, example: "reciprocal", epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false}, data}]}});

test("sequence collection imports a model object with its terms and reveal flag and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {example: "alternating-sign", epsilon: 1.5, limit: -1.25, threshold: 1000, terms: 40, certificateVisible: true};
    commitPresetImport(preflightPresetImport(sequencePreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-sequence")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
    // the boundary values of every field are accepted
    for (const boundary of [{epsilon: 0.01, limit: -2, threshold: 1, terms: 1}, {epsilon: 2, limit: 2, threshold: 1000, terms: 40}]) {
        expect(() => preflightPresetImport(sequencePreset({example: "natural", certificateVisible: false, ...boundary}))).not.toThrow();
    }
});

const validSequence = {example: "reciprocal", epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false};
test.each([[[]], [null], [{}], [{...validSequence, example: "harmonic"}], [{...validSequence, epsilon: 0}], [{...validSequence, epsilon: -0.1}], [{...validSequence, epsilon: 0.005}],
    [{...validSequence, epsilon: 0.015}], [{...validSequence, epsilon: 2.01}], [{...validSequence, epsilon: "0.1"}], [{...validSequence, limit: 2.01}], [{...validSequence, limit: -2.5}],
    [{...validSequence, limit: "0"}], [{...validSequence, threshold: 0}], [{...validSequence, threshold: 1001}], [{...validSequence, threshold: 2.5}], [{...validSequence, threshold: "5"}],
    [{...validSequence, terms: 0}], [{...validSequence, terms: 41}], [{...validSequence, terms: 1.5}], [{...validSequence, terms: "1"}], [{...validSequence, certificateVisible: "true"}],
    [{...validSequence, certificateVisible: 1}], [{example: "reciprocal", epsilon: 0.1, limit: 0, threshold: 5, terms: 1}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("sequence collection rejects out-of-domain and incomplete data without writing: %j", data => {
    expect(() => preflightPresetImport(sequencePreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validSequence, example: "harmonic"}, /reciprocal, alternating-reciprocal, alternating-sign, natural/],
    [{...validSequence, epsilon: 0}, /epsilon.*0\.01.*2/],
    [{...validSequence, epsilon: 0.015}, /epsilon.*0\.01.*2/],
    [{...validSequence, epsilon: 3}, /epsilon.*0\.01.*2/],
    [{...validSequence, limit: 3}, /limit.*−2.*2/],
    [{...validSequence, threshold: 0}, /threshold.*1.*1000/],
    [{...validSequence, threshold: 7.5}, /threshold.*1.*1000/],
    [{...validSequence, terms: 41}, /terms.*1.*40/],
    [{...validSequence, terms: 0}, /terms.*1.*40/],
    [{...validSequence, certificateVisible: "true"}, /certificateVisible/],
])("sequence errors say which condition to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(sequencePreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(sequencePreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test("sequence data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validSequence, epsilon: "0.1"}, {...validSequence, limit: "0"}, {...validSequence, threshold: "5"}, {...validSequence, terms: "1"},
        {example: "reciprocal", epsilon: 0.1, limit: 0, threshold: 5, terms: 1}]) {
        expect(() => preflightPresetImport(sequencePreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

test("the sequence messages are localized and show the supported ranges from the model constants", () => {
    const attempt = (data: unknown) => { try { preflightPresetImport(sequencePreset(data)); } catch (error) { return (error as LocalizedError).message; } return ""; };
    setLanguage("en");
    expect(attempt({...validSequence, epsilon: 0.015})).toContain("multiple of 0.01 between 0.01 and 2");
    expect(attempt({...validSequence, limit: 5})).toContain("between −2 and 2");
    expect(attempt({...validSequence, threshold: 0})).toContain("integer between 1 and 1000");
    expect(attempt({...validSequence, terms: 50})).toContain("integer between 1 and 40");
    expect(attempt({...validSequence, certificateVisible: "yes"})).toContain("must be true or false");
    setLanguage("sl");
    expect(attempt({...validSequence, epsilon: 0.015})).toContain("večkratnik števila 0.01 med 0.01 in 2");
    expect(attempt({...validSequence, limit: 5})).toContain("med −2 in 2");
    expect(attempt({...validSequence, threshold: 0})).toContain("celo število med 1 in 1000");
    expect(attempt({...validSequence, terms: 50})).toContain("celo število med 1 in 40");
    expect(attempt({...validSequence, certificateVisible: "yes"})).toContain("true ali false");
});

const fixedPointPreset = (data: unknown) => JSON.stringify({"preset-fixed-point": {data: [{id: "Osnova", boardState: {boundingBox: [-0.5, 2.4, 3.7, -0.4]},
    graphState: {initialized: true, example: "affine", x0: 0, step: 0, digits: 3, boundVisible: false}, data}]}});

test("fixed-point collection imports a model object with its step and reveal flag and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {example: "cosine", x0: 0.75, step: 12, digits: 6, boundVisible: true};
    commitPresetImport(preflightPresetImport(fixedPointPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-fixed-point")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
    // the boundary values of every field are accepted, a step beyond the end of the iteration is cut when the preset is opened
    for (const boundary of [{example: "affine", x0: 0, step: 0, digits: 1}, {example: "affine", x0: 2, step: 60, digits: 8}, {example: "reflection", x0: 1, step: 60, digits: 8},
        {example: "cosine", x0: 0.01, step: 0, digits: 1}]) {
        expect(() => preflightPresetImport(fixedPointPreset({boundVisible: false, ...boundary}))).not.toThrow();
    }
});

const validFixedPoint = {example: "affine", x0: 0, step: 0, digits: 3, boundVisible: false};
test.each([[[]], [null], [{}], [{...validFixedPoint, example: "sine"}], [{...validFixedPoint, x0: -0.01}], [{...validFixedPoint, x0: 2.01}], [{...validFixedPoint, x0: 0.005}],
    [{...validFixedPoint, x0: 0.1 + 0.2}], [{...validFixedPoint, example: "cosine", x0: 1.5}], [{...validFixedPoint, x0: "0"}], [{...validFixedPoint, step: -1}], [{...validFixedPoint, step: 61}],
    [{...validFixedPoint, step: 2.5}], [{...validFixedPoint, step: "1"}], [{...validFixedPoint, digits: 0}], [{...validFixedPoint, digits: 9}], [{...validFixedPoint, digits: 2.5}],
    [{...validFixedPoint, digits: "3"}], [{...validFixedPoint, boundVisible: "true"}], [{...validFixedPoint, boundVisible: 1}], [{example: "affine", x0: 0, step: 0, digits: 3}],
    [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("fixed-point collection rejects out-of-domain and incomplete data without writing: %j", data => {
    expect(() => preflightPresetImport(fixedPointPreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validFixedPoint, example: "sine"}, /affine, cosine, reflection/],
    [{...validFixedPoint, x0: 2.5}, /x0.*affine.*0\.01.*0.*2/],
    [{...validFixedPoint, x0: 0.015}, /x0.*affine.*0\.01.*0.*2/],
    [{...validFixedPoint, example: "cosine", x0: 1.5}, /x0.*cosine.*0\.01.*0.*1/],
    [{...validFixedPoint, example: "reflection", x0: -0.1}, /x0.*reflection.*0\.01.*0.*1/],
    [{...validFixedPoint, step: 61}, /step.*0.*60/],
    [{...validFixedPoint, step: 1.5}, /step.*0.*60/],
    [{...validFixedPoint, digits: 0}, /digits.*1.*8/],
    [{...validFixedPoint, digits: 9}, /digits.*1.*8/],
    [{...validFixedPoint, boundVisible: "true"}, /boundVisible/],
])("fixed-point errors say which condition to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(fixedPointPreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(fixedPointPreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test("fixed-point data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validFixedPoint, x0: "0"}, {...validFixedPoint, step: "1"}, {...validFixedPoint, digits: "3"}, {example: "affine", x0: 0, step: 0, digits: 3}]) {
        expect(() => preflightPresetImport(fixedPointPreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

test("the fixed-point messages are localized and show the supported ranges from the model constants", () => {
    const attempt = (data: unknown) => { try { preflightPresetImport(fixedPointPreset(data)); } catch (error) { return (error as LocalizedError).message; } return ""; };
    setLanguage("en");
    expect(attempt({...validFixedPoint, example: "sine"})).toContain("must be one of: affine, cosine, reflection");
    expect(attempt({...validFixedPoint, example: "cosine", x0: 3})).toContain("multiple of 0.01 between 0 and 1");
    expect(attempt({...validFixedPoint, step: 99})).toContain("integer between 0 and 60");
    expect(attempt({...validFixedPoint, digits: 12})).toContain("integer between 1 and 8");
    expect(attempt({...validFixedPoint, boundVisible: "yes"})).toContain("must be true or false");
    setLanguage("sl");
    expect(attempt({...validFixedPoint, example: "cosine", x0: 3})).toContain("večkratnik števila 0.01 med 0 in 1");
    expect(attempt({...validFixedPoint, step: 99})).toContain("celo število med 0 in 60");
    expect(attempt({...validFixedPoint, digits: 12})).toContain("celo število med 1 in 8");
    expect(attempt({...validFixedPoint, boundVisible: "yes"})).toContain("true ali false");
});


const uniformPreset = (data: unknown) => JSON.stringify({"preset-uniform-convergence": {data: [{id: "Osnova", boardState: {boundingBox: [-0.15, 1.45, 1.2, -0.2]},
    graphState: {initialized: true, example: "power", r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false}, data}]}});

test("uniform-convergence collection imports a model object with its reveal flag and keeps other storage untouched", () => {
    localStorage.setItem("other-app", "keep");
    const data = {example: "scaled", r: 0.65, n: 17, x: 0.64, epsilon: 0.03, supremumVisible: true};
    commitPresetImport(preflightPresetImport(uniformPreset(data)));
    expect(JSON.parse(localStorage.getItem("preset-uniform-convergence")!).data[0].data).toEqual(data);
    expect(localStorage.getItem("other-app")).toBe("keep");
    // the boundary values of every field are accepted
    for (const boundary of [{example: "power", r: 0.1, n: 1, x: 0, epsilon: 0.01}, {example: "power", r: 0.1, n: 1, x: 0.1, epsilon: 0.01},
        {example: "scaled", r: 1, n: 50, x: 1, epsilon: 1}, {example: "power", r: 1, n: 50, x: 0.99, epsilon: 0.5}]) {
        expect(() => preflightPresetImport(uniformPreset({supremumVisible: false, ...boundary}))).not.toThrow();
    }
});

const validUniform = {example: "power", r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false};
test.each([[[]], [null], [{}], [{...validUniform, example: "cubic"}], [{...validUniform, r: 0.05}], [{...validUniform, r: 1.05}], [{...validUniform, r: 0.82}],
    [{...validUniform, r: 0.1 + 0.2}], [{...validUniform, r: "0.8"}], [{...validUniform, n: 0}], [{...validUniform, n: 51}], [{...validUniform, n: 2.5}], [{...validUniform, n: "5"}],
    [{...validUniform, x: -0.01}], [{...validUniform, x: 0.85}], [{...validUniform, x: 0.505}], [{...validUniform, x: "0.5"}], [{...validUniform, epsilon: 0}],
    [{...validUniform, epsilon: 0.005}], [{...validUniform, epsilon: 1.01}], [{...validUniform, epsilon: -0.1}], [{...validUniform, supremumVisible: "true"}],
    [{...validUniform, supremumVisible: 1}], [{example: "power", r: 0.8, n: 5, x: 0.5, epsilon: 0.1}], [[["JSXBezierCurve", {points: [[0, 0]]}]]]])
("uniform-convergence collection rejects out-of-domain and incomplete data without writing: %j", data => {
    expect(() => preflightPresetImport(uniformPreset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...validUniform, example: "cubic"}, /power, scaled/],
    [{...validUniform, r: 0.82}, /\br\b.*0\.05.*0\.1.*1/],
    [{...validUniform, r: 1.05}, /\br\b.*0\.05.*0\.1.*1/],
    [{...validUniform, n: 51}, /\bn\b.*1.*50/],
    [{...validUniform, n: 2.5}, /\bn\b.*1.*50/],
    [{...validUniform, x: 0.85}, /\bx\b.*0\.01.*0.*r = 0\.8/],
    [{...validUniform, x: 0.505}, /\bx\b.*0\.01.*0.*r = 0\.8/],
    [{...validUniform, r: 1, x: 1.5}, /\bx\b.*r = 1/],
    [{...validUniform, epsilon: 0}, /epsilon.*0\.01.*0\.01.*1/],
    [{...validUniform, epsilon: 1.01}, /epsilon.*0\.01.*0\.01.*1/],
    [{...validUniform, supremumVisible: "true"}, /supremumVisible/],
])("uniform-convergence errors say which condition to fix: %j", (data, expected) => {
    expect(() => preflightPresetImport(uniformPreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(uniformPreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test("uniform-convergence data of the wrong type keeps the generic function-data message", () => {
    for (const data of [null, [], {...validUniform, r: "0.8"}, {...validUniform, n: "5"}, {...validUniform, x: "0.5"}, {...validUniform, epsilon: "0.1"},
        {example: "power", r: 0.8, n: 5, x: 0.5, epsilon: 0.1}]) {
        expect(() => preflightPresetImport(uniformPreset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

test("the uniform-convergence messages are localized and show the supported ranges from the model constants", () => {
    const attempt = (data: unknown) => { try { preflightPresetImport(uniformPreset(data)); } catch (error) { return (error as LocalizedError).message; } return ""; };
    setLanguage("en");
    expect(attempt({...validUniform, example: "cubic"})).toContain("must be one of: power, scaled");
    expect(attempt({...validUniform, r: 0.82})).toContain("multiple of 0.05 between 0.1 and 1");
    expect(attempt({...validUniform, n: 99})).toContain("integer between 1 and 50");
    expect(attempt({...validUniform, x: 0.9})).toContain("between 0 and r = 0.8; correct x or r");
    expect(attempt({...validUniform, epsilon: 2})).toContain("multiple of 0.01 between 0.01 and 1");
    expect(attempt({...validUniform, supremumVisible: "yes"})).toContain("must be true or false");
    setLanguage("sl");
    expect(attempt({...validUniform, r: 0.82})).toContain("večkratnik števila 0.05 med 0.1 in 1");
    expect(attempt({...validUniform, n: 99})).toContain("celo število med 1 in 50");
    expect(attempt({...validUniform, x: 0.9})).toContain("med 0 in r = 0.8; popravi x ali r");
    expect(attempt({...validUniform, epsilon: 2})).toContain("večkratnik števila 0.01 med 0.01 in 1");
    expect(attempt({...validUniform, supremumVisible: "yes"})).toContain("true ali false");
});
