import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {findMainBoard, recoverBoards, type UxBoard} from './board';
import {applyRow, fanRows, type FanRow} from './fan';
import {morphScene} from './morph';
import './uxlab.css';

const GREEK: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', sigma: 'σ', phi: 'φ', omega: 'ω', tau: 'τ', rho: 'ρ', kappa: 'κ',
};

interface Binding {
    symbol: string;
    /** Key path of the quantity, so a fresh checkpoint can be searched for it again. */
    key: string;
    min: number;
    max: number;
    step: number;
    /** A slider or stepper of the inspector to light up, when there is one. */
    control?: HTMLElement;
}

function trailingSymbol(text: string): string | undefined {
    const token = text.replace(/[(),:]/g, ' ').trim().split(/\s+/).pop() ?? '';
    return /^[A-Za-zα-ωΑ-Ω]$/.test(token) ? token : undefined;
}

function symbolOfKey(key: string): string | undefined {
    const last = key.split('.').pop() ?? '';
    if (/^[A-Za-z]$/.test(last)) return last;
    return GREEK[last.toLowerCase()];
}

function format(value: number): string {
    const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
    let text = value.toFixed(digits);
    if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return text.replace('.', ',').replace('-', '−');
}

/** The quantities of the scene that a lesson can name with one letter, with their domain. */
function bindings(checkpoint: LessonSceneCheckpoint, board: UxBoard | undefined): Map<string, Binding> {
    const {rows} = fanRows(checkpoint.value, board?.getBoundingBox() ?? [-5, 5, 5, -5], 40);
    const scalars = rows.filter(row => row.kind === 'scalar');
    const result = new Map<string, Binding>();
    const bind = (symbol: string, row: FanRow, control?: HTMLElement, bounds?: {min: number; max: number; step: number}) => {
        if (result.has(symbol)) return;
        const value = row.leaves[0].value;
        const low = value + Math.min(...row.deltas), high = value + Math.max(...row.deltas);
        result.set(symbol, {symbol, key: row.key, control, min: bounds?.min ?? low, max: bounds?.max ?? high, step: bounds?.step ?? row.step ?? 0});
    };
    // Sliders and steppers name their quantity in their label ("Središče c", "Stopnja n"); hidden ones still know it.
    for (const input of document.querySelectorAll<HTMLInputElement>('input[type=range]')) {
        const label = input.labels?.[0]?.textContent ?? input.getAttribute('aria-label') ?? '';
        const symbol = trailingSymbol(label.replace(/,\s*vrednost.*$/i, ''));
        if (!symbol) continue;
        const value = Number(input.value);
        const matches = scalars.filter(row => Math.abs(row.leaves[0].value - value) <= Math.max(1e-9, Number(input.step || 0) / 2));
        const byName = matches.find(row => symbolOfKey(row.key) === symbol);
        const row = byName ?? (matches.length === 1 ? matches[0] : undefined);
        if (row) bind(symbol, row, input, {min: Number(input.min), max: Number(input.max), step: Number(input.step) || 0});
    }
    for (const setter of document.querySelectorAll<HTMLElement>('.count-setter')) {
        const symbol = trailingSymbol(setter.querySelector('.count-setter-label')?.textContent ?? '');
        const field = setter.querySelector<HTMLInputElement>('input');
        const value = Number(field?.value ?? setter.querySelector('.count-setter-value')?.textContent);
        if (!symbol || !Number.isFinite(value)) continue;
        const matches = scalars.filter(row => row.step === 1 && row.leaves[0].value === value && /^(degree|order|n|k|m|count|iterations?|steps?|terms|harmonics?|depth|level|levels|subdivisions?|rounds?|segments)$/i.test(row.key.split('.').pop() ?? ''));
        if (matches.length === 1) bind(symbol, matches[0], setter, {min: Math.max(0, value + Math.min(...matches[0].deltas)), max: value + Math.max(...matches[0].deltas) + 4, step: 1});
    }
    // Keys that are the symbol itself (n, p, k, a, t, omega → ω).
    for (const row of scalars) {
        const symbol = symbolOfKey(row.key);
        if (symbol) bind(symbol, row);
    }
    return result;
}

