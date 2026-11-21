/**
 * Prototype c13 "Ravnilo" (the ruler and protractor from the pencil case, and the measure tool in Figma and maps).
 * Tap points on the graph to lay a chain of up to four pins: every pin snaps to a drawn point, an intersection of two
 * curves, a curve or a grid node; every link shows its length, every corner its angle, and two links their ratio.
 * Pins on drawn points follow them, so a measurement stays live while the student drags a point or a slider. It
 * lets students check a lesson's claims themselves (the centroid divides a median 2 : 1, a control polygon's ratios
 * t : (1-t), a period of 2π) on any board without authoring.
 */
import type {Board} from "jsxgraph";
import {boardShapes, sampleShape} from "./boardShapes";
import "./ux.css";

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_PINS = 4;

type Snap = 'point' | 'intersection' | 'maximum' | 'minimum' | 'curve' | 'grid' | 'free';

interface Pin {
    x: number;
    y: number;
    snap: Snap;
    /** A board point the pin is glued to; the pin follows it. */
    element?: any;
    label?: string;
}

const SNAP_NAMES: Record<Snap, string> = {
    point: 'točka', intersection: 'presečišče', maximum: 'vrh', minimum: 'dno', curve: 'na krivulji', grid: 'mreža', free: '',
};

export function formatNumber(value: number, digits = 2): string {
    if (!Number.isFinite(value)) return '–';
    const rounded = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
    return rounded.toFixed(digits).replace(/\.?0+$/, '').replace('-', '−').replace('.', ',');
}

/** A short exact name for a value that is a simple fraction or a simple multiple of π, if it is one. */
export function exactName(value: number): string | undefined {
    if (!Number.isFinite(value) || Math.abs(value - Math.round(value)) < 1e-9) return undefined;
    for (let q = 2; q <= 12; q++) {
        const p = Math.round(value * q);
        if (Math.abs(value * q - p) < 1e-7 && p !== 0) {
            let a = Math.abs(p), b = q;
            while (b) [a, b] = [b, a % b];
            if (q / a === 1) continue;
            return `${p < 0 ? '−' : ''}${Math.abs(p) / a}/${q / a}`;
        }
    }
    const k = value / Math.PI;
    for (let q = 1; q <= 6; q++) {
        const p = Math.round(k * q);
        if (p !== 0 && Math.abs(k * q - p) < 1e-7) {
            let a = Math.abs(p), b = q;
            while (b) [a, b] = [b, a % b];
            const num = Math.abs(p) / a, den = q / a;
            return `${p < 0 ? '−' : ''}${num === 1 ? '' : num}π${den === 1 ? '' : `/${den}`}`;
        }
    }
    const root = value * value;
    if (Math.abs(root - Math.round(root)) < 1e-7 && Math.round(root) > 1) return `${value < 0 ? '−' : ''}√${Math.round(root)}`;
    return undefined;
}

function withExact(value: number, digits = 2): string {
    const exact = exactName(value);
    const text = formatNumber(value, digits);
    return exact && exact.replace('−', '') !== text.replace('−', '') ? `${text} (${exact})` : text;
}

function segmentIntersection(
    [ax, ay]: [number, number], [bx, by]: [number, number], [cx, cy]: [number, number], [dx, dy]: [number, number],
): [number, number] | undefined {
    const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
    const denominator = rx * sy - ry * sx;
    if (Math.abs(denominator) < 1e-9) return undefined;
    const t = ((cx - ax) * sy - (cy - ay) * sx) / denominator;
    const u = ((cx - ax) * ry - (cy - ay) * rx) / denominator;
    if (t < 0 || t > 1 || u < 0 || u > 1) return undefined;
    return [ax + t * rx, ay + t * ry];
}

