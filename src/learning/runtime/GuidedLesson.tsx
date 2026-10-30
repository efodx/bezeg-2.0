import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useLanguage, useT, Language, t} from '../../localization';
import {framesForLessonStep} from '../model';
import type {LessonAnimationCommand, LessonDefinition, LessonFrame, LessonGraphCapabilities} from '../model';
import {LessonSession, LessonSessionSnapshot} from './LessonSession';
import {typesetMath} from '../../mathjax/loadMathJax';
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

export function GuidedLesson(props: {
    lesson: LessonDefinition;
    capabilities: LessonGraphCapabilities;
    onClose: () => void;
    onModeChange?: (mode: LessonMode) => void;
    registerClose?: (close: (() => void) | undefined) => void;
    registerExit?: (exit: (() => void) | undefined) => void;
    registerGraphActions?: (actions: {animationControls?: React.ReactNode} | undefined) => void;
    chapterOwner?: {chapterTitle: string; sectionTitle: string; returnPath: string; returnLabel: string; onReturn: () => void};
}) {
    const {language} = useLanguage();
    const t = useT();
    const [startupError, setStartupError] = useState<string>();
    const [overlayPhase, setOverlayPhase] = useState<LessonOverlayPhase>('visible');
    const [exitRequested, setExitRequested] = useState(false);
    const [exitError, setExitError] = useState(false);
    const lessonRef = useRef<HTMLElement>(null);
    const compactTabRef = useRef<HTMLButtonElement>(null);
    const readingRef = useRef<HTMLDivElement>(null);
    const readingPosition = useRef({panel: 0, page: 0});
    const frameNeedsScrollReset = useRef(true);
    const hasSavedReadingPosition = useRef(false);
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
        readingPosition.current.page = window.scrollY;
        hasSavedReadingPosition.current = true;
        clearHandoffTimer();
        props.onModeChange?.('explore');
        pausePlayback();
        setOverlayPhase('closing');
        scheduleOverlayPhase('hidden');
    };

    const showOverlay = () => {
        clearHandoffTimer();
        if (overlayPhase === 'visible') return;
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
            setStartupError(error instanceof Error ? error.message : t('guided_lesson_scene_error'));
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
            setStartupError(error instanceof Error ? error.message : t('guided_lesson_scene_error'));
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
        void typesetMath(element, () => !cancelled).catch(() => undefined);
        return () => { cancelled = true; };
    }, [language, overlayVisible, snapshot, startupError]);

    useEffect(() => {
        // Lesson navigation stops scene animations, so playback must be restarted explicitly.
        animationPlaying.current = false;
        readingPosition.current = {panel: 0, page: 0};
        frameNeedsScrollReset.current = true;
        hasSavedReadingPosition.current = false;
        if (readingRef.current) readingRef.current.scrollTop = 0;
        lessonRef.current?.focus({preventScroll: true});
        if (lessonRef.current && window.matchMedia?.('(max-width: 700px), (max-height: 520px)').matches) {
            lessonRef.current.scrollIntoView?.({block: 'start'});
            frameNeedsScrollReset.current = false;
        }
    }, [snapshot.status, snapshot.stepIndex, snapshot.frameIndex]);

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
            readingRef.current.scrollTop = readingPosition.current.panel;
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
            setStartupError(error instanceof Error ? error.message : t('guided_lesson_scene_error'));
        }
    };

    const close = (restoreCompleted = false) => {
        session.close({restoreCompleted});
        props.onModeChange?.('closed');
        props.onClose();
    };

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

    const closeButton = <button type="button" className="guided-lesson-exit" onClick={event => requestExit(event.currentTarget)}>{t('exit_lesson')}</button>;
    const hideButton = !isExploring && <button type="button" className="guided-lesson-hide" onClick={hideOverlay}>{t('hide_lesson_instructions')}</button>;
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
    const chapterIdentity = props.chapterOwner && <div className="guided-lesson-owner">
        <span>{props.chapterOwner.chapterTitle} · {props.chapterOwner.sectionTitle}</span>
        <a href={props.chapterOwner.returnPath} onClick={returnToChapter}>{props.chapterOwner.returnLabel}</a>
    </div>;

    if (startupError) {
        return <><div className="guided-lesson-layer"><section ref={lessonRef} tabIndex={-1} className="guided-lesson guided-lesson-content" aria-labelledby="guided-lesson-title">
            <div className="guided-lesson-heading">
                <h2 id="guided-lesson-title">{localized(props.lesson.title, language)}</h2>
                <div className="guided-lesson-utilities">{closeButton}</div>
            </div>
            {chapterIdentity}
            {exitError && <p role="alert">{t('guided_lesson_exit_restore_error')}</p>}
            <p role="alert">{t('guided_lesson_scene_error')} {startupError}</p>
        </section></div>{exitDialog}</>;
    }

    const frameAction = frame.action;
    const atFirstFrame = snapshot.stepIndex === 0 && snapshot.frameIndex === 0;
    const atLastFrame = snapshot.stepIndex === props.lesson.steps.length - 1 && snapshot.frameIndex === frames.length - 1;
    return <>
    <div className="guided-lesson-layer">
    {/* In exploration frames the visible graph around the panel is a pointer target for the observe action;
        keyboard and screen-reader users keep the button, so the catcher stays out of the accessibility tree. */}
    {isExploring && overlayPhase === 'visible' && <div className="guided-lesson-graph-catcher" aria-hidden="true" title={t('observe_on_graph')} onClick={hideOverlay}/>}
    {overlayVisible && <section ref={lessonRef} tabIndex={-1} className={`guided-lesson guided-lesson-${mode} guided-lesson-frame-${frame.kind} guided-lesson-handoff-${overlayPhase}`} aria-labelledby="guided-lesson-title">
        <div className="guided-lesson-heading">
            <h2 id="guided-lesson-title">{localized(props.lesson.title, language)}</h2>
            <div className="guided-lesson-utilities">{hideButton}{closeButton}</div>
        </div>
        {chapterIdentity}
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
        </div>}
        {!isComplete && isExploring && <div className="guided-lesson-exploration" key={frame.id}>
            <strong>{localized(frame.title, language)}</strong>
            {frame.prompt && <p>{localized(frame.prompt, language)}</p>}
            {animationControls}
        </div>}
        {isComplete && <p>{t('guided_lesson_free_exploration')}</p>}
        {startupError && <p role="alert">{t('guided_lesson_action_unavailable')} {startupError}</p>}
        </div>
        <footer className="guided-lesson-footer">
            <div className="guided-lesson-footer-main">
                <div className="guided-lesson-progress-group">
                    {!isComplete && <span className="guided-lesson-frame-label">{frameLabel(frame)}</span>}
                    <div className="guided-lesson-progress" role="status" aria-live="polite">
                        {isComplete ? t('guided_lesson_complete') : <>{t('guided_lesson_step', {value0: snapshot.stepIndex + 1, value1: props.lesson.steps.length})} · {t('guided_lesson_frame', {value0: snapshot.frameIndex + 1, value1: frames.length})}</>}
                    </div>
                </div>
                {!isComplete && <nav className="guided-lesson-navigation" aria-label={t('guided_lesson_navigation')}>
                    <button type="button" className="guided-lesson-nav guided-lesson-nav-back" aria-label={t('guided_lesson_previous_frame')} disabled={atFirstFrame} onClick={() => refresh(() => session.back())}>{t('guided_lesson_previous_frame')}</button>
                    <button type="button" className="guided-lesson-nav guided-lesson-nav-next" aria-label={atLastFrame ? t('finish_lesson') : t('guided_lesson_next_frame')} onClick={() => refresh(() => session.next())}>{atLastFrame ? t('finish_lesson') : t('guided_lesson_next_frame')}</button>
                </nav>}
            </div>
            {isComplete && props.chapterOwner && <div className="guided-lesson-actions">
                <button type="button" onClick={continueInChapter}>{t('continue_in_chapter')}</button>
            </div>}
            {!isComplete && (isExploring || frameAction) && <div className="guided-lesson-actions">
                {isExploring && <button type="button" className="guided-lesson-observe" onClick={hideOverlay}>{t('observe_on_graph')}</button>}
                {frameAction && <button type="button" onClick={() => refresh(() => session.applyCurrentAction())}>{localized(frameAction.label, language)}</button>}
            </div>}
        </footer>
    </section>}
    {(overlayPhase === 'closing' || overlayPhase === 'hidden') && <button ref={compactTabRef} type="button" className="guided-lesson-tab" onClick={showOverlay}
        aria-label={`${localized(props.lesson.title, language)}, ${t('guided_lesson_step', {value0: snapshot.stepIndex + 1, value1: props.lesson.steps.length})}, ${t('guided_lesson_frame', {value0: snapshot.frameIndex + 1, value1: frames.length})}. ${t('back_to_instructions')}`}>
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
