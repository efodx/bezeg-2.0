import {describe, expect, it, vi} from "vitest";
import type {Board} from "jsxgraph";
import {createMovablePoint} from "./pointFactory";

describe("createMovablePoint", () => {
    it("creates the point and binds the hover cursor", () => {
        const handlers: Record<string, () => void> = {};
        const point = {visProp: {fixed: false}, on: vi.fn((name: string, fn: () => void) => { handlers[name] = fn; })};
        const container = {style: {cursor: ""}};
        const create = vi.fn(() => point);
        const board = {create, containerObj: container} as unknown as Board;
        const attrs = {name: "P"};
        expect(createMovablePoint(board, [1, 2], attrs)).toBe(point);
        expect(create).toHaveBeenCalledWith("point", [1, 2], attrs);
        handlers.over();
        expect(container.style.cursor).toBe("pointer");
        handlers.out();
        expect(container.style.cursor).toBe("default");
    });
});
