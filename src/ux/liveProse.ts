/**
 * Prototype c8 "Živo besedilo" (Bret Victor's reactive documents and Explorable Explanations, where the numbers in
 * the prose are handles; the colour-coded equations of Better Explained). Math in the lesson text stops being a
 * picture of math: a coordinate such as \((0,1)\) drops a pin on the board (and lights the curve or point that is
 * there), an assignment such as \(t=1/2\) shows where that value sits on the matching slider and moves the slider
 * there on a click, and a symbol that names a labelled board object lights that object. Pointing at a board point
 * lights the places in the text that talk about it. Everything is read from the typeset TeX, the board's drawn
 * shapes and the shared sliders, so no lesson needs extra metadata.
 */
import type {Board} from "jsxgraph";
import {boardShapes, sampleShape, type Shape} from "./boardShapes";
import {shownSliders, type RegisteredSlider} from "./sliderRegistry";
import "./ux.css";

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------- TeX → numbers

const GREEK: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', varepsilon: 'ε', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ',
    omega: 'ω', varphi: 'φ', phi: 'φ', sigma: 'σ', tau: 'τ', rho: 'ρ', kappa: 'κ',
};

/** TeX reduced to a plain arithmetic string: decimal commas, fractions, roots, π and thin spaces normalised. */
export function normaliseTex(tex: string): string {
    let s = tex
        .replace(/\{,\}/g, '.')
        .replace(/\\left|\\right|\\displaystyle|\\mathrm|\\text\{[^{}]*\}/g, '')
        .replace(/\\[,;:! ]|\\q?quad|~/g, ' ')
        .replace(/\\cdot|\\times/g, '*')
        .replace(/−/g, '-');
    for (let i = 0; i < 4; i++) {
        s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '(($1)/($2))')
            .replace(/\\[dt]?frac\s*(\d)\s*(\d)/g, '(($1)/($2))')
            .replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
            .replace(/\\sqrt\s*(\d)/g, 'sqrt($1)');
    }
    s = s.replace(/\\pi\b/g, 'pi').replace(/\\(sin|cos|tan|ln|log|exp)(?![a-zA-Z])/g, '$1');
    for (const [name, letter] of Object.entries(GREEK)) s = s.replace(new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g'), letter);
    return s.replace(/\s+/g, '');
}

type Fn = (v: number) => number;
const FUNCTIONS: Record<string, (v: number) => number> = {
    sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, log: Math.log10,
};

/**
 * Compiles a plain arithmetic string (numbers, + − * / ^, parentheses and braces, implicit products, sqrt, sin, cos,
 * tan, exp, ln, pi, e and at most the one free `variable`) into a function; undefined when it is not one.
 */
