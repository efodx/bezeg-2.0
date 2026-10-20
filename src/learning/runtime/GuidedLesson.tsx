import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useLanguage, useT, Language, t} from '../../localization';
import {framesForLessonStep} from '../model';
import type {LessonAnimationCommand, LessonDefinition, LessonFrame, LessonGraphCapabilities} from '../model';
import {LessonSession, LessonSessionSnapshot} from './LessonSession';
import './GuidedLesson.css';
import './GuidedLessonLayout.css';

function localized(value: {sl: string; en: string}, language: Language) {
    return value[language];
}

type MathJaxApi = {
    startup?: {promise?: Promise<unknown>};
    typesetClear?: (elements?: Element[]) => void;
    typesetPromise?: (elements?: Element[]) => Promise<void>;
};

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
    registerShowInstructions?: (show: (() => void) | undefined) => void;
    registerExit?: (exit: (() => void) | undefined) => void;
    registerGraphActions?: (actions: {continueLesson?: () => void; animationControls?: React.ReactNode} | undefined) => void;
}) {
    const {language} = useLanguage();
    const t = useT();
    const [startupError, setStartupError] = useState<string>();
    const [overlayPhase, setOverlayPhase] = useState<LessonOverlayPhase>('visible');
    const lessonRef = useRef<HTMLElement>(null);
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
        props.registerClose?.(() => session.close());
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
        clearHandoffTimer();
        props.onModeChange?.('explore');
        if (frame.animation && animationPlaying.current) {
            try {
                animateFrame('pause');
            } catch (error) {
                setStartupError(error instanceof Error ? error.message : t('guided_lesson_scene_error'));
            }
        }
        setOverlayPhase('closing');
        scheduleOverlayPhase('hidden');
    };

    const showOverlay = () => {
        clearHandoffTimer();
        if (overlayPhase === 'visible') return;
        props.onModeChange?.(isComplete ? 'complete' : 'content');
        // Playback controls are outside the graph while instructions are hidden; reopening pauses playback.
        if (frame.animation && animationPlaying.current) {
            try {
                animateFrame('pause');
            } catch (error) {
                setStartupError(error instanceof Error ? error.message : t('guided_lesson_scene_error'));
            }
        }
        setOverlayPhase('opening');
        scheduleOverlayPhase('visible');
    };


    useEffect(() => {
        try {
            session.start();
            setStartupError(undefined);
        } catch (error) {
            setStartupError(error instanceof Error ? error.message : t('guided_lesson_scene_error'));
        }
        return () => session.close();
    }, [session]);

    useEffect(() => {
        onModeChange?.(mode);
    }, [mode, onModeChange]);

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
        const element = lessonRef.current;
        if (!element) return;
        const textContent = element.textContent ?? '';
        const hasMath = element.querySelector('.guided-lesson-notation, .guided-lesson-worked-example') !== null
            || ['\\(', '\\[', '$$', '\\begin{'].some(delimiter => textContent.includes(delimiter));
        if (!hasMath) return;
        let cancelled = false;
        const typeset = () => {
            const mathJax = (window as Window & {MathJax?: MathJaxApi}).MathJax;
            if (!mathJax?.typesetPromise) return;
            const ready = mathJax.startup?.promise ?? Promise.resolve();
            void ready.then(() => {
                if (cancelled) return;
                mathJax.typesetClear?.([element]);
                return mathJax.typesetPromise?.([element]);
            }).catch(() => undefined);
        };
        const script = document.getElementById('MathJax-script');
        script?.addEventListener('load', typeset);
        typeset();
        return () => {
            cancelled = true;
            script?.removeEventListener('load', typeset);
        };
    }, [language, overlayVisible, snapshot, startupError]);

    useEffect(() => {
        // Lesson navigation stops scene animations, so playback must be restarted explicitly.
        animationPlaying.current = false;
        lessonRef.current?.focus({preventScroll: true});
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

    const refresh = (operation: () => void) => {
        try {
            operation();
            setStartupError(undefined);
        } catch (error) {
            setStartupError(error instanceof Error ? error.message : t('guided_lesson_scene_error'));
        }
    };

    // Continue advances past the observation and opens the overlay for the next frame.
    const continueAfterObservation = () => {
        if (frame.animation && animationPlaying.current) {
            // Never keep animating behind the overlay.
            try {
                animateFrame('pause');
            } catch (error) {
                setStartupError(error instanceof Error ? error.message : t('guided_lesson_scene_error'));
            }
        }
        clearHandoffTimer();
        refresh(() => session.next());
        setOverlayPhase('opening');
        scheduleOverlayPhase('visible');
    };

    const close = () => {
        session.close();
        props.onModeChange?.('closed');
        props.onClose();
    };

    const animationControls = frame.animation && <div className="guided-lesson-animation-controls" role="group" aria-label={t('guided_lesson_animation_controls')}>
        {(['play', 'pause', 'replay'] as const).map(command => <button type="button" key={command} onClick={() => refresh(() => animateFrame(command))}>
            <AnimationIcon command={command}/>{t(command)}
        </button>)}
    </div>;

    const showInstructionsRef = useRef(showOverlay);
    const exitRef = useRef(close);
    const continueRef = useRef(continueAfterObservation);
    showInstructionsRef.current = showOverlay;
    exitRef.current = close;
    continueRef.current = continueAfterObservation;

    useEffect(() => {
        props.registerShowInstructions?.(() => showInstructionsRef.current());
        props.registerExit?.(() => exitRef.current());
        return () => {
            props.registerShowInstructions?.(undefined);
            props.registerExit?.(undefined);
        };
    }, [session, props.registerShowInstructions, props.registerExit]);

    useEffect(() => {
        props.registerGraphActions?.(isExploring ? {
            continueLesson: () => continueRef.current(),
            animationControls,
        } : undefined);
        return () => props.registerGraphActions?.(undefined);
    }, [session, props.registerGraphActions, isExploring, frame.id, frame.animation?.animationId, language]);

    const closeButton = <button type="button" className="guided-lesson-exit" onClick={close}>{t('exit_lesson')}</button>;

    if (startupError) {
        return <section ref={lessonRef} tabIndex={-1} className="guided-lesson guided-lesson-content" aria-labelledby="guided-lesson-title">
            <div className="guided-lesson-heading"><div><span className="workspace-eyebrow">{t('guided_lesson')}</span><h2 id="guided-lesson-title">{localized(props.lesson.title, language)}</h2></div>
                {closeButton}</div>
            <p role="alert">{t('guided_lesson_scene_error')} {startupError}</p>
        </section>;
    }

    if (!overlayVisible) return null;

    const frameAction = frame.action;
    const atFirstFrame = snapshot.stepIndex === 0 && snapshot.frameIndex === 0;
    const atLastFrame = snapshot.stepIndex === props.lesson.steps.length - 1 && snapshot.frameIndex === frames.length - 1;
    return <section ref={lessonRef} tabIndex={-1} className={`guided-lesson guided-lesson-${mode} guided-lesson-frame-${frame.kind} guided-lesson-handoff-${overlayPhase}`} aria-labelledby="guided-lesson-title">
        <div className="guided-lesson-heading">
            <div><span className="workspace-eyebrow">{t('guided_lesson')}</span><h2 id="guided-lesson-title">{localized(props.lesson.title, language)}</h2>
                {!isExploring && !isComplete && <p>{localized(props.lesson.summary, language)}</p>}</div>
            <button type="button" className="guided-lesson-hide" onClick={hideOverlay}>{t('hide_lesson_instructions')}</button>
            {closeButton}
        </div>
        {!isComplete && <>
            <button type="button" className="guided-lesson-nav guided-lesson-nav-back" aria-label={t('back')} title={t('back')} disabled={atFirstFrame} onClick={() => refresh(() => session.back())}>
                <span>{t('back')}</span>
            </button>
            <button type="button" className="guided-lesson-nav guided-lesson-nav-next" aria-label={atLastFrame ? t('finish_lesson') : t('next')} title={atLastFrame ? t('finish_lesson') : t('next')} onClick={() => refresh(() => session.next())}>
                <span>{atLastFrame ? t('finish_lesson') : t('next')}</span>
            </button>
        </>}
        <div className="guided-lesson-progress" role="status" aria-live="polite">
            {isComplete ? t('guided_lesson_complete') : <>{t('guided_lesson_step', {value0: snapshot.stepIndex + 1, value1: props.lesson.steps.length})} · {t('guided_lesson_frame', {value0: snapshot.frameIndex + 1, value1: frames.length})}</>}
        </div>
        {!isComplete && !isExploring && <div className="guided-lesson-frame" key={frame.id}>
            <span className="guided-lesson-frame-label">{frameLabel(frame)}</span>
            <h3>{localized(frame.title, language)}</h3>
            {frame.body && <p>{localized(frame.body, language)}</p>}
            {frame.notation?.map((formula, index) => <div className="guided-lesson-notation" key={index}>{localized(formula, language)}</div>)}
            {frame.kind === 'calculation' && frame.workedExample && <div className="guided-lesson-worked-example">
                <h4>{localized(frame.workedExample.title, language)}</h4>
                <div className="guided-lesson-notation">{localized(frame.workedExample.calculation, language)}</div>
                <div className="guided-lesson-notation">{localized(frame.workedExample.result, language)}</div>
                <p>{localized(frame.workedExample.check, language)}</p>
            </div>}
        </div>}
        {!isComplete && isExploring && <div className="guided-lesson-exploration" key={frame.id}>
            <span className="guided-lesson-frame-label">{frameLabel(frame)}</span>
            <strong>{localized(frame.title, language)}</strong>
            {frame.prompt && <p>{localized(frame.prompt, language)}</p>}
            {animationControls}
        </div>}
        {isComplete && <p role="status">{t('guided_lesson_free_exploration')}</p>}
        {startupError && <p role="alert">{t('guided_lesson_action_unavailable')} {startupError}</p>}
        {!isComplete && (isExploring || frameAction) && <div className="guided-lesson-actions">
            {isExploring && <button type="button" className="guided-lesson-observe" onClick={hideOverlay}>{t('observe_on_graph')}</button>}
            {isExploring && <button type="button" className="guided-lesson-continue" onClick={continueAfterObservation}>{t('continue_lesson')}</button>}
            {frameAction && <button type="button" onClick={() => refresh(() => session.applyCurrentAction())}>{localized(frameAction.label, language)}</button>}
        </div>}
    </section>;
}
