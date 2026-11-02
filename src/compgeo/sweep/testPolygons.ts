/** Random simple grid polygons shared by the sweep kernel tests (tasks 14 and 15). Test support only. */
import type {GridPoint} from '../grid';
import {polygonSimplicity} from '../predicates';

/** Deterministic generator on [0, 1). */
export function lcg(seed: number): () => number {
    let s = seed;
    return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

/** Star-shaped polygons: random points sorted by angle around an off-lattice centre. */
export function starPolygon(rnd: () => number): GridPoint[] {
    const n = 4 + Math.floor(rnd() * 12);
    const raw = Array.from({length: n}, () => ({x: Math.floor(rnd() * 21) - 10, y: Math.floor(rnd() * 21) - 10}));
    const c = {x: 0.37, y: 0.41};
    return raw.sort((a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x));
}

/** Non-star polygons: a random point cycle untangled by 2-opt reversals, bounded to 60 moves. */
export function untangledPolygon(rnd: () => number): GridPoint[] {
    const n = 5 + Math.floor(rnd() * 11);
    const poly = Array.from({length: n}, () => ({x: Math.floor(rnd() * 21) - 10, y: Math.floor(rnd() * 21) - 10}));
    for (let move = 0; move < 60; move++) {
        const bad = polygonSimplicity(poly, true);
        if (bad.simple) break;
        const [i, j] = bad.edges;
        if (i === j) break;
        const lo = Math.min(i, j) + 1;
        const hi = Math.max(i, j);
        const reversed = poly.slice(lo, hi + 1).reverse();
        poly.splice(lo, hi - lo + 1, ...reversed);
    }
    return poly;
}
