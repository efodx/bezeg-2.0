import {useCallback, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore} from "react";
import {useT} from "../../localization";
import {DemonstrationWorkspace} from "./DemonstrationWorkspace";
import {BoardCards} from "../../workspace/presenter/BoardCards";
import type BaseGraph from "./BaseGraph";
import type {BaseGraphState} from "./BaseGraph";

/**
 * Hosts one graph controller: creates it once, re-renders when its scene store changes, mounts it on the graph
 * container and flushes its deferred `onStateChange`/callback work after every commit.
 *
 * Under React StrictMode the layout effect mounts, unmounts and mounts the same controller again, which the
 * controller supports; the discarded second `create()` result of the lazy initializer never mounts and owns nothing.
 */
export function GraphHost({create}: { create: () => BaseGraph<BaseGraphState> }) {
    // Panels are produced by controller methods that call the module-level `t`, so GraphHost must stay subscribed
    // for a language switch to re-render them.
    const t = useT();
    const [graph] = useState(create);
    const [declared] = useState(() => graph.getDeclaration() !== undefined);
    const [failed, setFailed] = useState(false);
    const disposeFailedGraph = useCallback(() => { graph.unmount(); setFailed(true); }, [graph]);
    const container = useRef<HTMLDivElement>(null);
    const beforeDispose = useRef<(() => void) | undefined>();
    const [, renderAfterMount] = useReducer((count: number) => count + 1, 0);
    useSyncExternalStore(graph.store.subscribe, () => graph.store.getVersion());

    // Declared before the mount effect so that work queued while mounting waits for the commit that renders it,
    // like an update lifecycle hook after the mount hook.
    useLayoutEffect(() => {
        if (!failed) graph.flushStateChanges();
    });
    useLayoutEffect(() => {
        const element = container.current;
        if (!element) return;
        graph.mount(element);
        // The store subscription above only starts in a passive effect, so mounting's state changes would not
        // schedule a render before the first paint. A render requested here is flushed synchronously, which shows
        // the initialized panels and runs the first deferred state work before the browser paints.
        renderAfterMount();
        return () => {
            beforeDispose.current?.();
            graph.unmount();
        };
    }, [graph]);

    if (failed) return <main><p role="alert">{t('chapter_scene_error')}</p>
        <a href="/bezeg-2.0/learn/bezier-curves">{t('chapter_return')}</a> · <a href={window.location.pathname}>{t('chapter_free_exploration')}</a></main>;
    // A graph that declares cards gets the card layer over its board (task 03); an undeclared graph renders as before.
    // Latched at creation: the overlay changes the board's wrapper, so it must never appear or vanish after the board mounted.
    return <DemonstrationWorkspace {...graph.getWorkspacePanels()}
        boardOverlay={declared ? <BoardCards graph={graph}/> : undefined}
        graphContainerRef={container} beforeDispose={beforeDispose} disposeFailedGraph={disposeFailedGraph}/>;
}
