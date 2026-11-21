import React, {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {usePick} from '../picks';
import {useReducedMotion} from '../../graphs/base/controls/reducedMotion';
import {HelpIcon} from './icons';
import {toggleFoldAll} from './foldAll';
import './shortcuts.css';

/**
 * "Bližnjice" (round 5): one small card listing the keys and gestures the board has. It opens from the "?" in the gestures
 * hint, the "?" at the end of the pucks' strip, the "?" key (outside text fields), or `openShortcuts()` (e.g. a "⋯" menu item).
 * Escape closes it and focus returns to what opened it. It is a non-modal dialog placed clear of the lesson card, so Back and
 * Next stay reachable. This module also owns the two board-wide keys: Z folds every card but the lesson card (again: back as
 * they were) and, in the pucks, N starts or stops every sweep (see ParamPucks).
 */
let shown = false;
let returnTo: HTMLElement | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const useShown = () => useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => shown, () => false);

export function openShortcuts(returnFocusTo?: HTMLElement) {
    returnTo = returnFocusTo ?? (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
    shown = true;
    emit();
}
export function closeShortcuts(restoreFocus = true) {
    if (!shown) return;
    shown = false;
    const target = returnTo;
    returnTo = null;
    emit();
    if (restoreFocus && target?.isConnected) target.focus();
}
export const toggleShortcuts = (returnFocusTo?: HTMLElement) => { if (shown) closeShortcuts(); else openShortcuts(returnFocusTo); };

/** Keys typed into something (a field, a puck's typed value, an editable) are not board shortcuts. */
export function typingTarget(target: EventTarget | null): boolean {
    return target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
}
/** Single-letter keys act only while focus is on the graph or in one of its cards (WCAG 2.1.4: active only on focus). */
const BOARD_FOCUS = '.workspace-graph, .ux-board-frame, .ux-btext, .ux-sc-card';
const onBoard = (target: EventTarget | null) => target instanceof Element && !!target.closest(BOARD_FOCUS);
/** A plain key press (no Ctrl, Alt or Meta; Shift allowed for "?"), not a repeat, not meant for a field, focus on the graph. */
export function isBoardKey(event: KeyboardEvent): boolean {
    return !event.defaultPrevented && !event.isComposing && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey
        && !typingTarget(event.target) && onBoard(event.target);
}

type Row = [keys: string[], text: string];
/** What the board offers right now (read from the page, so a row is listed only when its key does something). */
type BoardNow = {lesson: boolean; pucks: 'none' | 'folded' | 'locked' | 'ready'};
const readBoard = (): BoardNow => {
    const pucks = document.querySelector('.ux-pucks');
    return {
        lesson: !!document.querySelector('.demonstration-workspace.lesson-open'),
        pucks: !pucks ? 'none' : pucks.classList.contains('is-collapsed') ? 'folded' : pucks.classList.contains('is-locked') ? 'locked' : 'ready',
    };
};
const GROUPS = (now: BoardNow, sweep: boolean, track: boolean): {title: string; rows: Row[]}[] => [
    {title: 'Kartice', rows: [
        [['povleci glavo'], 'premakne; nad označenim mestom pripne'],
        [['dvoklik na glavo'], 'privzeto mesto'],
        [['−', '+'], 'zloži / razpne (klik na zloženo glavo)'],
        [['← ↑ → ↓'], 'na prijemalu: premik (Shift: večji); Enter pripne, Home privzeto mesto'],
        [['Z'], 'zloži vse razen lekcije; še enkrat: nazaj'],
    ]},
    ...(now.lesson ? [{title: 'Lekcija', rows: [
        [['Alt + ←', 'Alt + →'], 'nazaj / naprej'],
        [['PageUp', 'PageDown'], 'nazaj / naprej v kartici lekcije'],
    ] as Row[]}] : []),
    ...(now.pucks === 'ready' ? [{title: 'Parametri na grafu', rows: [
        [['povleci levo ali desno'], 'spremeni vrednost; dvigni prst za fino'],
        [['← ↑ → ↓'], 'na ploščici: korak (Shift ali PageUp/PageDown: 10); Home, End: meji'],
        [['številka', 'Enter', 'dvoklik'], 'vpiši vrednost; Enter potrdi, Esc prekliče'],
        ...(sweep ? [[['∿'], 'ploščica niha sama'] as Row, [['N'], 'vsi začnejo nihati; če kateri niha, se vsi ustavijo'] as Row] : []),
        ...(track ? [[['spodnji trak'], 'kazalec pokaže graf pri tej vrednosti, klik skoči nanjo'] as Row] : []),
    ] as Row[]}] : []),
    {title: 'Splošno', rows: [[['?'], 'ta seznam; Esc ga zapre']]},
];

/** A small "?" that opens the list. */
export function ShortcutsButton(props: {className?: string}) {
    return <button type="button" className={`ux-sc-button ${props.className ?? ''}`} aria-label="Bližnjice" title="Bližnjice (?)" aria-haspopup="dialog"
                   onPointerDown={e => e.stopPropagation()} onClick={e => toggleShortcuts(e.currentTarget)}><HelpIcon/></button>;
}

/** Mounted once, in the dock: the keys, and the card while it is open. */
export function ShortcutsHost() {
    const open = useShown();
    const sweep = usePick('a3') && !useReducedMotion();
    const track = usePick('a29');
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && shown) { event.preventDefault(); closeShortcuts(); return; }
            if (!isBoardKey(event)) return;
            if (event.key === '?') { event.preventDefault(); toggleShortcuts(); }
            else if (event.key === 'z' || event.key === 'Z') { event.preventDefault(); toggleFoldAll(); }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, []);
    return open ? <ShortcutsCard sweep={sweep} track={track}/> : null;
}

