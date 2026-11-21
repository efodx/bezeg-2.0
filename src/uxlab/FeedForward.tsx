import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {contentElements, coverBoard, elementSignature, findMainBoard, recoverBoards, svgRoot, type UxBoard, type UxElement} from './board';
import {geometryKey, visibleSamples, type Sample} from './geometrySamples';
import './uxlab.css';

const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});

const GEOMETRY = /^(path|line|ellipse|circle|polygon|polyline|rect)$/i;
/** Arrows only on shapes that read as one moving curve; bars and fills would hatch the graph. */
const CURVY = new Set(['curve', 'functiongraph', 'line', 'segment', 'circle', 'arc', 'conic', 'ellipse', 'parabola', 'hyperbola', 'polygonalchain', 'spline', 'cardinalspline', 'tangent', 'normal', 'semicircle', 'circumcircle']);
/** Buttons that leave the scene (save, export, open, navigate) are never tried. */
const UNSAFE = /pogled|povečava|pomanjšava|zoom|pokaži|razkrij|reši|rešitev|namig|preveri|shrani|izvoz|uvoz|prenes|kopiraj|natisni|deli|odpri|zapri|predstav|zamenjaj|spoznaj|preberi|lekcij|nazaj|naprej|povezav|datotek|izbriši vse|strni|razširi|pomoč|save|export|import|open|close|share|download/i;

type Kind = 'range' | 'toggle' | 'button';

interface Preview {
    control: Element;
    kind: Kind;
    plus: string;
    minus: string;
    arrows: string;
    caption: string;
}

function keyed(board: UxBoard): Map<string, UxElement> {
    const seen = new Map<string, number>();
    const result = new Map<string, UxElement>();
    for (const element of contentElements(board)) {
        const node = element.rendNode;
        if (!node || !GEOMETRY.test(node.tagName) || element.elType === 'text') continue;
        const signature = elementSignature(element);
        const index = seen.get(signature) ?? 0;
        seen.set(signature, index + 1);
        result.set(`${signature}#${index}`, element);
    }
    return result;
}

function markup(element: UxElement): string {
    return element.rendNode!.outerHTML.replace(/\s(id|marker-start|marker-end|marker-mid|style)="[^"]*"/g, '');
}

interface Shot { keys: Map<string, string>; nodes: Map<string, UxElement>; samples: Map<string, Sample[]>; markup: Map<string, string> }

function shoot(board: UxBoard, withSamples: boolean): Shot {
    const nodes = keyed(board);
    const keys = new Map([...nodes].map(([key, element]) => [key, geometryKey(element.rendNode!)]));
    const samples = new Map<string, Sample[]>();
    if (withSamples) for (const [key, element] of nodes) if (CURVY.has(element.elType)) samples.set(key, visibleSamples(element.rendNode!, board.canvasWidth, board.canvasHeight, 4));
    return {keys, nodes, samples, markup: new Map([...nodes].map(([key, element]) => [key, markup(element)]))};
}

/** Markup of what the change draws differently, and the samples of those shapes afterwards. */
function changed(before: Shot, board: UxBoard): {svg: string; gone: string; after: Map<string, Sample[]>} {
    const now = keyed(board);
    let svg = '';
    // What the change hides is shown too, in grey: a toggle that switches something off.
    let gone = '';
    for (const [key, text] of before.markup) if (!now.has(key)) gone += text;
    const after = new Map<string, Sample[]>();
    for (const [key, element] of now) {
        if (before.keys.get(key) === geometryKey(element.rendNode!)) continue;
        svg += markup(element);
        if (CURVY.has(element.elType)) after.set(key, visibleSamples(element.rendNode!, board.canvasWidth, board.canvasHeight, 4));
    }
    return {svg, gone, after};
}

function nearestTo(samples: readonly Sample[], point: Sample): Sample | undefined {
    let best: Sample | undefined, distance = Infinity;
    for (const sample of samples) {
        const d = (sample[0] - point[0]) ** 2 + (sample[1] - point[1]) ** 2;
        if (d < distance) { distance = d; best = sample; }
    }
    return best;
}

