import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {GraphPalette} from '../../graphs/styles/GraphPalette';
import {HelpIcon} from '../dock/icons';
import type {GraphUx, LegendEntry, ReadoutRow} from './graphUx';
import {Tex} from './Tex';
import './declare.css';

/** The 10 px sample of a legend entry shown before the name of a row that links it: same kind and colour as in the legend. */
function EntryMark(props: {entry: LegendEntry}) {
    const {kind, color} = props.entry;
    const style: React.CSSProperties = kind === 'line' ? {borderTop: `2.5px solid ${color}`}
        : kind === 'dashed' ? {borderTop: `2.5px dashed ${color}`}
        : kind === 'area' ? {background: color, opacity: 0.45, borderRadius: 2}
        : {background: color, borderRadius: '50%'};
    return <span className={`ux-rc-mark ux-rc-mark-${kind}`} style={style} aria-hidden="true"/>;
}

function Row(props: {row: ReadoutRow; highlighted: boolean; entry?: LegendEntry; reserveMark: boolean}) {
    const {row} = props;
    // A value takes its own full-width line only when it cannot fit beside its name (flex-wrap decides). One way only: once a row
    // has wrapped it keeps its own line, so a sweep whose values cross the width does not flip the layout and shift every row
    // under it (kinematics sweep: CLS 0.06).
    const rowRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = rowRef.current;
        if (!el || el.hasAttribute('data-wrapped')) return;
        // After the value's formula is typeset (its raw TeX is wider than the finished formula).
        const timer = window.setTimeout(() => {
            const name = el.firstElementChild as HTMLElement | null, value = el.lastElementChild as HTMLElement | null;
            if (name && value && value !== name && value.offsetTop >= name.offsetTop + name.offsetHeight - 2) el.setAttribute('data-wrapped', '');
        }, 500);
        return () => window.clearTimeout(timer);
    });
    return <div ref={rowRef} className="ux-rc-row" data-readout={row.id} data-highlight={props.highlighted || undefined} data-tone={row.tone}>
        <dt className="ux-rc-name">
            {props.entry ? <EntryMark entry={props.entry}/> : props.reserveMark && <span className="ux-rc-mark ux-rc-mark-none" aria-hidden="true"/>}
            <span className="ux-rc-label">
                {row.name && <span>{row.name}</span>}{row.name && row.symbol && ' '}
                {row.symbol && <Tex tex={row.symbol} className="ux-rc-symbol"/>}
            </span>
        </dt>
        <dd className="ux-rc-value">
            {row.valueTex ? <Tex tex={row.valueTex}/> : row.value}{row.unit && <span className="ux-rc-unit">{' '}{row.unit}</span>}
        </dd>
    </div>;
}

/** The legend entries a visible readout row links: the legend card leaves these out, the rows draw their swatch. */
export function linkedLegendIds(ux: GraphUx): Set<string> {
    const ids = new Set<string>();
    for (const group of ux.readouts ?? []) for (const row of group.rows) if (row.legend) ids.add(row.legend);
    return ids;
}

const MORE_KEY = 'bezeg.ux.readoutMore';

/** The notes: the first one always, the rest behind a quiet "Več" that is remembered for the card. */
function Notes(props: {notes: NonNullable<GraphUx['notes']>}) {
    const [first, ...rest] = props.notes;
    const [more, setMore] = useState(() => { try { return localStorage.getItem(MORE_KEY) === '1'; } catch { return false; } });
    const toggle = () => setMore(m => {
        try { localStorage.setItem(MORE_KEY, m ? '0' : '1'); } catch { /* storage unavailable: stays per visit */ }
        return !m;
    });
    const note = (n: typeof first) => <p key={n.id} data-note={n.id} className={n.tone === 'warning' ? 'is-warning' : undefined}>{n.text}</p>;
    return <div className="ux-rc-notes">
        {note(first)}
        {rest.length > 0 && <button type="button" className="ux-rc-more" aria-expanded={more} onClick={toggle}>{more ? 'Skrij opombe' : `Opombe (${rest.length})`}</button>}
        {more && rest.map(note)}
    </div>;
}

/**
 * The card only ever grows while its rows stay the same: a value whose digits change width (a sweep, a drag) would otherwise
 * resize the card on every frame and shift the board's cards around it (night probe: CLS 0.04-0.14). The ratchet restarts
 * when the rows change (another graph, mode or lesson scene).
 */