export function compileExpression(text: string, variable?: string): Fn | undefined {
    let i = 0;
    const peek = () => text[i];
    const startsAtom = () => { const c = peek(); return c !== undefined && /[\d.({a-zA-Zα-ω]/.test(c); };
    const expr = (): Fn => {
        let left = term();
        while (peek() === '+' || peek() === '-') {
            const op = text[i++]; const a = left, b = term();
            left = op === '+' ? v => a(v) + b(v) : v => a(v) - b(v);
        }
        return left;
    };
    const term = (): Fn => {
        let left = factor();
        for (;;) {
            const a = left;
            if (peek() === '*' || peek() === '/') { const op = text[i++]; const b = factor(); left = op === '*' ? v => a(v) * b(v) : v => a(v) / b(v); }
            else if (startsAtom()) { const b = factor(); left = v => a(v) * b(v); }
            else return left;
        }
    };
    const factor = (): Fn => {
        if (peek() === '-') { i++; const a = factor(); return v => -a(v); }
        if (peek() === '+') { i++; return factor(); }
        const base = atom();
        if (peek() !== '^') return base;
        i++;
        let exponent: Fn;
        if (peek() === '-') { i++; const e = atom(); exponent = v => -e(v); } else exponent = atom();
        return v => base(v) ** exponent(v);
    };
    const group = (close: string): Fn => { i++; const a = expr(); if (text[i++] !== close) throw new Error(close); return a; };
    const atom = (): Fn => {
        const c = peek();
        if (c === '(') return group(')');
        if (c === '{') return group('}');
        const name = /^(sqrt|sin|cos|tan|exp|ln|log)/.exec(text.slice(i));
        if (name) { i += name[1].length; const f = FUNCTIONS[name[1]]; const a = atom(); return v => f(a(v)); }
        if (text.startsWith('pi', i)) { i += 2; return () => Math.PI; }
        const number = /^\d+(?:\.\d+)?|^\.\d+/.exec(text.slice(i));
        if (number) { i += number[0].length; const value = Number(number[0]); return () => value; }
        if (variable !== undefined && c === variable) { i++; return v => v; }
        if (c === 'e') { i++; return () => Math.E; }
        throw new Error('atom');
    };
    try {
        if (!text) return undefined;
        const f = expr();
        return i === text.length ? f : undefined;
    } catch {
        return undefined;
    }
}

/** Evaluates a plain arithmetic string without variables; undefined when it is not one. */
export function evaluateArithmetic(text: string): number | undefined {
    const value = compileExpression(text)?.(0);
    return value !== undefined && Number.isFinite(value) ? value : undefined;
}

/** A formula that defines a graph, such as \(y=(x-3)^2+1\), \(f(x)=\sin x\) or \(B^1_0(t)=1-t\), as a function. */
export function texGraphFunction(tex: string): Fn | undefined {
    const s = normaliseTex(tex);
    const at = s.indexOf('=');
    if (at < 0 || s.indexOf('=', at + 1) >= 0) return undefined;
    const lhs = s.slice(0, at), rhs = s.slice(at + 1);
    const call = /\(([a-zα-ω])\)$/.exec(lhs);
    const variable = call ? call[1] : lhs === 'y' ? 'x' : undefined;
    if (!variable || !rhs.includes(variable)) return undefined;
    return compileExpression(rhs, variable);
}

/** Every numeric pair \((x, y)\) written in the TeX, except intervals such as \(t\in(0,1)\) and function arguments. */
export function texCoordinates(tex: string): [number, number][] {
    const s = normaliseTex(tex);
    const found: [number, number][] = [];
    for (let start = 0; start < s.length; start++) {
        if (s[start] !== '(') continue;
        const before = s.slice(Math.max(0, start - 3), start);
        if (/\\in$|∈$/.test(before) || /[A-Za-z)}\]]$/.test(before.slice(-1))) continue;
        let depth = 0, end = -1;
        const commas: number[] = [];
        for (let j = start; j < s.length; j++) {
            if (s[j] === '(' || s[j] === '{') depth++;
            else if (s[j] === ')' || s[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
            else if (s[j] === ',' && depth === 1) commas.push(j);
        }
        if (end < 0 || commas.length !== 1 || s[end] !== ')') continue;
        if (s[end + 1] === ']' || s[start - 1] === '[') continue;
        const x = evaluateArithmetic(s.slice(start + 1, commas[0]));
        const y = evaluateArithmetic(s.slice(commas[0] + 1, end));
        if (x !== undefined && y !== undefined) found.push([x, y]);
    }
    return found;
}

/** A whole formula of the form `name = number`, such as \(t=\tfrac12\) or \(c=-2\). */
export function texAssignment(tex: string): {symbol: string; value: number} | undefined {
    const s = normaliseTex(tex);
    const match = /^([A-Za-zα-ω])(?:_\{?(\w+)\}?)?=(.+)$/.exec(s);
    if (!match || match[2]) return undefined;
    const value = evaluateArithmetic(match[3]);
    return value === undefined ? undefined : {symbol: match[1], value};
}

/** A canonical key for a symbol so that \(P_{1}\), \(P_1\) and a board name P1 agree, and \(B^1_0\) equals \(B_0^1\). */
export function symbolKey(tex: string): string {
    let s = tex.replace(/[{}\s]|\\[,;!]/g, '');
    s = s.replace(/^([A-Za-z]+|\\[a-zA-Z]+)\^(\w+)_(\w+)/, '$1_$3^$2');
    s = s.replace(/^([A-Za-z])(\d+)$/, '$1_$2');
    return s;
}

function sliderSymbol(slider: RegisteredSlider): string | undefined {
    const last = slider.label.trim().split(/\s+/).pop() ?? '';
    return /^[A-Za-zα-ω]$/.test(last) ? last : undefined;
}

// ---------------------------------------------------------------- links

interface Link {
    coordinates: [number, number][];
    assignment?: {symbol: string; value: number};
    symbol?: string;
    graph?: (v: number) => number;
}

interface MathItem { math: string; typesetRoot: HTMLElement | null }

function mathItems(root: Element): MathItem[] {
    const mathJax = (window as any).MathJax;
    try {
        return (mathJax?.startup?.document?.getMathItemsWithin?.(root) ?? []) as MathItem[];
    } catch {
        return [];
    }
}

function formatNumber(value: number): string {
    const rounded = Math.round(value * 1000) / 1000;
    return String(rounded).replace('-', '−').replace('.', ',');
}

/** A point in Slovenian notation: a semicolon separates the coordinates once either has a decimal comma. */
export function pairText(x: number, y: number): string {
    const a = formatNumber(x), b = formatNumber(y);
    return a.includes(',') || b.includes(',') ? `(${a}; ${b})` : `(${a}, ${b})`;
}

/** Relative luminance 0..1 of a #rgb, #rrggbb or rgb() colour; 0 when it cannot be read. */
function luminance(color: string): number {
    let r = 0, g = 0, b = 0;
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})/i.exec(color);
    const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
    if (hex) {
        const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
        [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    } else if (rgb) {
        [r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number);
    } else {
        return 0;
    }
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}


