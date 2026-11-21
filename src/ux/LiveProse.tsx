import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {currentParams, getParam, observeParamChanges, splitLabel, type ParamEntry} from './paramRegistry';
import {PRESENTATION_LABEL} from './ParamPucks';
import './LiveProse.css';

/**
 * a9 — Live prose. A symbol in the lesson text that names a parameter of the graph (the d in "vertical shift d", the θ
 * in a formula) becomes a handle: hover it and the parts of the board it controls light up; drag it sideways and the
 * parameter follows. While the lesson holds the graph still (a reading frame), the symbol is a spring: let go and the
 * value glides back to the lesson's. Bret Victor's reactive documents, found automatically: MathJax's own MathML says
 * which letter is which, the shared slider registry says which letters are parameters.
 */

const SUBSCRIPTS: Record<string, string> = {'₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'};
const GEOMETRY_ATTRIBUTES = ['d', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'r', 'points'];
type BoardObject = {id: string; type: number; elType?: string; rendNode?: SVGElement; visPropCalc?: {visible?: boolean}};

function signature(node: Element): string {
    if (!(node instanceof SVGElement)) return node.textContent ?? '';
    let out = '';
    for (const name of GEOMETRY_ATTRIBUTES) out += `|${node.getAttribute(name) ?? ''}`;
    return out;
}

/** The symbol a parameter goes by, written the way MathML spells it: "x₀" becomes "x_0". */
function mathName(entry: ParamEntry): string | undefined {
    const symbol = splitLabel(entry.label).symbol;
    if (!symbol || /\s|\|/.test(symbol)) return undefined;
    const match = /^(\p{L})([₀-₉]+)$/u.exec(symbol);
    if (match) return `${match[1]}_${[...match[2]].map(c => SUBSCRIPTS[c]).join('')}`;
    return /^\p{L}$/u.test(symbol) ? symbol : undefined;
}

function liveParams(): Map<string, ParamEntry> {
    const out = new Map<string, ParamEntry>();
    for (const entry of currentParams()) {
        if (entry.max <= entry.min || entry.display || PRESENTATION_LABEL.test(entry.label) || (entry.inert && entry.unavailable)) continue;
        const name = mathName(entry);
        if (name && !out.has(name)) out.set(name, entry);
    }
    return out;
}

/** Pairs MathJax's visible glyph boxes with the MathML they render (same order), and tags the ones naming a parameter. */
function tagSymbols(root: ParentNode, names: Map<string, ParamEntry>) {
    for (const old of root.querySelectorAll('[data-ux-live]')) {
        if (!names.has(old.getAttribute('data-ux-live')!)) { old.removeAttribute('data-ux-live'); old.classList.remove('ux-live-sym'); }
    }
    for (const container of root.querySelectorAll('mjx-container')) {
        const shown = container.querySelectorAll('mjx-math mjx-mi, mjx-math mjx-msub');
        const meant = container.querySelectorAll('mjx-assistive-mml mi, mjx-assistive-mml msub');
        if (shown.length !== meant.length) continue;
        shown.forEach((box, i) => {
            const node = meant[i];
            let name: string | undefined;
            if (node.localName === 'mi') {
                if (node.parentElement?.localName === 'msub' && node.parentElement.firstElementChild === node) return;
                name = node.textContent?.trim();
            } else {
                const [base, sub] = [node.children[0], node.children[1]];
                if (base?.localName === 'mi' && sub?.localName === 'mn') name = `${base.textContent?.trim()}_${sub.textContent?.trim()}`;
            }
            if (name && names.has(name)) {
                box.setAttribute('data-ux-live', name);
                box.classList.add('ux-live-sym');
            } else if (box.hasAttribute('data-ux-live')) {
                box.removeAttribute('data-ux-live');
                box.classList.remove('ux-live-sym');
            }
        });
    }
}

function drawn(board: Board): BoardObject[] {
    return ((board as unknown as {objectsList: BoardObject[]}).objectsList).filter(object => object.rendNode && object.visPropCalc?.visible
        && object.elType !== 'axis' && object.elType !== 'ticks' && object.elType !== 'grid');
}

interface Drag { pointerId: number; key: string; startX: number; startValue: number; lesson: number; locked: boolean; moved: boolean; element: Element }
interface Tag { key: string; rect: DOMRect; dragging: boolean; locked: boolean }

