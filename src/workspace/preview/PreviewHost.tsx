import {useEffect, useMemo} from 'react';
import type {ReactNode} from 'react';
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import {GhostOverlay} from './GhostOverlay';
import {PreviewHoverContext} from './previewContext';
import {PreviewController} from './previewController';

export interface PreviewHostProps {
    graph: BaseGraph<BaseGraphState>;
    /** The board's size in pixels; the ghost maps the shown box onto it. */
    width: number;
    height: number;
    /** Changes with the open lesson frame; the ghost goes with it. */
    frame?: unknown;
    children?: ReactNode;
}

/** Owns the board's hover preview: the controller the controls report to and the overlay it draws. Mount inside the board's positioned layer. */
export function PreviewHost({graph, width, height, frame, children}: PreviewHostProps) {
    const controller = useMemo(() => new PreviewController(graph), [graph]);
    useEffect(() => () => controller.hide(), [controller]);
    useEffect(() => { controller.hide(); }, [controller, frame]);
    return <PreviewHoverContext.Provider value={controller}>
        <GhostOverlay controller={controller} width={width} height={height}/>
        {children}
    </PreviewHoverContext.Provider>;
}
