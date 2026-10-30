import {act, fireEvent, render, screen} from "@testing-library/react";
import JXG, {JSXGraph} from "jsxgraph";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import {newJsxHandle, type JsxHandle} from "./jsxPatchEditing.test-helper";
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
const apply = (x: string, y: string, z: string, name = "P₂₁") => {
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
        expect([input("P₂₁ x").value, input("P₂₁ y").value, input("P₂₁ z").value]).toEqual([String(x), String(y), String(z)]);

        view.emit({kind: "select", pointId: "p-1-3"});
        expect(select("patch_index_i").value).toBe("1");
        expect(select("patch_index_j").value).toBe("3");
        expect(input("P₁₃ z").value).toBe(String(graph.state.net[1][3][2]));
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
        expect(input("P₂₁ y").value).toBe("-1.25");
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
        expect([input("P₁₁ x").value, input("P₁₁ z").value]).toEqual(["0.75", "4"]);

        act(() => graph.setDegree("v", 4));
        expect(input("P₁₁ z").value).toBe(String(graph.state.net[1][1][2]));

        act(() => graph.setState({net: graph.state.net.map(row => row.map((): [number, number, number] => [9, 8, 7]))}));
        expect(input("P₁₁ x").value).toBe("9");

        act(() => setLanguage("en"));
        expect(input("P₁₁ x").value).toBe("9");
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
        expect(input("P₁₂ x").value).toBe("0");
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state.net[1][2]).toEqual([4, 5, 6]);
        expect(select("patch_index_i").value).toBe("");
        choose(1, 2);
        expect(input("P₁₂ x").value).toBe("4");
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

