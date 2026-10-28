import {act, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {setLanguage} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorJoinGraph, {type JoinStateDto} from "./TensorJoinGraph";
import {buildJoinScene} from "./TensorJoinScene";
import {patchFromNet} from "./patchSceneBuilder";
import {type TensorPatchDto, tensorPatchToDto} from "./patchDto";
import {joinStartingScenes, patchPresetCollections} from "./patchPresetCollections";
import {classifyJoin, enforceJoin, type JoinContinuity} from "./tensorJoins";
import type {Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => { setLanguage("sl"); vi.restoreAllMocks(); });

function mount() {
    const view = new FakeSurfaceView();
    const graph = new TensorJoinGraph({viewFactory: () => view});
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

const drag = (view: FakeSurfaceView, pointId: string, xyz: Xyz) => view.emit({kind: "point", pointId, xyz, phase: "move"});
const mode = (graph: TensorJoinGraph, next: JoinContinuity) => act(() => graph.setJoinContinuity(next));
const report = (graph: TensorJoinGraph) => classifyJoin(graph.state.net, graph.bNet());
const add = (a: Xyz, b: Xyz): Xyz => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** `B`'s rows 0 and 1 by the textbook identities, from the displayed `A`: `Q_0j = P_mj`, `Q_1j = Q_0j + alpha (mA/mB)(P_mj - P_{m-1,j})`. */
function expectedRows(graph: TensorJoinGraph, alpha: number): [Xyz[], Xyz[]] {
    const {net} = graph.state;
    const mA = net.length - 1, mB = graph.bNet().length - 1;
    const row0 = net[mA].map((p): Xyz => [...p]);
    return [row0, row0.map((p, j): Xyz => {
        const f = alpha * mA / mB;
        return add(p, [f * (net[mA][j][0] - net[mA - 1][j][0]), f * (net[mA][j][1] - net[mA - 1][j][1]), f * (net[mA][j][2] - net[mA - 1][j][2])]);
    })];
}

const grid = [0, 0.25, 0.5, 0.75, 1];
const samples = (net: ReadonlyArray<ReadonlyArray<Xyz>>): Xyz[] => {
    const patch = patchFromNet(net);
    return grid.flatMap(u => grid.map((v): Xyz => { const p = patch.eval(u, v); return [p.X(), p.Y(), p.Z?.() ?? 0]; }));
};
const expectSamples = (actual: Xyz[], expected: Xyz[]) => actual.forEach((p, k) => p.forEach((value, c) => expect(value).toBeCloseTo(expected[k][c], 9)));

/** The tensor patch DTO of the graph's exported data. */
function exportedDto(graph: TensorJoinGraph): TensorPatchDto {
    const entry = graph.exportPresetData()[0];
    if (entry[0] !== "TensorProductBezierPatch") throw new Error("not a tensor patch");
    return entry[1];
}

const flat = (net: ReadonlyArray<ReadonlyArray<Xyz>>) => net.flatMap(row => row.map((p): Xyz => [...p]));

/** A DTO in `none` mode with the given nets and optional settings. */
function dtoOf(netA: Xyz[][], netB: Xyz[][], state: JoinStateDto = {}) {
    return [["TensorProductBezierPatch", {...tensorPatchToDto(patchFromNet(netA)), state: {
        ...state, mB: netB.length - 1, nB: netB[0].length - 1, netB: flat(netB),
    }}]] as const;
}

describe("starting scene", () => {
    it("starts as two bicubic patches joined C1 with ratio 2 stored, and the scene shows both", () => {
        const {graph, view} = mount();
        expect(graph.state).toMatchObject({m: 3, n: 3, mB: 3, nB: 3, joinContinuity: "c1", joinAlpha: 2, joinV: 0.5});
        expect(report(graph)).toMatchObject({c0: true, c1: true, matchedDegree: 3});
        expect(view.last).toEqual(buildJoinScene({...graph.state, netB: graph.bNet(), joinV: 0.5}, view.last.revision));
        expect(view.last.points.filter(p => p.id.startsWith("b-"))).toHaveLength(16);
        expect(view.last.polylines.some(item => item.role === "net-2")).toBe(true);
    });
    it("exposes the join report of the displayed nets", () => {
        const {graph} = mount();
        expect(graph.joinReport()).toEqual(report(graph));
        expect(graph.joinReport().derivativesVanish).toBe(false);
    });
});

describe("the report classifies the displayed nets, whatever mode produced them", () => {
    it("C0 only is not C1; G1 with ratio 2 is G1 and not C1; C1 is C1", () => {
        const {graph, view} = mount();
        mode(graph, "c0");
        drag(view, "b-1-1", [4.5, 0.2, 3]);
        expect(report(graph)).toMatchObject({c0: true, c1: false, g1: false});
        mode(graph, "g1");
        expect(report(graph)).toMatchObject({c0: true, c1: false, g1: true});
        expect(report(graph).alphaStar).toBeCloseTo(2, 9);
        act(() => graph.setJoinAlpha(1));
        expect(report(graph)).toMatchObject({c1: true, g1: true});
        expect(report(graph).alphaStar).toBeCloseTo(1, 9);
        mode(graph, "c1");
        expect(report(graph)).toMatchObject({c0: true, c1: true});
    });
    it("none leaves a gap that the report sees", () => {
        const {graph, view} = mount();
        mode(graph, "none");
        drag(view, "b-0-0", [3.5, -1.5, 1]);
        expect(report(graph)).toMatchObject({c0: false, c1: false, g1: false});
        expect(report(graph).positionGap).toBeGreaterThan(0.1);
    });
});

describe("editing A re-derives B in the same write", () => {
    it.each([["c0", 1], ["c1", 1], ["g1", 3]] as const)("%s (alpha %d): B's derived rows follow an A point and a B point stays", (joinMode, alpha) => {
        const {graph, view} = mount();
        mode(graph, joinMode);
        act(() => graph.setJoinAlpha(alpha));
        const untouched = graph.bNet()[2][1];
        const before = view.scenes.length;
        drag(view, "p-3-1", [2.8, -0.5, 2.4]);
        expect(view.scenes.length - before).toBe(1);
        expect(graph.state.net[3][1]).toEqual([2.8, -0.5, 2.4]);
        const [row0, row1] = expectedRows(graph, joinMode === "g1" ? alpha : 1);
        expect(graph.bNet()[0]).toEqual(row0);
        if (joinMode !== "c0") graph.bNet()[1].forEach((p, j) => p.forEach((value, c) => expect(value).toBeCloseTo(row1[j][c], 12)));
        expect(graph.bNet()[2][1]).toEqual(untouched);
        expect(view.last.points.find(p => p.id === "b-0-1")!.xyz).toEqual(graph.bNet()[0][1]);
        expect(report(graph)).toMatchObject({c0: true, c1: joinMode === "c1", g1: joinMode !== "c0"});
    });
    it("an A edit at an inner point changes B's row 1 for C1 (the second row of A feeds it) and nothing else", () => {
        const {graph, view} = mount();
        const before = graph.bNet();
        drag(view, "p-2-2", [1.9, 0.4, 4]);
        expect(graph.bNet()[1][2]).not.toEqual(before[1][2]);
        expect(graph.bNet()[0]).toEqual(before[0]);
        expect(graph.bNet()[2]).toEqual(before[2]);
        expect(report(graph).c1).toBe(true);
    });
    it("in none an A edit leaves B as it was (same array)", () => {
        const {graph, view} = mount();
        mode(graph, "none");
        const before = graph.bNet();
        drag(view, "p-3-1", [2.8, -0.5, 2.4]);
        expect(graph.bNet()).toBe(before);
    });
});

describe("B's derived points cannot be moved", () => {
    it("rejects moves and selection of rows 0 and 1 in C1 and of row 0 in C0, and moves the other points", () => {
        const {graph, view} = mount();
        const before = graph.bNet();
        drag(view, "b-0-1", [9, 9, 9]);
        drag(view, "b-1-2", [9, 9, 9]);
        expect(graph.bNet()).toBe(before);
        view.emit({kind: "select", pointId: "b-1-2"});
        expect(view.last.points.some(p => p.selected)).toBe(false);
        expect(graph.isDerivedRow(0) && graph.isDerivedRow(1) && !graph.isDerivedRow(2)).toBe(true);
        drag(view, "b-2-1", [5, 1, 1]);
        expect(graph.bNet()[2][1]).toEqual([5, 1, 1]);
        expect(graph.bNet()[1]).toEqual(before[1]);
        mode(graph, "c0");
        expect(graph.isDerivedRow(1)).toBe(false);
        drag(view, "b-1-2", [4, 1, 1]);
        expect(graph.bNet()[1][2]).toEqual([4, 1, 1]);
        drag(view, "b-0-2", [9, 9, 9]);
        expect(graph.bNet()[0][2]).not.toEqual([9, 9, 9]);
    });
    it("lets every B point move in none, and a non-finite coordinate or unknown id changes nothing", () => {
        const {graph, view} = mount();
        mode(graph, "none");
        drag(view, "b-0-1", [3.1, 0, 1]);
        expect(graph.bNet()[0][1]).toEqual([3.1, 0, 1]);
        const before = graph.bNet();
        drag(view, "b-0-1", [Number.NaN, 0, 1]);
        drag(view, "b-9-9", [0, 0, 0]);
        expect(graph.bNet()).toBe(before);
    });
    it("selects a draggable B point and names it", () => {
        const {graph, view} = mount();
        view.emit({kind: "select", pointId: "b-3-1"});
        expect(view.last.points.filter(p => p.selected).map(p => p.id)).toEqual(["b-3-1"]);
        act(() => graph.setSelectedCoordinates([6, 0, 0]));
        expect(graph.bNet()[3][1]).toEqual([6, 0, 0]);
    });
});

describe("degrees", () => {
    it("shares the v degree outside none: changing n changes both nets, in either patch's control", () => {
        const {graph} = mount();
        act(() => graph.setDegree("v", 2));
        expect(graph.state).toMatchObject({n: 2, nB: 2, m: 3, mB: 3});
        expect(report(graph)).toMatchObject({c1: true, matchedDegree: 2});
        act(() => graph.setBDegree("v", 1));
        expect(graph.state).toMatchObject({n: 1, nB: 1});
        expect(report(graph).c1).toBe(true);
        act(() => graph.setBDegree("v", 4));
        expect(graph.state).toMatchObject({n: 4, nB: 4});
        expect(report(graph).c1).toBe(true);
        expect(graph.bNet().every(row => row.length === 5) && graph.state.net.every(row => row.length === 5)).toBe(true);
    });
    it("keeps the u degrees independent, and B's own u degree re-derives its rows", () => {
        const {graph} = mount();
        act(() => graph.setBDegree("u", 2));
        expect(graph.state).toMatchObject({m: 3, mB: 2});
        expect(graph.bNet()).toHaveLength(3);
        expect(report(graph)).toMatchObject({c0: true, c1: true});
        act(() => graph.setDegree("u", 4));
        expect(graph.state).toMatchObject({m: 4, mB: 2});
        const [, row1] = expectedRows(graph, 1);
        graph.bNet()[1].forEach((p, j) => p.forEach((value, c) => expect(value).toBeCloseTo(row1[j][c], 12)));
        expect(report(graph).c1).toBe(true);
        act(() => graph.setBDegree("u", 1));
        expect(graph.bNet()).toHaveLength(2);
        expect(report(graph).c1).toBe(true);
    });
    it("keeps the v degrees independent in none and stores B as edited", () => {
        const {graph} = mount();
        mode(graph, "none");
        const before = graph.bNet();
        act(() => graph.setBDegree("v", 2));
        expect(graph.state).toMatchObject({n: 3, nB: 2});
        expect(graph.bNet().every(row => row.length === 3)).toBe(true);
        act(() => graph.setDegree("v", 4));
        expect(graph.state).toMatchObject({n: 4, nB: 2});
        expect(graph.bNet()).not.toBe(before);
        const stored = graph.bNet();
        act(() => graph.setJoinAlpha(3));
        expect(graph.bNet()).toEqual(stored);
    });
    it("ignores invalid degrees", () => {
        const {graph} = mount();
        const before = graph.state;
        act(() => { graph.setBDegree("u", 0); graph.setBDegree("v", 5); graph.setBDegree("u", 2.5); graph.setBDegree("u", 3); });
        expect(graph.state).toBe(before);
    });
    it("switching from none with unequal v degrees elevates the lower net without changing either surface", () => {
        const {graph} = mount();
        // A quadratic in v whose last row is the base of B; B is the exact elevation of a C1 continuation.
        const quadA: Xyz[][] = Array.from({length: 4}, (_, i) => Array.from({length: 3}, (_, j): Xyz => [i, j - 1, Math.sin(i + j)]));
        const cubicB = enforceJoin(patchFromNet(quadA).elevate("v").getControlNet().map(row => row.map((p): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0])),
            Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j): Xyz => [3 + i, j - 1.5, Math.cos(i - j)])), "c1");
        act(() => graph.importPresetData(dtoOf(quadA, cubicB, {joinContinuity: "none"})));
        expect(graph.state).toMatchObject({n: 2, nB: 3, joinContinuity: "none"});
        const [beforeA, beforeB] = [samples(graph.state.net), samples(graph.bNet())];
        mode(graph, "c1");
        expect(graph.state).toMatchObject({n: 3, nB: 3});
        expectSamples(samples(graph.state.net), beforeA);
        expectSamples(samples(graph.bNet()), beforeB);
        expect(report(graph).c1).toBe(true);
    });
    it("switching from none elevates B when it is the lower one", () => {
        const {graph} = mount();
        const quadB: Xyz[][] = Array.from({length: 4}, (_, i) => Array.from({length: 3}, (_, j): Xyz => [3 + i, j - 1, Math.cos(i + j)]));
        // B's first two rows are the c1 continuation of A's exact quadratic reduction, so deriving them changes nothing.
        const quadA: Xyz[][] = Array.from({length: 4}, (_, i) => Array.from({length: 3}, (_, j): Xyz => [i, j - 1, Math.sin(i + j)]));
        const elevatedA = patchFromNet(quadA).elevate("v").getControlNet().map(row => row.map((p): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0]));
        const base = enforceJoin(quadA, quadB, "c1");
        act(() => graph.importPresetData(dtoOf(elevatedA, base, {joinContinuity: "none"})));
        expect(graph.state).toMatchObject({n: 3, nB: 2});
        const [beforeA, beforeB] = [samples(graph.state.net), samples(graph.bNet())];
        mode(graph, "c1");
        expect(graph.state).toMatchObject({n: 3, nB: 3});
        expectSamples(samples(graph.state.net), beforeA);
        expectSamples(samples(graph.bNet()), beforeB);
    });
});

