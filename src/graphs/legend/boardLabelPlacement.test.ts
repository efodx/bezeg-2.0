import {describe, expect, it} from "vitest";
import {placeLpLabels, type LabelItem, type LayoutContext, type PxBox} from "./boardLabelPlacement";

const ctx = (over: Partial<LayoutContext> = {}): LayoutContext => ({width: 600, height: 400, markers: [], samples: [], strips: [], blocks: [], ...over});
const item = (over: Partial<LabelItem> = {}): LabelItem => ({id: "a", ax: 300, ay: 200, w: 22, h: 26, ...over});
const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const PREFERRED: PxBox = {x0: 260, y0: 190, x1: 282, y1: 216};

describe("placeLpLabels prefer", () => {
    it("places as before without prefer", () => {
        expect(placeLpLabels([item()], ctx()).a).toEqual({x0: 307, y0: 171, x1: 329, y1: 197});
    });

    it("keeps the preferred spot while a slightly cheaper one exists", () => {
        // Two line samples lie in the preferred box (cost 8), the default first choice is free: the bonus outweighs the difference.
        const samples: Array<[number, number]> = [[265, 195], [268, 198]];
        const box = placeLpLabels([item({prefer: [-40, -10]})], ctx({samples})).a;
        expect(box).toEqual(PREFERRED);
        expect(placeLpLabels([item()], ctx({samples})).a).not.toEqual(PREFERRED);
    });

    it("leaves the preferred spot when a marker lies on it", () => {
        const markers: Array<[number, number, number]> = [[271, 203, 5]];
        expect(placeLpLabels([item({prefer: [-40, -10]})], ctx({markers})).a).not.toEqual(PREFERRED);
    });

    it("leaves the preferred spot when a box placed before lies on it", () => {
        const first = item({id: "first", ax: 271, ay: 203, prefer: [-11, -13]});
        const both = placeLpLabels([first, item({prefer: [-40, -10]})], ctx());
        expect(overlaps(both.first, both.a)).toBe(false);
        expect(both.a).not.toEqual(PREFERRED);
    });
});
