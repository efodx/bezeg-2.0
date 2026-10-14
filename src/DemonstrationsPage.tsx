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
            onWheel={event => {
                // Vertical wheel input scrolls the page, not the row; shift+wheel scrolls the row horizontally.
                const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
                    || (event.shiftKey && event.deltaY !== 0);
                if (horizontal) setManuallyControlled(true);
            }}
            onPointerDown={() => setManuallyControlled(true)}
            onTouchStart={() => setManuallyControlled(true)}>
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
                    <span className="demonstrations-opening-choice-title">{entry.demonstration.catalogTitle}</span>
                    <span className="demonstrations-opening-family">{entry.family.title}</span>
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

function CatalogRoutePreview({id}: {id: DemonstrationId}) {
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
    const openActionLabel = t('open');
    const guidedPathLabel = t('guided_path_short');

    return <main className="demonstrations-page">
        <svg className="demonstrations-botanical" viewBox="0 0 420 360" aria-hidden="true" focusable="false">
            <g className="demonstrations-botanical-stems">
                <path d="M410 358C367 279 327 207 278 157S203 69 170 7"/>
                <path d="M278 157C313 120 350 96 402 83M326 207C364 193 391 170 416 137"/>
                <path d="M237 108C204 91 164 76 122 42M266 140C265 95 259 51 253 7"/>
                <path d="M356 271C386 250 402 226 414 198M205 74C174 68 145 69 111 77"/>
            </g>
            <g className="demonstrations-botanical-leaves">
                <path d="M331 204C327 164 346 137 387 119C384 162 366 190 331 204Z"/>
                <path d="M350 257C343 219 359 192 397 174C398 211 381 240 350 257Z"/>
                <path d="M273 151C284 111 312 94 355 96C337 131 309 150 273 151Z"/>
                <path d="M232 106C192 105 164 84 146 46C186 53 216 73 232 106Z"/>
                <path d="M265 129C239 101 234 68 250 30C273 63 280 96 265 129Z"/>
                <path d="M201 76C166 96 134 91 99 66C136 49 170 51 201 76Z"/>
                <path d="M380 293C388 263 408 245 437 239C430 269 411 289 380 293Z"/>
            </g>
            <g className="demonstrations-botanical-flowers">
                <g transform="translate(394 80)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-4" r="4"/><circle cx="9" cy="-7" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-13" r="4"/><circle cx="14" cy="2" r="4"/><circle cx="-15" cy="4" r="4"/></g>
                <g transform="translate(416 131)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="8" cy="-8" r="4"/><circle cx="-8" cy="8" r="4"/><circle cx="9" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                <g transform="translate(252 8)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                <g transform="translate(168 8)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                <g transform="translate(105 77)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
            </g>
        </svg>
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
                                    {familyIllustrations[family.id] && <img src={familyIllustrations[family.id]} width="180" height="130" alt="" loading="lazy"/>}
                                    <span className="demonstrations-topic-title">
                                        <span className="demonstrations-topic-family">{family.title}</span>
                                        <span className="demonstrations-number">{String(i + 1).padStart(2, '0')} · {demonstrationCount(family.demonstrations.length)}</span>
                                    </span>
                                    <span className="demonstrations-topic-mark" aria-hidden="true">{expanded ? '−' : '+'}</span>
                                </button>
                            </h3>
                        </header>
                        <div id={panelId} className="demonstrations-topic-panel" role="region" aria-labelledby={headingId} hidden={!expanded}>
                            <ul className="demonstrations-catalog-grid">
                                {family.demonstrations.map(demonstration => <li className="demonstrations-catalog-card" key={demonstration.id}>
                                    <CatalogRoutePreview id={demonstration.id}/>
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
                                                <span className="demonstrations-catalog-action-label">{openActionLabel}</span>
                                            </Link>
                                            {isGuidedLessonAvailable(demonstration.id) && <Link className="demonstrations-catalog-action demonstrations-catalog-lesson"
                                                to={demonstration.path + '?learn=1'}
                                                aria-label={lessonLabel + ': ' + demonstration.catalogTitle}
                                                data-tooltip={lessonTooltipLabel + ': ' + demonstration.catalogTitle}>
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                    <path d="M12 6.2c-2.1-1.7-4.7-2-8-1.1v13c3.2-.9 5.9-.6 8 1.1m0-13c2.1-1.7 4.7-2 8-1.1v13c-3.2-.9-5.9-.6-8 1.1m0-13v13"/>
                                                    <path d="M7 9h2.5M7 12h2.5m5-3H17m-2.5 3H17"/>
                                                </svg>
                                                <span className="demonstrations-catalog-action-label">{guidedPathLabel}</span>
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
