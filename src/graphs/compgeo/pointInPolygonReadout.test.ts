import {NOTCHED_PENTAGON, PENTAGRAM_VERTICES} from "../../compgeo/pointInPolygon";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {pointInPolygonReadout, rayMarkers} from "./pointInPolygonReadout";

const polygon = (points: readonly {x: number; y: number}[], closed = true): PointSetModel =>
    ({mode: "polygon", closed, gridStepExponent: 0, points: points.map(p => ({x: p.x, y: p.y}))});
const NOTCHED = polygon(NOTCHED_PENTAGON);
const PENTAGRAM = polygon(PENTAGRAM_VERTICES);

describe("pointInPolygonReadout: task 16's values", () => {
    test("(3,1) and (1,3) are inside with winding 1; (3,3) in the notch is outside with winding 0 and two crossings", () => {
        expect(pointInPolygonReadout(NOTCHED, {x: 3, y: 1})).toEqual({
            kind: "located", location: "inside", crossings: 1, winding: 1, evenOdd: "inside", nonzero: "inside", simple: true,
        });
        expect(pointInPolygonReadout(NOTCHED, {x: 1, y: 3})).toMatchObject({kind: "located", location: "inside", winding: 1});
        expect(pointInPolygonReadout(NOTCHED, {x: 3, y: 3})).toEqual({
            kind: "located", location: "outside", crossings: 2, winding: 0, evenOdd: "outside", nonzero: "outside", simple: true,
        });
    });

    test("pentagram: the centre has winding 2 and the rules differ; a tip has winding 1 and they agree", () => {
        expect(pointInPolygonReadout(PENTAGRAM, {x: 0, y: 0})).toEqual({
            kind: "located", location: "rules-differ", crossings: 2, winding: 2, evenOdd: "outside", nonzero: "inside", simple: false,
        });
        expect(pointInPolygonReadout(PENTAGRAM, {x: 0, y: 9})).toMatchObject({
            kind: "located", location: "inside", winding: 1, evenOdd: "inside", nonzero: "inside", simple: false,
        });
    });

    test("the horizontal through the notch vertex (3,2): (1,2) counts both edges at the vertex (three crossings), (4,2) none of them", () => {
        expect(pointInPolygonReadout(NOTCHED, {x: 1, y: 2})).toMatchObject({kind: "located", location: "inside", crossings: 3, winding: 1});
        expect(pointInPolygonReadout(NOTCHED, {x: 4, y: 2})).toMatchObject({kind: "located", location: "inside", crossings: 1, winding: 1});
    });
});

describe("pointInPolygonReadout: boundary and degenerate models", () => {
    test("on an edge or at a vertex the readout is the boundary, with no count and no winding number", () => {
        for (const q of [{x: 3, y: 0}, {x: 6, y: 2}, {x: 3, y: 2}, {x: 0, y: 0}]) {
            const readout = pointInPolygonReadout(NOTCHED, q);
            expect(readout).toEqual({kind: "boundary"});
        }
    });

    test("an open polygon, a points-mode model and fewer than three vertices have no verdict", () => {
        expect(pointInPolygonReadout(polygon(NOTCHED_PENTAGON, false), {x: 3, y: 1})).toEqual({kind: "message", reason: "open", missing: 0});
        expect(pointInPolygonReadout({...NOTCHED, mode: "points", closed: false}, {x: 3, y: 1})).toEqual({kind: "message", reason: "open", missing: 0});
        expect(pointInPolygonReadout(polygon(NOTCHED_PENTAGON.slice(0, 2)), {x: 3, y: 1})).toEqual({kind: "message", reason: "too-few-vertices", missing: 1});
        expect(pointInPolygonReadout(polygon([]), {x: 3, y: 1})).toEqual({kind: "message", reason: "too-few-vertices", missing: 3});
    });

    test("the parity of the crossing count equals the parity of the winding number for every lattice point near both polygons", () => {
        for (const model of [NOTCHED, PENTAGRAM]) {
            const spread = model === NOTCHED ? 9 : 20;
            for (let y = -spread; y <= spread; y++) {
                for (let x = -spread; x <= spread; x++) {
                    const readout = pointInPolygonReadout(model, {x, y});
                    if (readout.kind === "located") expect(Math.abs(readout.winding) % 2).toBe(readout.crossings % 2);
                }
            }
        }
    });
});

describe("rayMarkers", () => {
    test("(3,1): one crossing at x = 6, numbered 1, and no touches", () => {
        const markers = rayMarkers(NOTCHED, {x: 3, y: 1});
        expect(markers.kind).toBe("ray");
        if (markers.kind !== "ray") return;
        expect(markers.crossings.map(c => [c.number, c.edge, c.direction, c.x.format()])).toEqual([[1, 1, 1, "6"]]);
        expect(markers.touches).toEqual([]);
    });

    test("crossings are numbered along the ray from q outwards, whatever the edge order", () => {
        const markers = rayMarkers(NOTCHED, {x: 1, y: 2});
        if (markers.kind !== "ray") throw new Error("expected a ray");
        expect(markers.crossings.map(c => [c.number, c.edge, c.x.format(), c.direction])).toEqual([[1, 2, "3", -1], [2, 3, "3", 1], [3, 1, "6", 1]]);
    });

    test("a horizontal edge on the ray is a touch, not a crossing: both its endpoints are marked once", () => {
        const markers = rayMarkers(NOTCHED, {x: -1, y: 0});
        if (markers.kind !== "ray") throw new Error("expected a ray");
        expect(markers.crossings.map(c => c.x.format())).toEqual(["0", "6"]);
        expect(markers.touches).toEqual([{x: 0, y: 0}, {x: 6, y: 0}]);
    });

    test("a ray along the top tip of the pentagram only touches it: no crossing, one diamond at (0,16)", () => {
        const markers = rayMarkers(PENTAGRAM, {x: -3, y: 16});
        if (markers.kind !== "ray") throw new Error("expected a ray");
        expect(markers.crossings).toHaveLength(0);
        expect(markers.touches).toEqual([{x: 0, y: 16}]);
    });

    test("no markers on the boundary, for an open polygon or too few vertices", () => {
        expect(rayMarkers(NOTCHED, {x: 3, y: 0})).toEqual({kind: "none"});
        expect(rayMarkers(polygon(NOTCHED_PENTAGON, false), {x: 3, y: 1})).toEqual({kind: "none"});
        expect(rayMarkers(polygon(NOTCHED_PENTAGON.slice(0, 2)), {x: 3, y: 1})).toEqual({kind: "none"});
    });
});
