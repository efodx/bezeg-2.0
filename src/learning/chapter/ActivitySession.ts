import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../model';
import type {ActivityDefinition} from './activities';

/** Runs one authored activity scene through the owning Demonstration's graph capabilities. */
export class ActivitySession {
    constructor(
        private readonly activity: ActivityDefinition,
        private readonly graph: LessonGraphCapabilities,
    ) {}

    /** Restores a visit-local snapshot when present; otherwise builds the authored scene in order. */
    start(snapshot?: LessonSceneCheckpoint): void {
        this.transact(() => {
            if (snapshot) {
                this.graph.restoreState(snapshot);
                this.graph.pauseAnimations?.();
            } else this.applyAuthoredScene();
        });
    }

    /** Returns to the activity's authored example and options. */
    reset(): void {
        this.transact(() => this.applyAuthoredScene());
    }

    /** Captures a settled, paused scene for the handler's visit-scoped memory. */
    capture(): LessonSceneCheckpoint {
        return this.transact(() => {
            this.graph.pauseAnimations?.();
            return this.graph.captureState();
        }, false);
    }

    private applyAuthoredScene(): void {
        for (const action of this.activity.actions) this.graph.apply(action);
        this.graph.pauseAnimations?.();
    }

    private transact<T>(operation: () => T, stopBefore = true): T {
        if (this.graph.isAvailable?.() === false) throw new Error('This activity graph is no longer available.');
        this.graph.pauseAnimations?.();
        const rollback = this.graph.captureState();
        try {
            if (stopBefore) this.graph.stopAnimations?.();
            return operation();
        } catch (error) {
            try {
                this.graph.stopAnimations?.();
                this.graph.restoreState(rollback);
            } catch (rollbackError) {
                throw new ActivitySessionRollbackError(error, rollbackError);
            }
            throw error;
        }
    }
}

export class ActivitySessionRollbackError extends Error {
    constructor(readonly operationError: unknown, readonly rollbackError: unknown) {
        super('The activity operation failed, and its previous graph state could not be restored.');
        this.name = 'ActivitySessionRollbackError';
    }
}
