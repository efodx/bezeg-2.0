/**
 * The patch Preset collections: round-trip through the DTO, the default Presets, and every rejection with its exact
 * localized reason in both languages, also through the file importer (the user's path).
 */
import {Message, renderMessage, setLanguage} from "../../localization";
import {PointImpl} from "../../bezeg/impl/point/point-impl";
import {TensorProductBezierPatch} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import {TriangularBezierPatch} from "../../bezeg/impl/patch/triangular-bezier-patch";
import {tensorPatchFromDto, tensorPatchToDto, triangularPatchFromDto, triangularPatchToDto} from "./patchDto";
import {fitCameraTo} from "./surface-view/surfaceMath";
import {defaultPatchPresets, derivativesStartingPatches, patchPresetCollections} from "./patchPresetCollections";
import {preflightPresetImport} from "../base/presets/PresetImport";

afterEach(() => setLanguage("sl"));
const collection = patchPresetCollections["patch-tensor"];
const camera = {az: 0.3, el: -0.4, distance: 7, projection: "perspective", target: [0, 0, 1]};
const net4 = [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]];
const tensor = (over: Record<string, unknown> = {}) => [["TensorProductBezierPatch", {m: 1, n: 1, net: net4, ...over}]];

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

describe("round trip", () => {
    it("tensor DTO <-> patch evaluates identically", () => {
        const net = Array.from({length: 3}, (_, i) => Array.from({length: 4}, (_, j) => new PointImpl(i, j, undefined, Math.sin(i + 2 * j))));
        const source = new TensorProductBezierPatch(net);
        const dto = tensorPatchToDto(source);
        expect(dto).toMatchObject({m: 2, n: 3});
        expect(dto.net[1 * 4 + 2]).toEqual([1, 2, Math.sin(5)]);
        const back = tensorPatchFromDto(JSON.parse(JSON.stringify(dto)));
        for (const [u, v] of [[0, 0], [0.3, 0.8], [1, 0.5], [1, 1]]) {
            const a = source.eval(u, v), b = back.eval(u, v);
            expect([b.X(), b.Y(), b.Z()]).toEqual([a.X(), a.Y(), a.Z()]);
        }
    });
    it("triangular DTO <-> patch keeps the canonical order", () => {
        const source = new TriangularBezierPatch(Array.from({length: 6}, (_, k) => new PointImpl(k, k * k, undefined, 1 - k)));
        const dto = triangularPatchToDto(source);
        expect(dto.n).toBe(2);
        const back = triangularPatchFromDto(dto);
        const a = source.eval(0.2, 0.5), b = back.eval(0.2, 0.5);
        expect([b.X(), b.Y(), b.Z()]).toEqual([a.X(), a.Y(), a.Z()]);
    });
});

describe("default Presets", () => {
    it.each(defaultPatchPresets.map(preset => [preset.id, preset] as const))("%s passes check and its patch corners equal the net corners", (_id, preset) => {
        const data = preset.data();
        const checked = collection.check(data);
        expect("data" in checked).toBe(true);
        const [, dto] = data[0];
        if (!("m" in dto)) throw new Error("tensor expected");
        const patch = tensorPatchFromDto(dto);
        const last = dto.net.length - 1, row = dto.n + 1;
        const corners: ReadonlyArray<readonly [number, number, number]> = [[0, 0, 0], [0, 1, row - 1], [1, 0, last - dto.n], [1, 1, last]];
        for (const [u, v, index] of corners) {
            const p = patch.eval(u, v);
            expect([p.X(), p.Y(), p.Z()]).toEqual([...dto.net[index]]);
        }
        expect(dto.state?.camera).toBeDefined();
    });
    it("saddle is z = x*y and the dome is raised inside, low on the boundary", () => {
        const saddle = tensorPatchFromDto(defaultPatchPresets[0].data()[0][1] as never);
        const p = saddle.eval(0.75, 0.25);
        expect(p.Z()).toBeCloseTo(p.X() * p.Y(), 12);
        const dome = tensorPatchFromDto(defaultPatchPresets[1].data()[0][1] as never);
        expect(dome.eval(0.5, 0.5).Z()).toBeGreaterThan(1);
        expect(dome.eval(0, 0.5).Z()).toBe(0);
    });
    it("names exist in both languages", () => {
        for (const preset of defaultPatchPresets) {
            setLanguage("en"); const en = renderMessage({key: preset.name, params: {}});
            setLanguage("sl"); const sl = renderMessage({key: preset.name, params: {}});
            expect(en).not.toBe(sl);
            expect(sl).toMatch(/Bézierjeva krpa/i);
        }
    });
});

