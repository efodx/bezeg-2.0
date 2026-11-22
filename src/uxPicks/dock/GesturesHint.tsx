import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ShortcutsButton} from './Shortcuts';

/**
 * One-time hint (round 4, polish 6): the first time cards appear, a one-line note says how cards move (round 9: in the board's toolbar line under the graph, never over the plot). It goes after twelve seconds, and on its button, on the first drag, fold or double-click on a card head, or on the first lesson frame change,
 * and is remembered in localStorage (`ux-hint-cards`). Not shown on a phone (cards are chips there). The note is a plain
 * status line reachable by keyboard (its close button is a normal button); under reduced motion it only fades.
 */
const KEY = 'ux-hint-cards';
const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const remember = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } };

export function GesturesHint(props: {frame: HTMLElement; phone: boolean}) {
    const [done, setDone] = useState(seen);
    // Never over the plot (round 9): in the free right part of the board's toolbar line under the graph (the row with the arrow
    // buttons), else above the board's top edge. `host` is that row, or null for the fallback (drawn in the frame, above its top).
    const [host, setHost] = useState<HTMLElement | null | undefined>(undefined);
    const close = () => { remember(); setDone(true); };
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (done || props.phone) return undefined;
        const place = () => {
            const row = (props.frame.closest('.workspace-graph') ?? document).querySelector<HTMLElement>('.workspace-navigation');
            const next = row && row.offsetWidth > 0 ? row : null;
            setHost(prev => prev === next ? prev : next);
        };
        place();
        const timer = window.setInterval(place, 400);
        return () => window.clearInterval(timer);
    }, [done, props.phone, props.frame]);
    const at = host !== undefined;
    // Above the frame's top edge (no toolbar row): lift the note by its own height, measured once it is drawn.
    const [lift, setLift] = useState(40);
    useEffect(() => { if (host === null && box.current) setLift(box.current.offsetHeight + 6); }, [host, done]);
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
    const note = <div ref={box} className={host ? 'ux-gesture-hint ux-gesture-hint-row' : 'ux-gesture-hint'} role="status" style={host ? undefined : {left: 6, top: -lift}}>
        <span>Povleci za premik · − zloži · dvoklik vrne</span>
        <ShortcutsButton/>
        <button type="button" onClick={close} aria-label="Zapri namig" title="Zapri namig">×</button>
    </div>;
    return createPortal(note, host ?? props.frame);
}
