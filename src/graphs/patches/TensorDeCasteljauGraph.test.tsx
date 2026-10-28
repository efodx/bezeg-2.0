import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import {buildDeCasteljauConstruction} from "./TensorDeCasteljauScene";
import TensorDeCasteljauGraph from "./TensorDeCasteljauGraph";
import type {DecasteljauOrder} from "./patchDto";
import {patchFromNet} from "./patchSceneBuilder";
import type {SceneMarker, ScenePolyline, SurfaceScene} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => { setLanguage("sl"); vi.restoreAllMocks(); });

function mount() {
    const view = new FakeSurfaceView();
    const graph = new TensorDeCasteljauGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}

const orderSelect = () => screen.getByLabelText<HTMLSelectElement>(t("patch_decasteljau_order"));
const chooseOrder = (order: DecasteljauOrder) => fireEvent.change(orderSelect(), {target: {value: order}});
const isConstruction = (item: {id: string}) => item.id.startsWith("dc1-") || item.id.startsWith("dc2-");
const constructionLines = (scene: SurfaceScene) => scene.polylines.filter(isConstruction);
const constructionMarkers = (scene: SurfaceScene) => scene.markers.filter(isConstruction);
const byId = (items: ReadonlyArray<ScenePolyline | SceneMarker>) => items.map(item => `${item.id}:${item.role}`);

/** What the scene must hold for the graph's current state: the construction, derived independently of the graph. */
function expectedConstruction(graph: TensorDeCasteljauGraph) {
    const {net, u, v, decasteljauOrder} = graph.state;
    return buildDeCasteljauConstruction(patchFromNet(net), u, v, decasteljauOrder ?? "rows");
}
function expectSceneFollows(graph: TensorDeCasteljauGraph, view: FakeSurfaceView) {
    const expected = expectedConstruction(graph);
    const scene = view.last;
    expect(expected.markers.length).toBeGreaterThan(0);
    expect(constructionLines(scene)).toEqual(expected.polylines);
    expect(constructionMarkers(scene)).toEqual(expected.markers);
}

describe("starting scene", () => {
    it("starts as a bicubic at (0.35, 0.6) with the construction on, in rows order, and offers the three orders", () => {
        const {graph, view} = mount();
        expect(graph.state).toMatchObject({m: 3, n: 3, u: 0.35, v: 0.6, showDeCasteljau: true, decasteljauOrder: "rows"});
        expect(orderSelect().value).toBe("rows");
        expect([...orderSelect().options].map(o => o.value)).toEqual(["rows", "columns", "bilinear"]);
        expectSceneFollows(graph, view);
        expect(view.last.polylines.some(line => line.role === "construction-2")).toBe(true);
    });
});

describe("construction order", () => {
    it.each(["columns", "bilinear", "rows"] as const)("choosing %s reaches the scene, and the evaluated marker stays the surface point", order => {
        const {graph, view} = mount();
        if (order === "rows") chooseOrder("columns");
        chooseOrder(order);
        expect(graph.state.decasteljauOrder).toBe(order);
        expect(orderSelect().value).toBe(order);
        expectSceneFollows(graph, view);
        const point = patchFromNet(graph.state.net).eval(graph.state.u, graph.state.v);
        const evaluated = view.last.markers.find(m => m.role === "evaluated")!;
        expect(evaluated.xyz[0]).toBeCloseTo(point.X(), 12);
        expect(evaluated.xyz[1]).toBeCloseTo(point.Y(), 12);
        expect(evaluated.xyz[2]).toBeCloseTo(point.Z(), 12);
    });

    it("the three orders draw different intermediate stages", () => {
        const {view} = mount();
        const drawn = (["rows", "columns", "bilinear"] as const).map(order => { chooseOrder(order); return byId(constructionLines(view.last)).join("|"); });
        expect(new Set(drawn).size).toBe(3);
    });
});