describe("default cameras", () => {
    it.each(defaultPatchPresets.map(preset => [preset.id, preset] as const))("%s keeps its whole net in view on a 390x844 host (aspect 0.45)", (_id, preset) => {
        const dto = preset.data()[0][1];
        if (!("m" in dto) || !dto.state?.camera) throw new Error("tensor Preset with a camera expected");
        const camera = {...dto.state.camera, target: [...dto.state.camera.target] as [number, number, number]};
        const fitted = fitCameraTo(dto.net.map(p => [...p] as [number, number, number]), 0.45, camera);
        expect(camera.distance).toBeGreaterThanOrEqual(fitted.distance);
        expect(camera.distance).toBeLessThan(fitted.distance * 1.01);
        camera.target.forEach((c, k) => expect(c).toBeCloseTo(fitted.target[k], 12));
    });
});

describe("accepted data", () => {
    it("accepts a tensor patch with state and camera, and a triangular patch in its collection", () => {
        expect("data" in collection.check(tensor({state: {camera, u: 0, v: 1, showControlNet: true}}))).toBe(true);
        expect("data" in collection.check(tensor({state: {isoDensity: 8, shadingDensity: 16}}))).toBe(true);
        const triangle = [["TriangularBezierPatch", {n: 1, net: net4.slice(0, 3)}]];
        expect("data" in patchPresetCollections["patch-triangular"].check(triangle)).toBe(true);
        expect(rejection(triangle)).toMatchObject({key: "patch_type_does_not_match_collection"});
    });
});

