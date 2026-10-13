import {setLanguage} from "../../../localization";
import {downloadSVG, FigureCaptureTarget} from "./FigureCapture";
import {buildSvgWithMathLabels, loadSvgTypesetter, SvgTypesetter} from "./SvgMathLabels";

const SVG_NS = "http://www.w3.org/2000/svg";

function rect(left: number, top: number, width: number, height: number): DOMRect {
    return {
        left, top, width, height, right: left + width, bottom: top + height, x: left, y: top,
        toJSON: () => ({}),
    } as DOMRect;
}

function setRect(element: Element, value: DOMRect): void {
    element.getBoundingClientRect = () => value;
}

type MathItem = {typesetRoot: unknown; math: string; display: boolean; inputJax?: {name: string}};

interface Scene {
    container: HTMLElement;
    root: SVGSVGElement;
    target: FigureCaptureTarget;
    controller: AbortController;
}

function makeScene(): Scene {
    const container = document.createElement("div");
    const root = document.createElementNS(SVG_NS, "svg");
    root.setAttribute("width", "400");
    root.setAttribute("height", "300");
    root.innerHTML = '<circle cx="2" cy="3" r="4"></circle>';
    container.appendChild(root);
    document.body.appendChild(container);
    setRect(root, rect(100, 50, 400, 300));
    const controller = new AbortController();
    const target: FigureCaptureTarget = {
        container,
        rendererRoot: root,
        isAlive: () => !controller.signal.aborted,
        signal: controller.signal,
        waitUntilReady: async () => undefined,
    };
    return {container, root, target, controller};
}

function addLabel(scene: Scene, html: string, box: DOMRect, style = ""): HTMLElement {
    const label = document.createElement("div");
    label.className = "JXGtext";
    label.setAttribute("style", style);
    label.innerHTML = html;
    scene.container.appendChild(label);
    setRect(label, box);
    return label;
}

function addFormula(label: HTMLElement, box: DOMRect, color = "rgb(1, 2, 3)"): HTMLElement {
    const formula = document.createElement("mjx-container");
    formula.style.color = color;
    label.appendChild(formula);
    setRect(formula, box);
    return formula;
}

const typesetCalls: Array<[string, boolean]> = [];
const stubTypesetter: SvgTypesetter = (tex, display) => {
    typesetCalls.push([tex, display]);
    return {
        viewBox: "0 -500 1000 1000",
        body: `<path data-tex="${tex}" data-display="${display}" d="M0 0L1 1"></path>`,
    };
};

function installMathItems(items: MathItem[]): () => void {
    const win = window as Window & {MathJax?: unknown};
    const previous = win.MathJax;
    win.MathJax = {
        startup: {document: {getMathItemsWithin: () => items.map(item => ({inputJax: {name: "TeX"}, ...item}))}},
    };
    return () => {
        if (previous) win.MathJax = previous;
        else delete win.MathJax;
    };
}

afterEach(() => {
    document.body.innerHTML = "";
    typesetCalls.length = 0;
});

test("a math label becomes a positioned nested svg built from the TeX source", () => {
    const scene = makeScene();
    const label = addLabel(scene, "", rect(220, 110, 40, 30));
    const formula = addFormula(label, rect(220, 110, 40, 30));
    const restore = installMathItems([{typesetRoot: formula, math: "p_{0}", display: false}]);
    try {
        const clone = buildSvgWithMathLabels(scene.container, scene.root, stubTypesetter);
        const nested = clone.querySelector("g.bezeg-math-labels > svg");
        expect(nested).not.toBeNull();
        expect(typesetCalls).toContainEqual(["p_{0}", false]);
        expect(nested!.getAttribute("x")).toBe("120");
        expect(nested!.getAttribute("y")).toBe("60");
        expect(nested!.getAttribute("width")).toBe("40");
        expect(nested!.getAttribute("height")).toBe("30");
        expect(nested!.getAttribute("viewBox")).toBe("0 -500 1000 1000");
        expect(nested!.getAttribute("color")).toBe("rgb(1, 2, 3)");
        expect(nested!.querySelector("path")!.getAttribute("data-tex")).toBe("p_{0}");
        expect(clone.lastElementChild!.getAttribute("class")).toBe("bezeg-math-labels");
        expect(clone.querySelector("circle")).not.toBeNull();
    } finally {
        restore();
    }
});

