import {act, fireEvent, render, screen} from "@testing-library/react";
import JXG, {JSXGraph} from "jsxgraph";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import {patchBernsteinWeight} from "./patchBernstein";
import TensorPatchGraph from "./TensorPatchGraph";
import {azimuthDegrees} from "./TensorPatchPanels";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => { setLanguage("sl"); vi.restoreAllMocks(); });

class ExposedGraph extends TensorPatchGraph {
    get insetPoint() { return this.inset?.point; }
    get insetBoard() { return this.inset?.board; }
    releaseInsetContainer() { this.setInsetContainer(null); }
}

function mountGraph(graph: ExposedGraph) {
    return render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
}
function mount() {
    const view = new FakeSurfaceView();
    const graph = new ExposedGraph({viewFactory: () => view});
    const rendered = mountGraph(graph);
    return {graph, view, rendered};
}

const select = (label: "patch_index_i" | "patch_index_j") => screen.getByLabelText<HTMLSelectElement>(t(label));
const input = (name: string) => screen.getByLabelText<HTMLInputElement>(name);
const range = (label: "patch_parameter_u" | "patch_parameter_v" | "patch_camera_azimuth" | "patch_camera_elevation") =>
    screen.getByLabelText<HTMLInputElement>(t(label));
const choose = (i: number, j: number) => {
    fireEvent.change(select("patch_index_i"), {target: {value: String(i)}});
    fireEvent.change(select("patch_index_j"), {target: {value: String(j)}});
};
const highlights = (view: FakeSurfaceView) => view.last.polylines.filter(line => line.role === "highlight");
const weightText = () => document.querySelector('[data-readout="bernstein-weight"] dd')?.textContent;
const apply = (x: string, y: string, z: string, name = "b21") => {
    fireEvent.change(input(`${name} x`), {target: {value: x}});
    fireEvent.change(input(`${name} y`), {target: {value: y}});
    fireEvent.change(input(`${name} z`), {target: {value: z}});
    fireEvent.submit(input(`${name} x`).closest("form")!);
};
const degrees = (radians: number) => radians * 180 / Math.PI;

describe("index selection", () => {
    it("selecting by index and selecting in the view drive the same selection and show its coordinates", () => {
        const {graph, view} = mount();
        expect(select("patch_index_i").value).toBe("");
        choose(2, 1);
        expect(view.last.points.filter(p => p.selected).map(p => p.id)).toEqual(["p-2-1"]);
        const [x, y, z] = graph.state.net[2][1];
        expect([input("b21 x").value, input("b21 y").value, input("b21 z").value]).toEqual([String(x), String(y), String(z)]);

        view.emit({kind: "select", pointId: "p-1-3"});
        expect(select("patch_index_i").value).toBe("1");
        expect(select("patch_index_j").value).toBe("3");
        expect(input("b13 z").value).toBe(String(graph.state.net[1][3][2]));
        expect(view.last.points.filter(p => p.selected).map(p => p.id)).toEqual(["p-1-3"]);

        fireEvent.change(select("patch_index_i"), {target: {value: ""}});
        expect(select("patch_index_j").value).toBe("");
        expect(view.last.points.some(p => p.selected)).toBe(false);
        expect(screen.getByText(t("patch_select_point_help"))).toBeTruthy();
    });

    it("offers only the indices the net has, and a smaller degree clears an index it no longer has", () => {
        const {graph, view} = mount();
        expect([...select("patch_index_i").options].map(o => o.value)).toEqual(["", "0", "1", "2", "3"]);
        choose(3, 3);
        act(() => graph.setDegree("u", 1));
        expect([...select("patch_index_i").options].map(o => o.value)).toEqual(["", "0", "1"]);
        expect(select("patch_index_i").value).toBe("");
        expect(highlights(view)).toHaveLength(0);
    });
});

