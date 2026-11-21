import React, {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {ShortcutsButton} from './Shortcuts';

/**
 * One-time hint (round 4): the first time cards appear, a small note under the first card's head says how cards move.
 * It closes on its button, on the first drag, fold or double-click on a card head, or on the first lesson frame change,
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
    // Find the first card's head and keep the note under it.
    useEffect(() => {
        if (done || props.phone) return undefined;
        const place = () => {
            const heads = Array.from(props.frame.ownerDocument.querySelectorAll<HTMLElement>('.ux-btext:not(.is-floating) > .ux-btext-head'))
                .filter(h => props.frame.contains(h) || h.closest('.ux-board-frame') === props.frame);
            const head = heads.find(h => h.closest('.ux-bcard-tools')) ?? heads[0];
            if (!head) { setAt(null); return; }
            const f = props.frame.getBoundingClientRect(), r = head.getBoundingClientRect();
            // Beside the head (right if there is room, else left), so it never covers the card's controls; else just under it.
            const card = head.parentElement!.getBoundingClientRect(), W = 280;
            const next = card.right - f.left + 8 + W <= f.width ? {left: Math.round(card.right - f.left + 8), top: Math.round(r.top - f.top + 2)}
                : card.left - f.left - 8 - W >= 0 ? {left: Math.round(card.left - f.left - 8 - W), top: Math.round(r.top - f.top + 2)}
                : {left: Math.round(r.left - f.left + 4), top: Math.round(r.bottom - f.top + 4)};
            setAt(prev => prev && prev.left === next.left && prev.top === next.top ? prev : next);
        };
        place();
        const timer = window.setInterval(place, 400);
        return () => window.clearInterval(timer);
    }, [done, props.phone, props.frame]);
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
    return createPortal(<div className="ux-gesture-hint" role="status" style={{left: at.left, top: at.top}}>
        <span>Povleci za premik · − zloži · dvoklik vrne</span>
        <ShortcutsButton/>
        <button type="button" onClick={close} aria-label="Zapri namig" title="Zapri namig">×</button>
    </div>, props.frame);
}
