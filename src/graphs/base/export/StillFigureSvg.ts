/**
 * SVG figure for a view that renders raster pixels, such as a WebGL surface. The pixels are one `<image>` of the
 * current depth-correct render; the labels the view reports as visible are vector formulas typeset like the labels of
 * a curve graph (ADR 0008). Occluded and off-screen labels are left out. The geometry in such an SVG stays raster
 * (ADR 0018); only the labels are vector.
 */
import type {SvgTypesetter} from "./SvgMathLabels";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

/** One label in the figure's CSS-pixel coordinates; `text` is the LaTeX source. */
export interface StillFigureLabel {
    id: string;
    text: string;
    x: number;
    y: number;
    visible: boolean;
}

/** The current render of a view: image plus label layout. */
export interface StillFigure {
    /** PNG data URL of the render. */
    dataUrl: string;
    /** CSS pixels. */
    width: number;
    height: number;
    labels: readonly StillFigureLabel[];
}

/** How the view's on-screen labels are drawn, so the vector labels match them. */
export interface StillLabelStyle {
    fontPx: number;
    /** The label starts this far right of its anchor and is centred on it vertically. */
    offsetXPx: number;
    color: string;
}

function round(value: number): string {
    return String(Math.round(value * 1000) / 1000);
}

/** MathJax SVG output measures in 1/1000 em, so the viewBox width and height give the formula's size at any font size. */
function viewBoxSize(viewBox: string): {width: number; height: number} {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 4 || !parts.every(Number.isFinite)) throw new Error("MathJax SVG output has an invalid viewBox.");
    return {width: parts[2] / 1000, height: parts[3] / 1000};
}

export function buildStillFigureSvg(figure: StillFigure, typeset: SvgTypesetter, style: StillLabelStyle): SVGSVGElement {
    const root = document.createElementNS(SVG_NS, "svg");
    root.setAttribute("width", round(figure.width));
    root.setAttribute("height", round(figure.height));
    root.setAttribute("viewBox", `0 0 ${round(figure.width)} ${round(figure.height)}`);

    const image = document.createElementNS(SVG_NS, "image");
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("width", round(figure.width));
    image.setAttribute("height", round(figure.height));
    image.setAttribute("href", figure.dataUrl);
    image.setAttributeNS(XLINK_NS, "xlink:href", figure.dataUrl);
    root.appendChild(image);

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "bezeg-math-labels");
    for (const label of figure.labels) {
        if (!label.visible) continue;
        const {viewBox, body} = typeset(label.text, false);
        const size = viewBoxSize(viewBox);
        const width = size.width * style.fontPx, height = size.height * style.fontPx;
        const nested = document.createElementNS(SVG_NS, "svg");
        nested.setAttribute("data-label-id", label.id);
        nested.setAttribute("x", round(label.x + style.offsetXPx));
        nested.setAttribute("y", round(label.y - height / 2));
        nested.setAttribute("width", round(width));
        nested.setAttribute("height", round(height));
        nested.setAttribute("viewBox", viewBox);
        nested.setAttribute("overflow", "visible");
        nested.setAttribute("color", style.color);
        // The body is markup produced by MathJax's SVG output from the TeX source.
        nested.innerHTML = body;
        group.appendChild(nested);
    }
    root.appendChild(group);
    return root;
}
