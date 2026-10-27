import {waitFor} from "@testing-library/react";
import {setLanguage} from "../../../localization";
import {capturePNGBlob, downloadPNG, downloadSVG, FigureCaptureTarget, FigureExportCancelledError} from "./FigureCapture";
import type {Mock} from 'vitest';

function makeTarget(container: HTMLElement, controller = new AbortController()): FigureCaptureTarget {
    return {
        container,
        rendererRoot: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
        isAlive: () => !controller.signal.aborted,
        signal: controller.signal,
        waitUntilReady: async () => undefined,
    };
}

function makeCanvas(blob: Blob): HTMLCanvasElement {
    return {
        toBlob: (callback: BlobCallback) => callback(blob),
    } as unknown as HTMLCanvasElement;
}

test("PNG capture hides only target MathJax assistive nodes and restores their exact display styles", async () => {
    const container = document.createElement("div");
    container.innerHTML = '<mjx-assistive-mml style="display: inline !important; color: red"></mjx-assistive-mml><mjx-assistive-mml style="color: blue"></mjx-assistive-mml>';
    const [withDisplay, withoutDisplay] = Array.from(container.querySelectorAll<HTMLElement>("mjx-assistive-mml"));
    const outside = document.createElement("mjx-assistive-mml");
    outside.style.display = "inline";
    document.body.appendChild(container);
    document.body.appendChild(outside);
    const expected = new Blob(["png"], {type: "image/png"});
    const renderToCanvas = vi.fn(async (target: HTMLElement) => {
        expect(target).toBe(container);
        expect(withDisplay.style.getPropertyValue("display")).toBe("none");
        expect(withDisplay.style.getPropertyPriority("display")).toBe("important");
        expect(withoutDisplay.style.getPropertyValue("display")).toBe("none");
        expect(outside.style.display).toBe("inline");
        return makeCanvas(expected);
    });

    try {
        const blob = await capturePNGBlob(makeTarget(container), {renderToCanvas});
        expect(blob).toBe(expected);
        expect(withDisplay.style.getPropertyValue("display")).toBe("inline");
        expect(withDisplay.style.getPropertyPriority("display")).toBe("important");
        expect(withDisplay.style.color).toBe("red");
        expect(withoutDisplay.style.getPropertyValue("display")).toBe("");
        expect(withoutDisplay.style.color).toBe("blue");
        expect(outside.style.display).toBe("inline");
    } finally {
        container.remove();
        outside.remove();
    }
});

test("PNG capture restores MathJax styles and does not download after capture failure", async () => {
    const previousLanguage = document.documentElement.lang === "en" ? "en" : "sl";
    setLanguage("sl");
    const container = document.createElement("div");
    container.innerHTML = '<mjx-assistive-mml style="display: contents !important; color: purple"></mjx-assistive-mml>';
    const mml = container.querySelector<HTMLElement>("mjx-assistive-mml")!;
    const download = vi.fn();
    const renderToCanvas = vi.fn(async () => {
        expect(mml.style.getPropertyValue("display")).toBe("none");
        throw new Error("renderer failed");
    });

    try {
        const pending = downloadPNG(makeTarget(container), "figure.png", {renderToCanvas, download});
        setLanguage("en");
        expect(document.documentElement.lang).toBe("sl");
        await pending;

        expect(mml.style.getPropertyValue("display")).toBe("contents");
        expect(mml.style.getPropertyPriority("display")).toBe("important");
        expect(mml.style.color).toBe("purple");
        expect(download).not.toHaveBeenCalled();
        setLanguage("en");
        expect(document.documentElement.lang).toBe("en");
    } finally {
        setLanguage(previousLanguage);
    }
});

test("PNG capture cancellation prevents download and restores capture styles", async () => {
    const previousLanguage = document.documentElement.lang === "en" ? "en" : "sl";
    setLanguage("sl");
    const controller = new AbortController();
    const container = document.createElement("div");
    container.innerHTML = '<mjx-assistive-mml style="display: inline"></mjx-assistive-mml>';
    const mml = container.querySelector<HTMLElement>("mjx-assistive-mml")!;
    const target = makeTarget(container, controller);
    const download = vi.fn();
    let signalCaptureStarted: () => void = () => undefined;
    const captureStarted = new Promise<void>(resolve => { signalCaptureStarted = resolve; });
    let finishRendering: (canvas: HTMLCanvasElement) => void = () => undefined;
    const renderToCanvas = vi.fn(() => new Promise<HTMLCanvasElement>(resolve => {
        signalCaptureStarted();
        finishRendering = resolve;
    }));

    const pending = downloadPNG(target, "figure.png", {renderToCanvas, download});
    await captureStarted;
    expect(mml.style.getPropertyValue("display")).toBe("none");
    setLanguage("en");
    expect(document.documentElement.lang).toBe("sl");
    controller.abort();
    await pending;
    finishRendering(makeCanvas(new Blob(["late"], {type: "image/png"})));

    expect(download).not.toHaveBeenCalled();
    expect(mml.style.getPropertyValue("display")).toBe("inline");
    setLanguage("en");
    expect(document.documentElement.lang).toBe("en");
    setLanguage(previousLanguage);
});

