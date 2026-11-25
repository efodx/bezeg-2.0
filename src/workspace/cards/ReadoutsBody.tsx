import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {formatNumber} from '../../analysis/format';
import {currentLanguage, isMessageNumber, renderMessage, useT, type Message, type MessageNumber} from '../../localization';
import type {FormattedValue, FormulaDeclaration, LegendEntry, ReadoutGroup, ReadoutNote, ReadoutRow} from '../../graphs/base/declare/graphDeclaration';
import {LiveReadout, SettledReadout} from '../../graphs/base/controls/LiveReadout';
import {useIsMeasurePass} from './MeasurePass';
import {Swatch, type DrawnObject} from './Swatch';
import {Tex} from './Tex';
import './cards.css';

/** The text of a declared value in the current language (the presenter's counterpart of the parity helper). */
export function readoutValueText(value: MessageNumber | Message | FormattedValue): string {
    if ('kind' in value && value.kind === 'formatted') return value.text;
    if (isMessageNumber(value as MessageNumber)) return formatNumber((value as MessageNumber).value, currentLanguage(), (value as MessageNumber).maxDecimals);
    return renderMessage(value as Message);
}

const RESERVED_INTEGER_DIGITS = 4;
const FORMATTED_RESERVE = 12;
const NUMERIC_TEXT = /^[\d\s.,+−·×e⁰¹²³⁴⁵⁶⁷⁸⁹⁻—–∞-]+$/i;

/**
 * The width in `ch` a numeric value reserves: a sign, four integer digits and the declared decimals. It depends on the
 * value's format, never on its current digits, so a sweep does not widen the card (0 for values that are not numbers).
 */
export function numberReserve(value: MessageNumber | Message | FormattedValue): number {
    // A formatted number carries no format, only its text: reserve the widest a four-significant-digit number takes
    // ("−0,0001234"), so a sweep through rounding or exponent forms does not widen the card. Other text reserves nothing.
    if ('kind' in value && value.kind === 'formatted') return NUMERIC_TEXT.test(value.text) ? FORMATTED_RESERVE : 0;
    if (!isMessageNumber(value as MessageNumber)) return 0;
    const decimals = (value as MessageNumber).maxDecimals ?? 2;
    return 1 + RESERVED_INTEGER_DIGITS + (decimals > 0 ? 1 + decimals : 0);
}

/**
 * Which groups fold behind their title so the card needs no scroll. `groupHeights` are the open heights in order,
 * `available` the room for the body. The first group never folds; later groups fold last first until the rest fits.
 * `foldedHeight` is what a folded group still takes (its title line); `keep` lists indices that never fold (a group
 * holding a highlighted row, or one the learner opened). Returns the folded indices, ascending.
 */
export function planGroupFolds(groupHeights: readonly number[], available: number, options: {foldedHeight?: number; keep?: ReadonlySet<number>} = {}): number[] {
    const foldedHeight = options.foldedHeight ?? 0;
    const keep = options.keep ?? new Set<number>();
    const heights = [...groupHeights];
    const folded: number[] = [];
    let total = heights.reduce((sum, height) => sum + height, 0);
    for (let index = heights.length - 1; index >= 1 && total > available; index--) {
        if (keep.has(index)) continue;
        total -= heights[index] - foldedHeight;
        folded.push(index);
    }
    return folded.sort((a, b) => a - b);
}

