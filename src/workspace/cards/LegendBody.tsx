import {useEffect} from 'react';
import {renderMessage} from '../../localization';
import type {LegendEntry} from '../../graphs/base/declare/graphDeclaration';
import {Swatch, type DrawnObject} from './Swatch';
import './cards.css';

export interface ShownLegendEntry {
    readonly entry: LegendEntry;
    readonly color: string;
}

/**
 * The entries the legend card lists: drawn now (visibility from the board's object, never declared) and not linked from a
 * readout row, which shows its own swatch. Colours come from `drawnObject`.
 */
export function shownLegendEntries(legend: readonly LegendEntry[], drawnObject: DrawnObject, linkedIds: ReadonlySet<string> = new Set()): ShownLegendEntry[] {
    const shown: ShownLegendEntry[] = [];
    for (const entry of legend) {
        const drawn = drawnObject(entry.object);
        if (drawn?.visible && !linkedIds.has(entry.id)) shown.push({entry, color: drawn.color});
    }
    return shown;
}

/** A legend of one entry says nothing the board does not: the presenter skips the card. */
export const isLegendHidden = (shown: readonly ShownLegendEntry[]): boolean => shown.length < 2;

export interface LegendBodyProps {
    legend: readonly LegendEntry[];
    drawnObject: DrawnObject;
    /** Legend ids that a readout row already shows. */
    linkedIds?: ReadonlySet<string>;
    /** Called with whether the card has nothing to show (fewer than two entries), so the presenter can skip it. */
    onHiddenChange?: (hidden: boolean) => void;
}

export function LegendBody(props: LegendBodyProps) {
    const shown = shownLegendEntries(props.legend, props.drawnObject, props.linkedIds);
    const hidden = isLegendHidden(shown);
    const {onHiddenChange} = props;
    useEffect(() => { onHiddenChange?.(hidden); }, [hidden, onHiddenChange]);
    if (hidden) return null;
    return <ul className="ws-legend" data-legend="">
        {shown.map(({entry, color}) => <li key={entry.id} className="ws-legend-entry" data-card-row="" data-legend-entry={entry.id}>
            <Swatch kind={entry.kind} color={color}/>
            <span>{renderMessage(entry.label)}</span>
        </li>)}
    </ul>;
}
