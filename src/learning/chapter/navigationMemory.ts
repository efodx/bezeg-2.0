import type {LessonSceneCheckpoint} from '../model';
import type {DemonstrationId} from '../../demonstrations';
import type {ActivityId} from './activities';
import {findActivity} from './activities';

export const chapterPath = '/bezeg-2.0/learn/bezier-curves';
export const activitySnapshots = new Map<ActivityId, LessonSceneCheckpoint>();
export const ordinarySnapshots = new Map<DemonstrationId, LessonSceneCheckpoint>();
let reading: {sectionId: string; y: number; relativeY: number; focusId?: string} | undefined;
const readingLocations = new Map<string, NonNullable<typeof reading>>();
const ordinaryEntries = new Map<string, DemonstrationId>();
let ordinaryPath: string | undefined;
let pendingReturn = false;
let lastSection = 'control-points';
let activityVisited = false;
let launched: {id: string; readingKey: string} | undefined;
const predecessors = new Map<string, string>();
type ActivityEntry = {v: 1; entryId: string; chapterId: 'bezier-curves'; activityId: ActivityId;
    demonstrationId: DemonstrationId; started: boolean; predecessorReadingKey?: string};
let entrySequence = 0;

export function activityEntryState(previous: unknown, id: ActivityId, readingKey?: string) {
    const activity = findActivity(id)!;
    return {...(previous && typeof previous === 'object' ? previous : {}), chapterActivity: {
        v: 1, entryId: `bezier-${Date.now()}-${++entrySequence}`, chapterId: 'bezier-curves',
        activityId: id, demonstrationId: activity.demonstrationId, started: false,
        ...(readingKey ? {predecessorReadingKey: readingKey} : {}),
    } satisfies ActivityEntry};
}
export function readActivityEntry(state: unknown, id: ActivityId): ActivityEntry | undefined {
    if (!state || typeof state !== 'object' || !('chapterActivity' in state)) return;
    const entry = state.chapterActivity;
    if (!entry || typeof entry !== 'object') return;
    const candidate = entry as Partial<ActivityEntry>;
    const activity = findActivity(id);
    if (candidate.v !== 1 || candidate.chapterId !== 'bezier-curves' || candidate.activityId !== id
        || candidate.demonstrationId !== activity?.demonstrationId || typeof candidate.started !== 'boolean'
        || typeof candidate.entryId !== 'string' || !/^bezier-\d+-\d+$/.test(candidate.entryId)
        || (candidate.predecessorReadingKey !== undefined && (typeof candidate.predecessorReadingKey !== 'string'
            || candidate.predecessorReadingKey.length > 128))) return;
    return candidate as ActivityEntry;
}

export function rememberActivityLaunch(id: string, readingKey: string) {
    launched = {id, readingKey};
    if (reading) readingLocations.set(id, reading);
}
export function registerActivityEntry(id: string, entryKey: string) {
    if (launched?.id === id) {
        predecessors.set(entryKey, launched.readingKey);
        launched = undefined;
    }
}
export function hasReadingPredecessor(entryKey: string) { return predecessors.has(entryKey); }

export function rememberReading(sectionId: string, focusId?: string) {
    const sectionTop = document.getElementById(sectionId)?.getBoundingClientRect().top;
    reading = {sectionId, y: window.scrollY, relativeY: -(sectionTop ?? 0), focusId};
    lastSection = sectionId;
    pendingReturn = true;
}
export function restoreReading(fallbackSection: string): boolean {
    if (!pendingReturn || !reading) return false;
    pendingReturn = false;
    const saved = reading;
    requestAnimationFrame(() => {
        const target = document.getElementById(saved.focusId ?? `${saved.sectionId}-heading`)
            ?? document.getElementById(`${fallbackSection}-heading`);
        target?.focus({preventScroll: true});
        const section = document.getElementById(saved.sectionId);
        const y = section ? window.scrollY + section.getBoundingClientRect().top + saved.relativeY : saved.y;
        window.scrollTo(0, Math.max(0, y));
    });
    return true;
}
export function readingReturnPath() { return `${chapterPath}#${reading?.sectionId ?? lastSection}`; }
export function setReturnSection(sectionId: string, activityId: string) {
    reading = readingLocations.get(activityId);
    lastSection = sectionId; activityVisited = true;
    if (reading) pendingReturn = true;
}
export function prepareReadingReturn(sectionId: string, activityId: string) {
    reading ??= {sectionId, y: 0, relativeY: 0, focusId: `activity-${activityId}`};
    pendingReturn = true;
}
export function hasChapterReturn() { return activityVisited; }
export function ordinaryReturnPath() { return ordinaryPath; }
export function clearPendingReadingReturn() { pendingReturn = false; }
export function rememberOrdinaryPath(path: string, entryKey: string, demonstrationId: DemonstrationId) {
    ordinaryPath = path; ordinaryEntries.set(entryKey, demonstrationId);
}
export function isOrdinaryReturn(entryKey: string, demonstrationId: DemonstrationId) {
    return ordinaryEntries.get(entryKey) === demonstrationId;
}
export const relatedSections: Partial<Record<DemonstrationId, string>> = {
    bezier: 'control-points', decasteljau: 'interpolation', bernstein: 'bernstein-form', affine: 'affine-transformations',
};
