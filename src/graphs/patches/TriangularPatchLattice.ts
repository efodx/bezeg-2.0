/** The canonical triangular lattice of control indices. Pure: no graph, renderer or React types. */

/** Canonical order: `i` from `n` down to 0, then `j` from `n - i` down to 0, `k = n - i - j` (index 0 is `(n,0,0)`). */
export function triangularIndices(degree: number): Array<[number, number, number]> {
    const result: Array<[number, number, number]> = [];
    for (let i = degree; i >= 0; i--) for (let j = degree - i; j >= 0; j--) result.push([i, j, degree - i - j]);
    return result;
}

/** The position of `b_ijk` in the canonical flat net of the given degree. */
export function triangularIndex(degree: number, i: number, j: number): number {
    const rowLength = degree - i;
    return rowLength * (rowLength + 1) / 2 + (degree - i - j);
}

/** The number of control points of a triangular net of the given degree. */
export const triangularNetLength = (degree: number): number => (degree + 1) * (degree + 2) / 2;

export type LatticeRowFamily = "i" | "j" | "k";

export interface LatticeRow {
    family: LatticeRowFamily;
    /** The constant value of the family's barycentric index along the row. */
    value: number;
    /** Canonical flat indices, from the first to the last point along the row. */
    indices: number[];
}

/**
 * The rows of the lattice: for each family, the points where that barycentric index is constant. Every lattice edge
 * lies in exactly one row, so drawing the rows draws the net. Single-point rows (a vertex) are left out.
 */
export function triangularRows(degree: number): LatticeRow[] {
    const rows: LatticeRow[] = [];
    for (let value = 0; value < degree; value++) {
        const length = degree - value + 1;
        rows.push({family: "i", value, indices: Array.from({length}, (_, t) => triangularIndex(degree, value, degree - value - t))});
        rows.push({family: "j", value, indices: Array.from({length}, (_, t) => triangularIndex(degree, degree - value - t, value))});
        rows.push({family: "k", value, indices: Array.from({length}, (_, t) => triangularIndex(degree, degree - value - t, t))});
    }
    return rows;
}

export const triangularPointId = (i: number, j: number, k: number): string => `t-${i}-${j}-${k}`;

/** Parses `t-i-j-k`; undefined for any other id. */
export function parseTriangularPointId(id: string): [number, number, number] | undefined {
    const match = /^t-(\d+)-(\d+)-(\d+)$/.exec(id);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
}