/** A few arrows from the shape now to the shape after the change: where each part of the curve will go. */
function arrows(before: Shot, after: Map<string, Sample[]>): string {
    const perShape: {lines: string[]; travel: number}[] = [];
    for (const [key, target] of after) {
        const source = before.samples.get(key);
        if (!source || source.length < 2 || target.length === 0) continue;
        // About one arrow per 80 px of curve, a handful per shape: enough to read the motion, not a hatching.
        const each = Math.min(6, Math.max(1, Math.round(source.length * 4 / 80)));
        const stride = Math.max(1, Math.floor(source.length / each));
        const lines: string[] = [];
        let travel = 0;
        for (let i = Math.floor(stride / 2); i < source.length; i += stride) {
            const from = source[i];
            const to = nearestTo(target, from);
            if (!to) continue;
            const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
            if (length < 7 || length > 220) continue;
            travel += length;
            lines.push(`<line x1="${from[0].toFixed(1)}" y1="${from[1].toFixed(1)}" x2="${to[0].toFixed(1)}" y2="${to[1].toFixed(1)}" marker-end="url(#ux-ff-head)"/>`);
        }
        if (lines.length) perShape.push({lines, travel: travel / lines.length});
    }
    // The shapes that move most tell the story; the rest would only cross their arrows.
    return perShape.sort((a, b) => b.travel - a.travel).slice(0, 3).flatMap(shape => shape.lines).join('');
}

function controlKind(target: Element, board: UxBoard): {control: HTMLElement; kind: Kind} | undefined {
    if (board.containerObj.contains(target)) return undefined;
    if (target.closest('.inspector-toolbar, .inspector-tabs, [role=dialog], .ux-fan, .ux-why, .ux-listen, .ux-clip, nav, header, a')) return undefined;
    const input = target.closest('input');
    if (input instanceof HTMLInputElement) {
        if (input.disabled) return undefined;
        if (input.type === 'range') return {control: input, kind: 'range'};
        if (input.type === 'checkbox') return {control: input, kind: 'toggle'};
        return undefined;
    }
    const label = target.closest('label');
    const labelled = label?.querySelector('input[type=checkbox]') ?? (label?.htmlFor ? document.getElementById(label.htmlFor) : null);
    if (labelled instanceof HTMLInputElement && labelled.type === 'checkbox' && !labelled.disabled) return {control: labelled, kind: 'toggle'};
    const button = target.closest('button');
    if (!(button instanceof HTMLButtonElement) || button.disabled || button.getAttribute('aria-disabled') === 'true') return undefined;
    if (button.hasAttribute('aria-haspopup') || button.hasAttribute('aria-expanded') || button.closest('summary')) return undefined;
    const text = (button.textContent ?? '').trim();
    const name = `${text} ${button.getAttribute('aria-label') ?? ''}`;
    if (UNSAFE.test(name) || text.length > 28) return undefined;
    const steps = button.classList.contains('count-setter-button') || text.length <= 2;
    const inInspector = Boolean(button.closest('#workspace-inspector'));
    return steps || inInspector ? {control: button, kind: 'button'} : undefined;
}

function nameOf(control: HTMLElement): string {
    if (control instanceof HTMLInputElement) {
        const text = control.labels?.[0]?.innerText ?? control.getAttribute('aria-label') ?? '';
        return text.replace(/,\s*vrednost.*$/i, '').replace(/\s+/g, ' ').trim();
    }
    const group = control.closest('.count-setter')?.querySelector('.count-setter-label')?.textContent?.trim();
    const own = control.getAttribute('aria-label') ?? control.textContent?.trim() ?? '';
    return group ? `${group}: ${own}` : own;
}

function format(value: number): string {
    const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
    let text = value.toFixed(digits);
    if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return text.replace('.', ',').replace('-', '−');
}

const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

/**
 * Lane B b13: feedforward for every control. Rest the pointer on (or tab to) a slider, a stepper button, a nudge button or a
 * checkbox, and the graph shows faintly what it would do before anything is pressed: the shape after one step in
 * elderberry, the other way in grey, and arrows from where each part of the curve is to where it would go.
 */
