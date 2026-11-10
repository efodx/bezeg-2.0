/**
 * Rosette kernel (spec: isometries-lessons.md "Isometry kernel" item 5; ADR 0047).
 * `rosette(n, mirrors, motif)` returns the images of a motif point about the origin under the cyclic group `C_n`
 * (`mirrors = false`, `n` images) or the dihedral group `D_n` (`mirrors = true`, `2n` images), as doubles.
 * The images use `cos(2 pi j / n)`, `sin(2 pi j / n)`, so they are computed values; the group `order` is the exact integer.
 * The mirror lines pass through the origin at angles `pi j / n`; the base mirror is the x axis.
 * Image order: for `j = 0..n-1` the rotation `j` of the motif, then (with mirrors) its mirror image, so `reflected`
 * alternates `false, true, false, ...` between consecutive images. A motif on a mirror line has coincident images
 * (fewer distinct points); the list still has `order` entries.
 */
export interface RosetteImage {
    readonly x: number;
    readonly y: number;
    /** True for orientation-reversing images (the mirror group elements). */
    readonly reflected: boolean;
}

export interface RosetteResult {
    /** Exact group order: `n` for `C_n`, `2n` for `D_n`. */
    readonly order: number;
    readonly images: readonly RosetteImage[];
}

export function rosette(n: number, mirrors: boolean, motif: { readonly x: number; readonly y: number }): RosetteResult {
    if (!Number.isInteger(n) || n < 1 || n > 12) throw new RangeError('n must be an integer from 1 to 12');
    const images: RosetteImage[] = [];
    for (let j = 0; j < n; j++) {
        const angle = (2 * Math.PI * j) / n;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        images.push({x: cos * motif.x - sin * motif.y, y: sin * motif.x + cos * motif.y, reflected: false});
        if (mirrors) {
            // Reflect in the x axis first: (x, -y), then rotate.
            images.push({x: cos * motif.x + sin * motif.y, y: sin * motif.x - cos * motif.y, reflected: true});
        }
    }
    return {order: mirrors ? 2 * n : n, images};
}
