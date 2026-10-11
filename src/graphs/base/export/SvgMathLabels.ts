/**
 * Adds the board's HTML-rendered labels (JSXGraph `div.JXGtext`, typeset on
 * screen by the CDN MathJax CHTML output) to a clone of the renderer SVG.
 * Formulas are typeset again to SVG paths by a lazily loaded `mathjax-full`
 * (see ADR 0008) so the file needs no fonts. The live DOM is never modified.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** Typesets TeX to the viewBox and inner markup of a MathJax SVG with glyph paths. */
export type SvgTypesetter = (tex: string, display: boolean) => {viewBox: string; body: string};

const TEX_PACKAGES = ["base", "ams", "newcommand", "noundefined", "boldsymbol", "color", "cancel"];

let typesetterPromise: Promise<SvgTypesetter> | undefined;

async function createSvgTypesetter(): Promise<SvgTypesetter> {
    const [{mathjax}, {TeX}, {SVG}, {liteAdaptor}, {RegisterHTMLHandler}] = await Promise.all([
        import("mathjax-full/js/mathjax"),
        import("mathjax-full/js/input/tex"),
        import("mathjax-full/js/output/svg"),
        import("mathjax-full/js/adaptors/liteAdaptor"),
        import("mathjax-full/js/handlers/html"),
        // Importing a configuration registers its package, so no loader or autoload is needed.
        import("mathjax-full/js/input/tex/base/BaseConfiguration"),
        import("mathjax-full/js/input/tex/ams/AmsConfiguration"),
        import("mathjax-full/js/input/tex/newcommand/NewcommandConfiguration"),
        import("mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration"),
        import("mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration"),
        import("mathjax-full/js/input/tex/color/ColorConfiguration"),
        import("mathjax-full/js/input/tex/cancel/CancelConfiguration"),
    ]);
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const document = mathjax.document("", {
        InputJax: new TeX({packages: TEX_PACKAGES}),
        OutputJax: new SVG({fontCache: "none"}),
    });
    return (tex, display) => {
        const container = document.convert(tex, {display});
        const svg = adaptor.firstChild(container);
        // Narrow boundary cast: the lite adaptor types its nodes as the generic LiteNode.
        const viewBox = adaptor.getAttribute(svg as Parameters<typeof adaptor.getAttribute>[0], "viewBox");
        if (typeof viewBox !== "string") throw new Error("MathJax SVG output has no viewBox.");
        return {viewBox, body: adaptor.innerHTML(svg as Parameters<typeof adaptor.innerHTML>[0])};
    };
}

/** Loads `mathjax-full` once, on the first SVG export. A failed load is retried next time. */
export function loadSvgTypesetter(): Promise<SvgTypesetter> {
    if (!typesetterPromise) {
        typesetterPromise = createSvgTypesetter().catch(error => {
            typesetterPromise = undefined;
            throw error;
        });
    }
    return typesetterPromise;
}

type MathItemLike = {typesetRoot?: unknown; math: string; display: boolean; inputJax?: {name?: string}};

/** True for formulas inside MathJax's hidden accessibility MathML copy. */
function isAssistiveCopy(formula: Element, label: Element): boolean {
    const assistive = formula.parentElement?.closest("mjx-assistive-mml");
    return !!assistive && label.contains(assistive);
}
type MathJaxDocumentApi = {
    startup?: {document?: {getMathItemsWithin?: (element: Element) => MathItemLike[]}};
};

function findMathItem(mjxContainer: Element): MathItemLike | undefined {
    const api = (window as Window & {MathJax?: MathJaxDocumentApi}).MathJax;
    const items = api?.startup?.document?.getMathItemsWithin?.(mjxContainer) ?? [];
    return items.find(item => item.typesetRoot === mjxContainer);
}

function cssScale(root: SVGSVGElement, rootRect: DOMRect): number {
    let width = 0;
    try {
        width = root.width.baseVal.value;
    } catch {
        width = parseFloat(root.getAttribute("width") ?? "");
    }
    const scale = rootRect.width / width;
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function effectiveOpacity(element: Element, container: HTMLElement): number {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
        const value = parseFloat(window.getComputedStyle(node).opacity);
        if (Number.isFinite(value)) opacity *= value;
        if (node === container) break;
    }
    return opacity;
}

function isRendered(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse";
}

function intersects(a: DOMRect, b: DOMRect): boolean {
    return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
    name: K,
    attributes: Record<string, string | number>
): SVGElementTagNameMap[K] {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
}

function number(value: number): string {
    return String(Math.round(value * 1000) / 1000);
}

/**
 * Returns a clone of the renderer root with a final group holding the visible
 * labels of `container`. A typeset formula without a MathItem (so no TeX
 * source) cannot be typeset again; it throws instead of silently dropping the
 * formula, which fails the export through the normal failure path.
 */
export function buildSvgWithMathLabels(
    container: HTMLElement,
    rendererRoot: SVGSVGElement,
    typeset: SvgTypesetter
): SVGSVGElement {
    const clone = rendererRoot.cloneNode(true) as SVGSVGElement;
    const rootRect = rendererRoot.getBoundingClientRect();
    const scale = cssScale(rendererRoot, rootRect);
    const group = createSvgElement("g", {class: "bezeg-math-labels"});
    const toX = (screenX: number) => (screenX - rootRect.left) / scale;
    const toY = (screenY: number) => (screenY - rootRect.top) / scale;

    container.querySelectorAll<HTMLElement>("div.JXGtext").forEach(label => {
        const labelRect = label.getBoundingClientRect();
        if (labelRect.width <= 0 || labelRect.height <= 0) return;
        if (!isRendered(label) || !intersects(labelRect, rootRect)) return;
        const opacity = effectiveOpacity(label, container);
        if (opacity <= 0) return;

        const formulas = Array.from(label.querySelectorAll("mjx-container"))
            .filter(formula => !isAssistiveCopy(formula, label));
        if (formulas.length === 0) {
            const text = (label.textContent ?? "").trim();
            if (!text) return;
            const style = window.getComputedStyle(label);
            const fontSize = parseFloat(style.fontSize);
            const element = createSvgElement("text", {
                x: number(toX(labelRect.left)),
                y: number(toY(labelRect.top)),
                "dominant-baseline": "hanging",
                "font-family": style.fontFamily,
                "font-size": number((Number.isFinite(fontSize) ? fontSize : 16) / scale),
                fill: style.color,
            });
            if (opacity < 1) element.setAttribute("opacity", number(opacity));
            element.textContent = text;
            group.appendChild(element);
            return;
        }

        formulas.forEach(formula => {
            if (!isRendered(formula)) return;
            const rect = formula.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0 || !intersects(rect, rootRect)) return;
            const item = findMathItem(formula);
            if (!item) throw new Error("A typeset formula has no MathJax source to export.");
            // Only a TeX source can be typeset again; fail loudly for any other input jax.
            if (item.inputJax?.name !== "TeX") throw new Error("A typeset formula was not written in TeX and cannot be exported.");
            const {viewBox, body} = typeset(item.math, item.display);
            const nested = createSvgElement("svg", {
                x: number(toX(rect.left)),
                y: number(toY(rect.top)),
                width: number(rect.width / scale),
                height: number(rect.height / scale),
                viewBox,
                overflow: "visible",
                color: window.getComputedStyle(formula).color,
            });
            if (opacity < 1) nested.setAttribute("opacity", number(opacity));
            // The body is markup produced by MathJax's SVG output from the TeX source.
            nested.innerHTML = body;
            group.appendChild(nested);
        });
    });

    clone.appendChild(group);
    return clone;
}
