/**
 * Prototype c16 "Kaj ostane enako?" (a theorem finder; the "notice the pattern" moment of Brilliant, and the dynamic
 * geometry habit of dragging to see what survives). One press and the board wiggles one of its own draggable points (or
 * its first slider) while every relation between the drawn points is checked frame by frame: which triples stay on one
 * line, which split ratios stay fixed, which points stay equally far from a centre, which angles stay right. The count of
 * candidate relations falls live as the board moves; what survives is drawn on the board and named in words. On the
 * triangle-centres board it finds the Euler line, the 2 : 1 split and the circumcentre; on de Casteljau the t : (1 − t)
 * splits on every level.
 */
import type {Board} from "jsxgraph";
import {exactName, formatNumber, pointLabel} from "./measure";
import {usableSliders} from "./sliderRegistry";
import "./ux.css";

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_POINTS = 30;
const EPS = 1e-6;

type Sample = Float64Array; // x0, y0, x1, y1, ...

interface Collinear { kind: 'col'; a: number; b: number; c: number; ratio: number }
interface Equal { kind: 'eq'; o: number; a: number; b: number }
interface Right { kind: 'right'; o: number; a: number; b: number }
type Candidate = Collinear | Equal | Right;

const dist = (s: Sample, i: number, j: number) => Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]);
const cross = (s: Sample, o: number, a: number, b: number) =>
    (s[2 * a] - s[2 * o]) * (s[2 * b + 1] - s[2 * o + 1]) - (s[2 * a + 1] - s[2 * o + 1]) * (s[2 * b] - s[2 * o]);
const dot = (s: Sample, o: number, a: number, b: number) =>
    (s[2 * a] - s[2 * o]) * (s[2 * b] - s[2 * o]) + (s[2 * a + 1] - s[2 * o + 1]) * (s[2 * b + 1] - s[2 * o + 1]);

function holds(candidate: Candidate, s: Sample): boolean {
    switch (candidate.kind) {
        case 'col': {
            const {a, b, c} = candidate;
            const ab = dist(s, a, b), bc = dist(s, b, c);
            if (ab < EPS || bc < EPS) return false;
            if (Math.abs(cross(s, a, b, c)) > EPS * 10 * ab * bc) return false;
            return Math.abs(ab / bc - candidate.ratio) < 1e-5 * Math.max(1, candidate.ratio);
        }
        case 'eq': {
            const oa = dist(s, candidate.o, candidate.a), ob = dist(s, candidate.o, candidate.b);
            return oa > EPS && Math.abs(oa - ob) < 1e-6 * Math.max(1, oa);
        }
        case 'right': {
            const oa = dist(s, candidate.o, candidate.a), ob = dist(s, candidate.o, candidate.b);
            return oa > EPS && ob > EPS && Math.abs(dot(s, candidate.o, candidate.a, candidate.b)) < 1e-6 * oa * ob;
        }
    }
}

/** Every relation that is true in the first sample (collinear triples are stored with their middle point as b). */
function seed(s: Sample, n: number): Candidate[] {
    const found: Candidate[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (j === i) continue;
            for (let k = j + 1; k < n; k++) {
                if (k === i) continue;
                const oj = dist(s, i, j), ok = dist(s, i, k);
                if (oj < EPS || ok < EPS || dist(s, j, k) < EPS) continue;
                // i as the middle of j and k on one line.
                if (Math.abs(cross(s, i, j, k)) <= EPS * 10 * oj * ok && dot(s, i, j, k) < 0) {
                    found.push({kind: 'col', a: j, b: i, c: k, ratio: oj / ok});
                }
                if (Math.abs(oj - ok) < 1e-6 * Math.max(1, oj)) found.push({kind: 'eq', o: i, a: j, b: k});
                if (Math.abs(dot(s, i, j, k)) < 1e-6 * oj * ok) found.push({kind: 'right', o: i, a: j, b: k});
            }
        }
    }
    return found;
}

