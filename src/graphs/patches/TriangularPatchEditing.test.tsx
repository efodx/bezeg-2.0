/**
 * The triangular patch Uredi controls for a control point: the index selection, the numeric xyz editor, the three
 * highlight lines and the Bernstein weight readout, kept in agreement with the view after every kind of change.
 */
import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import {newJsxHandle, type JsxHandle} from "./jsxPatchEditing.test-helper";
import TriangularPatchGraph from "./TriangularPatchGraph";
import {triangularIndex, triangularIndices, triangularPointId} from "./TriangularPatchLattice";
import type {Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => setLanguage("sl"));

function mount() {
    const view = new FakeSurfaceView();
    const graph = new TriangularPatchGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}

const select = () => screen.getByLabelText<HTMLSelectElement>(t("patch_triangular_index"));
const input = (name: string) => screen.getByLabelText<HTMLInputElement>(name);
const choose = (i: number, j: number, k: number) => fireEvent.change(select(), {target: {value: triangularPointId(i, j, k)}});
const highlights = (view: FakeSurfaceView) => view.last.polylines.filter(line => line.role === "highlight");
const weightText = () => document.querySelector('[data-readout="bernstein-weight"] dd')?.textContent;
const apply = (name: string, x: string, y: string, z: string) => {
    fireEvent.change(input(`${name} x`), {target: {value: x}});
    fireEvent.change(input(`${name} y`), {target: {value: y}});
    fireEvent.change(input(`${name} z`), {target: {value: z}});
    fireEvent.submit(input(`${name} x`).closest("form")!);
};
const netPoint = (graph: TriangularPatchGraph, i: number, j: number): Xyz => graph.state.net[triangularIndex(graph.state.n, i, j)];
/** The net point of the lattice index `(i, j, k)`; k is implied by i and j and only documents the triple. */
const at = (graph: TriangularPatchGraph, [i, j]: readonly [number, number, number]): Xyz => netPoint(graph, i, j);

describe("index selection", () => {
    it("offers exactly the valid triples, so an invalid combination cannot be chosen", () => {
        const {graph} = mount();
        const offered = [...select().options].map(option => option.value);
        expect(offered).toEqual(["", ...triangularIndices(3).map(([i, j, k]) => `t-${i}-${j}-${k}`)]);
        expect(offered.slice(1).every(value => { const [, i, j, k] = value.split("-").map(Number); return i + j + k === 3; })).toBe(true);
        act(() => graph.setDegree(2));
        expect([...select().options].map(option => option.text)).toEqual([t("patch_no_selection"), "(2, 0, 0)", "(1, 1, 0)", "(1, 0, 1)", "(0, 2, 0)", "(0, 1, 1)", "(0, 0, 2)"]);
    });

    it("selecting by index and selecting in the view drive the same selection and show its coordinates", () => {
        const {graph, view} = mount();
        expect(select().value).toBe("");
        expect(screen.getByText(t("patch_triangular_select_point_help"))).toBeTruthy();
        choose(2, 1, 0);
        expect(view.last.points.filter(p => p.selected).map(p => p.id)).toEqual(["t-2-1-0"]);
        const [x, y, z] = netPoint(graph, 2, 1);
        expect([input("P₂₁₀ x").value, input("P₂₁₀ y").value, input("P₂₁₀ z").value]).toEqual([String(x), String(y), String(z)]);

        view.emit({kind: "select", pointId: "t-1-1-1"});
        expect(select().value).toBe("t-1-1-1");
        expect(input("P₁₁₁ z").value).toBe(String(netPoint(graph, 1, 1)[2]));
        expect(view.last.points.filter(p => p.selected).map(p => p.id)).toEqual(["t-1-1-1"]);

        fireEvent.change(select(), {target: {value: ""}});
        expect(view.last.points.some(p => p.selected)).toBe(false);
        expect(view.last.labels.some(l => l.id === "selected-point")).toBe(false);
        expect(screen.getByText(t("patch_triangular_select_point_help"))).toBeTruthy();
    });

    it("a degree change clears a selection the new net lacks", () => {
        const {graph, view} = mount();
        choose(1, 1, 1);
        act(() => graph.setDegree(2));
        expect(select().value).toBe("");
        expect(view.last.points.some(p => p.selected)).toBe(false);
        expect(highlights(view)).toHaveLength(0);
        expect(document.querySelector('[data-readout="bernstein-weight"]')).toBeNull();
    });
});