export function LiveProse(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [tag, setTag] = useState<Tag>();
    const [, force] = useState(0);
    const drag = useRef<Drag>();
    const linked = useRef<SVGElement[]>([]);
    const probeCache = useRef(new Map<string, string[]>());

    useEffect(() => {
        const frame = props.frame.current;
        const section = frame?.closest('.workspace-graph');
        const locked = () => section?.getAttribute('data-lesson-locked') === 'true';
        let names = liveParams();
        const rescan = () => {
            names = liveParams();
            const card = document.querySelector('.guided-lesson');
            if (card) tagSymbols(card, names);
        };
        let scheduled = 0;
        const schedule = () => { if (!scheduled) scheduled = window.setTimeout(() => { scheduled = 0; rescan(); }, 120); };
        const mutations = new MutationObserver(schedule);
        mutations.observe(document.body, {childList: true, subtree: true});
        rescan();
        const timer = window.setInterval(rescan, 1500);

        let probing = '';
        const unlight = () => {
            for (const node of linked.current) node.classList.remove('ux-linked');
            linked.current = [];
            for (const puck of document.querySelectorAll('.ux-puck.is-linked')) puck.classList.remove('is-linked');
        };
        const light = (ids: string[]) => {
            unlight();
            const board = findBoard(frame ?? null);
            if (!board) return;
            const byId = new Map(drawn(board).map(object => [object.id, object]));
            const key = drag.current?.key ?? (hovered && keyOf(hovered));
            if (key) for (const puck of document.querySelectorAll(`.ux-puck[data-param="${CSS.escape(key)}"]`)) puck.classList.add('is-linked');
            for (const id of ids) {
                const node = byId.get(id)?.rendNode;
                if (node) { node.classList.add('ux-linked'); linked.current.push(node); }
            }
        };
        /** Which board elements a parameter moves: nudge it by 3 % for one frame and see what the board redraws. */
        const probe = (key: string, done: (ids: string[]) => void) => {
            const cached = probeCache.current.get(key);
            if (cached) { done(cached); return; }
            const entry = getParam(key);
            const board = findBoard(frame ?? null);
            if (!entry || !board) return;
            const before = new Map(drawn(board).map(object => [object.id, signature(object.rendNode!)]));
            const origin = entry.value;
            const delta = (entry.max - entry.min) * 0.03 * (origin + (entry.max - entry.min) * 0.03 <= entry.max ? 1 : -1);
            const nudged = entry.step >= 1 ? origin + Math.sign(delta) * entry.step : origin + delta;
            probing = key;
            // Read the board once the nudge is committed and the board has had two frames to redraw; always put it back.
            const read = () => {
                probing = '';
                const moved = drawn(board).filter(object => before.has(object.id) && before.get(object.id) !== signature(object.rendNode!)).map(object => object.id);
                getParam(key)?.setFromLesson(origin);
                probeCache.current.set(key, moved);
                done(moved);
                force(n => n + 1);
            };
            let frames = 0;
            const wait = () => {
                const current = getParam(key);
                if (!current) { probing = ''; return; }
                if (Math.abs(current.value - nudged) > 1e-12 && ++frames < 30) { requestAnimationFrame(wait); return; }
                requestAnimationFrame(() => requestAnimationFrame(read));
            };
            entry.setFromLesson(nudged);
            requestAnimationFrame(wait);
        };

        const symbolAt = (target: EventTarget | null) => (target as Element | null)?.closest?.('[data-ux-live]') ?? null;
        const keyOf = (element: Element) => names.get(element.getAttribute('data-ux-live')!)?.key;
        let hovered: Element | null = null;
        const over = (event: PointerEvent) => {
            if (drag.current) return;
            const element = symbolAt(event.target);
            if (element === hovered) return;
            hovered = element;
            if (!element) { unlight(); setTag(undefined); return; }
            const key = keyOf(element);
            if (!key) return;
            setTag({key, rect: element.getBoundingClientRect(), dragging: false, locked: locked()});
            probe(key, ids => { if (hovered === element || drag.current?.key === key) light(ids); });
        };
        const down = (event: PointerEvent) => {
            const element = symbolAt(event.target);
            if (!element || event.button !== 0) return;
            const key = keyOf(element);
            const entry = key && getParam(key);
            if (!key || !entry) return;
            event.preventDefault();
            event.stopPropagation();
            (element as HTMLElement).setPointerCapture?.(event.pointerId);
            drag.current = {pointerId: event.pointerId, key, startX: event.clientX, startValue: entry.value, lesson: entry.value, locked: locked(), moved: false, element};
            element.classList.add('is-held');
            setTag({key, rect: element.getBoundingClientRect(), dragging: true, locked: locked()});
            probe(key, light);
        };
        const move = (event: PointerEvent) => {
            const state = drag.current;
            if (!state || state.pointerId !== event.pointerId) return;
            const entry = getParam(state.key);
            if (!entry) return;
            const dx = event.clientX - state.startX;
            if (!state.moved && Math.abs(dx) < 3) return;
            state.moved = true;
            const span = entry.max - entry.min;
            // A full range is about 600 px (never slower than half a step per pixel); Shift is ten times finer.
            let value = state.startValue + dx * Math.max(span / 600, entry.step / 2) * (event.shiftKey ? 0.1 : 1);
            value = entry.cyclic === undefined ? Math.min(entry.max, Math.max(entry.min, value)) : ((value % entry.cyclic) + entry.cyclic) % entry.cyclic;
            value = Math.round((value - (entry.cyclic === undefined ? entry.min : 0)) / entry.step) * entry.step + (entry.cyclic === undefined ? entry.min : 0);
            value = Number(value.toFixed(10));
            if (state.locked) entry.setFromLesson(value); else entry.set(value);
            force(n => n + 1);
        };
        const up = (event: PointerEvent) => {
            const state = drag.current;
            if (!state || state.pointerId !== event.pointerId) return;
            drag.current = undefined;
            state.element.classList.remove('is-held');
            setTag(undefined);
            unlight();
            hovered = null;
            if (!state.locked || !state.moved) return;
            // A reading frame keeps the lesson's value: the symbol springs back with a small overshoot.
            const entry = getParam(state.key);
            if (!entry) return;
            const from = entry.value, to = state.lesson, start = performance.now();
            const spring = (now: number) => {
                const t = Math.min(1, (now - start) / 700);
                const k = 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-6 * t);
                const current = getParam(state.key);
                if (!current) return;
                const raw = from + (to - from) * k;
                current.setFromLesson(t >= 1 ? to : current.step >= 1 ? Math.round(raw) : raw);
                if (t < 1) requestAnimationFrame(spring);
            };
            requestAnimationFrame(spring);
        };
        const click = (event: MouseEvent) => { if (symbolAt(event.target)) { event.preventDefault(); event.stopPropagation(); } };
        const changes = observeParamChanges((_previous, next) => {
            // The other direction of the link: when a parameter moves, its symbols in the text pulse.
            if (drag.current?.key === next.key || probing === next.key) return;
            for (const [name, entry] of names) {
                if (entry.key !== next.key) continue;
                for (const element of document.querySelectorAll(`.guided-lesson [data-ux-live="${CSS.escape(name)}"]`)) {
                    element.classList.remove('is-pulsing');
                    void (element as HTMLElement).offsetWidth;
                    element.classList.add('is-pulsing');
                }
            }
        });
        // Probes are stale once the board or the frame changes.
        const forget = () => probeCache.current.clear();
        const clearTimer = window.setInterval(forget, 4000);
        document.addEventListener('pointerover', over, true);
        document.addEventListener('pointerdown', down, true);
        document.addEventListener('pointermove', move, true);
        document.addEventListener('pointerup', up, true);
        document.addEventListener('pointercancel', up, true);
        document.addEventListener('click', click, true);
        return () => {
            mutations.disconnect();
            window.clearInterval(timer);
            window.clearInterval(clearTimer);
            window.clearTimeout(scheduled);
            changes();
            unlight();
            document.removeEventListener('pointerover', over, true);
            document.removeEventListener('pointerdown', down, true);
            document.removeEventListener('pointermove', move, true);
            document.removeEventListener('pointerup', up, true);
            document.removeEventListener('pointercancel', up, true);
            document.removeEventListener('click', click, true);
            for (const element of document.querySelectorAll('[data-ux-live]')) { element.removeAttribute('data-ux-live'); element.classList.remove('ux-live-sym'); }
        };
    }, [props.frame]);

    if (!tag) return null;
    const entry = getParam(tag.key);
    if (!entry) return null;
    const span = entry.max - entry.min;
    const fraction = Math.max(0, Math.min(1, (entry.value - entry.min) / span));
    const left = Math.max(8, Math.min(window.innerWidth - 188, tag.rect.left + tag.rect.width / 2 - 90));
    const top = tag.rect.top - 58 < 4 ? tag.rect.bottom + 8 : tag.rect.top - 58;
    return createPortal(<div className={`ux-live-tag${tag.dragging ? ' is-dragging' : ''}`} style={{left, top}} aria-hidden="true">
        <div className="ux-live-tag-value"><i>{splitLabel(entry.label).symbol}</i> = <b>{entry.format(entry.value)}</b></div>
        <div className="ux-live-tag-track"><span style={{left: `${fraction * 100}%`}}/></div>
        <div className="ux-live-tag-hint">{tag.dragging ? (tag.locked ? 'spusti — vrne se' : 'vleci levo, desno') : '↔ povleci simbol'}</div>
    </div>, document.body);
}