/** A relation is a discovery only if the board really moved it: lengths changed or the figure turned. */
function moved(candidate: Candidate, samples: Sample[]): boolean {
    const [p, q] = candidate.kind === 'col' ? [candidate.a, candidate.c] : [candidate.o, candidate.a];
    let minLength = Infinity, maxLength = 0, minAngle = Infinity, maxAngle = -Infinity;
    for (const s of samples) {
        const length = dist(s, p, q);
        minLength = Math.min(minLength, length);
        maxLength = Math.max(maxLength, length);
        const angle = Math.atan2(s[2 * q + 1] - s[2 * p + 1], s[2 * q] - s[2 * p]);
        minAngle = Math.min(minAngle, angle);
        maxAngle = Math.max(maxAngle, angle);
    }
    return maxLength > minLength * 1.03 || (maxAngle - minAngle > 0.05 && maxAngle - minAngle < 2 * Math.PI - 0.05);
}

function ratioText(ratio: number): string {
    if (Math.abs(ratio - Math.round(ratio)) < 1e-6) return `${Math.round(ratio)} : 1`;
    if (Math.abs(1 / ratio - Math.round(1 / ratio)) < 1e-6) return `1 : ${Math.round(1 / ratio)}`;
    const fraction = /^(\d+)\/(\d+)$/.exec(exactName(ratio) ?? '');
    return fraction ? `${fraction[1]} : ${fraction[2]}` : `${formatNumber(ratio)} : 1`;
}

interface Finding { text: string; score: number; draw: (layer: SVGSVGElement, at: (i: number) => [number, number]) => void }

