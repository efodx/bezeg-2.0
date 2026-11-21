/**
 * Prototype c11 "Duh pokaže" (the ghost hand of game tutorials and touch-screen kiosks). When a lesson frame asks
 * the student to explore and nothing happens for a moment, a translucent hand reaches into the graph, takes a
 * draggable point, moves it in a small loop and puts it back; the construction follows because the hand drives the
 * board with ordinary pointer events. Without a draggable point it shows a slider instead. A ✋ button replays it.
 */
import type {Board} from "jsxgraph";
import {lessonPosition, onLessonPosition, type LessonPosition} from "./lessonNav";
import {shownSliders, type RegisteredSlider} from "./sliderRegistry";
import "./ux.css";

const HAND = `<svg viewBox="0 0 32 40" width="34" height="42" aria-hidden="true"><path d="M11 3.5c1.7 0 3 1.3 3 3v11.2l.8-.4c1.4-.7 3.1-.2 3.8 1.2l.2.4.7-.3c1.4-.6 3 0 3.7 1.4l.2.4.4-.1c1.6-.4 3.2.6 3.6 2.2.1.3.1.6.1.9v6.2c0 5.6-4.5 10-10 10h-1.2c-3.3 0-6.3-1.6-8.2-4.3l-5.3-7.6c-.9-1.3-.6-3.1.7-4 1.2-.8 2.8-.6 3.8.4L8 26V6.5c0-1.7 1.3-3 3-3z" fill="#fffdf5" stroke="#19372f" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

export function attachGhostHand(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const hand = document.createElement('div');
    hand.className = 'ux-hand';
    hand.innerHTML = `<span class="ux-hand-ripple"></span>${HAND}`;
    hand.hidden = true;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-hand-button';
    button.innerHTML = '<span aria-hidden="true">✋</span> Pokaži';
    button.title = 'Pokaži, kaj se da premikati';
    // A second hand lives on the page for sliders outside the board.
    const pageHand = hand.cloneNode(true) as HTMLElement;
    pageHand.classList.add('ux-hand-page');
    document.body.appendChild(pageHand);
    const caption = document.createElement('div');
    caption.className = 'ux-hand-caption';
    caption.hidden = true;
    container.append(hand, caption, button);
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) button.addEventListener(type, event => event.stopPropagation());

    let playing = false;
    let aborted = false;
    let idleTimer = 0;
    let shownFor = '';
    let position: LessonPosition | undefined;

    const draggablePoints = () => ((board as any).objectsList as any[]).filter(element => {
        if (element.elType !== 'point' && element.elType !== 'glider') return false;
        if (!element.visPropCalc?.visible || !element.isDraggable) return false;
        const fixed = typeof element.evalVisProp === 'function' ? element.evalVisProp('fixed') : element.visProp?.fixed;
        if (fixed === true) return false;
        const coords = element.coords?.scrCoords as number[] | undefined;
        return !!coords && coords[1] > 20 && coords[2] > 20 && coords[1] < svg.clientWidth - 20 && coords[2] < svg.clientHeight - 20;
    });

    const place = (x: number, y: number, pressed: boolean) => {
        hand.style.transform = `translate(${x}px, ${y}px)`;
        hand.classList.toggle('ux-hand-pressed', pressed);
    };

    const fire = (type: string, target: EventTarget, x: number, y: number, pressed: boolean) => {
        const box = container.getBoundingClientRect();
        target.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, composed: true, pointerId: 77, pointerType: 'mouse', isPrimary: true,
            clientX: box.left + x, clientY: box.top + y, screenX: box.left + x, screenY: box.top + y,
            button: 0, buttons: pressed ? 1 : 0,
        }));
    };

    const glide = async (from: [number, number], to: [number, number], ms: number, pressed: boolean, step?: (x: number, y: number) => void) => {
        const started = performance.now();
        for (;;) {
            if (aborted) return;
            const k = Math.min(1, (performance.now() - started) / ms);
            const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
            const x = from[0] + (to[0] - from[0]) * e, y = from[1] + (to[1] - from[1]) * e;
            place(x, y, pressed);
            step?.(x, y);
            if (k >= 1) return;
            await new Promise(requestAnimationFrame);
        }
    };

    const say = (text: string) => { caption.textContent = text; caption.hidden = false; };

    const showPoint = async (point: any) => {
        const start: [number, number] = [point.coords.scrCoords[1], point.coords.scrCoords[2]];
        const width = svg.clientWidth, height = svg.clientHeight;
        // Loop towards the middle of the board, so the hand and the moved point stay in view.
        const dx = start[0] < width / 2 ? 1 : -1, dy = start[1] < height / 2 ? 1 : -1;
        const reach = Math.min(70, width / 6, height / 5);
        const entry: [number, number] = [start[0] + dx * 90, start[1] + dy * 70];
        say('Točke lahko premikaš. Primi jo in povleci.');
        hand.hidden = false;
        await glide(entry, start, 650, false);
        if (aborted) return;
        const node = point.rendNode as Element;
        fire('pointerdown', node, start[0], start[1], true);
        place(...start, true);
        await sleep(220);
        const loop = 1500;
        const started = performance.now();
        while (!aborted) {
            const k = Math.min(1, (performance.now() - started) / loop);
            const angle = k * Math.PI * 2;
            const x = start[0] + dx * reach * Math.sin(angle) * 0.9, y = start[1] + dy * reach * 0.5 * (1 - Math.cos(angle));
            place(x, y, true);
            fire('pointermove', container, x, y, true);
            if (k >= 1) break;
            await new Promise(requestAnimationFrame);
        }
        fire('pointermove', container, start[0], start[1], true);
        fire('pointerup', document, start[0], start[1], false);
        place(...start, false);
        await sleep(250);
        await glide(start, entry, 500, false);
        hand.hidden = true;
    };

    const showSlider = async (slider: RegisteredSlider) => {
        const range = slider.element()?.querySelector('input[type=range]') as HTMLInputElement | null;
        if (!range) return;
        const original = slider.value();
        say(`Drsnik »${slider.label}« spremeni graf. Povleci ga.`);
        range.closest('form')?.classList.add('ux-hand-target');
        const span = slider.max - slider.min;
        const step = slider.step || span / 100;
        const target = original + (original - slider.min < span / 2 ? 1 : -1) * span * 0.25;
        const set = (value: number) => slider.set(Math.min(slider.max, Math.max(slider.min, Math.round(value / step) * step)));
        // The page hand sits on the thumb: 8 px is half the thumb, so the fraction maps onto the inner track.
        const thumbAt = (value: number): [number, number] => {
            const box = range.getBoundingClientRect();
            const fraction = (value - slider.min) / span;
            return [box.left + window.scrollX + 8 + fraction * (box.width - 16), box.top + window.scrollY + box.height / 2];
        };
        const placePage = ([x, y]: [number, number], pressed: boolean) => {
            pageHand.style.transform = `translate(${x}px, ${y}px)`;
            pageHand.classList.toggle('ux-hand-pressed', pressed);
        };
        const startAt = thumbAt(original);
        pageHand.hidden = false;
        const entry: [number, number] = [startAt[0] + 60, startAt[1] + 70];
        const fly = performance.now();
        while (!aborted) {
            const k = Math.min(1, (performance.now() - fly) / 550);
            const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
            placePage([entry[0] + (startAt[0] - entry[0]) * e, entry[1] + (startAt[1] - entry[1]) * e], false);
            if (k >= 1) break;
            await new Promise(requestAnimationFrame);
        }
        await sleep(150);
        const started = performance.now();
        while (!aborted) {
            const k = Math.min(1, (performance.now() - started) / 1900);
            const value = original + (target - original) * Math.sin(k * Math.PI);
            set(value);
            placePage(thumbAt(value), true);
            if (k >= 1) break;
            await new Promise(requestAnimationFrame);
        }
        slider.set(original);
        placePage(startAt, false);
        await sleep(250);
        pageHand.hidden = true;
        range.closest('form')?.classList.remove('ux-hand-target');
    };

    const play = async () => {
        if (playing) return;
        playing = true;
        aborted = false;
        container.classList.add('ux-hand-playing');
        try {
            const points = draggablePoints();
            const centre = [svg.clientWidth / 2, svg.clientHeight / 2];
            points.sort((a, b) => Math.hypot(a.coords.scrCoords[1] - centre[0], a.coords.scrCoords[2] - centre[1])
                - Math.hypot(b.coords.scrCoords[1] - centre[0], b.coords.scrCoords[2] - centre[1]));
            const slider = shownSliders().find(entry => {
                const box = entry.element()?.querySelector('input[type=range]')?.getBoundingClientRect();
                return box && box.width > 0 && box.top > 0 && box.bottom < window.innerHeight;
            });
            if (points.length) await showPoint(points[0]);
            if (slider && !aborted) await showSlider(slider);
            if (!points.length && !slider) { say('Tu ni ničesar za premikanje: opazuj in beri.'); await sleep(1600); }
        } finally {
            hand.hidden = true;
            pageHand.hidden = true;
            caption.hidden = true;
            container.classList.remove('ux-hand-playing');
            playing = false;
        }
    };

    // A real press stops the demonstration at once and gives the board back.
    const onUserDown = (event: PointerEvent) => {
        if (!event.isTrusted) return;
        window.clearTimeout(idleTimer);
        if (playing) aborted = true;
    };
    container.addEventListener('pointerdown', onUserDown, true);
    button.addEventListener('click', () => { void play(); });

    const onPosition = (next: LessonPosition | undefined) => {
        position = next;
        window.clearTimeout(idleTimer);
        if (!next || !next.observing || next.complete) return;
        const key = `${next.lessonId}:${next.stepIndex}:${next.frameIndex}`;
        if (shownFor === key) return;
        idleTimer = window.setTimeout(() => {
            if (!position || `${position.lessonId}:${position.stepIndex}:${position.frameIndex}` !== key) return;
            shownFor = key;
            void play();
        }, 2600);
    };
    const unsubscribe = onLessonPosition(onPosition);
    onPosition(lessonPosition());

    return () => {
        unsubscribe();
        aborted = true;
        window.clearTimeout(idleTimer);
        container.removeEventListener('pointerdown', onUserDown, true);
        container.classList.remove('ux-hand-playing');
        hand.remove();
        pageHand.remove();
        caption.remove();
        button.remove();
    };
}