describe("rejections carry exact localized reasons", () => {
    it.each([
        ["missing data", undefined, "neveljavni podatki krpe", "invalid patch data"],
        ["empty list", [], "prednastavitev mora vsebovati natanko eno krpo", "preset must contain exactly one patch"],
        ["not a pair", [{m: 1}], "neznana vrsta krpe", "unknown patch type"],
        ["unknown type", [["Foo", {}]], "neznana vrsta krpe", "unknown patch type"],
        ["net too short", tensor({net: net4.slice(1)}), "kontrolna mreža ima 3 točk, pričakovanih je 4", "the control net has 3 points, expected 4"],
        ["net too long", tensor({net: [...net4, [0, 0, 0]]}), "kontrolna mreža ima 5 točk, pričakovanih je 4", "the control net has 5 points, expected 4"],
        ["net not a list", tensor({net: "x"}), "kontrolna mreža krpe mora biti seznam točk", "the patch control net must be a list of points"],
        ["degree 0", tensor({m: 0}), "stopnja m mora biti celo število od 1 do 4", "degree m must be an integer from 1 to 4"],
        ["degree 5", tensor({n: 5}), "stopnja n mora biti celo število od 1 do 4", "degree n must be an integer from 1 to 4"],
        ["degree 1.5", tensor({n: 1.5}), "stopnja n mora biti celo število od 1 do 4", "degree n must be an integer from 1 to 4"],
        ["NaN coordinate", tensor({net: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, null]]}), "vsaka točka mreže mora imeti tri končna števila (x, y, z)", "every net point must have three finite numbers (x, y, z)"],
        ["string coordinate", tensor({net: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, "1"]]}), "vsaka točka mreže mora imeti tri končna števila (x, y, z)", "every net point must have three finite numbers (x, y, z)"],
        ["pair", tensor({net: [[0, 0], [0, 1], [1, 0], [1, 1]]}), "vsaka točka mreže mora imeti tri končna števila (x, y, z)", "every net point must have three finite numbers (x, y, z)"],
        ["unknown field", tensor({color: "red"}), "neznano polje krpe: color", "unknown patch field: color"],
        ["weights", tensor({weights: [1, 1, 1, 1]}), "racionalne krpe (uteži) še niso podprte", "rational patches (weights) are not supported yet"],
        ["unknown state field", tensor({state: {zoom: 2}}), "neznano polje krpe: state.zoom", "unknown patch field: state.zoom"],
        ["u out of range", tensor({state: {u: 1.5}}), "parameter u mora biti število med 0 in 1", "parameter u must be a number between 0 and 1"],
        ["v negative", tensor({state: {v: -0.1}}), "parameter v mora biti število med 0 in 1", "parameter v must be a number between 0 and 1"],
        ["iso density 9", tensor({state: {isoDensity: 9}}), "gostota isoDensity mora biti 8 ali 16", "density isoDensity must be 8 or 16"],
        ["shading density string", tensor({state: {shadingDensity: "8"}}), "gostota shadingDensity mora biti 8 ali 16", "density shadingDensity must be 8 or 16"],
        ["show not boolean", tensor({state: {showNormal: 1}}), "neveljavna možnost showNormal", "invalid option showNormal"],
    ])("%s", (_name, data, sl, en) => {
        expect(texts(data)).toEqual({sl, en});
    });

    it.each([
        ["elevation past the pole", {...camera, el: 2}],
        ["non-finite az", {...camera, az: null}],
        ["zero distance", {...camera, distance: 0}],
        ["orthographic", {...camera, projection: "orthographic"}],
        ["target of two numbers", {...camera, target: [0, 0]}],
        ["missing field", {az: 0, el: 0, distance: 1, projection: "perspective"}],
        ["not an object", 5],
    ])("camera: %s", (_name, bad) => {
        expect(texts(tensor({state: {camera: bad}}))).toEqual({sl: "neveljaven pogled kamere krpe", en: "invalid patch camera view"});
    });

    it("an unknown camera field names the field", () => {
        expect(texts(tensor({state: {camera: {...camera, fov: 1}}})).en).toBe("unknown patch field: camera.fov");
    });
});

describe("graphState of a file", () => {
    const file = (graphState: unknown) => JSON.stringify({"preset-patch-tensor": {data: [{id: "mine", graphState}]}});
    const reasonFor = (graphState: unknown): string | undefined => {
        try { preflightPresetImport(file(graphState), window.localStorage); } catch (error) { return (error as Error).message; }
        return undefined;
    };

    it("accepts the marker the exporter writes", () => {
        expect(reasonFor({initialized: true})).toBeUndefined();
    });
    it.each([
        ["degree", {m: 99}, "m"],
        ["density", {isoDensity: 100000}, "isoDensity"],
        ["parameter", {u: 7}, "u"],
    ])("rejects a %s with the field named", (_name, graphState, field) => {
        expect(reasonFor(graphState)).toContain(`graphState.${field}`);
    });
    it("rejects a non-object", () => {
        expect(reasonFor(5)).toBeDefined();
    });
});

describe("patch-decasteljau construction order", () => {
    const decasteljau = patchPresetCollections["patch-decasteljau"];
    const withState = (state: Record<string, unknown>) => tensor({state});
    const reasons = (state: Record<string, unknown>) => {
        const checked = decasteljau.check(withState(state));
        if (!("rejection" in checked)) throw new Error(`accepted: ${JSON.stringify(state)}`);
        const out: Record<string, string> = {};
        for (const language of ["sl", "en"] as const) { setLanguage(language); out[language] = renderMessage(checked.rejection); }
        return out;
    };

    it.each(["rows", "columns", "bilinear"])("accepts %s and keeps it through the round trip", order => {
        const checked = decasteljau.check(JSON.parse(JSON.stringify(withState({decasteljauOrder: order, showDeCasteljau: true}))));
        if (!("data" in checked)) throw new Error("rejected");
        expect(checked.data[0][1]).toMatchObject({state: {decasteljauOrder: order, showDeCasteljau: true}});
        expect("data" in decasteljau.check(JSON.parse(JSON.stringify(checked.data)))).toBe(true);
    });
    it("accepts an old Preset without the order or the switch", () => {
        expect("data" in decasteljau.check(withState({camera, u: 0.2, v: 0.4}))).toBe(true);
        expect("data" in decasteljau.check(tensor())).toBe(true);
    });
    it.each([
        ["an unknown order", "diagonal"],
        ["a number", 1],
        ["null", null],
        ["an empty string", ""],
    ])("rejects %s with the localized reason", (_name, order) => {
        expect(reasons({decasteljauOrder: order})).toEqual({
            sl: "vrstni red konstrukcije mora biti rows, columns ali bilinear",
            en: "the construction order must be rows, columns or bilinear",
        });
    });
});