describe("mode, ratio and readout parameter", () => {
    it("G1 sets B's row 1 from the ratio; the ratio is clamped and a non-finite one is ignored", () => {
        const {graph} = mount();
        mode(graph, "g1");
        const [, row1] = expectedRows(graph, 2);
        graph.bNet()[1].forEach((p, j) => p.forEach((value, c) => expect(value).toBeCloseTo(row1[j][c], 12)));
        act(() => graph.setJoinAlpha(100));
        expect(graph.state.joinAlpha).toBe(4);
        act(() => graph.setJoinAlpha(0));
        expect(graph.state.joinAlpha).toBe(0.25);
        const state = graph.state;
        act(() => graph.setJoinAlpha(Number.NaN));
        expect(graph.state).toBe(state);
        const [, row1b] = expectedRows(graph, 0.25);
        graph.bNet()[1].forEach((p, j) => p.forEach((value, c) => expect(value).toBeCloseTo(row1b[j][c], 12)));
    });
    it("moves the cross-boundary arrows with joinV, clamps it and ignores a non-finite value", () => {
        const {graph, view} = mount();
        const startOfArrow = () => view.last.polylines.find(item => item.id === "join-su-a-shaft")!.points[0];
        act(() => graph.setJoinV(0));
        expect(startOfArrow()).toEqual(graph.state.net[3][0]);
        act(() => graph.setJoinV(7));
        expect(graph.state.joinV).toBe(1);
        expect(startOfArrow()).toEqual(graph.state.net[3][3]);
        act(() => graph.setJoinV(-3));
        expect(graph.state.joinV).toBe(0);
        act(() => graph.setJoinV(Number.NaN));
        expect(graph.state.joinV).toBe(0);
    });
    it("leaves the parameter of S(u, v) on A alone", () => {
        const {graph} = mount();
        act(() => graph.setJoinV(0.9));
        expect(graph.state.v).toBe(0.5);
    });
});

