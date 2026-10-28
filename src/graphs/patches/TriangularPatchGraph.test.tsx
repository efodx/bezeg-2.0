/**
 * The triangular patch graph: after every kind of change (sliders, degree, edits in the view, Reset, Preset
 * restore, a language switch and several synchronous actions in one tick) the model, the reconciled scene and the
 * controls agree.
 */
import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {formatNumber} from "../../analysis/format";
import {currentLanguage, setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TriangularPatchGraph from "./TriangularPatchGraph";
import {triangularFromNet} from "./TriangularPatchDegree";
import {triangularIndices, triangularNetLength, triangularPointId, triangularRows} from "./TriangularPatchLattice";
import {defaultTriangularPatchPresets, patchPresetCollections} from "./patchPresetCollections";
import type {Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => setLanguage("sl"));

class ExposedGraph extends TriangularPatchGraph {
    figureState() { return this.figurePresetGraphState(); }
}

function mount() {
    const view = new FakeSurfaceView();
    const graph = new ExposedGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}

type Key = "patch_triangular_degree" | "patch_parameter_u" | "patch_parameter_v" | "patch_show_control_net" | "patch_show_iso_curves"
    | "patch_show_boundary_curves" | "patch_show_shading" | "patch_iso_density" | "patch_shading_density" | "patch_move_height"
    | "patch_subdivision_show" | "de_casteljau_construction";
const control = <T extends HTMLElement>(label: Key) => screen.getByLabelText<T>(t(label));
const point = (graph: TriangularPatchGraph, u: number, v: number): Xyz => {
    const p = triangularFromNet(graph.state.net).eval(u, v);
    return [p.X(), p.Y(), p.Z()];
};
const near = (actual: readonly number[], expected: readonly number[]) => expected.forEach((value, k) => expect(actual[k]).toBeCloseTo(value, 10));
const count = (view: FakeSurfaceView, role: string) => view.last.polylines.filter(line => line.role === role).length;

/** The model, the last reconciled scene and every control describe the same patch. */
function expectAgreement(graph: TriangularPatchGraph, view: FakeSurfaceView) {
    const s = graph.state, scene = view.last;
    expect(s.net).toHaveLength(triangularNetLength(s.n));
    // The scene.
    expect(scene.points.map(p => p.id)).toEqual(s.showControlNet ? triangularIndices(s.n).map(([i, j, k]) => triangularPointId(i, j, k)) : []);
    if (s.showControlNet) scene.points.forEach((p, k) => expect(p.xyz).toEqual(s.net[k]));
    expect(count(view, "net")).toBe(s.showControlNet ? triangularRows(s.n).length : 0);
    expect(count(view, "iso") + count(view, "iso-v") + count(view, "iso-w")).toBe(s.showIsoCurves ? 3 * s.isoDensity : 0);
    expect(count(view, "boundary") >= (s.showBoundaryCurves ? 3 : 0)).toBe(true);
    expect(scene.mesh !== undefined).toBe(s.showShading);
    if (scene.mesh) expect(scene.mesh.positions).toHaveLength(3 * (s.shadingDensity + 1) * (s.shadingDensity + 2) / 2);
    near(scene.markers.find(m => m.role === "evaluated")!.xyz, point(graph, s.u, s.v));
    expect(scene.camera).toMatchObject({az: s.camera.az, el: s.camera.el, distance: s.camera.distance});
    expect(scene.interaction.zMode).toBe(s.zMode);
    expect(scene.markers.filter(m => m.role === "construction").length > 0).toBe(s.showDeCasteljau && s.n > 1);
    // The domain.
    expect(s.u).toBeGreaterThanOrEqual(0);
    expect(s.v).toBeGreaterThanOrEqual(0);
    expect(s.u + s.v).toBeLessThanOrEqual(1 + 1e-12);
    // The controls.
    expect(control<HTMLSelectElement>("patch_triangular_degree").value).toBe(String(s.n));
    expect(Number(control<HTMLInputElement>("patch_parameter_u").value)).toBeCloseTo(s.u, 12);
    expect(Number(control<HTMLInputElement>("patch_parameter_v").value)).toBeCloseTo(s.v, 12);
    const w = document.querySelector('[data-readout="parameter-w"] dd')!.textContent;
    expect(w).toBe(formatNumber(Math.max(0, 1 - s.u - s.v), currentLanguage(), 2));
    expect(control<HTMLInputElement>("patch_show_control_net").checked).toBe(s.showControlNet);
    expect(control<HTMLInputElement>("patch_show_iso_curves").checked).toBe(s.showIsoCurves);
    expect(control<HTMLInputElement>("patch_show_boundary_curves").checked).toBe(s.showBoundaryCurves);
    expect(control<HTMLInputElement>("patch_show_shading").checked).toBe(s.showShading);
    expect(control<HTMLInputElement>("de_casteljau_construction").checked).toBe(s.showDeCasteljau);
    expect(control<HTMLSelectElement>("patch_iso_density").value).toBe(String(s.isoDensity));
    expect(control<HTMLSelectElement>("patch_shading_density").value).toBe(String(s.shadingDensity));
    expect(control<HTMLInputElement>("patch_move_height").checked).toBe(s.zMode);
}

describe("default scene", () => {
    it("starts as the cubic patch with the localized view label, 10 points and a point inside the triangle", () => {
        const {graph, view} = mount();
        expect(graph.state.n).toBe(3);
        expect(view.last.points).toHaveLength(10);
        expect(view.last.revision).toBeGreaterThanOrEqual(1);
        expect(view.labels).toEqual([t("surface_view_label")]);
        expect([graph.state.u, graph.state.v]).toEqual([1 / 3, 1 / 3]);
        expect(graph.getWorkspacePanels({}).title).toBeDefined();
        expectAgreement(graph, view);
    });
    it("the Demonstration states its model: the default Preset is the canonical cubic and exports in the DTO", () => {
        const {graph} = mount();
        const [type, dto] = graph.exportPresetData()[0];
        expect(type).toBe("TriangularBezierPatch");
        expect(dto.n).toBe(3);
        expect(dto.net).toEqual(defaultTriangularPatchPresets[2].data()[0][1].net);
        expect(graph.presetCollection()).toBe(patchPresetCollections["patch-triangular"]);
    });
});

describe("sliders and the triangle domain", () => {
    it("the u and v sliders move S(u, v, w), w follows, and the slider ranges shrink with the other parameter", () => {
        const {graph, view} = mount();
        fireEvent.change(control("patch_parameter_u"), {target: {value: "0.25"}});
        fireEvent.change(control("patch_parameter_v"), {target: {value: "0.5"}});
        expect([graph.state.u, graph.state.v]).toEqual([0.25, 0.5]);
        expect(control<HTMLInputElement>("patch_parameter_u").max).toBe("0.5");
        expect(control<HTMLInputElement>("patch_parameter_v").max).toBe("0.75");
        near(view.last.markers.find(m => m.role === "evaluated")!.xyz, point(graph, 0.25, 0.5));
        expectAgreement(graph, view);
    });
    it("clamps so that u, v >= 0 and u + v <= 1 and ignores non-finite values", () => {
        const {graph, view} = mount();
        act(() => graph.setParameter("u", 0.6));
        act(() => graph.setParameter("v", 0.9));
        expect([graph.state.u, graph.state.v]).toEqual([0.6, 0.4]);
        act(() => graph.setParameter("u", 5));
        expect([graph.state.u, graph.state.v]).toEqual([0.6, 0.4]);
        act(() => graph.setParameter("u", -3));
        expect(graph.state.u).toBe(0);
        act(() => { graph.setParameter("v", Number.NaN); graph.setParameter("v", Infinity); });
        expect(graph.state.v).toBe(0.4);
        expectAgreement(graph, view);
    });
    it("the corner points evaluate to the net corners", () => {
        const {graph} = mount();
        const net = graph.state.net;
        const last = net.length - 1;
        for (const [u, v, index] of [[1, 0, 0], [0, 1, 6], [0, 0, last]] as const) near(point(graph, u, v), net[index]);
    });
});

describe("degree changes", () => {
    it.each([1, 2, 4])("degree %i: the net, scene and controls follow, and the surface survives an elevation", degree => {
        const {graph, view} = mount();
        const before = [[0.2, 0.3], [0.5, 0.1], [0.1, 0.8]].map(([u, v]) => point(graph, u, v));
        act(() => graph.setDegree(degree));
        expect(graph.state.n).toBe(degree);
        expectAgreement(graph, view);
        if (degree === 4) [[0.2, 0.3], [0.5, 0.1], [0.1, 0.8]].forEach(([u, v], k) => near(point(graph, u, v), before[k]));
    });
    it("ignores degrees outside 1 to 4 and a repeat, and clears a selection the new net no longer has", () => {
        const {graph, view} = mount();
        const net = graph.state.net;
        act(() => { graph.setDegree(0); graph.setDegree(5); graph.setDegree(2.5); graph.setDegree(3); });
        expect(graph.state.net).toBe(net);
        act(() => graph.selectIndex([1, 1, 1]));
        expect(view.last.points.filter(p => p.selected).map(p => p.id)).toEqual(["t-1-1-1"]);
        act(() => graph.setDegree(2));
        expect(view.last.points.some(p => p.selected)).toBe(false);
        expectAgreement(graph, view);
    });
    it("a starting patch replaces the net and the camera of the Preset", () => {
        const {graph, view} = mount();
        act(() => graph.useStartingPatch(3));
        expect(graph.state.n).toBe(4);
        expect(graph.state.net).toEqual(defaultTriangularPatchPresets[3].data()[0][1].net);
        expect(graph.state.camera.distance).toBeCloseTo(defaultTriangularPatchPresets[3].data()[0][1].state!.camera!.distance, 12);
        expectAgreement(graph, view);
    });
});

describe("edits in the view", () => {
    it("a point move changes exactly that point, rebuilds the geometry and moves the surface", () => {
        const {graph, view} = mount();
        const net = graph.state.net, revision = view.last.revision, centre = point(graph, 1 / 3, 1 / 3);
        view.emit({kind: "point", pointId: "t-1-1-1", xyz: [0, 0, 5], phase: "move"});
        const index = triangularIndices(3).findIndex(([i, j, k]) => i === 1 && j === 1 && k === 1);
        expect(graph.state.net[index]).toEqual([0, 0, 5]);
        graph.state.net.forEach((p, k) => { if (k !== index) expect(p).toEqual(net[k]); });
        expect(view.last.revision).toBeGreaterThan(revision);
        expect(point(graph, 1 / 3, 1 / 3)[2]).toBeGreaterThan(centre[2]);
        expectAgreement(graph, view);
    });
    it("rejects a point of another degree, a malformed id and a non-finite position; a drag start keeps the net", () => {
        const {graph, view} = mount();
        const net = graph.state.net;
        view.emit({kind: "point", pointId: "t-1-1-2", xyz: [1, 1, 1], phase: "move"});
        view.emit({kind: "point", pointId: "p-1-2", xyz: [1, 1, 1], phase: "move"});
        view.emit({kind: "point", pointId: "t-1-1-1", xyz: [Number.NaN, 0, 0], phase: "move"});
        view.emit({kind: "point", pointId: "t-3-0-0", xyz: [...net[0]], phase: "start"});
        expect(graph.state.net).toBe(net);
    });
    it("selecting marks and labels the point and a coordinate edit moves it", () => {
        const {graph, view} = mount();
        act(() => graph.selectIndex([2, 1, 0]));
        expect(view.last.labels.find(l => l.id === "selected-point")?.text).toBe("P_{210}");
        act(() => graph.setSelectedCoordinates([0.5, 0.5, 2]));
        expect(view.last.points.find(p => p.id === "t-2-1-0")!.xyz).toEqual([0.5, 0.5, 2]);
        act(() => graph.selectIndex(undefined));
        expect(view.last.labels.some(l => l.id === "selected-point")).toBe(false);
        expectAgreement(graph, view);
    });
    it("a camera edit changes the camera but not the revision", () => {
        const {graph, view} = mount();
        const revision = view.last.revision;
        view.emit({kind: "camera", camera: {...graph.state.camera, az: 1.1, el: 0.2, distance: 11}});
        expect(graph.state.camera).toMatchObject({az: 1.1, el: 0.2, distance: 11});
        expect(view.last.revision).toBe(revision);
        expectAgreement(graph, view);
    });
});

describe("display switches", () => {
    it("every switch and density control reaches the scene", () => {
        const {graph, view} = mount();
        for (const key of ["patch_show_control_net", "patch_show_iso_curves", "patch_show_boundary_curves", "patch_show_shading", "de_casteljau_construction"] as const) {
            fireEvent.click(control(key));
            expectAgreement(graph, view);
        }
        fireEvent.change(control("patch_iso_density"), {target: {value: "16"}});
        fireEvent.change(control("patch_shading_density"), {target: {value: "8"}});
        fireEvent.click(control("patch_move_height"));
        expect(graph.state).toMatchObject({isoDensity: 16, shadingDensity: 8, zMode: true});
        expectAgreement(graph, view);
    });
    it("the de Casteljau scheme follows (u, v) and the split preview is drawn only inside the triangle", () => {
        const {graph, view} = mount();
        fireEvent.click(control("de_casteljau_construction"));
        const before = view.last.markers.filter(m => m.role === "construction").map(m => m.xyz);
        act(() => graph.setParameter("u", 0.6));
        expect(view.last.markers.filter(m => m.role === "construction").map(m => m.xyz)).not.toEqual(before);
        fireEvent.click(control("patch_subdivision_show"));
        expect(view.last.polylines.some(line => line.id.startsWith("piece-0-"))).toBe(true);
        act(() => graph.setParameter("v", 0.4));
        expect(graph.state.u + graph.state.v).toBeCloseTo(1, 12);
        expect(view.last.polylines.some(line => line.id.startsWith("piece-"))).toBe(false);
        expect(screen.getByText(t("patch_subdivision_interior_required"))).toBeTruthy();
        act(() => graph.setParameter("u", 0.2));
        expect(view.last.polylines.some(line => line.id.startsWith("piece-0-"))).toBe(true);
    });
});

describe("Reset, Presets, language and one tick", () => {
    it("Reset returns the default scene, including the camera and the transient split preview", async () => {
        const {graph, view} = mount();
        const fresh = mount();
        const freshNet = fresh.graph.state.net;
        const freshCamera = fresh.graph.state.camera;
        fresh.rendered.unmount();       // one document, one set of labelled controls
        act(() => { graph.setDegree(4); graph.setParameter("u", 0.7); graph.setSubdivisionPreview(true); graph.setVisibility("showShading", false); });
        view.emit({kind: "camera", camera: {...graph.state.camera, az: 2, distance: 9}});
        view.emit({kind: "point", pointId: "t-1-1-2", xyz: [1, 1, 1], phase: "move"});
        await settle(() => graph.reset());
        expect(graph.state.net).toEqual(freshNet);
        expect(graph.state).toMatchObject({n: 3, u: 1 / 3, v: 1 / 3, showShading: true});
        expect(graph.state.camera).toEqual(freshCamera);
        expect(view.last.polylines.some(line => line.id.startsWith("piece-"))).toBe(false);
        expectAgreement(graph, view);
    });
    it("a saved Preset restores net, degree, parameters, switches and camera (not the session's height mode)", async () => {
        const {graph, view} = mount();
        act(() => { graph.setDegree(2); graph.setParameter("v", 0.55); graph.setParameter("u", 0.3); graph.setDensity("iso", 16); graph.setVisibility("showDeCasteljau", true); graph.setZMode(true); });
        view.emit({kind: "point", pointId: "t-1-1-0", xyz: [0.1, 0.2, 3], phase: "move"});
        view.emit({kind: "camera", camera: {...graph.state.camera, az: 1.3, el: 0.1, distance: 12}});
        const saved = {net: graph.state.net, camera: graph.state.camera};
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        const data = JSON.parse(JSON.stringify(graph.exportPresetData()));
        expect("data" in patchPresetCollections["patch-triangular"].check(data)).toBe(true);
        expect(JSON.stringify(data)).not.toContain("zMode");
        await settle(() => graph.reset());
        expect(graph.state.net).not.toEqual(saved.net);
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state.n).toBe(2);
        expect(graph.state.net).toEqual(saved.net);
        expect(graph.state.camera).toEqual(saved.camera);
        expect(graph.state).toMatchObject({u: 0.3, v: 0.55, isoDensity: 16, showDeCasteljau: true});
        expect(graph.state.zMode).toBe(true);   // the session's height mode is not part of a Preset
        expectAgreement(graph, view);
        expect(count(view, "iso") + count(view, "iso-v") + count(view, "iso-w")).toBe(48);
    });
    it("a Preset file from another browser session imports into a second graph unchanged", () => {
        const {graph, rendered} = mount();
        act(() => { graph.setDegree(4); graph.setParameter("u", 0.2); graph.setParameter("v", 0.7); });
        const file = JSON.parse(JSON.stringify(graph.exportPreset()));
        const data = graph.exportPresetData();
        const camera = graph.state.camera;
        rendered.unmount();             // the second session starts in a fresh document
        const other = mount();
        act(() => other.graph.importPreset(file));
        expect(other.graph.exportPresetData()).toEqual(data);
        expect(other.graph.state.camera).toEqual(camera);
        expectAgreement(other.graph, other.view);
    });
    it("a checked import whose u + v exceeds 1 within the DTO tolerance is clamped into the triangle", () => {
        const {graph, view} = mount();
        const net = triangularIndices(1).map(([i, j]): [number, number, number] => [i, j, 0]);
        const data = [["TriangularBezierPatch", {n: 1, net, state: {u: 0.5, v: 0.5000000005}}]];
        const checked = patchPresetCollections["patch-triangular"].check(data);
        if (!("data" in checked)) throw new Error("the DTO tolerance should accept the pair");
        act(() => graph.importPresetData(checked.data));
        expect(graph.state.u).toBe(0.5);
        expect(graph.state.v).toBe(0.5);
        expectAgreement(graph, view);
    });
    it("a hostile graphState cannot inject surface state", () => {
        const {graph} = mount();
        act(() => graph.importPreset(JSON.parse('{"id": "hostile", "graphState": {"n": 99, "u": 7, "isoDensity": 100000}}')));
        expect(graph.state.n).toBe(3);
        expect(graph.state.u).not.toBe(7);
        expect(graph.state.isoDensity).toBe(8);
    });
    it("a language switch relabels the view and the panel and keeps the scene", () => {
        const {graph, view} = mount();
        act(() => { graph.setParameter("u", 0.4); graph.setDegree(2); });
        const net = graph.state.net;
        act(() => setLanguage("en"));
        expect(view.labels[view.labels.length - 1]).toBe("Three-dimensional view of the patch");
        expect(screen.getByLabelText(t("patch_triangular_degree"))).toBeTruthy();
        expect(graph.state.net).toBe(net);
        expectAgreement(graph, view);
        act(() => setLanguage("sl"));
        expect(view.labels[view.labels.length - 1]).toBe(t("surface_view_label"));
        expectAgreement(graph, view);
    });
    it("several synchronous actions in one tick each read the state the previous one wrote", () => {
        const {graph, view} = mount();
        act(() => {
            graph.setDegree(4);
            graph.setParameter("u", 0.5);
            graph.setParameter("v", 0.9);          // clamped by the u written one line before
            expect(graph.state).toMatchObject({n: 4, u: 0.5});
            expect(graph.state.v).toBeCloseTo(0.5, 12);
            graph.setParameter("v", 0.3);          // back inside the triangle, so the split preview has pieces
            graph.selectIndex([2, 1, 1]);
            graph.setSelectedCoordinates([0, 0, 7]);
            graph.setDegree(1);                      // the lowering reads the net the move wrote; the selection goes
            graph.setSubdivisionPreview(true);
            graph.setVisibility("showShading", false);
            expect(graph.state.net).toHaveLength(3);
        });
        expect(graph.state.n).toBe(1);
        expect(view.last.polylines.some(line => line.id.startsWith("piece-0-"))).toBe(true);
        expect(view.last.points.some(p => p.selected)).toBe(false);
        expectAgreement(graph, view);
    });
    it("the lesson checkpoint restores a rollback within one tick, including the split preview", () => {
        const {graph, view} = mount();
        act(() => { graph.setParameter("u", 0.2); graph.setSubdivisionPreview(true); });
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const net = graph.state.net;
        act(() => {
            graph.setDegree(2);
            graph.setSubdivisionPreview(false);
            graph.setParameter("u", 0.7);
            capabilities.restoreState(checkpoint);
        });
        expect(graph.state.n).toBe(3);
        expect(graph.state.net).toEqual(net);
        expect(graph.state.u).toBe(0.2);
        expect(view.last.polylines.some(line => line.id.startsWith("piece-0-"))).toBe(true);
        expectAgreement(graph, view);
    });
});

describe("view lifecycle", () => {
    it("disposes the view exactly once on unmount", () => {
        const {view, rendered} = mount();
        rendered.unmount();
        expect(view.disposed).toBe(1);
    });
    it("a figure Preset keeps the imported surface", () => {
        const {graph} = mount();
        act(() => graph.setDegree(4));
        const state = graph.figureState();
        expect(state.net).toBe(graph.state.net);
        expect(state.initialized).toBe(true);
    });
});
