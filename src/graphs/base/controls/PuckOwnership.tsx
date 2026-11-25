import {createContext, useContext, type HTMLAttributes, type ReactNode} from "react";

const NONE: ReadonlySet<string> = new Set();

/** The parameter keys the board shows as pucks (task 05). The card layer provides it around Orodja; elsewhere no key is owned. */
export const PuckOwnershipContext = createContext<ReadonlySet<string>>(NONE);

/** Whether the board's puck strip owns `key`: its old control in Orodja is then left out, so one control carries the name. */
export function usePuckOwns(key: string | undefined): boolean {
    const owned = useContext(PuckOwnershipContext);
    return key !== undefined && owned.has(key);
}

/** A value a graph drives outside its store while it runs (De Casteljau's playing t): its puck shows this, else the stored value. */
export interface LiveValueSource {
    subscribe(listener: () => void): () => void;
    getSnapshot(): number | undefined;
}

/** A graph that reports the live value of some of its parameters to their pucks. */
export interface PuckLiveValues {
    puckLiveValue(key: string): LiveValueSource | undefined;
}

export const hasPuckLiveValues = (graph: object): graph is PuckLiveValues => 'puckLiveValue' in graph && typeof graph.puckLiveValue === 'function';

/**
 * A wrapper element (an inspector group, a labelled `role="group"`) for controls that pucks may own: rendered only while at least
 * one of `params` is still a tools control, so no empty group or orphan label is left once the pucks own them all.
 */
export function PuckOwnedGroup(props: {params: readonly string[]; children: ReactNode} & HTMLAttributes<HTMLDivElement>) {
    const owned = useContext(PuckOwnershipContext);
    const {params, children, ...div} = props;
    return params.every(key => owned.has(key)) ? null : <div {...div}>{children}</div>;
}

/** A tools control whose parameter is a puck on the board: it renders nothing once the puck exists. */
export function PuckOwned(props: {param: string | undefined; children: ReactNode}) {
    return usePuckOwns(props.param) ? null : <>{props.children}</>;
}
