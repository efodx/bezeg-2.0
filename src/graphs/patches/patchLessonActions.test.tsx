import {act, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import {UnsupportedLessonActionError, type LessonAction, type LessonPatchFixture, type LessonPoint3} from "../../learning/model";
import {BARYCENTRIC_TOLERANCE, TriangularBezierPatch} from "../../bezeg/impl/patch/triangular-bezier-patch";
import {PointImpl} from "../../bezeg/impl/point/point-impl";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorPatchGraph from "./TensorPatchGraph";
import TensorDeCasteljauGraph from "./TensorDeCasteljauGraph";
import TensorDerivativesGraph from "./TensorDerivativesGraph";
import TensorSubdivisionGraph from "./TensorSubdivisionGraph";
import TriangularPatchGraph from "./TriangularPatchGraph";
import {patchFromNet} from "./patchSceneBuilder";
import {presetCamera} from "./surface-view/surfaceMath";
import type {Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);

const pt = (x: number, y: number, z: number): LessonPoint3 => ({x, y, z});
// Distinct, non-planar coordinates so a wrong elevation or evaluation cannot pass by symmetry.
const tensorFixture = (m: number, n: number): LessonPatchFixture =>
    ({kind: "tensor", m, n, net: Array.from({length: (m + 1) * (n + 1)}, (_, k) => { const i = Math.floor(k / (n + 1)), j = k % (n + 1); return pt(i, j, (i * 7 + j * 3) % 5 + 0.5 * i * j); })});
const triFixture = (n: number): LessonPatchFixture =>
    ({kind: "triangular", n, net: Array.from({length: (n + 1) * (n + 2) / 2}, (_, k) => pt(k, (k * k) % 7, (k * 3) % 5))});
const scene = (patch: LessonPatchFixture): LessonAction => ({kind: "prepared-scene", sceneId: "s", source: "lesson-patch-fixture", patch});
const rows = (fixture: LessonPatchFixture & {kind: "tensor"}): Xyz[][] =>
    Array.from({length: fixture.m + 1}, (_, i) => fixture.net.slice(i * (fixture.n + 1), (i + 1) * (fixture.n + 1)).map((p): Xyz => [p.x, p.y, p.z]));

function mount<G extends TensorPatchGraph | TriangularPatchGraph>(create: (view: FakeSurfaceView) => G) {
    const view = new FakeSurfaceView();
    const graph = create(view);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const caps = graph.getLessonCapabilities();
    return {
        graph, view,
        apply: (...actions: LessonAction[]) => act(() => actions.forEach(a => caps.apply(a))),
        rejects: (action: LessonAction, type: new (...a: any[]) => Error = Error) => {
            const state = graph.state, scenes = view.scenes.length;
            expect(() => act(() => caps.apply(action))).toThrow(type);
            expect(graph.state).toBe(state);
            expect(view.scenes.length).toBe(scenes);
        },
    };
}
const make = {
    tensor: () => mount(view => new TensorPatchGraph({viewFactory: () => view})),
    subdivision: () => mount(view => new TensorSubdivisionGraph({viewFactory: () => view})),
    derivatives: () => mount(view => new TensorDerivativesGraph({viewFactory: () => view})),
    decasteljau: () => mount(view => new TensorDeCasteljauGraph({viewFactory: () => view})),
    triangular: () => mount(view => new TriangularPatchGraph({viewFactory: () => view})),
};
const vis = (target: unknown, visible: unknown): LessonAction => ({kind: "patch-visibility", target, visible} as LessonAction);

describe("patch-evaluation", () => {
    it("sets u and v after a fixture in one tick, and the adapter shows the kernel point", () => {
        const {graph, view, apply} = make.tensor();
        apply(scene(tensorFixture(3, 2)), {kind: "patch-evaluation", u: 0.25, v: 0.75});
        expect([graph.state.u, graph.state.v]).toEqual([0.25, 0.75]);
        const expected = patchFromNet(graph.state.net).eval(0.25, 0.75);
        const marker = view.last.markers[0].xyz;
        expect(marker[0]).toBeCloseTo(expected.X(), 12);
        expect(marker[2]).toBeCloseTo(expected.Z!(), 12);
        apply({kind: "patch-evaluation", u: 0, v: 1});
        expect([graph.state.u, graph.state.v]).toEqual([0, 1]);
    });

    it("rejects non-finite, out-of-range, w on tensor, and wrong types without changing state", () => {
        const {rejects} = make.tensor();
        for (const [u, v] of [[NaN, 0.5], [0.5, Infinity], [-0.01, 0.5], [0.5, 1.01]]) rejects({kind: "patch-evaluation", u, v});
        rejects({kind: "patch-evaluation", u: 0.5, v: 0.5, w: 0});
        rejects({kind: "patch-evaluation", u: "0.5" as unknown as number, v: 0.5});
    });

    it("triangular accepts barycentric points with and without w, within tolerance", () => {
        const {graph, apply} = make.triangular();
        apply(scene(triFixture(3)), {kind: "patch-evaluation", u: 0.2, v: 0.3, w: 0.5});
        expect([graph.state.u, graph.state.v]).toEqual([0.2, 0.3]);
        apply({kind: "patch-evaluation", u: 0.6, v: 0.4});
        expect(graph.state.u).toBe(0.6);
        apply({kind: "patch-evaluation", u: 0.5, v: 0.5 + BARYCENTRIC_TOLERANCE / 2, w: 0});
        expect(graph.state.u).toBeCloseTo(0.5, 12);
    });

    it("triangular rejects sums off 1, negatives, outside the triangle and non-finite values", () => {
        const {rejects} = make.triangular();
        rejects({kind: "patch-evaluation", u: 0.2, v: 0.3, w: 0.6});
        rejects({kind: "patch-evaluation", u: 0.2, v: 0.3, w: 0.4});
        rejects({kind: "patch-evaluation", u: 0.5, v: 0.6});
        rejects({kind: "patch-evaluation", u: -0.1, v: 0.5, w: 0.6});
        rejects({kind: "patch-evaluation", u: 0.5, v: 0.5, w: NaN});
        rejects({kind: "patch-evaluation", u: 0.5, v: Infinity});
        rejects({kind: "patch-evaluation", u: 0.5, v: 0.5 + 1e-6});
    });
});

describe("patch-visibility", () => {
    it("toggles the switches each graph has", () => {
        const t = make.tensor();
        t.apply(vis("control-net", false), vis("iso-curves", false), vis("boundary-curves", false), vis("shading", false));
        expect([t.graph.state.showControlNet, t.graph.state.showIsoCurves, t.graph.state.showBoundaryCurves, t.graph.state.showShading]).toEqual([false, false, false, false]);
        const d = make.derivatives();
        d.apply(vis("tangent-plane", false), vis("normal", false), vis("twist", false));
        expect([d.graph.state.showTangentPlane, d.graph.state.showNormal, d.graph.state.showTwist]).toEqual([false, false, false]);
        d.apply(vis("twist", true));
        expect(d.graph.state.showTwist).toBe(true);
        const c = make.decasteljau();
        c.apply(vis("decasteljau-scheme", false));
        expect(c.graph.state.showDeCasteljau).toBe(false);
        const r = make.triangular();
        r.apply(vis("decasteljau-scheme", false), vis("control-net", false));
        expect([r.graph.state.showDeCasteljau, r.graph.state.showControlNet]).toEqual([false, false]);
    });

    it("rejects targets a graph does not have as unsupported, and a non-boolean visible", () => {
        const t = make.tensor();
        for (const target of ["decasteljau-scheme", "tangent-plane", "normal", "twist", "bogus"]) t.rejects(vis(target, false), UnsupportedLessonActionError);
        t.rejects(vis("control-net", "no"));
        make.decasteljau().rejects(vis("normal", true), UnsupportedLessonActionError);
        const r = make.triangular();
        for (const target of ["tangent-plane", "normal", "twist"]) r.rejects(vis(target, false), UnsupportedLessonActionError);
    });
});

describe("patch-elevate", () => {
    it("tensor elevation matches the degree elevation formula and keeps the surface", () => {
        const {graph, view, apply} = make.subdivision();
        const fixture = tensorFixture(2, 3) as LessonPatchFixture & {kind: "tensor"};
        apply(scene(fixture));
        const revision = view.last.revision;
        apply({kind: "patch-elevate", direction: "u"});
        const old = rows(fixture);
        expect([graph.state.m, graph.state.n]).toEqual([3, 3]);
        for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++) {
            const w = i / 3;
            graph.state.net[i][j].forEach((c, k) => {
                const expected = i === 0 ? old[0][j][k] : i === 3 ? old[2][j][k] : w * old[i - 1][j][k] + (1 - w) * old[i][j][k];
                expect(c).toBeCloseTo(expected, 12);
            });
        }
        expect(view.last.revision).toBeGreaterThan(revision);
        act(() => graph.setShowPieces(false));
        expect(view.last.points.map(p => p.xyz)).toEqual(graph.state.net.flat());
        const before = patchFromNet(old), after = patchFromNet(graph.state.net);
        for (const [u, v] of [[0.1, 0.9], [0.5, 0.5], [0.77, 0.2]]) expect(after.eval(u, v).Y()).toBeCloseTo(before.eval(u, v).Y(), 10);
        apply({kind: "patch-elevate", direction: "v"});
        expect([graph.state.m, graph.state.n]).toEqual([3, 4]);
        expect(graph.canElevateIn("v")).toBe(false);
    });

    it("tensor rejects a missing/wrong direction, degree 4, and unsupported graphs", () => {
        const s = make.subdivision();
        s.apply(scene(tensorFixture(4, 2)));
        s.rejects({kind: "patch-elevate", direction: "u"});
        s.rejects({kind: "patch-elevate"});
        s.rejects({kind: "patch-elevate", direction: "w" as unknown as "u"});
        make.tensor().rejects({kind: "patch-elevate", direction: "u"}, UnsupportedLessonActionError);
        make.derivatives().rejects({kind: "patch-elevate", direction: "u"}, UnsupportedLessonActionError);
    });

    it("triangular elevation equals the kernel elevation; degree 4 and a direction throw", () => {
        const {graph, rejects, apply} = make.triangular();
        const fixture = triFixture(2);
        apply(scene(fixture), {kind: "patch-elevate"}, {kind: "patch-elevate"});
        expect(graph.state.n).toBe(4);
        const kernel = new TriangularBezierPatch(fixture.net.map(p => new PointImpl(p.x, p.y, undefined, p.z))).elevate().elevate();
        expect(graph.state.net.length).toBe(15);
        kernel.getControlNet().forEach((p, k) => {
            expect(graph.state.net[k][0]).toBeCloseTo(p.X(), 12);
            expect(graph.state.net[k][2]).toBeCloseTo(p.Z!(), 12);
        });
        rejects({kind: "patch-elevate"});
        const g2 = make.triangular();
        g2.apply(scene(fixture));
        g2.rejects({kind: "patch-elevate", direction: "u"});
    });
});

