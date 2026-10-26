import type {DemonstrationId} from '../../demonstrations';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../model';
import {ActivitySession, ActivitySessionRollbackError} from './ActivitySession';
import type {ActivityDefinition, ActivityId} from './activities';
import {activityEntryState as createActivityEntryState, captureReading, chapterPath,
    readActivityEntry as validateActivityEntry, restoreReading as restoreBrowserReading,
    writeReadingInvocation} from './navigationMemory';

const relatedSections: Partial<Record<DemonstrationId, string>> = {
    bezier: 'control-points', decasteljau: 'interpolation', bernstein: 'bernstein-form', affine: 'affine-transformations',
};
type ReadingLocation = ReturnType<typeof captureReading>;

/** Owns the graph snapshots and scene transitions for one in-memory chapter visit. */
export class ChapterActivityVisit {
    private readonly activityScenes = new Map<ActivityId, LessonSceneCheckpoint>();
    private readonly ordinaryScenes = new Map<DemonstrationId, LessonSceneCheckpoint>();
    private readonly readingLocations = new Map<ActivityId, ReadingLocation>();
    private readonly ordinaryEntries = new Map<string, DemonstrationId>();
    private readonly predecessors = new Map<string, string>();
    private session?: {activityId: ActivityId; value: ActivitySession; active: boolean};
    private retryOperation?: () => void;
    private reading?: ReadingLocation;
    private ordinaryPath?: string;
    private pendingReturn = false;
    private lastSection = 'control-points';
    private activityVisited = false;
    private launched?: {id: ActivityId; readingKey: string};
    private beforeOperation?: () => void;

    private run(operation: () => void): void {
        const retry = () => {
            this.beforeOperation?.();
            operation();
        };
        this.retryOperation = retry;
        retry();
    }

    enterActivity(activity: ActivityDefinition, graph: LessonGraphCapabilities, entryKey: string,
        beforeOperation: () => void = () => {}): void {
        this.beforeOperation = beforeOperation;
        const session = new ActivitySession(activity, graph);
        const current = {activityId: activity.id, value: session, active: false};
        this.session = current;
        this.reading = this.readingLocations.get(activity.id);
        this.lastSection = activity.sectionId;
        this.activityVisited = true;
        if (this.reading) this.pendingReturn = true;
        this.run(() => {
            session.start(this.activityScenes.get(activity.id));
            current.active = true;
            if (this.launched?.id === activity.id) {
                this.predecessors.set(entryKey, this.launched.readingKey);
                this.launched = undefined;
            }
        });
    }

    enterOrdinary(demonstrationId: DemonstrationId, graph: LessonGraphCapabilities,
        explicitReturn: boolean, entryKey: string, beforeOperation: () => void = () => {}): void {
        this.beforeOperation = beforeOperation;
        this.session = undefined;
        this.retryOperation = undefined;
        if ((explicitReturn || this.ordinaryEntries.get(entryKey) === demonstrationId) && this.ordinaryScenes.has(demonstrationId)) {
            this.restoreOrdinary(demonstrationId, graph);
        }
    }

    readingReturnPath(): string { return `${chapterPath}#${this.reading?.sectionId ?? this.lastSection}`; }
    ordinaryReturnPath(): string | undefined { return this.ordinaryPath; }
    hasChapterReturn(): boolean { return this.activityVisited; }
    supportsRelatedReading(demonstrationId: DemonstrationId): boolean { return Boolean(relatedSections[demonstrationId]); }

    prepareActivityLaunch(activityId: ActivityId, sectionId: string, focusId: string, readingKey: string): void {
        this.reading = captureReading(sectionId, focusId);
        this.readingLocations.set(activityId, this.reading);
        this.lastSection = sectionId;
        this.pendingReturn = true;
        this.launched = {id: activityId, readingKey};
        writeReadingInvocation(activityId, readingKey, this.reading.sectionId);
    }

    activityEntryState(previous: unknown, activityId: ActivityId, readingKey?: string) {
        return createActivityEntryState(previous, activityId, readingKey);
    }

    readActivityEntry(state: unknown, activityId: ActivityId) {
        return validateActivityEntry(state, activityId);
    }

