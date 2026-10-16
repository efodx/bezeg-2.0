import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {getDemonstrationCatalog} from './demonstrations';
import type {Demonstration, FamilyId} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';
import {demonstrationMotionAssets} from './demonstrationMotionAssets';
import {DemonstrationPreviewPlayer, isFocusLeavingPreviewCard, playPreviewSafely, shouldAutomaticallyPlayPreview} from './demonstrationPreviewPlayer';
import type {DemonstrationPreviewActivation} from './demonstrationPreviewPlayer';
import {isGuidedLessonAvailable} from './learning/runtime/lessonCatalog';
import {useT} from './localization';
import './DemonstrationCollection.css';

export type DemonstrationCollectionProps = {
    topic: FamilyId | null;
    query: string;
    onTopicChange: (topic: FamilyId | null) => void;
    onQueryChange: (query: string) => void;
    currentDemonstrationId?: Demonstration['id'];
    onSelect?: (demonstration: Demonstration, lesson: boolean) => void;
    onClearQuery?: () => void;
    mode?: 'catalogue' | 'picker';
    navigationState?: unknown;
    getNavigationState?: (demonstration: Demonstration, lesson: boolean) => unknown;
    searchInputRef?: React.Ref<HTMLInputElement>;
    className?: string;
};

function normalize(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

function investigation(demonstration: Demonstration, t: ReturnType<typeof useT>) {
    const specific: Partial<Record<Demonstration['id'], 'catalog_investigation_affine' | 'catalog_investigation_extrapolation'
        | 'catalog_investigation_rational' | 'catalog_investigation_rational_extrapolation'
        | 'catalog_investigation_farin' | 'catalog_investigation_circle'>> = {
        affine: 'catalog_investigation_affine',
        extrapolation: 'catalog_investigation_extrapolation',
        rational: 'catalog_investigation_rational',
        'rational-extrapolation': 'catalog_investigation_rational_extrapolation',
        farin: 'catalog_investigation_farin',
        circle: 'catalog_investigation_circle',
    };
    const key = specific[demonstration.id];
    return key ? t(key) : demonstration.prompts[0];
}

type DemonstrationPreviewProps = {src: string; loading: 'eager' | 'lazy'};

export function DemonstrationPreview({src, loading}: DemonstrationPreviewProps) {
    return <DecodedDemonstrationPreview key={src} src={src} loading={loading}/>;
}

function DecodedDemonstrationPreview({src, loading}: DemonstrationPreviewProps) {
    const imageRef = useRef<HTMLImageElement>(null);
    const activeRef = useRef(true);
    const settledRef = useRef(false);
    const [status, setStatus] = useState<'pending' | 'ready' | 'failed'>('pending');

    useEffect(() => {
        activeRef.current = true;
        const image = imageRef.current;
        if (image?.complete) {
            if (image.naturalWidth > 0) revealAfterDecode(image);
            else fail();
        }
        return () => { activeRef.current = false; };
    }, []);

    const reveal = () => {
        if (!activeRef.current || settledRef.current) return;
        settledRef.current = true;
        setStatus('ready');
    };
    const fail = () => {
        if (!activeRef.current || settledRef.current) return;
        settledRef.current = true;
        setStatus('failed');
    };
    const revealAfterDecode = (image: HTMLImageElement) => {
        if (typeof image.decode !== 'function') {
            if (image.naturalWidth > 0) reveal();
            return;
        }
        void image.decode().then(reveal, () => {
            // Some browsers reject decode() for an image that nevertheless loaded successfully.
            if (image.naturalWidth > 0) reveal();
        });
    };

    return <span className="demonstrations-catalog-preview-frame" aria-hidden="true">
        <img ref={imageRef} className={`demonstrations-catalog-preview${status === 'ready' ? ' is-ready' : ''}${status === 'failed' ? ' is-failed' : ''}`}
            src={src} width="360" height="220" alt="" loading={loading}
            onLoad={event => revealAfterDecode(event.currentTarget)} onError={fail}/>
    </span>;
}

export function DemonstrationCollection({topic, query, onTopicChange, onQueryChange, currentDemonstrationId,
    onSelect, onClearQuery, mode = 'catalogue', navigationState, getNavigationState, searchInputRef, className = ''}: DemonstrationCollectionProps) {
    const t = useT();
    const playerRef = useRef<DemonstrationPreviewPlayer | null>(null);
    if (!playerRef.current) playerRef.current = new DemonstrationPreviewPlayer();
    const player = playerRef.current;
    const [activePreview, setActivePreview] = useState<DemonstrationPreviewActivation | null>(null);
    const entryPresence = useRef(new Map<string, {focused: boolean; pointer: boolean; touchPointer: boolean; autoPlayed: boolean}>());
    const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
    const completedPreviews = useRef(new Set<string>());
    const stopPreview = useCallback((demonstrationId?: string, generation?: number) => {
        if (player.stop(demonstrationId, generation)) setActivePreview(null);
    }, [player]);
    const activatePreview = (entry: Demonstration, explicit: boolean) => {
        const asset = demonstrationMotionAssets[entry.id];
        if (!asset) return;
        const presence = entryPresence.current.get(entry.id);
        if (presence) presence.autoPlayed = true;
        const activation = player.activate(entry.id, asset, explicit);
        if (explicit) completedPreviews.current.delete(entry.id);
        setActivePreview(activation);
    };

    useEffect(() => {
        const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        if (!media) return;
        const update = () => {
            setReducedMotion(media.matches);
            if (media.matches) stopPreview();
        };
        media.addEventListener?.('change', update);
        return () => media.removeEventListener?.('change', update);
    }, []);

    useEffect(() => () => { player.stop(); }, [player]);
    const {demonstrations, families} = getDemonstrationCatalog();
    const filtered = useMemo(() => {
        const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
        return demonstrations.filter(entry => {
            if (topic && entry.family !== topic) return false;
            const family = families.find(item => item.id === entry.family)!;
            const haystack = normalize(`${entry.catalogTitle} ${family.title} ${investigation(entry, t)}`);
            return terms.every(term => haystack.includes(term));
        });
    }, [demonstrations, families, query, t, topic]);

    useEffect(() => {
        if (activePreview && !filtered.some(entry => entry.id === activePreview.demonstrationId)) {
            stopPreview(activePreview.demonstrationId, activePreview.generation);
        }
    }, [activePreview, filtered, stopPreview]);

    const labels = {
        graph: t('open_demonstration'),
        lesson: t('guided_lesson'),
        open: t('open'),
        guided: t('guided_path_short'),
    };

    const select = (entry: Demonstration, lesson: boolean) => onSelect?.(entry, lesson);
    const action = (entry: Demonstration, lesson: boolean, children: React.ReactNode) => {
        const target = lesson ? `${entry.path}?learn=1` : entry.path;
        const state = getNavigationState ? getNavigationState(entry, lesson) : navigationState;
        const label = `${lesson ? labels.lesson : labels.graph}: ${entry.catalogTitle}`;
        const className = `demonstrations-catalog-action ${lesson ? 'demonstrations-catalog-lesson' : 'demonstrations-catalog-graph'}`;
        const content = <><span className="demonstrations-catalog-action-label">{children}</span></>;
        return mode === 'picker' && onSelect
            ? <button id={`demonstration-card-${entry.id}-${lesson ? 'lesson' : 'graph'}`} type="button" className={className} aria-label={label} onClick={() => select(entry, lesson)}>{content}</button>
            : <Link id={`demonstration-card-${entry.id}-${lesson ? 'lesson' : 'graph'}`} className={className} to={target} state={state}
                aria-label={label} onClick={event => {
                    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && onSelect) {
                        event.preventDefault();
                        onSelect(entry, lesson);
                    }
                }}>{content}</Link>;
    };

    const graphTarget = (entry: Demonstration, children: React.ReactNode) => mode === 'picker' && onSelect
        ? <button type="button" className="demonstration-card-open" aria-label={`${labels.graph}: ${entry.catalogTitle}`}
            onClick={() => select(entry, false)}>{children}</button>
        : <Link className="demonstration-card-open" to={entry.path}
            state={getNavigationState ? getNavigationState(entry, false) : navigationState} aria-label={`${labels.graph}: ${entry.catalogTitle}`}
            onClick={event => {
                if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && onSelect) {
                    event.preventDefault();
                    onSelect(entry, false);
                }
            }}>{children}</Link>;

    return <section className={`demonstration-collection ${className}`} aria-label={t('all_demonstrations')}>
        <div className="demonstration-collection-tools">
            <label className="demonstration-search-label" htmlFor="demonstration-search">{t('catalog_search_label')}</label>
            <div className="demonstration-search-row">
                <input id="demonstration-search" ref={searchInputRef} type="search" value={query}
                    placeholder={t('catalog_search_placeholder')} onChange={event => onQueryChange(event.currentTarget.value)}/>
                {query && <button type="button" onClick={() => onClearQuery ? onClearQuery() : onQueryChange('')}>{t('catalog_clear_query')}</button>}
            </div>
            <p className="demonstration-result-count" role="status" aria-live="polite">
                {t('catalog_result_count', {value0: filtered.length, value1: demonstrations.length})}
            </p>
            <div className="demonstration-mobile-topic">
                <label htmlFor="demonstration-topic-select">{t('catalog_topic_label')}</label>
                <select id="demonstration-topic-select" value={topic ?? ''}
                    onChange={event => onTopicChange(event.currentTarget.value ? event.currentTarget.value as FamilyId : null)}>
                    <option value="">{t('catalog_all_topics')}</option>
                    {families.map(family => <option key={family.id} value={family.id}>{family.title} ({family.demonstrations.length})</option>)}
                </select>
            </div>
        </div>
        <div className="demonstration-collection-layout">
            <nav className="demonstration-topics" aria-label={t('catalog_topic_label')}>
                <button type="button" aria-pressed={topic === null} onClick={() => onTopicChange(null)}>
                    <span>{t('catalog_all_topics')}</span><span>{demonstrations.length}</span>
                </button>
                {families.map(family => <button type="button" key={family.id} aria-pressed={topic === family.id}
                    onClick={() => onTopicChange(family.id)}>
                    <span>{family.title}</span><span>{family.demonstrations.length}</span>
                </button>)}
            </nav>
            <div className="demonstration-results">
                {filtered.length ? <ul className="demonstrations-catalog-grid">
                    {filtered.map((entry, index) => {
                        const family = families.find(item => item.id === entry.family)!;
                        const current = currentDemonstrationId === entry.id;
                        const motion = demonstrationMotionAssets[entry.id];
                        const active = activePreview?.demonstrationId === entry.id;
                        const activation = active ? activePreview : null;
                        let presence = entryPresence.current.get(entry.id);
                        if (!presence) {
                            presence = {focused: false, pointer: false, touchPointer: false, autoPlayed: false};
                            entryPresence.current.set(entry.id, presence);
                        }
                        const enterAutomatically = () => {
                            if (!completedPreviews.current.has(entry.id)
                                && shouldAutomaticallyPlayPreview(reducedMotion, Boolean(motion), presence.autoPlayed)) {
                                presence.autoPlayed = true;
                                activatePreview(entry, false);
                            }
                        };
                        const resetAutomaticEntry = () => {
                            if (!presence.focused && !presence.pointer) presence.autoPlayed = false;
                        };
                        return <li className="demonstrations-catalog-card" id={`demonstration-card-${entry.id}`} key={entry.id}
                            onPointerDown={event => { presence.touchPointer = event.pointerType === 'touch'; }}
                            onPointerEnter={event => { presence.pointer = true; presence.touchPointer = event.pointerType === 'touch'; if (!presence.touchPointer) enterAutomatically(); }}
                            onPointerLeave={event => {
                                const touch = presence.touchPointer || event.pointerType === 'touch';
                                presence.pointer = false;
                                presence.touchPointer = false;
                                resetAutomaticEntry();
                                if (!touch) stopPreview(entry.id);
                            }}
                            onFocusCapture={event => {
                                presence.focused = true;
                                if (!presence.touchPointer && !(event.target instanceof Element && event.target.classList.contains('demonstration-preview-control'))) {
                                    enterAutomatically();
                                }
                            }}
                            onBlurCapture={event => {
                                if (isFocusLeavingPreviewCard(target => event.currentTarget.contains(target as Node | null), event.relatedTarget)) {
                                    presence.focused = false;
                                    resetAutomaticEntry();
                                    stopPreview(entry.id);
                                }
                            }}>
                            <div className="demonstration-preview-stage">
                                {graphTarget(entry, <DemonstrationPreview src={demonstrationPreviewAssets[entry.id]} loading={index < 3 ? 'eager' : 'lazy'}/>)}
                                {activation && <DemonstrationMotionVideo key={activation.generation} activation={activation} player={player}
                                    onStop={stopPreview} onComplete={() => {
                                        completedPreviews.current.add(entry.id);
                                        stopPreview(entry.id, activation.generation);
                                    }}/>
                                }
                                {motion && <button type="button" className="demonstration-preview-control"
                                    aria-label={`${t(active ? 'catalog_preview_stop' : completedPreviews.current.has(entry.id) ? 'catalog_preview_replay' : 'catalog_preview_play', {value0: entry.catalogTitle})}`}
                                    aria-pressed={active} onClick={() => {
                                        presence.touchPointer = false;
                                        if (active) stopPreview(entry.id, activation?.generation);
                                        else activatePreview(entry, true);
                                    }}>
                                    {t(active ? 'catalog_preview_stop_short' : completedPreviews.current.has(entry.id) ? 'catalog_preview_replay_short' : 'catalog_preview_play_short')}
                                </button>}
                            </div>
                            <div className="demonstrations-catalog-copy">
                                <span className="demonstrations-catalog-family">{family.title}</span>
                                <h2 className="demonstrations-catalog-title">{graphTarget(entry, entry.catalogTitle)}</h2>
                                <p>{investigation(entry, t)}</p>
                            </div>
                            {current && <span className="demonstrations-current-marker" aria-label={t('library_current', {value0: entry.catalogTitle})}>
                                {t('catalog_current')}
                            </span>}
                            <div className="demonstrations-catalog-actions">
                                {action(entry, false, labels.open)}
                                {isGuidedLessonAvailable(entry.id) && action(entry, true, labels.guided)}
                            </div>
                        </li>;
                    })}
                </ul> : <div className="demonstrations-no-results">
                    <h2>{t('catalog_no_results')}</h2>
                    <p>{t('catalog_no_results_detail', {value0: topic ? families.find(item => item.id === topic)?.title ?? '' : t('catalog_all_topics')})}</p>
                    {query && <button type="button" onClick={() => onClearQuery ? onClearQuery() : onQueryChange('')}>{t('catalog_clear_query')}</button>}
                    {topic && <button type="button" onClick={() => onTopicChange(null)}>{t('catalog_broaden_topics')}</button>}
                </div>}
            </div>
        </div>
    </section>;
}