describe("Presets and starting patches", () => {
    it("round-trips the join state through the exported data", () => {
        const {graph, view} = mount();
        mode(graph, "g1");
        act(() => { graph.setJoinAlpha(1.5); graph.setJoinV(0.2); });
        drag(view, "b-3-2", [6, 0.5, 1]);
        const data = graph.exportPresetData();
        const dto = exportedDto(graph);
        const state: JoinStateDto = dto.state ?? {};
        expect(state).toMatchObject({joinContinuity: "g1", joinAlpha: 1.5, joinV: 0.2, mB: 3, nB: 3});
        expect(state.netB).toHaveLength(16);
        const saved = {net: graph.state.net, netB: graph.bNet()};
        act(() => { graph.setJoinContinuity("none"); graph.setJoinAlpha(3); drag(view, "p-3-3", [0, 0, 0]); });
        act(() => graph.importPresetData(data));
        expect(graph.state).toMatchObject({joinContinuity: "g1", joinAlpha: 1.5, joinV: 0.2});
        expect(graph.state.net).toEqual(saved.net);
        expect(graph.bNet()).toEqual(saved.netB);
    });
    it("re-derives B of an imported file in the mode it names, and gives a file without B a continuation of A", () => {
        const {graph, view} = mount();
        const state: JoinStateDto = exportedDto(graph).state ?? {};
        const dto = exportedDto(graph);
        const badB = graph.bNet().map(row => row.map((p): Xyz => add(p, [0, 0, 1])));
        act(() => graph.importPresetData(dtoOf(graph.state.net, badB, {...state, joinContinuity: "c1"})));
        expect(report(graph)).toMatchObject({c0: true, c1: true});
        expect(graph.bNet()[3]).toEqual(badB[3]);
        act(() => graph.importPresetData([["TensorProductBezierPatch", {m: dto.m, n: dto.n, net: dto.net}]]));
        expect(graph.state).toMatchObject({joinContinuity: "c1", joinAlpha: 2, joinV: 0.5, mB: 3, nB: 3});
        expect(report(graph).c1).toBe(true);
        expect(view.last.points.filter(p => p.id.startsWith("b-"))).toHaveLength(16);
    });
    it("falls back to the defaults for an unknown mode or a B net of the wrong size", () => {
        const {graph} = mount();
        const dto = exportedDto(graph);
        const baseState: JoinStateDto = dto.state ?? {};
        const wrong: JoinStateDto = {...dto.state, joinContinuity: "c9" as JoinContinuity, /* an imported file is not type checked */ netB: baseState.netB?.slice(1), joinAlpha: Number.NaN, joinV: 12};
        act(() => graph.importPresetData([["TensorProductBezierPatch", {...dto, state: wrong}]]));
        expect(graph.state).toMatchObject({joinContinuity: "c1", joinAlpha: 2, joinV: 1, mB: 3, nB: 3});
        expect(graph.bNet()).toHaveLength(4);
    });
    it("a starting patch replaces A, keeps the mode, ratio and joinV, and joins a continuation of it", () => {
        const {graph, view} = mount();
        mode(graph, "g1");
        act(() => { graph.setJoinAlpha(1.5); graph.setJoinV(0.8); });
        act(() => graph.useStartingPatch(0));
        expect(graph.state).toMatchObject({joinContinuity: "g1", joinAlpha: 1.5, joinV: 0.8});
        expect(report(graph).g1).toBe(true);
        expect(report(graph).alphaStar).toBeCloseTo(1.5, 9);
        expect(graph.state.m).toBe(1);
        expect(view.last.points.filter(p => p.id.startsWith("b-")).length).toBeGreaterThan(0);
    });
    it("Reset-style default data loads back to the starting state", () => {
        const {graph} = mount();
        const initial = graph.state;
        act(() => graph.setJoinContinuity("none"));
        act(() => graph.importPresetData(graph.defaultPreset()));
        expect(graph.state.net).toEqual(initial.net);
        expect(graph.bNet()).toEqual(initial.netB);
        expect(graph.state).toMatchObject({joinContinuity: "c1", joinAlpha: 2, joinV: 0.5});
    });

    it("restores, exports and exits the teapot Preset without exposing editable points", () => {
        const {graph, view} = mount();
        const capstone = joinStartingScenes.find(scene => scene.id === "join-teapot")!.data();
        act(() => graph.importPresetData(capstone));
        expect(graph.state.joinCapstone).toBe("teapot");
        expect(graph.presetCollection()).toBe(patchPresetCollections["patch-joins"]);
        expect(view.last.interaction.editable).toBe(false);
        expect(view.last.points).toEqual([]);
        expect(view.last.polylines.filter(line => line.role === "boundary")).toHaveLength(32 * 4);
        expect(view.last.mesh?.positions).toHaveLength(32 * 9 * 9 * 3);
        expect(exportedDto(graph).state?.joinCapstone).toBe("teapot");
        expect("data" in patchPresetCollections["patch-joins"].check(graph.exportPresetData())).toBe(true);
        const previousNet = graph.state.net;
        act(() => {
            graph.setJoinContinuity("g1");
            graph.setJoinAlpha(3);
            graph.setBDegree("u", 2);
            graph.setDegree("v", 2);
            graph.setJoinV(0.2);
            drag(view, "p-0-0", [9, 9, 9]);
        });
        expect(graph.state.net).toBe(previousNet);
        expect(graph.state.joinCapstone).toBe("teapot");
        act(() => graph.useDefaultPair());
        expect(graph.state.joinCapstone).toBeUndefined();
        expect(view.last.points.filter(point => point.id.startsWith("b-")).length).toBeGreaterThan(0);
    });
});