describe("patch-derivatives collection and starting patches", () => {
    const derivatives = patchPresetCollections["patch-derivatives"];
    const withState = (state: Record<string, unknown>) => tensor({state});

    it("has its own key and accepts the tensor patch type only", () => {
        expect(derivatives.key).toBe("patch-derivatives");
        expect("rejection" in derivatives.check([["TriangularBezierPatch", {n: 1, net: net4.slice(0, 3)}]])).toBe(true);
    });
    it.each(derivativesStartingPatches.map(preset => [preset.id, preset] as const))("%s passes check and keeps its whole net in view (aspect 0.45)", (_id, preset) => {
        const data = preset.data();
        expect("data" in derivatives.check(JSON.parse(JSON.stringify(data)))).toBe(true);
        const dto = data[0][1];
        if (!("m" in dto) || !dto.state?.camera) throw new Error("tensor Preset with a camera expected");
        const camera = {...dto.state.camera, target: [...dto.state.camera.target] as [number, number, number]};
        const fitted = fitCameraTo(dto.net.map(p => [...p] as [number, number, number]), 0.45, camera);
        expect(camera.distance).toBeGreaterThanOrEqual(fitted.distance);
        expect(camera.distance).toBeLessThan(fitted.distance * 1.01);
        camera.target.forEach((c, k) => expect(c).toBeCloseTo(fitted.target[k], 12));
    });
    it("reuses the two tensor Presets and adds two degenerate patches with names in both languages", () => {
        expect(derivativesStartingPatches.map(preset => preset.id)).toEqual(["bilinear-saddle", "bicubic-dome", "collapsed-edge", "parallel-corner"]);
        for (const preset of derivativesStartingPatches.slice(2)) {
            setLanguage("en"); const en = renderMessage({key: preset.name, params: {}});
            setLanguage("sl"); const sl = renderMessage({key: preset.name, params: {}});
            expect(en).not.toBe(sl);
            expect(sl).toMatch(/Bézierjeva krpa/i);
        }
    });
    it("accepts the switches, an old Preset without them, and the round trip", () => {
        const checked = derivatives.check(JSON.parse(JSON.stringify(withState({showTangentPlane: false, showNormal: true, showTwist: false}))));
        if (!("data" in checked)) throw new Error("rejected");
        expect(checked.data[0][1]).toMatchObject({state: {showTangentPlane: false, showNormal: true, showTwist: false}});
        expect("data" in derivatives.check(withState({camera, u: 0.2, v: 0.4}))).toBe(true);
        expect("data" in derivatives.check(tensor())).toBe(true);
    });
    it.each([["a number", 1], ["a string", "yes"], ["null", null]])("rejects showTwist as %s with the localized reason", (_name, value) => {
        const checked = derivatives.check(withState({showTwist: value}));
        if (!("rejection" in checked)) throw new Error("accepted");
        const out: Record<string, string> = {};
        for (const language of ["sl", "en"] as const) { setLanguage(language); out[language] = renderMessage(checked.rejection); }
        expect(out.sl).toContain("showTwist");
        expect(out.en).toContain("showTwist");
        // A known field with a wrong value, not an unknown field.
        expect(out.en).toContain("invalid option");
        expect(out.en).not.toContain("unknown patch field");
        expect(out.sl).not.toBe(out.en);
    });
});
