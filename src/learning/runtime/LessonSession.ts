import {framesForLessonStep} from '../model';
import type {LessonAction, LessonDefinition, LessonGraphCapabilities, LessonSceneCheckpoint} from '../model';

export type LessonSessionStatus = 'content' | 'explore' | 'complete' | 'closed';

export interface LessonSessionSnapshot {
    readonly status: LessonSessionStatus;
    readonly stepIndex: number;
    readonly frameIndex: number;
    readonly error?: string;
}

export class LessonSession {
    private checkpoint?: LessonSceneCheckpoint;
    // Track whether lesson setup or exploration may have changed the graph from the checkpoint.
    private graphNeedsRestore = false;
    private currentSnapshot: LessonSessionSnapshot = {status: 'closed', stepIndex: 0, frameIndex: 0};
    private readonly listeners = new Set<() => void>();

    constructor(readonly lesson: LessonDefinition, private readonly capabilities: LessonGraphCapabilities) {}

    /** The current state; the same object until a transition changes it (useSyncExternalStore contract). */
    getSnapshot = (): LessonSessionSnapshot => this.currentSnapshot;

    snapshot() {
        return this.currentSnapshot;
    }

    /** Registers a transition listener and returns its unsubscribe function. */
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    private get snapshotValue(): LessonSessionSnapshot {
        return this.currentSnapshot;
    }

    // Every transition assigns here; an unchanged state keeps its identity and does not notify.
    private set snapshotValue(next: LessonSessionSnapshot) {
        const current = this.currentSnapshot;
        if (current.status === next.status && current.stepIndex === next.stepIndex
            && current.frameIndex === next.frameIndex && current.error === next.error) return;
        this.currentSnapshot = next;
        [...this.listeners].forEach(listener => listener());
    }

    start() {
        this.stopAnimations();
        this.checkpoint = this.capabilities.captureState();
        this.snapshotValue = {status: 'content', stepIndex: 0, frameIndex: 0};
        const scene = this.lesson.steps[0].scene;
        // An explicit empty scene still has meaning: its prepared-scene action
        // restores the demonstration default before any later actions run.
        this.graphNeedsRestore = scene !== undefined;
        // The checkpoint was captured from this live graph, so the first scene
        // can be applied in place. Later scenes restore the checkpoint first.
        if (scene) {
            this.applyActions(scene.actions, false);
        }
    }

    explore() {
        const frames = framesForLessonStep(this.lesson.steps[this.snapshotValue.stepIndex]);
        const observationIndex = frames.findIndex(frame => frame.kind === 'observation');
        this.snapshotValue = {
            ...this.snapshotValue,
            frameIndex: observationIndex >= 0 ? observationIndex : this.snapshotValue.frameIndex,
            status: 'explore',
            error: undefined,
        };
        this.graphNeedsRestore = true;
    }

    showContent() {
        if (this.snapshotValue.status === 'explore') {
            this.stopAnimations();
            const frames = framesForLessonStep(this.lesson.steps[this.snapshotValue.stepIndex]);
            const firstReadingFrame = frames.findIndex(frame => frame.kind !== 'observation');
            this.snapshotValue = {
                ...this.snapshotValue,
                frameIndex: firstReadingFrame >= 0 ? firstReadingFrame : this.snapshotValue.frameIndex,
                status: 'content',
                error: undefined,
            };
            this.graphNeedsRestore = true;
        }
    }

    next() {
        const currentFrames = framesForLessonStep(this.lesson.steps[this.snapshotValue.stepIndex]);
        if (this.snapshotValue.frameIndex < currentFrames.length - 1) {
            this.stopAnimations();
            const frameIndex = this.snapshotValue.frameIndex + 1;
            this.applyCurrentScene();
            this.snapshotValue = {
                ...this.snapshotValue,
                frameIndex,
                status: currentFrames[frameIndex].kind === 'observation' ? 'explore' : 'content',
                error: undefined,
            };
            if (currentFrames[frameIndex].kind === 'observation') this.graphNeedsRestore = true;
            return;
        }
        if (this.snapshotValue.stepIndex >= this.lesson.steps.length - 1) {
            this.stopAnimations();
            this.snapshotValue = {...this.snapshotValue, status: 'complete', error: undefined};
            return;
        }
        this.stopAnimations();
        const stepIndex = this.snapshotValue.stepIndex + 1;
        this.applyScene(stepIndex, true);
        this.snapshotValue = {...this.snapshotValue, stepIndex, frameIndex: 0, status: 'content', error: undefined};
    }

