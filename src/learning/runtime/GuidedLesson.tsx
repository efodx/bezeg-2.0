import React, {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useLanguage, useT, Language, t, LocalizedError, message} from '../../localization';
import {framesForLessonStep} from '../model';
import type {LessonAnimationCommand, LessonDefinition, LessonFrame, LessonGraphCapabilities} from '../model';
import {LessonSession, LessonSessionSnapshot} from './LessonSession';
import {typesetMath} from '../../mathjax/loadMathJax';
import {useDraggableOffset} from './useDraggableOffset';
import './GuidedLesson.css';
import './GuidedLessonLayout.css';

function localized(value: {sl: string; en: string}, language: Language) {
    return value[language];
}

type LessonMode = 'content' | 'explore' | 'complete' | 'closed';
type LessonOverlayPhase = 'visible' | 'closing' | 'hidden' | 'opening';
const LESSON_HANDOFF_DURATION_MS = 220;

function frameLabel(frame: LessonFrame) {
    if (frame.kind === 'calculation') return t('guided_lesson_calculation');
    if (frame.kind === 'observation') return t('guided_lesson_observation');
    return t('guided_lesson_explanation');
}

/** The frame controls offered today; iteration commands (`next-step`, `reset`) get controls only when a lesson uses them. */
type FrameAnimationControl = Extract<LessonAnimationCommand, 'play' | 'pause' | 'replay'>;

// Neutral currentColor icons keep playback controls in the workspace's monochrome button style.
const ANIMATION_ICON_PATHS: Record<FrameAnimationControl, React.ReactNode> = {
    play: <path d="M5 3.5v9l7.5-4.5z" fill="currentColor"/>,
    pause: <path d="M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z" fill="currentColor"/>,
    replay: <path d="M12.5 8a4.5 4.5 0 1 1-1.32-3.18M12.5 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
};

function AnimationIcon(props: {command: FrameAnimationControl}) {
    return <svg className="guided-lesson-animation-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        {ANIMATION_ICON_PATHS[props.command]}
    </svg>;
}

function GripIcon() {
    return <svg className="guided-lesson-grip-icon" viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" focusable="false">
        {[3, 8, 13].flatMap(y => [<circle key={`l${y}`} cx="2.5" cy={y} r="1.3" fill="currentColor"/>, <circle key={`r${y}`} cx="7.5" cy={y} r="1.3" fill="currentColor"/>])}
    </svg>;
}

function NavigationArrow(props: {direction: 'back' | 'next'}) {
    const path = props.direction === 'back' ? 'M10.5 3.5 5.5 8l5 4.5M6 8h7' : 'm5.5 3.5 5 4.5-5 4.5M7 8h7';
    return <svg className="guided-lesson-navigation-arrow" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>;
}

const ARROW_KEYS = 'ArrowUp ArrowDown ArrowLeft ArrowRight';

