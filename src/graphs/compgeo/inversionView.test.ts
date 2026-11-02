import {describe, expect, it} from "vitest";
import {edgeMarker} from "./inversionView";

describe("edgeMarker", () => {
    const box = [-5, 5, 5, -5];

    it("with the centre inside, a place beyond the cap exits along the direction", () => {
        const marker = edgeMarker(box, {x: 0, y: 0}, {x: 1, y: 0}, 0.3);
        expect(marker?.tip).toEqual({x: 5, y: 0});
        expect(marker?.tail.x).toBeCloseTo(4.7);
    });

    it("with the centre left of the box, a drawn place is clamped onto the boundary and the arrow points towards it", () => {
        const marker = edgeMarker(box, {x: -20, y: 0}, {x: 1, y: 0}, 0.3, {x: 12, y: 2});
        expect(marker).toBeDefined();
        expect(marker!.tip).toEqual({x: 5, y: 2});
        expect(marker!.tail.x).toBeCloseTo(4.7);
        expect(marker!.tail.y).toBeCloseTo(2);
    });

    it("points diagonally from the box towards a corner place and stays finite", () => {
        const marker = edgeMarker(box, {x: -20, y: 0}, {x: 1, y: 0}, 1, {x: 9, y: 8});
        expect(marker!.tip).toEqual({x: 5, y: 5});
        const dx = marker!.tip.x - marker!.tail.x;
        const dy = marker!.tip.y - marker!.tail.y;
        expect(dx).toBeGreaterThan(0);
        expect(dy).toBeGreaterThan(0);
        expect(Object.values(marker!.tail).every(Number.isFinite)).toBe(true);
    });

    it("rejects a non-finite place", () => {
        expect(edgeMarker(box, {x: -20, y: 0}, {x: 1, y: 0}, 0.3, {x: NaN, y: 0})).toBeUndefined();
    });
});
