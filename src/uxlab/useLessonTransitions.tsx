import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {findMainBoard, type UxBoard} from './board';
import {uxEnabled} from './flags';
import {boardGeometryKeys, changedSamples, matchScore, type Sample} from './geometrySamples';
import {checkpointsDiffer, morphScene, type MorphHandle} from './morph';
import {PredictOverlay} from './PredictOverlay';
import {captureBoardPicture, revealChanges, type BoardPicture} from './sceneReveal';

interface Prediction {
    board: UxBoard;
    before: LessonSceneCheckpoint;
    after: LessonSceneCheckpoint;
    picture: BoardPicture;
    beforeKeys: Set<string>;
    strokes: Sample[][];
    phase: 'predict' | 'revealing' | 'scored';
    score?: number;
}

function capture(capabilities: LessonGraphCapabilities): LessonSceneCheckpoint | undefined {
    try { return capabilities.captureState(); } catch { return undefined; }
}

/**
 * Lane B b1/b2: lesson navigation that shows the change. b1 morphs every scene change; b2 first holds the old scene
 * and asks the learner to sketch a prediction, then morphs the truth in and scores the sketch.
 */
export function useLessonTransitions(capabilities: LessonGraphCapabilities, run: (operation: () => void) => void, sessionKey: unknown) {
    const morph = useRef<MorphHandle>();
    const [prediction, setPrediction] = useState<Prediction>();
    const predictionRef = useRef<Prediction>();
    predictionRef.current = prediction;
    const morphOn = uxEnabled('b1') || uxEnabled('b2');
    const predictOn = uxEnabled('b2');

    useEffect(() => () => {
        morph.current?.finish();
        const pending = predictionRef.current;
        if (pending?.phase === 'predict') {
            try { capabilities.restoreState(pending.after); } catch { /* the graph is gone */ }
        }
        setPrediction(undefined);
    }, [capabilities, sessionKey]);

    const reveal = useCallback(() => {
        const pending = predictionRef.current;
        if (!pending || pending.phase !== 'predict') return;
        try { capabilities.restoreState(pending.after); } catch { setPrediction(undefined); return; }
        const revealing: Prediction = {...pending, phase: 'revealing'};
        setPrediction(revealing);
        const handle = morphScene(capabilities, pending.before);
        morph.current = handle;
        const settle = () => requestAnimationFrame(() => {
            revealChanges(pending.picture);
            const target = changedSamples(pending.board, pending.beforeKeys);
            const sketch = pending.strokes.flat();
            const score = sketch.length ? matchScore(sketch, target) : undefined;
            setPrediction(current => current === revealing || current?.before === pending.before ? {...revealing, phase: 'scored', score} : current);
            if (!sketch.length) setPrediction(undefined);
        });
        if (handle) void handle.done.then(settle); else settle();
    }, [capabilities]);

    const navigate = (operation: () => void, forward: boolean) => {
        const pending = predictionRef.current;
        if (pending?.phase === 'predict') { reveal(); return; }
        if (pending) setPrediction(undefined);
        morph.current?.finish();
        morph.current = undefined;
        if (!morphOn) { run(operation); return; }
        const board = findMainBoard();
        const picture = board && captureBoardPicture(board);
        const beforeKeys = board ? boardGeometryKeys(board) : new Set<string>();
        const before = capture(capabilities);
        run(operation);
        if (!before) return;
        if (predictOn && forward && board && picture) {
            const after = capture(capabilities);
            if (after && checkpointsDiffer(before, after)) {
                try { capabilities.restoreState(before); } catch { return; }
                setPrediction({board, before, after, picture, beforeKeys, strokes: [], phase: 'predict'});
                return;
            }
        }
        const handle = morphScene(capabilities, before);
        morph.current = handle;
        const settle = () => requestAnimationFrame(() => { if (picture) revealChanges(picture); });
        if (handle) void handle.done.then(settle); else settle();
    };

    const overlay: React.ReactNode = prediction && <PredictOverlay board={prediction.board} phase={prediction.phase} score={prediction.score}
        strokes={prediction.strokes}
        onStrokes={strokes => setPrediction(current => current && {...current, strokes})}
        onReveal={reveal}
        onDismiss={() => setPrediction(undefined)}/>;

    return {navigate, overlay, predicting: prediction?.phase === 'predict'};
}
