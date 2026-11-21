import React from 'react';
import {DockCard} from '../dock/DockCard';
import './toolsCard.css';

/**
 * Pick toolsCard: the tools column becomes a dock card ("Orodja") on the graph, with a head, fold and drag like the other
 * board cards, and the graph takes the page's full width. The card starts at the top-left anchor; it can dock at any
 * anchor or float. Phones keep the tools under the graph; the workspace renders them plainly there.
 */
export const TOOLS = 'tools';

/** The tools column as a dock card. The tools stay mounted while folded, so their state survives a fold. */
export function ToolsCard(props: {children: React.ReactNode}) {
    return <DockCard kind={TOOLS} title="Orodja" what="orodja" region="tl" order={0}>
        {open => <div className="ux-tools-body" hidden={!open}>{props.children}</div>}
    </DockCard>;
}