export function FeedForward(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [preview, setPreview] = useState<Preview>();
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
    const lockedRef = useRef(props.locked);
    lockedRef.current = props.locked;
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
        if (!board) return;
        let hovered: HTMLElement | undefined;
        let timer = 0;
        let busy = false;
        let generation = 0;
        const cache = new Map<Element, {state: string; preview: Preview}>();

        /** Applies a control's effect; returns a caption part, or undefined when it did nothing. */
        const act = (control: HTMLElement, kind: Kind, direction: 1 | -1): string | undefined => {
            if (kind === 'range' && control instanceof HTMLInputElement) {
                const min = Number(control.min), max = Number(control.max), step = Number(control.step) || (max - min) / 100;
                const value = Number(control.value);
                // A noticeable but local step: a tenth of the range, at most half the value itself (n = 20 → 30, not 120).
                let reach = 0.1 * (max - min);
                if (Math.abs(value) > 1e-9) reach = Math.min(reach, 0.5 * Math.abs(value));
                const raw = value + direction * Math.max(step, reach);
                const next = Math.min(max, Math.max(min, Math.round((raw - min) / step) * step + min));
                if (Math.abs(next - value) < 1e-12) return undefined;
                valueSetter?.call(control, String(next));
                control.dispatchEvent(new Event('input', {bubbles: true}));
                control.dispatchEvent(new Event('change', {bubbles: true}));
                return `${format(value)} → ${format(next)}`;
            }
            if (direction === -1) return undefined;
            const counter = control.closest('.count-setter');
            const count = () => {
                const field = counter?.querySelector<HTMLInputElement>('input');
                return field?.value ?? counter?.querySelector('.count-setter-value')?.textContent ?? '';
            };
            const was = count();
            control.click();
            if (kind === 'toggle') return (control as HTMLInputElement).checked ? 'vklopi' : 'izklopi';
            return counter && was ? `${was} → ?` : 'en pritisk';
        };

        const compute = async (control: HTMLElement, kind: Kind) => {
            // Switching something on is a reveal (lessons ask to predict first): it is never shown in advance.
            if (kind === 'toggle' && control instanceof HTMLInputElement && !control.checked) {
                setPreview({control, kind, plus: '', minus: '', arrows: '', caption: `${nameOf(control)}: kaj se bo pojavilo? Najprej napovej, nato vklopi.`});
                return;
            }
            let base: LessonSceneCheckpoint;
            try { base = caps.current.captureState(); } catch { return; }
            const state = JSON.stringify(base.value);
            const cached = cache.get(control);
            if (cached && cached.state === state) { setPreview(cached.preview); return; }
            busy = true;
            const mine = ++generation;
            const cover = coverBoard(board.containerObj);
            const before = shoot(board, true);
            const run = async (direction: 1 | -1) => {
                let caption: string | undefined;
                try { caption = act(control, kind, direction); } catch { recoverBoards(); }
                if (caption === undefined) return {svg: '', gone: '', after: new Map<string, Sample[]>(), caption};
                await nextFrames(2);
                recoverBoards();
                const counter = control.closest('.count-setter');
                if (counter && caption.includes('→')) {
                    const field = counter.querySelector<HTMLInputElement>('input');
                    caption = caption.replace(/→.*$/, `→ ${field?.value ?? counter.querySelector('.count-setter-value')?.textContent ?? ''}`);
                }
                const result = changed(before, board);
                try { caps.current.restoreState(base); } catch { recoverBoards(); }
                await nextFrames(2);
                recoverBoards();
                return {...result, caption};
            };
            const plus = await run(1);
            const minus = kind === 'range' ? await run(-1) : {svg: plus.gone, gone: '', after: new Map<string, Sample[]>(), caption: undefined};
            // Whatever the control touched outside the checkpoint is put back too (the slider's own value follows the state).
            try { if (JSON.stringify(caps.current.captureState().value) !== state) caps.current.restoreState(base); } catch { recoverBoards(); }
            await nextFrames(1);
            cover.remove();
            busy = false;
            if (mine !== generation || hovered !== control) return;
            const name = nameOf(control);
            if (plus.caption?.endsWith('→ ?')) plus.caption = 'en pritisk';
            const caption = !plus.svg && !minus.svg
                ? `${name}: na grafu se nič ne spremeni`
                : kind === 'range' ? `${name}: ${plus.caption ?? ''}${minus.caption ? ` · ${minus.caption.replace(/^.* → /, '→ ')}` : ''}` : `${name.replace(/:\s*(Povečaj|Zmanjšaj) število$/i, '')}: ${plus.caption}`;
            const next: Preview = {control, kind, plus: plus.svg, minus: minus.svg, arrows: arrows(before, plus.after), caption};
            cache.set(control, {state, preview: next});
            setPreview(next);
        };

        const leave = () => {
            window.clearTimeout(timer);
            hovered = undefined;
            generation++;
            setPreview(undefined);
        };

        const enter = (target: EventTarget | null) => {
            if (lockedRef.current || !(target instanceof Element)) return;
            const found = controlKind(target, board);
            if (found?.control === hovered) return;
            leave();
            if (!found) return;
            hovered = found.control;
            timer = window.setTimeout(() => { if (!busy && hovered === found.control) void compute(found.control, found.kind); }, 260);
        };

        const onOver = (event: PointerEvent) => { if (event.pointerType === 'mouse' && !event.buttons) enter(event.target); };
        const onFocus = (event: FocusEvent) => { if ((event.target as Element)?.matches?.(':focus-visible')) enter(event.target); };
        // Using the control is the real thing: the preview steps aside at once.
        const onUse = (event: Event) => { if (busy || !event.isTrusted) return; if (hovered) leave(); };
        window.addEventListener('pointerover', onOver, true);
        window.addEventListener('focusin', onFocus, true);
        window.addEventListener('pointerdown', onUse, true);
        window.addEventListener('keydown', onUse, true);
        const onOut = (event: PointerEvent) => {
            if (!hovered || event.pointerType !== 'mouse') return;
            const to = event.relatedTarget as Node | null;
            if (!to || !hovered.contains(to) && !(hovered.closest('label, .slider-field, .count-setter')?.contains(to))) leave();
        };
        window.addEventListener('pointerout', onOut, true);
        return () => {
            window.removeEventListener('pointerover', onOver, true);
            window.removeEventListener('focusin', onFocus, true);
            window.removeEventListener('pointerdown', onUse, true);
            window.removeEventListener('keydown', onUse, true);
            window.removeEventListener('pointerout', onOut, true);
            window.clearTimeout(timer);
        };
    }, [board]);

    // The preview is drawn into the board's own SVG, under nothing and over everything.
    useEffect(() => {
        if (!board) return;
        const svg = svgRoot(board);
        if (!svg) return;
        const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.setAttribute('class', 'ux-ff-layer');
        layer.setAttribute('pointer-events', 'none');
        if (preview) {
            layer.innerHTML = `<defs><marker id="ux-ff-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#5d3b6e"/></marker></defs>`
                + `<g class="ux-ff-minus">${preview.minus}</g><g class="ux-ff-plus">${preview.plus}</g><g class="ux-ff-arrows">${preview.arrows}</g>`;
            preview.control.classList.add('ux-ff-source');
        }
        svg.appendChild(layer);
        return () => { layer.remove(); preview?.control.classList.remove('ux-ff-source'); };
    }, [board, preview]);

    if (!board || props.locked || !preview) return null;
    return createPortal(<div className="ux-ff-caption" role="status">
        <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M2 10 Q10 2 18 10 Q10 18 2 10 Z" fill="none" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="10" r="2.6" fill="currentColor"/></svg>
        <span>{preview.caption}</span>
        {preview.minus && (preview.kind === 'range'
            ? <span className="ux-ff-key"><i className="is-plus"/>naprej <i className="is-minus"/>nazaj</span>
            : <span className="ux-ff-key">{preview.plus && <><i className="is-plus"/>se pojavi </>}<i className="is-minus"/>izgine</span>)}
    </div>, board.containerObj);
}
