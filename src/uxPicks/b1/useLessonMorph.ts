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
        if (handle) void handle.done.then(() => { director.endMorph(); settle(); }); else settle();
    };
}