const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** A board point's name as plain text, with TeX or numbered indices typeset: P3 → P₃, p_0^1 → p₀¹. */
export function pointLabel(element: any): string | undefined {
    const name = typeof element?.name === 'function' ? element.name() : element?.name;
    if (typeof name !== 'string') return undefined;
    let clean = name.replace(/<[^>]*>/g, '').replace(/\$/g, '').replace(/\\[a-zA-Z]+/g, '').trim();
    clean = clean.replace(/_\{?(\d+)\}?/g, (_, d: string) => Array.from(d, c => SUB[Number(c)]).join(''))
        .replace(/\^\{?(\d+)\}?/g, (_, d: string) => Array.from(d, c => SUP[Number(c)]).join(''))
        .replace(/^([A-Za-z])(\d+)$/, (_, letter: string, d: string) => letter + Array.from(d, c => SUB[Number(c)]).join(''))
        .replace(/[{}_^]/g, '');
    return clean && clean.length <= 5 && !/\s/.test(clean) ? clean : undefined;
}

export function attachMeasure(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-measure-button';
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Izmeri razdalje, kote in razmerja na grafu';
    button.innerHTML = '<span aria-hidden="true">📏</span> Izmeri';
    const capture = document.createElement('div');
    capture.className = 'ux-measure-capture';
    capture.hidden = true;
    const layer = document.createElementNS(SVG_NS, 'svg');
    layer.setAttribute('class', 'ux-measure-layer');
    layer.setAttribute('aria-hidden', 'true');
    const readout = document.createElement('div');
    readout.className = 'ux-measure-readout';
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.hidden = true;
    container.append(layer, capture, readout, button);
    for (const element of [button, capture, readout]) {
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());
    }

    let active = false;
    let pins: Pin[] = [];
    let hover: Pin | undefined;
    let dragging: number | undefined;
    /** The chain is finished (four pins, or the student tapped the last pin again); the next tap starts a new one. */
    let closed = false;

    const unitX = () => (board as any).unitX as number;
    const unitY = () => (board as any).unitY as number;
    const toScreen = (x: number, y: number): [number, number] => {
        const origin = (board as any).origin.scrCoords as number[];
        return [origin[1] + x * unitX(), origin[2] - y * unitY()];
    };
    const toUser = (sx: number, sy: number): [number, number] => {
        const origin = (board as any).origin.scrCoords as number[];
        return [(sx - origin[1]) / unitX(), (origin[2] - sy) / unitY()];
    };
    const local = (event: PointerEvent): [number, number] => {
        const box = svg.getBoundingClientRect();
        return [event.clientX - box.left, event.clientY - box.top];
    };
    const pinPosition = (pin: Pin): [number, number] => {
        if (pin.element) {
            try {
                const x = pin.element.X(), y = pin.element.Y();
                if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
            } catch { /* the element was removed; keep the last position */ }
        }
        return [pin.x, pin.y];
    };

    /** The best snap target near a screen position: drawn point, curve intersection, curve, grid node, or the spot itself. */
    const snapAt = (sx: number, sy: number, coarse: boolean): Pin => {
        const reach = coarse ? 22 : 14;
        let best: {d: number; pin: Pin} | undefined;
        for (const element of ((board as any).objectsList ?? []) as any[]) {
            if ((element.elType !== 'point' && element.elType !== 'glider') || element.visPropCalc?.visible === false) continue;
            let x: number, y: number;
            try { x = element.X(); y = element.Y(); } catch { continue; }
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            const [px, py] = toScreen(x, y);
            const d = Math.hypot(px - sx, py - sy);
            if (d <= reach && (!best || d < best.d)) best = {d, pin: {x, y, snap: 'point', element, label: pointLabel(element)}};
        }
        if (best) return best.pin;

        // Curve pieces near the cursor, in screen pixels; function graphs and axes keep their function for exact refinement.
        interface Piece { points: [number, number][]; f?: (x: number) => number; vertical?: number; element?: any }
        const pieces: Piece[] = [];
        const box = (x: number, y: number) => Math.abs(x - sx) < reach * 2 && Math.abs(y - sy) < reach * 2;
        for (const shape of boardShapes(board)) {
            if (shape.dot) continue;
            const element = shape.element;
            const f = element?.visProp?.curvetype === 'functiongraph' && typeof element.Y === 'function'
                ? (x: number) => Number(element.Y(x)) : undefined;
            const samples = sampleShape(shape, 4);
            let run: [number, number][] = [];
            for (let i = 0; i < samples.length; i++) {
                if (box(...samples[i])) {
                    if (run.length === 0 && i > 0) run.push(samples[i - 1]);
                    run.push(samples[i]);
                } else if (run.length) {
                    run.push(samples[i]);
                    pieces.push({points: run, f, element});
                    run = [];
                }
            }
            if (run.length) pieces.push({points: run, f, element});
        }
        const [ox, oy] = toScreen(0, 0);
        const axesShown = ((board as any).objectsList ?? []).some((element: any) => element.elType === 'axis' && element.visPropCalc?.visible !== false);
        if (axesShown && Math.abs(oy - sy) < reach * 2) pieces.push({points: [[sx - reach * 2, oy], [sx + reach * 2, oy]], f: () => 0});
        if (axesShown && Math.abs(ox - sx) < reach * 2) pieces.push({points: [[ox, sy - reach * 2], [ox, sy + reach * 2]], vertical: 0});

        /** Exact crossing of two pieces near a sampled crossing, when both are function graphs, axes or one of each. */
        const refine = (a: Piece, b: Piece, x: number, y: number): [number, number] => {
            if (a.vertical !== undefined && b.f) return [a.vertical, b.f(a.vertical)];
            if (b.vertical !== undefined && a.f) return [b.vertical, a.f(b.vertical)];
            if (!a.f || !b.f) return [x, y];
            const g = (t: number) => a.f!(t) - b.f!(t);
            const span = 6 / unitX();
            let lo = x - span, hi = x + span;
            let glo = g(lo), ghi = g(hi);
            if (!Number.isFinite(glo) || !Number.isFinite(ghi) || glo * ghi > 0) return [x, y];
            for (let k = 0; k < 80; k++) {
                const mid = (lo + hi) / 2, gm = g(mid);
                if (gm === 0) { lo = hi = mid; break; }
                if (gm * glo < 0) { hi = mid; ghi = gm; } else { lo = mid; glo = gm; }
            }
            const root = (lo + hi) / 2;
            return [root, a.f(root)];
        };
        // Intersections between different pieces, and turning points (extrema) of function graphs.
        for (let a = 0; a < pieces.length; a++) {
            for (let b = a + 1; b < pieces.length; b++) {
                const pa = pieces[a].points, pb = pieces[b].points;
                for (let i = 1; i < pa.length; i++) {
                    for (let j = 1; j < pb.length; j++) {
                        const hit = segmentIntersection(pa[i - 1], pa[i], pb[j - 1], pb[j]);
                        if (!hit) continue;
                        const d = Math.hypot(hit[0] - sx, hit[1] - sy);
                        if (d <= reach && (!best || d < best.d)) {
                            const [x, y] = refine(pieces[a], pieces[b], ...toUser(hit[0], hit[1]));
                            best = {d, pin: {x, y, snap: 'intersection'}};
                        }
                    }
                }
            }
        }
        for (const piece of pieces) {
            const f = piece.f;
            if (!f || piece.points.length < 3) continue;
            const xs = piece.points.map(([px]) => toUser(px, 0)[0]);
            for (let i = 1; i + 1 < xs.length; i++) {
                const y0 = f(xs[i - 1]), y1 = f(xs[i]), y2 = f(xs[i + 1]);
                if (!((y1 - y0) * (y2 - y1) < 0)) continue;
                // Golden-section search for the turning point between the neighbouring samples.
                const maximum = y1 > y0;
                let lo = Math.min(xs[i - 1], xs[i + 1]), hi = Math.max(xs[i - 1], xs[i + 1]);
                for (let k = 0; k < 80; k++) {
                    const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618;
                    if ((f(m1) < f(m2)) === maximum) lo = m1; else hi = m2;
                }
                const x = (lo + hi) / 2, y = f(x);
                const [ex, ey] = toScreen(x, y);
                const d = Math.hypot(ex - sx, ey - sy);
                if (d <= reach && (!best || d < best.d - 2)) best = {d, pin: {x, y, snap: maximum ? 'maximum' : 'minimum'}};
            }
        }
        // Turning points of plotted data (curves drawn from sample arrays): a parabola through three neighbouring samples.
        const plotted = new Set(pieces.filter(piece => !piece.f && piece.element).map(piece => piece.element));
        for (const element of plotted) {
            const xs = element.dataX as number[] | undefined, ys = element.dataY as number[] | undefined;
            if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || xs.length > 20000) continue;
            for (let i = 1; i + 1 < xs.length; i++) {
                const x0 = xs[i - 1], x1 = xs[i], x2 = xs[i + 1], y0 = ys[i - 1], y1 = ys[i], y2 = ys[i + 1];
                if (!((y1 - y0) * (y2 - y1) < 0) || !((x1 - x0) * (x2 - x1) > 0)) continue;
                const [px, py] = toScreen(x1, y1);
                if (Math.abs(px - sx) > reach * 2 || Math.abs(py - sy) > reach * 2) continue;
                const denominator = (x0 - x1) * (x0 - x2) * (x1 - x2);
                const A = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / denominator;
                const B = (x2 * x2 * (y0 - y1) + x1 * x1 * (y2 - y0) + x0 * x0 * (y1 - y2)) / denominator;
                const C = (x1 * x2 * (x1 - x2) * y0 + x2 * x0 * (x2 - x0) * y1 + x0 * x1 * (x0 - x1) * y2) / denominator;
                if (!Number.isFinite(A) || Math.abs(A) < 1e-12) continue;
                const x = -B / (2 * A), y = C - B * B / (4 * A);
                if (x < Math.min(x0, x2) || x > Math.max(x0, x2)) continue;
                const [ex, ey] = toScreen(x, y);
                const d = Math.hypot(ex - sx, ey - sy);
                if (d <= reach && (!best || d < best.d - 2)) best = {d, pin: {x, y, snap: A < 0 ? 'maximum' : 'minimum'}};
            }
        }
        if (best) return best.pin;
        // Nearest point on a curve (exactly on it for a function graph).
        for (const piece of pieces) {
            const pts = piece.points;
            for (let i = 1; i < pts.length; i++) {
                const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
                const lx = bx - ax, ly = by - ay;
                const length2 = lx * lx + ly * ly;
                const t = length2 > 0 ? Math.max(0, Math.min(1, ((sx - ax) * lx + (sy - ay) * ly) / length2)) : 0;
                const px = ax + t * lx, py = ay + t * ly;
                const d = Math.hypot(px - sx, py - sy);
                if (piece.vertical === undefined && (piece.points.length > 2 || piece.f === undefined) && d <= reach * 0.8 && (!best || d < best.d)) {
                    let [x, y] = toUser(px, py);
                    if (piece.f) y = piece.f(x);
                    best = {d, pin: {x, y, snap: 'curve'}};
                }
            }
        }
        if (best) return best.pin;
        // A grid node: whole numbers, or halves when the board is zoomed in far enough to tell them apart.
        const [ux, uy] = toUser(sx, sy);
        const step = Math.min(unitX(), unitY()) >= 60 ? 0.5 : 1;
        const gx = Math.round(ux / step) * step, gy = Math.round(uy / step) * step;
        const [gsx, gsy] = toScreen(gx, gy);
        if (Math.hypot(gsx - sx, gsy - sy) <= reach * 0.75) return {x: gx, y: gy, snap: 'grid'};
        return {x: ux, y: uy, snap: 'free'};
    };

    const make = <K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number>, parent: Element = layer) => {
        const node = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
        parent.appendChild(node);
        return node;
    };
    const tag = (x: number, y: number, text: string, className: string) => {
        const group = make('g', {class: `ux-measure-tag ${className}`, transform: `translate(${x.toFixed(1)},${y.toFixed(1)})`});
        const label = make('text', {x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central'}, group);
        label.textContent = text;
        let width = text.length * 7.4 + 14;
        try { width = (label as SVGTextElement).getComputedTextLength() + 14; } catch { /* layout unavailable */ }
        const box = make('rect', {x: -width / 2, y: -11, width, height: 22, rx: 11}, group);
        group.insertBefore(box, label);
        return group;
    };

    /** Pins on named board points keep the board's name; other pins get letters the board does not use. */
    const names = () => {
        const taken = new Set<string>();
        for (const element of ((board as any).objectsList ?? []) as any[]) {
            if (element.elType === 'point' || element.elType === 'glider') {
                const name = pointLabel(element);
                if (name) taken.add(name.replace(/[₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹]+$/, '').toUpperCase());
            }
        }
        // Lessons often call triangle vertices A, B, C even when the board shows P₁, P₂, P₃.
        for (const letter of 'ABCDOGHI') taken.add(letter);
        const free = 'KLMNRSTUVW'.split('').filter(letter => !taken.has(letter));
        let next = 0;
        return pins.map(pin => pin.label ?? free[next++] ?? '?');
    };

    const render = () => {
        layer.replaceChildren();
        const chain = pins.map(pinPosition);
        const screen = chain.map(([x, y]) => toScreen(x, y));
        const label = names();
        const lines: string[] = [];

        // Links: ruler band with ticks, then the length tag at the middle.
        for (let i = 1; i < screen.length; i++) {
            const [ax, ay] = screen[i - 1], [bx, by] = screen[i];
            const [ux1, uy1] = chain[i - 1], [ux2, uy2] = chain[i];
            const length = Math.hypot(ux2 - ux1, uy2 - uy1);
            make('line', {class: 'ux-measure-band', x1: ax, y1: ay, x2: bx, y2: by});
            make('line', {class: 'ux-measure-link', x1: ax, y1: ay, x2: bx, y2: by});
            // Ticks every whole unit along the link (or every tenth when the link is short).
            const pixels = Math.hypot(bx - ax, by - ay);
            const unitStep = length >= 2 ? 1 : length >= 0.4 ? 0.1 : 0;
            if (unitStep && pixels > 30) {
                const count = Math.floor(length / unitStep + 1e-9);
                const nx = -(by - ay) / pixels, ny = (bx - ax) / pixels;
                for (let k = 1; k <= count && k <= 60; k++) {
                    const f = (k * unitStep) / length;
                    if (f >= 0.999) break;
                    const px = ax + (bx - ax) * f, py = ay + (by - ay) * f;
                    const big = unitStep === 0.1 ? k % 5 === 0 : true;
                    const size = big ? 6 : 3.5;
                    make('line', {class: 'ux-measure-tick', x1: px - nx * size, y1: py - ny * size, x2: px + nx * size, y2: py + ny * size});
                }
            }
            const mx = (ax + bx) / 2, my = (ay + by) / 2;
            const nx = pixels > 0 ? -(by - ay) / pixels : 0, ny = pixels > 0 ? (bx - ax) / pixels : -1;
            const side = ny > 0 ? -1 : 1;
            tag(mx + nx * 18 * side, my + ny * 18 * side, formatNumber(length), 'ux-measure-length');
            const name = `|${label[i - 1]}${label[i]}|`;
            const dx = ux2 - ux1, dy = uy2 - uy1;
            const slope = Math.abs(dx) < 1e-12 ? 'navpična' : withExact(dy / dx);
            lines.push(`<span class="ux-measure-row"><b>${name}</b> = ${withExact(length)}<small>naklon ${slope}</small></span>`);
        }
        // Corners: arc and angle.
        for (let i = 1; i + 1 < screen.length; i++) {
            const [px, py] = screen[i];
            const [ax, ay] = screen[i - 1], [bx, by] = screen[i + 1];
            const [u0, v0] = chain[i - 1], [u1, v1] = chain[i], [u2, v2] = chain[i + 1];
            const a1 = Math.atan2(v0 - v1, u0 - u1), a2 = Math.atan2(v2 - v1, u2 - u1);
            let angle = Math.abs(a2 - a1);
            if (angle > Math.PI) angle = 2 * Math.PI - angle;
            const degrees = angle * 180 / Math.PI;
            const s1 = Math.atan2(ay - py, ax - px), s2 = Math.atan2(by - py, bx - px);
            let sweep = s2 - s1;
            while (sweep > Math.PI) sweep -= 2 * Math.PI;
            while (sweep < -Math.PI) sweep += 2 * Math.PI;
            const r = Math.max(16, Math.min(34, Math.hypot(ax - px, ay - py) / 3, Math.hypot(bx - px, by - py) / 3));
            const straight = Math.abs(degrees - 180) < 0.05;
            if (straight) {
                // Collinear pins: a small bar across the corner instead of a half disc.
                const nx = -Math.sin(s1), ny = Math.cos(s1);
                make('line', {class: 'ux-measure-arc', x1: px - nx * 9, y1: py - ny * 9, x2: px + nx * 9, y2: py + ny * 9});
            } else if (Math.abs(degrees - 90) < 0.05) {
                const d1 = [Math.cos(s1), Math.sin(s1)], d2 = [Math.cos(s2), Math.sin(s2)];
                const q = r * 0.6;
                make('path', {class: 'ux-measure-arc', d: `M${px + d1[0] * q},${py + d1[1] * q} L${px + (d1[0] + d2[0]) * q},${py + (d1[1] + d2[1]) * q} L${px + d2[0] * q},${py + d2[1] * q}`});
            } else {
                const ex = px + Math.cos(s1 + sweep) * r, ey = py + Math.sin(s1 + sweep) * r;
                make('path', {class: 'ux-measure-wedge', d: `M${px},${py} L${px + Math.cos(s1) * r},${py + Math.sin(s1) * r} A${r},${r} 0 0 ${sweep > 0 ? 1 : 0} ${ex},${ey} Z`});
                make('path', {class: 'ux-measure-arc', d: `M${px + Math.cos(s1) * r},${py + Math.sin(s1) * r} A${r},${r} 0 0 ${sweep > 0 ? 1 : 0} ${ex},${ey}`});
            }
            const mid = s1 + sweep / 2;
            const off = straight ? 20 : r + 22;
            tag(px + Math.cos(mid) * off, py + Math.sin(mid) * off, `${formatNumber(degrees, 1)}°`, 'ux-measure-angle');
            lines.push(`<span class="ux-measure-row"><b>∠${label[i - 1]}${label[i]}${label[i + 1]}</b> = ${formatNumber(degrees, 1)}°${straight ? '<small>na isti premici</small>' : Math.abs(degrees - 90) < 0.05 ? '<small>pravi kot</small>' : ''}</span>`);
        }
        // Ratio of consecutive links: the lesson claims (2 : 1, t : (1−t)) read off directly.
        for (let i = 2; i < chain.length; i++) {
            const first = Math.hypot(chain[i - 1][0] - chain[i - 2][0], chain[i - 1][1] - chain[i - 2][1]);
            const second = Math.hypot(chain[i][0] - chain[i - 1][0], chain[i][1] - chain[i - 1][1]);
            if (second > 1e-9) {
                const ratio = first / second;
                const fraction = /^(\d+)\/(\d+)$/.exec(exactName(ratio) ?? '');
                const value = Math.abs(ratio - Math.round(ratio)) < 1e-7 ? `${Math.round(ratio)} : 1`
                    : fraction ? `${fraction[1]} : ${fraction[2]}` : `${formatNumber(ratio)} : 1`;
                lines.push(`<span class="ux-measure-row ux-measure-ratio"><b>|${label[i - 2]}${label[i - 1]}| : |${label[i - 1]}${label[i]}|</b> = ${value}</span>`);
            }
        }
        // Pins with names.
        screen.forEach(([x, y], i) => {
            const pin = pins[i];
            make('circle', {class: `ux-measure-pin ux-measure-pin-${pin.snap}${dragging === i ? ' ux-measure-pin-drag' : ''}`, cx: x, cy: y, r: 6.5});
            if (!pin.element) {
                const t = make('text', {class: 'ux-measure-name', x: x + 10, y: y - 10});
                t.textContent = label[i];
            }
        });
        if (pins.length === 1) {
            const [x, y] = chain[0];
            lines.push(`<span class="ux-measure-row"><b>${label[0]}</b> = (${withExact(x)}; ${withExact(y)})</span>`);
        }
        // Hover preview: the snap target and the link it would add.
        if (active && hover && dragging === undefined) {
            const [hx, hy] = toScreen(hover.x, hover.y);
            if (!closed && screen.length > 0 && screen.length < MAX_PINS && Math.hypot(hx - screen[screen.length - 1][0], hy - screen[screen.length - 1][1]) > 12) {
                const [lx, ly] = screen[screen.length - 1];
                make('line', {class: 'ux-measure-preview', x1: lx, y1: ly, x2: hx, y2: hy});
                const [ux0, uy0] = chain[chain.length - 1];
                tag((lx + hx) / 2, (ly + hy) / 2 - 16, formatNumber(Math.hypot(hover.x - ux0, hover.y - uy0)), 'ux-measure-ghost');
            }
            make('circle', {class: `ux-measure-hover ux-measure-pin-${hover.snap}`, cx: hx, cy: hy, r: hover.snap === 'free' ? 4 : 9});
            const snapName = SNAP_NAMES[hover.snap];
            const where = `(${formatNumber(hover.x)}; ${formatNumber(hover.y)})`;
            const text = make('text', {class: 'ux-measure-hover-text', x: hx + 12, y: hy + 20});
            text.textContent = `${hover.label ? `${hover.label} ` : ''}${where}${snapName ? ` · ${snapName}` : ''}`;
        }
        if (lines.length) {
            readout.innerHTML = `${lines.join('')}<button type="button" class="ux-measure-clear">Počisti</button>`;
            readout.hidden = false;
            placeReadout(screen);
        } else {
            readout.hidden = !active;
            readout.innerHTML = active ? '<span class="ux-measure-hint">Tapni točke na grafu: dolžine, koti in razmerja. Točke se pripnejo na narisano.</span>' : '';
        }
    };

    /** Puts the readout in the board corner that covers the fewest pins and links (phones keep it along the bottom). */
    const placeReadout = (screen: [number, number][]) => {
        if (window.matchMedia?.('(max-width: 640px)').matches) { readout.style.cssText = ''; return; }
        const width = svg.clientWidth, height = svg.clientHeight;
        const w = readout.offsetWidth, h = readout.offsetHeight;
        const probes: [number, number][] = [...screen];
        for (let i = 1; i < screen.length; i++) {
            for (const f of [0.25, 0.5, 0.75]) probes.push([screen[i - 1][0] + (screen[i][0] - screen[i - 1][0]) * f, screen[i - 1][1] + (screen[i][1] - screen[i - 1][1]) * f]);
        }
        const corners = [
            {left: width - w - 10, top: 52}, {left: 10, top: 52}, {left: 10, top: height - h - 10}, {left: width - w - 10, top: height - h - 10},
        ];
        let chosen = corners[0], fewest = Infinity;
        for (const corner of corners) {
            const covered = probes.filter(([x, y]) => x > corner.left - 24 && x < corner.left + w + 24 && y > corner.top - 24 && y < corner.top + h + 24).length;
            if (covered < fewest) { fewest = covered; chosen = corner; }
        }
        readout.style.cssText = `left:${chosen.left}px;top:${chosen.top}px;right:auto;bottom:auto`;
    };

    const setActive = (on: boolean) => {
        active = on;
        capture.hidden = !on;
        button.setAttribute('aria-pressed', String(on));
        button.classList.toggle('ux-measure-on', on);
        document.documentElement.classList.toggle('ux-measuring', on);
        if (!on) hover = undefined;
        render();
    };

    const coarse = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const nearestPin = (sx: number, sy: number) => {
        let found: number | undefined;
        let bestD = coarse() ? 24 : 14;
        pins.forEach((pin, i) => {
            const [px, py] = toScreen(...pinPosition(pin));
            const d = Math.hypot(px - sx, py - sy);
            if (d < bestD) { bestD = d; found = i; }
        });
        return found;
    };

    let downAt: [number, number] | undefined;
    let moved = false;
    const onDown = (event: PointerEvent) => {
        event.preventDefault();
        const [sx, sy] = local(event);
        downAt = [sx, sy];
        moved = false;
        const grabbed = nearestPin(sx, sy);
        if (grabbed !== undefined) {
            dragging = grabbed;
            capture.setPointerCapture?.(event.pointerId);
        }
        hover = snapAt(sx, sy, event.pointerType !== 'mouse');
        render();
    };
    const onMove = (event: PointerEvent) => {
        const [sx, sy] = local(event);
        if (downAt && Math.hypot(sx - downAt[0], sy - downAt[1]) > 4) moved = true;
        const target = snapAt(sx, sy, event.pointerType !== 'mouse');
        if (dragging !== undefined && moved) {
            pins[dragging] = target;
        }
        hover = target;
        render();
    };
    const onUp = (event: PointerEvent) => {
        const [sx, sy] = local(event);
        const wasDragging = dragging;
        dragging = undefined;
        downAt = undefined;
        if (wasDragging !== undefined && moved) { render(); return; }
        if (wasDragging !== undefined && wasDragging === pins.length - 1 && pins.length >= 2) {
            // Tapping the last pin again finishes the chain.
            closed = true;
            render();
            return;
        }
        const target = snapAt(sx, sy, event.pointerType !== 'mouse');
        if (closed || pins.length >= MAX_PINS) { pins = []; closed = false; }
        pins.push(target);
        if (pins.length >= MAX_PINS) closed = true;
        hover = event.pointerType === 'mouse' ? target : undefined;
        render();
    };
    const onLeave = () => { if (dragging === undefined) { hover = undefined; render(); } };
    capture.addEventListener('pointerdown', onDown);
    capture.addEventListener('pointermove', onMove);
    capture.addEventListener('pointerup', onUp);
    capture.addEventListener('pointerleave', onLeave);

    button.addEventListener('click', () => setActive(!active));
    readout.addEventListener('click', event => {
        if ((event.target as HTMLElement).closest('.ux-measure-clear')) { pins = []; closed = false; render(); }
    });
    const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && active) setActive(false);
    };
    window.addEventListener('keydown', onKey);

    // Pins glued to board points follow them while the board updates (dragging, sliders, lesson steps).
    let frame = 0;
    const onUpdate = () => {
        if (!pins.length || frame) return;
        frame = requestAnimationFrame(() => { frame = 0; render(); });
    };
    board.on('update', onUpdate);

    render();
    return () => {
        board.off('update', onUpdate);
        if (frame) cancelAnimationFrame(frame);
        window.removeEventListener('keydown', onKey);
        document.documentElement.classList.remove('ux-measuring');
        layer.remove(); capture.remove(); readout.remove(); button.remove();
    };
}
