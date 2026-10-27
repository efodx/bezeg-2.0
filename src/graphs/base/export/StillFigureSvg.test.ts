import {buildStillFigureSvg, StillFigure, StillLabelStyle} from "./StillFigureSvg";
import type {SvgTypesetter} from "./SvgMathLabels";

const style: StillLabelStyle = {fontPx: 20, offsetXPx: 8, color: "#123456"};
const typeset: SvgTypesetter = tex => ({viewBox: "0 -1000 3000 2000", body: `<g data-tex="${tex}"></g>`});
const figure: StillFigure = {
    dataUrl: "data:image/png;base64,QUJD",
    width: 400,
    height: 300,
    labels: [
        {id: "seen", text: "S(u,v)", x: 100, y: 80, visible: true},
        {id: "behind", text: "P_{12}", x: 50, y: 60, visible: false},
    ],
};

describe("buildStillFigureSvg", () => {
    it("holds one image of the render at the figure size", () => {
        const svg = buildStillFigureSvg(figure, typeset, style);
        const images = svg.querySelectorAll("image");
        expect(images).toHaveLength(1);
        expect(images[0].getAttribute("href")).toBe(figure.dataUrl);
        expect(svg.getAttribute("viewBox")).toBe("0 0 400 300");
        expect(images[0].getAttribute("width")).toBe("400");
        expect(images[0].getAttribute("height")).toBe("300");
    });

    it("typesets the visible labels as vector formulas and leaves out the hidden ones", () => {
        const svg = buildStillFigureSvg(figure, typeset, style);
        const labels = Array.from(svg.querySelectorAll("g.bezeg-math-labels > svg"));
        expect(labels.map(label => label.getAttribute("data-label-id"))).toEqual(["seen"]);
        expect(labels[0].querySelector("g")?.getAttribute("data-tex")).toBe("S(u,v)");
        expect(svg.innerHTML).not.toContain("P_{12}");
    });

    it("places a label right of its anchor, centred on it, sized from the MathJax viewBox at the font size", () => {
        const [label] = Array.from(buildStillFigureSvg(figure, typeset, style).querySelectorAll("g.bezeg-math-labels > svg"));
        // viewBox 3000 x 2000 is 3 em x 2 em; at 20 px that is 60 x 40, centred on y = 80.
        expect(label.getAttribute("width")).toBe("60");
        expect(label.getAttribute("height")).toBe("40");
        expect(label.getAttribute("x")).toBe("108");
        expect(label.getAttribute("y")).toBe("60");
        expect(label.getAttribute("color")).toBe("#123456");
    });

    it("draws no label group content when every label is hidden", () => {
        const hidden = {...figure, labels: figure.labels.map(label => ({...label, visible: false}))};
        expect(buildStillFigureSvg(hidden, typeset, style).querySelectorAll("g.bezeg-math-labels > svg")).toHaveLength(0);
    });

    it("rejects a viewBox it cannot measure", () => {
        expect(() => buildStillFigureSvg(figure, () => ({viewBox: "nope", body: ""}), style)).toThrow("viewBox");
    });
});
