/**
 * The `patch-subdivision` panels: the split and elevation controls call the graph and reflect its state, the
 * correspondence readout equals `correspondence()`, elevation is gated at degree 4 with a reason, and Reset, Preset
 * restore and a language switch keep the split. The Preset collection's DTO rules are at the end.
 */
import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {formatNumber} from "../../analysis/format";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {renderMessage, setLanguage, t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorSubdivisionGraph from "./TensorSubdivisionGraph";
import {patchPresetCollections} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import type {Xyz} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => { setLanguage("sl"); vi.restoreAllMocks(); });

function mount() {
    const view = new FakeSurfaceView();
    const graph = new TensorSubdivisionGraph({viewFactory: () => view});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}

const slider = (key: "patch_split_value_u" | "patch_split_value_v") => screen.getByLabelText<HTMLInputElement>(t(key));
const field = (key: "patch_split_value_u" | "patch_split_value_v") => screen.getByRole<HTMLInputElement>("spinbutton", {name: t("number_field_label", {value0: t(key)})});
const direction = () => screen.getByLabelText<HTMLSelectElement>(t("patch_split_direction"));
const elevateButton = (axis: "u" | "v") => document.querySelector<HTMLButtonElement>(`[data-elevate="${axis}"]`)!;
const reason = (axis: "u" | "v") => document.querySelector(`[data-elevate-reason="${axis}"]`);
const piecesSwitch = () => screen.getByLabelText<HTMLInputElement>(t("patch_show_pieces"));
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)!.textContent;
const lockedNotice = () => document.querySelector(".patch-split-locked");
const eval3 = (graph: TensorSubdivisionGraph, u: number, v: number): Xyz => {
    const p = patchFromNet(graph.state.net).eval(u, v);
    return [p.X(), p.Y(), p.Z?.() ?? 0];
};
const shown = (values: readonly number[], language: "sl" | "en") => {
    const parts = values.map(value => formatNumber(value, language, 3));
    return language === "sl" ? `(${parts.join("; ")})` : `(${parts.join(", ")})`;
};

describe("split controls", () => {
    it("starts as the bicubic dome split at u0 = 0.4 with the pieces shown", () => {
        const {graph, view} = mount();
        expect(graph.state).toMatchObject({m: 3, n: 3, subdivisionDirection: "u", subdivisionValue: 0.4, showPieces: true});
        expect(direction().value).toBe("u");
        expect(slider("patch_split_value_u").value).toBe("0.4");
        expect(piecesSwitch().checked).toBe(true);
        expect(view.last.polylines.some(line => line.id.startsWith("piece-r-"))).toBe(true);
    });

    it("the direction select, the slider and the number field write the split and the scene follows", () => {
        const {graph, view} = mount();
        fireEvent.change(slider("patch_split_value_u"), {target: {value: "0.7"}});
        expect(graph.state.subdivisionValue).toBeCloseTo(0.7, 12);
        fireEvent.change(field("patch_split_value_u"), {target: {value: "0,25"}});
        expect(graph.state.subdivisionValue).toBeCloseTo(0.25, 12);
        fireEvent.change(direction(), {target: {value: "v"}});
        expect(graph.state.subdivisionDirection).toBe("v");
        // The slider is now the v0 slider and shows the same stored value.
        expect(slider("patch_split_value_v").value).toBe("0.25");
        expect(screen.queryByLabelText(t("patch_split_value_u"))).toBeNull();
        const split = view.last.polylines.find(line => line.id === "split-curve")!;
        // S(., 0.25) is the cut curve for direction v: its first point is S(0, 0.25).
        const expected = eval3(graph, 0, 0.25);
        expect(split.points[0].map((c, k) => Math.abs(c - expected[k]))).toEqual([0, 0, 0].map(() => expect.closeTo(0, 9)));
    });

    it("keeps the split inside 0.05 to 0.95", () => {
        const {graph} = mount();
        const input = slider("patch_split_value_u");
        expect(input.min).toBe("0.05");
        expect(input.max).toBe("0.95");
        act(() => graph.setSubdivisionValue(0.99));
        expect(graph.state.subdivisionValue).toBe(0.95);
        act(() => graph.setSubdivisionValue(0.01));
        expect(graph.state.subdivisionValue).toBe(0.05);
    });

    it("the Prikaz switch hides the pieces and shows the original net again", () => {
        const {graph, view} = mount();
        expect(view.last.polylines.some(line => line.id.startsWith("net-row-"))).toBe(false);
        fireEvent.click(piecesSwitch());
        expect(graph.state.showPieces).toBe(false);
        expect(view.last.polylines.some(line => line.id.startsWith("net-row-"))).toBe(true);
        expect(view.last.polylines.some(line => line.id.startsWith("piece-"))).toBe(false);
    });
});

