import html2canvas from "html2canvas";
import {beginFigureExport, reportFigureExportFailure} from "../../../localization";
import {buildSvgWithMathLabels, loadSvgTypesetter as loadSvgTypesetterDefault, SvgTypesetter} from "./SvgMathLabels";
import {loadMathJax} from "../../../mathjax/loadMathJax";
import type {MathJaxApi} from "../../../mathjax/loadMathJax";

/** The graph owner supplies readiness and cancellation for every capture. */
export interface FigureExportLifecycle {
    isAlive: () => boolean;
    signal: AbortSignal;
    /** Resolves after model updates and renderer work for the current scene have settled. */
    waitUntilReady: () => Promise<void>;
}

/** A current capture target. Get a fresh target after each scene replacement. */
export interface FigureCaptureTarget extends FigureExportLifecycle {
    container: HTMLElement;
    rendererRoot: SVGSVGElement;
}

export interface FigureCaptureDependencies {
    renderToCanvas?: (container: HTMLElement) => Promise<HTMLCanvasElement>;
    /** Receives the renderer clone that carries the label overlays. */
    serializeSvg?: (rendererRoot: SVGSVGElement) => string;
    /** Loads the MathJax SVG typesetter used for formula labels in SVG export. */
    loadSvgTypesetter?: () => Promise<SvgTypesetter>;
    download?: (blob: Blob, filename: string) => void;
}

export const FIGURE_CAPTURE_WAIT_TIMEOUT_MS = 15000;

export class FigureExportCancelledError extends Error {
    constructor() {
        super("Figure export was cancelled because its graph is no longer active.");
        this.name = "FigureExportCancelledError";
    }
}

export class FigureExportTimeoutError extends Error {
    constructor(description: string) {
        super(`Timed out waiting for ${description}.`);
        this.name = "FigureExportTimeoutError";
    }
}

type Cleanup = () => void;
type OwnedOperation<T> = (
    registerCleanup: (cleanup: Cleanup) => void,
    operationSignal: AbortSignal,
) => Promise<T>;

function assertActive(lifecycle: FigureExportLifecycle): void {
    if (lifecycle.signal.aborted || !lifecycle.isAlive()) {
        throw new FigureExportCancelledError();
    }
}

/**
 * Wait for owned work while bounding it and listening for graph disposal. The
 * optional registration callback lets event-based waits remove listeners as
 * soon as the owner is cancelled.
 */
function waitForOwned<T>(
    operation: Promise<T> | OwnedOperation<T>,
    lifecycle: FigureExportLifecycle,
    description: string,
    timeoutMs = FIGURE_CAPTURE_WAIT_TIMEOUT_MS
): Promise<T> {
    assertActive(lifecycle);
    return new Promise<T>((resolve, reject) => {
        let finished = false;
        const operationController = new AbortController();
        const cleanups: Cleanup[] = [];
        const cleanup = () => {
            window.clearTimeout(timeout);
            lifecycle.signal.removeEventListener("abort", onAbort);
            cleanups.splice(0).forEach(dispose => dispose());
        };
        const finish = (callback: () => void) => {
            if (finished) return;
            finished = true;
            cleanup();
            callback();
        };
        const onAbort = () => {
            operationController.abort();
            finish(() => reject(new FigureExportCancelledError()));
        };
        const timeout = window.setTimeout(
            () => {
                operationController.abort();
                finish(() => reject(new FigureExportTimeoutError(description)));
            },
            timeoutMs
        );
        lifecycle.signal.addEventListener("abort", onAbort, {once: true});

        let pending: Promise<T>;
        try {
            pending = typeof operation === "function"
                ? operation(dispose => cleanups.push(dispose), operationController.signal)
                : operation;
        } catch (error) {
            operationController.abort();
            finish(() => reject(error));
            return;
        }
        Promise.resolve(pending).then(
            value => finish(() => {
                try {
                    assertActive(lifecycle);
                    resolve(value);
                } catch (error) {
                    reject(error);
                }
            }),
            error => {
                operationController.abort();
                finish(() => reject(error));
            }
        );
    });
}