export function attachInvariants(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-inv-button';
    button.innerHTML = '<span aria-hidden="true">🔍</span> Kaj ostane enako?';
    button.title = 'Graf se sam premakne in poišče, kaj se pri tem ne spremeni';
    const layer = document.createElementNS(SVG_NS, 'svg');
    layer.setAttribute('class', 'ux-inv-layer');
    layer.setAttribute('aria-hidden', 'true');
    const card = document.createElement('div');
    card.className = 'ux-inv-card';
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'polite');
    card.hidden = true;
    container.append(layer, card, button);
    for (const element of [button, card]) {
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());
    }

    let running = false;
    let aborted = false;
    let points: string[] = [];
    let names: string[] = [];
    let findings: Finding[] = [];
    /** Findings are shown one at a time, each with only its own drawing, so the card stays small on phones. */
    let current = 0;
    let summary = '';

    const toScreen = (x: number, y: number): [number, number] => {
        const origin = (board as any).origin.scrCoords as number[];
        return [origin[1] + x * (board as any).unitX, origin[2] - y * (board as any).unitY];
    };
    const visiblePoints = () => ((board as any).objectsList as any[]).filter(element =>
        (element.elType === 'point' || element.elType === 'glider') && element.visPropCalc?.visible && typeof element.X === 'function');
    const draggable = (element: any) => {
        const fixed = typeof element.evalVisProp === 'function' ? element.evalVisProp('fixed') : element.visProp?.fixed;
        return element.isDraggable && fixed !== true && element.elType === 'point';
    };
    /**
     * Every point worth relating, under a key that survives a redraw: the app rebuilds derived board elements on each
     * change, so a key is the element's name (or kind) and its order, not the element itself. Drawn lines add their
     * defining points (often hidden, such as a midpoint) and their crossings (feet, centres).
     */
    const snapshot = (): Map<string, {x: number; y: number; name?: string}> => {
        const found = new Map<string, {x: number; y: number; name?: string}>();
        const seen = new Map<string, number>();
        const add = (base: string, x: number, y: number, name?: string) => {
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            const count = seen.get(base) ?? 0;
            seen.set(base, count + 1);
            found.set(`${base}#${count}`, {x, y, name: count === 0 ? name : undefined});
        };
        const list = (board as any).objectsList as any[];
        for (const element of list) {
            if ((element.elType !== 'point' && element.elType !== 'glider') || !element.visPropCalc?.visible) continue;
            const name = pointLabel(element);
            try { add(`p:${name ?? ''}`, element.X(), element.Y(), name); } catch { /* removed */ }
        }
        const lines = list.filter(element => (element.elType === 'segment' || element.elType === 'line')
            && element.visPropCalc?.visible && element.point1 && element.point2);
        const ends = lines.map(line => {
            try { return [line.point1.X(), line.point1.Y(), line.point2.X(), line.point2.Y()] as number[]; } catch { return [NaN, NaN, NaN, NaN]; }
        });
        ends.forEach(([x1, y1, x2, y2]) => { add('e', x1, y1); add('e', x2, y2); });
        for (let i = 0; i < ends.length; i++) {
            for (let j = i + 1; j < ends.length; j++) {
                const [x1, y1, x2, y2] = ends[i], [x3, y3, x4, y4] = ends[j];
                const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                const a = x1 * y2 - y1 * x2, b = x3 * y4 - y3 * x4;
                const ok = Math.abs(d) > 1e-12;
                found.set(`x:${i}:${j}`, {x: ok ? (a * (x3 - x4) - (x1 - x2) * b) / d : NaN, y: ok ? (a * (y3 - y4) - (y1 - y2) * b) / d : NaN});
            }
        }
        return found;
    };
    let keys: string[] = [];
    const sample = (): Sample | undefined => {
        const snap = snapshot();
        const s = new Float64Array(keys.length * 2);
        for (let i = 0; i < keys.length; i++) {
            const point = snap.get(keys[i]);
            if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return undefined;
            s[2 * i] = point.x;
            s[2 * i + 1] = point.y;
        }
        return s;
    };

    const fire = (type: string, target: EventTarget, x: number, y: number, pressed: boolean) => {
        const box = container.getBoundingClientRect();
        target.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, composed: true, pointerId: 79, pointerType: 'mouse', isPrimary: true,
            clientX: box.left + x, clientY: box.top + y, screenX: box.left + x, screenY: box.top + y, button: 0, buttons: pressed ? 1 : 0,
        }));
    };

    const make = <K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number>, parent: Element = layer) => {
        const node = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
        parent.appendChild(node);
        return node;
    };

    const status = (html: string) => { card.innerHTML = html; card.hidden = false; };

    const drawFindings = () => {
        layer.replaceChildren();
        const snap = snapshot();
        const at = (i: number): [number, number] => { const p = snap.get(keys[i]); return p ? toScreen(p.x, p.y) : [NaN, NaN]; };
        const finding = findings[current];
        if (finding) finding.draw(layer, at);
    };
    let frame = 0;
    const onUpdate = () => {
        if (!findings.length || frame) return;
        frame = requestAnimationFrame(() => { frame = 0; try { drawFindings(); } catch { /* points removed */ } });
    };
    board.on('update', onUpdate);

    /** Turns surviving relations into a few sentences, most surprising first. */
    const describe = (alive: Candidate[], samples: Sample[]): Finding[] => {
        const real = alive.filter(candidate => moved(candidate, samples));
        const out: Finding[] = [];
        const label = (i: number) => names[i];
        const drawnLines = ((board as any).objectsList as any[]).filter(element =>
            (element.elType === 'segment' || element.elType === 'line') && element.visPropCalc?.visible && element.point1 && element.point2);
        const onDrawnLine = (indices: number[]) => {
            const last = samples[samples.length - 1];
            return drawnLines.some(line => {
                let x1: number, y1: number, x2: number, y2: number;
                try { x1 = line.point1.X(); y1 = line.point1.Y(); x2 = line.point2.X(); y2 = line.point2.Y(); } catch { return false; }
                const length = Math.hypot(x2 - x1, y2 - y1);
                if (length < EPS) return false;
                return indices.every(i => Math.abs((x2 - x1) * (last[2 * i + 1] - y1) - (y2 - y1) * (last[2 * i] - x1)) < 1e-6 * length * Math.max(1, length));
            });
        };

        // Lines: merge collinear triples into maximal sets.
        const lines: Set<number>[] = [];
        for (const candidate of real) {
            if (candidate.kind !== 'col') continue;
            const triple = [candidate.a, candidate.b, candidate.c];
            const home = lines.find(line => triple.filter(i => line.has(i)).length >= 2);
            if (home) triple.forEach(i => home.add(i)); else lines.push(new Set(triple));
        }
        for (const line of lines) {
            const members = [...line];
            const drawn = onDrawnLine(members);
            // Points on a drawn line are no news; the ratio findings below say what is special about them.
            if (drawn) continue;
            out.push({
                text: `${members.map(label).join(', ')} ležijo na isti premici${drawn ? ' (narisani)' : ''}.`,
                score: drawn ? 2 + members.length / 10 : 10 + members.length,
                draw: (layer, at) => {
                    const pts = members.map(at);
                    let best: [[number, number], [number, number]] = [pts[0], pts[1]], far = 0;
                    for (const p of pts) for (const q of pts) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d > far) { far = d; best = [p, q]; } }
                    const [p, q] = best;
                    const ux = (q[0] - p[0]) / (far || 1), uy = (q[1] - p[1]) / (far || 1);
                    make('line', {class: 'ux-inv-line', x1: p[0] - ux * 40, y1: p[1] - uy * 40, x2: q[0] + ux * 40, y2: q[1] + uy * 40}, layer);
                    for (const [x, y] of pts) make('circle', {class: 'ux-inv-dot', cx: x, cy: y, r: 6}, layer);
                },
            });
        }
        // Ratios: group equal split ratios.
        const byRatio = new Map<string, Collinear[]>();
        for (const candidate of real) {
            if (candidate.kind !== 'col') continue;
            const ratio = candidate.ratio >= 1 ? candidate.ratio : 1 / candidate.ratio;
            const key = ratioText(ratio);
            if (!byRatio.has(key)) byRatio.set(key, []);
            byRatio.get(key)!.push(candidate);
        }
        for (const [key, group] of byRatio) {
            const simple = !key.includes(',');
            const first = group[0];
            const oriented = first.ratio >= 1 ? first : {...first, a: first.c, c: first.a, ratio: 1 / first.ratio};
            const middles = new Set(group.map(candidate => candidate.b));
            const orient = (candidate: Collinear) => candidate.ratio >= 1 ? candidate : {...candidate, a: candidate.c, c: candidate.a, ratio: 1 / candidate.ratio};
            const segments = group.map(orient).map(candidate => `${label(candidate.a)}${label(candidate.c)}`);
            const list = (items: string[]) => items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} in ${items[items.length - 1]}`;
            const unnamed = (i: number) => !/^p:[^#]+#0$/.test(keys[i]) || !keys[i].slice(2, -2);
            if (group.length === 1 && [first.a, first.b, first.c].filter(unnamed).length >= 2) continue;
            const text = group.length === 1
                ? `${label(oriented.b)} deli ${label(oriented.a)}${label(oriented.c)} v razmerju ${key}: |${label(oriented.a)}${label(oriented.b)}| : |${label(oriented.b)}${label(oriented.c)}| = ${key}.`
                : middles.size === 1
                    ? `${label(oriented.b)} deli ${group.length === 2 ? 'obe daljici' : `vse ${group.length === 3 ? 'tri' : group.length === 4 ? 'štiri' : group.length} daljice`} ${list(segments)} v razmerju ${key}.`
                    : key === '1 : 1'
                        ? `${list([...middles].map(label))} so razpolovišča daljic ${list(segments.slice(0, 10))}.`
                        : `${group.length} ${group.length < 5 ? 'točke delijo' : 'točk deli'} svoje daljice v istem razmerju ${key} (na primer ${label(oriented.b)} na ${label(oriented.a)}${label(oriented.c)}).`;
            out.push({
                text, score: (simple ? 8 : 4) + Math.min(group.length, 6) + (middles.size === 1 && group.length > 1 ? 6 : 0) - (key === '1 : 1' ? 4 : 0),
                draw: (layer, at) => {
                    for (const candidate of group.slice(0, 12)) {
                        const [a, b, c] = [at(candidate.a), at(candidate.b), at(candidate.c)];
                        make('line', {class: 'ux-inv-split-a', x1: a[0], y1: a[1], x2: b[0], y2: b[1]}, layer);
                        make('line', {class: 'ux-inv-split-b', x1: b[0], y1: b[1], x2: c[0], y2: c[1]}, layer);
                    }
                },
            });
        }
        // Equal distances: a centre and every point equally far from it.
        const circles = new Map<string, {o: number; members: Set<number>}>();
        for (const candidate of real) {
            if (candidate.kind !== 'eq') continue;
            const last = samples[samples.length - 1];
            const radius = dist(last, candidate.o, candidate.a);
            const key = `${candidate.o}|${radius.toFixed(6)}`;
            if (!circles.has(key)) circles.set(key, {o: candidate.o, members: new Set()});
            circles.get(key)!.members.add(candidate.a).add(candidate.b);
        }
        for (const {o, members} of circles.values()) {
            const list = [...members];
            // A midpoint is trivially as far from both ends; three or more points make a circle.
            if (list.length < 3) continue;
            out.push({
                text: `${label(o)} je enako oddaljena od ${list.map(label).join(', ')}: vse leže na krožnici s središčem ${label(o)}.`,
                score: 9 + list.length,
                draw: (layer, at) => {
                    const c = at(o), p = at(list[0]);
                    make('circle', {class: 'ux-inv-circle', cx: c[0], cy: c[1], r: Math.hypot(p[0] - c[0], p[1] - c[1])}, layer);
                    for (const i of list) { const q = at(i); make('line', {class: 'ux-inv-radius', x1: c[0], y1: c[1], x2: q[0], y2: q[1]}, layer); }
                },
            });
        }
        // Right angles.
        for (const candidate of real) {
            if (candidate.kind !== 'right') continue;
            if (onDrawnLine([candidate.o, candidate.a]) && onDrawnLine([candidate.o, candidate.b]) && out.length > 6) continue;
            out.push({
                text: `∠${label(candidate.a)}${label(candidate.o)}${label(candidate.b)} ostane pravi kot.`,
                score: 6,
                draw: (layer, at) => {
                    const o = at(candidate.o), a = at(candidate.a), b = at(candidate.b);
                    const da = Math.hypot(a[0] - o[0], a[1] - o[1]), db = Math.hypot(b[0] - o[0], b[1] - o[1]);
                    const s = 12;
                    const u = [(a[0] - o[0]) / da * s, (a[1] - o[1]) / da * s], v = [(b[0] - o[0]) / db * s, (b[1] - o[1]) / db * s];
                    make('path', {class: 'ux-inv-right', d: `M${o[0] + u[0]},${o[1] + u[1]} L${o[0] + u[0] + v[0]},${o[1] + u[1] + v[1]} L${o[0] + v[0]},${o[1] + v[1]}`}, layer);
                },
            });
        }
        return out.sort((p, q) => q.score - p.score).slice(0, 5);
    };

    const run = async () => {
        if (running) return;
        running = true;
        aborted = false;
        findings = [];
        layer.replaceChildren();
        const all = visiblePoints();
        const first = snapshot();
        // Named points first, then the rest; a place already taken by another point is skipped.
        const ordered = [...first.entries()].sort(([, p], [, q]) => Number(!!q.name) - Number(!!p.name));
        keys = [];
        names = [];
        const free = 'KLMNRSTUVW';
        let next = 0;
        for (const [key, point] of ordered) {
            if (keys.length >= MAX_POINTS) break;
            if (keys.some(other => Math.hypot(first.get(other)!.x - point.x, first.get(other)!.y - point.y) < 1e-9)) continue;
            const [sx, sy] = toScreen(point.x, point.y);
            if (sx < -20 || sy < -20 || sx > svg.clientWidth + 20 || sy > svg.clientHeight + 20) continue;
            keys.push(key);
            names.push(point.name ?? free[next++] ?? '?');
        }
        points = keys;
        const driverPoint = all.filter(draggable).sort((p, q) => {
            const w = svg.clientWidth / 2, h = svg.clientHeight / 2;
            const d = (e: any) => Math.hypot(e.coords.scrCoords[1] - w, e.coords.scrCoords[2] - h);
            return d(p) - d(q);
        })[0];
        const driverSlider = driverPoint ? undefined : usableSliders()[0];
        if (points.length < 3 || (!driverPoint && !driverSlider)) {
            status('<p class="ux-inv-title">Na tem grafu ni dovolj točk, ki bi se premikale.</p>');
            running = false;
            window.setTimeout(() => { if (!running) card.hidden = true; }, 2600);
            return;
        }
        button.disabled = true;
        container.classList.add('ux-inv-running');
        const firstSample = sample();
        if (!firstSample) { running = false; return; }
        const samples: Sample[] = [firstSample];
        let alive = seed(samples[0], points.length);
        const initial = alive.length;
        const showCount = (moving: string) => status(`<p class="ux-inv-title">Iščem, kaj se ne spremeni …</p><p class="ux-inv-count"><b>${alive.length}</b> od ${initial} odnosov še drži</p><p class="ux-inv-note">${moving}</p>`);
        const ms = 3200;
        const began = performance.now();
        if (driverPoint) {
            // Two drivers when the board has them: the point nearest the middle, then the one farthest from it.
            const candidates = all.filter(draggable);
            const far = candidates.length > 1 ? candidates.reduce((best, point) => {
                const d = (e: any) => Math.hypot(e.X() - driverPoint.X(), e.Y() - driverPoint.Y());
                return d(point) > d(best) ? point : best;
            }) : undefined;
            for (const driver of far && far !== driverPoint ? [driverPoint, far] : [driverPoint]) {
                if (aborted) break;
                const span = far && far !== driverPoint ? ms / 2 : ms;
                const began = performance.now();
                const start: [number, number] = [driver.coords.scrCoords[1], driver.coords.scrCoords[2]];
                const reach = Math.min(70, svg.clientWidth / 7, svg.clientHeight / 6);
                const dx = start[0] < svg.clientWidth / 2 ? 1 : -1, dy = start[1] < svg.clientHeight / 2 ? 1 : -1;
                const name = pointLabel(driver) ?? 'točko';
                showCount(`Premikam ${name}.`);
                fire('pointerdown', driver.rendNode, start[0], start[1], true);
                while (!aborted) {
                    const k = Math.min(1, (performance.now() - began) / span);
                    const angle = k * Math.PI * 2;
                    const x = start[0] + dx * reach * Math.sin(angle);
                    const y = start[1] + dy * reach * 0.7 * (1 - Math.cos(angle));
                    fire('pointermove', container, k >= 1 ? start[0] : x, k >= 1 ? start[1] : y, true);
                    await new Promise(requestAnimationFrame);
                    const s = sample();
                    if (s) { samples.push(s); alive = alive.filter(candidate => holds(candidate, s)); }
                    showCount(`Premikam ${name}.`);
                    if (k >= 1) break;
                }
                fire('pointerup', document, start[0], start[1], false);
                await new Promise(requestAnimationFrame);
            }
        } else if (driverSlider) {
            const original = driverSlider.value();
            const span = driverSlider.max - driverSlider.min;
            showCount(`Premikam drsnik ${driverSlider.label}.`);
            while (!aborted) {
                const k = Math.min(1, (performance.now() - began) / ms);
                const value = k >= 1 ? original : Math.min(driverSlider.max, Math.max(driverSlider.min, original + Math.sin(k * Math.PI * 2) * span * 0.25));
                driverSlider.set(value);
                await new Promise(requestAnimationFrame);
                await new Promise(requestAnimationFrame);
                const s = sample();
                if (s) { samples.push(s); alive = alive.filter(candidate => holds(candidate, s)); }
                showCount(`Premikam drsnik ${driverSlider.label}.`);
                if (k >= 1) break;
            }
        }
        container.classList.remove('ux-inv-running');
        button.disabled = false;
        running = false;
        findings = describe(alive, samples);
        if (!findings.length) {
            status(`<p class="ux-inv-title">Ko se graf premika, se spremeni vse.</p><p class="ux-inv-note">Od ${initial} odnosov ni ostal noben, ki ga ne bi narisali že sami.</p>`);
            return;
        }
        current = 0;
        summary = `${initial} odnosov je bilo res na začetku, ${alive.length} jih je preživelo premikanje.`;
        showFinding();
    };

    const showFinding = () => {
        drawFindings();
        const total = findings.length;
        status(`<p class="ux-inv-title">Ostane enako, ne glede na premik${total > 1 ? ` <span class="ux-inv-page">${current + 1}/${total}</span>` : ''}</p>`
            + `<p class="ux-inv-finding">${findings[current].text}</p>`
            + `<p class="ux-inv-note">${summary} Poskusi še sam: povleci točko in opazuj.</p>`
            + `<div class="ux-inv-actions">${total > 1 ? `<button type="button" class="ux-inv-prev" aria-label="Prejšnje"${current === 0 ? ' disabled' : ''}>‹</button><button type="button" class="ux-inv-next" aria-label="Naslednje"${current === total - 1 ? ' disabled' : ''}>›</button>` : ''}<button type="button" class="ux-inv-close">Zapri</button></div>`);
    };

    button.addEventListener('click', () => { void run(); });
    card.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        if (target.closest('.ux-inv-close')) { card.hidden = true; findings = []; layer.replaceChildren(); return; }
        if (target.closest('.ux-inv-next') && current < findings.length - 1) { current++; showFinding(); }
        if (target.closest('.ux-inv-prev') && current > 0) { current--; showFinding(); }
    });
    // A real press on the board takes over from the wiggle.
    const onUserDown = (event: PointerEvent) => { if (running && event.isTrusted) aborted = true; };
    container.addEventListener('pointerdown', onUserDown, true);

    return () => {
        aborted = true;
        board.off('update', onUpdate);
        if (frame) cancelAnimationFrame(frame);
        container.removeEventListener('pointerdown', onUserDown, true);
        container.classList.remove('ux-inv-running');
        layer.remove(); card.remove(); button.remove();
    };
}