/** The symbol a rendered formula names when it is only that symbol, or "symbol = value". */
function namedSymbol(container: Element): string | undefined {
    const math = container.querySelector('mjx-assistive-mml math') ?? container.querySelector('math');
    if (!math) return undefined;
    const parts = [...math.children].flatMap(child => child.tagName.toLowerCase() === 'mrow' && math.children.length === 1 ? [...child.children] : [child]);
    const first = parts[0];
    if (!first || first.tagName.toLowerCase() !== 'mi') return undefined;
    if (parts.length === 1) return first.textContent?.trim();
    const second = parts[1];
    if (second?.tagName.toLowerCase() === 'mo' && second.textContent?.trim() === '=') return first.textContent?.trim();
    return undefined;
}

function findRow(value: unknown, board: UxBoard | undefined, key: string): FanRow | undefined {
    return fanRows(value, board?.getBoundingBox() ?? [-5, 5, 5, -5], 40).rows.find(row => row.kind === 'scalar' && row.key === key);
}

/**
 * Lane B b14: live prose (Victor's reactive documents, Tangle). A symbol the lesson text names alone or as "c = 0" is
 * bound to the scene quantity it stands for; hover it and the inspector's slider lights up, drag it left or right and
 * the graph follows. While the lesson card holds the scene, letting go springs the graph back to the lesson's picture.
 */
