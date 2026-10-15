import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {getDemonstrationCatalog} from './demonstrations';
import type {FamilyId} from './demonstrations';
import {DemonstrationCollection} from './DemonstrationCollection';
import {createDemonstrationReturnContext, readDemonstrationReturnContext} from './demonstrationNavigation';
import {SiteContext} from './graphs/context/react/SiteContext';
import {useT} from './localization';
import './DemonstrationsPage.css';

function readFilters(search: string, families: readonly {id: FamilyId}[]) {
    const params = new URLSearchParams(search);
    const candidate = params.get('topic');
    return {
        topic: candidate && families.some(family => family.id === candidate) ? candidate as FamilyId : null,
        query: params.get('q') ?? '',
    };
}

export function DemonstrationsPage() {
    const t = useT();
    const {setFullScreen} = useContext(SiteContext).fullScreen;
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {setFullScreen(false);}, [setFullScreen]);
    const {demonstrations, families} = getDemonstrationCatalog();
    const filters = useMemo(() => readFilters(location.search, families), [families, location.search]);
    const [queryDraft, setQueryDraft] = useState(filters.query);
    const queryLocationKey = useRef(location.key);
    const pendingQuery = useRef<{signature: string; value: string} | null>(null);
    const locationSignature = `${location.pathname}\u0000${location.search}\u0000${location.hash}`;

    useEffect(() => {
        if (queryLocationKey.current === location.key) return;
        queryLocationKey.current = location.key;
        const pending = pendingQuery.current;
        if (pending?.signature === locationSignature) setQueryDraft(pending.value);
        else setQueryDraft(filters.query);
        pendingQuery.current = null;
    }, [filters.query, location.key, locationSignature]);

    useEffect(() => {
        const context = readDemonstrationReturnContext(location.state);
        if (!context) return;
        const frame = requestAnimationFrame(() => {
            window.scrollTo({top: context.scrollY, behavior: 'auto'});
            const target = document.getElementById(context.focusTarget);
            if (target) target.focus({preventScroll: true});
            else {
                const cards = [...document.querySelectorAll<HTMLElement>('.demonstrations-catalog-card')];
                const originalIndex = demonstrations.findIndex(entry => `demonstration-card-${entry.id}` === context.cardId);
                const nearest = cards[Math.min(Math.max(originalIndex, 0), cards.length - 1)];
                nearest?.querySelector<HTMLElement>('.demonstrations-catalog-action')?.focus({preventScroll: true});
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [location.key, location.state]);

    const updateFilters = (next: {topic?: FamilyId | null; query?: string}, replace: boolean) => {
        const params = new URLSearchParams(location.search);
        const topic = next.topic === undefined ? filters.topic : next.topic;
        const query = next.query === undefined ? queryDraft : next.query;
        if (topic) params.set('topic', topic); else params.delete('topic');
        if (query.trim()) params.set('q', query); else params.delete('q');
        const search = params.toString();
        const signature = `${location.pathname}\u0000${search ? `?${search}` : ''}\u0000${location.hash}`;
        pendingQuery.current = {signature, value: query};
        if (next.query !== undefined) setQueryDraft(query);
        navigate({pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash}, {replace});
    };

    const navigationState = (demonstration: ReturnType<typeof getDemonstrationCatalog>['demonstrations'][number], lesson: boolean) => {
        const target = `demonstration-card-${demonstration.id}-${lesson ? 'lesson' : 'graph'}`;
        const context = createDemonstrationReturnContext(location, `demonstration-card-${demonstration.id}`, window.scrollY, target);
        return context ? {demonstrationReturn: context} : undefined;
    };

    const prepareReturn = (demonstration: ReturnType<typeof getDemonstrationCatalog>['demonstrations'][number], lesson: boolean) => {
        const target = `demonstration-card-${demonstration.id}-${lesson ? 'lesson' : 'graph'}`;
        const context = createDemonstrationReturnContext(location, `demonstration-card-${demonstration.id}`, window.scrollY, target);
        if (!context) return;
        const state = {demonstrationReturn: context};
        void (async () => {
            await navigate(location, {replace: true, state});
            navigate({pathname: demonstration.path, search: lesson ? '?learn=1' : ''}, {state});
        })();
    };

    const topicChange = (topic: FamilyId | null) => updateFilters({topic}, false);
    const queryChange = (query: string) => updateFilters({query}, true);
    const clearQuery = () => {
        if (!filters.query.trim()) {
            setQueryDraft('');
            return;
        }
        updateFilters({query: ''}, false);
    };

    return <main className="demonstrations-page">
        <header className="demonstrations-page-heading">
            <span className="demonstrations-eyebrow">{t('bezeg_explore_curves')}</span>
            <h1>{t('demonstrations')}</h1>
            <div className="demonstrations-catalog-intro">
                <p>{t('explore_by_topic')}</p>
                <span>{t('catalog_summary', {value0: families.length, value1: demonstrations.length})}</span>
            </div>
        </header>
        <DemonstrationCollection topic={filters.topic} query={queryDraft} onTopicChange={topicChange}
            onQueryChange={queryChange} onClearQuery={clearQuery} onSelect={prepareReturn} getNavigationState={navigationState}/>
    </main>;
}
