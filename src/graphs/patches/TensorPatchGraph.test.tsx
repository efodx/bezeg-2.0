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
    replaceScene() { this.syncReplacedScene(); }
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
        expect(view.descriptions).toEqual([t("surface_view_keys")]);
        expect(graph.getWorkspacePanels({}).title).toBeDefined();
    });

    it("renders the current-v iso-curve and its derived control polygon from the net", () => {
        const {graph, view} = mount();
        const capabilities = graph.getLessonCapabilities();
        expect(view.last.polylines.some(line => line.id === "sweep-v-curve" || line.id === "sweep-v-controls")).toBe(false);
        act(() => {
            capabilities.apply({kind: "animation", animationId: "patch-v-sweep", command: "play"});
            capabilities.apply({kind: "animation", animationId: "patch-v-sweep", command: "pause"});
        });
        const bernstein = (degree: number, t: number) => Array.from({length: degree + 1}, (_, i) => {
            const choose = degree === 1 ? 1 : i === 0 || i === degree ? 1 : degree;
            return choose * (1 - t) ** (degree - i) * t ** i;
        });
        const expected = (u: number, v: number): Xyz => {
            const bu = bernstein(graph.state.m, u), bv = bernstein(graph.state.n, v);
            return graph.state.net.flat().reduce((sum, p, k) => {
                const weight = bu[Math.floor(k / (graph.state.n + 1))] * bv[k % (graph.state.n + 1)];
                return sum.map((value, axis) => value + weight * p[axis]) as Xyz;
            }, [0, 0, 0] as Xyz);
        };
        const expectedControls = (v: number): Xyz[] => {
            const bv = bernstein(graph.state.n, v);
            return graph.state.net.map(row => row.reduce((sum, p, j) => sum.map((value, axis) => value + bv[j] * p[axis]) as Xyz, [0, 0, 0] as Xyz));
        };
        const movingCurve = () => view.last.polylines.find(line => line.id === "sweep-v-curve");
        const movingControls = () => view.last.polylines.find(line => line.id === "sweep-v-controls");
        expect(movingCurve()).toBeDefined();
        expect(movingControls()).toBeDefined();
        const initialRevision = view.last.revision;
        const curveAt = movingCurve()!.points;
        const controlsAt = movingControls()!.points;
        expect(curveAt).toHaveLength(33);
        curveAt.forEach((point, k) => close(point, expected(k / 32, graph.state.v)));
        controlsAt.forEach((point, i) => close(point, expectedControls(graph.state.v)[i]));

        act(() => graph.setParameter("v", 0.8));
        expect(view.last.revision).toBeGreaterThan(initialRevision);
        expect(movingCurve()!.points).not.toEqual(curveAt);
        expect(movingControls()!.points).not.toEqual(controlsAt);
        movingCurve()!.points.forEach((point, k) => close(point, expected(k / 32, 0.8)));
        movingControls()!.points.forEach((point, i) => close(point, expectedControls(0.8)[i]));
        act(() => capabilities.apply({kind: "animation", animationId: "patch-v-sweep", command: "stop"}));
        expect(view.last.polylines.some(line => line.id === "sweep-v-curve" || line.id === "sweep-v-controls")).toBe(false);
    });
});

