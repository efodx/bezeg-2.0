import {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useT} from '../../localization';
import {loadMathJax} from '../../mathjax/loadMathJax';
import {GraphHost} from './GraphHost';
import {BEZIER_ROUTE_PATH, hasBezierHandoff, readBezierHandoff, withBezierHandoff, withoutBezierHandoff} from '../../bezierHandoff';
import type BaseGraph from './BaseGraph';
import type {BaseGraphState} from './BaseGraph';

/** Waits for graph label support before creating its board, with an accessible CDN wait state. */
export function GraphRoute({create}: {create: () => BaseGraph<BaseGraphState>}) {
    const t = useT();
    const [ready, setReady] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    // The handoff is read once at the first render and removed from history state in the first effect (before the graph and its
    // workspace exist), so a reload or a later workspace replace never re-applies it (ADR 0038).
    const [incoming] = useState(() => readBezierHandoff(location.state)?.points);
    const latest = useRef(location);
    useEffect(() => { latest.current = location; });
    useEffect(() => {
        const {pathname, search, hash, state} = latest.current;
        if (hasBezierHandoff(state)) navigate({pathname, search, hash}, {replace: true, state: withoutBezierHandoff(state)});
    }, [navigate]);
    const [hosted] = useState(() => () => {
        const graph = create();
        graph.hostBridge.bezierHandoff = incoming;
        graph.hostBridge.openAsBezier = points => navigate(BEZIER_ROUTE_PATH, {state: withBezierHandoff(latest.current.state, points)});
        return graph;
    });

    useEffect(() => {
        let active = true;
        void loadMathJax().then(
            () => { if (active) setReady(true); },
            () => { if (active) setReady(true); },
        );
        return () => { active = false; };
    }, []);

    if (!ready) return <main role="status" aria-live="polite">{t('graph_loading')}</main>;
    return <GraphHost create={hosted}/>;
}
