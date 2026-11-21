import React from 'react';
import {DockCard} from '../dock/DockCard';
import {placementOf, setSideRegion, useDockLayout} from '../dock/dockLayout';
import './toolsCard.css';

/**
 * Pick toolsCard: the tools column becomes a dock card ("Orodja") with a head, fold and drag, and the graph gets side docks
 * beside it that take layout space instead of covering the board. The card starts in the right side dock, so the page looks
 * as it does today; folded there it is a narrow rail, and carried onto the graph it leaves the board the full width. Other
 * cards may use the side docks too. The guided lesson's home follows the tools' side (toolsCard.css). Phones keep the tools
 * under the graph; the workspace renders them plainly there.
 */

// Stable ref callbacks: a new one every render would unregister and register the element again.
const leftRef = (el: HTMLDivElement | null) => setSideRegion('sl', el);
const rightRef = (el: HTMLDivElement | null) => setSideRegion('sr', el);

/** The two side docks: grid items of the workspace, empty (no width) until a card docks there. */
export function SideDocks() {
    return <>
        <div className="ux-side ux-side-l" data-region="sl" ref={leftRef}/>
        <div className="ux-side ux-side-r" data-region="sr" ref={rightRef}/>
    </>;
}

/** The side of the graph the lesson card calls home: the tools' side dock, or the right while the tools are on the graph. */
export function useToolsHome(): 'l' | 'r' {
    useDockLayout();
    return placementOf(TOOLS).region === 'sl' ? 'l' : 'r';
}

export const TOOLS = 'tools';

/** The tools column as a dock card. The tools stay mounted while folded, so their state survives a fold. */
export function ToolsCard(props: {children: React.ReactNode}) {
    return <DockCard kind={TOOLS} title="Orodja" what="orodja" region="sr" order={0}>
        {open => <div className="ux-tools-body" hidden={!open}>{props.children}</div>}
    </DockCard>;
}