test("positions are divided by the CSS scale of the renderer root", () => {
    const scene = makeScene();
    setRect(scene.root, rect(100, 50, 200, 150));
    const label = addLabel(scene, "", rect(120, 80, 20, 10));
    const formula = addFormula(label, rect(120, 80, 20, 10));
    const restore = installMathItems([{typesetRoot: formula, math: "x", display: true}]);
    try {
        const nested = buildSvgWithMathLabels(scene.container, scene.root, stubTypesetter)
            .querySelector("g.bezeg-math-labels > svg")!;
        expect(nested.getAttribute("x")).toBe("40");
        expect(nested.getAttribute("y")).toBe("60");
        expect(nested.getAttribute("width")).toBe("40");
        expect(nested.getAttribute("height")).toBe("20");
        expect(typesetCalls).toContainEqual(["x", true]);
    } finally {
        restore();
    }
});

test("a plain label becomes svg text with its computed font and position", () => {
    const scene = makeScene();
    addLabel(scene, "Label A", rect(150, 100, 60, 20), "font-family: Georgia; font-size: 18px; color: rgb(9, 8, 7); opacity: 0.5");
    const clone = buildSvgWithMathLabels(scene.container, scene.root, stubTypesetter);
    const text = clone.querySelector("g.bezeg-math-labels > text")!;
    expect(text.textContent).toBe("Label A");
    expect(text.getAttribute("x")).toBe("50");
    expect(text.getAttribute("y")).toBe("50");
    expect(text.getAttribute("font-family")).toContain("Georgia");
    expect(text.getAttribute("font-size")).toBe("18");
    expect(text.getAttribute("fill")).toBe("rgb(9, 8, 7)");
    expect(text.getAttribute("dominant-baseline")).toBe("hanging");
    expect(text.getAttribute("opacity")).toBe("0.5");
});

test("hidden, empty, and out-of-root labels are skipped", () => {
    const scene = makeScene();
    addLabel(scene, "none", rect(150, 100, 60, 20), "display: none");
    addLabel(scene, "invisible", rect(150, 100, 60, 20), "visibility: hidden");
    addLabel(scene, "transparent", rect(150, 100, 60, 20), "opacity: 0");
    addLabel(scene, "zero", rect(150, 100, 0, 0));
    addLabel(scene, "outside", rect(900, 900, 60, 20));
    addLabel(scene, "   ", rect(150, 100, 60, 20));
    const hiddenFormulaLabel = addLabel(scene, "", rect(150, 100, 60, 20));
    const hiddenFormula = addFormula(hiddenFormulaLabel, rect(0, 0, 0, 0));
    const restore = installMathItems([{typesetRoot: hiddenFormula, math: "q", display: false}]);
    try {
        const clone = buildSvgWithMathLabels(scene.container, scene.root, stubTypesetter);
        expect(clone.querySelector("g.bezeg-math-labels")!.childElementCount).toBe(0);
    } finally {
        restore();
    }
});

test("building the clone leaves the live DOM unchanged", () => {
    const scene = makeScene();
    const label = addLabel(scene, "", rect(220, 110, 40, 30));
    const formula = addFormula(label, rect(220, 110, 40, 30));
    addLabel(scene, "plain", rect(150, 100, 60, 20));
    const restore = installMathItems([{typesetRoot: formula, math: "p_{1}", display: false}]);
    const before = scene.container.outerHTML;
    try {
        const clone = buildSvgWithMathLabels(scene.container, scene.root, stubTypesetter);
        expect(clone).not.toBe(scene.root);
        expect(scene.container.outerHTML).toBe(before);
        expect(scene.root.querySelector("g.bezeg-math-labels")).toBeNull();
    } finally {
        restore();
    }
});

test("a typeset formula without a MathItem fails instead of being dropped", () => {
    const scene = makeScene();
    const label = addLabel(scene, "", rect(220, 110, 40, 30));
    addFormula(label, rect(220, 110, 40, 30));
    expect(() => buildSvgWithMathLabels(scene.container, scene.root, stubTypesetter)).toThrow();
});

