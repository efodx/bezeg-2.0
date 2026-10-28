import {act, fireEvent, render, screen, within} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorDerivativesGraph from "./TensorDerivativesGraph";
import {buildDerivativesScene} from "./TensorDerivativesScene";
import {patchFromNet} from "./patchSceneBuilder";
import {tensorDifferentials} from "./tensorDerivatives";
import type {SurfaceScene, Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => { setLanguage("sl"); vi.restoreAllMocks(); });

function mount() {
    const view = new FakeSurfaceView();
    const graph = new TensorDerivativesGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}

const isDerivative = (item: {id: string}) => item.id.startsWith("deriv-");
const derivativeLines = (scene: SurfaceScene) => scene.polylines.filter(isDerivative);
const derivativeLabels = (scene: SurfaceScene) => scene.labels.filter(isDerivative);
const hasRole = (scene: SurfaceScene, role: string) => scene.polylines.some(line => line.role === role);

/** What the scene must hold for the graph's current state, derived independently of the graph's scene code. */
function expectSceneFollows(graph: TensorDerivativesGraph, view: FakeSurfaceView) {
    const {net, u, v, showTangentPlane, showNormal, showTwist} = graph.state;
    const expected = buildDerivativesScene(patchFromNet(net), u, v, {showTangentPlane: showTangentPlane ?? true, showNormal: showNormal ?? true, showTwist: showTwist ?? true});
    expect(derivativeLines(view.last)).toEqual(expected.polylines);
    expect(derivativeLabels(view.last)).toEqual(expected.labels);
    expect(view.last.planes ?? []).toEqual(expected.planes);
}

const button = (corner: string) => document.querySelector<HTMLButtonElement>(`[data-corner="${corner}"]`)!;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)!.textContent;
const status = () => screen.queryByRole("status");
const startingPatch = (name: "preset_bilinear_saddle" | "preset_bicubic_dome" | "preset_collapsed_edge" | "preset_parallel_corner") => screen.getByRole("button", {name: t(name)});
const sw = (key: "patch_show_tangent_plane" | "patch_show_normal" | "patch_show_twist") => screen.getByLabelText<HTMLInputElement>(t(key));

describe("starting scene", () => {
    it("starts as the bicubic dome at (0.3, 0.65) with the plane, normal and twist on", () => {
        const {graph, view} = mount();
        expect(graph.state).toMatchObject({m: 3, n: 3, u: 0.3, v: 0.65, showTangentPlane: true, showNormal: true, showTwist: true});
        expectSceneFollows(graph, view);
        for (const role of ["vector-u", "vector-v", "twist", "normal"]) expect(hasRole(view.last, role), role).toBe(true);
        expect(view.last.planes).toHaveLength(1);
        expect(derivativeLabels(view.last).map(label => label.text)).toEqual(["S_u", "S_v", "S_{uv}", "\\mathbf{n}"]);
        expect(status()).toBeNull();
    });
    it("offers the two tensor Presets and the two degenerate patches as starting patches", () => {
        mount();
        for (const name of ["preset_bilinear_saddle", "preset_bicubic_dome", "preset_collapsed_edge", "preset_parallel_corner"] as const) expect(startingPatch(name)).toBeTruthy();
    });
});

/** `formatNumber(value, language, 3)` of each component, joined as the readout does. */
function formatted(vector: Xyz, language: "sl" | "en"): string {
    const parts = vector.map(c => {
        const text = Math.abs(c) < 5e-4 ? "0" : c.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
        const signed = text.startsWith("-") ? `−${text.slice(1)}` : text;
        return language === "sl" ? signed.replace(".", ",") : signed;
    });
    return language === "sl" ? `(${parts.join("; ")})` : `(${parts.join(", ")})`;
}

