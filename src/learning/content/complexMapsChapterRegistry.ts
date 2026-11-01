import {getDemonstrationCatalog} from '../../demonstrations';
import {complexReciprocalLesson, complexRootsLesson} from './complexMapsChapterLessons';

export const COMPLEX_MAPS_CHAPTER_ID = 'complex-maps';

/** Section-owned complex map activities (spec M1 and M2); the section ids are those of complexMapsChapter.ts. */
export const complexMapsGuidedExampleRegistry = {
    'reciprocal-inversion': complexReciprocalLesson,
    'roots': complexRootsLesson,
} as const;

export type ComplexMapsSectionId = keyof typeof complexMapsGuidedExampleRegistry;

export function complexMapsGuidedExamplePath(sectionId: ComplexMapsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === complexMapsGuidedExampleRegistry[sectionId].demonstrationId)!;
    return `${demo.path}?example=lesson.${COMPLEX_MAPS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
