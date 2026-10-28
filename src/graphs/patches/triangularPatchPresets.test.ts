/**
 * The triangular patch Preset collection: default Presets, the DTO rules (net length, degree, finite coordinates,
 * unknown fields, weights, the triangle domain u + v <= 1) with exact localized reasons, and the tensor collection
 * staying unchanged by the triangular rules.
 */
import {Message, renderMessage, setLanguage} from "../../localization";
import {triangularPatchFromDto} from "./patchDto";
import {defaultTriangularPatchPresets, patchPresetCollections} from "./patchPresetCollections";
import {fitCameraTo} from "./surface-view/surfaceMath";
import {triangularIndices} from "./TriangularPatchLattice";
import {preflightPresetImport} from "../base/presets/PresetImport";

afterEach(() => setLanguage("sl"));
const collection = patchPresetCollections["patch-triangular"];
const tensorCollection = patchPresetCollections["patch-tensor"];
const camera = {az: 0.3, el: -0.4, distance: 7, projection: "perspective", target: [0, 0, 1]};
const net3 = [[0, 0, 0], [1, 0, 0], [0, 1, 1]];
const net6 = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 1, 1], [0, 2, 0]];
const triangle = (over: Record<string, unknown> = {}) => [["TriangularBezierPatch", {n: 1, net: net3, ...over}]];

function rejection(data: unknown): Message {
    const checked = collection.check(data);
    if (!("rejection" in checked)) throw new Error(`accepted: ${JSON.stringify(data)}`);
    return checked.rejection;
}
const texts = (data: unknown) => {
    const rejected = rejection(data);
    const out: Record<string, string> = {};
    for (const language of ["sl", "en"] as const) { setLanguage(language); out[language] = renderMessage(rejected); }
    return out;
};

describe("default triangular Presets", () => {
    it.each(defaultTriangularPatchPresets.map(preset => [preset.id, preset] as const))("%s passes check, has the declared degree and its corners equal the net corners", (_id, preset) => {
        const data = preset.data();
        expect("data" in collection.check(data)).toBe(true);
        const [type, dto] = data[0];
        expect(type).toBe("TriangularBezierPatch");
        expect(dto.n).toBe(preset.degree);
        expect(dto.net).toHaveLength((preset.degree + 1) * (preset.degree + 2) / 2);
        const patch = triangularPatchFromDto(dto);
        const last = dto.net.length - 1;
        for (const [u, v, index] of [[1, 0, 0], [0, 1, preset.degree * (preset.degree + 1) / 2], [0, 0, last]] as const) {
            const p = patch.eval(u, v);
            expect([p.X(), p.Y(), p.Z()]).toEqual([...dto.net[index]]);
        }
        expect(dto.state?.camera).toBeDefined();
    });
    it("covers degrees 1 to 4 and hands out fresh data per call", () => {
        expect(defaultTriangularPatchPresets.map(preset => preset.degree)).toEqual([1, 2, 3, 4]);
        const first = defaultTriangularPatchPresets[2].data(), second = defaultTriangularPatchPresets[2].data();
        expect(first).not.toBe(second);
        expect(first).toEqual(second);
    });
    it("the cubic default is in canonical order: index 0 is b(3,0,0) and the xy positions are barycentric", () => {
        const dto = defaultTriangularPatchPresets[2].data()[0][1];
        const lattice = triangularIndices(3);
        expect(lattice[0]).toEqual([3, 0, 0]);
        expect(lattice[lattice.length - 1]).toEqual([0, 0, 3]);
        const [a, b, c] = [dto.net[0], dto.net[6], dto.net[dto.net.length - 1]];
        lattice.forEach(([i, j, k], index) => {
            expect(dto.net[index][0]).toBeCloseTo((i * a[0] + j * b[0] + k * c[0]) / 3, 12);
            expect(dto.net[index][1]).toBeCloseTo((i * a[1] + j * b[1] + k * c[1]) / 3, 12);
        });
    });
    it("names exist in both languages and name a triangular patch", () => {
        for (const preset of defaultTriangularPatchPresets) {
            setLanguage("en"); const en = renderMessage({key: preset.name, params: {}});
            setLanguage("sl"); const sl = renderMessage({key: preset.name, params: {}});
            expect(en).not.toBe(sl);
            expect(sl).toMatch(/trikotn/i);
            expect(en).toMatch(/triangular/i);
        }
    });
    it.each(defaultTriangularPatchPresets.map(preset => [preset.id, preset] as const))("%s keeps its whole net in view on a 390x844 host (aspect 0.45)", (_id, preset) => {
        const dto = preset.data()[0][1];
        const view = dto.state!.camera!;
        const own = {...view, target: [...view.target] as [number, number, number]};
        const fitted = fitCameraTo(dto.net.map(p => [...p] as [number, number, number]), 0.45, own);
        expect(own.distance).toBeGreaterThanOrEqual(fitted.distance);
        expect(own.distance).toBeLessThan(fitted.distance * 1.01);
    });
});

