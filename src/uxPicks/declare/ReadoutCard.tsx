import React, {useState} from 'react';
import {GraphPalette} from '../../graphs/styles/GraphPalette';
import {HelpIcon} from '../dock/icons';
import type {GraphUx, LegendEntry, ReadoutRow} from './graphUx';
import {Tex} from './Tex';
import './declare.css';

/** The colour of a row's value for each tone: the same colours the graph draws its curves in. */
const TONE_COLOR: Record<NonNullable<ReadoutRow['tone']>, string> = {
    primary: GraphPalette.primaryCurve,
    comparison: GraphPalette.comparisonCurve,
    error: GraphPalette.warningText,
    accent: GraphPalette.constructionAccent,
    muted: '#526152',
};

function Row(props: {row: ReadoutRow; highlighted: boolean}) {
    const {row} = props;
    return <div className="ux-rc-row" data-readout={row.id} data-highlight={props.highlighted || undefined}>
        <dt className="ux-rc-name">
            {row.name && <span>{row.name}</span>}
            {row.symbol && <Tex tex={row.symbol} className="ux-rc-symbol"/>}
        </dt>
        <dd className="ux-rc-value" style={row.tone ? {color: TONE_COLOR[row.tone]} : undefined}>
            {row.valueTex ? <Tex tex={row.valueTex}/> : row.value}{row.unit && <span className="ux-rc-unit">{' '}{row.unit}</span>}
        </dd>
    </div>;
}

/** Body of the readout card: formula, grouped readouts, notes, and the help behind "?". */
export function ReadoutBody(props: {ux: GraphUx; highlight: readonly string[]}) {
    const {ux} = props;
    const [help, setHelp] = useState(false);
    return <div className="ux-rc">
        {ux.formula && <div className="ux-rc-formula"><Tex tex={ux.formula}/></div>}
        {(ux.readouts ?? []).map(group => <section key={group.id} className="ux-rc-group" data-group={group.id}>
            {group.title && <h4 className="ux-rc-title">{group.title}</h4>}
            <dl className="ux-rc-grid">
                {group.rows.map(row => <Row key={row.id} row={row} highlighted={props.highlight.includes(row.id)}/>)}
            </dl>
        </section>)}
        {(ux.notes?.length ?? 0) > 0 && <div className="ux-rc-notes">
            {ux.notes!.map(note => <p key={note.id} data-note={note.id} className={note.tone === 'warning' ? 'is-warning' : undefined}>{note.text}</p>)}
        </div>}
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
