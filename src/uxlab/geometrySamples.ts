import {contentElements, svgRoot, type UxBoard, type UxElement} from './board';

export type Sample = readonly [number, number];

/** A string that changes whenever the drawn geometry of a node changes. */
export function geometryKey(node: Element): string {
    const attributes = ['d', 'points', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'x', 'y'];
    return node.tagName + ':' + attributes.map(name => node.getAttribute(name) ?? '').join('|');
}

/** Samples a drawn node in the coordinates of its SVG root (pixels inside the board). */
export function sampleNode(node: Element, spacing = 6): Sample[] {
    if (!(node instanceof SVGGeometryElement)) return [];
    const tag = node.tagName.toLowerCase();
    if (tag === 'ellipse' || tag === 'circle') {
        const rx = Number(node.getAttribute('rx') ?? node.getAttribute('r') ?? 0);
        if (rx < 9) return [[Number(node.getAttribute('cx')), Number(node.getAttribute('cy'))]];
    }
    let length = 0;
    try { length = node.getTotalLength(); } catch { return []; }
    if (!Number.isFinite(length) || length <= 0) return [];
    const count = Math.min(400, Math.max(2, Math.ceil(length / spacing)));
    const samples: Sample[] = [];
    for (let i = 0; i <= count; i++) {
        const point = node.getPointAtLength(length * i / count);
        samples.push([point.x, point.y]);
    }
    return samples;
}

/** Samples of the board's content that changed since a set of geometry keys was recorded. */
export function changedSamples(board: UxBoard, beforeKeys: Set<string>): Sample[] {
    const svg = svgRoot(board);
    if (!svg) return [];
    const width = board.canvasWidth, height = board.canvasHeight;
    const samples: Sample[] = [];
    for (const element of contentElements(board)) {
        const node = element.rendNode!;
        if (beforeKeys.has(geometryKey(node))) continue;
        for (const sample of sampleNode(node)) if (sample[0] >= -20 && sample[1] >= -20 && sample[0] <= width + 20 && sample[1] <= height + 20) samples.push(sample);
    }
    return samples;
}

export function boardGeometryKeys(board: UxBoard): Set<string> {
    return new Set(contentElements(board).map((element: UxElement) => geometryKey(element.rendNode!)));
}

function nearest(point: Sample, set: readonly Sample[]): number {
    let best = Infinity;
    for (const other of set) {
        const dx = point[0] - other[0], dy = point[1] - other[1];
        const distance = dx * dx + dy * dy;
        if (distance < best) best = distance;
    }
    return Math.sqrt(best);
}

/** 0–100: how close a sketch lies to the target (both ways, so a dot does not win against a whole curve). */
export function matchScore(sketch: readonly Sample[], target: readonly Sample[], scale = 45): number {
    if (sketch.length === 0 || target.length === 0) return 0;
    const thin = (set: readonly Sample[]) => set.length > 300 ? set.filter((_, index) => index % Math.ceil(set.length / 300) === 0) : set;
    const a = thin(sketch), b = thin(target);
    const precision = a.reduce((sum, point) => sum + nearest(point, b), 0) / a.length;
    const recall = b.reduce((sum, point) => sum + nearest(point, a), 0) / b.length;
    // Where the sketch lies counts most; how much of the change it covers counts too, but a partial sketch is still a prediction.
    const distance = 0.65 * precision + 0.35 * recall;
    return Math.round(100 * Math.exp(-distance / scale));
}

/** Symmetric mean distance in pixels between two sample sets (Infinity when either is empty). */
export function matchDistance(a: readonly Sample[], b: readonly Sample[]): number {
    if (a.length === 0 || b.length === 0) return Infinity;
    const thin = (set: readonly Sample[]) => set.length > 260 ? set.filter((_, index) => index % Math.ceil(set.length / 260) === 0) : set;
    const x = thin(a), y = thin(b);
    const forward = x.reduce((sum, point) => sum + nearest(point, y), 0) / x.length;
    const backward = y.reduce((sum, point) => sum + nearest(point, x), 0) / y.length;
    return Math.max(forward, backward);
}

/**
 * Distance between two drawings shape by shape (the worst shape counts), so a small moved part next to a long unchanged
 * curve still reads as apart. Falls back to the flattened distance when the shapes do not pair up.
 */
export function shapeDistance(a: readonly (readonly Sample[])[], b: readonly (readonly Sample[])[]): number {
    if (a.length !== b.length || a.length === 0) return matchDistance(a.flat(), b.flat());
    let worst = 0;
    for (let i = 0; i < a.length; i++) worst = Math.max(worst, matchDistance(a[i], b[i]));
    return worst;
}
