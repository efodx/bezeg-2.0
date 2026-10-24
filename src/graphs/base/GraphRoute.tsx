import {useEffect, useState} from 'react';
import {useT} from '../../localization';
import {loadMathJax} from '../../mathjax/loadMathJax';
import {GraphHost} from './GraphHost';
import type BaseGraph from './BaseGraph';
import type {BaseGraphState} from './BaseGraph';

/** Waits for graph label support before creating its board, with an accessible CDN wait state. */
export function GraphRoute({create}: {create: () => BaseGraph<BaseGraphState>}) {
    const t = useT();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        void loadMathJax().then(
            () => { if (active) setReady(true); },
            () => { if (active) setReady(true); },
        );
        return () => { active = false; };
    }, []);

    if (!ready) return <main role="status" aria-live="polite">{t('graph_loading')}</main>;
    return <GraphHost create={create}/>;
}
