import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import {patchFromNet} from "./patchSceneBuilder";
import TensorPatchGraph from "./TensorPatchGraph";
import type {Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => setLanguage("sl"));

function mount() {
    const view = new FakeSurfaceView();
    const graph = new TensorPatchGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}

type Key = "patch_degree_u" | "patch_degree_v" | "patch_parameter_u" | "patch_parameter_v" | "patch_show_control_net" | "patch_show_iso_curves"
    | "patch_show_boundary_curves" | "patch_show_shading" | "patch_iso_density" | "patch_shading_density" | "patch_move_height"
    | "patch_view_front" | "patch_view_top" | "patch_view_side" | "patch_view_isometric" | "patch_view_reset"
    | "preset_bilinear_saddle" | "preset_bicubic_dome";
const select = (label: Key) => screen.getByLabelText<HTMLSelectElement>(t(label));
const range = (label: Key) => screen.getByLabelText<HTMLInputElement>(t(label));
const toggle = (label: Key) => screen.getByLabelText<HTMLInputElement>(t(label));
const press = (label: Key) => fireEvent.click(screen.getByRole("button", {name: t(label), hidden: true}));
const count = (view: FakeSurfaceView, role: string) => view.last.polylines.filter(line => line.role === role).length;
const evaluated = (graph: TensorPatchGraph, u: number, v: number): Xyz => {
    const p = patchFromNet(graph.state.net).eval(u, v);
    return [p.X(), p.Y(), p.Z()];
};

/** Every control shows what the store holds. */
function expectControlsToMatch(graph: TensorPatchGraph) {
    const s = graph.state;
    expect(select("patch_degree_u").value).toBe(String(s.m));
    expect(select("patch_degree_v").value).toBe(String(s.n));
    expect(Number(range("patch_parameter_u").value)).toBeCloseTo(s.u, 12);
    expect(Number(range("patch_parameter_v").value)).toBeCloseTo(s.v, 12);
    expect(toggle("patch_show_control_net").checked).toBe(s.showControlNet);
    expect(toggle("patch_show_iso_curves").checked).toBe(s.showIsoCurves);
    expect(toggle("patch_show_boundary_curves").checked).toBe(s.showBoundaryCurves);
    expect(toggle("patch_show_shading").checked).toBe(s.showShading);
    expect(select("patch_iso_density").value).toBe(String(s.isoDensity));
    expect(select("patch_shading_density").value).toBe(String(s.shadingDensity));
    expect(toggle("patch_move_height").checked).toBe(s.zMode);
}

describe("Uredi panel", () => {
    it("a degree choice changes the net and the reconciled points and net lines", () => {
        const {graph, view} = mount();
        expect(view.last.points).toHaveLength(16);
        fireEvent.change(select("patch_degree_u"), {target: {value: "2"}});
        expect(graph.state.m).toBe(2);
        expect(graph.state.net).toHaveLength(3);
        expect(view.last.points).toHaveLength(3 * 4);
        expect(view.last.polylines.filter(line => line.id.startsWith("net-row-"))).toHaveLength(3);
        fireEvent.change(select("patch_degree_v"), {target: {value: "1"}});
        expect(graph.state.n).toBe(1);
        expect(view.last.points).toHaveLength(3 * 2);
        expectControlsToMatch(graph);
        expect(screen.getByText(t("patch_degree_help"))).toBeTruthy();
    });

    it("the u and v sliders move the evaluated marker to S(u,v)", () => {
        const {graph, view} = mount();
        fireEvent.change(range("patch_parameter_u"), {target: {value: "0.25"}});
        fireEvent.change(range("patch_parameter_v"), {target: {value: "0.8"}});
        expect(graph.state.u).toBe(0.25);
        expect(graph.state.v).toBe(0.8);
        const expected = evaluated(graph, 0.25, 0.8);
        view.last.markers[0].xyz.forEach((x, k) => expect(x).toBeCloseTo(expected[k], 12));
        expect(range("patch_parameter_u").min).toBe("0");
        expect(range("patch_parameter_u").max).toBe("1");
    });

    it("a starting patch button imports that default Preset, camera included", () => {
        const {graph, view} = mount();
        press("preset_bilinear_saddle");
        expect(graph.state).toMatchObject({m: 1, n: 1});
        expect(view.last.points).toHaveLength(4);
        expectControlsToMatch(graph);
        const saddleCamera = graph.state.camera;
        press("preset_bicubic_dome");
        expect(graph.state).toMatchObject({m: 3, n: 3});
        expect(graph.state.camera).not.toEqual(saddleCamera);
        expect(view.last.points).toHaveLength(16);
    });
});