test("the assistive MathML copy inside a label is ignored", () => {
    const scene = makeScene();
    const label = addLabel(scene, "", rect(220, 110, 40, 30));
    const formula = addFormula(label, rect(220, 110, 40, 30));
    const assistive = document.createElement("mjx-assistive-mml");
    label.appendChild(assistive);
    const nested = document.createElement("mjx-container");
    assistive.appendChild(nested);
    setRect(nested, rect(220, 110, 20, 17));
    const restore = installMathItems([
        {typesetRoot: formula, math: "p_{0}", display: false},
        {typesetRoot: nested, math: "<math><msub></msub></math>", display: true, inputJax: {name: "MathML"}},
    ]);
    try {
        const clone = buildSvgWithMathLabels(scene.container, scene.root, stubTypesetter);
        const overlays = clone.querySelectorAll("g.bezeg-math-labels > svg");
        expect(overlays).toHaveLength(1);
        expect(overlays[0].querySelector("path")!.getAttribute("data-tex")).toBe("p_{0}");
        expect(typesetCalls).toEqual([["p_{0}", false]]);
    } finally {
        restore();
    }
});

test("a visible formula that is not TeX fails instead of being typeset as TeX", () => {
    const scene = makeScene();
    const label = addLabel(scene, "", rect(220, 110, 40, 30));
    const formula = addFormula(label, rect(220, 110, 40, 30));
    const restore = installMathItems([{typesetRoot: formula, math: "<math></math>", display: false, inputJax: {name: "MathML"}}]);
    try {
        expect(() => buildSvgWithMathLabels(scene.container, scene.root, stubTypesetter)).toThrow();
        expect(typesetCalls).toHaveLength(0);
    } finally {
        restore();
    }
});

describe("downloadSVG with math labels", () => {
    beforeEach(() => setLanguage("sl"));

    function exportWith(scene: Scene, loadSvgTypesetter: () => Promise<SvgTypesetter>) {
        const download = vi.fn();
        const serializeSvg = vi.fn((root: SVGSVGElement) => new XMLSerializer().serializeToString(root));
        return {download, serializeSvg, run: () => downloadSVG(scene.target, "f.svg", {download, serializeSvg, loadSvgTypesetter})};
    }

    test("the downloaded file contains the typeset label", async () => {
        const scene = makeScene();
        const label = addLabel(scene, "", rect(220, 110, 40, 30));
        const formula = addFormula(label, rect(220, 110, 40, 30));
        const restore = installMathItems([{typesetRoot: formula, math: "p_{2}", display: false}]);
        try {
            const {download, serializeSvg, run} = exportWith(scene, async () => stubTypesetter);
            await run();
            expect(download).toHaveBeenCalledTimes(1);
            expect(serializeSvg.mock.calls[0][0].querySelector("svg")).not.toBeNull();
            expect(serializeSvg.mock.results[0].value).toContain('data-tex="p_{2}"');
        } finally {
            restore();
        }
    });

    test("a typesetter failure fails the export without a download", async () => {
        const scene = makeScene();
        const {download, run} = exportWith(scene, async () => { throw new Error("chunk failed"); });
        await run();
        expect(download).not.toHaveBeenCalled();
    });

    test("a typesetting error for a formula fails the export without a download", async () => {
        const scene = makeScene();
        const label = addLabel(scene, "", rect(220, 110, 40, 30));
        const formula = addFormula(label, rect(220, 110, 40, 30));
        const restore = installMathItems([{typesetRoot: formula, math: "\\bad", display: false}]);
        try {
            const {download, run} = exportWith(scene, async () => () => { throw new Error("bad tex"); });
            await run();
            expect(download).not.toHaveBeenCalled();
        } finally {
            restore();
        }
    });

    test("cancellation while the typesetter loads downloads nothing", async () => {
        const scene = makeScene();
        let resolveLoad: (typesetter: SvgTypesetter) => void = () => undefined;
        const loading = new Promise<SvgTypesetter>(resolve => { resolveLoad = resolve; });
        let signalLoadStarted: () => void = () => undefined;
        const loadStarted = new Promise<void>(resolve => { signalLoadStarted = resolve; });
        const {download, run} = exportWith(scene, () => { signalLoadStarted(); return loading; });
        const pending = run();
        await loadStarted;
        scene.controller.abort();
        await pending;
        resolveLoad(stubTypesetter);
        expect(download).not.toHaveBeenCalled();
    });
});

test("the real mathjax-full typesetter produces glyph paths without text or font references", async () => {
    const typeset = await loadSvgTypesetter();
    const {viewBox, body} = typeset("p_{0}", false);
    expect(viewBox.split(/\s+/)).toHaveLength(4);
    expect(body).toContain("<path");
    expect(body).toMatch(/\sd="M/);
    expect(body).not.toContain("<text");
    expect(body).not.toContain("font-family");
    expect(body).not.toContain("<use");
    await expect(loadSvgTypesetter()).resolves.toBe(typeset);
});