function DemonstrationMotionVideo({activation, player, onStop, onComplete}: {
    activation: DemonstrationPreviewActivation;
    player: DemonstrationPreviewPlayer;
    onStop: (demonstrationId?: string, generation?: number) => void;
    onComplete: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [frameReady, setFrameReady] = useState(false);
    const {demonstrationId, generation, asset} = activation;

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !player.isCurrent(demonstrationId, generation)) return;
        void playPreviewSafely(player, activation, () => Promise.resolve(video.play()), () => onStop(demonstrationId, generation));
        return () => video.pause();
    }, [demonstrationId, generation, onStop, player]);

    useEffect(() => {
        const card = videoRef.current?.closest('.demonstrations-catalog-card');
        if (!card) return;
        const cancel = () => {
            if (document.visibilityState === 'hidden' || !player.isCurrent(demonstrationId, generation)) {
                onStop(demonstrationId, generation);
            }
        };
        document.addEventListener('visibilitychange', cancel);
        const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
            if (entries.some(entry => !entry.isIntersecting)) onStop(demonstrationId, generation);
        });
        observer?.observe(card);
        return () => {
            document.removeEventListener('visibilitychange', cancel);
            observer?.disconnect();
        };
    }, [demonstrationId, generation, onStop, player]);

    const current = () => player.isCurrent(demonstrationId, generation);
    return <video ref={videoRef} className={`demonstration-preview-video${frameReady ? ' is-frame-ready' : ''}`}
        muted playsInline preload="none" aria-hidden="true" tabIndex={-1}
        onLoadedData={() => { if (current()) setFrameReady(true); }}
        onEnded={() => { if (current()) onComplete(); }}
        onError={() => { if (current()) onStop(demonstrationId, generation); }}>
        <source src={asset.src} type={asset.type}/>
    </video>;
}
