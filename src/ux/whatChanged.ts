/**
 * Prototype c21 "Kaj je novo?" (a code diff, Figma's smart animate, a museum exhibit that lights up what the guide
 * is talking about). Each time the lesson moves to another frame, the board is compared with how it looked before:
 * strokes that are new or changed glow and pulse twice, strokes that disappeared fade out as a grey ghost, and named
 * points that moved leave an arrow from where they were. The eye goes straight to what the step did.
 */
import type {Board} from "jsxgraph";
import {lessonPosition, onLessonPosition, type LessonPosition} from "./lessonNav";
import {pointLabel} from "./measure";
import "./ux.css";

const SVG_NS = 'http://www.w3.org/2000/svg';
const SHAPES = 'path, ellipse, circle, line, polygon, polyline, rect';

interface Picture {
    /** Signature → a clone of the node, for ghosts. */
    shapes: Map<string, SVGElement>;
    /** HTML labels (JSXGraph texts): signature set. */
    texts: Set<string>;
    /** Named points in board pixels. */
    points: Map<string, [number, number]>;
}

const round = (text: string) => text.replace(/-?\d+(\.\d+)?(e-?\d+)?/g, match => String(Math.round(Number(match) / 2) * 2));

function signature(node: SVGElement): string | undefined {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || node.closest('[display="none"], [visibility="hidden"]')) return undefined;
    const tag = node.tagName.toLowerCase();
    const geometry = tag === 'path' ? node.getAttribute('d')
        : tag === 'ellipse' || tag === 'circle' ? `${node.getAttribute('cx')} ${node.getAttribute('cy')} ${node.getAttribute('rx') ?? node.getAttribute('r')} ${node.getAttribute('ry') ?? ''}`
            : tag === 'line' ? `${node.getAttribute('x1')} ${node.getAttribute('y1')} ${node.getAttribute('x2')} ${node.getAttribute('y2')}`
                : node.getAttribute('points') ?? `${node.getAttribute('x')} ${node.getAttribute('y')} ${node.getAttribute('width')} ${node.getAttribute('height')}`;
    if (!geometry || geometry.length < 3) return undefined;
    return `${tag}|${round(geometry)}|${node.getAttribute('stroke') ?? ''}|${node.getAttribute('fill') ?? ''}|${node.getAttribute('stroke-dasharray') ?? ''}`;
}

