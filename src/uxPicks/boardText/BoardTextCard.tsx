import React, {useEffect} from 'react';
import {DockCard} from '../dock/DockCard';
import {useFrameUx, useGraphUx} from '../declare/graphUxStore';
import {LegendBody, ReadoutBody} from '../declare/ReadoutCard';
import type {CardRef} from '../declare/graphUx';
import {setAutoOpen} from './autoOpenStore';
import './BoardTextCard.css';

/** The DockCard kind each card ref names (the kind is also the key of the card's stored place and fold). */
const kindOf = (ref: CardRef): string => ref === 'readouts' ? 'readout' : ref === 'legend' ? 'legend' : `section-${ref.slice('section:'.length)}`;

/**
 * Pick boardText: the cards a graph declares (`workspaceUx()`, src/uxPicks/declare/graphUx.ts), docked on the graph. Nothing
 * is read from the board or guessed from text: the readout card shows `formula`, `readouts`, `notes` and `readoutHelp`, the
 * legend card `legend`, one card per `sections` entry. A graph that declares nothing gets no card. The lesson frame's
 * `ux.open` opens cards and `ux.highlight` marks readout rows.
 */
export function BoardCards(_props: {frame?: React.RefObject<HTMLDivElement | null>}) {
    const ux = useGraphUx();
    const frame = useFrameUx();
    const open = frame?.open;
    useEffect(() => {
        setAutoOpen(new Set((open ?? []).map(kindOf)));
        return () => setAutoOpen(new Set());
    }, [open]);
    if (!ux) return null;
    const hasReadouts = (ux.readouts?.length ?? 0) > 0 || (ux.notes?.length ?? 0) > 0;
    const hasReadoutCard = hasReadouts || !!ux.formula;
    return <>
        {hasReadoutCard && <DockCard kind="readout" title={hasReadouts ? 'Odčitki' : 'Formula'} what={hasReadouts ? 'odčitke' : 'formulo'} region="tr" order={1} foldWhenNarrow foldInLesson>
            {isOpen => isOpen && <ReadoutBody ux={ux} highlight={frame?.highlight ?? []}/>}
        </DockCard>}
        {(ux.legend?.length ?? 0) > 0 && <DockCard kind="legend" title="Legenda" what="legendo" region="br" order={1} foldWhenNarrow foldInLesson>
            {isOpen => isOpen && <LegendBody entries={ux.legend!}/>}
        </DockCard>}
        {(ux.sections ?? []).map((s, i) => <DockCard key={s.id} kind={`section-${s.id}`} title={s.title} what={s.title.toLowerCase()} region="ml" order={i} foldWhenNarrow foldInLesson>
            {isOpen => isOpen && <div className="ux-rc-section">{s.body}</div>}
        </DockCard>)}
    </>;
}
