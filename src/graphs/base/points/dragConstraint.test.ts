import {describe, expect, it} from "vitest";
import {constrainPoint, stepPoint} from "./dragConstraint";

describe("constrainPoint", () => {
    it("leaves a point alone without options", () => expect(constrainPoint([1.234, -5.6])).toEqual([1.234, -5.6]));
    it("snaps to the step", () => expect(constrainPoint([1.26, 0.1], {step: 0.5})).toEqual([1.5, 0]));
    it("snaps half away from zero", () => {
        expect(constrainPoint([0.25, -0.25], {step: 0.5})).toEqual([0.5, -0.5]);
        expect(constrainPoint([-1.5, 1.5], {step: 1})).toEqual([-2, 2]);
        // 0.15 / 0.1 is 1.4999999999999998 in binary; the same tolerance as NumberInput rounds it half away from zero.
        expect(constrainPoint([0.15, -0.15], {step: 0.1})).toEqual([0.2, -0.2]);
    });
    it("clamps silently per axis", () => {
        expect(constrainPoint([9, -9], {bounds: {x: [-2, 2]}})).toEqual([2, -9]);
        expect(constrainPoint([9, -9], {bounds: {y: [-3, 3]}})).toEqual([9, -3]);
    });
    it("keeps the clamp on the grid", () => {
        expect(constrainPoint([9, 0], {step: 0.5, bounds: {x: [-2, 2.3]}})).toEqual([2, 0]);
        expect(constrainPoint([-9, 0], {step: 0.5, bounds: {x: [-2.3, 2]}})).toEqual([-2, 0]);
    });
    it("clamps to the bound when no grid value fits", () => {
        expect(constrainPoint([9, 0], {step: 1, bounds: {x: [0.2, 0.8]}})).toEqual([0.8, 0]);
    });
    it("stays clean of float noise", () => expect(constrainPoint([0.30000000000000004, 0], {step: 0.1})[0]).toBe(0.3));
});

describe("stepPoint", () => {
    it("nudges like a drag: add then constrain", () => {
        expect(stepPoint([1.5, 0], [0.5, 1], {step: 0.5, bounds: {x: [0, 2]}})).toEqual([2, 1]);
        expect(stepPoint([2, 0], [0.5, 0], {step: 0.5, bounds: {x: [0, 2]}})).toEqual([2, 0]);
    });
});
