import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {chooseOnPuckNow, installBoardShims, puckOption, settle, waitForPucks} from "../base/realGraphTestHarness";
import {runAs} from "../base/writes/writeSource";
import {appStorage} from "../../storage/appStorage";
import {setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import {buildDeCasteljauConstruction} from "./TensorDeCasteljauScene";
import TensorDeCasteljauGraph, {DECASTELJAU_ORDER_KEY} from "./TensorDeCasteljauGraph";
import {PATCH_PARAMETER_KEYS} from "./TensorPatchGraph";
import type {DecasteljauOrder} from "./patchDto";
import {patchFromNet} from "./patchSceneBuilder";
import type {SceneMarker, ScenePolyline, SurfaceScene} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => { setLanguage("sl"); vi.restoreAllMocks(); });

/** Mounts the Demonstration and waits for the board's puck strip (u, v and the construction order are board pucks). */
async function mount() {
    const view = new FakeSurfaceView();
    const graph = new TensorDeCasteljauGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks(DECASTELJAU_ORDER_KEY);
    return {graph, view, rendered};
}

/** The order is a choice puck: its segments, the one it shows as chosen, and a learner's click on a segment. */
const orderSegments = () => [...document.querySelectorAll<HTMLElement>(`.puck-strip [data-puck-key="${DECASTELJAU_ORDER_KEY}"] [role="radio"]`)];
const shownOrder = () => orderSegments().find(segment => segment.getAttribute("aria-checked") === "true")?.dataset.value;
const chooseOrder = (order: DecasteljauOrder) => chooseOnPuckNow(DECASTELJAU_ORDER_KEY, order);
/** A parameter write as the learner makes it (outside a DOM handler, so tagged here). */
const setParameters = (graph: TensorDeCasteljauGraph, u: number, v: number) => act(() => runAs("learner", () => graph.setParameters(u, v)));
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
    it("starts as a bicubic at (0.35, 0.6) with the construction on, in rows order, and offers the three orders", async () => {
        const {graph, view} = await mount();
        expect(graph.state).toMatchObject({m: 3, n: 3, u: 0.35, v: 0.6, showDeCasteljau: true, decasteljauOrder: "rows"});
        expect(shownOrder()).toBe("rows");
        expect(orderSegments().map(segment => segment.dataset.value)).toEqual(["rows", "columns", "bilinear"]);
        expect(screen.queryByLabelText(t("patch_decasteljau_order"))).toBeNull();
        expectSceneFollows(graph, view);
        expect(view.last.polylines.some(line => line.role === "construction-2")).toBe(true);
    });
});

describe("construction order", () => {
    it.each(["columns", "bilinear", "rows"] as const)("choosing %s reaches the scene, and the evaluated marker stays the surface point", async order => {
        const {graph, view} = await mount();
        if (order === "rows") chooseOrder("columns");
        chooseOrder(order);
        expect(graph.state.decasteljauOrder).toBe(order);
        expect(shownOrder()).toBe(order);
        expectSceneFollows(graph, view);
        const point = patchFromNet(graph.state.net).eval(graph.state.u, graph.state.v);
        const evaluated = view.last.markers.find(m => m.role === "evaluated")!;
        expect(evaluated.xyz[0]).toBeCloseTo(point.X(), 12);
        expect(evaluated.xyz[1]).toBeCloseTo(point.Y(), 12);
        expect(evaluated.xyz[2]).toBeCloseTo(point.Z(), 12);
    });

    it("the three orders draw different intermediate stages", async () => {
        const {view} = await mount();
        const drawn = (["rows", "columns", "bilinear"] as const).map(order => { chooseOrder(order); return byId(constructionLines(view.last)).join("|"); });
        expect(new Set(drawn).size).toBe(3);
    });
});