test("PNG capture waits for MathJax startup and an explicit current-container typeset", async () => {
    type TestMathJax = {
        startup: {promise: Promise<unknown>};
        typesetPromise: (elements?: Element[]) => Promise<void>;
    };
    const win = window as Window & {MathJax?: TestMathJax};
    const previousMathJax = win.MathJax;
    const container = document.createElement("div");
    container.textContent = "$$x^2$$";
    const target = makeTarget(container);
    let resolveStartup: () => void = () => undefined;
    let observeStartupRead: () => void = () => undefined;
    let resolveTypesetting: () => void = () => undefined;
    const startup = new Promise<void>(resolve => { resolveStartup = resolve; });
    const startupRead = new Promise<void>(resolve => { observeStartupRead = resolve; });
    const startupApi = Object.defineProperty({}, "promise", {
        get: () => {
            observeStartupRead();
            return startup;
        },
    }) as {promise: Promise<unknown>};
    const typesetPromise = vi.fn((_elements?: Element[]) => new Promise<void>(resolve => {
        resolveTypesetting = resolve;
    }));
    win.MathJax = {startup: startupApi, typesetPromise};
    const renderedBlob = new Blob(["png"], {type: "image/png"});
    const renderToCanvas = vi.fn(async () => makeCanvas(renderedBlob));

    try {
        const capture = capturePNGBlob(target, {renderToCanvas});
        await startupRead;
        expect(typesetPromise).not.toHaveBeenCalled();
        expect(renderToCanvas).not.toHaveBeenCalled();

        resolveStartup();
        await waitFor(() => expect(typesetPromise).toHaveBeenCalledWith([container]));
        expect(renderToCanvas).not.toHaveBeenCalled();

        resolveTypesetting();
        await expect(capture).resolves.toBe(renderedBlob);
        expect(renderToCanvas).toHaveBeenCalledTimes(1);
    } finally {
        resolveStartup();
        resolveTypesetting();
        if (previousMathJax) win.MathJax = previousMathJax;
        else delete win.MathJax;
    }
});

test("disposing the graph while MathJax is pending cancels capture", async () => {
    type TestMathJax = {startup: {promise: Promise<unknown>}; typesetPromise: Mock};
    const win = window as Window & {MathJax?: TestMathJax};
    const previousMathJax = win.MathJax;
    const controller = new AbortController();
    const container = document.createElement("div");
    container.textContent = "\\(x^2\\)";
    const target = makeTarget(container, controller);
    let resolveStartup: () => void = () => undefined;
    let observeStartupRead: () => void = () => undefined;
    const startup = new Promise<void>(resolve => { resolveStartup = resolve; });
    const startupRead = new Promise<void>(resolve => { observeStartupRead = resolve; });
    const startupApi = Object.defineProperty({}, "promise", {
        get: () => {
            observeStartupRead();
            return startup;
        },
    }) as {promise: Promise<unknown>};
    const typesetPromise = vi.fn();
    const renderToCanvas = vi.fn(async () => makeCanvas(new Blob(["late"])));
    win.MathJax = {startup: startupApi, typesetPromise};

    try {
        const capture = capturePNGBlob(target, {renderToCanvas});
        await startupRead;
        controller.abort();
        await expect(capture).rejects.toBeInstanceOf(FigureExportCancelledError);
        expect(typesetPromise).not.toHaveBeenCalled();
        expect(renderToCanvas).not.toHaveBeenCalled();
    } finally {
        resolveStartup();
        if (previousMathJax) win.MathJax = previousMathJax;
        else delete win.MathJax;
    }
});

test("SVG export serializes the owned renderer root and keeps the requested filename", async () => {
    const container = document.createElement("div");
    const target = makeTarget(container);
    target.rendererRoot.innerHTML = '<circle cx="2" cy="3" r="4"></circle>';
    const expectedSvg = new XMLSerializer().serializeToString(target.rendererRoot);
    const serializeSvg = vi.fn((_root: SVGSVGElement) => expectedSvg);
    const download = vi.fn();
    const loadSvgTypesetter = async () => () => ({viewBox: "0 0 1 1", body: ""});

    await downloadSVG(target, "saved-scene.svg", {serializeSvg, download, loadSvgTypesetter});

    const serialized = serializeSvg.mock.calls[0][0];
    expect(serialized).not.toBe(target.rendererRoot);
    expect(serialized.querySelector("circle")).not.toBeNull();
    expect(download).toHaveBeenCalledTimes(1);
    const [blob, filename] = download.mock.calls[0] as [Blob, string];
    expect(filename).toBe("saved-scene.svg");
    expect(blob.type).toBe("image/svg+xml");
    expect(blob.size).toBe(expectedSvg.length);
});


