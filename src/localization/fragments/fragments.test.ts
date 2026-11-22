import {describe, expect, it} from "vitest";
import {catalogFragments} from "./index";
import {readFileSync} from "node:fs";
import {join} from "node:path";

describe("catalog fragments", () => {
    const entries = Object.entries(catalogFragments);

    it("have the same keys in both languages", () => {
        for (const [family, fragment] of entries) {
            expect(Object.keys(fragment.en).sort(), family).toEqual(Object.keys(fragment.sl).sort());
        }
    });

    it("do not share a key with another fragment", () => {
        const owner = new Map<string, string>();
        const clashes: string[] = [];
        for (const [family, fragment] of entries) {
            for (const key of Object.keys(fragment.sl)) {
                const other = owner.get(key);
                if (other !== undefined) clashes.push(`${key} (${other}, ${family})`);
                owner.set(key, family);
            }
        }
        expect(clashes).toEqual([]);
    });

    it("do not redefine a key of the main catalog", () => {
        // The catalogs spread the fragments, so a clash would silently replace the main entry: read the files' own keys.
        const clashes: string[] = [];
        for (const [file, language] of [["sl.ts", "sl"], ["en.ts", "en"]] as const) {
            const source = readFileSync(join(__dirname, "..", file), "utf8");
            const own = new Set([...source.matchAll(/^ {4}"([^"]+)":/gm)].map(match => match[1]));
            for (const [family, fragment] of entries) {
                for (const key of Object.keys(fragment[language])) if (own.has(key)) clashes.push(`${key} (${family}, ${file})`);
            }
        }
        expect(clashes).toEqual([]);
    });
});
