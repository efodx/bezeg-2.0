import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims, settle} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {t} from "../../localization";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorPatchGraph from "./TensorPatchGraph";
import type {SurfaceCapture} from "./surface-view/surfaceScene";

vi.mock("html2canvas", () => ({default: vi.fn()}));
vi.mock("../base/export/SvgMathLabels", async () => ({
    ...await vi.importActual<typeof import("../base/export/SvgMathLabels")>("../base/export/SvgMathLabels"),
    loadSvgTypesetter: async () => (tex: string) => ({viewBox: "0 -1000 2000 1000", body: `<g data-tex="${tex}"></g>`}),
}));

type TestMathJax = {startup: {promise: Promise<unknown>}; typesetPromise: () => Promise<void>};
const win = window as Window & {MathJax?: TestMathJax};
let previousMathJax: TestMathJax | undefined;
let downloads: Blob[];

beforeAll(installBoardShims);
beforeEach(() => {
    appStorage.clear();
    // The app loads MathJax before any graph route; jsdom never does.
    previousMathJax = win.MathJax;
    win.MathJax = {startup: {promise: Promise.resolve()}, typesetPromise: async () => undefined};
    downloads = [];
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

const capture: SurfaceCapture = {
    dataUrl: "data:image/png;base64,QUJD",
    width: 600,
    height: 400,
    labels: [
        {id: "surface-point", text: "S(u,v)", x: 300, y: 120, visible: true},
        {id: "selected-point", text: "P_{12}", x: 200, y: 260, visible: false},
    ],
};

function mount() {
    const view = new FakeSurfaceView();
    view.captureResult = capture;
    const graph = new TensorPatchGraph({viewFactory: () => view, typeset: async () => undefined});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const host = view.attached!;
    const labelsIn = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLElement>("[data-label-id]"));
    return {graph, view, rendered, host, labelsIn};
}
const readText = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
});
const button = (name: string) => screen.getByRole("button", {name, hidden: true});
const fakeCanvas = (): HTMLCanvasElement =>
    ({toBlob: (callback: BlobCallback) => callback(new Blob(["png"], {type: "image/png"}))}) as unknown as HTMLCanvasElement;

describe("on-screen labels", () => {
    it("shows the view layout in an overlay over the surface and follows each new layout", () => {
        const {view, host, labelsIn} = mount();
        const overlay = host.querySelector<HTMLElement>(".surface-label-overlay")!;
        expect(overlay).not.toBeNull();
        expect(overlay.getAttribute("aria-hidden")).toBe("true");
        expect(labelsIn(overlay)).toHaveLength(0);

        view.emitLayout([{id: "surface-point", text: "S(u,v)", x: 120, y: 80, visible: true}]);
        const [label] = labelsIn(overlay);
        expect(label.dataset.labelId).toBe("surface-point");
        expect(label.style.left).toBe("120px");
        expect(label.style.top).toBe("80px");
        expect(label.hidden).toBe(false);
        expect(label.textContent).toBe("\\(S(u,v)\\)");

        view.emitLayout([{id: "surface-point", text: "S(u,v)", x: 150, y: 90, visible: false}]);
        expect(labelsIn(overlay)).toHaveLength(1);
        expect(labelsIn(overlay)[0].style.left).toBe("150px");
        expect(labelsIn(overlay)[0].hidden).toBe(true);
    });

    it("removes the overlay and stops listening when the graph unmounts", () => {
        const {view, host, rendered} = mount();
        view.emitLayout([{id: "surface-point", text: "S(u,v)", x: 1, y: 1, visible: true}]);
        expect(view.layoutListeners.size).toBe(1);
        rendered.unmount();
        expect(host.querySelector(".surface-label-overlay")).toBeNull();
        expect(view.layoutListeners.size).toBe(0);
        expect(view.disposed).toBe(1);
    });

    it("sends the name of the selected point to the view as a scene label", () => {
        const {view} = mount();
        expect(view.last.labels.map(label => label.id)).toEqual(["surface-point"]);
        view.emit({kind: "select", pointId: "p-1-2"});
        expect(view.last.labels.find(label => label.id === "selected-point")).toMatchObject({text: "P_{12}", pointId: "p-1-2"});
    });
});