describe("edits", () => {
    it("a drag start at the point's own position keeps the net and does not rebuild the geometry", () => {
        const {graph, view} = mount();
        const net = graph.state.net;
        view.emit({kind: "select", pointId: "p-1-2"});
        const revision = view.last.revision;
        view.emit({kind: "point", pointId: "p-1-2", xyz: [...net[1][2]], phase: "start"});
        expect(graph.state.net).toBe(net);
        expect(view.last.revision).toBe(revision);
        view.emit({kind: "point", pointId: "p-1-2", xyz: [net[1][2][0], net[1][2][1], 9], phase: "move"});
        expect(graph.state.net).not.toBe(net);
    });
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
    it("selecting marks and highlights the point with a revision bump (the view redraws polylines on one) and is transient, not in the Preset", () => {
        const {graph, view} = mount();
        const revision = view.last.revision;
        view.emit({kind: "select", pointId: "p-2-2"});
        expect(view.last.points.filter(p => p.selected).map(p => p.id)).toEqual(["p-2-2"]);
        expect(view.last.polylines.filter(p => p.role === "highlight")).toHaveLength(2);
        expect(view.last.revision).toBeGreaterThan(revision);
        expect(JSON.stringify(graph.getLessonCapabilities().captureState().value)).toContain('"selectedPoint":"p-2-2"');
        expect(JSON.stringify(graph.exportPreset())).not.toContain("p-2-2");
    });
    it("setParameter moves the marker to S(u,v) and clamps to [0,1]", () => {
        const {graph, view} = mount();
        const revision = view.last.revision;
        act(() => graph.setParameter("u", 0.2));
        expect(view.last.revision).toBe(revision);
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
    it("lowering u leaves the v direction untouched and lowering after raising restores the net", () => {
        const {graph} = mount();
        const original = graph.state.net;
        act(() => graph.setDegree("u", 4));
        act(() => graph.setDegree("u", 3));
        graph.state.net.forEach((row, i) => row.forEach((p, j) => close(p, original[i][j], 12)));
        act(() => graph.setDegree("u", 2));
        expect(graph.state.net[0]).toHaveLength(4);
        expect(graph.state.net[0].map(p => p[1])).toEqual(original[0].map(p => p[1]));
    });
    it("lowering u of a net that is ruled in u keeps the surface (z = 0, 2, 0 along v)", () => {
        const {graph} = mount();
        const net: Xyz[][] = [0, 1, 2].map(i => [0, 1, 2].map((j): Xyz => [j, i, [0, 2, 0][j]]));
        act(() => graph.setState({m: 2, n: 2, net}));
        const before = samples.map(([u, v]) => at(graph, u, v));
        act(() => graph.setDegree("u", 1));
        expect([graph.state.m, graph.state.n]).toEqual([1, 2]);
        samples.forEach(([u, v], k) => close(at(graph, u, v), before[k], 12));
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
        const {graph, view} = mount();
        act(() => graph.setDegree("u", 2));
        act(() => view.emit({kind: "camera", camera: {...graph.state.camera, az: 1.1, el: 0.3, distance: 13}}));
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
        expect(other.graph.state.camera).toEqual(graph.state.camera);
        expect(other.graph.state.camera).toMatchObject({az: 1.1, el: 0.3, distance: 13});
        expect(other.graph.state.zMode).toBe(false);
        expect(other.view.last.mesh).toBeUndefined();
        expect(other.view.last.polylines.filter(p => p.id.startsWith("iso-u-"))).toHaveLength(17);
    });
    it("a Preset's graphState cannot inject surface state", () => {
        const {graph} = mount();
        const net = graph.state.net;
        act(() => graph.importPreset(JSON.parse('{"id": "hostile", "graphState": {"m": 99, "isoDensity": 100000, "u": 7}}')));
        expect(graph.state.m).toBe(3);
        expect(graph.state.isoDensity).toBe(8);
        expect(graph.state.u).not.toBe(7);
        expect(graph.state.net).toHaveLength(net.length);
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
        expect(view.labels[view.labels.length - 1]).toBe("Three-dimensional view of the patch");
        expect(view.descriptions[view.descriptions.length - 1]).toBe("Arrow keys orbit the view; plus and minus keys zoom it.");
    });
    it("logs the attach error instead of swallowing it", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const failure = new Error("no webgl");
        mount(new FakeSurfaceView(Promise.reject(failure)));
        await act(async () => { await Promise.resolve(); });
        expect(warn).toHaveBeenCalledWith(expect.any(String), failure);
        warn.mockRestore();
    });
    it("a scene replacement cannot bring back a stale unavailable flag, and a failed view stays flagged", async () => {
        const {graph} = mount();
        act(() => graph.setState({surfaceUnavailable: true}));
        act(() => graph.replaceScene());
        expect(graph.state.surfaceUnavailable).toBe(false);

        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const failed = mount(new FakeSurfaceView(Promise.reject(new Error("no webgl"))));
        await act(async () => { await Promise.resolve(); });
        act(() => failed.graph.setState({surfaceUnavailable: false}));
        act(() => failed.graph.replaceScene());
        expect(failed.graph.state.surfaceUnavailable).toBe(true);
        warn.mockRestore();
    });
});
