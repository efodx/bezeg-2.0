/**
 * The `patch-joins` panels: the mode select updates the join report, the ratio is usable only in G1, patch `B`'s derived
 * points cannot be moved (not even from the numeric editor), the degree controls and the shared-degree note, the wording of
 * the report (C1 is equal derivatives, G1 only agreeing tangent planes), the Preset collection's DTO rules, and Reset,
 * Preset restore and a language switch.
 */
import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {renderMessage, setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorJoinGraph from "./TensorJoinGraph";
import {JoinReportPanel, joinReportCase} from "./TensorJoinPanels";
import {joinStartingScenes, patchPresetCollections} from "./patchPresetCollections";
import {classifyJoin} from "./tensorJoins";
import type {Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => { setLanguage("sl"); vi.restoreAllMocks(); });

function mount() {
    const view = new FakeSurfaceView();
    const graph = new TensorJoinGraph({viewFactory: () => view});
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

const modeSelect = () => screen.getByLabelText<HTMLSelectElement>(t("patch_join_mode"));
const alphaSlider = () => screen.getByLabelText<HTMLInputElement>(t("patch_join_alpha"));
const alphaField = () => screen.getByRole<HTMLInputElement>("spinbutton", {name: t("number_field_label", {value0: t("patch_join_alpha")})});
const state = () => document.querySelector('[data-readout="state"] dd')!.textContent;
const note = () => document.querySelector('[role="note"]')!.textContent!;
/** The paragraph the alpha slider points at with aria-describedby (its help, which carries the reason while disabled). */
const alphaDescription = () => alphaSlider().getAttribute("aria-describedby")!.split(" ")
    .map(id => document.getElementById(id)!.textContent!).join(" ");
const degreeU = () => screen.getByLabelText<HTMLSelectElement>(t("patch_join_b_degree_u"));
const degreeV = () => screen.getByLabelText<HTMLSelectElement>(t("patch_join_b_degree_v"));
const rowSelect = () => screen.getByLabelText<HTMLSelectElement>(t("patch_join_b_index_i"));
const columnSelect = () => screen.getByLabelText<HTMLSelectElement>(t("patch_join_b_index_j"));
const derivedNote = () => document.querySelector(".patch-join-derived-note");
const bEditor = () => document.querySelector(".patch-join-b-point .patch-point-editor");
const sceneButton = (id: string) => document.querySelector<HTMLButtonElement>(`[data-join-scene="${id}"]`)!;
const degreeGroup = () => document.querySelector(".patch-join-degree")!.textContent!;

describe("mode select and the report", () => {
    it("starts C1 and the report says so", () => {
        const {graph} = mount();
        expect(modeSelect().value).toBe("c1");
        expect(state()).toBe(t("patch_join_state_c1"));
        expect(graph.joinReport()).toMatchObject({c0: true, c1: true});
    });

    it("switching the mode rederives B and updates the report text", () => {
        const {graph} = mount();
        const c1Text = note();
        fireEvent.change(modeSelect(), {target: {value: "g1"}});
        expect(graph.state.joinContinuity).toBe("g1");
        expect(state()).toBe(t("patch_join_state_g1"));
        expect(note()).toBe(t("patch_join_report_g1", {value0: "2"}));
        expect(note()).not.toBe(c1Text);
        fireEvent.change(alphaSlider(), {target: {value: "1"}});
        expect(state()).toBe(t("patch_join_state_c1"));
        fireEvent.change(modeSelect(), {target: {value: "c0"}});
        act(() => { graph.selectBIndex(1, 1); graph.setSelectedCoordinates([4.5, 0.2, 3]); });
        expect(state()).toBe(t("patch_join_state_c0"));
        expect(note()).toBe(t("patch_join_report_c0"));
    });

    it("none with a gap says the patches do not join and names the gap", () => {
        const {graph} = mount();
        fireEvent.change(modeSelect(), {target: {value: "none"}});
        act(() => { graph.selectBIndex(0, 0); graph.setSelectedCoordinates([3.5, -1.5, 1]); });
        const gap = graph.joinReport().positionGap;
        expect(gap).toBeGreaterThan(0.1);
        expect(state()).toBe(t("patch_join_state_none"));
        expect(note()).toBe(t("patch_join_report_no_c0", {value0: document.querySelector('[data-readout="position-gap"] dd')!.textContent!}));
    });
});

describe("the ratio alpha", () => {
    it("is disabled outside G1 with the reason, and enabled in G1 without it", () => {
        const {graph} = mount();
        for (const mode of ["none", "c0", "c1"] as const) {
            fireEvent.change(modeSelect(), {target: {value: mode}});
            expect(alphaSlider().disabled).toBe(true);
            expect(alphaField().disabled).toBe(true);
            expect(alphaDescription()).toContain(t("patch_join_alpha_disabled"));
        }
        fireEvent.change(modeSelect(), {target: {value: "g1"}});
        expect(alphaSlider().disabled).toBe(false);
        expect(alphaField().disabled).toBe(false);
        expect(alphaDescription()).not.toContain(t("patch_join_alpha_disabled"));
        expect(alphaDescription()).toContain(t("patch_join_alpha_help"));
        fireEvent.change(alphaField(), {target: {value: "1,5"}});
        expect(graph.state.joinAlpha).toBeCloseTo(1.5, 12);
        expect(alphaSlider().min).toBe("0.25");
        expect(alphaSlider().max).toBe("4");
    });
});

describe("patch B", () => {
    it("derived rows have no numeric editor and cannot be moved; the note explains them", () => {
        const {graph} = mount();
        expect(rowSelect().options[0].text).toBe(t("patch_no_selection"));
        expect(rowSelect().options[1].text).toBe(t("patch_join_b_option_derived", {value0: "0"}));
        expect(rowSelect().options[2].text).toBe(t("patch_join_b_option_derived", {value0: "1"}));
        expect(rowSelect().options[3].text).toBe("2");
        const before = graph.state.netB;
        fireEvent.change(rowSelect(), {target: {value: "1"}});
        fireEvent.change(columnSelect(), {target: {value: "2"}});
        expect(graph.selectedBIndex()).toBeUndefined();
        expect(bEditor()).toBeNull();
        expect(derivedNote()!.textContent).toBe(t("patch_join_b_derived_note", {value0: "Q₁₂"}));
        act(() => graph.setSelectedCoordinates([9, 9, 9]));
        expect(graph.state.netB).toBe(before);
        expect(graph.bNet()[1][2]).not.toEqual([9, 9, 9]);
    });

    it("a free row gets an editor that moves it; in C0 row 1 is free, in none row 0 is too", () => {
        const {graph} = mount();
        fireEvent.change(rowSelect(), {target: {value: "2"}});
        fireEvent.change(columnSelect(), {target: {value: "1"}});
        expect(graph.selectedBIndex()).toEqual([2, 1]);
        expect(bEditor()).not.toBeNull();
        expect(derivedNote()).toBeNull();
        fireEvent.change(screen.getByLabelText("Q₂₁ x"), {target: {value: "7"}});
        fireEvent.click(screen.getAllByRole("button", {name: t("apply_coordinates")}).at(-1)!);
        expect(graph.bNet()[2][1][0]).toBe(7);
        fireEvent.change(modeSelect(), {target: {value: "c0"}});
        fireEvent.change(rowSelect(), {target: {value: "1"}});
        expect(graph.selectedBIndex()).toEqual([1, 1]);
        expect(derivedNote()).toBeNull();
        fireEvent.change(modeSelect(), {target: {value: "none"}});
        fireEvent.change(rowSelect(), {target: {value: "0"}});
        expect(graph.selectedBIndex()).toEqual([0, 1]);
    });

    it("the derived explanation goes away when an A point is chosen", () => {
        const {graph} = mount();
        fireEvent.change(rowSelect(), {target: {value: "0"}});
        fireEvent.change(columnSelect(), {target: {value: "0"}});
        expect(derivedNote()).not.toBeNull();
        act(() => graph.selectIndex(1, 1));
        expect(derivedNote()).toBeNull();
        // Leaving the A selection again must not bring the old explanation back.
        act(() => graph.selectIndex(undefined, undefined));
        expect(derivedNote()).toBeNull();
    });

    it("degree controls: u is B's own, v is shared with A outside none and the group says so", () => {
        const {graph} = mount();
        fireEvent.change(degreeU(), {target: {value: "2"}});
        expect(graph.state).toMatchObject({m: 3, mB: 2, n: 3, nB: 3});
        expect(degreeU().value).toBe("2");
        fireEvent.change(degreeV(), {target: {value: "2"}});
        expect(graph.state).toMatchObject({n: 2, nB: 2});
        expect(degreeGroup()).toContain(t("patch_join_b_degree_shared"));
        fireEvent.change(modeSelect(), {target: {value: "none"}});
        expect(degreeGroup()).toContain(t("patch_join_b_degree_free"));
        expect(degreeGroup()).not.toContain(t("patch_join_b_degree_shared"));
        fireEvent.change(degreeV(), {target: {value: "4"}});
        expect(graph.state).toMatchObject({n: 2, nB: 4});
    });
});

describe("report wording", () => {
    it("states the case of the three starting scenes honestly", () => {
        const {graph} = mount();
        expect(joinReportCase(graph.joinReport())).toBe("c1");
        fireEvent.click(sceneButton("join-g1"));
        expect(graph.state).toMatchObject({joinContinuity: "g1", joinAlpha: 2});
        expect(graph.joinReport()).toMatchObject({c0: true, c1: false, g1: true});
        expect(joinReportCase(graph.joinReport())).toBe("g1");
        expect(state()).toBe(t("patch_join_state_g1"));
        fireEvent.click(sceneButton("join-c0-kink"));
        expect(graph.state.joinContinuity).toBe("c0");
        expect(graph.joinReport()).toMatchObject({c0: true, c1: false, g1: false});
        expect(joinReportCase(graph.joinReport())).toBe("c0");
        expect(state()).toBe(t("patch_join_state_c0"));
        expect(note()).toBe(t("patch_join_report_c0"));
        fireEvent.click(sceneButton("join-c1"));
        expect(graph.joinReport()).toMatchObject({c0: true, c1: true});
        expect(joinReportCase(graph.joinReport())).toBe("c1");
        expect(state()).toBe(t("patch_join_state_c1"));
    });

    it("the G1 text says the tangent planes agree and the derivatives differ by alpha, never that they match", () => {
        mount();
        fireEvent.click(sceneButton("join-g1"));
        const sl = note();
        expect(sl).toContain("tangentni ravnini ob robu sovpadata");
        expect(sl).toContain("odvoda S_u pa nista enaka");
        expect(sl).toMatch(/faktor\s+α\* = 2/);
        expect(sl).not.toMatch(/\bsta enaka/);
        act(() => setLanguage("en"));
        const en = note();
        expect(en).toContain("the tangent planes coincide along the boundary");
        expect(en).toContain("the derivatives S_u are not equal");
        expect(en).toContain("factor α* = 2");
        expect(en).not.toContain("are equal");
        expect(state()).toBe("G1, not C1");
    });

    it("the C1 text says the derivatives are equal, the C0-only text that it is neither C1 nor G1", () => {
        mount();
        expect(note()).toMatch(/\bsta enaka/);
        fireEvent.click(sceneButton("join-c0-kink"));
        expect(note()).toContain("ni C1 in ni G1");
        expect(note()).not.toContain("tangentni ravnini ob robu sovpadata");
        act(() => setLanguage("en"));
        expect(note()).toContain("neither C1 nor G1");
    });

    it("equal tangent planes without a constant ratio is its own case, and never says the derivatives match", () => {
        // Flat sheet z = 0, boundary along y: S_u is parallel to x everywhere, but B's length varies along the boundary.
        const a: Xyz[][] = [[[-1, 0, 0], [-1, 1, 0], [-1, 2, 0]], [[0, 0, 0], [0, 1, 0], [0, 2, 0]]];
        const bNet: Xyz[][] = [[[0, 0, 0], [0, 1, 0], [0, 2, 0]], [[1, 0, 0], [2, 1, 0], [3, 2, 0]]];
        const report = classifyJoin(a, bNet);
        expect(report).toMatchObject({c0: true, c1: false, g1: false});
        expect(report.maxNormalAngle!).toBeLessThan(1e-6);
        expect(joinReportCase(report)).toBe("c0-planes");
        const rendered = render(<JoinReportPanel report={report}/>);
        expect(rendered.container.querySelector('[data-readout="state"] dd')!.textContent).toBe(t("patch_join_state_c0_planes"));
        const text = rendered.container.querySelector('[role="note"]')!.textContent!;
        expect(text).toBe(t("patch_join_report_c0_planes"));
        expect(text).toContain("tangentni ravnini");
        expect(text).toContain("ni C1 in ni G1 s stalnim razmerjem");
        expect(text).not.toContain("ostri rob.");
        act(() => setLanguage("en"));
        expect(rendered.container.querySelector('[role="note"]')!.textContent).toContain("neither C1 nor G1 with a constant ratio");
    });

    it("the C1 and G1 texts only claim tangent planes where they are defined", () => {
        for (const language of ["sl", "en"] as const) {
            setLanguage(language);
            for (const key of ["patch_join_report_c1", "patch_join_report_g1"] as const)
                expect(t(key, {value0: "1"})).toMatch(language === "sl" ? /kjer sta določeni/ : /wherever they are defined/);
        }
    });

    it("both derivatives zero has its own message: C1 formally, tangent plane not determined", () => {
        const sheet = (...xs: number[]): Xyz[][] => xs.map(x => [[x, 0, 0], [x, 1, 0]]);
        const a = sheet(0, 1, 1);
        const b = sheet(1, 1, 2);
        const report = classifyJoin(a, b);
        expect(report).toMatchObject({c0: true, derivativesVanish: true});
        expect(joinReportCase(report)).toBe("vanish");
        const rendered = render(<JoinReportPanel report={report}/>);
        expect(rendered.container.querySelector('[data-readout="state"] dd')!.textContent).toBe(t("patch_join_state_vanish"));
        const text = rendered.container.querySelector('[role="note"]')!.textContent!;
        expect(text).toBe(t("patch_join_report_vanish"));
        expect(text).toContain("ni določena z odvodom");
        expect(text).toContain("ne moremo sklepati");
    });

    it("boundaries that do not meet are reported as no C0", () => {
        const sheet = (...xs: number[]): Xyz[][] => xs.map(x => [[x, 0, 0], [x, 1, 0]]);
        const report = classifyJoin(sheet(0, 1), sheet(3, 4));
        expect(joinReportCase(report)).toBe("no-c0");
    });
});

describe("Reset, Preset restore and language", () => {
    it("Reset restores the default C1 scene", async () => {
        const {graph} = mount();
        fireEvent.click(sceneButton("join-g1"));
        act(() => { graph.setJoinV(0.8); graph.setBDegree("u", 2); });
        await settle(() => graph.reset());
        expect(graph.state).toMatchObject({joinContinuity: "c1", joinAlpha: 2, joinV: 0.5, m: 3, n: 3, mB: 3, nB: 3});
        expect(modeSelect().value).toBe("c1");
        expect(alphaSlider().disabled).toBe(true);
        expect(degreeU().value).toBe("3");
        expect(state()).toBe(t("patch_join_state_c1"));
    });

    it("a saved Preset restores mode, ratio, joinV and B", async () => {
        const {graph} = mount();
        fireEvent.click(sceneButton("join-g1"));
        act(() => { graph.setJoinAlpha(1.5); graph.setJoinV(0.2); graph.setBDegree("u", 2); });
        const saved = {net: graph.state.net, netB: graph.bNet()};
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        fireEvent.click(sceneButton("join-c0-kink"));
        expect(state()).toBe(t("patch_join_state_c0"));
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state).toMatchObject({joinContinuity: "g1", joinAlpha: 1.5, joinV: 0.2, mB: 2});
        expect(graph.state.net).toEqual(saved.net);
        expect(graph.bNet()).toEqual(saved.netB);
        expect(modeSelect().value).toBe("g1");
        expect(alphaField().value).toBe("1,5");
        expect(degreeU().value).toBe("2");
        expect(state()).toBe(t("patch_join_state_g1"));
    });

    it("a language switch relabels the controls and the report and keeps the state", () => {
        const {graph} = mount();
        fireEvent.click(sceneButton("join-g1"));
        const heading = t("patch_join_report_heading");
        act(() => setLanguage("en"));
        expect(t("patch_join_report_heading")).not.toBe(heading);
        expect(screen.getByText(t("patch_join_report_heading"))).toBeTruthy();
        expect(screen.getByText(t("patch_join_heading"))).toBeTruthy();
        expect(state()).toBe("G1, not C1");
        expect(note()).toBe(t("patch_join_report_g1", {value0: "2"}));
        expect(alphaDescription()).not.toContain(t("patch_join_alpha_disabled"));
        expect(modeSelect().value).toBe("g1");
        expect(graph.state.joinAlpha).toBe(2);
        act(() => setLanguage("sl"));
        expect(state()).toBe("G1, ne C1");
    });
});

describe("patch-joins Preset collection", () => {
    const collection = patchPresetCollections["patch-joins"];
    const points = (count: number) => Array.from({length: count}, (_, k): [number, number, number] => [k, 0, 0]);
    const dto = (state: Record<string, unknown>) => [["TensorProductBezierPatch", {m: 1, n: 1, net: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]], state}]];
    const rejected = (state: Record<string, unknown>) => {
        const checked = collection.check(dto(state));
        return "rejection" in checked ? checked.rejection : undefined;
    };

    it("is keyed patch-joins, takes the graph's own export and offers the three starting scenes", () => {
        expect(collection.key).toBe("patch-joins");
        expect(joinStartingScenes.map(scene => scene.id)).toEqual(["join-c1", "join-g1", "join-c0-kink"]);
        const {graph} = mount();
        fireEvent.click(sceneButton("join-g1"));
        const data = JSON.parse(JSON.stringify(graph.exportPresetData()));
        expect(data[0][1].state).toMatchObject({joinContinuity: "g1", joinAlpha: 2, mB: 3, nB: 3});
        expect(data[0][1].state.netB).toHaveLength(16);
        expect("data" in collection.check(data)).toBe(true);
        expect(graph.presetCollection()).toBe(collection);
    });

    it("accepts the whole ranges including their ends, a complete B, and a Preset without join fields", () => {
        for (const joinContinuity of ["none", "c0", "c1", "g1"]) expect(rejected({joinContinuity})).toBeUndefined();
        for (const joinAlpha of [0.25, 1, 4]) expect(rejected({joinAlpha})).toBeUndefined();
        for (const joinV of [0, 0.5, 1]) expect(rejected({joinV})).toBeUndefined();
        expect(rejected({mB: 1, nB: 2, netB: points(6)})).toBeUndefined();
        expect(rejected({})).toBeUndefined();
        expect("data" in collection.check(dto({}))).toBe(true);
    });

    it("loads an older tensor Preset without join fields as the default join of a continuation", () => {
        const {graph} = mount();
        const old = JSON.parse(JSON.stringify(graph.exportPresetData()));
        for (const key of ["joinContinuity", "joinAlpha", "joinV", "mB", "nB", "netB"]) delete old[0][1].state[key];
        expect("data" in collection.check(old)).toBe(true);
        act(() => graph.importPresetData(old));
        expect(graph.state).toMatchObject({joinContinuity: "c1", joinAlpha: 2, joinV: 0.5, mB: 3, nB: 3});
        expect(graph.joinReport()).toMatchObject({c0: true, c1: true});
    });

    it.each(["c2", "C1", 1, null, ""])("rejects the continuity %j", value => {
        const rejection = rejected({joinContinuity: value});
        expect(rejection?.key).toBe("invalid_patch_join_continuity");
        expect(renderMessage(rejection!)).toBe(t("invalid_patch_join_continuity"));
    });

    it.each([0, 0.24, 4.01, -1, Number.NaN, Number.POSITIVE_INFINITY, "2", null])("rejects the ratio %s, not a clamp", value => {
        expect(rejected({joinAlpha: value})?.key).toBe("invalid_patch_join_alpha");
    });

    it.each([-0.1, 1.1, Number.NaN, "0.5", null])("rejects joinV %s", value => {
        expect(rejected({joinV: value})?.key).toBe("invalid_patch_join_v");
    });

    it("takes B all or nothing, with the right count and degrees", () => {
        for (const partial of [{mB: 1}, {nB: 1}, {netB: points(4)}, {mB: 1, nB: 1}, {mB: 1, netB: points(4)}]) {
            expect(rejected(partial)?.key).toBe("patch_join_b_incomplete");
        }
        expect(rejected({mB: 1, nB: 1, netB: points(3)})?.key).toBe("patch_join_net_length_mismatch");
        expect(renderMessage(rejected({mB: 1, nB: 1, netB: points(3)})!)).toBe("mreža krpe B ima 3 točk, pričakovanih pa je 4");
        expect(rejected({mB: 0, nB: 1, netB: points(2)})?.key).toBe("patch_degree_out_of_range");
        expect(rejected({mB: 1, nB: 5, netB: points(12)})?.key).toBe("patch_degree_out_of_range");
        expect(rejected({mB: 1.5, nB: 1, netB: points(4)})?.key).toBe("patch_degree_out_of_range");
        expect(rejected({mB: 1, nB: 1, netB: [...points(3), [0, 0]]})).toBeDefined();
        expect(rejected({mB: 1, nB: 1, netB: [...points(3), [0, Number.NaN, 0]]})).toBeDefined();
    });

    it("gives the reasons in both languages", () => {
        const alpha = rejected({joinAlpha: 9})!;
        const incomplete = rejected({mB: 1})!;
        expect(renderMessage(alpha)).toBe("razmerje α mora biti število med 0,25 in 4");
        act(() => setLanguage("en"));
        expect(renderMessage(alpha)).toBe("the ratio α must be a number between 0.25 and 4");
        expect(renderMessage(incomplete)).toBe("patch B needs mB, nB and netB together");
    });
});
