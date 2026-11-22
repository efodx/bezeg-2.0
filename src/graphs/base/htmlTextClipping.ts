import type {Board} from "jsxgraph";

const patchedRenderers = new WeakSet<object>();

/**
 * JSXGraph 1.14 calls `updateClipPath` for every HTML text on every board update. It reads the text's `offsetWidth` and
 * `offsetHeight` before it checks the `clip` attribute, so each label forces a synchronous layout, even with
 * `clip: false`. The clip only limits the label to the board canvas, which the SVG renderer already does by giving the
 * board container `overflow: hidden` (`renderer/svg.js`). On `/bezier/decasteljau` playback at 6× CPU throttling the
 * forced layouts took about 18% of main-thread time (docs/bezier-performance-results.md).
 *
 * On a board whose container clips its overflow, this skips the label clip and clears one set earlier. A board whose
 * container does not clip keeps JSXGraph's behavior. JSXGraph 1.9.2 named the hook `setObjectViewport`; the upgrade to
 * 1.14.1 renamed it and an earlier version of this patch silently stopped applying. `htmlTextClipping.test.ts` runs a
 * real board so that a future rename fails a test.
 */
export function skipRedundantHtmlTextClipping(board: Board): void {
    const renderer = board.renderer as any;
    if (!renderer || typeof renderer.updateClipPath !== "function" || patchedRenderers.has(renderer)) return;
    const container = renderer.container as HTMLElement | undefined;
    if (container?.style?.overflow !== "hidden") return;
    patchedRenderers.add(renderer);
    renderer.updateClipPath = function (element: any) {
        const style = element?.rendNode?.style as CSSStyleDeclaration | undefined;
        if (style?.clipPath) style.removeProperty("clip-path");
    };
}
