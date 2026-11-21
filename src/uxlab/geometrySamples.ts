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

/** Clips segment a–b to the rectangle, or undefined when it lies outside (Liang–Barsky). */
function clipSegment(a: Sample, b: Sample, left: number, top: number, right: number, bottom: number): [Sample, Sample] | undefined {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1;
    const edges: [number, number][] = [[-dx, a[0] - left], [dx, right - a[0]], [-dy, a[1] - top], [dy, bottom - a[1]]];
    for (const [p, q] of edges) {
        if (p === 0) { if (q < 0) return undefined; continue; }
        const r = q / p;
        if (p < 0) { if (r > t1) return undefined; if (r > t0) t0 = r; } else { if (r < t0) return undefined; if (r < t1) t1 = r; }
    }
    return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
}

/**
 * The visible part of a drawn path in drawing order, evenly spaced: polyline paths (JSXGraph curves) are read from their
 * vertices and clipped to the board, so a curve that runs far off the board still yields dense samples where it is seen.
 * A jump between consecutive samples marks a gap.
 */
export function visibleSamples(node: Element, width: number, height: number, spacing = 3): Sample[] {
    const d = node.tagName.toLowerCase() === 'path' ? node.getAttribute('d') ?? '' : '';
    let vertices: Sample[][] = [];
    if (d && /^[\sMLml0-9eE.,+-]*$/.test(d) && !/[ml]/.test(d)) {
        let run: Sample[] = [];
        const tokens = d.match(/[ML]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
        let command = 'M';
        for (let i = 0; i < tokens.length;) {
            if (tokens[i] === 'M' || tokens[i] === 'L') { command = tokens[i]; i++; continue; }
            const point: Sample = [Number(tokens[i]), Number(tokens[i + 1])];
            i += 2;
            if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue;
            if (command === 'M' && run.length) { vertices.push(run); run = []; }
            run.push(point);
            command = 'L';
        }
        if (run.length) vertices.push(run);
    } else {
        vertices = [sampleNode(node, spacing)];
    }
    const margin = 2;
    const samples: Sample[] = [];
    for (const run of vertices) {
        if (run.length === 1) { const [x, y] = run[0]; if (x >= -margin && y >= -margin && x <= width + margin && y <= height + margin) samples.push(run[0]); continue; }
        for (let i = 1; i < run.length; i++) {
            const clipped = clipSegment(run[i - 1], run[i], -margin, -margin, width + margin, height + margin);
            if (!clipped) continue;
            const [a, b] = clipped;
            const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const steps = Math.max(1, Math.ceil(length / spacing));
            const last = samples[samples.length - 1];
            const from = last && Math.hypot(last[0] - a[0], last[1] - a[1]) < 0.01 ? 1 : 0;
            for (let k = from; k <= steps; k++) samples.push([a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps]);
            if (samples.length > 6000) return samples;
        }
    }
    return samples;
}
