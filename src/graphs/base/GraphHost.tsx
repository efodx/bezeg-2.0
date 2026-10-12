import {useContext, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore} from "react";
import {useLanguage} from "../../localization";
import {SiteContext} from "../context/react/SiteContext";
import {DemonstrationWorkspace} from "./DemonstrationWorkspace";
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
    // Until task 7 moves localization into the store, a language switch re-renders the panels through this hook.
    useLanguage();
    const [graph] = useState(create);
    const container = useRef<HTMLDivElement>(null);
    const site = useContext(SiteContext);
    const [, renderAfterMount] = useReducer((count: number) => count + 1, 0);
    useSyncExternalStore(graph.store.subscribe, () => graph.store.getVersion());

    // Declared before the mount effect so that work queued while mounting waits for the commit that renders it,
    // like an update lifecycle hook after the mount hook.
    useLayoutEffect(() => {
        graph.flushStateChanges();
    });
    useLayoutEffect(() => {
        const element = container.current;
        if (!element) return;
        graph.mount(element);
        // The store subscription above only starts in a passive effect, so mounting's state changes would not
        // schedule a render before the first paint. A render requested here is flushed synchronously, which shows
        // the initialized panels and runs the first deferred state work before the browser paints.
        renderAfterMount();
        return () => graph.unmount();
    }, [graph]);

    return <DemonstrationWorkspace {...graph.getWorkspacePanels({title: site.workspace?.title, description: site.workspace?.description})}
        graphContainerRef={container}/>;
}
