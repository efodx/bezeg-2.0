// React wiring of the view director (task 07 slice 2a): one director for a graph's main board when the gate holds
// (declared marks, `view` bound to the arbiter, not a surface). It is created and disposed here and fed from BoardCards.
import {useEffect, useRef, useState} from 'react';
import type {ViewMarks} from '../../graphs/base/declare/graphDeclaration';
import type {ViewBox} from '../../graphs/base/writes/viewAdapter';
import {directorEligible, ViewDirector, type DirectorGeometry} from '../view/viewDirector';
import type {PresentedGraph} from './cardSpecs';
import type {WorkspaceCardHost} from './cardHost';

export interface ViewDirectorInput {
    graph: PresentedGraph;
    host: WorkspaceCardHost['view'];
    /** The settled layout's geometry, or null while the layout is not final. */
    geometry: DirectorGeometry | null;
    boardSize: {w: number; h: number};
    /** Changes on every lesson step change (declared or not). */
    frameTick: number;
    /** The declared marks of the present state, from the declaration BoardCards already computed. */
    marks: ViewMarks | undefined;
    /** A card drag is active. */
    dragging: boolean;
    /** The declared `followView` of the present state (task 07 slice 4); undefined when the graph declares none. */
    followView?: ViewBox;
}

export function useViewDirector({graph, host, geometry, boardSize, frameTick, marks, dragging, followView}: ViewDirectorInput): void {
    const adapter = graph.mainViewAdapter;
    const arbiter = graph.parameters;
    const eligible = host !== undefined && directorEligible({marks, boundKeys: arbiter?.keys(), surface: host.surface});
    const onDirector = host?.onDirector;
    const [director, setDirector] = useState<ViewDirector>();
    const latestMarks = useRef(marks);
    const latestFollow = useRef(followView);
    useEffect(() => { latestMarks.current = marks; latestFollow.current = followView; }); // declared before the director's effect, so it is current when the director is made

    useEffect(() => {
        if (!eligible || !adapter || !arbiter) return undefined;
        const made = new ViewDirector({adapter, arbiter, marks: () => latestMarks.current, follow: () => latestFollow.current});
        setDirector(made); // the director owns subscriptions, so it is made and disposed with the effect (StrictMode-safe); state hands it to the effects below
        onDirector?.(made);
        return () => { made.dispose(); setDirector(undefined); onDirector?.(undefined); };
    }, [eligible, adapter, arbiter, graph, onDirector]);

    const geometryKey = geometry ? JSON.stringify(geometry) : '';
    useEffect(() => { director?.setDragging(dragging); }, [director, dragging]);
    useEffect(() => { if (director && geometry) director.setGeometry(geometry); }, [director, geometryKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // A step's frame change and its follow change arrive in one commit and are one glide: the director merges the requests.
    useEffect(() => { director?.followChanged(); }, [director, followView]);

    const seen = useRef<{director?: ViewDirector; tick: number; w: number; h: number}>({tick: frameTick, w: boardSize.w, h: boardSize.h});
    useEffect(() => {
        if (!director) return;
        const last = seen.current;
        if (last.director === director) {
            if (last.tick !== frameTick) director.frameChanged();
            if (last.w !== boardSize.w || last.h !== boardSize.h) director.resized();
        }
        seen.current = {director, tick: frameTick, w: boardSize.w, h: boardSize.h};
    }, [director, frameTick, boardSize.w, boardSize.h]);
}
