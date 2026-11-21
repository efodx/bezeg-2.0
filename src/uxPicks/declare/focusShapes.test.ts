import {FocusShape, samplePoints} from "./focusShapes";
import {fitView} from "./viewFit";

describe('samplePoints', () => {
    it('point and segment', () => {
        expect(samplePoints([{kind: 'point', at: [1, 2]}, {kind: 'segment', from: [0, 0], to: [3, 4]}]))
            .toEqual([[1, 2], [0, 0], [3, 4]]);
    });

    it('curve: endpoints included, default count, non-finite dropped', () => {
        const pts = samplePoints([{kind: 'curve', f: x => x * x, from: -2, to: 2}]);
        expect(pts.length).toBe(25);
        expect(pts[0]).toEqual([-2, 4]);
        expect(pts[pts.length - 1]).toEqual([2, 4]);
        const withPole = samplePoints([{kind: 'curve', f: x => 1 / x, from: -1, to: 1, samples: 10}]);
        expect(withPole.every(p => Number.isFinite(p[1]))).toBe(true);
        expect(withPole.length).toBeLessThan(11 + 6);
        expect(samplePoints([{kind: 'curve', f: () => NaN, from: 0, to: 1}])).toEqual([]);
    });

    it('curve: steep parts are refined and yRange clamps', () => {
        const steep = samplePoints([{kind: 'curve', f: x => Math.exp(10 * x), from: 0, to: 1, samples: 8}]);
        expect(steep.length).toBeGreaterThan(9);
        expect(steep[steep.length - 1][0]).toBe(1);
        const clamped = samplePoints([{kind: 'curve', f: x => 1 / (x - 0.5), from: 0, to: 1, samples: 10}], {yRange: [-5, 5]});
        expect(Math.max(...clamped.map(p => Math.abs(p[1])))).toBeLessThanOrEqual(5);
    });

    it('parametric: endpoints and count', () => {
        const pts = samplePoints([{kind: 'parametric', p: t => [Math.cos(t), Math.sin(t)], from: 0, to: Math.PI, samples: 12}]);
        expect(pts.length).toBeGreaterThanOrEqual(13);
        expect(pts[0][0]).toBeCloseTo(1, 9);
        expect(pts[pts.length - 1][0]).toBeCloseTo(-1, 9);
        expect(samplePoints([{kind: 'parametric', p: t => [t, t === 0 ? Infinity : t], from: 0, to: 1, samples: 4}]).length).toBe(4);
    });

    it('line gives the two ends of the interval', () => {
        expect(samplePoints([{kind: 'line', through: [1, 1], direction: [2, 1], from: -1, to: 3}]))
            .toEqual([[-1, 0], [7, 4]]);
    });

    it('region, disc and band', () => {
        expect(samplePoints([{kind: 'region', polygon: [[0, 0], [1, 0], [NaN, 1]]}])).toEqual([[0, 0], [1, 0]]);
        const disc = samplePoints([{kind: 'disc', centre: [1, 1], radius: 2}]);
        expect(disc.length).toBe(24);
        for (const p of disc) expect(Math.hypot(p[0] - 1, p[1] - 1)).toBeCloseTo(2, 9);
        expect(samplePoints([{kind: 'disc', centre: [0, 0], radius: 1, samples: 8}]).length).toBe(8);
        expect(samplePoints([{kind: 'band', y: [-1, 1], over: [0, 5]}]))
            .toEqual([[0, -1], [5, -1], [0, 1], [5, 1]]);
        expect(samplePoints([{kind: 'band', x: [2, 3], over: [-1, 1]}]))
            .toEqual([[2, -1], [2, 1], [3, -1], [3, 1]]);
    });

    it('end to end: curve + segment fit clears a card', () => {
        const shapes: FocusShape[] = [
            {kind: 'curve', f: x => Math.sin(x), from: -4, to: 4},
            {kind: 'segment', from: [3, 1], to: [3, -1]},
        ];
        const card = {x: 560, y: 0, width: 240, height: 200};
        const r = fitView({
            must: samplePoints(shapes), canvas: {width: 800, height: 600}, obstacles: [card],
            base: [-8, 6, 8, -6], equalAxisUnits: true, limits: {maxOut: 1.6, maxIn: 1.6}, mode: 'keep',
        });
        expect(r.tier).toBe('must');
        expect(r.covered).toEqual([]);
        // The segment top (3, 1) must be clear of the card grown by the 50 px margin.
        const [l, t, rr, b] = r.box;
        const px = (3 - l) / (rr - l) * 800, py = (t - 1) / (t - b) * 600;
        const inside = px > card.x - 50 && py < card.y + card.height + 50;
        expect(inside).toBe(false);
    });
});
