import {getDemonstrationCatalog} from '../../demonstrations';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {complexReciprocalLesson, complexRootsLesson} from './complexMapsChapterLessons';
import {complexPowerLesson} from './complexPowerGuidedLessons';
import {complexEulerLesson} from './complexEulerGuidedLessons';

export const COMPLEX_MAPS_CHAPTER_ID = 'complex-maps';

/**
 * Section-owned complex map activities in teaching order: M1 and M2 are authored lesson definitions, M6 (powers) and M7 (euler) are
 * catalog-format content adapted here under the lesson ids `complex-power-de-moivre` and `complex-euler-circle`. The section ids are those of complexMapsChapter.ts.
 */
export const complexMapsGuidedExampleRegistry = {
    'reciprocal-inversion': complexReciprocalLesson,
    'roots': complexRootsLesson,
    'powers': adaptGuidedLessonContent(complexPowerLesson, 'complex-power-de-moivre'),
    'euler': adaptGuidedLessonContent(complexEulerLesson, 'complex-euler-circle'),
} as const;

export type ComplexMapsSectionId = keyof typeof complexMapsGuidedExampleRegistry;

export function complexMapsGuidedExamplePath(sectionId: ComplexMapsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === complexMapsGuidedExampleRegistry[sectionId].demonstrationId)!;
    return `${demo.path}?example=lesson.${COMPLEX_MAPS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
