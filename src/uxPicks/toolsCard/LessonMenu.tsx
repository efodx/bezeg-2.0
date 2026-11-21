import React, {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {MoreIcon} from '../dock/icons';

/**
 * Pick toolsCard: the lesson card's lesson-level actions (chapter return, Končaj) behind one "⋯" button in its head
 * (owner, 2026-11-21), so the head stays one row. A disclosure, not an ARIA menu: the items are an ordinary link and button.
 * The list is fixed to the window under the button (a folded card, or the stack holding it, would clip it). It closes on
 * Escape (focus back on the button), on a press outside it, when focus leaves it, and on scroll or resize.
 * `children` gets the button, so an action that opens a dialog can return focus to it after the list is gone.
 */
export function LessonMenu(props: {label: string; children: (trigger: () => HTMLButtonElement | null, close: () => void) => React.ReactNode}) {
    const [at, setAt] = useState<{top: number; right: number} | null>(null);
    const open = at !== null;
    const button = useRef<HTMLButtonElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const id = useId();
    const inside = (node: Node | null) => !!node && (!!button.current?.contains(node) || !!list.current?.contains(node));
    useEffect(() => {
        if (!open) return;
        const down = (event: PointerEvent) => { if (!inside(event.target as Node)) setAt(null); };
        const away = () => setAt(null);
        document.addEventListener('pointerdown', down, true);
        window.addEventListener('scroll', away, true);
        window.addEventListener('resize', away);
        // The first item takes focus, so a keyboard user lands in the list.
        list.current?.querySelector<HTMLElement>('a, button')?.focus();
        return () => {
            document.removeEventListener('pointerdown', down, true);
            window.removeEventListener('scroll', away, true);
            window.removeEventListener('resize', away);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const toggle = () => {
        if (open) { setAt(null); return; }
        const r = button.current!.getBoundingClientRect();
        setAt({top: Math.round(r.bottom + 4), right: Math.round(window.innerWidth - r.right)});
    };
    const close = () => setAt(null);
    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape' && open) { event.stopPropagation(); setAt(null); button.current?.focus(); }
    };
    const onBlur = (event: React.FocusEvent) => { if (open && !inside(event.relatedTarget as Node | null)) setAt(null); };
    return <>
        <button ref={button} type="button" className="ux-btext-toggle ux-lesson-menu-button" aria-expanded={open} aria-controls={open ? id : undefined}
                aria-label={props.label} title={props.label} onClick={toggle} onKeyDown={onKeyDown} onBlur={onBlur}><MoreIcon/></button>
        {at && createPortal(<div ref={list} id={id} className="ux-lesson-menu-list" style={{top: at.top, right: at.right}} onKeyDown={onKeyDown} onBlur={onBlur}>
            {props.children(() => button.current, close)}
        </div>, document.body)}
    </>;
}
