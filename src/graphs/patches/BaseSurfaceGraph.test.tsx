/** Camera-only state changes reuse the last scene's geometry; any other change rebuilds it (task 07 review #9). */
import {act, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorPatchGraph from "./TensorPatchGraph";
import type {SurfaceCamera} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);

class SpyGraph extends TensorPatchGraph {
    builds = 0;
    protected override buildScene(...args: Parameters<TensorPatchGraph["buildScene"]>) {
        this.builds++;
        return super.buildScene(...args);
    }
    replaceScene() { this.syncReplacedScene(); }
}

function mount() {
    const view = new FakeSurfaceView();
    const graph = new SpyGraph({viewFactory: () => view});
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

describe("camera-only reuse", () => {
    it("an orbit does not call buildScene and keeps the geometry arrays", () => {
        const {graph, view} = mount();
        const before = view.last, builds = graph.builds;
        const camera: SurfaceCamera = {...graph.state.camera, az: 1.25, distance: 11, target: [1, 2, 3]};
        view.emit({kind: "camera", camera});
        expect(graph.builds).toBe(builds);
        expect(view.last.camera).toEqual(camera);
        expect(view.last.camera.target).not.toBe(camera.target);
        expect(view.last.revision).toBe(before.revision);
        expect(view.last.polylines).toBe(before.polylines);
        expect(view.last.points).toBe(before.points);
        expect(view.last.mesh).toBe(before.mesh);
        view.emit({kind: "camera", camera: {...camera, az: 2}});
        expect(graph.builds).toBe(builds);
        expect(view.last.camera.az).toBe(2);
        expect(view.last.polylines).toBe(before.polylines);
    });
    it("a parameter marker change calls buildScene", () => {
        const {graph, view} = mount();
        const builds = graph.builds;
        act(() => graph.setParameter("u", 0.3));
        expect(graph.builds).toBeGreaterThan(builds);
        expect(view.last.polylines).not.toBe(view.scenes[0].polylines);
    });
    it("a selection change calls buildScene", () => {
        const {graph, view} = mount();
        view.emit({kind: "camera", camera: {...graph.state.camera, az: 1}});
        const builds = graph.builds;
        view.emit({kind: "select", pointId: "p-1-2"});
        expect(graph.builds).toBeGreaterThan(builds);
    });
    it("a geometry change after an orbit calls buildScene", () => {
        const {graph, view} = mount();
        view.emit({kind: "camera", camera: {...graph.state.camera, az: 1}});
        const builds = graph.builds;
        view.emit({kind: "point", pointId: "p-1-1", xyz: [0.5, 0.5, 3], phase: "move"});
        expect(graph.builds).toBeGreaterThan(builds);
        expect(view.last.camera.az).toBe(1);
    });
    it("a Preset restore and a scene replacement call buildScene", () => {
        const {graph, view} = mount();
        const preset = JSON.parse(JSON.stringify(graph.exportPreset()));
        view.emit({kind: "camera", camera: {...graph.state.camera, az: 1}});
        let builds = graph.builds;
        act(() => graph.importPreset(preset));
        expect(graph.builds).toBeGreaterThan(builds);
        view.emit({kind: "camera", camera: {...graph.state.camera, az: 1.5}});
        builds = graph.builds;
        act(() => graph.replaceScene());
        expect(graph.builds).toBeGreaterThan(builds);
    });
});
