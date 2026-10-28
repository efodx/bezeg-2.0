import {act, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import type {LessonAction, LessonPatchFixture, LessonPoint3, LessonView3D} from "../../learning/model";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorPatchGraph from "./TensorPatchGraph";
import TriangularPatchGraph from "./TriangularPatchGraph";
import {MAX_DISTANCE, MAX_ELEVATION} from "./surface-view/surfaceMath";

beforeAll(installBoardShims);

const pt = (x: number, y: number, z: number): LessonPoint3 => ({x, y, z});
const tensorNet = (m: number, n: number, height: number): LessonPoint3[] =>
    Array.from({length: (m + 1) * (n + 1)}, (_, k) => pt(Math.floor(k / (n + 1)), k % (n + 1), height));
const tensor = (m: number, n: number, height = 0.25): LessonPatchFixture => ({kind: "tensor", m, n, net: tensorNet(m, n, height)});
const triangular = (n: number, height = 0.5): LessonPatchFixture => ({
    kind: "triangular", n, net: Array.from({length: (n + 1) * (n + 2) / 2}, (_, k) => pt(k, k * 0.5, height)),
});
const scene = (patch: LessonPatchFixture, sceneId = "s", view3d?: LessonView3D): LessonAction =>
    ({kind: "prepared-scene", sceneId, source: "lesson-patch-fixture", patch, ...(view3d ? {view3d} : {})});
const triples = (net: readonly LessonPoint3[]) => net.map(p => [p.x, p.y, p.z]);

function mount<G extends TensorPatchGraph | TriangularPatchGraph>(make: (view: FakeSurfaceView) => G) {
    const view = new FakeSurfaceView();
    const graph = make(view);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const caps = graph.getLessonCapabilities();
    return {graph, view, apply: (...actions: LessonAction[]) => act(() => actions.forEach(a => caps.apply(a)))};
}
const mountTensor = () => mount(view => new TensorPatchGraph({viewFactory: () => view}));
const mountTriangular = () => mount(view => new TriangularPatchGraph({viewFactory: () => view}));

describe("tensor lesson patch fixture", () => {
    it("loads the net into the scene store and the adapter geometry, and keeps it", () => {
        const {graph, view, apply} = mountTensor();
        const before = view.last.revision;
        apply(scene(tensor(2, 1)));
        expect(graph.state.m).toBe(2);
        expect(graph.state.n).toBe(1);
        expect(graph.state.net.flat()).toEqual(triples(tensorNet(2, 1, 0.25)));
        expect(view.last.points.map(p => p.xyz)).toEqual(triples(tensorNet(2, 1, 0.25)));
        expect(view.last.revision).toBeGreaterThan(before);
    });

    it("clears selection and keeps the other defaults", () => {
        const {graph, view, apply} = mountTensor();
        const defaults = graph.state.isoDensity;
        view.emit({kind: "select", pointId: "p-1-2"});
        apply(scene(tensor(1, 1)));
        expect(view.last.points.length).toBe(4);
        expect(graph.state.isoDensity).toBe(defaults);
        expect(graph.state.u).toBe(0.5);
        expect(graph.state.showControlNet).toBe(true);
    });

    it("applies view3d with clamping and a target", () => {
        const {graph, view, apply} = mountTensor();
        apply(scene(tensor(1, 1), "s", {az: 0.4, el: 9, distance: 1000, target: pt(1, 2, 3)}));
        expect(graph.state.camera).toEqual({az: 0.4, el: MAX_ELEVATION, distance: MAX_DISTANCE, projection: "perspective", target: [1, 2, 3]});
        expect(view.last.camera.az).toBe(0.4);
    });

    it("leaves the state intact on a triangular fixture, a bad net, a bad view", () => {
        const {graph, view, apply} = mountTensor();
        apply(scene(tensor(2, 2)));
        const state = graph.state, scenes = view.scenes.length;
        const bad: LessonAction[] = [
            scene(triangular(2)),
            scene({kind: "tensor", m: 2, n: 2, net: tensorNet(2, 2, 0).slice(1)}),
            scene({kind: "tensor", m: 5, n: 1, net: tensorNet(5, 1, 0)}),
            scene({kind: "tensor", m: 1, n: 1, net: [...tensorNet(1, 1, 0).slice(1), pt(0, 0, NaN)]}),
            scene(tensor(1, 1), "s", {az: Number.NaN, el: 0, distance: 5}),
            scene(tensor(1, 1), "s", {az: 0, el: 0, distance: 5, target: pt(0, Infinity, 0)}),
        ];
        bad.forEach(action => expect(() => act(() => graph.getLessonCapabilities().apply(action))).toThrow());
        expect(graph.state).toBe(state);
        expect(view.scenes.length).toBe(scenes);
    });

    it("a synchronous sequence of prepared scenes ends on the last one", () => {
        const {graph, view, apply} = mountTensor();
        apply(scene(tensor(3, 2, 1), "a", {az: 1, el: 0.5, distance: 9}), scene(tensor(1, 3, 2), "b"),
            {kind: "prepared-scene", sceneId: "c", source: "lesson-patch-fixture", patch: tensor(2, 2, 3)});
        expect(graph.state.net.flat()).toEqual(triples(tensorNet(2, 2, 3)));
        expect(view.last.points.map(p => p.xyz)).toEqual(triples(tensorNet(2, 2, 3)));
        expect(graph.state.camera.az).not.toBe(1);
        apply(scene(tensor(1, 3, 2), "b"), {kind: "prepared-scene", sceneId: "d", source: "demonstration-default"});
        expect(graph.state.m).toBe(3);
        expect(graph.state.net.flat()).not.toEqual(triples(tensorNet(1, 3, 2)));
    });
});

describe("triangular lesson patch fixture", () => {
    it("loads the net, applies view3d and rejects a tensor fixture", () => {
        const {graph, view, apply} = mountTriangular();
        apply(scene(triangular(3), "t", {az: 2, el: 0.3, distance: 7}));
        expect(graph.state.n).toBe(3);
        expect(graph.state.net).toEqual(triples(triangular(3).net));
        expect(view.last.points.map(p => p.xyz)).toEqual(triples(triangular(3).net));
        expect(graph.state.camera.az).toBe(2);
        const state = graph.state;
        expect(() => act(() => graph.getLessonCapabilities().apply(scene(tensor(1, 1))))).toThrow();
        expect(() => act(() => graph.getLessonCapabilities().apply(scene({kind: "triangular", n: 2, net: []})))).toThrow();
        expect(graph.state).toBe(state);
    });
});
