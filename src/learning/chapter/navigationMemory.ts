import type {DemonstrationId} from '../../demonstrations';
import type {ActivityId} from './activities';
import {findActivity} from './activities';

export const chapterPath = '/bezeg-2.0/learn/bezier-curves';

export type ReadingLocation = {sectionId: string; y: number; relativeY: number; focusId?: string};
type ActivityEntry = {v: 1; entryId: string; chapterId: 'bezier-curves'; activityId: ActivityId;
    demonstrationId: DemonstrationId; started: boolean; predecessorReadingKey?: string};
let entrySequence = 0;

/** Browser adapter: capture the current reading position and its invoking control. */
export function captureReading(sectionId: string, focusId?: string): ReadingLocation {
    const sectionTop = document.getElementById(sectionId)?.getBoundingClientRect().top;
    return {sectionId, y: window.scrollY, relativeY: -(sectionTop ?? 0), focusId};
}

/** Browser adapter: annotate the native history entry after its reading position is captured. */
export function writeReadingInvocation(id: ActivityId, readingKey: string, sectionId: string): void {
    const activity = findActivity(id);
    if (!activity || typeof window === 'undefined') return;
    const current = window.history.state;
    const state = current && typeof current === 'object' ? current as {usr?: unknown; key?: unknown; idx?: unknown} : {};
    const initialEntry = state.key === undefined && readingKey === 'default'
        && (state.idx === undefined || state.idx === 0);
    const entryKey = initialEntry ? readingKey : state.key;
    const entryIndex = initialEntry ? state.idx ?? 0 : state.idx;
    if (entryKey === readingKey && Number.isInteger(entryIndex) && (entryIndex as number) >= 0) {
        const usr = state.usr && typeof state.usr === 'object' ? state.usr : {};
        window.history.replaceState({...state, key: readingKey, idx: entryIndex, usr: {...usr, chapterReadingInvocation: {
            v: 1, activityId: id, sectionId, readingKey,
        }}}, '');
    }
}

/** Browser adapter: restore focus and section-relative scroll after the chapter mounts. */
export function restoreReading(location: ReadingLocation, fallbackSection: string): void {
    requestAnimationFrame(() => {
        const target = document.getElementById(location.focusId ?? `${location.sectionId}-heading`)
            ?? document.getElementById(`${fallbackSection}-heading`);
        target?.focus({preventScroll: true});
        const section = document.getElementById(location.sectionId);
        const y = section ? window.scrollY + section.getBoundingClientRect().top + location.relativeY : location.y;
        window.scrollTo(0, Math.max(0, y));
    });
}

/** Pure history-state encoder; checkpoints never enter router state. */
export function activityEntryState(previous: unknown, id: ActivityId, readingKey?: string) {
    const activity = findActivity(id)!;
    return {...(previous && typeof previous === 'object' ? previous : {}), chapterActivity: {
        v: 1, entryId: `bezier-${Date.now()}-${++entrySequence}`, chapterId: 'bezier-curves',
        activityId: id, demonstrationId: activity.demonstrationId, started: false,
        ...(readingKey ? {predecessorReadingKey: readingKey} : {}),
    } satisfies ActivityEntry};
}

/** Pure history-state validator; accepts only authored identity and small entry metadata. */
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
            || !/^(?:default|[0-9a-z]{8})$/.test(candidate.predecessorReadingKey)))) return;
    return candidate as ActivityEntry;
}
