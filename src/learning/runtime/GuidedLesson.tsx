import {createPortal} from 'react-dom';
import React, {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useLanguage, useT, Language, t, LocalizedError, message} from '../../localization';
import {framesForLessonStep} from '../model';
import type {LessonAnimationCommand, LessonDefinition, LessonFrame, LessonGraphCapabilities} from '../model';
import {LessonSession, LessonSessionSnapshot} from './LessonSession';
import {useLessonMorph} from '../../uxPicks/b1/useLessonMorph';
import {usePick} from '../../uxPicks/picks';
import {releaseLesson} from '../../uxPicks/dock/dockLayout';
import {useLessonDock} from '../../uxPicks/dock/useLessonDock';
import {DockCard} from '../../uxPicks/dock/DockCard';
import {ChevronLeftIcon, ChevronRightIcon} from '../../uxPicks/dock/icons';
import {LessonMenu} from '../../uxPicks/toolsCard/LessonMenu';
import {useLessonDrift} from '../../uxPicks/toolsCard/useLessonDrift';
import {stopAllOscillators} from '../../uxPicks/a3/oscillators';
import {useLessonCardFit} from '../../uxPicks/toolsCard/useLessonCardFit';
import '../../uxPicks/toolsCard/lessonDrift.css';
import '../../uxPicks/toolsCard/lessonEnd.css';
import {typesetMath} from '../../mathjax/loadMathJax';
import {useDraggableOffset} from './useDraggableOffset';
import {fitFormulaRows} from './formulaRows';
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

const ARROW_KEYS = 'ArrowUp ArrowDown ArrowLeft ArrowRight Home';

/** The width at which the workspace is one column and the card follows the graph in the page (GuidedLessonLayout.css). */
const ONE_COLUMN_QUERY = '(max-width: 700px)';

/** Whether the card is read in one column, where Back and Next are its last row. The listener is removed on unmount. */
function useOneColumn(): boolean {
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        && window.matchMedia(ONE_COLUMN_QUERY).matches);
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return undefined;
        const query = window.matchMedia(ONE_COLUMN_QUERY);
        const update = () => setMatches(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return matches;
}

export {fitFormulaRows};

/** Replaces a formula row's source and typesets that row again. */
const retypesetFormulaRow = (row: HTMLElement, tex: string) => typesetMath(row, () => row.isConnected, () => { row.textContent = tex; });

/** The slot in front of the tools column (see DemonstrationWorkspace), where the docked tab sits in focus order. */
const dockSlot = () => document.getElementById('workspace-dock-slot');