describe("a target with a still figure (a view that draws raster pixels)", () => {
    const figure = {
        dataUrl: "data:image/png;base64,QUJD",
        width: 320,
        height: 200,
        labels: [
            {id: "seen", text: "S(u,v)", x: 40, y: 50, visible: true},
            {id: "hidden", text: "P_{00}", x: 60, y: 70, visible: false},
        ],
    };
    const labelStyle = {fontPx: 16, offsetXPx: 8, color: "#000"};
    function makeStillTarget(controller = new AbortController()) {
        const events: string[] = [];
        const base = makeTarget(document.createElement("div"), controller);
        const target: FigureCaptureTarget = {
            ...base,
            still: {
                capture: vi.fn(async () => figure),
                present: async work => {
                    events.push("present");
                    try { return await work(); } finally { events.push("restored"); }
                },
                labelStyle,
            },
        };
        return {target, events};
    }

    test("SVG export is one image of the render with only the visible labels, ignoring the empty renderer root", async () => {
        const {target} = makeStillTarget();
        target.rendererRoot.innerHTML = '<circle cx="2" cy="3" r="4"></circle>';
        const serializeSvg = vi.fn((root: SVGSVGElement) => new XMLSerializer().serializeToString(root));
        const download = vi.fn();
        const loadSvgTypesetter = async () => (tex: string) => ({viewBox: "0 -1000 2000 1000", body: `<g data-tex="${tex}"></g>`});

        await downloadSVG(target, "surface.svg", {serializeSvg, download, loadSvgTypesetter});

        const svg = serializeSvg.mock.calls[0][0];
        expect(svg.querySelectorAll("image")).toHaveLength(1);
        expect(svg.querySelector("image")?.getAttribute("href")).toBe(figure.dataUrl);
        expect(svg.querySelector("circle")).toBeNull();
        expect(Array.from(svg.querySelectorAll("g.bezeg-math-labels > svg")).map(label => label.getAttribute("data-label-id"))).toEqual(["seen"]);
        expect(download).toHaveBeenCalledTimes(1);
        expect((download.mock.calls[0] as [Blob, string])[1]).toBe("surface.svg");
    });

    test("PNG export renders the container inside the still presentation and restores it afterwards", async () => {
        const {target, events} = makeStillTarget();
        const renderedBlob = new Blob(["png"]);
        const renderToCanvas = vi.fn(async () => {
            events.push("render");
            return makeCanvas(renderedBlob);
        });

        await expect(capturePNGBlob(target, {renderToCanvas})).resolves.toBe(renderedBlob);

        expect(renderToCanvas).toHaveBeenCalledWith(target.container);
        expect(events).toEqual(["present", "render", "restored"]);
    });

    test("PNG export restores the live view when rendering fails", async () => {
        const {target, events} = makeStillTarget();
        const renderToCanvas = vi.fn(async () => { throw new Error("render failed"); });

        await expect(capturePNGBlob(target, {renderToCanvas})).rejects.toThrow("render failed");
        expect(events).toEqual(["present", "restored"]);
    });

    test("disposing the graph during a still PNG capture cancels it and downloads nothing", async () => {
        const controller = new AbortController();
        const {target, events} = makeStillTarget(controller);
        const download = vi.fn();
        let started!: () => void;
        const rendering = new Promise<void>(resolve => { started = resolve; });
        const renderToCanvas = vi.fn(() => { started(); return new Promise<HTMLCanvasElement>(() => undefined); });

        const exported = downloadPNG(target, "surface.png", {renderToCanvas, download});
        await rendering;
        controller.abort();
        await exported;

        expect(download).not.toHaveBeenCalled();
        await expect(capturePNGBlob(target, {renderToCanvas})).rejects.toBeInstanceOf(FigureExportCancelledError);
        expect(events).toContain("present");
    });

    test("disposing the graph while the still presentation is still settling cancels the capture without waiting for it", async () => {
        const controller = new AbortController();
        const {target} = makeStillTarget(controller);
        const presented = vi.fn();
        target.still = {...target.still!, present: <T,>(_work: () => Promise<T>) => { presented(); return new Promise<T>(() => undefined); }};
        const renderToCanvas = vi.fn();

        const captured = capturePNGBlob(target, {renderToCanvas});
        const outcome = captured.then(() => "resolved", error => error);
        await vi.waitFor(() => expect(presented).toHaveBeenCalledTimes(1));
        controller.abort();

        expect(await outcome).toBeInstanceOf(FigureExportCancelledError);
        expect(renderToCanvas).not.toHaveBeenCalled();
    });
});