describe("patch-subdivide", () => {
    it("tensor sets direction, value and shows pieces; correspondence follows", () => {
        const {graph, apply} = make.subdivision();
        apply(scene(tensorFixture(2, 2)), {kind: "patch-evaluation", u: 0.3, v: 0.6},
            {kind: "patch-subdivide", direction: "v", value: 0.4});
        expect([graph.state.subdivisionDirection, graph.state.subdivisionValue, graph.state.showPieces]).toEqual(["v", 0.4, true]);
        const c = graph.correspondence();
        expect(c.location.piece).toBe("right");
        expect(c.location.v).toBeCloseTo((0.6 - 0.4) / 0.6, 12);
        const surface = patchFromNet(graph.state.net).eval(0.3, 0.6);
        expect(c.point[0]).toBeCloseTo(surface.X(), 10);
        apply({kind: "patch-subdivide", direction: "u", value: 0.95});
        expect(graph.state.subdivisionValue).toBe(0.95);
    });

    it("tensor rejects out-of-range values, bad direction and a triangular payload", () => {
        const s = make.subdivision();
        s.apply(scene(tensorFixture(2, 2)));
        for (const value of [0.04, 0.96, NaN, 0, 1]) s.rejects({kind: "patch-subdivide", direction: "u", value});
        s.rejects({kind: "patch-subdivide", direction: "x" as unknown as "u", value: 0.5});
        s.rejects({kind: "patch-subdivide"});
        make.tensor().rejects({kind: "patch-subdivide", direction: "u", value: 0.5}, UnsupportedLessonActionError);
    });

    it("triangular `{}` turns the preview on at the current point and shows the split", () => {
        const {graph, view, apply} = make.triangular();
        apply(scene(triFixture(3)), {kind: "patch-evaluation", u: 0.2, v: 0.3, w: 0.5}, {kind: "patch-subdivide"});
        expect(view.last.polylines.some(l => l.id.startsWith("split-"))).toBe(true);
        expect([graph.state.u, graph.state.v]).toEqual([0.2, 0.3]);
        const state = graph.state;
        expect(() => act(() => graph.getLessonCapabilities().apply({kind: "patch-subdivide", direction: "u", value: 0.5}))).toThrow();
        expect(graph.state).toBe(state);
    });
});

describe("camera-preset", () => {
    it("sets the camera of every surface graph from CAMERA_PRESETS", () => {
        for (const m of [make.tensor(), make.subdivision(), make.triangular()]) {
            for (const view of ["front", "top", "side", "isometric"] as const) {
                const before = m.graph.state.camera;
                m.apply({kind: "camera-preset", view});
                expect(m.graph.state.camera).toEqual(presetCamera(view, before));
                expect(m.view.last.camera.az).toBe(m.graph.state.camera.az);
            }
        }
    });

    it("rejects unknown names", () => {
        const {rejects} = make.tensor();
        rejects({kind: "camera-preset", view: "back" as unknown as "front"});
        rejects({kind: "camera-preset", view: "toString" as unknown as "front"});
    });
});
