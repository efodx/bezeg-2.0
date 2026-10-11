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