/** Drawn curves that satisfy y = f(x): at least 90 % of their in-view samples lie within 2,5 px of the graph. */
export function matchGraphShapes(board: Board, f: (v: number) => number): Shape[] {
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!svg) return [];
    const origin = (board as any).origin.scrCoords as number[];
    const unitX = (board as any).unitX as number, unitY = (board as any).unitY as number;
    const found: Shape[] = [];
    for (const shape of boardShapes(board)) {
        if (shape.dot) continue;
        const points = sampleShape(shape, 5);
        if (points.length < 8) continue;
        let near = 0, counted = 0;
        // Only samples inside the view count: JSXGraph flattens the off-screen parts of a curve onto the edge.
        const width = svg.clientWidth, height = svg.clientHeight;
        for (const [px, py] of points) {
            if (px < 1 || py < 1 || px > width - 1 || py > height - 1) continue;
            const x = (px - origin[1]) / unitX;
            const y = f(x);
            if (!Number.isFinite(y)) continue;
            counted++;
            if (Math.abs(origin[2] - y * unitY - py) < 2.5) near++;
        }
        if (counted >= 8 && near / counted > 0.9) found.push(shape);
    }
    return found;
}

export function attachLiveProse(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;
    document.documentElement.classList.add('ux-live-prose');

    const layer = document.createElementNS(SVG_NS, 'svg');
    layer.setAttribute('class', 'ux-lp-layer');
    layer.setAttribute('aria-hidden', 'true');
    container.appendChild(layer);
    const chip = document.createElement('div');
    chip.className = 'ux-lp-chip';
    chip.hidden = true;
    container.appendChild(chip);
    const ghost = document.createElement('div');
    ghost.className = 'ux-lp-ghost';
    ghost.hidden = true;
    document.body.appendChild(ghost);
    const peek = document.createElement('button');
    peek.type = 'button';
    peek.className = 'ux-lp-peek';
    peek.hidden = true;
    peek.setAttribute('aria-label', 'Pokaži graf');
    peek.addEventListener('click', () => { container.scrollIntoView({behavior: 'smooth', block: 'center'}); });
    document.body.appendChild(peek);

    const links = new Map<HTMLElement, Link>();
    let symbolOwners = new Map<string, any>();
    let active: HTMLElement | undefined;
    let pinned = false;
    let animation = 0;

    const toScreen = (x: number, y: number): [number, number] => {
        const origin = (board as any).origin.scrCoords as number[];
        return [origin[1] + x * (board as any).unitX, origin[2] - y * (board as any).unitY];
    };

    // A readable colour for the object: points prefer their fill, curves their stroke; pale colours are darkened.
    const elementColor = (element: any): string => {
        const node = element?.rendNode as Element | undefined;
        const attr = (name: string) => node?.getAttribute(name);
        const dot = element?.elType === 'point' || element?.elType === 'glider';
        const candidates = dot ? [attr('fill'), attr('stroke')] : [attr('stroke'), attr('fill')];
        const pick = candidates.find(value => value && value !== 'none' && luminance(value) < 0.9);
        if (!pick) return '#5b7f3a';
        return luminance(pick) > 0.6 ? `color-mix(in srgb, ${pick} 60%, #19372f)` : pick;
    };

    const dotCenter = (element: any, node: Element): [number, number] | undefined => {
        const coords = element?.coords?.scrCoords as number[] | undefined;
        if (coords && Number.isFinite(coords[1]) && Number.isFinite(coords[2])) return [coords[1], coords[2]];
        const cx = Number(node.getAttribute('cx')), cy = Number(node.getAttribute('cy'));
        return Number.isFinite(cx) && Number.isFinite(cy) ? [cx, cy] : undefined;
    };

    // Board labels typeset by MathJax (and plain point names) become symbols the prose can point at.
    const readSymbols = () => {
        const owners = new Map<string, any>();
        const byLabelNode = new Map<Element, any>();
        for (const element of ((board as any).objectsList ?? []) as any[]) {
            if (element?.label?.rendNode) byLabelNode.set(element.label.rendNode, element);
            if ((element?.elType === 'point' || element?.elType === 'glider') && element.visPropCalc?.visible
                && typeof element.name === 'string' && /^[A-Za-z]'?\d{0,2}$/.test(element.name)) {
                owners.set(symbolKey(element.name), element);
            }
        }
        const shapes = boardShapes(board).filter(shape => !shape.dot);
        const containerBox = container.getBoundingClientRect();
        for (const item of mathItems(container)) {
            const textNode = item.typesetRoot?.closest('.JXGtext');
            if (!textNode) continue;
            let owner = byLabelNode.get(textNode);
            const self = ((board as any).objectsList as any[]).find(element => element.rendNode === textNode);
            if (!owner && (self?.visPropCalc?.visible === false || !textNode.getBoundingClientRect().width)) continue;
            if (!owner) {
                // A free-standing label (such as a curve's name written beside it) belongs to the nearest drawn curve.
                const box = textNode.getBoundingClientRect();
                const cx = box.left + box.width / 2 - containerBox.left, cy = box.top + box.height / 2 - containerBox.top;
                let best = 60;
                for (const shape of shapes) {
                    for (const [px, py] of sampleShape(shape, 8)) {
                        const distance = Math.hypot(px - cx, py - cy);
                        if (distance < best) { best = distance; owner = shape.element; }
                    }
                }
            }
            if (owner && owner.visPropCalc?.visible !== false) owners.set(symbolKey(item.math), owner);
        }
        // A definition in the text such as \(A=(0,0)\) names the board point that sits there.
        const points = ((board as any).objectsList as any[]).filter(element =>
            (element.elType === 'point' || element.elType === 'glider') && element.visPropCalc?.visible && typeof element.X === 'function');
        for (const item of mathItems(document.body)) {
            if (container.contains(item.typesetRoot)) continue;
            const match = /^([A-Za-z](?:_\{?\w+\}?)?'?)\s*=\s*\(/.exec(item.math);
            const coordinates = match ? texCoordinates(item.math) : [];
            if (!match || coordinates.length !== 1) continue;
            const [x, y] = coordinates[0];
            const point = points.find(candidate => Math.abs(candidate.X() - x) < 1e-6 && Math.abs(candidate.Y() - y) < 1e-6);
            if (point && !owners.has(symbolKey(match[1]))) owners.set(symbolKey(match[1]), point);
        }
        symbolOwners = owners;
    };

    const scan = () => {
        readSymbols();
        for (const [node] of links) if (!node.isConnected) links.delete(node);
        for (const item of mathItems(document.body)) {
            const node = item.typesetRoot;
            if (!node || links.has(node) || container.contains(node) || node.closest('.slider-label, .ux-lab, .ux-lp-skip')) continue;
            const link: Link = {coordinates: texCoordinates(item.math)};
            const assignment = texAssignment(item.math);
            if (assignment) link.assignment = assignment;
            const whole = symbolKey(item.math);
            const lhs = symbolKey(item.math.split('=')[0]);
            if (symbolOwners.has(whole)) link.symbol = whole;
            else if (item.math.includes('=') && symbolOwners.has(lhs)) link.symbol = lhs;
            const graph = texGraphFunction(item.math);
            const curves = graph ? graphShapes(graph) : [];
            if (graph && curves.length) { link.graph = graph; link.symbol = undefined; }
            if (!link.coordinates.length && !link.assignment && !link.symbol && !link.graph) continue;
            links.set(node, link);
            node.classList.add('ux-lp');
            if (link.coordinates.length) node.classList.add('ux-lp-coord');
            if (link.assignment) node.classList.add('ux-lp-assign');
            if (link.symbol) {
                node.classList.add('ux-lp-symbol');
                node.style.setProperty('--ux-lp-color', elementColor(symbolOwners.get(link.symbol)));
            }
            if (link.graph) {
                node.classList.add('ux-lp-symbol', 'ux-lp-graph');
                node.style.setProperty('--ux-lp-color', elementColor(curves[0].element));
            }
            node.addEventListener('pointerenter', onEnter);
            node.addEventListener('pointerleave', onLeave);
            node.addEventListener('focus', onEnter);
            node.addEventListener('blur', onLeave);
            node.addEventListener('click', onClick);
            node.addEventListener('keydown', onKey);
        }
        for (const [node, link] of links) {
            const assign = link.assignment && sliderFor(link.assignment);
            node.classList.toggle('ux-lp-live', !!assign);
        }
    };

    // The matching slider whose track is actually on screen comes first (a collapsed copy may share the name).
    const sliderFor = (assignment: {symbol: string; value: number}) => {
        const matching = shownSliders().filter(slider => sliderSymbol(slider) === assignment.symbol
            && assignment.value >= slider.min - 1e-9 && assignment.value <= slider.max + 1e-9);
        const trackWidth = (slider: RegisteredSlider) => slider.element()?.querySelector('input[type=range]')?.getBoundingClientRect().width ?? 0;
        return matching.find(slider => trackWidth(slider) > 0) ?? matching[0];
    };

    // ------------------------------------------------------------ drawing

    const clear = () => {
        layer.replaceChildren();
        chip.hidden = true;
        ghost.hidden = true;
        container.classList.remove('ux-lp-focus');
        for (const node of links.keys()) node.classList.remove('ux-lp-lit');
    };

    const add = (tag: string, attrs: Record<string, string | number>, parent: Element = layer) => {
        const node = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
        parent.appendChild(node);
        return node;
    };

    const glowShape = (node: SVGGraphicsElement, color: string, dot: boolean, element?: any) => {
        // The shape itself is copied above the dimmer, so the lit object keeps its full colour.
        const crisp = node.cloneNode(false) as SVGElement;
        crisp.removeAttribute('id');
        crisp.style.removeProperty('visibility');
        crisp.style.removeProperty('opacity');
        crisp.setAttribute('stroke-opacity', '1');
        crisp.setAttribute('fill-opacity', dot ? '1' : '0');
        if (dot) {
            const center = dotCenter(element, node);
            if (!center) return;
            add('circle', {cx: center[0], cy: center[1], r: 13, class: 'ux-lp-ring', stroke: color});
            layer.appendChild(crisp);
            return;
        }
        const copy = node.cloneNode(false) as SVGElement;
        copy.removeAttribute('id');
        copy.removeAttribute('style');
        copy.setAttribute('class', 'ux-lp-glow');
        copy.setAttribute('stroke', color);
        copy.setAttribute('fill', 'none');
        layer.appendChild(copy);
        layer.appendChild(crisp);
    };

    const sizeLayer = () => {
        layer.setAttribute('width', String(svg.clientWidth));
        layer.setAttribute('height', String(svg.clientHeight));
        layer.setAttribute('viewBox', `0 0 ${svg.clientWidth} ${svg.clientHeight}`);
        add('rect', {x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight, class: 'ux-lp-dim'});
    };

    const showChip = (text: string, x: number, y: number, color?: string) => {
        chip.textContent = text;
        chip.hidden = false;
        chip.style.borderColor = color ?? '';
        const width = svg.clientWidth;
        chip.style.left = `${Math.min(Math.max(x + 14, 6), width - chip.offsetWidth - 6)}px`;
        chip.style.top = `${Math.max(y - 38, 6)}px`;
    };

    const showCoordinates = (coordinates: [number, number][]) => {
        const [x0, y0] = toScreen(0, 0);
        const width = svg.clientWidth, height = svg.clientHeight;
        const shapes = boardShapes(board);
        const samples = shapes.filter(shape => !shape.dot).map(shape => ({shape, points: sampleShape(shape, 3)}));
        const lit = new Set<SVGGraphicsElement>();
        let inside = 0;
        const labels: string[] = [];
        for (const [x, y] of coordinates) {
            const [sx, sy] = toScreen(x, y);
            labels.push(pairText(x, y));
            if (sx < -2 || sy < -2 || sx > width + 2 || sy > height + 2) continue;
            inside++;
            const axisX = Math.min(Math.max(x0, 0), width), axisY = Math.min(Math.max(y0, 0), height);
            add('line', {x1: sx, y1: sy, x2: sx, y2: axisY, class: 'ux-lp-guide'});
            add('line', {x1: sx, y1: sy, x2: axisX, y2: sy, class: 'ux-lp-guide'});
            add('circle', {cx: sx, cy: axisY, r: 3, class: 'ux-lp-tick'});
            add('circle', {cx: axisX, cy: sy, r: 3, class: 'ux-lp-tick'});
            for (const shape of shapes) {
                if (!shape.dot || lit.has(shape.node)) continue;
                const center = dotCenter(shape.element, shape.node);
                if (center && Math.hypot(center[0] - sx, center[1] - sy) < 7) { lit.add(shape.node); glowShape(shape.node, elementColor(shape.element), true, shape.element); }
            }
            for (const {shape, points} of samples) {
                if (lit.has(shape.node)) continue;
                if (points.some(([px, py]) => Math.hypot(px - sx, py - sy) < 3.5)) { lit.add(shape.node); glowShape(shape.node, elementColor(shape.element), false); }
            }
            add('circle', {cx: sx, cy: sy, r: 16, class: 'ux-lp-pulse'});
            add('circle', {cx: sx, cy: sy, r: 4.5, class: 'ux-lp-pin'});
        }
        if (coordinates.length) {
            const [fx, fy] = toScreen(...coordinates[0]);
            const text = labels.length > 3 ? `${labels.length} točk` : labels.join(' · ');
            const note = inside < coordinates.length ? (inside ? ' · nekaj jih je zunaj pogleda' : ' · zunaj pogleda') : '';
            showChip(text + note, inside ? Math.min(Math.max(fx, 0), width - 40) : width / 2 - 60, inside ? Math.min(Math.max(fy, 40), height) : 46);
        }
    };

    const showSymbol = (key: string) => {
        const owner = symbolOwners.get(key);
        const node = owner?.rendNode as SVGGraphicsElement | undefined;
        if (!node || !node.isConnected) return;
        const dot = owner.elType === 'point' || owner.elType === 'glider';
        const color = elementColor(owner);
        glowShape(node, color, dot, owner);
        const center = dot ? dotCenter(owner, node) : undefined;
        if (center && typeof owner.X === 'function') showChip(pairText(owner.X(), owner.Y()), center[0], center[1], color);
    };

    /** Curves on the board that satisfy a graph formula: most of their drawn samples lie on y = f(x). */
    const graphShapes = (f: (v: number) => number) => matchGraphShapes(board, f);

    const showSlider = (assignment: {symbol: string; value: number}) => {
        const slider = sliderFor(assignment);
        const range = slider?.element()?.querySelector('input[type=range]') as HTMLInputElement | null;
        if (!slider || !range) return;
        const rect = range.getBoundingClientRect();
        if (!rect.width) return;
        // Only a track the student can actually see gets the marker (a collapsed copy keeps its layout box).
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (!hit || !(hit === range || range.contains(hit) || hit.contains(range))) return;
        const fraction = (assignment.value - slider.min) / (slider.max - slider.min);
        const thumb = 16;
        ghost.style.left = `${rect.left + window.scrollX + thumb / 2 + fraction * (rect.width - thumb)}px`;
        ghost.style.top = `${rect.top + window.scrollY + rect.height / 2}px`;
        ghost.textContent = `${assignment.symbol} = ${formatNumber(assignment.value)}`;
        ghost.hidden = false;
        range.closest('form')?.classList.add('ux-lp-target');
        window.setTimeout(() => range.closest('form')?.classList.remove('ux-lp-target'), 900);
    };

    const show = (node: HTMLElement) => {
        const link = links.get(node);
        if (!link) return;
        clear();
        active = node;
        node.classList.add('ux-lp-lit');
        sizeLayer();
        container.classList.add('ux-lp-focus');
        if (link.coordinates.length) showCoordinates(link.coordinates);
        if (link.symbol) showSymbol(link.symbol);
        if (link.graph) for (const shape of graphShapes(link.graph)) glowShape(shape.node, elementColor(shape.element), false);
        if (link.assignment) showSlider(link.assignment);
        if (layer.childElementCount <= 1 && chip.hidden) {
            layer.replaceChildren();
            container.classList.remove('ux-lp-focus');
            if (!link.assignment) { peek.hidden = true; return; }
        }
        showPeek(node);
    };

    // When the board is scrolled away (phones), a small live copy of it floats on the other half of the screen.
    const showPeek = (node: HTMLElement) => {
        const box = container.getBoundingClientRect();
        const viewHeight = window.innerHeight;
        const visible = Math.max(0, Math.min(box.bottom, viewHeight) - Math.max(box.top, 0));
        const width = svg.clientWidth, height = svg.clientHeight;
        if (visible > Math.min(box.height, viewHeight) * 0.6 || !width || !height) { peek.hidden = true; return; }
        const scale = Math.min(Math.min(window.innerWidth * 0.92, 440) / width, (viewHeight * 0.4) / height);
        const inner = document.createElement('div');
        inner.className = 'ux-lp-peek-inner';
        inner.style.width = `${width}px`;
        inner.style.height = `${height}px`;
        inner.style.transform = `scale(${scale})`;
        for (const child of Array.from(container.children)) {
            if (child === svg || child === layer || child === chip || child.classList.contains('JXGtext')) {
                const copy = child.cloneNode(true) as HTMLElement;
                copy.removeAttribute('id');
                inner.appendChild(copy);
            }
        }
        peek.style.width = `${Math.round(width * scale)}px`;
        peek.style.height = `${Math.round(height * scale)}px`;
        const textBox = node.getBoundingClientRect();
        peek.classList.toggle('ux-lp-peek-bottom', textBox.top + textBox.height / 2 < viewHeight / 2);
        peek.replaceChildren(inner);
        peek.hidden = false;
    };

    const hide = () => { active = undefined; pinned = false; clear(); peek.hidden = true; peek.replaceChildren(); };

    // ------------------------------------------------------------ interaction

    function onEnter(event: Event) { if (!pinned) show(event.currentTarget as HTMLElement); }
    function onLeave() { if (!pinned) hide(); }
    function onClick(event: Event) {
        const node = event.currentTarget as HTMLElement;
        const link = links.get(node);
        if (!link) return;
        event.preventDefault();
        const slider = link.assignment && sliderFor(link.assignment);
        if (slider && link.assignment) { glide(slider, link.assignment.value); show(node); return; }
        // Touch: a tap keeps the picture until the next tap.
        if (pinned && active === node) { hide(); return; }
        show(node);
        pinned = true;
    }
    function onKey(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') onClick(event);
        if (event.key === 'Escape') hide();
    }

    const glide = (slider: RegisteredSlider, target: number) => {
        window.cancelAnimationFrame(animation);
        const from = slider.value();
        const started = performance.now();
        const duration = Math.min(1100, 350 + 900 * Math.abs(target - from) / (slider.max - slider.min));
        const frame = (now: number) => {
            const k = Math.min(1, (now - started) / duration);
            const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
            const value = k >= 1 ? target : Math.round((from + (target - from) * eased) / slider.step) * slider.step;
            slider.set(Math.min(slider.max, Math.max(slider.min, value)));
            onBoardUpdate();
            if (k < 1) { animation = window.requestAnimationFrame(frame); return; }
            animation = 0;
            if (active) window.setTimeout(() => { if (active) show(active); }, 60);
        };
        animation = window.requestAnimationFrame(frame);
    };

    // Board → text: pointing at a point or a labelled curve lights the formulas about it.
    const onBoardOver = (event: PointerEvent) => {
        if (active) return;
        const target = event.target as Element;
        const element = ((board as any).objectsList as any[]).find(candidate => candidate.rendNode === target);
        if (!element) return;
        const keys = [...symbolOwners].filter(([, owner]) => owner === element).map(([key]) => key);
        const x = typeof element.X === 'function' ? element.X() : NaN, y = typeof element.Y === 'function' ? element.Y() : NaN;
        for (const [node, link] of links) {
            const bySymbol = link.symbol !== undefined && keys.includes(link.symbol);
            const byPlace = Number.isFinite(x) && link.coordinates.some(([cx, cy]) => Math.abs(cx - x) < 1e-6 && Math.abs(cy - y) < 1e-6);
            node.classList.toggle('ux-lp-lit', bySymbol || byPlace);
        }
    };
    const onBoardOut = () => { if (!active) for (const node of links.keys()) node.classList.remove('ux-lp-lit'); };
    svg.addEventListener('pointerover', onBoardOver);
    svg.addEventListener('pointerout', onBoardOut);
    const onDocumentDown = (event: PointerEvent) => {
        if (pinned && !(event.target as Element).closest?.('.ux-lp, .ux-lp-peek')) hide();
    };
    document.addEventListener('pointerdown', onDocumentDown, true);

    let scanTimer = 0;
    const scheduleScan = () => { window.clearTimeout(scanTimer); scanTimer = window.setTimeout(scan, 250); };
    const observer = new MutationObserver(mutations => {
        if (mutations.some(mutation => !layer.contains(mutation.target) && mutation.target !== layer && mutation.target !== chip && !chip.contains(mutation.target))) scheduleScan();
    });
    observer.observe(document.body, {childList: true, subtree: true});
    let redraw = 0;
    const onBoardUpdate = () => {
        if (!active || redraw) return;
        redraw = window.requestAnimationFrame(() => { redraw = 0; if (active) show(active); });
    };
    board.on('update', onBoardUpdate);
    scheduleScan();
    const interval = window.setInterval(scan, 2000);

    return () => {
        observer.disconnect();
        window.clearTimeout(scanTimer);
        window.clearInterval(interval);
        window.cancelAnimationFrame(animation);
        board.off('update', onBoardUpdate);
        svg.removeEventListener('pointerover', onBoardOver);
        svg.removeEventListener('pointerout', onBoardOut);
        document.removeEventListener('pointerdown', onDocumentDown, true);
        for (const node of links.keys()) {
            node.classList.remove('ux-lp-graph', 'ux-lp', 'ux-lp-coord', 'ux-lp-assign', 'ux-lp-symbol', 'ux-lp-lit', 'ux-lp-live');
            node.removeEventListener('pointerenter', onEnter);
            node.removeEventListener('pointerleave', onLeave);
            node.removeEventListener('focus', onEnter);
            node.removeEventListener('blur', onLeave);
            node.removeEventListener('click', onClick);
            node.removeEventListener('keydown', onKey);
        }
        links.clear();
        layer.remove();
        chip.remove();
        ghost.remove();
        peek.remove();
        window.cancelAnimationFrame(redraw);
        document.documentElement.classList.remove('ux-live-prose');
    };
}
