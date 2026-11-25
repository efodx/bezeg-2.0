/**
 * The states a demonstration is recorded in (task 08 step 3): the default state, then each step of each lesson on it with its
 * scene applied synchronously. Shared by the golden recording and by the parity applicability check.
 */
import type {DemonstrationId} from '../../../demonstrations';
import {getLessonForDemonstration} from '../../../learning/runtime/lessonCatalog';
import {chapterOwnerRows, getChapterOwnedLessons} from '../../../learning/content/chapterOwnedLessons';
import type {LessonDefinition} from '../../../learning/model';
import type {ParityState} from './parity';

/** Candidates recorded before deduplication; keeps the run bounded for a demonstration with very many lesson steps. */
export const MAX_CANDIDATES = 40;

/** Every lesson on a demonstration: the catalog one plus the chapter-owned ones. */
export function lessonsFor(id: DemonstrationId): LessonDefinition[] {
    const lessons = new Set<LessonDefinition>();
    const first = getLessonForDemonstration(id);
    if (first) lessons.add(first);
    for (const row of chapterOwnerRows()) {
        if (row.demonstrationId !== id) continue;
        const lesson = getChapterOwnedLessons(row.chapterId)?.lesson(row.sectionId);
        if (lesson) lessons.add(lesson);
    }
    return [...lessons];
}

/** The default state, then each lesson step with its scene applied (the first checkpoint restored before every scene). */
export function candidateStates(id: DemonstrationId): ParityState[] {
    let checkpoint: unknown;
    const states: ParityState[] = [{name: 'default', apply: graph => { checkpoint = graph.getLessonCapabilities().captureState(); }}];
    for (const lesson of lessonsFor(id)) for (const step of lesson.steps) {
        // Steps without a scene keep the previous scene, so they would record the same panel: skip them.
        if (!step.scene) continue;
        states.push({name: `${lesson.id}/${step.id}`, apply: graph => {
            const capabilities = graph.getLessonCapabilities();
            capabilities.restoreState(checkpoint as never);
            for (const action of step.scene!.actions) capabilities.apply(action);
        }});
    }
    if (states.length <= MAX_CANDIDATES) return states;
    const picked = new Set<number>();
    for (let i = 0; i < MAX_CANDIDATES; i++) picked.add(Math.round(i * (states.length - 1) / (MAX_CANDIDATES - 1)));
    return states.filter((_state, index) => picked.has(index));
}
