export const GraphPalette = {
    boardSurface: "#fffdf5",
    primaryCurve: "#587445",
    comparisonCurve: "#6175ad",
    additionalCurves: ["#6f9285", "#ad8054", "#887b9a", "#9b7e72", "#66869a"] as const,
    referenceCurve: "#8d9a8d",
    basisCurves: ["#6175ad", "#ad8054", "#6f9285", "#887b9a", "#9b7e72", "#66869a"] as const,
    parameterSample: "#a48752",
    splineJoin: "#748975",
    controlPoint: "#bd8040",
    selectedControlPoint: "#d39a4a",
    selectedControlPointOutline: "#654c2b",
    derivedPoint: "#87977f",
    pointOutline: "#fffdf5",
    controlPolygon: "#a8b39c",
    constructionAccent: "#bf8542",
    constructionLevels: ["#98a494", "#bf8542", "#7186a2", "#8d7d9d", "#6d8a7d", "#b27863"] as const,
    axis: "#788477",
    tick: "#b7c1b5",
    label: "#4d594f",
} as const;

export function constructionLevelColor(level: number): string {
    const index = Math.abs(Math.trunc(level)) % GraphPalette.constructionLevels.length;
    return GraphPalette.constructionLevels[index];
}

export function constructionLevelDash(level: number): number {
    const normalizedLevel = Math.abs(Math.trunc(level));
    return 2 + Math.floor(normalizedLevel / GraphPalette.constructionLevels.length) % 4;
}

export function comparisonCurveColor(index: number): string {
    const normalizedIndex = Math.max(0, Math.trunc(index));
    if (normalizedIndex === 0) return GraphPalette.comparisonCurve;
    return GraphPalette.additionalCurves[(normalizedIndex - 1) % GraphPalette.additionalCurves.length];
}

/** Keep repeated curve hues distinguishable by line pattern after the color cycle. */
export function comparisonCurveDash(index: number): number {
    const normalizedIndex = Math.max(0, Math.trunc(index));
    if (normalizedIndex === 0) return 0;
    const additionalIndex = normalizedIndex - 1;
    const cycle = Math.floor(additionalIndex / GraphPalette.additionalCurves.length);
    const position = additionalIndex % GraphPalette.additionalCurves.length;
    return (position + cycle + 1) % 7;
}

function paletteCycleDash(index: number, cycleLength: number): number {
    const normalizedIndex = Math.max(0, Math.trunc(index));
    const cycle = Math.floor(normalizedIndex / cycleLength);
    const position = normalizedIndex % cycleLength;
    return (position + cycle) % 7;
}

export function basisCurveColor(index: number): string {
    const normalizedIndex = Math.max(0, Math.trunc(index));
    return GraphPalette.basisCurves[normalizedIndex % GraphPalette.basisCurves.length];
}

export function basisCurveDash(index: number): number {
    return paletteCycleDash(index, GraphPalette.basisCurves.length);
}
