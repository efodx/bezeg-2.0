import {useEffect, useRef} from 'react';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../../learning/model';
import {findMainBoard} from './board';
import {morphScene, type MorphHandle} from './morph';
import {captureBoardPicture, revealChanges} from './sceneReveal';
import {usePick} from '../picks';
import {director} from '../declare/viewDirector';

/**
 * Pick b1 (from ux-challenge/b): Back and Next morph the graph from the old scene to the new one instead of jumping.
 * Numbers in the scene checkpoint slide, discrete choices switch, new board elements draw in and removed ones fade.
 * Works for every lesson through captureState/restoreState; no per-lesson code.
 */
export function useLessonMorph(capabilities: LessonGraphCapabilities, run: (operation: () => void) => void, sessionKey: unknown) {
    const on = usePick('b1');
    const morph = useRef<MorphHandle>();
    useEffect(() => () => { morph.current?.finish(); morph.current = undefined; }, [capabilities, sessionKey]);

    return (operation: () => void) => {
        morph.current?.finish();
        morph.current = undefined;
        if (!on) { run(operation); return; }
        const board = findMainBoard();
        const picture = board && captureBoardPicture(board);
        let before: LessonSceneCheckpoint | undefined;
        try { before = capabilities.captureState(); } catch { before = undefined; }
        run(operation);
        if (!before) return;
        const handle = morphScene(capabilities, before, {onStart: () => { director.beginMorph(); }, onFrame: t => director.progress(t)});
        morph.current = handle;
        const settle = () => requestAnimationFrame(() => { if (picture) revealChanges(picture); });
        if (handle) {
            const stopListening = yieldToLearner(handle);
            void handle.done.then(() => { stopListening(); director.endMorph(); settle(); });
        } else settle();
    };
}

/**
 * Who wins (owner, 2026-11-22: "if a user wanted to watch, he wouldn't be pressing"): the learner. The morph writes the whole
 * scene every frame and its end writes the lesson's target; other writers of the same values are the learner's controls
 * (pucks, the tools card, board drags, keys), the sweep (a3) and undo/Povrni. A pointer or key on a control or the board
 * while the morph runs ends it at once, in the capture phase: the graph jumps to the lesson's target scene and the learner's
 * own input then lands on that scene, never overwritten by a later morph frame. Naprej/Nazaj finish the morph themselves.
 */
const SKIP_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'CapsLock']);
const LEARNER_TARGET = 'input, select, textarea, button, [data-param], svg';
function yieldToLearner(handle: MorphHandle): () => void {
    const onInput = (event: Event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target || target.closest('.ux-bcard-guide, .guided-lesson')) return;
        if (event instanceof KeyboardEvent && SKIP_KEYS.has(event.key)) return;
        if (event instanceof PointerEvent && event.button !== 0) return;
        if (!target.closest('.ux-board-frame, #workspace-inspector') || !target.closest(LEARNER_TARGET)) return;
        handle.finish();
    };
    document.addEventListener('pointerdown', onInput, true);
    document.addEventListener('keydown', onInput, true);
    return () => { document.removeEventListener('pointerdown', onInput, true); document.removeEventListener('keydown', onInput, true); };
}
