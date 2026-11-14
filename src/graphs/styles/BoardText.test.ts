import {JSXGraph} from "jsxgraph";
import {afterEach, describe, expect, it} from "vitest";
import {applyBoardTextDefaults, BOARD_FONT_FAMILY, BOARD_TEXT_STYLE} from "./BoardText";
import {GraphSession} from "../base/GraphSession";
import {BOARD_TEXT_STYLE as REEXPORTED} from "../functions/BaseFunctionGraph";

const containers: HTMLElement[] = [];
afterEach(() => containers.splice(0).forEach(c => c.remove()));

function container(): HTMLElement {
    const el = document.createElement("div");
    el.id = `board-text-${Math.random().toString(36).slice(2)}`;
    el.style.width = "320px";
    el.style.height = "240px";
    document.body.appendChild(el);
    containers.push(el);
    return el;
}

const options = {boundingbox: [-1, 1, 1, -1] as [number, number, number, number], axis: false, showCopyright: false, showNavigation: false, renderer: "svg" as const};

describe("board text face", () => {
    it("is the Literata stack with lining tabular numerals, never Arial", () => {
        expect(BOARD_FONT_FAMILY.startsWith('"Literata",')).toBe(true);
        expect(BOARD_TEXT_STYLE).toContain("font-variant-numeric:lining-nums tabular-nums");
        expect(BOARD_TEXT_STYLE).not.toMatch(/arial/i);
        expect(REEXPORTED).toBe(BOARD_TEXT_STYLE);
    });

    it("is read by an unstyled HTML text and its highlight twin on a session board", () => {
        const session = new GraphSession();
        const board = session.createBoard(container(), options);
        const text = board.create("text", [0, 0, "plain"], {useMathJax: false});
        const div = (text as unknown as {rendNode: HTMLElement}).rendNode;
        expect(div.style.fontFamily).toMatch(/^"?Literata/);
        expect(div.style.fontFamily).not.toMatch(/arial/i);
        expect(board.options.text.highlightCssDefaultStyle).toBe(BOARD_TEXT_STYLE);
    });

    it("gives internal SVG text the same face", () => {
        const board = JSXGraph.initBoard(container(), options);
        applyBoardTextDefaults(board);
        const text = board.create("text", [0, 0, "svg"], {display: "internal"});
        const node = (text as unknown as {rendNode: SVGElement}).rendNode;
        const family = node.style.fontFamily || node.getAttribute("font-family") || "";
        expect(family).toMatch(/^"?Literata/);
        expect(family).not.toMatch(/arial/i);
        JSXGraph.freeBoard(board);
    });
});
