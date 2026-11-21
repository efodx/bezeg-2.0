import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {getParam, listParams, splitLabel, type CountParam, type ParamEntry, type RangeParam} from '../a1/paramRegistry';
import {findMainBoard, type UxBoard, type UxElement} from '../b1/board';
import './GhostHand.css';

/**
 * Pick c11 "Duh pokaže" (from ux-challenge/c c11, with the purpose of b15 "Pokaži mi").
 * A ghost hand reaches into the graph when the student has been idle: it takes a draggable point and moves it in a
 * small loop (synthetic pointer events, so the app state follows), then sweeps a slider or steps a counter and puts
 * everything back. The button replays it. In a guided lesson the button says "Pokaži mi" and the hand first acts out
 * what the frame asks: the parameters named in the frame's text (symbols rendered from math, read from the prose).
 * While the lesson card locks the graph the hand only points at the controls and never changes a value.
 */
const HAND = `<svg viewBox="0 0 32 40" width="34" height="42" aria-hidden="true"><path d="M11 3.5c1.7 0 3 1.3 3 3v11.2l.8-.4c1.4-.7 3.1-.2 3.8 1.2l.2.4.7-.3c1.4-.6 3 0 3.7 1.4l.2.4.4-.1c1.6-.4 3.2.6 3.6 2.2.1.3.1.6.1.9v6.2c0 5.6-4.5 10-10 10h-1.2c-3.3 0-6.3-1.6-8.2-4.3l-5.3-7.6c-.9-1.3-.6-3.1.7-4 1.2-.8 2.8-.6 3.8.4L8 26V6.5c0-1.7 1.3-3 3-3z" fill="#fffdf5" stroke="#19372f" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
const IDLE_MS = 8000;
const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
const frameWait = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
const ease = (k: number) => k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

type Xy = [number, number];
type Pt = UxElement & {coords: {scrCoords: number[]}};

/** The last guided-lesson prose seen, for when the card is hidden and the graph is unlocked. */
let cachedProse: Element | null = null;

/** The parameters a frame's text names, in reading order: rendered symbols whose text equals a control's symbol. */
function namedParams(prose: Element | null, params: ParamEntry[]): ParamEntry[] {
    if (!prose) return [];
    const bySymbol = new Map<string, ParamEntry>();
    for (const entry of params) {
        const symbol = splitLabel(entry.label).symbol;
        if (symbol && !bySymbol.has(symbol)) bySymbol.set(symbol, entry);
    }
    const found: ParamEntry[] = [];
    prose.querySelectorAll('mjx-container').forEach(container => {
        const entry = bySymbol.get((container.textContent ?? '').trim());
        if (entry && !found.includes(entry)) found.push(entry);
    });
    return found.slice(0, 3);
}

function controlElement(entry: ParamEntry): HTMLElement | null {
    const element = entry.kind === 'range' ? document.getElementById(entry.key) : document.querySelector<HTMLElement>(`[data-param="${CSS.escape(entry.key)}"]`);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 ? element : null;
}

function draggablePoints(board: UxBoard): Pt[] {
    const svg = board.renderer.svgRoot;
    if (!svg) return [];
    const width = svg.clientWidth, height = svg.clientHeight;
    return board.objectsList.filter((element): element is Pt => {
        if (element.elType !== 'point' && element.elType !== 'glider') return false;
        const loose = element as unknown as {visPropCalc?: {visible?: boolean}; isDraggable?: boolean; evalVisProp?: (name: string) => unknown; coords?: {scrCoords: number[]}};
        if (!loose.visPropCalc?.visible || !loose.isDraggable) return false;
        if (loose.evalVisProp?.('fixed') === true || !element.rendNode) return false;
        const c = loose.coords?.scrCoords;
        return !!c && c[1] > 20 && c[2] > 20 && c[1] < width - 20 && c[2] < height - 20;
    });
}

export function GhostHand(props: {frame: React.RefObject<HTMLElement>}) {
    const handRef = useRef<HTMLDivElement>(null);
    const [caption, setCaption] = useState('');
    const [busy, setBusy] = useState(false);
    const [inLesson, setInLesson] = useState(false);
    // The lesson layer covers the graph while the card is read, so the button lives in it to stay clickable.
    const [layer, setLayer] = useState<Element | null>(null);
    const run = useRef<{aborted: boolean} | undefined>();
    const playRef = useRef<(instruction: boolean) => Promise<void>>(async () => undefined);

    const section = () => props.frame.current?.closest<HTMLElement>('.workspace-graph') ?? null;
    const locked = () => section()?.getAttribute('data-lesson-locked') === 'true';
    const lessonOpen = () => Boolean(props.frame.current?.closest('.demonstration-workspace.lesson-open'));

    playRef.current = async (instruction: boolean) => {
        const hand = handRef.current;
        const frame = props.frame.current;
        const board = findMainBoard(frame ?? document);
        if (!hand || !frame || !board || run.current) return;
        const current = {aborted: false};
        run.current = current;
        setBusy(true);
        const pointOnly = locked();
        const place = ([x, y]: Xy, pressed: boolean) => {
            hand.hidden = false;
            hand.style.transform = `translate(${x}px, ${y}px)`;
            hand.classList.toggle('is-pressed', pressed);
        };
        const glide = async (from: Xy, to: Xy, ms: number, pressed = false) => {
            const started = performance.now();
            for (;;) {
                if (current.aborted) return;
                const k = Math.min(1, (performance.now() - started) / ms), e = ease(k);
                place([from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e], pressed);
                if (k >= 1) return;
                await frameWait();
            }
        };
        const touch = async (at: Xy) => { place(at, true); await sleep(900); place(at, false); };
        const restores: (() => void)[] = [];

        const scoutPoint = async (point: Pt) => {
            const box = board.containerObj.getBoundingClientRect();
            const c = point.coords.scrCoords;
            const start: Xy = [c[1], c[2]];
            const w = board.canvasWidth, h = board.canvasHeight;
            const dx = start[0] < w / 2 ? 1 : -1, dy = start[1] < h / 2 ? 1 : -1;
            const reach = Math.min(70, w / 6, h / 5);
            const page = (p: Xy): Xy => [box.left + p[0], box.top + p[1]];
            const entry: Xy = [start[0] + dx * 90, start[1] + dy * 70];
            setCaption('Točke lahko premikaš. Primi jo in povleci.');
            await glide(page(entry), page(start), 650);
            if (current.aborted) return;
            const fire = (type: string, target: EventTarget, p: Xy, pressed: boolean) => {
                const [x, y] = page(p);
                target.dispatchEvent(new PointerEvent(type, {
                    bubbles: true, cancelable: true, composed: true, pointerId: 77, pointerType: 'mouse', isPrimary: true,
                    clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons: pressed ? 1 : 0,
                }));
            };
            fire('pointerdown', point.rendNode!, start, true);
            place(page(start), true);
            await sleep(220);
            const began = performance.now();
            while (!current.aborted) {
                const k = Math.min(1, (performance.now() - began) / 1500), angle = k * Math.PI * 2;
                const p: Xy = [start[0] + dx * reach * Math.sin(angle) * 0.9, start[1] + dy * reach * 0.5 * (1 - Math.cos(angle))];
                place(page(p), true);
                fire('pointermove', board.containerObj, p, true);
                if (k >= 1) break;
                await frameWait();
            }
            fire('pointermove', board.containerObj, start, true);
            fire('pointerup', document, start, false);
            place(page(start), false);
            await sleep(250);
            await glide(page(start), page(entry), 500);
        };

        const scoutParam = async (entry: ParamEntry) => {
            const control = controlElement(entry);
            const name = entry.label;
            const box = frame.getBoundingClientRect();
            const fallback: Xy = [box.left + box.width / 2, Math.max(box.top + 80, Math.min(box.bottom - 40, window.innerHeight - 90))];
            if (control) {
                const r = control.getBoundingClientRect();
                if (r.bottom > window.innerHeight || r.top < 0) control.scrollIntoView({block: 'nearest'});
            }
            const rect = control?.getBoundingClientRect();
            if (entry.kind === 'range') {
                const range = entry as RangeParam;
                const original = range.value;
                const span = range.max - range.min || 1;
                const sign = original - range.min < span / 2 ? 1 : -1;
                const target = Math.min(range.max, Math.max(range.min, original + sign * span * 0.25));
                const snap = (value: number) => range.step >= 1 ? Math.round(value) : Math.round(value / range.step) * range.step;
                const at = (value: number): Xy => rect
                    ? [rect.left + 8 + (rect.width - 16) * (value - range.min) / span, rect.top + rect.height / 2]
                    : [fallback[0] + (value - original) / span * box.width, fallback[1]];
                setCaption(pointOnly ? `Drsnik »${name}« spremeni graf.` : `Drsnik »${name}« spremeni graf. Povleci ga.`);
                const from = at(original);
                await glide([from[0] + 60, from[1] + 70], from, 550);
                await sleep(150);
                if (pointOnly) { await touch(from); return; }
                restores.push(() => range.setRaw(original));
                const began = performance.now();
                while (!current.aborted) {
                    const k = Math.min(1, (performance.now() - began) / 1900);
                    const value = snap(original + (target - original) * Math.sin(k * Math.PI));
                    range.set(value);
                    place(at(value), true);
                    if (k >= 1) break;
                    await frameWait();
                }
                range.setRaw(original);
                restores.pop();
                place(from, false);
                await sleep(250);
            } else {
                const count = entry as CountParam;
                const buttons = control?.querySelectorAll<HTMLElement>('button');
                const target = buttons && buttons.length > 1 ? buttons[buttons.length - 1] : control;
                const r = target?.getBoundingClientRect();
                const plusAt: Xy = r ? [r.left + r.width / 2, r.top + r.height / 2] : fallback;
                setCaption(pointOnly ? `Števec »${name}« spremeni graf.` : `Števec »${name}« spremeni graf. Pritisni + ali −.`);
                await glide([plusAt[0] + 60, plusAt[1] + 70], plusAt, 550);
                await sleep(150);
                if (pointOnly) { await touch(plusAt); return; }
                // One step up if there is room, otherwise down; the opposite press undoes it.
                const redo = (up: boolean) => { const live = getParam(entry.key); if (live?.kind === 'count') { up ? live.plus() : live.minus(); } };
                if (count.plus()) restores.push(() => redo(false));
                else if (count.minus()) restores.push(() => redo(true));
                place(plusAt, true);
                await sleep(800);
                place(plusAt, false);
                while (restores.length) restores.pop()!();
                await sleep(500);
            }
        };

        try {
            const all = listParams();
            const prose = instruction ? document.querySelector('.guided-lesson-reading') ?? cachedProse : null;
            const asked = namedParams(prose, all);
            if (asked.length) {
                for (const entry of asked) { if (!current.aborted) await scoutParam(getParam(entry.key) ?? entry); }
            } else {
                const points = pointOnly ? [] : draggablePoints(board);
                const centre: Xy = [board.canvasWidth / 2, board.canvasHeight / 2];
                const away = (p: Pt) => Math.hypot(p.coords.scrCoords[1] - centre[0], p.coords.scrCoords[2] - centre[1]);
                points.sort((a, b) => away(a) - away(b));
                if (points.length) await scoutPoint(points[0]);
                const usable = all.filter(entry => !entry.inert && !entry.display && controlElement(entry) && (entry.kind === 'count' || entry.max > entry.min));
                const next = usable.find(entry => entry.kind === 'range') ?? usable[0];
                if (next && !current.aborted) await scoutParam(next);
                if (!points.length && !next) { setCaption('Tu ni ničesar za premikanje: opazuj in beri.'); await sleep(1600); }
            }
            if (pointOnly && !current.aborted) { setCaption('Kartica zaklepa graf. Skrij jo (»Skrij«) in poskusi sam.'); await sleep(1800); }
        } finally {
            while (restores.length) { try { restores.pop()!(); } catch { /* the control went away */ } }
            hand.hidden = true;
            setCaption('');
            setBusy(false);
            run.current = undefined;
        }
    };

    useEffect(() => {
        let idle = 0;
        let doneFor = '';
        const key = () => `${location.pathname}${location.search}|${document.querySelector('.guided-lesson-reading')?.textContent?.slice(0, 60) ?? ''}`;
        const arm = () => {
            window.clearTimeout(idle);
            if (reducedMotion()) return;
            idle = window.setTimeout(() => {
                const here = key();
                if (run.current || doneFor === here || locked() || document.hidden || !findMainBoard(props.frame.current ?? document)) { arm(); return; }
                doneFor = here;
                void playRef.current(lessonOpen());
            }, IDLE_MS);
        };
        const onUser = (event: Event) => {
            if (!event.isTrusted) return;
            if (run.current) run.current.aborted = true;
            arm();
        };
        const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
        events.forEach(name => document.addEventListener(name, onUser, true));
        let debounce = 0;
        const watch = new MutationObserver(() => {
            window.clearTimeout(debounce);
            debounce = window.setTimeout(() => {
                const prose = document.querySelector('.guided-lesson-reading');
                if (prose && prose.textContent !== cachedProse?.textContent) cachedProse = prose.cloneNode(true) as Element;
                setInLesson(lessonOpen());
                setLayer(document.querySelector('.guided-lesson-layer'));
            }, 250);
        });
        watch.observe(document.body, {childList: true, subtree: true, characterData: true});
        setInLesson(lessonOpen());
        setLayer(document.querySelector('.guided-lesson-layer'));
        arm();
        return () => {
            events.forEach(name => document.removeEventListener(name, onUser, true));
            window.clearTimeout(idle);
            watch.disconnect();
            window.clearTimeout(debounce);
            if (run.current) run.current.aborted = true;
        };
    }, [props.frame]);

    const stop = (event: React.SyntheticEvent) => event.stopPropagation();
    const button = <button type="button" className={`ux-hand-button${layer && inLesson ? ' in-layer' : ''}`} hidden={busy} title={inLesson ? 'Pokaži, kaj sprašuje ta okvir' : 'Pokaži, kaj se da premikati'}
            onPointerDown={stop} onMouseDown={stop} onTouchStart={stop} onClick={() => { void playRef.current(inLesson); }}>
        <span aria-hidden="true">✋</span> {inLesson ? 'Pokaži mi' : 'Pokaži'}
    </button>;
    return <>
        {layer && inLesson ? createPortal(button, layer) : button}
        {createPortal(
            <div ref={handRef} className="ux-hand" hidden aria-hidden="true">
            <span className="ux-hand-ripple"/>
            <span dangerouslySetInnerHTML={{__html: HAND}}/>
        </div>,
            document.body)}
        {caption && <div className="ux-hand-caption" role="status">{caption}</div>}
    </>;
}