function useWidthRatchet(shape: string) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.minWidth = '';
        let widest = 0;
        const grow = () => { const w = el.getBoundingClientRect().width; if (w > widest + 0.5) { widest = w; el.style.minWidth = `${Math.ceil(w)}px`; } };
        // Each value cell ratchets too: at the card's 320 px cap a wider value would take width from the names column and
        // rewrap the names on every sweep frame (recursion, circle constructions: values 38↔124 px, CLS 0.03-0.12).
        const cells = new WeakMap<HTMLElement, number>();
        const growCell = (cell: HTMLElement) => {
            if (!cell.querySelector('mjx-container') && cell.textContent?.includes('\\')) return; // TeX source before MathJax: wider than the value
            const w = cell.getBoundingClientRect().width;
            if (w > (cells.get(cell) ?? 0) + 0.5) { cells.set(cell, w); cell.style.minWidth = `${Math.ceil(w)}px`; }
        };
        const ro = new ResizeObserver(records => { for (const r of records) if (r.target === el) grow(); else growCell(r.target as HTMLElement); });
        const watchCells = () => el.querySelectorAll<HTMLElement>('.ux-rc-row:not([data-long]) > .ux-rc-value').forEach(cell => { if (!cells.has(cell)) { growCell(cell); ro.observe(cell); } });
        grow();
        ro.observe(el);
        watchCells();
        const mo = new MutationObserver(watchCells);
        mo.observe(el, {childList: true, subtree: true});
        return () => { ro.disconnect(); mo.disconnect(); };
    }, [shape]);
    return ref;
}

/** The scrollable ancestors of `el` inside the dock (the card, its stack); the page is never one of them. */
function dockScrollers(el: HTMLElement): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (let p = el.parentElement; p && !p.classList.contains('ux-dock') && p !== document.body; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) out.push(p);
    }
    return out;
}

/** Scrolls the first highlighted row into view inside the card's own scrollers (never the page): after a highlight change and after the card opens. */
function useHighlightIntoView(ref: React.RefObject<HTMLElement | null>, key: string) {
    useEffect(() => {
        if (!key) return undefined;
        const timer = window.setTimeout(() => {
            const row = ref.current?.querySelector<HTMLElement>('[data-highlight]');
            if (!row) return;
            const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            for (const sc of dockScrollers(row)) {
                const r = row.getBoundingClientRect(), s = sc.getBoundingClientRect();
                const head = sc.querySelector<HTMLElement>(':scope > .ux-btext-head')?.offsetHeight ?? 0;
                const top = r.top - (s.top + head + 28), bottom = r.bottom - (s.bottom - 36);
                const delta = top < 0 ? top : bottom > 0 ? bottom : 0;
                if (delta) sc.scrollBy({top: delta, behavior: smooth ? 'smooth' : 'auto'});
            }
        }, 80);
        return () => window.clearTimeout(timer);
    }, [ref, key]);
}

/**
 * The groups after the first fold to their heading line, last first, until the card fits its column (the stack scrolls only
 * when the first group alone overflows). Planned on mount, resize and when the rows or the lesson frame change, never while
 * values change. `keep(id)`: a group that never folds (highlighted, or opened by the learner).
 */
function useFoldToFit(ref: React.RefObject<HTMLElement | null>, planKey: string, ids: readonly string[], keep: (id: string) => boolean): string[] {
    const [epoch, setEpoch] = useState(0);
    const sig = planKey + '@' + epoch;
    const [plan, setPlan] = useState<{sig: string; ids: string[]}>({sig, ids: []});
    const folded = plan.sig === sig ? plan.ids : [];
    useEffect(() => {
        let timer = 0;
        const again = (ms: number) => { window.clearTimeout(timer); timer = window.setTimeout(() => setEpoch(e => e + 1), ms); };
        const onResize = () => again(150);
        window.addEventListener('resize', onResize);
        // The column's own size changes with the window and with the cards opening or folding beside it, not with values.
        const column = ref.current?.closest('.ux-dock-v')?.parentElement;
        const watch = column ? new ResizeObserver(onResize) : null;
        if (column) watch?.observe(column);
        again(700); // after MathJax has typeset the values and the formula
        return () => { window.clearTimeout(timer); window.removeEventListener('resize', onResize); watch?.disconnect(); };
    }, [planKey]);
    useLayoutEffect(() => {
        const stack = ref.current?.closest<HTMLElement>('.ux-dock-v');
        if (!stack) return;
        // The stack is measured at its natural height: a row-snapped max-height (snapRows) is set aside for the reading.
        const held = stack.style.maxHeight;
        if (held) stack.style.removeProperty('max-height');
        const over = stack.scrollHeight > stack.clientHeight + 2;
        if (held) stack.style.maxHeight = held;
        if (!over) return;
        const next = [...ids].slice(1).reverse().find(id => !folded.includes(id) && !keep(id));
        if (next) setPlan({sig, ids: [...folded, next]});
    });
    return folded;
}

