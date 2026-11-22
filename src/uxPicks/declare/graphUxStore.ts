import {useEffect, useSyncExternalStore} from 'react';
import type {FrameUx, GraphUx} from './graphUx';

/**
 * Where the pick layer reads what the graph and the lesson frame declare. `useGraphUxPublisher` (the workspace) publishes the
 * graph's `workspaceUx()` after every render; `useFrameUxPublisher` (the lesson card) publishes the current frame's `ux`.
 * Both are cleared on unmount, so a graph or frame that declares nothing leaves nothing behind.
 */
interface Box<T> { value: T | undefined; version: number; listeners: Set<() => void>; }
const box = <T,>(): Box<T> => ({value: undefined, version: 0, listeners: new Set()});
const graph = box<GraphUx>();
const frame = box<FrameUx>();

function publish<T>(b: Box<T>, value: T | undefined) {
    if (b.value === value) return;
    b.value = value; b.version++;
    b.listeners.forEach(l => l());
}
function use<T>(b: Box<T>): T | undefined {
    useSyncExternalStore(l => { b.listeners.add(l); return () => { b.listeners.delete(l); }; }, () => b.version, () => 0);
    return b.value;
}

/** Called with the graph's declaration on every render of the workspace. A new object each render is expected. */
export function useGraphUxPublisher(ux: GraphUx | undefined) {
    useEffect(() => { publish(graph, ux); });
    useEffect(() => () => publish(graph, undefined), []);
}
export function useGraphUx(): GraphUx | undefined { return use(graph); }
/** Non-React reader of the published declaration. */
export function getGraphUx(): GraphUx | undefined { return graph.value; }
/** The declared help text of the puck on `param`, if the graph gave one. */
export function declaredPuckHelp(param: string): string | undefined { return graph.value?.pucks?.find(p => p.param === param)?.help; }

/** Called by the lesson card with the shown frame's `ux` (undefined when it has none). */
export function useFrameUxPublisher(ux: FrameUx | undefined) {
    useEffect(() => { publish(frame, ux); }, [ux]);
    useEffect(() => () => publish(frame, undefined), []);
}
export function useFrameUx(): FrameUx | undefined { return use(frame); }

/** Imperative form of `useFrameUxPublisher` (the dev console and browser checks use it to stand in for the lesson card). */
export function setFrameUx(ux: FrameUx | undefined) { publish(frame, ux); }
