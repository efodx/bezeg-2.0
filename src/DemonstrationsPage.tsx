import React, {useContext, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {getDemonstrationCatalog} from './demonstrations';
import type {DemonstrationId, FamilyId} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';
import {isGuidedLessonAvailable} from './learning/runtime/lessonCatalog';
import {SiteContext} from './graphs/context/react/SiteContext';
import {t, useT} from './localization';
import './DemonstrationsPage.css';
import familyBasics from './images/demonstrations/family-basics.svg';
import familyBezier from './images/demonstrations/family-bezier.svg';
import familyRational from './images/demonstrations/family-rational.svg';
import familySpline from './images/demonstrations/family-spline.svg';
import familyPh from './images/demonstrations/family-ph.svg';
import familyParam from './images/demonstrations/family-param.svg';
import familyFunctions from './images/demonstrations/family-functions.svg';

const familyIllustrations: Record<FamilyId, string> = {
    basics: familyBasics,
    '/bezeg-2.0/bezier': familyBezier,
    '/bezeg-2.0/rational': familyRational,
    '/bezeg-2.0/spline': familySpline,
    '/bezeg-2.0/ph': familyPh,
    '/bezeg-2.0/param': familyParam,
    '/bezeg-2.0/functions': familyFunctions,
};
const openingDemonstrationIds: readonly DemonstrationId[] = [
    'bezier', 'bernstein', 'rational', 'spline-c1', 'ph-cubic', 'derivative',
];

type Catalog = ReturnType<typeof getDemonstrationCatalog>;
type OpeningEntry = {demonstration: Catalog['demonstrations'][number]; family: Catalog['families'][number]};

function getOpeningEntries(demonstrations: Catalog['demonstrations'], families: Catalog['families']): OpeningEntry[] {
    return openingDemonstrationIds.flatMap(id => {
        const demonstration = demonstrations.find(entry => entry.id === id);
        const family = demonstration && families.find(entry => entry.id === demonstration.family);
        return demonstration && family ? [{demonstration, family}] : [];
    });
}

function usePrefersReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setPrefersReducedMotion(query.matches);
        update();
        if (query.addEventListener) {
            query.addEventListener('change', update);
            return () => query.removeEventListener('change', update);
        }
        query.addListener(update);
        return () => query.removeListener(update);
    }, []);

    return prefersReducedMotion;
}

