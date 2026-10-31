import {describe, expect, it} from "vitest";
import {renderMessage, setLanguage} from "../../localization";
import {COONS_COORDINATE_LIMIT, coonsPresetCollection} from "./coonsPresetCollection";
import {defaultCoonsBoundaries} from "./coonsScene";

afterEach(() => setLanguage("sl"));

const valid = () => [["CoonsPatch", {...defaultCoonsBoundaries(), linkedCorners: true, shown: "s"}]];
type Entry = Record<string, unknown>;
/** The valid data with its patch entry changed by `edit`. */
const changed = (edit: (entry: Entry) => void) => {
    const data = valid();
    edit(data[0][1] as Entry);
    return data;
};
const rejection = (data: unknown): string => {
    const checked = coonsPresetCollection.check(data);
    if ("data" in checked) throw new Error("The data was accepted.");
    return renderMessage(checked.rejection);
};

describe("coons Preset collection", () => {
    it("has the key patch-coons and accepts the default example, with or without view state", () => {
        expect(coonsPresetCollection.key).toBe("patch-coons");
        expect("data" in coonsPresetCollection.check(valid())).toBe(true);
        const withState = changed(entry => { entry.state = {showControlNet: false, showShading: true, camera: {az: 1, el: 0.5, distance: 9, projection: "perspective", target: [1, 1, 0]}}; });
        expect("data" in coonsPresetCollection.check(withState)).toBe(true);
    });

    it("accepts every shown surface and an unlinked file with parted corners", () => {
        for (const shown of ["lc", "ld", "b", "s"]) expect("data" in coonsPresetCollection.check(changed(entry => { entry.shown = shown; }))).toBe(true);
        const parted = changed(entry => { entry.linkedCorners = false; (entry.d1 as number[][])[3] = [3, 4, 0]; });
        expect("data" in coonsPresetCollection.check(parted)).toBe(true);
    });

    it("rejects a wrong point count with the boundary named", () => {
        expect(rejection(changed(entry => { (entry.c1 as number[][]).pop(); }))).toContain("c1");
        expect(rejection(changed(entry => { entry.d0 = undefined; }))).toContain("d0");
    });

    it("rejects non-finite, malformed and out-of-range coordinates", () => {
        expect(rejection(changed(entry => { (entry.c0 as unknown[])[1] = [1, "x", 2]; }))).toBeTruthy();
        expect(rejection(changed(entry => { (entry.c0 as unknown[])[1] = [1, 2]; }))).toBeTruthy();
        expect(rejection(changed(entry => { (entry.c0 as unknown[])[1] = [1, null, 2]; }))).toBeTruthy();
        const far = changed(entry => { (entry.c0 as number[][])[1] = [1, 0, COONS_COORDINATE_LIMIT + 1]; });
        expect(rejection(far)).toContain(String(COONS_COORDINATE_LIMIT));
        expect("data" in coonsPresetCollection.check(changed(entry => { (entry.c0 as number[][])[1] = [1, 0, COONS_COORDINATE_LIMIT]; }))).toBe(true);
    });

    it("rejects an unknown shown surface and a non-boolean linked flag", () => {
        expect(rejection(changed(entry => { entry.shown = "x"; }))).toContain("lc");
        expect(rejection(changed(entry => { delete entry.shown; }))).toContain("lc");
        expect(rejection(changed(entry => { entry.linkedCorners = "yes"; }))).toContain("linkedCorners");
        expect(rejection(changed(entry => { delete entry.linkedCorners; }))).toContain("linkedCorners");
    });

    it("rejects a linked file whose end points do not coincide, and says how to fix it", () => {
        setLanguage("en");
        const text = rejection(changed(entry => { (entry.d1 as number[][])[3] = [3, 4, 0]; }));
        expect(text).toContain("linkedCorners");
        expect(text).toContain("false");
    });

    it("rejects other shapes of data", () => {
        for (const data of [null, {}, [], [valid()[0], valid()[0]], [["TensorProductBezierPatch", {}]], [["CoonsPatch", 3]]]) expect(coonsPresetCollection.check(data)).toHaveProperty("rejection");
        expect(coonsPresetCollection.check(changed(entry => { entry.extra = 1; }))).toHaveProperty("rejection");
        expect(coonsPresetCollection.check(changed(entry => { entry.state = {showShading: "yes"}; }))).toHaveProperty("rejection");
        expect(coonsPresetCollection.check(changed(entry => { entry.state = {camera: {az: 1}}; }))).toHaveProperty("rejection");
        expect(coonsPresetCollection.check(changed(entry => { entry.state = {zMode: true}; }))).toHaveProperty("rejection");
    });

    it("checks the graphState marker only", () => {
        expect(coonsPresetCollection.checkGraphState?.({initialized: true})).toBeUndefined();
        expect(coonsPresetCollection.checkGraphState?.({shown: "b"})).toBeDefined();
    });
});
