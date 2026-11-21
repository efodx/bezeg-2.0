/**
 * Prototype c15 "Vleci število" (Bret Victor's Tangle and his "Explorable Explanations": numbers in the text are
 * handles). A value the lesson text states, such as \(t=1/2\) or \(\omega=2\), can be dragged left and right right in
 * the sentence: the graph follows, a badge shows the live value next to the lesson's, and the change runs inside
 * the c14 fork, so the lesson ghost stays on the board and moving on restores the lesson.
 */
import type {Board} from "jsxgraph";
import {sliderSymbol, texAssignment} from "./liveProse";
import {mountedSliders, type RegisteredSlider} from "./sliderRegistry";
import {activeFork} from "./whatIf";
import "./ux.css";

interface MathItem { math: string; typesetRoot: HTMLElement | null }

function proseItems(): MathItem[] {
    const root = document.querySelector('.guided-lesson-frame');
    if (!root) return [];
    try {
        return ((window as any).MathJax?.startup?.document?.getMathItemsWithin?.(root) ?? []) as MathItem[];
    } catch {
        return [];
    }
}

function format(value: number, decimals: number): string {
    const digits = Math.min(Math.max(decimals, 0), 3);
    const text = value.toFixed(digits);
    return (digits > 0 ? text.replace(/\.?0+$/, '') : text).replace('.', ',').replace('-', '−');
}

/** Pixels of horizontal drag for the slider's whole range. */
const FULL_RANGE_PX = 260;

