/** The square versus triangle comparison in `patch-triangular`: a transient Prikaz switch, the scene role and the inset square. */
import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TriangularPatchGraph from "./TriangularPatchGraph";
import {tensorNetFromTriangular} from "./TriangularTensorComparison";
import {patchFromNet} from "./patchSceneBuilder";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => setLanguage("sl"));

class ExposedGraph extends TriangularPatchGraph {
    get square() { return this.insetSquare; }
}

function mount() {
    const view = new FakeSurfaceView();
    const graph = new ExposedGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}
const toggle = () => screen.getByLabelText<HTMLInputElement>(t("patch_compare_show"));
const compareLines = (view: FakeSurfaceView) => view.last.polylines.filter(line => line.role === "compare");
const calculatedVisibility = (element: object): unknown => {
    const calculated: unknown = Reflect.get(element, "visPropCalc");
    return typeof calculated === "object" && calculated !== null ? Reflect.get(calculated, "visible") : undefined;
};
/** Whether the inset square is drawn: the polygon and all four of its borders agree. */
const squareShown = (graph: ExposedGraph): unknown => {
    const square = graph.square!;
    const borders: unknown = Reflect.get(square, "borders");
    if (!Array.isArray(borders) || borders.length !== 4) throw new Error("the inset square should have four borders");
    const shown = calculatedVisibility(square);
    borders.forEach(border => expect(calculatedVisibility(border)).toBe(shown));
    return shown;
};
const netRows = (view: FakeSurfaceView, id: string) => view.last.polylines.find(line => line.id === id)!.points;

describe("tensor comparison switch", () => {
    it("starts off; the switch reaches the scene and the inset square, and off removes them again", () => {
        const {graph, view} = mount();
        expect(toggle().checked).toBe(false);
        expect(compareLines(view)).toHaveLength(0);
        expect(squareShown(graph)).toBe(false);
        fireEvent.click(toggle());
        expect(toggle().checked).toBe(true);
        // Degree 3: 4 boundary curves, 2 x 9 iso lines, 8 net rows and columns.
        expect(compareLines(view)).toHaveLength(4 + 18 + 8);
        expect(squareShown(graph)).toBe(true);
        expect(screen.getByText(t("patch_compare_domains"))).toBeTruthy();
        fireEvent.click(toggle());
        expect(compareLines(view)).toHaveLength(0);
        expect(squareShown(graph)).toBe(false);
        expect(screen.queryByText(t("patch_compare_domains"))).toBeNull();
    });
    it("follows a net drag, a degree change and a starting patch, always matching the derived net", () => {
        const {graph, view} = mount();
        act(() => graph.setTensorComparison(true));
        /** The compare boundary curve u = 1 is the derived patch's own curve; it must equal the kernel's evaluation of the derived net. */
        const expectDerived = () => {
            const {n, net} = graph.state;
            const patch = patchFromNet(tensorNetFromTriangular(net, n));
            const edge = netRows(view, "compare-boundary-u1");
            edge.forEach((p, k) => {
                const q = patch.eval(1, k / (edge.length - 1));
                [q.X(), q.Y(), q.Z()].forEach((value, axis) => expect(p[axis]).toBeCloseTo(value, 12));
            });
        };
        const rows = () => view.last.polylines.filter(line => line.id.startsWith("compare-net-row-")).length;
        expectDerived();
        const before = netRows(view, "compare-net-row-1");
        // An interior point is not an input of the derived patch; a boundary point P_10 = b_102 is.
        view.emit({kind: "point", pointId: "t-1-1-1", xyz: [0.4, 0.4, 5], phase: "move"});
        expect(netRows(view, "compare-net-row-1")).toEqual(before);
        view.emit({kind: "point", pointId: "t-1-0-2", xyz: [0.4, 0.1, 5], phase: "move"});
        expect(netRows(view, "compare-net-row-1")).not.toEqual(before);
        expect(netRows(view, "compare-net-row-1")[0].map(value => Math.round(value * 1e9) / 1e9)).toEqual([0.4, 0.1, 5]);
        expectDerived();
        expect(rows()).toBe(4);
        act(() => graph.setDegree(2));
        expect(rows()).toBe(3);
        expectDerived();
        act(() => graph.useStartingPatch(3));
        expect(rows()).toBe(5);
        expectDerived();
    });
    it("is transient: not in the Preset, the DTO or the stored data, and a Preset restore or Reset switches it off", async () => {
        const { graph, view } = mount();
        act(() => graph.setTensorComparison(true));
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        expect(JSON.stringify(graph.exportPreset())).not.toMatch(/compar|tensor/i);
        expect(JSON.stringify(Object.entries(localStorage))).toContain("mine");
        expect(JSON.stringify(Object.entries(localStorage))).not.toMatch(/compar|tensor/i);
        await settle(() => graph.selectPreset("mine"));
        expect(compareLines(view)).toHaveLength(0);
        expect(squareShown(graph)).toBe(false);
        act(() => graph.setTensorComparison(true));
        await settle(() => graph.reset());
        expect(compareLines(view)).toHaveLength(0);
        expect(squareShown(graph)).toBe(false);
    });
    it("the lesson checkpoint restores it (and the inset square) in both directions within one tick", () => {
        const {graph, view} = mount();
        const capabilities = graph.getLessonCapabilities();
        act(() => graph.setTensorComparison(true));
        const on = capabilities.captureState();
        act(() => {
            graph.setTensorComparison(false);
            capabilities.restoreState(on);
        });
        expect(compareLines(view).length).toBeGreaterThan(0);
        expect(squareShown(graph)).toBe(true);
        const off = (() => { act(() => graph.setTensorComparison(false)); return capabilities.captureState(); })();
        act(() => {
            graph.setTensorComparison(true);
            capabilities.restoreState(off);
        });
        expect(compareLines(view)).toHaveLength(0);
        expect(squareShown(graph)).toBe(false);
    });
    it("is not editable: the tensor patch adds no points and does not change the selection", () => {
        const {graph, view} = mount();
        const points = view.last.points.length;
        act(() => graph.setTensorComparison(true));
        expect(view.last.points).toHaveLength(points);
        view.emit({kind: "select", pointId: "t-1-1-1"});
        expect(view.last.points.filter(p => p.selected).map(p => p.id)).toEqual(["t-1-1-1"]);
        expect(view.last.polylines.filter(line => line.role === "highlight")).toHaveLength(3);
    });
    it("a language switch relabels the switch and its note", () => {
        const {graph} = mount();
        act(() => graph.setTensorComparison(true));
        act(() => setLanguage("en"));
        expect(screen.getByLabelText(t("patch_compare_show"))).toBeTruthy();
        expect(screen.getByText(t("patch_compare_domains"))).toBeTruthy();
        expect(t("patch_compare_show")).toBe("Show the tensor patch of the same degree");
        expect(t("patch_compare_domains")).not.toBe("");
    });
});
