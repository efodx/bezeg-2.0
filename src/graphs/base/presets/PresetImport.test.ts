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

test("an unsupported file fails with an actionable message in the selected language", () => {
    const contents = JSON.stringify({"preset-unknown-graph": {data: []}});
    expect(() => preflightPresetImport(contents)).toThrow(LocalizedError);
    expect(() => preflightPresetImport(contents)).toThrow("Datoteka ni podprta: neznana zbirka preset-unknown-graph. Izvozi prednastavitve iz Bezega in preveri podatke.");
    setLanguage("en");
    expect(() => preflightPresetImport(contents)).toThrow("Unsupported file: unknown collection preset-unknown-graph. Export presets from Bezeg and check the data.");
});

test("the documented legacy g1-spline collection still imports from earlier exported files", () => {
    const legacy = {data: [{id: "G1", data: [["JSXQuadraticG1SplineCurve", {points: [[-4, -1], [-2, 2], [0, 0], [2, -2], [4, 1]],
        state: {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, b: [1, 1]}}]]}]};
    commitPresetImport(preflightPresetImport(JSON.stringify({"preset-g1-spline": legacy})));
    expect(JSON.parse(localStorage.getItem("preset-g1-spline")!)).toEqual(legacy);
});