describe("Prikaz panel", () => {
    it("each element switch removes and restores its elements in the reconciled scene", () => {
        const {graph, view} = mount();
        expect(count(view, "iso")).toBe(18);
        fireEvent.click(toggle("patch_show_iso_curves"));
        expect(graph.state.showIsoCurves).toBe(false);
        expect(count(view, "iso")).toBe(0);
        fireEvent.click(toggle("patch_show_iso_curves"));
        expect(count(view, "iso")).toBe(18);

        expect(count(view, "boundary")).toBe(4);
        fireEvent.click(toggle("patch_show_boundary_curves"));
        expect(count(view, "boundary")).toBe(0);

        expect(view.last.points).toHaveLength(16);
        fireEvent.click(toggle("patch_show_control_net"));
        expect(view.last.points).toHaveLength(0);
        expect(count(view, "net")).toBe(0);

        expect(view.last.mesh?.visible).toBe(true);
        fireEvent.click(toggle("patch_show_shading"));
        expect(view.last.mesh?.visible ?? false).toBe(false);
        expectControlsToMatch(graph);
    });

    it("the density choices change the iso-curve count and the mesh size", () => {
        const {graph, view} = mount();
        const meshBefore = view.last.mesh!.faces.length;
        fireEvent.change(select("patch_iso_density"), {target: {value: "16"}});
        expect(graph.state.isoDensity).toBe(16);
        expect(count(view, "iso")).toBe(34);
        fireEvent.change(select("patch_shading_density"), {target: {value: "8"}});
        expect(graph.state.shadingDensity).toBe(8);
        expect(view.last.mesh!.faces.length).toBeLessThan(meshBefore);
        expectControlsToMatch(graph);
    });

    it("camera preset buttons set the view and reset view fits it again", () => {
        const {graph, view} = mount();
        const authored = graph.state.camera;
        press("patch_view_front");
        expect(graph.state.camera.az).toBe(0);
        expect(graph.state.camera.el).toBe(0);
        expect(view.last.camera).toEqual(graph.state.camera);
        press("patch_view_top");
        expect(graph.state.camera.el).toBeGreaterThan(1.4);
        press("patch_view_side");
        expect(graph.state.camera.az).toBeCloseTo(Math.PI / 2, 12);
        press("patch_view_isometric");
        expect(graph.state.camera.az).toBeCloseTo(Math.PI / 4, 12);
        press("patch_view_reset");
        expect(graph.state.camera.az).toBeCloseTo(authored.az, 12);
        expect(graph.state.camera.el).toBeCloseTo(authored.el, 12);
        expect(view.last.camera).toEqual(graph.state.camera);
    });

    it("the height switch sets the view's interaction mode and shows its help", () => {
        const {graph, view} = mount();
        expect(view.last.interaction.zMode).toBe(false);
        fireEvent.click(toggle("patch_move_height"));
        expect(graph.state.zMode).toBe(true);
        expect(view.last.interaction.zMode).toBe(true);
        expect(screen.getByText(t("patch_move_height_help"))).toBeTruthy();
    });
});

describe("controls follow the store", () => {
    it("after an external state write, as a lesson scene writes it", () => {
        const {graph} = mount();
        act(() => graph.setState({m: 2, n: 1, net: [[[0, 0, 0], [0, 1, 0]], [[1, 0, 1], [1, 1, 1]], [[2, 0, 0], [2, 1, 0]]],
            u: 0.1, v: 0.9, showIsoCurves: false, isoDensity: 16, shadingDensity: 8, zMode: true}));
        expectControlsToMatch(graph);
        expect(select("patch_degree_u").value).toBe("2");
        expect(toggle("patch_show_iso_curves").checked).toBe(false);
    });

    it("after Reset, which brings back the default scene", async () => {
        const {graph} = mount();
        fireEvent.change(select("patch_degree_u"), {target: {value: "1"}});
        fireEvent.change(range("patch_parameter_u"), {target: {value: "0.9"}});
        fireEvent.click(toggle("patch_show_shading"));
        await settle(() => graph.reset());
        expect(graph.state).toMatchObject({m: 3, u: 0.5, showShading: true});
        expectControlsToMatch(graph);
    });

    it("after a Preset is restored and after a lesson checkpoint is restored", async () => {
        const {graph} = mount();
        fireEvent.change(select("patch_degree_v"), {target: {value: "2"}});
        fireEvent.change(range("patch_parameter_v"), {target: {value: "0.2"}});
        fireEvent.click(toggle("patch_show_control_net"));
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        const checkpoint = graph.getLessonCapabilities().captureState();
        press("preset_bilinear_saddle");
        expect(select("patch_degree_v").value).toBe("1");
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state).toMatchObject({n: 2, v: 0.2, showControlNet: false});
        expectControlsToMatch(graph);

        press("preset_bilinear_saddle");
        act(() => graph.getLessonCapabilities().restoreState(checkpoint));
        expect(graph.state).toMatchObject({n: 2, v: 0.2, showControlNet: false});
        expectControlsToMatch(graph);
    });

    it("across a language switch: labels change, values do not", () => {
        const {graph} = mount();
        fireEvent.change(select("patch_degree_u"), {target: {value: "4"}});
        fireEvent.change(range("patch_parameter_u"), {target: {value: "0.3"}});
        fireEvent.click(toggle("patch_show_iso_curves"));
        const before = [t("patch_degree_u"), t("patch_show_iso_curves")];
        act(() => setLanguage("en"));
        expect([t("patch_degree_u"), t("patch_show_iso_curves")]).not.toEqual(before);
        expect(screen.getByRole("button", {name: t("patch_view_reset"), hidden: true})).toBeTruthy();
        expectControlsToMatch(graph);
        expect(select("patch_degree_u").value).toBe("4");
        expect(toggle("patch_show_iso_curves").checked).toBe(false);
    });
});
