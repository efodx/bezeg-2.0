import React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from "vitest";
import {GraphHost} from "./GraphHost";
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from "./realGraphTestHarness";
import {BisectionGraph} from "../functions/BisectionGraph";
import {setLanguage} from "../../localization";
import {appStorage} from "../../storage/appStorage";

// User-action availability (docs/specs/master-review-followups-2026-11.md, UA1-UA5) through the real host, a real
// workspace, a real lesson and a real graph: storage bytes and the model are observed, not only disabled-looking controls.
beforeAll(installBoardShims);
beforeEach(() => { setLanguage("sl"); appStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

class ObservedBisection extends BisectionGraph {
    modelNow() { return this.model; }
}

const ROUTE = "/bezeg-2.0/analysis/bisection";
const storageKey = "preset-bisection";
const stored = () => appStorage.getItem(storageKey);

/** Only the graph-adjacent query matches (a phone), so playback is relocated under the board. */
function phone() {
    const original = window.matchMedia;
    vi.stubGlobal("matchMedia", (query: string) => ({...original(query), matches: query.includes("max-width: 700px")}));
}

function mount(entry = ROUTE) {
    const graph = new ObservedBisection();
    render(<MemoryRouter initialEntries={[entry]}><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}

const startLesson = () => act(() => { fireEvent.click(document.querySelector(".workspace-action-lesson")!); });
// Folding the lesson card is explore: Escape folds it (a card has no hide button) and hands the graph back like the old hide button.
const hideCard = () => act(() => { document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true})); });
const openSave = () => act(() => { fireEvent.click(document.querySelector("button.preset-save")!); });
const saveName = () => screen.getByLabelText("Ime stanja") as HTMLInputElement;
const next = () => document.querySelector<HTMLElement>('[data-action="next-step"]')!;

describe("Preset writes are decided when they commit (UA1)", () => {
    test("a Save form opened before the lesson cannot save through Enter or the Save button", () => {
        const graph = mount();
        openSave();
        fireEvent.change(saveName(), {target: {value: "draft"}});
        startLesson();
        expect(document.querySelector(".guided-lesson")).not.toBeNull();

        const before = stored();
        const model = JSON.stringify(graph.modelNow());
        act(() => { fireEvent.keyDown(saveName(), {key: "Enter"}); });
        expect(stored()).toBe(before);
        const confirm = [...document.querySelectorAll<HTMLElement>(".preset-save-form .preset-action-primary")][0];
        act(() => { fireEvent.click(confirm); });
        expect(stored()).toBe(before);
        expect(JSON.stringify(graph.modelNow())).toBe(model);
        expect(saveName().value).toBe("draft");
    }, REAL_GRAPH_TEST_TIMEOUT);

    test("rename, overwrite and delete forms opened before the lesson refuse too", () => {
        const graph = mount();
        graph.saveCurrentPreset("alpha");
        graph.saveCurrentPreset("beta");
        act(() => { graph.requestRender(); });
        const row = (id: string) => document.querySelector<HTMLElement>(`li[data-preset-id="${id}"]`)!;
        const menu = (id: string) => act(() => { fireEvent.click(row(id).querySelector(".preset-row-menu")!); });
        menu("alpha");
        act(() => { fireEvent.click(row("alpha").querySelectorAll<HTMLElement>(".preset-menu-item")[0]); });
        fireEvent.change(row("alpha").querySelector(".preset-rename-input")!, {target: {value: "gamma"}});
        menu("beta");
        act(() => { fireEvent.click(row("beta").querySelectorAll<HTMLElement>(".preset-menu-item")[2]); });
        startLesson();

        const before = stored();
        act(() => { fireEvent.keyDown(row("alpha").querySelector(".preset-rename-input")!, {key: "Enter"}); });
        act(() => { fireEvent.click(row("beta").querySelector(".preset-action-danger")!); });
        expect(stored()).toBe(before);
        // retained commands on the graph itself are refused as well
        act(() => {
            graph.saveCurrentPreset("alpha");
            graph.renamePreset("alpha", "gamma");
            void graph.deletePreset("alpha");
            void graph.deleteSelectedPreset();
        });
        expect(stored()).toBe(before);
        expect((row("alpha").querySelector(".preset-rename-input") as HTMLInputElement).value).toBe("gamma");
    }, REAL_GRAPH_TEST_TIMEOUT);

    test("folding the card keeps writes refused", () => {
        const graph = mount();
        startLesson();
        hideCard();
        const before = stored();
        act(() => { graph.saveCurrentPreset("hidden"); });
        expect(stored()).toBe(before);
        expect(graph.presetService?.getPreset("hidden")).toBeUndefined();
    }, REAL_GRAPH_TEST_TIMEOUT);

    test("free exploration still saves, renames and deletes", () => {
        const graph = mount();
        openSave();
        fireEvent.change(saveName(), {target: {value: "alpha"}});
        act(() => { fireEvent.keyDown(saveName(), {key: "Enter"}); });
        expect(graph.presetService?.getPreset("alpha")).toBeDefined();
        act(() => { graph.renamePreset("alpha", "beta"); });
        expect(graph.presetService?.getPreset("beta")).toBeDefined();
        expect(graph.presetService?.getPreset("alpha")).toBeUndefined();
        act(() => { void graph.deletePreset("beta"); });
        expect(graph.presetService?.getPreset("beta")).toBeUndefined();
    }, REAL_GRAPH_TEST_TIMEOUT);
});

describe("relocated playback follows the lesson mode (UA2, UA3)", () => {
    test("Next step in the relocated group does nothing while the card owns the graph", () => {
        phone();
        const graph = mount();
        startLesson();
        const slot = document.querySelector<HTMLElement>("[data-playback-slot]")!;
        expect(slot.contains(next())).toBe(true);
        const model = JSON.stringify(graph.modelNow());
        act(() => { next().focus(); fireEvent.keyDown(next(), {key: "Enter"}); fireEvent.click(next()); });
        expect(JSON.stringify(graph.modelNow())).toBe(model);
    }, REAL_GRAPH_TEST_TIMEOUT);

    test("a folded card allows playback again, and so does leaving the lesson", () => {
        phone();
        const graph = mount();
        startLesson();
        hideCard();
        const step = () => graph.modelNow().step;
        const before = step();
        act(() => { fireEvent.click(next()); });
        expect(step()).toBe(before + 1);
    }, REAL_GRAPH_TEST_TIMEOUT);

    test("the inspector group is locked by the same decision on a wide viewport", () => {
        const graph = mount();
        startLesson();
        const model = JSON.stringify(graph.modelNow());
        act(() => { fireEvent.click(next()); });
        expect(JSON.stringify(graph.modelNow())).toBe(model);
    }, REAL_GRAPH_TEST_TIMEOUT);

    test("free exploration playback is ordinary", () => {
        phone();
        const graph = mount();
        const before = graph.modelNow().step;
        act(() => { fireEvent.click(next()); });
        expect(graph.modelNow().step).toBe(before + 1);
    }, REAL_GRAPH_TEST_TIMEOUT);
});