export function GuidedLesson(props: {
    lesson: LessonDefinition;
    capabilities: LessonGraphCapabilities;
    onClose: () => void;
    onModeChange?: (mode: LessonMode) => void;
    registerClose?: (close: (() => void) | undefined) => void;
    registerExit?: (exit: (() => void) | undefined) => void;
    registerGraphActions?: (actions: {animationControls?: React.ReactNode} | undefined) => void;
    visiblePageTitle?: string;
    chapterOwner?: {returnPath: string; returnLabel: string; onReturn: () => void};
}) {
    const {language} = useLanguage();
    const t = useT();
    const lessonTitle = localized(props.lesson.title, language);
    const normalizeTitle = (title: string) => title.replace(/\s+/g, ' ').trim().toLocaleLowerCase(language);
    const visiblePageTitle = normalizeTitle(props.visiblePageTitle ?? '');
    const pageHeadingHasLessonTitle = !!visiblePageTitle && visiblePageTitle === normalizeTitle(lessonTitle);
    const [startupError, setStartupError] = useState<Error>();
    const [overlayPhase, setOverlayPhase] = useState<LessonOverlayPhase>('visible');
    const [exitRequested, setExitRequested] = useState(false);
    const [exitError, setExitError] = useState(false);
    const layerRef = useRef<HTMLDivElement>(null);
    const navigationFocus = useRef<'back' | 'next'>();
    const lessonRef = useRef<HTMLElement>(null);
    const completionHeadingRef = useRef<HTMLHeadingElement>(null);
    const compactTabRef = useRef<HTMLButtonElement>(null);
    const gripRef = useRef<HTMLButtonElement>(null);
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
    const oneColumn = useOneColumn();
    const overlayVisible = overlayPhase !== 'hidden';
    const tabVisible = overlayPhase === 'closing' || overlayPhase === 'hidden';
    // The panel and the compact tab keep where the learner put them over the graph until another lesson starts.
    const panelDrag = useDraggableOffset(layerRef, lessonRef, overlayVisible, props.lesson);
    const [availablePanelHeight, setAvailablePanelHeight] = useState(480);
    // A formula row wider than the card is set smaller until it fits; the card's width changes with the window.
    useLayoutEffect(() => {
        const panel = lessonRef.current;
        if (!overlayVisible || !panel || typeof ResizeObserver === 'undefined') return undefined;
        let width = panel.clientWidth;
        const observer = new ResizeObserver(() => {
            if (panel.clientWidth === width) return;
            width = panel.clientWidth;
            fitFormulaRows(panel, retypesetFormulaRow);
        });
        observer.observe(panel);
        return () => observer.disconnect();
    }, [overlayVisible]);
    // In a short window the card's heading and navigation stay pinned above its scrolling text; on a one-column screen
    // the navigation row rests on the bottom of the window instead. Both heights are published so that text brought
    // into view by keyboard focus stops clear of them (see the scroll margins in the CSS).
    useLayoutEffect(() => {
        const panel = lessonRef.current;
        const controls = panel?.querySelector<HTMLElement>('.guided-lesson-controls');
        if (!overlayVisible || !panel || !controls || typeof ResizeObserver === 'undefined') return undefined;
        const navigation = panel.querySelector<HTMLElement>('.guided-lesson-navigation');
        const publish = () => {
            panel.style.setProperty('--guided-lesson-controls-height', `${controls.offsetHeight}px`);
            if (navigation) panel.style.setProperty('--guided-lesson-navigation-height', `${navigation.offsetHeight}px`);
        };
        publish();
        const observer = new ResizeObserver(publish);
        observer.observe(controls);
        if (navigation) observer.observe(navigation);
        return () => observer.disconnect();
    }, [overlayVisible, isComplete, oneColumn]);
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
    const dockToolsPick = usePick('dockTools');
    // Decided when the card is hidden (from its dock or not); the tab's own offset is set only after it mounts.
    const [tabInDock, setTabInDock] = useState(true);
    const dockedTab = dockToolsPick && !oneColumn && tabInDock;
    // Pick boardText: the card can take a place in the graph dock (see useLessonDock). Pick toolsCard: the card is a board
    // card like the tools (a DockCard on the graph, no lesson column; see the render below), so the dock hook stands aside.
    const boardTextPick = usePick('boardText');
    const lessonOnGraph = usePick('toolsCard') && !oneColumn;
    useLessonDock({enabled: boardTextPick && !oneColumn && !lessonOnGraph, lesson: props.lesson, panelDrag, tabDrag, panelRef: lessonRef, tabRef: compactTabRef, layerRef, phase: overlayPhase});
    // Once either has been moved they travel together: hiding leaves the tab at the panel's corner and
    // reopening opens the panel at the tab, so the instructions come back where they were put away.
    const handOverPlacement = (from: typeof panelDrag, to: typeof panelDrag) => {
        if (!isMoved(panelDrag) && !isMoved(tabDrag)) return;
        // One that is back at its home brings the other home too.
        if (!isMoved(from)) {
            to.home();
            return;
        }
        const corner = from.topLeft();
        if (corner) to.moveTo(corner);
    };
    // A visible reading card locks graph edits; hiding the card unlocks the current scene. The card of an observation
    // frame and the closing card are task cards: the tools stay live beside them, so their mode is never 'content'.
    const cardMode: LessonMode = isComplete ? 'complete' : isExploring ? 'explore' : 'content';
    const mode: LessonMode = overlayPhase === 'visible' || overlayPhase === 'opening' ? cardMode : 'explore';
    const onModeChange = props.onModeChange;
    // The task card carries the animation controls itself; the workspace header offers them only while the card is away.
    const cardOpen = overlayPhase === 'visible' || overlayPhase === 'opening';

    // On a phone or a short window the page is brought to the graph's top edge, so the board stays in view above
    // (or beside) the card's first rows. The layer shares the graph's cell; without it the card itself is aligned.
    const alignLessonInWindow = () => {
        (layerRef.current ?? lessonRef.current)?.scrollIntoView?.({block: 'start'});
    };

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
        setTabInDock(!isMoved(panelDrag));
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
        props.onModeChange?.(cardMode);
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
        // Pick toolsCard: Končaj ends the lesson at once and restores the graph, without the "Zapustiti vodeni primer?"
        // question (owner, 2026-11-21: "remove this step too"). A failed restore shows the card's alert.
        if (lessonOnGraph) {
            try {
                session.close();
                props.onModeChange?.('closed');
                props.onClose();
            } catch {
                setExitError(true);
            }
            return;
        }
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
        const typeset = typesetMath(element, () => !cancelled).catch(() => undefined).then(() => {
            if (!cancelled) fitFormulaRows(element, retypesetFormulaRow);
        });
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
        // Activating Next or Back keeps focus on that control while it stays enabled, so repeated Enter keeps
        // advancing; the change itself is announced by the role=status progress region, not by a focus move.
        const navigated = navigationFocus.current;
        navigationFocus.current = undefined;
        const navigationButton = navigated && lessonRef.current?.querySelector<HTMLButtonElement>(`.guided-lesson-nav-${navigated}`);
        if (navigationButton && !navigationButton.disabled) navigationButton.focus({preventScroll: true});
        else (completionHeadingRef.current ?? lessonRef.current)?.focus({preventScroll: true});
        // Align a newly entered lesson once. Even a fractionally clipped navigation button can
        // be clicked; realigning the page after that click would move it away from the pointer.
        if (enteringLesson && lessonRef.current && window.matchMedia?.('(max-width: 700px), (max-height: 520px)').matches) {
            const navigation = lessonRef.current.querySelector('.guided-lesson-navigation')?.getBoundingClientRect();
            const panel = lessonRef.current.getBoundingClientRect();
            const navigationVisible = navigation && navigation.top >= Math.max(0, panel.top)
                && navigation.bottom <= Math.min(window.innerHeight, panel.bottom);
            if (!navigationVisible) alignLessonInWindow();
            frameNeedsScrollReset.current = false;
        } else if (navigated && readingRef.current && window.matchMedia?.('(max-width: 700px)').matches
            && readingRef.current.getBoundingClientRect().top < 0) {
            // On a one-column screen the text scrolls with the page while Back and Next rest on the bottom of the
            // window. A reader who pressed one of them deep in the text starts the new frame from its beginning,
            // with the graph it changed in view. A press with the start of the text in view moves nothing.
            alignLessonInWindow();
        }
        // An observation frame is worked with the graph and the tools: in one column, a task that starts above the window or low in
        // it (under Back and Next once its formulas are typeset) brings the page to the graph, which puts the graph and the start of
        // the task card in view together. Aligning an aligned page moves nothing.
        if (navigated && snapshot.status === 'explore' && window.matchMedia?.('(max-width: 700px)').matches) {
            const prompt = lessonRef.current?.querySelector('.guided-lesson-exploration')?.getBoundingClientRect();
            const bar = lessonRef.current?.querySelector('.guided-lesson-navigation')?.getBoundingClientRect();
            const limit = Math.min(window.innerHeight * 0.6, (bar && bar.height > 0 ? bar.top : window.innerHeight) - 24);
            if (prompt && prompt.height > 0 && (prompt.top < 0 || prompt.top > limit)) alignLessonInWindow();
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
                alignLessonInWindow();
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

    const navigate = useLessonMorph(props.capabilities, refresh, session);
    // Pick toolsCard: reading frames do not lock the graph; once the learner's changes make the graph differ from the frame,
    // the card offers "Povrni", which applies the step's scene again (as Back and Next do).
    const [drifted, clearDrift] = useLessonDrift(lessonOnGraph && snapshot.status === 'content',
        `${snapshot.stepIndex}:${snapshot.frameIndex}`, () => props.capabilities.captureState());
    const restoreFrame = () => { if (lessonOnGraph) stopAllOscillators(); refresh(() => session.reset()); clearDrift(); };
    useLessonCardFit(lessonOnGraph && overlayVisible, props.lesson);
    // Pick a3: a sweep (the ∿ on a puck) belongs to the frame it was started in; any frame change, Povrni, and the lesson's
    // start and close stop every sweep, so the graph never disagrees with the frame it is showing.
    useEffect(() => {
        if (!lessonOnGraph) return undefined;
        stopAllOscillators();
        return () => stopAllOscillators();
    }, [lessonOnGraph, snapshot.stepIndex, snapshot.frameIndex]);

    const close = (restoreCompleted = false) => {
        session.close({restoreCompleted});
        props.onModeChange?.('closed');
        props.onClose();
    };

    const expectedObservations = frame.kind === 'observation' && frame.expectedObservations && frame.expectedObservations.length > 0
        && <details className="guided-lesson-expected" key={`expected-${frame.id}`}>
            <summary>{t('guided_lesson_expected_observations')}</summary>
            {frame.expectedObservations.map((text, index) => <p key={index} data-tex={localized(text, language)}>{localized(text, language)}</p>)}
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
        props.registerGraphActions?.(isExploring && animationControls && !cardOpen ? {animationControls} : undefined);
        return () => props.registerGraphActions?.(undefined);
    }, [session, props.registerGraphActions, isExploring, cardOpen, frame.id, frame.animation?.animationId, language]);

    // Short visible labels keep the heading to one row; each stays contained in its full accessible name.
    const closeButton = <button type="button" className="guided-lesson-exit" aria-label={t('exit_lesson')} title={t('exit_lesson')} onClick={event => requestExit(event.currentTarget)}>{t('exit_lesson_short')}</button>;
    // Docking returns the card and its tab to their homes; the button leaves with the move, so focus goes to the grip.
    const dockCard = () => {
        releaseLesson();
        panelDrag.home();
        tabDrag.home();
    };
    const dockButton = <button type="button" className="guided-lesson-dock" aria-label={t('dock_lesson_instructions')} title={t('dock_lesson_instructions')}
        onClick={() => { dockCard(); gripRef.current?.focus(); }}>{t('dock_lesson_short')}</button>;
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
    const chapterReturnLink = !isComplete && props.chapterOwner && <a className="guided-lesson-chapter-return" href={props.chapterOwner.returnPath} onClick={returnToChapter}>{props.chapterOwner.returnLabel}</a>;
    const lessonHeading = <h2 id="guided-lesson-title" className="guided-lesson-title" title={lessonTitle}>{lessonTitle}</h2>;

    if (startupError) {
        return <><section ref={lessonRef} tabIndex={-1} className="guided-lesson guided-lesson-content guided-lesson-docked" aria-labelledby="guided-lesson-title">
            <div className="guided-lesson-heading">
                {lessonHeading}
                <div className="guided-lesson-utilities">{chapterReturnLink}{closeButton}</div>
            </div>
            {exitError && <p role="alert">{t('guided_lesson_exit_restore_error')}</p>}
            <p role="alert">{t('guided_lesson_scene_error')} {startupError.message}</p>
        </section>{exitDialog}</>;
    }

    const frameAction = frame.action;
    const atFirstFrame = snapshot.stepIndex === 0 && snapshot.frameIndex === 0;
    const atLastFrame = snapshot.stepIndex === props.lesson.steps.length - 1 && snapshot.frameIndex === frames.length - 1;
    // One fact decides Naprej's visible label, its accessible name and its fold twin: pressing it ends the lesson (session.next()
    // completes exactly when the last frame of the last step is shown).
    const nextEndsLesson = atLastFrame && !isComplete;
    const {onKeyDown: movePanelKey, ...panelPointerHandlers} = panelDrag.handleProps;
    // A keyboard move takes the card out of its graph place.
    const movePanelByKey = (event: React.KeyboardEvent<HTMLElement>) => { if (event.key.startsWith('Arrow') || event.key === 'Home') releaseLesson(); movePanelKey(event); };
    // The whole heading row moves the panel, except presses that start on its own actions.
    const startPanelDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (event.target instanceof Element && event.target.closest('a, button:not(.guided-lesson-grip)')) return;
        panelPointerHandlers.onPointerDown(event);
    };
    const dockOnDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (event.target instanceof Element && event.target.closest('a, button:not(.guided-lesson-grip)')) return;
        dockCard();
    };
    // Back and Next sit beside the progress in the tools column. In one column they are the card's last row, after the
    // text in the document as on the screen, where the stylesheet rests them on the bottom edge of the window.
    const navigation = !isComplete && <nav className="guided-lesson-navigation" aria-label={t('guided_lesson_navigation')}>
            <button type="button" className="guided-lesson-nav guided-lesson-nav-back" aria-label={t('guided_lesson_previous_frame_accessible')} disabled={atFirstFrame} onClick={() => { navigationFocus.current = 'back'; if (lessonOnGraph) stopAllOscillators(); navigate(() => session.back()); }}>
                {lessonOnGraph ? <><ChevronLeftIcon/><span className="ux-nav-label">{t('guided_lesson_previous_frame_short')}</span></> : t('guided_lesson_previous_frame_short')}
            </button>
            <button type="button" className="guided-lesson-nav guided-lesson-nav-next guided-lesson-primary" aria-label={nextEndsLesson ? t('finish_lesson_accessible') : t('guided_lesson_next_frame_accessible')} onClick={() => { navigationFocus.current = 'next'; if (lessonOnGraph) stopAllOscillators(); navigate(() => session.next()); }}>
                {nextEndsLesson ? t('finish_lesson_short') : t('guided_lesson_next_frame_short')}{lessonOnGraph && !nextEndsLesson && <ChevronRightIcon/>}
            </button>
        </nav>;
    const navigationToolbar = !isComplete && <div className="guided-lesson-toolbar">
        <div className="guided-lesson-progress-group">
            <span className="guided-lesson-frame-label">{frameLabel(frame)}</span>
            <div className="guided-lesson-progress" role="status" aria-live="polite">
                {t('guided_lesson_step', {value0: snapshot.stepIndex + 1, value1: props.lesson.steps.length})} · {t('guided_lesson_frame', {value0: snapshot.frameIndex + 1, value1: frames.length})}
                {/* A task card leaves the graph and the tools live; a reading card locks them, so the change is announced. */}
                {isExploring && <span className="visually-hidden"> {t('guided_lesson_tools_live')}</span>}
            </div>
        </div>
        {!oneColumn && navigation}
    </div>;
    const CompletionHeading = pageHeadingHasLessonTitle ? 'h2' : 'h3';
    const completionHeading = isComplete && <CompletionHeading ref={completionHeadingRef} tabIndex={-1} className="guided-lesson-completion-title">
        {t('guided_lesson_complete')}
    </CompletionHeading>;
    const sectionStyle = {...panelDrag.style, '--guided-lesson-max-height': `${availablePanelHeight}px`} as React.CSSProperties;
    // The card's home is the tools column beside the graph (below the graph on one-column screens), so it never
    // covers the board. It leaves that home only when the learner drags it.
    const docked = !isMoved(panelDrag);
    // While the card is carried away from home, a dashed outline shows where it docks.
    const homeSlot = panelDrag.dragHome && !docked && <div className="guided-lesson-home-slot" aria-hidden="true" style={{
        left: panelDrag.dragHome.left, top: panelDrag.dragHome.top,
        width: panelDrag.dragHome.right - panelDrag.dragHome.left, height: panelDrag.dragHome.bottom - panelDrag.dragHome.top,
    }}/>;
    const cardBody = <>
        {exitError && !exitRequested && <p role="alert">{t('guided_lesson_exit_restore_error')}</p>}
        <div className="guided-lesson-reading" ref={readingRef}>
        {!isExploring && !isComplete && snapshot.stepIndex === 0 && snapshot.frameIndex === 0 && <p className="guided-lesson-summary" data-tex={localized(props.lesson.summary, language)}>{localized(props.lesson.summary, language)}</p>}
        {!isComplete && !isExploring && <div className="guided-lesson-frame" key={frame.id}>
            <h3>{localized(frame.title, language)}</h3>
            {frame.body && <p data-tex={localized(frame.body, language)}>{localized(frame.body, language)}</p>}
            {frame.notation?.map((formula, index) => <div className="guided-lesson-notation" key={index} data-tex={localized(formula, language)} role="region" tabIndex={0} aria-label={t('guided_lesson_formula_region')}>{localized(formula, language)}</div>)}
            {frame.kind === 'calculation' && frame.workedExample && <div className="guided-lesson-worked-example">
                <h4>{localized(frame.workedExample.title, language)}</h4>
                <div className="guided-lesson-notation" data-tex={localized(frame.workedExample.calculation, language)} role="region" tabIndex={0} aria-label={t('guided_lesson_formula_region')}>{localized(frame.workedExample.calculation, language)}</div>
                <div className="guided-lesson-notation" data-tex={localized(frame.workedExample.result, language)} role="region" tabIndex={0} aria-label={t('guided_lesson_formula_region')}>{localized(frame.workedExample.result, language)}</div>
                <p data-tex={localized(frame.workedExample.check, language)}>{localized(frame.workedExample.check, language)}</p>
            </div>}
            {expectedObservations}
        </div>}
        {!isComplete && isExploring && <div className="guided-lesson-exploration" key={frame.id}>
            <strong>{localized(frame.title, language)}</strong>
            {frame.prompt && <p data-tex={localized(frame.prompt, language)}>{localized(frame.prompt, language)}</p>}
            {animationControls}
            {expectedObservations}
        </div>}
        {isComplete && <div className="guided-lesson-completion-message">
            {(!pageHeadingHasLessonTitle || lessonOnGraph) && completionHeading}
            <p>{t('guided_lesson_free_exploration')}</p>
            {lessonOnGraph && <section className="ux-lesson-recap" aria-labelledby="ux-lesson-recap-title">
                <h4 id="ux-lesson-recap-title">Kaj si spoznal</h4>
                <ol>{props.lesson.steps.map(s => <li key={s.id} data-tex={localized(s.title, language)}>{localized(s.title, language)}</li>)}</ol>
            </section>}
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
        {oneColumn && navigation}
    </>;
    // Pick toolsCard: the card is a board card (DockCard) on the graph, like the tools: it docks at any anchor or floats, its
    // place is remembered for the whole app, and its fold is hiding the instructions (Skrij). The head carries the title
    // (folded: also the progress), and "⋯" (chapter return, Končaj); the body is the card without its own heading row.
    // It starts at the top left above the tools, which fold while a frame is read (owner, 2026-11-21: "Lesson takes
    // top-left"). Its kind is `guide`, not dockLayout's `lesson` placeholder (boardText's beside-the-graph card).
    if (lessonOnGraph) {
        const cardTitle = pageHeadingHasLessonTitle ? t('guided_example') : lessonTitle;
        const progress = `${snapshot.stepIndex + 1}/${props.lesson.steps.length} · ${snapshot.frameIndex + 1}/${frames.length}`;
        // Redesign (owner, 2026-11-21): one row under the title holds the progress line, the step rail and Back/Next, so Next
        // stays in one place on every frame (owner: buttons under the text "will jump when somebody just wants to scroll
        // through the lesson"); the text follows. The lesson-level actions sit behind "⋯" in the head, which stays one row.
        const rail = <span className="ux-lesson-rail" aria-hidden="true">{props.lesson.steps.map((_, i) => <span key={i}
            className={i < snapshot.stepIndex ? 'is-done' : i === snapshot.stepIndex ? 'is-current' : undefined}
            style={{'--fill': i < snapshot.stepIndex ? 1 : i === snapshot.stepIndex ? (snapshot.frameIndex + 1) / frames.length : 0} as React.CSSProperties}/>)}</span>;
        // The completion card keeps the row (owner, 2026-11-21: "have a back button here too"): a full rail and Back at the
        // place it has on every frame, so the learner who pressed Končaj finds the way back under the same spot.
        const completeProgress = isComplete && <div className="ux-lesson-progress ux-lesson-progress-complete">
            <div className="guided-lesson-progress">
                <span className="guided-lesson-frame-label">Končano</span>
                <span aria-hidden="true"> · </span>{t('guided_lesson_step', {value0: props.lesson.steps.length, value1: props.lesson.steps.length})}
            </div>
            <span className="ux-lesson-rail" aria-hidden="true">{props.lesson.steps.map((_, i) => <span key={i} className="is-done" style={{'--fill': 1} as React.CSSProperties}/>)}</span>
            <nav className="guided-lesson-navigation" aria-label={t('guided_lesson_navigation')}>
                <button type="button" className="guided-lesson-nav guided-lesson-nav-back" aria-label={t('guided_lesson_previous_frame_accessible')}
                    onClick={() => { navigationFocus.current = 'back'; stopAllOscillators(); navigate(() => session.back()); }}>
                    <ChevronLeftIcon/><span className="ux-nav-label">{t('guided_lesson_previous_frame_short')}</span>
                </button>
                <span className="ux-nav-next-slot" aria-hidden="true"/>
            </nav>
        </div>;
        const cardProgress = isComplete ? completeProgress : <div className="ux-lesson-progress">
            <div className="guided-lesson-progress" role="status" aria-live="polite">
                <span className="guided-lesson-frame-label">{frameLabel(frame)}</span>
                <span aria-hidden="true"> · </span><span className="ux-lesson-frame-count">{t('guided_lesson_step', {value0: snapshot.stepIndex + 1, value1: props.lesson.steps.length})}</span>
                {frames.length > 1 && <><span aria-hidden="true" className="ux-lesson-frame-count"> · {snapshot.frameIndex + 1}/{frames.length}</span>
                    <span className="visually-hidden">, {t('guided_lesson_frame', {value0: snapshot.frameIndex + 1, value1: frames.length})}</span></>}
                {isExploring && <span className="visually-hidden"> {t('guided_lesson_tools_live')}</span>}
            </div>
            {rail}
            {navigation}
            {drifted && !isExploring && <p className="ux-lesson-drift" role="status">
                <span>Graf se razlikuje od razlage.</span>
                <button type="button" onClick={restoreFrame}>Povrni</button>
            </p>}
        </div>;
        const menu = <LessonMenu label="Več možnosti vodenega primera">{(trigger, close) => <>
            {chapterReturnLink}
            <button type="button" className="guided-lesson-exit" onClick={() => { close(); requestExit(trigger()); }}>{t('exit_lesson')}</button>
        </>}</LessonMenu>;
        return <>
            <DockCard kind="guide" title={cardTitle} what="navodila" region="tl" order={-1}
                collapsed={!cardOpen} onToggle={open => { if (open) showOverlay(); else hideOverlay(); }}
                head={<><span id="guided-lesson-title" className="ux-lesson-card-title" title={lessonTitle}>{cardTitle}</span>
                    {!cardOpen && !isComplete && <span className="ux-lesson-card-progress">{progress}</span>}
                    {!cardOpen && !isComplete && <span className="ux-lesson-fold-nav">
                        <button type="button" className="ux-btext-toggle" aria-label={t('guided_lesson_previous_frame_accessible')} title={t('guided_lesson_previous_frame_accessible')} disabled={atFirstFrame}
                            onClick={() => { stopAllOscillators(); navigate(() => session.back()); }}><ChevronLeftIcon/></button>
                        <button type="button" className="ux-btext-toggle" aria-label={nextEndsLesson ? t('finish_lesson_accessible') : t('guided_lesson_next_frame_accessible')} title={nextEndsLesson ? t('finish_lesson_accessible') : t('guided_lesson_next_frame_accessible')}
                            onClick={() => { stopAllOscillators(); navigate(() => session.next()); }}><ChevronRightIcon/></button>
                    </span>}</>}
                actions={menu}>
                {() => overlayVisible && <section ref={lessonRef} tabIndex={-1} className={`guided-lesson guided-lesson-on-graph guided-lesson-${mode} guided-lesson-frame-${frame.kind}${isExploring ? ' guided-lesson-task' : ''} guided-lesson-handoff-${overlayPhase}`} aria-labelledby="guided-lesson-title">
                    {cardProgress}
                    {cardBody}
                </section>}
            </DockCard>
            {exitDialog}
        </>;
    }
    return <>
    {homeSlot}
    {overlayVisible && <section ref={lessonRef} tabIndex={-1} style={sectionStyle} className={`guided-lesson guided-lesson-${mode} guided-lesson-frame-${frame.kind}${isExploring ? ' guided-lesson-task' : ''} guided-lesson-handoff-${overlayPhase}${docked ? ' guided-lesson-docked' : ''}${panelDrag.dragging ? ' guided-lesson-dragging' : ''}`} aria-labelledby={pageHeadingHasLessonTitle ? undefined : 'guided-lesson-title'} aria-label={pageHeadingHasLessonTitle ? lessonTitle : undefined}>
        <div className="guided-lesson-controls">
        <div className="guided-lesson-heading" {...panelPointerHandlers} onPointerDown={startPanelDrag} onDoubleClick={dockOnDoubleClick}>
            <button ref={gripRef} type="button" className="guided-lesson-grip" aria-label={t('move_lesson_instructions')} title={t('move_lesson_instructions')}
                aria-keyshortcuts={ARROW_KEYS} onKeyDown={movePanelByKey}><GripIcon/></button>
            {/* The page heading already names the lesson; the card then says what it is, so its first row is never bare. */}
            {pageHeadingHasLessonTitle ? completionHeading || <span className="guided-lesson-title guided-lesson-kind">{t('guided_example')}</span> : lessonHeading}
            <div className="guided-lesson-utilities">{chapterReturnLink}{!docked && dockButton}{hideButton}{closeButton}</div>
        </div>
        {navigationToolbar}
        </div>
        {cardBody}
    </section>}
    <div ref={layerRef} className="guided-lesson-layer">
    {/* The graph is a pointer target for hiding the instructions;
        keyboard and screen-reader users keep the buttons, so the catcher stays out of the accessibility tree. */}
    {overlayPhase === 'visible' && !isExploring && <div className="guided-lesson-graph-catcher" aria-hidden="true" title={t('hide_lesson_instructions')} onClick={hideOverlay}/>}
    {tabVisible && !dockedTab && <button ref={compactTabRef} type="button" style={tabDrag.style} className={`guided-lesson-tab${tabDrag.dragging ? ' guided-lesson-dragging' : ''}`}
        onClick={() => { if (!tabDrag.consumeDragClick()) showOverlay(); }} {...tabDrag.handleProps} aria-keyshortcuts={ARROW_KEYS}
        aria-label={`${lessonTitle}, ${t('guided_lesson_step', {value0: snapshot.stepIndex + 1, value1: props.lesson.steps.length})}, ${t('guided_lesson_frame', {value0: snapshot.frameIndex + 1, value1: frames.length})}. ${t('back_to_instructions')}`}>
        <GripIcon/>
        <span className="guided-lesson-tab-title">{t('guided_example')}</span>
        <span className="guided-lesson-tab-progress">{snapshot.stepIndex + 1}/{props.lesson.steps.length} · {snapshot.frameIndex + 1}/{frames.length}</span>
        <svg className="guided-lesson-tab-expand" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </button>}
    </div>
    {/* Pick dockTools: a card hidden from its dock leaves its tab in the dock, at the top of the tools column, not on
        the graph. The tab reopens the card in the same place; it is not dragged (open the card to move it). */}
    {tabVisible && dockedTab && dockSlot() && createPortal(<button ref={compactTabRef} type="button" className="guided-lesson-tab guided-lesson-tab-docked"
        onClick={showOverlay}
        aria-label={`${lessonTitle}, ${t('guided_lesson_step', {value0: snapshot.stepIndex + 1, value1: props.lesson.steps.length})}, ${t('guided_lesson_frame', {value0: snapshot.frameIndex + 1, value1: frames.length})}. ${t('back_to_instructions')}`}>
        <span className="guided-lesson-tab-title">{t('guided_example')}</span>
        <span className="guided-lesson-tab-progress">{snapshot.stepIndex + 1}/{props.lesson.steps.length} · {snapshot.frameIndex + 1}/{frames.length}</span>
        <span className="guided-lesson-tab-open">Odpri</span>
        <svg className="guided-lesson-tab-expand" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </button>, dockSlot()!)}
    {exitDialog}
    </>;
}