describe("numeric xyz editor", () => {
    it("applies finite coordinates to the net and the reconciled point", () => {
        const {graph, view} = mount();
        choose(2, 1, 0);
        apply("P₂₁₀", "0.5", "-1.25", "3");
        expect(netPoint(graph, 2, 1)).toEqual([0.5, -1.25, 3]);
        expect(view.last.points.find(p => p.id === "t-2-1-0")?.xyz).toEqual([0.5, -1.25, 3]);
        expect(input("P₂₁₀ y").value).toBe("-1.25");
    });

    it("rejects a non-finite or empty coordinate with the localized message and leaves the net alone", () => {
        const {graph} = mount();
        choose(2, 1, 0);
        for (const invalid of ["abc", "", "Infinity"]) {
            const current = graph.state.net;
            apply("P₂₁₀", invalid, "1", "1");
            expect(graph.state.net).toBe(current);
            expect(screen.getByRole("alert").textContent).toBe(t("enter_finite_numeric_coordinates"));
            apply("P₂₁₀", "1", "2", "3");
            expect(netPoint(graph, 2, 1)).toEqual([1, 2, 3]);
            expect(screen.queryByRole("alert")).toBeNull();
        }
    });

    it("follows drags, scene writes, a language switch, Reset and one synchronous tick", async () => {
        const {graph, view} = mount();
        choose(1, 1, 1);
        view.emit({kind: "point", pointId: "t-1-1-1", xyz: [0.75, 0.5, 4], phase: "move"});
        expect([input("P₁₁₁ x").value, input("P₁₁₁ z").value]).toEqual(["0.75", "4"]);

        act(() => graph.setState({net: graph.state.net.map((): Xyz => [9, 8, 7])}));
        expect(input("P₁₁₁ x").value).toBe("9");

        act(() => setLanguage("en"));
        expect(input("P₁₁₁ x").value).toBe("9");
        expect(select().value).toBe("t-1-1-1");
        expect(screen.getByLabelText("Point indices (i, j, k)")).toBe(select());

        act(() => {
            graph.selectIndex([2, 0, 1]);
            graph.setSelectedCoordinates([1, 2, 3]);
            graph.setParameters(0.5, 0.25);
        });
        expect(netPoint(graph, 2, 0)).toEqual([1, 2, 3]);
        expect(view.last.points.find(p => p.id === "t-2-0-1")).toMatchObject({xyz: [1, 2, 3], selected: true});
        expect(input("P₂₀₁ y").value).toBe("2");
        // 3 * 0.5^2 * 0.25 (w = 0.25)
        expect(weightText()).toBe("0.1875");

        await settle(() => graph.reset());
        expect(select().value).toBe("");
        expect(screen.getByText(t("patch_triangular_select_point_help"))).toBeTruthy();
    });

    it("clears the selection on a Preset restore, and selecting again shows the restored coordinates", async () => {
        const {graph} = mount();
        choose(1, 2, 0);
        act(() => graph.setSelectedCoordinates([4, 5, 6]));
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        act(() => graph.setSelectedCoordinates([0, 0, 0]));
        expect(input("P₁₂₀ x").value).toBe("0");
        await settle(() => graph.selectPreset("mine"));
        expect(netPoint(graph, 1, 2)).toEqual([4, 5, 6]);
        expect(select().value).toBe("");
        choose(1, 2, 0);
        expect(input("P₁₂₀ x").value).toBe("4");
    });
});

describe("highlight lines in the view", () => {
    it("draws the three lines through an interior, an edge and a vertex point, and follows moves and degree changes", () => {
        const {graph, view} = mount();
        choose(1, 1, 1);
        expect(highlights(view).map(line => [line.id, line.points])).toEqual([
            ["highlight-i", [at(graph, [1, 2, 0]), at(graph, [1, 1, 1]), at(graph, [1, 0, 2])]],
            ["highlight-j", [at(graph, [2, 1, 0]), at(graph, [1, 1, 1]), at(graph, [0, 1, 2])]],
            ["highlight-k", [at(graph, [2, 0, 1]), at(graph, [1, 1, 1]), at(graph, [0, 2, 1])]],
        ]);
        view.emit({kind: "point", pointId: "t-1-1-1", xyz: [0, 0, 9], phase: "move"});
        expect(highlights(view).map(line => line.points[1])).toEqual([[0, 0, 9], [0, 0, 9], [0, 0, 9]]);

        choose(2, 1, 0);
        expect(highlights(view).map(line => line.points.length)).toEqual([2, 3, 4]);
        choose(0, 3, 0);
        expect(highlights(view).map(line => line.id)).toEqual(["highlight-i", "highlight-k"]);
        expect(highlights(view).map(line => line.points.length)).toEqual([4, 4]);

        act(() => graph.setDegree(2));
        expect(highlights(view)).toHaveLength(0);
        choose(1, 1, 0);
        expect(highlights(view).map(line => [line.id, line.points.length])).toEqual([["highlight-i", 2], ["highlight-j", 2], ["highlight-k", 3]]);
    });

    it("hides the lines with the control net", () => {
        const {graph, view} = mount();
        choose(1, 1, 1);
        expect(highlights(view)).toHaveLength(3);
        act(() => graph.setVisibility("showControlNet", false));
        expect(highlights(view)).toHaveLength(0);
        act(() => graph.setVisibility("showControlNet", true));
        expect(highlights(view)).toHaveLength(3);
    });
});

