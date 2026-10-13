import {JSXGraph} from "jsxgraph";
import {GraphPalette} from "./GraphPalette";
import {stylesFor} from "./GraphStyles";
import {DisplaySettings} from "../base/DisplaySettings";

import {decasteljauLabelLayout} from "./PointStyles";

test("compact De Casteljau labels fan around each level in the full twelve-point scheme", () => {
    const pointCount = 12;
    for (let level = 1; level < pointCount; level++) {
        const labelsAtLevel = Array.from({length: pointCount - level}, (_, pointIndex) =>
            decasteljauLabelLayout(level, pointIndex, pointCount));
        const slots = labelsAtLevel.map(({direction, ring}) => `${direction}:${ring}`);
        expect(new Set(slots).size).toBe(labelsAtLevel.length);
    }
});

test("compact De Casteljau labels fan the five-point default by construction level", () => {
    expect(decasteljauLabelLayout(1, 0, 5).direction).toBe(5);
    expect(decasteljauLabelLayout(1, 1, 5).direction).toBe(0);
    expect(decasteljauLabelLayout(1, 2, 5).direction).toBe(0);
    expect(decasteljauLabelLayout(1, 3, 5).direction).toBe(4);
    expect(decasteljauLabelLayout(2, 0, 5).direction).toBe(5);
    expect(decasteljauLabelLayout(2, 1, 5).direction).toBe(2);
    expect(decasteljauLabelLayout(2, 2, 5).direction).toBe(3);
    expect(decasteljauLabelLayout(3, 0, 5).direction).toBe(6);
    expect(decasteljauLabelLayout(3, 1, 5).direction).toBe(2);
    expect(decasteljauLabelLayout(4, 0, 5).direction).toBe(4);
});


test("JSXGraph renders control-point fill and outline as separate colors", () => {
    const container = document.createElement("div");
    container.id = "point-style-renderer-regression";
    container.style.width = "320px";
    container.style.height = "240px";
    document.body.appendChild(container);
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn((media: string) => ({
            matches: false,
            media,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn()
        }))
    });
    const board = JSXGraph.initBoard(container.id, {
        boundingbox: [-1, 1, 1, -1],
        axis: false,
        showCopyright: false,
        showNavigation: false,
        renderer: "svg"
    });

    try {
        const point = board.create("point", [0, 0], stylesFor(new DisplaySettings()).point.default);
        board.update();
        const marker = container.querySelector("ellipse");

        expect(marker).not.toBeNull();
        expect(marker?.getAttribute("fill")).toBe(GraphPalette.controlPoint);
        expect(marker?.getAttribute("stroke")).toBe(GraphPalette.pointOutline);
    } finally {
        JSXGraph.freeBoard(board);
        container.remove();
        if (originalMatchMedia) {
            Object.defineProperty(window, "matchMedia", {configurable: true, value: originalMatchMedia});
        } else {
            delete (window as any).matchMedia;
        }
    }
});
