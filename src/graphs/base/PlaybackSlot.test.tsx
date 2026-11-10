import React, {useEffect, useState} from "react";
import {act, fireEvent, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import {DemonstrationWorkspace} from "./DemonstrationWorkspace";
import {PlaybackButtons} from "./controls/PlaybackButtons";
import {setLanguage} from "../../localization";

/** A matchMedia double whose single query can be flipped; records listener balance. */
function installMedia(initial: boolean) {
    const listeners = new Set<() => void>();
    const added = vi.fn(), removed = vi.fn();
    const query = {
        matches: initial, media: "", onchange: null, addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
        addEventListener: (_type: string, listener: () => void) => { added(); listeners.add(listener); },
        removeEventListener: (_type: string, listener: () => void) => { removed(); listeners.delete(listener); },
    };
    vi.stubGlobal("matchMedia", vi.fn(() => query));
    return {
        flip(matches: boolean) { query.matches = matches; act(() => listeners.forEach(listener => listener())); },
        listeners, added, removed,
    };
}

class FakeResizeObserver {
    static instances: FakeResizeObserver[] = [];
    readonly observed = new Set<Element>();
    disconnected = false;
    constructor(readonly callback: () => void) { FakeResizeObserver.instances.push(this); }
    observe(target: Element) { this.observed.add(target); }
    unobserve() {}
    disconnect() { this.disconnected = true; }
}

const mounts = {count: 0};
function Group({placement = "graph"}: {placement?: "graph" | "inspector"}) {
    const [playing, setPlaying] = useState(false);
    useEffect(() => { mounts.count++; }, []);
    return <PlaybackButtons groupLabel="Iteracija" placement={placement} nextLabel="Naslednji" playing={playing}
                            onNext={() => {}} onPlayPause={() => setPlaying(!playing)} onReset={() => {}}/>;
}

const workspace = (edit: React.ReactNode) => <MemoryRouter><DemonstrationWorkspace description="x" edit={edit} display={null} save={null}
                                                                                 navigate={vi.fn()}/></MemoryRouter>;
const slot = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-playback-slot]")!;
const groups = (container: HTMLElement) => container.querySelectorAll('[role="group"][aria-label="Iteracija"]');

beforeEach(() => { setLanguage("sl"); mounts.count = 0; FakeResizeObserver.instances = []; vi.stubGlobal("ResizeObserver", FakeResizeObserver); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("graph-adjacent playback slot", () => {
    test("on a narrow viewport the group and its status line sit in the slot after the board, once", () => {
        installMedia(true);
        const {container} = render(workspace(<Group/>));
        expect(slot(container).previousElementSibling?.id).toBe("jgbox");
        expect(groups(container)).toHaveLength(1);
        expect(slot(container).contains(groups(container)[0])).toBe(true);
        expect(slot(container).querySelector('[role="status"]')).not.toBeNull();
    });

    test("on a wide viewport nothing moves: the group stays in the inspector and the slot is empty", () => {
        installMedia(false);
        const {container} = render(workspace(<Group/>));
        expect(slot(container).childElementCount).toBe(0);
        expect(container.querySelector("#workspace-inspector")!.contains(groups(container)[0])).toBe(true);
        expect(groups(container)).toHaveLength(1);
    });

    test("an inspector placement never claims the slot", () => {
        installMedia(true);
        const {container} = render(workspace(<Group placement="inspector"/>));
        expect(slot(container).childElementCount).toBe(0);
    });

    test("crossing the breakpoint moves the one group without remounting or stopping playback", () => {
        const media = installMedia(false);
        const {container} = render(workspace(<Group/>));
        fireEvent.click(container.querySelector('[data-action="play-pause"]')!);
        expect(container.querySelector('[data-action="play-pause"]')!.getAttribute("data-playing")).toBe("true");
        media.flip(true);
        expect(slot(container).contains(groups(container)[0])).toBe(true);
        expect(groups(container)).toHaveLength(1);
        expect(container.querySelector('[data-action="play-pause"]')!.getAttribute("data-playing")).toBe("true");
        media.flip(false);
        expect(container.querySelector("#workspace-inspector")!.contains(groups(container)[0])).toBe(true);
        expect(groups(container)).toHaveLength(1);
        expect(container.querySelector('[data-action="play-pause"]')!.getAttribute("data-playing")).toBe("true");
        expect(mounts.count).toBe(1);
    });

    test("a second claimant warns and renders inline", () => {
        installMedia(true);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const {container} = render(workspace(<><Group/><Group/></>));
        expect(slot(container).querySelectorAll('[role="group"]')).toHaveLength(1);
        expect(container.querySelector("#workspace-inspector")!.querySelectorAll('[aria-label="Iteracija"]')).toHaveLength(1);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    test("a filled slot sizes the board through custom properties; an empty slot leaves the layout alone", () => {
        installMedia(true);
        const {container} = render(workspace(<Group/>));
        const section = container.querySelector<HTMLElement>(".workspace-graph")!;
        expect(section.hasAttribute("data-playback-filled")).toBe(false);
        vi.spyOn(slot(container), "getBoundingClientRect").mockReturnValue({height: 96} as DOMRect);
        act(() => FakeResizeObserver.instances.at(-1)!.callback());
        expect(section.getAttribute("data-playback-filled")).toBe("true");
        expect(section.style.getPropertyValue("--playback-slot-height")).toBe("96px");
    });

    test("route exit removes the media listener and disconnects the observers", () => {
        const media = installMedia(true);
        const {unmount} = render(workspace(<Group/>));
        expect(media.listeners.size).toBe(1);
        const active = FakeResizeObserver.instances.filter(observer => !observer.disconnected);
        expect(active.length).toBeGreaterThan(0);
        unmount();
        expect(media.listeners.size).toBe(0);
        expect(media.removed).toHaveBeenCalledTimes(media.added.mock.calls.length);
        expect(FakeResizeObserver.instances.every(observer => observer.disconnected)).toBe(true);
    });
});
