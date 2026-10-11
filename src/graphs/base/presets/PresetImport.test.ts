import {commitPresetImport, preflightPresetImport} from "./PresetImport";
const collection = {data: [{id: "Učna krivulja", data: [["JSXBezierCurve", {points: [[0, 0], [1, 2], [3, 0]]}]],
    boardState: {boundingBox: [-5, 5, 5, -5]}, graphState: {initialized: true, selectedCurveOption: 0, curveSelected: false}}]};
const file = () => JSON.stringify({"preset-bezier-curve": collection});
beforeEach(() => localStorage.clear());

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
