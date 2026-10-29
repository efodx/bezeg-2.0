import {act, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../../graphs/base/GraphHost";
import {installBoardShims} from "../../graphs/base/realGraphTestHarness";
import {FakeSurfaceView, cameraSignature, sceneSignature} from "../../graphs/patches/FakeSurfaceView";
import TensorSubdivisionGraph from "../../graphs/patches/TensorSubdivisionGraph";
import type {LessonPatchFixture, LessonPoint3} from "../model";
import type {LessonScene, SceneAction} from "../content/guidedLessons";
import {patchFixture, sceneAction, sceneActions} from "./lessonCatalog";

beforeAll(installBoardShims);

const pt = (x: number, y: number, z: number): LessonPoint3 => ({x, y, z});
const tensorNet = (m: number, n: number): LessonPoint3[] =>
    Array.from({length: (m + 1) * (n + 1)}, (_, k) => { const i = Math.floor(k / (n + 1)), j = k % (n + 1); return pt(i, j, (i * 7 + j * 3) % 5 + 0.5 * i * j); });
const tensorFixture = (m: number, n: number): LessonPatchFixture => ({kind: "tensor", m, n, net: tensorNet(m, n)});
const act1 = (name: SceneAction["name"], value: SceneAction["value"]) => sceneAction({name, value} as SceneAction);

describe("content patch scene actions map to the exact lesson actions", () => {
    it.each([
        ["show-patch-point", {u: 0.25, v: 0.5}, {kind: "patch-evaluation", u: 0.25, v: 0.5}],
        ["show-patch-point", {u: 0.2, v: 0.3, w: 0.5}, {kind: "patch-evaluation", u: 0.2, v: 0.3, w: 0.5}],
        ["show-patch-element", {name: "twist", value: true}, {kind: "patch-visibility", target: "twist", visible: true}],
        ["show-patch-element", {name: "control-net", value: false}, {kind: "patch-visibility", target: "control-net", visible: false}],
        ["subdivide-patch", {direction: "v", value: 0.4}, {kind: "patch-subdivide", direction: "v", value: 0.4}],
        ["subdivide-patch", {}, {kind: "patch-subdivide"}],
        ["elevate-patch", {direction: "u"}, {kind: "patch-elevate", direction: "u"}],
        ["elevate-patch", {}, {kind: "patch-elevate"}],
        ["set-camera-preset", "isometric", {kind: "camera-preset", view: "isometric"}],
        ["run-patch-u-sweep", "play", {kind: "animation", animationId: "patch-u-sweep", command: "play"}],
        ["run-patch-v-sweep", "stop", {kind: "animation", animationId: "patch-v-sweep", command: "stop"}],
    ] as const)("%s %j", (name, value, expected) => {
        expect(act1(name, value as SceneAction["value"])).toEqual(expected);
    });

    it("maps a patch fixture scene to a prepared scene with its camera", () => {
        const scene: LessonScene = {id: "p", basedOn: "lesson-patch-fixture", patch: tensorFixture(2, 1), view3d: {az: 0.5, el: 0.4, distance: 6},
            actions: [{name: "show-patch-point", value: {u: 0, v: 1}}], expectedState: {sl: "", en: ""}};
        expect(sceneActions(scene)).toEqual([
            {kind: "prepared-scene", sceneId: "p", source: "lesson-patch-fixture", patch: tensorFixture(2, 1), view3d: {az: 0.5, el: 0.4, distance: 6}},
            {kind: "patch-evaluation", u: 0, v: 1},
        ]);
        expect(sceneActions({...scene, view3d: undefined})[0]).not.toHaveProperty("view3d");
    });
});

describe("malformed patch content is rejected", () => {
    it.each([
        ["show-patch-point", {u: 0.5}],
        ["show-patch-point", {u: NaN, v: 0}],
        ["show-patch-point", {u: 0, v: 0, z: 1}],
        ["show-patch-point", 0.5],
        ["show-patch-element", {name: "wireframe", value: true}],
        ["show-patch-element", {name: "twist", value: "yes"}],
        ["subdivide-patch", {direction: "w", value: 0.5}],
        ["subdivide-patch", {direction: "u"}],
        ["subdivide-patch", {value: 0.5}],
        ["elevate-patch", {direction: "x"}],
        ["elevate-patch", true],
        ["set-camera-preset", "back"],
        ["set-camera-preset", 1],
        ["run-patch-u-sweep", "next-step"],
        ["run-patch-v-sweep", true],
    ])("%s %j", (name, value) => {
        expect(() => act1(name as SceneAction["name"], value as SceneAction["value"])).toThrow();
    });

    it("rejects malformed fixtures", () => {
        expect(() => patchFixture({kind: "tensor", m: 2, n: 2, net: tensorNet(2, 2).slice(1)})).toThrow(/9 control points/);
        expect(() => patchFixture({kind: "tensor", m: 5, n: 1, net: tensorNet(5, 1)})).toThrow(/1 to 4/);
        expect(() => patchFixture({kind: "triangular", n: 2, net: tensorNet(1, 1)})).toThrow(/6 control points/);
        expect(() => patchFixture({kind: "tensor", m: 1, n: 1, net: [pt(0, 0, 0), pt(0, 1, 0), pt(1, 0, 0), {x: 1, y: 1, z: Infinity}]})).toThrow(/finite/);
        expect(() => patchFixture({kind: "cylinder"} as unknown as LessonPatchFixture)).toThrow();
        expect(() => sceneActions({id: "p", basedOn: "lesson-patch-fixture", patch: tensorFixture(1, 1), view3d: {az: 0, el: 0, distance: 0}, actions: [], expectedState: {sl: "", en: ""}})).toThrow(/distance/);
    });
});

describe("a synthetic content scene runs against a real patch graph", () => {
    it("evaluates, elevates, checkpoints and restores in one synchronous sequence", () => {
        const view = new FakeSurfaceView();
        const graph = new TensorSubdivisionGraph({viewFactory: () => view});
        render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        const caps = graph.getLessonCapabilities();
        const scene: LessonScene = {
            id: "synthetic", basedOn: "lesson-patch-fixture", patch: tensorFixture(2, 2), view3d: {az: 0.6, el: 0.5, distance: 7},
            actions: [
                {name: "show-patch-point", value: {u: 0.25, v: 0.75}},
                {name: "elevate-patch", value: {direction: "u"}},
                {name: "show-patch-element", value: {name: "iso-curves", value: false}},
            ],
            expectedState: {sl: "", en: ""},
        };
        act(() => sceneActions(scene).forEach(a => caps.apply(a)));
        expect([graph.state.m, graph.state.n]).toEqual([3, 2]);
        expect([graph.state.u, graph.state.v]).toEqual([0.25, 0.75]);
        expect(graph.state.showIsoCurves).toBe(false);
        const checkpoint = caps.captureState();
        const state = graph.state, signature = sceneSignature(view.last), camera = cameraSignature(view.last);
        act(() => {
            sceneActions({...scene, actions: [{name: "set-camera-preset", value: "top"}, {name: "show-patch-point", value: {u: 1, v: 0}}]}).forEach(a => caps.apply(a));
            caps.restoreState(checkpoint);
        });
        expect(graph.state).toEqual(state);
        expect(sceneSignature(view.last)).toEqual(signature);
        expect(cameraSignature(view.last)).toEqual(camera);
    });
});
