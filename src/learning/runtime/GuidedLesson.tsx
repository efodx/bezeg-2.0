import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useLanguage, Language, t} from '../../localization';
import {framesForLessonStep} from '../model';
import type {LessonDefinition, LessonFrame, LessonGraphCapabilities} from '../model';
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
type PromptPosition = {x: number; y: number};
type PromptDragState = PromptPosition & {pointerId: number; startX: number; startY: number; minX: number; maxX: number; minY: number; maxY: number};

const LESSON_HANDOFF_DURATION_MS = 220;
const PROMPT_MOVE_STEP = 12;

function frameLabel(frame: LessonFrame) {
    if (frame.kind === 'calculation') return t('guided_lesson_calculation');
    if (frame.kind === 'observation') return t('guided_lesson_observation');
    return t('guided_lesson_explanation');
}

export function GuidedLesson(props: {
    lesson: LessonDefinition;
    capabilities: LessonGraphCapabilities;
    onClose: () => void;
    onModeChange?: (mode: LessonMode) => void;
}) {
    const {language} = useLanguage();
    const [revision, setRevision] = useState(0);
    const [startupError, setStartupError] = useState<string>();
    const [overlayPhase, setOverlayPhase] = useState<LessonOverlayPhase>('visible');
    const [promptPosition, setPromptPosition] = useState<PromptPosition>({x: 0, y: 0});
    const lessonRef = useRef<HTMLElement>(null);
    const handoffTimer = useRef<number>();
    const promptDrag = useRef<PromptDragState>();
    const session = useMemo(() => new LessonSession(props.lesson, props.capabilities), [props.lesson, props.capabilities]);
    const snapshot: LessonSessionSnapshot = session.snapshot();
    const step = props.lesson.steps[snapshot.stepIndex];
    const frames = framesForLessonStep(step);
    const frame = frames[Math.min(snapshot.frameIndex, frames.length - 1)];
    const isComplete = snapshot.status === 'complete';
    const isExploring = snapshot.status === 'explore';
    const overlayVisible = overlayPhase !== 'hidden';
    const mode: LessonMode = isComplete ? 'complete' : isExploring ? 'explore' : 'content';
    const onModeChange = props.onModeChange;

    const clearHandoffTimer = () => {
        if (handoffTimer.current !== undefined) {
            window.clearTimeout(handoffTimer.current);
            handoffTimer.current = undefined;
        }
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
        setOverlayPhase('closing');
        scheduleOverlayPhase('hidden');
    };

    const showOverlay = () => {
        clearHandoffTimer();
        if (overlayPhase === 'visible') return;
        setOverlayPhase('opening');
        scheduleOverlayPhase('visible');
    };

    const promptBounds = (position: PromptPosition) => {
        const lessonElement = lessonRef.current;
        const workspace = lessonElement?.closest('.demonstration-workspace');
        const graphElement = workspace?.querySelector('#jgbox') ?? workspace?.querySelector('.workspace-graph');
        if (!(lessonElement instanceof HTMLElement) || !(graphElement instanceof HTMLElement)) return undefined;
        const promptElement = lessonElement.querySelector<HTMLElement>('.guided-lesson-hidden-content') ?? lessonElement;
        const promptRect = promptElement.getBoundingClientRect();
        const graphRect = graphElement.getBoundingClientRect();
        const baseLeft = promptRect.left - position.x;
        const baseTop = promptRect.top - position.y;
        const minX = graphRect.left + 8 - baseLeft;
        const minY = graphRect.top + 8 - baseTop;
        return {
            minX,
            maxX: Math.max(minX, graphRect.right - promptRect.width - 8 - baseLeft),
            minY,
            maxY: Math.max(minY, graphRect.bottom - promptRect.height - 8 - baseTop),
        };
    };

    const movePromptBy = (deltaX: number, deltaY: number) => {
        setPromptPosition(current => {
            const next = {x: current.x + deltaX, y: current.y + deltaY};
            const bounds = promptBounds(current);
            if (!bounds) return next;
            return {
                x: Math.min(Math.max(next.x, bounds.minX), bounds.maxX),
                y: Math.min(Math.max(next.y, bounds.minY), bounds.maxY),
            };
        });
    };

    const beginPromptDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'touch' && event.button !== 0) return;
        if ((event.target as HTMLElement).closest('button')) return;
        const bounds = promptBounds(promptPosition);
        if (!bounds) return;
        promptDrag.current = {...promptPosition, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ...bounds};
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    const movePromptDrag = (event: React.PointerEvent<HTMLElement>) => {
        const drag = promptDrag.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const nextX = Math.min(Math.max(drag.x + event.clientX - drag.startX, drag.minX), drag.maxX);
        const nextY = Math.min(Math.max(drag.y + event.clientY - drag.startY, drag.minY), drag.maxY);
        setPromptPosition({x: nextX, y: nextY});
    };

    const endPromptDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (promptDrag.current?.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        promptDrag.current = undefined;
    };

    const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if ((event.target as HTMLElement).closest('button')) return;
        const step = event.shiftKey ? PROMPT_MOVE_STEP * 4 : PROMPT_MOVE_STEP;
        const deltas: Record<string, PromptPosition> = {
            ArrowLeft: {x: -step, y: 0},
            ArrowRight: {x: step, y: 0},
            ArrowUp: {x: 0, y: -step},
            ArrowDown: {x: 0, y: step},
        };
        const delta = deltas[event.key];
        if (!delta) return;
        event.preventDefault();
        movePromptBy(delta.x, delta.y);
    };

    useEffect(() => {
        try {
            session.start();
            setStartupError(undefined);
            setRevision(value => value + 1);
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
        setPromptPosition({x: 0, y: 0});
        promptDrag.current = undefined;
        return clearHandoffTimer;
    }, [props.lesson]);

    useEffect(() => () => clearHandoffTimer(), []);

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
    }, [language, revision, overlayVisible, snapshot.status, snapshot.stepIndex, snapshot.frameIndex, startupError]);

    useEffect(() => {
        lessonRef.current?.focus({preventScroll: true});
    }, [snapshot.status, snapshot.stepIndex, snapshot.frameIndex]);

    useEffect(() => {
        const element = lessonRef.current;
        if (!element) return;
        if (overlayVisible) {
            element.focus({preventScroll: true});
        } else {
            (element.querySelector('.guided-lesson-hidden-content') as HTMLElement | null)?.focus();
        }
    }, [overlayVisible]);

    const refresh = (operation: () => void) => {
        const previousStatus = session.snapshot().status;
        try {
            operation();
            setStartupError(undefined);
            const nextStatus = session.snapshot().status;
            if (previousStatus !== 'explore' && nextStatus === 'explore') hideOverlay();
            if (previousStatus === 'explore' && nextStatus !== 'explore') showOverlay();
        } catch (error) {
            setStartupError(error instanceof Error ? error.message : t('guided_lesson_scene_error'));
        }
        setRevision(value => value + 1);
    };

    const close = () => {
        session.close();
        props.onModeChange?.('closed');
        props.onClose();
    };

    const closeButton = <button type="button" className="guided-lesson-close" aria-label={t('exit_lesson')} title={t('exit_lesson')} onClick={close}>
        <span aria-hidden="true">×</span>
    </button>;

    if (startupError) {
        return <section ref={lessonRef} tabIndex={-1} className="guided-lesson guided-lesson-content" aria-labelledby="guided-lesson-title">
            <div className="guided-lesson-heading"><div><span className="workspace-eyebrow">{t('guided_lesson')}</span><h2 id="guided-lesson-title">{localized(props.lesson.title, language)}</h2></div>
                {closeButton}</div>
            <p role="alert">{t('guided_lesson_scene_error')} {startupError}</p>
        </section>;
    }

    // Keep exploration lightweight: the graph owns the interaction while this
    // affordance preserves the current observation and the path back to content.
    if (!overlayVisible && isExploring) {
        return <section ref={lessonRef} className="guided-lesson guided-lesson-hidden" aria-label={t('guided_lesson')} style={{left: promptPosition.x, top: promptPosition.y}}>
            <div className="guided-lesson-hidden-content" role="status" aria-live="polite" tabIndex={0} title={t('move_lesson_prompt')} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown" onPointerDown={beginPromptDrag} onPointerMove={movePromptDrag} onPointerUp={endPromptDrag} onPointerCancel={endPromptDrag} onKeyDown={handlePromptKeyDown}>
                <span className="guided-lesson-frame-label">{frameLabel(frame)}</span>
                <strong>{localized(frame.title, language)}</strong>
                {frame.prompt && <span>{localized(frame.prompt, language)}</span>}
                {frame.animation && <div className="guided-lesson-animation-controls" role="group" aria-label={t('guided_lesson_animation_controls')}>
                    <button type="button" onClick={() => refresh(() => session.applyAnimation(frame.animation!.animationId, 'play'))}><span aria-hidden="true">▶</span> {t('play')}</button>
                    <button type="button" onClick={() => refresh(() => session.applyAnimation(frame.animation!.animationId, 'pause'))}><span aria-hidden="true">Ⅱ</span> {t('pause')}</button>
                    <button type="button" onClick={() => refresh(() => session.applyAnimation(frame.animation!.animationId, 'replay'))}><span aria-hidden="true">↻</span> {t('replay')}</button>
                </div>}
                <span className="guided-lesson-hidden-hint">{t('guided_lesson_hidden_hint')}</span>
                <button type="button" className="guided-lesson-continue" onClick={showOverlay}>{t('continue_lesson')}</button>
                {closeButton}
            </div>
        </section>;
    }

    // Keep a read of revision so action handlers cause this panel to render.
    void revision;
    const frameAction = frame.action;
    const animationControls = frame.animation && <div className="guided-lesson-animation-controls" role="group" aria-label={t('guided_lesson_animation_controls')}>
        <button type="button" onClick={() => refresh(() => session.applyAnimation(frame.animation!.animationId, 'play'))}><span aria-hidden="true">▶</span> {t('play')}</button>
        <button type="button" onClick={() => refresh(() => session.applyAnimation(frame.animation!.animationId, 'pause'))}><span aria-hidden="true">Ⅱ</span> {t('pause')}</button>
        <button type="button" onClick={() => refresh(() => session.applyAnimation(frame.animation!.animationId, 'replay'))}><span aria-hidden="true">↻</span> {t('replay')}</button>
    </div>;
    const atFirstFrame = snapshot.stepIndex === 0 && snapshot.frameIndex === 0;
    const atLastFrame = snapshot.stepIndex === props.lesson.steps.length - 1 && snapshot.frameIndex === frames.length - 1;
    return <section ref={lessonRef} tabIndex={-1} className={`guided-lesson guided-lesson-${mode} guided-lesson-frame-${frame.kind} guided-lesson-handoff-${overlayPhase}`} aria-labelledby="guided-lesson-title">
        <div className="guided-lesson-heading">
            <div><span className="workspace-eyebrow">{t('guided_lesson')}</span><h2 id="guided-lesson-title">{localized(props.lesson.title, language)}</h2>
                {!isExploring && !isComplete && <p>{localized(props.lesson.summary, language)}</p>}</div>
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
        {!isComplete && frameAction && <div className="guided-lesson-actions">
            <button type="button" onClick={() => refresh(() => session.applyCurrentAction())}>{localized(frameAction.label, language)}</button>
        </div>}
    </section>;
}
