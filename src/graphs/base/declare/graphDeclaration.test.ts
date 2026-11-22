import {describe, expect, it} from "vitest";
import {message, messageNumber} from "../../../localization";
import {
    checkDeclaration,
    checkFrame,
    frameDeclarer,
    type FrameDeclaration,
    type GraphDeclaration,
} from "./graphDeclaration";

type Ids = {
    param: "a" | "n";
    row: "value" | "error";
    note: "hidden";
    legend: "f" | "T";
    section: "order";
    action: "show-error";
};

const label = message("learning");
const text = message("chapter_retry");

/** Unions are erased to the default string ids for the checkers. */
function valid(): GraphDeclaration {
    return {
        parameters: [
            {kind: "range", key: "a", label, placement: "board", min: 0, max: 1, step: 0.1},
            {kind: "count", key: "n", label, placement: "tools", section: "order", min: 1, max: 5},
        ],
        readouts: [{
            id: "g",
            rows: [
                {id: "value", value: messageNumber(1.5), legend: "f"},
                {id: "error", value: text, legend: "T"},
            ],
        }],
        notes: [{id: "hidden", text}],
        legend: [
            {id: "f", label, kind: "line", object: "f"},
            {id: "T", label, kind: "dashed", object: "T"},
        ],
        sections: [{id: "order", title: label, body: [{kind: "text", text}]}],
        actions: [{id: "show-error", label, placement: "tools", enabled: true}],
    };
}

const rangeA = (over: object = {}) => ({kind: "range" as const, key: "a", label, placement: "board" as const, min: 0, max: 1, step: 0.1, ...over});

describe("type level", () => {
    it("rejects ids outside the graph's union and text that is not a Message", () => {
        const frame = frameDeclarer<Ids>();
        // Only compiled by tsc; never called.
        const types = () => {
            // @ts-expect-error unknown row id in highlight
            frame({highlight: ["nope"]});
            // @ts-expect-error unknown section in open
            frame({open: ["section:nope"]});
            // @ts-expect-error unknown id in uses
            frame({uses: ["nope"]});
            frame({highlight: ["error", "hidden"], open: ["section:order", "tools"], uses: ["a", "show-error"]});
            const bad: GraphDeclaration<Ids> = {
                // @ts-expect-error legend is not a legend id
                readouts: [{id: "g", rows: [{id: "value", value: messageNumber(1), legend: "nope"}]}],
            };
            const plain: GraphDeclaration<Ids> = {
                // @ts-expect-error text must be message(...)
                notes: [{id: "hidden", text: "plain string"}],
            };
            return [bad, plain];
        };
        expect(typeof types).toBe("function");
    });
});

describe("checkDeclaration", () => {
    it("accepts a valid declaration", () => {
        expect(checkDeclaration(valid())).toEqual([]);
    });

    it("reports a duplicate id per kind", () => {
        const base = valid();
        const dup = <T,>(items: readonly T[] | undefined) => [...items!, items![0]];
        const cases: [GraphDeclaration, string][] = [
            [{...base, parameters: dup(base.parameters)}, "parameter a"],
            [{...base, readouts: [{id: "g", rows: dup(base.readouts![0].rows)}]}, "row value"],
            [{...base, notes: dup(base.notes)}, "note hidden"],
            [{...base, legend: dup(base.legend)}, "legend f"],
            [{...base, sections: dup(base.sections)}, "section order"],
            [{...base, actions: dup(base.actions)}, "action show-error"],
        ];
        for (const [declaration, where] of cases) {
            expect(checkDeclaration(declaration)).toEqual([{where, problem: "duplicate id"}]);
        }
    });

    it("reports a row that links an unknown legend entry", () => {
        const declaration: GraphDeclaration = {readouts: [{id: "g", rows: [{id: "value", value: text, legend: "zzz"}]}], legend: []};
        expect(checkDeclaration(declaration)).toEqual([{where: "row value", problem: 'links unknown legend entry "zzz"'}]);
    });

    it("reports a range with min >= max", () => {
        for (const over of [{min: 1, max: 1}, {min: 2, max: 1}]) {
            expect(checkDeclaration({parameters: [rangeA(over)]})).toEqual([{where: "parameter a", problem: "needs finite min < max"}]);
        }
    });

    it("reports a non-positive step", () => {
        for (const step of [0, -1]) {
            expect(checkDeclaration({parameters: [rangeA({step})]})).toEqual([{where: "parameter a", problem: "needs a positive step"}]);
        }
    });

    it("reports a count with fractional bounds", () => {
        const count = {kind: "count" as const, key: "n", label, placement: "board" as const, min: 0.5, max: 5};
        expect(checkDeclaration({parameters: [count]})).toEqual([{where: "parameter n", problem: "needs whole bounds"}]);
    });

    it("reports a choice with one option", () => {
        const choice = {kind: "choice" as const, key: "c", label, placement: "board" as const, options: [{value: "x", label}]};
        expect(checkDeclaration({parameters: [choice]})).toEqual([{where: "parameter c", problem: "needs at least two options"}]);
    });

    it("reports a board parameter with a section", () => {
        expect(checkDeclaration({parameters: [rangeA({section: "order"})]})).toEqual([{where: "parameter a", problem: "a board control has no Orodja section"}]);
    });
});

describe("checkFrame", () => {
    const declaration = valid();
    const check = (frame: FrameDeclaration, d: GraphDeclaration = declaration) => checkFrame(frame, d);

    it("accepts a consistent frame", () => {
        expect(check({open: ["readouts", "legend", "tools", "section:order"], highlight: ["value", "hidden"], uses: ["a", "n", "show-error"]})).toEqual([]);
    });

    it("reports a highlight of a missing row", () => {
        expect(check({highlight: ["nope"]})).toEqual([{where: "highlight nope", problem: "no such row or note in this scene"}]);
    });

    it("reports four highlights", () => {
        expect(check({highlight: ["value", "error", "hidden", "value"]})).toEqual([{where: "highlight", problem: "4 highlights, at most 3"}]);
    });

    it("reports opening a legend that does not exist", () => {
        expect(check({open: ["legend"]}, {...declaration, legend: undefined})).toEqual([{where: "open legend", problem: "no legend in this scene"}]);
    });

    it("reports opening an unknown section", () => {
        expect(check({open: ["section:nope"]})).toEqual([{where: "open section:nope", problem: "no such section in this scene"}]);
    });

    it("reports using an unknown id", () => {
        expect(check({uses: ["nope"]})).toEqual([{where: "uses nope", problem: "no such control or action in this scene"}]);
    });

    it("reports using a locked parameter", () => {
        const locked: GraphDeclaration = {parameters: [rangeA({locked: true})]};
        expect(check({uses: ["a"]}, locked)).toEqual([{where: "uses a", problem: "locked in this scene"}]);
    });

    it("reports using a disabled action", () => {
        const disabled: GraphDeclaration = {actions: [{id: "go", label, placement: "board", enabled: false}]};
        expect(check({uses: ["go"]}, disabled)).toEqual([{where: "uses go", problem: "locked in this scene"}]);
    });

    it("requires opening tools for a tools control and passes with it", () => {
        expect(check({uses: ["n"]})).toEqual([{where: "uses n", problem: 'an Orodja control the frame does not open (open "tools")'}]);
        expect(check({uses: ["n"], open: ["tools"]})).toEqual([]);
    });

    it("lets a board control be used without opening anything", () => {
        expect(check({uses: ["a"]})).toEqual([]);
    });
});
