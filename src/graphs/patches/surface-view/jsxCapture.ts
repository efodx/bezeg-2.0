/**
 * Still capture of the JSXGraph surface view (task 05 of docs/specs/jsxgraph-surface-view.md).
 *
 * The board is an SVG tree of plain paths, so the capture serialises a copy of it into a self-contained
 * `data:image/svg+xml` image (no external image, font or style sheet, no foreignObject) and draws that onto a canvas
 * on a white background, the Three view's clear colour. Such an image never taints the canvas, so `toDataURL` works.
 * The figure's labels are not part of it: the host's label overlay places them (see `SurfaceLabelOverlay.showStill`).
 */

export const CAPTURE_BACKGROUND = '#ffffff';

export interface CaptureSize {
    width: number;
    height: number;
}

/** The browser services the rasteriser needs; replaced in tests, where jsdom has neither an image decoder nor a canvas. */
export interface RasterServices {
    loadImage(url: string): Promise<CanvasImageSource>;
    createCanvas(width: number, height: number): HTMLCanvasElement;
    pixelRatio: number;
}

export function browserRasterServices(): RasterServices {
    return {
        loadImage: url => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('The surface drawing could not be decoded as an image.'));
            image.src = url;
        }),
        createCanvas: (width, height) => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            return canvas;
        },
        pixelRatio: Math.min(globalThis.devicePixelRatio || 1, 2),
    };
}

/** A standalone SVG document of `svg`'s current content, `size` CSS pixels large. The live tree is not touched. */
export function serializeBoardSvg(svg: SVGSVGElement, size: CaptureSize): string {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('width', String(size.width));
    copy.setAttribute('height', String(size.height));
    copy.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
    // JSXGraph centres its drawing by CSS on the live element; the standalone image is exactly the viewBox.
    copy.removeAttribute('style');
    // JSXGraph keeps an empty foreignObject for HTML text; the surface board has none, and some browsers taint on it.
    copy.querySelectorAll('foreignObject').forEach(node => node.remove());
    return new XMLSerializer().serializeToString(copy);
}

/** The PNG data URL of `svg` at `size` CSS pixels (times the pixel ratio, at most 2). */
export async function rasterizeBoard(
    svg: SVGSVGElement, size: CaptureSize, services: RasterServices = browserRasterServices(),
): Promise<string> {
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeBoardSvg(svg, size))}`;
    const image = await services.loadImage(url);
    const ratio = services.pixelRatio;
    const canvas = services.createCanvas(Math.round(size.width * ratio), Math.round(size.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot draw the surface figure.');
    context.fillStyle = CAPTURE_BACKGROUND;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}