    restoreReading(fallbackSection: string): boolean {
        if (!this.pendingReturn || !this.reading) return false;
        this.pendingReturn = false;
        restoreBrowserReading(this.reading, fallbackSection);
        return true;
    }

    /** Make a guided lesson's authored section the return target while retaining saved activity checkpoints. */
    prepareGuidedLessonReturn(sectionId: string): void {
        this.reading = {sectionId, y: 0, relativeY: 0, focusId: `${sectionId}-heading`};
        this.lastSection = sectionId;
        this.pendingReturn = true;
    }

    private captureActivity(activityId: ActivityId): LessonSceneCheckpoint {
        const current = this.session;
        if (!current || current.activityId !== activityId) throw new Error('The requested chapter activity is not active.');
        const snapshot = current.value.capture();
        this.activityScenes.set(activityId, snapshot);
        return snapshot;
    }

    departActivity(activityId: ActivityId, sectionId: string, beforeCapture: () => void): void {
        const current = this.session;
        if (current?.activityId === activityId) {
            this.reading ??= {sectionId, y: 0, relativeY: 0, focusId: `activity-${activityId}`};
            this.pendingReturn = true;
        }
        try {
            beforeCapture();
            if (current?.activityId === activityId && current.active) this.captureActivity(activityId);
        }
        finally {
            if (!current || current.activityId === activityId) {
                this.session = undefined;
                this.retryOperation = undefined;
                this.beforeOperation = undefined;
            }
        }
    }

    departOrdinary(): void {
        this.session = undefined;
        this.retryOperation = undefined;
        this.beforeOperation = undefined;
    }

    returnToReading(activityId: ActivityId, sectionId: string, currentEntryKey: string, markerPredecessorReadingKey: string | undefined,
        navigate: (useHistoryBack: boolean) => void): void {
        this.run(() => {
            this.captureActivity(activityId);
            this.reading ??= {sectionId, y: 0, relativeY: 0, focusId: `activity-${activityId}`};
            this.pendingReturn = true;
            navigate(this.predecessors.has(currentEntryKey) || markerPredecessorReadingKey !== undefined);
        });
    }

    adoptForExploration(activityId: ActivityId, demonstrationId: DemonstrationId, leaveActivity: () => void): void {
        this.run(() => {
            const snapshot = this.captureActivity(activityId);
            this.ordinaryScenes.set(demonstrationId, snapshot);
            leaveActivity();
        });
    }

    readAbout(demonstrationId: DemonstrationId, graph: LessonGraphCapabilities, sourcePath: string, entryKey: string,
        openReading: (path: string, graphId: DemonstrationId) => void): void {
        const sectionId = relatedSections[demonstrationId];
        if (!sectionId) return;
        this.run(() => {
            this.captureOrdinary(demonstrationId, graph);
            this.pendingReturn = false;
            this.ordinaryPath = sourcePath;
            this.ordinaryEntries.set(entryKey, demonstrationId);
            openReading(`${chapterPath}#${sectionId}`, demonstrationId);
        });
    }

    retry(): void { this.retryOperation?.(); }

    restoreOrdinary(demonstrationId: DemonstrationId, graph: LessonGraphCapabilities): void {
        const saved = this.ordinaryScenes.get(demonstrationId);
        if (!saved) return;
        this.run(() => {
            const rollback = graph.captureState();
            try {
                graph.pauseAnimations?.();
                graph.restoreState(saved);
                graph.pauseAnimations?.();
            } catch (cause) {
                try { graph.restoreState(rollback); }
                catch (rollbackError) { throw new ActivitySessionRollbackError(cause, rollbackError); }
                throw cause;
            }
        });
    }

    private captureOrdinary(demonstrationId: DemonstrationId, graph: LessonGraphCapabilities): LessonSceneCheckpoint {
        graph.pauseAnimations?.();
        const snapshot = graph.captureState();
        this.ordinaryScenes.set(demonstrationId, snapshot);
        return snapshot;
    }

    hasActivitySnapshot(activityId: ActivityId): boolean {
        return this.activityScenes.has(activityId);
    }

    isActivityActive(activityId: ActivityId): boolean {
        return this.session?.activityId === activityId && this.session.active;
    }

    resetActivity(): void {
        if (this.session) this.run(() => this.session?.value.reset());
    }

}

export const chapterActivityVisit = new ChapterActivityVisit();
