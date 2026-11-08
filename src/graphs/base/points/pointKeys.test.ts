import {describe, expect, it} from "vitest";
import {pointKeyCommand} from "./pointKeys";

const key = (k: string, extra: object = {}) => ({key: k, shiftKey: false, ...extra});

describe("pointKeyCommand", () => {
    it("moves by one step; Up is +y", () => {
        expect(pointKeyCommand(key("ArrowRight"), {step: 0.5})).toEqual({kind: "move", dx: 0.5, dy: 0});
        expect(pointKeyCommand(key("ArrowLeft"), {step: 0.5})).toEqual({kind: "move", dx: -0.5, dy: 0});
        expect(pointKeyCommand(key("ArrowUp"), {step: 0.5})).toEqual({kind: "move", dx: 0, dy: 0.5});
        expect(pointKeyCommand(key("ArrowDown"), {step: 0.5})).toEqual({kind: "move", dx: 0, dy: -0.5});
    });
    it("Shift uses the default big step (10 steps) or the given one", () => {
        expect(pointKeyCommand(key("ArrowRight", {shiftKey: true}), {step: 1})).toEqual({kind: "move", dx: 10, dy: 0});
        expect(pointKeyCommand(key("ArrowUp", {shiftKey: true}), {step: 1, bigStep: 4})).toEqual({kind: "move", dx: 0, dy: 4});
    });
    it("axes x ignores Up and Down", () => {
        expect(pointKeyCommand(key("ArrowUp"), {step: 1, axes: "x"})).toBeUndefined();
        expect(pointKeyCommand(key("ArrowDown"), {step: 1, axes: "x"})).toBeUndefined();
        expect(pointKeyCommand(key("ArrowLeft"), {step: 1, axes: "x"})).toEqual({kind: "move", dx: -1, dy: 0});
    });
    it("maps Delete and Backspace to remove and Escape to back", () => {
        expect(pointKeyCommand(key("Delete"), {step: 1})).toEqual({kind: "remove"});
        expect(pointKeyCommand(key("Backspace"), {step: 1})).toEqual({kind: "remove"});
        expect(pointKeyCommand(key("Escape"), {step: 1})).toEqual({kind: "back"});
    });
    it("ignores other keys and modifier chords", () => {
        expect(pointKeyCommand(key("a"), {step: 1})).toBeUndefined();
        for (const m of ["altKey", "ctrlKey", "metaKey"]) {
            expect(pointKeyCommand(key("ArrowRight", {[m]: true}), {step: 1})).toBeUndefined();
            expect(pointKeyCommand(key("Delete", {[m]: true}), {step: 1})).toBeUndefined();
        }
    });
});
