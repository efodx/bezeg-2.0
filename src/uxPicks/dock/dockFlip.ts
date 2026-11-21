import {useLayoutEffect, useRef, type RefObject} from 'react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
const GLIDE = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * FLIP: after each render, a docked element whose layout position changed glides from where it was last seen to its new
 * place (transform only). A new move interrupts a running glide from where the element visibly is. A floating card is
 * left alone (it follows the pointer), and its last place is where it glides from when it docks.
 */
export function useFlip(ref: RefObject<HTMLElement | null>, floating: boolean) {
    const last = useRef<{x: number; y: number} | null>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) { last.current = null; return; }
        const x = el.offsetLeft, y = el.offsetTop;
        const prev = last.current;
        last.current = {x, y};
        if (floating || reducedMotion()) { el.style.transition = ''; el.style.transform = ''; return; }
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