describe("corner buttons and the readout", () => {
    it.each([["00", 0, 0], ["10", 1, 0], ["01", 0, 1], ["11", 1, 1]] as const)("corner %s sets (u, v) and the readout matches the corner identities", (corner, cu, cv) => {
        const {graph, view} = mount();
        fireEvent.click(button(corner));
        expect(graph.state).toMatchObject({u: cu, v: cv});
        expectSceneFollows(graph, view);
        // S_u at a corner is m (b_1j - b_0j) at u = 0 and m (b_mj - b_{m-1,j}) at u = 1; likewise S_v with n.
        const {net, m, n} = graph.state;
        const i0 = cu === 0 ? 0 : m, i1 = cu === 0 ? 1 : m - 1, j0 = cv === 0 ? 0 : n, j1 = cv === 0 ? 1 : n - 1;
        const edge = (a: Xyz, b: Xyz, degree: number, sign: number): Xyz => [sign * degree * (a[0] - b[0]), sign * degree * (a[1] - b[1]), sign * degree * (a[2] - b[2])];
        expect(readout("su")).toBe(formatted(edge(net[i1][j0], net[i0][j0], m, cu === 0 ? 1 : -1), "sl"));
        expect(readout("sv")).toBe(formatted(edge(net[i0][j1], net[i0][j0], n, cv === 0 ? 1 : -1), "sl"));
    });
    it("names the corner buttons for assistive technology", () => {
        mount();
        const group = screen.getByRole("group", {name: t("patch_derivatives_corners")});
        expect(within(group).getAllByRole("button")).toHaveLength(4);
        expect(screen.getByRole("button", {name: t("patch_derivatives_corner", {value0: "1", value1: "0"})})).toBe(button("10"));
    });
    it("shows a unit normal with decimal commas in Slovenian and points in English", () => {
        const {graph} = mount();
        const {normal} = tensorDifferentials(patchFromNet(graph.state.net), graph.state.u, graph.state.v);
        if (normal.kind !== "defined") throw new Error("the dome has a normal");
        expect(Math.hypot(...normal.unit)).toBeCloseTo(1, 12);
        expect(readout("normal")).toBe(formatted(normal.unit, "sl"));
        expect(readout("normal")).toContain(",");
        act(() => setLanguage("en"));
        expect(readout("normal")).toBe(formatted(normal.unit, "en"));
        expect(readout("normal")).not.toContain(";");
    });
});

describe("follows the state", () => {
    it("follows a net drag, a degree change, a u/v change and Reset", async () => {
        const {graph, view} = mount();
        const before = JSON.stringify(derivativeLines(view.last));
        view.emit({kind: "point", pointId: "p-1-1", xyz: [0.75, 0.5, 4], phase: "move"});
        expectSceneFollows(graph, view);
        expect(JSON.stringify(derivativeLines(view.last))).not.toBe(before);

        act(() => graph.setDegree("u", 2));
        expectSceneFollows(graph, view);
        act(() => graph.setDegree("v", 4));
        expectSceneFollows(graph, view);

        const revision = view.last.revision;
        act(() => graph.setParameters(0.8, 0.1));
        expect(view.last.revision).toBeGreaterThan(revision);
        expectSceneFollows(graph, view);
        fireEvent.change(screen.getByLabelText<HTMLInputElement>(t("patch_parameter_u")), {target: {value: "0.2"}});
        expect(graph.state.u).toBeCloseTo(0.2, 12);
        expectSceneFollows(graph, view);

        await settle(() => graph.reset());
        expect(graph.state).toMatchObject({m: 3, n: 3, u: 0.3, v: 0.65, showTangentPlane: true, showNormal: true, showTwist: true});
        expectSceneFollows(graph, view);
    });

    it("restores a saved Preset including the switches", async () => {
        const {graph, view} = mount();
        fireEvent.click(sw("patch_show_twist"));
        act(() => graph.setParameters(0.9, 0.25));
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        fireEvent.click(sw("patch_show_twist"));
        fireEvent.click(sw("patch_show_normal"));
        act(() => graph.setParameters(0.1, 0.1));
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state).toMatchObject({u: 0.9, v: 0.25, showTwist: false, showNormal: true, showTangentPlane: true});
        expect(sw("patch_show_twist").checked).toBe(false);
        expectSceneFollows(graph, view);
    });

    it("exports the switches and loads a Preset without them with all three on", () => {
        const {graph, view} = mount();
        act(() => graph.setDerivativesSwitch("showTwist", false));
        expect(graph.exportPresetData()).toMatchObject([["TensorProductBezierPatch", {state: {showTangentPlane: true, showNormal: true, showTwist: false}}]]);
        const exported = JSON.parse(JSON.stringify(graph.exportPreset()));
        const state = exported.data[0][1].state;
        delete state.showTwist; delete state.showTangentPlane; delete state.showNormal;
        act(() => graph.importPreset(exported));
        expect(graph.state).toMatchObject({showTangentPlane: true, showNormal: true, showTwist: true});
        expectSceneFollows(graph, view);
    });
});

