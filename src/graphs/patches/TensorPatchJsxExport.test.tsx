import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import html2canvas from "html2canvas";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import TensorPatchGraph from "./TensorPatchGraph";
import {JsxSurfaceView} from "./surface-view/jsxSurfaceView";
import type {RasterServices} from "./surface-view/jsxCapture";

// Figure export of the patch route drawn by the JSXGraph surface view (task 05): the real graph, the real view and the
// real label layout; only the browser's image decoder and canvas (jsdom has neither) and the SVG typesetter are stubs.
vi.mock("html2canvas", () => ({default: vi.fn()}));
vi.mock("../base/export/SvgMathLabels", async () => ({
    ...await vi.importActual<typeof import("../base/export/SvgMathLabels")>("../base/export/SvgMathLabels"),
    loadSvgTypesetter: async () => (tex: string) => ({viewBox: "0 -1000 2000 1000", body: `<g data-tex="${tex}"></g>`}),
}));

type TestMathJax = {startup: {promise: Promise<unknown>}; typesetPromise: () => Promise<void>};
const win = window as Window & {MathJax?: TestMathJax};
let previousMathJax: TestMathJax | undefined;
let downloads: Blob[];
const drawnSvgs: string[] = [];

const services: RasterServices = {
    pixelRatio: 1,
    loadImage: async url => { drawnSvgs.push(url); return {} as CanvasImageSource; },
    createCanvas: (width, height) => ({
        width, height,
        getContext: () => ({fillRect: () => undefined, drawImage: () => undefined, fillStyle: ""}),
        toDataURL: () => "data:image/png;base64,SURFACEPNG",
    }) as unknown as HTMLCanvasElement,
};

beforeAll(installBoardShims);
beforeEach(() => {
    appStorage.clear();
    previousMathJax = win.MathJax;
    win.MathJax = {startup: {promise: Promise.resolve()}, typesetPromise: async () => undefined};
    downloads = [];
    drawnSvgs.length = 0;
    URL.createObjectURL = vi.fn((blob: Blob) => { downloads.push(blob); return "blob:figure"; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});
afterEach(() => {
    if (previousMathJax) win.MathJax = previousMathJax;
    else delete win.MathJax;
    vi.restoreAllMocks();
    vi.mocked(html2canvas).mockReset();
});

const readText = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
});
const button = (name: string) => screen.getByRole("button", {name, hidden: true});

async function mountJsx() {
    const view = new JsxSurfaceView(services);
    const graph = new TensorPatchGraph({viewFactory: () => view, typeset: async () => undefined});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const host = await waitFor(() => {
        const el = rendered.container.querySelector<HTMLElement>("[data-jsx-surface-view]")?.parentElement;
        if (!el) throw new Error("the JSX view is not attached yet");
        return el;
    });
    // The first layout reaches the overlay once the view has drawn the scene.
    await waitFor(() => expect(host.querySelectorAll("[data-label-id]").length).toBeGreaterThan(0));
    return {host, rendered};
}

describe("figure export of the patch route with the JSX surface view", () => {
    it("SVG: embeds the current render of the view and typesets the visible labels", async () => {
        const {host} = await mountJsx();
        const shown = Array.from(host.querySelectorAll<HTMLElement>("[data-label-id]")).filter(label => !label.hidden)
            .map(label => label.dataset.labelId);
        expect(shown.length).toBeGreaterThan(0);
        fireEvent.click(button("SVG"));
        await waitFor(() => expect(downloads).toHaveLength(1));
        const svg = new DOMParser().parseFromString(await readText(downloads[0]), "image/svg+xml");
        const images = svg.querySelectorAll("image");
        expect(images).toHaveLength(1);
        expect(images[0].getAttribute("href")).toBe("data:image/png;base64,SURFACEPNG");
        const labels = Array.from(svg.querySelectorAll("g.bezeg-math-labels > svg"));
        expect(labels.map(label => label.getAttribute("data-label-id")).sort()).toEqual([...shown].sort());
        expect(labels.every(label => (label.querySelector("g")?.getAttribute("data-tex") ?? "") !== "")).toBe(true);
        expect(drawnSvgs.length).toBeGreaterThan(0);
    });

    it("PNG: the container shows the render and the visible typeset labels while html2canvas reads it", async () => {
        const {host} = await mountJsx();
        let during: {src?: string | null; visible?: number} = {};
        vi.mocked(html2canvas).mockImplementation(async () => {
            during = {
                src: host.querySelector("img.surface-still-image")?.getAttribute("src"),
                visible: Array.from(host.querySelectorAll<HTMLElement>("[data-label-id]")).filter(label => !label.hidden).length,
            };
            return ({toBlob: (callback: BlobCallback) => callback(new Blob(["png"], {type: "image/png"}))}) as unknown as HTMLCanvasElement;
        });
        fireEvent.click(button("PNG"));
        await waitFor(() => expect(downloads).toHaveLength(1));
        expect(during.src).toBe("data:image/png;base64,SURFACEPNG");
        expect(during.visible).toBeGreaterThan(0);
        expect(host.querySelector("img.surface-still-image")).toBeNull();
    });
});