/** A group's heading: plain, or (while the lesson focuses on other rows) a button that opens and closes the group. */
/** "Še 5 odčitkov": the heading of a folded group that has no title of its own (Slovenian dual and plural). */
function moreRows(n: number): string {
    const m = n % 100;
    return `Še ${n} ${m === 1 ? 'odčitek' : m === 2 ? 'odčitka' : m === 3 || m === 4 ? 'odčitki' : 'odčitkov'}`;
}

function GroupHead(props: {title: string; count?: number; fold?: {open: boolean; toggle: () => void}}) {
    if (!props.fold) return <h4 className="ux-rc-title">{props.title}</h4>;
    return <h4 className="ux-rc-title ux-rc-title-fold">
        <button type="button" aria-expanded={props.fold.open} onClick={props.fold.toggle}>
            <span>{props.title}</span>{props.count !== undefined && <span className="ux-rc-count">· {props.count}</span>}
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className="ux-rc-chev"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
    </h4>;
}

/** Body of the readout card: formula, grouped readouts, notes, and the help behind "?".
 *  While the lesson frame highlights rows, the groups without one fold to their heading (the learner may open them until the highlight changes). */
export function ReadoutBody(props: {ux: GraphUx; highlight: readonly string[]}) {
    const {ux} = props;
    const [help, setHelp] = useState(false);
    const entries = new Map((ux.legend ?? []).map(e => [e.id, e] as const));
    const ratchet = useWidthRatchet((ux.readouts ?? []).map(g => g.id + ':' + g.rows.map(r => r.id).join(',')).join('|'));
    const groups = ux.readouts ?? [];
    const hasHit = (rows: readonly ReadoutRow[]) => rows.some(r => props.highlight.includes(r.id));
    const focus = groups.some(g => hasHit(g.rows));
    const key = focus ? props.highlight.join(',') : '';
    const [opened, setOpened] = useState<{key: string; ids: readonly string[]}>({key, ids: []});
    const openIds = opened.key === key ? opened.ids : [];
    const toggle = (id: string) => setOpened({key, ids: openIds.includes(id) ? openIds.filter(i => i !== id) : [...openIds, id]});
    const shape = groups.map(g => g.id + ':' + g.rows.map(r => r.id).join(',')).join('|');
    const autoFolded = useFoldToFit(ratchet, shape + '#' + key, groups.map(g => g.id), id => {
        const g = groups.find(x => x.id === id);
        return !g || hasHit(g.rows) || openIds.includes(id) || (focus && groups.indexOf(g) > 0 && !hasHit(g.rows));
    });
    useHighlightIntoView(ratchet, key);
    return <div className="ux-rc" ref={ratchet}>
        {ux.formula && <div className="ux-rc-formula"><Tex tex={ux.formula}/></div>}
        {groups.map(group => {
            const foldable = (focus && !hasHit(group.rows)) || autoFolded.includes(group.id);
            const open = !foldable || openIds.includes(group.id);
            const title = group.title ?? (foldable ? moreRows(group.rows.length) : undefined);
            return <section key={group.id} className="ux-rc-group" data-group={group.id} data-folded={!open || undefined}>
                {title && <GroupHead title={title} count={group.title ? group.rows.length : undefined} fold={foldable ? {open, toggle: () => toggle(group.id)} : undefined}/>}
                {open && <dl className="ux-rc-grid">
                    {group.rows.map(row => <Row key={row.id} row={row} highlighted={props.highlight.includes(row.id)} entry={row.legend ? entries.get(row.legend) : undefined} reserveMark={group.rows.some(r => r.legend && entries.has(r.legend))}/>)}
                </dl>}
            </section>;
        })}
        {(ux.notes?.length ?? 0) > 0 && <Notes notes={ux.notes!}/>}
        {ux.readoutHelp && <div className="ux-rc-helpbar">
            <button type="button" className="ux-sec-help" aria-expanded={help} aria-label="Pomoč: odčitki" title="Pomoč: odčitki" onClick={() => setHelp(o => !o)}><HelpIcon/></button>
        </div>}
        {help && ux.readoutHelp && <div className="ux-rc-help">{ux.readoutHelp}</div>}
    </div>;
}

function Swatch(props: {entry: LegendEntry}) {
    const {kind, color} = props.entry;
    const style: React.CSSProperties = kind === 'line' ? {borderTop: `3px solid ${color}`}
        : kind === 'dashed' ? {borderTop: `3px dashed ${color}`}
        : kind === 'area' ? {background: color, opacity: 0.45}
        : {background: color, borderRadius: '50%'};
    return <span className={`ux-rc-swatch ux-rc-swatch-${kind}`} style={style} aria-hidden="true"/>;
}

/** Body of the legend card. */
export function LegendBody(props: {entries: readonly LegendEntry[]}) {
    return <ul className="ux-rc-legend">
        {props.entries.map(e => <li key={e.id} data-legend={e.id}><Swatch entry={e}/><span>{e.label}</span></li>)}
    </ul>;
}