describe("the Shrani panel", () => {
    it("offers SVG and PNG figure export and the Preset figure batch", () => {
        mount();
        expect(button("SVG")).toBeTruthy();
        expect(button("PNG")).toBeTruthy();
        expect(button(t("generate_preset_figures"))).toBeTruthy();
    });
});

describe("SVG export", () => {
    it("downloads one image of the current render and typeset labels for the visible labels only", async () => {
        const {view} = mount();
        fireEvent.click(button("SVG"));
        await waitFor(() => expect(downloads).toHaveLength(1));
        expect(view.captures).toBe(1);
        expect(downloads[0].type).toBe("image/svg+xml");
        const text = await readText(downloads[0]);
        const svg = new DOMParser().parseFromString(text, "image/svg+xml");
        const images = svg.querySelectorAll("image");
        expect(images).toHaveLength(1);
        expect(images[0].getAttribute("href")).toBe(capture.dataUrl);
        const labels = Array.from(svg.querySelectorAll("g.bezeg-math-labels > svg"));
        expect(labels.map(label => label.getAttribute("data-label-id"))).toEqual(["surface-point"]);
        expect(labels[0].querySelector("g")?.getAttribute("data-tex")).toBe("S(u,v)");
    });

    it("downloads nothing when the view cannot render, and the export lock is released", async () => {
        const {view} = mount();
        view.captureResult = undefined;
        fireEvent.click(button("SVG"));
        await waitFor(() => expect(view.captures).toBe(1));
        await act(async () => { await Promise.resolve(); });
        expect(downloads).toHaveLength(0);
        await waitFor(() => expect((button("SVG") as HTMLButtonElement).disabled).toBe(false));
    });
});

describe("PNG export", () => {
    it("captures the container showing the render as an image with the visible labels, then restores the live view", async () => {
        const {host, labelsIn} = mount();
        let during: {container?: Element; src?: string | null; visible?: string[]} = {};
        vi.mocked(html2canvas).mockImplementation(async container => {
            during = {
                container,
                src: host.querySelector("img.surface-still-image")?.getAttribute("src"),
                visible: labelsIn(host).filter(label => !label.hidden).map(label => label.dataset.labelId ?? ""),
            };
            return fakeCanvas();
        });
        fireEvent.click(button("PNG"));
        await waitFor(() => expect(downloads).toHaveLength(1));
        expect(during).toEqual({container: host, src: capture.dataUrl, visible: ["surface-point"]});
        expect(host.querySelector("img")).toBeNull();
        expect(downloads[0].type).toBe("image/png");
    });

    it("is cancelled by unmounting the graph and downloads nothing", async () => {
        const {rendered, host} = mount();
        let rendering!: () => void;
        const started = new Promise<void>(resolve => { rendering = resolve; });
        vi.mocked(html2canvas).mockImplementation(() => { rendering(); return new Promise<HTMLCanvasElement>(() => undefined); });
        const errors = vi.spyOn(console, "error");
        fireEvent.click(button("PNG"));
        await started;
        expect(host.querySelector("img.surface-still-image")).not.toBeNull();
        rendered.unmount();
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
        expect(downloads).toHaveLength(0);
        expect(host.querySelector("img.surface-still-image")).toBeNull();
        expect(errors).not.toHaveBeenCalled();
    });
});

describe("Preset figure batch", () => {
    it("captures one PNG per Preset through the shared batch and restores the entry scene", async () => {
        const {graph} = mount();
        graph.presetService!.savePreset({...graph.exportPreset(), id: "mine"});
        vi.mocked(html2canvas).mockImplementation(async () => fakeCanvas());
        const before = graph.state;
        fireEvent.click(button(t("generate_preset_figures")));
        // The modal lists the Presets saved when the selector mounted, so the Preset saved above starts unselected.
        fireEvent.click(await screen.findByLabelText("mine"));
        const confirm = await screen.findByRole("button", {name: t("generate")});
        await settle(async () => { fireEvent.click(confirm); });
        await waitFor(() => expect(downloads).toHaveLength(1));
        expect(vi.mocked(html2canvas)).toHaveBeenCalledTimes(1);
        expect(Object.keys((await JSZip.loadAsync(downloads[0])).files)).toEqual(["mine.png"]);
        expect(graph.state).toEqual(before);
    });
});
