import {describe, expect, it} from "vitest";
import {BISECTION_ZOOM_LIMIT, bisectionIntentBox} from "./bisectionView";

const base: [number, number, number, number] = [-2.5, 4, 3.5, -3];
const f = (x: number) => x * x - 2;

describe("bisectionIntentBox", () => {
    it("step 0 is the starting view unchanged", () => {
        expect(bisectionIntentBox({base, step: 0, a: 1, b: 2, f})).toEqual(base);
    });

    it("centres on the bracket, which fills 60 % of the width", () => {
        const [l, , r] = bisectionIntentBox({base, step: 1, a: 1.25, b: 1.5, f});
        expect((l + r) / 2).toBeCloseTo(1.375, 12);
        expect((1.5 - 1.25) / (r - l)).toBeCloseTo(0.6, 12);
    });

    it("covers y = 0 and f over the x-range, with 15 % padding", () => {
        const [l, top, r, bottom] = bisectionIntentBox({base, step: 1, a: 1, b: 2, f});
        let lo = 0, hi = 0;
        for (let i = 0; i <= 200; i++) { const y = f(l + (r - l) * i / 200); lo = Math.min(lo, y); hi = Math.max(hi, y); }
        expect(top).toBeGreaterThan(hi);
        expect(bottom).toBeLessThan(lo);
        expect(top).toBeCloseTo(hi + 0.15 * (hi - lo), 1);
    });

    it("never exceeds the starting view", () => {
        const [l, top, r, bottom] = bisectionIntentBox({base, step: 1, a: -2, b: 3, f: x => x * x * x * 50});
        expect(r - l).toBeLessThanOrEqual(6 + 1e-12);
        expect(top - bottom).toBeLessThanOrEqual(7 + 1e-12);
    });

    it("stops zooming in at 2^12 times the starting width", () => {
        const box = bisectionIntentBox({base, step: 40, a: 1.41421356, b: 1.41421356 + 1e-12, f});
        expect(box[2] - box[0]).toBeCloseTo(6 / BISECTION_ZOOM_LIMIT, 12);
    });

    it("keeps the starting view when the bracket is not usable", () => {
        expect(bisectionIntentBox({base, step: 2, a: 2, b: 1, f})).toEqual(base);
    });

    describe("with equal axis units (aspect)", () => {
        const aspect = 1300 / 600;
        it("keeps the aspect and shows f(a), f(b) and y = 0 with the bracket at most 60 % of the width", () => {
            const a = 1.25, b = 1.5;
            const [l, top, r, bottom] = bisectionIntentBox({base, step: 3, a, b, f, aspect});
            expect((r - l) / (top - bottom)).toBeCloseTo(aspect, 9);
            for (const y of [0, f(a), f(b)]) { expect(y).toBeLessThan(top); expect(y).toBeGreaterThan(bottom); }
            expect(l).toBeLessThan(a); expect(r).toBeGreaterThan(b);
            expect((b - a) / (r - l)).toBeLessThanOrEqual(0.6 + 1e-12);
        });
        it("zooms in as the bracket halves", () => {
            const w = (a: number, b: number) => { const box = bisectionIntentBox({base, step: 5, a, b, f, aspect}); return box[2] - box[0]; };
            expect(w(1.40625, 1.4375)).toBeLessThan(w(1.375, 1.4375));
        });
    });
});