export function attachScrubProse(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    // When the board is scrolled away (phones), a live copy of it floats while the student drags a value.
    const peek = document.createElement('div');
    peek.className = 'ux-lp-peek ux-scrub-peek';
    peek.hidden = true;
    document.body.appendChild(peek);
    let peekFrame = 0;
    const drawPeek = (node: HTMLElement) => {
        peekFrame = 0;
        if (!container || !svg) return;
        const box = container.getBoundingClientRect();
        const viewHeight = window.innerHeight;
        const visible = Math.max(0, Math.min(box.bottom, viewHeight) - Math.max(box.top, 0));
        const width = svg.clientWidth, height = svg.clientHeight;
        if (visible > Math.min(box.height, viewHeight) * 0.6 || !width || !height) { peek.hidden = true; return; }
        const scale = Math.min(Math.min(window.innerWidth * 0.92, 440) / width, (viewHeight * 0.38) / height);
        const inner = document.createElement('div');
        inner.className = 'ux-lp-peek-inner';
        inner.style.width = `${width}px`;
        inner.style.height = `${height}px`;
        inner.style.transform = `scale(${scale})`;
        for (const child of Array.from(container.children)) {
            if (child === svg || child.classList.contains('JXGtext') || child.classList.contains('ux-whatif-ghost')) {
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
    const schedulePeek = (node: HTMLElement) => {
        if (!peekFrame) peekFrame = requestAnimationFrame(() => requestAnimationFrame(() => drawPeek(node)));
    };
    const decorated = new Map<HTMLElement, {slider: RegisteredSlider; symbol: string; stated: number}>();
    const badge = document.createElement('div');
    badge.className = 'ux-scrub-badge';
    badge.setAttribute('role', 'status');
    badge.hidden = true;
    document.body.appendChild(badge);
    let hideTimer = 0;

    const sliderFor = (symbol: string, value: number) => mountedSliders().find(slider => sliderSymbol(slider) === symbol
        && value >= slider.min - 1e-9 && value <= slider.max + 1e-9);

    /** The value last written per slider: the registry reads React props, which lag a render behind. */
    const written = new Map<RegisteredSlider, number>();
    const current = (slider: RegisteredSlider) => written.get(slider) ?? slider.value();
    const showBadge = (node: HTMLElement, info: {slider: RegisteredSlider; symbol: string; stated: number}) => {
        window.clearTimeout(hideTimer);
        const {slider, symbol, stated} = info;
        const value = current(slider);
        const span = slider.max - slider.min;
        const at = (v: number) => Math.max(0, Math.min(1, (v - slider.min) / span));
        badge.innerHTML = `<span class="ux-scrub-now"><i>${symbol}</i> = ${format(value, slider.decimals)}</span>`
            + `<span class="ux-scrub-track"><span class="ux-scrub-stated" style="--at:${at(stated)}"></span><span class="ux-scrub-thumb" style="--at:${at(value)}"></span></span>`
            + `<span class="ux-scrub-was">besedilo: ${format(stated, slider.decimals)}</span>`;
        badge.hidden = false;
        const box = node.getBoundingClientRect();
        const width = badge.offsetWidth;
        const left = Math.max(8, Math.min(window.innerWidth - width - 8, box.left + box.width / 2 - width / 2));
        const top = box.top - badge.offsetHeight - 8;
        badge.style.left = `${left + window.scrollX}px`;
        badge.style.top = `${(top < 8 ? box.bottom + 8 : top) + window.scrollY}px`;
    };
    const hideBadgeSoon = () => {
        window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => { badge.hidden = true; }, 1400);
    };
    const markChanged = () => {
        for (const [node, {slider, stated}] of decorated) {
            node.classList.toggle('ux-scrub-changed', Math.abs(current(slider) - stated) > Math.max(1e-9, slider.step / 2));
        }
    };

    const setValue = (info: {slider: RegisteredSlider}, raw: number) => {
        const {slider} = info;
        const step = slider.step || (slider.max - slider.min) / 200;
        const value = Math.max(slider.min, Math.min(slider.max, slider.min + Math.round((raw - slider.min) / step) * step));
        activeFork()?.enter(slider, true);
        const rounded = Number(value.toFixed(10));
        written.set(slider, rounded);
        slider.set(rounded);
    };

    const decorate = (node: HTMLElement, info: {slider: RegisteredSlider; symbol: string; stated: number}) => {
        decorated.set(node, info);
        node.classList.add('ux-scrub');
        node.tabIndex = 0;
        node.setAttribute('role', 'slider');
        node.setAttribute('aria-label', `${info.slider.label}: povleci levo ali desno`);
        node.setAttribute('aria-valuemin', String(info.slider.min));
        node.setAttribute('aria-valuemax', String(info.slider.max));
        node.title = 'Povleci levo ali desno';
        let startX = 0, startValue = 0, dragging = false, pressed = false;
        node.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            pressed = true;
            dragging = false;
            startX = event.clientX;
            startValue = current(info.slider);
            node.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        });
        node.addEventListener('pointermove', event => {
            if (!pressed) return;
            const dx = event.clientX - startX;
            if (!dragging && Math.abs(dx) < 4) return;
            if (!dragging) { dragging = true; node.classList.add('ux-scrub-active'); document.documentElement.classList.add('ux-scrubbing'); }
            setValue(info, startValue + dx / FULL_RANGE_PX * (info.slider.max - info.slider.min));
            node.setAttribute('aria-valuenow', String(current(info.slider)));
            showBadge(node, info);
            markChanged();
            schedulePeek(node);
        });
        const end = () => {
            if (!pressed) return;
            pressed = false;
            node.classList.remove('ux-scrub-active');
            document.documentElement.classList.remove('ux-scrubbing');
            if (dragging) {
                hideBadgeSoon();
                window.setTimeout(() => { if (!pressed) peek.hidden = true; }, 1400);
                // A drag is not a click: c8 would otherwise glide the value back to the stated one.
                const swallow = (click: Event) => { click.stopPropagation(); click.preventDefault(); };
                node.addEventListener('click', swallow, {capture: true, once: true});
                window.setTimeout(() => node.removeEventListener('click', swallow, {capture: true}), 50);
            }
            dragging = false;
        };
        node.addEventListener('pointerup', end);
        node.addEventListener('pointercancel', end);
        node.addEventListener('pointerenter', () => { if (!pressed) showBadge(node, info); });
        node.addEventListener('pointerleave', () => { if (!pressed) hideBadgeSoon(); });
        node.addEventListener('keydown', event => {
            const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
            if (!direction) return;
            event.preventDefault();
            event.stopPropagation();
            const span = info.slider.max - info.slider.min;
            setValue(info, current(info.slider) + direction * Math.max(info.slider.step || 0, span / 40));
            showBadge(node, info);
            markChanged();
            hideBadgeSoon();
        });
    };

    const scan = () => {
        // Once the fork has closed (back to the lesson), the sliders read their own values again.
        if (!activeFork()?.isOpen()) written.clear();
        for (const node of [...decorated.keys()]) {
            if (!node.isConnected) decorated.delete(node);
        }
        for (const item of proseItems()) {
            const node = item.typesetRoot;
            if (!node || decorated.has(node)) continue;
            const assignment = texAssignment(item.math);
            if (!assignment) continue;
            const slider = sliderFor(assignment.symbol, assignment.value);
            if (slider) decorate(node, {slider, symbol: assignment.symbol, stated: assignment.value});
        }
        markChanged();
    };
    const interval = window.setInterval(scan, 700);
    scan();

    return () => {
        window.clearInterval(interval);
        window.clearTimeout(hideTimer);
        badge.remove();
        peek.remove();
        if (peekFrame) cancelAnimationFrame(peekFrame);
        document.documentElement.classList.remove('ux-scrubbing');
        for (const node of decorated.keys()) {
            node.classList.remove('ux-scrub', 'ux-scrub-changed', 'ux-scrub-active');
            node.removeAttribute('tabindex');
            node.removeAttribute('role');
        }
    };
}
