import {describe, expect, it} from "vitest";
import {fitBoundingBox, FitBox} from "../../graphs/base/fitBoundingBox";
import {convexHull} from "./hull";
import {fitView, FitInput, Point, Rect} from "./viewFit";

const W = 800, H = 600;
const BASE: FitBox = [-8, 6, 8, -6]; // 50 px per unit, centre (0, 0)
const MARGIN = 50;

function input(over: Partial<FitInput>): FitInput {
    return {
        must: [], canvas: {width: W, height: H}, obstacles: [], base: BASE, equalAxisUnits: true,
        limits: {maxOut: 1.6, maxIn: 1.6}, mode: 'keep', ...over,
    };
}

function toPx(box: FitBox, p: Point): [number, number] {
    return [(p[0] - box[0]) / (box[2] - box[0]) * W, (box[1] - p[1]) / (box[1] - box[3]) * H];
}

/** World point at canvas pixel (px, py) in the base view. */
function world(px: number, py: number): Point {
    return [(px - W / 2) / 50, -(py - H / 2) / 50];
}

/** Asserts the hull of the points lies inside the canvas margin and outside every obstacle grown by the margin. */
function expectClear(box: FitBox, points: readonly Point[], obstacles: readonly Rect[]) {
    const hull = convexHull(points);
    const px = hull.map(p => toPx(box, p));
    const samples: [number, number][] = [];
    for (let i = 0; i < px.length; i++) {
        const a = px[i], b = px[(i + 1) % px.length];
        for (let t = 0; t <= 1; t += 0.01) samples.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
    for (const [x, y] of samples) {
        expect(x).toBeGreaterThanOrEqual(MARGIN - 1e-4);
        expect(x).toBeLessThanOrEqual(W - MARGIN + 1e-4);
        expect(y).toBeGreaterThanOrEqual(MARGIN - 1e-4);
        expect(y).toBeLessThanOrEqual(H - MARGIN + 1e-4);
        for (const o of obstacles) {
            const inside = x > o.x - MARGIN + 1e-4 && x < o.x + o.width + MARGIN - 1e-4
                && y > o.y - MARGIN + 1e-4 && y < o.y + o.height + MARGIN - 1e-4;
            expect(inside).toBe(false);
        }
    }
}

describe('convexHull', () => {
    it('handles 0, 1, 2 points and duplicates', () => {
        expect(convexHull([])).toEqual([]);
        expect(convexHull([[1, 2]])).toEqual([[1, 2]]);
        expect(convexHull([[1, 2], [1, 2], [1, 2]])).toEqual([[1, 2]]);
        expect(convexHull([[0, 0], [2, 2]])).toEqual([[0, 0], [2, 2]]);
    });

    it('drops collinear and interior points and non-finite points', () => {
        const hull = convexHull([[0, 0], [1, 0], [2, 0], [2, 2], [0, 2], [1, 1], [NaN, 3], [Infinity, 0]]);
        expect(hull).toEqual([[0, 0], [2, 0], [2, 2], [0, 2]]);
    });

    it('reduces collinear input to its two extremes and is counter-clockwise', () => {
        expect(convexHull([[0, 0], [1, 1], [2, 2], [3, 3]])).toEqual([[0, 0], [3, 3]]);
        const tri = convexHull([[0, 0], [4, 0], [0, 3]]);
        const area = tri.reduce((s, p, i) => s + p[0] * tri[(i + 1) % 3][1] - tri[(i + 1) % 3][0] * p[1], 0);
        expect(area).toBeGreaterThan(0);
    });
});

describe('fitView', () => {
    it("keep without obstacles in the way returns the base view unchanged", () => {
        const r = fitView(input({must: [[1, 1], [-2, 0]], nice: [[3, 2]], obstacles: [{x: 600, y: 0, width: 200, height: 80}]}));
        expect(r.tier).toBe('all');
        expect(r.scaleFactor).toBe(1);
        r.box.forEach((v, i) => expect(v).toBeCloseTo(BASE[i], 9));
        expect(r.covered).toEqual([]);
    });

    it('fill with no obstacles matches fitBoundingBox scale for equal units', () => {
        const pts: Point[] = [[-3, -2], [5, 1], [0, 3]];
        const ref = fitBoundingBox(pts, W, H)!;
        const r = fitView(input({must: pts, mode: 'fill', limits: {maxOut: 4, maxIn: 4}}));
        expect(r.tier).toBe('must');
        const refScale = W / (ref[2] - ref[0]);
        expect(W / (r.box[2] - r.box[0])).toBeCloseTo(refScale, 1);
        expect(W / (r.box[2] - r.box[0]) / refScale).toBeCloseTo(1, 3);
        expectClear(r.box, pts, []);
    });

    it('fill centres the hull when the base is centred far away', () => {
        const pts: Point[] = [[100, 50], [104, 52], [101, 55]];
        const r = fitView(input({must: pts, mode: 'fill'}));
        const px = pts.map(p => toPx(r.box, p));
        const cx = (Math.min(...px.map(p => p[0])) + Math.max(...px.map(p => p[0]))) / 2;
        const cy = (Math.min(...px.map(p => p[1])) + Math.max(...px.map(p => p[1]))) / 2;
        expect(Math.abs(cx - W / 2)).toBeLessThan(1);
        expect(Math.abs(cy - H / 2)).toBeLessThan(1);
    });

    it('a top-right card over a must point pans only', () => {
        const card: Rect = {x: 500, y: 0, width: 300, height: 250};
        const must: Point[] = [[6, 4]]; // pixel (700, 100), under the card
        const r = fitView(input({must, obstacles: [card], limits: {maxOut: 1, maxIn: 1}}));
        expect(r.tier).toBe('must');
        expect(r.scaleFactor).toBe(1);
        expect(r.box[2] - r.box[0]).toBeCloseTo(16, 9);
        expect(r.box[1] - r.box[3]).toBeCloseTo(12, 9);
        expect(Math.hypot(r.box[0] + 8, r.box[1] - 6)).toBeGreaterThan(1);
        expect(r.covered).toEqual([]);
        expectClear(r.box, must, [card]);
        // Smallest pan: 250 px (5 units) sideways or down, nothing larger.
        const pan = Math.hypot(r.box[0] + 8, r.box[1] - 6) * 50;
        expect(pan).toBeLessThan(250 + 1e-3);
    });

    it('uses the hull, not its bounding box, in an L-shaped free area', () => {
        const card: Rect = {x: 400, y: 0, width: 400, height: 300}; // top-right quadrant covered
        const must = [world(100, 300), world(100, 500), world(700, 540)];
        const bbox = {x: 100, y: 300, width: 600, height: 240};
        // The bounding box of the points overlaps the card grown by the margin, the triangle does not.
        expect(bbox.x + bbox.width).toBeGreaterThan(card.x - MARGIN);
        expect(bbox.y).toBeLessThan(card.y + card.height + MARGIN);
        const r = fitView(input({must, obstacles: [card], limits: {maxOut: 1, maxIn: 1}}));
        expect(r.tier).toBe('must');
        expect(r.scaleFactor).toBe(1);
        r.box.forEach((v, i) => expect(v).toBeCloseTo(BASE[i], 6));
        expectClear(r.box, must, [card]);
    });

    it('zooms out stepwise within the limit only when panning is not enough', () => {
        const must: Point[] = [[-10, 0], [10, 0]];
        const r = fitView(input({must}));
        expect(r.tier).toBe('must');
        expect(r.scaleFactor).toBeLessThan(1);
        expect(r.scaleFactor).toBeGreaterThanOrEqual(1 / 1.6 - 1e-9);
        expect(r.scaleFactor).toBeGreaterThan(0.6);
        expectClear(r.box, must, []);
        expect(r.covered).toEqual([]);
    });

    it('respects limits in both modes', () => {
        const wide: Point[] = [[-40, 0], [40, 0]];
        const out = fitView(input({must: wide, mode: 'fill'}));
        expect(out.tier).toBe('none');
        expect(out.scaleFactor).toBeCloseTo(1 / 1.6, 9);
        expect(out.covered.length).toBe(2);
        const tiny = fitView(input({must: [[0, 0]], mode: 'fill', limits: {maxOut: 2, maxIn: 3}}));
        expect(tiny.scaleFactor).toBeCloseTo(3, 9);
        const keep = fitView(input({must: [[0, 0]], mode: 'keep', limits: {maxOut: 2, maxIn: 3}}));
        expect(keep.scaleFactor).toBe(1);
    });

    it('falls back from must+nice to must', () => {
        const card: Rect = {x: 0, y: 0, width: 800, height: 100};
        const r = fitView(input({must: [[0, -1]], nice: [[0, 5.5], [0, -5.5]], obstacles: [card], limits: {maxOut: 1, maxIn: 1}}));
        expect(r.tier).toBe('must');
        expect(r.covered).toEqual([]);
        expectClear(r.box, [[0, -1]], [card]);
    });

    it('tries must+nice+reach first, then must+nice, then must', () => {
        const card: Rect = {x: 0, y: 0, width: 800, height: 100};
        const lim = {maxOut: 1, maxIn: 1};
        const ok = fitView(input({must: [[0, -1]], nice: [[0, -2]], reach: [[0, -3]], obstacles: [card], limits: lim}));
        expect(ok.tier).toBe('reach');
        const noReach = fitView(input({must: [[0, -1]], nice: [[0, -2]], reach: [[0, 5.5], [0, -5.5]], obstacles: [card], limits: lim}));
        expect(noReach.tier).toBe('all');
        const mustOnly = fitView(input({must: [[0, -1]], nice: [[0, 5.5], [0, -5.5]], reach: [[0, -3]], obstacles: [card], limits: lim}));
        expect(mustOnly.tier).toBe('must');
    });

    it('returns tier none and the covered must points when nothing clears', () => {
        const wall: Rect = {x: 0, y: 0, width: W, height: H};
        const r = fitView(input({must: [[0, 0], [1, 1]], obstacles: [wall]}));
        expect(r.tier).toBe('none');
        expect(r.scaleFactor).toBeCloseTo(1 / 1.6, 9);
        expect(r.covered.length).toBe(2);
        // Partial cover: a card hides one of two far-apart points and cannot be avoided at the limit.
        const left: Rect = {x: 0, y: 0, width: 420, height: H};
        const right: Rect = {x: 380, y: 0, width: 420, height: H};
        const r2 = fitView(input({must: [[-3, 0], [3, 0]], obstacles: [left, right]}));
        expect(r2.tier).toBe('none');
        expect(r2.covered.length).toBeGreaterThan(0);
    });

    it('supports non-equal axis units', () => {
        const base: FitBox = [0, 10, 10, 0]; // 80 px/unit in x, 60 in y
        const must: Point[] = [[-5, 5], [15, 5]];
        const r = fitView(input({must, base, equalAxisUnits: false, limits: {maxOut: 3, maxIn: 1}}));
        expect(r.tier).toBe('must');
        expect(r.scaleFactor).toBeLessThan(1);
        // The axis ratio of the base view is kept.
        expect(W / (r.box[2] - r.box[0]) / (H / (r.box[1] - r.box[3]))).toBeCloseTo(80 / 60, 9);
        expectClear(r.box, must, []);
        const same = fitView(input({must: [[5, 5]], base, equalAxisUnits: false}));
        same.box.forEach((v, i) => expect(v).toBeCloseTo(base[i], 9));
    });

    it('is idempotent: the same input gives the same box', () => {
        const i = input({
            must: [[6, 4], [2, 1]], nice: [[0, 0], [-4, 2]], mode: 'fill',
            obstacles: [{x: 500, y: 0, width: 300, height: 250}, {x: 0, y: 450, width: 200, height: 150}],
        });
        expect(fitView(i)).toEqual(fitView(i));
        const keep = {...i, mode: 'keep' as const};
        expect(fitView(keep)).toEqual(fitView(keep));
    });

    it('stays under a few milliseconds for 12 must + 40 nice points and 6 obstacles', () => {
        const must: Point[] = [];
        for (let k = 0; k < 12; k++) must.push([3 * Math.cos(k * 0.5), 2 * Math.sin(k * 0.5)]);
        const nice: Point[] = [];
        for (let k = 0; k < 40; k++) nice.push([4 * Math.cos(k * 0.157), 3 * Math.sin(k * 0.157)]);
        const obstacles: Rect[] = [
            {x: 560, y: 10, width: 230, height: 180}, {x: 10, y: 10, width: 200, height: 120},
            {x: 10, y: 440, width: 220, height: 150}, {x: 600, y: 420, width: 190, height: 170},
            {x: 300, y: 530, width: 150, height: 60}, {x: 330, y: 5, width: 120, height: 50},
        ];
        const fit = (mode: 'keep' | 'fill') => fitView(input({must, nice, obstacles, mode, limits: {maxOut: 1.6, maxIn: 1.6}}));
        const times: Record<string, number> = {};
        for (const mode of ['keep', 'fill'] as const) {
            fit(mode);
            const n = 30;
            const t0 = performance.now();
            for (let k = 0; k < n; k++) fit(mode);
            times[mode] = (performance.now() - t0) / n;
        }
        expect(times.keep).toBeLessThan(30);
        expect(times.fill).toBeLessThan(30);
    });
});