/** The same editing, driven through the JSX surface view's own point drag (task 04 of docs/specs/jsxgraph-surface-view.md). */
describe("JSX surface view", () => {
    const sub = (n: number) => "₀₁₂₃₄₅₆₇₈₉"[n];
    async function mountJsx() {
        const jsx = newJsxHandle();
        const graph = new ExposedGraph({viewFactory: () => jsx.view});
        mountGraph(graph);
        await jsx.ready();
        return {graph, jsx};
    }
    /** Every place that holds a control point agrees with what the view shows; `selected` also checks the numeric editor. */
    function expectInAgreement(graph: ExposedGraph, jsx: JsxHandle, selected?: [number, number]) {
        const {m, n} = graph.state;
        const net = (graph.exportPreset().data ?? []).flatMap(([, dto]) => [...dto.net]);
        for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++) {
            const shown = jsx.shown(`p-${i}-${j}`);
            expect(graph.state.net[i][j], `net ${i},${j}`).toEqual(shown);
            expect(net[i * (n + 1) + j], `Preset ${i},${j}`).toEqual(shown);
        }
        if (selected) {
            const [i, j] = selected, name = `P${sub(i)}${sub(j)}`;
            expect([input(`${name} x`).value, input(`${name} y`).value, input(`${name} z`).value]).toEqual(jsx.shown(`p-${i}-${j}`).map(String));
        }
    }

    it("selects a point on its first press without rebuilding the board, and the drag that began there goes on", async () => {
        const {graph, jsx} = await mountJsx();
        const rebuilds = jsx.view.stats.rebuilds;
        jsx.press("p-2-1");
        expect(select("patch_index_i").value).toBe("2");
        expect(select("patch_index_j").value).toBe("1");
        expect(jsx.view.stats.rebuilds).toBe(rebuilds);
        const [x, y, z] = jsx.shown("p-2-1");
        jsx.dragTo("p-2-1", [x + 0.4, y - 0.3, z]);
        expect(jsx.shown("p-2-1")[0]).toBeCloseTo(x + 0.4, 6);
        expectInAgreement(graph, jsx, [2, 1]);
        jsx.release("p-2-1");
        expect(jsx.view.stats.rebuilds).toBe(rebuilds);
        expectInAgreement(graph, jsx, [2, 1]);
    });

    it("a plain drag moves x and y in the horizontal plane through the point, never z, and leaves the camera alone", async () => {
        const {graph, jsx} = await mountJsx();
        const camera = graph.state.camera;
        jsx.press("p-1-2");
        const start = jsx.shown("p-1-2");
        for (const [dx, dy] of [[0.2, 0.1], [0.5, -0.2], [0.8, -0.6]]) {
            jsx.dragTo("p-1-2", [start[0] + dx, start[1] + dy, start[2]]);
            const now = jsx.shown("p-1-2");
            expect(now[0]).toBeCloseTo(start[0] + dx, 6);
            expect(now[1]).toBeCloseTo(start[1] + dy, 6);
            expect(now[2]).toBeCloseTo(start[2], 9);
            expectInAgreement(graph, jsx, [1, 2]);
            expect(graph.state.camera).toBe(camera);
        }
        jsx.release("p-1-2");
        expectInAgreement(graph, jsx, [1, 2]);
        expect(jsx.camerasEmitted()).toEqual([]);
        expect(graph.state.camera).toBe(camera);
    });

    it("Shift and the height switch make a drag change only z", async () => {
        const {graph, jsx} = await mountJsx();
        const camera = graph.state.camera;
        const drag = (target: number, shift: boolean) => {
            const start = jsx.shown("p-2-2");
            jsx.press("p-2-2");
            jsx.dragTo("p-2-2", [start[0], start[1], target], shift);
            const now = jsx.shown("p-2-2");
            expect([now[0], now[1]]).toEqual([start[0], start[1]]);
            expect(now[2]).toBeCloseTo(target, 6);
            expectInAgreement(graph, jsx, [2, 2]);
            jsx.release("p-2-2");
        };
        drag(2.5, true);
        expect(graph.state.zMode).toBe(false);
        fireEvent.click(screen.getByLabelText<HTMLInputElement>(t("patch_move_height")));
        expect(graph.state.zMode).toBe(true);
        drag(-0.5, false);
        // With the switch on, Shift does not change that a drag is vertical.
        drag(0.75, true);
        fireEvent.click(screen.getByLabelText<HTMLInputElement>(t("patch_move_height")));
        const start = jsx.shown("p-2-2");
        jsx.press("p-2-2");
        jsx.dragTo("p-2-2", [start[0] + 0.3, start[1] + 0.3, start[2]]);
        expect(jsx.shown("p-2-2")[2]).toBeCloseTo(start[2], 9);
        expect(jsx.shown("p-2-2")[0]).toBeCloseTo(start[0] + 0.3, 6);
        jsx.release("p-2-2");
        expect(graph.state.camera).toBe(camera);
        expect(jsx.camerasEmitted()).toEqual([]);
    });

    it("keeps the numeric editor and index selection working on a point that was dragged", async () => {
        const {graph, jsx} = await mountJsx();
        choose(1, 1);
        jsx.press("p-3-0");
        expect(select("patch_index_i").value).toBe("3");
        expect(select("patch_index_j").value).toBe("0");
        const [x, y, z] = jsx.shown("p-3-0");
        jsx.dragTo("p-3-0", [x - 0.5, y + 0.5, z]);
        jsx.release("p-3-0");
        expectInAgreement(graph, jsx, [3, 0]);
        apply("1.25", "-0.5", "2", "P₃₀");
        jsx.flush();
        expect(jsx.shown("p-3-0")).toEqual([1.25, -0.5, 2]);
        expectInAgreement(graph, jsx, [3, 0]);
        // A drag after a typed value starts from the typed point.
        jsx.press("p-3-0");
        jsx.dragTo("p-3-0", [1.75, -0.5, 2]);
        jsx.release("p-3-0");
        expect(jsx.shown("p-3-0")[0]).toBeCloseTo(1.75, 6);
        expectInAgreement(graph, jsx, [3, 0]);
        choose(0, 2);
        jsx.flush();
        expect([select("patch_index_i").value, select("patch_index_j").value]).toEqual(["0", "2"]);
        expectInAgreement(graph, jsx, [0, 2]);
    });

    it("stops a drag at the face of the view's drag cube, and the state still holds exactly what the view shows", async () => {
        const {graph, jsx} = await mountJsx();
        jsx.press("p-1-2");
        const start = jsx.shown("p-1-2");
        jsx.dragTo("p-1-2", [start[0] + 50, start[1], start[2]]);
        const now = jsx.shown("p-1-2");
        expect(now[0]).toBeGreaterThan(start[0]);
        expect(now[0]).toBeLessThan(start[0] + 50);
        expect([now[1], now[2]].map(v => Math.round(v * 1e6))).toEqual([start[1], start[2]].map(v => Math.round(v * 1e6)));
        jsx.release("p-1-2");
        expectInAgreement(graph, jsx, [1, 2]);
    });
});