describe("construction follows the state", () => {
    it("follows a net drag, a degree change, a u/v change and Reset", async () => {
        const {graph, view} = mount();
        chooseOrder("columns");
        const before = JSON.stringify(constructionMarkers(view.last));
        view.emit({kind: "point", pointId: "p-1-1", xyz: [0.75, 0.5, 4], phase: "move"});
        expectSceneFollows(graph, view);
        expect(JSON.stringify(constructionMarkers(view.last))).not.toBe(before);

        act(() => graph.setDegree("u", 1));
        expectSceneFollows(graph, view);
        act(() => graph.setDegree("v", 4));
        expectSceneFollows(graph, view);

        const atDegrees = JSON.stringify(constructionMarkers(view.last));
        // The real view redraws polylines only on a new revision, so a (u, v) change must bump it while the construction is drawn.
        const revision = view.last.revision;
        act(() => graph.setParameters(0.8, 0.1));
        expect(view.last.revision).toBeGreaterThan(revision);
        expectSceneFollows(graph, view);
        expect(JSON.stringify(constructionMarkers(view.last))).not.toBe(atDegrees);
        fireEvent.change(screen.getByLabelText<HTMLInputElement>(t("patch_parameter_u")), {target: {value: "0.2"}});
        expect(graph.state.u).toBeCloseTo(0.2, 12);
        expectSceneFollows(graph, view);

        await settle(() => graph.reset());
        expect(graph.state).toMatchObject({m: 3, n: 3, u: 0.35, v: 0.6, showDeCasteljau: true, decasteljauOrder: "rows"});
        expect(orderSelect().value).toBe("rows");
        expectSceneFollows(graph, view);
    });

    it("restores a saved Preset including the construction order", async () => {
        const {graph, view} = mount();
        chooseOrder("bilinear");
        act(() => graph.setParameters(0.9, 0.25));
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        chooseOrder("columns");
        act(() => graph.setParameters(0.1, 0.1));
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state).toMatchObject({u: 0.9, v: 0.25, decasteljauOrder: "bilinear", showDeCasteljau: true});
        expect(orderSelect().value).toBe("bilinear");
        expectSceneFollows(graph, view);
    });

    it("a Preset without the construction fields loads in rows order with the construction shown", () => {
        const {graph, view} = mount();
        chooseOrder("columns");
        act(() => graph.setShowDeCasteljau(false));
        const exported = JSON.parse(JSON.stringify(graph.exportPreset()));
        const dto = exported.data[0][1];
        delete dto.state.showDeCasteljau;
        delete dto.state.decasteljauOrder;
        act(() => graph.importPreset(exported));
        expect(graph.state).toMatchObject({showDeCasteljau: true, decasteljauOrder: "rows"});
        expect(orderSelect().value).toBe("rows");
        expectSceneFollows(graph, view);
    });

    it("exports the order and the switch in the Preset", () => {
        const {graph} = mount();
        chooseOrder("bilinear");
        expect(graph.exportPresetData()).toMatchObject([["TensorProductBezierPatch", {state: {decasteljauOrder: "bilinear", showDeCasteljau: true}}]]);
    });
});

describe("construction switch", () => {
    it.each(["rows", "columns", "bilinear"] as const)("switching off in %s order leaves no construction polylines or markers, and on draws them again", order => {
        const {graph, view} = mount();
        chooseOrder(order);
        expect(constructionLines(view.last).length).toBeGreaterThan(0);
        fireEvent.click(screen.getByLabelText(t("de_casteljau_construction")));
        expect(graph.state.showDeCasteljau).toBe(false);
        expect(constructionLines(view.last)).toEqual([]);
        expect(constructionMarkers(view.last)).toEqual([]);
        expect(view.last.polylines.some(line => line.role === "construction" || line.role === "construction-2")).toBe(false);
        expect(view.last.markers.some(m => m.role === "construction" || m.role === "construction-2")).toBe(false);
        expect(view.last.markers.some(m => m.role === "evaluated")).toBe(true);

        // While hidden a parameter change must not bring it back, and showing it again draws the current one.
        const hiddenRevision = view.last.revision;
        act(() => graph.setParameters(0.6, 0.3));
        expect(view.last.revision).toBe(hiddenRevision);
        expect(constructionLines(view.last)).toEqual([]);
        fireEvent.click(screen.getByLabelText(t("de_casteljau_construction")));
        expectSceneFollows(graph, view);
    });
});

describe("language", () => {
    it("a language switch relabels the order select and its help, keeping the order", () => {
        const {graph} = mount();
        chooseOrder("columns");
        expect(screen.getByText(t("patch_decasteljau_help_columns"))).toBeTruthy();
        const slLabel = t("patch_decasteljau_order");
        act(() => setLanguage("en"));
        expect(t("patch_decasteljau_order")).not.toBe(slLabel);
        expect(orderSelect().value).toBe("columns");
        expect([...orderSelect().options].map(o => o.textContent)).toEqual([t("patch_decasteljau_order_rows"), t("patch_decasteljau_order_columns"), t("patch_decasteljau_order_bilinear")]);
        expect(screen.getByText(t("patch_decasteljau_help_columns"))).toBeTruthy();
        expect(screen.getByLabelText(t("de_casteljau_construction"))).toBeTruthy();
        expect(graph.state.decasteljauOrder).toBe("columns");
    });
});
