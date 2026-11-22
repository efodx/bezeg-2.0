import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ShortcutsButton} from './Shortcuts';

/**
 * One-time hint (round 4, polish 6): the first time cards appear, a one-line note in the top-centre gap of the board (never over a
 * card) says how cards move. It goes after twelve seconds, and on its button, on the first drag, fold or double-click on a card head, or on the first lesson frame change,
 * and is remembered in localStorage (`ux-hint-cards`). Not shown on a phone (cards are chips there). The note is a plain
 * status line reachable by keyboard (its close button is a normal button); under reduced motion it only fades.
 */
const KEY = 'ux-hint-cards';
const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const remember = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } };

export function GesturesHint(props: {frame: HTMLElement; phone: boolean}) {
    const [done, setDone] = useState(seen);
    const [at, setAt] = useState<{left: number; top: number} | null>(null);
    const close = () => { remember(); setDone(true); };
    // Top-centre of the board, in the first gap no card covers (the hint never sits over a card). Re-checked while it shows.
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (done || props.phone) return undefined;
        const place = () => {
            const f = props.frame.getBoundingClientRect();
            const cards = Array.from(props.frame.querySelectorAll<HTMLElement>('.ux-btext')).map(c => c.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
            const W = box.current?.offsetWidth ?? 340, H = box.current?.offsetHeight ?? 34, top = 8;
            const free = (x: number) => !cards.some(r => r.right + 6 > f.left + x && r.left - 6 < f.left + x + W && r.bottom + 4 > f.top + top && r.top - 4 < f.top + top + H);
            const mid = Math.round((f.width - W) / 2);
            let best: number | null = null;
            for (let d = 0; d <= f.width; d += 8) {
                for (const x of d === 0 ? [mid] : [mid - d, mid + d]) if (x >= 6 && x + W <= f.width - 6 && free(x) && best === null) best = x;
                if (best !== null) break;
            }
            const next = best === null ? null : {left: best, top};
            setAt(prev => (prev === next || (prev && next && prev.left === next.left && prev.top === next.top)) ? prev : next);
        };
        place();
        const timer = window.setInterval(place, 400);
        return () => window.clearInterval(timer);
    }, [done, props.phone, props.frame]);
    // Twelve seconds on screen at most.
    useEffect(() => {
        if (done || props.phone || !at) return undefined;
        const timer = window.setTimeout(close, 12000);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [done, props.phone, !!at]);
    // First use of a card, or the first lesson frame change: the hint has done its job.
    useEffect(() => {
        if (done || props.phone || !at) return undefined;
        let moved = false;
        const onDown = (e: PointerEvent) => { moved = !!(e.target as Element | null)?.closest?.('.ux-btext-head'); };
        const onMove = () => { if (moved) close(); };
        const onClick = (e: MouseEvent) => { if ((e.target as Element | null)?.closest?.('.ux-btext-toggle, .guided-lesson-nav-next, .guided-lesson-nav-back, .guided-lesson-primary')) close(); };
        const onDouble = (e: MouseEvent) => { if ((e.target as Element | null)?.closest?.('.ux-btext-head')) close(); };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('pointermove', onMove, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('dblclick', onDouble, true);
        return () => {
            document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('pointermove', onMove, true);
            document.removeEventListener('click', onClick, true); document.removeEventListener('dblclick', onDouble, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [done, props.phone, !!at]);
    if (done || props.phone || !at) return null;
    return createPortal(<div ref={box} className="ux-gesture-hint" role="status" style={{left: at.left, top: at.top}}>
        <span>Povleci za premik · − zloži · dvoklik vrne</span>
        <ShortcutsButton/>
        <button type="button" onClick={close} aria-label="Zapri namig" title="Zapri namig">×</button>
    </div>, props.frame);
}