export function attachWhatChanged(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const layer = document.createElementNS(SVG_NS, 'svg');
    layer.setAttribute('class', 'ux-wc-layer');
    layer.setAttribute('aria-hidden', 'true');
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'ux-wc-badge';
    badge.hidden = true;
    badge.title = 'Pokaži spremembe še enkrat';
    container.append(layer, badge);
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) badge.addEventListener(type, event => event.stopPropagation());

    const picture = (): Picture => {
        const shapes = new Map<string, SVGElement>();
        for (const node of svg.querySelectorAll<SVGElement>(SHAPES)) {
            if (node.closest('defs, marker')) continue;
            const key = signature(node);
            if (key && !shapes.has(key)) shapes.set(key, node);
        }
        const texts = new Set<string>();
        for (const node of container.querySelectorAll<HTMLElement>('.JXGtext')) {
            if (node.style.display === 'none' || node.style.visibility === 'hidden' || !node.textContent?.trim()) continue;
            texts.add(`${node.textContent.trim()}|${Math.round(node.offsetLeft / 3)}|${Math.round(node.offsetTop / 3)}`);
        }
        const points = new Map<string, [number, number]>();
        for (const element of (board as any).objectsList as any[]) {
            if ((element.elType !== 'point' && element.elType !== 'glider') || !element.visPropCalc?.visible) continue;
            const name = pointLabel(element);
            if (!name || points.has(name)) continue;
            points.set(name, [element.coords.scrCoords[1], element.coords.scrCoords[2]]);
        }
        return {shapes, texts, points};
    };
    /** Ghosts need their own copies: the app reuses or removes the live nodes. */
    const freeze = (shot: Picture): Picture => {
        const shapes = new Map<string, SVGElement>();
        for (const [key, node] of shot.shapes) shapes.set(key, node.cloneNode(false) as SVGElement);
        return {...shot, shapes};
    };

    let stable: Picture | undefined;
    let settleTimer = 0;
    let busy = false;
    const remember = () => {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => { if (!busy) stable = freeze(picture()); }, 350);
    };
    board.on('update', remember);
    remember();

    let lastReplay: (() => void) | undefined;
    let clearTimer = 0;
    const show = (before: Picture) => {
        const after = picture();
        const added = [...after.shapes].filter(([key]) => !before.shapes.has(key));
        const removed = [...before.shapes].filter(([key]) => !after.shapes.has(key));
        const moved = [...after.points].filter(([name, [x, y]]) => {
            const old = before.points.get(name);
            return old && Math.hypot(old[0] - x, old[1] - y) > 6;
        }).map(([name, p]) => [name, before.points.get(name)!, p] as [string, [number, number], [number, number]]);
        // Smart animate for unnamed points: a dot that vanished and a dot of the same look that appeared nearby moved.
        const isDot = (node: SVGElement) => /^(ellipse|circle)$/i.test(node.tagName);
        const centre = (node: SVGElement): [number, number] => [Number(node.getAttribute('cx')), Number(node.getAttribute('cy'))];
        const look = (node: SVGElement) => `${node.getAttribute('fill')}|${node.getAttribute('stroke')}|${node.getAttribute('rx') ?? node.getAttribute('r')}`;
        const reach = Math.hypot(svg.clientWidth, svg.clientHeight) * 0.35;
        const pairedOld = new Set<string>(), pairedNew = new Set<string>();
        for (const [oldKey, oldNode] of removed) {
            if (!isDot(oldNode)) continue;
            const from = centre(oldNode);
            if (moved.some(([, at]) => Math.hypot(at[0] - from[0], at[1] - from[1]) < 3)) { pairedOld.add(oldKey); continue; }
            let best: [string, [number, number]] | undefined, bestDistance = reach;
            for (const [newKey, newNode] of added) {
                if (pairedNew.has(newKey) || !isDot(newNode) || look(newNode) !== look(oldNode)) continue;
                const to = centre(newNode);
                const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
                if (distance < bestDistance) { bestDistance = distance; best = [newKey, to]; }
            }
            if (!best) continue;
            pairedOld.add(oldKey);
            pairedNew.add(best[0]);
            if (bestDistance > 6) moved.push(['', from, best[1]]);
        }
        for (const [, , to] of moved) {
            for (const [newKey, newNode] of added) if (isDot(newNode) && Math.hypot(centre(newNode)[0] - to[0], centre(newNode)[1] - to[1]) < 3) pairedNew.add(newKey);
        }
        // A stroke of the same look that vanished and reappeared elsewhere changed; its ghost still shows where it was.
        const strokeLook = (node: SVGElement) => `${node.tagName}|${node.getAttribute('stroke')}|${node.getAttribute('stroke-width')}|${node.getAttribute('stroke-dasharray')}|${node.getAttribute('fill')}`;
        const changedNew = new Set<string>(), changedOld = new Set<string>();
        for (const [oldKey, oldNode] of removed) {
            if (isDot(oldNode) || pairedOld.has(oldKey)) continue;
            const match = added.find(([newKey, newNode]) => !isDot(newNode) && !changedNew.has(newKey) && strokeLook(newNode) === strokeLook(oldNode));
            if (!match) continue;
            changedNew.add(match[0]);
            changedOld.add(oldKey);
        }
        const freshDots = added.filter(([key, node]) => isDot(node) && !pairedNew.has(key)).length;
        const freshLines = added.filter(([key, node]) => !isDot(node) && !changedNew.has(key)).length;
        const gone = removed.filter(([key]) => !pairedOld.has(key));
        const vanished = gone.filter(([key]) => !changedOld.has(key)).length;
        const textNodes = [...container.querySelectorAll<HTMLElement>('.JXGtext')].filter(node =>
            node.textContent?.trim() && node.style.display !== 'none' && node.style.visibility !== 'hidden'
            && !before.texts.has(`${node.textContent.trim()}|${Math.round(node.offsetLeft / 3)}|${Math.round(node.offsetTop / 3)}`));
        container.dataset.uxWc = `${added.length}/${after.shapes.size} -${removed.length} m${moved.length} t${textNodes.length}`;
        // A changed view (zoom, pan) changes every stroke; that is not news about the construction.
        if (!after.shapes.size || added.length > 0.8 * after.shapes.size && after.shapes.size > 12) { badge.hidden = true; return; }
        const total = freshDots + freshLines + changedNew.size + vanished + moved.length + textNodes.length;
        if (!total) { badge.hidden = true; return; }
        const replay = () => {
            window.clearTimeout(clearTimer);
            layer.replaceChildren();
            layer.setAttribute('viewBox', `0 0 ${svg.clientWidth} ${svg.clientHeight}`);
            layer.setAttribute('width', String(svg.clientWidth));
            layer.setAttribute('height', String(svg.clientHeight));
            for (const [, node] of gone) {
                const copy = node.cloneNode(false) as SVGElement;
                copy.removeAttribute('id');
                copy.setAttribute('class', 'ux-wc-ghost');
                layer.appendChild(copy);
            }
            for (const [key, node] of added) {
                if (pairedNew.has(key)) continue;
                const copy = node.cloneNode(false) as SVGElement;
                copy.removeAttribute('id');
                const filled = (node.getAttribute('fill') ?? 'none') !== 'none' && node.getAttribute('fill-opacity') !== '0';
                copy.setAttribute('class', filled && node.tagName.toLowerCase() !== 'path' ? 'ux-wc-new ux-wc-dot' : 'ux-wc-new');
                layer.appendChild(copy);
            }
            for (const [, [x0, y0], [x1, y1]] of moved) {
                const length = Math.hypot(x1 - x0, y1 - y0);
                const shorten = Math.min(10, length / 3);
                const ex = x1 - (x1 - x0) / length * shorten, ey = y1 - (y1 - y0) / length * shorten;
                const group = document.createElementNS(SVG_NS, 'g');
                group.setAttribute('class', 'ux-wc-move');
                const was = document.createElementNS(SVG_NS, 'circle');
                for (const [k, v] of Object.entries({cx: x0, cy: y0, r: 5})) was.setAttribute(k, String(v));
                const line = document.createElementNS(SVG_NS, 'path');
                const angle = Math.atan2(ey - y0, ex - x0);
                const head = (a: number) => `${ex - 9 * Math.cos(angle + a)},${ey - 9 * Math.sin(angle + a)}`;
                line.setAttribute('d', `M${x0},${y0} L${ex},${ey} M${head(0.45)} L${ex},${ey} L${head(-0.45)}`);
                line.setAttribute('pathLength', '1');
                group.append(was, line);
                layer.appendChild(group);
            }
            for (const node of textNodes) {
                node.classList.remove('ux-wc-text');
                void node.offsetWidth;
                node.classList.add('ux-wc-text');
            }
            container.classList.remove('ux-wc-on');
            void container.offsetWidth;
            container.classList.add('ux-wc-on');
            clearTimer = window.setTimeout(() => {
                layer.replaceChildren();
                container.classList.remove('ux-wc-on');
                textNodes.forEach(node => node.classList.remove('ux-wc-text'));
            }, 2600);
        };
        lastReplay = replay;
        const parts: string[] = [];
        const count = (n: number, one: string, two: string, few: string, many: string) => `${n} ${n === 1 ? one : n === 2 ? two : n < 5 ? few : many}`;
        if (freshLines) parts.push(count(freshLines, 'nova črta', 'novi črti', 'nove črte', 'novih črt'));
        if (freshDots) parts.push(count(freshDots, 'nova točka', 'novi točki', 'nove točke', 'novih točk'));
        const named = moved.map(([name]) => name).filter(Boolean);
        if (moved.length) parts.push(named.length === moved.length && named.length <= 3
            ? `${named.join(', ')} ${moved.length === 1 ? 'se premakne' : moved.length === 2 ? 'se premakneta' : 'se premaknejo'}`
            : count(moved.length, 'točka se premakne', 'točki se premakneta', 'točke se premaknejo', 'točk se premakne'));
        if (changedNew.size) parts.push(count(changedNew.size, 'črta se spremeni', 'črti se spremenita', 'črte se spremenijo', 'črt se spremeni'));
        if (vanished) parts.push(`${vanished} ${vanished === 1 ? 'izgine' : vanished === 2 ? 'izgineta' : 'izginejo'}`);
        badge.innerHTML = `<span aria-hidden="true">✦</span> ${parts.join(' · ') || 'Spremembe na grafu'} <span class="ux-wc-again" aria-hidden="true">↻</span>`;
        badge.setAttribute('aria-label', `Kaj je novo na grafu: ${parts.join(', ')}. Pokaži še enkrat.`);
        badge.hidden = false;
        replay();
    };

    let previous: LessonPosition | undefined = lessonPosition();
    const stop = onLessonPosition(position => {
        const changed = position && previous && position.lessonId === previous.lessonId
            && (position.stepIndex !== previous.stepIndex || position.frameIndex !== previous.frameIndex);
        if (position) previous = position;
        container.dataset.uxWcPos = `${position?.stepIndex}.${position?.frameIndex} ${changed} ${!!stable}`;
        if (!changed || !stable) return;
        const before = stable;
        busy = true;
        window.clearTimeout(settleTimer);
        // The scene's board side effects run after the host commits; give them two frames and a breath.
        requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(() => {
            busy = false;
            try { show(before); } catch { /* board rebuilt */ }
            stable = freeze(picture());
        }, 120)));
    });
    badge.addEventListener('click', () => lastReplay?.());

    return () => {
        stop();
        board.off('update', remember);
        window.clearTimeout(settleTimer);
        window.clearTimeout(clearTimer);
        container.classList.remove('ux-wc-on');
        layer.remove(); badge.remove();
    };
}