/** The first note shows; the rest sit behind "Opombe (n)". Open when a highlighted note is among them. */
function Notes(props: {notes: readonly ReadoutNote[]; highlight: ReadonlySet<string>}) {
    const t = useT();
    const [first, ...rest] = props.notes;
    const hasHighlightedRest = rest.some(note => props.highlight.has(note.id));
    const [more, setMore] = useState(false);
    const open = more || hasHighlightedRest;
    if (!first) return null;
    const note = (n: ReadoutNote) => <p key={n.id} data-card-row="" data-note={n.id} data-highlight={props.highlight.has(n.id) || undefined}
        className={n.tone === 'warning' ? 'ws-note is-warning' : 'ws-note'}>{renderMessage(n.text)}</p>;
    return <div className="ws-notes">
        {note(first)}
        {rest.length > 0 && <button type="button" className="ws-more" data-card-row="" aria-expanded={open} onClick={() => setMore(!open)}>
            {open ? t('workspace_notes_less') : t('workspace_notes_more', {count: rest.length})}
        </button>}
        {open && rest.map(note)}
    </div>;
}

function Row(props: {row: ReadoutRow; highlighted: boolean; entry?: LegendEntry; drawnObject?: DrawnObject; reserveMark: boolean}) {
    const {row} = props;
    const drawn = props.entry ? props.drawnObject?.(props.entry.object) : undefined;
    // The value cell only grows while the rows stay the same, so a sweep never narrows or widens the card.
    const cell = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        const el = cell.current;
        if (!el || row.valueTex) return;
        const width = el.getBoundingClientRect().width;
        const reserved = Number(el.dataset.reserved ?? 0);
        if (width > reserved + 0.5) { el.dataset.reserved = String(width); el.style.minWidth = `${Math.ceil(width)}px`; }
    });
    return <div className="ws-row" data-card-row="" data-card-readout={row.id} data-highlight={props.highlighted || undefined} data-muted={row.muted || undefined}>
        <dt className="ws-name">
            {props.entry && drawn ? <Swatch kind={props.entry.kind} color={drawn.color}/> : props.reserveMark && <span className="ws-swatch ws-swatch-none" aria-hidden="true"/>}
            <span className="ws-label">
                {row.name && <span>{renderMessage(row.name)}</span>}{row.name && row.symbol && ' '}
                {row.symbol && <Tex tex={row.symbol} className="ws-symbol"/>}
            </span>
        </dt>
        <dd className="ws-value" ref={cell as never}>
            {row.valueTex ? <Tex tex={row.valueTex}/> : <span className="ws-number" data-reserve={numberReserve(row.value)} style={numberReserve(row.value) ? {minWidth: `${numberReserve(row.value)}ch`} : undefined}>{readoutValueText(row.value)}</span>}
            {row.unit && <span className="ws-unit">{' '}{renderMessage(row.unit)}</span>}
        </dd>
    </div>;
}

export interface ReadoutsBodyProps {
    formula?: FormulaDeclaration;
    groups: readonly ReadoutGroup[];
    notes?: readonly ReadoutNote[];
    /** The lesson frame's highlighted row and note ids. */
    highlight?: readonly string[];
    /** The graph's legend: a row with `legend` shows that entry's swatch, taking its colour from `drawnObject`. */
    legend?: readonly LegendEntry[];
    drawnObject?: DrawnObject;
    /** Room for the body in px; later groups fold behind their title before the body would need to scroll. Absent: nothing folds. */
    available?: number;
}

/** The sentence the card announces: each shown plain-text row as "name value unit". */
function announcement(groups: readonly ReadoutGroup[]): string {
    return groups.flatMap(group => group.rows).filter(row => !row.muted && !row.valueTex && row.name)
        .map(row => `${renderMessage(row.name!)} ${readoutValueText(row.value)}${row.unit ? ` ${renderMessage(row.unit)}` : ''}`).join('\n');
}

/** The card's single polite, settled live region. Not rendered in the measure layer (the caller checks). */
function ReadoutsLive({groups}: {groups: readonly ReadoutGroup[]}) {
    const [readout] = useState(() => new SettledReadout());
    const text = announcement(groups);
    useEffect(() => { readout.report(text); }, [readout, text]);
    useEffect(() => () => readout.cancel(), [readout]);
    return <LiveReadout readout={readout} dataAttribute="card-readouts-live"/>;
}

