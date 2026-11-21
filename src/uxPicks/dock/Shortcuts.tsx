import React, {useEffect, useLayoutEffect, useRef, useSyncExternalStore} from 'react';
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
const GROUPS = (sweep: boolean, track: boolean): {title: string; rows: Row[]}[] => [
    {title: 'Kartice', rows: [
        [['povleci glavo'], 'premakne kartico; spusti jo nad označeno mesto, da se pripne, v sredini ostane prosto'],
        [['dvoklik na glavo'], 'vrne kartico na privzeto mesto'],
        [['−', '+'], 'zloži ali razpne kartico (klik na zloženo glavo jo razpne)'],
        [['← ↑ → ↓'], 'na prijemalu kartice: premik (Shift: večji korak); Enter pripne na označeno mesto, Home na privzeto'],
        [['Z'], 'zloži vse kartice razen lekcije; še enkrat: vrne jih, kakor so bile'],
    ]},
    {title: 'Lekcija', rows: [
        [['Alt + ←', 'Alt + →'], 'nazaj / naprej'],
        [['PageUp', 'PageDown'], 'nazaj / naprej, ko je fokus v kartici lekcije'],
    ]},
    {title: 'Parametri na grafu', rows: [
        [['povleci levo ali desno'], 'spremeni vrednost; med vlečenjem dvigni kazalec ali prst za fino nastavljanje'],
        [['← ↑ → ↓'], 'na ploščici: korak (Shift ali PageUp/PageDown: 10 korakov); Home in End: najmanjša in največja vrednost'],
        [['številka', 'Enter', 'dvoklik'], 'vpiši vrednost; Enter potrdi, Esc prekliče'],
        ...(sweep ? [[['∿'], 'ploščica niha sama med mejami'] as Row, [['N'], 'vsi parametri začnejo nihati; če kateri niha, se vsi ustavijo'] as Row] : []),
        ...(track ? [[['spodnji trak'], 'kazalec nad trakom pokaže graf pri tej vrednosti, klik skoči nanjo'] as Row] : []),
    ]},
    {title: 'Splošno', rows: [[['?'], 'ta seznam; Esc ga zapre'], [['?', 'Z', 'N'], 'delujejo, ko je fokus na grafu ali v kartici']]},
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
    useEffect(() => { card.current?.querySelector<HTMLElement>('.ux-sc-close')?.focus({preventScroll: true}); }, []);
    // Clear of the lesson card (its Back and Next stay reachable): centred over the board, else beside the lesson card.
    useLayoutEffect(() => {
        const el = card.current;
        if (!el) return undefined;
        const place = () => {
            const frame = document.querySelector('.ux-board-frame')?.getBoundingClientRect();
            const avoid = Array.from(document.querySelectorAll('.ux-bcard-guide')).map(e => e.getBoundingClientRect()).filter(r => r.width > 0);
            const w = el.offsetWidth, h = el.offsetHeight;
            const area = frame ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
            const top = Math.max(8, Math.min(area.top + 40, window.innerHeight - h - 8));
            const clear = (x: number) => avoid.every(r => x + w + 8 <= r.left || x >= r.right + 8 || top + h + 8 <= r.top || top >= r.bottom + 8);
            const lo = 8, hi = window.innerWidth - w - 8;
            const candidates = [area.left + area.width / 2 - w / 2, ...avoid.flatMap(r => [r.right + 12, r.left - 12 - w]), hi, lo].map(x => Math.max(lo, Math.min(hi, x)));
            const x = candidates.find(clear) ?? candidates[0]!;
            el.style.left = `${Math.round(x)}px`; el.style.top = `${Math.round(top)}px`;
        };
        place();
        window.addEventListener('resize', place);
        return () => window.removeEventListener('resize', place);
    }, []);
    return createPortal(<div ref={card} className="ux-sc-card" role="dialog" aria-label="Bližnjice" aria-modal="false">
        <div className="ux-sc-head">
            <span className="ux-sc-title">Bližnjice</span>
            <button type="button" className="ux-sc-close" onClick={() => closeShortcuts()} aria-label="Zapri bližnjice" title="Zapri (Esc)">×</button>
        </div>
        <div className="ux-sc-body">
            {GROUPS(props.sweep, props.track).map(group => <section key={group.title}>
                <h3>{group.title}</h3>
                <dl>{group.rows.map(([keys, text], i) => <div key={i} className="ux-sc-row">
                    <dt>{keys.map((k, j) => <kbd key={j}>{k}</kbd>)}</dt><dd>{text}</dd>
                </div>)}</dl>
            </section>)}
        </div>
    </div>, document.body);
}
