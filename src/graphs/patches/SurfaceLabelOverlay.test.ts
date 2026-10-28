import {SURFACE_LABEL_SETTLE_TIMEOUT_MS, SurfaceLabelOverlay} from "./SurfaceLabelOverlay";
import type {LabelLayout} from "./surface-view/surfaceScene";

const layout = (id: string, x: number, y: number, visible = true, text = id): LabelLayout => ({id, text, x, y, visible});

function setup() {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const typeset = vi.fn(async (element: HTMLElement) => { element.dataset.typeset = "yes"; });
    const overlay = new SurfaceLabelOverlay(host, typeset);
    const label = (id: string) => host.querySelector<HTMLElement>(`[data-label-id="${id}"]`);
    return {host, overlay, typeset, label};
}
afterEach(() => { document.body.innerHTML = ""; });

describe("SurfaceLabelOverlay", () => {
    it("is hidden from assistive technology and does not catch pointer events", () => {
        const {overlay} = setup();
        expect(overlay.element.getAttribute("aria-hidden")).toBe("true");
        expect(overlay.element.style.pointerEvents).toBe("none");
    });

    it("places, moves and hides labels from the layout, and typesets a formula once", async () => {
        const {overlay, label, typeset} = setup();
        overlay.update([layout("a", 10, 20, true, "S(u,v)"), layout("b", 30, 40, false, "P_{12}")]);
        expect(label("a")?.style.left).toBe("10px");
        expect(label("a")?.style.top).toBe("20px");
        expect(label("a")?.hidden).toBe(false);
        expect(label("b")?.hidden).toBe(true);
        expect(label("a")?.textContent).toBe("\\(S(u,v)\\)");
        overlay.update([layout("a", 11, 22, false, "S(u,v)"), layout("b", 30, 40, true, "P_{12}")]);
        expect(label("a")?.style.left).toBe("11px");
        expect(label("a")?.hidden).toBe(true);
        expect(label("b")?.hidden).toBe(false);
        await overlay.ready();
        expect(typeset).toHaveBeenCalledTimes(2);
        expect(label("a")?.dataset.typeset).toBe("yes");
    });

    it("removes labels the layout no longer has", () => {
        const {overlay, label} = setup();
        overlay.update([layout("a", 1, 1), layout("b", 2, 2)]);
        overlay.update([layout("b", 2, 2)]);
        expect(label("a")).toBeNull();
        expect(label("b")).not.toBeNull();
    });

    it("keeps a failed typeset as TeX text instead of failing", async () => {
        const host = document.createElement("div");
        const overlay = new SurfaceLabelOverlay(host, () => Promise.reject(new Error("no MathJax")));
        overlay.update([layout("a", 1, 1, true, "x")]);
        await expect(overlay.ready()).resolves.toBeUndefined();
        expect(host.querySelector("[data-label-id=a]")?.textContent).toBe("\\(x\\)");
    });

    it("makes a static host a positioning context and restores it, with its labels, on dispose", () => {
        const {host, overlay, label} = setup();
        expect(host.style.position).toBe("relative");
        overlay.update([layout("a", 1, 1)]);
        overlay.dispose();
        expect(host.style.position).toBe("");
        expect(host.contains(overlay.element)).toBe(false);
        expect(label("a")).toBeNull();
        overlay.update([layout("a", 1, 1)]);
        expect(host.children).toHaveLength(0);
    });

    it("shows a still image over the live canvas while work runs, with the capture's labels, then removes it", async () => {
        const {host, overlay, label} = setup();
        overlay.update([layout("a", 5, 5)]);
        let during: {src?: string; labelX?: string; hidden?: boolean} = {};
        const result = await overlay.showStill({
            dataUrl: "data:image/png;base64,QUJD", width: 100, height: 50,
            labels: [layout("a", 70, 30, false)],
        }, async () => {
            const image = host.querySelector<HTMLImageElement>("img.surface-still-image");
            during = {src: image?.getAttribute("src") ?? undefined, labelX: label("a")?.style.left, hidden: label("a")?.hidden};
            return "done";
        });
        expect(result).toBe("done");
        expect(during).toEqual({src: "data:image/png;base64,QUJD", labelX: "70px", hidden: true});
        expect(host.querySelector("img")).toBeNull();
    });

    it("removes the still image when the work fails", async () => {
        const {host, overlay} = setup();
        await expect(overlay.showStill({dataUrl: "data:,", width: 1, height: 1, labels: []}, () => Promise.reject(new Error("boom"))))
            .rejects.toThrow("boom");
        expect(host.querySelector("img")).toBeNull();
    });

    describe("with promises that never settle", () => {
        beforeEach(() => { vi.useFakeTimers(); });
        afterEach(() => { vi.useRealTimers(); });

        it("ready gives up on a typesetter that never resolves", async () => {
            const host = document.createElement("div");
            document.body.appendChild(host);
            const overlay = new SurfaceLabelOverlay(host, () => new Promise<void>(() => undefined));
            overlay.update([layout("a", 5, 5)]);
            let done = false;
            void overlay.ready().then(() => { done = true; });
            await vi.advanceTimersByTimeAsync(SURFACE_LABEL_SETTLE_TIMEOUT_MS - 1);
            expect(done).toBe(false);
            await vi.advanceTimersByTimeAsync(1);
            expect(done).toBe(true);
            expect(host.querySelector('[data-label-id="a"]')?.textContent).toBe("\\(a\\)");
        });

        it("showStill runs the work after a decode that never settles, and removes the image", async () => {
            const {host, overlay} = setup();
            // jsdom has no decode(); a real browser's can stay pending for an image that is neither loaded nor failed.
            Object.defineProperty(HTMLImageElement.prototype, "decode", {configurable: true, value: () => new Promise<void>(() => undefined)});
            let ran = false;
            const result = overlay.showStill({dataUrl: "data:,", width: 1, height: 1, labels: []}, async () => { ran = true; return "ok"; });
            await vi.advanceTimersByTimeAsync(SURFACE_LABEL_SETTLE_TIMEOUT_MS - 1);
            expect(ran).toBe(false);
            await vi.advanceTimersByTimeAsync(1);
            await expect(result).resolves.toBe("ok");
            expect(ran).toBe(true);
            expect(host.querySelector("img")).toBeNull();
            delete (HTMLImageElement.prototype as {decode?: unknown}).decode;
        });
    });
});
