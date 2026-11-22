import React, {useLayoutEffect, useRef, useState} from 'react';
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
    return <div className="ux-rc-row" data-readout={row.id} data-highlight={props.highlighted || undefined} data-tone={row.tone}>
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
        {rest.length > 0 && <button type="button" className="ux-rc-more" aria-expanded={more} onClick={toggle}>{more ? 'Manj' : `Več (${rest.length})`}</button>}
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
        grow();
        const ro = new ResizeObserver(grow);
        ro.observe(el);
        return () => ro.disconnect();
    }, [shape]);
    return ref;
}

/** Body of the readout card: formula, grouped readouts, notes, and the help behind "?". */
export function ReadoutBody(props: {ux: GraphUx; highlight: readonly string[]}) {
    const {ux} = props;
    const [help, setHelp] = useState(false);
    const entries = new Map((ux.legend ?? []).map(e => [e.id, e] as const));
    const ratchet = useWidthRatchet((ux.readouts ?? []).map(g => g.id + ':' + g.rows.map(r => r.id).join(',')).join('|'));
    return <div className="ux-rc" ref={ratchet}>
        {ux.formula && <div className="ux-rc-formula"><Tex tex={ux.formula}/></div>}
        {(ux.readouts ?? []).map(group => <section key={group.id} className="ux-rc-group" data-group={group.id}>
            {group.title && <h4 className="ux-rc-title">{group.title}</h4>}
            <dl className="ux-rc-grid">
                {group.rows.map(row => <Row key={row.id} row={row} highlighted={props.highlight.includes(row.id)} entry={row.legend ? entries.get(row.legend) : undefined} reserveMark={group.rows.some(r => r.legend && entries.has(r.legend))}/>)}
            </dl>
        </section>)}
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
