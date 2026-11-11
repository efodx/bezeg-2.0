import {matchingExample} from "./ExampleSelect";

// The frame helpers are covered in frameFit.test.ts and the step counter in base/controls/ReadoutParts.test.tsx.

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
