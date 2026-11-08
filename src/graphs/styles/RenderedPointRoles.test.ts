import {JSXGraph} from "jsxgraph";
import {constructionLevelColor, GraphPalette} from "./GraphPalette";
import {stylesFor} from "./GraphStyles";
import {DisplaySettings} from "../base/DisplaySettings";

/**
 * Rendered-appearance contracts (rendered-graph-style-contracts spec, criteria 1, 2, 4, 8). Every expectation names the
 * role's intended palette colour and is read from the SVG element JSXGraph actually drew, never from the style object.
 */

type Marker = {fill: string | null, stroke: string | null, strokeWidth: number, rx: number};

function installBoard(width = 320, height = 240) {
    const container = document.createElement("div");
    container.id = `rendered-roles-${document.body.childElementCount}-${Math.random().toString(36).slice(2)}`;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    document.body.appendChild(container);
    const board = JSXGraph.initBoard(container.id, {
        boundingbox: [-1, 1, 1, -1], axis: false, showCopyright: false, showNavigation: false, renderer: "svg"
    });
    return {container, board};
}

function readMarker(container: HTMLElement): Marker {
    const ellipses = container.querySelectorAll("ellipse");
    expect(ellipses).toHaveLength(1);
    const marker = ellipses[0];
    return {
        fill: marker.getAttribute("fill"),
        stroke: marker.getAttribute("stroke"),
        strokeWidth: Number.parseFloat(marker.getAttribute("stroke-width") ?? ""),
        rx: Number(marker.getAttribute("rx")),
    };
}

const settings = new DisplaySettings();
const styles = stylesFor(settings);

const roles: {role: string, attributes: () => object, fill: string, stroke: string}[] = [
    {role: "editable", attributes: () => styles.point.default, fill: "#bd8040", stroke: "#fffdf5"},
    {role: "fixed/derived", attributes: () => styles.point.fixed, fill: "#87977f", stroke: "#fffdf5"},
    {role: "spline join", attributes: () => styles.point.splineJoin, fill: "#748975", stroke: "#fffdf5"},
    {role: "result", attributes: () => styles.point.result(2), fill: "#bf8542", stroke: "#fffdf5"},
    {role: "construction level 0", attributes: () => styles.point.construction(0), fill: "#98a494", stroke: "#fffdf5"},
    {role: "construction level 2", attributes: () => styles.point.construction(2), fill: "#7186a2", stroke: "#fffdf5"},
    {role: "hodograph (PH auxiliary style)", attributes: () => styles.point.hodograph, fill: "#bd8040", stroke: "#fffdf5"},
];

describe("rendered point marker roles", () => {
    let originalMatchMedia: typeof window.matchMedia | undefined;
    beforeEach(() => {
        originalMatchMedia = window.matchMedia;
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: vi.fn((media: string) => ({
                matches: false, media, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
                addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn()
            }))
        });
    });
    afterEach(() => {
        if (originalMatchMedia) Object.defineProperty(window, "matchMedia", {configurable: true, value: originalMatchMedia});
        else Reflect.deleteProperty(window, "matchMedia");
    });

    test("the table matches the palette so a role cannot silently change meaning", () => {
        expect(roles[0].fill).toBe(GraphPalette.controlPoint);
        expect(roles[1].fill).toBe(GraphPalette.derivedPoint);
        expect(roles[2].fill).toBe(GraphPalette.splineJoin);
        expect(roles[3].fill).toBe(GraphPalette.constructionAccent);
        expect(roles[4].fill).toBe(constructionLevelColor(0));
        expect(roles[5].fill).toBe(constructionLevelColor(2));
        for (const {stroke} of roles) expect(stroke).toBe(GraphPalette.pointOutline);
    });

    test.each(roles)("$role marker renders its own fill and outline", ({attributes, fill, stroke}) => {
        const {container, board} = installBoard();
        try {
            board.create("point", [0, 0], attributes());
            board.update();
            const marker = readMarker(container);
            expect(marker.fill).toBe(fill);
            expect(marker.stroke).toBe(stroke);
            expect(marker.strokeWidth).toBeGreaterThan(0);
            expect(marker.rx).toBeGreaterThan(0);
        } finally {
            JSXGraph.freeBoard(board);
            container.remove();
        }
    });

    test("the hodograph auxiliary board keeps its own marker role and is independent of the main board", () => {
        const large = new DisplaySettings();
        large.setSize(8);
        const largeStyles = stylesFor(large);
        const main = installBoard();
        const aux = installBoard(200, 200);
        try {
            const mainPoint = main.board.create("point", [0, 0], largeStyles.point.default);
            aux.board.create("point", [0, 0], largeStyles.point.hodograph);
            main.board.update();
            aux.board.update();
            const auxBefore = readMarker(aux.container);
            expect(auxBefore.fill).toBe(GraphPalette.controlPoint);
            expect(auxBefore.stroke).toBe(GraphPalette.pointOutline);
            // The hodograph marker is the smaller auxiliary size, not the main-board size.
            expect(auxBefore.rx).toBeLessThan(readMarker(main.container).rx);

            // Hiding the main board's points does not touch the auxiliary board's marker.
            mainPoint.setAttribute({visible: false});
            main.board.update();
            aux.board.update();
            expect(main.container.querySelector("ellipse")?.getAttribute("display")).toBe("none");
            expect(readMarker(aux.container)).toEqual(auxBefore);
            expect(aux.container.querySelector("ellipse")?.getAttribute("display")).not.toBe("none");
        } finally {
            JSXGraph.freeBoard(aux.board);
            JSXGraph.freeBoard(main.board);
            aux.container.remove();
            main.container.remove();
        }
    });

    test("size and point-label settings change the rendered marker and restore", () => {
        const local = new DisplaySettings();
        const localStyles = stylesFor(local);
        const {container, board} = installBoard();
        try {
            const point = board.create("point", [0.25, -0.5], localStyles.point.default);
            board.update();
            const normal = readMarker(container);
            local.setSize(4);
            board.update();
            const large = readMarker(container);
            expect(large.rx).toBeGreaterThan(normal.rx);
            expect(large.fill).toBe(normal.fill);
            local.setSize(0);
            board.update();
            expect(readMarker(container)).toEqual(normal);
            expect([point.X(), point.Y()]).toEqual([0.25, -0.5]);
            expect(board.getBoundingBox()).toEqual([-1, 1, 1, -1]);
        } finally {
            JSXGraph.freeBoard(board);
            container.remove();
        }
    });
});
