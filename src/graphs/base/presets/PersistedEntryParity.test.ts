/**
 * Characterization (controls step 7, slice 1a) of every persisted entry path on one set of P1 samples: the file
 * preflight, a stored collection read, the graph's explicit `importPreset` (also the initial-mount path) and the
 * stored-Preset figure entry (`checkPersistedPreset` / `figurePresetGraphState`).
 *
 * `observed` tests pin what each path decides TODAY. `parity` tests state the target of slice 1b (every path takes the same
 * collection decision, and a refusal precedes every mutation). A parity test that does not hold yet is marked
 * `it.fails`; slice 1b flips it to `it` by changing the sample's flag below.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {preflightPresetImport} from "./PresetImport";
import {PresetService, Preset} from "./Presets";
import {LocalizedError, setLanguage} from "../../../localization";
import {appStorage} from "../../../storage/appStorage";
import BezierCurveGraph from "../../curves/bezier/BezierCurveGraph";
import InterpolationGraph from "../../curves/interpolation/InterpolationGraph";
import {FivePointGraph} from "../../projective/FivePointGraph";
import {BSplineNurbsGraph} from "../../curves/bspline/BSplineNurbsGraph";
import {BSplineBlossomGraph} from "../../curves/bspline/BSplineBlossomGraph";

/** The graphs under test as the entry paths see them. */
interface AnyGraph {
    presets(): string | undefined;
    defaultPreset(): unknown;
    importPreset(preset: Preset): void;
}
/** A persisted Preset record as a file or storage holds it; its `graphState` is unchecked JSON, so any record. */
type SamplePreset = Omit<Preset, "graphState"> & {graphState?: object};
/** What the entry paths touch, reached through a structural view so the protected members can be spied. */
type Probe = {
    importPresetData(data: unknown): void;
    replaceState(next: object): void;
    /** Typed as the identity on its argument so a test can hand it raw (even malformed) values and read the checked copy back. */
    checkPersistedPreset<T>(preset: T): T;
    board?: unknown;
};

interface Observed {
    /** Bounding box writes made by `importPreset` before it finished or threw. */
    bounds: number;
    /** Scene state writes (`replaceState`) made by `importPreset`. */
    state: number;
    /** `none`: Preset data never imported; `checked`: the collection-checked data; `default`: the graph default (after a warning); `threw`: the consumer refused. */
    data: "none" | "checked" | "default" | "threw";
    warned: boolean;
}

function entry(graph: AnyGraph, preset: SamplePreset, refuseInConsumer: boolean): Observed {
    const probe = graph as unknown as Probe;
    const log = {bounds: 0, state: 0};
    probe.board = {setBoundingBox: () => { log.bounds++; }, fullUpdate: () => undefined, getBoundingBox: () => [-1, 1, 1, -1]};
    const real = probe.importPresetData.bind(graph);
    let data: Observed["data"] = "none";
    const defaults = JSON.stringify(graph.defaultPreset());
    probe.importPresetData = (imported: unknown) => {
        if (refuseInConsumer) {
            try { real(imported); } catch (error) { data = "threw"; throw error; }
        }
        data = JSON.stringify(imported) === defaults && JSON.stringify(preset.data) !== defaults ? "default" : "checked";
    };
    const replace = probe.replaceState.bind(graph);
    probe.replaceState = (next: object) => { log.state++; replace(next); };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try { graph.importPreset(preset as Preset); } catch { /* the consumer refusal is recorded in `data` */ }
    const warned = warn.mock.calls.length > 0;
    warn.mockRestore();
    return {...log, data, warned};
}

const FILE = (key: string, preset: unknown) => JSON.stringify({[`preset-${key}`]: {data: [preset]}});
const fileDecision = (key: string, preset: unknown): "accept" | "refuse" => {
    try { preflightPresetImport(FILE(key, preset)); return "accept"; } catch { return "refuse"; }
};
/** A collection stored under its key, read by `PresetService`: whether the Preset is returned without a problem. */
const storageDecision = (key: string, presets: unknown[]): "accept" | "refuse" => {
    appStorage.setItem(`preset-${key}`, JSON.stringify({data: presets}));
    const loaded = new PresetService(key).loadPresets();
    return loaded.problem || loaded.data.length !== presets.length ? "refuse" : "accept";
};