/** The Odčitki card body: formula row, titled groups of read-off rows, then the notes. */
export function ReadoutsBody(props: ReadoutsBodyProps) {
    const t = useT();
    const measurePass = useIsMeasurePass();
    const highlight = new Set(props.highlight ?? []);
    const root = useRef<HTMLDivElement>(null);
    const entries = new Map((props.legend ?? []).map(entry => [entry.id as string, entry]));
    const reserveMark = props.groups.some(group => group.rows.some(row => row.legend !== undefined && entries.has(row.legend)));
    const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
    // The plan depends on the rows' shape and the room, never on values: it is made once per shape.
    const shape = props.groups.map(group => `${group.id}:${group.rows.map(row => row.id).join(',')}`).join('|') + `#${props.available ?? ''}#${[...highlight].join(',')}`;
    const [plan, setPlan] = useState<{shape: string | null; folded: readonly string[]}>({shape: null, folded: []});
    const folded = plan.shape === shape ? plan.folded : [];
    useLayoutEffect(() => {
        if (plan.shape === shape) return;
        const el = root.current;
        if (props.available === undefined || !el) { setPlan({shape, folded: []}); return; }
        const sections = [...el.querySelectorAll<HTMLElement>(':scope > .ws-group')];
        const keep = new Set<number>();
        props.groups.forEach((group, index) => {
            if (!group.title || props.groups.length === 1 || opened.has(group.id) || group.rows.some(row => props.highlight?.includes(row.id))) keep.add(index);
        });
        const fixed = [...el.querySelectorAll<HTMLElement>(':scope > :not(.ws-group)')].reduce((sum, child) => sum + child.offsetHeight, 0);
        const foldedHeight = sections.find(section => section.querySelector('.ws-group-title'))?.querySelector<HTMLElement>('.ws-group-title')?.offsetHeight ?? 0;
        const indices = planGroupFolds(sections.map(section => section.offsetHeight), props.available - fixed, {foldedHeight, keep});
        setPlan({shape, folded: indices.map(index => props.groups[index].id)});
    }, [plan.shape, shape, props.available, props.groups, props.highlight, opened]);
    const highlightKey = [...highlight].join(',');
    useEffect(() => {
        if (!highlightKey) return;
        const row = root.current?.querySelector<HTMLElement>('[data-highlight]');
        row?.scrollIntoView?.({block: 'nearest'});
    }, [highlightKey]);
    return <div className="ws-readouts" ref={root}>
        {props.formula && <div className="ws-formula" data-card-row="" data-formula="">
            <span className="ws-formula-label">{renderMessage(props.formula.label)}</span>
            <Tex tex={props.formula.tex} className="ws-formula-tex"/>
        </div>}
        {props.groups.map(group => {
            const isFolded = props.groups.length > 1 && folded.includes(group.id) && !opened.has(group.id);
            return <section className="ws-group" key={group.id} data-group={group.id} data-folded={isFolded || undefined}>
                {group.title && props.groups.length > 1 && <button type="button" className="ws-group-title" data-card-row="" aria-expanded={!isFolded}
                    aria-label={isFolded ? t('workspace_group_open', {title: renderMessage(group.title)}) : undefined}
                    onClick={() => setOpened(prev => { const next = new Set(prev); if (isFolded) next.add(group.id); else next.delete(group.id); return next; })}>
                    {renderMessage(group.title)}
                </button>}
                {!isFolded && <dl className="ws-rows">
                    {group.rows.map(row => <Row key={row.id} row={row} highlighted={highlight.has(row.id)} entry={row.legend !== undefined ? entries.get(row.legend) : undefined}
                        drawnObject={props.drawnObject} reserveMark={reserveMark}/>)}
                </dl>}
            </section>;
        })}
        {props.notes && props.notes.length > 0 && <Notes notes={props.notes} highlight={highlight}/>}
        {!measurePass && <ReadoutsLive groups={props.groups}/>}
    </div>;
}
