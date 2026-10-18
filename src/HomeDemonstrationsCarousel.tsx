import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {getDemonstrationCatalog} from './demonstrations';
import type {DemonstrationId} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';
import {demonstrationMotionAssets} from './demonstrationMotionAssets';
import {DemonstrationPreview} from './DemonstrationPreview';
import {isGuidedLessonAvailable} from './learning/runtime/lessonCatalog';
import {useT} from './localization';
import './HomeDemonstrationsCarousel.css';

type Catalog = ReturnType<typeof getDemonstrationCatalog>;
type OpeningEntry = {demonstration: Catalog['demonstrations'][number]; family: Catalog['families'][number]};
const openingDemonstrationIds: readonly DemonstrationId[] = [
    'bezier', 'bernstein', 'rational', 'spline-c1', 'ph-cubic', 'derivative',
];

function getOpeningEntries(demonstrations: Catalog['demonstrations'], families: Catalog['families']): OpeningEntry[] {
    return openingDemonstrationIds.flatMap(id => {
        const demonstration = demonstrations.find(entry => entry.id === id);
        const family = demonstration && families.find(entry => entry.id === demonstration.family);
        return demonstration && family ? [{demonstration, family}] : [];
    });
}

export function HomeDemonstrationsCarousel() {
    const {demonstrations, families} = getDemonstrationCatalog();
    const entries = getOpeningEntries(demonstrations, families);
    return <DemonstrationsOpeningCarousel entries={entries}/>;
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

    return <div className="home-demonstrations-carousel demonstrations-opening" ref={carouselRef}
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
            <div className="demonstrations-opening-image-stage" data-reduced-motion={prefersReducedMotion}>
                {entries.map((entry, index) => <div key={entry.demonstration.id}
                    className="demonstrations-opening-image"
                    data-selected={selectedIndex === index}
                    aria-hidden="true">
                    <DemonstrationPreview src={demonstrationPreviewAssets[entry.demonstration.id]}
                        motion={selectedIndex === index ? demonstrationMotionAssets[entry.demonstration.id] : undefined}
                        loading={index < 3 ? 'eager' : 'lazy'} focusTargetRef={graphActionRef}/>
                </div>)}
            </div>
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