export function GuidedLesson(props: {
    lesson: LessonDefinition;
    capabilities: LessonGraphCapabilities;
    onClose: () => void;
    onModeChange?: (mode: LessonMode) => void;
    registerClose?: (close: (() => void) | undefined) => void;
    registerExit?: (exit: (() => void) | undefined) => void;
    registerGraphActions?: (actions: {animationControls?: React.ReactNode} | undefined) => void;
    visiblePageTitle?: string;
    chapterOwner?: {chapterTitle: string; sectionTitle: string; returnPath: string; returnLabel: string; onReturn: () => void};
}) {
    const {language} = useLanguage();
    const t = useT();
    const pageHeadingHasLessonTitle = !!props.visiblePageTitle
        && props.visiblePageTitle.replace(/\s+/g, ' ').trim() === localized(props.lesson.title, language).replace(/\s+/g, ' ').trim();
    const [startupError, setStartupError] = useState<Error>();
    const [overlayPhase, setOverlayPhase] = useState<LessonOverlayPhase>('visible');
    const [exitRequested, setExitRequested] = useState(false);
    const [exitError, setExitError] = useState(false);
    const layerRef = useRef<HTMLDivElement>(null);
    const lessonRef = useRef<HTMLElement>(null);
    const completionHeadingRef = useRef<HTMLHeadingElement>(null);
    const compactTabRef = useRef<HTMLButtonElement>(null);
    const readingRef = useRef<HTMLDivElement>(null);
    const readingPosition = useRef({panel: 0, outer: 0, page: 0});
    const frameNeedsScrollReset = useRef(true);
    const hasSavedReadingPosition = useRef(false);
    // Hiding or navigating invalidates a pending post-typeset restore of the reading position.
    const readingRestore = useRef(0);
    const latestTypeset = useRef<Promise<unknown>>();
    const positionedSession = useRef<LessonSession>();
    const exitInvoker = useRef<HTMLElement | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const handoffTimer = useRef<number>();
    const animationPlaying = useRef(false);
    // The session is kept in state with the inputs it was built from and replaced when either prop changes.
    // Creating it is side-effect free; starting and closing it belong to the effect below.
    const [held, setHeld] = useState(() => ({lesson: props.lesson, capabilities: props.capabilities, session: new LessonSession(props.lesson, props.capabilities)}));
    let current = held;
    if (held.lesson !== props.lesson || held.capabilities !== props.capabilities) {
        current = {lesson: props.lesson, capabilities: props.capabilities, session: new LessonSession(props.lesson, props.capabilities)};
        setHeld(current);
    }
    const session = current.session;
    useEffect(() => {
        props.registerClose?.(() => session.close({restoreCompleted: true}));
        return () => props.registerClose?.(undefined);
    }, [session, props.registerClose]);
    const snapshot: LessonSessionSnapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
    const step = props.lesson.steps[snapshot.stepIndex];
    const frames = framesForLessonStep(step);
    const frame = frames[Math.min(snapshot.frameIndex, frames.length - 1)];
    const isComplete = snapshot.status === 'complete';
    const isExploring = snapshot.status === 'explore';
    const overlayVisible = overlayPhase !== 'hidden';
    const tabVisible = overlayPhase === 'closing' || overlayPhase === 'hidden';
    // The panel and the compact tab keep where the learner put them over the graph until another lesson starts.
    const panelDrag = useDraggableOffset(layerRef, lessonRef, overlayVisible, props.lesson);
    const [availablePanelHeight, setAvailablePanelHeight] = useState(480);
    const [wideBoard, setWideBoard] = useState(false);
    useLayoutEffect(() => {
        const layer = layerRef.current;
        const panel = lessonRef.current;
        if (!overlayVisible || !layer || !panel) return;
        const update = () => {
            const cardWidth = panel.getBoundingClientRect().width;
            if (cardWidth <= 0) return;
            const isWide = layer.clientWidth >= cardWidth * 2;
            session.setGuidedLessonCardWidth(isWide ? cardWidth : 0);
            setWideBoard(isWide);
        };
        update();
        const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
        observer?.observe(layer);
        observer?.observe(panel);
        return () => observer?.disconnect();
    }, [session, overlayVisible]);
    useEffect(() => {
        const updateAvailableHeight = () => {
            const layer = layerRef.current;
            const panel = lessonRef.current;
            if (!layer || !panel) return;
            const layerBounds = layer.getBoundingClientRect();
            const panelTop = panel.getBoundingClientRect().top;
            const visibleBottom = Math.min(layerBounds.bottom, window.innerHeight);
            setAvailablePanelHeight(Math.max(120, Math.min(760, visibleBottom - panelTop - 12)));
        };
        updateAvailableHeight();
        const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateAvailableHeight);
        if (layerRef.current) observer?.observe(layerRef.current);
        window.addEventListener('resize', updateAvailableHeight);
        window.addEventListener('scroll', updateAvailableHeight, {passive: true});
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', updateAvailableHeight);
            window.removeEventListener('scroll', updateAvailableHeight);
        };
    }, [overlayVisible, panelDrag.offset.x, panelDrag.offset.y]);
    const tabDrag = useDraggableOffset(layerRef, compactTabRef, tabVisible, props.lesson);
    const isMoved = (drag: {offset: {x: number; y: number}}) => drag.offset.x !== 0 || drag.offset.y !== 0;
    // Once either has been moved they travel together: hiding leaves the tab at the panel's corner and
    // reopening opens the panel at the tab, so the instructions come back where they were put away.
    const handOverPlacement = (from: typeof panelDrag, to: typeof panelDrag) => {
        if (!isMoved(panelDrag) && !isMoved(tabDrag)) return;
        const corner = from.topLeft();
        if (corner) to.moveTo(corner);
    };
    // A visible instruction panel locks graph edits; hiding the panel unlocks the current scene.
    const mode: LessonMode = overlayPhase === 'visible' || overlayPhase === 'opening'
        ? isComplete ? 'complete' : 'content'
        : 'explore';
    const onModeChange = props.onModeChange;

    const clearHandoffTimer = () => {
        if (handoffTimer.current !== undefined) {
            window.clearTimeout(handoffTimer.current);
            handoffTimer.current = undefined;
        }
    };

    const animateFrame = (command: FrameAnimationControl) => {
        if (!frame.animation) return;
        session.applyAnimation(frame.animation.animationId, command);
        animationPlaying.current = command !== 'pause';
    };


    const scheduleOverlayPhase = (phase: LessonOverlayPhase) => {
        clearHandoffTimer();
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        if (reducedMotion) {
            setOverlayPhase(phase);
            return;
        }
        handoffTimer.current = window.setTimeout(() => {
            handoffTimer.current = undefined;
            setOverlayPhase(phase);
        }, LESSON_HANDOFF_DURATION_MS);
    };

    const hideOverlay = () => {
        if (readingRef.current) readingPosition.current.panel = readingRef.current.scrollTop;
        if (lessonRef.current) readingPosition.current.outer = lessonRef.current.scrollTop;
        readingPosition.current.page = window.scrollY;
        readingRestore.current += 1;
        hasSavedReadingPosition.current = true;
        handOverPlacement(panelDrag, tabDrag);
        clearHandoffTimer();
        props.onModeChange?.('explore');
        pausePlayback();
        setOverlayPhase('closing');
        scheduleOverlayPhase('hidden');
    };

    const showOverlay = () => {
        clearHandoffTimer();
        if (overlayPhase === 'visible') return;
        handOverPlacement(tabDrag, panelDrag);
        props.onModeChange?.(isComplete ? 'complete' : 'content');
        // Stop graph-owned playback too, including controls started in the inspector.
        pausePlayback();
        setOverlayPhase('opening');
        scheduleOverlayPhase('visible');
    };

    const pausePlayback = () => {
        try {
            if (frame.animation && animationPlaying.current) animateFrame('pause');
            props.capabilities.stopAnimations?.();
        } catch (error) {
            setStartupError(error instanceof Error ? error : new LocalizedError(message('guided_lesson_scene_error')));
        }
    };

    const requestExit = (invoker?: HTMLElement | null) => {
        pausePlayback();
        if (isComplete) {
            close(true);
            return;
        }
        if (exitRequested) return;
        exitInvoker.current = invoker ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
        setExitError(false);
        setExitRequested(true);
    };

    const cancelExit = () => {
        setExitRequested(false);
        setExitError(false);
        requestAnimationFrame(() => exitInvoker.current?.focus({preventScroll: true}));
    };

    const confirmExit = () => {
        if (!exitRequested) return;
        try {
            session.close();
            setExitRequested(false);
            props.onModeChange?.('closed');
            props.onClose();
        } catch {
            setExitError(true);
            dialogRef.current?.querySelector<HTMLElement>('[data-exit-safe]')?.focus({preventScroll: true});
        }
    };


    useEffect(() => {
        try {
            session.start();
            setStartupError(undefined);
        } catch (error) {
            setStartupError(error instanceof Error ? error : new LocalizedError(message('guided_lesson_scene_error')));
        }
        return () => {
            try { session.close({restoreCompleted: true}); } catch { /* A failed restoration remains recoverable while the host is mounted. */ }
        };
    }, [session]);

    useEffect(() => {
        onModeChange?.(mode);
    }, [mode, onModeChange]);

    useEffect(() => {
        // The fading panel must stop accepting keyboard input as soon as the
        // graph becomes available, not only after the handoff animation ends.
        if (lessonRef.current) lessonRef.current.inert = overlayPhase === 'closing' && !startupError;
        if (!startupError && (overlayPhase === 'closing' || overlayPhase === 'hidden')) {
            compactTabRef.current?.focus({preventScroll: true});
        }
    }, [overlayPhase, startupError]);

    useEffect(() => {
        clearHandoffTimer();
        setOverlayPhase('visible');
        return clearHandoffTimer;
    }, [props.lesson]);

    useEffect(() => () => clearHandoffTimer(), []);

    useEffect(() => {
        if (!overlayVisible) return undefined;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('[role="dialog"]')) return;
            const target = event.target;
            if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
            event.preventDefault();
            hideOverlay();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [overlayVisible, hideOverlay]);

    useEffect(() => {
        if (!exitRequested) return;
        const dialog = dialogRef.current;
        if (!dialog) return;
        const changed: Array<{element: HTMLElement; wasInert: boolean}> = [];
        let branch: HTMLElement = dialog;
        while (branch.parentElement && branch.parentElement !== document.body) {
            const parent = branch.parentElement;
            for (const sibling of Array.from(parent.children)) {
                if (sibling !== branch && sibling instanceof HTMLElement) {
                    changed.push({element: sibling, wasInert: sibling.inert === true});
                    sibling.inert = true;
                }
            }
            branch = parent;
        }
        const bodySiblings = Array.from(document.body.children);
        for (const sibling of bodySiblings) {
            if (sibling !== branch && sibling instanceof HTMLElement) {
                changed.push({element: sibling, wasInert: sibling.inert === true});
                sibling.inert = true;
            }
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                cancelExit();
            } else if (event.key === 'Tab' && dialog) {
                const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'));
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                    event.preventDefault(); last.focus();
                } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                    event.preventDefault(); first.focus();
                }
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        dialog.querySelector<HTMLElement>('[data-exit-safe]')?.focus({preventScroll: true});
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            changed.forEach(({element, wasInert}) => { element.inert = wasInert; });
        };
    }, [exitRequested]);

    useEffect(() => {
        const element = lessonRef.current;
        if (!element) return;
        const textContent = element.textContent ?? '';
        const hasMath = element.querySelector('.guided-lesson-notation, .guided-lesson-worked-example') !== null
            || ['\\(', '\\[', '$$', '\\begin{'].some(delimiter => textContent.includes(delimiter));
        if (!hasMath) return;
        let cancelled = false;
        const typeset = typesetMath(element, () => !cancelled).catch(() => undefined);
        latestTypeset.current = typeset;
        return () => { cancelled = true; };
    }, [language, overlayVisible, snapshot, startupError]);

    useEffect(() => {
        const enteringLesson = positionedSession.current !== session;
        positionedSession.current = session;
        // Lesson navigation stops scene animations, so playback must be restarted explicitly.
        animationPlaying.current = false;
        readingPosition.current = {panel: 0, outer: 0, page: 0};
        readingRestore.current += 1;
        frameNeedsScrollReset.current = enteringLesson;
        hasSavedReadingPosition.current = false;
        if (readingRef.current) readingRef.current.scrollTop = 0;
        // Short windows and the completion card scroll as one panel. On other frames
        // keep any outer offset that reveals enlarged navigation controls.
        if (lessonRef.current && (snapshot.status === 'complete' || window.matchMedia?.('(max-height: 520px)').matches)) {
            lessonRef.current.scrollTop = 0;
        }
        (completionHeadingRef.current ?? lessonRef.current)?.focus({preventScroll: true});
        // Align a newly entered lesson once. Even a fractionally clipped navigation button can
        // be clicked; realigning the page after that click would move it away from the pointer.
        if (enteringLesson && lessonRef.current && window.matchMedia?.('(max-width: 700px), (max-height: 520px)').matches) {
            const navigation = lessonRef.current.querySelector('.guided-lesson-navigation')?.getBoundingClientRect();
            const panel = lessonRef.current.getBoundingClientRect();
            const navigationVisible = navigation && navigation.top >= Math.max(0, panel.top)
                && navigation.bottom <= Math.min(window.innerHeight, panel.bottom);
            if (!navigationVisible) lessonRef.current.scrollIntoView?.({block: 'start'});
            frameNeedsScrollReset.current = false;
        }
    }, [session, snapshot.status, snapshot.stepIndex, snapshot.frameIndex]);

    useEffect(() => {
        const element = lessonRef.current;
        if (!element) return;
        // While closing, the host owns focus on its persistent reopen control. A
        // rapid reopen changes the phase to opening while visibility stays true,
        // so track the phase to return focus to the panel in that transition.
        if (overlayPhase === 'opening' || overlayPhase === 'visible') {
            element.focus({preventScroll: true});
        }
    }, [overlayPhase]);

    useEffect(() => {
        if (overlayPhase === 'visible' && readingRef.current) {
            const saved = readingPosition.current.panel;
            const outerSaved = readingPosition.current.outer;
            readingRef.current.scrollTop = saved;
            if (lessonRef.current) lessonRef.current.scrollTop = outerSaved;
            // Untypeset formulas are shorter than rendered ones, so the first restore can be clamped;
            // apply it again once the reopened content has been typeset, unless the learner has moved on.
            const restore = ++readingRestore.current;
            void latestTypeset.current?.then(() => {
                if (readingRestore.current === restore && readingRef.current) {
                    readingRef.current.scrollTop = saved;
                    if (lessonRef.current) lessonRef.current.scrollTop = outerSaved;
                }
            });
            if (frameNeedsScrollReset.current && window.matchMedia?.('(max-width: 700px), (max-height: 520px)').matches) {
                lessonRef.current?.scrollIntoView?.({block: 'start'});
                frameNeedsScrollReset.current = false;
            } else if (hasSavedReadingPosition.current && window.matchMedia?.('(max-width: 700px), (max-height: 520px)').matches) {
                window.scrollTo({top: readingPosition.current.page});
            }
            hasSavedReadingPosition.current = false;
        }
    }, [overlayPhase]);

    const refresh = (operation: () => void) => {
        try {
            operation();
            setStartupError(undefined);
        } catch (error) {
            setStartupError(error instanceof Error ? error : new LocalizedError(message('guided_lesson_scene_error')));
        }
    };

    const close = (restoreCompleted = false) => {
        session.close({restoreCompleted});
        props.onModeChange?.('closed');
        props.onClose();
    };

    const expectedObservations = frame.kind === 'observation' && frame.expectedObservations && frame.expectedObservations.length > 0
        && <details className="guided-lesson-expected" key={`expected-${frame.id}`}>
            <summary>{t('guided_lesson_expected_observations')}</summary>
            {frame.expectedObservations.map((text, index) => <p key={index}>{localized(text, language)}</p>)}
        </details>;
    const animationControls = frame.animation && <div className="guided-lesson-animation-controls" role="group" aria-label={t('guided_lesson_animation_controls')}>
        {(['play', 'pause', 'replay'] as const).map(command => <button type="button" key={command} onClick={() => refresh(() => animateFrame(command))}>
            <AnimationIcon command={command}/>{t(command)}
        </button>)}
    </div>;

    const exitRef = useRef<(invoker?: HTMLElement | null) => void>(requestExit);
    exitRef.current = requestExit;

    useEffect(() => {
        props.registerExit?.(() => exitRef.current());
        return () => {
            props.registerExit?.(undefined);
        };
    }, [session, props.registerExit]);

    useEffect(() => {
        props.registerGraphActions?.(isExploring && animationControls ? {animationControls} : undefined);
        return () => props.registerGraphActions?.(undefined);
    }, [session, props.registerGraphActions, isExploring, frame.id, frame.animation?.animationId, language]);

    // Short visible labels keep the heading to one row; each stays contained in its full accessible name.
    const closeButton = <button type="button" className="guided-lesson-exit" aria-label={t('exit_lesson')} title={t('exit_lesson')} onClick={event => requestExit(event.currentTarget)}>{t('exit_lesson_short')}</button>;
    const hideButton = <button type="button" className="guided-lesson-hide" aria-label={t('hide_lesson_instructions')} title={t('hide_lesson_instructions')} onClick={hideOverlay}>{t('hide_lesson_short')}</button>;
    const exitDialog = exitRequested && <div className="guided-lesson-exit-backdrop"><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="guided-lesson-exit-title" aria-describedby="guided-lesson-exit-message" className="guided-lesson-exit-dialog">
        <h2 id="guided-lesson-exit-title">{t('guided_lesson_exit_title')}</h2>
        <p id="guided-lesson-exit-message">{t('guided_lesson_exit_warning')}</p>
        {exitError && <p role="alert">{t('guided_lesson_exit_restore_error')}</p>}
        <div className="guided-lesson-exit-actions">
            <button type="button" data-exit-safe onClick={cancelExit}>{t('guided_lesson_continue_reading')}</button>
            <button type="button" onClick={confirmExit}>{t('guided_lesson_exit_restore')}</button>
        </div>
    </div></div>;
    const returnToChapter = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (!props.chapterOwner || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        try {
            session.close({restoreCompleted: true});
            props.chapterOwner.onReturn();
        } catch {
            setExitError(true);
        }
    };
    const continueInChapter = () => {
        if (!props.chapterOwner) return;
        try {
            // Chapter return is a safe exit, so restore the opening graph even
            // when the learner completed and explored the example.
            session.close({restoreCompleted: true});
            props.chapterOwner.onReturn();
        } catch {
            setExitError(true);
        }
    };
    const chapterReturnLink = !isComplete && pageHeadingHasLessonTitle && props.chapterOwner && <a className="guided-lesson-chapter-return" href={props.chapterOwner.returnPath} onClick={returnToChapter}>{props.chapterOwner.returnLabel}</a>;
    const chapterIdentity = props.chapterOwner && !pageHeadingHasLessonTitle && <div className="guided-lesson-owner">
        <span title={`${props.chapterOwner.chapterTitle} · ${props.chapterOwner.sectionTitle}`}>{props.chapterOwner.chapterTitle} · {props.chapterOwner.sectionTitle}</span>
        {!isComplete && <a href={props.chapterOwner.returnPath} onClick={returnToChapter}>{props.chapterOwner.returnLabel}</a>}
    </div>;

    if (startupError) {
        return <><div className="guided-lesson-layer"><section ref={lessonRef} tabIndex={-1} className="guided-lesson guided-lesson-content" aria-labelledby="guided-lesson-title">
            <div className="guided-lesson-heading">
                <h2 id="guided-lesson-title">{localized(props.lesson.title, language)}</h2>
                <div className="guided-lesson-utilities">{closeButton}</div>
            </div>
            {chapterIdentity}
            {exitError && <p role="alert">{t('guided_lesson_exit_restore_error')}</p>}
            <p role="alert">{t('guided_lesson_scene_error')} {startupError.message}</p>
        </section></div>{exitDialog}</>;
    }

    const frameAction = frame.action;
    const atFirstFrame = snapshot.stepIndex === 0 && snapshot.frameIndex === 0;
    const atLastFrame = snapshot.stepIndex === props.lesson.steps.length - 1 && snapshot.frameIndex === frames.length - 1;
    const {onKeyDown: movePanelByKey, ...panelPointerHandlers} = panelDrag.handleProps;
    // The whole heading row moves the panel, except presses that start on its own actions.
    const startPanelDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (event.target instanceof Element && event.target.closest('a, button:not(.guided-lesson-grip)')) return;
        panelPointerHandlers.onPointerDown(event);
    };
    const navigationToolbar = !isComplete && <div className="guided-lesson-toolbar">
        <div className="guided-lesson-progress-group">
            <span className="guided-lesson-frame-label">{frameLabel(frame)}</span>
            <div className="guided-lesson-progress" role="status" aria-live="polite">
                {t('guided_lesson_step', {value0: snapshot.stepIndex + 1, value1: props.lesson.steps.length})} · {t('guided_lesson_frame', {value0: snapshot.frameIndex + 1, value1: frames.length})}
            </div>
        </div>
        <nav className="guided-lesson-navigation" aria-label={t('guided_lesson_navigation')}>
            <button type="button" className="guided-lesson-nav guided-lesson-nav-back" aria-label={t('guided_lesson_previous_frame_accessible')} disabled={atFirstFrame} onClick={() => refresh(() => session.back())}>
                <NavigationArrow direction="back"/>{t('guided_lesson_previous_frame_short')}
            </button>
            <button type="button" className="guided-lesson-nav guided-lesson-nav-next guided-lesson-primary" aria-label={atLastFrame ? t('finish_lesson_accessible') : t('guided_lesson_next_frame_accessible')} onClick={() => refresh(() => session.next())}>
                {atLastFrame ? t('finish_lesson_short') : t('guided_lesson_next_frame_short')}<NavigationArrow direction="next"/>
            </button>
        </nav>
    </div>;
    const CompletionHeading = pageHeadingHasLessonTitle ? 'h2' : 'h3';
    const completionHeading = isComplete && <CompletionHeading ref={completionHeadingRef} tabIndex={-1} className="guided-lesson-completion-title">
        {t('guided_lesson_complete')}
    </CompletionHeading>;
    const sectionStyle = {...panelDrag.style, '--guided-lesson-max-height': `${availablePanelHeight}px`} as React.CSSProperties;
    return <>
    <div ref={layerRef} className={`guided-lesson-layer${wideBoard ? ' guided-lesson-wide' : ''}`}>
    {/* The visible graph around the panel is a pointer target for hiding the instructions;
        keyboard and screen-reader users keep the buttons, so the catcher stays out of the accessibility tree. */}
    {overlayPhase === 'visible' && <div className="guided-lesson-graph-catcher" aria-hidden="true" title={t('hide_lesson_instructions')} onClick={hideOverlay}/>}
    {overlayVisible && <section ref={lessonRef} tabIndex={-1} style={sectionStyle} className={`guided-lesson guided-lesson-${mode} guided-lesson-frame-${frame.kind} guided-lesson-handoff-${overlayPhase}${panelDrag.dragging ? ' guided-lesson-dragging' : ''}`} aria-labelledby={pageHeadingHasLessonTitle ? undefined : 'guided-lesson-title'} aria-label={pageHeadingHasLessonTitle ? localized(props.lesson.title, language) : undefined}>
        <div className="guided-lesson-controls">
        <div className="guided-lesson-heading" {...panelPointerHandlers} onPointerDown={startPanelDrag}>
            <button type="button" className="guided-lesson-grip" aria-label={t('move_lesson_instructions')} title={t('move_lesson_instructions')}
                aria-keyshortcuts={ARROW_KEYS} onKeyDown={movePanelByKey}><GripIcon/></button>
            {chapterReturnLink}
            {pageHeadingHasLessonTitle ? completionHeading : <h2 id="guided-lesson-title">{localized(props.lesson.title, language)}</h2>}
            <div className="guided-lesson-utilities">{hideButton}{closeButton}</div>
        </div>
        {chapterIdentity}
        {navigationToolbar}
        </div>
        {exitError && !exitRequested && <p role="alert">{t('guided_lesson_exit_restore_error')}</p>}
        <div className="guided-lesson-reading" ref={readingRef}>
        {!isExploring && !isComplete && snapshot.stepIndex === 0 && snapshot.frameIndex === 0 && <p className="guided-lesson-summary">{localized(props.lesson.summary, language)}</p>}
        {!isComplete && !isExploring && <div className="guided-lesson-frame" key={frame.id}>
            <h3>{localized(frame.title, language)}</h3>
            {frame.body && <p>{localized(frame.body, language)}</p>}
            {frame.notation?.map((formula, index) => <div className="guided-lesson-notation" key={index} role="region" tabIndex={0} aria-label={t('guided_lesson_formula_region')}>{localized(formula, language)}</div>)}
            {frame.kind === 'calculation' && frame.workedExample && <div className="guided-lesson-worked-example">
                <h4>{localized(frame.workedExample.title, language)}</h4>
                <div className="guided-lesson-notation" role="region" tabIndex={0} aria-label={t('guided_lesson_formula_region')}>{localized(frame.workedExample.calculation, language)}</div>
                <div className="guided-lesson-notation" role="region" tabIndex={0} aria-label={t('guided_lesson_formula_region')}>{localized(frame.workedExample.result, language)}</div>
                <p>{localized(frame.workedExample.check, language)}</p>
            </div>}
            {expectedObservations}
        </div>}
        {!isComplete && isExploring && <div className="guided-lesson-exploration" key={frame.id}>
            <strong>{localized(frame.title, language)}</strong>
            {frame.prompt && <p>{localized(frame.prompt, language)}</p>}
            {animationControls}
            {expectedObservations}
        </div>}
        {isComplete && <div className="guided-lesson-completion-message">
            {!pageHeadingHasLessonTitle && completionHeading}
            <p>{t('guided_lesson_free_exploration')}</p>
        </div>}
        </div>
        {isComplete && props.chapterOwner && <div className="guided-lesson-actions guided-lesson-completion-actions">
            <button type="button" className="guided-lesson-primary" onClick={continueInChapter}>{t('continue_in_chapter')}</button>
        </div>}
        {!isComplete && frameAction && <footer className="guided-lesson-footer">
            <div className="guided-lesson-actions">
                <button type="button" onClick={() => refresh(() => session.applyCurrentAction())}>{localized(frameAction.label, language)}</button>
            </div>
        </footer>}
    </section>}
    {tabVisible && <button ref={compactTabRef} type="button" style={tabDrag.style} className={`guided-lesson-tab${tabDrag.dragging ? ' guided-lesson-dragging' : ''}`}
        onClick={() => { if (!tabDrag.consumeDragClick()) showOverlay(); }} {...tabDrag.handleProps} aria-keyshortcuts={ARROW_KEYS}
        aria-label={`${localized(props.lesson.title, language)}, ${t('guided_lesson_step', {value0: snapshot.stepIndex + 1, value1: props.lesson.steps.length})}, ${t('guided_lesson_frame', {value0: snapshot.frameIndex + 1, value1: frames.length})}. ${t('back_to_instructions')}`}>
        <GripIcon/>
        <span className="guided-lesson-tab-title">{t('guided_example')}</span>
        <span className="guided-lesson-tab-progress">{snapshot.stepIndex + 1}/{props.lesson.steps.length} · {snapshot.frameIndex + 1}/{frames.length}</span>
        <svg className="guided-lesson-tab-expand" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </button>}
    </div>
    {exitDialog}
    </>;
}
