/**
 * Marching squares on an N x N cell grid (level-sets spec, Kernels item 2; ADR 0053 section 2).
 *
 * Degenerate-value policy: a node with f = c counts as positive, a segment whose
 * endpoints coincide is dropped, and the level is never perturbed. Saddle cells use
 * the division-free asymptotic decider G*D >= 0 on the bilinear interpolant.
 * Contours are piecewise-linear illustrations, not the exact curve.
 */

import type { Window2 } from './functions2';

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

export interface Segment2 {
  readonly a: Point2;
  readonly b: Point2;
}

/** Grid coordinate with the integer ratio first, so such nodes as 1 are exact doubles. */
function node(lo: number, hi: number, i: number, n: number): number {
  return lo + ((hi - lo) * i) / n;
}

type Edge = 'bottom' | 'right' | 'top' | 'left';

/**
 * Segments (as edge pairs) per case index, bit weights 00:1, 10:2, 11:4, 01:8
 * where 00 is the lower-left corner and 10 the lower-right. Saddle cases 5 and 10
 * are handled separately.
 */
const CASE_EDGES: Readonly<Record<number, readonly (readonly [Edge, Edge])[]>> = {
  1: [['left', 'bottom']],
  2: [['bottom', 'right']],
  3: [['left', 'right']],
  4: [['right', 'top']],
  6: [['bottom', 'top']],
  7: [['left', 'top']],
  8: [['left', 'top']],
  9: [['bottom', 'top']],
  11: [['right', 'top']],
  12: [['left', 'right']],
  13: [['bottom', 'right']],
  14: [['left', 'bottom']],
};

/**
 * Segments of the level set f = c over the window with n x n cells.
 * Output is segments only; chaining into polylines is a separate step.
 */
export function marchingSquares(
  f: (x: number, y: number) => number,
  window: Window2,
  n: number,
  c: number,
): Segment2[] {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= n; i += 1) {
    xs.push(node(window.xMin, window.xMax, i, n));
    ys.push(node(window.yMin, window.yMax, i, n));
  }
  const values: number[][] = xs.map((x) => ys.map((y) => f(x, y)));
  const segments: Segment2[] = [];

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const f00 = values[i][j];
      const f10 = values[i + 1][j];
      const f11 = values[i + 1][j + 1];
      const f01 = values[i][j + 1];
      const index =
        (f00 >= c ? 1 : 0) | (f10 >= c ? 2 : 0) | (f11 >= c ? 4 : 0) | (f01 >= c ? 8 : 0);
      if (index === 0 || index === 15) continue;

      // Every edge point is computed from its lower-index node first, so two
      // neighbouring cells produce bit-identical shared vertices.
      const point = (edge: Edge): Point2 => {
        const [ia, ja, ib, jb] =
          edge === 'bottom'
            ? [i, j, i + 1, j]
            : edge === 'top'
              ? [i, j + 1, i + 1, j + 1]
              : edge === 'left'
                ? [i, j, i, j + 1]
                : [i + 1, j, i + 1, j + 1];
        const fa = values[ia][ja];
        const fb = values[ib][jb];
        const t = (c - fa) / (fb - fa);
        // The signs differ, so fb - fa is nonzero; t = 0 or 1 selects a node exactly.
        const lerp = (a: number, b: number): number => (t <= 0 ? a : t >= 1 ? b : a + t * (b - a));
        return { x: lerp(xs[ia], xs[ib]), y: lerp(ys[ja], ys[jb]) };
      };

      let pairs: readonly (readonly [Edge, Edge])[];
      if (index === 5 || index === 10) {
        const d = f00 + f11 - f01 - f10;
        const g = f00 * f11 - f01 * f10 - c * d;
        const joined = g * d >= 0;
        if (index === 5) {
          pairs = joined
            ? [['bottom', 'right'], ['left', 'top']]
            : [['left', 'bottom'], ['right', 'top']];
        } else {
          pairs = joined
            ? [['left', 'bottom'], ['right', 'top']]
            : [['bottom', 'right'], ['left', 'top']];
        }
      } else {
        pairs = CASE_EDGES[index];
      }
      for (const [e1, e2] of pairs) {
        const a = point(e1);
        const b = point(e2);
        if (a.x === b.x && a.y === b.y) continue;
        segments.push({ a, b });
      }
    }
  }
  return segments;
}

/**
 * One NaN-separated curve for one level, as in ADR 0037: two points per segment,
 * then NaN.
 */
export function levelCurve(segments: readonly Segment2[]): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  for (const { a, b } of segments) {
    x.push(a.x, b.x, NaN);
    y.push(a.y, b.y, NaN);
  }
  return { x, y };
}

/** Total length of the segments. */
export function contourLength(segments: readonly Segment2[]): number {
  let total = 0;
  for (const { a, b } of segments) total += Math.hypot(b.x - a.x, b.y - a.y);
  return total;
}
