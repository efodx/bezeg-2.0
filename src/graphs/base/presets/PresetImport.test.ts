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
