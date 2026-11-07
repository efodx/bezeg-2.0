import type {DemonstrationId} from '../../demonstrations';
import {findChapterOwnedLessonByDemonstration} from '../content/chapterOwnedLessons';
import {adaptCatalogLesson} from '../content/catalogLessonAdapter';
import type {LessonDefinition} from '../model';
import {isGuidedLessonAvailable} from './lessonAvailability';
export {GUIDED_LESSON_AVAILABLE_IDS, isGuidedLessonAvailable} from './lessonAvailability';
export {patchFixture, sceneActions, view3dFixture} from '../content/catalogLessonAdapter';

/** Stable lookup seam for the reviewed content module; only Demonstrations that offer a lesson (see lessonAvailability.ts) resolve. */
export function getLessonForDemonstration(id: DemonstrationId): LessonDefinition | undefined {
    if (!isGuidedLessonAvailable(id)) return undefined;
    const owned = findChapterOwnedLessonByDemonstration(id);
    if (owned) return owned;
    return getCatalogLessonForDemonstration(id);
}

/** The lesson adapted from the shared reviewed content, ignoring chapter ownership (the content adapter). */
export function getCatalogLessonForDemonstration(id: DemonstrationId): LessonDefinition | undefined {
    return adaptCatalogLesson(id);
}