describe("accepted triangular data", () => {
    it("accepts degrees 1 and 2, a full state and points on the edge of the domain", () => {
        expect("data" in collection.check(triangle())).toBe(true);
        expect("data" in collection.check(triangle({n: 2, net: net6}))).toBe(true);
        expect("data" in collection.check(triangle({state: {camera, u: 0.25, v: 0.75, showDeCasteljau: true, isoDensity: 16}}))).toBe(true);
        expect("data" in collection.check(triangle({state: {u: 1, v: 0}}))).toBe(true);
        expect("data" in collection.check(triangle({state: {u: 0, v: 0}}))).toBe(true);
    });
    it("accepts a lone u or v of any size in [0, 1] (the graph clamps it against the missing one)", () => {
        expect("data" in collection.check(triangle({state: {u: 1}}))).toBe(true);
        expect("data" in collection.check(triangle({state: {v: 1}}))).toBe(true);
    });
    it("tolerates rounding of an exported pair summing to 1", () => {
        expect("data" in collection.check(triangle({state: {u: 0.1 + 0.2, v: 0.7}}))).toBe(true);
    });
    it("the tensor collection still accepts u = v = 1, and the collections reject each other's patch", () => {
        const tensor = [["TensorProductBezierPatch", {m: 1, n: 1, net: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]], state: {u: 1, v: 1}}]];
        expect("data" in tensorCollection.check(tensor)).toBe(true);
        const checked = tensorCollection.check(triangle());
        expect("rejection" in checked && checked.rejection).toMatchObject({key: "patch_type_does_not_match_collection"});
        expect(rejection(tensor)).toMatchObject({key: "patch_type_does_not_match_collection"});
    });
});

describe("triangular rejections carry exact localized reasons", () => {
    const finite = "vsaka točka mreže mora imeti tri končna števila (x, y, z)";
    const finiteEn = "every net point must have three finite numbers (x, y, z)";
    it.each([
        ["net too short", triangle({net: net3.slice(1)}), "kontrolna mreža ima 2 točk, pričakovanih je 3", "the control net has 2 points, expected 3"],
        ["degree 2 with a degree 1 net", triangle({n: 2}), "kontrolna mreža ima 3 točk, pričakovanih je 6", "the control net has 3 points, expected 6"],
        ["a tensor-sized net", triangle({net: [...net3, [1, 1, 1]]}), "kontrolna mreža ima 4 točk, pričakovanih je 3", "the control net has 4 points, expected 3"],
        ["net not a list", triangle({net: "x"}), "kontrolna mreža krpe mora biti seznam točk", "the patch control net must be a list of points"],
        ["degree 0", triangle({n: 0}), "stopnja n mora biti celo število od 1 do 4", "degree n must be an integer from 1 to 4"],
        ["degree 5", triangle({n: 5}), "stopnja n mora biti celo število od 1 do 4", "degree n must be an integer from 1 to 4"],
        ["degree 1.5", triangle({n: 1.5}), "stopnja n mora biti celo število od 1 do 4", "degree n must be an integer from 1 to 4"],
        ["degree missing", [["TriangularBezierPatch", {net: net3}]], "stopnja n mora biti celo število od 1 do 4", "degree n must be an integer from 1 to 4"],
        ["m on a triangular patch", triangle({m: 1}), "neznano polje krpe: m", "unknown patch field: m"],
        ["NaN coordinate", triangle({net: [[0, 0, 0], [1, 0, 0], [0, 1, null]]}), finite, finiteEn],
        ["string coordinate", triangle({net: [[0, 0, 0], [1, 0, 0], [0, 1, "1"]]}), finite, finiteEn],
        ["pair", triangle({net: [[0, 0], [1, 0], [0, 1]]}), finite, finiteEn],
        ["unknown field", triangle({color: "red"}), "neznano polje krpe: color", "unknown patch field: color"],
        ["weights", triangle({weights: [1, 1, 1]}), "racionalne krpe (uteži) še niso podprte", "rational patches (weights) are not supported yet"],
        ["unknown state field", triangle({state: {zoom: 2}}), "neznano polje krpe: state.zoom", "unknown patch field: state.zoom"],
        ["u out of range", triangle({state: {u: 1.5}}), "parameter u mora biti število med 0 in 1", "parameter u must be a number between 0 and 1"],
        ["v negative", triangle({state: {v: -0.1}}), "parameter v mora biti število med 0 in 1", "parameter v must be a number between 0 and 1"],
        ["u + v above 1", triangle({state: {u: 0.7, v: 0.6}}), "parametra u = 0.7 in v = 0.6 morata imeti vsoto največ 1, da je w = 1 − u − v nenegativen", "parameters u = 0.7 and v = 0.6 must sum to at most 1 so that w = 1 − u − v is not negative"],
        ["u = v = 1", triangle({state: {u: 1, v: 1}}), "parametra u = 1 in v = 1 morata imeti vsoto največ 1, da je w = 1 − u − v nenegativen", "parameters u = 1 and v = 1 must sum to at most 1 so that w = 1 − u − v is not negative"],
        ["iso density 9", triangle({state: {isoDensity: 9}}), "gostota isoDensity mora biti 8 ali 16", "density isoDensity must be 8 or 16"],
    ])("%s", (_name, data, sl, en) => {
        expect(texts(data)).toEqual({sl, en});
    });
    it("a bad camera is still named", () => {
        expect(texts(triangle({state: {camera: {...camera, el: 2}}}))).toEqual({sl: "neveljaven pogled kamere krpe", en: "invalid patch camera view"});
    });
});

describe("a triangular Preset file", () => {
    const file = (entry: unknown) => JSON.stringify({"preset-patch-triangular": {data: [{id: "mine", graphState: {initialized: true}, data: entry}]}});
    const reasonFor = (entry: unknown): string | undefined => {
        try { preflightPresetImport(file(entry), window.localStorage); } catch (error) { return (error as Error).message; }
        return undefined;
    };
    it("imports a valid triangular patch", () => {
        expect(reasonFor(defaultTriangularPatchPresets[2].data())).toBeUndefined();
    });
    it("names the triangle-domain violation, and a short net, to the user", () => {
        expect(reasonFor(triangle({state: {u: 0.9, v: 0.9}}))).toContain("u = 0.9");
        expect(reasonFor(triangle({net: net3.slice(0, 2)}))).toContain("kontrolna mreža ima 2 točk, pričakovanih je 3");
    });
});
