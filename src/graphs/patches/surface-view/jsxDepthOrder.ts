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
