import {describe, expect, it} from "vitest";
import {placeNewPoint} from "./placement";

describe("placeNewPoint", () => {
    it("puts the first point at the origin", () => expect(placeNewPoint([])).toEqual([0, 0]));
    it("goes one unit right of the last point", () => expect(placeNewPoint([[0, 0], [2, 3]])).toEqual([3, 3]));
    it("stays right when exactly at the limit", () => expect(placeNewPoint([[4, 1]], {limit: {max: 5}})).toEqual([5, 1]));
    it("goes left when right passes the limit", () => expect(placeNewPoint([[5, 1]], {limit: {max: 5}})).toEqual([4, 1]));
    it("uses the rule over the default", () => expect(placeNewPoint([[1, 1]], {rule: p => [p.length, 9]})).toEqual([1, 9]));
    it("lets at beat the rule", () => expect(placeNewPoint([[1, 1]], {at: [7, 8], rule: () => [0, 0]})).toEqual([7, 8]));
    it("lets at beat the limit", () => expect(placeNewPoint([[5, 1]], {at: [9, 9], limit: {max: 5}})).toEqual([9, 9]));
it("distinct: skips a coordinate an existing point already has", () => {
    expect(placeNewPoint([[5, 1], [4, 1]], {limit: {max: 5}, distinct: true})).toEqual([3, 1]);
    expect(placeNewPoint([[0, 0], [1, 0], [3, 0], [2, 0]], {distinct: true})).toEqual([4, 0]);
});
it("distinct: without a collision it is the plain default; with a full row it falls back to the plain default", () => {
    expect(placeNewPoint([[5, 1]], {limit: {max: 5}, distinct: true})).toEqual([4, 1]);
    expect(placeNewPoint([[1, 0], [0, 0], [-1, 0]], {limit: {max: 1}, distinct: true})).toEqual([0, 0]);
});
});
