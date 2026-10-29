import {act, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import {UnsupportedLessonActionError, type LessonAction, type LessonPatchFixture, type LessonPoint3} from "../../learning/model";
import {AnimationDriver, type AnimationScheduler} from "../../learning/runtime/animation";
import {FakeSurfaceView, cameraSignature, sceneSignature} from "./FakeSurfaceView";
import TensorPatchGraph from "./TensorPatchGraph";
import TensorSubdivisionGraph from "./TensorSubdivisionGraph";
import TriangularPatchGraph from "./TriangularPatchGraph";
import DecasteljauGraph from "../curves/bezier/DecasteljauGraph";
import {SWEEP_MS_PER_UNIT} from "./patchSweep";

beforeAll(installBoardShims);

const pt = (x: number, y: number, z: number): LessonPoint3 => ({x, y, z});
const tensorFixture = (m: number, n: number): LessonPatchFixture =>
    ({kind: "tensor", m, n, net: Array.from({length: (m + 1) * (n + 1)}, (_, k) => { const i = Math.floor(k / (n + 1)), j = k % (n + 1); return pt(i, j, (i * 7 + j * 3) % 5 + 0.5 * i * j); })});
const triFixture = (n: number): LessonPatchFixture =>
    ({kind: "triangular", n, net: Array.from({length: (n + 1) * (n + 2) / 2}, (_, k) => pt(k, (k * k) % 7, (k * 3) % 5))});
const scene = (patch: LessonPatchFixture): LessonAction => ({kind: "prepared-scene", sceneId: "s", source: "lesson-patch-fixture", patch});
const sweep = (id: "patch-u-sweep" | "patch-v-sweep", command: string): LessonAction => ({kind: "animation", animationId: id, command} as LessonAction);

class ManualScheduler implements AnimationScheduler {
    private next = 1;
    private time = 0;
    readonly pending = new Map<number, FrameRequestCallback>();
    request(callback: FrameRequestCallback) { const h = this.next++; this.pending.set(h, callback); return h; }
    cancel(handle: number) { this.pending.delete(handle); }
    /** Runs the one pending frame `dt` ms later; returns whether a frame was pending. */
    tick(dt: number): boolean {
        const [handle, callback] = [...this.pending][0] ?? [];
        if (handle === undefined || !callback) return false;
        this.pending.delete(handle);
        this.time += dt;
        act(() => callback(this.time));
        return true;
    }
}

function mount<G extends TensorPatchGraph | TriangularPatchGraph | DecasteljauGraph>(create: (view: FakeSurfaceView, scheduler: ManualScheduler) => G) {
    const view = new FakeSurfaceView();
    const scheduler = new ManualScheduler();
    const graph = create(view, scheduler);
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const caps = graph.getLessonCapabilities();
    return {
        graph, view, scheduler, caps, rendered,
        apply: (...actions: LessonAction[]) => act(() => actions.forEach(a => caps.apply(a))),
    };
}
const tensor = () => mount((view, scheduler) => new TensorPatchGraph({viewFactory: () => view, scheduler}));
const subdivision = () => mount((view, scheduler) => new TensorSubdivisionGraph({viewFactory: () => view, scheduler}));
const triangular = () => mount((view, scheduler) => new TriangularPatchGraph({viewFactory: () => view, scheduler}));
const drivers = (graph: object): AnimationDriver[] => {
    const sweeps = (graph as {sweeps?: {drivers: Record<string, AnimationDriver>}}).sweeps;
    return sweeps ? Object.values(sweeps.drivers) : [];
};
const revision = (graph: object) => (graph as {workspaceRevision: number}).workspaceRevision;
const ghosts = (view: FakeSurfaceView) => view.last.polylines.filter(line => line.id.startsWith("ghost-")).length;

describe("checkpoint and restore", () => {
    it("restores the model, camera, controls revision and the drawn scene after other actions, in one tick", () => {
        const {graph, view, caps, apply} = tensor();
        apply(scene(tensorFixture(3, 2)), {kind: "camera-preset", view: "top"}, {kind: "patch-evaluation", u: 0.25, v: 0.75},
            {kind: "patch-visibility", target: "iso-curves", visible: false});
        const checkpoint = caps.captureState();
        const state = graph.state, signature = sceneSignature(view.last), camera = cameraSignature(view.last);
        let after = 0;
        act(() => {
            caps.apply({kind: "camera-preset", view: "front"});
            caps.apply(scene(tensorFixture(1, 1)));
            caps.apply({kind: "patch-evaluation", u: 0.9, v: 0.1});
            caps.apply({kind: "patch-visibility", target: "control-net", visible: false});
            after = revision(graph);
            caps.restoreState(checkpoint);
        });
        expect(graph.state).toEqual(state);
        expect([graph.state.m, graph.state.n]).toEqual([3, 2]);
        expect(revision(graph)).toBeGreaterThan(after);
        expect(cameraSignature(view.last)).toEqual(camera);
        expect(sceneSignature(view.last)).toEqual(signature);
    });

    it("restores the selection and the triangular preview and tensor comparison", () => {
        const {graph, view, caps, apply} = triangular();
        apply(scene(triFixture(3)));
        act(() => { graph.selectIndex([1, 1, 1]); graph.setSubdivisionPreview(true); graph.setTensorComparison(true); });
        const checkpoint = caps.captureState();
        const signature = sceneSignature(view.last);
        act(() => { graph.selectIndex(undefined); graph.setSubdivisionPreview(false); graph.setTensorComparison(false); });
        expect(sceneSignature(view.last)).not.toEqual(signature);
        act(() => caps.restoreState(checkpoint));
        expect(sceneSignature(view.last)).toEqual(signature);
        expect(view.last.points.some(p => p.selected)).toBe(true);
    });

    it("an earlier checkpoint returns net and degrees without a ghost; a later one reproduces the ghost", () => {
        const {graph, view, caps, apply} = subdivision();
        apply(scene(tensorFixture(2, 2)));
        const before = caps.captureState();
        const netBefore = graph.state.net, signatureBefore = sceneSignature(view.last);
        apply({kind: "patch-elevate", direction: "u"});
        expect(graph.state.m).toBe(3);
        expect(ghosts(view)).toBeGreaterThan(0);
        const elevated = caps.captureState();
        const signatureElevated = sceneSignature(view.last);
        act(() => caps.restoreState(before));
        expect(graph.state.net).toEqual(netBefore);
        expect([graph.state.m, graph.state.n]).toEqual([2, 2]);
        expect(ghosts(view)).toBe(0);
        expect(sceneSignature(view.last)).toEqual(signatureBefore);
        act(() => caps.restoreState(elevated));
        expect(graph.state.m).toBe(3);
        expect(ghosts(view)).toBeGreaterThan(0);
        expect(sceneSignature(view.last)).toEqual(signatureElevated);
    });
});

describe("u/v sweep animations", () => {
    it("play advances u through the injected scheduler to the end and finishes", () => {
        const {graph, scheduler, apply} = tensor();
        apply({kind: "patch-evaluation", u: 0, v: 0.4}, sweep("patch-u-sweep", "play"));
        scheduler.tick(0);
        scheduler.tick(SWEEP_MS_PER_UNIT / 4);
        expect(graph.state.u).toBeCloseTo(0.25, 10);
        expect(graph.state.v).toBe(0.4);
        scheduler.tick(SWEEP_MS_PER_UNIT);
        expect(graph.state.u).toBe(1);
        expect(scheduler.pending.size).toBe(0);
    });

    it("pause holds the value and play resumes from it; replay restarts from the low end", () => {
        const {graph, scheduler, apply} = tensor();
        apply({kind: "patch-evaluation", u: 0.5, v: 0}, sweep("patch-v-sweep", "play"));
        scheduler.tick(0);
        scheduler.tick(SWEEP_MS_PER_UNIT / 2);
        apply(sweep("patch-v-sweep", "pause"));
        const held = graph.state.v;
        expect(held).toBeCloseTo(0.5, 10);
        expect(scheduler.tick(1000)).toBe(false);
        expect(graph.state.v).toBe(held);
        apply(sweep("patch-v-sweep", "play"));
        scheduler.tick(0);
        scheduler.tick(SWEEP_MS_PER_UNIT / 4);
        expect(graph.state.v).toBeCloseTo(0.75, 10);
        apply(sweep("patch-v-sweep", "replay"));
        expect(graph.state.v).toBe(0);
        scheduler.tick(0);
        scheduler.tick(SWEEP_MS_PER_UNIT / 10);
        expect(graph.state.v).toBeCloseTo(0.1, 10);
        apply(sweep("patch-v-sweep", "stop"));
        expect(scheduler.pending.size).toBe(0);
        expect(graph.state.v).toBeCloseTo(0.1, 10);
    });

    it("a triangular sweep of u stays inside the triangle: u runs from 0 to 1 - v", () => {
        const {graph, scheduler, apply} = triangular();
        apply({kind: "patch-evaluation", u: 0.2, v: 0.3}, sweep("patch-u-sweep", "replay"));
        expect(graph.state.u).toBe(0);
        for (let frame = 0; frame < 64 && scheduler.tick(SWEEP_MS_PER_UNIT / 8); frame++) expect(graph.state.u + graph.state.v).toBeLessThanOrEqual(1 + 1e-12);
        expect(graph.state.u).toBeCloseTo(0.7, 10);
        expect(scheduler.pending.size).toBe(0);
        expect(graph.state.v).toBe(0.3);
        apply(sweep("patch-v-sweep", "replay"));
        for (let frame = 0; frame < 64 && scheduler.tick(SWEEP_MS_PER_UNIT / 8); frame++) expect(graph.state.u + graph.state.v).toBeLessThanOrEqual(1 + 1e-12);
        expect(graph.state.v).toBeCloseTo(0.3, 10);
        expect(scheduler.pending.size).toBe(0);
    });

    const running = (make: typeof tensor | typeof triangular) => {
        const m = make();
        m.apply({kind: "patch-evaluation", u: 0, v: 0.2}, sweep("patch-u-sweep", "play"));
        m.scheduler.tick(0);
        m.scheduler.tick(100);
        expect(m.scheduler.pending.size).toBe(1);
        return m;
    };

    it("restoring a checkpoint cancels a running sweep", () => {
        const m = running(tensor);
        const checkpoint = m.caps.captureState();
        m.scheduler.tick(100);
        act(() => m.caps.restoreState(checkpoint));
        const u = m.graph.state.u;
        expect(m.scheduler.pending.size).toBe(0);
        expect(drivers(m.graph).filter(d => d.isRunning())).toHaveLength(0);
        expect(m.scheduler.tick(1000)).toBe(false);
        expect(m.graph.state.u).toBe(u);
    });

    it("a prepared scene cancels a running sweep (fixture and demonstration default)", () => {
        for (const prepared of [scene(tensorFixture(2, 2)), {kind: "prepared-scene", sceneId: "d", source: "demonstration-default"} as LessonAction]) {
            const m = running(tensor);
            m.apply(prepared);
            expect(m.scheduler.pending.size).toBe(0);
            expect(drivers(m.graph).filter(d => d.isRunning())).toHaveLength(0);
        }
    });

    it("stopAnimations, pauseAnimations and unmount end the sweeps and dispose the drivers", () => {
        const stopped = running(triangular);
        stopped.caps.stopAnimations?.();
        expect(stopped.scheduler.pending.size).toBe(0);
        const paused = running(tensor);
        act(() => paused.caps.pauseAnimations?.());
        expect(paused.scheduler.pending.size).toBe(0);
        expect(drivers(paused.graph).some(d => d.isPaused())).toBe(true);
        const m = running(tensor);
        const u = m.graph.state.u;
        m.rendered.unmount();
        expect(m.scheduler.pending.size).toBe(0);
        expect(drivers(m.graph)).toHaveLength(2);
        expect(drivers(m.graph).every(d => !d.isRunning() && !d.isPaused())).toBe(true);
        expect(m.graph.state.u).toBe(u);
    });

    it("rejects next-step and reset, and a sweep on a graph without it raises UnsupportedLessonActionError", () => {
        const {caps} = tensor();
        for (const command of ["next-step", "reset"]) expect(() => act(() => caps.apply(sweep("patch-u-sweep", command)))).toThrow(UnsupportedLessonActionError);
        const curve = mount(() => new DecasteljauGraph());
        expect(() => act(() => curve.caps.apply(sweep("patch-u-sweep", "play")))).toThrow(UnsupportedLessonActionError);
    });
});
