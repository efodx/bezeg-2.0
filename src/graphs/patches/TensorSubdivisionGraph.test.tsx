/**
 * The `patch-subdivision` graph core: split settings, the piece scene, the correspondence readout, exact elevation with
 * its transient ghost, and the Preset `state` round trip. Panels and the route's Preset collection are not covered here.
 */
import {act, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import type {TransientState} from "../base/BaseGraph";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorSubdivisionGraph from "./TensorSubdivisionGraph";
import {patchFromNet} from "./patchSceneBuilder";
import type {Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

class ExposedGraph extends TensorSubdivisionGraph {
    capture(): TransientState { return this.captureTransientState(); }
    restore(saved: TransientState | undefined) { this.restoreTransientState(saved); }
}

function mount() {
    const view = new FakeSurfaceView();
    const graph = new ExposedGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}

const near = (actual: ArrayLike<number>, expected: ArrayLike<number>) => Array.from(expected).forEach((value, k) => expect(actual[k]).toBeCloseTo(value, 12));
const ghostLines = (view: FakeSurfaceView) => view.last.polylines.filter(line => line.id.startsWith("ghost-"));
const sample = (net: Xyz[][], u: number, v: number): Xyz => {
    const p = patchFromNet(net).eval(u, v);
    return [p.X(), p.Y(), p.Z?.() ?? 0];
};
const GRID: ReadonlyArray<readonly [number, number]> = [[0, 0], [0.2, 0.7], [0.5, 0.5], [0.9, 0.1], [1, 1]];
const drag = (view: FakeSurfaceView, pointId: string, xyz: Xyz) => act(() => view.emit({kind: "point", pointId, xyz, phase: "move"}));

describe("starting scene and split settings", () => {
    it("starts as the bicubic dome split in u at 0.4 with the pieces shown, read-only", () => {
        const {graph, view} = mount();
        expect(graph.state).toMatchObject({m: 3, n: 3, subdivisionDirection: "u", subdivisionValue: 0.4, showPieces: true});
        const scene = view.last;
        expect(scene.points).toEqual([]);
        expect(scene.interaction.editable).toBe(false);
        expect(scene.polylines.filter(l => l.id.startsWith("piece-l-row-"))).toHaveLength(4);
        expect(scene.polylines.filter(l => l.id.startsWith("piece-r-col-"))).toHaveLength(4);
        expect(scene.polylines.some(l => l.id === "split-curve" && l.role === "highlight")).toBe(true);
        expect(scene.polylines.some(l => l.id.startsWith("net-row-"))).toBe(false);
        expect(scene.mesh).toBeDefined();
    });
    it("the setters clamp the value to the range, ignore non-finite values and change the scene", () => {
        const {graph, view} = mount();
        const split = () => view.last.polylines.find(l => l.id === "split-curve")!.points[0];
        const before = split();
        act(() => graph.setSubdivisionValue(0.7));
        expect(graph.state.subdivisionValue).toBe(0.7);
        expect(split()).not.toEqual(before);
        act(() => graph.setSubdivisionValue(0));
        expect(graph.state.subdivisionValue).toBe(0.05);
        act(() => graph.setSubdivisionValue(3));
        expect(graph.state.subdivisionValue).toBe(0.95);
        act(() => { graph.setSubdivisionValue(Number.NaN); graph.setSubdivisionValue(Infinity); });
        expect(graph.state.subdivisionValue).toBe(0.95);
        act(() => graph.setSubdivisionDirection("v"));
        near(view.last.polylines.find(l => l.id === "split-curve")!.points[0], sample(graph.state.net, 0, 0.95));
    });
    it("showPieces off restores the inherited tensor scene: net, points, editable", () => {
        const {graph, view} = mount();
        act(() => graph.setShowPieces(false));
        const scene = view.last;
        expect(scene.points).toHaveLength(16);
        expect(scene.interaction.editable).toBe(true);
        expect(scene.polylines.filter(l => l.role === "net")).toHaveLength(8);
        expect(scene.polylines.some(l => l.id.startsWith("piece-") || l.id === "split-curve")).toBe(false);
        expect(scene.polylines.some(l => l.role === "net-2")).toBe(false);
    });
    it("control points can be dragged only with the pieces hidden", () => {
        const {graph, view} = mount();
        const net = graph.state.net;
        drag(view, "p-1-1", [9, 9, 9]);
        expect(graph.state.net).toBe(net);
        act(() => graph.setShowPieces(false));
        drag(view, "p-1-1", [9, 9, 9]);
        expect(graph.state.net[1][1]).toEqual([9, 9, 9]);
    });
    it("a starting patch replaces the net and keeps the split the student chose", () => {
        const {graph} = mount();
        act(() => { graph.setSubdivisionDirection("v"); graph.setSubdivisionValue(0.8); graph.setShowPieces(false); });
        const net = graph.state.net;
        act(() => graph.useStartingPatch(0));
        expect(graph.state.net).not.toBe(net);
        expect(graph.state).toMatchObject({m: 1, n: 1, subdivisionDirection: "v", subdivisionValue: 0.8, showPieces: false});
    });
});

describe("correspondence", () => {
    it.each([[0.1, 0.5, "left"], [0.4, 0.5, "left"], [0.8, 0.2, "right"]] as const)("S(%s, %s) is on the %s piece and equals the original point", (u, v, piece) => {
        const {graph} = mount();
        act(() => graph.setParameters(u, v));
        const result = graph.correspondence();
        expect(result.location.piece).toBe(piece);
        near(result.point, sample(graph.state.net, u, v));
    });
});

describe("Preset state", () => {
    it("exports the split settings and imports them back, clamped and defaulted", () => {
        const {graph} = mount();
        act(() => { graph.setSubdivisionDirection("v"); graph.setSubdivisionValue(0.6); graph.setShowPieces(false); });
        const data = JSON.parse(JSON.stringify(graph.exportPresetData()));
        expect(data[0][1].state).toMatchObject({subdivisionDirection: "v", subdivisionValue: 0.6, showPieces: false});
        const other = mount();
        act(() => other.graph.importPresetData(data));
        expect(other.graph.state).toMatchObject({subdivisionDirection: "v", subdivisionValue: 0.6, showPieces: false});
        data[0][1].state.subdivisionValue = 7;
        act(() => other.graph.importPresetData(data));
        expect(other.graph.state.subdivisionValue).toBe(0.95);
        data[0][1].state = {...data[0][1].state, subdivisionDirection: "w", subdivisionValue: "x", showPieces: 1};
        act(() => other.graph.importPresetData(data));
        expect(other.graph.state).toMatchObject({subdivisionDirection: "u", subdivisionValue: 0.4, showPieces: true});
        delete data[0][1].state;
        act(() => other.graph.importPresetData(data));
        expect(other.graph.state).toMatchObject({subdivisionDirection: "u", subdivisionValue: 0.4, showPieces: true});
    });
});

describe("elevation", () => {
    it.each(["u", "v"] as const)("elevating in %s raises that degree, leaves the surface and the shading mesh unchanged and keeps a ghost of the old net", direction => {
        const {graph, view} = mount();
        const before = graph.state.net, meshBefore = view.last.mesh!.positions;
        act(() => graph.elevate(direction));
        expect(graph.state.m).toBe(direction === "u" ? 4 : 3);
        expect(graph.state.n).toBe(direction === "v" ? 4 : 3);
        expect(graph.state.net).toHaveLength(graph.state.m + 1);
        expect(graph.state.net[0]).toHaveLength(graph.state.n + 1);
        for (const [u, v] of GRID) near(sample(graph.state.net, u, v), sample(before, u, v));
        near(view.last.mesh!.positions, meshBefore);
        const ghost = ghostLines(view);
        expect(ghost).toHaveLength(4 + 4);
        expect(ghost.every(l => l.role === "compare")).toBe(true);
        expect(ghost.find(l => l.id === "ghost-row-2")!.points).toEqual(before[2]);
        expect(ghost.find(l => l.id === "ghost-col-1")!.points).toEqual(before.map(row => row[1]));
        // The split pieces follow the elevated net (degree 4 pieces, 5 rows).
        const rows = view.last.polylines.filter(l => l.id.startsWith("piece-l-row-"));
        expect(rows).toHaveLength(graph.state.m + 1);
    });
    it("is unavailable at degree 4: nothing changes", () => {
        const {graph} = mount();
        act(() => graph.elevate("u"));
        expect(graph.canElevateIn("u")).toBe(false);
        expect(graph.canElevateIn("v")).toBe(true);
        const net = graph.state.net;
        act(() => graph.elevate("u"));
        expect(graph.state.net).toBe(net);
        expect(graph.state.m).toBe(4);
        act(() => graph.elevate("v"));
        expect(graph.state).toMatchObject({m: 4, n: 4});
        act(() => { graph.elevate("v"); graph.elevate("u"); });
        expect(graph.state).toMatchObject({m: 4, n: 4});
    });
    it("a second elevation in one tick shows the net before that elevation", () => {
        const {graph, view} = mount();
        act(() => { graph.elevate("u"); graph.elevate("v"); });
        expect(graph.state).toMatchObject({m: 4, n: 4});
        expect(ghostLines(view)).toHaveLength(5 + 4);
    });

    describe("the ghost is cleared by", () => {
        const withGhost = () => {
            const mounted = mount();
            act(() => { mounted.graph.setShowPieces(false); mounted.graph.elevate("u"); });
            expect(ghostLines(mounted.view).length).toBeGreaterThan(0);
            return mounted;
        };
        it("a net edit", () => {
            const {view} = withGhost();
            drag(view, "p-2-2", [3, 3, 3]);
            expect(ghostLines(view)).toEqual([]);
        });
        it("a degree change", () => {
            const {graph, view} = withGhost();
            act(() => graph.setDegree("v", 2));
            expect(ghostLines(view)).toEqual([]);
        });
        it("a starting patch", () => {
            const {graph, view} = withGhost();
            act(() => graph.useStartingPatch(1));
            expect(ghostLines(view)).toEqual([]);
        });
        it("a Preset load", async () => {
            const {graph, view} = withGhost();
            // The inherited `patch-tensor` collection does not know the split fields yet (slice 10W adds them), so the saved Preset omits them.
            const [type, dto] = graph.exportPresetData()[0];
            const {subdivisionDirection, subdivisionValue, showPieces, ...rest} = JSON.parse(JSON.stringify(dto.state));
            void subdivisionDirection; void subdivisionValue; void showPieces;
            graph.presetService!.savePreset({...graph.exportPreset(), id: "mine", data: [[type, {...dto, state: rest}]]});
            act(() => graph.elevate("v"));
            expect(ghostLines(view)).not.toEqual([]);
            await settle(() => graph.selectPreset("mine"));
            expect(graph.state.m).toBe(4);
            expect(ghostLines(view)).toEqual([]);
        });
        it("Reset", async () => {
            const {graph, view} = withGhost();
            await settle(() => graph.reset());
            expect(graph.state).toMatchObject({m: 3, n: 3});
            expect(ghostLines(view)).toEqual([]);
        });
    });

    describe("transient state", () => {
        it("declares the ghost and reads it back into a fresh graph", () => {
            const {graph} = mount();
            expect(graph.capture().elevationGhost).toBeUndefined();
            const before = graph.state.net;
            act(() => graph.elevate("v"));
            const saved = graph.capture();
            expect(saved.elevationGhost).toEqual(before);
            const other = mount();
            act(() => { other.graph.importPresetData(graph.exportPresetData()); other.graph.restore(JSON.parse(JSON.stringify(saved))); other.graph.setSubdivisionValue(0.5); });
            expect(ghostLines(other.view)).toHaveLength(8);
        });
        it("ignores an invalid captured ghost", () => {
            const {graph, view} = mount();
            act(() => graph.restore({elevationGhost: [[1, 2, 3]]}));
            act(() => graph.setSubdivisionValue(0.5));
            expect(ghostLines(view)).toEqual([]);
            expect(graph.capture().elevationGhost).toBeUndefined();
        });
        it("a ghost whose net has changed is not captured", () => {
            const {graph, view} = mount();
            act(() => { graph.setShowPieces(false); graph.elevate("u"); });
            drag(view, "p-0-0", [5, 5, 5]);
            expect(graph.capture().elevationGhost).toBeUndefined();
        });
    });
});
