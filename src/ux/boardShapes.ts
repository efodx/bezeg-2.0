import type {Board} from "jsxgraph";

/** Element types whose rendering is scaffolding or text rather than a drawn mathematical object. */
export const SKIPPED_TYPES = new Set(['axis', 'ticks', 'grid', 'text', 'image', 'button', 'checkbox', 'input', 'slider', 'polygon', 'label']);
const ATTRIBUTES: Record<string, readonly string[]> = {
    path: ['d'], line: ['x1', 'y1', 'x2', 'y2'], ellipse: ['cx', 'cy', 'rx', 'ry'], circle: ['cx', 'cy', 'r'], polyline: ['points'], polygon: ['points'],
};

export function shapeSignature(node: Element): string | undefined {
    const names = ATTRIBUTES[node.tagName.toLowerCase()];
    if (!names) return undefined;
    return names.map(name => node.getAttribute(name) ?? '').join('|');
}

export function shapeVisible(element: any, node: Element): boolean {
    if (element.visPropCalc && element.visPropCalc.visible === false) return false;
    const style = (node as SVGElement).style;
    return style.visibility !== 'hidden' && style.display !== 'none';
}

export interface Shape {
    key: string;
    node: SVGGraphicsElement;
    element: any;
    dot: boolean;
}

/** Every visible drawn shape on the board, keyed by tag and geometry (identity-free). */
export function boardShapes(board: Board): Shape[] {
    const shapes: Shape[] = [];
    for (const element of ((board as any).objectsList ?? []) as any[]) {
        const node: Element | undefined = element?.rendNode;
        if (!node || SKIPPED_TYPES.has(element.elType) || !shapeVisible(element, node)) continue;
        const sig = shapeSignature(node);
        if (sig === undefined) continue;
        const dot = element.elType === 'point' || element.elType === 'glider';
        shapes.push({key: `${node.tagName}|${sig}`, node: node as SVGGraphicsElement, element, dot});
    }
    return shapes;
}

/** Points along a shape in the board's pixel coordinates, about one every `spacing` pixels. */
export function sampleShape(shape: Shape, spacing = 6): [number, number][] {
    const node = shape.node;
    const tag = node.tagName.toLowerCase();
    if (shape.dot) {
        const cx = Number(node.getAttribute('cx')), cy = Number(node.getAttribute('cy'));
        return Number.isFinite(cx) && Number.isFinite(cy) ? [[cx, cy]] : [];
    }
    if (tag === 'line') {
        const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(name => Number(node.getAttribute(name)));
        const n = Math.max(1, Math.min(400, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / spacing)));
        return Array.from({length: n + 1}, (_, i) => [x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n] as [number, number]);
    }
    const geometry = node as unknown as SVGGeometryElement;
    if (typeof geometry.getTotalLength !== 'function') return [];
    let length = 0;
    try { length = geometry.getTotalLength(); } catch { return []; }
    if (!Number.isFinite(length) || length <= 0) return [];
    const n = Math.max(1, Math.min(600, Math.ceil(length / spacing)));
    const points: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
        const p = geometry.getPointAtLength(length * i / n);
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) points.push([p.x, p.y]);
    }
    return points;
}