describe("numeric xyz editor", () => {
    it("applies finite coordinates to the net and the reconciled point", () => {
        const {graph, view} = mount();
        choose(2, 1);
        apply("0.5", "-1.25", "3");
        expect(graph.state.net[2][1]).toEqual([0.5, -1.25, 3]);
        expect(view.last.points.find(p => p.id === "p-2-1")?.xyz).toEqual([0.5, -1.25, 3]);
        expect(input("b21 y").value).toBe("-1.25");
    });

    it("rejects a non-finite or empty coordinate with the localized message and leaves the net alone", () => {
        const {graph} = mount();
        choose(2, 1);
        const before = graph.state.net;
        for (const invalid of ["abc", "", "Infinity"]) {
            const current = graph.state.net;
            apply(invalid, "1", "1");
            expect(graph.state.net).toBe(current);
            expect(screen.getByRole("alert").textContent).toBe(t("enter_finite_numeric_coordinates"));
            // A valid entry clears the message, so each invalid entry must raise it again.
            apply("1", "2", "3");
            expect(graph.state.net[2][1]).toEqual([1, 2, 3]);
            expect(screen.queryByRole("alert")).toBeNull();
            act(() => graph.setSelectedCoordinates(before[2][1]));
        }
    });

    it("follows drags, degree changes, scene writes, a language switch and Reset", async () => {
        const {graph, view} = mount();
        choose(1, 1);
        view.emit({kind: "point", pointId: "p-1-1", xyz: [0.75, 0.5, 4], phase: "move"});
        expect([input("b11 x").value, input("b11 z").value]).toEqual(["0.75", "4"]);

        act(() => graph.setDegree("v", 4));
        expect(input("b11 z").value).toBe(String(graph.state.net[1][1][2]));

        act(() => graph.setState({net: graph.state.net.map(row => row.map((): [number, number, number] => [9, 8, 7]))}));
        expect(input("b11 x").value).toBe("9");

        act(() => setLanguage("en"));
        expect(input("b11 x").value).toBe("9");
        expect(select("patch_index_i").value).toBe("1");

        await settle(() => graph.reset());
        expect(select("patch_index_i").value).toBe("");
        expect(screen.getByText(t("patch_select_point_help"))).toBeTruthy();
    });

    it("clears the selection on a Preset restore, and selecting again shows the restored coordinates", async () => {
        const {graph} = mount();
        choose(1, 2);
        act(() => graph.setSelectedCoordinates([4, 5, 6]));
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        act(() => graph.setSelectedCoordinates([0, 0, 0]));
        expect(input("b12 x").value).toBe("0");
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state.net[1][2]).toEqual([4, 5, 6]);
        expect(select("patch_index_i").value).toBe("");
        choose(1, 2);
        expect(input("b12 x").value).toBe("4");
    });
});

describe("highlight and Bernstein weight", () => {
    it("highlights the selected point's row and column and follows moves and degree changes", () => {
        const {graph, view} = mount();
        choose(2, 1);
        expect(highlights(view).map(line => line.id)).toEqual(["highlight-row", "highlight-col"]);
        expect(highlights(view)[0].points).toEqual(graph.state.net[2]);
        expect(highlights(view)[1].points).toEqual(graph.state.net.map(row => row[1]));

        view.emit({kind: "point", pointId: "p-2-1", xyz: [0, 0, 9], phase: "move"});
        expect(highlights(view)[0].points[1]).toEqual([0, 0, 9]);

        act(() => graph.setDegree("v", 2));
        expect(highlights(view)[0].points).toHaveLength(3);
        expect(highlights(view)[1].points).toHaveLength(4);
        act(() => graph.setDegree("u", 1));
        expect(highlights(view)).toHaveLength(0);
    });

    it("shows the Bernstein weight at the current (u, v) and updates with the sliders and the selection", () => {
        const {graph} = mount();
        expect(weightText()).toBeUndefined();
        choose(1, 2);
        act(() => graph.setParameters(0.25, 0.5));
        // B_1^3(0.25) = 27/64 and B_2^3(0.5) = 3/8
        expect(patchBernsteinWeight(3, 3, 1, 2, 0.25, 0.5)).toBeCloseTo(81 / 512, 14);
        expect(weightText()).toBe("0,1582");
        fireEvent.change(range("patch_parameter_u"), {target: {value: "0.5"}});
        // B_1^3(0.5) = 3/8
        expect(weightText()).toBe("0,1406");
        choose(0, 0);
        expect(weightText()).toBe("0,0156");
        expect(screen.getByText(t("patch_bernstein_weight", {value0: "₀", value1: "₀"}))).toBeTruthy();
        expect(screen.getByText("Utež točke P₀₀")).toBeTruthy();
        act(() => setLanguage("en"));
        expect(weightText()).toBe("0.0156");
    });
});