function ShortcutsCard(props: {sweep: boolean; track: boolean}) {
    const card = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState(readBoard);
    useEffect(() => { card.current?.querySelector<HTMLElement>('.ux-sc-close')?.focus({preventScroll: true}); }, []);
    // The list follows the board while it is open (a lesson opens, the pucks fold or lock).
    useEffect(() => {
        let frame = 0;
        const refresh = () => { frame = 0; setNow(prev => { const next = readBoard(); return prev.lesson === next.lesson && prev.pucks === next.pucks ? prev : next; }); };
        const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(refresh); });
        observer.observe(document.body, {attributes: true, attributeFilter: ['class'], subtree: true});
        return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
    }, []);
    const groups = GROUPS(now, props.sweep, props.track);
    const shape = `${now.lesson}${now.pucks}${props.sweep}${props.track}`;
    // Clear of the lesson card (its Back and Next stay reachable) and of the pucks' strip: centred over the board, else beside,
    // above or below what must stay free; the first spot that overlaps none of them, else the one that overlaps least.
    useLayoutEffect(() => {
        const el = card.current;
        if (!el) return undefined;
        const place = () => {
            const frame = document.querySelector('.ux-board-frame')?.getBoundingClientRect();
            const avoid = Array.from(document.querySelectorAll('.ux-bcard-guide, .ux-dock-strip')).map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
            el.style.maxHeight = '';
            const w = el.offsetWidth, h = Math.min(el.offsetHeight, window.innerHeight - 16);
            const area = frame ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
            const lo = 8, hi = window.innerWidth - w - 8;
            const xs = [area.left + area.width / 2 - w / 2, ...avoid.flatMap(r => [r.right + 12, r.left - 12 - w]), hi, lo].map(x => Math.max(lo, Math.min(hi, x)));
            const clampY = (y: number) => Math.max(8, Math.min(y, window.innerHeight - h - 8));
            const ys = [area.top + 40, ...avoid.flatMap(r => [r.top - 8 - h, r.bottom + 8]), 8].map(clampY);
            const overlap = (x: number, y: number) => avoid.reduce((sum, r) => {
                const ox = Math.min(x + w + 8, r.right) - Math.max(x - 8, r.left), oy = Math.min(y + h + 8, r.bottom) - Math.max(y - 8, r.top);
                return sum + (ox > 0 && oy > 0 ? ox * oy : 0);
            }, 0);
            let best = {x: xs[0]!, y: ys[0]!, cost: Infinity};
            for (const y of ys) for (const x of xs) { const cost = overlap(x, y); if (cost < best.cost) best = {x, y, cost}; }
            el.style.left = `${Math.round(best.x)}px`; el.style.top = `${Math.round(best.y)}px`;
            el.style.maxHeight = `${Math.round(window.innerHeight - best.y - 8)}px`;
        };
        place();
        window.addEventListener('resize', place);
        return () => window.removeEventListener('resize', place);
    }, [shape]);
    // Tab past the last control (or Shift+Tab before the first) goes back into the board, to what opened the list, not to the page top.
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const items = Array.from(card.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])') ?? []);
        const edge = e.shiftKey ? items[0] : items[items.length - 1];
        if (!edge || document.activeElement !== edge) return;
        const target = returnTo?.isConnected ? returnTo : document.querySelector<HTMLElement>('.ux-sc-button, .ux-btext-grip, .workspace-graph');
        if (!target) return;
        e.preventDefault();
        target.focus();
    };
    return createPortal(<div ref={card} className="ux-sc-card" role="dialog" aria-label="Bližnjice" aria-modal="false" onKeyDown={onKeyDown}>
        <div className="ux-sc-head">
            <span className="ux-sc-title">Bližnjice</span>
            <button type="button" className="ux-sc-close" onClick={() => closeShortcuts()} aria-label="Zapri bližnjice" title="Zapri (Esc)">×</button>
        </div>
        <div className="ux-sc-body">
            {groups.map(group => <section key={group.title}>
                <h3>{group.title}</h3>
                <dl>{group.rows.map(([keys, text], i) => <div key={i} className="ux-sc-row">
                    <dt>{keys.map((k, j) => <kbd key={j}>{k}</kbd>)}</dt><dd>{text}</dd>
                </div>)}</dl>
            </section>)}
            <p className="ux-sc-note">Z, N in ? delujejo, ko je fokus na grafu ali v kartici.</p>
        </div>
    </div>, document.body);
}