function DemonstrationsOpeningCarousel({entries}: {entries: OpeningEntry[]}) {
    const t = useT();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [manuallyControlled, setManuallyControlled] = useState(false);
    const [announceManualChanges, setAnnounceManualChanges] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
    const [inViewport, setInViewport] = useState(true);
    const prefersReducedMotion = usePrefersReducedMotion();
    const carouselRef = useRef<HTMLDivElement>(null);
    const choiceRailRef = useRef<HTMLDivElement>(null);
    const choiceButtons = useRef<Array<HTMLButtonElement | null>>([]);
    const graphActionRef = useRef<HTMLAnchorElement>(null);
    const lessonActionRef = useRef<HTMLAnchorElement>(null);
    const revealIndex = useRef<number | null>(null);
    const selectedEntry = entries[selectedIndex];

    useEffect(() => {
        const updateVisibility = () => setPageVisible(!document.hidden);
        document.addEventListener('visibilitychange', updateVisibility);
        return () => document.removeEventListener('visibilitychange', updateVisibility);
    }, []);

    useEffect(() => {
        const carousel = carouselRef.current;
        if (!carousel || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(changes => {
            const change = changes[0];
            if (change) setInViewport(change.isIntersecting);
        }, {threshold: 0});
        observer.observe(carousel);
        return () => observer.disconnect();
    }, []);

    const canAdvance = entries.length > 1 && !prefersReducedMotion && !manuallyControlled
        && !hovered && !focused && pageVisible && inViewport;

    useEffect(() => {
        if (!canAdvance) return;
        const timer = window.setTimeout(() => {
            setSelectedIndex(index => (index + 1) % entries.length);
        }, 6000);
        return () => window.clearTimeout(timer);
    }, [canAdvance, entries.length, selectedIndex]);

    useLayoutEffect(() => {
        if (revealIndex.current !== selectedIndex) return;
        revealIndex.current = null;
        const rail = choiceRailRef.current;
        const choice = choiceButtons.current[selectedIndex];
        if (!rail || !choice) return;
        const railBounds = rail.getBoundingClientRect();
        const choiceBounds = choice.getBoundingClientRect();
        const visibleLeft = railBounds.left + rail.clientLeft;
        const visibleRight = visibleLeft + rail.clientWidth;
        const scrollLeft = choiceBounds.left < visibleLeft
            ? rail.scrollLeft + choiceBounds.left - visibleLeft
            : choiceBounds.right > visibleRight
                ? rail.scrollLeft + choiceBounds.right - visibleRight
                : rail.scrollLeft;
        if (scrollLeft !== rail.scrollLeft) {
            if (typeof rail.scrollTo === 'function') {
                rail.scrollTo({left: scrollLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth'});
            } else {
                rail.scrollLeft = scrollLeft;
            }
        }
    }, [prefersReducedMotion, selectedIndex]);

    if (!selectedEntry) return null;

    const selectManually = (index: number, focusChoice = false) => {
        setManuallyControlled(true);
        setAnnounceManualChanges(true);
        revealIndex.current = index;
        setSelectedIndex(index);
        if (focusChoice) choiceButtons.current[index]?.focus({preventScroll: true});
    };
    const selectRelative = (amount: number, focusChoice = false) => {
        const nextIndex = (selectedIndex + amount + entries.length) % entries.length;
        selectManually(nextIndex, focusChoice);
    };

    return <div className="demonstrations-opening" ref={carouselRef}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={event => {
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setFocused(false);
        }}
        onKeyDown={event => {
            if (event.altKey || event.ctrlKey || event.metaKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
            event.preventDefault();
            const target = event.target;
            const choiceButton = target instanceof HTMLElement
                ? target.closest<HTMLButtonElement>('[data-demonstration-index]') : null;
            const focusedIndex = choiceButton ? Number(choiceButton.dataset.demonstrationIndex) : selectedIndex;
            const baseIndex = Number.isInteger(focusedIndex) && focusedIndex >= 0 && focusedIndex < entries.length
                ? focusedIndex : selectedIndex;
            const nextIndex = (baseIndex + (event.key === 'ArrowLeft' ? -1 : 1) + entries.length) % entries.length;
            const fromLessonAction = target instanceof Node && Boolean(lessonActionRef.current?.contains(target));
            if (fromLessonAction && !isGuidedLessonAvailable(entries[nextIndex].demonstration.id)) {
                graphActionRef.current?.focus({preventScroll: true});
            }
            selectManually(nextIndex, choiceButton !== null);
        }}>
        <article className="demonstrations-opening-preview"
            aria-live={announceManualChanges ? 'polite' : 'off'} aria-atomic="true">
            <img key={selectedEntry.demonstration.id} className="demonstrations-opening-image"
                src={demonstrationPreviewAssets[selectedEntry.demonstration.id]}
                alt="" width="360" height="220"/>
            <div className="demonstrations-opening-copy">
                <span className="demonstrations-opening-family">{selectedEntry.family.title}</span>
                <h3>{selectedEntry.demonstration.catalogTitle}</h3>
                <p>{selectedEntry.demonstration.prompts[0]}</p>
                <span className="demonstrations-opening-actions">
                    <Link ref={graphActionRef} to={selectedEntry.demonstration.path}
                        aria-label={`${t('open_demonstration')}: ${selectedEntry.demonstration.catalogTitle}`}
                        data-tooltip={`${t('try_and_observe')}: ${selectedEntry.demonstration.catalogTitle}`}>
                        {t('open_demonstration')} <span aria-hidden="true">→</span>
                    </Link>
                    {isGuidedLessonAvailable(selectedEntry.demonstration.id) && <Link ref={lessonActionRef}
                        className="demonstrations-opening-lesson"
                        to={`${selectedEntry.demonstration.path}?learn=1`}
                        aria-label={`${t('guided_lesson')}: ${selectedEntry.demonstration.catalogTitle}`}
                        data-tooltip={`${t('learn_this_demonstration')}: ${selectedEntry.demonstration.catalogTitle}`}>
                        {t('guided_lesson')} <span aria-hidden="true">→</span>
                    </Link>}
                </span>
            </div>
        </article>
        <div className="demonstrations-opening-controls">
            <button type="button" onClick={() => selectRelative(-1)}
                aria-label={`${t('back')}: ${entries[(selectedIndex - 1 + entries.length) % entries.length].demonstration.catalogTitle}`}>
                <span aria-hidden="true">←</span>
            </button>
            <span aria-hidden="true">{selectedIndex + 1} / {entries.length}</span>
            <button type="button" onClick={() => selectRelative(1)}
                aria-label={`${t('next')}: ${entries[(selectedIndex + 1) % entries.length].demonstration.catalogTitle}`}>
                <span aria-hidden="true">→</span>
            </button>
        </div>
        <div className="demonstrations-opening-rail" ref={choiceRailRef}
            role="group" aria-label={t('starting_demonstrations')}
            onScroll={() => setManuallyControlled(true)}>
            {entries.map((entry, index) => <button key={entry.demonstration.id}
                ref={button => { choiceButtons.current[index] = button; }}
                type="button" className="demonstrations-opening-choice"
                data-demonstration-index={index}
                aria-label={`${entry.family.title}: ${entry.demonstration.catalogTitle}`}
                title={`${entry.family.title}: ${entry.demonstration.catalogTitle}`}
                aria-pressed={selectedIndex === index}
                onClick={() => selectManually(index)}>
                <span className="demonstrations-opening-choice-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="demonstrations-opening-choice-copy">
                    <span className="demonstrations-opening-family">{entry.family.title}</span>
                    <span className="demonstrations-opening-choice-title">{entry.demonstration.catalogTitle}</span>
                </span>
            </button>)}
        </div>
    </div>;
}

function demonstrationCount(count: number) {
    const remainder = count % 100;
    const key = remainder === 1 ? 'demonstration_count_one' : remainder === 2 ? 'demonstration_count_two'
        : remainder === 3 || remainder === 4 ? 'demonstration_count_few' : 'demonstration_count_many';
    return t(key, {value0: count});
}

type PreviewPoint = {x: number; y: number};
type PreviewHomogeneousPoint = PreviewPoint & {w: number};

function previewControlPath(points: readonly PreviewPoint[]): string {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

function elevatePreviewControls(points: readonly PreviewHomogeneousPoint[]): PreviewHomogeneousPoint[] {
    const degree = points.length - 1;
    const interpolate = (a: PreviewHomogeneousPoint, b: PreviewHomogeneousPoint, t: number): PreviewHomogeneousPoint => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        w: a.w + (b.w - a.w) * t,
    });
    return [points[0], ...points.slice(1).map((point, index) => {
        const i = index + 1;
        return interpolate(points[i - 1], point, 1 - i / (degree + 1));
    }), points[degree]];
}

function rationalPreviewPath(points: readonly PreviewHomogeneousPoint[]): string {
    const pathPoints = Array.from({length: 45}, (_, sample) => {
        const t = sample / 44;
        let row = points.map(point => ({...point}));
        while (row.length > 1) {
            const current = row;
            row = current.slice(0, -1).map((point, index) => ({
                x: point.x + (current[index + 1].x - point.x) * t,
                y: point.y + (current[index + 1].y - point.y) * t,
                w: point.w + (current[index + 1].w - point.w) * t,
            }));
        }
        return {x: row[0].x / row[0].w, y: row[0].y / row[0].w};
    });
    return previewControlPath(pathPoints);
}

function CatalogSchematicPreview({id}: {id: DemonstrationId}) {
    if (id === 'spline-g1-symmetric') {
        const controls = [
            {x: 35, y: 65}, {x: 58, y: 158}, {x: 130, y: 142}, {x: 180, y: 110},
            {x: 230, y: 78}, {x: 302, y: 62}, {x: 325, y: 155},
        ];
        return <svg className="demonstrations-catalog-preview demonstrations-catalog-svg-preview" width="360" height="220"
            viewBox="0 0 360 220" aria-hidden="true" focusable="false" data-preview-schematic={id}>
            <path className="demonstrations-preview-axis" d="M180 20V200"/>
            <path className="demonstrations-preview-control" d={previewControlPath(controls)}/>
            <path className="demonstrations-preview-spline-secondary" d="M35 65C58 158 130 142 180 110"/>
            <path className="demonstrations-preview-spline" d="M180 110C230 78 302 62 325 155"/>
            {controls.map((point, index) => <circle key={index}
                className={index === 3 ? 'demonstrations-preview-join' : 'demonstrations-preview-point'}
                cx={point.x} cy={point.y} r={index === 0 || index === controls.length - 1 ? 4 : 3}/>) }
        </svg>;
    }

    if (id === 'rational-elevation') {
        const source = [
            {x: 36, y: 174, w: 1}, {x: 200, y: 76, w: 2},
            {x: 260, y: 38, w: 1}, {x: 324, y: 174, w: 1},
        ];
        const original = source.map(point => ({x: point.x / point.w, y: point.y / point.w}));
        const elevated = elevatePreviewControls(source).map(point => ({x: point.x / point.w, y: point.y / point.w}));
        const curve = rationalPreviewPath(source);
        return <svg className="demonstrations-catalog-preview demonstrations-catalog-svg-preview" width="360" height="220"
            viewBox="0 0 360 220" aria-hidden="true" focusable="false" data-preview-schematic={id}>
            <path className="demonstrations-preview-axis" d="M24 190H340 M34 202V18"/>
            <path className="demonstrations-preview-elevation-before" d={previewControlPath(original)}/>
            <path className="demonstrations-preview-elevation-after" d={previewControlPath(elevated)}/>
            <path className="demonstrations-preview-rational-curve" d={curve}/>
            {original.map((point, index) => <circle key={`source-${index}`} className="demonstrations-preview-point"
                cx={point.x} cy={point.y} r="3"/>) }
            {elevated.map((point, index) => <circle key={`elevated-${index}`} className="demonstrations-preview-elevated-point"
                cx={point.x} cy={point.y} r="2.8"/>) }
        </svg>;
    }

    return <img className="demonstrations-catalog-preview" src={demonstrationPreviewAssets[id]}
        width="360" height="220" alt="" loading="lazy"/>;
}

export function DemonstrationsPage() {
    const t = useT();
    const {setFullScreen} = useContext(SiteContext).fullScreen;
    useEffect(() => {setFullScreen(false);}, [setFullScreen]);
    const {demonstrations, families} = getDemonstrationCatalog();
    const openingEntries = getOpeningEntries(demonstrations, families);
    const [expandedFamilies, setExpandedFamilies] = useState<Set<FamilyId>>(() =>
        new Set(families[0] ? [families[0].id] : []));
    const openGraphLabel = t('open_demonstration');
    const graphTooltipLabel = t('try_and_observe');
    const lessonLabel = t('guided_lesson');
    const lessonTooltipLabel = t('learn_this_demonstration');

    return <main className="demonstrations-page">
        <header><span className="demonstrations-eyebrow">{t('bezeg_explore_curves')}</span>
            <h1>{t('demonstrations')}</h1><p>{t('choose_demonstration')}</p></header>
        <section aria-labelledby="starting-demonstrations">
            <h2 id="starting-demonstrations">{t('starting_demonstrations')}</h2>
            <DemonstrationsOpeningCarousel entries={openingEntries}/>
        </section>
        <section aria-labelledby="all-demonstrations">
            <div className="demonstrations-catalog-heading"><div><h2 id="all-demonstrations">{t('all_demonstrations')}</h2>
                <p>{t('explore_by_topic')}</p></div>
                <span>{t('catalog_summary', {value0: families.length, value1: demonstrations.length})}</span></div>
            <div className="demonstrations-families">
                {families.map((family, i) => {
                    const expanded = expandedFamilies.has(family.id);
                    const headingId = 'demonstration-family-heading-' + i;
                    const panelId = 'demonstration-family-panel-' + i;
                    return <section className={'demonstrations-topic' + (expanded ? ' is-expanded' : '')} key={family.id}>
                        <header className="demonstrations-topic-heading">
                            <h3 id={headingId}>
                                <button className="demonstrations-topic-toggle" type="button" aria-expanded={expanded} aria-controls={panelId}
                                    onClick={() => setExpandedFamilies(current => {
                                        const next = new Set(current);
                                        if (next.has(family.id)) next.delete(family.id);
                                        else next.add(family.id);
                                        return next;
                                    })}>
                                    <span className="demonstrations-topic-title">
                                        <span className="demonstrations-number">{String(i + 1).padStart(2, '0')} · {demonstrationCount(family.demonstrations.length)}</span>
                                        <span>{family.title}</span>
                                    </span>
                                    {familyIllustrations[family.id] && <img src={familyIllustrations[family.id]} width="180" height="130" alt="" loading="lazy"/>}
                                    <span className="demonstrations-topic-mark" aria-hidden="true">{expanded ? '−' : '+'}</span>
                                </button>
                            </h3>
                        </header>
                        <div id={panelId} className="demonstrations-topic-panel" role="region" aria-labelledby={headingId} hidden={!expanded}>
                            <ul className="demonstrations-catalog-grid">
                                {family.demonstrations.map(demonstration => <li className="demonstrations-catalog-card" key={demonstration.id}>
                                    <CatalogSchematicPreview id={demonstration.id}/>
                                    <div className="demonstrations-catalog-entry-row">
                                        <span className="demonstrations-catalog-title">{demonstration.catalogTitle}</span>
                                        <span className="demonstrations-catalog-actions">
                                            <Link className="demonstrations-catalog-action demonstrations-catalog-graph" to={demonstration.path}
                                                aria-label={openGraphLabel + ': ' + demonstration.catalogTitle}
                                                data-tooltip={graphTooltipLabel + ': ' + demonstration.catalogTitle}>
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                    <path d="M4 19.5h16M5 18V5.5M7 15l4-4 3 2 5-6"/>
                                                    <path d="M16 7h3v3"/>
                                                </svg>
                                            </Link>
                                            {isGuidedLessonAvailable(demonstration.id) && <Link className="demonstrations-catalog-action demonstrations-catalog-lesson"
                                                to={demonstration.path + '?learn=1'}
                                                aria-label={lessonLabel + ': ' + demonstration.catalogTitle}
                                                data-tooltip={lessonTooltipLabel + ': ' + demonstration.catalogTitle}>
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                    <path d="M12 6.2c-2.1-1.7-4.7-2-8-1.1v13c3.2-.9 5.9-.6 8 1.1m0-13c2.1-1.7 4.7-2 8-1.1v13c-3.2-.9-5.9-.6-8 1.1m0-13v13"/>
                                                    <path d="M7 9h2.5M7 12h2.5m5-3H17m-2.5 3H17"/>
                                                </svg>
                                            </Link>}
                                        </span>
                                    </div>
                                </li>)}
                            </ul>
                        </div>
                    </section>;
                })}
            </div>
            <p className="demonstrations-art-note">{t('topic_illustrations_note')}</p>
        </section>
    </main>;
}
