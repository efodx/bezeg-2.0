/**
 * Painter's order for the JSXGraph surface view: indices of drawables sorted farthest first, so that later (nearer)
 * SVG nodes paint over earlier ones.
 */

const INDEX_BITS = 16;
const MAX_PACKED = 2 ** INDEX_BITS - 1;
const LEVELS = 2 ** 32 - 1;

/**
 * Indices `0..n-1` ordered by descending depth (largest depth = farthest = first). Equal depths keep ascending index
 * order. Depth is quantized to 32 bits and packed with the index into one float so the native numeric typed-array
 * sort (no comparator callbacks) does the work; more than 65535 drawables fall back to a comparator sort.
 */
export function orderBackToFront(depths: ArrayLike<number>): Uint32Array {
    const n = depths.length;
    const order = new Uint32Array(n);
    if (n === 0) return order;
    if (n > MAX_PACKED) {
        for (let i = 0; i < n; i++) order[i] = i;
        order.sort((a, b) => depths[b] - depths[a] || a - b);
        return order;
    }
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) {
        const d = depths[i];
        if (d < lo) lo = d;
        if (d > hi) hi = d;
    }
    const scale = hi > lo ? LEVELS / (hi - lo) : 0;
    const keys = new Float64Array(n);
    // Ascending keys; the quantized depth is mirrored so the farthest drawable gets the smallest key.
    for (let i = 0; i < n; i++) keys[i] = (LEVELS - Math.floor((depths[i] - lo) * scale)) * (MAX_PACKED + 1) + i;
    keys.sort();
    for (let i = 0; i < n; i++) order[i] = keys[i] % (MAX_PACKED + 1);
    return order;
}

/**
 * Puts `nodes[order[0]]`, `nodes[order[1]]`, ... into that DOM order under their common parent, moving only the nodes
 * that are out of place. Nodes that are missing or have another parent are skipped. Returns the number of moves.
 */
export function applyDomOrder(nodes: ReadonlyArray<Node | null | undefined>, order: ArrayLike<number>, parent: Node): number {
    let cursor: Node | null = parent.firstChild;
    let moves = 0;
    for (let k = 0; k < order.length; k++) {
        const node = nodes[order[k]];
        if (!node || node.parentNode !== parent) continue;
        if (node === cursor) {
            cursor = cursor.nextSibling;
            continue;
        }
        // Skip a stale cursor that belongs to a drawable we have not placed (e.g. other layer content).
        parent.insertBefore(node, cursor);
        moves++;
    }
    return moves;
}

/** Most pieces one polyline segment is split into; bounds the drawable count when a control net is long. */
export const MAX_SEGMENT_PIECES = 16;

/** Mean edge length over all triangle edges of an indexed mesh (0 for no triangles). */
export function meanTriangleEdge(positions: ArrayLike<number>, faces: ArrayLike<number>): number {
    let sum = 0;
    const triangles = Math.floor(faces.length / 3);
    for (let t = 0; t < triangles * 3; t += 3) {
        for (let k = 0; k < 3; k++) {
            const a = faces[t + k] * 3, b = faces[t + (k + 1) % 3] * 3;
            sum += Math.hypot(positions[a] - positions[b], positions[a + 1] - positions[b + 1], positions[a + 2] - positions[b + 2]);
        }
    }
    return triangles ? sum / (3 * triangles) : 0;
}

/**
 * How many pieces a line segment of `length` is drawn as so that no piece is much longer than a mesh edge. A painter's
 * order gives one drawable one depth, so a long segment that crosses many triangles (a control-net edge hovering over
 * the surface) cannot be ordered correctly against all of them; pieces of about one mesh edge can. Without a mesh
 * (`meshEdge` 0) there is nothing to order against and a segment stays whole.
 */
export function segmentPieceCount(length: number, meshEdge: number): number {
    if (!(meshEdge > 0) || !(length > meshEdge)) return 1;
    return Math.min(MAX_SEGMENT_PIECES, Math.ceil(length / meshEdge));
}

/** A piece count is kept while it stays within the counts of a segment 25% shorter and 25% longer (no churn at a boundary). */
const PIECE_HYSTERESIS = 1.25;

/** True when `current` pieces no longer suit a segment of `length`: a drag has changed its length past the hysteresis band. */
export function pieceCountStale(length: number, meshEdge: number, current: number): boolean {
    return current < segmentPieceCount(length / PIECE_HYSTERESIS, meshEdge) || current > segmentPieceCount(length * PIECE_HYSTERESIS, meshEdge);
}