describe("parameter-domain inset", () => {
    it("starts at (u, v); dragging it sets u and v, clamped to the unit square, without touching the geometry", () => {
        const {graph, view} = mount();
        const point = graph.insetPoint!;
        expect([point.X(), point.Y()]).toEqual([0.5, 0.5]);
        const revision = view.last.revision;

        const drag = (x: number, y: number) => act(() => {
            point.setPositionDirectly(JXG.COORDS_BY_USER, [x, y]);
            Reflect.apply(Reflect.get(point, "triggerEventHandlers"), point, [["drag"], []]);
        });
        drag(0.3, 0.7);
        expect([graph.state.u, graph.state.v]).toEqual([0.3, 0.7]);
        expect(Number(range("patch_parameter_u").value)).toBeCloseTo(0.3, 12);
        expect(Number(range("patch_parameter_v").value)).toBeCloseTo(0.7, 12);
        expect(view.last.revision).toBe(revision);

        drag(1.6, -0.4);
        expect([graph.state.u, graph.state.v]).toEqual([1, 0]);
        expect([point.X(), point.Y()]).toEqual([1, 0]);
    });

    it("follows sliders, scene writes, Preset restore and Reset", async () => {
        const {graph} = mount();
        const dot = () => [graph.insetPoint!.X(), graph.insetPoint!.Y()];
        fireEvent.change(range("patch_parameter_u"), {target: {value: "0.2"}});
        expect(dot()).toEqual([0.2, 0.5]);
        fireEvent.change(range("patch_parameter_v"), {target: {value: "0.9"}});
        expect(dot()).toEqual([0.2, 0.9]);
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        act(() => graph.setState({u: 0.7, v: 0.1}));
        expect(dot()).toEqual([0.7, 0.1]);
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state).toMatchObject({u: 0.2, v: 0.9});
        expect(dot()).toEqual([0.2, 0.9]);
        await settle(() => graph.selectPreset(""));
        act(() => graph.setParameters(0.6, 0.4));
        await settle(() => graph.reset());
        expect(graph.state).toMatchObject({u: 0.5, v: 0.5});
        expect(dot()).toEqual([0.5, 0.5]);
    });

    it("frees its board exactly once when released, on unmount and on remount", () => {
        const free = vi.spyOn(JSXGraph, "freeBoard");
        const {graph, rendered} = mount();
        const first = graph.insetBoard!;
        expect(first).toBeDefined();
        act(() => graph.releaseInsetContainer());
        expect(free).toHaveBeenCalledTimes(1);
        expect(free).toHaveBeenLastCalledWith(first);
        expect(graph.insetBoard).toBeUndefined();
        rendered.unmount();
        expect(free).toHaveBeenCalledTimes(1);

        const again = mountGraph(graph);
        const second = graph.insetBoard!;
        expect(second).toBeDefined();
        expect(second).not.toBe(first);
        again.unmount();
        expect(free).toHaveBeenCalledTimes(2);
        expect(free).toHaveBeenLastCalledWith(second);
        expect(graph.insetBoard).toBeUndefined();
    });

    it("is freed by the session on unmount while the panel still holds it", () => {
        const free = vi.spyOn(JSXGraph, "freeBoard");
        const {graph, rendered} = mount();
        const board = graph.insetBoard!;
        rendered.unmount();
        expect(free).toHaveBeenCalledTimes(1);
        expect(free).toHaveBeenCalledWith(board);
    });
});

describe("az/el controls in Prikaz", () => {
    it("show the camera in degrees and write radians back", () => {
        const {graph, view} = mount();
        const {az, el} = graph.state.camera;
        expect(Number(range("patch_camera_azimuth").value)).toBeCloseTo(azimuthDegrees(az), 10);
        expect(Number(range("patch_camera_elevation").value)).toBeCloseTo(degrees(el), 10);

        fireEvent.change(range("patch_camera_azimuth"), {target: {value: "90"}});
        expect(graph.state.camera.az).toBeCloseTo(Math.PI / 2, 12);
        fireEvent.change(range("patch_camera_elevation"), {target: {value: "30"}});
        expect(graph.state.camera.el).toBeCloseTo(Math.PI / 6, 12);
        expect(view.last.camera.az).toBeCloseTo(Math.PI / 2, 12);
        expect(view.last.camera.distance).toBe(graph.state.camera.distance);
        act(() => graph.setCameraAngle("el", 400));
        expect(graph.state.camera.el).toBeCloseTo(1.54, 12);
    });

    it("follow orbit edits, camera presets, the view reset and a language switch", () => {
        const {graph, view} = mount();
        view.emit({kind: "camera", camera: {...graph.state.camera, az: 1, el: 0.25}});
        expect(Number(range("patch_camera_azimuth").value)).toBeCloseTo(degrees(1), 10);
        expect(Number(range("patch_camera_elevation").value)).toBeCloseTo(degrees(0.25), 10);
        fireEvent.click(screen.getByRole("button", {name: t("patch_view_side"), hidden: true}));
        expect(Number(range("patch_camera_azimuth").value)).toBeCloseTo(90, 10);
        act(() => setLanguage("en"));
        expect(Number(range("patch_camera_azimuth").value)).toBeCloseTo(90, 10);
        fireEvent.click(screen.getByRole("button", {name: t("patch_view_reset"), hidden: true}));
        expect(Number(range("patch_camera_azimuth").value)).toBeCloseTo(azimuthDegrees(graph.state.camera.az), 10);
        expect(Number(range("patch_camera_elevation").value)).toBeCloseTo(degrees(graph.state.camera.el), 10);
    });

    it("wraps an orbited azimuth into one turn", () => {
        expect(azimuthDegrees(Math.PI * 2.5)).toBeCloseTo(90, 10);
        expect(azimuthDegrees(-Math.PI * 1.5)).toBeCloseTo(90, 10);
        expect(azimuthDegrees(0)).toBe(0);
    });
});
