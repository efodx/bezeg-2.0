/**
 * Figure export of the triangular patch: the selected point's label reaches the view, and SVG and PNG export draw
 * exactly the labels the view shows as visible.
 */
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import html2canvas from "html2canvas";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TriangularPatchGraph from "./TriangularPatchGraph";
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

/** The view's layout: the selected point's label is on screen, the point S's is hidden behind the surface. */
const capture: SurfaceCapture = {
    dataUrl: "data:image/png;base64,QUJD",
    width: 600,
    height: 400,
    labels: [
        {id: "surface-point", text: "S(u,v,w)", x: 300, y: 120, visible: false},
        {id: "selected-point", text: "P_{111}", x: 200, y: 260, visible: true},
    ],
};

function mount() {
    const view = new FakeSurfaceView();
    view.captureResult = capture;
    const graph = new TriangularPatchGraph({viewFactory: () => view, typeset: async () => undefined});
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

describe("labels of the triangular patch", () => {
    it("sends the name of the selected point to the view as a scene label, and drops it with the selection and the net", () => {
        const {graph, view} = mount();
        expect(view.last.labels.map(label => label.id)).toEqual(["surface-point"]);
        view.emit({kind: "select", pointId: "t-1-1-1"});
        expect(view.last.labels.find(label => label.id === "selected-point")).toMatchObject({text: "P_{111}", pointId: "t-1-1-1"});
        act(() => graph.setVisibility("showControlNet", false));
        expect(view.last.labels.map(label => label.id)).toEqual(["surface-point"]);
        act(() => graph.setVisibility("showControlNet", true));
        act(() => graph.selectIndex(undefined));
        expect(view.last.labels.map(label => label.id)).toEqual(["surface-point"]);
    });

    it("shows the view layout in an overlay over the surface", () => {
        const {view, host, labelsIn} = mount();
        view.emitLayout(capture.labels);
        const shown = labelsIn(host.querySelector<HTMLElement>(".surface-label-overlay")!);
        expect(shown.map(label => [label.dataset.labelId, label.hidden, label.textContent])).toEqual([
            ["surface-point", true, "\\(S(u,v,w)\\)"], ["selected-point", false, "\\(P_{111}\\)"],
        ]);
    });
});

describe("SVG export", () => {
    it("typesets the visible labels only, including the selected point's", async () => {
        const {view} = mount();
        fireEvent.click(button("SVG"));
        await waitFor(() => expect(downloads).toHaveLength(1));
        expect(view.captures).toBe(1);
        expect(downloads[0].type).toBe("image/svg+xml");
        const svg = new DOMParser().parseFromString(await readText(downloads[0]), "image/svg+xml");
        expect(svg.querySelectorAll("image")).toHaveLength(1);
        const labels = Array.from(svg.querySelectorAll("g.bezeg-math-labels > svg"));
        expect(labels.map(label => label.getAttribute("data-label-id"))).toEqual(["selected-point"]);
        expect(labels[0].querySelector("g")?.getAttribute("data-tex")).toBe("P_{111}");
    });
});

describe("PNG export", () => {
    it("captures the container showing the render with the visible labels, then restores the live view", async () => {
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
        expect(during).toEqual({container: host, src: capture.dataUrl, visible: ["selected-point"]});
        expect(host.querySelector("img")).toBeNull();
        expect(downloads[0].type).toBe("image/png");
    });
});
