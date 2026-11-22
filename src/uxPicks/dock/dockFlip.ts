import {useLayoutEffect, useRef, type RefObject} from 'react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
const HEIGHT_GLIDE = 'height 340ms ease-out';
const GLIDE = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * FLIP: after each render, a docked element whose layout position changed glides from where it was last seen to its new
 * place (transform only). A new move interrupts a running glide from where the element visibly is. A floating card is
 * left alone (it follows the pointer), and its last place is where it glides from when it docks.
 */
export function useFlip(ref: RefObject<HTMLElement | null>, floating: boolean, glideHeight = false) {
    const last = useRef<{x: number; y: number; h: number} | null>(null);
    const growing = useRef<{target: number; timer: number} | null>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) { last.current = null; return; }
        // A height glide in flight: note where the card visibly is, then measure its natural height.
        const visible = growing.current ? el.getBoundingClientRect().height : null;
        if (growing.current) { window.clearTimeout(growing.current.timer); growing.current = null; el.style.transition = ''; el.style.height = ''; el.style.boxSizing = ''; }
        const x = el.offsetLeft, y = el.offsetTop, h = el.offsetHeight;
        const prev = last.current;
        last.current = {x, y, h};
        if (floating || reducedMotion()) { el.style.transition = ''; el.style.transform = ''; return; }
        // A card that grows or shrinks (a row added to its list) glides its height instead of jumping; its place follows the height.
        const from = visible ?? prev?.h;
        if (glideHeight && from !== undefined && Math.abs(from - h) >= 1 && prev && Math.abs(prev.x - x) < 0.5) {
            el.style.transform = '';
            el.style.transition = 'none';
            el.style.boxSizing = 'border-box';
            el.style.height = `${from}px`;
            void el.offsetWidth;
            el.style.transition = HEIGHT_GLIDE;
            el.style.height = `${h}px`;
            const done = () => { if (growing.current) growing.current = null; el.style.transition = ''; el.style.height = ''; el.style.boxSizing = ''; };
            growing.current = {target: h, timer: window.setTimeout(done, 380)};
            return;
        }
        if (!prev || (Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5)) return;
        let tx = 0, ty = 0;
        const running = getComputedStyle(el).transform;
        if (running && running !== 'none') { const m = new DOMMatrixReadOnly(running); tx = m.m41; ty = m.m42; }
        el.style.transition = 'none';
        el.style.transform = `translate(${prev.x + tx - x}px, ${prev.y + ty - y}px)`;
        void el.offsetWidth;
        el.style.transition = GLIDE;
        el.style.transform = '';
    });
}

