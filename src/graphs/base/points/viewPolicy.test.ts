import {describe, expect, it, vi} from "vitest";
import {isOutsideView, refitWhenOutside} from "./viewPolicy";

describe("viewPolicy", () => {
    it("handles the JSXGraph orientation (top above bottom)", () => {
        expect(isOutsideView([-5, 5, 5, -5], [[0, 0]])).toBe(false);
        expect(isOutsideView([-5, 5, 5, -5], [[0, 5.1]])).toBe(true);
    });
    it("handles the flipped orientation", () => {
        expect(isOutsideView([-5, -5, 5, 5], [[0, 0]])).toBe(false);
        expect(isOutsideView([-5, -5, 5, 5], [[-5.1, 0]])).toBe(true);
    });
    it("counts a point exactly on the edge as inside", () => {
        expect(isOutsideView([-5, 5, 5, -5], [[5, 5], [-5, -5]])).toBe(false);
    });
    it("is outside when any framed point is", () => {
        expect(isOutsideView([-5, 5, 5, -5], [[0, 0], [6, 0]])).toBe(true);
    });
    it("refits only when outside and reports it", () => {
        const refit = vi.fn();
        expect(refitWhenOutside([-5, 5, 5, -5], [[1, 1]], refit)).toBe(false);
        expect(refit).not.toHaveBeenCalled();
        expect(refitWhenOutside([-5, 5, 5, -5], [[1, 1], [0, 9]], refit)).toBe(true);
        expect(refit).toHaveBeenCalledTimes(1);
    });
});
