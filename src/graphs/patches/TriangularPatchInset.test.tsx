/** The parameter-domain inset of the triangular patch: the reference triangle with a dot at (u, v). */
import {act, fireEvent, render, screen} from "@testing-library/react";
import JXG, {JSXGraph} from "jsxgraph";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TriangularPatchGraph from "./TriangularPatchGraph";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => { setLanguage("sl"); vi.restoreAllMocks(); });

class ExposedGraph extends TriangularPatchGraph {
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
const range = (label: "patch_parameter_u" | "patch_parameter_v") => screen.getByLabelText<HTMLInputElement>(t(label));
const dotOf = (graph: ExposedGraph) => [graph.insetPoint!.X(), graph.insetPoint!.Y()];
const drag = (graph: ExposedGraph, x: number, y: number) => act(() => {
    const point = graph.insetPoint!;
    point.setPositionDirectly(JXG.COORDS_BY_USER, [x, y]);
    Reflect.apply(Reflect.get(point, "triggerEventHandlers"), point, [["drag"], []]);
});

describe("triangular parameter-domain inset", () => {
    it("starts at (u, v); dragging inside sets u and v without touching the geometry", () => {
        const {graph, view} = mount();
        expect(dotOf(graph)).toEqual([graph.state.u, graph.state.v]);
        const revision = view.last.revision;
        drag(graph, 0.25, 0.5);
        expect([graph.state.u, graph.state.v]).toEqual([0.25, 0.5]);
        expect(Number(range("patch_parameter_u").value)).toBeCloseTo(0.25, 12);
        expect(Number(range("patch_parameter_v").value)).toBeCloseTo(0.5, 12);
        expect(view.last.revision).toBe(revision);
    });

    it("clamps a pointer beyond the hypotenuse, a leg or a vertex to the nearest point of the triangle", () => {
        const {graph} = mount();
        drag(graph, 0.75, 0.5);
        expect([graph.state.u, graph.state.v]).toEqual([0.625, 0.375]);
        expect(dotOf(graph)).toEqual([0.625, 0.375]);
        drag(graph, -0.5, 0.25);
        expect([graph.state.u, graph.state.v]).toEqual([0, 0.25]);
        expect(dotOf(graph)).toEqual([0, 0.25]);
        drag(graph, 2, -1);
        expect([graph.state.u, graph.state.v]).toEqual([1, 0]);
        expect(dotOf(graph)).toEqual([1, 0]);
        drag(graph, -0.5, 1.5);
        expect([graph.state.u, graph.state.v]).toEqual([0, 1]);
        expect(dotOf(graph)).toEqual([0, 1]);
    });

    it("follows sliders, scene writes, starting patches, Preset restore, Reset and a language switch", async () => {
        const {graph} = mount();
        fireEvent.change(range("patch_parameter_u"), {target: {value: "0.2"}});
        expect(dotOf(graph)).toEqual([0.2, graph.state.v]);
        fireEvent.change(range("patch_parameter_v"), {target: {value: "0.6"}});
        expect(dotOf(graph)).toEqual([0.2, 0.6]);
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        act(() => { graph.setState({u: 0.7}); graph.setState({v: 0.1}); });
        expect(dotOf(graph)).toEqual([0.7, 0.1]);
        act(() => graph.setParameters(0.6, 0.2));
        expect(dotOf(graph)).toEqual([0.6, 0.2]);
        act(() => graph.useStartingPatch(2));
        expect(dotOf(graph)).toEqual([graph.state.u, graph.state.v]);
        expect(graph.state.u).not.toBe(0.6);
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state).toMatchObject({u: 0.2, v: 0.6});
        expect(dotOf(graph)).toEqual([0.2, 0.6]);
        act(() => setLanguage("en"));
        expect(dotOf(graph)).toEqual([0.2, 0.6]);
        await settle(() => graph.selectPreset(""));
        act(() => graph.setParameters(0.6, 0.4));
        await settle(() => graph.reset());
        expect(dotOf(graph)).toEqual([graph.state.u, graph.state.v]);
        expect(graph.state.u).not.toBe(0.6);
    });

    it("setParameters moves a point outside the triangle to the nearest point and ignores non-finite values", () => {
        const {graph} = mount();
        act(() => graph.setParameters(1, 1));
        expect([graph.state.u, graph.state.v]).toEqual([0.5, 0.5]);
        expect(dotOf(graph)).toEqual([0.5, 0.5]);
        const before = [graph.state.u, graph.state.v];
        act(() => { graph.setParameters(Number.NaN, 0.2); graph.setParameters(0.2, Infinity); });
        expect([graph.state.u, graph.state.v]).toEqual(before);
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