const bezierData = [["JSXBezierCurve", {points: [[0, 0], [1, 2], [3, 0]]}]];
const bsplineOk = (degree: number, points: number[][]) => {
    const inner = Array.from({length: points.length - degree - 1}, (_, index) => index + 1);
    const last = inner.length + 1;
    return {degree, points, knots: [...Array(degree + 1).fill(0), ...inner, ...Array(degree + 1).fill(last)]};
};

interface Sample {
    name: string;
    graph: () => AnyGraph;
    preset: (graph: AnyGraph) => SamplePreset;
    /** The file decision, which is the collection decision to match. */
    file: "accept" | "refuse";
    /** The consumer refuses this collection-valid Preset (checked in the real `importPresetData`). */
    consumerRefuses?: boolean;
    /** The stored read gives the same decision as the file (slice 1b: one collection check). */
    storageParity: boolean;
    /** A refused Preset mutates nothing at `importPreset`, and an accepted one applies its checked data. */
    entryParity: boolean;
    observed: Observed;
}

const ok = (graph: AnyGraph, extra: Partial<SamplePreset> = {}): SamplePreset => ({id: "p", data: graph.defaultPreset(), ...extra});

const samples: Sample[] = [
    // Generic state (BaseCurveGraph.importPreset forces its own selection state).
    {name: "bezier: valid", graph: () => new BezierCurveGraph(), preset: () => ({id: "p", data: bezierData, boardState: {boundingBox: [-5, 5, 5, -5]}, graphState: {initialized: true, curveSelected: false}}),
        file: "accept", storageParity: true, entryParity: true, observed: {bounds: 1, state: 1, data: "checked", warned: false}},
    {name: "bezier: invalid model data", graph: () => new BezierCurveGraph(), preset: () => ({id: "p", data: [["unknown", {}]]}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "bezier: invalid bounds", graph: () => new BezierCurveGraph(), preset: () => ({id: "p", data: bezierData, boardState: {boundingBox: [5, 5, -5, -5]}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "bezier: generic state of the wrong type", graph: () => new BezierCurveGraph(), preset: () => ({id: "p", data: bezierData, graphState: {showControlPolygon: "yes"}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "bezier: graphState not a record", graph: () => new BezierCurveGraph(), preset: () => ({id: "p", data: bezierData, graphState: "x" as unknown as object}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    // Interpolation: custom state checker (the six fields are re-checked against the data rules).
    {name: "interpolation: valid", graph: () => new InterpolationGraph(), preset: g => ok(g, {graphState: {initialized: true, t: 0.5, notice: ""}}),
        // Slice 3: the omitted view starts from the initial view, one more bounding-box write.
        file: "accept", storageParity: true, entryParity: true, observed: {bounds: 2, state: 1, data: "checked", warned: false}},
    {name: "interpolation: custom state out of range", graph: () => new InterpolationGraph(), preset: g => ok(g, {graphState: {t: 2}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "interpolation: unknown notice", graph: () => new InterpolationGraph(), preset: g => ok(g, {graphState: {notice: "boom"}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "interpolation: invalid model data", graph: () => new InterpolationGraph(), preset: () => ({id: "p", data: {points: [[0, 0]], parameterRule: "nope", showHull: true, showBezier: true, t: 0}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    // Projective strict state: only `initialized` is allowed, `model` belongs to `data`.
    {name: "five-point: valid", graph: () => new FivePointGraph(), preset: g => ok(g, {graphState: {initialized: true}}),
        file: "accept", storageParity: true, entryParity: true, observed: {bounds: 1, state: 1, data: "checked", warned: false}},
    {name: "five-point: forbidden model in graphState", graph: () => new FivePointGraph(), preset: g => ok(g, {graphState: {initialized: true, model: g.defaultPreset()}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "five-point: forbidden extra field", graph: () => new FivePointGraph(), preset: g => ok(g, {graphState: {lastUnique: 1}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "five-point: invalid model data", graph: () => new FivePointGraph(), preset: () => ({id: "p", data: {}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    // The shared B-spline collection (degrees other than 2/3 are collection-valid), and consumer limits.
    {name: "nurbs: valid degree-2 curve", graph: () => new BSplineNurbsGraph(), preset: () => ({id: "p", data: bsplineOk(2, [[0, 0], [1, 1], [2, 0]])}),
        file: "accept", storageParity: true, entryParity: true, observed: {bounds: 1, state: 1, data: "checked", warned: false}},
    {name: "nurbs: degree-1 curve is accepted by file, storage and the compatible graph", graph: () => new BSplineNurbsGraph(),
        preset: () => ({id: "p", data: bsplineOk(1, [[0, 0], [1, 1]])}),
        file: "accept", storageParity: true, entryParity: true, observed: {bounds: 1, state: 1, data: "checked", warned: false}},
    {name: "blossom: the same degree-1 curve is refused by this consumer",
        graph: () => new BSplineBlossomGraph(), preset: () => ({id: "p", data: bsplineOk(1, [[0, 0], [1, 1]]), boardState: {boundingBox: [-1, 1, 1, -1]}, graphState: {initialized: true}}),
        file: "accept", consumerRefuses: true, storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "nurbs: collection-valid 17 points exceed the consumer limit of 16", graph: () => new BSplineNurbsGraph(),
        preset: () => ({id: "p", data: bsplineOk(2, Array.from({length: 17}, (_, i) => [i, i % 3])), boardState: {boundingBox: [-1, 1, 1, -1]}}),
        file: "accept", consumerRefuses: true, storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "nurbs: bspline graphState of the wrong shape", graph: () => new BSplineNurbsGraph(),
        preset: () => ({id: "p", data: bsplineOk(2, [[0, 0], [1, 1], [2, 0]]), graphState: {points: [["x"]]}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
    {name: "nurbs: bspline model data with a bad knot vector", graph: () => new BSplineNurbsGraph(),
        preset: () => ({id: "p", data: {degree: 2, points: [[0, 0], [1, 1], [2, 0]], knots: [0, 0, 1, 1]}}),
        file: "refuse", storageParity: true, entryParity: true, observed: {bounds: 0, state: 0, data: "none", warned: false}},
];

beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("persisted entry paths on P1 samples", () => {
    describe("observed decisions", () => {
        it.each(samples)("file: $name", s => {
            expect(fileDecision(s.graph().presets()!, s.preset(s.graph()))).toBe(s.file);
        });
        it.each(samples)("graph entry (importPreset): $name", s => {
            const graph = s.graph();
            expect(entry(graph, s.preset(graph), !!s.consumerRefuses)).toEqual(s.observed);
        });
    });

    describe("storage read gives the file's decision (envelope-only today)", () => {
        for (const s of samples) {
            (s.storageParity ? it : it.fails)(s.name, () => {
                const graph = s.graph();
                expect(storageDecision(graph.presets()!, [s.preset(graph)])).toBe(s.file);
            });
        }
    });

    describe("graph entry refuses before mutating and applies only checked data", () => {
        for (const s of samples) {
            (s.entryParity ? it : it.fails)(s.name, () => {
                const graph = s.graph();
                const seen = entry(graph, s.preset(graph), !!s.consumerRefuses);
                if (s.file === "accept" && !s.consumerRefuses) {
                    expect(seen.data).toBe("checked");
                } else {
                    // Refused by the collection or by the consumer: no bounds or state write, no default substituted.
                    expect(seen).toMatchObject({bounds: 0, state: 0});
                    expect(["none", "threw"]).toContain(seen.data);
                }
            });
        }
    });

    describe("figure entry (checkPersistedPreset and figurePresetGraphState)", () => {
        it.each(samples.filter(s => s.name.includes("invalid model data") || s.name.includes("bad knot")))("collection-invalid data is a visible refusal, not a default scene: $name", s => {
            const graph = s.graph();
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            expect(() => (graph as unknown as Probe).checkPersistedPreset(s.preset(graph))).toThrow(LocalizedError);
            expect(warn).not.toHaveBeenCalled();
        });
        it("an unknown graphState field (strict projective state) is refused before the figure scene state is built", () => {
            const graph = new FivePointGraph();
            expect(() => (graph as unknown as Probe).checkPersistedPreset({id: "p", graphState: {initialized: true, bogus: "x"}})).toThrow(LocalizedError);
        });
        it("a checked Preset is a normalized copy that shares nothing with the raw value", () => {
            const graph = new FivePointGraph();
            const raw = {id: "p", data: graph.defaultPreset(), graphState: {initialized: true}, boardState: {boundingBox: [-1, 1, 1, -1] as [number, number, number, number]}};
            const checked = (graph as unknown as Probe).checkPersistedPreset(raw);
            expect(checked).toEqual(raw);
            expect(checked.boardState).not.toBe(raw.boardState);
            expect(checked.graphState).not.toBe(raw.graphState);
        });
    });

    describe("explicit null and refusal context", () => {
        it("explicit null data is not omission: file and graph entry agree", () => {
            const graph = new BezierCurveGraph();
            const preset: SamplePreset = {id: "p", data: null};
            expect(fileDecision("bezier-curve", preset)).toBe("refuse");
            expect(storageDecision("bezier-curve", [preset])).toBe("refuse");
            expect(entry(graph, preset, false)).toEqual({bounds: 0, state: 0, data: "none", warned: false});
        });
        it("the file refusal names the collection, the Preset and the field, in both languages", () => {
            const contents = FILE("bezier-curve", {id: "Moja", data: bezierData, boardState: {boundingBox: [5, 5, -5, -5]}});
            expect(() => preflightPresetImport(contents)).toThrow("zbirka bezier-curve, prednastavitev Moja, polje boardState: neveljavne meje grafa");
            setLanguage("en");
            expect(() => preflightPresetImport(contents)).toThrow("collection bezier-curve, Preset Moja, field boardState: invalid graph bounds");
            setLanguage("sl");
        });
        it("a name problem names the collection", () => {
            const contents = JSON.stringify({"preset-bezier-curve": {data: [{id: "a"}, {id: "a"}]}});
            expect(() => preflightPresetImport(contents)).toThrow("zbirka bezier-curve: manjkajoče ali podvojeno ime prednastavitve");
        });
        it("a stored collection that fails the check keeps its raw value; save and remove refuse; backup skips it", () => {
            const raw = JSON.stringify({data: [{id: "a", data: [["unknown", {}]]}]});
            appStorage.setItem("preset-bezier-curve", raw);
            const service = new PresetService("bezier-curve");
            expect(service.loadPresets().problem).toBeDefined();
            expect(service.getPreset("a")).toBeUndefined();
            expect(service.savePreset({id: "x"}).problem).toBeDefined();
            expect(service.removePreset("a").problem).toBeDefined();
            expect(appStorage.getItem("preset-bezier-curve")).toBe(raw);
            expect(service.exportAll().skipped).toEqual(["preset-bezier-curve"]);
        });
    });

    describe("collection envelopes", () => {
        const rows: {name: string; ids: unknown[]; file: "accept" | "refuse"; storage: "accept" | "refuse"}[] = [
            {name: "unique nonblank names", ids: ["a", "b"], file: "accept", storage: "accept"},
            {name: "blank name", ids: ["  "], file: "refuse", storage: "refuse"},
            {name: "empty name", ids: [""], file: "refuse", storage: "refuse"},
            {name: "duplicate names", ids: ["a", "a"], file: "refuse", storage: "refuse"},
            {name: "non-text name", ids: [1], file: "refuse", storage: "refuse"},
        ];
        it.each(rows)("observed file and storage decision: $name", row => {
            const presets = row.ids.map(id => ({id, data: bezierData}));
            const contents = JSON.stringify({"preset-bezier-curve": {data: presets}});
            let decision: "accept" | "refuse" = "accept";
            try { preflightPresetImport(contents); } catch { decision = "refuse"; }
            expect(decision).toBe(row.file);
            expect(storageDecision("bezier-curve", presets)).toBe(row.storage);
        });
        it("storage that is not an envelope is unreadable and its raw value stays", () => {
            appStorage.setItem("preset-bezier-curve", "{not json");
            const service = new PresetService("bezier-curve");
            expect(service.loadPresets().problem).toBeDefined();
            service.savePreset({id: "x"});
            expect(appStorage.getItem("preset-bezier-curve")).toBe("{not json");
        });
        it("a collection with a blank name is unreadable and saving does not rewrite it", () => {
            const raw = JSON.stringify({data: [{id: " ", data: bezierData}]});
            appStorage.setItem("preset-bezier-curve", raw);
            const service = new PresetService("bezier-curve");
            expect(service.loadPresets().problem).toBeDefined();
            expect(service.savePreset({id: "x"}).problem).toBeDefined();
            expect(appStorage.getItem("preset-bezier-curve")).toBe(raw);
        });
    });
});