function hasRawMath(container: HTMLElement): boolean {
    return /\\\(|\\\[|\$\$|\\begin\s*\{/.test(container.textContent ?? "");
}

function getMathJax(): MathJaxApi | undefined {
    return (window as Window & {MathJax?: MathJaxApi}).MathJax;
}

async function waitForMathJax(target: FigureCaptureTarget): Promise<void> {
    let mathJax = getMathJax();
    if (!mathJax && !hasRawMath(target.container)) return;

    if (!mathJax) mathJax = await waitForOwned(loadMathJax(), target, "MathJax to load");

    if (mathJax.startup?.promise) {
        await waitForOwned(mathJax.startup.promise, target, "MathJax startup");
    }
    if (mathJax.typesetPromise) {
        // Explicitly typeset the current target and await its completion before
        // html2canvas reads the DOM.
        await waitForOwned(mathJax.typesetPromise([target.container]), target, "MathJax typesetting");
    } else if (hasRawMath(target.container)) {
        throw new Error("MathJax is not ready to typeset the figure.");
    }
}

async function waitForFonts(target: FigureCaptureTarget): Promise<void> {
    const fonts = document.fonts;
    if (fonts?.ready) await waitForOwned(fonts.ready.then(() => undefined), target, "web fonts");
}

async function waitForImages(target: FigureCaptureTarget): Promise<void> {
    const images = Array.from(target.container.querySelectorAll("img"));
    for (const image of images) {
        if (!image.complete) {
            await waitForOwned<void>(registerCleanup => new Promise<void>(resolve => {
                const settled = () => resolve();
                image.addEventListener("load", settled, {once: true});
                image.addEventListener("error", settled, {once: true});
                registerCleanup(() => {
                    image.removeEventListener("load", settled);
                    image.removeEventListener("error", settled);
                });
            }), target, "an image in the graph");
        }
        if (image.decode) {
            // A broken image is settled too; the browser's fallback rendering
            // is stable even when decode rejects.
            await waitForOwned(image.decode().catch(() => undefined), target, "an image in the graph");
        }
    }
}

/** Waits for graph work, fonts, MathJax, and target images with bounded waits. */
export async function waitForFigureCaptureReady(target: FigureCaptureTarget): Promise<void> {
    assertActive(target);
    await waitForOwned(target.waitUntilReady(), target, "the graph to become ready");
    await waitForFonts(target);
    await waitForMathJax(target);
    // Typesetting can introduce web fonts that were not requested earlier.
    await waitForFonts(target);
    await waitForImages(target);
    assertActive(target);
}

function withHiddenAssistiveMath<T>(container: HTMLElement, work: () => Promise<T>): Promise<T> {
    const nodes = Array.from(container.querySelectorAll<HTMLElement>("mjx-assistive-mml"));
    const previous = nodes.map(node => {
        const style = node.style;
        let hadDisplay = false;
        for (let index = 0; index < style.length; index++) {
            if (style.item(index) === "display") {
                hadDisplay = true;
                break;
            }
        }
        return {node, hadDisplay, value: style.getPropertyValue("display"), priority: style.getPropertyPriority("display")};
    });
    nodes.forEach(node => node.style.setProperty("display", "none", "important"));
    return work().finally(() => {
        previous.forEach(({node, hadDisplay, value, priority}) => {
            if (hadDisplay) node.style.setProperty("display", value, priority);
            else node.style.removeProperty("display");
        });
    });
}

function createPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
        try {
            if (!canvas.toBlob) throw new Error("This browser cannot encode the figure as PNG.");
            canvas.toBlob(blob => resolve(blob), "image/png");
        } catch (error) {
            reject(error);
        }
    });
}

export async function capturePNGBlob(
    target: FigureCaptureTarget,
    dependencies: FigureCaptureDependencies = {}
): Promise<Blob> {
    await waitForFigureCaptureReady(target);
    const renderToCanvas = dependencies.renderToCanvas ?? (container => html2canvas(container));
    const blob = await withHiddenAssistiveMath(target.container, async () => {
        const canvas = await waitForOwned(renderToCanvas(target.container), target, "the graph to render as PNG");
        const result = await waitForOwned(createPngBlob(canvas), target, "the PNG image to encode");
        if (!result) throw new Error("PNG capture did not produce an image.");
        return result;
    });
    assertActive(target);
    return blob;
}

function serializeSvgDefault(rendererRoot: SVGSVGElement): string {
    return new XMLSerializer().serializeToString(rendererRoot);
}

export function downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    try {
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } finally {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    }
}

async function runSingleExport(target: FigureCaptureTarget, work: () => Promise<void>): Promise<void> {
    const finish = beginFigureExport();
    try {
        assertActive(target);
        await work();
    } catch (error) {
        if (!(error instanceof FigureExportCancelledError)) reportFigureExportFailure();
    } finally {
        finish();
    }
}

/**
 * Serializes a clone of the JSXGraph SVG renderer tree with the board's HTML
 * labels added as SVG (typeset formulas as paths) and downloads it.
 */
export function downloadSVG(
    target: FigureCaptureTarget,
    filename: string,
    dependencies: FigureCaptureDependencies = {}
): Promise<void> {
    return runSingleExport(target, async () => {
        await waitForFigureCaptureReady(target);
        const serializeSvg = dependencies.serializeSvg ?? serializeSvgDefault;
        const typeset = await waitForOwned(
            (dependencies.loadSvgTypesetter ?? loadSvgTypesetterDefault)(),
            target,
            "the SVG formula typesetter to load"
        );
        const clone = buildSvgWithMathLabels(target.container, target.rendererRoot, typeset);
        const blob = new Blob([serializeSvg(clone)], {type: "image/svg+xml"});
        assertActive(target);
        (dependencies.download ?? downloadBlob)(blob, filename);
    });
}

/** Captures the target DOM as PNG and downloads it after checking ownership. */
export function downloadPNG(
    target: FigureCaptureTarget,
    filename: string,
    dependencies: FigureCaptureDependencies = {}
): Promise<void> {
    return runSingleExport(target, async () => {
        const blob = await capturePNGBlob(target, dependencies);
        assertActive(target);
        (dependencies.download ?? downloadBlob)(blob, filename);
    });
}

export function isFigureExportCancelled(error: unknown): boolean {
    return error instanceof FigureExportCancelledError;
}

/** Used by the batch coordinator for one lock and one visible failure state. */
export async function runBatchFigureExport(work: () => Promise<void>): Promise<void> {
    const finish = beginFigureExport();
    try {
        await work();
    } catch (error) {
        if (!isFigureExportCancelled(error)) reportFigureExportFailure();
    } finally {
        finish();
    }
}

/** Exposes the bounded owned wait for graph-owner scene callbacks. */
export function waitForOwnedFigureWork<T>(
    operation: Promise<T> | ((operationSignal: AbortSignal) => Promise<T>),
    lifecycle: FigureExportLifecycle,
    description: string
): Promise<T> {
    return waitForOwned(
        typeof operation === "function"
            ? (_registerCleanup, operationSignal) => operation(operationSignal)
            : operation,
        lifecycle,
        description,
    );
}