describe("Bernstein weight readout", () => {
    it("shows n!/(i! j! k!) u^i v^j w^k at the current (u, v, w) and follows the parameters, the selection and the language", () => {
        const {graph} = mount();
        expect(weightText()).toBeUndefined();
        choose(1, 1, 1);
        // 6 (1/3)^3 at the centroid
        expect(weightText()).toBe("0,2222");
        act(() => graph.setParameters(0.5, 0.25));
        // 6 * 0.5 * 0.25 * 0.25
        expect(weightText()).toBe("0,1875");
        choose(3, 0, 0);
        expect(weightText()).toBe("0,125");
        expect(screen.getByText("Utež točke P₃₀₀")).toBeTruthy();
        expect(screen.getByText(t("patch_triangular_bernstein_weight", {value0: "₃", value1: "₀", value2: "₀"}))).toBeTruthy();
        act(() => setLanguage("en"));
        expect(weightText()).toBe("0.125");
        expect(screen.getByText("Weight of point P₃₀₀")).toBeTruthy();
    });

    it("is 1 for the vertex at its own corner of the triangle", () => {
        const {graph} = mount();
        choose(0, 0, 3);
        act(() => graph.setParameters(0, 0));
        expect(weightText()).toBe("1");
    });
});

/** The same editing, driven through the JSX surface view's own point drag (task 04 of docs/specs/jsxgraph-surface-view.md). */
describe("JSX surface view", () => {
    const sub = (n: number) => "₀₁₂₃₄₅₆₇₈₉"[n];
    async function mountJsx() {
        const jsx = newJsxHandle();
        const graph = new TriangularPatchGraph({viewFactory: () => jsx.view});
        render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        await jsx.ready();
        return {graph, jsx};
    }
    /** Every place that holds a control point agrees with what the view shows; `selected` also checks the numeric editor. */
    function expectInAgreement(graph: TriangularPatchGraph, jsx: JsxHandle, selected?: readonly [number, number, number]) {
        const n = graph.state.n, net = (graph.exportPreset().data ?? []).flatMap(([, dto]) => [...dto.net]);
        for (const [i, j, k] of triangularIndices(n)) {
            const shown = jsx.shown(triangularPointId(i, j, k));
            expect(graph.state.net[triangularIndex(n, i, j)], `net ${i},${j},${k}`).toEqual(shown);
            expect(net[triangularIndex(n, i, j)], `Preset ${i},${j},${k}`).toEqual(shown);
        }
        if (selected) {
            const name = `P${selected.map(sub).join("")}`;
            expect([input(`${name} x`).value, input(`${name} y`).value, input(`${name} z`).value])
                .toEqual(jsx.shown(triangularPointId(...selected)).map(String));
        }
    }

    it("selects a point on its first press without rebuilding the board, and the drag that began there goes on", async () => {
        const {graph, jsx} = await mountJsx();
        const rebuilds = jsx.view.stats.rebuilds;
        jsx.press("t-2-1-0");
        expect(select().value).toBe("t-2-1-0");
        expect(jsx.view.stats.rebuilds).toBe(rebuilds);
        const [x, y, z] = jsx.shown("t-2-1-0");
        jsx.dragTo("t-2-1-0", [x + 0.2, y + 0.3, z]);
        expect(jsx.shown("t-2-1-0")[0]).toBeCloseTo(x + 0.2, 6);
        expectInAgreement(graph, jsx, [2, 1, 0]);
        jsx.release("t-2-1-0");
        expect(jsx.view.stats.rebuilds).toBe(rebuilds);
        expectInAgreement(graph, jsx, [2, 1, 0]);
    });

    it("a plain drag moves x and y in the horizontal plane through the point, never z, and leaves the camera alone", async () => {
        const {graph, jsx} = await mountJsx();
        const camera = graph.state.camera;
        jsx.press("t-1-1-1");
        const start = jsx.shown("t-1-1-1");
        for (const [dx, dy] of [[0.1, 0.1], [0.3, -0.2], [-0.2, -0.4]]) {
            jsx.dragTo("t-1-1-1", [start[0] + dx, start[1] + dy, start[2]]);
            const now = jsx.shown("t-1-1-1");
            expect(now[0]).toBeCloseTo(start[0] + dx, 6);
            expect(now[1]).toBeCloseTo(start[1] + dy, 6);
            expect(now[2]).toBeCloseTo(start[2], 9);
            expectInAgreement(graph, jsx, [1, 1, 1]);
            expect(graph.state.camera).toBe(camera);
        }
        jsx.release("t-1-1-1");
        expectInAgreement(graph, jsx, [1, 1, 1]);
        expect(jsx.camerasEmitted()).toEqual([]);
        expect(graph.state.camera).toBe(camera);
    });

    it("Shift and the height switch make a drag change only z", async () => {
        const {graph, jsx} = await mountJsx();
        const camera = graph.state.camera;
        const toggle = () => fireEvent.click(screen.getByLabelText<HTMLInputElement>(t("patch_move_height")));
        const drag = (target: number, shift: boolean) => {
            const start = jsx.shown("t-0-1-2");
            jsx.press("t-0-1-2");
            jsx.dragTo("t-0-1-2", [start[0], start[1], target], shift);
            const now = jsx.shown("t-0-1-2");
            expect([now[0], now[1]]).toEqual([start[0], start[1]]);
            expect(now[2]).toBeCloseTo(target, 6);
            expectInAgreement(graph, jsx, [0, 1, 2]);
            jsx.release("t-0-1-2");
        };
        drag(1.5, true);
        expect(graph.state.zMode).toBe(false);
        toggle();
        expect(graph.state.zMode).toBe(true);
        drag(0.25, false);
        // With the switch on, Shift does not change that a drag is vertical.
        drag(0.75, true);
        toggle();
        const start = jsx.shown("t-0-1-2");
        jsx.press("t-0-1-2");
        jsx.dragTo("t-0-1-2", [start[0] + 0.2, start[1] + 0.1, start[2]]);
        expect(jsx.shown("t-0-1-2")[2]).toBeCloseTo(start[2], 9);
        expect(jsx.shown("t-0-1-2")[0]).toBeCloseTo(start[0] + 0.2, 6);
        jsx.release("t-0-1-2");
        expectInAgreement(graph, jsx, [0, 1, 2]);
        expect(graph.state.camera).toBe(camera);
        expect(jsx.camerasEmitted()).toEqual([]);
    });

    it("keeps the numeric editor and index selection working on a point that was dragged", async () => {
        const {graph, jsx} = await mountJsx();
        choose(1, 1, 1);
        jsx.press("t-3-0-0");
        expect(select().value).toBe("t-3-0-0");
        const [x, y, z] = jsx.shown("t-3-0-0");
        jsx.dragTo("t-3-0-0", [x - 0.3, y + 0.3, z]);
        jsx.release("t-3-0-0");
        expectInAgreement(graph, jsx, [3, 0, 0]);
        apply("P₃₀₀", "0.25", "-0.5", "1");
        jsx.flush();
        expect(jsx.shown("t-3-0-0")).toEqual([0.25, -0.5, 1]);
        expectInAgreement(graph, jsx, [3, 0, 0]);
        jsx.press("t-3-0-0");
        jsx.dragTo("t-3-0-0", [0.5, -0.5, 1]);
        jsx.release("t-3-0-0");
        expect(jsx.shown("t-3-0-0")[0]).toBeCloseTo(0.5, 6);
        expectInAgreement(graph, jsx, [3, 0, 0]);
        choose(0, 2, 1);
        jsx.flush();
        expect(select().value).toBe("t-0-2-1");
        expectInAgreement(graph, jsx, [0, 2, 1]);
    });

    it("stops a drag at the face of the view's drag cube, and the state still holds exactly what the view shows", async () => {
        const {graph, jsx} = await mountJsx();
        jsx.press("t-1-1-1");
        const start = jsx.shown("t-1-1-1");
        jsx.dragTo("t-1-1-1", [start[0] + 50, start[1], start[2]]);
        const now = jsx.shown("t-1-1-1");
        expect(now[0]).toBeGreaterThan(start[0]);
        expect(now[0]).toBeLessThan(start[0] + 50);
        expect([now[1], now[2]].map(v => Math.round(v * 1e6))).toEqual([start[1], start[2]].map(v => Math.round(v * 1e6)));
        jsx.release("t-1-1-1");
        expectInAgreement(graph, jsx, [1, 1, 1]);
    });
});
