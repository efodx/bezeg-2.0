import React from "react";
import {act, fireEvent, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import {DemonstrationWorkspace} from "./DemonstrationWorkspace";
import {PlaybackButtons} from "./controls/PlaybackButtons";
import {setLanguage} from "../../localization";
import {PresetLockContext, policyOf} from "../context/react/PresetLockContext";

function installMedia(initial: boolean) {
    const listeners = new Set<() => void>();
    const query = {
        matches: initial, media: "", onchange: null, addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
        addEventListener: (_type: string, listener: () => void) => { listeners.add(listener); },
        removeEventListener: (_type: string, listener: () => void) => { listeners.delete(listener); },
    };
    vi.stubGlobal("matchMedia", vi.fn(() => query));
    return {flip(matches: boolean) { query.matches = matches; act(() => listeners.forEach(listener => listener())); }};
}

class FakeResizeObserver { observe() {} unobserve() {} disconnect() {} }

const companion = {label: "Čas t", children: <input type="range" aria-label="Čas t" defaultValue={0}/>};
function Group({withCompanion = true}: {withCompanion?: boolean}) {
    return <PlaybackButtons groupLabel="Iteracija" placement="graph" playing={false} onPlayPause={() => {}}
                            companion={withCompanion ? companion : undefined}/>;
}
const workspace = (edit: React.ReactNode) => <MemoryRouter><DemonstrationWorkspace description="x" edit={edit} display={null} save={null}
                                                                                 navigate={vi.fn()}/></MemoryRouter>;
const slot = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-playback-slot]")!;
const sliders = (container: HTMLElement) => container.querySelectorAll('input[aria-label="Čas t"]');

beforeEach(() => { setLanguage("sl"); vi.stubGlobal("ResizeObserver", FakeResizeObserver); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("playback companion control", () => {
    test("phone slot active: the one slider is in a closed disclosure of the slot, not in the inspector", () => {
        installMedia(true);
        const {container} = render(workspace(<Group/>));
        expect(sliders(container)).toHaveLength(1);
        const details = slot(container).querySelector("details")!;
        expect(details.open).toBe(false);
        expect(details.textContent).toContain("Ročno: Čas t");
        expect(details.contains(sliders(container)[0])).toBe(true);
        expect(container.querySelector("#board-card-tools")!.querySelector('input[aria-label="Čas t"]')).toBeNull();
    });

    test("slot inactive: the slider stays in the inspector, with no disclosure", () => {
        installMedia(false);
        const {container} = render(workspace(<Group/>));
        expect(sliders(container)).toHaveLength(1);
        expect(container.querySelector("#board-card-tools")!.contains(sliders(container)[0])).toBe(true);
        expect(container.querySelector("details")).toBeNull();
    });

    test("crossing the breakpoint keeps exactly one slider and its focus", () => {
        const media = installMedia(false);
        const {container} = render(workspace(<Group/>));
        act(() => (sliders(container)[0] as HTMLElement).focus());
        media.flip(true);
        expect(sliders(container)).toHaveLength(1);
        expect(document.activeElement).toBe(sliders(container)[0]);
        // A browser cannot focus inside a closed <details>, so the moved focus opens it.
        expect(slot(container).querySelector("details")!.open).toBe(true);
        media.flip(false);
        expect(sliders(container)).toHaveLength(1);
        expect(document.activeElement).toBe(sliders(container)[0]);
    });

    test("the slot disclosure reopens as the user left it after a move", () => {
        const media = installMedia(true);
        const {container} = render(workspace(<Group/>));
        const details = slot(container).querySelector("details")!;
        act(() => { details.open = true; details.dispatchEvent(new Event("toggle")); });
        media.flip(false);
        media.flip(true);
        expect(slot(container).querySelector("details")!.open).toBe(true);
    });

    test("under a lesson card's lock the whole slot disclosure, summary included, is inert", () => {
        installMedia(true);
        const locked = (mode: "lesson-card" | "free") =>
            workspace(<PresetLockContext.Provider value={policyOf(mode)}><Group/></PresetLockContext.Provider>);
        const {container, rerender} = render(locked("lesson-card"));
        const details = () => slot(container).querySelector("details") as HTMLElement & {inert?: boolean};
        expect(details().inert).toBe(true);
        rerender(locked("free"));
        expect(details().inert).toBe(false);
    });

    test("a group without a companion adds no disclosure", () => {
        installMedia(true);
        const {container} = render(workspace(<Group withCompanion={false}/>));
        expect(container.querySelector("details")).toBeNull();
        fireEvent.click(container.querySelector('[data-action="play-pause"]')!);
    });
});
