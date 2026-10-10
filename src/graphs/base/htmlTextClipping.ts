import {Board} from "jsxgraph";

const patchedRenderers = new WeakSet<object>();

function evaluate(value: unknown): unknown {
    return typeof value === "function" ? value() : value;
}

function isZeroViewport(viewport: unknown): boolean {
    return Array.isArray(viewport) && viewport.length === 4 && viewport.every(side => parseFloat(String(side)) === 0);
}

/**
 * JSXGraph 1.9.2 clips every HTML text to the board viewport on each style update. It reads the
 * text's and the container's bounding rectangles and then writes a clip path, forcing a synchronous
 * layout per label on every board update. With the default zero viewport that clip only repeats the
 * board container's own overflow clipping, so this board skips it for HTML texts. Non-zero
 * viewports and SVG elements keep JSXGraph's behavior.
 */
export function skipRedundantHtmlTextClipping(board: Board): void {
    const renderer = board.renderer as any;
    if (!renderer || typeof renderer.setObjectViewport !== "function" || patchedRenderers.has(renderer)) return;
    patchedRenderers.add(renderer);
    const original = renderer.setObjectViewport;
    renderer.setObjectViewport = function (element: any, isHtml?: boolean) {
        if (isHtml) {
            let viewport = evaluate(element.visProp?.viewport);
            if (viewport === "inherit") viewport = evaluate((board as any).attr?.viewport);
            if (isZeroViewport(viewport)) {
                // Clear a clip computed before this board was patched; it would no longer follow the label.
                const node = element.rendNode as HTMLElement | undefined;
                if (node?.style.clipPath) node.style.clipPath = "";
                return;
            }
        }
        return original.call(this, element, isHtml);
    };
}
