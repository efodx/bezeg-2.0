/** Largest pixel margin kept between the fitted points and the canvas edges. */
export const FIT_MARGIN_PX = 50;
/** Smallest fitted extent per axis, in user units, so single or collinear points do not zoom without bound. */
export const FIT_MIN_SPAN = 2;

export type FitPoint = readonly [number, number];
/** [left, top, right, bottom] in user coordinates, the order used by JSXGraph bounding boxes. */
export type FitBox = [number, number, number, number];

/**
 * Computes the bounding box that shows all points with equal scale on both axes.
 *
 * The result depends only on the points and the canvas size, never on the current view, so applying it
 * repeatedly yields the same box. The origin is not forced into view. The box has exactly the canvas
 * aspect ratio, the points are centered, and each lies at least the margin (at most FIT_MARGIN_PX, reduced
 * to 10% of the shorter canvas side on small canvases) away from every edge in pixels.
 */
export function fitBoundingBox(points: readonly FitPoint[], width: number, height: number): FitBox | undefined {
    if (!(width > 0) || !(height > 0)) return undefined;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    if (minX > maxX) return undefined;

    const margin = Math.min(FIT_MARGIN_PX, 0.1 * Math.min(width, height));
    const spanX = Math.max(maxX - minX, FIT_MIN_SPAN);
    const spanY = Math.max(maxY - minY, FIT_MIN_SPAN);
    const scale = Math.min((width - 2 * margin) / spanX, (height - 2 * margin) / spanY);
    const halfWidth = width / scale / 2;
    const halfHeight = height / scale / 2;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return [centerX - halfWidth, centerY + halfHeight, centerX + halfWidth, centerY - halfHeight];
}
