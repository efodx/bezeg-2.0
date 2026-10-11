import {fitBoundingBox, FIT_MARGIN_PX, FIT_MIN_SPAN, FitPoint} from "./fitBoundingBox";

function expectFitted(points: readonly FitPoint[], width: number, height: number) {
    const margin = Math.min(FIT_MARGIN_PX, 0.1 * Math.min(width, height));
    const box = fitBoundingBox(points, width, height);
    expect(box).toBeDefined();
    const [left, top, right, bottom] = box!;
    expect((right - left) / (top - bottom)).toBeCloseTo(width / height, 9);
    const scale = width / (right - left);
    expect(height / (top - bottom)).toBeCloseTo(scale, 9);
    for (const [x, y] of points) {
        const px = (x - left) * scale;
        const py = (top - y) * scale;
        expect(px).toBeGreaterThanOrEqual(margin - 1e-6);
        expect(width - px).toBeGreaterThanOrEqual(margin - 1e-6);
        expect(py).toBeGreaterThanOrEqual(margin - 1e-6);
        expect(height - py).toBeGreaterThanOrEqual(margin - 1e-6);
    }
    return {box: box!, scale};
}

describe('fitBoundingBox', () => {
    it('returns undefined for empty input or unusable canvas', () => {
        expect(fitBoundingBox([], 800, 600)).toBeUndefined();
        expect(fitBoundingBox([[0, 0]], 0, 600)).toBeUndefined();
        expect(fitBoundingBox([[0, 0]], 800, -1)).toBeUndefined();
        expect(fitBoundingBox([[0, 0]], NaN, 600)).toBeUndefined();
    });

    it('is a pure function of points and canvas, so repeated fits are identical', () => {
        const points: FitPoint[] = [[-3, 1], [4, 7], [2, -2]];
        expect(fitBoundingBox(points, 900, 500)).toEqual(fitBoundingBox(points, 900, 500));
        expect(fitBoundingBox([...points].reverse(), 900, 500)).toEqual(fitBoundingBox(points, 900, 500));
    });

    it.each([
        ['wide points, wide canvas', [[-10, 0], [10, 2]], 1000, 500],
        ['wide points, tall canvas', [[-10, 0], [10, 2]], 400, 900],
        ['tall points, wide canvas', [[0, -10], [2, 10]], 1000, 500],
        ['tall points, tall canvas', [[0, -10], [2, 10]], 400, 900],
    ] as [string, FitPoint[], number, number][])('frames %s with margin and equal scale', (_name, points, width, height) => {
        const {scale} = expectFitted(points, width, height);
        const spanX = Math.abs(points[1][0] - points[0][0]);
        const spanY = Math.abs(points[1][1] - points[0][1]);
        const margin = Math.min(FIT_MARGIN_PX, 0.1 * Math.min(width, height));
        const expected = Math.min((width - 2 * margin) / spanX, (height - 2 * margin) / spanY);
        expect(scale).toBeCloseTo(expected, 9);
    });

    it('does not force the origin into view', () => {
        const {box} = expectFitted([[100, 100], [104, 103]], 800, 600);
        const [left, top, right, bottom] = box;
        expect(left).toBeGreaterThan(0);
        expect(bottom).toBeGreaterThan(0);
        expect(right).toBeGreaterThan(left);
        expect(top).toBeGreaterThan(bottom);
    });

    it('centers the points', () => {
        const [left, top, right, bottom] = fitBoundingBox([[10, 20], [14, 21]], 800, 600)!;
        expect((left + right) / 2).toBeCloseTo(12, 9);
        expect((top + bottom) / 2).toBeCloseTo(20.5, 9);
    });

    it('uses the minimum span for a single point', () => {
        const {scale, box} = expectFitted([[5, -7]], 800, 600);
        expect(scale).toBeCloseTo(Math.min(700 / FIT_MIN_SPAN, 500 / FIT_MIN_SPAN), 9);
        expect((box[0] + box[2]) / 2).toBeCloseTo(5, 9);
        expect((box[1] + box[3]) / 2).toBeCloseTo(-7, 9);
        expect(fitBoundingBox([[5, -7], [5, -7]], 800, 600)).toEqual(box);
    });

    it('handles collinear points on horizontal and vertical lines', () => {
        const horizontal = expectFitted([[-5, 3], [5, 3], [0, 3]], 800, 600);
        expect(horizontal.scale).toBeCloseTo(700 / 10, 9);
        const vertical = expectFitted([[3, -5], [3, 5]], 800, 600);
        expect(vertical.scale).toBeCloseTo(500 / 10, 9);
    });

    it('reduces the margin on small canvases and keeps the content area positive', () => {
        const {scale} = expectFitted([[-1, -1], [1, 1]], 120, 80);
        expect(scale).toBeCloseTo((80 - 16) / 2, 9);
        const tiny = fitBoundingBox([[0, 0], [10, 10]], 20, 20)!;
        expect(tiny.every(Number.isFinite)).toBe(true);
        expect(tiny[2]).toBeGreaterThan(tiny[0]);
    });

    it('ignores non-finite coordinates', () => {
        expect(fitBoundingBox([[NaN, 1], [Infinity, 2]], 800, 600)).toBeUndefined();
        expect(fitBoundingBox([[NaN, 1], [0, 0], [2, 2]], 800, 600)).toEqual(fitBoundingBox([[0, 0], [2, 2]], 800, 600));
    });
});