describe("switches", () => {
    it("switching the plane, the normal and the twist off removes their scene objects and on draws them again", () => {
        const {graph, view} = mount();
        fireEvent.click(sw("patch_show_tangent_plane"));
        expect(view.last.planes ?? []).toEqual([]);
        expect(hasRole(view.last, "normal")).toBe(true);
        fireEvent.click(sw("patch_show_normal"));
        expect(hasRole(view.last, "normal")).toBe(false);
        expect(derivativeLabels(view.last).some(label => label.text === "\\mathbf{n}")).toBe(false);
        fireEvent.click(sw("patch_show_twist"));
        expect(hasRole(view.last, "twist")).toBe(false);
        expect(derivativeLabels(view.last).map(label => label.text)).toEqual(["S_u", "S_v"]);
        expect(graph.state).toMatchObject({showTangentPlane: false, showNormal: false, showTwist: false});
        for (const key of ["patch_show_tangent_plane", "patch_show_normal", "patch_show_twist"] as const) fireEvent.click(sw(key));
        expectSceneFollows(graph, view);
        expect(view.last.planes).toHaveLength(1);
    });
});

describe("degenerate normals", () => {
    it("the collapsed-edge starting patch explains the zero S_v, draws no normal or plane, and has a normal next to the edge", () => {
        const {graph, view} = mount();
        fireEvent.click(startingPatch("preset_collapsed_edge"));
        expect(graph.state).toMatchObject({u: 0, v: 0.5});
        expect(status()!.getAttribute("data-reason")).toBe("zero-sv");
        expect(status()!.textContent).toBe(t("patch_derivatives_degenerate_zero_sv"));
        expect(readout("normal")).toBe(t("patch_derivatives_normal_undefined"));
        expect(hasRole(view.last, "normal")).toBe(false);
        expect(view.last.planes ?? []).toEqual([]);
        expectSceneFollows(graph, view);
        act(() => graph.setParameter("u", 0.1));
        expect(status()).toBeNull();
        expect(hasRole(view.last, "normal")).toBe(true);
        expect(view.last.planes).toHaveLength(1);
    });
    it("the parallel-corner starting patch gives the parallel reason in both languages", () => {
        const {view} = mount();
        fireEvent.click(startingPatch("preset_parallel_corner"));
        expect(status()!.getAttribute("data-reason")).toBe("parallel");
        const sl = status()!.textContent;
        expect(sl).toBe(t("patch_derivatives_degenerate_parallel"));
        act(() => setLanguage("en"));
        expect(status()!.textContent).toBe(t("patch_derivatives_degenerate_parallel"));
        expect(status()!.textContent).not.toBe(sl);
        expect(view.last.planes ?? []).toEqual([]);
    });
    it("a starting patch keeps the switches the student chose", () => {
        const {graph} = mount();
        fireEvent.click(sw("patch_show_twist"));
        fireEvent.click(startingPatch("preset_collapsed_edge"));
        expect(graph.state).toMatchObject({showTwist: false, m: 3, n: 3});
        expect(sw("patch_show_twist").checked).toBe(false);
    });
    it("a starting patch writes the state once, net and switches together", () => {
        const {graph} = mount();
        fireEvent.click(sw("patch_show_normal"));
        const setState = vi.spyOn(graph, "setState");
        fireEvent.click(startingPatch("preset_collapsed_edge"));
        expect(setState).toHaveBeenCalledTimes(1);
        expect(graph.state).toMatchObject({showNormal: false, showTangentPlane: true, m: 3, n: 3});
    });
});

describe("language", () => {
    it("relabels the switches, the readout and the corner buttons, keeping the state", () => {
        const {graph} = mount();
        const slSwitch = t("patch_show_tangent_plane");
        act(() => setLanguage("en"));
        expect(t("patch_show_tangent_plane")).not.toBe(slSwitch);
        for (const key of ["patch_show_tangent_plane", "patch_show_normal", "patch_show_twist"] as const) expect(sw(key)).toBeTruthy();
        expect(screen.getByText(t("patch_derivatives_readout_heading"))).toBeTruthy();
        expect(screen.getByText(t("patch_derivatives_legend"))).toBeTruthy();
        expect(screen.getByRole("group", {name: t("patch_derivatives_corners")})).toBeTruthy();
        expect(graph.state).toMatchObject({u: 0.3, v: 0.65});
    });
});
