/**
 * The DOM overlay that shows a surface view's labels. The view projects and occlusion-tests every label
 * (`LabelLayout`); the overlay only places typeset formulas at those pixels. It owns its elements, and `dispose`
 * removes them and restores the host. No Three object is involved.
 */
import {typesetMath} from "../../mathjax/loadMathJax";
import type {LabelLayout, SurfaceCapture} from "./surface-view/surfaceScene";

/** Label size in CSS pixels; the SVG export sizes its vector formulas from it so both figures match. */
export const SURFACE_LABEL_FONT_PX = 16;
/** The label sits this far right of its anchor and is centred on it vertically, on screen and in the SVG. */
export const SURFACE_LABEL_OFFSET_X_PX = 8;
/** Label colour on screen and in the SVG. */
export const SURFACE_LABEL_COLOR = "#2f2a22";

/** The longest `ready` and a still image's decode wait; past it capture goes on with what is on screen. */
export const SURFACE_LABEL_SETTLE_TIMEOUT_MS = 3000;

/** Resolves when `promise` settles or after `ms`, whichever is first; the timer never outlives the call. */
async function settleWithin(promise: Promise<unknown>, ms: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>(resolve => { timer = setTimeout(resolve, ms); });
    try {
        await Promise.race([promise.catch(() => undefined), timeout]);
    } finally {
        clearTimeout(timer);
    }
}

/** Typesets the formulas below `element` (the app's MathJax pipeline); injected so tests need no MathJax. */
export type OverlayTypesetter = (element: HTMLElement, isActive: () => boolean) => Promise<void>;

export class SurfaceLabelOverlay {
    readonly element: HTMLElement;
    private readonly labels = new Map<string, {element: HTMLElement; text: string}>();
    private readonly pending = new Set<Promise<void>>();
    private readonly restoreHost: () => void;
    private disposed = false;

    constructor(host: HTMLElement, private readonly typeset: OverlayTypesetter = typesetMath) {
        this.element = host.ownerDocument.createElement("div");
        this.element.className = "surface-label-overlay";
        // The labels repeat what the sidebar says in text; a screen reader gets no second copy of the formulas.
        this.element.setAttribute("aria-hidden", "true");
        Object.assign(this.element.style, {position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", zIndex: "1"});
        let restorePosition: (() => void) | undefined;
        if (host.ownerDocument.defaultView?.getComputedStyle(host).position === "static") {
            const previous = host.style.position;
            host.style.position = "relative";
            restorePosition = () => { host.style.position = previous; };
        }
        host.appendChild(this.element);
        this.restoreHost = () => {
            this.element.remove();
            restorePosition?.();
        };
    }

    /** Places the labels of `layouts`, hides the invisible ones and removes the labels the layout no longer has. */
    update(layouts: readonly LabelLayout[]): void {
        if (this.disposed) return;
        const seen = new Set<string>();
        for (const layout of layouts) {
            seen.add(layout.id);
            let entry = this.labels.get(layout.id);
            if (!entry) {
                const element = this.element.ownerDocument.createElement("div");
                element.className = "surface-label";
                element.dataset.labelId = layout.id;
                Object.assign(element.style, {
                    position: "absolute", whiteSpace: "nowrap", lineHeight: "1", color: SURFACE_LABEL_COLOR,
                    fontSize: `${SURFACE_LABEL_FONT_PX}px`, transform: `translate(${SURFACE_LABEL_OFFSET_X_PX}px, -50%)`,
                });
                this.element.appendChild(element);
                entry = {element, text: ""};
                this.labels.set(layout.id, entry);
            }
            if (entry.text !== layout.text) {
                entry.text = layout.text;
                entry.element.textContent = `\\(${layout.text}\\)`;
                this.typesetLabel(entry.element);
            }
            entry.element.style.left = `${Math.round(layout.x * 10) / 10}px`;
            entry.element.style.top = `${Math.round(layout.y * 10) / 10}px`;
            entry.element.hidden = !layout.visible;
        }
        for (const [id, entry] of [...this.labels]) {
            if (seen.has(id)) continue;
            entry.element.remove();
            this.labels.delete(id);
        }
    }

    /**
     * Resolves once every formula placed so far is typeset (or failed to be; a failed label stays as TeX text). A
     * typesetter that never settles is given up on after `SURFACE_LABEL_SETTLE_TIMEOUT_MS`: the labels then stay as
     * TeX text and capture goes on, rather than hanging.
     */
    async ready(): Promise<void> {
        const drained = (async () => {
            while (this.pending.size > 0) await Promise.all([...this.pending]);
        })();
        await settleWithin(drained, SURFACE_LABEL_SETTLE_TIMEOUT_MS);
    }

    /**
     * Runs `work` with the host showing `capture` as an ordinary image (a WebGL canvas cannot be read back by a
     * DOM-to-canvas capture) and its labels placed as the capture laid them out; the image is removed afterwards, even
     * when `work` fails.
     */
    async showStill<T>(capture: SurfaceCapture, work: () => Promise<T>): Promise<T> {
        const host = this.element.parentElement;
        if (this.disposed || !host) throw new Error("The label overlay is not attached.");
        this.update(capture.labels);
        await this.ready();
        const image = host.ownerDocument.createElement("img");
        image.alt = "";
        image.className = "surface-still-image";
        Object.assign(image.style, {position: "absolute", inset: "0", width: "100%", height: "100%", display: "block", pointerEvents: "none"});
        image.src = capture.dataUrl;
        host.insertBefore(image, this.element);
        try {
            // A broken image is settled too, and one that never settles is given up on: the image is still in the DOM.
            if (typeof image.decode === "function") await settleWithin(image.decode(), SURFACE_LABEL_SETTLE_TIMEOUT_MS);
            return await work();
        } finally {
            image.remove();
        }
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.labels.clear();
        this.pending.clear();
        this.restoreHost();
    }

    private typesetLabel(element: HTMLElement): void {
        const work = this.typeset(element, () => !this.disposed && element.isConnected).catch(() => undefined);
        this.pending.add(work);
        void work.finally(() => this.pending.delete(work));
    }
}
