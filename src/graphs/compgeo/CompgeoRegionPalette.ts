/** Local colors for signed and categorical computational geometry regions. */
export const CompgeoRegionPalette = {
    positiveFill: "#d9eee4",
    negativeFill: "#f3deda",
    positiveBoundary: "#54806e",
    negativeBoundary: "#a75e5d",
    latticeInterior: "#6d8792",
    latticeBoundary: "#9a805b",
    illegalEdge: "#b55352",
    illegalWash: "#f2e4dc",
    cellFills: ["#dcecf5", "#dcefe7", "#f3ead7", "#e8e3f2", "#f3e0dc", "#dcebed"] as const,
    cellBoundary: "#71818a",
    highlightedCellBoundary: "#425c70",
} as const;

export function voronoiCellFill(site: number): string {
    return CompgeoRegionPalette.cellFills[((site % CompgeoRegionPalette.cellFills.length) + CompgeoRegionPalette.cellFills.length) % CompgeoRegionPalette.cellFills.length];
}
