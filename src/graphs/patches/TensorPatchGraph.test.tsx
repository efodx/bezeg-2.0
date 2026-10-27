import {act, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import {patchPresetCollections} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import TensorPatchGraph from "./TensorPatchGraph";
import type {SurfaceCamera, Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
afterEach(() => setLanguage("sl"));

class ExposedGraph extends TensorPatchGraph {
    figureState() { return this.figurePresetGraphState(); }
}

function mount(view = new FakeSurfaceView()) {
    const graph = new ExposedGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}
const at = (graph: TensorPatchGraph, u: number, v: number): Xyz => {
    const p = patchFromNet(graph.state.net).eval(u, v);
    return [p.X(), p.Y(), p.Z()];
};
const close = (a: readonly number[], b: readonly number[], digits = 12) => a.forEach((x, k) => expect(x).toBeCloseTo(b[k], digits));
const samples: ReadonlyArray<readonly [number, number]> = [[0, 0], [0.13, 0.9], [0.5, 0.5], [0.77, 0.21], [1, 1]];

describe("default scene", () => {
    it("reconciles the bicubic dome with a positive revision and the localized view label", () => {
        const {graph, view} = mount();
        expect(view.scenes.length).toBeGreaterThan(0);
        expect(view.last.revision).toBeGreaterThanOrEqual(1);
        expect(view.last.points).toHaveLength(16);
        expect(graph.state.m).toBe(3);
        expect(view.last.markers[0].xyz[2]).toBeGreaterThan(1);
        expect(view.labels).toEqual([t("surface_view_label")]);
        expect(graph.getWorkspacePanels({}).title).toBeDefined();
    });
});

describe("edits", () => {
    it("a point move changes the net and bumps the revision", () => {
        const {graph, view} = mount();
        const before = view.last.revision;
        view.emit({kind: "point", pointId: "p-1-2", xyz: [0.25, 0.5, 4], phase: "move"});
        expect(graph.state.net[1][2]).toEqual([0.25, 0.5, 4]);
        expect(graph.state.net[1][1]).toEqual([-0.5, -0.5, 2.5]);
        expect(view.last.revision).toBeGreaterThan(before);
        expect(view.last.points.find(p => p.id === "p-1-2")?.xyz).toEqual([0.25, 0.5, 4]);
    });
    it("rejects a move of a point the net does not have", () => {
        const {graph, view} = mount();
        const net = graph.state.net;
        view.emit({kind: "point", pointId: "p-9-9", xyz: [1, 1, 1], phase: "move"});
        expect(graph.state.net).toBe(net);
    });
    it("a camera edit changes the camera but not the revision", () => {
        const {graph, view} = mount();
        const revision = view.last.revision;
        const camera: SurfaceCamera = {...graph.state.camera, az: 1.25, distance: 11};
        view.emit({kind: "camera", camera});
        expect(graph.state.camera).toEqual(camera);
        expect(view.last.camera).toEqual(camera);
        expect(view.last.revision).toBe(revision);
    });
    it("selecting marks the point without a revision bump and is transient, not in the Preset", () => {
        const {graph, view} = mount();
        const revision = view.last.revision;
        view.emit({kind: "select", pointId: "p-2-2"});
        expect(view.last.points.filter(p => p.selected).map(p => p.id)).toEqual(["p-2-2"]);
        expect(view.last.revision).toBe(revision);
        expect(JSON.stringify(graph.getLessonCapabilities().captureState().value)).toContain('"selectedPoint":"p-2-2"');
        expect(JSON.stringify(graph.exportPreset())).not.toContain("p-2-2");
    });
    it("setParameter moves the marker to S(u,v) and clamps to [0,1]", () => {
        const {graph, view} = mount();
        const revision = view.last.revision;
        act(() => graph.setParameter("u", 0.2));
        act(() => graph.setParameter("v", 7));
        expect(graph.state.v).toBe(1);
        close(view.last.markers[0].xyz, at(graph, 0.2, 1));
        expect(view.last.revision).toBe(revision);
    });
});

describe("degree changes", () => {
    it("raising keeps S(u,v) at sample parameters (exact elevation)", () => {
        const {graph, view} = mount();
        const before = samples.map(([u, v]) => at(graph, u, v));
        act(() => graph.setDegree("u", 4));
        act(() => graph.setDegree("v", 4));
        expect([graph.state.m, graph.state.n]).toEqual([4, 4]);
        expect(graph.state.net).toHaveLength(5);
        samples.forEach(([u, v], k) => close(at(graph, u, v), before[k]));
        expect(view.last.points).toHaveLength(25);
    });
    it("lowering keeps the four corners", () => {
        const {graph} = mount();
        const corners = [[0, 0], [0, 1], [1, 0], [1, 1]] as const;
        const before = corners.map(([u, v]) => at(graph, u, v));
        act(() => graph.setDegree("u", 1));
        act(() => graph.setDegree("v", 2));
        expect([graph.state.m, graph.state.n]).toEqual([1, 2]);
        corners.forEach(([u, v], k) => close(at(graph, u, v), before[k]));
    });
    it("ignores degrees outside 1 to 4 and clears a selection the smaller net no longer has", () => {
        const {graph, view} = mount();
        act(() => graph.setDegree("u", 5));
        act(() => graph.setDegree("u", 0));
        expect(graph.state.m).toBe(3);
        view.emit({kind: "select", pointId: "p-3-3"});
        act(() => graph.setDegree("u", 1));
        expect(view.last.points.some(p => p.selected)).toBe(false);
    });
});

describe("Presets", () => {
    it("exports the whole patch state in the DTO and re-imports it unchanged", () => {
        const {graph} = mount();
        act(() => graph.setDegree("u", 2));
        act(() => { graph.setParameter("u", 0.3); graph.setParameter("v", 0.8); graph.setDensity("iso", 16); graph.setDensity("shading", 8); graph.setVisibility("showShading", false); });
        act(() => graph.setZMode(true));
        const preset = graph.exportPreset();
        expect(preset.graphState).toEqual({initialized: true});
        expect("boardState" in preset).toBe(false);
        const data = JSON.parse(JSON.stringify(preset.data));
        expect("data" in patchPresetCollections["patch-tensor"].check(data)).toBe(true);
        expect(data[0][1]).toMatchObject({m: 2, n: 3, state: {u: 0.3, v: 0.8, isoDensity: 16, shadingDensity: 8, showShading: false}});
        expect(JSON.stringify(data)).not.toContain("zMode");

        const other = mount();
        act(() => other.graph.importPreset(JSON.parse(JSON.stringify(preset))));
        expect(other.graph.exportPresetData()).toEqual(graph.exportPresetData());
        expect(other.graph.state.zMode).toBe(false);
        expect(other.view.last.mesh).toBeUndefined();
        expect(other.view.last.polylines.filter(p => p.id.startsWith("iso-u-"))).toHaveLength(17);
    });
    it("a figure Preset keeps the imported surface", () => {
        const {graph} = mount();
        act(() => graph.setDegree("v", 1));
        const state = graph.figureState();
        expect(state.net).toBe(graph.state.net);
        expect(state.initialized).toBe(true);
    });
});

describe("view lifecycle", () => {
    it("disposes the view exactly once on unmount", () => {
        const {view, rendered} = mount();
        expect(view.disposed).toBe(0);
        rendered.unmount();
        expect(view.disposed).toBe(1);
    });
    it("a rejected attach sets the unavailable flag and shows the localized message", async () => {
        const view = new FakeSurfaceView(Promise.reject(new Error("no webgl")));
        const {graph} = mount(view);
        await act(async () => { await Promise.resolve(); });
        expect(graph.state.surfaceUnavailable).toBe(true);
        expect(screen.getByRole("alert").textContent).toBe(t("surface_unavailable"));
    });
    it("a language switch relabels the view", () => {
        const {view} = mount();
        act(() => setLanguage("en"));
        expect(view.labels[view.labels.length - 1]).toBe("Three-dimensional view of the patch. Arrow keys orbit the view; plus and minus keys zoom it.");
    });
});
