import {basisCurveColor, basisCurveDash, comparisonCurveColor, comparisonCurveDash, constructionLevelColor, constructionLevelDash, GraphPalette} from "./GraphPalette";

test("construction levels use distinct colors before cycling", () => {
    const colors = GraphPalette.constructionLevels.map((_, level) => constructionLevelColor(level));
    expect(new Set(colors).size).toBe(colors.length);
});

test("comparison curves use distinct colors before cycling", () => {
    const colors = Array.from({length: GraphPalette.additionalCurves.length + 1}, (_, index) => comparisonCurveColor(index));
    expect(new Set(colors).size).toBe(colors.length);
});

test("construction line patterns differentiate levels beyond the color cycle", () => {
    expect(constructionLevelDash(GraphPalette.constructionLevels.length)).not.toBe(constructionLevelDash(0));
});


test("Bernstein basis roles stay distinguishable by color and line pattern", () => {
    const colors = GraphPalette.basisCurves.map((_, index) => basisCurveColor(index));
    const dashes = GraphPalette.basisCurves.map((_, index) => basisCurveDash(index));
    expect(new Set(colors).size).toBe(colors.length);
    expect(new Set(dashes).size).toBe(dashes.length);
    expect(basisCurveColor(GraphPalette.basisCurves.length)).toBe(basisCurveColor(0));
    expect(basisCurveDash(GraphPalette.basisCurves.length)).not.toBe(basisCurveDash(0));
});

test("comparison curve roles change line pattern when their color palette repeats", () => {
    const roles = Array.from({length: 1 + GraphPalette.additionalCurves.length * 2}, (_, index) =>
        `${comparisonCurveColor(index)}:${comparisonCurveDash(index)}`);
    expect(new Set(roles).size).toBe(roles.length);
    expect(comparisonCurveColor(1 + GraphPalette.additionalCurves.length)).toBe(comparisonCurveColor(1));
    expect(comparisonCurveDash(1 + GraphPalette.additionalCurves.length)).not.toBe(comparisonCurveDash(1));
});