describe("construction follows the state", () => {
    it("follows a net drag, a degree change, a u/v change and Reset", async () => {
        const {graph, view} = await mount();
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
        setParameters(graph, 0.8, 0.1);
        expect(view.last.revision).toBeGreaterThan(revision);
        expectSceneFollows(graph, view);
        expect(JSON.stringify(constructionMarkers(view.last))).not.toBe(atDegrees);
        act(() => { graph.parameters!.write(PATCH_PARAMETER_KEYS.u, 0.2, "learner"); });
        expect(graph.state.u).toBeCloseTo(0.2, 12);
        expectSceneFollows(graph, view);

        await settle(() => graph.reset());
        expect(graph.state).toMatchObject({m: 3, n: 3, u: 0.35, v: 0.6, showDeCasteljau: true, decasteljauOrder: "rows"});
        expect(shownOrder()).toBe("rows");
        expectSceneFollows(graph, view);
    });

    it("restores a saved Preset including the construction order", async () => {
        const {graph, view} = await mount();
        chooseOrder("bilinear");
        setParameters(graph, 0.9, 0.25);
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        chooseOrder("columns");
        setParameters(graph, 0.1, 0.1);
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state).toMatchObject({u: 0.9, v: 0.25, decasteljauOrder: "bilinear", showDeCasteljau: true});
        expect(shownOrder()).toBe("bilinear");
        expectSceneFollows(graph, view);
    });

    it("a Preset without the construction fields loads in rows order with the construction shown", async () => {
        const {graph, view} = await mount();
        chooseOrder("columns");
        act(() => graph.setShowDeCasteljau(false));
        const exported = JSON.parse(JSON.stringify(graph.exportPreset()));
        const dto = exported.data[0][1];
        delete dto.state.showDeCasteljau;
        delete dto.state.decasteljauOrder;
        act(() => graph.importPreset(exported));
        expect(graph.state).toMatchObject({showDeCasteljau: true, decasteljauOrder: "rows"});
        expect(shownOrder()).toBe("rows");
        expectSceneFollows(graph, view);
    });

    it("exports the order and the switch in the Preset", async () => {
        const {graph} = await mount();
        chooseOrder("bilinear");
        expect(graph.exportPresetData()).toMatchObject([["TensorProductBezierPatch", {state: {decasteljauOrder: "bilinear", showDeCasteljau: true}}]]);
    });
});

describe("starting patch", () => {
    it("keeps the order and the switch and writes the state once", async () => {
        const {graph, view} = await mount();
        chooseOrder("columns");
        fireEvent.click(screen.getByLabelText(t("de_casteljau_construction")));
        const setState = vi.spyOn(graph, "setState");
        fireEvent.change(screen.getByLabelText(t("patch_starting_heading")), {target: {value: screen.getByRole<HTMLOptionElement>("option", {name: t("preset_bilinear_saddle")}).value}});
        expect(setState).toHaveBeenCalledTimes(1);
        expect(graph.state).toMatchObject({showDeCasteljau: false, decasteljauOrder: "columns", m: 1, n: 1});
        expect(constructionLines(view.last)).toEqual([]);
    });
});

describe("construction switch", () => {
    it.each(["rows", "columns", "bilinear"] as const)("switching off in %s order leaves no construction polylines or markers, and on draws them again", async order => {
        const {graph, view} = await mount();
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
        setParameters(graph, 0.6, 0.3);
        expect(view.last.revision).toBe(hiddenRevision);
        expect(constructionLines(view.last)).toEqual([]);
        fireEvent.click(screen.getByLabelText(t("de_casteljau_construction")));
        expectSceneFollows(graph, view);
    });
});

describe("language", () => {
    it("a language switch relabels the order select and its help, keeping the order", async () => {
        const {graph} = await mount();
        chooseOrder("columns");
        expect(screen.getByText(t("patch_decasteljau_help_columns"))).toBeTruthy();
        const slLabel = t("patch_decasteljau_order");
        act(() => setLanguage("en"));
        expect(t("patch_decasteljau_order")).not.toBe(slLabel);
        expect(shownOrder()).toBe("columns");
        for (const label of [t("patch_decasteljau_order_rows"), t("patch_decasteljau_order_columns"), t("patch_decasteljau_order_bilinear")]) expect(puckOption(DECASTELJAU_ORDER_KEY, label), label).toBeTruthy();
        expect(screen.getByText(t("patch_decasteljau_help_columns"))).toBeTruthy();
        expect(screen.getByLabelText(t("de_casteljau_construction"))).toBeTruthy();
        expect(graph.state.decasteljauOrder).toBe("columns");
    });
});