describe("editing the original points", () => {
    it("says the points are not editable while the pieces are shown and how to edit them", () => {
        const {graph} = mount();
        expect(lockedNotice()!.textContent).toBe(t("patch_pieces_locked"));
        expect(t("patch_pieces_locked")).toContain(t("patch_show_pieces"));
        const before = graph.state.net;
        act(() => { graph.selectIndex(1, 1); graph.setSelectedCoordinates([9, 9, 9]); });
        expect(graph.state.net).toBe(before);
    });

    it("after the pieces are switched off the note is gone and a point moves", () => {
        const {graph} = mount();
        fireEvent.click(piecesSwitch());
        expect(lockedNotice()).toBeNull();
        act(() => { graph.selectIndex(1, 1); graph.setSelectedCoordinates([9, 9, 9]); });
        expect(graph.state.net[1][1]).toEqual([9, 9, 9]);
    });
});

describe("degree elevation", () => {
    it("the buttons elevate the degree in u or v and keep the surface", () => {
        const {graph} = mount();
        const before = eval3(graph, 0.3, 0.6);
        fireEvent.click(elevateButton("u"));
        expect(graph.state).toMatchObject({m: 4, n: 3});
        fireEvent.click(elevateButton("v"));
        expect(graph.state).toMatchObject({m: 4, n: 4});
        eval3(graph, 0.3, 0.6).forEach((c, k) => expect(c).toBeCloseTo(before[k], 12));
    });

    it("is disabled at degree 4 with the reason, per direction, and enabled again after a lower degree", () => {
        const {graph} = mount();
        expect(elevateButton("u").disabled).toBe(false);
        expect(reason("u")).toBeNull();
        fireEvent.click(elevateButton("u"));
        expect(elevateButton("u").disabled).toBe(true);
        expect(elevateButton("v").disabled).toBe(false);
        expect(reason("u")!.textContent).toBe(t("patch_elevate_maximum", {value0: "u"}));
        expect(reason("v")).toBeNull();
        const net = graph.state.net;
        fireEvent.click(elevateButton("u"));
        expect(graph.state.net).toBe(net);
        act(() => graph.setDegree("u", 3));
        expect(elevateButton("u").disabled).toBe(false);
        expect(reason("u")).toBeNull();
    });
});

describe("correspondence readout", () => {
    it.each([[0.5, 0.5, 0.4, "u"], [0.2, 0.7, 0.4, "u"], [0.4, 0.3, 0.4, "u"], [0.9, 0.15, 0.3, "v"], [0.35, 0.1, 0.6, "v"]] as const)(
        "(u, v) = (%s, %s), split %s in %s: shows the piece, the local parameters and equal points", (u, v, split, axis) => {
            const {graph} = mount();
            act(() => { graph.setSubdivisionDirection(axis); graph.setSubdivisionValue(split); graph.setParameters(u, v); });
            const found = graph.correspondence();
            expect(readout("piece")).toBe(t(found.location.piece === "left" ? "patch_correspondence_left" : "patch_correspondence_right"));
            expect(readout("local")).toBe(shown([found.location.u, found.location.v], "sl"));
            expect(readout("piece-point")).toBe(shown(found.point, "sl"));
            // The piece's point is S(u, v), not merely a point of the right shape.
            expect(readout("point")).toBe(shown(eval3(graph, u, v), "sl"));
            expect(readout("piece-point")).toBe(readout("point"));
        });

    it("uses a decimal comma in Slovenian and a point in English, and names the piece in both", () => {
        const {graph} = mount();
        act(() => graph.setParameters(0.5, 0.5));
        expect(readout("local")).toBe("(0,167; 0,5)");
        expect(readout("piece")).toBe("drugi del S_R");
        act(() => setLanguage("en"));
        expect(readout("local")).toBe("(0.167, 0.5)");
        expect(readout("piece")).toBe("second piece S_R");
    });

    it("moves to the first piece when u crosses the split", () => {
        const {graph} = mount();
        act(() => graph.setParameters(0.3, 0.5));
        expect(readout("piece")).toBe(t("patch_correspondence_left"));
        expect(readout("local")).toBe("(0,75; 0,5)");
    });
});