    back() {
        const currentFrames = framesForLessonStep(this.lesson.steps[this.snapshotValue.stepIndex]);
        if (this.snapshotValue.frameIndex > 0) {
            this.stopAnimations();
            const frameIndex = this.snapshotValue.frameIndex - 1;
            this.applyCurrentScene();
            this.snapshotValue = {
                ...this.snapshotValue,
                frameIndex,
                status: currentFrames[frameIndex].kind === 'observation' ? 'explore' : 'content',
                error: undefined,
            };
            return;
        }
        if (this.snapshotValue.stepIndex === 0) return;
        this.stopAnimations();
        const stepIndex = this.snapshotValue.stepIndex - 1;
        const previousFrames = framesForLessonStep(this.lesson.steps[stepIndex]);
        const frameIndex = previousFrames.length - 1;
        this.applyScene(stepIndex, true);
        this.snapshotValue = {
            ...this.snapshotValue,
            stepIndex,
            frameIndex,
            status: previousFrames[frameIndex].kind === 'observation' ? 'explore' : 'content',
            error: undefined,
        };
        if (previousFrames[frameIndex].kind === 'observation') this.graphNeedsRestore = true;
        this.applyCurrentScene();
    }

    reset() {
        this.stopAnimations();
        this.applyCurrentScene();
    }

    applyCurrentAction() {
        const step = this.lesson.steps[this.snapshotValue.stepIndex];
        const frame = framesForLessonStep(step)[this.snapshotValue.frameIndex];
        const action = frame.action?.action ?? step.action?.action;
        if (action) {
            this.stopAnimations();
            this.graphNeedsRestore = true;
            this.applyActions([...(step.scene?.actions ?? []), action]);
        }
    }

    applyAnimation(animationId: 'decasteljau', command: 'play' | 'pause' | 'replay' | 'stop') {
        this.graphNeedsRestore = true;
        this.capabilities.apply({kind: 'animation', animationId, command});
    }

    close() {
        this.stopAnimations();
        const graphIsAvailable = this.capabilities.isAvailable?.() ?? true;
        if (this.snapshotValue.status !== 'closed' && this.checkpoint && graphIsAvailable) {
            this.capabilities.restoreState(this.checkpoint);
        }
        this.snapshotValue = {...this.snapshotValue, status: 'closed'};
        this.graphNeedsRestore = false;
    }

    private applyCurrentScene() {
        this.stopAnimations();
        this.applyScene(this.snapshotValue.stepIndex);
    }

    private applyScene(stepIndex: number, restoreWhenAbsent = false) {
        const scene = this.lesson.steps[stepIndex].scene;
        // Steps without a declared scene keep the last prepared scene. They
        // are explanatory frames when staying inside a step. Crossing to a
        // scene-less step restores the captured graph instead.
        if (scene) {
            this.applyActions(scene.actions);
        } else if (restoreWhenAbsent && this.checkpoint) {
            this.capabilities.restoreState(this.checkpoint);
            this.graphNeedsRestore = true;
        }
    }

    private stopAnimations() {
        this.capabilities.stopAnimations?.();
    }

    private applyActions(actions: readonly LessonAction[], restoreBeforeApply = true) {
        if (!this.checkpoint) return;
        try {
            if (restoreBeforeApply) this.capabilities.restoreState(this.checkpoint);
            actions.forEach(action => this.capabilities.apply(action));
            this.graphNeedsRestore = actions.length > 0;
        } catch (error) {
            // A failed scene must not leave half of a scene applied.
            this.capabilities.restoreState(this.checkpoint);
            const message = error instanceof Error ? error.message : 'The lesson scene could not be prepared.';
            this.snapshotValue = {...this.snapshotValue, error: message};
            throw new Error(message);
        }
    }
}
