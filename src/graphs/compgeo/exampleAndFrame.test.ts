import {matchingExample} from "./ExampleSelect";
import {boardFrameOf, fitFrame} from "./frameFit";
import {stepCounterText} from "../base/controls/StepCounter";
import {Rational} from "../../compgeo/rational";

const examples = [
    {id: "a", points: [{x: 0, y: 0}, {x: 2, y: 1}]},
    {id: "b", points: [{x: 0, y: 0}, {x: 2, y: 1}], gridStepExponent: -1},
] as const;

describe("matchingExample", () => {
    test("names the example with the same grid and the same points in order", () => {
        expect(matchingExample({points: [{x: 0, y: 0}, {x: 2, y: 1}], gridStepExponent: 0}, examples)).toBe("a");
        expect(matchingExample({points: [{x: 0, y: 0}, {x: 2, y: 1}], gridStepExponent: -1}, examples)).toBe("b");
    });
    test("a moved, reordered, added or regridded set is custom", () => {
        expect(matchingExample({points: [{x: 0, y: 0}, {x: 2, y: 2}], gridStepExponent: 0}, examples)).toBeUndefined();
        expect(matchingExample({points: [{x: 2, y: 1}, {x: 0, y: 0}], gridStepExponent: 0}, examples)).toBeUndefined();
        expect(matchingExample({points: [{x: 0, y: 0}], gridStepExponent: 0}, examples)).toBeUndefined();
        expect(matchingExample({points: [{x: 0, y: 0}, {x: 2, y: 1}], gridStepExponent: 3}, examples)).toBeUndefined();
    });
});

describe("frame fit helpers", () => {
    const box = {minX: Rational.of(-2), minY: Rational.of(-1), maxX: Rational.of(6), maxY: Rational.of(3)};
    test("boardFrameOf scales the grid box by 2^exponent as [left, top, right, bottom]", () => {
        expect(boardFrameOf(box, 0)).toEqual([-2, 3, 6, -1]);
        expect(boardFrameOf(box, -1)).toEqual([-1, 1.5, 3, -0.5]);
    });
    test("fitFrame keeps a canvas without size at the frame and otherwise contains the frame at equal units", () => {
        expect(fitFrame([-2, 3, 6, -1], 0, 0)).toEqual([-2, 3, 6, -1]);
        const [left, top, right, bottom] = fitFrame([-2, 3, 6, -1], 800, 400);
        expect(left).toBeLessThanOrEqual(-2); expect(right).toBeGreaterThanOrEqual(6);
        expect(top).toBeGreaterThanOrEqual(3); expect(bottom).toBeLessThanOrEqual(-1);
        expect((right - left) / (top - bottom)).toBeCloseTo(2, 5);
    });
});

test("the step counter shows the 0-based step from 1 and never an empty run as 0", () => {
    const t = ((key: string, values?: Record<string, unknown>) => `${key}:${values?.value0}/${values?.value1}`) as never;
    expect(stepCounterText(t, 0, 5)).toBe("step_counter:1/5");
    expect(stepCounterText(t, 0, 0)).toBe("step_counter:1/1");
});
