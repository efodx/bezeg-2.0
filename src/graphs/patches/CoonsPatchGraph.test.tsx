import {act, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import {setLanguage, t} from "../../localization";
import {coonsBicubicNet, coonsBilinearNet} from "../../bezeg/impl/kernels/coons";
import {coonsMismatches, defaultCoonsBoundaries} from "./coonsScene";
import {coonsPresetCollection} from "./coonsPresetCollection";
import {patchPresetCollections} from "./patchPresetCollections";
import {presetCollections} from "../base/presets/PresetImport";
import CoonsPatchGraph from "./CoonsPatchGraph";
import {FakeSurfaceView} from "./FakeSurfaceView";
import type {SurfaceScene, Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
afterEach(() => setLanguage("sl"));

class ExposedGraph extends CoonsPatchGraph {
    restoreDefaultScene() { this.prepareLessonDefaultScene(); }
    edit() { return this.workspaceEdit(); }
}

function mount(view = new FakeSurfaceView()) {
    const graph = new ExposedGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}
const close = (a: readonly number[], b: readonly number[], digits = 12) => a.forEach((x, k) => expect(x).toBeCloseTo(b[k], digits));
/** The mesh vertex (i, j) of a scene: S(i/16, j/16) of the shown surface. */
const vertex = (scene: SurfaceScene, i: number, j: number): Xyz => {
    const positions = Array.from(scene.mesh!.positions);
    return [positions[3 * (i * 17 + j)], positions[3 * (i * 17 + j) + 1], positions[3 * (i * 17 + j) + 2]];
};
const drag = (view: FakeSurfaceView, pointId: string, xyz: Xyz) => {
    view.emit({kind: "point", pointId, xyz, phase: "start"});
    view.emit({kind: "point", pointId, xyz, phase: "move"});
    view.emit({kind: "point", pointId, xyz, phase: "end"});
};

describe("default scene (acceptance 1)", () => {
    it("shows the Coons patch: the mesh is the bicubic net's surface and the centre is (1.5, 1.5, 0.75)", () => {
        const {graph, view} = mount();
        expect(graph.state.shown).toBe("s");
        expect(graph.state.linkedCorners).toBe(true);
        expect(view.last.mesh!.faces.length).toBeGreaterThan(0);
        const net = coonsBicubicNet(graph.state.boundaries);
        close(vertex(view.last, 0, 0), net[0][0]);
        close(vertex(view.last, 16, 0), net[3][0]);
        close(vertex(view.last, 0, 16), net[0][3]);
        close(vertex(view.last, 16, 16), net[3][3]);
        close(vertex(view.last, 8, 8), [1.5, 1.5, 0.75], 6);
        close(view.last.markers[0].xyz, [1.5, 1.5, 0.75]);
        expect(view.last.polylines.filter(line => line.role === "net")).toHaveLength(8);
        const row1 = view.last.polylines.find(line => line.id === "net-row-1")!.points;
        close(row1[1], [1, 1, 4 / 3]);
        close(row1[2], [1, 2, 1 / 3]);
        const row2 = view.last.polylines.find(line => line.id === "net-row-2")!.points;
        close(row2[1], [2, 1, 5 / 3]);
        close(row2[2], [2, 2, 2 / 3]);
    });

    it("reads out the interior control points and says the four boundaries met", () => {
        const {graph} = mount();
        const {container} = render(<>{graph.edit()}</>);
        const value = (id: string) => container.querySelector(`[data-readout="${id}"] dd`)!.textContent;
        expect(value("p-1-1")).toBe("(1; 1; 1,333)");
        expect(value("p-1-2")).toBe("(1; 2; 0,333)");
        expect(value("p-2-1")).toBe("(2; 1; 1,667)");
        expect(value("p-2-2")).toBe("(2; 2; 0,667)");
        expect(value("centre")).toBe("(1,5; 1,5; 0,75)");
        expect(container.querySelector('[data-corner-status="met"]')!.textContent).toContain(t("coons_corners_met"));
        expect(screen.queryByText(t("coons_no_interpolation"))).toBeNull();
    });

    it("switching the shown surface rebuilds the mesh from that surface's net", () => {
        const {graph, view} = mount();
        const before = view.last;
        act(() => graph.setShown("b"));
        expect(view.last.revision).toBeGreaterThan(before.revision);
        const bilinear = coonsBilinearNet(graph.state.boundaries);
        close(vertex(view.last, 8, 8), [1.5, 1.5, 0], 6);
        close(vertex(view.last, 16, 16), bilinear[3][3]);
        close(view.last.markers[0].xyz, [1.5, 1.5, 0]);
        act(() => graph.setShown("lc"));
        close(vertex(view.last, 8, 8), [1.5, 1.5, 0.375], 6);
        act(() => graph.setShown("ld"));
        close(vertex(view.last, 8, 8), [1.5, 1.5, 0.375], 6);
    });
});

describe("editing (acceptance 2 and 4)", () => {
    it("dragging a linked corner keeps the corners met and the mesh boundary rows on the boundary points", () => {
        const {graph, view} = mount();
        const revision = view.last.revision;
        drag(view, "c1-3", [3.5, 3.5, 0.5]);
        expect(view.last.revision).toBeGreaterThan(revision);
        const {boundaries} = graph.state;
        expect(boundaries.c1[3]).toEqual([3.5, 3.5, 0.5]);
        expect(boundaries.d1[3]).toEqual([3.5, 3.5, 0.5]);
        expect(coonsMismatches(boundaries)).toEqual([]);
        close(vertex(view.last, 16, 16), [3.5, 3.5, 0.5]);
        close(vertex(view.last, 0, 16), boundaries.c1[0]);
        close(vertex(view.last, 16, 0), boundaries.c0[3]);
        expect(view.last.points).toHaveLength(12);
        expect(view.last.points.find(p => p.id === "c1-3")!.xyz).toEqual([3.5, 3.5, 0.5]);
    });

    it("an inner boundary control point rebuilds the mesh and leaves the others", () => {
        const {graph, view} = mount();
        const scenes = view.scenes.length;
        const revision = view.last.revision;
        drag(view, "c0-1", [1, 0, 4]);
        expect(view.scenes.length).toBeGreaterThan(scenes);
        expect(view.last.revision).toBeGreaterThan(revision);
        expect(graph.state.boundaries.c0[1]).toEqual([1, 0, 4]);
        expect(graph.state.boundaries.c0[0]).toEqual([0, 0, 0]);
        // Lc carries c0_1 with weight (1 - v) * 3u(1 - u)^2 = 0.5 * 0.375 at the centre, so z rises by 2 * 0.1875.
        close(vertex(view.last, 8, 8), [1.5, 1.5, 0.75 + 2 * 0.1875], 6);
    });

    it("unlinking and moving d1's end point reports u1v1 and refuses to claim interpolation", () => {
        const {graph, view} = mount();
        act(() => graph.setLinkedCorners(false));
        expect(coonsMismatches(graph.state.boundaries)).toEqual([]);
        expect(view.last.points).toHaveLength(16);
        drag(view, "d1-3", [3, 4, 0]);
        expect(coonsMismatches(graph.state.boundaries).map(m => m.corner)).toEqual(["u1v1"]);
        expect(graph.state.boundaries.c1[3]).toEqual([3, 3, 0]);
        const {container} = render(<>{graph.edit()}</>);
        expect(container.querySelector('[data-corner-status="mismatch"]')).not.toBeNull();
        expect(container.querySelector('[data-corner="u1v1"]')!.textContent).toBe(t("coons_corner_mismatch", {value0: "(1, 1)", value1: "1"}));
        expect(container.querySelector('[role="alert"]')!.textContent).toBe(t("coons_no_interpolation"));
        expect(container.textContent).not.toContain(t("coons_corners_met"));
    });

    it("turning linking back on snaps each corner pair to its average in one update", () => {
        const {graph, view} = mount();
        act(() => graph.setLinkedCorners(false));
        drag(view, "d1-3", [3, 5, 2]);
        const scenes = view.scenes.length;
        act(() => graph.setLinkedCorners(true));
        expect(graph.state.boundaries.d1[3]).toEqual([3, 4, 1]);
        expect(graph.state.boundaries.c1[3]).toEqual([3, 4, 1]);
        expect(coonsMismatches(graph.state.boundaries)).toEqual([]);
        expect(view.scenes.length).toBe(scenes + 1);
        expect(view.last.points).toHaveLength(12);
    });

    it("ignores a drag that repeats the point's position, a non-finite position and a foreign id", () => {
        const {graph, view} = mount();
        const boundaries = graph.state.boundaries;
        drag(view, "c0-1", [1, 0, 2]);
        expect(graph.state.boundaries).toBe(boundaries);
        drag(view, "c0-1", [Number.NaN, 0, 0]);
        drag(view, "p-1-1", [9, 9, 9]);
        expect(graph.state.boundaries).toBe(boundaries);
    });

    it("selects a point from the view and the panel, and moves it by coordinates", () => {
        const {graph, view} = mount();
        act(() => view.emit({kind: "select", pointId: "c1-2"}));
        expect(view.last.points.find(p => p.id === "c1-2")!.selected).toBe(true);
        act(() => graph.setSelectedCoordinates([2, 3, -2]));
        expect(graph.state.boundaries.c1[2]).toEqual([2, 3, -2]);
        act(() => graph.selectBoundaryPoint("d0", 3));
        expect(view.last.points.find(p => p.id === "c1-0")!.selected).toBe(true);
        act(() => graph.selectBoundaryPoint(undefined, undefined));
        expect(view.last.points.some(p => p.selected)).toBe(false);
    });
});

describe("Presets (acceptance 6)", () => {
    it("exports and imports to an equal scene, with the unlinked break and the shown surface", () => {
        const {graph, view} = mount();
        act(() => graph.setLinkedCorners(false));
        drag(view, "d1-3", [3, 4, 0]);
        act(() => { graph.setShown("ld"); graph.setVisibility("showControlNet", false); });
        act(() => view.emit({kind: "camera", camera: {...graph.state.camera, az: 1.1, el: 0.3, distance: 13}}));
        act(() => graph.setZMode(true));
        const preset = graph.exportPreset();
        expect(preset.id).toBe("patch-coons");
        expect(preset.graphState).toEqual({initialized: true});
        const data: unknown = JSON.parse(JSON.stringify(preset.data));
        expect(JSON.stringify(data)).not.toContain("zMode");
        expect("data" in coonsPresetCollection.check(data)).toBe(true);
        const other = mount();
        act(() => other.graph.importPreset(JSON.parse(JSON.stringify(preset))));
        expect(other.graph.exportPresetData()).toEqual(graph.exportPresetData());
        expect(other.graph.state).toMatchObject({shown: "ld", linkedCorners: false, showControlNet: false, zMode: false});
        expect(other.graph.state.boundaries).toEqual(graph.state.boundaries);
        expect(other.graph.state.camera).toMatchObject({az: 1.1, el: 0.3, distance: 13});
        expect(other.view.last.polylines.some(line => line.role === "net")).toBe(false);
    });

    it("restores the default scene, replacing imported data", async () => {
        const {graph} = mount();
        await waitFor(() => expect(graph.graphSession?.isReady).toBe(true));
        const imported = JSON.parse(JSON.stringify(graph.defaultPreset()));
        imported[0][1].shown = "b";
        imported[0][1].linkedCorners = false;
        imported[0][1].d1[3] = [3, 4, 0];
        act(() => graph.importPresetData(imported));
        expect(graph.state.shown).toBe("b");
        expect(graph.exportPresetData()[0][1].d1[3]).toEqual([3, 4, 0]);
        act(() => graph.restoreDefaultScene());
        expect(graph.state.shown).toBe("s");
        expect(graph.state.linkedCorners).toBe(true);
        expect(graph.state.boundaries).toEqual(defaultCoonsBoundaries());
    });

    it("a stored graphState cannot inject scene state", () => {
        const {graph} = mount();
        act(() => graph.importPreset(JSON.parse('{"id": "patch-coons", "graphState": {"shown": "b", "linkedCorners": false}}')));
        expect(graph.state.shown).toBe("s");
        expect(graph.state.linkedCorners).toBe(true);
    });

    it("keeps the patch Preset collections unchanged and the key local", () => {
        expect(Object.keys(patchPresetCollections)).toEqual(["patch-tensor", "patch-triangular", "patch-decasteljau", "patch-derivatives", "patch-subdivision", "patch-joins"]);
        expect(presetCollections.map(collection => collection.key)).not.toContain("patch-coons");
    });
});

describe("language", () => {
    it("the readouts follow a live language switch and the view label is localized", () => {
        const {graph, view} = mount();
        const {container} = render(<>{graph.edit()}</>);
        expect(container.textContent).toContain(t("coons_corners_met"));
        expect(container.textContent).toContain("1,333");
        act(() => setLanguage("en"));
        expect(container.textContent).toContain("All four boundary curves meet at the corners.");
        expect(container.textContent).toContain("1.333");
        expect(view.labels.at(-1)).toBe(t("surface_view_label"));
    });
});