export function LiveProse(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities}) {
    const [board, setBoard] = useState<UxBoard>();
    const [badge, setBadge] = useState<{x: number; y: number; text: string; hint?: string}>();
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
    useEffect(() => { if (!window.__uxLesson) window.__uxLesson = {capabilities: props.capabilities, session: undefined}; }, [props.capabilities]);

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    useEffect(() => {
        let symbols = new Map<string, Binding>();
        let stateKey = '';
        const refresh = () => {
            let checkpoint: LessonSceneCheckpoint;
            try { checkpoint = caps.current.captureState(); } catch { return; }
            const json = JSON.stringify(checkpoint.value);
            const controls = document.querySelectorAll('input[type=range], .count-setter').length;
            if (json + controls !== stateKey) { stateKey = json + controls; symbols = bindings(checkpoint, board); }
            for (const container of document.querySelectorAll<HTMLElement>('mjx-container')) {
                if (board?.containerObj.contains(container)) continue;
                const symbol = namedSymbol(container);
                const live = symbol !== undefined && symbols.has(symbol);
                container.classList.toggle('ux-live-sym', live);
                if (live) container.dataset.uxSymbol = symbol; else delete container.dataset.uxSymbol;
            }
        };
        refresh();
        const timer = window.setInterval(refresh, 700);

        const lit: Element[] = [];
        const light = (symbol?: string) => {
            lit.splice(0).forEach(element => element.classList.remove('ux-live-lit', 'ux-ff-source'));
            if (!symbol) return;
            document.querySelectorAll(`.ux-live-sym[data-ux-symbol="${CSS.escape(symbol)}"]`).forEach(element => { element.classList.add('ux-live-lit'); lit.push(element); });
            const control = symbols.get(symbol)?.control;
            if (control && control.offsetParent !== null) { control.classList.add('ux-ff-source'); lit.push(control); }
        };
        // On a phone the graph is often scrolled away from the text: a small live copy follows the finger then.
        let pip: HTMLDivElement | undefined;
        let pipFrame = 0;
        const pipOn = () => {
            const svg = board?.renderer.svgRoot;
            if (!board || !svg) return;
            const rect = board.containerObj.getBoundingClientRect();
            const hidden = rect.bottom < 80 || rect.top > window.innerHeight - 80;
            if (!hidden) return;
            if (!pip) {
                pip = document.createElement('div');
                pip.className = 'ux-live-pip';
                pip.setAttribute('aria-hidden', 'true');
                pip.style.aspectRatio = `${board.canvasWidth} / ${board.canvasHeight}`;
                document.body.appendChild(pip);
            }
            let ticks = 0;
            const draw = () => {
                if (!pip) return;
                if (ticks++ % 2 === 0) {
                    const copy = svg.cloneNode(true) as SVGSVGElement;
                    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
                    copy.setAttribute('viewBox', `0 0 ${board.canvasWidth} ${board.canvasHeight}`);
                    copy.setAttribute('width', '100%');
                    copy.setAttribute('height', '100%');
                    copy.removeAttribute('style');
                    pip.replaceChildren(copy);
                }
                pipFrame = requestAnimationFrame(draw);
            };
            cancelAnimationFrame(pipFrame);
            pipFrame = requestAnimationFrame(draw);
        };
        const pipOff = (delay = 0) => {
            cancelAnimationFrame(pipFrame);
            const leaving = pip;
            pip = undefined;
            if (leaving) window.setTimeout(() => leaving.remove(), delay);
        };

        const place = (element: Element, text: string, hint?: string) => {
            const rect = element.getBoundingClientRect();
            setBadge({x: rect.left + rect.width / 2, y: rect.top, text, hint});
        };
        const current = (binding: Binding): number | undefined => {
            try { return findRow(caps.current.captureState().value, board, binding.key)?.leaves[0].value; } catch { return undefined; }
        };

        // Resting on a symbol wiggles its quantity once: the graph shows what the letter moves, then is exactly as before.
        let wiggle: {timer: number; frame: number; base?: LessonSceneCheckpoint; element?: Element} = {timer: 0, frame: 0};
        const stopWiggle = () => {
            window.clearTimeout(wiggle.timer);
            cancelAnimationFrame(wiggle.frame);
            if (wiggle.base) { try { caps.current.restoreState(wiggle.base); } catch { recoverBoards(); } }
            wiggle = {timer: 0, frame: 0};
        };
        const startWiggle = (element: Element, binding: Binding) => {
            stopWiggle();
            wiggle.element = element;
            wiggle.timer = window.setTimeout(() => {
                let base: LessonSceneCheckpoint;
                try { base = caps.current.captureState(); } catch { return; }
                const row = findRow(base.value, board, binding.key);
                if (!row) return;
                wiggle.base = base;
                const value = row.leaves[0].value, span = binding.max - binding.min;
                const whole = binding.step >= 1;
                const reach = whole ? binding.step : Math.max(binding.step, 0.07 * span);
                const started = performance.now();
                let last = value;
                const tick = (now: number) => {
                    const t = (now - started) / 1300;
                    if (t >= 1 || !wiggle.base) { stopWiggle(); return; }
                    let next = value + reach * Math.sin(t * 2 * Math.PI);
                    if (whole) next = value + Math.round((next - value) / binding.step) * binding.step;
                    next = Math.min(binding.max, Math.max(binding.min, next));
                    if (next !== last) {
                        try { caps.current.restoreState({version: 1, value: applyRow(base.value, row, next - value)}); last = next; } catch { recoverBoards(); stopWiggle(); return; }
                    }
                    wiggle.frame = requestAnimationFrame(tick);
                };
                wiggle.frame = requestAnimationFrame(tick);
            }, 650);
        };

        let drag: {pointer: number; symbol: string; binding: Binding; startX: number; start: number; base: LessonSceneCheckpoint; row: FanRow; element: Element; last: number; springBack: boolean} | undefined;
        const onOver = (event: PointerEvent) => {
            if (drag) return;
            const element = (event.target as Element | null)?.closest?.('.ux-live-sym') as HTMLElement | null;
            if (!element) { if (wiggle.element) stopWiggle(); light(undefined); setBadge(undefined); return; }
            const symbol = element.dataset.uxSymbol!;
            const binding = symbols.get(symbol);
            if (!binding) return;
            if (wiggle.element !== element) startWiggle(element, binding);
            light(symbol);
            const value = current(binding);
            place(element, `${symbol} = ${value === undefined ? '?' : format(value)}`, 'povleci levo ali desno');
        };
        const onDown = (event: PointerEvent) => {
            const element = (event.target as Element | null)?.closest?.('.ux-live-sym') as HTMLElement | null;
            if (!element || event.button > 0) return;
            const symbol = element.dataset.uxSymbol!;
            const binding = symbols.get(symbol);
            if (!binding) return;
            stopWiggle();
            let base: LessonSceneCheckpoint;
            try { base = caps.current.captureState(); } catch { return; }
            const row = findRow(base.value, board, binding.key);
            if (!row) return;
            event.preventDefault();
            event.stopPropagation();
            element.setPointerCapture?.(event.pointerId);
            // The lesson card owns the scene: there the prose may only show, and lets the graph spring back.
            const springBack = Boolean(document.querySelector('.demonstration-workspace.lesson-content'));
            drag = {pointer: event.pointerId, symbol, binding, startX: event.clientX, start: row.leaves[0].value, base, row, element, last: row.leaves[0].value, springBack};
            light(symbol);
            document.body.classList.add('ux-live-dragging');
            pipOn();
        };
        const onMove = (event: PointerEvent) => {
            if (!drag || event.pointerId !== drag.pointer) return;
            const {binding} = drag;
            const span = binding.max - binding.min;
            let value = drag.start + (event.clientX - drag.startX) * span / 260;
            const step = binding.step || span / 200;
            value = Math.min(binding.max, Math.max(binding.min, Math.round((value - binding.min) / step) * step + binding.min));
            value = Number(value.toFixed(9));
            if (value !== drag.last) {
                try {
                    caps.current.restoreState({version: 1, value: applyRow(drag.base.value, drag.row, value - drag.start)});
                    drag.last = value;
                } catch { recoverBoards(); }
            }
            place(drag.element, `${drag.symbol} = ${format(drag.last)}`, drag.springBack ? 'spusti in graf se vrne' : undefined);
        };
        const onUp = (event: PointerEvent) => {
            if (!drag || event.pointerId !== drag.pointer) return;
            const finished = drag;
            drag = undefined;
            document.body.classList.remove('ux-live-dragging');
            // Kept a moment so the spring back is seen too.
            window.setTimeout(() => pipOff(), finished.springBack ? 900 : 400);
            if (finished.springBack && finished.last !== finished.start) {
                let scrubbed: LessonSceneCheckpoint | undefined;
                try { scrubbed = caps.current.captureState(); } catch { /* restored below */ }
                try { caps.current.restoreState(finished.base); } catch { recoverBoards(); }
                if (scrubbed) morphScene(caps.current, scrubbed, {duration: 650});
            }
            place(finished.element, `${finished.symbol} = ${format(finished.springBack ? finished.start : finished.last)}`);
            window.setTimeout(() => { if (!drag) setBadge(undefined); }, 1200);
        };
        // A finger on a symbol drags the value, it does not scroll the lesson.
        const onTouch = (event: TouchEvent) => { if (drag || (event.target as Element | null)?.closest?.('.ux-live-sym')) event.preventDefault(); };
        window.addEventListener('touchstart', onTouch, {capture: true, passive: false});
        window.addEventListener('touchmove', onTouch, {capture: true, passive: false});
        window.addEventListener('pointerover', onOver, true);
        window.addEventListener('pointerdown', onDown, true);
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
        return () => {
            window.clearInterval(timer);
            stopWiggle();
            pipOff();
            window.removeEventListener('touchstart', onTouch, true);
            window.removeEventListener('touchmove', onTouch, true);
            window.removeEventListener('pointerover', onOver, true);
            window.removeEventListener('pointerdown', onDown, true);
            window.removeEventListener('pointermove', onMove, true);
            window.removeEventListener('pointerup', onUp, true);
            window.removeEventListener('pointercancel', onUp, true);
            light(undefined);
            document.querySelectorAll('.ux-live-sym').forEach(element => element.classList.remove('ux-live-sym'));
        };
    }, [board]);

    if (!badge) return null;
    return createPortal(<div className="ux-live-badge" style={{left: badge.x, top: badge.y}} role="status">
        <b>{badge.text}</b>{badge.hint && <span>{badge.hint}</span>}
    </div>, document.body);
}
