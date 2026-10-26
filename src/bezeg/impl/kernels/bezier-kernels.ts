/**
 * Dimension-generic Bézier kernels on coordinate rows: each row is one control point's coordinates,
 * of any length. Curves convert their points to rows and back; patches compose these per row or column.
 * Pure arithmetic: no Point, JSXGraph or React.
 */

/** A rational control net: coordinate rows with one weight per row. */
export interface WeightedNet {
    rows: number[][];
    weights: number[];
}

/**
 * The one de Casteljau recurrence, in place on `rows`; the result is `rows[0]`.
 * With `weights` each step blends by the weighted (projected) coefficients and updates them;
 * the weights array is consumed. If `scheme` is given, a copy of the rows is appended to it
 * before the first step and after every step, so level r holds all rows, of which the first n - r are current.
 */
export function deCasteljauInPlace(t: number, rows: number[][], weights?: number[], scheme?: number[][][]): void {
    const n = rows.length;
    scheme?.push(rows.map(row => [...row]));
    for (let r = 1; r < n; r++) {
        for (let i = 0; i < n - r; i++) {
            let left = 1 - t;
            let right = t;
            if (weights) {
                const w = left * weights[i] + right * weights[i + 1];
                left = left * weights[i] / w;
                right = right * weights[i + 1] / w;
                weights[i] = w;
            }
            const row = rows[i];
            const next = rows[i + 1];
            if (row.length === 2) {
                row[0] = left * row[0] + right * next[0];
                row[1] = left * row[1] + right * next[1];
            } else {
                for (let d = 0; d < row.length; d++) {
                    row[d] = left * row[d] + right * next[d];
                }
            }
        }
        scheme?.push(rows.map(row => [...row]));
    }
}

/** The full de Casteljau scheme at t (see {@link deCasteljauInPlace}); the inputs are not modified. */
export function deCasteljauScheme(t: number, rows: number[][], weights?: number[]): number[][][] {
    const scheme: number[][][] = [];
    deCasteljauInPlace(t, rows.map(row => [...row]), weights && [...weights], scheme);
    return scheme;
}

/** The left net, on [0, t], and right net, on [t, 1], read from the scheme's diagonals. */
export function subdivide(t: number, rows: number[][]): [number[][], number[][]] {
    const scheme = deCasteljauScheme(t, rows);
    const n = scheme.length;
    const left = scheme.map(level => level[0]);
    const right = scheme.map((level, i) => level[n - 1 - i]).reverse();
    return [left, right];
}

/** The net of the same curve reparametrized over [0, t]; t outside [0, 1] extrapolates. */
export function extrapolate(t: number, rows: number[][]): number[][] {
    return deCasteljauScheme(t, rows).map(level => level[0]);
}

/** The net of degree n + 1 describing the same polynomial curve. */
export function elevate(rows: number[][]): number[][] {
    const n = rows.length;
    const elevated = [[...rows[0]]];
    for (let i = 1; i < n; i++) {
        const previous = rows[i - 1];
        const row = rows[i];
        elevated.push(row.map((_, d) => i / n * previous[d] + (1 - i / n) * row[d]));
    }
    elevated.push([...rows[n - 1]]);
    return elevated;
}

/** The net of degree n + 1 describing the same rational curve, with its weights. */
export function elevateRational({rows, weights}: WeightedNet): WeightedNet {
    const n = rows.length;
    const elevatedRows = [[...rows[0]]];
    const elevatedWeights = [weights[0]];
    for (let i = 1; i < n; i++) {
        const w1 = weights[i - 1];
        const w2 = weights[i];
        const w = i / n * w1 + (1 - i / n) * w2;
        const previous = rows[i - 1];
        const row = rows[i];
        elevatedWeights.push(w);
        elevatedRows.push(row.map((_, d) => (i / n * previous[d] * w1 + (1 - i / n) * row[d] * w2) / w));
    }
    elevatedRows.push([...rows[n - 1]]);
    elevatedWeights.push(weights[n - 1]);
    return {rows: elevatedRows, weights: elevatedWeights};
}

/** Homogeneous rows `[w·x₁, …, w·x_d, w]`. */
export function toHomogeneous({rows, weights}: WeightedNet): number[][] {
    return rows.map((row, i) => [...row.map(c => c * weights[i]), weights[i]]);
}

/** Projects homogeneous rows back to coordinates and weights. */
export function fromHomogeneous(rows: number[][]): WeightedNet {
    return {
        rows: rows.map(row => row.slice(0, -1).map(c => c / row[row.length - 1])),
        weights: rows.map(row => row[row.length - 1]),
    };
}

/** Rational subdivision through the polynomial recurrence on homogeneous rows. */
export function subdivideRational(t: number, net: WeightedNet): [WeightedNet, WeightedNet] {
    const [left, right] = subdivide(t, toHomogeneous(net));
    return [fromHomogeneous(left), fromHomogeneous(right)];
}

/** Rational extrapolation through the polynomial recurrence on homogeneous rows. */
export function extrapolateRational(t: number, net: WeightedNet): WeightedNet {
    return fromHomogeneous(extrapolate(t, toHomogeneous(net)));
}