describe("Reset, Preset restore and language", () => {
    it("Reset restores the default split and pieces, and clears the elevation ghost", async () => {
        const {graph, view} = mount();
        act(() => { graph.setSubdivisionDirection("v"); graph.setSubdivisionValue(0.8); graph.setShowPieces(false); graph.elevate("u"); });
        expect(view.last.polylines.some(line => line.id.startsWith("ghost-"))).toBe(true);
        await settle(() => graph.reset());
        expect(graph.state).toMatchObject({m: 3, n: 3, subdivisionDirection: "u", subdivisionValue: 0.4, showPieces: true});
        expect(direction().value).toBe("u");
        expect(piecesSwitch().checked).toBe(true);
        expect(view.last.polylines.some(line => line.id.startsWith("ghost-"))).toBe(false);
    });

    it("a saved Preset restores the split fields and shows no ghost", async () => {
        const {graph, view} = mount();
        act(() => { graph.setSubdivisionDirection("v"); graph.setSubdivisionValue(0.8); graph.setShowPieces(false); });
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        act(() => { graph.setSubdivisionDirection("u"); graph.setSubdivisionValue(0.2); graph.setShowPieces(true); graph.elevate("v"); });
        expect(view.last.polylines.some(line => line.id.startsWith("ghost-"))).toBe(true);
        await settle(() => graph.selectPreset("mine"));
        expect(graph.state).toMatchObject({subdivisionDirection: "v", subdivisionValue: 0.8, showPieces: false, n: 3});
        expect(direction().value).toBe("v");
        expect(slider("patch_split_value_v").value).toBe("0.8");
        expect(piecesSwitch().checked).toBe(false);
        expect(view.last.polylines.some(line => line.id.startsWith("ghost-"))).toBe(false);
    });

    it("a language switch relabels the controls and keeps the state", () => {
        const {graph} = mount();
        act(() => { graph.setSubdivisionValue(0.6); graph.elevate("u"); });
        const heading = t("patch_split_heading");
        act(() => setLanguage("en"));
        expect(t("patch_split_heading")).not.toBe(heading);
        expect(screen.getByText(t("patch_split_heading"))).toBeTruthy();
        expect(screen.getByText(t("patch_elevate_heading"))).toBeTruthy();
        expect(screen.getByRole("button", {name: t("patch_elevate_v")})).toBeTruthy();
        expect(reason("u")!.textContent).toBe(t("patch_elevate_maximum", {value0: "u"}));
        expect(lockedNotice()!.textContent).toBe(t("patch_pieces_locked"));
        expect(piecesSwitch().checked).toBe(true);
        expect(graph.state).toMatchObject({subdivisionValue: 0.6, m: 4});
    });
});

describe("patch-subdivision Preset collection", () => {
    const collection = patchPresetCollections["patch-subdivision"];
    const dto = (state: Record<string, unknown>) => [["TensorProductBezierPatch", {m: 1, n: 1, net: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]], state}]];
    const rejected = (state: Record<string, unknown>) => {
        const checked = collection.check(dto(state));
        return "rejection" in checked ? checked.rejection : undefined;
    };

    it("is keyed patch-subdivision and takes the graph's own export", () => {
        expect(collection.key).toBe("patch-subdivision");
        const {graph} = mount();
        act(() => { graph.setSubdivisionDirection("v"); graph.setSubdivisionValue(0.65); graph.setShowPieces(false); });
        const data = JSON.parse(JSON.stringify(graph.exportPresetData()));
        expect(data[0][1].state).toMatchObject({subdivisionDirection: "v", subdivisionValue: 0.65, showPieces: false});
        expect("data" in collection.check(data)).toBe(true);
        expect(graph.presetCollection()).toBe(collection);
    });

    it("accepts the whole range including its ends, and a Preset without the split fields", () => {
        for (const subdivisionValue of [0.05, 0.4, 0.95]) expect(rejected({subdivisionValue, subdivisionDirection: "u", showPieces: true})).toBeUndefined();
        expect(rejected({u: 0.5, v: 0.5})).toBeUndefined();
        expect("data" in collection.check(dto({}))).toBe(true);
    });

    it("loads an older tensor Preset without the split fields with the defaults", () => {
        const {graph} = mount();
        act(() => { graph.setSubdivisionDirection("v"); graph.setSubdivisionValue(0.8); graph.setShowPieces(false); });
        const old = JSON.parse(JSON.stringify(graph.exportPresetData()));
        for (const key of ["subdivisionDirection", "subdivisionValue", "showPieces"]) delete old[0][1].state[key];
        expect("data" in collection.check(old)).toBe(true);
        act(() => graph.importPresetData(old));
        expect(graph.state).toMatchObject({subdivisionDirection: "u", subdivisionValue: 0.4, showPieces: true});
    });

    it.each([0, 0.049, 0.951, 1, -0.2, 2, Number.NaN, Number.POSITIVE_INFINITY, "0.4", null])("rejects the split value %s with a localized reason, not a clamp", value => {
        const rejection = rejected({subdivisionValue: value});
        expect(rejection).toBeDefined();
        expect(rejection!.key).toBe("invalid_patch_subdivision_value");
        expect(renderMessage(rejection!)).toBe(t("invalid_patch_subdivision_value"));
    });

    it.each(["w", "U", 1, true, null, ""])("rejects the split direction %j", value => {
        expect(rejected({subdivisionDirection: value})?.key).toBe("invalid_patch_subdivision_direction");
    });

    it("rejects a non-boolean showPieces", () => {
        expect(rejected({showPieces: "yes"})).toBeDefined();
        expect(rejected({showPieces: 1})).toBeDefined();
    });

    it("gives the reasons in both languages", () => {
        const value = rejected({subdivisionValue: 0.97})!;
        const direction = rejected({subdivisionDirection: "w"})!;
        expect(renderMessage(value)).toBe("mesto delitve mora biti število med 0,05 in 0,95");
        expect(renderMessage(direction)).toBe("smer delitve mora biti u ali v");
        act(() => setLanguage("en"));
        expect(renderMessage(value)).toBe("the split position must be a number between 0.05 and 0.95");
        expect(renderMessage(direction)).toBe("the split direction must be u or v");
    });
});
