import React from 'react';

/**
 * Compatibility shim. The prototype used to lift a graph's readout panel out of the tools into the card by reparenting it
 * (and finding its help paragraphs by selector). That guessing is gone: a graph declares its readouts (`workspaceUx()`,
 * src/uxPicks/declare/graphUx.ts). The ~30 graphs that still wrap their panel in `<BoardReadout>` render it in place, as on
 * master. Remove the wrapper from a graph when converting it; delete this file when none is left.
 */
export function BoardReadout(props: {children: React.ReactNode}) {
    return <>{props.children}</>;
}
