import {describe, expect, it} from "vitest";
import {clipPolylineToBand} from "./curveViewClip";

describe("clipPolylineToBand", () => {
    it("keeps a path inside the band unchanged", () => {
        expect(clipPolylineToBand([0, 1, 2], [0, 1, 0], -2, 2)).toEqual({x: [0, 1, 2], y: [0, 1, 0]});
    });

    it("cuts a steep segment on its own line at the band edge", () => {
        const {x, y} = clipPolylineToBand([0, 1], [0, 1000], -10, 10);
        expect(y).toEqual([0, 10]);
        expect(x[1]).toBeCloseTo(0.01, 12);
    });

    it("drops parts outside the band and restarts with a break", () => {
        const {x, y} = clipPolylineToBand([0, 1, 2, 3], [0, 100, -100, 0], -10, 10);
        expect(y.every(v => Number.isNaN(v) || Math.abs(v) <= 10)).toBe(true);
        expect(x.filter(Number.isNaN).length).toBeGreaterThan(0);
        expect(x.length).toBeLessThan(10);
    });

    it("omits a segment that stays outside", () => {
        expect(clipPolylineToBand([0, 1], [50, 60], -10, 10)).toEqual({x: [], y: []});
    });
});
